-- =====================================================
-- PT SAAS - SCHEMA COMPLETO DATABASE
-- MySQL 8.0+
-- =====================================================
-- Ordine di creazione: rispetta le dipendenze FK
-- Eseguire questo file per creare il database da zero
-- =====================================================

CREATE DATABASE IF NOT EXISTS pt_saas_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pt_saas_db;

-- =====================================================
-- TIER 1: Tabelle base (nessuna FK)
-- =====================================================

-- 1. Tenants (Multi-tenancy)
CREATE TABLE IF NOT EXISTS tenants (
    id CHAR(36) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    owner_email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) DEFAULT NULL,
    subscription_plan ENUM('free', 'starter', 'professional', 'enterprise') DEFAULT 'free',
    subscription_status ENUM('trial', 'active', 'suspended', 'cancelled') DEFAULT 'trial',
    trial_ends_at DATETIME DEFAULT NULL,
    max_clients INT DEFAULT 5,
    status ENUM('active', 'suspended', 'cancelled') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_tenants_email (owner_email),
    INDEX idx_status (status),
    INDEX idx_subscription (subscription_plan, subscription_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Gruppi Muscolari (riferimento esercizi)
CREATE TABLE IF NOT EXISTS muscle_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_it VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    UNIQUE KEY uq_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Mesocicli (periodizzazione)
CREATE TABLE IF NOT EXISTS mesocycles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    focus VARCHAR(100) DEFAULT NULL,
    periodization_type VARCHAR(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Template Notifiche
CREATE TABLE IF NOT EXISTS notification_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_key VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('reminder', 'achievement', 'info', 'warning') DEFAULT 'info',
    action_url VARCHAR(500) DEFAULT NULL,
    priority ENUM('low', 'normal', 'high') DEFAULT 'normal',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_template_key (template_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TIER 2: FK su Tier 1 (tenants)
-- =====================================================

-- 5. Utenti (autenticazione e ruoli)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) DEFAULT NULL,
    oauth_provider VARCHAR(20) DEFAULT NULL,
    oauth_provider_id VARCHAR(255) DEFAULT NULL,
    role ENUM('super_admin', 'tenant_owner', 'staff', 'client') NOT NULL DEFAULT 'client',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50) DEFAULT NULL,
    avatar_url VARCHAR(500) DEFAULT NULL,
    status ENUM('active', 'inactive', 'banned') NOT NULL DEFAULT 'active',
    email_verified_at DATETIME DEFAULT NULL,
    last_login_at DATETIME DEFAULT NULL,
    preferences JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_tenant_email (tenant_id, email),
    CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_users_role (role),
    INDEX idx_email (email),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Esercizi (libreria)
CREATE TABLE IF NOT EXISTS exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) DEFAULT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    instructions TEXT DEFAULT NULL,
    video_url VARCHAR(500) DEFAULT NULL,
    image_url VARCHAR(500) DEFAULT NULL,
    category ENUM('strength', 'cardio', 'flexibility', 'plyometric') DEFAULT 'strength',
    equipment JSON DEFAULT NULL,
    difficulty ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'intermediate',
    is_compound TINYINT(1) DEFAULT 0,
    is_custom TINYINT(1) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_exercises_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_active (tenant_id, is_active),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Achievement (definizioni badge)
CREATE TABLE IF NOT EXISTS achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) DEFAULT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    icon_url VARCHAR(500) DEFAULT NULL,
    category VARCHAR(100) DEFAULT NULL,
    rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') DEFAULT 'common',
    xp_reward INT DEFAULT 0,
    requirement_type VARCHAR(100) DEFAULT NULL,
    requirement_value INT DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_achievements_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_active (tenant_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Locations (sedi palestra)
CREATE TABLE IF NOT EXISTS locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) DEFAULT NULL,
    city VARCHAR(100) DEFAULT NULL,
    postal_code VARCHAR(10) DEFAULT NULL,
    province VARCHAR(100) DEFAULT NULL,
    country VARCHAR(100) DEFAULT 'Italia',
    phone VARCHAR(20) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    is_online TINYINT(1) DEFAULT 0,
    capacity INT DEFAULT NULL,
    opening_hours JSON DEFAULT NULL,
    amenities JSON DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_locations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_status (tenant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Fatturazione piattaforma (invoices per tenant)
CREATE TABLE IF NOT EXISTS platform_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    period_start DATE DEFAULT NULL,
    period_end DATE DEFAULT NULL,
    plan_name VARCHAR(100) DEFAULT NULL,
    client_count INT DEFAULT 0,
    stripe_invoice_id VARCHAR(255) DEFAULT NULL,
    status ENUM('draft', 'open', 'paid', 'void', 'uncollectible') DEFAULT 'draft',
    issued_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_platform_invoices_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_status (tenant_id, status),
    INDEX idx_issued (issued_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TIER 3: FK su users
-- =====================================================

-- 10. Refresh Tokens (JWT)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(500) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_token (token(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Clienti (profili)
CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    user_id INT DEFAULT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    date_of_birth DATE DEFAULT NULL,
    gender ENUM('male', 'female', 'other') DEFAULT NULL,
    height_cm DECIMAL(5,2) DEFAULT NULL,
    initial_weight_kg DECIMAL(6,2) DEFAULT NULL,
    current_weight_kg DECIMAL(6,2) DEFAULT NULL,
    fitness_level ENUM('beginner', 'intermediate', 'advanced', 'elite') DEFAULT 'beginner',
    primary_goal VARCHAR(100) DEFAULT NULL,
    secondary_goals JSON DEFAULT NULL,
    medical_notes TEXT DEFAULT NULL,
    dietary_restrictions JSON DEFAULT NULL,
    emergency_contact_name VARCHAR(100) DEFAULT NULL,
    emergency_contact_phone VARCHAR(20) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    training_location ENUM('gym', 'home', 'hybrid', 'outdoor') DEFAULT 'hybrid',
    assigned_to INT DEFAULT NULL,
    status ENUM('active', 'inactive', 'cancelled') DEFAULT 'active',
    xp_points INT DEFAULT 0,
    level INT DEFAULT 1,
    streak_days INT DEFAULT 0,
    last_workout_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_clients_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_clients_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_clients_assigned FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tenant_status (tenant_id, status),
    INDEX idx_assigned (assigned_to),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Achievement Titles (titoli basati su esercizi)
CREATE TABLE IF NOT EXISTS achievement_titles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) DEFAULT NULL,
    title_name VARCHAR(255) NOT NULL,
    title_description TEXT DEFAULT NULL,
    category VARCHAR(100) DEFAULT NULL,
    exercise_id INT DEFAULT NULL,
    metric_type VARCHAR(50) DEFAULT NULL,
    threshold_value DECIMAL(10,2) DEFAULT NULL,
    rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') DEFAULT 'common',
    sort_order INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_achievement_titles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_achievement_titles_exercise FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE SET NULL,
    INDEX idx_tenant_active (tenant_id, is_active),
    INDEX idx_category (category),
    INDEX idx_exercise (exercise_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Notifiche (in-app)
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    user_id INT NOT NULL,
    type VARCHAR(50) DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500) DEFAULT NULL,
    metadata JSON DEFAULT NULL,
    priority ENUM('low', 'normal', 'high') DEFAULT 'normal',
    is_read TINYINT(1) DEFAULT 0,
    read_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, is_read, created_at),
    INDEX idx_tenant_created (tenant_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Push Device Tokens
CREATE TABLE IF NOT EXISTS push_device_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    user_id INT NOT NULL,
    token TEXT NOT NULL,
    platform ENUM('web', 'android', 'ios') DEFAULT 'web',
    device_info JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_push_tokens_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_push_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_tenant_user (tenant_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Preferenze Notifiche
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id INT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    email_enabled TINYINT(1) DEFAULT 1,
    push_enabled TINYINT(1) DEFAULT 1,
    in_app_enabled TINYINT(1) DEFAULT 1,
    workout_reminders TINYINT(1) DEFAULT 1,
    checkin_reminders TINYINT(1) DEFAULT 1,
    achievement_notifications TINYINT(1) DEFAULT 1,
    chat_notifications TINYINT(1) DEFAULT 1,
    marketing_emails TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_prefs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_prefs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Slot Disponibilità Trainer
CREATE TABLE IF NOT EXISTS availability_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    user_id INT NOT NULL,
    day_of_week INT NOT NULL COMMENT '0=Dom, 1=Lun, ... 6=Sab',
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_min INT DEFAULT 60,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_availability_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_availability_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_tenant_user (tenant_id, user_id),
    INDEX idx_day_active (day_of_week, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Conversazioni Chat
CREATE TABLE IF NOT EXISTS conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    type ENUM('direct', 'group') DEFAULT 'direct',
    name VARCHAR(255) DEFAULT NULL,
    last_message_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_conversations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_last_msg (tenant_id, last_message_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. AI Interaction Logs
CREATE TABLE IF NOT EXISTS ai_interaction_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    user_id INT NOT NULL,
    interaction_type VARCHAR(100) DEFAULT NULL,
    prompt_summary TEXT DEFAULT NULL,
    response_summary TEXT DEFAULT NULL,
    tokens_used INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_logs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_tenant_created (tenant_id, created_at),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    user_id INT DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) DEFAULT NULL,
    entity_id INT DEFAULT NULL,
    old_values JSON DEFAULT NULL,
    new_values JSON DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_logs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tenant_created (tenant_id, created_at),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Calendar Tokens (OAuth Google/Outlook)
CREATE TABLE IF NOT EXISTS user_calendar_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    provider ENUM('google', 'outlook') NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT DEFAULT NULL,
    token_expiry DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_provider (user_id, provider),
    CONSTRAINT fk_calendar_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TIER 4: FK su clients, exercises, users
-- =====================================================

-- 21. Esercizio - Gruppi Muscolari (many-to-many)
CREATE TABLE IF NOT EXISTS exercise_muscle_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exercise_id INT NOT NULL,
    muscle_group_id INT NOT NULL,
    is_primary TINYINT(1) DEFAULT 0,
    activation_percentage INT DEFAULT NULL,
    CONSTRAINT fk_emg_exercise FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
    CONSTRAINT fk_emg_muscle FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups(id) ON DELETE CASCADE,
    UNIQUE KEY uq_exercise_muscle (exercise_id, muscle_group_id),
    INDEX idx_muscle_group (muscle_group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. Obiettivi Cliente
CREATE TABLE IF NOT EXISTS client_goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    client_id INT NOT NULL,
    goal_type VARCHAR(100) DEFAULT NULL,
    target_value DECIMAL(10,2) DEFAULT NULL,
    current_value DECIMAL(10,2) DEFAULT NULL,
    unit VARCHAR(50) DEFAULT NULL,
    deadline DATE DEFAULT NULL,
    priority INT DEFAULT 1,
    notes TEXT DEFAULT NULL,
    status ENUM('active', 'achieved', 'abandoned') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_goals_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_goals_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_tenant_client (tenant_id, client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. Infortuni Cliente
CREATE TABLE IF NOT EXISTS injuries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    client_id INT NOT NULL,
    body_part VARCHAR(100) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    severity ENUM('mild', 'moderate', 'severe') DEFAULT 'mild',
    injury_date DATE DEFAULT NULL,
    restrictions JSON DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    status ENUM('active', 'recovering', 'recovered') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_injuries_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_injuries_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_tenant_client (tenant_id, client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. Transazioni Punti XP
CREATE TABLE IF NOT EXISTS points_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    client_id INT NOT NULL,
    points INT NOT NULL,
    transaction_type VARCHAR(50) DEFAULT NULL,
    reference_type VARCHAR(50) DEFAULT NULL,
    reference_id INT DEFAULT NULL,
    description TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_points_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_points_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_tenant_client (tenant_id, client_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. Titoli Sbloccati dai Clienti
CREATE TABLE IF NOT EXISTS client_titles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    client_id INT NOT NULL,
    title_id INT NOT NULL,
    unlocked_at DATETIME DEFAULT NULL,
    unlocked_value DECIMAL(10,2) DEFAULT NULL,
    is_displayed TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ct_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_ct_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    CONSTRAINT fk_ct_title FOREIGN KEY (title_id) REFERENCES achievement_titles(id) ON DELETE CASCADE,
    UNIQUE KEY uq_client_title (client_id, title_id),
    INDEX idx_tenant_client (tenant_id, client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. Achievement Sbloccati dagli Utenti
CREATE TABLE IF NOT EXISTS user_achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    achievement_id INT NOT NULL,
    progress_value INT DEFAULT 0,
    unlocked_at DATETIME DEFAULT NULL,
    is_notified TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ua_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ua_achievement FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_achievement (user_id, achievement_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 27. Workout Templates
CREATE TABLE IF NOT EXISTS workout_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    category VARCHAR(100) DEFAULT NULL,
    difficulty ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'intermediate',
    estimated_duration_min INT DEFAULT NULL,
    target_muscles JSON DEFAULT NULL,
    is_template TINYINT(1) DEFAULT 1,
    is_active TINYINT(1) DEFAULT 1,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_wt_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_wt_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tenant_active (tenant_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 28. Body Measurements (peso, grasso, massa)
CREATE TABLE IF NOT EXISTS body_measurements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    client_id INT NOT NULL,
    measurement_date DATE NOT NULL,
    weight_kg DECIMAL(6,2) DEFAULT NULL,
    body_fat_percentage DECIMAL(5,2) DEFAULT NULL,
    muscle_mass_kg DECIMAL(6,2) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_body_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_body_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_tenant_client_date (tenant_id, client_id, measurement_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 29. Circonferenze
CREATE TABLE IF NOT EXISTS circumference_measurements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    client_id INT NOT NULL,
    measurement_date DATE NOT NULL,
    waist_cm DECIMAL(6,2) DEFAULT NULL,
    hips_cm DECIMAL(6,2) DEFAULT NULL,
    biceps_cm DECIMAL(6,2) DEFAULT NULL,
    biceps_flexed_cm DECIMAL(6,2) DEFAULT NULL,
    shoulders_cm DECIMAL(6,2) DEFAULT NULL,
    chest_cm DECIMAL(6,2) DEFAULT NULL,
    thigh_upper_cm DECIMAL(6,2) DEFAULT NULL,
    thigh_lower_cm DECIMAL(6,2) DEFAULT NULL,
    glutes_cm DECIMAL(6,2) DEFAULT NULL,
    waist_hip_ratio DECIMAL(5,2) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_circ_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_circ_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_tenant_client_date (tenant_id, client_id, measurement_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 30. Plicometria (Skinfolds)
CREATE TABLE IF NOT EXISTS skinfold_measurements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    client_id INT NOT NULL,
    measurement_date DATE NOT NULL,
    chest_mm DECIMAL(5,2) DEFAULT NULL,
    subscapular_mm DECIMAL(5,2) DEFAULT NULL,
    suprailiac_mm DECIMAL(5,2) DEFAULT NULL,
    abdominal_mm DECIMAL(5,2) DEFAULT NULL,
    quadriceps_mm DECIMAL(5,2) DEFAULT NULL,
    biceps_mm DECIMAL(5,2) DEFAULT NULL,
    triceps_mm DECIMAL(5,2) DEFAULT NULL,
    cheek_mm DECIMAL(5,2) DEFAULT NULL,
    calf_mm DECIMAL(5,2) DEFAULT NULL,
    sum_total_mm DECIMAL(6,2) DEFAULT NULL,
    body_fat_percentage DECIMAL(5,2) DEFAULT NULL,
    calculation_method VARCHAR(100) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_skin_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_skin_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_tenant_client_date (tenant_id, client_id, measurement_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 31. BIA (Bioimpedenza)
CREATE TABLE IF NOT EXISTS bia_measurements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    client_id INT NOT NULL,
    measurement_date DATE NOT NULL,
    lean_mass_kg DECIMAL(6,2) DEFAULT NULL,
    lean_mass_pct DECIMAL(5,2) DEFAULT NULL,
    fat_mass_kg DECIMAL(6,2) DEFAULT NULL,
    fat_mass_pct DECIMAL(5,2) DEFAULT NULL,
    total_body_water_l DECIMAL(6,2) DEFAULT NULL,
    total_body_water_pct DECIMAL(5,2) DEFAULT NULL,
    muscle_mass_kg DECIMAL(6,2) DEFAULT NULL,
    basal_metabolic_rate INT DEFAULT NULL,
    visceral_fat_level INT DEFAULT NULL,
    bone_mass_kg DECIMAL(5,2) DEFAULT NULL,
    device_model VARCHAR(100) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bia_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_bia_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_tenant_client_date (tenant_id, client_id, measurement_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 32. Dati Antropometrici
CREATE TABLE IF NOT EXISTS anthropometric_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    client_id INT NOT NULL,
    measurement_date DATE NOT NULL,
    height_cm DECIMAL(5,2) DEFAULT NULL,
    weight_kg DECIMAL(6,2) DEFAULT NULL,
    age_years INT DEFAULT NULL,
    daily_steps_avg INT DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_anthro_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_anthro_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_tenant_client_date (tenant_id, client_id, measurement_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 33. Foto Progressi
CREATE TABLE IF NOT EXISTS progress_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    client_id INT NOT NULL,
    photo_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500) DEFAULT NULL,
    photo_type ENUM('front', 'back', 'side', 'full_body') DEFAULT 'front',
    taken_at DATE NOT NULL,
    notes TEXT DEFAULT NULL,
    body_weight DECIMAL(6,2) DEFAULT NULL,
    body_fat_pct DECIMAL(5,2) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_photos_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_photos_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_tenant_client_date (tenant_id, client_id, taken_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 34. Record Prestazionali (PR)
CREATE TABLE IF NOT EXISTS performance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    client_id INT NOT NULL,
    exercise_id INT NOT NULL,
    record_type ENUM('weight', 'reps', 'time', 'distance') DEFAULT 'weight',
    value DECIMAL(8,2) NOT NULL,
    previous_value DECIMAL(8,2) DEFAULT NULL,
    recorded_at DATE NOT NULL,
    session_id INT DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pr_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_pr_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    CONSTRAINT fk_pr_exercise FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT,
    INDEX idx_tenant_client_exercise (tenant_id, client_id, exercise_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 35. Check-in Giornaliero (Readiness)
CREATE TABLE IF NOT EXISTS daily_checkins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    client_id INT NOT NULL,
    checkin_date DATE NOT NULL,
    sleep_quality INT DEFAULT NULL COMMENT '1-10',
    sleep_hours DECIMAL(4,2) DEFAULT NULL,
    energy_level INT DEFAULT NULL COMMENT '1-10',
    stress_level INT DEFAULT NULL COMMENT '1-10',
    soreness_level INT DEFAULT NULL COMMENT '1-10',
    motivation_level INT DEFAULT NULL COMMENT '1-10',
    readiness_score INT DEFAULT NULL COMMENT '1-100 calcolato',
    mood VARCHAR(50) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_checkins_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_checkins_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    UNIQUE KEY uq_client_date (client_id, checkin_date),
    INDEX idx_tenant_date (tenant_id, checkin_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 36. Alert di Allenamento
CREATE TABLE IF NOT EXISTS training_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    client_id INT NOT NULL,
    alert_type VARCHAR(100) DEFAULT NULL,
    severity ENUM('low', 'medium', 'high') DEFAULT 'medium',
    title VARCHAR(255) DEFAULT NULL,
    message TEXT DEFAULT NULL,
    data JSON DEFAULT NULL,
    is_resolved TINYINT(1) DEFAULT 0,
    resolved_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_alerts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_alerts_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_tenant_resolved (tenant_id, is_resolved, created_at),
    INDEX idx_client (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 37. Piani Alimentari
CREATE TABLE IF NOT EXISTS meal_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    client_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    target_calories INT DEFAULT NULL,
    target_protein_g DECIMAL(7,2) DEFAULT NULL,
    target_carbs_g DECIMAL(7,2) DEFAULT NULL,
    target_fat_g DECIMAL(7,2) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_by INT DEFAULT NULL,
    status ENUM('draft', 'active', 'completed', 'archived') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_meal_plans_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_meal_plans_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    CONSTRAINT fk_meal_plans_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tenant_client (tenant_id, client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 38. Appuntamenti
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    client_id INT NOT NULL,
    trainer_id INT NOT NULL,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    appointment_type VARCHAR(100) DEFAULT NULL,
    location VARCHAR(255) DEFAULT NULL,
    status ENUM('scheduled', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled',
    notes TEXT DEFAULT NULL,
    google_event_id VARCHAR(255) DEFAULT NULL,
    outlook_event_id VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_appt_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_appt_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    CONSTRAINT fk_appt_trainer FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_tenant_trainer_date (tenant_id, trainer_id, start_datetime),
    INDEX idx_client_date (client_id, start_datetime),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 39. Classi di Gruppo
CREATE TABLE IF NOT EXISTS classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    instructor_id INT DEFAULT NULL,
    max_participants INT DEFAULT 10,
    duration_min INT DEFAULT 60,
    location VARCHAR(255) DEFAULT NULL,
    recurring_pattern JSON DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_classes_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_classes_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tenant_active (tenant_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 40. Programmi di Allenamento
CREATE TABLE IF NOT EXISTS client_programs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    client_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    start_date DATE NOT NULL,
    end_date DATE DEFAULT NULL,
    weeks INT DEFAULT 4,
    days_per_week INT DEFAULT 3,
    mesocycle_id INT DEFAULT NULL,
    created_by INT DEFAULT NULL,
    status ENUM('draft', 'active', 'paused', 'completed') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_programs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_programs_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    CONSTRAINT fk_programs_mesocycle FOREIGN KEY (mesocycle_id) REFERENCES mesocycles(id) ON DELETE SET NULL,
    CONSTRAINT fk_programs_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tenant_client_status (tenant_id, client_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 41. Community Posts
CREATE TABLE IF NOT EXISTS community_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    author_id INT NOT NULL,
    content TEXT NOT NULL,
    post_type VARCHAR(50) DEFAULT NULL,
    attachments JSON DEFAULT NULL,
    is_pinned TINYINT(1) DEFAULT 0,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_posts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_tenant_active_created (tenant_id, is_active, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 42. Sfide (Challenges)
CREATE TABLE IF NOT EXISTS challenges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    challenge_type VARCHAR(100) DEFAULT NULL,
    target_value DECIMAL(10,2) DEFAULT NULL,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    xp_reward INT DEFAULT 0,
    created_by INT DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_challenges_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_challenges_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tenant_active (tenant_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 43. Video Library
CREATE TABLE IF NOT EXISTS videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    file_path VARCHAR(500) DEFAULT NULL,
    thumbnail_path VARCHAR(500) DEFAULT NULL,
    duration_seconds INT DEFAULT NULL,
    video_type ENUM('exercise_demo', 'educational', 'motivational', 'course') DEFAULT 'exercise_demo',
    is_public TINYINT(1) DEFAULT 0,
    price DECIMAL(10,2) DEFAULT 0.00,
    views_count INT DEFAULT 0,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_videos_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_videos_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tenant_type (tenant_id, video_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 44. Corsi Video
CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    thumbnail_url VARCHAR(500) DEFAULT NULL,
    price DECIMAL(10,2) DEFAULT 0.00,
    sale_price DECIMAL(10,2) DEFAULT NULL,
    difficulty VARCHAR(50) DEFAULT NULL,
    category VARCHAR(100) DEFAULT NULL,
    duration_total_min INT DEFAULT NULL,
    is_published TINYINT(1) DEFAULT 0,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_courses_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_courses_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tenant_published (tenant_id, is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 45. Abbonamenti Clienti
CREATE TABLE IF NOT EXISTS client_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    client_id INT NOT NULL,
    plan_type VARCHAR(50) DEFAULT NULL,
    amount DECIMAL(10,2) DEFAULT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    billing_cycle ENUM('monthly', 'quarterly', 'yearly') DEFAULT 'monthly',
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    status ENUM('active', 'paused', 'cancelled', 'expired') DEFAULT 'active',
    cancelled_at DATETIME DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_subs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_subs_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_tenant_status (tenant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 46. Priorità Muscolari Cliente
CREATE TABLE IF NOT EXISTS client_muscle_priorities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    client_id INT NOT NULL,
    muscle_group_id INT NOT NULL,
    priority INT DEFAULT 1,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cmp_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_cmp_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    CONSTRAINT fk_cmp_muscle FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups(id) ON DELETE CASCADE,
    UNIQUE KEY uq_client_muscle (client_id, muscle_group_id),
    INDEX idx_tenant_client (tenant_id, client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TIER 5: FK su Tier 4
-- =====================================================

-- 47. Esercizi nel Template Workout
CREATE TABLE IF NOT EXISTS workout_template_exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_id INT NOT NULL,
    exercise_id INT NOT NULL,
    order_index INT DEFAULT 0,
    sets INT DEFAULT 3,
    reps_min INT DEFAULT NULL,
    reps_max INT DEFAULT NULL,
    weight_type ENUM('fixed', 'percentage', 'rpe', 'bodyweight') DEFAULT 'fixed',
    weight_value DECIMAL(8,2) DEFAULT NULL,
    rest_seconds INT DEFAULT 90,
    tempo VARCHAR(50) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    superset_group INT DEFAULT NULL,
    is_warmup TINYINT(1) DEFAULT 0,
    CONSTRAINT fk_wte_template FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE CASCADE,
    CONSTRAINT fk_wte_exercise FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT,
    INDEX idx_template (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 48. Sessioni di Allenamento (eseguite)
CREATE TABLE IF NOT EXISTS workout_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    client_id INT NOT NULL,
    template_id INT DEFAULT NULL,
    program_workout_id INT DEFAULT NULL,
    started_at DATETIME NOT NULL,
    completed_at DATETIME DEFAULT NULL,
    duration_minutes INT DEFAULT NULL,
    status ENUM('in_progress', 'completed', 'skipped', 'cancelled') DEFAULT 'in_progress',
    overall_feeling ENUM('terrible', 'bad', 'ok', 'good', 'great') DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    xp_earned INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ws_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_ws_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    CONSTRAINT fk_ws_template FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE SET NULL,
    INDEX idx_tenant_client_status (tenant_id, client_id, status),
    INDEX idx_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 49. Workout nel Programma
CREATE TABLE IF NOT EXISTS program_workouts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    program_id INT NOT NULL,
    template_id INT DEFAULT NULL,
    week_number INT DEFAULT NULL,
    day_of_week INT DEFAULT NULL,
    scheduled_date DATE DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    CONSTRAINT fk_pw_program FOREIGN KEY (program_id) REFERENCES client_programs(id) ON DELETE CASCADE,
    CONSTRAINT fk_pw_template FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE SET NULL,
    INDEX idx_program (program_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 50. Giorni del Piano Alimentare
CREATE TABLE IF NOT EXISTS meal_plan_days (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meal_plan_id INT NOT NULL,
    day_number INT DEFAULT NULL,
    day_name VARCHAR(50) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    CONSTRAINT fk_mpd_plan FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE,
    INDEX idx_plan (meal_plan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 51. Sessioni di Classe
CREATE TABLE IF NOT EXISTS class_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME DEFAULT NULL,
    status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cs_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    INDEX idx_class_date (class_id, start_datetime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 52. Partecipanti Conversazione
CREATE TABLE IF NOT EXISTS conversation_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    last_read_at DATETIME DEFAULT NULL,
    is_muted TINYINT(1) DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cp_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_cp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_conversation_user (conversation_id, user_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 53. Commenti Community
CREATE TABLE IF NOT EXISTS community_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    author_id INT NOT NULL,
    content TEXT NOT NULL,
    parent_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cc_post FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_cc_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cc_parent FOREIGN KEY (parent_id) REFERENCES community_comments(id) ON DELETE CASCADE,
    INDEX idx_post (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 54. Like Community
CREATE TABLE IF NOT EXISTS community_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cl_post FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_cl_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_post_user (post_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 55. Partecipanti Sfide
CREATE TABLE IF NOT EXISTS challenge_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    challenge_id INT NOT NULL,
    client_id INT NOT NULL,
    current_value DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('active', 'completed', 'abandoned') DEFAULT 'active',
    completed_at DATETIME DEFAULT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chp_challenge FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    CONSTRAINT fk_chp_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    UNIQUE KEY uq_challenge_client (challenge_id, client_id),
    INDEX idx_client (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 56. Moduli Corso (video in corsi)
CREATE TABLE IF NOT EXISTS course_modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    video_id INT DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    order_index INT DEFAULT 0,
    is_preview TINYINT(1) DEFAULT 0,
    CONSTRAINT fk_cm_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_cm_video FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE SET NULL,
    INDEX idx_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 57. Pagamenti
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    client_id INT DEFAULT NULL,
    subscription_id INT DEFAULT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    payment_method VARCHAR(50) DEFAULT NULL,
    transaction_id VARCHAR(255) DEFAULT NULL,
    stripe_payment_id VARCHAR(255) DEFAULT NULL,
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    notes TEXT DEFAULT NULL,
    payment_date DATE DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_payments_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    CONSTRAINT fk_payments_sub FOREIGN KEY (subscription_id) REFERENCES client_subscriptions(id) ON DELETE SET NULL,
    INDEX idx_tenant_date (tenant_id, payment_date),
    INDEX idx_stripe (stripe_payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 58. Acquisti Video/Corsi
CREATE TABLE IF NOT EXISTS video_purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    user_id INT NOT NULL,
    purchasable_type ENUM('video', 'course') NOT NULL,
    purchasable_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    stripe_payment_id VARCHAR(255) DEFAULT NULL,
    stripe_session_id VARCHAR(255) DEFAULT NULL,
    status ENUM('pending', 'completed', 'refunded', 'failed') DEFAULT 'pending',
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    refunded_at DATETIME DEFAULT NULL,
    CONSTRAINT fk_vp_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_vp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_tenant_user (tenant_id, user_id),
    INDEX idx_purchasable (purchasable_type, purchasable_id),
    INDEX idx_stripe_session (stripe_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TIER 6: FK su Tier 5
-- =====================================================

-- 59. Esercizi nella Sessione
CREATE TABLE IF NOT EXISTS workout_session_exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    exercise_id INT NOT NULL,
    order_index INT DEFAULT 0,
    prescribed_sets INT DEFAULT NULL,
    prescribed_reps VARCHAR(50) DEFAULT NULL,
    prescribed_weight DECIMAL(8,2) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    CONSTRAINT fk_wse_session FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_wse_exercise FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT,
    INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 60. Messaggi Chat
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    content TEXT NOT NULL,
    message_type ENUM('text', 'image', 'file', 'audio') DEFAULT 'text',
    attachments JSON DEFAULT NULL,
    read_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_conversation_created (conversation_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 61. Pasti (in un giorno del piano)
CREATE TABLE IF NOT EXISTS meals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_day_id INT NOT NULL,
    meal_type ENUM('breakfast', 'lunch', 'dinner', 'snack') DEFAULT 'breakfast',
    name VARCHAR(255) DEFAULT NULL,
    order_index INT DEFAULT 0,
    notes TEXT DEFAULT NULL,
    CONSTRAINT fk_meals_day FOREIGN KEY (plan_day_id) REFERENCES meal_plan_days(id) ON DELETE CASCADE,
    INDEX idx_day (plan_day_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 62. Iscrizioni Sessioni Classe
CREATE TABLE IF NOT EXISTS class_enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_session_id INT NOT NULL,
    client_id INT NOT NULL,
    status ENUM('enrolled', 'attended', 'cancelled', 'waitlisted') DEFAULT 'enrolled',
    waitlist_position INT DEFAULT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checked_in_at DATETIME DEFAULT NULL,
    CONSTRAINT fk_ce_session FOREIGN KEY (class_session_id) REFERENCES class_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_ce_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    UNIQUE KEY uq_session_client (class_session_id, client_id),
    INDEX idx_client (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 63. Progresso Corso Video
CREATE TABLE IF NOT EXISTS course_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    module_id INT DEFAULT NULL,
    watched_seconds INT DEFAULT 0,
    is_completed TINYINT(1) DEFAULT 0,
    completed_at DATETIME DEFAULT NULL,
    last_watched_at DATETIME DEFAULT NULL,
    CONSTRAINT fk_cprog_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cprog_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_cprog_module FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE SET NULL,
    INDEX idx_user_course (user_id, course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TIER 7: FK profondi
-- =====================================================

-- 64. Log Serie Esercizio
CREATE TABLE IF NOT EXISTS exercise_set_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_exercise_id INT NOT NULL,
    set_number INT DEFAULT NULL,
    reps_completed INT DEFAULT NULL,
    weight_used DECIMAL(8,2) DEFAULT NULL,
    rpe INT DEFAULT NULL,
    is_warmup TINYINT(1) DEFAULT 0,
    is_failure TINYINT(1) DEFAULT 0,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_esl_session_exercise FOREIGN KEY (session_exercise_id) REFERENCES workout_session_exercises(id) ON DELETE CASCADE,
    INDEX idx_session_exercise (session_exercise_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 65. Alimenti nel Pasto
CREATE TABLE IF NOT EXISTS meal_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meal_id INT NOT NULL,
    food_name VARCHAR(255) DEFAULT NULL,
    quantity DECIMAL(8,2) DEFAULT NULL,
    unit VARCHAR(50) DEFAULT NULL,
    calories INT DEFAULT NULL,
    protein_g DECIMAL(7,2) DEFAULT NULL,
    carbs_g DECIMAL(7,2) DEFAULT NULL,
    fat_g DECIMAL(7,2) DEFAULT NULL,
    fiber_g DECIMAL(7,2) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    CONSTRAINT fk_mi_meal FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
    INDEX idx_meal (meal_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 66. Analitiche Volume Settimanale
CREATE TABLE IF NOT EXISTS weekly_volume_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    client_id INT NOT NULL,
    program_id INT DEFAULT NULL,
    mesocycle_id INT DEFAULT NULL,
    week_number INT DEFAULT NULL,
    week_start DATE DEFAULT NULL,
    muscle_group_id INT DEFAULT NULL,
    total_sets INT DEFAULT 0,
    total_reps INT DEFAULT 0,
    total_volume DECIMAL(10,2) DEFAULT 0.00,
    avg_rpe DECIMAL(4,2) DEFAULT NULL,
    avg_weight DECIMAL(8,2) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_wva_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_wva_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    CONSTRAINT fk_wva_program FOREIGN KEY (program_id) REFERENCES client_programs(id) ON DELETE SET NULL,
    CONSTRAINT fk_wva_mesocycle FOREIGN KEY (mesocycle_id) REFERENCES mesocycles(id) ON DELETE SET NULL,
    CONSTRAINT fk_wva_muscle FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups(id) ON DELETE RESTRICT,
    UNIQUE KEY uq_client_week_muscle (client_id, week_start, muscle_group_id),
    INDEX idx_tenant_client (tenant_id, client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TIER 8: Tabelle API & Integrazione (da migrations)
-- =====================================================

-- 67. API Keys
CREATE TABLE IF NOT EXISTS api_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    api_key VARCHAR(100) NOT NULL,
    api_secret_hash VARCHAR(255) NOT NULL,
    permissions JSON DEFAULT NULL,
    rate_limit INT DEFAULT 1000,
    last_used_at DATETIME DEFAULT NULL,
    expires_at DATETIME DEFAULT NULL,
    status ENUM('active', 'revoked', 'expired') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_api_key (api_key),
    CONSTRAINT fk_api_keys_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_status (tenant_id, status),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 68. API Logs
CREATE TABLE IF NOT EXISTS api_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    api_key_id INT NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INT NOT NULL,
    response_time_ms INT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    request_body JSON DEFAULT NULL,
    response_body JSON DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_api_logs_key FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE,
    CONSTRAINT fk_api_logs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_key_created (api_key_id, created_at),
    INDEX idx_tenant_created (tenant_id, created_at),
    INDEX idx_status (status_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 69. Referral Codes
CREATE TABLE IF NOT EXISTS referral_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL,
    user_id INT NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    type ENUM('general', 'trainer', 'client', 'promotion') DEFAULT 'general',
    referrer_reward DECIMAL(10,2) DEFAULT 0.00,
    referee_reward DECIMAL(10,2) DEFAULT 0.00,
    max_uses INT DEFAULT NULL,
    current_uses INT DEFAULT 0,
    expires_at DATETIME DEFAULT NULL,
    status ENUM('active', 'inactive', 'expired') DEFAULT 'active',
    metadata JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_code (code),
    CONSTRAINT fk_referral_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_referral_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_user_status (user_id, status),
    INDEX idx_tenant_status (tenant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 70. Referral Conversions
CREATE TABLE IF NOT EXISTS referral_conversions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    referral_code_id INT NOT NULL,
    referrer_user_id INT NOT NULL,
    referred_user_id INT NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    status ENUM('pending', 'completed', 'cancelled', 'rejected') DEFAULT 'pending',
    referrer_reward_value DECIMAL(10,2) DEFAULT 0.00,
    referee_reward_value DECIMAL(10,2) DEFAULT 0.00,
    metadata JSON DEFAULT NULL,
    completed_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_rc_code FOREIGN KEY (referral_code_id) REFERENCES referral_codes(id) ON DELETE CASCADE,
    CONSTRAINT fk_rc_referrer FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_rc_referred FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_rc_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE KEY uq_referred (referred_user_id),
    INDEX idx_referrer_status (referrer_user_id, status),
    INDEX idx_tenant_status (tenant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 71. Referral Rewards
CREATE TABLE IF NOT EXISTS referral_rewards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversion_id INT NOT NULL,
    user_id INT NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    reward_type ENUM('credit', 'discount', 'xp', 'subscription_days', 'cash') DEFAULT 'credit',
    reward_value DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status ENUM('pending', 'awarded', 'redeemed', 'expired', 'cancelled') DEFAULT 'pending',
    awarded_at DATETIME DEFAULT NULL,
    redeemed_at DATETIME DEFAULT NULL,
    expires_at DATETIME DEFAULT NULL,
    metadata JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_rr_conversion FOREIGN KEY (conversion_id) REFERENCES referral_conversions(id) ON DELETE CASCADE,
    CONSTRAINT fk_rr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_rr_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_user_status (user_id, status),
    INDEX idx_tenant_status (tenant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 72. Staff Permissions (permessi granulari)
CREATE TABLE IF NOT EXISTS staff_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    user_id INT NOT NULL,
    can_manage_clients TINYINT(1) DEFAULT 1,
    can_manage_workouts TINYINT(1) DEFAULT 1,
    can_manage_programs TINYINT(1) DEFAULT 1,
    can_manage_nutrition TINYINT(1) DEFAULT 1,
    can_manage_payments TINYINT(1) DEFAULT 0,
    can_manage_bookings TINYINT(1) DEFAULT 1,
    can_manage_classes TINYINT(1) DEFAULT 1,
    can_manage_videos TINYINT(1) DEFAULT 0,
    can_view_analytics TINYINT(1) DEFAULT 0,
    can_manage_community TINYINT(1) DEFAULT 1,
    can_use_ai TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_tenant_user (tenant_id, user_id),
    CONSTRAINT fk_sp_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_sp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 73. Webhook Subscriptions
CREATE TABLE IF NOT EXISTS webhooks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    url VARCHAR(500) NOT NULL,
    events JSON NOT NULL COMMENT 'Array eventi: ["client.created", "payment.completed", ...]',
    secret VARCHAR(255) NOT NULL COMMENT 'Secret per firma HMAC',
    is_active TINYINT(1) DEFAULT 1,
    last_triggered_at DATETIME DEFAULT NULL,
    failure_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_webhooks_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_active (tenant_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 74. Webhook Delivery Logs
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    webhook_id INT NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSON NOT NULL,
    response_status INT DEFAULT NULL,
    response_body TEXT DEFAULT NULL,
    success TINYINT(1) DEFAULT 0,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wd_webhook FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE,
    INDEX idx_webhook_event (webhook_id, event_type),
    INDEX idx_attempted (attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- VISTE UTILI
-- =====================================================

-- Vista: Conteggio clienti attivi per tenant
CREATE OR REPLACE VIEW v_tenant_client_count AS
SELECT
    t.id AS tenant_id,
    t.business_name,
    t.max_clients,
    COUNT(c.id) AS active_clients
FROM tenants t
LEFT JOIN clients c ON c.tenant_id = t.id AND c.status = 'active'
GROUP BY t.id;

-- Vista: Leaderboard XP
CREATE OR REPLACE VIEW v_leaderboard AS
SELECT
    c.id AS client_id,
    c.tenant_id,
    c.first_name,
    c.last_name,
    c.xp_points,
    c.level,
    c.streak_days,
    RANK() OVER (PARTITION BY c.tenant_id ORDER BY c.xp_points DESC) AS rank_position
FROM clients c
WHERE c.status = 'active';

-- =====================================================
-- FINE SCHEMA
-- =====================================================
-- Totale: 74 tabelle + 2 viste
-- Per i seed data, eseguire i file in database/seeds/ in ordine numerico
-- =====================================================
