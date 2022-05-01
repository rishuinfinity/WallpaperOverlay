/*
* Name: Wallpaper Overlay
* Description: Extension to automatically Change wallpaper after a given interval
* Author: Rishu Raj
*/

const Gio = imports.gi.Gio;
const GLib  = imports.gi.GLib;
const Mainloop = imports.mainloop;
const ExtensionUtils = imports.misc.extensionUtils;
let Settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay');
const Me = imports.misc.extensionUtils.getCurrentExtension();
const [major] = imports.misc.config.PACKAGE_VERSION.split('.');
const shellVersion = Number.parseInt(major);
const home_dir = GLib.get_home_dir();

let logSize = 8000; // about 8k

let overlay_map;

/////////////////////////////////////////
// Important functions
function get_overlay_path_from_enum(v){
  return overlay_map[v];
}

function modifySetting(schema_path, setting_id, setting_value){
  // This function assumes that value is always string
  let setting = new Gio.Settings({schema: schema_path});
  if(setting.is_writable(setting_id)){
    let response = setting.set_string(setting_id, setting_value);
    if (response){
      Gio.Settings.sync();
    }
    else{
      saveExceptionLog("Failed to Set Wallpaper");
    }
  }
  else{
    saveExceptionLog(setting_id + " is not writable");
  }
}

function setWallpaper(path){
  path = "file://" + path;
  modifySetting("org.gnome.desktop.background", "picture-uri", path);
  if (shellVersion >= 42){
    modifySetting("org.gnome.desktop.background", "picture-uri-dark", path);
  }
}

function saveExceptionLog(e){
  let log_file = Gio.file_new_for_path( 
    home_dir + '/.local/var/log/WallpaperOverlay.log' );

  let log_file_size =  log_file.query_info( 
    'standard::size', 0, null).get_size();
  
  if( log_file_size > logSize ){
    log_file.replace( null,false, 0, null ).close(null);
  }
  e = Date()+':\n' + e + "\n";
  let logOutStream = log_file.append_to( 1, null );
  logOutStream.write( e, null );
  logOutStream.close(null);
}

/////////////////////////////////////////
// Main Code

let modWallpaper = Me.path + "/modWallpaper.png"

function createWallpaper(overlay_path){
  let image_path = Settings.get_string('picture-uri');
  let overlay_color = Settings.get_string('overlay-color');
  let command = Me.path + "/WallpaperCover.py '"+image_path + "' '"+ overlay_path + "' '"+ modWallpaper + "' '" + overlay_color + "'";
  var [ok, out, err, exit] = GLib.spawn_command_line_sync(command);
  return out;
}

function applyWallpaper(overlay_path){
  let response = createWallpaper(overlay_path);
  if(response == "true\n"){
    setWallpaper(Settings.get_string("picture-uri"));
    setWallpaper(modWallpaper);
  } else {
    saveExceptionLog("CreateWallpaper Failed");
    saveExceptionLog("r "+ response);
  }
  return response;
}


/////////////////////////////////////////
// Extension functions

function init() {
}

function enable() {
  overlay_map = {
    "0" : "/resources/bottom_gradient_waves.png",
    "1" : "/resources/top_solid_convex.png"
  };
}

function disable() {
}


/////////////////////////////////////////
// Thanks
/*
   modifySetting was inspired from:
   https://bitbucket.org/LukasKnuth/backslide/src/7e36a49fc5e1439fa9ed21e39b09b61eca8df41a/backslide@codeisland.org/settings.js?at=master
   */