/*
* Name: Wallpaper Switcher
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


/////////////////////////////////////////
// Important functions
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
let allowedExtensions = ["jpg","png","jpeg"];

function createWallpaper(){
  const file = Gio.File.new_for_uri('file://' + modWallpaper);
  file.delete(null);
  let image_path = Settings.get_string('picture-uri');
  let svg_path = Settings.get_string('svg-uri');
  let svg_color = Settings.get_string('svg-color');
  let command = Me.path + "/WallpaperCover.py "+image_path + " "+ svg_path + " "+ modWallpaper;
  var [ok, out, err, exit] = GLib.spawn_command_line_sync(command);
  saveExceptionLog(out);
  return ok;
}

function applyWallpaper(){
  let response = createWallpaper();
  if(response){
    setWallpaper(modWallpaper);
  } else {
    saveExceptionLog("CreateWallpaper Failed");
  }
}

function applyAlways(){
  let background_setting = new Gio.Settings({schema: "org.gnome.desktop.background"});
  let currentWallpaper =background_setting.get_string("picture-uri");
  // saveExceptionLog(currentWallpaper);
  // saveExceptionLog(("file://" + modWallpaper));
  // saveExceptionLog(currentWallpaper != ("file://" + modWallpaper));
  if(currentWallpaper != ("file://" + modWallpaper)){
    Settings.set_string("picture-uri", currentWallpaper.split("file://")[1]);
    applyWallpaper();
    saveExceptionLog("Changed again");
  }
  return true;
}

/////////////////////////////////////////
// Extension functions

function init() {
}

function enable() {
  saveExceptionLog("Wallpaper Overlay Started");
  timeout = Mainloop.timeout_add_seconds(4.0, applyAlways);
}

function disable() {
  Mainloop.source_remove(timeout);
}


/////////////////////////////////////////
// Thanks
/*
   modifySetting was inspired from:
   https://bitbucket.org/LukasKnuth/backslide/src/7e36a49fc5e1439fa9ed21e39b09b61eca8df41a/backslide@codeisland.org/settings.js?at=master
   */