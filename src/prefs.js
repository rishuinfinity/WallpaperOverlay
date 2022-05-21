"use strict";
const Gio            = imports.gi.Gio;
const Gtk            = imports.gi.Gtk;
const Gdk            = imports.gi.Gdk;
const ExtensionUtils = imports.misc.extensionUtils;
const Me             = ExtensionUtils.getCurrentExtension();
const extension      = Me.imports.extension;

// // Temporary Variables
// let Settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay');

function init() {
}

/////////////////////////////////////////
// Shrink longer filenames to smaller size
function shrink_string(s){
    if (s.length < 35)
    return s;
    return "..." + s.substr(-32);
}

/////////////////////////////////////////
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

/////////////////////////////////////////
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

/////////////////////////////////////////
// Build the Preference Widget

function buildPrefsWidget() {
    /////////////////////////////////////////
    // Create a parent widget that we'll return from this function
    this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay');
    let prefsWidget = new Gtk.Grid({
        margin_start   : 20,
        margin_end     : 20,  
        margin_top     : 20,
        margin_bottom  : 20,
        column_spacing : 20,
        row_spacing    : 12,
        visible        : true,
        halign         : Gtk.Align.CENTER,
    });
    let Image = new Gtk.Image({
        visible        :true,
        can_focus      : false,
        hexpand        : true,
        vexpand        : true,
        css_classes    : ['image'],
    });
    Image.set_from_file(this.settings.get_string("picture-uri")); 

    // let Overlay = new Gtk.Image({
    //     visible:true,
    //     can_focus: false,
    //     hexpand: true,
    //     vexpand: true
    // });
    // update_overlay_image();

    /////////////////////////////////////////
    // Create a label & input for `image path`
    let imagepathLabel = new Gtk.Label({
        label      : '<b>Choose Image:</b>',
        halign     : Gtk.Align.START,
        use_markup : true,
        visible    : true
    });
    let imageButton = new Gtk.Button({
        label      : shrink_string(this.settings.get_string("picture-uri")),
        valign     : Gtk.Align.CENTER,
        halign     : Gtk.Align.FILL,
    });
    imageButton.connect('clicked', ()=> {
        _showFileChooser(
            'Select Image',
            { action: Gtk.FileChooserAction.OPEN },
            "Open",
            filename => {
                this.settings.set_string("picture-uri",filename);
                imageButton.label = shrink_string(filename);
                Image.set_from_file(this.settings.get_string("picture-uri"));
            },
            this.settings.get_string("picture-uri")
        );
        
    })
    let getCurrentWallpaper = new Gtk.Button({
        valign     : Gtk.Align.CENTER,
        halign     : Gtk.Align.FILL,
        tooltip_text: "Get Current Wallpaper",
        icon_name  : "object-rotate-left-symbolic"
    });
    getCurrentWallpaper.connect('clicked',()=>{
        let setting = new Gio.Settings({schema: "org.gnome.desktop.background"});
        let wlpapr  = setting.get_string("picture-uri").substr(7,);
        this.settings.set_string("picture-uri",wlpapr);
        imageButton.label = shrink_string(wlpapr);
        Image.set_from_file(this.settings.get_string("picture-uri")); 
    });

    /////////////////////////////////////////
    // Overlay Menu
    let OverlayOptions = {};
    try{
        let resfolder  = Gio.file_new_for_path(Me.path + "/resources/");
        let enumerator = resfolder.enumerate_children("standard::name, standard::type",Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
        let child;
        while ((child = enumerator.next_file(null))){
            // check if it is a file
            if( child.get_file_type() == Gio.FileType.REGULAR)
            {
            // check extension
            let split = child.get_name().split(".");
            if  (split.pop() == "svg"){
                OverlayOptions[split.join("")]= "/resources/"+child.get_name();
            }
            }
        }
        OverlayOptions = Object.keys(OverlayOptions).sort().reduce((r, k) => (r[k] = OverlayOptions[k], r), {});
    }
    catch(e){
        extension.saveExceptionLog(e);
    }
    let overlayMenuLabel = new Gtk.Label({
        label      : '<b>Overlay:</b>',
        halign     : Gtk.Align.START,
        use_markup : true,
        sensitive  : !this.settings.get_boolean('is-custom-overlay'),
    });

    let overlayDropDownList = new Gtk.StringList({})
    Object.entries(OverlayOptions).forEach(([key, value]) => {
        overlayDropDownList.append(key);
     });

    let overlayMenuDropDown = new Gtk.DropDown({
        enable_search : false,
        model : overlayDropDownList,
        sensitive  : !this.settings.get_boolean('is-custom-overlay'),
        selected: this.settings.get_int("overlay-style") || 0
    })
    function set_overlay_menu_sensitivity(val){
        overlayMenuLabel.sensitive = val;
        overlayMenuDropDown.sensitive = val;
    }

    /////////////////////////////////////////
    // Create a toggle for custom overlay selection
    let customOverlayLabel = new Gtk.Label({
        label      : '<b>Use Custom Overlay Image:</b>',
        halign     : Gtk.Align.START,
        use_markup : true
    });

    let customOverlayToggle = new Gtk.Switch({
        active     : false,
        halign     : Gtk.Align.END,
        hexpand    : true,
        visible    : true
    });
    this.settings.bind(
        'is-custom-overlay',
        customOverlayToggle,
        'active',
        Gio.SettingsBindFlags.DEFAULT
    );
    customOverlayToggle.connect("state-set",() => {
        // I dont know why but the boolean values are somehow sent reversed here, hence the opposite assignment
        if (customOverlayToggle.get_state() == true){
            set_overlay_menu_sensitivity(true);
            set_custom_overlay_sensitivity(false);
            set_color_sensitivity(true);
        }
        else{
            set_overlay_menu_sensitivity(false);
            set_custom_overlay_sensitivity(true);
            if (this.settings.get_string("overlay-uri").substr(-3) == "svg") set_color_sensitivity(true)
            else set_color_sensitivity(false)
        }
    });

    /////////////////////////////////////////
    // Create a label & input for custom `overlay path`
    let overlayPathLabel = new Gtk.Label({
        label      : '<b>Custom Overlay Image:</b>  (svg/png)',
        halign     : Gtk.Align.START,
        use_markup : true,
        sensitive  : this.settings.get_boolean('is-custom-overlay')
    });
    let overlayPathButton = new Gtk.Button({
        label      : shrink_string(this.settings.get_string("overlay-uri")),
        valign     : Gtk.Align.CENTER,
        halign     : Gtk.Align.FILL,
        sensitive  : this.settings.get_boolean('is-custom-overlay')
    });
    overlayPathButton.connect('clicked', ()=> {
        _showFileChooser(
            'Select Overlay File (.svg)',
            {action: Gtk.FileChooserAction.OPEN },
            "Open",
            filename => {
                this.settings.set_string("overlay-uri",filename);
                overlayPathButton.label = shrink_string(filename);
                if (filename.substr(-3) == "svg") set_color_sensitivity(true)
                else set_color_sensitivity(false)
            },
            this.settings.get_string("overlay-uri")
        );
    })
    function set_custom_overlay_sensitivity(val){
        overlayPathLabel.sensitive = val;
        overlayPathButton.sensitive= val;
    }
    // function update_overlay_image(){};
    // update_overlay_image = () =>{
    //     if(this.settings.get_boolean('is-custom-overlay')){
    //         Overlay.set_from_file(this.settings.get_string("overlay-uri"));
    //     }
    //     else{
    //         let overlay_path = Me.path + OverlayOptions[Object.keys(OverlayOptions)[this.settings.get_int('overlay-style')]];
    //         Overlay.set_from_file(overlay_path);
    //     }
    // };

    /////////////////////////////////////////
    // Create a label & imput for color
    let changeColorLabel = new Gtk.Label({
        label      : '<b>Set Overlay Primary Color:</b>',
        halign     : Gtk.Align.START,
        use_markup : true,
        visible    : true
    });
    let colorinp = new Gtk.Box({
        visible    : true,
        can_focus  : true,
        halign     : Gtk.Align.END,
        homogeneous: false,
    });
    let colorlabel = new Gtk.Label({
        label      : this.settings.get_string('overlay-color'),
        halign     : Gtk.Align.END,
        use_markup : true,
        visible    : true
    });
    let colorentry = new Gtk.ColorButton({
        visible    : true,
        can_focus  : true,
        halign     : Gtk.Align.END,
    });
    let rgba = colorentry.get_rgba();
    rgba.parse(this.settings.get_string('overlay-color'));
    colorentry.set_rgba(rgba);
    colorentry.connect('color-set',() => {
        let color = cssHexString(colorentry.get_rgba().to_string());
        this.settings.set_string('overlay-color',color);
        colorlabel.label = color;
    });
    colorinp.append(colorlabel);
    colorinp.append(colorentry);

    function set_color_sensitivity(val){
        colorinp.sensitive = val;
        changeColorLabel.sensitive = val;
    }
    if (!this.settings.get_boolean("is-custom-overlay") || this.settings.get_string("overlay-uri").substr(-3) == "svg") set_color_sensitivity(true)
    else set_color_sensitivity(false)

    /////////////////////////////////////////
    // Error msgs
    let ErrorMsg   = new Gtk.TextBuffer({
        text       : ''
    })
    let ErrorLabel = new Gtk.TextView({
        buffer         : ErrorMsg,
        editable       : false,
        bottom_margin  : 10,
        left_margin    : 10,
        top_margin     : 10,
        right_margin   : 10,
        monospace      : true,
        cursor_visible : false,
        justification  : Gtk.Justification.CENTER
        
    });

    /////////////////////////////////////////
    // Apply Button
    let applyButton = new Gtk.Button({
        label      : "Apply Wallpaper",
        visible    : true,
        
    });
    applyButton.connect('clicked', () => {
        ErrorMsg.text = "Applying...";
        this.settings.set_int("overlay-style", overlayMenuDropDown.selected);
        let overlay_path = Me.path + OverlayOptions[Object.keys(OverlayOptions)[this.settings.get_int('overlay-style')]];
        if (this.settings.get_boolean('is-custom-overlay')){
            overlay_path = this.settings.get_string('overlay-uri');
        }
        let response     = extension.applyWallpaper(overlay_path);
        ErrorMsg.text = String(response);
    });

    /////////////////////////////////////////
    // attach elements to positions
    prefsWidget.attach(Image,              0, 1, 3, 1);                                                         //prefsWidget.attach(Overlay,             2, 1, 1, 1);
    prefsWidget.attach(imagepathLabel,     0, 2, 1, 1); prefsWidget.attach(getCurrentWallpaper, 1, 2, 1, 1);    prefsWidget.attach(imageButton,         2, 2, 1, 1);
    prefsWidget.attach(overlayMenuLabel,   0, 3, 1, 1);                                                         prefsWidget.attach(overlayMenuDropDown, 2, 3, 1, 1);
    prefsWidget.attach(customOverlayLabel, 0, 4, 1, 1);                                                         prefsWidget.attach(customOverlayToggle, 2, 4, 1, 1);
    prefsWidget.attach(overlayPathLabel,   0, 5, 1, 1);                                                         prefsWidget.attach(overlayPathButton,   2, 5, 1, 1);
    prefsWidget.attach(changeColorLabel,   0, 6, 1, 1);                                                         prefsWidget.attach(colorinp,            2, 6, 1, 1);
                                                        prefsWidget.attach(applyButton,        0, 7, 3, 1);
                                                        prefsWidget.attach(ErrorLabel,         0, 8, 3, 1);

    /////////////////////////////////////////
    // Return our widget which will be added to the window
    // PS: I wasn't able to resize the prefs window, I wanted to make the height of the prefs window a little bigger
    // so that the image is a little bigger as well. I tried adding height_request in gtk.grid but it didn't work.
    return prefsWidget;
}

