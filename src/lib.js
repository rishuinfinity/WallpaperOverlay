/*
* Name: Wallpaper Overlay
* Description: Extension to apply Overlays on wallpaper
* Author: Rishu Raj
*/
'use strict';
////////////////////////////////////////////////////////////
//Const Variables
const Gio            = imports.gi.Gio;
const GLib           = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const Me             = ExtensionUtils.getCurrentExtension();
const home_dir       = GLib.get_home_dir();


////////////////////////////////////////////////////////////
// Function Declaraions
// function _modifyExternalSetting(schemaPath, settingId, settingValue);
// function _setWallpaper(path);
// function saveExceptionLog(err,msg=null);
// function getLocalOverlayOptions();
// function getOverlayFileUri();
// function getOverlayFormat();
// function getModifiedOverlayResource();
// function getModifiedOverlayUri();
// function getModifiedWallpaperUri();
// function getCurrentColorScheme();
// function getCurrentWallpaperUri();
// function clearCache();
// function isInCache(path);

// function getPictureUri();
// function getOverlayUri();
// function getOverlayColor();
// function getOverlayStyleId();
// function getCustomOverlayState();
// function getAutoApplyState();
// function getApplySignal();
// function getErrorMsg(val);
// function getScreenRes();
// function setPictureUri(val);
// function setOverlayUri(val);
// function setOverlayColor(val);
// function setOverlayStyleId(val);
// function setCustomOverlayState(val);
// function setAutoApplyState(val);
// function setApplySignal(val);
// function setErrorMsg(val);
// function setScreenRes(val);


////////////////////////////////////////////////////////////
// Function Implementations
function _modifyExternalSetting(schemaPath, settingId, settingValue){
  // This function assumes that setting-value is always string
  let setting = new Gio.Settings({schema: schemaPath});
  if (setting.is_writable(settingId)){
    let response = setting.set_string(settingId, settingValue);
    if (response){
      Gio.Settings.sync();
      return [settingId + " set \n",1];
    }
    setErrorMsg(schemaPath+"."+settingId +" unmodifiable");
    return [settingId +" unmodifiable \n",0];
  }
  setErrorMsg(schemaPath+"."+settingId +" unwritable");
  return [settingId +" unwritable \n",0];
}

function _setWallpaper(path){
  if(Gio.file_new_for_path(path).query_exists(null)){
    path = "file://" + path;
    let colorScheme = getCurrentColorScheme();
    var msg,response;
    if(colorScheme == 0){
      [msg,response] = _modifyExternalSetting("org.gnome.desktop.background", "picture-uri", path);
      if (response == 0) return [msg,0];
    }
    else{
      [msg,response] = _modifyExternalSetting("org.gnome.desktop.background", "picture-uri-dark", path);
      if (response == 0) return [msg,0];
    }
    return ["Wallpaper Set",1];
  }
}

function saveExceptionLog(err,msg=null){
  try{
    let debug = false;
    let logSize = 8000; // about 8k
    let log_file = Gio.file_new_for_path( home_dir + '/.local/var/log/WallpaperOverlay.log' );
    try{log_file.create(Gio.FileCreateFlags.NONE, null);} catch{}
    let log_file_size =  log_file.query_info( 
        'standard::size', 0, null).get_size();
    if( log_file_size > logSize ){
        log_file.replace( null,false, 0, null ).close(null);
    }
    let date = new Date();
    let e = [
      String(date.getDate()    ).padStart(2),"/",
      String(date.getMonth()   ).padStart(2),"/",
      String(date.getFullYear()).padStart(4),"-",
      String(date.getHours()   ).padStart(2),":",
      String(date.getMinutes() ).padStart(2),":",
      String(date.getSeconds() ).padStart(2),"~",
      ' '];
    e = e.join("");
    if(msg != null)
    e = e + msg + "\n";
    e = e + String(err) + "\n";
    if(debug){
      try{
       if(err.stack != null)
       e = e + err.stack + "\n";
      }catch{}
    }
    let logOutStream = log_file.append_to( 1, null );
    logOutStream.write( e, null );
    logOutStream.close(null);
  }
  catch(e){
    log("WallpaperOverlay: (Logger Error)" + String(e));
    log(String(e.stack));
  }
}

function getLocalOverlayOptions(){
  let overlayOptions = {};
  let overlayFolder  = Gio.file_new_for_path(Me.path + "/overlays/");
  let enumerator = overlayFolder.enumerate_children("standard::name, standard::type",Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
  let child;
  while ((child = enumerator.next_file(null))){
      // check if it is a file
      if( child.get_file_type() == Gio.FileType.REGULAR)
      {
      // check file_extension
      let split = child.get_name().split(".");
      if(split.pop() == "svg"){
          overlayOptions[split.join("")]= "/overlays/"+child.get_name();
      }
      }
  }
  overlayOptions = Object.keys(overlayOptions).sort().reduce((r, k) => (r[k] = overlayOptions[k], r), {});
  return overlayOptions;
}


function getOverlayFileUri(){
  if(getCustomOverlayState()) return getOverlayUri();
  let overlayOptions = getLocalOverlayOptions();
  let overlayPath = Me.path + overlayOptions[Object.keys(overlayOptions)[getOverlayStyleId()]];
  return overlayPath;
}

function getOverlayFormat(){
  let overlayFilePath = getOverlayFileUri();
  return overlayFilePath.split(".").pop();
}

function getModifiedOverlayResource(){
  let overlayPath = getOverlayFileUri();
  let overlayColor = getOverlayColor();
  let svgFile = new TextDecoder('utf-8').decode(GLib.file_get_contents(overlayPath)[1]);
  svgFile     = svgFile.replaceAll("#0000ff",overlayColor);
  return svgFile;
}

function getModifiedOverlayUri(){
  return Me.path + "/cache/modOverlay.svg";
}

function getModifiedWallpaperUri(settingId = "picture-uri"){
  let pic = getPictureUri();
  let hashCode = function(s){
    return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);              
  }// function taken from https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
  let path =Me.path + "/cache/mod" + hashCode(pic + String(Math.random())) + ".png";
  return path;
}

function getCurrentColorScheme(){
  let colorSchemeSetting = new Gio.Settings({schema: "org.gnome.desktop.interface"});
  let colorScheme = colorSchemeSetting.get_enum("color-scheme");
  return (colorScheme == 1)?1:0; //1 means dark
}

function getCurrentWallpaperUri(){
  let backgroundSetting = new Gio.Settings({schema: "org.gnome.desktop.background"});
  if(getCurrentColorScheme() == 1){
    return decodeURI(backgroundSetting.get_string("picture-uri-dark").substr(7,));
  }
  else{
    return decodeURI(backgroundSetting.get_string("picture-uri").substr(7,));
  }
  
}

function clearCache(){
  let backgroundSetting = new Gio.Settings({schema: "org.gnome.desktop.background"});
  let cacheFolder  = Gio.file_new_for_path(Me.path + "/cache/");
  let enumerator = cacheFolder.enumerate_children("standard::name, standard::type",Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
  let child;
  while ((child = enumerator.next_file(null))){
      // check if it is a file
      if( child.get_file_type() == Gio.FileType.REGULAR)
      {
      // delete if its not important
      let filepath = Me.path + "/cache/" + child.get_name();
      let important_files=[
        decodeURI(backgroundSetting.get_string("picture-uri-dark").substr(7,)),
        decodeURI(backgroundSetting.get_string("picture-uri").substr(7,)),
        getPictureUri()
      ];
      if(!important_files.includes(filepath)){
        let file = Gio.file_new_for_path(filepath);
        file.delete(null);
      }
      }
  }
}

function isInCache(path){
  let blockPath = Me.path + "/cache/";
  return path.includes(blockPath) ? true : false;
}


function getPictureUri(){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay').get_string('picture-uri');
}
function getOverlayUri(){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay').get_string('overlay-uri');
}
function getOverlayColor(){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay').get_string('overlay-color');
}
function getOverlayStyleId(){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay').get_int('overlay-style');
}
function getCustomOverlayState(){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay').get_boolean('is-custom-overlay');
}
function getAutoApplyState(){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay').get_boolean('is-auto-apply');
}
function getApplySignal(){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay').get_boolean('apply-signal');
}
function getErrorMsg(){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay').get_string('error-msg');
}
function getScreenRes(){
  // Intended to be used in extension.js
  let display= imports.gi.Gdk.Display.get_default();
  let geo;
  try{
      let pm = display.get_monitor(0);
      geo = pm.get_geometry();
  }
  catch(e){
      try{
        let pm = display.get_monitors().get_item(0);
        geo = pm.get_geometry();
      }
      catch(f){
        saveExceptionLog(e,"getScreenRes Method1 failed");
        saveExceptionLog(f,"getScreenRes Method1 failed");
        saveExceptionLog(new Error("INFO"),"Falling Back to Saved Value of ScreenRes")
      }
      return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay').get_string('screen-res');
  }
  let screenResolution = String(geo.width) + "x" + String(geo.height);
  setScreenRes(screenResolution);
  return screenResolution;
}
function setPictureUri(val){
  if(!["png","jpg", "jpeg"].includes(val.split(".").pop())) return false;
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay').set_string('picture-uri',val);
}
function setOverlayUri(val){
  if(!["svg","png"].includes(val.split(".").pop())) return false;
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay').set_string('overlay-uri',val);
}
function setOverlayColor(val){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay').set_string('overlay-color',val);
}
function setOverlayStyleId(val){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay').set_int('overlay-style',val);
}
function setCustomOverlayState(val){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay').set_boolean('is-custom-overlay',val);
}
function setAutoApplyState(val){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay').set_boolean('is-auto-apply',val);
}
function setApplySignal(val){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay').set_boolean('apply-signal',val);
}
function setErrorMsg(val){
  val = String(val);
  let dropErr = ["","Applied","Applying"]
  if(!dropErr.includes(val)) saveExceptionLog(new Error("DisplayLog"),val);
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay').set_string('error-msg',val);
}
function setScreenRes(val){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay').set_string('screen-res',String(val));
}
