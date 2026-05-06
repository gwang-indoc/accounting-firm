import { Component } from '@angular/core';
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent } from '@angular/material/card';

@Component({
  selector: 'app-home',
  imports: [MatCard, MatCardHeader, MatCardTitle, MatCardContent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {}
