import { Injectable } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { Category } from '../models/category';
import { Dance } from '../models/dance';
import { retry } from 'rxjs/operators';
import { PlaylistItem } from '../models/playlist-item';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  public initialized = false;
  public playlists: string[] = [];
  public defaultPlaylistsPerDance: any = {};

  get playlistFolder(): string {
    return this._playlistFolder;
  }
  set playlistFolder(value: string) {
    this._playlistFolder = value;
    this.loadPlaylists();
  }

  private _playlistFolder: string;
  private resolveLoadPlaylists: (value?: unknown) => void;
  private resolveReadPlaylist: (value?: unknown) => void;

  private constructor(private localStorage: LocalStorage, private electronService: ElectronService) {
    // handle ipc callbacks
    this.electronService.ipcRenderer.on('playlistsLoaded', (event, args) => {
      this.playlists = args;
      this.playlists.unshift('');

      if (this.resolveLoadPlaylists) {
        this.resolveLoadPlaylists();
        this.resolveLoadPlaylists = null;
      }
    });

    this.electronService.ipcRenderer.on('playlistRead', (event, dance: Dance, playlist: any) => {
      console.log('playlist read', dance, playlist);
      let response = null;

      if (this.resolveReadPlaylist && playlist && playlist.smil.body) {
        if (Array.isArray(playlist.smil.body.seq.media)) {
          response = playlist.smil.body.seq.media.filter(m => !m.attributes.src.endsWith('.wma') && m.attributes.exists);
        } else if (!playlist.smil.body.seq.media.attributes.src.endsWith('.wma') && playlist.smil.body.seq.media.attributes.exists) {
          response = [playlist.smil.body.seq.media];
        }
      }

      this.resolveReadPlaylist(response);
    });
  }

  /**
   * Load settings from the local storage.
   */
  public async initialize() {
    // load playlist folder and playlists and default playlists per dance
    const playlistFolder = await this.localStorage.getItem<string>('playlistFolder').toPromise() as string;
    if (playlistFolder) {
      this._playlistFolder = playlistFolder;
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
      this.electronService.ipcRenderer.send('loadPlaylists', this.playlistFolder);
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
    }
  }

  /**
 * Saves all settings in local storage.
 */
  public async save() {
    const promise = new Promise((resolve, reject) => {
      this.localStorage.setItem('playlistFolder', this.playlistFolder).subscribe(() => {
        this.localStorage.setItem('defaultPlaylistsPerDance', this.defaultPlaylistsPerDance).subscribe(() => {
          resolve();
        });
      });
    });

    return promise;
  }

  /**
   * Get all items per playlist.
   * @param playlist 
   */
  public async getPlaylistItems(dance: Dance, playlistName: string): Promise<PlaylistItem[]> {
    const promise = new Promise<PlaylistItem[]>((resolve, reject) => {
      if (!playlistName && dance) {
        playlistName = this.defaultPlaylistsPerDance[dance];
      }

      this.resolveReadPlaylist = resolve;
      this.electronService.ipcRenderer.send('readPlaylist', dance, this._playlistFolder, playlistName);
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
   * Gets the absolute path of a playlist item.
   * @param src
   */
  public getAbsolutePath(src: string) {
    if (src.startsWith('..\\')) {
      return this.playlistFolder + '\\' + src;
    } else {
      return src;
    }
  }

  public getDanceFriendlyName(dance: Dance): string {
    switch (dance) {
      case Dance.Intro:
        return 'Intro';
        break;
      case Dance.EnglishWaltz:
        return 'English Waltz';
        break;
      case Dance.Tango:
        return 'Tango';
        break;
      case Dance.VienneseWaltz:
        return 'Viennese Waltz';
        break;
      case Dance.Slowfox:
        return 'Slow Fox';
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
}
