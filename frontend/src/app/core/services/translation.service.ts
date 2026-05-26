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

    // Load default English translations (merge all files)
    const enTranslations = await this.loadAndMergeLanguage('en');
    this.translate.setTranslation('en', enTranslations);

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
