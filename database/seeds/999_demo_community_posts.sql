-- Seed temporaneo: 6 post demo per Community
SET @TENANT := '00000000-0000-0000-0000-000000000001';

-- Bio + city per arricchire i profili pubblici demo
UPDATE users SET bio='Personal Trainer certificato ISSA. Aiuto i miei clienti a raggiungere i propri obiettivi con un approccio scientifico e sostenibile. Specializzato in forza, ipertrofia e dimagrimento.', city='Olbia' WHERE id=3;
UPDATE users SET bio='Coach fitness e nutrizione presso Atlas. Appassionato di calisthenics e mobility.', city='Sassari' WHERE id=4;
UPDATE users SET bio='Cliente Atlas dal 2024. Obiettivo: ricomposizione corporea + maratona di Cagliari 2026.', city='Olbia' WHERE id=5;
UPDATE users SET bio='Nuovo iscritto, voglio rimettermi in forma!', city='Tempio Pausania' WHERE id=26;

-- Post 1: motivation con 2 immagini (gym workout)
INSERT INTO community_posts (tenant_id, author_id, creator_trainer_id, content, post_type, attachments, visibility_type, likes_count, comments_count, is_active, created_at)
VALUES (@TENANT, 3, 3,
'Hey Atlas Fam! Stamattina ho appena chiuso una sessione HIIT da urlo per iniziare la giornata col botto. Quando ti spingi al limite, scopri di cosa sei capace. #HIITWorkout #HealthyEating',
'motivation',
'[{"type":"image","url":"https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80","originalName":"gym1.jpg"},{"type":"image","url":"https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80","originalName":"gym2.jpg"}]',
'global', 215, 11, 1, DATE_SUB(NOW(), INTERVAL 3 MINUTE));

-- Post 2: yoga vibes (text only)
INSERT INTO community_posts (tenant_id, author_id, creator_trainer_id, content, post_type, attachments, visibility_type, likes_count, comments_count, is_active, created_at)
VALUES (@TENANT, 5, 3,
'Morning vibes! Ho appena completato una rinfrescante sessione di yoga per iniziare la giornata col piede giusto. Come vi piace iniziare le vostre mattine? #YogaLove #WellnessWednesday',
'tip', NULL, 'global', 84, 7, 1, DATE_SUB(NOW(), INTERVAL 25 MINUTE));

-- Post 3: tip sul sonno
INSERT INTO community_posts (tenant_id, author_id, creator_trainer_id, content, post_type, attachments, visibility_type, likes_count, comments_count, is_active, created_at)
VALUES (@TENANT, 3, 3,
'CONSIGLIO DEL GIORNO: il sonno e l anabolizzante naturale piu potente. Punta a 7-9 ore di qualita ogni notte. I tuoi muscoli e il tuo metabolismo ti ringrazieranno. #Recovery #Sleep #Performance',
'tip', NULL, 'global', 142, 23, 1, DATE_SUB(NOW(), INTERVAL 2 HOUR));

-- Post 4: achievement con immagine team
INSERT INTO community_posts (tenant_id, author_id, creator_trainer_id, content, post_type, attachments, visibility_type, likes_count, comments_count, is_active, created_at)
VALUES (@TENANT, 4, 4,
'Mese di novembre: 18 nuove iscrizioni, +12% retention dei clienti rispetto a ottobre. Grazie a tutti voi per la fiducia! #AtlasGym #Community',
'achievement',
'[{"type":"image","url":"https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80","originalName":"gym-team.jpg"}]',
'global', 67, 4, 1, DATE_SUB(NOW(), INTERVAL 5 HOUR));

-- Post 5: domanda neofita
INSERT INTO community_posts (tenant_id, author_id, creator_trainer_id, content, post_type, attachments, visibility_type, likes_count, comments_count, is_active, created_at)
VALUES (@TENANT, 26, 3,
'Domanda da neofita: meglio cardio prima o dopo i pesi per chi punta al dimagrimento? Voi cosa ne pensate?',
'question', NULL, 'global', 31, 19, 1, DATE_SUB(NOW(), INTERVAL 1 DAY));

-- Post 6: annuncio corsi mobility
INSERT INTO community_posts (tenant_id, author_id, creator_trainer_id, content, post_type, attachments, visibility_type, likes_count, comments_count, is_active, created_at)
VALUES (@TENANT, 3, 3,
'ANNUNCIO: da gennaio partono i corsi di mobility ogni martedi e giovedi alle 19:00. Posti limitati a 8 persone. Prenotatevi in segreteria! #Mobility #Atlas',
'announcement', NULL, 'global', 98, 14, 1, DATE_SUB(NOW(), INTERVAL 2 DAY));

SELECT 'POSTS_INSERTED' AS status, COUNT(*) AS total FROM community_posts WHERE tenant_id=@TENANT;
