const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const extension = Me.imports.extension;
const home_dir = imports.gi.GLib.get_home_dir();

function init() {
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
        visible: true
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
    let imagepathentry = new Gtk.Entry({
        text: this.settings.get_string('picture-uri'),
        halign: Gtk.Align.END,
        hexpand: true,
        visible: true
    });
    this.settings.bind(
        'picture-uri',
        imagepathentry,
        'text',
        Gio.SettingsBindFlags.DEFAULT
    );

    // Create a label & input for `svg path`
    let svgpathLabel = new Gtk.Label({
        label: '<b>SVG Path:</b> (absolute)',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true
    });
    let svgpathentry = new Gtk.Entry({
        text: this.settings.get_string('svg-uri'),
        halign: Gtk.Align.END,
        hexpand: true,
        visible: true
    });
    this.settings.bind(
        'svg-uri',
        svgpathentry,
        'text',
        Gio.SettingsBindFlags.DEFAULT
    );

    // Create a label & imput for color
    let changeColorLabel = new Gtk.Label({
        label: '<b>Set Overlay Color:</b>',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true
    });
    let colorentry = new Gtk.Entry({
        text: this.settings.get_string('svg-color'),
        halign: Gtk.Align.END,
        hexpand: true,
        visible: true
    });
    this.settings.bind(
        'svg-color',
        colorentry,
        'text',
        Gio.SettingsBindFlags.DEFAULT
    );

    // Error msgs
    let ErrorLabel = new Gtk.Label({
        label: '',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true
    });

    // Apply Button
    let applyButton = new Gtk.Button({
        label: "Apply Wallpaper",
        visible: true
    });
    applyButton.connect('clicked', () => {
        let response = extension.applyWallpaper();
        ErrorLabel.label = response;
    });


    // attach elements to positions
    prefsWidget.attach(Label1,           0, 1, 2, 1);
    prefsWidget.attach(imagepathLabel,   0, 2, 1, 1);
    prefsWidget.attach(imagepathentry,   1, 2, 1, 1);
    prefsWidget.attach(svgpathLabel,     0, 3, 1, 1);
    prefsWidget.attach(svgpathentry,     1, 3, 1, 1);
    prefsWidget.attach(changeColorLabel, 0, 4, 1, 1);
    prefsWidget.attach(colorentry,       1, 4, 1, 1);
    prefsWidget.attach(applyButton,      0, 6, 2, 1);
    prefsWidget.attach(ErrorLabel,       0, 7, 2, 1);

    // Return our widget which will be added to the window
    return prefsWidget;
}