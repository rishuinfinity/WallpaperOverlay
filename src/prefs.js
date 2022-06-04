/*
* Name: Wallpaper Overlay
* Description: Extension to apply Overlays on wallpaper
* Author: Rishu Raj
*/
'use strict';
////////////////////////////////////////////////////////////
// Const Imports
const {Gtk,Adw,Gio,GLib,Gdk,GdkPixbuf}  = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me             = ExtensionUtils.getCurrentExtension();
const lib            = Me.imports.lib;

////////////////////////////////////////////////////////////
// Function Declaraions
// function init();
// function fillPreferencesWindow(window);
// function shrink_string(s)
// function _showFileChooser(title, params, acceptBtn, acceptHandler, filePath)
// function cssHexString(css)

////////////////////////////////////////////////////////////
// Prefs.js default functions
function init(){
    const styleProvider = new Gtk.CssProvider();
    styleProvider.load_from_path(GLib.build_filenamev([Me.path, 'stylesheet.css']));
    Gtk.StyleContext.add_provider_for_display(Gdk.Display.get_default(), styleProvider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
}

function fillPreferencesWindow(window){
    window.set_default_size(530, 700);
    let builder = Gtk.Builder.new();
    // Global Variable for prefs window
    window.mySetting = ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay');
    builder.add_from_file(Me.path + '/prefs.ui');
    // Creating variables corresponding to objects
    let image = builder.get_object("image");
    let overlay= builder.get_object("overlay");
    let isAutoApplySwitch = builder.get_object('is-auto-apply-switch');
    let imageUriRow = builder.get_object("image-uri-row");
    let imageUriRefresh=builder.get_object("image-uri-refresh");
    let overlayStyleComboRow=builder.get_object("overlay-style-comborow");
    let isCustomOverlaySwitch=builder.get_object("is-custom-overlay-switch");
    let overlayUriRow = builder.get_object("overlay-uri-row");
    let overlayColorRow=builder.get_object("overlay-color-row");
    let overlayColorLabel=builder.get_object("overlay-color-label");
    let overlayColorPicker=builder.get_object("overlay-color-picker");
    let applyButton = builder.get_object("apply-button");
    let errorGroup=builder.get_object("error-group");
    let errorRow = builder.get_object("error-row");
    let errorView= builder.get_object("error-view");

    //
    // This block is here intentionally
    {
        let dropErr = ["Applied","Applying","Only Supported"];
        let errmsg = lib.getErrorMsg();
        for (let d of dropErr){
            if(errmsg.includes(d)){
                lib.setErrorMsg("");
                break;
            }
        }
    }
    //
    //Adding bindings and connecting
    //Image
    function updateImage(){
        image.set_from_file(lib.getPictureUri());
    }
    updateImage();
    window.handlerPictureUri = window.mySetting.connect("changed::picture-uri", () => {
        updateImage();
        imageUriRow.subtitle = lib.getPictureUri();
    });

    // Overlay
    function updateOverlayImage(){
        let overlayFormat = lib.getOverlayFormat();
        if(overlayFormat == "svg"){
            let data = lib.getModifiedOverlayResource();
            let stream= Gio.MemoryInputStream.new_from_bytes(GLib.Bytes.new(data))
            let pixbuf = GdkPixbuf.Pixbuf.new_from_stream(stream,null);
            overlay.set_from_pixbuf(pixbuf);
            return;
        }
        else{
            overlay.set_from_file(lib.getOverlayFileUri());
        }
    }
    updateOverlayImage();
    

    // Auto Apply Switch
    window.mySetting.bind(
        'is-auto-apply',
        isAutoApplySwitch,
        'active',
        Gio.SettingsBindFlags.DEFAULT
    );
    isAutoApplySwitch.connect("notify::active",() =>{
        updateapplyButtonSensitivity();
    });

    imageUriRow.subtitle = shrink_string(lib.getPictureUri());

    imageUriRow.connect('activated', () => {
        _showFileChooser(
            'Select Image',
            { action: Gtk.FileChooserAction.OPEN },
            "Open",
            filename => {
                if(lib.setPictureUri(filename)){
                    lib.setErrorMsg("");
                    imageUriRow.subtitle = shrink_string(filename);
                }
                else{
                    lib.setErrorMsg("Only Supported image formats are png, jpg and jpeg\nWhereas "
                    +filename
                    +" is of format "
                    + filename.split(".").pop());
                }
            },
            lib.getPictureUri()
        );
    });

    imageUriRefresh.connect('clicked',()=>{
        let wlpapr = lib.getCurrentWallpaperUri();
        if(lib.setPictureUri(wlpapr))
        imageUriRow.subtitle = shrink_string(wlpapr);
    });

    // Overlay Style DropDown
    function updateOverlayStyleDropDownSensitivity(){
        if(lib.getCustomOverlayState()){
            overlayStyleComboRow.sensitive = false;
        }
        else{
            overlayStyleComboRow.sensitive = true;
        }
    }
    let OverlayOptions = lib.getLocalOverlayOptions();
    let overlayDropDownList = new Gtk.StringList({});
    Object.entries(OverlayOptions).forEach(([key, value]) => {
        overlayDropDownList.append(key);
    });
    overlayStyleComboRow.model = overlayDropDownList;
    overlayStyleComboRow.connect("notify::selected-item", ()=>{
        lib.setOverlayStyleId(overlayStyleComboRow.selected);
        updateOverlayImage();
        if(lib.getAutoApplyState()){
            lib.setApplySignal(!lib.getApplySignal());
        }
    });
    overlayStyleComboRow.selected=lib.getOverlayStyleId();
    updateOverlayStyleDropDownSensitivity();

    // Use Custom Overlay Switch
    window.mySetting.bind(
        'is-custom-overlay',
        isCustomOverlaySwitch,
        'active',
        Gio.SettingsBindFlags.DEFAULT
    );
    isCustomOverlaySwitch.connect("notify::active",() =>{
        updateOverlayStyleDropDownSensitivity();
        updateOverlayUriSensitivity();
        updateOverlayColorPickerSensitivity(lib.getOverlayFileUri());
        updateOverlayImage();
        if(lib.getAutoApplyState()){
            lib.setApplySignal(!lib.getApplySignal());
        }
    });

    // Overlay Uri Label
    function updateOverlayUriSensitivity(){
        if(isCustomOverlaySwitch.get_state() == true){
            overlayUriRow.sensitive = true;
        }
        else{
            overlayUriRow.sensitive = false;
        }
    };
    updateOverlayUriSensitivity();
    overlayUriRow.subtitle = shrink_string(lib.getOverlayUri());
    overlayUriRow.connect('activated', () => {
        _showFileChooser(
            'Select Overlay',
            { action: Gtk.FileChooserAction.OPEN },
            "Open",
            filename => {
                if(lib.setOverlayUri(filename)){
                    overlayUriRow.subtitle = shrink_string(filename);
                    updateOverlayImage();
                    updateOverlayColorPickerSensitivity(filename);
                    lib.setErrorMsg("");
                    if(lib.getAutoApplyState()){
                        lib.setApplySignal(!lib.getApplySignal());
                    }
                }
                else{
                    lib.setErrorMsg("Only Supported overlay formats are png and svg\nWhereas "
                    +filename
                    +" is of format "
                    + filename.split(".").pop());
                }
                
            },
            lib.getOverlayUri()
        );
    });
    
    // Overlay Color Button
    function updateOverlayColorPickerSensitivity(filename){
        if(filename.substr(-3)=="svg"){
            overlayColorRow.sensitive = true;
        }
        else{
            overlayColorRow.sensitive = false;
        }
    }
    updateOverlayColorPickerSensitivity(lib.getOverlayFileUri());
    let rgba = overlayColorPicker.get_rgba();
    rgba.parse(lib.getOverlayColor());
    overlayColorPicker.set_rgba(rgba);
    overlayColorLabel.label = lib.getOverlayColor();
    overlayColorPicker.connect('color-set',() => {
        let color = cssHexString(overlayColorPicker.get_rgba().to_string());
        lib.setOverlayColor(color);
        overlayColorLabel.label = color;
        updateOverlayImage();
        if(lib.getAutoApplyState()){
            lib.setApplySignal(!lib.getApplySignal());
        }

    });

    // Apply Button
    function updateapplyButtonSensitivity(){
        if(lib.getAutoApplyState()){
            applyButton.sensitive = false;
        }
        else{
            applyButton.sensitive = true;
        }
    }
    updateapplyButtonSensitivity();
    applyButton.connect('clicked',()=>{
        lib.setErrorMsg("Applying");
        lib.setApplySignal(!lib.getApplySignal());
    });

    // Error Row
    function showSimpleError(icon_name, title){
        let errorRowActionRow = errorRow.get_first_child().get_first_child().get_first_child();
        let errorRowSuffix = errorRowActionRow.get_first_child().get_last_child();
        errorGroup.visible = true;
        errorRow.enable_expansion=false;
        errorRow.expanded = false;
        errorRowActionRow.activatable = false;
        errorRowSuffix.visible = false;
        errorRow.title=title;
        errorRow.icon_name=icon_name;
    }
    function showComplexError(icon_name,title, description){
        let errorRowActionRow = errorRow.get_first_child().get_first_child().get_first_child();
        let errorRowSuffix = errorRowActionRow.get_first_child().get_last_child();
        errorGroup.visible = true;
        errorRow.enable_expansion=true;
        errorRow.expanded = false;
        errorRowActionRow.activatable = true;
        errorRowSuffix.visible = true;
        errorRow.title=title;
        errorRow.icon_name=icon_name;
        errorView.label=description;
    }
    function updateErrorShowStatus(){
        let errMsg = lib.getErrorMsg();
        if(lib.getAutoApplyState()){
            if(errMsg == "Applied") errMsg = "";
            if(errMsg == "Applying")errMsg = "";
        }
        switch(errMsg){
            case "":
                // errorGroup.visible = false;
                showComplexError(
                    "face-smile-symbolic",
                    "Thanks for using Wallpaper Overlay",
                    "Visit the github page for more overlays, or you can create some with your own ideas."
                );
                break;
            case "Applied":
                showSimpleError(
                    "emblem-default-symbolic",
                    "Overlay Applied Successfully"
                    );
                break;
            case "Applying":
                showSimpleError(
                    "emblem-synchronizing-symbolic",
                    "Applying"
                    );
                break;
            case "GLib.SpawnError: Failed to execute child process “convert” (No such file or directory)":
                showComplexError(
                    "dialog-warning-symbolic",
                    "Please install ImageMagick",
                    "Please install the dependency 'ImageMagick' using your default package manager.\nVisit https://imagemagick.org/script/download.php to know more.\n"+
                    "\nThe error generated was: \n"+
                    errMsg
                );
                break;
            default:
                showComplexError("dialog-error-symbolic","Some Error Occured",errMsg + "\n See .local/var/log/WallpaperOverlay.log to know more");
            }

    }

    updateErrorShowStatus();
    window.handlerErrorMsg = window.mySetting.connect("changed::error-msg", () => {
        updateErrorShowStatus();
    });

    // Disconnect Signals of windows
    window.connect('close-request', () => {
        // disconnect
        window.mySetting.disconnect(window.handlerErrorMsg);
        window.mySetting.disconnect(window.handlerPictureUri);
    });


    let page = builder.get_object('prefs-page');
    window.add(page);
}

////////////////////////////////////////////////////////////
// Function Implementations
function shrink_string(s){
    if (s.length < 50)
    return s;
    return "..." + s.substr(-50);
}

// File Picker Button (From color-picker@tuberry)
function _showFileChooser(title, params, acceptBtn, acceptHandler, filePath) {
    // let filter = newGtk.FileFilter({});
    // filter.add_pattern(".png")
    let dialog = new Gtk.FileChooserDialog({
        title  : title,
        modal  : true,
        action : params.action,
    });
    dialog.add_button("Cancel" , Gtk.ResponseType.CANCEL);
    dialog.add_button(acceptBtn, Gtk.ResponseType.ACCEPT);
    dialog.set_file(Gio.file_new_for_path(filePath));

    dialog.connect("response", (self, response) => {
        if(response === Gtk.ResponseType.ACCEPT){
            acceptHandler(dialog.get_file().get_path());
        }
        dialog.destroy();
    });
    dialog.show();
}

// RGBA to Hex (From dash-to-panel@jderose9.github.com)
function cssHexString(css) {
    let rrggbb = '#';
    let start;
    for (let loop = 0; loop < 3; loop++) {
        let end = 0;
        let xx = '';
        for (let loop = 0; loop < 2; loop++) {
            while (true) {
                let x = css.slice(end, end + 1);
                if ((x == '(') || (x == ',') || (x == ')'))
                    break;
                end++;
            }
            if (loop == 0) {
                end++;
                start = end;
            }
        }
        xx = parseInt(css.slice(start, end)).toString(16);
        if (xx.length == 1)
            xx = '0' + xx;
        rrggbb += xx;
        css = css.slice(end);
    }
    return rrggbb;
}

