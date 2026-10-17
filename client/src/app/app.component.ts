// Application shell: sidebar navigation + routed page (team-owned integration).
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  readonly nav = [
    { path: '/tasks', label: 'Tasks', icon: '✔', owner: 'Quzhan Johnson' },
    { path: '/categories', label: 'Categories & Lists', icon: '▦', owner: 'Aderoju Okunlola' },
    { path: '/reminders', label: 'Reminders & Subtasks', icon: '⏰', owner: 'Lakshmi P. P. Ega' },
    { path: '/recurring', label: 'Recurring Tasks', icon: '↻', owner: 'Deborah Cody' },
  ];
}
