import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TrainingPlayerComponent } from './training-player.component';

describe('TrainingPlayerComponent', () => {
  let component: TrainingPlayerComponent;
  let fixture: ComponentFixture<TrainingPlayerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TrainingPlayerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TrainingPlayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
