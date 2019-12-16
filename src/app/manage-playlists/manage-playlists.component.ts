import { Component, OnInit } from '@angular/core';
import { SettingsService } from '../shared/services/settings.service';
import { SelectionModel } from '@angular/cdk/collections';
import { Playlist } from '../shared/models/playlist';
import { PlaylistItem } from '../shared/models/playlist-item';

@Component({
  selector: 'app-manage-playlists',
  templateUrl: './manage-playlists.component.html',
  styleUrls: ['./manage-playlists.component.scss']
})
export class ManagePlaylistsComponent implements OnInit {
  public playlistColumns: string[] = ['title', 'items', 'lastModified'];
  public playlistItemsColumns: string[] = ['select', 'title', 'dance', 'genre', 'duration'];
  public selection: SelectionModel<Playlist>;
  public songSelection: SelectionModel<any>;
  public playlistItems: PlaylistItem[];

  constructor(public settings: SettingsService) {
    this.selection = new SelectionModel<Playlist>(false, []);
    this.songSelection = new SelectionModel<any>(true, []);

    this.selection.changed.subscribe(async event => {
      this.playlistItems = await this.settings.loadPlaylistSongs(event.added[0], event.added[0].items, true);
    });
  }

  ngOnInit() {
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.songSelection.selected.length;
    const numRows = this.playlistItems.length;
    return numSelected == numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() ?
      this.songSelection.clear() :
      this.playlistItems.forEach(row => this.songSelection.select(row));
  }
}
