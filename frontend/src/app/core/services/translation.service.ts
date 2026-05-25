import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  currentLanguage = signal<'en' | 'zh'>('en');

  constructor(private translate: TranslateService) {}

  init(): Promise<void> {
    this.translate.setDefaultLang('en');

    const saved = localStorage.getItem('language') as 'en' | 'zh' | null;
    if (saved === 'zh') {
      this.setLanguage('zh');
    }

    return this.translate.use('en').toPromise() as Promise<void>;
  }

  setLanguage(lang: 'en' | 'zh'): void {
    this.translate.use(lang);
    this.currentLanguage.set(lang);
    localStorage.setItem('language', lang);
  }

  getLanguage(): 'en' | 'zh' {
    return this.currentLanguage();
  }
}
