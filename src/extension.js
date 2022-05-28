/*
* Name: Wallpaper Overlay
* Description: Extension to apply Overlays on wallpaper
* Author: Rishu Raj
*/
'use strict';
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
let handlerPictureUri;
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
// async function execCommunicate(argv, input = null, cancellable = null) 
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
    connectHandler("apply");
    // read current wallpaper if its not modified
    if(!lib.isInCache(lib.getCurrentWallpaperUri())){
        lib.setPictureUri(lib.getCurrentWallpaperUri());
    }
}

function disable() {
    // removeOverlay
    try{
        disconnectHandler("apply");
        disconnectHandler("auto-apply");
        disconnectHandler("picture-uri");
        disconnectHandler("color-scheme");
        disconnectHandler("wallpaper");
        disconnectHandler("wallpaper-dark");
    }catch{}
    backgroundSetting = null;
    mySetting = null;
    colorSchemeSetting = null;
    handlerAutoApply = null;
    handlerPictureUri = null;
    handlerColorScheme = null;
    handlerWallpaper = null;
    handlerWallpaperDark = null;
    handlerApply = null;
    // try{
    //     if(lib.isInCache(lib.getCurrentWallpaperUri()){
    //         lib._setWallpaper(lib.getPictureUri());
    //     }
    // }
    // catch(e){
    //     log("Failed to remove overlay");
    // } I decided to let it be on disable coz it got removed on lock screen
    // The user can always set a new wallpaper after disabling
}

////////////////////////////////////////////////////////////
// Function Implementations

async function execCommunicate(argv, input = null, cancellable = null) {
    let cancelId = 0;
    let flags = (Gio.SubprocessFlags.STDOUT_PIPE |
                 Gio.SubprocessFlags.STDERR_PIPE);

    if (input !== null)
        flags |= Gio.SubprocessFlags.STDIN_PIPE;

    let proc = new Gio.Subprocess({
        argv: argv,
        flags: flags
    });
    proc.init(cancellable);

    if (cancellable instanceof Gio.Cancellable) {
        cancelId = cancellable.connect(() => proc.force_exit());
    }

    return new Promise((resolve, reject) => {
        proc.communicate_utf8_async(input, null, (proc, res) => {
            try {
                let [, stdout, stderr] = proc.communicate_utf8_finish(res);
                let status = proc.get_exit_status();

                if (status !== 0) {
                    throw new Gio.IOErrorEnum({
                        code: Gio.io_error_from_errno(status),
                        message: stderr ? stderr.trim() : GLib.strerror(status)
                    });
                }
                resolve(stdout.trim());
            } catch (e) {
                reject(e);
            } finally {
                if (cancelId > 0) {
                    cancellable.disconnect(cancelId);
                }
            }
        });
    });
}

function _applyOverlay(){
    try{
        // File format support for both Image file and Overlay File is checked here
        let overlayPath = lib.getOverlayFileUri();
        let overlayFormat = lib.getOverlayFormat();
        if(overlayFormat == "svg"){
            let svgFile = Gio.file_new_for_path(lib.getModifiedOverlayUri());
            try{svgFile.create(Gio.FileCreateFlags.NONE, null);} catch{} // if not present, create a new file
            svgFile.replace_contents(lib.getModifiedOverlayResource(), null, false,
            Gio.FileCreateFlags.REPLACE_DESTINATION, null);
            overlayPath = lib.getModifiedOverlayUri();
        }
        // create the modified wallpaper
        let imagePath = lib.getPictureUri();
        let outputPath = lib.getModifiedWallpaperUri();
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
        let outPromise = execCommunicate(commandArray);
        outPromise.then(
            // then only runs if command ran successfully
            result => {
                if(result == ""){
                    try{
                        lib._setWallpaper(outputPath);
                        lib.clearCache();
                        lib.setErrorMsg("Applied");
                    }
                    catch(e){
                        lib.setErrorMsg("Error during setting wallpaper");
                        lib.saveExceptionLog(e);
                    }
                }
            }
        ).catch( e => {
            lib.setErrorMsg("Error during image processing");
            lib.saveExceptionLog(e);
        });
    }
    catch(e){
        lib.setErrorMsg("Apply Overlay failed");
        lib.saveExceptionLog(e);
        return;
    }
}


////////////////////////////////////////////////////////////
// Extension.js Signal Management Functions
function connectHandler(type){
    // I have made sure here that _applyOverlay() or any function using _applyOverlay
    // is run at last in each function, as _applyOverlay() is an async function
    try{
        switch(type){
            case "apply":
                if(handlerApply == null)
                handlerApply = mySetting.connect('changed::apply-signal', () => {
                    // this signal should not be used if auto apply is on
                    // i am first setting the image as wallpaper so that there is no black screen (caused by imageMagick taking time to write to image file)
                    // to be seen by the user, as imageMagick creates the file asynchronously
                    // and I couldn't find out a way to know when the image writing has been completed :(
                    // if(!lib.getAutoApplyState())
                    // lib._setWallpaper(lib.getPictureUri()); // if wallpaper change animation is bad then this option is needed
                    _applyOverlay();
                });
                break;
            case "auto-apply":
                if(handlerAutoApply == null)
                handlerAutoApply = mySetting.connect("changed::is-auto-apply",() => {
                    updateConnectFunctions();
                    if(lib.getAutoApplyState()){
                        if(!lib.isInCache(lib.getCurrentWallpaperUri())){
                            lib.setPictureUri(lib.getCurrentWallpaperUri());
                        }
                        else{
                            _applyOverlay();
                        }
                    }
                });
                break;
            // remember the following handlers would only be active if auto apply is on
            case "picture-uri":
                if(handlerPictureUri == null)
                handlerPictureUri = mySetting.connect("changed::picture-uri",() => {
                    _applyOverlay();
                });
                break;
            case "color-scheme":
                if(handlerColorScheme == null)
                handlerColorScheme = colorSchemeSetting.connect("changed::color-scheme", ()=>{
                    // Update overlay on current scheme wallpaper and remove from old scheme wallpaper
                    if(lib.getCurrentColorScheme() == 0){
                        disconnectHandler("wallpaper-dark");
                        lib._modifyExternalSetting("org.gnome.desktop.background", "picture-uri-dark", "file://"+lib.getPictureUri());                            
                    }
                    else{
                        disconnectHandler("wallpaper");
                        lib._modifyExternalSetting("org.gnome.desktop.background", "picture-uri", "file://"+lib.getPictureUri());
                    }
                    updateConnectFunctions();
                    if(lib.getPictureUri() != lib.getCurrentWallpaperUri()){
                        lib.setPictureUri(lib.getCurrentWallpaperUri());
                    }
                    else{
                        _applyOverlay();
                    }
                    // if the wallpaper on the new scheme mode is already an overlay applied wallpaper
                    // then this would make it a double overlay wallpaper, in order to maintain the auto-apply
                    // overlay style, that wallpaper gets another overlay on top.
                    // Although a blatant quick switching of color-scheme may give user a blank wallpaper due to async
                });
                break;
            case "wallpaper":
                if(handlerWallpaper == null)
                handlerWallpaper = backgroundSetting.connect('changed::picture-uri', () => {
                    // I am depending on the handlerPictureUri to apply overlay here but
                    // if the picture uri is same as last one, then this wont apply overlay on it
                    // so gotta add a special case for that
                    if(!lib.isInCache(lib.getCurrentWallpaperUri()))
                    if(lib.getPictureUri() == lib.getCurrentWallpaperUri()){
                        _applyOverlay()
                    } else {
                        lib.setPictureUri(lib.getCurrentWallpaperUri());
                    }
                });
                break;
            case "wallpaper-dark":
                if(handlerWallpaperDark == null)
                handlerWallpaperDark= backgroundSetting.connect('changed::picture-uri-dark', () => {
                    if(!lib.isInCache(lib.getCurrentWallpaperUri()))
                    if(lib.getPictureUri() == lib.getCurrentWallpaperUri()){
                        _applyOverlay()
                    } else {
                        lib.setPictureUri(lib.getCurrentWallpaperUri());
                    }
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
            case "picture-uri":
                if(handlerPictureUri != null){
                    mySetting.disconnect(handlerPictureUri);
                    handlerAutoApply = null;
                }
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
        lib.setErrorMsg("Error Disconnecting Signal Listeners");
        lib.saveExceptionLog(e);
    }
}

function updateConnectFunctions(){
    // handles signals by color-scheme, wallpaper, wallpaper-dark, picture-uri
    // the remaining ones apply and auto-apply are handled in enable and disable
    try{
        if(lib.getAutoApplyState()){
            connectHandler("picture-uri");
            connectHandler("color-scheme");
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
            disconnectHandler("color-scheme");
            disconnectHandler("picture-uri");
            disconnectHandler("wallpaper");
            disconnectHandler("wallpaper-dark");
        }
        
    }
    catch(e)
    {
        lib.setErrorMsg("Error Updating Signal Listeners");
        lib.saveExceptionLog(e);
    }
}