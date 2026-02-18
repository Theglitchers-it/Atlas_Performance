/**
 * Firebase Admin SDK Configuration
 * Utilizzato per Firebase Cloud Messaging (FCM) push notifications
 * su piattaforme native (Android/iOS)
 */

const admin = require('firebase-admin');
const { createServiceLogger } = require('./logger');
const logger = createServiceLogger('FIREBASE');

let firebaseApp = null;

/**
 * Inizializza Firebase Admin SDK
 */
const initFirebase = () => {
    if (firebaseApp) return firebaseApp;

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId || !privateKey || !clientEmail) {
        logger.warn('Credenziali mancanti. FCM push notifications disabilitate.');
        logger.warn('Configura FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL nel .env');
        return null;
    }

    try {
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                privateKey,
                clientEmail
            })
        });
        logger.info('Admin SDK inizializzato');
        return firebaseApp;
    } catch (error) {
        logger.error('Errore inizializzazione', { error: error.message });
        return null;
    }
};

/**
 * Ottieni istanza Firebase Messaging
 */
const getMessaging = () => {
    if (!firebaseApp) initFirebase();
    if (!firebaseApp) return null;
    return admin.messaging();
};

module.exports = { initFirebase, getMessaging };
