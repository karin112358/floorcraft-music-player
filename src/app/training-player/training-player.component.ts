import { Component, OnInit } from '@angular/core';
import { Slot } from '../shared/models/slot';

@Component({
  selector: 'app-training-player',
  templateUrl: './training-player.component.html',
  styleUrls: ['./training-player.component.scss']
})
export class TrainingPlayerComponent implements OnInit {
  public slots: Slot[] = [];

  constructor() { }

  ngOnInit() {
  }

}
