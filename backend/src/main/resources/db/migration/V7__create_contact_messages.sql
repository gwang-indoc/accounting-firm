CREATE TABLE contact_messages (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(200)             NOT NULL,
    email       VARCHAR(254)             NOT NULL,
    subject     VARCHAR(200)             NOT NULL,
    message     TEXT                     NOT NULL,
    submitted_at TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    ip_address  VARCHAR(45)
);

CREATE INDEX idx_contact_messages_submitted_at ON contact_messages (submitted_at DESC);
