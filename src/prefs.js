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
        label: "Make Sure to install dependencies",
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
    // this.settings.bind(
    //     'picture-uri',
    //     imageButton,
    //     'label',
    //     Gio.SettingsBindFlags.DEFAULT
    // );

    // Create a label & input for `svg path`
    let svgpathLabel = new Gtk.Label({
        label: '<b>SVG Path:</b> (absolute)',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true
    });
    let overlayButton = new Gtk.Button({
        label: shrink_string(this.settings.get_string("svg-uri")),
        valign: Gtk.Align.CENTER,
        halign: Gtk.Align.END,
    });
    overlayButton.connect('clicked', ()=> {
        _showFileChooser(
            'Select Overlay File (.png)',
            { action: Gtk.FileChooserAction.OPEN },
            "Open",
            filename => {
                this.settings.set_string("svg-uri",filename);
                overlayButton.label = shrink_string(filename);
            }
        );
    })
    // this.settings.bind(
    //     'svg-uri',
    //     overlayButton,
    //     'label',
    //     Gio.SettingsBindFlags.DEFAULT
    // );

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
        label: this.settings.get_string('svg-color'),
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
    rgba.parse(this.settings.get_string('svg-color'));
    colorentry.set_rgba(rgba);
    colorentry.connect('color-set',() => {
        let color = cssHexString(colorentry.get_rgba().to_string());
        this.settings.set_string('svg-color',color);
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
        let response = extension.applyWallpaper();
        if (response != "true\n"){
            extension.saveExceptionLog("Response: "+response);
            // Settings.set_string('error-msg',response);
            ErrorLabel.label = "Error: " + String(response);
        }
        else
        ErrorLabel.label = "Applied";
    });

    // attach elements to positions
    prefsWidget.attach(Label1,           0, 1, 2, 1);
    prefsWidget.attach(imagepathLabel,   0, 2, 1, 1);
    prefsWidget.attach(imageButton,      1, 2, 1, 1);
    prefsWidget.attach(svgpathLabel,     0, 3, 1, 1);
    prefsWidget.attach(overlayButton,    1, 3, 1, 1);
    prefsWidget.attach(changeColorLabel, 0, 4, 1, 1);
    prefsWidget.attach(colorinp,       1, 4, 1, 1);
    prefsWidget.attach(applyButton,      0, 6, 2, 1);
    prefsWidget.attach(ErrorLabel,       0, 7, 2, 1);

    // Return our widget which will be added to the window
    return prefsWidget;
}
