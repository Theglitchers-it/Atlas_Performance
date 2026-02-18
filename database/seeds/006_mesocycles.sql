-- =====================================================
-- SEED: Mesocicli di allenamento
-- =====================================================

INSERT INTO mesocycles (name, focus, periodization_type) VALUES
-- Forza
('Forza Massimale', 'strength', 'linear'),
('Forza Esplosiva', 'power', 'undulating'),
('Forza Resistente', 'strength_endurance', 'linear'),

-- Ipertrofia
('Ipertrofia Volume', 'hypertrophy', 'linear'),
('Ipertrofia Intensiva', 'hypertrophy', 'undulating'),
('Ipertrofia Metabolica', 'hypertrophy', 'block'),

-- Dimagrimento
('Dimagrimento Base', 'fat_loss', 'linear'),
('Ricomposizione Corporea', 'body_recomp', 'undulating'),

-- Resistenza
('Resistenza Aerobica', 'endurance', 'linear'),
('Condizionamento Metabolico', 'conditioning', 'undulating'),

-- Periodizzazione
('Preparazione Generale (GPP)', 'general', 'linear'),
('Peaking / Tapering', 'peaking', 'block'),
('Deload / Scarico', 'recovery', 'linear'),

-- Sport-specifico
('Preparazione Atletica', 'athletic', 'block'),
('Pre-Gara', 'competition', 'undulating');
