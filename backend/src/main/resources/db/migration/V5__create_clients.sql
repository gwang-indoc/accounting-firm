CREATE TABLE clients (
    id         BIGSERIAL    PRIMARY KEY,
    user_id    BIGINT       REFERENCES users(id),
    name       VARCHAR(255) NOT NULL,
    email      VARCHAR(255),
    phone      VARCHAR(50),
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);
