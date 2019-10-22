import { Component, OnInit } from '@angular/core';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { ElectronService } from 'ngx-electron';
import { Playlist } from '../shared/models/playlist';
import { SettingsService } from '../shared/services/settings.service';
import { Category } from '../shared/models/category';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  public categories = [ Category.Standard, Category.Latin ];
  constructor(
    public settings: SettingsService) {
  }

  public musicFolderChanged(event: any) {
    if (event.target.files.length > 0) {
      this.settings.musicFolder = event.target.files[0].path;
      this.settings.save();
    }
  }

  public folderChanged(event: any) {
    if (event.target.files.length > 0) {
      this.settings.playlistFolder = event.target.files[0].path;
      this.settings.save();
    }
  }

  public playlistSelectionChanged(event: any) {
    this.settings.save();
  }

  public clearSelection(dance: string) {
    this.settings.defaultPlaylistsPerDance[dance] = null;
    this.settings.save();
  }
}
