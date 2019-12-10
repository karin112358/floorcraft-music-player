import { Component, OnInit } from '@angular/core';
import { SettingsService } from '../shared/services/settings.service';

@Component({
  selector: 'app-manage-library',
  templateUrl: './manage-library.component.html',
  styleUrls: ['./manage-library.component.scss']
})
export class ManageLibraryComponent implements OnInit {
  public playlistColumns: string[] = ['title', 'items', 'lastModified'];

  constructor(public settings: SettingsService) { }

  ngOnInit() {
  }

}
