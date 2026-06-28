import { Component, OnInit, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { EngagementDto } from '../../../core/models/engagement.model';
import { PortalEngagementService } from './portal-engagement.service';

@Component({
  selector: 'app-portal-engagements',
  standalone: true,
  imports: [TranslateModule],
  template: `
    @if (engagements().length === 0) {
      <p class="empty" data-testid="empty-state">{{ 'portalEngagements.empty' | translate }}</p>
    } @else {
      <ul class="eng-list">
        @for (eng of engagements(); track eng.id) {
          <li class="eng-row" data-testid="engagement-row">
            <span class="eng-name" data-testid="eng-name">{{ eng.name }}</span>
            <span class="eng-year" data-testid="eng-year">{{ eng.taxYear }}</span>
            <span class="eng-status" data-testid="eng-status">{{ eng.status }}</span>
          </li>
        }
      </ul>
    }
  `,
  styles: [`
    .eng-list { list-style: none; padding: 0; margin: 0; }
    .eng-row {
      display: flex;
      gap: 16px;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #334155;
    }
    .eng-name { font-weight: 600; color: #f1f5f9; flex: 1; }
    .eng-year { color: #94a3b8; font-size: 13px; }
    .eng-status {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
    }
    .empty { color: #64748b; text-align: center; padding: 40px 0; }
  `],
})
export class PortalEngagementsComponent implements OnInit {
  private svc = inject(PortalEngagementService);
  engagements = signal<EngagementDto[]>([]);

  ngOnInit(): void {
    this.svc.getMyEngagements().subscribe(list => this.engagements.set(list));
  }
}
