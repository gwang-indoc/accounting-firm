## ADDED Requirements

### Requirement: Client portal displays engagement name in engagement list
The client portal engagement list SHALL display the engagement name alongside the tax year and status for each engagement, so clients can identify which filing each engagement refers to.

#### Scenario: Engagement name visible in portal list
- **WHEN** an authenticated client views their engagement list in the portal
- **THEN** each engagement row shows the engagement name, tax year, and current status

#### Scenario: Multiple engagements for same year are distinguishable
- **WHEN** a client has two engagements for the same tax year (e.g., personal return and corporation)
- **THEN** both rows appear with distinct names, making them unambiguously identifiable
