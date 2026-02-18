-- =====================================================
-- MIGRATION: Fix referral_codes missing columns
-- Aggiunge colonne mancanti se la tabella era stata
-- creata con una versione precedente dello schema
-- =====================================================

-- Aggiunge referrer_reward se mancante
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'referral_codes' AND COLUMN_NAME = 'referrer_reward');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE referral_codes ADD COLUMN referrer_reward DECIMAL(10,2) DEFAULT 0.00 AFTER type',
    'SELECT "referrer_reward already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Aggiunge referee_reward se mancante
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'referral_codes' AND COLUMN_NAME = 'referee_reward');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE referral_codes ADD COLUMN referee_reward DECIMAL(10,2) DEFAULT 0.00 AFTER referrer_reward',
    'SELECT "referee_reward already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Aggiunge current_uses se mancante
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'referral_codes' AND COLUMN_NAME = 'current_uses');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE referral_codes ADD COLUMN current_uses INT DEFAULT 0 AFTER max_uses',
    'SELECT "current_uses already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Aggiunge metadata se mancante
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'referral_codes' AND COLUMN_NAME = 'metadata');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE referral_codes ADD COLUMN metadata JSON DEFAULT NULL AFTER status',
    'SELECT "metadata already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
