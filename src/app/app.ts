import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminDashboardComponent } from './features/admin-dashboard/admin-dashboard';

@Component({
  imports: [RouterOutlet, AdminDashboardComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('srmsAdmin');
}
