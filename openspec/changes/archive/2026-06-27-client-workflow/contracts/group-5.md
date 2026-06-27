### Contract

- **Spec**: (admin-workflow-ui) "The system SHALL add a 'Workflow' tab to the admin client detail view listing all engagements ordered by tax year descending." | "Each engagement SHALL be expandable to reveal its full transition history." | "The system SHALL allow an admin to open a new engagement from the Workflow tab." | "The system SHALL allow an admin to change status with an optional note via a confirmation dialog." | "Duplicate tax year rejected in UI with error message."
- **Runtime**: `cd frontend && npx ng test --no-watch` → client workflow tab component tests pass: engagement list renders, expand shows history, new engagement dialog creates entry, status transition dialog sends PATCH with note
- **Code**: workflow tab loaded lazily on first `mat-tab` activation; engagements fetched from `GET /api/admin/clients/{id}/engagements`; history fetched per engagement from `GET /api/admin/clients/{id}/engagements/{year}/history` on expand; status transition uses Angular Material dialog with optional note field before sending PATCH; duplicate detection: show inline error from 409 response
- **Threshold**: 80
