-- =====================================================
-- SEED: Associazioni Esercizi ↔ Gruppi Muscolari
-- is_primary = 1 → muscolo principale, 0 → secondario
-- activation_percentage → stima attivazione muscolare
-- =====================================================

-- Muscle Group IDs Reference:
-- 1=Chest, 2=Back, 3=Shoulders, 4=Biceps, 5=Triceps, 6=Forearms,
-- 7=Quadriceps, 8=Hamstrings, 9=Glutes, 10=Calves, 11=Hip Flexors,
-- 12=Abdominals, 13=Obliques, 14=Lower Back, 15=Traps, 16=Lats,
-- 17=Rotator Cuff, 18=Adductors, 19=Abductors

-- PETTO (esercizi 1-10, basati sull'ordine di inserimento del seed 004)
-- Panca Piana con Bilanciere
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage) VALUES
((SELECT id FROM exercises WHERE name = 'Panca Piana con Bilanciere'), 1, 1, 85),
((SELECT id FROM exercises WHERE name = 'Panca Piana con Bilanciere'), 5, 0, 60),
((SELECT id FROM exercises WHERE name = 'Panca Piana con Bilanciere'), 3, 0, 40),

-- Panca Inclinata con Bilanciere
((SELECT id FROM exercises WHERE name = 'Panca Inclinata con Bilanciere'), 1, 1, 80),
((SELECT id FROM exercises WHERE name = 'Panca Inclinata con Bilanciere'), 3, 0, 50),
((SELECT id FROM exercises WHERE name = 'Panca Inclinata con Bilanciere'), 5, 0, 55),

-- Panca Declinata con Bilanciere
((SELECT id FROM exercises WHERE name = 'Panca Declinata con Bilanciere'), 1, 1, 85),
((SELECT id FROM exercises WHERE name = 'Panca Declinata con Bilanciere'), 5, 0, 60),

-- Panca Piana con Manubri
((SELECT id FROM exercises WHERE name = 'Panca Piana con Manubri'), 1, 1, 85),
((SELECT id FROM exercises WHERE name = 'Panca Piana con Manubri'), 5, 0, 55),
((SELECT id FROM exercises WHERE name = 'Panca Piana con Manubri'), 3, 0, 40),

-- Panca Inclinata con Manubri
((SELECT id FROM exercises WHERE name = 'Panca Inclinata con Manubri'), 1, 1, 80),
((SELECT id FROM exercises WHERE name = 'Panca Inclinata con Manubri'), 3, 0, 50),

-- Croci con Manubri
((SELECT id FROM exercises WHERE name = 'Croci con Manubri'), 1, 1, 90),

-- Croci ai Cavi
((SELECT id FROM exercises WHERE name = 'Croci ai Cavi'), 1, 1, 90),

-- Chest Press alla Macchina
((SELECT id FROM exercises WHERE name = 'Chest Press alla Macchina'), 1, 1, 80),
((SELECT id FROM exercises WHERE name = 'Chest Press alla Macchina'), 5, 0, 50),

-- Piegamenti sulle Braccia
((SELECT id FROM exercises WHERE name = 'Piegamenti sulle Braccia'), 1, 1, 75),
((SELECT id FROM exercises WHERE name = 'Piegamenti sulle Braccia'), 5, 0, 60),
((SELECT id FROM exercises WHERE name = 'Piegamenti sulle Braccia'), 3, 0, 40),
((SELECT id FROM exercises WHERE name = 'Piegamenti sulle Braccia'), 12, 0, 30),

-- Dips alle Parallele
((SELECT id FROM exercises WHERE name = 'Dips alle Parallele'), 1, 1, 70),
((SELECT id FROM exercises WHERE name = 'Dips alle Parallele'), 5, 0, 70),
((SELECT id FROM exercises WHERE name = 'Dips alle Parallele'), 3, 0, 40),

-- SCHIENA (esercizi 11-20)
-- Stacco da Terra
((SELECT id FROM exercises WHERE name = 'Stacco da Terra'), 2, 1, 80),
((SELECT id FROM exercises WHERE name = 'Stacco da Terra'), 8, 0, 75),
((SELECT id FROM exercises WHERE name = 'Stacco da Terra'), 9, 0, 70),
((SELECT id FROM exercises WHERE name = 'Stacco da Terra'), 14, 0, 80),
((SELECT id FROM exercises WHERE name = 'Stacco da Terra'), 7, 0, 50),
((SELECT id FROM exercises WHERE name = 'Stacco da Terra'), 15, 0, 50),
((SELECT id FROM exercises WHERE name = 'Stacco da Terra'), 6, 0, 40),

-- Stacco Rumeno
((SELECT id FROM exercises WHERE name = 'Stacco Rumeno'), 8, 1, 85),
((SELECT id FROM exercises WHERE name = 'Stacco Rumeno'), 9, 0, 75),
((SELECT id FROM exercises WHERE name = 'Stacco Rumeno'), 14, 0, 70),

-- Rematore con Bilanciere
((SELECT id FROM exercises WHERE name = 'Rematore con Bilanciere'), 16, 1, 85),
((SELECT id FROM exercises WHERE name = 'Rematore con Bilanciere'), 2, 0, 70),
((SELECT id FROM exercises WHERE name = 'Rematore con Bilanciere'), 4, 0, 55),
((SELECT id FROM exercises WHERE name = 'Rematore con Bilanciere'), 15, 0, 40),

-- Rematore con Manubrio
((SELECT id FROM exercises WHERE name = 'Rematore con Manubrio'), 16, 1, 85),
((SELECT id FROM exercises WHERE name = 'Rematore con Manubrio'), 4, 0, 50),

-- Lat Machine
((SELECT id FROM exercises WHERE name = 'Lat Machine'), 16, 1, 90),
((SELECT id FROM exercises WHERE name = 'Lat Machine'), 4, 0, 55),

-- Pulley Basso
((SELECT id FROM exercises WHERE name = 'Pulley Basso'), 16, 1, 80),
((SELECT id FROM exercises WHERE name = 'Pulley Basso'), 2, 0, 65),
((SELECT id FROM exercises WHERE name = 'Pulley Basso'), 4, 0, 50),

-- Trazioni alla Sbarra
((SELECT id FROM exercises WHERE name = 'Trazioni alla Sbarra'), 16, 1, 90),
((SELECT id FROM exercises WHERE name = 'Trazioni alla Sbarra'), 4, 0, 60),
((SELECT id FROM exercises WHERE name = 'Trazioni alla Sbarra'), 12, 0, 30),

-- Trazioni Presa Inversa
((SELECT id FROM exercises WHERE name = 'Trazioni Presa Inversa'), 16, 1, 85),
((SELECT id FROM exercises WHERE name = 'Trazioni Presa Inversa'), 4, 0, 70),

-- T-Bar Row
((SELECT id FROM exercises WHERE name = 'T-Bar Row'), 16, 1, 85),
((SELECT id FROM exercises WHERE name = 'T-Bar Row'), 2, 0, 70),
((SELECT id FROM exercises WHERE name = 'T-Bar Row'), 4, 0, 50),

-- Hyperextension
((SELECT id FROM exercises WHERE name = 'Hyperextension'), 14, 1, 85),
((SELECT id FROM exercises WHERE name = 'Hyperextension'), 9, 0, 60),
((SELECT id FROM exercises WHERE name = 'Hyperextension'), 8, 0, 50),

-- SPALLE (esercizi 21-28)
((SELECT id FROM exercises WHERE name = 'Military Press'), 3, 1, 90),
((SELECT id FROM exercises WHERE name = 'Military Press'), 5, 0, 55),

((SELECT id FROM exercises WHERE name = 'Shoulder Press con Manubri'), 3, 1, 90),
((SELECT id FROM exercises WHERE name = 'Shoulder Press con Manubri'), 5, 0, 50),

((SELECT id FROM exercises WHERE name = 'Alzate Laterali'), 3, 1, 95),

((SELECT id FROM exercises WHERE name = 'Alzate Frontali'), 3, 1, 90),

((SELECT id FROM exercises WHERE name = 'Alzate a 90'), 3, 1, 85),
((SELECT id FROM exercises WHERE name = 'Alzate a 90'), 17, 0, 50),

((SELECT id FROM exercises WHERE name = 'Face Pull'), 3, 1, 70),
((SELECT id FROM exercises WHERE name = 'Face Pull'), 17, 0, 65),
((SELECT id FROM exercises WHERE name = 'Face Pull'), 15, 0, 40),

((SELECT id FROM exercises WHERE name = 'Arnold Press'), 3, 1, 90),
((SELECT id FROM exercises WHERE name = 'Arnold Press'), 5, 0, 50),

((SELECT id FROM exercises WHERE name = 'Tirate al Mento'), 3, 1, 75),
((SELECT id FROM exercises WHERE name = 'Tirate al Mento'), 15, 0, 65),

-- BICIPITI (esercizi 29-34)
((SELECT id FROM exercises WHERE name = 'Curl con Bilanciere'), 4, 1, 95),
((SELECT id FROM exercises WHERE name = 'Curl con Manubri'), 4, 1, 90),
((SELECT id FROM exercises WHERE name = 'Curl a Martello'), 4, 1, 80),
((SELECT id FROM exercises WHERE name = 'Curl a Martello'), 6, 0, 60),
((SELECT id FROM exercises WHERE name = 'Curl su Panca Scott'), 4, 1, 95),
((SELECT id FROM exercises WHERE name = 'Curl ai Cavi'), 4, 1, 90),
((SELECT id FROM exercises WHERE name = 'Curl Concentrato'), 4, 1, 95),

-- TRICIPITI (esercizi 35-40)
((SELECT id FROM exercises WHERE name = 'French Press'), 5, 1, 95),
((SELECT id FROM exercises WHERE name = 'Pushdown ai Cavi'), 5, 1, 95),
((SELECT id FROM exercises WHERE name = 'Estensioni Tricipiti Sopra la Testa'), 5, 1, 90),
((SELECT id FROM exercises WHERE name = 'Dips su Panca'), 5, 1, 80),
((SELECT id FROM exercises WHERE name = 'Dips su Panca'), 1, 0, 30),
((SELECT id FROM exercises WHERE name = 'Kick Back'), 5, 1, 90),
((SELECT id FROM exercises WHERE name = 'Panca Presa Stretta'), 5, 1, 80),
((SELECT id FROM exercises WHERE name = 'Panca Presa Stretta'), 1, 0, 60),

-- QUADRICIPITI (esercizi 41-48)
((SELECT id FROM exercises WHERE name = 'Squat con Bilanciere'), 7, 1, 85),
((SELECT id FROM exercises WHERE name = 'Squat con Bilanciere'), 9, 0, 70),
((SELECT id FROM exercises WHERE name = 'Squat con Bilanciere'), 8, 0, 50),
((SELECT id FROM exercises WHERE name = 'Squat con Bilanciere'), 12, 0, 40),
((SELECT id FROM exercises WHERE name = 'Squat con Bilanciere'), 18, 0, 35),

((SELECT id FROM exercises WHERE name = 'Front Squat'), 7, 1, 90),
((SELECT id FROM exercises WHERE name = 'Front Squat'), 9, 0, 55),
((SELECT id FROM exercises WHERE name = 'Front Squat'), 12, 0, 50),

((SELECT id FROM exercises WHERE name = 'Leg Press'), 7, 1, 85),
((SELECT id FROM exercises WHERE name = 'Leg Press'), 9, 0, 65),
((SELECT id FROM exercises WHERE name = 'Leg Press'), 18, 0, 30),

((SELECT id FROM exercises WHERE name = 'Hack Squat'), 7, 1, 90),
((SELECT id FROM exercises WHERE name = 'Hack Squat'), 9, 0, 50),

((SELECT id FROM exercises WHERE name = 'Leg Extension'), 7, 1, 95),

((SELECT id FROM exercises WHERE name = 'Affondi con Manubri'), 7, 1, 80),
((SELECT id FROM exercises WHERE name = 'Affondi con Manubri'), 9, 0, 70),
((SELECT id FROM exercises WHERE name = 'Affondi con Manubri'), 18, 0, 40),
((SELECT id FROM exercises WHERE name = 'Affondi con Manubri'), 19, 0, 35),

((SELECT id FROM exercises WHERE name = 'Bulgarian Split Squat'), 7, 1, 85),
((SELECT id FROM exercises WHERE name = 'Bulgarian Split Squat'), 9, 0, 70),
((SELECT id FROM exercises WHERE name = 'Bulgarian Split Squat'), 18, 0, 40),

((SELECT id FROM exercises WHERE name = 'Goblet Squat'), 7, 1, 80),
((SELECT id FROM exercises WHERE name = 'Goblet Squat'), 9, 0, 65),

-- FEMORALI (esercizi 49-52)
((SELECT id FROM exercises WHERE name = 'Leg Curl Sdraiato'), 8, 1, 95),
((SELECT id FROM exercises WHERE name = 'Leg Curl Seduto'), 8, 1, 95),
((SELECT id FROM exercises WHERE name = 'Good Morning'), 8, 1, 80),
((SELECT id FROM exercises WHERE name = 'Good Morning'), 14, 0, 70),
((SELECT id FROM exercises WHERE name = 'Good Morning'), 9, 0, 50),
((SELECT id FROM exercises WHERE name = 'Nordic Curl'), 8, 1, 95),

-- GLUTEI (esercizi 53-56)
((SELECT id FROM exercises WHERE name = 'Hip Thrust'), 9, 1, 95),
((SELECT id FROM exercises WHERE name = 'Hip Thrust'), 8, 0, 40),
((SELECT id FROM exercises WHERE name = 'Glute Bridge'), 9, 1, 90),
((SELECT id FROM exercises WHERE name = 'Glute Bridge'), 8, 0, 35),
((SELECT id FROM exercises WHERE name = 'Kickback ai Cavi'), 9, 1, 90),
((SELECT id FROM exercises WHERE name = 'Step Up'), 9, 1, 75),
((SELECT id FROM exercises WHERE name = 'Step Up'), 7, 0, 65),

-- POLPACCI (esercizi 57-59)
((SELECT id FROM exercises WHERE name = 'Calf Raise in Piedi'), 10, 1, 95),
((SELECT id FROM exercises WHERE name = 'Calf Raise Seduto'), 10, 1, 90),
((SELECT id FROM exercises WHERE name = 'Calf Raise alla Leg Press'), 10, 1, 90),

-- CORE (esercizi 60-69)
((SELECT id FROM exercises WHERE name = 'Crunch'), 12, 1, 90),
((SELECT id FROM exercises WHERE name = 'Crunch Inverso'), 12, 1, 85),
((SELECT id FROM exercises WHERE name = 'Crunch Inverso'), 11, 0, 50),
((SELECT id FROM exercises WHERE name = 'Plank'), 12, 1, 80),
((SELECT id FROM exercises WHERE name = 'Plank'), 14, 0, 50),
((SELECT id FROM exercises WHERE name = 'Side Plank'), 13, 1, 85),
((SELECT id FROM exercises WHERE name = 'Side Plank'), 12, 0, 50),
((SELECT id FROM exercises WHERE name = 'Russian Twist'), 13, 1, 85),
((SELECT id FROM exercises WHERE name = 'Russian Twist'), 12, 0, 60),
((SELECT id FROM exercises WHERE name = 'Leg Raise'), 12, 1, 85),
((SELECT id FROM exercises WHERE name = 'Leg Raise'), 11, 0, 65),
((SELECT id FROM exercises WHERE name = 'Hanging Leg Raise'), 12, 1, 90),
((SELECT id FROM exercises WHERE name = 'Hanging Leg Raise'), 11, 0, 70),
((SELECT id FROM exercises WHERE name = 'Ab Wheel Rollout'), 12, 1, 90),
((SELECT id FROM exercises WHERE name = 'Ab Wheel Rollout'), 14, 0, 50),
((SELECT id FROM exercises WHERE name = 'Cable Crunch'), 12, 1, 90),
((SELECT id FROM exercises WHERE name = 'Woodchop'), 13, 1, 80),
((SELECT id FROM exercises WHERE name = 'Woodchop'), 12, 0, 50),

-- CARDIO (esercizi 70-79)
((SELECT id FROM exercises WHERE name = 'Corsa'), 7, 1, 60),
((SELECT id FROM exercises WHERE name = 'Corsa'), 8, 0, 50),
((SELECT id FROM exercises WHERE name = 'Corsa'), 10, 0, 50),
((SELECT id FROM exercises WHERE name = 'Cyclette'), 7, 1, 65),
((SELECT id FROM exercises WHERE name = 'Cyclette'), 9, 0, 40),
((SELECT id FROM exercises WHERE name = 'Ellittica'), 7, 1, 55),
((SELECT id FROM exercises WHERE name = 'Ellittica'), 9, 0, 40),
((SELECT id FROM exercises WHERE name = 'Vogatore'), 2, 1, 70),
((SELECT id FROM exercises WHERE name = 'Vogatore'), 16, 0, 65),
((SELECT id FROM exercises WHERE name = 'Vogatore'), 4, 0, 50),
((SELECT id FROM exercises WHERE name = 'Vogatore'), 7, 0, 50),
((SELECT id FROM exercises WHERE name = 'Salto con la Corda'), 10, 1, 70),
((SELECT id FROM exercises WHERE name = 'Salto con la Corda'), 7, 0, 40),
((SELECT id FROM exercises WHERE name = 'Burpees'), 7, 1, 60),
((SELECT id FROM exercises WHERE name = 'Burpees'), 1, 0, 40),
((SELECT id FROM exercises WHERE name = 'Burpees'), 3, 0, 40),
((SELECT id FROM exercises WHERE name = 'Burpees'), 12, 0, 40),
((SELECT id FROM exercises WHERE name = 'Mountain Climber'), 12, 1, 70),
((SELECT id FROM exercises WHERE name = 'Mountain Climber'), 11, 0, 55),
((SELECT id FROM exercises WHERE name = 'Mountain Climber'), 7, 0, 50),
((SELECT id FROM exercises WHERE name = 'Jumping Jack'), 7, 1, 40),
((SELECT id FROM exercises WHERE name = 'Jumping Jack'), 3, 0, 30),
((SELECT id FROM exercises WHERE name = 'Box Jump'), 7, 1, 75),
((SELECT id FROM exercises WHERE name = 'Box Jump'), 9, 0, 65),
((SELECT id FROM exercises WHERE name = 'Box Jump'), 10, 0, 50),
((SELECT id FROM exercises WHERE name = 'Battle Ropes'), 3, 1, 65),
((SELECT id FROM exercises WHERE name = 'Battle Ropes'), 12, 0, 50),
((SELECT id FROM exercises WHERE name = 'Battle Ropes'), 4, 0, 40);

-- =====================================================
-- NUOVI ESERCIZI — Batch 2: Associazioni Muscolari
-- =====================================================

-- COMPOUND (8 nuovi)
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage) VALUES
-- Clean and Press
((SELECT id FROM exercises WHERE name = 'Clean and Press'), 3, 1, 80),
((SELECT id FROM exercises WHERE name = 'Clean and Press'), 7, 0, 70),
((SELECT id FROM exercises WHERE name = 'Clean and Press'), 9, 0, 65),
((SELECT id FROM exercises WHERE name = 'Clean and Press'), 15, 0, 60),
((SELECT id FROM exercises WHERE name = 'Clean and Press'), 5, 0, 50),

-- Thruster
((SELECT id FROM exercises WHERE name = 'Thruster'), 7, 1, 80),
((SELECT id FROM exercises WHERE name = 'Thruster'), 3, 0, 75),
((SELECT id FROM exercises WHERE name = 'Thruster'), 9, 0, 65),
((SELECT id FROM exercises WHERE name = 'Thruster'), 5, 0, 50),

-- Sumo Deadlift
((SELECT id FROM exercises WHERE name = 'Sumo Deadlift'), 9, 1, 85),
((SELECT id FROM exercises WHERE name = 'Sumo Deadlift'), 18, 0, 75),
((SELECT id FROM exercises WHERE name = 'Sumo Deadlift'), 8, 0, 65),
((SELECT id FROM exercises WHERE name = 'Sumo Deadlift'), 7, 0, 55),
((SELECT id FROM exercises WHERE name = 'Sumo Deadlift'), 14, 0, 60),

-- Pendlay Row
((SELECT id FROM exercises WHERE name = 'Pendlay Row'), 16, 1, 85),
((SELECT id FROM exercises WHERE name = 'Pendlay Row'), 2, 0, 70),
((SELECT id FROM exercises WHERE name = 'Pendlay Row'), 4, 0, 55),
((SELECT id FROM exercises WHERE name = 'Pendlay Row'), 15, 0, 45),

-- Push Press
((SELECT id FROM exercises WHERE name = 'Push Press'), 3, 1, 85),
((SELECT id FROM exercises WHERE name = 'Push Press'), 5, 0, 60),
((SELECT id FROM exercises WHERE name = 'Push Press'), 7, 0, 40),

-- Landmine Press
((SELECT id FROM exercises WHERE name = 'Landmine Press'), 3, 1, 80),
((SELECT id FROM exercises WHERE name = 'Landmine Press'), 1, 0, 55),
((SELECT id FROM exercises WHERE name = 'Landmine Press'), 5, 0, 45),
((SELECT id FROM exercises WHERE name = 'Landmine Press'), 12, 0, 35),

-- Zercher Squat
((SELECT id FROM exercises WHERE name = 'Zercher Squat'), 7, 1, 85),
((SELECT id FROM exercises WHERE name = 'Zercher Squat'), 9, 0, 70),
((SELECT id FROM exercises WHERE name = 'Zercher Squat'), 12, 0, 60),
((SELECT id FROM exercises WHERE name = 'Zercher Squat'), 4, 0, 40),

-- Snatch Grip Deadlift
((SELECT id FROM exercises WHERE name = 'Snatch Grip Deadlift'), 2, 1, 85),
((SELECT id FROM exercises WHERE name = 'Snatch Grip Deadlift'), 15, 0, 75),
((SELECT id FROM exercises WHERE name = 'Snatch Grip Deadlift'), 8, 0, 70),
((SELECT id FROM exercises WHERE name = 'Snatch Grip Deadlift'), 9, 0, 65),
((SELECT id FROM exercises WHERE name = 'Snatch Grip Deadlift'), 14, 0, 60),

-- ISOLATION (5 nuovi)
-- Pec Fly Machine
((SELECT id FROM exercises WHERE name = 'Pec Fly Machine'), 1, 1, 95),

-- Reverse Fly
((SELECT id FROM exercises WHERE name = 'Reverse Fly'), 3, 1, 85),
((SELECT id FROM exercises WHERE name = 'Reverse Fly'), 17, 0, 50),
((SELECT id FROM exercises WHERE name = 'Reverse Fly'), 15, 0, 40),

-- Preacher Curl con Manubrio
((SELECT id FROM exercises WHERE name = 'Preacher Curl con Manubrio'), 4, 1, 95),

-- Sissy Squat
((SELECT id FROM exercises WHERE name = 'Sissy Squat'), 7, 1, 95),

-- Overhead Triceps Extension ai Cavi
((SELECT id FROM exercises WHERE name = 'Overhead Triceps Extension ai Cavi'), 5, 1, 95),

-- PLYOMETRIC (6 nuovi)
-- Jump Squat
((SELECT id FROM exercises WHERE name = 'Jump Squat'), 7, 1, 80),
((SELECT id FROM exercises WHERE name = 'Jump Squat'), 9, 0, 70),
((SELECT id FROM exercises WHERE name = 'Jump Squat'), 10, 0, 55),

-- Tuck Jump
((SELECT id FROM exercises WHERE name = 'Tuck Jump'), 7, 1, 75),
((SELECT id FROM exercises WHERE name = 'Tuck Jump'), 12, 0, 55),
((SELECT id FROM exercises WHERE name = 'Tuck Jump'), 11, 0, 60),

-- Depth Jump
((SELECT id FROM exercises WHERE name = 'Depth Jump'), 7, 1, 85),
((SELECT id FROM exercises WHERE name = 'Depth Jump'), 9, 0, 70),
((SELECT id FROM exercises WHERE name = 'Depth Jump'), 10, 0, 65),

-- Skater Jump
((SELECT id FROM exercises WHERE name = 'Skater Jump'), 9, 1, 75),
((SELECT id FROM exercises WHERE name = 'Skater Jump'), 18, 0, 60),
((SELECT id FROM exercises WHERE name = 'Skater Jump'), 19, 0, 55),

-- Plyo Push Up
((SELECT id FROM exercises WHERE name = 'Plyo Push Up'), 1, 1, 80),
((SELECT id FROM exercises WHERE name = 'Plyo Push Up'), 5, 0, 65),
((SELECT id FROM exercises WHERE name = 'Plyo Push Up'), 3, 0, 50),

-- Lateral Box Jump
((SELECT id FROM exercises WHERE name = 'Lateral Box Jump'), 7, 1, 75),
((SELECT id FROM exercises WHERE name = 'Lateral Box Jump'), 9, 0, 65),
((SELECT id FROM exercises WHERE name = 'Lateral Box Jump'), 19, 0, 55),

-- FLEXIBILITY (8 nuovi)
-- Stretching Quadricipiti
((SELECT id FROM exercises WHERE name = 'Stretching Quadricipiti'), 7, 1, 80),
((SELECT id FROM exercises WHERE name = 'Stretching Quadricipiti'), 11, 0, 60),

-- Stretching Femorali
((SELECT id FROM exercises WHERE name = 'Stretching Femorali'), 8, 1, 85),
((SELECT id FROM exercises WHERE name = 'Stretching Femorali'), 14, 0, 40),

-- Stretching Pettorali
((SELECT id FROM exercises WHERE name = 'Stretching Pettorali'), 1, 1, 80),
((SELECT id FROM exercises WHERE name = 'Stretching Pettorali'), 3, 0, 40),

-- Stretching Dorsali
((SELECT id FROM exercises WHERE name = 'Stretching Dorsali'), 16, 1, 80),
((SELECT id FROM exercises WHERE name = 'Stretching Dorsali'), 2, 0, 50),

-- Stretching Polpacci
((SELECT id FROM exercises WHERE name = 'Stretching Polpacci'), 10, 1, 85),

-- Pigeon Pose
((SELECT id FROM exercises WHERE name = 'Pigeon Pose'), 9, 1, 75),
((SELECT id FROM exercises WHERE name = 'Pigeon Pose'), 11, 0, 70),

-- Cat-Cow Stretch
((SELECT id FROM exercises WHERE name = 'Cat-Cow Stretch'), 14, 1, 70),
((SELECT id FROM exercises WHERE name = 'Cat-Cow Stretch'), 12, 0, 50),

-- Child's Pose
((SELECT id FROM exercises WHERE name = 'Child''s Pose'), 14, 1, 65),
((SELECT id FROM exercises WHERE name = 'Child''s Pose'), 16, 0, 50),

-- BALANCE (5 nuovi)
-- Single Leg Deadlift
((SELECT id FROM exercises WHERE name = 'Single Leg Deadlift'), 8, 1, 80),
((SELECT id FROM exercises WHERE name = 'Single Leg Deadlift'), 9, 0, 70),
((SELECT id FROM exercises WHERE name = 'Single Leg Deadlift'), 14, 0, 50),

-- Bosu Ball Squat
((SELECT id FROM exercises WHERE name = 'Bosu Ball Squat'), 7, 1, 75),
((SELECT id FROM exercises WHERE name = 'Bosu Ball Squat'), 9, 0, 55),
((SELECT id FROM exercises WHERE name = 'Bosu Ball Squat'), 12, 0, 45),

-- Pistol Squat
((SELECT id FROM exercises WHERE name = 'Pistol Squat'), 7, 1, 90),
((SELECT id FROM exercises WHERE name = 'Pistol Squat'), 9, 0, 65),
((SELECT id FROM exercises WHERE name = 'Pistol Squat'), 12, 0, 50),

-- Single Leg Balance
((SELECT id FROM exercises WHERE name = 'Single Leg Balance'), 10, 1, 50),
((SELECT id FROM exercises WHERE name = 'Single Leg Balance'), 12, 0, 40),

-- Turkish Get Up
((SELECT id FROM exercises WHERE name = 'Turkish Get Up'), 3, 1, 75),
((SELECT id FROM exercises WHERE name = 'Turkish Get Up'), 12, 0, 70),
((SELECT id FROM exercises WHERE name = 'Turkish Get Up'), 9, 0, 60),
((SELECT id FROM exercises WHERE name = 'Turkish Get Up'), 7, 0, 55),

-- CARDIO EXTRA (6 nuovi)
-- Sled Push
((SELECT id FROM exercises WHERE name = 'Sled Push'), 7, 1, 75),
((SELECT id FROM exercises WHERE name = 'Sled Push'), 9, 0, 70),
((SELECT id FROM exercises WHERE name = 'Sled Push'), 10, 0, 50),

-- Assault Bike
((SELECT id FROM exercises WHERE name = 'Assault Bike'), 7, 1, 60),
((SELECT id FROM exercises WHERE name = 'Assault Bike'), 3, 0, 45),
((SELECT id FROM exercises WHERE name = 'Assault Bike'), 4, 0, 35),

-- Stair Climber
((SELECT id FROM exercises WHERE name = 'Stair Climber'), 7, 1, 65),
((SELECT id FROM exercises WHERE name = 'Stair Climber'), 9, 0, 55),

-- Ski Erg
((SELECT id FROM exercises WHERE name = 'Ski Erg'), 16, 1, 70),
((SELECT id FROM exercises WHERE name = 'Ski Erg'), 5, 0, 55),
((SELECT id FROM exercises WHERE name = 'Ski Erg'), 12, 0, 50),

-- High Knees
((SELECT id FROM exercises WHERE name = 'High Knees'), 7, 1, 60),
((SELECT id FROM exercises WHERE name = 'High Knees'), 11, 0, 65),
((SELECT id FROM exercises WHERE name = 'High Knees'), 12, 0, 40),

-- Sprint Intervallato
((SELECT id FROM exercises WHERE name = 'Sprint Intervallato'), 7, 1, 80),
((SELECT id FROM exercises WHERE name = 'Sprint Intervallato'), 8, 0, 70),
((SELECT id FROM exercises WHERE name = 'Sprint Intervallato'), 9, 0, 60),
((SELECT id FROM exercises WHERE name = 'Sprint Intervallato'), 10, 0, 55);
