import { Injectable, NgZone } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { Category } from '../models/category';
import { Dance } from '../models/dance';
import { retry, debounceTime } from 'rxjs/operators';
import { PlaylistItem } from '../models/playlist-item';
import { Observable, Subject } from 'rxjs';
import { Playlist } from '../models/playlist';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  public initialized = false;
  public busyText = '';
  public playlists: Playlist[] = [];
  public defaultPlaylistsPerDance: any = {};
  public busyTextSubject = new Subject<string>();

  get playlistFolder(): string {
    return this._playlistFolder;
  }
  set playlistFolder(value: string) {
    this._playlistFolder = value;
  }

  get musicFolder(): string {
    return this._musicFolder;
  }
  set musicFolder(value: string) {
    this._musicFolder = value;
    this.loadPlaylists();
  }

  get extensionsToExclude(): string {
    return this._extensionsToExclude;
  }
  set extensionsToExclude(value: string) {
    this._extensionsToExclude = value;
  }

  private _playlistFolder: string;
  private _musicFolder: string;
  private _extensionsToExclude: string;
  private resolveLoadPlaylists: (value?: unknown) => void;
  private resolveReadMetadata: (value?: unknown) => void;
  private resolveReadPlaylist: (value?: unknown) => void;
  private resolveReadPlaylistDetails: (value?: unknown) => void;

  private constructor(
    private localStorage: LocalStorage,
    private electronService: ElectronService,
    private zone: NgZone) {
    this.busyTextSubject.pipe(debounceTime(100)).subscribe((busyText) => {
      this.zone.run(() => this.busyText = busyText);
    });
    this.handleIPCCallbacks();

    if (this.musicFolder) {
      this.loadPlaylists();
    }
  }

  /**
   * Load settings from the local storage.
   */
  public async initialize() {
    this.initialized = false;

    // load playlist folder and playlists and default playlists per dance
    const musicFolder = await this.localStorage.getItem<string>('musicFolder').toPromise() as string;
    const playlistFolder = await this.localStorage.getItem<string>('playlistFolder').toPromise() as string;
    const extensionsToExclude = await this.localStorage.getItem<string>('extensionsToExclude').toPromise() as string;

    if (musicFolder) {
      this._musicFolder = musicFolder;
    }

    if (playlistFolder) {
      this._playlistFolder = playlistFolder;
    }

    if (extensionsToExclude) {
      this._extensionsToExclude = extensionsToExclude;
    }

    if (musicFolder && playlistFolder) {
      await this.loadPlaylists();
    }

    // load default playlist per dance
    this.defaultPlaylistsPerDance[Dance[Dance.Intro]] = '';
    this.getDancesPerCategory(Category.Standard).forEach(dance => this.defaultPlaylistsPerDance[Dance[dance]] = '');
    this.getDancesPerCategory(Category.Latin).forEach(dance => this.defaultPlaylistsPerDance[Dance[dance]] = '');
    this.defaultPlaylistsPerDance[Dance[Dance.Finish]] = '';

    const defaultPlaylistsPerDance = await this.localStorage.getItem<string>('defaultPlaylistsPerDance').toPromise();
    if (defaultPlaylistsPerDance) {
      Object.getOwnPropertyNames(this.defaultPlaylistsPerDance).forEach((property) => {
        this.defaultPlaylistsPerDance[property] = defaultPlaylistsPerDance[property];
      });
    }

    this.initialized = true;
  }

  /**
   * Load all playlists from the playlist folder.
   */
  public async loadPlaylists() {
    const promise = new Promise((resolve, reject) => {
      this.resolveLoadPlaylists = resolve;
      this.electronService.ipcRenderer.send('loadPlaylists', this._musicFolder);
    });

    return promise;
  }

  /**
   * Load all playlists from the playlist folder.
   */
  public async readMetadata() {
    const promise = new Promise((resolve, reject) => {
      this.resolveReadMetadata = resolve;
      this.electronService.ipcRenderer.send('readMetadata', this.musicFolder);
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
  public async save() {
    const promise = new Promise((resolve, reject) => {
      this.localStorage.setItem('extensionsToExclude', this.extensionsToExclude).subscribe(() => {
        this.localStorage.setItem('musicFolder', this.musicFolder).subscribe(() => {
          this.localStorage.setItem('defaultPlaylistsPerDance', this.defaultPlaylistsPerDance).subscribe(() => {
            resolve();
          });
        });
      });
    });

    return promise;
  }

  // /**
  //  * Get all items per playlist.
  //  * @param playlist 
  //  */
  // public async getPlaylistItems(dance: Dance, playlistName: string): Promise<[string, PlaylistItem[]]> {
  //   const promise = new Promise<[string, PlaylistItem[]]>((resolve, reject) => {
  //     if (!playlistName && dance) {
  //       playlistName = this.defaultPlaylistsPerDance[dance];
  //     }

  //     this.resolveReadPlaylist = resolve;
  //     this.electronService.ipcRenderer.send('readPlaylist', dance, this._playlistFolder, playlistName);
  //   });

  //   return promise;
  // }

  /**
   * Get the details for all items in a playlist.
   * @param playlist 
   */
  public async readPlaylistDetails(playlist: Playlist, items: PlaylistItem[]): Promise<any[]> {
    const promise = new Promise<any[]>((resolve, reject) => {
      this.resolveReadPlaylistDetails = resolve;
      this.electronService.ipcRenderer.send('readPlaylistDetails', this.musicFolder, playlist, items);
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

  private handleIPCCallbacks() {
    // handle ipc callbacks
    this.electronService.ipcRenderer.on('playlistsLoaded', async (event, playlists) => {
      console.log(playlists);
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
      }
    });

    this.electronService.ipcRenderer.on('metadataRead', async (event, args) => {
      this.resolveReadMetadata();
      this.resolveReadMetadata = null;
      console.log('metadata read');
    });

    this.electronService.ipcRenderer.on('playlistDetailsRead', (event, items: any) => {
      if (this.resolveReadPlaylistDetails) {
        console.log('playlistDetailsRead', items);

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
    });

    this.electronService.ipcRenderer.on('readPlaylistData', (event: any, playlist: string) => {
      //this.zone.run(() => this.busyTextSubject.next('Loading ' + playlist));
      this.busyTextSubject.next('Loading ' + playlist)
    });
  }
}
