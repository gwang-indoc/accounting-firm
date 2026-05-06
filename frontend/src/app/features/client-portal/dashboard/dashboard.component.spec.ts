import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
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

  it('renders mat-toolbar with color="primary"', () => {
    const toolbar = fixture.nativeElement.querySelector('mat-toolbar');
    expect(toolbar).not.toBeNull();
    expect(toolbar.getAttribute('color')).toBe('primary');
  });

  it('renders mat-card wrapping welcome content', () => {
    expect(fixture.nativeElement.querySelector('mat-card')).not.toBeNull();
  });

  it('logout button uses mat-stroked-button', () => {
    const btn = fixture.nativeElement.querySelector('[mat-stroked-button]');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toContain('Logout');
  });
});
