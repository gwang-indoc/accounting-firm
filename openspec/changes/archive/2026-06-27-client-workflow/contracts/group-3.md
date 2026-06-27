### Contract

- **Spec**: (client-engagement-workflow) "The system SHALL send an email to the client's linked user when status transitions to IN_PROCESSING, PENDING_CLIENT_REVIEW, SUBMIT_TO_CRA, or COMPLETED." | "The email language SHALL match the linked user's `language` preference (defaulting to EN if null)." | "No email is sent for transitions to START or when the client has no linked user." | "Email delivery failure SHALL NOT prevent the status transition from succeeding."
- **Runtime**: `cd backend && ./mvnw test` → email notification tests pass using a mock `JavaMailSender`; no email sent for START or unlinked clients; ZH email sent when user.language = "zh"
- **Code**: inline bilingual templates (8 strings: 4 states × 2 languages) as constants in service; catch `MailException` and log — do not propagate; check `client.userId` non-null before attempting send; use existing `JavaMailSender` bean (same infrastructure as ContactService)
- **Threshold**: 80
