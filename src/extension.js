////////////////////////////////////////////////////////////
//Const Variables
const {Gio,GLib,Gdk} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me             = ExtensionUtils.getCurrentExtension();
const lib            = Me.imports.lib;

////////////////////////////////////////////////////////////
// Global Variables
let backgroundSetting;
let mySetting;
let colorSchemeSetting;
let handlerAutoApply;
let handlerColorScheme;
let handlerWallpaper;
let handlerWallpaperDark;
let handlerApply;

////////////////////////////////////////////////////////////
// Function Declaraions
// function init();
// function enable();
// function disable();
// function _asyncRunCmd(cmd)
// function _applyOverlay();
// function updateConnectFunctions()
// function connectHandler(type)
// function disconnectHandler(type);



////////////////////////////////////////////////////////////
// Extension.js default functions

function init() {
  
}

function enable() {  
    backgroundSetting = new Gio.Settings({schema: "org.gnome.desktop.background"});
    mySetting = ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay');
    colorSchemeSetting = new Gio.Settings({schema: "org.gnome.desktop.interface"});
    // create cache folder
    try{
        const cacheFolder = Gio.File.new_for_path(Me.path + '/cache');
        cacheFolder.make_directory(null);
    } catch{} // if the folder is present it would catch null
    updateConnectFunctions();
    connectHandler("auto-apply");
    connectHandler("color-scheme");
    try{ // read current wallpaper if its not modified
        let currentWallpaper = lib.getCurrentWallpaperUri();
        let blockPath = Me.path + "/cache/mod";
        if(!currentWallpaper.includes(blockPath)){
            lib.setPictureUri(currentWallpaper);
        }
    }catch{}
    
}

function disable() {
    // removeOverlay
    try{
        disconnectHandler("auto-apply");
        disconnectHandler("color-scheme");
        disconnectHandler("wallpaper");
        disconnectHandler("wallpaper-dark");
        disconnectHandler("apply");
    }catch{}
    backgroundSetting = null;
    mySetting = null;
    colorSchemeSetting = null;
    handlerAutoApply = null;
    handlerColorScheme = null;
    handlerWallpaper = null;
    handlerWallpaperDark = null;
    handlerApply = null;
    try{
        let currentWallpaper = lib.getCurrentWallpaperUri();
        let blockPath = Me.path + "/cache/mod";
        if(currentWallpaper.includes(blockPath)){
            lib._setWallpaper(lib.getPictureUri());
        }
    }
    catch(e){
        log("Failed to remove overlay");
    }
}

////////////////////////////////////////////////////////////
// Function Implementations

function _asyncRunCmd(cmd){
    let loop = GLib.MainLoop.new(null, false);
    try {
        let proc = Gio.Subprocess.new(
            cmd,
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        );

        proc.communicate_utf8_async(null, null, (proc, res) => {
            try {
                let [, stdout, stderr] = proc.communicate_utf8_finish(res);

                if (proc.get_successful()) {
                    // lib.saveExceptionLog("Ran Successfully")
                    lib.setErrorMsg(stdout);
                } else {
                    lib.setErrorMsg(stderr);
                }
            } catch (e) {
                lib.setErrorMsg(e);
            } finally {
                loop.quit();
            }
        });
    } catch (e) {
        lib.setErrorMsg(e);
    }

    loop.run();
}

function _applyOverlay(){
    try{
        let overlayPath = lib.getOverlayFileUri();
        let overlayFormat = lib.getOverlayFormat();
        if(overlayFormat == "svg"){
            let svgFile = Gio.file_new_for_path(lib.getModifiedOverlayUri());
            try{svgFile.create(Gio.FileCreateFlags.NONE, null);} catch{} // if not present, create a new file
            svgFile.replace_contents(lib.getModifiedOverlayResource(), null, false,
            Gio.FileCreateFlags.REPLACE_DESTINATION, null);
            overlayPath = lib.getModifiedOverlayUri();
        }
        else if(overlayFormat != "png"){
            return ["Overlay File needs to be an SVG or PNG file", 0];
        }
        // create the modified wallpaper
        let imagePath = lib.getPictureUri();
        let allowedFormats = ["png","jpg",  "jpeg"];
        if(!allowedFormats.includes(imagePath.split(".").pop())){
            return ["Wallpaper file format not supported",0];
        }
        let outputPath = lib.getModifiedWallpaperUri();
        // lib.deleteFile(outputPath); // clean file at output: Gnome wallpaper caching made me do this
        let screenResolution = lib.getScreenRes();
        // Running Image Processing Asynchronously
        let commandArray = [
            "convert", '\(', imagePath,
            "-resize", screenResolution+"^",
            "-gravity", "center",
            "-extent" , screenResolution,'\)',
            "\(","-background", "none", overlayPath,
            "-resize", screenResolution +"^",
            "-gravity", "center",
            "-extent", screenResolution,
            "\)", "-composite",
            "-format", "png",
            outputPath
        ];
        _asyncRunCmd(commandArray);
        if(lib.getErrorMsg() == ""){
            let [msg,response] = lib._setWallpaper(outputPath);
            if(response == 0){
                lib.setErrorMsg(msg);
            }
            else{
                lib.clearCache();
                lib.setErrorMsg("Applied")
            }
        }
    }
    catch(e){
        lib.setErrorMsg(e);
        return ["Failed to apply Overlay",0];
    }
    return ["Overlay Applied Successfully",1];
}


function updateConnectFunctions(){
    try{
        if(lib.getAutoApplyState()){
            disconnectHandler("apply");
            // Here 1 means dark, 0 means default/light
            if(lib.getCurrentColorScheme() == 0){
                disconnectHandler("wallpaper-dark");
                connectHandler("wallpaper");
            }
            else{
                disconnectHandler("wallpaper");
                connectHandler("wallpaper-dark");
            }
        }
        else{
            disconnectHandler("wallpaper");
            disconnectHandler("wallpaper-dark");
            connectHandler("apply");
        }
        
    }
    catch(e)
    {
        lib.saveExceptionLog(e);
    }

}


function connectHandler(type){
    try{
        switch(type){
            case "auto-apply":
                if(handlerAutoApply == null)
                handlerAutoApply = mySetting.connect("changed::is-auto-apply",() => {
                    if(lib.getAutoApplyState()){
                        let currentWallpaper = lib.getCurrentWallpaperUri();
                        let blockPath = Me.path + "/cache/mod";
                        if(!currentWallpaper.includes(blockPath)){
                            lib.setPictureUri(lib.getCurrentWallpaperUri());
                            _applyOverlay();
                        }
                    }
                    updateConnectFunctions();
                });
                break;
            case "color-scheme":
                if(handlerColorScheme == null)
                handlerColorScheme = colorSchemeSetting.connect("changed::color-scheme",()=>{
                    // set overlay once again
                    if(lib.getAutoApplyState()){
                        // Remove from there
                        if(lib.getCurrentColorScheme() == 0){
                            lib._modifyExternalSetting("org.gnome.desktop.background", "picture-uri-dark", "file://"+lib.getPictureUri());                            
                        }
                        else{
                            lib._modifyExternalSetting("org.gnome.desktop.background", "picture-uri", "file://"+lib.getPictureUri());
                        }
                        // Apply here
                        let currentWallpaper = lib.getCurrentWallpaperUri();
                        let blockPath = Me.path + "/cache/mod";
                        if(!currentWallpaper.includes(blockPath)){
                            lib.setPictureUri(currentWallpaper);
                            _applyOverlay();
                        }

                    }
                    updateConnectFunctions();
                });
                break;
            case "wallpaper":
                if(handlerWallpaper == null)
                handlerWallpaper = backgroundSetting.connect('changed::picture-uri', () => {
                    let currentWallpaper = lib.getCurrentWallpaperUri();
                    let blockPath = Me.path + "/cache/mod";
                    if(!currentWallpaper.includes(blockPath)){
                        lib.setPictureUri(currentWallpaper);
                        _applyOverlay();
                    }
                });
                break;
            case "wallpaper-dark":
                if(handlerWallpaperDark == null)
                handlerWallpaperDark= backgroundSetting.connect('changed::picture-uri-dark', () => {
                    let currentWallpaper = lib.getCurrentWallpaperUri();
                    let blockPath = Me.path + "/cache/mod";
                    if(!currentWallpaper.includes(blockPath)){
                        lib.setPictureUri(currentWallpaper);
                        _applyOverlay();
                    }
                });
                break;
            case "apply":
                if(handlerApply == null)
                handlerApply = mySetting.connect('changed::apply-signal', () => {
                    lib._setWallpaper(lib.getPictureUri());
                    _applyOverlay();
                });
                break;
        }
    }
    catch(e){
        lib.saveExceptionLog(e);
    }
}

function disconnectHandler(type){
    try{
        switch(type){
            case "auto-apply":
                if(handlerAutoApply != null){
                    mySetting.disconnect(handlerAutoApply);
                    handlerAutoApply = null;
                }
                break;
            case "color-scheme":
                if(handlerColorScheme != null){
                    colorSchemeSetting.disconnect(handlerColorScheme);
                    handlerColorScheme = null;
                }
            case "wallpaper":
                if(handlerWallpaper != null){
                    backgroundSetting.disconnect(handlerWallpaper);
                    handlerWallpaper = null;
                }
                break;
            case "wallpaper-dark":
                if(handlerWallpaperDark != null){
                    backgroundSetting.disconnect(handlerWallpaperDark);
                    handlerWallpaperDark = null;
                }
                break;
            case "apply":
                if(handlerApply !=null){
                    mySetting.disconnect(handlerApply);
                    handlerApply = null;
                }
                break;
                
        }
    }
    catch(e){
        lib.saveExceptionLog(e);
    }
}
