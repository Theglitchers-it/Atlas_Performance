-- =====================================================
-- MIGRATION: Referral Program
-- Tabelle per gestione programma referral e codici invito
-- =====================================================

-- =====================================================
-- Tabella: referral_codes
-- Codici referral generati dagli utenti
-- =====================================================

CREATE TABLE IF NOT EXISTS referral_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(20) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    tenant_id INT NOT NULL,
    type ENUM('general', 'trainer', 'client', 'promotion') DEFAULT 'general',
    referrer_reward DECIMAL(10, 2) DEFAULT 0.00,
    referee_reward DECIMAL(10, 2) DEFAULT 0.00,
    max_uses INT DEFAULT NULL,
    expires_at DATETIME DEFAULT NULL,
    status ENUM('active', 'inactive', 'expired') DEFAULT 'active',
    metadata JSON DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_referral_codes_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_referral_codes_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        ON DELETE CASCADE,

    INDEX idx_code (code),
    INDEX idx_user_status (user_id, status),
    INDEX idx_tenant_status (tenant_id, status),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Tabella: referral_conversions
-- Tracciamento conversioni (utilizzo codici referral)
-- =====================================================

CREATE TABLE IF NOT EXISTS referral_conversions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    referral_code_id INT NOT NULL,
    referrer_user_id INT NOT NULL,
    referred_user_id INT NOT NULL,
    tenant_id INT NOT NULL,
    status ENUM('pending', 'completed', 'cancelled', 'rejected') DEFAULT 'pending',
    referrer_reward_value DECIMAL(10, 2) DEFAULT 0.00,
    referee_reward_value DECIMAL(10, 2) DEFAULT 0.00,
    metadata JSON DEFAULT NULL,
    completed_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_referral_conv_code
        FOREIGN KEY (referral_code_id) REFERENCES referral_codes(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_referral_conv_referrer
        FOREIGN KEY (referrer_user_id) REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_referral_conv_referred
        FOREIGN KEY (referred_user_id) REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_referral_conv_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        ON DELETE CASCADE,

    -- Un utente può usare solo un codice referral
    UNIQUE KEY unique_referred_user (referred_user_id),

    INDEX idx_referrer_status (referrer_user_id, status),
    INDEX idx_referred_user (referred_user_id),
    INDEX idx_code_status (referral_code_id, status),
    INDEX idx_tenant_status (tenant_id, status),
    INDEX idx_created_at (created_at),
    INDEX idx_completed_at (completed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Tabella: referral_rewards
-- Tracciamento premi assegnati
-- =====================================================

CREATE TABLE IF NOT EXISTS referral_rewards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversion_id INT NOT NULL,
    user_id INT NOT NULL,
    tenant_id INT NOT NULL,
    reward_type ENUM('credit', 'discount', 'xp', 'subscription_days', 'cash') DEFAULT 'credit',
    reward_value DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status ENUM('pending', 'awarded', 'redeemed', 'expired', 'cancelled') DEFAULT 'pending',
    awarded_at DATETIME DEFAULT NULL,
    redeemed_at DATETIME DEFAULT NULL,
    expires_at DATETIME DEFAULT NULL,
    metadata JSON DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_referral_reward_conversion
        FOREIGN KEY (conversion_id) REFERENCES referral_conversions(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_referral_reward_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_referral_reward_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        ON DELETE CASCADE,

    INDEX idx_user_status (user_id, status),
    INDEX idx_conversion (conversion_id),
    INDEX idx_tenant_status (tenant_id, status),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
