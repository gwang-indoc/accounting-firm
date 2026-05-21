import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  constructor(private route: ActivatedRoute, private snackBar: MatSnackBar) {}

  ngOnInit() {
    if (this.route.snapshot.queryParamMap.get('registered') === 'true') {
      this.snackBar.open('Account created! Please sign in.', 'OK', { duration: 4000 });
    }
  }
}
