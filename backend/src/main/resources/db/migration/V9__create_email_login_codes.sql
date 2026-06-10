CREATE TABLE email_login_codes (
    id           BIGSERIAL    PRIMARY KEY,
    email        VARCHAR(255) NOT NULL,
    code_hash    VARCHAR(255) NOT NULL,
    expires_at   TIMESTAMP    NOT NULL,
    attempts     INT          NOT NULL DEFAULT 0,
    consumed_at  TIMESTAMP,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_login_codes_email_created
    ON email_login_codes (email, created_at DESC);
