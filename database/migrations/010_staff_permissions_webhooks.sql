-- Migration 010: Staff Permissions & Webhooks

-- Tabella permessi granulari per staff
CREATE TABLE IF NOT EXISTS staff_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    user_id INT NOT NULL,
    can_manage_clients BOOLEAN DEFAULT TRUE,
    can_manage_workouts BOOLEAN DEFAULT TRUE,
    can_manage_programs BOOLEAN DEFAULT TRUE,
    can_manage_nutrition BOOLEAN DEFAULT TRUE,
    can_manage_payments BOOLEAN DEFAULT FALSE,
    can_manage_bookings BOOLEAN DEFAULT TRUE,
    can_manage_classes BOOLEAN DEFAULT TRUE,
    can_manage_videos BOOLEAN DEFAULT FALSE,
    can_view_analytics BOOLEAN DEFAULT FALSE,
    can_manage_community BOOLEAN DEFAULT TRUE,
    can_use_ai BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_tenant_user (tenant_id, user_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabella webhook subscriptions per API pubblica
CREATE TABLE IF NOT EXISTS webhooks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    url VARCHAR(500) NOT NULL,
    events JSON NOT NULL COMMENT 'Array di eventi: ["client.created", "payment.completed", ...]',
    secret VARCHAR(255) NOT NULL COMMENT 'Secret per firma HMAC',
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at DATETIME NULL,
    failure_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Log delle delivery webhook
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    webhook_id INT NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSON NOT NULL,
    response_status INT NULL,
    response_body TEXT NULL,
    success BOOLEAN DEFAULT FALSE,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE,
    INDEX idx_webhook_event (webhook_id, event_type),
    INDEX idx_attempted (attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
