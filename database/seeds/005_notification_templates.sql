-- =====================================================
-- SEED: Template Notifiche
-- =====================================================

INSERT INTO notification_templates (template_key, title, message, type, action_url, priority) VALUES
-- Workout & Sessioni
('workout_reminder', 'Allenamento oggi!', 'Ciao {{clientName}}, hai un allenamento programmato per oggi. Preparati!', 'reminder', '/my-workout', 'normal'),
('session_completed', 'Sessione completata!', 'Complimenti {{clientName}}! Hai completato la sessione di allenamento. +{{xp}} XP guadagnati!', 'achievement', '/my-workout', 'normal'),
('session_skipped', 'Sessione saltata', '{{clientName}}, la tua sessione e stata segnata come saltata. Non demordere, domani si riparte!', 'info', '/my-workout', 'low'),

-- Check-in & Readiness
('checkin_reminder', 'Check-in giornaliero', 'Buongiorno {{clientName}}! Ricorda di compilare il tuo check-in giornaliero.', 'reminder', '/checkin', 'normal'),

-- Programmi
('program_assigned', 'Nuovo programma assegnato', '{{trainerName}} ti ha assegnato un nuovo programma: "{{programName}}". Vai a scoprirlo!', 'info', '/my-workout', 'high'),
('program_completed', 'Programma completato!', 'Hai completato il programma "{{programName}}"! Fantastico lavoro!', 'achievement', '/my-progress', 'high'),

-- Gamification
('achievement_unlocked', 'Nuovo achievement!', 'Hai sbloccato l\'achievement "{{achievementName}}"! +{{xp}} XP guadagnati!', 'achievement', '/gamification', 'normal'),
('title_unlocked', 'Nuovo titolo sbloccato!', 'Hai sbloccato il titolo "{{titleName}}"! Vai ai titoli per equipaggiarlo.', 'achievement', '/titles', 'high'),
('level_up', 'Level Up!', 'Complimenti {{clientName}}! Sei salito al livello {{level}}!', 'achievement', '/gamification', 'high'),
('challenge_started', 'Nuova sfida disponibile', 'Una nuova sfida e iniziata: "{{challengeName}}". Partecipa ora!', 'info', '/challenges', 'normal'),
('challenge_completed', 'Sfida completata!', 'Hai completato la sfida "{{challengeName}}"! +{{xp}} XP guadagnati!', 'achievement', '/challenges', 'high'),

-- Appuntamenti
('appointment_created', 'Appuntamento confermato', 'Il tuo appuntamento con {{trainerName}} e confermato per {{date}} alle {{time}}.', 'info', '/calendar', 'normal'),
('appointment_reminder', 'Appuntamento tra poco', 'Reminder: hai un appuntamento con {{trainerName}} tra 1 ora.', 'reminder', '/calendar', 'high'),
('appointment_cancelled', 'Appuntamento cancellato', 'L\'appuntamento del {{date}} alle {{time}} e stato cancellato.', 'warning', '/calendar', 'normal'),

-- Nutrizione
('meal_plan_assigned', 'Nuovo piano alimentare', '{{trainerName}} ti ha assegnato un nuovo piano alimentare: "{{planName}}".', 'info', '/nutrition', 'normal'),

-- Community
('new_post', 'Nuovo post in community', '{{authorName}} ha pubblicato un nuovo post nella community.', 'info', '/community', 'low'),
('post_comment', 'Nuovo commento', '{{authorName}} ha commentato il tuo post.', 'info', '/community', 'low'),

-- Abbonamento
('subscription_expiring', 'Abbonamento in scadenza', 'Il tuo abbonamento scade tra {{days}} giorni. Rinnova per continuare.', 'warning', '/settings', 'high'),
('subscription_expired', 'Abbonamento scaduto', 'Il tuo abbonamento e scaduto. Rinnova per continuare ad accedere.', 'warning', '/settings', 'high')

ON DUPLICATE KEY UPDATE title = VALUES(title), message = VALUES(message);
