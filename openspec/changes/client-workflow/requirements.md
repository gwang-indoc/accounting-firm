---
Date: 2026-06-26
Change: client-workflow
Status: REVIEWED
---

## Goals

- Add a structured tax engagement workflow to the accounting firm app so that admins can track each client's filing progress per tax year.
- "Tax year" is defined as the year the fiscal period **ends** (e.g., a Dec 31 personal client's 2024 engagement covers Jan 1–Dec 31 2024; a March 31 corporate's 2025 engagement covers April 2024–March 2025).
- Surface the workflow in the admin portal as a dedicated table-view dashboard and as a per-client detail tab.
- Notify clients by email when their engagement reaches a key milestone state.

## Non-Goals

- Client-initiated state transitions (admin only).
- Automated state advancement (no timers or event triggers — all transitions are manual).
- Integration with a third-party workflow engine (Flowable, Camunda, etc.).
- Multi-admin assignment or task queuing per engagement.
- CRA API integration.

## Constraints

- Must follow existing Spring Boot layered architecture (Controller → Service → Repository).
- Must use Flyway migrations for all schema changes; never edit existing migrations.
- Frontend must use Angular Material components and follow `docs/ui-design-guide.md`.
- Email notifications must use the existing mail infrastructure (Spring Mail / ContactService pattern).
- No new external library dependencies for the state machine — use a custom enum pattern.
- Fiscal year end for PERSONAL clients is always December 31 and is not editable.

## Success Criteria

- Admin can create a client with a business type (PERSONAL, CORPORATE, SELF_EMPLOYED) and, for non-personal clients, a fiscal year end month and day.
- Admin can open a new engagement for any client for any tax year (manual, one per client per year).
- Admin can transition an engagement to any status from any status (bidirectional).
- Every status transition is recorded in a `client_engagement_history` table (from → to, admin user, timestamp, optional free-text note).
- The system sends an email to the client's linked user when status transitions to IN_PROCESSING, PENDING_CLIENT_REVIEW, SUBMIT_TO_CRA, or COMPLETED. Emails are bilingual (EN/ZH) based on the client's linked user's language preference.
- `/admin/workflow` displays a table of **all engagements across all years** for all clients; columns: Client Name, Business Type, Tax Year, Status, Last Updated, Last Updated By. Filterable by Status and Business Type.
- Client detail view includes a Workflow tab listing all engagements for that client across years, each with its full transition history and notes.
- Fiscal year end month/day is validated as a real calendar date (e.g. Feb 30 is rejected).
- All backend endpoints are admin-only (403 for non-admin callers).
- All new code has unit/integration test coverage following existing test patterns.

## User Stories

### US-1 — Create client with business type
As an admin, when I create or edit a client, I can select a business type (Personal, Corporate, Self-Employed). For Corporate and Self-Employed I also set the fiscal year end month and day. For Personal, Dec 31 is pre-filled and read-only.

### US-2 — Open a new engagement
As an admin, on a client's Workflow tab, I click "New Engagement", enter the tax year (e.g. 2025), and the engagement is created at status START.

### US-3 — Transition status
As an admin, on a client's Workflow tab, I can change the status of any engagement using a dropdown or action button. I can optionally add a note before confirming. The change is saved immediately, recorded in the history, and triggers an email if the new status is IN_PROCESSING, PENDING_CLIENT_REVIEW, SUBMIT_TO_CRA, or COMPLETED.

### US-4 — Workflow dashboard
As an admin, I see `/admin/workflow` in the sidebar after login. The page shows a table with columns: Client Name, Business Type, Tax Year, Status, Last Updated, Last Updated By. All engagements across all years are shown. I can filter by Status and Business Type.

### US-5 — Email notification
As a client, I receive an email in my preferred language (EN or ZH) when my engagement status changes to:
- IN_PROCESSING: "We've started working on your return" / "我们已开始处理您的报税"
- PENDING_CLIENT_REVIEW: "Please review and sign your return" / "请审阅并签署您的报税表"
- SUBMIT_TO_CRA: "Your return has been filed with CRA" / "您的报税已提交至CRA"
- COMPLETED: "Your file is complete" / "您的报税文件已完成"

### US-6 — Audit trail
As an admin, on a client's Workflow tab, I can expand any engagement to see its full transition history: each row shows the previous status, new status, who made the change, when, and any note they added.

## Open Questions

_All open questions resolved during requirements review._

## Data Model

**Additions to `clients` table (V13 migration):**
```
business_type            VARCHAR(20) NOT NULL   -- PERSONAL | CORPORATE | SELF_EMPLOYED
fiscal_year_end_month    SMALLINT NULL          -- 1–12; NULL for PERSONAL (always 12)
fiscal_year_end_day      SMALLINT NULL          -- 1–31; NULL for PERSONAL (always 31)
```

**New `client_engagements` table (V14 migration):**
```
id           BIGSERIAL PK
client_id    BIGINT NOT NULL FK → clients (CASCADE DELETE)
tax_year     SMALLINT NOT NULL              -- year the fiscal period ends
status       VARCHAR(30) NOT NULL           -- START | IN_PROCESSING | PENDING_CLIENT_REVIEW
                                            -- SUBMIT_TO_CRA | COMPLETED
updated_by   BIGINT NOT NULL FK → users     -- last admin to change status
created_at   TIMESTAMPTZ NOT NULL
updated_at   TIMESTAMPTZ NOT NULL
UNIQUE(client_id, tax_year)
```

**New `client_engagement_history` table (V14 migration):**
```
id              BIGSERIAL PK
engagement_id   BIGINT NOT NULL FK → client_engagements (CASCADE DELETE)
from_status     VARCHAR(30) NULL            -- NULL for the initial START entry
to_status       VARCHAR(30) NOT NULL
changed_by      BIGINT NOT NULL FK → users
changed_at      TIMESTAMPTZ NOT NULL
note            TEXT NULL                   -- optional admin note
```

## Referenced Capabilities

- Existing email infrastructure: `contact/service/ContactService.java`, `contact/config/MailProperties.java`
- Client entity: `client/domain/Client.java`, `ClientRepository.java`
- Admin guard: `core/guards/admin.guard.ts`, `SecurityConfig.java`
- Flyway migration path: `backend/src/main/resources/db/migration/`
- Latest migration: `V12__add_client_admin_ownership.sql`
- UI design guide: `docs/ui-design-guide.md`
