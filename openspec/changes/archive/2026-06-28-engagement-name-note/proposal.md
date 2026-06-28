---
Date: 2026-06-27
Change: engagement-name-note
Requirements: requirements.md
---

## Why

A client can have more than one business — a personal tax return and a corporation, for example — but the system currently enforces one engagement per client per tax year, making it impossible to track both filings independently. This change removes that constraint and gives each engagement a name (taxpayer or business name) so admin and client can tell them apart.

## What Changes

- Drop the `(client_id, tax_year)` unique constraint; replace with `(client_id, tax_year, name)` — **BREAKING** (migration required)
- Add `name VARCHAR(255) NOT NULL` to `client_engagements` (mandatory at creation)
- Add `note TEXT` (nullable) to `client_engagements` (mutable, updated via Change Status)
- **BREAKING**: All engagement routes using `{taxYear}` as the path identifier switch to `{id}` (Long engagement ID):
  - `GET  /api/admin/clients/{clientId}/engagements/{taxYear}/history` → `…/{id}/history`
  - `PATCH /api/admin/clients/{clientId}/engagements/{taxYear}/status` → `…/{id}/status`
- `POST /api/admin/clients/{clientId}/engagements` now requires `name` in the request body
- `PATCH …/{id}/status` now also persists `note` to `ClientEngagement.note` (replacing the prior value) in addition to writing it to the history entry
- "New Engagement" dialog gains a mandatory name field
- "Change Status" dialog gains a note field pre-filled with the current engagement note
- Client portal engagement list shows engagement name

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `client-engagement-workflow` — multiple engagements per client/year; `name` and `note` fields; route parameter change from `{taxYear}` to `{id}`
- `admin-workflow-ui` — "New Engagement" dialog name field; "Change Status" dialog note field
- `client-portal-ui` — engagement list shows engagement name

## Impact

- `backend/src/main/resources/db/migration/V15__add_name_note_to_engagements.sql` (new)
- `backend/.../client/domain/ClientEngagement.java`
- `backend/.../client/dto/CreateEngagementRequest.java`, `EngagementDto.java`
- `backend/.../client/controller/ClientEngagementController.java`
- `backend/.../client/service/ClientEngagementService.java`
- `backend/.../client/domain/ClientEngagementRepository.java`
- `frontend/.../admin/client-workflow/admin-new-engagement-dialog.component.*`
- `frontend/.../admin/client-workflow/admin-transition-dialog.component.*`
- `frontend/.../portal/` (engagement list view)
- `frontend/.../core/services/engagement.service.ts` (URL param change)

## Out of Scope

- Auto-populating name from existing client data (deferred)
- Audit trail for note edits (note history is not tracked; only the current note is stored)
- Changes to email notification content or triggers
- Any changes to `BusinessType` enum values
