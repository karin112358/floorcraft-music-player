import { Component, OnInit, ViewChild } from '@angular/core';
import { SettingsService } from '../shared/services/settings.service';
import { SelectionModel } from '@angular/cdk/collections';
import { Playlist } from '../shared/models/playlist';
import { PlaylistItem } from '../shared/models/playlist-item';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatCheckboxChange } from '@angular/material/checkbox';

@Component({
  selector: 'app-manage-library',
  templateUrl: './manage-library.component.html',
  styleUrls: ['./manage-library.component.scss']
})
export class ManageLibraryComponent implements OnInit {
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;

  public onlyDuplicates = false;
  public songsColumns: string[] = ['select', 'title', 'dance', 'genre', 'duration'];
  public songSelection: SelectionModel<any>;
  public dataSource = new MatTableDataSource<any>();
  public songs: any[];

  constructor(public settings: SettingsService) {
    this.songSelection = new SelectionModel<any>(true, []);
  }

  async ngOnInit() {
    this.songs = await this.settings.getSongs() as any[];
    console.log('songs', this.songs.length, this.songs.slice(0, 10));

    this.dataSource.paginator = this.paginator;
    this.dataSource.data = this.songs;
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.songSelection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected == numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() ?
      this.songSelection.clear() :
      this.dataSource.data.forEach(row => this.songSelection.select(row));
  }

  onlyDuplicatesChanged(event: MatCheckboxChange) {
    this.onlyDuplicates = event.checked;

    if (this.onlyDuplicates) {
      this.dataSource.data = this.songs.filter(s1 => this.songs.find(s2 => s1.filename === s2.filename && s1.duration === s2.duration && s1.path !== s2.path));
    } else {
      this.dataSource.data = this.songs;
    }
  }
}
