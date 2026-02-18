-- ============================================================
-- Seed Data: Titoli Gamification Pre-Configurati
-- Piano Integrazione - Piattaforma SaaS PT
-- ============================================================
-- Tabella: achievement_titles
-- Le colonne exercise_id sono NULL inizialmente.
-- Dopo l'inserimento, aggiornare con gli ID reali degli esercizi.
-- NOTA: Sostituire il tenant_id (1) con il vostro ID tenant.
-- ============================================================

-- ============================================================
-- PANCA PIANA - Titoli Forza (strength / weight_kg)
-- ============================================================
INSERT INTO achievement_titles (tenant_id, title_name, title_description, category, exercise_id, metric_type, threshold_value, rarity, sort_order, is_active, created_at) VALUES
(1, 'Principiante della Panca', 'Hai sollevato 60kg in panca piana', 'strength', NULL, 'weight_kg', 60, 'common', 1, 1, NOW()),
(1, 'Apprendista della Panca', 'Hai sollevato 80kg in panca piana', 'strength', NULL, 'weight_kg', 80, 'common', 2, 1, NOW()),
(1, 'Guerriero della Panca', 'Hai sollevato 100kg in panca piana - Un quintale!', 'strength', NULL, 'weight_kg', 100, 'uncommon', 3, 1, NOW()),
(1, 'Cavaliere della Panca', 'Hai superato i 120kg in panca piana', 'strength', NULL, 'weight_kg', 120, 'rare', 4, 1, NOW()),
(1, 'Titano della Panca', 'Hai raggiunto 140kg in panca piana', 'strength', NULL, 'weight_kg', 140, 'epic', 5, 1, NOW()),
(1, 'Re della Panca', 'Hai superato i 160kg - Sei un mostro!', 'strength', NULL, 'weight_kg', 160, 'epic', 6, 1, NOW()),
(1, 'Leggenda della Panca', '180kg in panca piana - Leggendario!', 'strength', NULL, 'weight_kg', 180, 'legendary', 7, 1, NOW());

-- ============================================================
-- SQUAT - Titoli Forza (strength / weight_kg)
-- ============================================================
INSERT INTO achievement_titles (tenant_id, title_name, title_description, category, exercise_id, metric_type, threshold_value, rarity, sort_order, is_active, created_at) VALUES
(1, 'Principiante dello Squat', 'Hai squattato 80kg', 'strength', NULL, 'weight_kg', 80, 'common', 1, 1, NOW()),
(1, 'Apprendista dello Squat', 'Hai squattato 100kg - Un quintale sulle spalle!', 'strength', NULL, 'weight_kg', 100, 'common', 2, 1, NOW()),
(1, 'Guerriero dello Squat', 'Hai superato i 120kg nello squat', 'strength', NULL, 'weight_kg', 120, 'uncommon', 3, 1, NOW()),
(1, 'Cavaliere dello Squat', 'Hai raggiunto 140kg nello squat', 'strength', NULL, 'weight_kg', 140, 'rare', 4, 1, NOW()),
(1, 'Titano dello Squat', '160kg nello squat - Gambe d''acciaio!', 'strength', NULL, 'weight_kg', 160, 'epic', 5, 1, NOW()),
(1, 'Re dello Squat', '180kg nello squat - Dominante!', 'strength', NULL, 'weight_kg', 180, 'epic', 6, 1, NOW()),
(1, 'Leggenda dello Squat', '200kg nello squat - Sei immortale!', 'strength', NULL, 'weight_kg', 200, 'legendary', 7, 1, NOW());

-- ============================================================
-- STACCO DA TERRA - Titoli Forza (strength / weight_kg)
-- ============================================================
INSERT INTO achievement_titles (tenant_id, title_name, title_description, category, exercise_id, metric_type, threshold_value, rarity, sort_order, is_active, created_at) VALUES
(1, 'Principiante dello Stacco', 'Hai staccato 100kg da terra', 'strength', NULL, 'weight_kg', 100, 'common', 1, 1, NOW()),
(1, 'Apprendista dello Stacco', 'Hai staccato 120kg da terra', 'strength', NULL, 'weight_kg', 120, 'common', 2, 1, NOW()),
(1, 'Guerriero dello Stacco', 'Hai superato i 140kg nello stacco', 'strength', NULL, 'weight_kg', 140, 'uncommon', 3, 1, NOW()),
(1, 'Cavaliere dello Stacco', '160kg nello stacco - Schiena d''acciaio!', 'strength', NULL, 'weight_kg', 160, 'rare', 4, 1, NOW()),
(1, 'Titano dello Stacco', '180kg nello stacco - Forza brutale!', 'strength', NULL, 'weight_kg', 180, 'epic', 5, 1, NOW()),
(1, 'Re dello Stacco', '200kg nello stacco - Due quintali!', 'strength', NULL, 'weight_kg', 200, 'epic', 6, 1, NOW()),
(1, 'Leggenda dello Stacco', '220kg nello stacco - Inarrestabile!', 'strength', NULL, 'weight_kg', 220, 'legendary', 7, 1, NOW());

-- ============================================================
-- CONSISTENZA - Titoli Costanza (consistency / consecutive_days)
-- ============================================================
INSERT INTO achievement_titles (tenant_id, title_name, title_description, category, exercise_id, metric_type, threshold_value, rarity, sort_order, is_active, created_at) VALUES
(1, 'Prima Settimana', '7 giorni consecutivi di allenamento', 'consistency', NULL, 'consecutive_days', 7, 'common', 1, 1, NOW()),
(1, 'Due Settimane di Fuoco', '14 giorni consecutivi - Non ti fermi piu!', 'consistency', NULL, 'consecutive_days', 14, 'common', 2, 1, NOW()),
(1, 'Un Mese di Ferro', '30 giorni consecutivi - Un mese intero!', 'consistency', NULL, 'consecutive_days', 30, 'uncommon', 3, 1, NOW()),
(1, 'Trimestre d''Acciaio', '90 giorni consecutivi - 3 mesi di dedizione', 'consistency', NULL, 'consecutive_days', 90, 'rare', 4, 1, NOW()),
(1, 'Sei Mesi di Gloria', '180 giorni consecutivi - Mezzo anno!', 'consistency', NULL, 'consecutive_days', 180, 'epic', 5, 1, NOW()),
(1, 'Un Anno Inarrestabile', '365 giorni consecutivi - Un anno intero! Leggendario!', 'consistency', NULL, 'consecutive_days', 365, 'legendary', 6, 1, NOW());

-- ============================================================
-- TRASFORMAZIONE - Titoli Perdita Peso
-- ============================================================
INSERT INTO achievement_titles (tenant_id, title_name, title_description, category, exercise_id, metric_type, threshold_value, rarity, sort_order, is_active, created_at) VALUES
(1, 'Primo Passo', 'Hai perso 5kg - Il viaggio inizia!', 'transformation', NULL, 'weight_loss', 5, 'common', 1, 1, NOW()),
(1, 'Trasformazione in Corso', 'Hai perso 10kg - Grande risultato!', 'transformation', NULL, 'weight_loss', 10, 'uncommon', 2, 1, NOW()),
(1, 'Metamorfosi', 'Hai perso 15kg - Trasformazione incredibile!', 'transformation', NULL, 'weight_loss', 15, 'rare', 3, 1, NOW()),
(1, 'Rinascita Totale', 'Hai perso 20kg - Sei una persona nuova!', 'transformation', NULL, 'weight_loss', 20, 'epic', 4, 1, NOW()),
(1, 'Fenice', 'Hai perso 30kg - Rinato dalle ceneri!', 'transformation', NULL, 'weight_loss', 30, 'legendary', 5, 1, NOW());

-- ============================================================
-- TRASFORMAZIONE - Titoli Aumento Massa
-- ============================================================
INSERT INTO achievement_titles (tenant_id, title_name, title_description, category, exercise_id, metric_type, threshold_value, rarity, sort_order, is_active, created_at) VALUES
(1, 'In Crescita', 'Hai guadagnato 3kg di massa', 'transformation', NULL, 'weight_gain', 3, 'common', 6, 1, NOW()),
(1, 'Bulk Mode', 'Hai guadagnato 5kg - Fase di massa!', 'transformation', NULL, 'weight_gain', 5, 'uncommon', 7, 1, NOW()),
(1, 'Costruttore', 'Hai guadagnato 8kg - Stai costruendo un fisico!', 'transformation', NULL, 'weight_gain', 8, 'rare', 8, 1, NOW()),
(1, 'Macchina da Guerra', 'Hai guadagnato 10kg - Impressionante!', 'transformation', NULL, 'weight_gain', 10, 'epic', 9, 1, NOW());

-- ============================================================
-- OPZIONALE: Aggiornare exercise_id dopo aver creato gli esercizi
-- Eseguire queste query DOPO aver popolato la tabella exercises
-- ============================================================
-- UPDATE achievement_titles SET exercise_id = (SELECT id FROM exercises WHERE name = 'Panca Piana' AND tenant_id = 1 LIMIT 1) WHERE tenant_id = 1 AND title_name LIKE '%Panca%';
-- UPDATE achievement_titles SET exercise_id = (SELECT id FROM exercises WHERE name = 'Squat' AND tenant_id = 1 LIMIT 1) WHERE tenant_id = 1 AND title_name LIKE '%Squat%';
-- UPDATE achievement_titles SET exercise_id = (SELECT id FROM exercises WHERE name = 'Stacco da Terra' AND tenant_id = 1 LIMIT 1) WHERE tenant_id = 1 AND title_name LIKE '%Stacco%';

-- ============================================================
-- Totale: 7 + 7 + 7 + 6 + 5 + 4 = 36 titoli pre-configurati
-- ============================================================
