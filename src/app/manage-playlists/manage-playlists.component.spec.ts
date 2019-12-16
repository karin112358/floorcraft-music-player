import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagePlaylistsComponent } from './manage-playlists.component';

describe('ManagePlaylistsComponent', () => {
  let component: ManagePlaylistsComponent;
  let fixture: ComponentFixture<ManagePlaylistsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ManagePlaylistsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ManagePlaylistsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
