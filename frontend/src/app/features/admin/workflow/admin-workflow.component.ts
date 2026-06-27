import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { EngagementService } from '../../../core/services/engagement.service';
import { BusinessType, EngagementDashboardDto, EngagementStatus } from '../../../core/models/engagement.model';

@Component({
  selector: 'app-admin-workflow',
  standalone: true,
  imports: [MatSelectModule, MatFormFieldModule, MatButtonModule, FormsModule],
  template: `
    <div class="page-header">
      <h2>Workflow</h2>
    </div>

    <div class="filters">
      <mat-form-field appearance="outline">
        <mat-label>Status</mat-label>
        <mat-select [(ngModel)]="selectedStatus" (ngModelChange)="filterByStatus($event)">
          <mat-option value="">All</mat-option>
          @for (s of statuses; track s) {
            <mat-option [value]="s">{{ s }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Business Type</mat-label>
        <mat-select [(ngModel)]="selectedBusinessType" (ngModelChange)="filterByBusinessType($event)">
          <mat-option value="">All</mat-option>
          @for (bt of businessTypes; track bt) {
            <mat-option [value]="bt">{{ bt }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

    <table class="workflow-table">
      <thead>
        <tr>
          <th>Client Name</th>
          <th>Business Type</th>
          <th>Tax Year</th>
          <th>Status</th>
          <th>Last Updated</th>
          <th>Last Updated By</th>
        </tr>
      </thead>
      <tbody>
        @for (e of filteredEngagements(); track e.id) {
          <tr data-testid="engagement-row">
            <td>{{ e.clientName }}</td>
            <td>{{ e.businessType }}</td>
            <td>{{ e.taxYear }}</td>
            <td>{{ e.status }}</td>
            <td>{{ e.updatedAt }}</td>
            <td>{{ e.updatedByName }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class AdminWorkflowComponent implements OnInit {
  private engagementService = inject(EngagementService);

  engagements = signal<EngagementDashboardDto[]>([]);
  selectedStatus = signal<string>('');
  selectedBusinessType = signal<string>('');

  readonly statuses: EngagementStatus[] = ['START', 'IN_PROCESSING', 'PENDING_CLIENT_REVIEW', 'SUBMIT_TO_CRA', 'COMPLETED'];
  readonly businessTypes: BusinessType[] = ['PERSONAL', 'CORPORATE', 'SELF_EMPLOYED'];

  filteredEngagements = computed(() => {
    return this.engagements().filter(e => {
      const statusMatch = !this.selectedStatus() || e.status === this.selectedStatus();
      const btMatch = !this.selectedBusinessType() || e.businessType === this.selectedBusinessType();
      return statusMatch && btMatch;
    });
  });

  ngOnInit(): void {
    this.engagementService.getAllEngagements().subscribe(data => this.engagements.set(data));
  }

  filterByStatus(status: string): void {
    this.selectedStatus.set(status);
  }

  filterByBusinessType(bt: string): void {
    this.selectedBusinessType.set(bt);
  }
}
