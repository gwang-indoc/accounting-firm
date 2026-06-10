import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY, firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  currentLanguage = signal<'en' | 'zh'>('en');
  private isAuthFn: () => boolean = () => false;

  constructor(
    private translate: TranslateService,
    private http: HttpClient
  ) {}

  async init(isAuthFn?: () => boolean): Promise<void> {
    if (isAuthFn) {
      this.isAuthFn = isAuthFn;
    }
    this.translate.setDefaultLang('en');
    const enTranslations = await this.loadAndMergeLanguage('en');
    this.translate.setTranslation('en', enTranslations);
    this.translate.use('en');
  }

  async setLanguage(lang: 'en' | 'zh'): Promise<void> {
    await this.loadLanguage(lang);
    this.currentLanguage.set(lang);
    localStorage.setItem('language', lang);
    if (this.isAuthFn()) {
      this.http.patch('/api/auth/me/language', { language: lang })
        .pipe(catchError(() => EMPTY)).subscribe();
    }
  }

  async applyProfileLanguage(lang: 'en' | 'zh' | null): Promise<void> {
    if (lang !== null) {
      await this.loadLanguage(lang).catch(() => {});
      this.currentLanguage.set(lang);
      localStorage.setItem('language', lang);
    } else {
      const saved = localStorage.getItem('language') as 'en' | 'zh' | null;
      if (saved) {
        await this.loadLanguage(saved).catch(() => {});
        this.currentLanguage.set(saved);
        if (this.isAuthFn()) {
          this.http.patch('/api/auth/me/language', { language: saved })
            .pipe(catchError(() => EMPTY)).subscribe();
        }
      }
    }
  }

  private async loadLanguage(lang: 'en' | 'zh'): Promise<void> {
    const translations = await this.loadAndMergeLanguage(lang);
    this.translate.setTranslation(lang, translations);
    this.translate.use(lang);
  }

  private async loadAndMergeLanguage(lang: 'en' | 'zh'): Promise<Record<string, any>> {
    const [root, publicTrans, portal, admin] = await Promise.all([
      firstValueFrom(this.http.get(`./i18n/${lang}.json`)).catch(() => ({})),
      firstValueFrom(this.http.get(`./i18n/public/${lang}.json`)).catch(() => ({})),
      firstValueFrom(this.http.get(`./i18n/portal/${lang}.json`)).catch(() => ({})),
      firstValueFrom(this.http.get(`./i18n/admin/${lang}.json`)).catch(() => ({})),
    ]);
    return { ...root, ...publicTrans, ...portal, ...admin } as Record<string, any>;
  }

  getLanguage(): 'en' | 'zh' {
    return this.currentLanguage();
  }
}
