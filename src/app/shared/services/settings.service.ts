import { Injectable, NgZone } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { Category } from '../models/category';
import { Dance } from '../models/dance';
import { debounceTime } from 'rxjs/operators';
import { PlaylistItem } from '../models/playlist-item';
import { Playlist } from '../models/playlist';
import { Subject } from 'rxjs';
import { Configuration } from '../models/configuration';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  public initialized = false;
  public busyText = '';
  public playlists: Playlist[] = [];
  public busyTextSubject = new Subject<string>();
  public configuration: Configuration;

  get musicFolder(): string {
    return this._musicFolder;
  }
  set musicFolder(value: string) {
    this._musicFolder = value;
    this.configuration.musicFolders = [this._musicFolder];
    this.busyTextSubject.next('Load playlists');
    this.loadPlaylists();
  }

  get extensionsToExclude(): string {
    return this._extensionsToExclude;
  }
  set extensionsToExclude(value: string) {
    this._extensionsToExclude = value;
    this.configuration.excludeExtensions = [this._extensionsToExclude];
  }

  private _musicFolder: string;
  private _extensionsToExclude: string;
  private resolveInitialize: (value?: unknown) => void;
  private resolveLoadPlaylists: (value?: unknown) => void;
  private resolveReadPlaylistDetails: (value?: unknown) => void;

  private constructor(
    private electronService: ElectronService,
    private zone: NgZone) {
    this.busyTextSubject.pipe(debounceTime(100)).subscribe((busyText) => {
      this.zone.run(() => this.busyText = busyText);
    });

    this.handleIPCCallbacks();
  }

  /**
   * Load settings from the local storage.
   */
  public async initialize() {
    this.initialized = false;

    const promise = new Promise<any[]>((resolve, reject) => {
      this.busyTextSubject.next('Initialize');
      this.resolveInitialize = resolve;
      this.electronService.ipcRenderer.send('initialize');
    });

    return promise;
  }

  /**
   * Load all playlists from the playlist folder.
   */
  public async loadPlaylists() {
    this.busyTextSubject.next('Load playlists');
    const promise = new Promise((resolve, reject) => {
      this.resolveLoadPlaylists = resolve;
      this.electronService.ipcRenderer.send('loadPlaylists', this._musicFolder);
    });

    return promise;
  }

  /**
   * Get all dances per category.
   * @param category 
   */
  public getDancesPerCategory(category: Category): Dance[] {
    if (category === Category.Standard) {
      return [Dance.EnglishWaltz, Dance.Tango, Dance.VienneseWaltz, Dance.Slowfox, Dance.Quickstep];
    } else if (category === Category.Latin) {
      return [Dance.Samba, Dance.ChaChaCha, Dance.Rumba, Dance.PasoDoble, Dance.Jive];
    } else if (category === Category.Mixed) {
      return [Dance.EnglishWaltz, Dance.Samba, Dance.Tango, Dance.ChaChaCha, Dance.VienneseWaltz, Dance.Rumba, Dance.Slowfox, Dance.PasoDoble, Dance.Quickstep, Dance.Jive];
    }
  }

  /**
 * Saves all settings in local storage.
 */
  public save() {
    this.busyTextSubject.next('Save configuration');
    this.electronService.ipcRenderer.send('saveConfiguration', this.configuration);
  }

  /**
   * Get the details for all items in a playlist.
   * @param playlist 
   */
  public async readPlaylistDetails(playlist: Playlist, items: PlaylistItem[], forceUpdate = false): Promise<any[]> {
    if (forceUpdate) {
      await this.loadPlaylists();
    }

    this.busyTextSubject.next('Read playlists items');
    const promise = new Promise<any[]>((resolve, reject) => {
      this.resolveReadPlaylistDetails = resolve;
      this.electronService.ipcRenderer.send('readPlaylistDetails', this.musicFolder, playlist, items, forceUpdate);
    });

    return promise;
  }

  /**
   * Gets the filename from a path.
   * @param path 
   */
  public getFilename(path: string) {
    return path.split('\\').pop();
  }

  /**
   * Gets the name of the playlist without the extension .wpl
   * @param name 
   */
  public getPlaylistName(name: string) {
    if (name) {
      return name.replace(/.wpl/, '');
    } else {
      return name;
    }
  }

  public getDanceFriendlyName(dance: Dance): string {
    switch (dance) {
      case Dance.Intro:
        return 'Intro';
        break;
      case Dance.EnglishWaltz:
        return 'Waltz';
        break;
      case Dance.Tango:
        return 'Tango';
        break;
      case Dance.VienneseWaltz:
        return 'Viennese Waltz';
        break;
      case Dance.Slowfox:
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
      case Dance.EnglishWaltz:
        return 'EW';
        break;
      case Dance.Tango:
        return 'TG';
        break;
      case Dance.VienneseWaltz:
        return 'VW';
        break;
      case Dance.Slowfox:
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

  private async updateConfiguration(configuration: Configuration) {
    console.log('configuration', configuration);
    this.configuration = configuration;

    if (this.configuration.musicFolders && this.configuration.musicFolders.length) {
      this._musicFolder = this.configuration.musicFolders[0];
    }

    if (this.configuration.excludeExtensions && this.configuration.excludeExtensions.length) {
      this._extensionsToExclude = this.configuration.excludeExtensions[0];
    }

    this.initialized = true;

    if (this._musicFolder) {
      await this.loadPlaylists();
    }
  }

  private handleIPCCallbacks() {
    // handle ipc callbacks
    this.electronService.ipcRenderer.on('initializeFinished', async (event, configuration) => {
      this.busyTextSubject.next('');
      if (!configuration.defaultPlaylistsPerDance) {
        configuration.defaultPlaylistsPerDance = {};
      }

      await this.updateConfiguration(configuration);
      this.resolveInitialize();
      this.resolveInitialize = null;
    });

    this.electronService.ipcRenderer.on('saveConfigurationFinished', async (event, configuration) => {
      this.busyTextSubject.next('');
    });

    this.electronService.ipcRenderer.on('loadPlaylistsFinished', async (event, playlists) => {
      console.log('loadPlaylistsFinished', playlists);
      this.busyTextSubject.next('');
      //const playlists: Playlist[] = args.map(item => new Playlist(item, item));

      if (this.resolveLoadPlaylists) {
        this.playlists = playlists.filter(p => p.items && p.items.length > 0).sort((a, b) => {
          if (a.title.toLowerCase() < b.title.toLowerCase()) {
            return -1;
          } else {
            return 1;
          }
        });

        this.resolveLoadPlaylists();
        this.resolveLoadPlaylists = null;
        this.busyTextSubject.next('');
      }
    });

    this.electronService.ipcRenderer.on('readPlaylistDetailsFinished', (event, items: any) => {
      if (this.resolveReadPlaylistDetails) {
        console.log('readPlaylistDetailsFinished', items);

        if (items && this.extensionsToExclude) {
          items.forEach(item => {
            this.extensionsToExclude.split(',').forEach(extension => {
              if (item.path.endsWith(extension)) {
                item.exists = false;
              }
            });

          });
        }

        this.resolveReadPlaylistDetails(items);
      }

      this.resolveReadPlaylistDetails = null;
      this.busyTextSubject.next('');
    });
  }
}
