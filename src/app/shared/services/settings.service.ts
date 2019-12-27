import { Injectable, NgZone } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { Category } from '../models/category';
import { Dance } from '../models/dance';
import { debounceTime } from 'rxjs/operators';
import { PlaylistItem } from '../models/playlist-item';
import { Playlist } from '../models/playlist';
import { Configuration } from '../models/configuration';
import { IpcService } from './ipc.service';
import { Profile } from '../models/profile';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  public initialized = false;
  public busyText = '';
  public playlists: Playlist[] = [];
  public configuration: Configuration;

  get musicFolders(): string[] {
    return this._musicFolders;
  }
  // set musicFolder(value: string) {
  //   this._musicFolders = value;
  //   this.configuration.musicFolders = [this._musicFolder];
  //   this.ipcService.busyTextSubject.next('Load playlists');
  //   this.loadPlaylists();
  // }

  get extensionsToExclude(): string {
    return this._extensionsToExclude;
  }
  set extensionsToExclude(value: string) {
    this._extensionsToExclude = value;
    this.configuration.excludeExtensions = [this._extensionsToExclude];
  }

  private _musicFolders: string[];
  private _extensionsToExclude: string;

  private constructor(
    private ipcService: IpcService,
    private electronService: ElectronService,
    private zone: NgZone) {
    this.ipcService.busyTextSubject.pipe(debounceTime(100)).subscribe((busyText) => {
      this.zone.run(() => this.busyText = busyText);
    });

    this.electronService.ipcRenderer.on('loadProgress', async (event, folder) => {
      this.ipcService.busyTextSubject.next(folder);
    });
  }

  /**
   * Load settings from the local storage.
   */
  public async initialize() {
    this.initialized = false;
    const configuration = await this.ipcService.run<Configuration>('initialize', 'Initialize');

    if (!configuration.defaultPlaylistsPerDance) {
      configuration.defaultPlaylistsPerDance = {};
    }

    await this.updateConfiguration(configuration);
  }

  public addMusicFolder(newFolder: string) {
    if (this._musicFolders.indexOf(newFolder) < 0) {
      this._musicFolders.push(newFolder);
    }
  }

  public deleteMusicFolder(folder: string) {
    const index = this._musicFolders.indexOf(folder);
    if (index >= 0) {
      this._musicFolders.splice(index, 1);
      // TODO: delete playlists and songs
    }
  }

  /**
   * Load all playlists from the playlist folder.
   */
  public async loadPlaylists(forceUpdate = false) {
    const playlists = await this.ipcService.run<Playlist[]>('loadPlaylists', 'Load playlists', forceUpdate);

    console.log('loadPlaylistsFinished', playlists);
    //const playlists: Playlist[] = args.map(item => new Playlist(item, item));

    this.playlists = playlists.filter(p => p.items && p.items.length > 0).sort((a, b) => {
      if (a.title.toLowerCase() < b.title.toLowerCase()) {
        return -1;
      } else {
        return 1;
      }
    });
  }

  public async loadSongs(forceUpdate = false) {
    await this.ipcService.run<any[]>('loadSongs', 'Load songs', forceUpdate);
  }

  public async getSongs(): Promise<any[]> {
    const songs = await this.ipcService.run<any[]>('getSongs', 'Get songs');

    const sortedSongs = songs.sort((a, b) => {
      return a.filename > b.filename ? 1 : -1;
    });

    return sortedSongs;
  }

  /**
   * Get all dances per category.
   * @param category
   */
  public getDancesPerCategory(category: Category): Dance[] {
    if (category === Category.Standard) {
      return [Dance.Waltz, Dance.Tango, Dance.VienneseWaltz, Dance.SlowFoxtrot, Dance.Quickstep];
    } else if (category === Category.Latin) {
      return [Dance.Samba, Dance.ChaChaCha, Dance.Rumba, Dance.PasoDoble, Dance.Jive];
    } else if (category === Category.Mixed) {
      return [Dance.Waltz, Dance.Samba, Dance.Tango, Dance.ChaChaCha, Dance.VienneseWaltz, Dance.Rumba, Dance.SlowFoxtrot, Dance.PasoDoble, Dance.Quickstep, Dance.Jive];
    }
  }

  /**
 * Saves all settings in local storage.
 */
  public async save() {
    await this.ipcService.run<any[]>('saveConfiguration', 'Save configuration', this.configuration);
  }

  /**
   * Get the details for all items in a playlist.
   * @param playlist
   */
  public async loadPlaylistSongs(playlist: Playlist, items: PlaylistItem[], forceUpdate = false): Promise<any[]> {
    if (forceUpdate) {
      await this.loadPlaylists();
    }

    const playlistItems = await this.ipcService.run<any[]>('loadPlaylistsSongs', 'Load playlist songs', playlist, items, forceUpdate);
    console.log('loadPlaylistsSongsFinished', playlistItems);

    if (playlistItems && this.extensionsToExclude) {
      playlistItems.forEach(item => {
        this.extensionsToExclude.split(',').forEach(extension => {
          if (item.path.endsWith(extension)) {
            item.exists = false;
          }
        });

      });
    }

    return playlistItems;
  }

  public getDanceFriendlyName(dance: Dance): string {
    switch (dance) {
      case Dance.Intro:
        return 'Intro';
        break;
      case Dance.Waltz:
        return 'Waltz';
        break;
      case Dance.Tango:
        return 'Tango';
        break;
      case Dance.VienneseWaltz:
        return 'Viennese Waltz';
        break;
      case Dance.SlowFoxtrot:
        return 'Slow Foxtrot';
        break;
      case Dance.Quickstep:
        return 'Quickstep';
        break;
      case Dance.Samba:
        return 'Samba';
        break;
      case Dance.ChaChaCha:
        return 'Cha Cha Cha';
        break;
      case Dance.Rumba:
        return 'Rumba';
        break;
      case Dance.PasoDoble:
        return 'Paso Doble';
        break;
      case Dance.Jive:
        return 'Jive';
        break;
      case Dance.Finish:
        return 'Finish';
        break;
    }
  }

  public getDanceShortName(dance: Dance): string {
    switch (dance) {
      case Dance.Intro:
        return 'INT';
        break;
      case Dance.Waltz:
        return 'EW';
        break;
      case Dance.Tango:
        return 'TG';
        break;
      case Dance.VienneseWaltz:
        return 'VW';
        break;
      case Dance.SlowFoxtrot:
        return 'SF';
        break;
      case Dance.Quickstep:
        return 'QS';
        break;
      case Dance.Samba:
        return 'SB';
        break;
      case Dance.ChaChaCha:
        return 'CC';
        break;
      case Dance.Rumba:
        return 'RU';
        break;
      case Dance.PasoDoble:
        return 'PD';
        break;
      case Dance.Jive:
        return 'JI';
        break;
      case Dance.Finish:
        return 'FIN';
        break;
    }
  }

  public getTooltip(song: PlaylistItem) {
    let tooltip = '';
    if (song.configuration.metadata) {
      tooltip += 'Title: ' + song.configuration.metadata.title + '\n';
      tooltip += 'Duration: ' + this.formatDuration(song.configuration.metadata.duration) + '\n';
      tooltip += 'Album: ' + song.configuration.metadata.album + '\n';

      if (song.configuration.metadata.artists) {
        tooltip += 'Artists: ' + song.configuration.metadata.artists.join(', ') + '\n';
      }

      if (song.configuration.metadata.genre) {
        tooltip += 'Genre: ' + song.configuration.metadata.genre.join(', ') + '\n';
      }

      tooltip += 'Path: ' + song.configuration.path + '\n';
    } else {
      tooltip += song.configuration.path + '\n';
    }
    return tooltip;
  }

  public formatDuration(duration: number) {
    if (duration) {
      var minutes = Math.round(duration / 60);
      var seconds = Math.round(duration % 60 + 100);
      return minutes.toString() + ':' + seconds.toString().substr(1);
    } else {
      return '-';
    }
  }

  public async clearDatabase() {
    await this.ipcService.run<any[]>('clearDatabase', 'Clear database');
  }

  public async getProfiles() {
    return (await this.ipcService.run<any>('getProfiles', 'Get profiles')).sort((a, b) =>
      (a.isDefault === true) == (b.isDefault === true) ? (a.name > b.name ? 1 : -1) : (a.isDefault ? -1 : 1));
  }

  private async updateConfiguration(configuration: Configuration) {
    console.log('configuration', configuration);
    this.configuration = configuration;

    if (this.configuration.musicFolders && this.configuration.musicFolders.length) {
      this._musicFolders = this.configuration.musicFolders;
    }

    if (this.configuration.excludeExtensions && this.configuration.excludeExtensions.length) {
      this._extensionsToExclude = this.configuration.excludeExtensions[0];
    }

    this.initialized = true;

    if (this._musicFolders.length) {
      await this.loadPlaylists();
    }
  }
}
