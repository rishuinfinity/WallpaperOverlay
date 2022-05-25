////////////////////////////////////////////////////////////
//Const Variables
const Gio            = imports.gi.Gio;
const GLib           = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const Me             = ExtensionUtils.getCurrentExtension();
const [major]        = imports.misc.config.PACKAGE_VERSION.split('.');
const shellVersion   = Number.parseInt(major);
const home_dir       = GLib.get_home_dir();


////////////////////////////////////////////////////////////
// Function Declaraions
// function _modifyExternalSetting(schemaPath, settingId, settingValue);
// function _setWallpaper(path);
// function saveExceptionLog(e);
// function getLocalOverlayOptions();
// function getOverlayFileUri();
// function getOverlayFormat();
// function getModifiedOverlayResource();
// function getModifiedOverlayUri();
// function getModifiedWallpaperUri();
// function getCurrentColorScheme();
// function getCurrentWallpaperUri();
// function clearCache();

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
    saveExceptionLog(schemaPath+"."+settingId +" unmodifiable");
    return [settingId +" unmodifiable \n",0];
  }
  saveExceptionLog(schemaPath+"."+settingId +" unwritable");
  return [settingId +" unwritable \n",0];
}

function _setWallpaper(path){
  try{
    path = "file://" + path;
    let colorScheme = getCurrentColorScheme();
    var msg,response;
    if(colorScheme == 0){
      [msg,response] = _modifyExternalSetting("org.gnome.desktop.background", "picture-uri", path);
      if (response == 0) return [msg,0];
    }
    else if (colorScheme == 1){
      [msg,response] = _modifyExternalSetting("org.gnome.desktop.background", "picture-uri-dark", path);
      if (response == 0) return [msg,0];
    }
    else{
      saveExceptionLog("Got Invalid Color Scheme");
      return ["Couldn't Set Wallpaper",0];
    }
    return ["Wallpaper Set",1];
  }
  catch(e){
    saveExceptionLog(e);
  }
}

function saveExceptionLog(e){
  try{
    let logSize = 8000; // about 8k
    let log_file = Gio.file_new_for_path( home_dir + '/.local/var/log/WallpaperOverlay.log' );
    try{log_file.create(Gio.FileCreateFlags.NONE, null);} catch{}
    let log_file_size =  log_file.query_info( 
        'standard::size', 0, null).get_size();
    if( log_file_size > logSize ){
        log_file.replace( null,false, 0, null ).close(null);
    }
    let date = new Date();
    e = [
      date.getDate(),"/",
      date.getMonth(),"/",
      date.getFullYear(),"-",
      date.getHours(),":",
      date.getMinutes(),":",
      date.getSeconds(),"~",
      ' ' + e + "\n"];
    e = e.join("");
    let logOutStream = log_file.append_to( 1, null );
    logOutStream.write( e, null );
    logOutStream.close(null);
  }
  catch(e){
    log("WallpaperOverlay: (Logger Error)");
    log(e);
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
  let cacheFolder  = Gio.file_new_for_path(Me.path + "/cache/");
  let enumerator = cacheFolder.enumerate_children("standard::name, standard::type",Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
  let child;
  while ((child = enumerator.next_file(null))){
      // check if it is a file
      if( child.get_file_type() == Gio.FileType.REGULAR)
      {
      // delete if its not important
      let filepath = Me.path + "/cache/" + child.get_name();
      if(filepath != getPictureUri() && filepath != getCurrentWallpaperUri()){
        let file = Gio.file_new_for_path(filepath);
        file.delete(null);
      }
      }
  }
  setErrorMsg("Cleaned");
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
        saveExceptionLog("getScreenRes failed")
        saveExceptionLog("E1: "+String(e));
        saveExceptionLog("E2: "+String(f));
        saveExceptionLog("Falling Back to Saved Value of ScreenRes")
      }
      return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay').get_string('screen-res');
  }
  let screenResolution = String(geo.width) + "x" + String(geo.height);
  setScreenRes(screenResolution);
  return screenResolution;
}
function setPictureUri(val){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay').set_string('picture-uri',val);
}
function setOverlayUri(val){
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
  let dropErr = ["","Applied","Applying","Cleaning","Cleaned"]
  if(!dropErr.includes(val)) saveExceptionLog("DisplayLog: "+String(val));
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay').set_string('error-msg',String(val));
}
function setScreenRes(val){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay').set_string('screen-res',String(val));
}
