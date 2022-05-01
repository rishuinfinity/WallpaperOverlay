/*
* Name: Wallpaper Overlay
* Description: Extension to add overlay masks on desktop wallpaper
* Author: Rishu Raj
*/
"use strict";
//Const Variables
const Gio            = imports.gi.Gio;
const GLib           = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const Me             = imports.misc.extensionUtils.getCurrentExtension();
const [major]        = imports.misc.config.PACKAGE_VERSION.split('.');
const shellVersion   = Number.parseInt(major);
const home_dir       = GLib.get_home_dir();

//Temporary Variables
let Settings     = ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay');
let modWallpaper = Me.path + "/modWallpaper.png";
let logSize      = 8000; // about 8k

/////////////////////////////////////////
// Important functions

function modifySetting(schema_path, setting_id, setting_value){
  // This function assumes that setting-value is always string
  let setting = new Gio.Settings({schema: schema_path});
  if  (setting.is_writable(setting_id)){
    let response = setting.set_string(setting_id, setting_value);
    if  (response){
      Gio.Settings.sync();
    }
    else{
      saveExceptionLog("Failed to Modify "+setting_id);
    }
  }
  else{
    saveExceptionLog(setting_id + " is not writable");
  }
}

function setWallpaper(path){
  path = "file://" + path;
  modifySetting("org.gnome.desktop.background", "picture-uri", path);
  if (shellVersion >= 42)
  modifySetting("org.gnome.desktop.background", "picture-uri-dark", path);
}

function saveExceptionLog(e){
  let log_file = Gio.file_new_for_path( 
  home_dir + '/.local/var/log/WallpaperOverlay.log' );
  try{log_file.create(Gio.FileCreateFlags.NONE, null);} catch{}

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

function createWallpaper(overlay_path){
  let image_path        = Settings.get_string('picture-uri');
  let overlay_color     = Settings.get_string('overlay-color');
  let command           = Me.path + "/WallpaperCover.py '"+image_path + "' '"+ overlay_path + "' '"+ modWallpaper + "' '" + overlay_color + "'";
  var [ok,out,err,exit] = GLib.spawn_command_line_sync(command);
  if (ok)
  return out;
  return "Command Executed: "+ ok + " " +out;
}

function applyWallpaper(overlay_path){
  let response  = createWallpaper(overlay_path);
  if  (response == "true\n"){
    setWallpaper(Settings.get_string("picture-uri"));
    setWallpaper(modWallpaper);
  } else {
    saveExceptionLog("CreateWallpaper Failed");
  }
  return response;
}


/////////////////////////////////////////
// Extension functions

function init() {
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