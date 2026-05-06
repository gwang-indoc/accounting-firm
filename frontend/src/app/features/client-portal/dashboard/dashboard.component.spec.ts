import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
  });

  it('renders mat-toolbar', () => {
    expect(fixture.nativeElement.querySelector('mat-toolbar')).not.toBeNull();
  });

  it('renders mat-card wrapping welcome content', () => {
    expect(fixture.nativeElement.querySelector('mat-card')).not.toBeNull();
  });

  it('renders a logout button', () => {
    const logoutBtn = fixture.nativeElement.querySelector('button');
    expect(logoutBtn).not.toBeNull();
    expect(logoutBtn.textContent).toContain('Logout');
  });
});
