# Bilingual i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add runtime English/Chinese language switching to all 20 HTML pages across public site, client portal, and admin panel.

**Architecture:** Install @ngx-translate/core. Create TranslationService managing language state via signal + localStorage. Add navbar toggle button. Replace hardcoded text in 20 HTML templates with translate pipe. Organize translations in JSON files per feature area (public/portal/admin).

**Tech Stack:** @ngx-translate/core, @ngx-translate/http-loader, Angular 21 signals, localStorage, Playwright E2E

---

## File Structure

**New Files:**
- `src/app/core/services/translation.service.ts` — Language management service
- `src/app/core/services/translation.service.spec.ts` — Service unit tests
- `src/assets/i18n/en.json` — Shared English labels (nav, buttons, footer)
- `src/assets/i18n/zh.json` — Shared Chinese labels
- `src/assets/i18n/public/en.json` — Public site English
- `src/assets/i18n/public/zh.json` — Public site Chinese
- `src/assets/i18n/portal/en.json` — Portal English
- `src/assets/i18n/portal/zh.json` — Portal Chinese
- `src/assets/i18n/admin/en.json` — Admin English
- `src/assets/i18n/admin/zh.json` — Admin Chinese
- `e2e/language-toggle.spec.ts` — E2E test for language switching

**Modified Files:**
- `src/app/app.config.ts` — Add TranslateModule + APP_INITIALIZER
- `src/app/shared/navbar/navbar.component.ts` — Add language toggle
- `src/app/shared/navbar/navbar.component.html` — Add toggle button
- 20 HTML templates — Replace text with `{{ 'key' | translate }}`

---

## Tasks

### Task 1: Install Dependencies

**Files:** `package.json`

- [ ] **Step 1: Add @ngx-translate packages**

```bash
cd frontend && npm install @ngx-translate/core @ngx-translate/http-loader
```

Expected output: `added X packages`

- [ ] **Step 2: Verify installation**

```bash
grep "@ngx-translate" package.json
```

Expected: Both packages listed in dependencies

- [ ] **Step 3: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm && git add frontend/package.json frontend/package-lock.json && git commit -m "deps: add @ngx-translate/core and http-loader"
```

---

### Task 2: Create TranslationService

**Files:**
- Create: `frontend/src/app/core/services/translation.service.ts`
- Create: `frontend/src/app/core/services/translation.service.spec.ts`

- [ ] **Step 1: Write failing test**

```typescript
// File: frontend/src/app/core/services/translation.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslationService } from './translation.service';

describe('TranslationService', () => {
  let service: TranslationService;
  let translate: TranslateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [TranslationService, TranslateService]
    });
    service = TestBed.inject(TranslationService);
    translate = TestBed.inject(TranslateService);
  });

  it('should initialize with default language EN', (done) => {
    service.init().then(() => {
      expect(service.getLanguage()).toBe('en');
      done();
    });
  });

  it('should restore language from localStorage if saved', (done) => {
    localStorage.setItem('language', 'zh');
    service.init().then(() => {
      expect(service.getLanguage()).toBe('zh');
      localStorage.removeItem('language');
      done();
    });
  });

  it('should update signal when setLanguage called', () => {
    service.setLanguage('zh');
    expect(service.currentLanguage()).toBe('zh');
  });

  it('should save language to localStorage when setLanguage called', () => {
    service.setLanguage('zh');
    expect(localStorage.getItem('language')).toBe('zh');
  });

  it('should call translate.use() when setLanguage called', () => {
    spyOn(translate, 'use').and.returnValue({ toPromise: () => Promise.resolve() } as any);
    service.setLanguage('zh');
    expect(translate.use).toHaveBeenCalledWith('zh');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
cd frontend && npx ng test --include='**/translation.service.spec.ts' --no-watch
```

Expected: Tests fail with "TranslationService" not found

- [ ] **Step 3: Write TranslationService**

```typescript
// File: frontend/src/app/core/services/translation.service.ts
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
```

- [ ] **Step 4: Run test to verify pass**

```bash
cd frontend && npx ng test --include='**/translation.service.spec.ts' --no-watch
```

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm && git add frontend/src/app/core/services/translation.service.ts frontend/src/app/core/services/translation.service.spec.ts && git commit -m "feat: add TranslationService with language persistence"
```

---

### Task 3: Update App Configuration

**Files:** Modify `frontend/src/app/app.config.ts`

- [ ] **Step 1: Add imports and TranslateModule setup**

Replace the entire `app.config.ts` with:

```typescript
// File: frontend/src/app/app.config.ts
import { ApplicationConfig, APP_INITIALIZER, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';
import { appRoutes } from './app.routes';
import { TranslationService } from './core/services/translation.service';
import { AuthService } from './core/services/auth.service';

export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(appRoutes),
    provideAnimations(),
    provideHttpClient(),
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'en',
        loader: {
          provide: TranslateLoader,
          useFactory: createTranslateLoader,
          deps: [HttpClient]
        }
      })
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: (ts: TranslationService, auth: AuthService) => () => {
        return Promise.all([ts.init(), auth.loadCurrentUser()]);
      },
      deps: [TranslationService, AuthService],
      multi: true
    }
  ]
};
```

- [ ] **Step 2: Run build to verify no errors**

```bash
cd frontend && npm run build 2>&1 | tail -20
```

Expected: Build succeeds without TranslateModule errors

- [ ] **Step 3: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm && git add frontend/src/app/app.config.ts && git commit -m "config: add TranslateModule and APP_INITIALIZER for i18n"
```

---

## Checkpoint 1: Tasks 1-3 Complete

Ready to proceed with navbar toggle (Task 4)?
