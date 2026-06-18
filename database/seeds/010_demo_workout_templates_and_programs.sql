-- Seed 010: 8 workout templates riusabili (libreria trainer) + 3 schede demo assegnate
-- Per tenant demo (Demo PT Studio) 00000000-0000-0000-0000-000000000001
-- Creati da personaltrainer@demo.local (user_id=3)

SET @TENANT := '00000000-0000-0000-0000-000000000001';
SET @TRAINER := 3;

-- =========================================================
-- LIBRERIA TEMPLATES (8 sessioni riusabili)
-- =========================================================

-- ===== Filosofia 1: FULL BODY (3 templates a rotazione) =====

INSERT INTO workout_templates (tenant_id, name, description, category, difficulty, estimated_duration_min, target_muscles, is_template, is_active, created_by) VALUES
(@TENANT, 'Full Body A — Spinta', 'Sessione full body focus spinta superiore e gambe. Ideale per principianti.', 'Forza generale', 'beginner', 55, JSON_ARRAY('petto','quadricipiti','spalle'), 1, 1, @TRAINER),
(@TENANT, 'Full Body B — Tirata', 'Sessione full body focus tirata superiore e posteriori coscia.', 'Forza generale', 'beginner', 55, JSON_ARRAY('dorsali','bicipiti','femorali'), 1, 1, @TRAINER),
(@TENANT, 'Full Body C — Misto', 'Sessione full body mista con focus core e mobilità.', 'Forza generale', 'beginner', 50, JSON_ARRAY('full body','core'), 1, 1, @TRAINER);

SET @FB_A := (SELECT id FROM workout_templates WHERE name='Full Body A — Spinta' AND tenant_id=@TENANT);
SET @FB_B := (SELECT id FROM workout_templates WHERE name='Full Body B — Tirata' AND tenant_id=@TENANT);
SET @FB_C := (SELECT id FROM workout_templates WHERE name='Full Body C — Misto' AND tenant_id=@TENANT);

-- Esercizi Full Body A — Spinta (Goblet squat, Panca manubri, Military, Plank)
INSERT INTO workout_template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, weight_type, rest_seconds, notes, is_warmup) VALUES
(@FB_A, 48, 1, 2, 10, 12, 'bodyweight', 60, 'Riscaldamento articolare', 1),
(@FB_A, 48, 2, 3, 10, 12, 'fixed', 90, 'Goblet Squat — focus tecnica', 0),
(@FB_A, 4,  3, 3,  8, 10, 'fixed', 90, 'Panca con manubri — controllo discesa', 0),
(@FB_A, 21, 4, 3,  8, 10, 'fixed', 90, 'Military Press', 0),
(@FB_A, 43, 5, 3, 12, 15, 'fixed', 60, 'Leg Press — pompaggio finale gambe', 0),
(@FB_A, 62, 6, 3, 30, 45, 'bodyweight', 45, 'Plank (secondi)', 0);

-- Esercizi Full Body B — Tirata (Stacco rumeno, Trazioni assistite, Rematore manubrio, Curl)
INSERT INTO workout_template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, weight_type, rest_seconds, notes, is_warmup) VALUES
(@FB_B, 12,  1, 2,  8, 10, 'fixed', 90, 'Stacco Rumeno — riscaldamento progressivo', 1),
(@FB_B, 12,  2, 4,  6,  8, 'fixed', 120, 'Stacco Rumeno — forza posteriore catena', 0),
(@FB_B, 17,  3, 3,  6, 10, 'bodyweight', 90, 'Trazioni (o lat machine se non riesce)', 0),
(@FB_B, 14,  4, 3, 10, 12, 'fixed', 75, 'Rematore con manubrio — controllato', 0),
(@FB_B, 49,  5, 3, 12, 15, 'fixed', 60, 'Leg Curl sdraiato', 0),
(@FB_B, 30,  6, 3, 10, 12, 'fixed', 60, 'Curl con manubri', 0);

-- Esercizi Full Body C — Misto (Front squat, Push-up, Pulley, Plank laterale)
INSERT INTO workout_template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, weight_type, rest_seconds, notes, is_warmup) VALUES
(@FB_C, 42,  1, 4,  6,  8, 'fixed', 120, 'Front Squat — core attivo', 0),
(@FB_C, 9,   2, 3, 10, 15, 'bodyweight', 60, 'Piegamenti sulle braccia', 0),
(@FB_C, 16,  3, 3, 10, 12, 'fixed', 75, 'Pulley basso', 0),
(@FB_C, 47,  4, 3, 10, 10, 'bodyweight', 75, 'Bulgarian Split Squat (per gamba)', 0),
(@FB_C, 63,  5, 3, 30, 45, 'bodyweight', 45, 'Side Plank (sec per lato)', 0);

-- ===== Filosofia 2: PUSH / PULL / LEGS (3 templates) =====

INSERT INTO workout_templates (tenant_id, name, description, category, difficulty, estimated_duration_min, target_muscles, is_template, is_active, created_by) VALUES
(@TENANT, 'Push Day — Spinta', 'Sessione spinta: petto, spalle, tricipiti. Volume medio-alto.', 'Ipertrofia', 'intermediate', 75, JSON_ARRAY('petto','spalle','tricipiti'), 1, 1, @TRAINER),
(@TENANT, 'Pull Day — Tirata', 'Sessione tirata: dorso, bicipiti, posteriori spalla.', 'Ipertrofia', 'intermediate', 75, JSON_ARRAY('dorsali','bicipiti','trapezi'), 1, 1, @TRAINER),
(@TENANT, 'Legs Day — Gambe', 'Sessione gambe completa: quadricipiti, femorali, glutei, polpacci.', 'Ipertrofia', 'intermediate', 80, JSON_ARRAY('quadricipiti','femorali','glutei','polpacci'), 1, 1, @TRAINER);

SET @PUSH := (SELECT id FROM workout_templates WHERE name='Push Day — Spinta' AND tenant_id=@TENANT);
SET @PULL := (SELECT id FROM workout_templates WHERE name='Pull Day — Tirata' AND tenant_id=@TENANT);
SET @LEGS := (SELECT id FROM workout_templates WHERE name='Legs Day — Gambe' AND tenant_id=@TENANT);

-- Push Day
INSERT INTO workout_template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, weight_type, rest_seconds, notes, is_warmup) VALUES
(@PUSH, 1,  1, 4,  6,  8, 'fixed', 150, 'Panca piana bilanciere — esercizio principale', 0),
(@PUSH, 2,  2, 3,  8, 10, 'fixed', 120, 'Panca inclinata bilanciere', 0),
(@PUSH, 21, 3, 4,  6,  8, 'fixed', 120, 'Military Press', 0),
(@PUSH, 23, 4, 4, 12, 15, 'fixed', 60, 'Alzate laterali — controllate', 0),
(@PUSH, 35, 5, 3, 10, 12, 'fixed', 75, 'French Press', 0),
(@PUSH, 36, 6, 3, 12, 15, 'fixed', 60, 'Pushdown ai cavi — finitura tricipiti', 0);

-- Pull Day
INSERT INTO workout_template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, weight_type, rest_seconds, notes, is_warmup) VALUES
(@PULL, 11, 1, 4,  5,  6, 'fixed', 180, 'Stacco da terra — esercizio principale', 0),
(@PULL, 17, 2, 4,  6, 10, 'bodyweight', 120, 'Trazioni alla sbarra (zavorrate se possibile)', 0),
(@PULL, 13, 3, 4,  8, 10, 'fixed', 90, 'Rematore con bilanciere', 0),
(@PULL, 16, 4, 3, 10, 12, 'fixed', 75, 'Pulley basso', 0),
(@PULL, 26, 5, 3, 12, 15, 'fixed', 60, 'Face Pull — posteriori spalla', 0),
(@PULL, 29, 6, 4, 10, 12, 'fixed', 75, 'Curl con bilanciere', 0),
(@PULL, 31, 7, 3, 12, 15, 'fixed', 60, 'Curl a martello — brachiale', 0);

-- Legs Day
INSERT INTO workout_template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, weight_type, rest_seconds, notes, is_warmup) VALUES
(@LEGS, 41, 1, 5,  5,  6, 'fixed', 180, 'Squat con bilanciere — esercizio principale', 0),
(@LEGS, 12, 2, 4,  8, 10, 'fixed', 120, 'Stacco Rumeno', 0),
(@LEGS, 43, 3, 4, 10, 12, 'fixed', 90, 'Leg Press', 0),
(@LEGS, 49, 4, 4, 10, 12, 'fixed', 75, 'Leg Curl sdraiato', 0),
(@LEGS, 45, 5, 3, 12, 15, 'fixed', 60, 'Leg Extension — finitura quadricipite', 0),
(@LEGS, 57, 6, 4, 12, 20, 'fixed', 60, 'Calf Raise in piedi', 0);

-- ===== Filosofia 3: UPPER / LOWER (2 templates) =====

INSERT INTO workout_templates (tenant_id, name, description, category, difficulty, estimated_duration_min, target_muscles, is_template, is_active, created_by) VALUES
(@TENANT, 'Upper Body — Forza', 'Sessione superiore: forza pesante su panca e trazioni, lavoro ipertrofico complementare.', 'Forza+Ipertrofia', 'advanced', 90, JSON_ARRAY('petto','dorso','spalle','braccia'), 1, 1, @TRAINER),
(@TENANT, 'Lower Body — Forza', 'Sessione inferiore: squat e stacco pesanti + lavoro accessorio glutei e core.', 'Forza+Ipertrofia', 'advanced', 90, JSON_ARRAY('quadricipiti','femorali','glutei','core'), 1, 1, @TRAINER);

SET @UPPER := (SELECT id FROM workout_templates WHERE name='Upper Body — Forza' AND tenant_id=@TENANT);
SET @LOWER := (SELECT id FROM workout_templates WHERE name='Lower Body — Forza' AND tenant_id=@TENANT);

-- Upper Body
INSERT INTO workout_template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, weight_type, weight_value, rest_seconds, notes, is_warmup) VALUES
(@UPPER, 1,  1, 5,  3,  5, 'percentage', 85.00, 180, 'Panca piana @85% 1RM — forza pura', 0),
(@UPPER, 17, 2, 5,  3,  5, 'bodyweight', NULL, 180, 'Trazioni zavorrate', 0),
(@UPPER, 5,  3, 4,  8, 10, 'fixed', NULL, 90, 'Panca inclinata con manubri', 0),
(@UPPER, 14, 4, 4,  8, 10, 'fixed', NULL, 90, 'Rematore con manubrio', 0),
(@UPPER, 23, 5, 4, 12, 15, 'fixed', NULL, 60, 'Alzate laterali', 0),
(@UPPER, 33, 6, 3, 12, 15, 'fixed', NULL, 60, 'Curl ai cavi', 0),
(@UPPER, 36, 7, 3, 12, 15, 'fixed', NULL, 60, 'Pushdown ai cavi', 0);

-- Lower Body
INSERT INTO workout_template_exercises (template_id, exercise_id, order_index, sets, reps_min, reps_max, weight_type, weight_value, rest_seconds, notes, is_warmup) VALUES
(@LOWER, 41, 1, 5,  3,  5, 'percentage', 85.00, 180, 'Squat @85% 1RM — forza pura', 0),
(@LOWER, 11, 2, 4,  3,  5, 'percentage', 80.00, 180, 'Stacco da terra @80% 1RM', 0),
(@LOWER, 47, 3, 3,  8, 10, 'fixed', NULL, 90, 'Bulgarian Split Squat (per gamba)', 0),
(@LOWER, 50, 4, 4, 10, 12, 'fixed', NULL, 75, 'Leg Curl seduto', 0),
(@LOWER, 54, 5, 3, 12, 15, 'fixed', NULL, 60, 'Glute Bridge', 0),
(@LOWER, 66, 6, 3, 10, 12, 'bodyweight', NULL, 60, 'Hanging Leg Raise — core', 0);

-- =========================================================
-- SCHEDE ASSEGNATE AI CLIENTI DEMO
-- =========================================================
-- Trovo client_id dei demo
SET @CLIENT_LUCA := (SELECT id FROM clients WHERE email='client@demo.local' AND tenant_id=@TENANT LIMIT 1);
SET @CLIENT_MARCO := (SELECT id FROM clients WHERE email='marco.bianchi@email.it' AND tenant_id=@TENANT LIMIT 1);
SET @CLIENT_OUTSIDER := (SELECT id FROM clients WHERE email='outsider@demo.local' AND tenant_id=@TENANT LIMIT 1);

-- ===== Scheda 1: Full Body Beginner per Luca (8 settimane × 3/sett) =====
INSERT INTO client_programs (tenant_id, client_id, name, description, start_date, end_date, weeks, days_per_week, created_by, status) VALUES
(@TENANT, @CLIENT_LUCA, 'Full Body Beginner 8 sett.',
 'Programma di avvio per principianti. 3 sessioni a settimana a rotazione A-B-C con focus tecnica.',
 CURDATE(), DATE_ADD(CURDATE(), INTERVAL 8 WEEK), 8, 3, @TRAINER, 'active');

SET @PROG_LUCA := LAST_INSERT_ID();

-- Calendario: 8 settimane × 3 giorni (lun/mer/ven = day_of_week 1,3,5) con rotazione A,B,C,A,B,C...
INSERT INTO program_workouts (program_id, template_id, week_number, day_of_week)
SELECT @PROG_LUCA, t.tpl, w.n, d.dow
FROM (SELECT 1 AS n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8) w
CROSS JOIN (SELECT 1 AS dow, 1 AS pos UNION SELECT 3, 2 UNION SELECT 5, 3) d
CROSS JOIN (SELECT @FB_A AS tpl, 1 AS pos UNION SELECT @FB_B, 2 UNION SELECT @FB_C, 3) t
WHERE d.pos = t.pos;

-- ===== Scheda 2: PPL Intermediate per Marco (12 settimane × 6/sett) =====
INSERT INTO client_programs (tenant_id, client_id, name, description, start_date, end_date, weeks, days_per_week, created_by, status) VALUES
(@TENANT, @CLIENT_MARCO, 'Push/Pull/Legs 12 sett. (6 giorni)',
 'Programma ipertrofia intermedio. 6 sessioni a settimana: Push-Pull-Legs ripetuti 2 volte (lun-mar-mer / gio-ven-sab).',
 CURDATE(), DATE_ADD(CURDATE(), INTERVAL 12 WEEK), 12, 6, @TRAINER, 'active');

SET @PROG_MARCO := LAST_INSERT_ID();

-- Calendario: 12 settimane × 6 giorni (lun-sab = 1..6) ciclo Push-Pull-Legs-Push-Pull-Legs
INSERT INTO program_workouts (program_id, template_id, week_number, day_of_week)
SELECT @PROG_MARCO, d.tpl, w.n, d.dow
FROM (SELECT 1 AS n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12) w
CROSS JOIN (
    SELECT 1 AS dow, @PUSH AS tpl UNION ALL
    SELECT 2 AS dow, @PULL AS tpl UNION ALL
    SELECT 3 AS dow, @LEGS AS tpl UNION ALL
    SELECT 4 AS dow, @PUSH AS tpl UNION ALL
    SELECT 5 AS dow, @PULL AS tpl UNION ALL
    SELECT 6 AS dow, @LEGS AS tpl
) d;

-- ===== Scheda 3: Upper/Lower Advanced per Outsider (10 settimane × 4/sett) =====
INSERT INTO client_programs (tenant_id, client_id, name, description, start_date, end_date, weeks, days_per_week, created_by, status) VALUES
(@TENANT, @CLIENT_OUTSIDER, 'Upper/Lower Forza+Ipertrofia 10 sett.',
 'Programma avanzato 4 sessioni/settimana. Lavoro pesante su squat/panca/stacco + accessori ipertrofici.',
 CURDATE(), DATE_ADD(CURDATE(), INTERVAL 10 WEEK), 10, 4, @TRAINER, 'active');

SET @PROG_OUT := LAST_INSERT_ID();

-- Calendario: 10 settimane × 4 giorni (lun/mar/gio/ven = 1,2,4,5) ciclo Upper-Lower-Upper-Lower
INSERT INTO program_workouts (program_id, template_id, week_number, day_of_week)
SELECT @PROG_OUT, d.tpl, w.n, d.dow
FROM (SELECT 1 AS n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) w
CROSS JOIN (
    SELECT 1 AS dow, @UPPER AS tpl UNION ALL
    SELECT 2 AS dow, @LOWER AS tpl UNION ALL
    SELECT 4 AS dow, @UPPER AS tpl UNION ALL
    SELECT 5 AS dow, @LOWER AS tpl
) d;

-- =========================================================
-- RIEPILOGO
-- =========================================================
SELECT 'TEMPLATES CREATI' AS info;
SELECT id, name, category, difficulty FROM workout_templates WHERE tenant_id = @TENANT ORDER BY id;

SELECT 'SCHEDE ASSEGNATE' AS info;
SELECT cp.id, cp.name, CONCAT(c.first_name, ' ', c.last_name) AS cliente, cp.weeks, cp.days_per_week, cp.status
FROM client_programs cp
INNER JOIN clients c ON c.id = cp.client_id
WHERE cp.tenant_id = @TENANT ORDER BY cp.id DESC LIMIT 5;

SELECT 'WORKOUT PIANIFICATI PER PROGRAMMA' AS info;
SELECT cp.name AS programma, COUNT(pw.id) AS sessioni_totali
FROM client_programs cp
LEFT JOIN program_workouts pw ON pw.program_id = cp.id
WHERE cp.tenant_id = @TENANT
GROUP BY cp.id, cp.name
ORDER BY cp.id DESC LIMIT 5;
