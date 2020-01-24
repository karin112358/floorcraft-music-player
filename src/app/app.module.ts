import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FlexLayoutModule } from '@angular/flex-layout';

import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSliderModule } from '@angular/material/slider';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatTreeModule } from '@angular/material/tree';
import { MatMenuModule } from '@angular/material/menu';
import { NgxElectronModule } from 'ngx-electron';
import { SimpleNotificationsModule } from 'angular2-notifications';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PracticePlayerComponent } from './practice-player/practice-player.component';
import { SettingsComponent } from './settings/settings.component';
import { StorageModule } from '@ngx-pwa/local-storage';
import { TrainingPlayerComponent } from './training-player/training-player.component';
import { ManageLibraryComponent } from './manage-library/manage-library.component';
import { ManagePlaylistsComponent } from './manage-playlists/manage-playlists.component';

@NgModule({
  declarations: [
    AppComponent,
    PracticePlayerComponent,
    SettingsComponent,
    TrainingPlayerComponent,
    ManageLibraryComponent,
    ManagePlaylistsComponent
  ],
  imports: [
    BrowserAnimationsModule,
    MatDialogModule,
    MatInputModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatToolbarModule,
    MatProgressBarModule,
    MatAutocompleteModule,
    MatIconModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatChipsModule,
    MatTreeModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatCheckboxModule,
    MatSliderModule,
    MatTooltipModule,
    MatMenuModule,
    FormsModule,
    BrowserModule,
    NgxElectronModule,
    AppRoutingModule,
    FlexLayoutModule,
    StorageModule.forRoot({ IDBNoWrap: true }),
    SimpleNotificationsModule.forRoot()
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
