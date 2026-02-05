-- =====================================================
-- SEED: Titoli Sbloccabili (Nerd/Pop Culture)
-- =====================================================

-- PANCA PIANA (exercise_id da collegare dopo creazione esercizi)
INSERT INTO achievement_titles (tenant_id, exercise_id, title_name, title_description, category, metric_type, threshold_value, rarity, sort_order) VALUES
(NULL, NULL, 'Novizio del Ferro', 'Hai sollevato 60kg in panca piana', 'strength', 'weight_kg', 60, 'common', 1),
(NULL, NULL, 'Guerriero', 'Hai sollevato 80kg in panca piana', 'strength', 'weight_kg', 80, 'common', 2),
(NULL, NULL, 'Tronista', 'Hai sollevato 89kg in panca piana', 'strength', 'weight_kg', 89, 'uncommon', 3),
(NULL, NULL, 'Iron Man', 'Hai sollevato 100kg in panca piana', 'strength', 'weight_kg', 100, 'uncommon', 4),
(NULL, NULL, 'Sayan', 'Hai sollevato 120kg in panca piana', 'strength', 'weight_kg', 120, 'rare', 5),
(NULL, NULL, 'Super Sayan', 'Hai sollevato 140kg in panca piana', 'strength', 'weight_kg', 140, 'epic', 6),
(NULL, NULL, 'Ultra Istinto', 'Hai sollevato 160kg in panca piana', 'strength', 'weight_kg', 160, 'epic', 7),
(NULL, NULL, 'Dio della Panca', 'Hai sollevato 180kg in panca piana', 'strength', 'weight_kg', 180, 'legendary', 8),

-- SQUAT
(NULL, NULL, 'Gambe di Legno', 'Hai sollevato 80kg in squat', 'strength', 'weight_kg', 80, 'common', 10),
(NULL, NULL, 'Centauro', 'Hai sollevato 100kg in squat', 'strength', 'weight_kg', 100, 'common', 11),
(NULL, NULL, 'Hulk Jr', 'Hai sollevato 120kg in squat', 'strength', 'weight_kg', 120, 'uncommon', 12),
(NULL, NULL, 'Titano', 'Hai sollevato 140kg in squat', 'strength', 'weight_kg', 140, 'uncommon', 13),
(NULL, NULL, 'Kratos', 'Hai sollevato 160kg in squat', 'strength', 'weight_kg', 160, 'rare', 14),
(NULL, NULL, 'Atlas', 'Hai sollevato 180kg in squat', 'strength', 'weight_kg', 180, 'epic', 15),
(NULL, NULL, 'Dio dello Squat', 'Hai sollevato 200kg in squat', 'strength', 'weight_kg', 200, 'legendary', 16),

-- STACCO
(NULL, NULL, 'Solleva Pesi', 'Hai sollevato 100kg in stacco', 'strength', 'weight_kg', 100, 'common', 20),
(NULL, NULL, 'Deadlifter', 'Hai sollevato 120kg in stacco', 'strength', 'weight_kg', 120, 'common', 21),
(NULL, NULL, 'Bane', 'Hai sollevato 140kg in stacco', 'strength', 'weight_kg', 140, 'uncommon', 22),
(NULL, NULL, 'Thor', 'Hai sollevato 160kg in stacco', 'strength', 'weight_kg', 160, 'uncommon', 23),
(NULL, NULL, 'Hercules', 'Hai sollevato 180kg in stacco', 'strength', 'weight_kg', 180, 'rare', 24),
(NULL, NULL, 'Eddie Hall Mode', 'Hai sollevato 200kg in stacco', 'strength', 'weight_kg', 200, 'epic', 25),
(NULL, NULL, 'Leggenda', 'Hai sollevato 220kg in stacco', 'strength', 'weight_kg', 220, 'legendary', 26),

-- CONSISTENZA
(NULL, NULL, 'Costante', '7 giorni consecutivi di allenamento', 'consistency', 'consecutive_days', 7, 'common', 30),
(NULL, NULL, 'Macchina', '30 giorni consecutivi di allenamento', 'consistency', 'consecutive_days', 30, 'uncommon', 31),
(NULL, NULL, 'Ossessionato', '90 giorni consecutivi di allenamento', 'consistency', 'consecutive_days', 90, 'rare', 32),
(NULL, NULL, 'Immortale', '365 giorni consecutivi di allenamento', 'consistency', 'consecutive_days', 365, 'legendary', 33),

-- TRASFORMAZIONE (Perdita peso)
(NULL, NULL, 'Prima Metamorfosi', 'Hai perso 5kg', 'transformation', 'weight_loss', 5, 'common', 40),
(NULL, NULL, 'Trasformazione', 'Hai perso 10kg', 'transformation', 'weight_loss', 10, 'uncommon', 41),
(NULL, NULL, 'Rinascita', 'Hai perso 20kg', 'transformation', 'weight_loss', 20, 'rare', 42),
(NULL, NULL, 'Fenice', 'Hai perso 30kg', 'transformation', 'weight_loss', 30, 'epic', 43),

-- TRASFORMAZIONE (Guadagno massa)
(NULL, NULL, 'Bulk Season', 'Hai guadagnato 5kg di massa', 'transformation', 'weight_gain', 5, 'common', 50),
(NULL, NULL, 'Mass Monster', 'Hai guadagnato 10kg di massa', 'transformation', 'weight_gain', 10, 'uncommon', 51),
(NULL, NULL, 'Colosso', 'Hai guadagnato 15kg di massa', 'transformation', 'weight_gain', 15, 'rare', 52),
(NULL, NULL, 'The Rock', 'Hai guadagnato 20kg di massa', 'transformation', 'weight_gain', 20, 'epic', 53);
