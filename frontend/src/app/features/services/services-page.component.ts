import { Component, inject, computed, signal, effect } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-services-page',
  standalone: true,
  imports: [MatIconModule, RouterLink, TranslateModule],
  templateUrl: './services-page.component.html',
  styleUrl: './services-page.component.css',
})
export class ServicesPageComponent {
  private translate = inject(TranslateService);
  private langChangeSignal = signal<string>(this.translate.currentLang);

  readonly serviceKeys = [
    {
      icon: 'receipt_long',
      titleKey: 'services.taxPrep.title',
      descKey: 'services.taxPrep.desc',
      tagKey: 'services.taxPrep.tag',
    },
    {
      icon: 'menu_book',
      titleKey: 'services.bookkeeping.title',
      descKey: 'services.bookkeeping.desc',
      tagKey: 'services.bookkeeping.tag',
    },
    {
      icon: 'trending_up',
      titleKey: 'services.consulting.title',
      descKey: 'services.consulting.desc',
      tagKey: 'services.consulting.tag',
    },
    {
      icon: 'corporate_fare',
      titleKey: 'services.advisory.title',
      descKey: 'services.advisory.desc',
      tagKey: 'services.advisory.tag',
    },
    {
      icon: 'people',
      titleKey: 'services.payroll.title',
      descKey: 'services.payroll.desc',
      tagKey: 'services.payroll.tag',
    },
    {
      icon: 'account_balance',
      titleKey: 'services.estate.title',
      descKey: 'services.estate.desc',
      tagKey: 'services.estate.tag',
    },
  ];

  services = computed(() => {
    this.langChangeSignal();
    return this.serviceKeys.map(sk => ({
      icon: sk.icon,
      title: this.translate.instant(sk.titleKey),
      description: this.translate.instant(sk.descKey),
      tag: this.translate.instant(sk.tagKey),
    }));
  });

  constructor() {
    this.translate.onLangChange.subscribe(() => {
      this.langChangeSignal.set(this.translate.currentLang);
    });
  }
}
