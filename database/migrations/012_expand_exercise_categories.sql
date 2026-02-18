-- =====================================================
-- MIGRATION 012: Espandere ENUM category esercizi
-- Aggiunge: compound, isolation, balance
-- =====================================================

-- 1. Espandi ENUM category
ALTER TABLE exercises MODIFY COLUMN category
    ENUM('strength', 'cardio', 'flexibility', 'plyometric', 'compound', 'isolation', 'balance')
    DEFAULT 'strength';

-- 2. Aggiorna esercizi compound (is_compound = TRUE, attualmente 'strength')
UPDATE exercises SET category = 'compound'
WHERE is_compound = TRUE AND category = 'strength';

-- 3. Aggiorna esercizi isolation (is_compound = FALSE, 'strength', non core)
-- Core resta 'strength' perche' non ha una categoria dedicata
-- Isolation = esercizi monoarticolari di braccia, spalle, gambe
UPDATE exercises SET category = 'isolation'
WHERE is_compound = FALSE
  AND category = 'strength'
  AND name IN (
    'Croci con Manubri',
    'Croci ai Cavi',
    'Chest Press alla Macchina',
    'Alzate Laterali',
    'Alzate Frontali',
    'Alzate a 90',
    'Face Pull',
    'Curl con Bilanciere',
    'Curl con Manubri',
    'Curl a Martello',
    'Curl su Panca Scott',
    'Curl ai Cavi',
    'Curl Concentrato',
    'French Press',
    'Pushdown ai Cavi',
    'Estensioni Tricipiti Sopra la Testa',
    'Dips su Panca',
    'Kick Back',
    'Leg Extension',
    'Leg Curl Sdraiato',
    'Leg Curl Seduto',
    'Hip Thrust',
    'Glute Bridge',
    'Kickback ai Cavi',
    'Calf Raise in Piedi',
    'Calf Raise Seduto',
    'Calf Raise alla Leg Press',
    'Hyperextension'
  );
