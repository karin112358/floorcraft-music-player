import { Component, OnInit, ViewChild, NgZone, ElementRef, OnDestroy } from '@angular/core';
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
  private context = new AudioContext();
  private scriptProcessor: ScriptProcessorNode;

  constructor(public settings: SettingsService, private ngZone: NgZone) {
    this.audio = new Audio();
    this.audio.onerror = (event) => {
      // TODO: handle errors
      console.error(event);
    };

    // this.audio.onended = (event) => {
    //   console.log('audio.onended');
    //   this.ngZone.run(() => this.next());
    // };
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
    this.slots.push(slot);

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
    const currentSongSrc = slot.items[slot.currentSongIndex].configuration.attributes.src;
    slot.sortOrder = event.value;

    // change sort order
    await this.setPlaylistItems(slot);

    // select previously selected item
    const currentSong = slot.items.find(s => s.configuration.attributes.src === currentSongSrc);
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

  public next() {
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

        if (slot.items[slot.currentSongIndex].isDisabled) {
          this.next();
          return;
        }
      }

      // move to next slot index
      this.currentSlotIndex++;
      if (this.currentSlotIndex >= this.slots.length) {
        this.currentSlotIndex = 0;
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
    this.isPaused = false;

    if (this.hasEnabledItems()) {
      const slot = this.slots[this.currentSlotIndex];

      if (slot.items.filter(i => !i.isDisabled).length > 0) {
        this.isPlaying = true;

        while (slot.items[slot.currentSongIndex].isDisabled) {
          slot.currentSongIndex++;
          if (slot.currentSongIndex >= slot.items.length) {
            slot.currentSongIndex = 0;
          }
        }

        try {
          let song = slot.items[slot.currentSongIndex]
          this.audio.src = this.settings.getAbsolutePath(song.configuration.attributes.src);
          if (fromStart) {
            song.progress = 0;
          }

          this.audio.currentTime = song.progress;
          this.audio.playbackRate = slot.playbackRate;
          this.reset = false;
          this.audio.play();

          song.duration = await this.getCurrentSongDuration();

          console.log('loaded', this.audio);

          while (song.progress < song.duration && !this.reset && !this.isPaused) {
            song.progress = Math.min(this.audio.currentTime, song.duration);
            await this.delay(100);
          }

        } catch (ex) {
          console.log(ex);
        }

        console.log('finished song');
        if (!this.reset && !this.isPaused) {
          this.next();
        }
        // this.audio.pause();

        // if (!this.reset) {
        //   this.stop();
        // }
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
    this.currentSlotIndex = slotIndex;
    this.slots[this.currentSlotIndex].currentSongIndex = songIndex;
    this.play(true);
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

  private async setPlaylistItems(slot: Slot) {
    let items = (await this.settings.getPlaylistItems(slot.dance, (slot.playlist ? slot.playlist.name : null)))[1].map(p => new PlaylistItem(p, 0));
    switch (+slot.sortOrder) {
      case SortOrder.Random:
        items = this.shuffle(items);
        break;
      case SortOrder.Alphabetic:
        items = items.sort((a, b) => {
          if (this.settings.getFilename(a.configuration.attributes.src.toLowerCase()) < this.settings.getFilename(b.configuration.attributes.src.toLowerCase())) {
            return -1;
          } else {
            return 1;
          }
        });

        break;
    }

    slot.items = items;
  }

  private shuffle(o) {
    for (var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
