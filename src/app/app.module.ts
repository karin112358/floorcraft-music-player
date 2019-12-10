import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FlexLayoutModule } from '@angular/flex-layout';

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
import { NgxElectronModule } from 'ngx-electron';
import { SimpleNotificationsModule } from 'angular2-notifications';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PracticePlayerComponent } from './practice-player/practice-player.component';
import { SettingsComponent } from './settings/settings.component';
import { StorageModule } from '@ngx-pwa/local-storage';
import { TrainingPlayerComponent } from './training-player/training-player.component';
import { ManageLibraryComponent } from './manage-library/manage-library.component';

@NgModule({
  declarations: [
    AppComponent,
    PracticePlayerComponent,
    SettingsComponent,
    TrainingPlayerComponent,
    ManageLibraryComponent
  ],
  imports: [
    BrowserAnimationsModule,
    MatInputModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatToolbarModule,
    MatProgressBarModule,
    MatAutocompleteModule,
    MatIconModule,
    MatSelectModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatCheckboxModule,
    MatSliderModule,
    MatTooltipModule,
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
