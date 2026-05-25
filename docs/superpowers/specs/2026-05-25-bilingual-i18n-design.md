# Design: Bilingual Angular App with English/Chinese Support

**Date:** 2026-05-25  
**Scope:** Add i18n (English/中文) to all frontend pages: public site, client portal, admin panel  
**Status:** Design approved, ready for implementation

---

## Overview

Add runtime language switching (EN/中文) to the Angular accounting firm app. Users can toggle languages via navbar button, choice persists across sessions. Static UI text only — backend API responses stay English.

**Key Decisions:**
- Library: `@ngx-translate/core` (flexible, popular, runtime switching)
- Scope: All three areas (public site + portal + admin panel)
- Backend: No changes (frontend-only translation)
- Storage: localStorage for language preference
- Default: English on first load

---

## Architecture

### Translation Flow

1. **App startup** → `APP_INITIALIZER` calls `TranslationService.init()`
2. **Load default (EN)** → check localStorage for saved language preference
3. **Switch if needed** → if ZH saved, call `setLanguage('zh')`
4. **User toggles** → click navbar flag button → `setLanguage()` updates
5. **Templates re-render** → `translate` pipe handles all text replacement
6. **Persist choice** → localStorage saves preference for next session

### Service Architecture

**TranslationService** (`src/app/core/services/translation.service.ts`)
- Wraps `TranslateService` from ngx-translate
- Exposes `currentLanguage` signal (Angular zoneless-compatible)
- Provides `setLanguage(lang)` method
- Handles localStorage persistence
- Called via `APP_INITIALIZER` at startup

**Component Integration**
- No component logic changes required
- Templates use `translate` pipe: `{{ 'key.path' | translate }}`
- Navbar gets language toggle button
- All other components unchanged

---

## File Structure

### Translation Files

```
frontend/src/assets/i18n/
├── en.json                    # Default (shared labels: nav, footer, buttons)
├── zh.json                    # Chinese (shared labels)
├── public/
│   ├── en.json               # Public site (home, services, security, contact, book-consultation)
│   └── zh.json
├── portal/
│   ├── en.json               # Client portal (dashboard, documents, messages)
│   └── zh.json
└── admin/
    ├── en.json               # Admin panel (clients, documents, messages)
    └── zh.json
```

### JSON Key Format

Flat key structure with dots for hierarchy:

```json
{
  "navbar.home": "Home",
  "navbar.services": "Services",
  "navbar.language": "中文",
  "public.home.hero.title": "Secure Tax & Accounting Portal",
  "public.services.bookkeeping": "Bookkeeping",
  "portal.dashboard.welcome": "Welcome",
  "admin.clients.addClient": "Add Client"
}
```

**Naming convention:**
- `[area].[component].[element]`: `public.home.hero.title`
- Shared items (nav, buttons, footer): root level (no area prefix)
- Descriptive keys (no abbreviations): `bookkeeping` not `bk`

---

## Implementation Details

### 1. TranslationService

File: `src/app/core/services/translation.service.ts`

```typescript
import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  currentLanguage = signal<'en' | 'zh'>('en');

  constructor(private translate: TranslateService) {}

  init(): Promise<void> {
    this.translate.setDefaultLanguage('en');
    
    const saved = localStorage.getItem('language') as 'en' | 'zh' | null;
    if (saved === 'zh') {
      this.setLanguage('zh');
    }

    return this.translate.use('en').toPromise();
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
```

### 2. App Configuration

File: `src/app/app.config.ts`

Add `APP_INITIALIZER` provider:

```typescript
import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';

export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideAnimations(),
    importProvidersFrom([
      TranslateModule.forRoot({
        defaultLanguage: 'en',
        loader: {
          provide: TranslateLoader,
          useFactory: createTranslateLoader,
          deps: [HttpClient]
        }
      })
    ]),
    {
      provide: APP_INITIALIZER,
      useFactory: (ts: TranslationService) => () => ts.init(),
      deps: [TranslationService],
      multi: true
    }
  ]
};
```

### 3. Navbar Language Toggle

File: `src/app/shared/navbar/navbar.component.ts`

```typescript
import { Component, inject } from '@angular/core';
import { TranslationService } from '@app/core/services/translation.service';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-navbar',
  template: `
    <nav>
      <!-- existing navbar content -->
      <button mat-icon-button (click)="toggleLanguage()" 
              class="language-toggle"
              [attr.aria-label]="'Toggle language'">
        {{ currentLanguage() === 'en' ? '🇨🇳' : '🇺🇸' }}
        <span class="ml-2">
          {{ currentLanguage() === 'en' ? '中文' : 'English' }}
        </span>
      </button>
    </nav>
  `,
  standalone: true,
  imports: [MatButtonModule]
})
export class NavbarComponent {
  private translationService = inject(TranslationService);
  currentLanguage = this.translationService.currentLanguage;

  toggleLanguage(): void {
    const next = this.currentLanguage() === 'en' ? 'zh' : 'en';
    this.translationService.setLanguage(next);
  }
}
```

### 4. Template Updates

All 20 HTML files: replace hardcoded text with `translate` pipe.

**Before:**
```html
<h1>Home</h1>
<button>Get Started</button>
```

**After:**
```html
<h1>{{ 'navbar.home' | translate }}</h1>
<button>{{ 'public.home.cta' | translate }}</button>
```

---

## Content Translation Map

All hardcoded text across 20 HTML files must be extracted and translated:

**Areas to cover:**
1. **Public site** (5 pages: home, services, security, contact, book-consultation)
   - Navigation labels
   - Hero sections, card titles
   - Button labels (CTA, forms)
   - Footer
   
2. **Client portal** (3 pages: dashboard, documents, messages)
   - Greeting messages
   - Table headers (documents, messages)
   - Button labels (upload, download, reply)
   - Empty states ("No documents yet")
   
3. **Admin panel** (3+ pages: clients, documents, messages)
   - Page titles
   - Table headers
   - Form labels (create, edit, delete)
   - Status badges ("Awaiting response", etc.)

**Translation process:**
1. Extract all hardcoded text from HTMLs → create master key list
2. Provide list to translator (English keys → Chinese values)
3. Add translations to JSON files
4. Update templates with pipe syntax

---

## Testing Strategy

### Unit Tests

**TranslationService**
- `init()` loads default language (EN)
- `setLanguage('zh')` updates signal and localStorage
- `getLanguage()` returns current language
- localStorage persists across session boundaries

**Translate Pipe**
- Pipe receives key, returns translated string
- Falls back to key if translation missing

### E2E Tests (Playwright)

**Language Toggle Flow**
1. Load home page (default EN)
2. Verify page text in English
3. Click language toggle button
4. Verify page text switched to Chinese
5. Reload page
6. Verify language persisted (still Chinese)
7. Toggle back to English
8. Verify text switched back

**Per-Area Coverage**
- Public site: toggle on home, services, contact pages
- Portal: toggle on dashboard, documents, messages (if logged in)
- Admin: toggle on client list, documents, messages (if admin logged in)

---

## Integration Points

### No Changes Required
- Backend API (returns English labels for dynamic content)
- Authentication flow
- Document upload/download
- Messaging system
- All existing services

### Only Changes
- Frontend templates (text → translate pipe)
- Navbar component (add toggle button)
- App configuration (add TranslateModule + APP_INITIALIZER)
- New i18n JSON files

---

## Success Criteria

✅ Language toggle button appears in navbar  
✅ Clicking button switches all page text (EN ↔ 中文)  
✅ Language preference persists after page reload  
✅ All 20 HTML files use translate pipe (no hardcoded text)  
✅ Translation keys organized consistently  
✅ E2E test passes for language switch flow  
✅ No component logic changes (only templates + service)  
✅ Default language is English  

---

## Dependencies to Install

```bash
npm install @ngx-translate/core @ngx-translate/http-loader
```

---

## Rollout Plan

1. **Install dependencies**
2. **Create TranslationService + APP_INITIALIZER**
3. **Create i18n JSON files** (en.json, zh.json per area)
4. **Add navbar toggle**
5. **Update 20 HTML templates** (hardcoded text → translate pipe)
6. **Write tests** (service, pipe, E2E)
7. **Review + commit** (single PR)

---

## Notes

- Keys follow flat dot notation for simplicity (no nested objects)
- Translations loaded at startup via HTTP (TranslateHttpLoader)
- No build-time compilation needed (unlike @angular/localize)
- Language switch is instant (no page reload)
- Zoneless change detection compatible (signal-based currentLanguage)
- Future enhancement: add more languages (Japanese, Korean) without code changes
