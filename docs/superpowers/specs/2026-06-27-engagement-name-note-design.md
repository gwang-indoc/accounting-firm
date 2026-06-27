---
Date: 2026-06-27
Change: engagement-name-note
Status: APPROVED
---

## Overview

Allow each client to have multiple engagements per tax year (one per business or taxpayer). Each engagement gets a mandatory `name` field (entered by the admin at creation) and a mutable `note` field (updated via "Change Status"). Engagement routes switch from `{taxYear}` to `{id}` as the path identifier.

---

## 1. Data Model

**Migration: `V15__add_name_note_to_engagements.sql`**

```sql
ALTER TABLE client_engagements DROP CONSTRAINT uq_client_engagements_client_tax_year;
ALTER TABLE client_engagements ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE client_engagements ADD COLUMN note TEXT;
ALTER TABLE client_engagements ALTER COLUMN name DROP DEFAULT;
ALTER TABLE client_engagements ADD CONSTRAINT uq_client_engagements_client_year_name
    UNIQUE (client_id, tax_year, name);
```

**`ClientEngagement` entity additions:**
- `name` — `String`, `@Column(nullable = false)`
- `note` — `String`, `@Column(columnDefinition = "TEXT")`, nullable

No changes to `ClientEngagementHistory`.

---

## 2. API

### Changed routes (taxYear → id)

| Method | Old path | New path |
|--------|----------|----------|
| GET | `/api/admin/clients/{clientId}/engagements/{taxYear}/history` | `/api/admin/clients/{clientId}/engagements/{id}/history` |
| PATCH | `/api/admin/clients/{clientId}/engagements/{taxYear}/status` | `/api/admin/clients/{clientId}/engagements/{id}/status` |

### Request DTO changes

**`CreateEngagementRequest`** — adds required `name`:
```java
public record CreateEngagementRequest(
    @NotNull Short taxYear,
    @NotBlank String name
) {}
```

**`TransitionStatusRequest`** — unchanged structurally; `note` now also writes to `ClientEngagement.note`:
```java
public record TransitionStatusRequest(
    @NotNull EngagementStatus status,
    String note
) {}
```

### Response DTO changes

**`EngagementDto`** — adds `name` and `note` fields so all consumers (admin and client portal) can display them.

---

## 3. Backend Service

**`ClientEngagementService.createEngagement(clientId, taxYear, name)`**
- Validates `name` is non-blank; throws `400` if blank
- Sets `name` on the new `ClientEngagement` entity

**`ClientEngagementService.transitionStatus(clientId, engagementId, request)`**
- Looks up engagement by `engagementId` (Long) instead of `taxYear`
- Ownership check: verifies `engagement.getClientId()` belongs to the authenticated admin
- Writes `request.note()` to `ClientEngagement.note` (replaces existing value)
- Creates `ClientEngagementHistory` entry as before; history entry's `note` field also receives `request.note()`

**Repository:**
- Single-engagement lookups switch from `findByClientIdAndTaxYear()` to `findById()` + ownership verification
- `findByClientIdAndTaxYear()` is retained for any remaining list/existence checks if needed

---

## 4. Frontend

### "New Engagement" dialog (`admin-new-engagement-dialog.component`)
- Add `name` input: `<mat-form-field appearance="outline"><input matInput formControlName="name" /></mat-form-field>`
- `name` control: `[Validators.required]` — submit button disabled while invalid
- Service call updated: passes `{ taxYear, name }`

### "Change Status" dialog (`admin-transition-dialog.component`)
- Add `note` textarea pre-filled with `engagement.note` (current value from the DTO)
- Label: "Engagement Notes" to distinguish from any per-transition context
- On submit: sends `{ status, note }` — note can be null/empty to clear it
- Service call updated: uses `engagementId` in the URL (not `taxYear`)

### Client portal engagement list
- Add engagement `name` column/field alongside tax year and status
- Data sourced from the updated `EngagementDto`

### Service layer
- All Angular service methods that currently build URLs with `taxYear` are updated to use `engagement.id`

---

## 5. Testing

**Backend:**
- `ClientEngagementServiceTest` — new tests: create with valid name, create with blank name (expect 400), transition updates `ClientEngagement.note`
- `ClientEngagementControllerTest` — new tests: POST with missing name (400), PATCH uses `{id}` path
- Existing tests updated: `findByClientIdAndTaxYear` lookups replaced with `findById` where applicable

**Frontend:**
- `AdminNewEngagementDialogComponent` spec — submit disabled with blank name, enabled with valid name
- `AdminTransitionDialogComponent` spec — note field pre-filled with engagement note, sent on submit

**E2E:**
- Playwright test: create two engagements for the same client in the same tax year with different names; verify both appear in the list
