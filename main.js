'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const convert = require('xml-js');
const fs = require('fs');
const { readdir, stat } = require('fs');

const mm = require('music-metadata');
const util = require('util');
const loki = require('lokijs');
const id3 = require('node-id3');

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

let db = null;

/**
 * Initialize database and load configuration.
 */
ipcMain.on('initialize', (event) => {
    db = new loki(path.join(app.getPath('userData'), '/music-player.db'), {
        autoload: true,
        autoloadCallback: (async () => {
            // add collections to database
            let configuration = db.getCollection('configuration');
            if (configuration === null) {
                configuration = db.addCollection('configuration');
            }

            let data;
            if (configuration.data.length) {
                data = configuration.data[0];
            } else {
                data = configuration.insert({});
            }

            event.reply('initializeFinished', data);
        }),
        autosave: true,
        autosaveInterval: 5000
    });
});

/**
 * Saves the configuration in the database.
 */
ipcMain.on('saveConfiguration', (event, newConfiguration) => {
    console.log('save config', newConfiguration);

    let data;
    let configuration = db.getCollection('configuration');
    if (configuration.data.length) {
        data = configuration.data[0];
    } else {
        data = configuration.insert({});
    }

    data.musicFolders = newConfiguration.musicFolders;
    data.excludeExtensions = newConfiguration.excludeExtensions;
    data.defaultPlaylistsPerDance = newConfiguration.defaultPlaylistsPerDance;
    db.saveDatabase();

    event.reply('saveConfigurationFinished');
});

/**
 * Read playlist metadata.
 */
ipcMain.on('loadPlaylists', async (event, folder) => {
    let songs = db.getCollection('songs');
    if (songs === null) {
        songs = db.addCollection('songs');
    }

    let playlists = db.getCollection('playlists');
    if (playlists === null) {
        playlists = db.addCollection('playlists');
    }

    await readMetadata(folder, folder, songs, playlists, 0, false);
    event.reply('loadPlaylistsFinished', playlists.data);
});

ipcMain.on('readPlaylistDetails', async (event, root, playlist, items, forceUpdate) => {
    if (items) {
        console.log('read playlist details ...');

        for (let i = 0; i < items.length; i++) {
            let src = path.join(root, path.dirname(playlist.path), items[i].path);
            items[i].sortOrder = i;
            items[i].exists = fileIsValid(src);
            items[i].absolutePath = src;

            // load metadata
            let songs = db.getCollection('songs');
            let result = await insertSong(songs, src, src.replace(root, ''), forceUpdate);

            if (result && !result.title) {
                result.title = result.filename;
            }

            items[i].metadata = result;
        }
    }

    //console.log(items);
    event.reply('readPlaylistDetailsFinished', items);
});

async function readMetadata(root, folder, songs, playlists, level, readAllFiles) {
    let items = fs.readdirSync(folder);
    for (let i = 0; i < items.length; i++) {
        let item = path.join(folder, items[i]);

        if (fs.lstatSync(item).isDirectory()) {
            await readMetadata(root, item, songs, playlists, level++);
        } else {
            if (!item.endsWith('.xml') && !item.endsWith('.db')) {
                try {
                    let itemPath = item.replace(root, '');

                    if (itemPath.endsWith('.wpl')) {
                        const lastModified = fs.statSync(item).mtimeMs;

                        // playlist
                        let results = playlists.find({ 'path': { '$eq': itemPath } });
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
                        await insertSong(songs, item, itemPath);
                    }
                } catch (e) {
                    console.log('error', item, e);
                }
            }
        }
    }
}

async function updatePlaylist(playlist, root, lastModified) {
    console.log('update playlist', path.join(root, playlist.path));
    let playlistItems = [];

    let data = await fs.readFileSync(path.join(root, playlist.path));
    let options = { ignoreComment: true, alwaysChildren: true, compact: true, attributesKey: 'attributes' };
    let json = convert.xml2js(data, options);

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

async function insertSong(songs, file, relativePath, forceUpdate) {
    let results = songs.find({ 'path': { '$eq': relativePath } });

    if (results.length < 1 || forceUpdate) {
        let metadata = null;
        let id3Metadata = null;
        try {
            metadata = await mm.parseFile(file, { skipCovers: true, duration: true });
            id3Metadata = id3.read(file);
        } catch (e) {
            //console.log('file not supported', file, e);
        }

        if (metadata) {
            let song = null;
            if (results < 1) {
                song = {};
            } else {
                song = results[0];
            }

            song.path = relativePath;
            song.filename = path.basename(relativePath);
            song.title = metadata.common.title;
            song.genre = metadata.common.genre;
            song.artists = metadata.common.artists;
            song.album = metadata.common.album;
            song.year = metadata.common.year;
            song.duration = metadata.format.duration;

            let dance = null;
            if (id3Metadata && id3Metadata.userDefinedText) {
                dance = id3Metadata.userDefinedText.find(t => t.description == 'BAMLPLAYER_DANCE');
            }

            if (dance) {
                song.dance = dance.value;
            } else if (song.genre && song.genre.length) {
                switch (song.genre[0].toLowerCase()) {
                    case 'waltz':
                    case 'english waltz':
                    case 'slow waltz':
                        song.dance = 'Waltz';
                        break;
                    case 'tango':
                        song.dance = 'Tango';
                        break;
                    case 'viennese waltz':
                        song.dance = 'Viennese Waltz';
                        break;
                    case 'slow foxtrot':
                    case 'slowfox':
                    case 'slow fox':
                        song.dance = 'Slow Foxtrot';
                        break;
                    case 'quickstep':
                        song.dance = 'Quickstep';
                        break;
                    case 'samba':
                        song.dance = 'Samba';
                        break;
                    case 'cha cha cha':
                        song.dance = 'Cha Cha Cha';
                        break;
                    case 'rumba':
                        song.dance = 'Rumba';
                        break;
                    case 'paso doble':
                        song.dance = 'Paso Doble';
                        break;
                    case 'jive':
                        song.dance = 'Jive';
                        break;
                }
            }

            //console.log(song, 'update', results.length > 0);

            if (results < 1) {
                return songs.insert(song);
            } else {
                return song;
            }
        }
    }

    if (results.length > 0) {
        return results[0];
    }

    return null;
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