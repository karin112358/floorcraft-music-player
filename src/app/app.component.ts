import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';

import { SettingsService } from './shared/services/settings.service';
import { ElectronService } from 'ngx-electron';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  public window: any;

  constructor(public settings: SettingsService, private router: Router, private electronService: ElectronService) {

  }

  async ngAfterViewInit() {
    this.window = this.electronService.remote.getCurrentWindow();

    console.log('start initialize');
    await this.settings.initialize();
    console.log('finished initialize');

    if (this.settings.musicFolders.length) {
      this.router.navigate(['training']);
    } else {
      this.router.navigate(['settings']);
    }
  }

  public minimizeWindow() {
    this.window.minimize();
  }

  public maximizeWindow() {
    this.window.maximize();
  }

  public restoreWindow() {
    this.window.unmaximize();
  }

  public closeWindow() {
    this.window.close();
  }
}
