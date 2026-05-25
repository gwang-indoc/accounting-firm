import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  currentLanguage = signal<'en' | 'zh'>('en');

  constructor(
    private translate: TranslateService,
    private http: HttpClient
  ) {}

  async init(): Promise<void> {
    this.translate.setDefaultLang('en');

    // Load default English translations
    const enTranslations = await firstValueFrom(
      this.http.get('./i18n/en.json')
    );
    this.translate.setTranslation('en', enTranslations as any);

    // Check for saved language preference
    const saved = localStorage.getItem('language') as 'en' | 'zh' | null;
    if (saved === 'zh') {
      await this.loadLanguage('zh');
      this.currentLanguage.set('zh');
    } else {
      this.translate.use('en');
    }
  }

  async setLanguage(lang: 'en' | 'zh'): Promise<void> {
    await this.loadLanguage(lang);
    this.currentLanguage.set(lang);
    localStorage.setItem('language', lang);
  }

  private async loadLanguage(lang: 'en' | 'zh'): Promise<void> {
    const translations = await firstValueFrom(
      this.http.get(`./i18n/${lang}.json`)
    );
    this.translate.setTranslation(lang, translations as any);
    this.translate.use(lang);
  }

  getLanguage(): 'en' | 'zh' {
    return this.currentLanguage();
  }
}
