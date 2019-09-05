import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { SettingsService } from './shared/services/settings.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  constructor(public settings: SettingsService, private router: Router) {
    
  }

  async ngOnInit() {
    await this.settings.initialize();
    this.router.navigate(['training']);
  }
}
