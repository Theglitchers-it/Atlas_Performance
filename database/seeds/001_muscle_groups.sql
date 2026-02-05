-- =====================================================
-- SEED: Gruppi Muscolari
-- =====================================================

INSERT INTO muscle_groups (name, name_it, category, icon) VALUES
-- Upper Body
('Chest', 'Petto', 'upper', 'chest'),
('Back', 'Schiena', 'upper', 'back'),
('Shoulders', 'Spalle', 'upper', 'shoulders'),
('Biceps', 'Bicipiti', 'upper', 'biceps'),
('Triceps', 'Tricipiti', 'upper', 'triceps'),
('Forearms', 'Avambracci', 'upper', 'forearms'),
('Traps', 'Trapezi', 'upper', 'traps'),
('Lats', 'Dorsali', 'upper', 'lats'),

-- Lower Body
('Quadriceps', 'Quadricipiti', 'lower', 'quads'),
('Hamstrings', 'Femorali', 'lower', 'hamstrings'),
('Glutes', 'Glutei', 'lower', 'glutes'),
('Calves', 'Polpacci', 'lower', 'calves'),
('Hip Flexors', 'Flessori Anca', 'lower', 'hip-flexors'),
('Adductors', 'Adduttori', 'lower', 'adductors'),

-- Core
('Abs', 'Addominali', 'core', 'abs'),
('Obliques', 'Obliqui', 'core', 'obliques'),
('Lower Back', 'Lombari', 'core', 'lower-back'),

-- Full Body
('Full Body', 'Tutto il Corpo', 'full_body', 'full-body');
