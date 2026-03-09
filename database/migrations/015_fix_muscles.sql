-- Fix: insert muscle groups one exercise at a time to avoid single NULL breaking entire batch

-- Panca Piana con Bilanciere
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 85 as pct, 'Chest' as mg UNION ALL SELECT 0,60,'Triceps' UNION ALL SELECT 0,40,'Shoulders') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Panca Piana con Bilanciere';

-- Panca Inclinata con Bilanciere
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 80 as pct, 'Chest' as mg UNION ALL SELECT 0,50,'Shoulders' UNION ALL SELECT 0,55,'Triceps') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Panca Inclinata con Bilanciere';

-- Panca Declinata con Bilanciere
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 85 as pct, 'Chest' as mg UNION ALL SELECT 0,60,'Triceps') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Panca Declinata con Bilanciere';

-- Panca Piana con Manubri
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 85 as pct, 'Chest' as mg UNION ALL SELECT 0,55,'Triceps' UNION ALL SELECT 0,40,'Shoulders') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Panca Piana con Manubri';

-- Panca Inclinata con Manubri
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 80 as pct, 'Chest' as mg UNION ALL SELECT 0,50,'Shoulders') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Panca Inclinata con Manubri';

-- Croci con Manubri
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, 1, 90 FROM exercises e JOIN muscle_groups mg ON mg.name = 'Chest' WHERE e.name = 'Croci con Manubri';

-- Croci ai Cavi
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, 1, 90 FROM exercises e JOIN muscle_groups mg ON mg.name = 'Chest' WHERE e.name = 'Croci ai Cavi';

-- Chest Press alla Macchina
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 80 as pct, 'Chest' as mg UNION ALL SELECT 0,50,'Triceps') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Chest Press alla Macchina';

-- Piegamenti sulle Braccia
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 75 as pct, 'Chest' as mg UNION ALL SELECT 0,60,'Triceps' UNION ALL SELECT 0,40,'Shoulders' UNION ALL SELECT 0,30,'Abdominals') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Piegamenti sulle Braccia';

-- Dips alle Parallele
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 70 as pct, 'Chest' as mg UNION ALL SELECT 0,70,'Triceps' UNION ALL SELECT 0,40,'Shoulders') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Dips alle Parallele';

-- Stacco da Terra
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 80 as pct, 'Back' as mg UNION ALL SELECT 0,75,'Hamstrings' UNION ALL SELECT 0,70,'Glutes' UNION ALL SELECT 0,80,'Lower Back' UNION ALL SELECT 0,50,'Quadriceps' UNION ALL SELECT 0,50,'Traps' UNION ALL SELECT 0,40,'Forearms') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Stacco da Terra';

-- Stacco Rumeno
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 85 as pct, 'Hamstrings' as mg UNION ALL SELECT 0,75,'Glutes' UNION ALL SELECT 0,70,'Lower Back') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Stacco Rumeno';

-- Rematore con Bilanciere
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 85 as pct, 'Lats' as mg UNION ALL SELECT 0,70,'Back' UNION ALL SELECT 0,55,'Biceps' UNION ALL SELECT 0,40,'Traps') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Rematore con Bilanciere';

-- Rematore con Manubrio
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 85 as pct, 'Lats' as mg UNION ALL SELECT 0,50,'Biceps') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Rematore con Manubrio';

-- Lat Machine
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 90 as pct, 'Lats' as mg UNION ALL SELECT 0,55,'Biceps') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Lat Machine';

-- Pulley Basso
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 80 as pct, 'Lats' as mg UNION ALL SELECT 0,65,'Back' UNION ALL SELECT 0,50,'Biceps') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Pulley Basso';

-- Trazioni alla Sbarra
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 90 as pct, 'Lats' as mg UNION ALL SELECT 0,60,'Biceps' UNION ALL SELECT 0,30,'Abdominals') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Trazioni alla Sbarra';

-- Trazioni Presa Inversa
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 85 as pct, 'Lats' as mg UNION ALL SELECT 0,70,'Biceps') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Trazioni Presa Inversa';

-- T-Bar Row
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 85 as pct, 'Lats' as mg UNION ALL SELECT 0,70,'Back' UNION ALL SELECT 0,50,'Biceps') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'T-Bar Row';

-- Hyperextension
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 85 as pct, 'Lower Back' as mg UNION ALL SELECT 0,60,'Glutes' UNION ALL SELECT 0,50,'Hamstrings') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Hyperextension';

-- Military Press
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 90 as pct, 'Shoulders' as mg UNION ALL SELECT 0,55,'Triceps') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Military Press';

-- Shoulder Press con Manubri
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 90 as pct, 'Shoulders' as mg UNION ALL SELECT 0,50,'Triceps') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Shoulder Press con Manubri';

-- Alzate Laterali
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, 1, 95 FROM exercises e JOIN muscle_groups mg ON mg.name = 'Shoulders' WHERE e.name = 'Alzate Laterali';

-- Alzate Frontali
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, 1, 90 FROM exercises e JOIN muscle_groups mg ON mg.name = 'Shoulders' WHERE e.name = 'Alzate Frontali';

-- Alzate a 90
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 85 as pct, 'Shoulders' as mg UNION ALL SELECT 0,50,'Rotator Cuff') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Alzate a 90';

-- Face Pull
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 70 as pct, 'Shoulders' as mg UNION ALL SELECT 0,65,'Rotator Cuff' UNION ALL SELECT 0,40,'Traps') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Face Pull';

-- Arnold Press
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 90 as pct, 'Shoulders' as mg UNION ALL SELECT 0,50,'Triceps') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Arnold Press';

-- Tirate al Mento
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 75 as pct, 'Shoulders' as mg UNION ALL SELECT 0,65,'Traps') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Tirate al Mento';

-- Curl con Bilanciere
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, 1, 95 FROM exercises e JOIN muscle_groups mg ON mg.name = 'Biceps' WHERE e.name = 'Curl con Bilanciere';

-- Curl con Manubri
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, 1, 90 FROM exercises e JOIN muscle_groups mg ON mg.name = 'Biceps' WHERE e.name = 'Curl con Manubri';

-- Curl a Martello
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 80 as pct, 'Biceps' as mg UNION ALL SELECT 0,60,'Forearms') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Curl a Martello';

-- Curl su Panca Scott
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, 1, 95 FROM exercises e JOIN muscle_groups mg ON mg.name = 'Biceps' WHERE e.name = 'Curl su Panca Scott';

-- Curl ai Cavi
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, 1, 90 FROM exercises e JOIN muscle_groups mg ON mg.name = 'Biceps' WHERE e.name = 'Curl ai Cavi';

-- Curl Concentrato
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, 1, 95 FROM exercises e JOIN muscle_groups mg ON mg.name = 'Biceps' WHERE e.name = 'Curl Concentrato';

-- French Press
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, 1, 95 FROM exercises e JOIN muscle_groups mg ON mg.name = 'Triceps' WHERE e.name = 'French Press';

-- Pushdown ai Cavi
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, 1, 95 FROM exercises e JOIN muscle_groups mg ON mg.name = 'Triceps' WHERE e.name = 'Pushdown ai Cavi';

-- Estensioni Tricipiti Sopra la Testa
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, 1, 90 FROM exercises e JOIN muscle_groups mg ON mg.name = 'Triceps' WHERE e.name = 'Estensioni Tricipiti Sopra la Testa';

-- Dips su Panca
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 80 as pct, 'Triceps' as mg UNION ALL SELECT 0,30,'Chest') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Dips su Panca';

-- Kick Back
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, 1, 90 FROM exercises e JOIN muscle_groups mg ON mg.name = 'Triceps' WHERE e.name = 'Kick Back';

-- Panca Presa Stretta
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 80 as pct, 'Triceps' as mg UNION ALL SELECT 0,60,'Chest') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Panca Presa Stretta';

-- Squat con Bilanciere
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 85 as pct, 'Quadriceps' as mg UNION ALL SELECT 0,70,'Glutes' UNION ALL SELECT 0,50,'Hamstrings' UNION ALL SELECT 0,40,'Abdominals' UNION ALL SELECT 0,35,'Adductors') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Squat con Bilanciere';

-- Front Squat
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 90 as pct, 'Quadriceps' as mg UNION ALL SELECT 0,55,'Glutes' UNION ALL SELECT 0,50,'Abdominals') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Front Squat';

-- Leg Press
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 85 as pct, 'Quadriceps' as mg UNION ALL SELECT 0,65,'Glutes' UNION ALL SELECT 0,30,'Adductors') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Leg Press';

-- Hack Squat
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 90 as pct, 'Quadriceps' as mg UNION ALL SELECT 0,50,'Glutes') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Hack Squat';

-- Leg Extension
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, 1, 95 FROM exercises e JOIN muscle_groups mg ON mg.name = 'Quadriceps' WHERE e.name = 'Leg Extension';

-- Affondi con Manubri
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 80 as pct, 'Quadriceps' as mg UNION ALL SELECT 0,70,'Glutes' UNION ALL SELECT 0,40,'Adductors' UNION ALL SELECT 0,35,'Abductors') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Affondi con Manubri';

-- Bulgarian Split Squat
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 85 as pct, 'Quadriceps' as mg UNION ALL SELECT 0,70,'Glutes' UNION ALL SELECT 0,40,'Adductors') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Bulgarian Split Squat';

-- Goblet Squat
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 80 as pct, 'Quadriceps' as mg UNION ALL SELECT 0,65,'Glutes') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Goblet Squat';

-- Leg Curl Sdraiato
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, 1, 95 FROM exercises e JOIN muscle_groups mg ON mg.name = 'Hamstrings' WHERE e.name = 'Leg Curl Sdraiato';

-- Leg Curl Seduto
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, 1, 95 FROM exercises e JOIN muscle_groups mg ON mg.name = 'Hamstrings' WHERE e.name = 'Leg Curl Seduto';

-- Good Morning
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 80 as pct, 'Hamstrings' as mg UNION ALL SELECT 0,70,'Lower Back' UNION ALL SELECT 0,50,'Glutes') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Good Morning';

-- Nordic Curl
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, 1, 95 FROM exercises e JOIN muscle_groups mg ON mg.name = 'Hamstrings' WHERE e.name = 'Nordic Curl';

-- Hip Thrust
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 95 as pct, 'Glutes' as mg UNION ALL SELECT 0,40,'Hamstrings') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Hip Thrust';

-- Glute Bridge
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 90 as pct, 'Glutes' as mg UNION ALL SELECT 0,35,'Hamstrings') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Glute Bridge';

-- Kickback ai Cavi
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, 1, 90 FROM exercises e JOIN muscle_groups mg ON mg.name = 'Glutes' WHERE e.name = 'Kickback ai Cavi';

-- Step Up
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 75 as pct, 'Glutes' as mg UNION ALL SELECT 0,65,'Quadriceps') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Step Up';

-- Calf Raise in Piedi
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, 1, 95 FROM exercises e JOIN muscle_groups mg ON mg.name = 'Calves' WHERE e.name = 'Calf Raise in Piedi';

-- Calf Raise Seduto
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, 1, 90 FROM exercises e JOIN muscle_groups mg ON mg.name = 'Calves' WHERE e.name = 'Calf Raise Seduto';

-- Calf Raise alla Leg Press
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, 1, 90 FROM exercises e JOIN muscle_groups mg ON mg.name = 'Calves' WHERE e.name = 'Calf Raise alla Leg Press';

-- Crunch
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, 1, 90 FROM exercises e JOIN muscle_groups mg ON mg.name = 'Abdominals' WHERE e.name = 'Crunch';

-- Crunch Inverso
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 85 as pct, 'Abdominals' as mg UNION ALL SELECT 0,50,'Hip Flexors') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Crunch Inverso';

-- Plank
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 80 as pct, 'Abdominals' as mg UNION ALL SELECT 0,50,'Lower Back') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Plank';

-- Side Plank
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 85 as pct, 'Obliques' as mg UNION ALL SELECT 0,50,'Abdominals') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Side Plank';

-- Russian Twist
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 85 as pct, 'Obliques' as mg UNION ALL SELECT 0,60,'Abdominals') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Russian Twist';

-- Leg Raise
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 85 as pct, 'Abdominals' as mg UNION ALL SELECT 0,65,'Hip Flexors') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Leg Raise';

-- Hanging Leg Raise
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 90 as pct, 'Abdominals' as mg UNION ALL SELECT 0,70,'Hip Flexors') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Hanging Leg Raise';

-- Ab Wheel Rollout
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 90 as pct, 'Abdominals' as mg UNION ALL SELECT 0,50,'Lower Back') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Ab Wheel Rollout';

-- Cable Crunch
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, 1, 90 FROM exercises e JOIN muscle_groups mg ON mg.name = 'Abdominals' WHERE e.name = 'Cable Crunch';

-- Woodchop
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 80 as pct, 'Obliques' as mg UNION ALL SELECT 0,50,'Abdominals') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Woodchop';

-- Corsa
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 60 as pct, 'Quadriceps' as mg UNION ALL SELECT 0,50,'Hamstrings' UNION ALL SELECT 0,50,'Calves') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Corsa';

-- Cyclette
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 65 as pct, 'Quadriceps' as mg UNION ALL SELECT 0,40,'Glutes') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Cyclette';

-- Ellittica
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 55 as pct, 'Quadriceps' as mg UNION ALL SELECT 0,40,'Glutes') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Ellittica';

-- Vogatore
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 70 as pct, 'Back' as mg UNION ALL SELECT 0,65,'Lats' UNION ALL SELECT 0,50,'Biceps' UNION ALL SELECT 0,50,'Quadriceps') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Vogatore';

-- Salto con la Corda
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 70 as pct, 'Calves' as mg UNION ALL SELECT 0,40,'Quadriceps') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Salto con la Corda';

-- Burpees
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 60 as pct, 'Quadriceps' as mg UNION ALL SELECT 0,40,'Chest' UNION ALL SELECT 0,40,'Shoulders' UNION ALL SELECT 0,40,'Abdominals') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Burpees';

-- Mountain Climber
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 70 as pct, 'Abdominals' as mg UNION ALL SELECT 0,55,'Hip Flexors' UNION ALL SELECT 0,50,'Quadriceps') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Mountain Climber';

-- Jumping Jack
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 40 as pct, 'Quadriceps' as mg UNION ALL SELECT 0,30,'Shoulders') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Jumping Jack';

-- Box Jump
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 75 as pct, 'Quadriceps' as mg UNION ALL SELECT 0,65,'Glutes' UNION ALL SELECT 0,50,'Calves') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Box Jump';

-- Battle Ropes
INSERT IGNORE INTO exercise_muscle_groups (exercise_id, muscle_group_id, is_primary, activation_percentage)
SELECT e.id, mg.id, v.is_primary, v.pct FROM exercises e
CROSS JOIN (SELECT 1 as is_primary, 65 as pct, 'Shoulders' as mg UNION ALL SELECT 0,50,'Abdominals' UNION ALL SELECT 0,40,'Biceps') v
JOIN muscle_groups mg ON mg.name = v.mg WHERE e.name = 'Battle Ropes';
