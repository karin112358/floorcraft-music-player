import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PracticePlayerComponent } from './practice-player/practice-player.component';
import { SettingsComponent } from './settings/settings.component';
import { TrainingPlayerComponent } from './training-player/training-player.component';
import { ManageLibraryComponent } from './manage-library/manage-library.component';

const routes: Routes = [
  { path: 'training', component: TrainingPlayerComponent },
  { path: 'practice', component: PracticePlayerComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'manage-library', component: ManageLibraryComponent },
  { path: '', redirectTo: '/training', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { initialNavigation: false })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
