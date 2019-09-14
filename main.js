const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const url = require("url");
const convert = require('xml-js');
const fs = require("fs");
const { readdir, stat } = require("fs");

require('electron-debug')();

let win;

function createWindow() {
    win = new BrowserWindow({
        title: 'UTSC Music Player',
        width: 1200,
        height: 800,
        icon: __dirname + '/assets/images/ballroom.ico',
        webPreferences: {
            nodeIntegration: true,
            backgroundThrottling: false
        }
    });
    
    win.maximize();

    // load the dist folder from Angular
    win.loadURL(
        url.format({
            pathname: path.join(__dirname, `/dist/index.html`),
            protocol: "file:",
            slashes: true
        })
    );

    // The following is optional and will open the DevTools:
    // win.webContents.openDevTools()

    win.on("closed", () => {
        win = null;
    });
}

app.on("ready", createWindow);

// on macOS, closing the window doesn't quit the app
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// initialize the app's main window
app.on("activate", () => {
    if (win === null) {
        createWindow();
    }
});

ipcMain.on('loadPlaylists', (event, arg) => {
    //event.returnValue = 'test';
    readdir(arg, (err, files) => {
        if (err) {
            console.error(err);
        }

        event.reply('playlistsLoaded', files.filter(f => f.endsWith('.wpl')));
    });
});

ipcMain.on('readPlaylist', (event, dance, folder, file) => {
    if (file && fs.existsSync(folder + '/' + file)) {
        fs.readFile(folder + '/' + file, function (err, data) {
            var options = { ignoreComment: true, alwaysChildren: true, compact: true, attributesKey: 'attributes' };
            var json = convert.xml2js(data, options);

            if (json && json.smil && json.smil.body && json.smil.body.seq && json.smil.body.seq.media) {
                if (Array.isArray(json.smil.body.seq.media)) {
                    json.smil.body.seq.media.forEach((item) => {
                        if (item.attributes.src.startsWith('..\\')) {
                            item.attributes.exists = fs.existsSync(folder + '\\' + item.attributes.src);
                        } else {
                            item.attributes.exists = fs.existsSync(item.attributes.src);
                        }
                    });
                } else {
                    json.smil.body.seq.media.attributes.exists = fs.existsSync(json.smil.body.seq.media.attributes.src);
                }
            }

            event.reply('playlistRead', dance, json);
        });
    } else {
        event.reply('playlistRead', dance, null);
    }
});