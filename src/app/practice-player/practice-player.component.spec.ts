import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PracticePlayerComponent } from './practice-player.component';

describe('PracticePlayerComponent', () => {
  let component: PracticePlayerComponent;
  let fixture: ComponentFixture<PracticePlayerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PracticePlayerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PracticePlayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
