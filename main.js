const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const convert = require('xml-js');
const fs = require('fs');
const { readdir, stat } = require('fs');

const mm = require('music-metadata');
const util = require('util');

//require('electron-debug')();

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
            protocol: 'file:',
            slashes: true
        })
    );

    // The following is optional and will open the DevTools:
    // win.webContents.openDevTools()

    win.on('closed', () => {
        win = null;
    });
}

app.on('ready', createWindow);

// on macOS, closing the window doesn't quit the app
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// initialize the app's main window
app.on('activate', () => {
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

ipcMain.on('readPlaylist', async (event, dance, folder, file) => {
    if (file && fs.existsSync(folder + '\\' + file)) {
        event.reply('readPlaylistData', folder + '\\' + file);

        fs.readFile(folder + '/' + file, async (err, data) => {
            var options = { ignoreComment: true, alwaysChildren: true, compact: true, attributesKey: 'attributes' };
            var json = convert.xml2js(data, options);

            if (json && json.smil && json.smil.body && json.smil.body.seq && json.smil.body.seq.media) {
                if (Array.isArray(json.smil.body.seq.media)) {
                    json.smil.body.seq.media.forEach(async (item) => {
                        let src = getFilePath(folder, item.attributes.src);
                        item.attributes.exists = fs.existsSync(src);
                    });
                } else {
                    json.smil.body.seq.media.attributes.exists = fs.existsSync(getFilePath(folder, json.smil.body.seq.media.attributes.src));
                }
            }

            event.reply('playlistRead', dance, json);
        });
    } else {
        event.reply('playlistRead', dance, null);
    }
});

ipcMain.on('readPlaylistDetails', async (event, folder, items) => {
    if (items) {
        console.log('read playlist details ...');

        for (var i = 0; i < items.length; i++) {
            let src = getFilePath(folder, items[i].configuration.attributes.src);
            items[i].configuration.attributes.exists = fs.existsSync(src);

            // read metadata
            // if (items[i].configuration.attributes.exists) {
            //     try {
            //         let metadata = await mm.parseFile(src);
            //         items[i].configuration.metadata = {
            //             common: {
            //                 title: metadata.common.title,
            //                 genre: metadata.common.genre,
            //                 artists: metadata.common.artists,
            //                 album: metadata.common.album,
            //                 year: metadata.common.year
            //             },
            //             format: {
            //                 duration: metadata.format.duration
            //             }
            //         };
            //         //console.log(items[i]);
            //         //let result = util.inspect(metadata, { showHidden: false, depth: null });
            //     } catch (err) {
            //         console.log(err);
            //     }
            // }
        }
    }
    //console.log('playlist details read', util.inspect(items, { showHidden: false, depth: null }));

    event.reply('playlistDetailsRead', items);
});

function getFilePath(folder, src) {
    if (src.startsWith('..\\')) {
        return folder + '\\' + src;
    } else {
        return src;
    }
}