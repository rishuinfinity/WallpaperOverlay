"use strict";
const Gio            = imports.gi.Gio;
const Gtk            = imports.gi.Gtk;
const Gdk            = imports.gi.Gdk;
const ExtensionUtils = imports.misc.extensionUtils;
const Me             = ExtensionUtils.getCurrentExtension();
const extension      = Me.imports.extension;

// Temporary Variables
let Settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay');

function init() {
}

/////////////////////////////////////////
// Shrink longer filenames to smaller size
function shrink_string(s){
    if (s.length < 35)
    return s;
    return s.substr(0,16)+"..."+s.substr(-16,16);
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
    // Create a parent widget that we'll return from this function
    this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperOverlay');
    let prefsWidget = new Gtk.Grid({
        margin_start   : 40,
        margin_end     : 40,  
        margin_top     : 40,
        margin_bottom  : 40,
        column_spacing : 20,
        row_spacing    : 12,
        visible        : true,
        halign         : Gtk.Align.CENTER,
    });
    let Image = new Gtk.Image({
        visible:true,
        can_focus: false,
        hexpand: true,
        vexpand: true
    });
    Image.set_from_file(this.settings.get_string("picture-uri")); 

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
        halign     : Gtk.Align.END,
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

    // let overlayMenuToggle = new Gtk.ComboBoxText({
    //     halign     : Gtk.Align.END,
    //     sensitive  : !this.settings.get_boolean('is-custom-overlay'),
    // });
    // Object.entries(OverlayOptions).forEach(([key, value]) => {
    //     overlayMenuToggle.append_text(key);
    //  });
        

    // overlayMenuToggle.set_active(this.settings.get_int("overlay-style") || 0);
    // overlayMenuToggle.connect('changed', combobox => {
    //     this.settings.set_int("overlay-style", combobox.get_active());
    //     overlayMenuToggle.set_active(this.settings.get_int("overlay-style") || 0);
    //     // Overlay.set_from_file(this.settings.get_string("overlay-style"));
    // });

    let overlayDropDownList = new Gtk.StringList({})
    Object.entries(OverlayOptions).forEach(([key, value]) => {
        overlayDropDownList.append(key);
     });

    let overlayMenuDropDown = new Gtk.DropDown({
        enable_search : false,
        model : overlayDropDownList,
        selected: this.settings.get_int("overlay-style") || 0
    })
    

    // Create a label & input for custom `overlay path`
    let overlayPathLabel = new Gtk.Label({
        label      : '<b>Custom Overlay Image:</b> (absolute)',
        halign     : Gtk.Align.START,
        use_markup : true,
        sensitive  : this.settings.get_boolean('is-custom-overlay')
    });
    let overlayPathButton = new Gtk.Button({
        label      : shrink_string(this.settings.get_string("overlay-uri")),
        valign     : Gtk.Align.CENTER,
        halign     : Gtk.Align.END,
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
            },
            this.settings.get_string("overlay-uri")
        );
    })

    // Create a button for custom overlay selection
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
    function customOverlayToggleOrganiseMenu(settings){
        // I dont know why but the boolean values are somehow sent reversed here, hence the opposite assignment
        overlayMenuLabel.sensitive  = settings.get_boolean('is-custom-overlay');
        overlayMenuToggle.sensitive = settings.get_boolean('is-custom-overlay');
        overlayPathLabel.sensitive  = !settings.get_boolean('is-custom-overlay');
        overlayPathButton.sensitive = !settings.get_boolean('is-custom-overlay');
        // if (settings.get_boolean('is-custom-overlay')){
        //     Overlay.set_from_file(this.settings.get_string("overlay-uri"));
        // } else{
        //     Overlay.set_from_file(this.settings.get_string("overlay-style"));
        // }
    }
    this.settings.bind(
        'is-custom-overlay',
        customOverlayToggle,
        'active',
        Gio.SettingsBindFlags.DEFAULT
    );
    customOverlayToggle.connect("state-set",() => {customOverlayToggleOrganiseMenu(this.settings);});

    // Create a label & imput for color
    let changeColorLabel = new Gtk.Label({
        label      : '<b>Set Overlay Color:</b>',
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

    // attach elements to positions
    prefsWidget.attach(Image,              0, 1, 2, 1); //prefsWidget.attach(Overlay,            1, 1, 1, 1);
    prefsWidget.attach(imagepathLabel,     0, 2, 1, 1); prefsWidget.attach(imageButton,        1, 2, 1, 1);
    prefsWidget.attach(overlayMenuLabel,   0, 3, 1, 1); prefsWidget.attach(overlayMenuDropDown,  1, 3, 1, 1);
    prefsWidget.attach(customOverlayLabel, 0, 4, 1, 1); prefsWidget.attach(customOverlayToggle,1, 4, 1, 1);
    prefsWidget.attach(overlayPathLabel,   0, 5, 1, 1); prefsWidget.attach(overlayPathButton,      1, 5, 1, 1);
    prefsWidget.attach(changeColorLabel,   0, 6, 1, 1); prefsWidget.attach(colorinp,           1, 6, 1, 1);
                            prefsWidget.attach(applyButton,        0, 7, 2, 1);
                            prefsWidget.attach(ErrorLabel,         0, 8, 2, 1);

    // Return our widget which will be added to the window
    // let window = prefsWidget.get_root();
    // window.default_width = 500;
    // window.default_height = 900;
    return prefsWidget;
}

