-- Reference schema for MySQL 8. The application creates and updates this table automatically
-- (spring.jpa.hibernate.ddl-auto=update); run this manually only if you prefer to manage the schema yourself.

CREATE DATABASE IF NOT EXISTS currency_exchange CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE currency_exchange;

CREATE TABLE IF NOT EXISTS rate_snapshot (
    id                  BIGINT        NOT NULL AUTO_INCREMENT,
    base_currency       VARCHAR(3)    NOT NULL,           -- always the storage base (USD by default)
    target_currency     VARCHAR(3)    NOT NULL,
    rate                DECIMAL(28,12) NOT NULL,          -- units of target per 1 unit of base
    effective_date      DATE          NOT NULL,           -- provider update date (UTC)
    provider_updated_at DATETIME(6)   NOT NULL,           -- provider's own timestamp (UTC)
    retrieved_at        DATETIME(6)   NOT NULL,           -- when this app fetched it (UTC)
    source              VARCHAR(16)   NOT NULL,           -- PROVIDER (real) or DEMO (synthetic)
    PRIMARY KEY (id),
    CONSTRAINT uk_snapshot_pair_date UNIQUE (base_currency, target_currency, effective_date),
    INDEX idx_snapshot_base_date (base_currency, effective_date)
);

-- Remove synthetic demo data at any time (or set DEMO_DATA_ENABLED=false and restart):
-- DELETE FROM rate_snapshot WHERE source = 'DEMO';
