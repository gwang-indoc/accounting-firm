import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { AdminClientsComponent } from './admin-clients.component';
import { AdminClientsService } from '../../../core/services/admin-clients.service';
import { ClientDto } from '../../../core/models/client.model';
import { of } from 'rxjs';

const sampleClients: ClientDto[] = [
  { id: 1, name: 'Jane Smith', email: 'jane@gmail.com', phone: '555-1234', createdAt: '2026-01-01T00:00:00', linkedUserId: 42 },
  { id: 2, name: 'Bob Lee',    email: 'bob@work.com',   phone: null,        createdAt: '2026-01-02T00:00:00', linkedUserId: null },
];

describe('AdminClientsComponent', () => {
  let fixture: ComponentFixture<AdminClientsComponent>;
  let mockService: Partial<AdminClientsService>;

  beforeEach(async () => {
    mockService = {
      getAll: vi.fn().mockReturnValue(of(sampleClients)),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AdminClientsComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        { provide: AdminClientsService, useValue: mockService },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminClientsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders two client rows on load', () => {
    const rows = fixture.nativeElement.querySelectorAll('[data-testid="client-row"]');
    expect(rows.length).toBe(2);
  });

  it('shows Linked badge for linked client', () => {
    const firstRow = fixture.nativeElement.querySelector('[data-testid="client-row"]');
    expect(firstRow.textContent).toContain('Linked');
  });

  it('shows Not linked badge for unlinked client', () => {
    const rows = fixture.nativeElement.querySelectorAll('[data-testid="client-row"]');
    expect(rows[1].textContent).toContain('Not linked');
  });

  it('Add Client button exists', () => {
    const btn = fixture.nativeElement.querySelector('[data-testid="add-client-btn"]');
    expect(btn).not.toBeNull();
  });
});
