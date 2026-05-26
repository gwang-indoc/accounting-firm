import { Component, inject, computed, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-security-page',
  standalone: true,
  imports: [MatIconModule, RouterLink, TranslateModule],
  templateUrl: './security-page.component.html',
  styleUrl: './security-page.component.css',
})
export class SecurityPageComponent {
  private translate = inject(TranslateService);
  private langChangeSignal = signal<string>(this.translate.currentLang);

  readonly pillarKeys = [
    {
      icon: 'lock',
      titleKey: 'security.pillar.encryption.title',
      descKey: 'security.pillar.encryption.desc',
    },
    {
      icon: 'verified_user',
      titleKey: 'security.pillar.oauth.title',
      descKey: 'security.pillar.oauth.desc',
    },
    {
      icon: 'folder_special',
      titleKey: 'security.pillar.isolation.title',
      descKey: 'security.pillar.isolation.desc',
    },
    {
      icon: 'manage_accounts',
      titleKey: 'security.pillar.rbac.title',
      descKey: 'security.pillar.rbac.desc',
    },
  ];

  readonly practiceKeys = [
    { icon: 'security_update_good', labelKey: 'security.practice.audits' },
    { icon: 'bug_report', labelKey: 'security.practice.vulnerability' },
    { icon: 'backup', labelKey: 'security.practice.backups' },
    { icon: 'history', labelKey: 'security.practice.auditLog' },
    { icon: 'https', labelKey: 'security.practice.https' },
    { icon: 'policy', labelKey: 'security.practice.compliance' },
  ];

  pillars = computed(() => {
    this.langChangeSignal();
    return this.pillarKeys.map(pk => ({
      icon: pk.icon,
      title: this.translate.instant(pk.titleKey),
      description: this.translate.instant(pk.descKey),
    }));
  });

  practices = computed(() => {
    this.langChangeSignal();
    return this.practiceKeys.map(pk => ({
      icon: pk.icon,
      label: this.translate.instant(pk.labelKey),
    }));
  });

  constructor() {
    this.translate.onLangChange.subscribe(() => {
      this.langChangeSignal.set(this.translate.currentLang);
    });
  }
}
