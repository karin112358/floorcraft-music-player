const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const convert = require('xml-js');
const fs = require('fs');
const { readdir, stat } = require('fs');

const mm = require('music-metadata');
const util = require('util');
const loki = require('lokijs');

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

let db = null;

ipcMain.on('loadPlaylists', (event, folder) => {
    db = new loki(folder + '\\music-player.db', {
        autoload: true,
        autoloadCallback: (async () => {
            // add collections to database
            var songs = db.getCollection('songs');
            if (songs === null) {
                songs = db.addCollection('songs');
            }

            var playlists = db.getCollection('playlists');
            if (playlists === null) {
                playlists = db.addCollection('playlists');
            }

            await readMetadata(folder, folder, songs, playlists, 0, false);
            // db.saveDatabase();
            event.reply('playlistsLoaded', playlists.data);
        }),
        autosave: true,
        autosaveInterval: 5000
    });
});

ipcMain.on('readPlaylistDetails', async (event, root, playlist, items) => {
    if (items) {
        console.log('read playlist details ...');

        for (var i = 0; i < items.length; i++) {
            let src = path.join(root, path.dirname(playlist.path), items[i].path);
            items[i].sortOrder = i;
            items[i].exists = fileIsValid(src);
            items[i].absolutePath = src;

            // load metadata
            var songs = db.getCollection('songs');
            results = songs.find({ 'path': { '$eq': src.replace(root, '') } });
            result = null;

            if (results.length > 0) {
                result = results[0];
            } else {
                result = await insertSong(songs, src, src.replace(root, ''));
            }

            if (result && !result.title) {
                result.title = result.filename;
            }

            items[i].metadata = result;
        }
    }

    //console.log(items);
    event.reply('playlistDetailsRead', items);
});

ipcMain.on('readMetadata', async (event, folder) => {
    await readMetadata(folder, folder, db.getCollection('songs'), db.getCollection('playlists'), 0, true);
    db.saveDatabase();
    event.reply('metadataRead', null);
});

async function readMetadata(root, folder, songs, playlists, level, readAllFiles) {
    var items = fs.readdirSync(folder);
    for (var i = 0; i < items.length; i++) {
        var item = path.join(folder, items[i]);

        if (fs.lstatSync(item).isDirectory()) {
            readMetadata(root, item, songs, playlists, level++);
        } else {
            if (!item.endsWith('.xml') && !item.endsWith('.db')) {
                try {
                    let itemPath = item.replace(root, '');

                    if (itemPath.endsWith('.wpl')) {
                        const lastModified = fs.statSync(item).mtimeMs;

                        // playlist
                        results = playlists.find({ 'path': { '$eq': itemPath } });
                        let playlist = null;

                        if (results.length < 1) {
                            playlist = {
                                path: itemPath,
                                filename: path.basename(itemPath)
                            };

                            playlist = playlists.insert(playlist);
                        } else {
                            playlist = results[0];
                        }

                        if (playlist.lastModified != lastModified) {
                            await updatePlaylist(playlist, root, lastModified);
                        }

                        //console.log(playlist);
                        playlists.update(playlist);
                    } else if (readAllFiles) {
                        // song
                        results = songs.find({ 'path': { '$eq': itemPath } });

                        if (results.length < 1) {
                            await insertSong(songs, item, itemPath);
                        }
                    }
                } catch (e) {
                    console.log('error', item, e);
                }
            }
        }
    }
}

async function insertSong(songs, file, relativePath) {
    let metadata = null;
    try {
        metadata = await mm.parseFile(file, { skipCovers: true, duration: true });
    } catch (e) {
        //console.log('file not supported', file, e);
    }

    if (metadata) {
        let itemData = {
            path: relativePath,
            filename: path.basename(relativePath),
            title: metadata.common.title,
            genre: metadata.common.genre,
            artists: metadata.common.artists,
            album: metadata.common.album,
            year: metadata.common.year,
            duration: metadata.format.duration
        };

        return songs.insert(itemData);
    }

    return null;
}

async function updatePlaylist(playlist, root, lastModified) {
    console.log('update playlist', path.join(root, playlist.path));
    var playlistItems = [];

    data = await fs.readFileSync(path.join(root, playlist.path));
    var options = { ignoreComment: true, alwaysChildren: true, compact: true, attributesKey: 'attributes' };
    var json = convert.xml2js(data, options);

    if (json && json.smil && json.smil.body && json.smil.body.seq && json.smil.body.seq.media) {
        playlist.title = json.smil.head.title._text;

        if (Array.isArray(json.smil.body.seq.media)) {
            json.smil.body.seq.media.forEach(async (item) => {
                let src = item.attributes.src;
                if (!path.isAbsolute(src)) {
                    src = path.join(root, path.dirname(playlist.path), item.attributes.src);
                }

                let exists = fileIsValid(src);
                playlistItems.push({ path: item.attributes.src, exists: exists })
            });
        } else {
            let item = json.smil.body.seq.media;
            let src = item.attributes.src;
            if (!path.isAbsolute(src)) {
                src = path.join(root, path.dirname(playlist.path), item.attributes.src);
            }

            let exists = fileIsValid(src);
            playlistItems.push({ path: item.attributes.src, exists: exists })
        }
    }

    //console.log(playlistItems);
    playlist.items = playlistItems;
    playlist.lastModified = lastModified;
}

function getFilePath(folder, src) {
    if (src.startsWith('..\\')) {
        return folder + '\\' + src;
    } else {
        return src;
    }
}

function fileIsValid(src) {
    return fs.existsSync(src);
}