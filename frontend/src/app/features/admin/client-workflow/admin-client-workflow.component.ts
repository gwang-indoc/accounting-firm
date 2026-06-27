import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { HttpErrorResponse } from '@angular/common/http';
import { filter, switchMap, take, tap } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { EngagementService } from '../../../core/services/engagement.service';
import { EngagementDto, EngagementHistoryDto, EngagementStatus } from '../../../core/models/engagement.model';
import { AdminNewEngagementDialogComponent } from './admin-new-engagement-dialog.component';
import { AdminTransitionDialogComponent } from './admin-transition-dialog.component';

@Component({
  selector: 'app-admin-client-workflow',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatFormFieldModule, TranslateModule],
  templateUrl: './admin-client-workflow.component.html',
  styleUrl: './admin-client-workflow.component.css',
})
export class AdminClientWorkflowComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private engagementService = inject(EngagementService);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  readonly pipelineSteps: EngagementStatus[] = [
    'START', 'IN_PROCESSING', 'PENDING_CLIENT_REVIEW', 'SUBMIT_TO_CRA', 'COMPLETED',
  ];

  clientId = signal<number>(0);
  engagements = signal<EngagementDto[]>([]);
  expandedId = signal<number | null>(null);
  expandedHistory = signal<EngagementHistoryDto[]>([]);
  duplicateError = signal<boolean>(false);

  isStepReached(engStatus: EngagementStatus, stepIndex: number): boolean {
    return this.pipelineSteps.indexOf(engStatus) >= stepIndex;
  }

  isStepDone(engStatus: EngagementStatus, stepIndex: number): boolean {
    return this.pipelineSteps.indexOf(engStatus) > stepIndex;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.clientId.set(id);
    this.loadEngagements();
  }

  private loadEngagements(): void {
    this.engagementService.getEngagementsForClient(this.clientId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(list => this.engagements.set(list));
  }

  toggleExpand(engagement: EngagementDto): void {
    if (this.expandedId() === engagement.id) {
      this.expandedId.set(null);
      this.expandedHistory.set([]);
      return;
    }
    this.expandedId.set(engagement.id);
    this.engagementService
      .getEngagementHistory(this.clientId(), engagement.taxYear)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(history => this.expandedHistory.set(history));
  }

  openNewEngagementDialog(): void {
    this.dialog.open(AdminNewEngagementDialogComponent, { width: '380px', panelClass: 'dark-dialog' })
      .afterClosed()
      .pipe(
        take(1),
        filter((taxYear: number | undefined): taxYear is number => taxYear != null),
        tap(() => this.duplicateError.set(false)),
        switchMap(taxYear => this.engagementService.createEngagement(this.clientId(), taxYear))
      )
      .subscribe({
        next: () => this.loadEngagements(),
        error: (err: HttpErrorResponse) => {
          if (err.status === 409) {
            this.duplicateError.set(true);
          }
        },
      });
  }

  submitNewEngagement(taxYear: number): void {
    this.duplicateError.set(false);
    this.engagementService.createEngagement(this.clientId(), taxYear)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadEngagements(),
        error: (err: HttpErrorResponse) => {
          if (err.status === 409) {
            this.duplicateError.set(true);
          }
        },
      });
  }

  openTransitionDialog(engagement: EngagementDto): void {
    this.dialog.open(AdminTransitionDialogComponent, {
      data: { currentStatus: engagement.status },
      width: '460px',
      panelClass: 'dark-dialog',
    })
      .afterClosed()
      .pipe(
        take(1),
        filter((result): result is { status: EngagementStatus; note: string | null } => !!result),
        switchMap(result =>
          this.engagementService
            .transitionStatus(this.clientId(), engagement.taxYear, result.status, result.note)
            .pipe(tap(() => {
              this.loadEngagements();
              if (this.expandedId() === engagement.id) {
                this.engagementService
                  .getEngagementHistory(this.clientId(), engagement.taxYear)
                  .pipe(takeUntilDestroyed(this.destroyRef))
                  .subscribe(history => this.expandedHistory.set(history));
              }
            }))
        )
      )
      .subscribe();
  }
}
