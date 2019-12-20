import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { SettingsService } from '../shared/services/settings.service';
import { SelectionModel } from '@angular/cdk/collections';
import { Playlist } from '../shared/models/playlist';
import { PlaylistItem } from '../shared/models/playlist-item';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-manage-library',
  templateUrl: './manage-library.component.html',
  styleUrls: ['./manage-library.component.scss']
})
export class ManageLibraryComponent implements OnInit {
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild('assignDanceDialog', null) assignDanceDialog: TemplateRef<any>;

  public onlyDuplicates = false;
  public onlyDanceMissing = false;
  public songsColumns: string[] = ['select', 'play', 'title', 'playlists', 'dance', 'genre', 'duration'];
  public songSelection: SelectionModel<any>;
  public dataSource = new MatTableDataSource<any>();
  public songs: any[];
  public currentPlayingSong: null;

  private audio: HTMLAudioElement;

  constructor(public settings: SettingsService, public dialog: MatDialog) {
    this.songSelection = new SelectionModel<any>(true, []);

    this.audio = new Audio();
    this.audio.onerror = (event) => {
      // TODO: handle errors
      console.error(event);
    };
  }

  async ngOnInit() {
    this.songs = await this.settings.getSongs() as any[];
    console.log('songs', this.songs.length, this.songs.slice(0, 10));

    this.dataSource.paginator = this.paginator;
    this.updateData();
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

  getPlaylistsForSong(absolutePath: string): any[] {
    return this.settings.playlists.filter(p => p.items.find(i => i.absolutePath == absolutePath));
  }

  onlyDuplicatesChanged(event: MatCheckboxChange) {
    this.onlyDuplicates = event.checked;
    this.updateData();
  }

  onlyDanceMissingChanged(event: MatCheckboxChange) {
    this.onlyDanceMissing = event.checked;
    this.updateData();
  }

  getPlaylistsTooltip(playlists: any[]) {
    return playlists.map(p => p.title).join('\n');
  }

  playSong(event: MouseEvent, element: any) {
    event.stopPropagation();

    this.currentPlayingSong = element;
    this.audio.src = element.absolutePath;
    this.audio.play();
  }

  stop(event: MouseEvent) {
    event.stopPropagation();

    this.audio.pause();
    this.currentPlayingSong = null;
  }

  assignDance() {
    this.dialog.open(this.assignDanceDialog);
  }

  private updateData() {
    this.dataSource.data = this.songs.filter(s1 =>
      (!this.onlyDuplicates || this.songs.find(s2 => s1.filename === s2.filename && s1.duration === s2.duration && s1.absolutePath !== s2.absolutePath))
      && (!this.onlyDanceMissing || !s1.dance));
  }
}
