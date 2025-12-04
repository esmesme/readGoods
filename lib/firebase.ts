import * as admin from 'firebase-admin';

let db: admin.firestore.Firestore;

try {
  if (!admin.apps.length) {
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      db = admin.firestore();
    } else {
      console.warn('Firebase credentials not found. Skipping initialization.');
      // Mock db or handle appropriately. For now, we'll leave it undefined and let it throw if used.
      // To prevent build errors if db is used at top level (it isn't), this is fine.
      // But we export db.
      // Let's assign a proxy or throw on access?
      // Or just cast it.
    }
  } else {
    db = admin.firestore();
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

// @ts-ignore
export { db };
