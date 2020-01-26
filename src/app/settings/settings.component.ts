import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { SettingsService } from '../shared/services/settings.service';
import { Category } from '../shared/models/category';
import { Profile } from '../shared/models/profile';
import { IpcService } from '../shared/services/ipc.service';
import { MatDialog } from '@angular/material/dialog';

import * as path from 'path';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  @ViewChild('confirmDeleteDialog', null) confirmDeleteDialog: TemplateRef<any>;

  public categories = [Category.Standard, Category.Latin];
  public newProfile: string;
  public profiles: Profile[];

  private _profileTransformer = (node: any, level: number) => {
    return {
      expandable: this.profiles.find(p => p.name.startsWith(node.name + '//')) ? true : false,
      name: node.name,
      title: node.name.substring(node.name.lastIndexOf('/') + 1),
      isDefault: node.isDefault,
      level: node.name.match(/\/\//g) ? node.name.match(/\/\//g).length : 0,
    };
  }

  public profileTreeControl = new FlatTreeControl<Profile>(
    node => node.name.match(/\/\//g) ? node.name.match(/\/\//g).length : 0,
    node => this.profiles.find(p => p.name.startsWith(node.name + '//')) ? true : false);

  public profileTreeFlattener = new MatTreeFlattener(
    this._profileTransformer,
    node => node.name.match(/\/\//g) ? node.name.match(/\/\//g).length : 0,
    node => this.profiles.find(p => p.name.startsWith(node.name + '//')) ? true : false,
    node => this.profiles.filter(p => p.name.startsWith(node.name + '//')));

  public profilesDataSource = new MatTreeFlatDataSource(this.profileTreeControl, this.profileTreeFlattener);

  constructor(public settings: SettingsService, public ipcService: IpcService, public dialog: MatDialog) {
    console.log(settings);
  }

  async ngOnInit() {
    await this.loadProfiles();
  }

  public musicFolderChanged(event: any) {
    if (event.target.files.length > 0) {
      var absolutePath = path.normalize(event.target.files[0].path);
      var relativePath = path.normalize(event.target.files[0].webkitRelativePath);

      var directory = absolutePath.replace(relativePath, '');
      directory += relativePath.split(path.sep)[0];

      this.settings.addMusicFolder(directory);
      this.settings.save();

      this.settings.loadPlaylists();
    }
  }

  public playlistSelectionChanged(event: any) {
    this.settings.save();
  }

  public clearSelection(dance: string) {
    this.settings.configuration.defaultPlaylistsPerDance[dance] = null;
    this.settings.save();
  }

  public profileHasChild(index: number, node: any) {
    return node.expandable;
  }

  public async addProfile() {
    if (this.newProfile) {
      await this.ipcService.run<any[]>('addProfile', 'Add profile', { name: this.newProfile });
      this.newProfile = null;
      this.loadProfiles();
    }
  }

  public async setProfileAsDefault(profile: Profile) {
    profile.isDefault = true;
    await this.ipcService.run<any[]>('updateProfile', 'Set default profile', profile);
    this.loadProfiles();
  }

  public async deleteMusicFolder(folder: string) {
    const dialogRef = this.dialog.open(this.confirmDeleteDialog);
      const result = await dialogRef.afterClosed().toPromise();
      if (result) {
        this.settings.deleteMusicFolder(folder);
      }
  }

  private async loadProfiles() {
    this.profiles = await this.settings.getProfiles();
    this.profilesDataSource.data = this.profiles.filter(p => !p.name.match(/\/\//g));
  }
}
