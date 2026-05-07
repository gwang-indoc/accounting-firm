import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideHttpClient()],
    }).compileComponents();
    fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
  });

  it('renders mat-card wrapping welcome content', () => {
    expect(fixture.nativeElement.querySelector('mat-card')).not.toBeNull();
  });

  it('does not render a secondary mat-toolbar (logout moved to navbar)', () => {
    expect(fixture.nativeElement.querySelector('mat-toolbar')).toBeNull();
  });
});
