CREATE TABLE message_threads (
    id                    BIGSERIAL    PRIMARY KEY,
    client_id             BIGINT       NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    subject               VARCHAR(200) NOT NULL,
    created_at            TIMESTAMP    NOT NULL DEFAULT now(),
    last_message_at       TIMESTAMP    NOT NULL DEFAULT now(),
    admin_unread_count    INT          NOT NULL DEFAULT 0,
    client_unread_count   INT          NOT NULL DEFAULT 0
);

CREATE INDEX idx_message_threads_client_last_msg
    ON message_threads (client_id, last_message_at DESC);

CREATE TABLE messages (
    id              BIGSERIAL   PRIMARY KEY,
    thread_id       BIGINT      NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
    sender_type     VARCHAR(10) NOT NULL CHECK (sender_type IN ('ADMIN','CLIENT')),
    sender_user_id  BIGINT      NOT NULL REFERENCES users(id),
    body            TEXT        NOT NULL,
    sent_at         TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_thread_sent
    ON messages (thread_id, sent_at);
