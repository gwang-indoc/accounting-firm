import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { vi, beforeEach, afterEach } from 'vitest';
import { TranslationService } from './translation.service';

describe('TranslationService', () => {
  let service: TranslationService;
  let translate: TranslateService;
  let httpMock: HttpTestingController;
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    localStorageMock = {};

    vi.stubGlobal('localStorage', {
      getItem: (key: string) => localStorageMock[key] || null,
      setItem: (key: string, value: string) => {
        localStorageMock[key] = value;
      },
      removeItem: (key: string) => {
        delete localStorageMock[key];
      },
      clear: () => {
        localStorageMock = {};
      }
    });

    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        TranslationService,
        TranslateService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    });
    service = TestBed.inject(TranslationService);
    translate = TestBed.inject(TranslateService);
    httpMock = TestBed.inject(HttpTestingController);

    // Prevent i18n HTTP calls in tests that don't test HTTP behaviour
    vi.spyOn(service as any, 'loadAndMergeLanguage').mockResolvedValue({});
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should initialize with default language EN', async () => {
    await service.init();
    expect(service.getLanguage()).toBe('en');
  });

  it('should update signal when setLanguage called', async () => {
    await service.setLanguage('zh');
    expect(service.currentLanguage()).toBe('zh');
  });

  it('should update signal back to EN when setLanguage called', async () => {
    await service.setLanguage('zh');
    await service.setLanguage('en');
    expect(service.currentLanguage()).toBe('en');
  });

  it('should save to localStorage when setLanguage called', async () => {
    await service.setLanguage('zh');
    expect(localStorageMock['language']).toBe('zh');
  });

  it('should call translate.use() when setLanguage called', async () => {
    const useSpy = vi.spyOn(translate, 'use').mockReturnValue({ toPromise: () => Promise.resolve() } as any);
    await service.setLanguage('zh');
    expect(useSpy).toHaveBeenCalledWith('zh');
  });

  it('applyProfileLanguage with non-null lang sets language signal and writes localStorage', async () => {
    await service.applyProfileLanguage('zh');
    expect(service.currentLanguage()).toBe('zh');
    expect(localStorageMock['language']).toBe('zh');
  });

  it('applyProfileLanguage with null applies localStorage language', async () => {
    localStorageMock['language'] = 'zh';
    await service.applyProfileLanguage(null);
    expect(service.currentLanguage()).toBe('zh');
  });

  it('applyProfileLanguage with null fires PATCH when isAuthFn returns true', async () => {
    service.init(() => true);
    localStorageMock['language'] = 'zh';
    await service.applyProfileLanguage(null);
    const req = httpMock.expectOne('/api/auth/me/language');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ language: 'zh' });
    req.flush(null);
  });

  it('applyProfileLanguage with null does NOT fire PATCH when isAuthFn returns false', async () => {
    localStorageMock['language'] = 'zh';
    await service.applyProfileLanguage(null);
    httpMock.expectNone('/api/auth/me/language');
  });

  it('setLanguage fires PATCH when isAuthFn returns true', async () => {
    service.init(() => true);
    await service.setLanguage('zh');
    const req = httpMock.expectOne('/api/auth/me/language');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ language: 'zh' });
    req.flush(null);
  });

  it('setLanguage does NOT fire PATCH when isAuthFn returns false', async () => {
    service.init(() => false);
    await service.setLanguage('zh');
    httpMock.expectNone('/api/auth/me/language');
  });
});
