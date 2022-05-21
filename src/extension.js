/*
* Name: Wallpaper Overlay
* Description: Extension to add overlay masks on desktop wallpaper
* Author: Rishu Raj
*/
"use strict";
//Const Variables
imports.gi.versions.Gtk = "3.0";
const Gio            = imports.gi.Gio;
const GLib           = imports.gi.GLib;
const Gdk            = imports.gi.Gdk;
const ExtensionUtils = imports.misc.extensionUtils;
const Me             = imports.misc.extensionUtils.getCurrentExtension();
const [major]        = imports.misc.config.PACKAGE_VERSION.split('.');
const shellVersion   = Number.parseInt(major);
const home_dir       = GLib.get_home_dir();

//Temporary Variables
let Settings     = ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay');
let modWallpaper = Me.path + "/temp/modWallpaper.png";
let modWallpaper2= Me.path + "/temp/modWallpaper2.png";
let modOverlay   = Me.path + "/temp/modOverlay.svg";
let logSize      = 8000; // about 8k

/////////////////////////////////////////
// Important functions

function modifySetting(schema_path, setting_id, setting_value){
  // This function assumes that setting-value is always string
  let setting = new Gio.Settings({schema: schema_path});
  if (setting.is_writable(setting_id)){
    let response = setting.set_string(setting_id, setting_value);
    if (response){
      Gio.Settings.sync();
      return [setting_id + " set \n",1];
    }
    saveExceptionLog(schema_path+"."+setting_id +" unmodifiable");
    return [setting_id +" unmodifiable \n",0];
  }
  saveExceptionLog(schema_path+"."+setting_id +" unwritable");
  return [setting_id +" unwritable \n",0];
}

function setWallpaper(path){
  path = "file://" + path;
  var msg,response;
  [msg,response] = modifySetting("org.gnome.desktop.background", "picture-uri", path);
  if (response == 0) return [msg,0];
  if (shellVersion >= 42){
    [msg,response] = modifySetting("org.gnome.desktop.background", "picture-uri-dark", path);
    if (response == 0) return [msg,0];
  }
  return ["Wallpaper Set",1];
}

// Couldn't do it in gjs, so had to import another library in python to do it
// function SvgtoPng(overlay_path){
//   const image = new Gtk.Image()
//   saveExceptionLog("Gtk Image Failed");
//   image.set_from_file(Me.path + "/overlay.svg");
//   saveExceptionLog("getpixbuf Failed");
//   let pb = image.get_pixbuf();
//   saveExceptionLog(pb.savev(Me.path + "/overlay.png","png",[],[]));
// }

function saveExceptionLog(e){
  let log_file = Gio.file_new_for_path( 
  home_dir + '/.local/var/log/WallpaperOverlay.log' );
  // try{log_file.create(Gio.FileCreateFlags.NONE, null);} catch{}

  let log_file_size =  log_file.query_info( 
    'standard::size', 0, null).get_size();
  if( log_file_size > logSize ){
    log_file.replace( null,false, 0, null ).close(null);
  }
  e = Date()+': ' + e + "\n";
  let logOutStream = log_file.append_to( 1, null );
  logOutStream.write( e, null );
  logOutStream.close(null);
}

/////////////////////////////////////////
// Main Code

function createOverlay(overlay_path){
  let overlay_color = Settings.get_string('overlay-color');
  let ext_check = overlay_path.split(".");
  if(ext_check[ext_check.length-1] == "png"){
    modOverlay = overlay_path;
    return ["png Overlay ready",1];
  }
  if(ext_check[ext_check.length-1] != "svg") return ["Overlay is not an svg file",0];
  modOverlay = Me.path + "/temp/modOverlay.svg";
  let svg_file      = String(GLib.file_get_contents(overlay_path)[1]);
  svg_file          = svg_file.replaceAll("#0000ff",overlay_color);
  let new_file      = Gio.file_new_for_path( modOverlay );
  try{new_file.create(Gio.FileCreateFlags.NONE, null);} catch{} // if not present, create a new file
  new_file.replace_contents(svg_file, null, false,
  Gio.FileCreateFlags.REPLACE_DESTINATION, null);
  return ["Overlay Created \n",1];
}

function createWallpaper(){
  let image_path        = Settings.get_string('picture-uri');
  if (image_path == modWallpaper){
    // exchange modWallpaper paths
    let temp      = modWallpaper;
    modWallpaper  = modWallpaper2;
    modWallpaper2 = temp;
  }
  let command           = Me.path + "/WallpaperCover.py '"+image_path + "' '"+ modOverlay + "' '"+ modWallpaper + "'";
  // saveExceptionLog("Terminal: " + command);
  var [ok,out,err,exit] = GLib.spawn_command_line_sync(command);
  if (out == "Done\n")
  return ["Overlay Applied on Wallpaper",1];
  return [out + err + "\n",0];
}

function applyWallpaper(overlay_path){
  try{
  var msg,response;
  [msg,response] = createOverlay(overlay_path);
  if (response == 0) return msg;
  [msg,response] = createWallpaper();
  if (response == 0) return msg;
  [msg,response] = setWallpaper(Settings.get_string("picture-uri")); // Did this to refresh wallpaper
  if (response == 0) return msg;
  [msg,response] = setWallpaper(modWallpaper);
  if (response == 0) return msg;
  return "Applied"
  } catch (e)
  {
    saveExceptionLog(e);
    return "Error : "+ e;
  }
}

/////////////////////////////////////////
// Extension functions

function init() {
  let log_file = Gio.file_new_for_path( 
  home_dir + '/.local/var/log/WallpaperOverlay.log' );
  try{log_file.create(Gio.FileCreateFlags.NONE, null);} catch{}
  let temp_file= Gio.file_new_for_path(
    Me.path + "/temp/"
  );
  try{temp_file.make_directory(null);} catch{}
}

function enable() {
  
}

function disable() {
}


/////////////////////////////////////////
// Thanks
/*
   modifySetting was inspired from:
   https://bitbucket.org/LukasKnuth/backslide/src/7e36a49fc5e1439fa9ed21e39b09b61eca8df41a/backslide@codeisland.org/settings.js?at=master
   */
