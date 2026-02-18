-- =====================================================
-- MIGRATION: API Keys
-- Tabella per gestione API keys per integrazione programmatica
-- =====================================================

CREATE TABLE IF NOT EXISTS api_keys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    api_key VARCHAR(100) UNIQUE NOT NULL,
    api_secret_hash VARCHAR(255) NOT NULL,
    permissions JSON DEFAULT NULL,
    rate_limit INT DEFAULT 1000,
    last_used_at DATETIME DEFAULT NULL,
    expires_at DATETIME DEFAULT NULL,
    status ENUM('active', 'revoked', 'expired') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_api_keys_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        ON DELETE CASCADE,

    INDEX idx_api_key (api_key),
    INDEX idx_tenant_status (tenant_id, status),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- MIGRATION: API Logs
-- Tabella per tracciare l'utilizzo delle API keys
-- =====================================================

CREATE TABLE IF NOT EXISTS api_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    api_key_id INT NOT NULL,
    tenant_id INT NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INT NOT NULL,
    response_time_ms INT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    request_body JSON DEFAULT NULL,
    response_body JSON DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_api_logs_api_key
        FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_api_logs_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        ON DELETE CASCADE,

    INDEX idx_api_key_created (api_key_id, created_at),
    INDEX idx_tenant_created (tenant_id, created_at),
    INDEX idx_status_code (status_code),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Partizionamento opzionale per performance (per ambienti con alto volume)
-- ALTER TABLE api_logs
-- PARTITION BY RANGE (TO_DAYS(created_at)) (
--     PARTITION p_current VALUES LESS THAN (TO_DAYS(CURRENT_DATE)),
--     PARTITION p_future VALUES LESS THAN MAXVALUE
-- );
