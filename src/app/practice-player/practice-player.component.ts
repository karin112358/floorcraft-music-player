import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';

import { ElectronService } from 'ngx-electron';
import { PracticeDancePlaylist } from '../shared/models/practice-dance-playlist';
import { Dance } from '../shared/models/dance';
import { PlaylistItem } from '../shared/models/playlist-item';
import { PracticePlaylist } from '../shared/models/practice-playlist';
import { Category } from '../shared/models/category';
import { SettingsService } from '../shared/services/settings.service';

@Component({
  selector: 'app-practice-player',
  templateUrl: './practice-player.component.html',
  styleUrls: ['./practice-player.component.scss']
})
export class PracticePlayerComponent implements OnInit, OnDestroy {
  public songDuration = 120;
  public pauseDuration = 10;
  public heats = 2;

  public practiceConfigured = false;
  public currentPractice = new PracticePlaylist();

  public practicePlaylistsSongs: { [index: number]: any; } = {};
  public isPlaying = false;
  public isPaused = false;
  public pauseProgress = 0;
  public category = 0;

  private audio: HTMLAudioElement;
  private reset = false;
  private fadeOutDuration = 5;
  private currentSong: PlaylistItem = null;
  //private playlistFolder = '';

  constructor(public settings: SettingsService, private electronService: ElectronService, private ngZone: NgZone) {
    this.audio = new Audio();
    this.audio.onerror = (event) => {
      // TODO: handle errors
      console.error(event);

      this.ngZone.run(() => {
        if (this.currentSong) {
          this.playFromSong(this.currentSong, true, true);
        }
      });
    };
  }

  async ngOnInit() {
    await this.loadSongs(Dance.Intro);
    await this.loadSongs(Dance.Finish);

    let dances = this.settings.getDancesPerCategory(Category.Standard);
    for (let i = 0; i < dances.length; i++) {
      await this.loadSongs(dances[i]);
    }

    dances = this.settings.getDancesPerCategory(Category.Latin);
    for (let i = 0; i < dances.length; i++) {
      await this.loadSongs(dances[i]);
    }
  }

  ngOnDestroy() {
    this.stop();
  }

  public configureSemifinal() {
    this.heats = 2;
    this.songDuration = 120;
    this.pauseDuration = 10;
    this.configurePractice();
  }

  public configureFinal() {
    this.heats = 1;
    this.songDuration = 100;
    this.pauseDuration = 20;
    this.configurePractice();
  }

  public configurePractice() {
    this.currentPractice.dances = [];

    this.selectSongs(Dance.Intro, 1);
    this.settings.getDancesPerCategory(this.category).forEach(dance => {
      this.selectSongs(dance, this.heats);
    });
    this.selectSongs(Dance.Finish, 1);

    this.practiceConfigured = true;
  }

  public selectNew(dancePlaylist: PracticeDancePlaylist, heat: number): PlaylistItem {
    let retryCount = 0;
    let dance = dancePlaylist.dance;
    let index = Math.floor(Math.random() * this.practicePlaylistsSongs[dance].length);

    while (retryCount < 10
      && !this.practicePlaylistsSongs[dance][index].exists
      && dancePlaylist.items.filter((item, i) => i !== heat && item.configuration.absolutePath == this.practicePlaylistsSongs[dance][index].absolutePath).length > 0) {
      index = Math.floor(Math.random() * this.practicePlaylistsSongs[dance].length);
      retryCount++;
    }

    const newPlaylistItem = new PlaylistItem(this.practicePlaylistsSongs[dance][index], this.songDuration);
    dancePlaylist.items.splice(heat, 1, newPlaylistItem);
    return newPlaylistItem;
  }

  public async playSong(song: PlaylistItem) {
    this.reset = false;
    let step = 100;
    let songDuration = 10;
    let progress = 0;

    this.isPlaying = true;
    this.isPaused = false;
    this.audio.volume = 1;
    this.audio.src = song.configuration.absolutePath;
    this.currentSong = song;
    this.audio.play();
    this.currentSong.duration = await this.getCurrentSongDuration();

    while (this.currentSong.progress < Math.min(songDuration, this.currentSong.duration) && !this.reset) {
      this.currentSong.progress = this.audio.currentTime;
      await this.delay(step);
    }

    this.stop();
  }

  public async play(testRun = false, skipPause = false) {
    this.reset = false;
    this.audio.volume = 1;
    let step = 50;

    let songDuration = this.songDuration;
    let pauseDuration = this.pauseDuration;
    let fadeOutDuration = this.fadeOutDuration;
    if (testRun) {
      songDuration = 6;
      pauseDuration = 0;
      fadeOutDuration = 0;
    }

    this.isPlaying = true;
    this.isPaused = false;

    for (let d = 0; d < this.currentPractice.dances.length && !this.reset; d++) {
      for (let i = 0; i < this.currentPractice.dances[d].items.length && !this.reset; i++) {
        this.currentSong = this.currentPractice.dances[d].items[i];

        if (this.currentSong.progress < this.getSongDuration(this.currentSong)) {
          if (this.currentPractice.dances[d].dance as Dance !== Dance.Intro && !skipPause) {
            await this.playPause(pauseDuration);
          }

          skipPause = false;

          try {
            this.audio.src = this.currentSong.configuration.absolutePath;
            this.audio.currentTime = this.currentSong.progress;
            this.audio.play();
            this.currentSong.duration = await this.getCurrentSongDuration();

            while (this.currentSong.progress < Math.min(songDuration, this.currentSong.duration) && !this.reset) {
              this.currentSong.progress = this.audio.currentTime;

              let remainingTime = songDuration - this.currentSong.progress;
              if (remainingTime < fadeOutDuration) {
                this.audio.volume = Math.max(remainingTime / fadeOutDuration, 0);
              }

              await this.delay(step);
            }
          } catch (ex) {
            this.currentSong.error = ex;
          }

          this.audio.pause();
          this.audio.volume = 1;
        }
      };
    }

    if (!this.reset) {
      this.stop();
    }
  }

  public async playFromSong(playFromSong: PlaylistItem, selectNew = false, skipPause = false) {
    this.reset = false;
    let songFound = false;

    for (let d = 0; d < this.currentPractice.dances.length && !this.reset && !songFound; d++) {
      for (let i = 0; i < this.currentPractice.dances[d].items.length && !this.reset && !songFound; i++) {
        let song = this.currentPractice.dances[d].items[i];
        if (song === playFromSong) {
          songFound = true;

          if (selectNew) {
            song = this.selectNew(this.currentPractice.dances[d], i)
          }
        } else {
          song.progress = this.getSongDuration(song);
        }
      }
    }

    this.play(false, skipPause);
  }

  public async playPause(pauseDuration) {
    let progress = 0;
    let step = 50;

    while (this.pauseProgress < pauseDuration && !this.reset && !this.isPaused) {
      await this.delay(step);
      this.pauseProgress += Math.min(step / 1000, pauseDuration);
    }

    if (!this.isPaused) {
      this.pauseProgress = 0;
    }
  }

  public pause() {
    this.reset = true;
    this.isPaused = true;
  }

  public next() {
    if (this.pauseProgress > 0) {
      this.pauseProgress = this.pauseDuration;
    } else if (this.currentSong) {
      this.currentSong.progress = this.getSongDuration(this.currentSong);
    }
  }

  public stop() {
    this.reset = true;
    this.isPlaying = false;

    setTimeout(() => {
      this.audio.pause();
      this.audio.volume = 1;
      this.pauseProgress = 0;

      for (let d = 0; d < this.currentPractice.dances.length; d++) {
        for (let i = 0; i < this.currentPractice.dances[d].items.length; i++) {
          this.currentPractice.dances[d].items[i].progress = 0;
        }
      }
    }, 200);
  }

  public getSongDuration(song: PlaylistItem) {
    return Math.min(song.duration, this.songDuration);
  }

  private getCurrentSongDuration(): Promise<number> {
    let promise = new Promise<number>((resolve, reject) => {
      this.audio.onloadedmetadata = () => {
        resolve(this.audio.duration);
      };
    });

    return promise;
  }

  private async loadSongs(dance: Dance) {
    if (this.settings.configuration.defaultPlaylistsPerDance[dance]) {
      const playlist = this.settings.playlists.find(p => p.filename == this.settings.configuration.defaultPlaylistsPerDance[dance]);
      this.practicePlaylistsSongs[dance] =
        await this.settings.loadPlaylistSongs(playlist, playlist.items);
    }
  }

  private selectSongs(dance: Dance, numberOfSongs: number) {
    if (this.practicePlaylistsSongs[dance]) {
      let dancePlaylist = new PracticeDancePlaylist(dance);

      for (let i = 0; i < numberOfSongs; i++) {
        let retryCount = 0;
        let index = Math.floor(Math.random() * this.practicePlaylistsSongs[dance].length);

        while (retryCount < 10
          && (!this.practicePlaylistsSongs[dance][index].exists
            || dancePlaylist.items.filter(item => item.configuration.absolutePath == this.practicePlaylistsSongs[dance][index].absolutePath).length > 0)) {
          index = Math.floor(Math.random() * this.practicePlaylistsSongs[dance].length);
          retryCount++;
        }

        dancePlaylist.items.push(new PlaylistItem(this.practicePlaylistsSongs[dance][index], this.songDuration));
      }

      this.currentPractice.dances.push(dancePlaylist);
    }
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
