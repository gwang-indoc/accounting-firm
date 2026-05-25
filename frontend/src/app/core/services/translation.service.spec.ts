import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { vi, beforeEach } from 'vitest';
import { TranslationService } from './translation.service';

describe('TranslationService', () => {
  let service: TranslationService;
  let translate: TranslateService;
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
      providers: [TranslationService, TranslateService]
    });
    service = TestBed.inject(TranslationService);
    translate = TestBed.inject(TranslateService);
  });

  it('should initialize with default language EN', async () => {
    await service.init();
    expect(service.getLanguage()).toBe('en');
  });

  it('should update signal when setLanguage called', () => {
    service.setLanguage('zh');
    expect(service.currentLanguage()).toBe('zh');
  });

  it('should update signal back to EN when setLanguage called', () => {
    service.setLanguage('zh');
    service.setLanguage('en');
    expect(service.currentLanguage()).toBe('en');
  });

  it('should save to localStorage when setLanguage called', () => {
    service.setLanguage('zh');
    expect(localStorageMock['language']).toBe('zh');
  });

  it('should call translate.use() when setLanguage called', () => {
    const useSpy = vi.spyOn(translate, 'use').mockReturnValue({ toPromise: () => Promise.resolve() } as any);
    service.setLanguage('zh');
    expect(useSpy).toHaveBeenCalledWith('zh');
  });
});
