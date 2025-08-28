import { cert, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from "firebase-admin/firestore";
import serviceAccount from '../firebaseKey.json' assert { type: 'json' };

const app = initializeApp({
    credential: cert(serviceAccount as ServiceAccount)
});

export const firestoreClient = getFirestore(app);
