import { Component, OnInit } from '@angular/core';
import { SettingsService } from './shared/services/settings.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  constructor(public settings: SettingsService) {
    
  }

  async ngOnInit() {
    await this.settings.initialize()
  }
}
