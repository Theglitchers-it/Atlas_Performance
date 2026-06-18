-- Seed 012: Sedi + Classi (gruppo) + Referral demo
-- Tenant: Demo PT Studio (00000000-0000-0000-0000-000000000001)

SET @TENANT := '00000000-0000-0000-0000-000000000001';
SET @TRAINER := 3;
SET @STAFF := 4;
SET @CLIENT_LUCA := (SELECT id FROM clients WHERE email='client@demo.local' AND tenant_id=@TENANT LIMIT 1);
SET @CLIENT_MARCO := (SELECT id FROM clients WHERE email='marco.bianchi@email.it' AND tenant_id=@TENANT LIMIT 1);
SET @CLIENT_OUTSIDER := (SELECT id FROM clients WHERE email='outsider@demo.local' AND tenant_id=@TENANT LIMIT 1);
SET @USER_LUCA := (SELECT user_id FROM clients WHERE id=@CLIENT_LUCA);
SET @USER_OUTSIDER := (SELECT user_id FROM clients WHERE id=@CLIENT_OUTSIDER);

-- =========================================================
-- 1. SEDI (locations) — Olbia HQ + filiale + popup + partner
-- =========================================================

-- Sede principale
INSERT INTO locations (tenant_id, parent_location_id, name, location_type, address, city, postal_code, province, country, phone, email, capacity, opening_hours, amenities, latitude, longitude, geofence_radius_meters, gps_strict, status) VALUES
(@TENANT, NULL, 'Atlas Studio Olbia HQ', 'main',
 'Via Roma 42', 'Olbia', '07026', 'SS', 'Italia',
 '+39 0789 123456', 'olbia@atlasperformance.it', 30,
 JSON_OBJECT(
   'mon','06:00-22:00','tue','06:00-22:00','wed','06:00-22:00',
   'thu','06:00-22:00','fri','06:00-22:00','sat','08:00-20:00','sun','09:00-13:00'
 ),
 JSON_ARRAY('rack squat','panca','spogliatoi','docce','wifi','parcheggio','aria condizionata','sala corsi'),
 40.9237000, 9.4985000, 80, 1, 'active');
SET @LOC_HQ := LAST_INSERT_ID();

-- Filiale Sassari (figlia di HQ)
INSERT INTO locations (tenant_id, parent_location_id, name, location_type, address, city, postal_code, province, country, phone, email, capacity, opening_hours, amenities, latitude, longitude, geofence_radius_meters, gps_strict, status) VALUES
(@TENANT, @LOC_HQ, 'Atlas Garage Sassari', 'branch',
 'Via Diaz 15', 'Sassari', '07100', 'SS', 'Italia',
 '+39 079 987654', 'sassari@atlasperformance.it', 20,
 JSON_OBJECT(
   'mon','07:00-21:00','tue','07:00-21:00','wed','07:00-21:00',
   'thu','07:00-21:00','fri','07:00-21:00','sat','09:00-18:00','sun', NULL
 ),
 JSON_ARRAY('rack squat','panca','spogliatoi','docce','wifi','crossfit area'),
 40.7259000, 8.5557000, 100, 0, 'active');
SET @LOC_SASSARI := LAST_INSERT_ID();

-- Popup estivo Pittulongu (sessioni outdoor)
INSERT INTO locations (tenant_id, parent_location_id, name, location_type, address, city, postal_code, province, country, capacity, opening_hours, amenities, latitude, longitude, geofence_radius_meters, gps_strict, status) VALUES
(@TENANT, @LOC_HQ, 'Atlas Beach Pittulongu', 'popup',
 'Spiaggia Pittulongu Lido', 'Olbia', '07026', 'SS', 'Italia',
 15,
 JSON_OBJECT('mon', NULL,'tue','06:30-09:00','wed', NULL,'thu','06:30-09:00','fri', NULL,'sat','08:00-11:00','sun','08:00-11:00'),
 JSON_ARRAY('kettlebell','trx','sand workout','docce mare'),
 40.9676000, 9.5694000, 200, 0, 'active');
SET @LOC_BEACH := LAST_INSERT_ID();

-- Partner location esterna (palestra convenzionata)
INSERT INTO locations (tenant_id, parent_location_id, name, location_type, address, city, postal_code, province, country, phone, capacity, latitude, longitude, geofence_radius_meters, gps_strict, status) VALUES
(@TENANT, NULL, 'Iron Palace Olbia (Partner)', 'external',
 'Zona Industriale Lotto B', 'Olbia', '07026', 'SS', 'Italia',
 '+39 0789 555111', 50,
 40.9118000, 9.5018000, 120, 0, 'active');
SET @LOC_PARTNER := LAST_INSERT_ID();

-- Assegnazione staff alle sedi (staff_locations)
INSERT INTO staff_locations (tenant_id, user_id, location_id, role_at_location, is_primary, schedule, active_from) VALUES
(@TENANT, @TRAINER, @LOC_HQ, 'owner', 1,
 JSON_OBJECT('mon','06:00-14:00','tue','06:00-14:00','wed','06:00-14:00','thu','06:00-14:00','fri','06:00-14:00'),
 CURDATE()),
(@TENANT, @TRAINER, @LOC_BEACH, 'owner', 0,
 JSON_OBJECT('tue','06:30-09:00','thu','06:30-09:00','sat','08:00-11:00','sun','08:00-11:00'),
 CURDATE()),
(@TENANT, @STAFF, @LOC_HQ, 'trainer', 0,
 JSON_OBJECT('mon','14:00-22:00','wed','14:00-22:00','fri','14:00-22:00','sat','08:00-20:00'),
 CURDATE()),
(@TENANT, @STAFF, @LOC_SASSARI, 'trainer', 1,
 JSON_OBJECT('tue','07:00-21:00','thu','07:00-21:00'),
 CURDATE());

-- Partnership con sede esterna (revenue share)
INSERT INTO location_partnerships (tenant_id, location_id, partner_user_id, revenue_share_pct, per_visit_fee_cents, active_from, notes) VALUES
(@TENANT, @LOC_PARTNER, @TRAINER, 60.00, 500, CURDATE(),
 'Convenzione: 60% al partner, 5€ fee fisso per visita. Trainer Atlas accede liberamente con i propri clienti.');

-- =========================================================
-- 2. CLASSI (group fitness) — 4 corsi + sessioni 2 settimane
-- =========================================================

INSERT INTO classes (tenant_id, name, description, instructor_id, max_participants, duration_min, location, recurring_pattern, is_active) VALUES
(@TENANT, 'Functional Training',
 'Allenamento funzionale total body con kettlebell, TRX e bodyweight. Indicato per tutti i livelli.',
 @STAFF, 12, 60, 'Atlas Studio Olbia HQ',
 JSON_OBJECT('days', JSON_ARRAY(1,3,5), 'time','18:30','duration_min',60), 1),
(@TENANT, 'Pilates Mat',
 'Pilates a corpo libero su tappetino. Focus core, mobilità e postura. Massimo 8 partecipanti per qualità.',
 @TRAINER, 8, 50, 'Atlas Studio Olbia HQ',
 JSON_OBJECT('days', JSON_ARRAY(2,4), 'time','10:00','duration_min',50), 1),
(@TENANT, 'HIIT Power',
 'High-Intensity Interval Training a circuiti. Brucia grassi e migliora capacità anaerobica.',
 @TRAINER, 15, 45, 'Atlas Studio Olbia HQ',
 JSON_OBJECT('days', JSON_ARRAY(1,2,4,6), 'time','07:00','duration_min',45), 1),
(@TENANT, 'Beach Training (Estate)',
 'Workout outdoor sulla spiaggia di Pittulongu. Sabbia, mare, kettlebell. Aperto tutta la settimana lug-ago.',
 @TRAINER, 15, 60, 'Atlas Beach Pittulongu',
 JSON_OBJECT('days', JSON_ARRAY(2,4,6,0), 'time','07:30','duration_min',60), 1);

SET @CLASS_FUNC := (SELECT id FROM classes WHERE tenant_id=@TENANT AND name='Functional Training');
SET @CLASS_PIL := (SELECT id FROM classes WHERE tenant_id=@TENANT AND name='Pilates Mat');
SET @CLASS_HIIT := (SELECT id FROM classes WHERE tenant_id=@TENANT AND name='HIIT Power');
SET @CLASS_BEACH := (SELECT id FROM classes WHERE tenant_id=@TENANT AND name='Beach Training (Estate)');

-- Sessioni programmate prossimi 14 giorni (alcune passate, alcune future)
-- Functional Training (Lun/Mer/Ven 18:30) — passate + future
INSERT INTO class_sessions (class_id, start_datetime, end_datetime, status, notes) VALUES
(@CLASS_FUNC, DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 5 DAY), '%Y-%m-%d 18:30:00'), DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 5 DAY), '%Y-%m-%d 19:30:00'), 'completed', 'Sessione full house'),
(@CLASS_FUNC, DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 3 DAY), '%Y-%m-%d 18:30:00'), DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 3 DAY), '%Y-%m-%d 19:30:00'), 'completed', NULL),
(@CLASS_FUNC, DATE_FORMAT(CURDATE(), '%Y-%m-%d 18:30:00'), DATE_FORMAT(CURDATE(), '%Y-%m-%d 19:30:00'), 'scheduled', NULL),
(@CLASS_FUNC, DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '%Y-%m-%d 18:30:00'), DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '%Y-%m-%d 19:30:00'), 'scheduled', NULL),
(@CLASS_FUNC, DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 4 DAY), '%Y-%m-%d 18:30:00'), DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 4 DAY), '%Y-%m-%d 19:30:00'), 'scheduled', NULL),
(@CLASS_FUNC, DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 7 DAY), '%Y-%m-%d 18:30:00'), DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 7 DAY), '%Y-%m-%d 19:30:00'), 'scheduled', NULL);

-- Pilates (Mar/Gio 10:00)
INSERT INTO class_sessions (class_id, start_datetime, end_datetime, status) VALUES
(@CLASS_PIL, DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 4 DAY), '%Y-%m-%d 10:00:00'), DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 4 DAY), '%Y-%m-%d 10:50:00'), 'completed'),
(@CLASS_PIL, DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '%Y-%m-%d 10:00:00'), DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '%Y-%m-%d 10:50:00'), 'scheduled'),
(@CLASS_PIL, DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '%Y-%m-%d 10:00:00'), DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '%Y-%m-%d 10:50:00'), 'scheduled'),
(@CLASS_PIL, DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 8 DAY), '%Y-%m-%d 10:00:00'), DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 8 DAY), '%Y-%m-%d 10:50:00'), 'scheduled');

-- HIIT (Lun/Mar/Gio/Sab 07:00)
INSERT INTO class_sessions (class_id, start_datetime, end_datetime, status, notes) VALUES
(@CLASS_HIIT, DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 6 DAY), '%Y-%m-%d 07:00:00'), DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 6 DAY), '%Y-%m-%d 07:45:00'), 'completed', NULL),
(@CLASS_HIIT, DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '%Y-%m-%d 07:00:00'), DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '%Y-%m-%d 07:45:00'), 'completed', NULL),
(@CLASS_HIIT, DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '%Y-%m-%d 07:00:00'), DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '%Y-%m-%d 07:45:00'), 'scheduled', NULL),
(@CLASS_HIIT, DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 5 DAY), '%Y-%m-%d 07:00:00'), DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 5 DAY), '%Y-%m-%d 07:45:00'), 'scheduled', NULL),
(@CLASS_HIIT, DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 6 DAY), '%Y-%m-%d 07:00:00'), DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 6 DAY), '%Y-%m-%d 07:45:00'), 'cancelled', 'Cancellata per festività locale');

-- Beach (Mar/Gio/Sab/Dom 07:30)
INSERT INTO class_sessions (class_id, start_datetime, end_datetime, status) VALUES
(@CLASS_BEACH, DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '%Y-%m-%d 07:30:00'), DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '%Y-%m-%d 08:30:00'), 'scheduled'),
(@CLASS_BEACH, DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '%Y-%m-%d 07:30:00'), DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '%Y-%m-%d 08:30:00'), 'scheduled'),
(@CLASS_BEACH, DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 5 DAY), '%Y-%m-%d 07:30:00'), DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 5 DAY), '%Y-%m-%d 08:30:00'), 'scheduled');

-- Iscrizioni clienti demo a sessioni miste
-- Luca: HIIT (lui è il "fitness-lover")
INSERT INTO class_enrollments (class_session_id, client_id, status, checked_in_at) VALUES
((SELECT id FROM class_sessions WHERE class_id=@CLASS_HIIT AND status='completed' ORDER BY start_datetime LIMIT 1), @CLIENT_LUCA, 'attended', DATE_SUB(CURDATE(), INTERVAL 6 DAY) + INTERVAL 7 HOUR + INTERVAL 5 MINUTE),
((SELECT id FROM class_sessions WHERE class_id=@CLASS_HIIT AND status='completed' ORDER BY start_datetime DESC LIMIT 1), @CLIENT_LUCA, 'attended', DATE_SUB(CURDATE(), INTERVAL 1 DAY) + INTERVAL 7 HOUR + INTERVAL 2 MINUTE),
((SELECT id FROM class_sessions WHERE class_id=@CLASS_HIIT AND status='scheduled' ORDER BY start_datetime LIMIT 1), @CLIENT_LUCA, 'enrolled', NULL),
((SELECT id FROM class_sessions WHERE class_id=@CLASS_FUNC AND status='scheduled' ORDER BY start_datetime LIMIT 1), @CLIENT_LUCA, 'enrolled', NULL);

-- Marco: Functional (intermediate, ama gruppo)
INSERT INTO class_enrollments (class_session_id, client_id, status, checked_in_at) VALUES
((SELECT id FROM class_sessions WHERE class_id=@CLASS_FUNC AND status='completed' ORDER BY start_datetime LIMIT 1), @CLIENT_MARCO, 'attended', DATE_SUB(CURDATE(), INTERVAL 5 DAY) + INTERVAL 18 HOUR + INTERVAL 32 MINUTE),
((SELECT id FROM class_sessions WHERE class_id=@CLASS_FUNC AND status='completed' ORDER BY start_datetime DESC LIMIT 1), @CLIENT_MARCO, 'attended', DATE_SUB(CURDATE(), INTERVAL 3 DAY) + INTERVAL 18 HOUR + INTERVAL 28 MINUTE),
((SELECT id FROM class_sessions WHERE class_id=@CLASS_FUNC AND status='scheduled' ORDER BY start_datetime LIMIT 1), @CLIENT_MARCO, 'enrolled', NULL),
((SELECT id FROM class_sessions WHERE class_id=@CLASS_BEACH AND status='scheduled' ORDER BY start_datetime LIMIT 1), @CLIENT_MARCO, 'enrolled', NULL);

-- Outsider: Pilates (curioso, vuole provare)
INSERT INTO class_enrollments (class_session_id, client_id, status, checked_in_at) VALUES
((SELECT id FROM class_sessions WHERE class_id=@CLASS_PIL AND status='completed' ORDER BY start_datetime LIMIT 1), @CLIENT_OUTSIDER, 'attended', DATE_SUB(CURDATE(), INTERVAL 4 DAY) + INTERVAL 10 HOUR + INTERVAL 3 MINUTE),
((SELECT id FROM class_sessions WHERE class_id=@CLASS_PIL AND status='scheduled' ORDER BY start_datetime LIMIT 1), @CLIENT_OUTSIDER, 'enrolled', NULL),
((SELECT id FROM class_sessions WHERE class_id=@CLASS_PIL AND status='scheduled' ORDER BY start_datetime LIMIT 1 OFFSET 1), @CLIENT_OUTSIDER, 'waitlisted', NULL);

-- =========================================================
-- 3. REFERRAL — 3 codici + 3 conversioni + 2 rewards
-- =========================================================

INSERT INTO referral_codes (code, user_id, tenant_id, type, referrer_reward, referee_reward, max_uses, current_uses, expires_at, status, metadata) VALUES
('WELCOME50', @TRAINER, @TENANT, 'general', 50.00, 30.00, 100, 2,
 DATE_ADD(NOW(), INTERVAL 6 MONTH), 'active',
 JSON_OBJECT('campaign','Lancio estivo 2026','channels', JSON_ARRAY('instagram','whatsapp'))),
('PT-LUCIA10', @TRAINER, @TENANT, 'trainer', 100.00, 50.00, 20, 1,
 DATE_ADD(NOW(), INTERVAL 3 MONTH), 'active',
 JSON_OBJECT('trainer_personal_code', true,'min_subscription_months',3)),
('CLIENTI20', @TRAINER, @TENANT, 'promotion', 30.00, 20.00, 50, 0,
 DATE_ADD(NOW(), INTERVAL 30 DAY), 'active',
 JSON_OBJECT('promo','Porta un amico','reward_currency','EUR'));

SET @CODE_WELCOME := (SELECT id FROM referral_codes WHERE code='WELCOME50');
SET @CODE_LUCIA := (SELECT id FROM referral_codes WHERE code='PT-LUCIA10');

-- Conversioni (WELCOME50 ha portato Luca e Outsider) — schema richiede referred_user_id NOT NULL
INSERT INTO referral_conversions (referral_code_id, referrer_user_id, referred_user_id, tenant_id, status, referrer_reward_value, referee_reward_value, metadata, completed_at) VALUES
(@CODE_WELCOME, @TRAINER, @USER_LUCA, @TENANT, 'completed', 50.00, 30.00,
 JSON_OBJECT('source','instagram_story','first_purchase','starter_pack'),
 DATE_SUB(NOW(), INTERVAL 14 DAY)),
(@CODE_WELCOME, @TRAINER, @USER_OUTSIDER, @TENANT, 'completed', 50.00, 30.00,
 JSON_OBJECT('source','whatsapp_share'),
 DATE_SUB(NOW(), INTERVAL 7 DAY));

SET @CONV_LUCA := (SELECT id FROM referral_conversions WHERE referral_code_id=@CODE_WELCOME AND referred_user_id=@USER_LUCA);
SET @CONV_OUT := (SELECT id FROM referral_conversions WHERE referral_code_id=@CODE_WELCOME AND referred_user_id=@USER_OUTSIDER);

-- Rewards: 2 awarded al trainer (referrer) + 2 awarded ai referee
INSERT INTO referral_rewards (conversion_id, user_id, tenant_id, reward_type, reward_value, currency, status, awarded_at, expires_at) VALUES
-- Trainer riceve credito per le 2 conversioni completate
(@CONV_LUCA, @TRAINER, @TENANT, 'credit', 50.00, 'EUR', 'awarded',
 DATE_SUB(NOW(), INTERVAL 14 DAY), DATE_ADD(NOW(), INTERVAL 1 YEAR)),
(@CONV_OUT, @TRAINER, @TENANT, 'credit', 50.00, 'EUR', 'awarded',
 DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_ADD(NOW(), INTERVAL 1 YEAR)),
-- Luca (referee) — sconto già usato
(@CONV_LUCA, @USER_LUCA, @TENANT, 'discount', 30.00, 'EUR', 'redeemed',
 DATE_SUB(NOW(), INTERVAL 14 DAY), DATE_ADD(NOW(), INTERVAL 6 MONTH)),
-- Outsider (referee) — sconto in attesa di redenzione
(@CONV_OUT, @USER_OUTSIDER, @TENANT, 'discount', 30.00, 'EUR', 'awarded',
 DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_ADD(NOW(), INTERVAL 6 MONTH));

UPDATE referral_rewards SET redeemed_at = DATE_SUB(NOW(), INTERVAL 10 DAY)
WHERE conversion_id = @CONV_LUCA AND user_id = @USER_LUCA;

-- =========================================================
-- RIEPILOGO
-- =========================================================
SELECT '=== SEDI ===' AS info;
SELECT id, name, location_type, city, status, parent_location_id FROM locations WHERE tenant_id=@TENANT ORDER BY id;

SELECT '=== STAFF PER SEDE ===' AS info;
SELECT sl.id, l.name AS sede, u.email AS staff, sl.role_at_location, sl.is_primary
FROM staff_locations sl
INNER JOIN locations l ON l.id=sl.location_id
INNER JOIN users u ON u.id=sl.user_id
WHERE sl.tenant_id=@TENANT;

SELECT '=== CLASSI ===' AS info;
SELECT c.id, c.name, c.max_participants, c.duration_min,
       (SELECT COUNT(*) FROM class_sessions WHERE class_id=c.id) AS sessioni,
       (SELECT COUNT(*) FROM class_enrollments ce INNER JOIN class_sessions cs ON cs.id=ce.class_session_id WHERE cs.class_id=c.id) AS iscritti
FROM classes c WHERE c.tenant_id=@TENANT;

SELECT '=== REFERRAL CODES ===' AS info;
SELECT code, type, referrer_reward, referee_reward, max_uses, current_uses, status FROM referral_codes WHERE tenant_id=@TENANT;

SELECT '=== REFERRAL CONVERSIONS ===' AS info;
SELECT rc.code, conv.status, conv.referrer_reward_value, conv.referee_reward_value, conv.completed_at
FROM referral_conversions conv
INNER JOIN referral_codes rc ON rc.id=conv.referral_code_id
WHERE conv.tenant_id=@TENANT;

SELECT '=== REFERRAL REWARDS ===' AS info;
SELECT u.email AS beneficiario, rw.reward_type, rw.reward_value, rw.currency, rw.status, rw.awarded_at, rw.redeemed_at
FROM referral_rewards rw
INNER JOIN users u ON u.id=rw.user_id
WHERE rw.tenant_id=@TENANT
ORDER BY rw.id;
