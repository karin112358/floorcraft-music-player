import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageLibraryComponent } from './manage-library.component';

describe('ManageLibraryComponent', () => {
  let component: ManageLibraryComponent;
  let fixture: ComponentFixture<ManageLibraryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ManageLibraryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageLibraryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
