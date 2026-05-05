# Navbar Design Spec — GWH Accounting

## Summary

Replace the minimal inline navbar in `HomeComponent` with a full `NavbarComponent` matching the dark navy reference design. The existing `ClientPortalLoginComponent` dropdown is reused unchanged as the "Client Portal" nav link trigger.

## Visual Design

**Selected:** Dark navy variant (Option A).

```
[ 税 | GWH Accounting                ]   [ Services  Client Portal  Security  Contact ]   [ EN | 中文 ]  [ Book Consultation ]
      Secure Tax & Accounting Portal
```

- Background: `#0f172a` (dark navy), fixed at top, full width
- Height: 64px
- Logo icon: 40×40px dark rounded square (`#1e293b` bg, `#334155` border, `border-radius: 10px`) containing "税"
- Company name: white, 700 weight, 15px
- Tagline: `#38bdf8` (sky blue), 11px, 500 weight — "Secure Tax & Accounting Portal"
- Nav links: `#cbd5e1`, 14px, 500 weight; active/hover: white
- Language toggle: pill shape, active pill white on `#1e293b` background
- Book Consultation: white button, `#0f172a` text, `border-radius: 6px`, 700 weight

## Architecture

### New component: `NavbarComponent`

- **Location:** `src/app/shared/navbar/navbar.component.ts` (+ `.html`, `.css`)
- **Selector:** `<app-navbar />`
- **Standalone:** yes
- **Imports:** `ClientPortalLoginComponent`, `RouterLink`
- **State:**
  - `lang = signal<'en' | 'zh'>('en')` — language toggle (UI state only, no translation in this change)
  - `menuOpen = signal<boolean>(false)` — mobile hamburger toggle

### Modified: `HomeComponent`

- Remove inline `<nav>` and its CSS
- Import and render `<app-navbar />`
- Add `id` anchors to existing sections: `id="services"`, `id="security"`
- Add new `<section id="security">` placeholder

### New route: `/contact`

- **Component:** `ContactComponent` at `src/app/features/contact/contact.component.ts`
- **Content:** Heading "Contact Us" + "Coming soon" placeholder
- **Lazy-loaded** in `app.routes.ts`

## Nav Link Behaviour

| Link | Action |
|---|---|
| Services | Smooth-scroll to `#services` on home page |
| Client Portal | Renders `<app-client-portal-login />` inline — clicking opens the existing Google OAuth2 dropdown |
| Security | Smooth-scroll to `#security` on home page |
| Contact | Navigates to `/contact` route |
| Book Consultation | Navigates to `/contact` route |

## Language Toggle

`lang` signal stored in `NavbarComponent`. Clicking "中文" sets `lang()` to `'zh'`, clicking "EN" sets it to `'en'`. No content translation in this change — wired for future i18n integration.

## Responsive Behaviour

- ≥ 768px: full horizontal layout as shown
- < 768px: nav links and right actions collapse; hamburger icon appears on the right; clicking opens a vertical drawer below the navbar

## Out of Scope

- Actual i18n / content translation
- Contact form implementation
- Logo image file (CSS-rendered "税" icon used instead)
- Active route highlighting (deferred)
