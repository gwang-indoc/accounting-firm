CREATE TABLE client_documents (
    id          BIGSERIAL    PRIMARY KEY,
    client_id   BIGINT       NOT NULL REFERENCES clients(id),
    year        SMALLINT     NOT NULL,
    filename    VARCHAR(255) NOT NULL,
    file_path   VARCHAR(500) NOT NULL,
    mime_type   VARCHAR(127),
    size_bytes  BIGINT,
    uploaded_by BIGINT       NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (client_id, year, filename)
);
