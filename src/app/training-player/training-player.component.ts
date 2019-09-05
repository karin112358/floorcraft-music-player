import { Component, OnInit, ViewChild, NgZone } from '@angular/core';
import { Slot } from '../shared/models/slot';
import { Dance } from '../shared/models/dance';
import { SettingsService } from '../shared/services/settings.service';
import { Observable, fromEvent, Subject, BehaviorSubject } from 'rxjs';
import { startWith, map } from 'rxjs/operators';
import { PlaylistItem } from '../shared/models/playlist-item';
import { MatSelectionListChange } from '@angular/material/list';

@Component({
  selector: 'app-training-player',
  templateUrl: './training-player.component.html',
  styleUrls: ['./training-player.component.scss']
})
export class TrainingPlayerComponent implements OnInit {
  public slots: Slot[] = [];
  public playlistFilterValue = '';
  public filteredPlaylists: Observable<string[]>;
  public isPlaying = false;
  public currentSlotIndex = -1;

  private audio: HTMLAudioElement;
  private filterSubject = new BehaviorSubject<string>('');

  constructor(public settings: SettingsService, private ngZone: NgZone) {
    this.audio = new Audio();
    this.audio.onerror = (event) => {
      // TODO: handle errors
      console.error(event);
    };

    this.audio.onended = (event) => {
      this.ngZone.run(() => this.next());
    };
  }

  ngOnInit() {
    this.filteredPlaylists = this.filterSubject
      .pipe(
        map(value => this.filter(value))
      );
  }

  public async addSlot(dance: Dance, playlistName: string) {
    this.playlistFilterValue = '';
    this.filterSubject.next('');

    // read songs
    var slot = new Slot(dance, playlistName);
    slot.items = (await this.settings.getPlaylistItems(dance, playlistName)).map(p => new PlaylistItem(p, 0));
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

  public updateFilter(event: Event) {
    this.filterSubject.next((<HTMLInputElement>event.target).value);
  }

  public toggleSelection(event: MatSelectionListChange) {
    event.option.value.isDisabled = !event.option.value.isDisabled;
  }

  public next() {
    // change song index of current slot
    const slot = this.slots[this.currentSlotIndex];
    slot.currentSongIndex++;
    if (slot.currentSongIndex >= slot.items.length) {
      slot.currentSongIndex = 0;
    }

    // move to next slot index
    this.currentSlotIndex++;
    if (this.currentSlotIndex >= this.slots.length) {
      this.currentSlotIndex = 0;
    }

    this.play();
  }

  public play() {
    this.isPlaying = true;
    const slot = this.slots[this.currentSlotIndex];
    this.audio.src = this.settings.getAbsolutePath(slot.items[slot.currentSongIndex].configuration.attributes.src);
    this.audio.play();
  }

  public stop() {
    this.isPlaying = false;
    this.audio.pause();
  }

  private filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.settings.playlists.filter(option => option.toLowerCase().includes(filterValue));
  }
}
