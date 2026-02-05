-- =====================================================
-- SEED: Achievement/Badge di Base
-- =====================================================

INSERT INTO achievements (tenant_id, name, description, category, requirement_type, requirement_value, xp_reward, rarity) VALUES
-- Workout Achievements
(NULL, 'Primo Allenamento', 'Completa il tuo primo allenamento', 'workout', 'workout_count', 1, 50, 'common'),
(NULL, 'Principiante', 'Completa 10 allenamenti', 'workout', 'workout_count', 10, 100, 'common'),
(NULL, 'Intermedio', 'Completa 50 allenamenti', 'workout', 'workout_count', 50, 250, 'uncommon'),
(NULL, 'Avanzato', 'Completa 100 allenamenti', 'workout', 'workout_count', 100, 500, 'rare'),
(NULL, 'Elite', 'Completa 250 allenamenti', 'workout', 'workout_count', 250, 1000, 'epic'),
(NULL, 'Leggenda', 'Completa 500 allenamenti', 'workout', 'workout_count', 500, 2500, 'legendary'),

-- Consistency Achievements
(NULL, 'Settimana Perfetta', '7 giorni consecutivi di allenamento', 'consistency', 'streak_days', 7, 100, 'common'),
(NULL, 'Mese di Ferro', '30 giorni consecutivi di allenamento', 'consistency', 'streak_days', 30, 300, 'uncommon'),
(NULL, 'Trimestre d''Acciaio', '90 giorni consecutivi di allenamento', 'consistency', 'streak_days', 90, 750, 'rare'),
(NULL, 'Anno Invincibile', '365 giorni consecutivi di allenamento', 'consistency', 'streak_days', 365, 5000, 'legendary'),

-- Strength Achievements
(NULL, 'Primo PR', 'Stabilisci il tuo primo Personal Record', 'strength', 'pr_count', 1, 75, 'common'),
(NULL, 'Collezionista di PR', 'Stabilisci 10 Personal Record', 'strength', 'pr_count', 10, 200, 'uncommon'),
(NULL, 'Re dei PR', 'Stabilisci 50 Personal Record', 'strength', 'pr_count', 50, 500, 'rare'),

-- Progress Achievements
(NULL, 'Prima Foto', 'Carica la tua prima foto progressi', 'progress', 'photo_count', 1, 50, 'common'),
(NULL, 'Fotografo', 'Carica 10 foto progressi', 'progress', 'photo_count', 10, 150, 'uncommon'),
(NULL, 'Documentarista', 'Carica 50 foto progressi', 'progress', 'photo_count', 50, 400, 'rare'),
(NULL, 'Prima Misurazione', 'Registra la tua prima misurazione', 'progress', 'measurement_count', 1, 50, 'common'),
(NULL, 'Analista', 'Registra 20 misurazioni', 'progress', 'measurement_count', 20, 200, 'uncommon'),

-- Social Achievements
(NULL, 'Sociale', 'Invia il tuo primo messaggio', 'social', 'message_count', 1, 25, 'common'),
(NULL, 'Chiacchierone', 'Invia 100 messaggi', 'social', 'message_count', 100, 100, 'uncommon'),
(NULL, 'Primo Post', 'Pubblica il tuo primo post nella community', 'social', 'post_count', 1, 50, 'common'),
(NULL, 'Influencer', 'Pubblica 20 post nella community', 'social', 'post_count', 20, 200, 'uncommon'),

-- Special Achievements
(NULL, 'Check-in Mattiniero', 'Fai check-in prima delle 7:00', 'special', 'early_checkin', 1, 50, 'common'),
(NULL, 'Nottambulo', 'Completa un allenamento dopo le 22:00', 'special', 'late_workout', 1, 50, 'common'),
(NULL, 'Weekend Warrior', 'Allenati tutti i weekend per un mese', 'special', 'weekend_warrior', 4, 150, 'uncommon'),
(NULL, 'Obiettivo Raggiunto', 'Raggiungi il tuo primo obiettivo', 'special', 'goal_achieved', 1, 200, 'uncommon'),
(NULL, 'Completista', 'Raggiungi 5 obiettivi', 'special', 'goal_achieved', 5, 500, 'rare');
