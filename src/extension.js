/*
* Name: Wallpaper Overlay
* Description: Extension to add overlays on desktop wallpaper
* Author: Rishu Raj
*/
"use strict";
//Const Variables
// imports.gi.versions.Gtk = "3.0";
const Gio            = imports.gi.Gio;
const GLib           = imports.gi.GLib;
const Gdk            = imports.gi.Gdk;
const ExtensionUtils = imports.misc.extensionUtils;
const Me             = imports.misc.extensionUtils.getCurrentExtension();
const [major]        = imports.misc.config.PACKAGE_VERSION.split('.');
const shellVersion   = Number.parseInt(major);
const home_dir       = GLib.get_home_dir();
const lib            = Me.imports.lib;


function apply_on_current_wallpaper(){
  let wallpapersetting = new Gio.Settings({schema: "org.gnome.desktop.background"});
  let currentWallpaper = wallpapersetting.get_string("picture-uri").substr(7,);
  let Settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay');
  Settings.set_string("picture-uri",currentWallpaper);
  let OverlayOptions = lib.get_overlay_dropdown_options();
  let overlay_path = Me.path + OverlayOptions[Object.keys(OverlayOptions)[Settings.get_int('overlay-style')]];
  if (Settings.get_boolean('is-custom-overlay')){
      overlay_path = Settings.get_string('overlay-uri');
  }
  lib.applyWallpaper(overlay_path);
}

function remove_overlay(){
  let wallpapersetting = new Gio.Settings({schema: "org.gnome.desktop.background"});
  let currentWallpaper = wallpapersetting.get_string("picture-uri").substr(7,);
  let modWallpaper  = Me.path + "/temp/modWallpaper.png";
  let modWallpaper2 = Me.path + "/temp/modWallpaper2.png";
  if (currentWallpaper == modWallpaper || currentWallpaper == modWallpaper2){
    lib.setWallpaper(ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay').get_string("picture-uri"));
  }
}


/////////////////////////////////////////
// Extension functions

function init() {
  
}

function enable() {  
  try{apply_on_current_wallpaper();} catch(e){lib.saveExceptionLog(e)} // apply last overlay on the current wallpaper
}

function disable() {
  try{ remove_overlay();} catch{} // Removing the applied overlay
}