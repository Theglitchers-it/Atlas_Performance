-- Migration 009: Calendar Integration Tokens
-- Tabella per salvare i token OAuth di Google Calendar e Outlook

CREATE TABLE IF NOT EXISTS user_calendar_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    provider ENUM('google', 'outlook') NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NULL,
    token_expiry DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_provider (user_id, provider),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Colonne per event IDs nei appointments (per sync bidirezionale)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255) NULL AFTER notes;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS outlook_event_id VARCHAR(255) NULL AFTER google_event_id;

-- Colonna stripe_session_id per video_purchases
ALTER TABLE video_purchases ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255) NULL AFTER status;
