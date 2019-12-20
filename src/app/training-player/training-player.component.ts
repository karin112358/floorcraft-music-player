import { Component, OnInit, ViewChild, NgZone, ElementRef, OnDestroy } from '@angular/core';

import { NotificationsService } from 'angular2-notifications';

import { Slot } from '../shared/models/slot';
import { Dance } from '../shared/models/dance';
import { SettingsService } from '../shared/services/settings.service';
import { Observable, fromEvent, Subject, BehaviorSubject } from 'rxjs';
import { startWith, map } from 'rxjs/operators';
import { PlaylistItem } from '../shared/models/playlist-item';
import { MatSelectionListChange } from '@angular/material/list';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import { SortOrder } from '../shared/models/sort-order';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatSliderChange } from '@angular/material/slider';
import { Playlist } from '../shared/models/playlist';

@Component({
  selector: 'app-training-player',
  templateUrl: './training-player.component.html',
  styleUrls: ['./training-player.component.scss']
})
export class TrainingPlayerComponent implements OnInit, OnDestroy {
  @ViewChild("playlistInput", { static: false }) playlistInput: ElementRef;

  public slots: Slot[] = [];
  public playlistFilterValue = '';
  public filteredPlaylists: Observable<Playlist[]>;
  public isPlaying = false;
  public isPaused = false;
  public currentSlotIndex = -1;

  private audio: HTMLAudioElement;
  private filterSubject = new BehaviorSubject<string>('');
  private reset = false;

  constructor(public settings: SettingsService, private notificationsService: NotificationsService, private ngZone: NgZone) {
    this.audio = new Audio();
    this.audio.onerror = (event) => {
      console.error('Cannot play song', event);

      this.ngZone.run(() => {
        const songConfiguration = this.getCurrentSong().configuration;
        const song = ((songConfiguration.metadata && songConfiguration.metadata.title) ? songConfiguration.metadata.title : songConfiguration.path);
        const slot = this.slots[this.currentSlotIndex];
        const slotTitle = slot.dance ? settings.getDanceFriendlyName(slot.dance) : (slot.playlist ? slot.playlist.title : '');

        this.notificationsService.error(
          'Error',
          `Cannot play song "${song}" in slot ${slotTitle}.`);

        this.next(true);
      });
    };
  }

  ngOnInit() {
    this.filteredPlaylists = this.filterSubject
      .pipe(
        map(value => this.filter(value))
      );
  }

  ngOnDestroy() {
    this.stop();
  }

  public async addSlot(dance: Dance, playlist: Playlist) {
    this.playlistInput.nativeElement.value = '';
    this.playlistFilterValue = '';
    this.filterSubject.next('');

    // read songs
    var slot = new Slot(dance, playlist);
    await this.setPlaylistItems(slot);
    this.slots.push(slot);;

    if (!this.isPlaying) {
      if (this.currentSlotIndex < 0) {
        this.currentSlotIndex = this.slots.length - 1;
      }

      this.play();
    }
  }

  public removeSlot(slot: Slot) {
    const index = this.slots.indexOf(slot);

    if (index === this.currentSlotIndex && this.slots.length > 1) {
      this.next();
    }

    this.slots.splice(index, 1);

    if (this.currentSlotIndex >= index) {
      this.currentSlotIndex--;
    }

    if (this.slots.length === 0) {
      this.stop();
    }
  }

  public async changeSortOrder(slot: Slot, event: MatButtonToggleChange) {
    // get currently selected item
    const currentSongSrc = slot.items[slot.currentSongIndex].configuration.absolutePath;
    slot.sortOrder = event.value;

    // change sort order
    this.updatePlaylistSortOrder(slot, slot.items);

    // select previously selected item
    const currentSong = slot.items.find(s => s.configuration.absolutePath === currentSongSrc);
    if (currentSong) {
      slot.currentSongIndex = slot.items.indexOf(currentSong);
    }
  }

  // public resetFilter() {
  //   setTimeout(() => {
  //     this.playlistFilterValue = '';
  //     this.filterSubject.next('');
  //   });
  // }

  public updateFilter(event: Event) {
    this.filterSubject.next((<HTMLInputElement>event.target).value);
  }

  public toggleSelection(song: PlaylistItem, event: MatCheckboxChange) {
    song.isDisabled = !event.checked;
  }

  public next(sameSlot = false) {
    console.log('next');
    this.reset = true;
    const song = this.getCurrentSong();
    if (song) {
      song.progress = 0;
    }

    if (this.hasEnabledItems()) {
      // change song index of current slot
      if (this.slots[this.currentSlotIndex].items.filter(i => !i.isDisabled).length > 0) {
        const slot = this.slots[this.currentSlotIndex];
        slot.currentSongIndex++;
        if (slot.currentSongIndex >= slot.items.length) {
          slot.currentSongIndex = 0;
        }

        if (slot.items[slot.currentSongIndex].isDisabled || !slot.items[slot.currentSongIndex].configuration.exists) {
          this.next();
          return;
        }
      }

      // move to next slot index
      if (!sameSlot) {
        this.currentSlotIndex++;
        if (this.currentSlotIndex >= this.slots.length) {
          this.currentSlotIndex = 0;
        }
      }

      if (this.slots[this.currentSlotIndex].items.filter(i => !i.isDisabled).length === 0) {
        this.next();
        return;
      }

      this.play();
    } else {
      this.stop();
    }
  }

  public async play(fromStart = false) {
    console.log('play');
    this.isPaused = false;

    if (this.hasEnabledItems()) {
      const slot = this.slots[this.currentSlotIndex];

      if (slot.items.filter(i => !i.isDisabled && i.configuration.exists).length > 0) {
        this.isPlaying = true;

        while (slot.items[slot.currentSongIndex].isDisabled || !slot.items[slot.currentSongIndex].configuration.exists) {
          slot.currentSongIndex++;
          if (slot.currentSongIndex >= slot.items.length) {
            slot.currentSongIndex = 0;
          }
        }

        try {
          const song = slot.items[slot.currentSongIndex];
          this.audio.src = song.configuration.absolutePath;
          const path = this.audio.src;

          if (fromStart) {
            song.progress = 0;
          }

          this.audio.currentTime = song.progress;
          this.audio.playbackRate = slot.playbackRate;
          this.reset = false;
          this.audio.play();

          song.duration = await this.getCurrentSongDuration();

          console.log('loaded', song);

          while (path === this.audio.src && song.progress < song.duration && !this.reset && !this.isPaused) {
            // console.log('progress', song.configuration.attributes.src, song.progress, song.duration);
            song.progress = Math.min(this.audio.currentTime, song.duration);
            await this.delay(100);
          }

          console.log('finished song', song);

          if (path === this.audio.src && !this.reset && !this.isPaused) {
            this.next();
          }
        } catch (ex) {
          console.log(ex);
        }
      } else {
        this.next();
      }
    } else {
      this.stop();
    }
  }

  public pause() {
    this.reset = true;
    this.isPaused = true;
    this.audio.pause();
  }

  public stop() {
    this.isPaused = false;
    this.reset = true;
    const song = this.getCurrentSong();
    if (song) {
      song.progress = 0;
    }
    this.isPlaying = false;
    this.audio.pause();
  }

  public moveToSong(slotIndex: number, songIndex: number) {
    if (this.slots[slotIndex].items[songIndex].configuration.exists) {
      this.slots[this.currentSlotIndex].items[this.slots[this.currentSlotIndex].currentSongIndex].progress = 0;

      this.currentSlotIndex = slotIndex;
      this.slots[this.currentSlotIndex].currentSongIndex = songIndex;
      this.play(true);
    }
  }

  public changePlaybackRate(slot: Slot, value: number) {
    slot.playbackRate = Math.round(value * 100) / 100;
    if (slot === this.slots[this.currentSlotIndex]) {
      this.audio.playbackRate = slot.playbackRate;
    }
  }

  public selectAll(slot: Slot) {
    slot.items.forEach(i => i.isDisabled = false);
  }

  public unselectAll(slot: Slot) {
    slot.items.forEach(i => i.isDisabled = true);
  }

  public updateProgress(song: PlaylistItem, event: MatSliderChange) {
    this.audio.currentTime = event.value;
  }

  public getCurrentSong() {
    if (this.currentSlotIndex >= 0 && this.currentSlotIndex < this.slots.length) {
      const currentSlot = this.slots[this.currentSlotIndex];

      if (currentSlot.currentSongIndex >= 0 && currentSlot.currentSongIndex < currentSlot.items.length) {
        return currentSlot.items[currentSlot.currentSongIndex];
      }
    }

    return null;
  }

  public reloadPlaylist(slot: Slot) {
    this.setPlaylistItems(slot, true);
  }

  private hasEnabledItems(): boolean {
    let hasEnabledItems = false;
    for (let i = 0; i < this.slots.length && !hasEnabledItems; i++) {
      hasEnabledItems = hasEnabledItems || (this.slots[i].items.filter(i => !i.isDisabled).length > 0);
    }

    return hasEnabledItems;
  }

  private filter(value: string): Playlist[] {
    const filterValue = value.toLowerCase();
    return this.settings.playlists.filter(item => item.title.toLowerCase().includes(filterValue));
  }

  private getCurrentSongDuration(): Promise<number> {
    let promise = new Promise<number>((resolve, reject) => {
      this.audio.onloadedmetadata = () => {
        console.log('duration loaded')
        resolve(this.audio.duration);
      };
    });

    return promise;
  }

  private async setPlaylistItems(slot: Slot, forceUpdate = false) {
    if (!slot.playlist) {
      slot.playlist = this.settings.playlists.find(p => p.filename == this.settings.configuration.defaultPlaylistsPerDance[slot.dance]);
    }

    if (slot.playlist) {
      var currentSong = this.getCurrentSong();

      if (forceUpdate) {
        // TODO: only reload selected playlist
        await this.settings.loadPlaylists();
        var newPlaylist = this.settings.playlists.find(p => p.filename == slot.playlist.filename);
        if (newPlaylist) {
          slot.playlist = newPlaylist;
        } else {
          this.notificationsService.error(
            'Error',
            `Playlist "${slot.playlist.name}" does not exist anymore.`);

          this.removeSlot(slot);
          return;
        }
      }

      let items = slot.playlist.items;
      items = await this.settings.loadPlaylistSongs(slot.playlist, items, forceUpdate);
      items = items.map(p => new PlaylistItem(p, 0));
      
      this.updatePlaylistSortOrder(slot, items);

      if (slot === this.slots[this.currentSlotIndex]) {
        // select current song
        var index = slot.items.findIndex(i => i.configuration.absolutePath == currentSong.configuration.absolutePath);
        if (index >= 0) {
          slot.currentSongIndex = index;
        }
      }
    } else {
      alert('Default playlist for ' + this.settings.getDanceFriendlyName(slot.dance) + ' not found.');
    }
  }

  private updatePlaylistSortOrder(slot: Slot, items: PlaylistItem[]) {
    switch (+slot.sortOrder) {
      case SortOrder.Random:
        items = this.shuffle(items);
        break;
      case SortOrder.PlaylistOrder:
        items = items.sort((a, b) => {
          return a.configuration.sortOrder > b.configuration.sortOrder ? 1 : -1;
        });
        break;
      case SortOrder.Alphabetic:
        items = items.sort((a, b) => {
          if (!a.configuration.exists && !b.configuration.exists) {
            return this.getTitleSortOrder(a, b);
          } else if (!a.configuration.exists) {
            return 1;
          } else if (!b.configuration.exists) {
            return -1;
          }

          return this.getTitleSortOrder(a, b);
        });

        break;
      case SortOrder.Genre:
        items = items.sort((a, b) => {
          if (!a.configuration.exists && !b.configuration.exists) {
            return this.getGenreSortOrder(a, b);
          } else if (!a.configuration.exists) {
            return 1;
          } else if (!b.configuration.exists) {
            return -1;
          }

          return this.getGenreSortOrder(a, b);
        });

        break;
    }

    slot.items = items;
  }

  private getTitleSortOrder(a, b): number {
    var titleA = a.configuration.path;
    var titleB = b.configuration.path;

    if (a.configuration.metadata && a.configuration.metadata.title) {
      titleA = a.configuration.metadata.title;
    }

    if (b.configuration.metadata && b.configuration.metadata.title) {
      titleB = b.configuration.metadata.title;
    }
    if (titleA < titleB) {
      return -1;
    } else {
      return 1;
    }
  }

  private getGenreSortOrder(a, b): number {
    if ((!a.configuration.metadata || !a.configuration.metadata.genre)
      && (!b.configuration.metadata || !b.configuration.metadata.genre)) {
      return this.getTitleSortOrder(a, b);
    }
    if (!a.configuration.metadata || !a.configuration.metadata.genre) {
      return 1;
    }
    if (!b.configuration.metadata || !b.configuration.metadata.genre) {
      return -1;
    }
    if (a.configuration.metadata.genre[0].toLowerCase() < b.configuration.metadata.genre[0].toLowerCase()) {
      return -1;
    } if (a.configuration.metadata.genre[0].toLowerCase() > (b.configuration.metadata.genre[0].toLowerCase())) {
      return 1;
    } else {
      return this.getTitleSortOrder(a, b);
    }
  }

  private shuffle(o) {
    var exists = o.filter(i => i.configuration.exists);
    var missing = o.filter(i => !i.configuration.exists);

    for (var j, x, i = exists.length; i; j = Math.floor(Math.random() * i), x = exists[--i], exists[i] = exists[j], exists[j] = x);
    //for (var j, x, i = missing.length; i; j = Math.floor(Math.random() * i), x = missing[--i], missing[i] = missing[j], missing[j] = x);
    missing = missing.sort((a, b) => {
      return this.getTitleSortOrder(a, b);
    });

    return exists.concat(missing);
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
