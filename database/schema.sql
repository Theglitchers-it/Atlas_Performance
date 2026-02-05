-- =====================================================
-- PT SAAS - DATABASE SCHEMA COMPLETO
-- Piattaforma SaaS per Personal Trainer
-- =====================================================
-- Versione: 1.0
-- Database: MySQL 8.0+
-- =====================================================

-- Creazione database
CREATE DATABASE IF NOT EXISTS pt_saas_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE pt_saas_db;

-- =====================================================
-- SEZIONE 1: MULTI-TENANCY E UTENTI
-- =====================================================

-- Tabella Tenant (Personal Trainer / Business)
CREATE TABLE tenants (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    business_name VARCHAR(255) NOT NULL,
    owner_email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Italia',
    logo_url VARCHAR(500),
    subscription_plan ENUM('free', 'starter', 'pro', 'enterprise') DEFAULT 'free',
    subscription_status ENUM('active', 'past_due', 'cancelled', 'trial') DEFAULT 'trial',
    trial_ends_at TIMESTAMP NULL,
    max_clients INT DEFAULT 5,
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_subscription (subscription_plan, subscription_status)
) ENGINE=InnoDB;

-- Tabella Utenti (tutti i ruoli)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'tenant_owner', 'staff', 'client') NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    status ENUM('active', 'inactive', 'pending', 'suspended') DEFAULT 'pending',
    email_verified_at TIMESTAMP NULL,
    last_login_at TIMESTAMP NULL,
    preferences JSON,
    push_token VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE KEY unique_email_tenant (email, tenant_id),
    INDEX idx_tenant (tenant_id),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- Tabella Refresh Tokens
CREATE TABLE refresh_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB;

-- =====================================================
-- SEZIONE 2: CLIENTI E PROFILI FITNESS
-- =====================================================

-- Tabella Clienti (profilo fitness esteso)
CREATE TABLE clients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    user_id INT UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    height_cm DECIMAL(5,2),
    initial_weight_kg DECIMAL(5,2),
    current_weight_kg DECIMAL(5,2),
    fitness_level ENUM('beginner', 'intermediate', 'advanced', 'elite') DEFAULT 'beginner',
    primary_goal ENUM('weight_loss', 'muscle_gain', 'strength', 'endurance', 'flexibility', 'general_fitness', 'sport_specific') DEFAULT 'general_fitness',
    secondary_goals JSON,
    medical_notes TEXT,
    dietary_restrictions JSON,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    notes TEXT,
    status ENUM('active', 'inactive', 'paused', 'cancelled') DEFAULT 'active',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    training_location ENUM('online', 'in_person', 'hybrid') DEFAULT 'hybrid',
    location_id INT,
    assigned_to INT,
    xp_points INT DEFAULT 0,
    level INT DEFAULT 1,
    streak_days INT DEFAULT 0,
    last_workout_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_status (status),
    INDEX idx_assigned (assigned_to)
) ENGINE=InnoDB;

-- Tabella Obiettivi Cliente (multipli)
CREATE TABLE client_goals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    client_id INT NOT NULL,
    goal_type VARCHAR(50) NOT NULL,
    target_value DECIMAL(10,2),
    current_value DECIMAL(10,2),
    unit VARCHAR(20),
    deadline DATE,
    priority INT DEFAULT 1,
    status ENUM('active', 'achieved', 'abandoned') DEFAULT 'active',
    achieved_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_tenant_client (tenant_id, client_id)
) ENGINE=InnoDB;

-- Tabella Infortuni
CREATE TABLE injuries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    client_id INT NOT NULL,
    body_part VARCHAR(100) NOT NULL,
    description TEXT,
    severity ENUM('mild', 'moderate', 'severe') DEFAULT 'mild',
    injury_date DATE,
    recovery_date DATE,
    status ENUM('active', 'recovering', 'recovered') DEFAULT 'active',
    restrictions JSON,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_tenant_client (tenant_id, client_id),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- =====================================================
-- SEZIONE 3: WORKOUT SYSTEM
-- =====================================================

-- Tabella Gruppi Muscolari
CREATE TABLE muscle_groups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    name_it VARCHAR(100) NOT NULL,
    category ENUM('upper', 'lower', 'core', 'full_body') NOT NULL,
    icon VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tabella Esercizi (libreria)
CREATE TABLE exercises (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    video_url VARCHAR(500),
    image_url VARCHAR(500),
    category ENUM('strength', 'cardio', 'flexibility', 'balance', 'plyometric', 'compound', 'isolation') NOT NULL,
    equipment JSON,
    difficulty ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'intermediate',
    is_compound BOOLEAN DEFAULT FALSE,
    is_custom BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id),
    INDEX idx_category (category),
    FULLTEXT idx_search (name, description)
) ENGINE=InnoDB;

-- Tabella Esercizi-Muscoli (relazione N:N)
CREATE TABLE exercise_muscle_groups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exercise_id INT NOT NULL,
    muscle_group_id INT NOT NULL,
    is_primary BOOLEAN DEFAULT TRUE,
    activation_percentage INT DEFAULT 100,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
    FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups(id) ON DELETE CASCADE,
    UNIQUE KEY unique_exercise_muscle (exercise_id, muscle_group_id)
) ENGINE=InnoDB;

-- Tabella Template Workout (schede allenamento)
CREATE TABLE workout_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category ENUM('strength', 'hypertrophy', 'endurance', 'power', 'conditioning', 'recovery', 'custom') DEFAULT 'custom',
    difficulty ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'intermediate',
    estimated_duration_min INT,
    target_muscles JSON,
    is_template BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB;

-- Tabella Esercizi nel Template
CREATE TABLE workout_template_exercises (
    id INT PRIMARY KEY AUTO_INCREMENT,
    template_id INT NOT NULL,
    exercise_id INT NOT NULL,
    order_index INT NOT NULL,
    sets INT DEFAULT 3,
    reps_min INT,
    reps_max INT,
    weight_type ENUM('fixed', 'percentage_1rm', 'rpe', 'bodyweight') DEFAULT 'fixed',
    weight_value DECIMAL(6,2),
    rest_seconds INT DEFAULT 90,
    tempo VARCHAR(20),
    notes TEXT,
    superset_group INT,
    is_warmup BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
    INDEX idx_template (template_id)
) ENGINE=InnoDB;

-- Tabella Mesocicli
CREATE TABLE mesocycles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    client_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    weeks INT NOT NULL,
    focus ENUM('hypertrophy', 'strength', 'power', 'deload', 'peaking', 'general') DEFAULT 'hypertrophy',
    periodization_type ENUM('linear', 'undulating', 'block', 'dup') DEFAULT 'linear',
    status ENUM('planned', 'active', 'completed') DEFAULT 'planned',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_tenant_client (tenant_id, client_id),
    INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB;

-- Tabella Programmi Cliente
CREATE TABLE client_programs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    client_id INT NOT NULL,
    mesocycle_id INT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    weeks INT DEFAULT 4,
    days_per_week INT DEFAULT 3,
    status ENUM('draft', 'active', 'completed', 'cancelled') DEFAULT 'draft',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (mesocycle_id) REFERENCES mesocycles(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tenant_client (tenant_id, client_id),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- Tabella Workout nel Programma
CREATE TABLE program_workouts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    program_id INT NOT NULL,
    template_id INT NOT NULL,
    week_number INT NOT NULL,
    day_of_week INT NOT NULL,
    scheduled_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES client_programs(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE CASCADE,
    INDEX idx_program (program_id),
    INDEX idx_schedule (scheduled_date)
) ENGINE=InnoDB;

-- Tabella Sessioni Workout (eseguite)
CREATE TABLE workout_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    client_id INT NOT NULL,
    program_workout_id INT,
    template_id INT,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    duration_minutes INT,
    status ENUM('in_progress', 'completed', 'skipped', 'partial') DEFAULT 'in_progress',
    overall_feeling ENUM('terrible', 'bad', 'okay', 'good', 'great'),
    notes TEXT,
    xp_earned INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (program_workout_id) REFERENCES program_workouts(id) ON DELETE SET NULL,
    FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE SET NULL,
    INDEX idx_tenant_client (tenant_id, client_id),
    INDEX idx_date (started_at)
) ENGINE=InnoDB;

-- Tabella Esercizi nella Sessione
CREATE TABLE workout_session_exercises (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    exercise_id INT NOT NULL,
    order_index INT NOT NULL,
    prescribed_sets INT,
    prescribed_reps VARCHAR(20),
    prescribed_weight DECIMAL(6,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
    INDEX idx_session (session_id)
) ENGINE=InnoDB;

-- Tabella Log Serie
CREATE TABLE exercise_set_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_exercise_id INT NOT NULL,
    set_number INT NOT NULL,
    reps_completed INT,
    weight_used DECIMAL(6,2),
    rpe DECIMAL(3,1),
    is_warmup BOOLEAN DEFAULT FALSE,
    is_failure BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_exercise_id) REFERENCES workout_session_exercises(id) ON DELETE CASCADE,
    INDEX idx_session_exercise (session_exercise_id)
) ENGINE=InnoDB;

-- =====================================================
-- SEZIONE 4: PROGRESS TRACKING
-- =====================================================

-- Tabella Misurazioni Corporee Base
CREATE TABLE body_measurements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    client_id INT NOT NULL,
    measurement_date DATE NOT NULL,
    weight_kg DECIMAL(5,2),
    body_fat_percentage DECIMAL(4,1),
    muscle_mass_kg DECIMAL(5,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_tenant_client (tenant_id, client_id),
    INDEX idx_date (measurement_date)
) ENGINE=InnoDB;

-- Tabella Dati Antropometrici
CREATE TABLE anthropometric_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    client_id INT NOT NULL,
    measurement_date DATE NOT NULL,
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(5,2),
    age_years INT,
    daily_steps_avg INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_tenant_client (tenant_id, client_id),
    INDEX idx_date (measurement_date)
) ENGINE=InnoDB;

-- Tabella Plicometria (9 pliche)
CREATE TABLE skinfold_measurements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    client_id INT NOT NULL,
    measurement_date DATE NOT NULL,
    chest_mm DECIMAL(4,1),
    subscapular_mm DECIMAL(4,1),
    suprailiac_mm DECIMAL(4,1),
    abdominal_mm DECIMAL(4,1),
    quadriceps_mm DECIMAL(4,1),
    biceps_mm DECIMAL(4,1),
    triceps_mm DECIMAL(4,1),
    cheek_mm DECIMAL(4,1),
    calf_mm DECIMAL(4,1),
    sum_total_mm DECIMAL(5,1),
    body_fat_percentage DECIMAL(4,1),
    calculation_method ENUM('jackson_pollock_3', 'jackson_pollock_7', 'durnin_womersley') DEFAULT 'jackson_pollock_3',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_tenant_client (tenant_id, client_id),
    INDEX idx_date (measurement_date)
) ENGINE=InnoDB;

-- Tabella Circonferenze (8 misure)
CREATE TABLE circumference_measurements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    client_id INT NOT NULL,
    measurement_date DATE NOT NULL,
    waist_cm DECIMAL(5,1),
    hips_cm DECIMAL(5,1),
    biceps_cm DECIMAL(5,1),
    biceps_flexed_cm DECIMAL(5,1),
    shoulders_cm DECIMAL(5,1),
    chest_cm DECIMAL(5,1),
    thigh_upper_cm DECIMAL(5,1),
    thigh_lower_cm DECIMAL(5,1),
    glutes_cm DECIMAL(5,1),
    waist_hip_ratio DECIMAL(3,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_tenant_client (tenant_id, client_id),
    INDEX idx_date (measurement_date)
) ENGINE=InnoDB;

-- Tabella BIA (Bioimpedenza)
CREATE TABLE bia_measurements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    client_id INT NOT NULL,
    measurement_date DATE NOT NULL,
    lean_mass_kg DECIMAL(5,2),
    lean_mass_pct DECIMAL(4,1),
    fat_mass_kg DECIMAL(5,2),
    fat_mass_pct DECIMAL(4,1),
    total_body_water_l DECIMAL(4,1),
    total_body_water_pct DECIMAL(4,1),
    muscle_mass_kg DECIMAL(5,2),
    basal_metabolic_rate INT,
    visceral_fat_level INT,
    bone_mass_kg DECIMAL(4,2),
    device_model VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_tenant_client (tenant_id, client_id),
    INDEX idx_date (measurement_date)
) ENGINE=InnoDB;

-- Tabella Foto Progressi
CREATE TABLE progress_photos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    client_id INT NOT NULL,
    photo_date DATE NOT NULL,
    photo_type ENUM('front', 'back', 'side_left', 'side_right', 'other') DEFAULT 'front',
    file_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500),
    notes TEXT,
    ai_analysis TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_tenant_client (tenant_id, client_id),
    INDEX idx_date (photo_date)
) ENGINE=InnoDB;

-- Tabella Record Performance (PR)
CREATE TABLE performance_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    client_id INT NOT NULL,
    exercise_id INT NOT NULL,
    record_type ENUM('1rm', '3rm', '5rm', '10rm', 'max_reps', 'max_time', 'max_distance') NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20),
    previous_value DECIMAL(10,2),
    achieved_at TIMESTAMP NOT NULL,
    session_id INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE SET NULL,
    INDEX idx_tenant_client (tenant_id, client_id),
    INDEX idx_exercise (exercise_id)
) ENGINE=InnoDB;

-- =====================================================
-- SEZIONE 5: READINESS & VOLUME ANALYTICS
-- =====================================================

-- Tabella Check-in Giornaliero
CREATE TABLE daily_checkins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    client_id INT NOT NULL,
    checkin_date DATE NOT NULL,
    sleep_quality INT CHECK (sleep_quality BETWEEN 1 AND 10),
    sleep_hours DECIMAL(3,1),
    energy_level INT CHECK (energy_level BETWEEN 1 AND 10),
    stress_level INT CHECK (stress_level BETWEEN 1 AND 10),
    soreness_level INT CHECK (soreness_level BETWEEN 1 AND 10),
    motivation_level INT CHECK (motivation_level BETWEEN 1 AND 10),
    readiness_score DECIMAL(4,1),
    mood ENUM('terrible', 'bad', 'neutral', 'good', 'great'),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    UNIQUE KEY unique_daily_checkin (client_id, checkin_date),
    INDEX idx_tenant_client (tenant_id, client_id),
    INDEX idx_date (checkin_date)
) ENGINE=InnoDB;

-- Tabella Volume Analytics Settimanale
CREATE TABLE weekly_volume_analytics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    client_id INT NOT NULL,
    mesocycle_id INT,
    week_start_date DATE NOT NULL,
    week_number INT NOT NULL,
    muscle_group_id INT NOT NULL,
    total_sets INT DEFAULT 0,
    total_reps INT DEFAULT 0,
    total_volume_kg DECIMAL(10,2) DEFAULT 0,
    avg_rpe DECIMAL(3,1),
    avg_weight_kg DECIMAL(6,2),
    progression_vs_previous DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (mesocycle_id) REFERENCES mesocycles(id) ON DELETE SET NULL,
    FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups(id) ON DELETE CASCADE,
    UNIQUE KEY unique_weekly_volume (client_id, week_start_date, muscle_group_id),
    INDEX idx_tenant_client (tenant_id, client_id)
) ENGINE=InnoDB;

-- Tabella Priorita Muscoli Cliente
CREATE TABLE client_muscle_priorities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    client_id INT NOT NULL,
    muscle_group_id INT NOT NULL,
    priority ENUM('weakness', 'maintenance', 'strength') DEFAULT 'maintenance',
    target_weekly_sets INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups(id) ON DELETE CASCADE,
    UNIQUE KEY unique_client_muscle (client_id, muscle_group_id),
    INDEX idx_tenant_client (tenant_id, client_id)
) ENGINE=InnoDB;

-- Tabella Alert Training
CREATE TABLE training_alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    client_id INT NOT NULL,
    alert_type ENUM('low_readiness', 'volume_plateau', 'performance_drop', 'overtraining_risk', 'missed_workouts', 'goal_achieved') NOT NULL,
    severity ENUM('info', 'warning', 'critical') DEFAULT 'info',
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSON,
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_tenant_client (tenant_id, client_id),
    INDEX idx_unread (is_read, is_dismissed)
) ENGINE=InnoDB;

-- =====================================================
-- SEZIONE 6: NUTRIZIONE
-- =====================================================

-- Tabella Piani Alimentari
CREATE TABLE meal_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    client_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    target_calories INT,
    target_protein_g INT,
    target_carbs_g INT,
    target_fat_g INT,
    status ENUM('draft', 'active', 'completed', 'archived') DEFAULT 'draft',
    ai_generated BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tenant_client (tenant_id, client_id)
) ENGINE=InnoDB;

-- Tabella Giorni Piano Alimentare
CREATE TABLE meal_plan_days (
    id INT PRIMARY KEY AUTO_INCREMENT,
    meal_plan_id INT NOT NULL,
    day_number INT NOT NULL,
    day_name VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE,
    INDEX idx_plan (meal_plan_id)
) ENGINE=InnoDB;

-- Tabella Pasti
CREATE TABLE meals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    plan_day_id INT NOT NULL,
    meal_type ENUM('breakfast', 'snack_morning', 'lunch', 'snack_afternoon', 'dinner', 'snack_evening') NOT NULL,
    name VARCHAR(255),
    order_index INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_day_id) REFERENCES meal_plan_days(id) ON DELETE CASCADE,
    INDEX idx_day (plan_day_id)
) ENGINE=InnoDB;

-- Tabella Alimenti nel Pasto
CREATE TABLE meal_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    meal_id INT NOT NULL,
    food_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(6,2) NOT NULL,
    unit VARCHAR(50) DEFAULT 'g',
    calories INT,
    protein_g DECIMAL(5,1),
    carbs_g DECIMAL(5,1),
    fat_g DECIMAL(5,1),
    fiber_g DECIMAL(5,1),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
    INDEX idx_meal (meal_id)
) ENGINE=InnoDB;

-- =====================================================
-- SEZIONE 7: COMUNICAZIONE
-- =====================================================

-- Tabella Conversazioni
CREATE TABLE conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    type ENUM('direct', 'group') DEFAULT 'direct',
    name VARCHAR(255),
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant (tenant_id),
    INDEX idx_last_message (last_message_at)
) ENGINE=InnoDB;

-- Tabella Partecipanti Conversazione
CREATE TABLE conversation_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    last_read_at TIMESTAMP,
    is_muted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_participant (conversation_id, user_id),
    INDEX idx_conversation (conversation_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Tabella Messaggi
CREATE TABLE messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    content TEXT NOT NULL,
    attachments JSON,
    message_type ENUM('text', 'image', 'file', 'audio', 'system') DEFAULT 'text',
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_conversation (conversation_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- Tabella Post Community
CREATE TABLE community_posts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    author_id INT NOT NULL,
    content TEXT NOT NULL,
    attachments JSON,
    post_type ENUM('announcement', 'tip', 'motivation', 'achievement', 'question') DEFAULT 'announcement',
    is_pinned BOOLEAN DEFAULT FALSE,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_tenant (tenant_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- Tabella Commenti Community
CREATE TABLE community_comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT NOT NULL,
    author_id INT NOT NULL,
    content TEXT NOT NULL,
    parent_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES community_comments(id) ON DELETE CASCADE,
    INDEX idx_post (post_id)
) ENGINE=InnoDB;

-- Tabella Like Post
CREATE TABLE community_likes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_like (post_id, user_id)
) ENGINE=InnoDB;

-- =====================================================
-- SEZIONE 8: BOOKING E CALENDARIO
-- =====================================================

-- Tabella Slot Disponibilita
CREATE TABLE availability_slots (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    user_id INT NOT NULL,
    day_of_week INT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_min INT DEFAULT 60,
    location_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_tenant_user (tenant_id, user_id)
) ENGINE=InnoDB;

-- Tabella Appuntamenti
CREATE TABLE appointments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    client_id INT NOT NULL,
    trainer_id INT NOT NULL,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    appointment_type ENUM('training', 'assessment', 'consultation', 'other') DEFAULT 'training',
    location VARCHAR(255),
    status ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled',
    notes TEXT,
    google_event_id VARCHAR(255),
    outlook_event_id VARCHAR(255),
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_tenant (tenant_id),
    INDEX idx_datetime (start_datetime),
    INDEX idx_trainer (trainer_id)
) ENGINE=InnoDB;

-- Tabella Classi di Gruppo
CREATE TABLE classes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    instructor_id INT NOT NULL,
    max_participants INT DEFAULT 10,
    duration_min INT DEFAULT 60,
    location VARCHAR(255),
    recurring_pattern JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB;

-- Tabella Sessioni Classe
CREATE TABLE class_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    class_id INT NOT NULL,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    INDEX idx_class (class_id),
    INDEX idx_datetime (start_datetime)
) ENGINE=InnoDB;

-- Tabella Iscrizioni Classi
CREATE TABLE class_enrollments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    class_session_id INT NOT NULL,
    client_id INT NOT NULL,
    status ENUM('enrolled', 'waitlist', 'cancelled', 'attended', 'no_show') DEFAULT 'enrolled',
    waitlist_position INT,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checked_in_at TIMESTAMP NULL,
    FOREIGN KEY (class_session_id) REFERENCES class_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (class_session_id, client_id),
    INDEX idx_session (class_session_id)
) ENGINE=InnoDB;

-- =====================================================
-- SEZIONE 9: VIDEO E CORSI
-- =====================================================

-- Tabella Video
CREATE TABLE videos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500),
    duration_seconds INT,
    video_type ENUM('exercise_demo', 'course_content', 'free_content') DEFAULT 'exercise_demo',
    is_public BOOLEAN DEFAULT FALSE,
    price DECIMAL(10,2) DEFAULT 0,
    views_count INT DEFAULT 0,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_type (video_type)
) ENGINE=InnoDB;

-- Tabella Corsi
CREATE TABLE courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    price DECIMAL(10,2) NOT NULL,
    sale_price DECIMAL(10,2),
    difficulty ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'intermediate',
    category VARCHAR(100),
    duration_total_min INT,
    is_published BOOLEAN DEFAULT FALSE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_published (is_published)
) ENGINE=InnoDB;

-- Tabella Moduli Corso
CREATE TABLE course_modules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    video_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INT NOT NULL,
    is_preview BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    INDEX idx_course (course_id)
) ENGINE=InnoDB;

-- Tabella Acquisti Video/Corsi
CREATE TABLE video_purchases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    user_id INT NOT NULL,
    purchasable_type ENUM('video', 'course') NOT NULL,
    purchasable_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    stripe_payment_id VARCHAR(255),
    status ENUM('pending', 'completed', 'refunded') DEFAULT 'pending',
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_purchasable (purchasable_type, purchasable_id)
) ENGINE=InnoDB;

-- Tabella Progresso Corso
CREATE TABLE course_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    module_id INT NOT NULL,
    watched_seconds INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    last_watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE,
    UNIQUE KEY unique_progress (user_id, module_id),
    INDEX idx_user_course (user_id, course_id)
) ENGINE=InnoDB;

-- =====================================================
-- SEZIONE 10: GAMIFICATION
-- =====================================================

-- Tabella Achievement/Badge
CREATE TABLE achievements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url VARCHAR(500),
    category ENUM('workout', 'consistency', 'strength', 'progress', 'social', 'special') NOT NULL,
    requirement_type VARCHAR(50) NOT NULL,
    requirement_value INT NOT NULL,
    xp_reward INT DEFAULT 0,
    rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') DEFAULT 'common',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id),
    INDEX idx_category (category)
) ENGINE=InnoDB;

-- Tabella Achievement Utente
CREATE TABLE user_achievements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    achievement_id INT NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress_value INT DEFAULT 0,
    is_notified BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_achievement (user_id, achievement_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- Tabella Titoli Sbloccabili
CREATE TABLE achievement_titles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36),
    exercise_id INT,
    title_name VARCHAR(100) NOT NULL,
    title_description TEXT,
    category ENUM('strength', 'consistency', 'transformation', 'custom') NOT NULL,
    metric_type ENUM('weight_kg', 'reps', 'consecutive_days', 'weight_loss', 'weight_gain') NOT NULL,
    threshold_value DECIMAL(10,2) NOT NULL,
    icon_url VARCHAR(255),
    rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') DEFAULT 'common',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE SET NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_exercise (exercise_id)
) ENGINE=InnoDB;

-- Tabella Titoli Cliente
CREATE TABLE client_titles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    client_id INT NOT NULL,
    title_id INT NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unlocked_value DECIMAL(10,2),
    is_displayed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (title_id) REFERENCES achievement_titles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_client_title (client_id, title_id),
    INDEX idx_tenant_client (tenant_id, client_id)
) ENGINE=InnoDB;

-- Tabella Sfide/Challenge
CREATE TABLE challenges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    challenge_type ENUM('workout_count', 'total_volume', 'consecutive_days', 'specific_exercise', 'custom') NOT NULL,
    target_value INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    xp_reward INT DEFAULT 0,
    badge_reward_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (badge_reward_id) REFERENCES achievements(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tenant (tenant_id),
    INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB;

-- Tabella Partecipanti Sfida
CREATE TABLE challenge_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    challenge_id INT NOT NULL,
    client_id INT NOT NULL,
    current_value INT DEFAULT 0,
    status ENUM('active', 'completed', 'failed', 'withdrawn') DEFAULT 'active',
    completed_at TIMESTAMP NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    UNIQUE KEY unique_participant (challenge_id, client_id),
    INDEX idx_challenge (challenge_id)
) ENGINE=InnoDB;

-- Tabella Transazioni Punti XP
CREATE TABLE points_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    client_id INT NOT NULL,
    points INT NOT NULL,
    transaction_type ENUM('workout', 'checkin', 'achievement', 'challenge', 'streak', 'bonus', 'admin') NOT NULL,
    reference_type VARCHAR(50),
    reference_id INT,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_tenant_client (tenant_id, client_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- =====================================================
-- SEZIONE 11: PAGAMENTI
-- =====================================================

-- Tabella Abbonamenti Cliente
CREATE TABLE client_subscriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    client_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    frequency ENUM('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly') DEFAULT 'monthly',
    start_date DATE NOT NULL,
    next_payment_date DATE,
    status ENUM('active', 'paused', 'cancelled', 'expired') DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_tenant_client (tenant_id, client_id),
    INDEX idx_next_payment (next_payment_date)
) ENGINE=InnoDB;

-- Tabella Pagamenti
CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    client_id INT NOT NULL,
    subscription_id INT,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash', 'bank_transfer', 'card', 'paypal', 'other') NOT NULL,
    payment_date DATE NOT NULL,
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'completed',
    reference VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES client_subscriptions(id) ON DELETE SET NULL,
    INDEX idx_tenant_client (tenant_id, client_id),
    INDEX idx_date (payment_date)
) ENGINE=InnoDB;

-- Tabella Fatture Piattaforma
CREATE TABLE platform_invoices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status ENUM('pending', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
    stripe_invoice_id VARCHAR(255),
    paid_at TIMESTAMP NULL,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant (tenant_id),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- =====================================================
-- SEZIONE 12: SISTEMA E NOTIFICHE
-- =====================================================

-- Tabella Notifiche
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36),
    user_id INT NOT NULL,
    type ENUM('workout_reminder', 'payment_due', 'appointment', 'message', 'achievement', 'alert', 'system') NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSON,
    is_read BOOLEAN DEFAULT FALSE,
    is_push_sent BOOLEAN DEFAULT FALSE,
    is_email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_unread (user_id, is_read)
) ENGINE=InnoDB;

-- Tabella Template Notifiche
CREATE TABLE notification_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36),
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    body_template TEXT NOT NULL,
    variables JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id),
    INDEX idx_type (type)
) ENGINE=InnoDB;

-- Tabella Audit Log
CREATE TABLE audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36),
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id),
    INDEX idx_user (user_id),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- Tabella API Keys
CREATE TABLE api_keys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL,
    permissions JSON,
    rate_limit INT DEFAULT 1000,
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant (tenant_id),
    INDEX idx_prefix (key_prefix)
) ENGINE=InnoDB;

-- Tabella Codici Referral
CREATE TABLE referral_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36),
    user_id INT NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    type ENUM('client_to_client', 'trainer_to_trainer') NOT NULL,
    discount_percentage INT,
    credit_amount DECIMAL(10,2),
    max_uses INT,
    uses_count INT DEFAULT 0,
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_code (code)
) ENGINE=InnoDB;

-- Tabella Conversioni Referral
CREATE TABLE referral_conversions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    referral_code_id INT NOT NULL,
    referred_user_id INT NOT NULL,
    referrer_reward DECIMAL(10,2),
    referred_reward DECIMAL(10,2),
    status ENUM('pending', 'approved', 'paid') DEFAULT 'pending',
    converted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referral_code_id) REFERENCES referral_codes(id) ON DELETE CASCADE,
    FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_code (referral_code_id)
) ENGINE=InnoDB;

-- Tabella Sedi/Location
CREATE TABLE locations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    phone VARCHAR(20),
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB;

-- =====================================================
-- SEZIONE 13: INDICI AGGIUNTIVI PER PERFORMANCE
-- =====================================================

-- Indici composti per query frequenti
CREATE INDEX idx_sessions_client_date ON workout_sessions(client_id, started_at);
CREATE INDEX idx_checkins_client_date ON daily_checkins(client_id, checkin_date);
CREATE INDEX idx_measurements_client_date ON body_measurements(client_id, measurement_date);
CREATE INDEX idx_payments_client_date ON payments(client_id, payment_date);
CREATE INDEX idx_appointments_trainer_date ON appointments(trainer_id, start_datetime);

-- =====================================================
-- FINE SCHEMA
-- =====================================================
