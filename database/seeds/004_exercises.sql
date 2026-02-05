-- =====================================================
-- SEED: Esercizi Base (Libreria Predefinita)
-- =====================================================

-- PETTO
INSERT INTO exercises (tenant_id, name, description, category, equipment, difficulty, is_compound, is_custom) VALUES
(NULL, 'Panca Piana con Bilanciere', 'Esercizio fondamentale per il petto', 'strength', '["barbell", "bench"]', 'intermediate', TRUE, FALSE),
(NULL, 'Panca Inclinata con Bilanciere', 'Panca inclinata per parte alta del petto', 'strength', '["barbell", "incline_bench"]', 'intermediate', TRUE, FALSE),
(NULL, 'Panca Declinata con Bilanciere', 'Panca declinata per parte bassa del petto', 'strength', '["barbell", "decline_bench"]', 'intermediate', TRUE, FALSE),
(NULL, 'Panca Piana con Manubri', 'Maggior range di movimento', 'strength', '["dumbbells", "bench"]', 'intermediate', TRUE, FALSE),
(NULL, 'Panca Inclinata con Manubri', 'Inclinata con manubri', 'strength', '["dumbbells", "incline_bench"]', 'intermediate', TRUE, FALSE),
(NULL, 'Croci con Manubri', 'Isolamento petto', 'strength', '["dumbbells", "bench"]', 'beginner', FALSE, FALSE),
(NULL, 'Croci ai Cavi', 'Tensione costante sul petto', 'strength', '["cable_machine"]', 'beginner', FALSE, FALSE),
(NULL, 'Chest Press alla Macchina', 'Push guidato per principianti', 'strength', '["machine"]', 'beginner', FALSE, FALSE),
(NULL, 'Piegamenti sulle Braccia', 'Push up classico', 'strength', '["bodyweight"]', 'beginner', TRUE, FALSE),
(NULL, 'Dips alle Parallele', 'Dip per petto e tricipiti', 'strength', '["parallel_bars"]', 'advanced', TRUE, FALSE),

-- SCHIENA
(NULL, 'Stacco da Terra', 'Esercizio fondamentale per tutta la catena posteriore', 'strength', '["barbell"]', 'advanced', TRUE, FALSE),
(NULL, 'Stacco Rumeno', 'Focus su femorali e glutei', 'strength', '["barbell"]', 'intermediate', TRUE, FALSE),
(NULL, 'Rematore con Bilanciere', 'Row bilanciere per dorsali', 'strength', '["barbell"]', 'intermediate', TRUE, FALSE),
(NULL, 'Rematore con Manubrio', 'Row unilaterale', 'strength', '["dumbbell", "bench"]', 'beginner', TRUE, FALSE),
(NULL, 'Lat Machine', 'Pulldown per dorsali', 'strength', '["cable_machine"]', 'beginner', TRUE, FALSE),
(NULL, 'Pulley Basso', 'Row seduto ai cavi', 'strength', '["cable_machine"]', 'beginner', TRUE, FALSE),
(NULL, 'Trazioni alla Sbarra', 'Pull up classico', 'strength', '["pull_up_bar"]', 'advanced', TRUE, FALSE),
(NULL, 'Trazioni Presa Inversa', 'Chin up per bicipiti e dorsali', 'strength', '["pull_up_bar"]', 'intermediate', TRUE, FALSE),
(NULL, 'T-Bar Row', 'Row con landmine', 'strength', '["barbell", "landmine"]', 'intermediate', TRUE, FALSE),
(NULL, 'Hyperextension', 'Estensioni per lombari', 'strength', '["hyperextension_bench"]', 'beginner', FALSE, FALSE),

-- SPALLE
(NULL, 'Military Press', 'Press sopra la testa con bilanciere', 'strength', '["barbell"]', 'intermediate', TRUE, FALSE),
(NULL, 'Shoulder Press con Manubri', 'Press seduto con manubri', 'strength', '["dumbbells", "bench"]', 'intermediate', TRUE, FALSE),
(NULL, 'Alzate Laterali', 'Isolamento deltoide laterale', 'strength', '["dumbbells"]', 'beginner', FALSE, FALSE),
(NULL, 'Alzate Frontali', 'Isolamento deltoide anteriore', 'strength', '["dumbbells"]', 'beginner', FALSE, FALSE),
(NULL, 'Alzate a 90', 'Isolamento deltoide posteriore', 'strength', '["dumbbells"]', 'beginner', FALSE, FALSE),
(NULL, 'Face Pull', 'Posteriori e extrarotatori', 'strength', '["cable_machine"]', 'beginner', FALSE, FALSE),
(NULL, 'Arnold Press', 'Press con rotazione', 'strength', '["dumbbells"]', 'intermediate', TRUE, FALSE),
(NULL, 'Tirate al Mento', 'Upright row per spalle e trapezi', 'strength', '["barbell"]', 'intermediate', TRUE, FALSE),

-- BRACCIA - BICIPITI
(NULL, 'Curl con Bilanciere', 'Curl classico per bicipiti', 'strength', '["barbell"]', 'beginner', FALSE, FALSE),
(NULL, 'Curl con Manubri', 'Curl alternato o simultaneo', 'strength', '["dumbbells"]', 'beginner', FALSE, FALSE),
(NULL, 'Curl a Martello', 'Hammer curl per brachiale', 'strength', '["dumbbells"]', 'beginner', FALSE, FALSE),
(NULL, 'Curl su Panca Scott', 'Preacher curl', 'strength', '["ez_bar", "preacher_bench"]', 'beginner', FALSE, FALSE),
(NULL, 'Curl ai Cavi', 'Tensione costante sui bicipiti', 'strength', '["cable_machine"]', 'beginner', FALSE, FALSE),
(NULL, 'Curl Concentrato', 'Isolamento massimo', 'strength', '["dumbbell"]', 'beginner', FALSE, FALSE),

-- BRACCIA - TRICIPITI
(NULL, 'French Press', 'Skull crusher con bilanciere', 'strength', '["ez_bar", "bench"]', 'intermediate', FALSE, FALSE),
(NULL, 'Pushdown ai Cavi', 'Triceps pushdown', 'strength', '["cable_machine"]', 'beginner', FALSE, FALSE),
(NULL, 'Estensioni Tricipiti Sopra la Testa', 'Overhead extension', 'strength', '["dumbbell"]', 'beginner', FALSE, FALSE),
(NULL, 'Dips su Panca', 'Bench dips', 'strength', '["bench"]', 'beginner', FALSE, FALSE),
(NULL, 'Kick Back', 'Isolamento tricipiti', 'strength', '["dumbbell"]', 'beginner', FALSE, FALSE),
(NULL, 'Panca Presa Stretta', 'Close grip bench press', 'strength', '["barbell", "bench"]', 'intermediate', TRUE, FALSE),

-- GAMBE - QUADRICIPITI
(NULL, 'Squat con Bilanciere', 'Re degli esercizi per le gambe', 'strength', '["barbell", "squat_rack"]', 'intermediate', TRUE, FALSE),
(NULL, 'Front Squat', 'Squat frontale', 'strength', '["barbell", "squat_rack"]', 'advanced', TRUE, FALSE),
(NULL, 'Leg Press', 'Press gambe alla macchina', 'strength', '["leg_press_machine"]', 'beginner', TRUE, FALSE),
(NULL, 'Hack Squat', 'Squat guidato', 'strength', '["hack_squat_machine"]', 'intermediate', TRUE, FALSE),
(NULL, 'Leg Extension', 'Isolamento quadricipiti', 'strength', '["leg_extension_machine"]', 'beginner', FALSE, FALSE),
(NULL, 'Affondi con Manubri', 'Lunges con manubri', 'strength', '["dumbbells"]', 'intermediate', TRUE, FALSE),
(NULL, 'Bulgarian Split Squat', 'Squat bulgaro', 'strength', '["dumbbells", "bench"]', 'intermediate', TRUE, FALSE),
(NULL, 'Goblet Squat', 'Squat con kettlebell/manubrio', 'strength', '["dumbbell"]', 'beginner', TRUE, FALSE),

-- GAMBE - FEMORALI
(NULL, 'Leg Curl Sdraiato', 'Isolamento femorali', 'strength', '["leg_curl_machine"]', 'beginner', FALSE, FALSE),
(NULL, 'Leg Curl Seduto', 'Curl femorali seduto', 'strength', '["seated_leg_curl_machine"]', 'beginner', FALSE, FALSE),
(NULL, 'Good Morning', 'Flessione busto per femorali', 'strength', '["barbell"]', 'intermediate', TRUE, FALSE),
(NULL, 'Nordic Curl', 'Curl nordico bodyweight', 'strength', '["bodyweight"]', 'advanced', FALSE, FALSE),

-- GAMBE - GLUTEI
(NULL, 'Hip Thrust', 'Ponte glutei con bilanciere', 'strength', '["barbell", "bench"]', 'intermediate', FALSE, FALSE),
(NULL, 'Glute Bridge', 'Ponte glutei a corpo libero', 'strength', '["bodyweight"]', 'beginner', FALSE, FALSE),
(NULL, 'Kickback ai Cavi', 'Estensione anca ai cavi', 'strength', '["cable_machine"]', 'beginner', FALSE, FALSE),
(NULL, 'Step Up', 'Salita su rialzo', 'strength', '["dumbbells", "box"]', 'beginner', TRUE, FALSE),

-- GAMBE - POLPACCI
(NULL, 'Calf Raise in Piedi', 'Alzate talloni in piedi', 'strength', '["calf_raise_machine"]', 'beginner', FALSE, FALSE),
(NULL, 'Calf Raise Seduto', 'Alzate talloni seduto', 'strength', '["seated_calf_machine"]', 'beginner', FALSE, FALSE),
(NULL, 'Calf Raise alla Leg Press', 'Polpacci alla leg press', 'strength', '["leg_press_machine"]', 'beginner', FALSE, FALSE),

-- CORE
(NULL, 'Crunch', 'Crunch addominali classico', 'strength', '["bodyweight"]', 'beginner', FALSE, FALSE),
(NULL, 'Crunch Inverso', 'Reverse crunch', 'strength', '["bodyweight"]', 'beginner', FALSE, FALSE),
(NULL, 'Plank', 'Plank isometrico', 'strength', '["bodyweight"]', 'beginner', FALSE, FALSE),
(NULL, 'Side Plank', 'Plank laterale', 'strength', '["bodyweight"]', 'beginner', FALSE, FALSE),
(NULL, 'Russian Twist', 'Torsioni busto', 'strength', '["bodyweight"]', 'beginner', FALSE, FALSE),
(NULL, 'Leg Raise', 'Alzate gambe', 'strength', '["bodyweight"]', 'intermediate', FALSE, FALSE),
(NULL, 'Hanging Leg Raise', 'Alzate gambe alla sbarra', 'strength', '["pull_up_bar"]', 'advanced', FALSE, FALSE),
(NULL, 'Ab Wheel Rollout', 'Rollout con ruota addominali', 'strength', '["ab_wheel"]', 'advanced', FALSE, FALSE),
(NULL, 'Cable Crunch', 'Crunch ai cavi', 'strength', '["cable_machine"]', 'intermediate', FALSE, FALSE),
(NULL, 'Woodchop', 'Rotazione ai cavi', 'strength', '["cable_machine"]', 'intermediate', FALSE, FALSE),

-- CARDIO
(NULL, 'Corsa', 'Running/jogging', 'cardio', '["treadmill"]', 'beginner', FALSE, FALSE),
(NULL, 'Cyclette', 'Bici stazionaria', 'cardio', '["stationary_bike"]', 'beginner', FALSE, FALSE),
(NULL, 'Ellittica', 'Cross trainer', 'cardio', '["elliptical"]', 'beginner', FALSE, FALSE),
(NULL, 'Vogatore', 'Rowing machine', 'cardio', '["rowing_machine"]', 'intermediate', TRUE, FALSE),
(NULL, 'Salto con la Corda', 'Jump rope', 'cardio', '["jump_rope"]', 'beginner', FALSE, FALSE),
(NULL, 'Burpees', 'Esercizio full body cardio', 'cardio', '["bodyweight"]', 'intermediate', TRUE, FALSE),
(NULL, 'Mountain Climber', 'Scalatore', 'cardio', '["bodyweight"]', 'beginner', FALSE, FALSE),
(NULL, 'Jumping Jack', 'Salti a stella', 'cardio', '["bodyweight"]', 'beginner', FALSE, FALSE),
(NULL, 'Box Jump', 'Salto su box', 'plyometric', '["box"]', 'intermediate', TRUE, FALSE),
(NULL, 'Battle Ropes', 'Corde ondulate', 'cardio', '["battle_ropes"]', 'intermediate', FALSE, FALSE);
