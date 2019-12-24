import { Component, OnInit, ViewChild, TemplateRef, OnDestroy, ElementRef } from '@angular/core';
import { SettingsService } from '../shared/services/settings.service';
import { SelectionModel } from '@angular/cdk/collections';
import { Playlist } from '../shared/models/playlist';
import { PlaylistItem } from '../shared/models/playlist-item';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectChange } from '@angular/material/select';
import { IpcService } from '../shared/services/ipc.service';
import { isString } from 'util';
import { NotificationsService } from 'angular2-notifications';
import { LibraryMode } from './library-mode';
import { retry, debounceTime } from 'rxjs/operators';
import { fromEvent, Observable } from 'rxjs';
import { Profile } from '../shared/models/profile';

@Component({
  selector: 'app-manage-library',
  templateUrl: './manage-library.component.html',
  styleUrls: ['./manage-library.component.scss']
})
export class ManageLibraryComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild('assignDanceDialog', null) assignDanceDialog: TemplateRef<any>;
  @ViewChild('confirmMergeDialog', null) confirmMergeDialog: TemplateRef<any>;
  @ViewChild('searchInput', null) searchInput: ElementRef;

  public selectedMode: LibraryMode = 0;
  public songsColumns: string[];
  public songSelection: SelectionModel<any>;
  public dataSource = new MatTableDataSource<any>();
  public songs: any[];
  public currentPlayingSong: any = null;
  public selectedDance: any = null;
  public sortOrder: string[];
  public searchExpression = '';
  public searchSource: Observable<string>;
  public profiles: Profile[];
  public selectedProfile: Profile = null;

  private audio: HTMLAudioElement;

  constructor(public settings: SettingsService, public dialog: MatDialog, private ipcService: IpcService, private notificationsService: NotificationsService) {
    this.songSelection = new SelectionModel<any>(true, []);
    this.modeSelectionChanged();

    this.audio = new Audio();
    this.audio.onerror = (event) => {
      // TODO: handle errors
      console.error(event);
      this.currentPlayingSong = null;

      this.notificationsService.error(
        'Error',
        `Cannot play song "${this.audio.src}".`);
    };

    this.audio.onended = (event) => {
      this.currentPlayingSong = null;
    };
  }

  ngOnDestroy() {
    this.audio.pause();
  }

  modeSelectionChanged() {
    this.updateData();
  }

  async ngOnInit() {
    this.searchSource = fromEvent(this.searchInput.nativeElement, 'keyup');
    this.searchSource.pipe(debounceTime(300)).subscribe(c => {
      this.updateData();
    });

    this.profiles = await this.settings.getProfiles();
    this.songs = await this.settings.getSongs() as any[];
    //console.log('songs', this.songs.length, this.songs.slice(0, 10));

    this.dataSource.paginator = this.paginator;
    this.updateData();
  }

  extensionIsExcluded(song: any) {
    let extension = song.filename.substring(song.filename.indexOf('.') + 1);
    return this.settings.extensionsToExclude.split(',').indexOf(extension) >= 0;
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

  selectRow(event: MouseEvent, row: any) {
    event.stopPropagation();

    if (!event.ctrlKey && !event.shiftKey) {
      this.songSelection.clear();
    }

    if (event.shiftKey && this.songSelection.selected.length) {
      const minIndex = Math.max(...this.songSelection.selected.map(s => this.dataSource.data.indexOf(s)));
      const maxIndex = Math.min(...this.songSelection.selected.map(s => this.dataSource.data.indexOf(s)));
      const newIndex = this.dataSource.data.indexOf(row);

      const index = newIndex > maxIndex ? maxIndex : minIndex;

      for (let i = Math.min(index, newIndex); i <= Math.max(index, newIndex); i++) {
        this.songSelection.select(this.dataSource.data[i]);
      }
    } else {
      this.songSelection.select(row);
    }
  }

  getPlaylistsForSong(absolutePath: string): any[] {
    return this.settings.playlists.filter(p => p.items.find(i => i.absolutePath == absolutePath));
  }

  hasDuplicate(song: any): boolean {
    return this.songs.find(s => s.filename === song.filename && s.duration === song.duration && s.absolutePath !== song.absolutePath);
  }

  canDelete(song: any): boolean {
    return !this.getPlaylistsForSong(song.absolutePath).length && this.hasDuplicate(song);
  }

  canDeleteSelected(song: any): boolean {
    let canDelete = true;

    this.songSelection.selected.forEach(s => {
      canDelete = canDelete && !this.getPlaylistsForSong(s.absolutePath).length && this.hasDuplicate(s)
    });

    return canDelete;
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

  search() {
    this.updateData();
  }

  openAssignDanceDialog() {
    this.dialog.open(this.assignDanceDialog);
  }

  async merge(event: MouseEvent, mergeIntoSong: any, forceMerge = false) {
    event.stopPropagation();
    let filenameEqual = true;
    let durationEqual = true;

    // check selected songs
    for (let i = 1; i < this.songSelection.selected.length; i++) {
      if (this.songSelection.selected[i].filename !== this.songSelection.selected[0].filename) {
        filenameEqual = false;
      }
      if (this.songSelection.selected[i].duration !== this.songSelection.selected[0].duration) {
        durationEqual = false;
      }

      if (!durationEqual) {
        this.notificationsService.error('Merge failed', 'Durations of files do not match.');
        return;
      }
    }

    if (!filenameEqual && !forceMerge) {
      const dialogRef = this.dialog.open(this.confirmMergeDialog);
      const result = await dialogRef.afterClosed().toPromise();
      if (result) {
        this.merge(event, mergeIntoSong, true);
      }

      return;
    }

    console.log('merge selected', this.songSelection.selected, 'into', mergeIntoSong);
    const result = await this.ipcService.run<any>('mergeSongs', 'Merge songs', this.songSelection.selected, mergeIntoSong);

    if (isString(result)) {
      this.notificationsService.error('Merge failed', result);
    } else {
      // remove from list
      for (let i = 1; i < this.songSelection.selected.length; i++) {
        if (this.songSelection.selected[i].absolutePath !== mergeIntoSong.absolutePath) {
          const songIndex = this.songs.findIndex(s => s.absolutePath == this.songSelection.selected[i].absolutePath);
          if (songIndex >= 0) {
            this.songs.splice(songIndex, 1);
          }
        }
      }

      this.updateData();
    }

    this.songSelection.clear();
    this.settings.loadPlaylists();
  }

  async deleteSelected() {
    for (let i = 0; i < this.songSelection.selected.length; i++) {
      await this.deleteSong(this.songSelection.selected[i]);
    }
  }

  async delete(event: MouseEvent, song: any) {
    if (event) {
      event.stopPropagation();
    }

    this.songSelection.clear();
  }

  async deleteSong(song: any) {
    if (this.canDelete(song)) {
      console.log('delete', song);
      const result = await this.ipcService.run<any>('deleteSong', 'Delete song', song);

      if (isString(result)) {
        this.notificationsService.error('Delete failed', result);
      } else {
        const songIndex = this.songs.findIndex(s => s.absolutePath == song.absolutePath);
        if (songIndex >= 0) {
          this.songs.splice(songIndex, 1);
          this.updateData();
        }
      }
    } else {
      this.notificationsService.error('Delete failed', 'Cannot delete song ' + song.absolutePath);
    }
  }

  async assignDance(dance: any) {
    console.log('assign dance', this.settings.getDanceFriendlyName(dance));

    for (let i = 0; i < this.songSelection.selected.length; i++) {
      const song = this.songSelection.selected[i];
      const result = await this.ipcService.run<any>('assignDance', 'Assign dance', song.absolutePath, this.settings.getDanceFriendlyName(dance));

      if (isString(result)) {
        this.notificationsService.error('Assign dance failed', result);
      } else {
        song.dance = result.dance;
      }
    }

    this.dialog.closeAll();
    this.songSelection.clear();
  }

  danceSelectionChanged(event: MatSelectChange) {
    if (event) {
      this.selectedDance = event.value;
    } else {
      this.selectedDance = null;
    }

    this.updateData();
  }

  profileSelectionChanged(event: MatSelectChange) {
    this.updateData();
  }

  setRating(like: boolean) {
    
  }

  private updateData() {
    if (this.selectedMode == LibraryMode.ManageProfile) {
      if (this.selectedProfile) {
        this.songsColumns = ['select', 'play', 'title', 'rating', 'playlists', 'dance', 'genre', 'duration'];
      } else {
        this.songsColumns = ['select', 'play', 'title', 'playlists', 'dance', 'genre', 'duration'];
      }
      this.sortOrder = ['absolutePath'];
    } else if (this.selectedMode == LibraryMode.FindDuplicates) {
      this.selectedProfile = null;

      this.songsColumns = ['select', 'play', 'merge', 'delete', 'title', 'playlists', 'dance', 'genre', 'duration'];
      this.sortOrder = ['filename', 'duration', 'absolutePath'];
    } else if (this.selectedMode == LibraryMode.FindDanceMissing) {
      this.selectedProfile = null;
      this.selectedDance = null;

      this.songsColumns = ['select', 'play', 'title', 'playlists', 'dance', 'genre', 'duration'];
      this.sortOrder = ['genre', 'filename'];
    }

    if (this.songs) {
      let filteredSongs = this.songs.filter(s1 => (!this.selectedDance || s1.dance == this.settings.getDanceFriendlyName(this.selectedDance)));

      if (this.selectedMode == LibraryMode.FindDuplicates) {
        filteredSongs = filteredSongs.filter(s1 => this.songs.find(s2 => s1.filename === s2.filename && s1.duration === s2.duration && s1.absolutePath !== s2.absolutePath));
      } else if (this.selectedMode == LibraryMode.FindDanceMissing) {
        filteredSongs = filteredSongs.filter(s1 => !s1.dance);
      }

      if (this.searchExpression) {
        filteredSongs = filteredSongs.filter(s => (s.absolutePath && s.absolutePath.toLowerCase().indexOf(this.searchExpression.toLowerCase()) >= 0)
          || (s.title && s.title.toLowerCase().indexOf(this.searchExpression.toLowerCase()) >= 0));
      }

      if (this.sortOrder) {
        filteredSongs = filteredSongs.sort((a, b) => {
          for (let i = 0; i < this.sortOrder.length; i++) {
            if (a[this.sortOrder[i]] > b[this.sortOrder[i]]) {
              return 1;
            } else if (a[this.sortOrder[i]] < b[this.sortOrder[i]]) {
              return -1;
            }
          }

          return 0;
        });
      }

      this.dataSource.data = filteredSongs;
    }
  }
}
