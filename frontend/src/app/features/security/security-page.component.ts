import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-security-page',
  standalone: true,
  imports: [MatIconModule, RouterLink, TranslateModule],
  templateUrl: './security-page.component.html',
  styleUrl: './security-page.component.css',
})
export class SecurityPageComponent {
  readonly pillars = [
    {
      icon: 'lock',
      title: 'End-to-End Encryption',
      description: 'All data in transit is protected with TLS 1.3. Documents at rest are encrypted using AES-256 — the same standard used by financial institutions and governments worldwide.',
    },
    {
      icon: 'verified_user',
      title: 'OAuth2 Identity Verification',
      description: "We delegate authentication to Google's OAuth2 infrastructure. Your credentials are never stored on our servers — only a securely signed JWT session token is held.",
    },
    {
      icon: 'folder_special',
      title: 'Isolated Document Storage',
      description: "Every client's documents live in a dedicated storage partition. Our access-control layer ensures that no one — not even other GWH staff — can access files outside their scope.",
    },
    {
      icon: 'manage_accounts',
      title: 'Role-Based Access Control',
      description: "A strict ADMIN / CLIENT permission model governs every API endpoint. Our security layer rejects requests that don't carry a valid role token — no exceptions.",
    },
  ];

  readonly practices = [
    { icon: 'security_update_good', label: 'Regular security audits' },
    { icon: 'bug_report', label: 'Vulnerability disclosure program' },
    { icon: 'backup', label: 'Daily encrypted backups' },
    { icon: 'history', label: 'Full audit logging' },
    { icon: 'https', label: 'HTTPS-only enforcement' },
    { icon: 'policy', label: 'GDPR & CCPA aligned' },
  ];
}
