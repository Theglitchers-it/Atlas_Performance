-- Seed 011: 3 piani alimentari demo (Cut / Maintain / Bulk) + libreria foods base
-- Tenant: Demo PT Studio (00000000-0000-0000-0000-000000000001)

SET @TENANT := '00000000-0000-0000-0000-000000000001';
SET @TRAINER := 3;

-- =========================================================
-- LIBRERIA FOODS BASE (riusabili nel diario alimentare clienti)
-- =========================================================
INSERT IGNORE INTO foods (tenant_id, name, default_unit, default_quantity, calories_per_100, protein_per_100, carbs_per_100, fat_per_100, fiber_per_100, is_preset, created_by) VALUES
(@TENANT, 'Avena (fiocchi)', 'g', 100, 372, 13.50, 60.00, 7.00, 10.00, 1, @TRAINER),
(@TENANT, 'Albumi liquidi', 'ml', 100, 47, 10.50, 0.50, 0.20, 0, 1, @TRAINER),
(@TENANT, 'Uova intere', 'g', 100, 143, 12.60, 0.70, 9.50, 0, 1, @TRAINER),
(@TENANT, 'Petto di pollo', 'g', 100, 110, 23.00, 0, 1.50, 0, 1, @TRAINER),
(@TENANT, 'Salmone fresco', 'g', 100, 208, 20.40, 0, 13.40, 0, 1, @TRAINER),
(@TENANT, 'Tonno al naturale', 'g', 100, 116, 25.50, 0, 1.00, 0, 1, @TRAINER),
(@TENANT, 'Manzo magro', 'g', 100, 158, 26.10, 0, 5.50, 0, 1, @TRAINER),
(@TENANT, 'Riso basmati (cotto)', 'g', 100, 130, 2.70, 28.00, 0.30, 0.40, 1, @TRAINER),
(@TENANT, 'Pasta integrale (cotta)', 'g', 100, 124, 5.30, 25.00, 0.90, 3.50, 1, @TRAINER),
(@TENANT, 'Patata dolce', 'g', 100, 86, 1.60, 20.10, 0.10, 3.00, 1, @TRAINER),
(@TENANT, 'Pane integrale', 'g', 100, 240, 9.00, 41.00, 4.40, 7.00, 1, @TRAINER),
(@TENANT, 'Yogurt greco 0%', 'g', 100, 59, 10.30, 3.60, 0.40, 0, 1, @TRAINER),
(@TENANT, 'Latte parzialmente scremato', 'ml', 100, 46, 3.30, 4.90, 1.60, 0, 1, @TRAINER),
(@TENANT, 'Mandorle', 'g', 100, 579, 21.20, 21.60, 49.90, 12.50, 1, @TRAINER),
(@TENANT, 'Noci', 'g', 100, 654, 15.20, 13.70, 65.20, 6.70, 1, @TRAINER),
(@TENANT, 'Olio extravergine oliva', 'ml', 10, 884, 0, 0, 100.00, 0, 1, @TRAINER),
(@TENANT, 'Avocado', 'g', 100, 160, 2.00, 8.50, 14.70, 6.70, 1, @TRAINER),
(@TENANT, 'Banana', 'g', 100, 89, 1.10, 22.80, 0.30, 2.60, 1, @TRAINER),
(@TENANT, 'Mela', 'g', 100, 52, 0.30, 13.80, 0.20, 2.40, 1, @TRAINER),
(@TENANT, 'Mirtilli', 'g', 100, 57, 0.70, 14.50, 0.30, 2.40, 1, @TRAINER),
(@TENANT, 'Spinaci', 'g', 100, 23, 2.90, 3.60, 0.40, 2.20, 1, @TRAINER),
(@TENANT, 'Broccoli', 'g', 100, 34, 2.80, 7.00, 0.40, 2.60, 1, @TRAINER),
(@TENANT, 'Whey protein isolate', 'g', 30, 380, 80.00, 5.00, 3.00, 0, 1, @TRAINER),
(@TENANT, 'Burro di arachidi naturale', 'g', 100, 588, 25.00, 20.00, 50.00, 6.00, 1, @TRAINER);

-- =========================================================
-- CLIENTI DEMO (recupero ID)
-- =========================================================
SET @CLIENT_LUCA := (SELECT id FROM clients WHERE email='client@demo.local' AND tenant_id=@TENANT LIMIT 1);
SET @CLIENT_MARCO := (SELECT id FROM clients WHERE email='marco.bianchi@email.it' AND tenant_id=@TENANT LIMIT 1);
SET @CLIENT_OUTSIDER := (SELECT id FROM clients WHERE email='outsider@demo.local' AND tenant_id=@TENANT LIMIT 1);

-- =========================================================
-- PIANO 1: CUT PULITO 1800 kcal — per Luca (definizione/beginner)
-- =========================================================
INSERT INTO meal_plans (tenant_id, client_id, name, start_date, end_date, target_calories, target_protein_g, target_carbs_g, target_fat_g, notes, created_by, status) VALUES
(@TENANT, @CLIENT_LUCA, 'Cut Pulito 1800 kcal — 4 settimane',
 CURDATE(), DATE_ADD(CURDATE(), INTERVAL 4 WEEK),
 1800, 160.00, 170.00, 55.00,
 'Deficit calorico moderato (~400 kcal/die). Alto apporto proteico per preservare massa magra. 5 pasti/die.',
 @TRAINER, 'active');

SET @PLAN_LUCA := LAST_INSERT_ID();

-- Giorno tipo (replicato 7 giorni)
INSERT INTO meal_plan_days (meal_plan_id, day_number, day_name, notes) VALUES
(@PLAN_LUCA, 1, 'Giorno tipo (Lun-Dom)', 'Schema base ripetuto tutti i giorni. Variazioni concesse mantenendo macros.');
SET @DAY_LUCA := LAST_INSERT_ID();

-- Colazione (450 kcal)
INSERT INTO meals (plan_day_id, meal_type, name, order_index, notes) VALUES
(@DAY_LUCA, 'breakfast', 'Colazione', 1, 'Entro 30 min dal risveglio');
SET @M := LAST_INSERT_ID();
INSERT INTO meal_items (meal_id, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g) VALUES
(@M, 'Avena (fiocchi)', 60, 'g', 223, 8.10, 36.00, 4.20, 6.00),
(@M, 'Albumi liquidi', 200, 'ml', 94, 21.00, 1.00, 0.40, 0),
(@M, 'Mirtilli', 100, 'g', 57, 0.70, 14.50, 0.30, 2.40),
(@M, 'Mandorle', 15, 'g', 87, 3.20, 3.20, 7.50, 1.90);

-- Spuntino mattina (180 kcal)
INSERT INTO meals (plan_day_id, meal_type, name, order_index, notes) VALUES
(@DAY_LUCA, 'snack', 'Spuntino mattina', 2, '');
SET @M := LAST_INSERT_ID();
INSERT INTO meal_items (meal_id, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g) VALUES
(@M, 'Yogurt greco 0%', 200, 'g', 118, 20.60, 7.20, 0.80, 0),
(@M, 'Mela', 150, 'g', 78, 0.45, 20.70, 0.30, 3.60);

-- Pranzo (520 kcal)
INSERT INTO meals (plan_day_id, meal_type, name, order_index, notes) VALUES
(@DAY_LUCA, 'lunch', 'Pranzo', 3, '');
SET @M := LAST_INSERT_ID();
INSERT INTO meal_items (meal_id, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g) VALUES
(@M, 'Petto di pollo', 150, 'g', 165, 34.50, 0, 2.30, 0),
(@M, 'Riso basmati (cotto)', 180, 'g', 234, 4.90, 50.40, 0.50, 0.70),
(@M, 'Broccoli', 200, 'g', 68, 5.60, 14.00, 0.80, 5.20),
(@M, 'Olio extravergine oliva', 5, 'ml', 44, 0, 0, 5.00, 0);

-- Spuntino pre-workout (200 kcal)
INSERT INTO meals (plan_day_id, meal_type, name, order_index, notes) VALUES
(@DAY_LUCA, 'snack', 'Pre-workout', 4, '60-90 min prima allenamento');
SET @M := LAST_INSERT_ID();
INSERT INTO meal_items (meal_id, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g) VALUES
(@M, 'Pane integrale', 50, 'g', 120, 4.50, 20.50, 2.20, 3.50),
(@M, 'Whey protein isolate', 20, 'g', 76, 16.00, 1.00, 0.60, 0);

-- Cena (450 kcal)
INSERT INTO meals (plan_day_id, meal_type, name, order_index, notes) VALUES
(@DAY_LUCA, 'dinner', 'Cena', 5, 'Almeno 2h prima di dormire');
SET @M := LAST_INSERT_ID();
INSERT INTO meal_items (meal_id, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g) VALUES
(@M, 'Salmone fresco', 150, 'g', 312, 30.60, 0, 20.10, 0),
(@M, 'Spinaci', 200, 'g', 46, 5.80, 7.20, 0.80, 4.40),
(@M, 'Patata dolce', 100, 'g', 86, 1.60, 20.10, 0.10, 3.00),
(@M, 'Olio extravergine oliva', 3, 'ml', 27, 0, 0, 3.00, 0);

-- =========================================================
-- PIANO 2: MAINTAIN 2400 kcal — per Marco (mantenimento ipertrofia)
-- =========================================================
INSERT INTO meal_plans (tenant_id, client_id, name, start_date, end_date, target_calories, target_protein_g, target_carbs_g, target_fat_g, notes, created_by, status) VALUES
(@TENANT, @CLIENT_MARCO, 'Maintain 2400 kcal — Ipertrofia',
 CURDATE(), DATE_ADD(CURDATE(), INTERVAL 12 WEEK),
 2400, 180.00, 280.00, 70.00,
 'Mantenimento calorico con focus ipertrofia. Distribuzione macros: 30% P, 47% C, 23% F. 5 pasti/die.',
 @TRAINER, 'active');

SET @PLAN_MARCO := LAST_INSERT_ID();

INSERT INTO meal_plan_days (meal_plan_id, day_number, day_name, notes) VALUES
(@PLAN_MARCO, 1, 'Giorno A — Allenamento', 'Giorni di workout (PUSH/PULL/LEGS)'),
(@PLAN_MARCO, 2, 'Giorno B — Riposo', 'Giorni di riposo (carbs ridotti, grassi maggiori)');

SET @DAY_A := (SELECT id FROM meal_plan_days WHERE meal_plan_id=@PLAN_MARCO AND day_number=1);
SET @DAY_B := (SELECT id FROM meal_plan_days WHERE meal_plan_id=@PLAN_MARCO AND day_number=2);

-- DAY A (allenamento) — Colazione 550 kcal
INSERT INTO meals (plan_day_id, meal_type, name, order_index, notes) VALUES (@DAY_A, 'breakfast', 'Colazione', 1, '');
SET @M := LAST_INSERT_ID();
INSERT INTO meal_items (meal_id, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g) VALUES
(@M, 'Avena (fiocchi)', 80, 'g', 297, 10.80, 48.00, 5.60, 8.00),
(@M, 'Uova intere', 100, 'g', 143, 12.60, 0.70, 9.50, 0),
(@M, 'Banana', 120, 'g', 107, 1.30, 27.40, 0.40, 3.10),
(@M, 'Burro di arachidi naturale', 10, 'g', 59, 2.50, 2.00, 5.00, 0.60);

-- DAY A — Pranzo 650 kcal
INSERT INTO meals (plan_day_id, meal_type, name, order_index, notes) VALUES (@DAY_A, 'lunch', 'Pranzo', 2, '');
SET @M := LAST_INSERT_ID();
INSERT INTO meal_items (meal_id, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g) VALUES
(@M, 'Pasta integrale (cotta)', 200, 'g', 248, 10.60, 50.00, 1.80, 7.00),
(@M, 'Manzo magro', 150, 'g', 237, 39.20, 0, 8.30, 0),
(@M, 'Spinaci', 150, 'g', 35, 4.40, 5.40, 0.60, 3.30),
(@M, 'Olio extravergine oliva', 10, 'ml', 88, 0, 0, 10.00, 0);

-- DAY A — Pre-workout 250 kcal
INSERT INTO meals (plan_day_id, meal_type, name, order_index, notes) VALUES (@DAY_A, 'snack', 'Pre-workout', 3, '90 min prima');
SET @M := LAST_INSERT_ID();
INSERT INTO meal_items (meal_id, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g) VALUES
(@M, 'Pane integrale', 80, 'g', 192, 7.20, 32.80, 3.50, 5.60),
(@M, 'Mela', 100, 'g', 52, 0.30, 13.80, 0.20, 2.40);

-- DAY A — Post-workout 280 kcal
INSERT INTO meals (plan_day_id, meal_type, name, order_index, notes) VALUES (@DAY_A, 'snack', 'Post-workout', 4, 'Entro 30 min da fine sessione');
SET @M := LAST_INSERT_ID();
INSERT INTO meal_items (meal_id, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g) VALUES
(@M, 'Whey protein isolate', 40, 'g', 152, 32.00, 2.00, 1.20, 0),
(@M, 'Riso basmati (cotto)', 100, 'g', 130, 2.70, 28.00, 0.30, 0.40);

-- DAY A — Cena 650 kcal
INSERT INTO meals (plan_day_id, meal_type, name, order_index, notes) VALUES (@DAY_A, 'dinner', 'Cena', 5, '');
SET @M := LAST_INSERT_ID();
INSERT INTO meal_items (meal_id, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g) VALUES
(@M, 'Petto di pollo', 180, 'g', 198, 41.40, 0, 2.70, 0),
(@M, 'Patata dolce', 200, 'g', 172, 3.20, 40.20, 0.20, 6.00),
(@M, 'Broccoli', 200, 'g', 68, 5.60, 14.00, 0.80, 5.20),
(@M, 'Avocado', 80, 'g', 128, 1.60, 6.80, 11.80, 5.40);

-- DAY B (riposo) — colazione + 4 pasti più leggeri sui carbs
INSERT INTO meals (plan_day_id, meal_type, name, order_index, notes) VALUES (@DAY_B, 'breakfast', 'Colazione', 1, 'Carbs ridotti vs day A');
SET @M := LAST_INSERT_ID();
INSERT INTO meal_items (meal_id, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g) VALUES
(@M, 'Uova intere', 150, 'g', 215, 18.90, 1.10, 14.30, 0),
(@M, 'Pane integrale', 50, 'g', 120, 4.50, 20.50, 2.20, 3.50),
(@M, 'Avocado', 60, 'g', 96, 1.20, 5.10, 8.80, 4.00);

INSERT INTO meals (plan_day_id, meal_type, name, order_index, notes) VALUES (@DAY_B, 'lunch', 'Pranzo', 2, '');
SET @M := LAST_INSERT_ID();
INSERT INTO meal_items (meal_id, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g) VALUES
(@M, 'Salmone fresco', 180, 'g', 374, 36.70, 0, 24.10, 0),
(@M, 'Riso basmati (cotto)', 120, 'g', 156, 3.20, 33.60, 0.40, 0.50),
(@M, 'Spinaci', 200, 'g', 46, 5.80, 7.20, 0.80, 4.40);

INSERT INTO meals (plan_day_id, meal_type, name, order_index, notes) VALUES (@DAY_B, 'snack', 'Spuntino', 3, '');
SET @M := LAST_INSERT_ID();
INSERT INTO meal_items (meal_id, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g) VALUES
(@M, 'Yogurt greco 0%', 250, 'g', 148, 25.80, 9.00, 1.00, 0),
(@M, 'Mandorle', 30, 'g', 174, 6.40, 6.50, 15.00, 3.80);

INSERT INTO meals (plan_day_id, meal_type, name, order_index, notes) VALUES (@DAY_B, 'dinner', 'Cena', 4, '');
SET @M := LAST_INSERT_ID();
INSERT INTO meal_items (meal_id, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g) VALUES
(@M, 'Manzo magro', 180, 'g', 284, 47.00, 0, 9.90, 0),
(@M, 'Broccoli', 250, 'g', 85, 7.00, 17.50, 1.00, 6.50),
(@M, 'Olio extravergine oliva', 8, 'ml', 71, 0, 0, 8.00, 0);

-- =========================================================
-- PIANO 3: BULK PULITO 3000 kcal — per Outsider (massa/advanced)
-- =========================================================
INSERT INTO meal_plans (tenant_id, client_id, name, start_date, end_date, target_calories, target_protein_g, target_carbs_g, target_fat_g, notes, created_by, status) VALUES
(@TENANT, @CLIENT_OUTSIDER, 'Bulk Pulito 3000 kcal — Massa',
 CURDATE(), DATE_ADD(CURDATE(), INTERVAL 10 WEEK),
 3000, 220.00, 380.00, 80.00,
 'Surplus calorico (~400-500 kcal). 6 pasti/die. Carbs alti pre/post workout. Distribuzione macros: 30% P, 50% C, 20% F.',
 @TRAINER, 'active');

SET @PLAN_OUT := LAST_INSERT_ID();

INSERT INTO meal_plan_days (meal_plan_id, day_number, day_name, notes) VALUES
(@PLAN_OUT, 1, 'Giorno tipo — Upper/Lower', 'Schema base 6 pasti, ripetuto tutti i giorni');
SET @DAY_OUT := LAST_INSERT_ID();

-- Colazione 600 kcal
INSERT INTO meals (plan_day_id, meal_type, name, order_index, notes) VALUES (@DAY_OUT, 'breakfast', 'Colazione', 1, '');
SET @M := LAST_INSERT_ID();
INSERT INTO meal_items (meal_id, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g) VALUES
(@M, 'Avena (fiocchi)', 100, 'g', 372, 13.50, 60.00, 7.00, 10.00),
(@M, 'Uova intere', 150, 'g', 215, 18.90, 1.10, 14.30, 0),
(@M, 'Banana', 120, 'g', 107, 1.30, 27.40, 0.40, 3.10);

-- Spuntino metà mattina 350 kcal
INSERT INTO meals (plan_day_id, meal_type, name, order_index, notes) VALUES (@DAY_OUT, 'snack', 'Metà mattina', 2, '');
SET @M := LAST_INSERT_ID();
INSERT INTO meal_items (meal_id, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g) VALUES
(@M, 'Yogurt greco 0%', 200, 'g', 118, 20.60, 7.20, 0.80, 0),
(@M, 'Burro di arachidi naturale', 30, 'g', 176, 7.50, 6.00, 15.00, 1.80),
(@M, 'Mela', 150, 'g', 78, 0.45, 20.70, 0.30, 3.60);

-- Pranzo 700 kcal
INSERT INTO meals (plan_day_id, meal_type, name, order_index, notes) VALUES (@DAY_OUT, 'lunch', 'Pranzo', 3, '');
SET @M := LAST_INSERT_ID();
INSERT INTO meal_items (meal_id, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g) VALUES
(@M, 'Pasta integrale (cotta)', 250, 'g', 310, 13.30, 62.50, 2.30, 8.80),
(@M, 'Manzo magro', 180, 'g', 284, 47.00, 0, 9.90, 0),
(@M, 'Broccoli', 200, 'g', 68, 5.60, 14.00, 0.80, 5.20),
(@M, 'Olio extravergine oliva', 8, 'ml', 71, 0, 0, 8.00, 0);

-- Pre-workout 380 kcal
INSERT INTO meals (plan_day_id, meal_type, name, order_index, notes) VALUES (@DAY_OUT, 'snack', 'Pre-workout', 4, '60-90 min prima');
SET @M := LAST_INSERT_ID();
INSERT INTO meal_items (meal_id, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g) VALUES
(@M, 'Pane integrale', 100, 'g', 240, 9.00, 41.00, 4.40, 7.00),
(@M, 'Tonno al naturale', 120, 'g', 139, 30.60, 0, 1.20, 0);

-- Post-workout 380 kcal
INSERT INTO meals (plan_day_id, meal_type, name, order_index, notes) VALUES (@DAY_OUT, 'snack', 'Post-workout', 5, 'Entro 30 min');
SET @M := LAST_INSERT_ID();
INSERT INTO meal_items (meal_id, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g) VALUES
(@M, 'Whey protein isolate', 40, 'g', 152, 32.00, 2.00, 1.20, 0),
(@M, 'Riso basmati (cotto)', 180, 'g', 234, 4.90, 50.40, 0.50, 0.70);

-- Cena 600 kcal
INSERT INTO meals (plan_day_id, meal_type, name, order_index, notes) VALUES (@DAY_OUT, 'dinner', 'Cena', 6, '');
SET @M := LAST_INSERT_ID();
INSERT INTO meal_items (meal_id, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, fiber_g) VALUES
(@M, 'Salmone fresco', 200, 'g', 416, 40.80, 0, 26.80, 0),
(@M, 'Patata dolce', 250, 'g', 215, 4.00, 50.30, 0.30, 7.50),
(@M, 'Spinaci', 200, 'g', 46, 5.80, 7.20, 0.80, 4.40);

-- =========================================================
-- RIEPILOGO
-- =========================================================
SELECT 'FOODS LIBRERIA' AS info, COUNT(*) AS count FROM foods WHERE tenant_id=@TENANT;
SELECT 'PIANI CREATI' AS info;
SELECT mp.id, mp.name, CONCAT(c.first_name,' ',c.last_name) AS cliente,
       mp.target_calories, mp.target_protein_g, mp.target_carbs_g, mp.target_fat_g, mp.status
FROM meal_plans mp INNER JOIN clients c ON c.id=mp.client_id
WHERE mp.tenant_id=@TENANT ORDER BY mp.id DESC LIMIT 5;
SELECT 'PASTI PER PIANO' AS info;
SELECT mp.name AS piano, COUNT(DISTINCT mpd.id) AS giorni, COUNT(m.id) AS pasti, COUNT(mi.id) AS alimenti
FROM meal_plans mp
LEFT JOIN meal_plan_days mpd ON mpd.meal_plan_id=mp.id
LEFT JOIN meals m ON m.plan_day_id=mpd.id
LEFT JOIN meal_items mi ON mi.meal_id=m.id
WHERE mp.tenant_id=@TENANT
GROUP BY mp.id, mp.name ORDER BY mp.id DESC LIMIT 5;
