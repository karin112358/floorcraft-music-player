import { Injectable } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { Category } from '../models/category';
import { Dance } from '../models/dance';
import { retry } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  public initialized = false;
  public playlists: string[];
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

    console.log(this.defaultPlaylistsPerDance);

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
}
