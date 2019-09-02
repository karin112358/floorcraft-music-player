import { Component, OnInit, ViewChild } from '@angular/core';
import { Slot } from '../shared/models/slot';
import { Dance } from '../shared/models/dance';
import { SettingsService } from '../shared/services/settings.service';
import { Observable, fromEvent, Subject, BehaviorSubject } from 'rxjs';
import { startWith, map } from 'rxjs/operators';

@Component({
  selector: 'app-training-player',
  templateUrl: './training-player.component.html',
  styleUrls: ['./training-player.component.scss']
})
export class TrainingPlayerComponent implements OnInit {
  public slots: Slot[] = [];
  public playlistFilterValue = '';
  public filteredPlaylists: Observable<string[]>;

  private filterSubject = new BehaviorSubject<string>('');

  constructor(public settings: SettingsService) { }

  ngOnInit() {
    this.filteredPlaylists = this.filterSubject
      .pipe(
        map(value => this.filter(value))
      );
  }

  public addSlot(dance: Dance, playlist: string) {
    this.slots.push(new Slot(dance, playlist));
    this.playlistFilterValue = '';
  }

  public removeSlot(slot: Slot) {
    const index = this.slots.indexOf(slot);
    this.slots.splice(index, 1);
  }

  public updateFilter(event: Event) {
    this.filterSubject.next((<HTMLInputElement>event.target).value);
  }

  private filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.settings.playlists.filter(option => option.toLowerCase().includes(filterValue));
  }
}
