import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';

import { SettingsService } from './shared/services/settings.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  constructor(public settings: SettingsService, private router: Router) {

  }

  async ngAfterViewInit() {
    await this.settings.initialize();

    if (this.settings.musicFolders.length) {
      this.router.navigate(['training']);
    } else {
      this.router.navigate(['settings']);
    }
  }
}
