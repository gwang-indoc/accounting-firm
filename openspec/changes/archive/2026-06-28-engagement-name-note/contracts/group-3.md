### Contract

- **Spec**: "WHEN an admin opens the New Engagement dialog and has not entered a name THEN the confirm button is disabled." "WHEN an admin opens the Change Status dialog for an engagement that has an existing note THEN the 'Engagement Notes' textarea is pre-filled with the current note text." "WHEN an admin edits the note in the Change Status dialog and confirms THEN the updated note is saved to the engagement." — `admin-workflow-ui` spec

- **Runtime**: `cd frontend && npx ng test --no-watch` → all tests pass including new tests for: submit disabled with blank name, note textarea pre-filled, note sent on submit, service URLs use engagement ID

- **Code**: `mat-form-field` + `matInput` for name field (never bare `<input>`). Note textarea is a native textarea with ngModel. Angular service methods building URLs switch `taxYear` → `engagement.id`. Zoneless change detection — no Zone.js. Engagement model adds `name` and `note` fields to `EngagementDto`.

- **Threshold**: 80
