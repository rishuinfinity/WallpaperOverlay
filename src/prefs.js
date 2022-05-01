const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const extension = Me.imports.extension;
const home_dir = imports.gi.GLib.get_home_dir();
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
function _showFileChooser(title, params, acceptBtn, acceptHandler) {
    let dialog = new Gtk.FileChooserDialog({
        title: title,
        modal: true,
        action: params.action,
    });
    dialog.add_button("Cancel", Gtk.ResponseType.CANCEL);
    dialog.add_button(acceptBtn, Gtk.ResponseType.ACCEPT);

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
        // margin: 18,
        margin_start: 40,
        margin_end: 40,  
        margin_top: 40,
        margin_bottom: 40,
        column_spacing: 20,
        row_spacing: 12,
        visible: true,
        halign: Gtk.Align.CENTER,
    });
    // Label to notify about dependencies
    let Label1 = new Gtk.Label({
        label: "Integrate your wallpaper to your Desktop",
        halign: Gtk.Align.CENTER,
        use_markup: true,
        visible: true
    });

    // Create a label & input for `image path`
    let imagepathLabel = new Gtk.Label({
        label: '<b>Image Path:</b> (absolute)',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true
    });
    let imageButton = new Gtk.Button({
        label: shrink_string(this.settings.get_string("picture-uri")),
        valign: Gtk.Align.CENTER,
        halign: Gtk.Align.END,
    });
    imageButton.connect('clicked', ()=> {
        _showFileChooser(
            'Select Image',
            { action: Gtk.FileChooserAction.OPEN },
            "Open",
            filename => {
                this.settings.set_string("picture-uri",filename);
                imageButton.label = shrink_string(filename);
            }
        );
    })
    // Overlay Menu
    let OverlayOptions = {
        "Bottom Gradient Waves" : "/resources/bottom_gradient_waves.png",
        "Top Solid Convex" : "/resources/top_solid_convex.png"
      };
    let overlayMenuLabel = new Gtk.Label({
        label: '<b>Overlay:</b>',
        halign: Gtk.Align.START,
        use_markup: true,
        sensitive: !this.settings.get_boolean('is-custom-overlay'),
    });

    let overlayMenuToggle = new Gtk.ComboBoxText({
        halign: Gtk.Align.END,
        sensitive: !this.settings.get_boolean('is-custom-overlay'),
    });
    // let options = ["Bottom Gradient Waves", "Top Solid Convex"];
    // for (let item of options)
    //     overlayMenuToggle.append_text(item);
    Object.entries(OverlayOptions).forEach(([key, value]) => {
        overlayMenuToggle.append_text(key);
     });
        

    overlayMenuToggle.set_active(this.settings.get_enum("overlay-style") || 0);
    overlayMenuToggle.connect('changed', combobox => {
        this.settings.set_enum("overlay-style", combobox.get_active());
        overlayMenuToggle.set_active(this.settings.get_enum("overlay-style") || 0);
    });

    // Create a label & input for custom `overlay path`
    let overlayPathLabel = new Gtk.Label({
        label: '<b>Custom overlay Path:</b> (absolute)',
        halign: Gtk.Align.START,
        use_markup: true,
        sensitive: this.settings.get_boolean('is-custom-overlay')
    });
    let overlayPathButton = new Gtk.Button({
        label: shrink_string(this.settings.get_string("overlay-uri")),
        valign: Gtk.Align.CENTER,
        halign: Gtk.Align.END,
        sensitive: this.settings.get_boolean('is-custom-overlay')
    });
    overlayPathButton.connect('clicked', ()=> {
        _showFileChooser(
            'Select Overlay File (.png)',
            { action: Gtk.FileChooserAction.OPEN },
            "Open",
            filename => {
                this.settings.set_string("overlay-uri",filename);
                overlayPathButton.label = shrink_string(filename);
            }
        );
    })

    // Create a button for custom overlay selection
    let customOverlayLabel = new Gtk.Label({
        label: '<b>Use Custom Overlay file:</b>',
        halign: Gtk.Align.START,
        use_markup: true
    });

    let customOverlayToggle = new Gtk.Switch({
        active: false,
        halign: Gtk.Align.END,
        hexpand: true,
        visible: true
    });
    function customOverlayToggleOrganiseMenu(settings){
        // I dont know why but the boolean values are somehow sent reversed here, hence the opposite assignment
        overlayMenuLabel.sensitive  = settings.get_boolean('is-custom-overlay');
        overlayMenuToggle.sensitive = settings.get_boolean('is-custom-overlay');
        overlayPathLabel.sensitive  = !settings.get_boolean('is-custom-overlay');
        overlayPathButton.sensitive = !settings.get_boolean('is-custom-overlay');
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
        label: '<b>Set Overlay Color:</b>',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true
    });
    let colorinp = new Gtk.Box({
        visible: true,
        can_focus: true,
        halign: Gtk.Align.END,
        homogeneous: false,
    });
    let colorlabel = new Gtk.Label({
        label: this.settings.get_string('overlay-color'),
        halign: Gtk.Align.END,
        use_markup: true,
        visible: true
    });
    let colorentry = new Gtk.ColorButton({
        visible: true,
        can_focus: true,
        halign: Gtk.Align.END,
    });
    rgba = colorentry.get_rgba();
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
    let ErrorLabel = new Gtk.Label({
        label: '',
    });

    // Apply Button
    let applyButton = new Gtk.Button({
        label: "Apply Wallpaper",
        visible: true
    });
    applyButton.connect('clicked', () => {
        ErrorLabel.label = "Applying...";
        // extension.saveExceptionLog(this.settings.get_enum('overlay-style'));
        // extension.saveExceptionLog(extension.overlay_map[this.settings.get_enum('overlay-style')]);
        // extension.saveExceptionLog(Me.path + extension.overlay_map[this.settings.get_enum('overlay-style')]);
        let overlay_path = Me.path + OverlayOptions[Object.keys(OverlayOptions)[this.settings.get_enum('overlay-style')]];
        extension.saveExceptionLog(overlay_path);
        if (this.settings.get_boolean('is-custom-overlay')){
            overlay_path = this.settings.get_string('overlay-uri');
        }
        
        let response = extension.applyWallpaper(overlay_path);
        if (response != "true\n"){
            extension.saveExceptionLog("Response: "+response);
            // Settings.set_string('error-msg',response);
            ErrorLabel.label = "Error: " + String(response);
        }
        else
        ErrorLabel.label = "Applied";
    });

    // attach elements to positions
                            prefsWidget.attach(Label1,             0, 1, 2, 1);
    prefsWidget.attach(imagepathLabel,     0, 2, 1, 1); prefsWidget.attach(imageButton,        1, 2, 1, 1);
    prefsWidget.attach(overlayMenuLabel,   0, 3, 1, 1); prefsWidget.attach(overlayMenuToggle,  1, 3, 1, 1);
    prefsWidget.attach(customOverlayLabel, 0, 4, 1, 1); prefsWidget.attach(customOverlayToggle,1, 4, 1, 1);
    prefsWidget.attach(overlayPathLabel,   0, 5, 1, 1); prefsWidget.attach(overlayPathButton,      1, 5, 1, 1);
    prefsWidget.attach(changeColorLabel,   0, 6, 1, 1); prefsWidget.attach(colorinp,           1, 6, 1, 1);
                            prefsWidget.attach(applyButton,        0, 7, 2, 1);
                            prefsWidget.attach(ErrorLabel,         0, 8, 2, 1);

    // Return our widget which will be added to the window
    return prefsWidget;
}
