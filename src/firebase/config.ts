import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  Firestore,
  Unsubscribe
} from 'firebase/firestore';

export interface FirebaseConfigParams {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const STORAGE_KEY_FIREBASE_CONFIG = 'songkarn_garage_firebase_config';

// Real provisioned Firebase configuration for Songkarn Garage Applet
export const defaultFirebaseConfig: FirebaseConfigParams = {
  apiKey: "AIzaSyD7aKEF2fhE4HdW7R9bHlNvgxi2pe3bn0c",
  authDomain: "project-bb64d669-b421-4bcd-a20.firebaseapp.com",
  projectId: "project-bb64d669-b421-4bcd-a20",
  storageBucket: "project-bb64d669-b421-4bcd-a20.firebasestorage.app",
  messagingSenderId: "326652231901",
  appId: "1:326652231901:web:272eb5e7525215345c1b34"
};

export function getStoredFirebaseConfig(): FirebaseConfigParams {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Clean up legacy dummy projectId if it was saved
      if (parsed.projectId === 'songkarn-v1' || !parsed.apiKey?.startsWith('AIzaSy')) {
        localStorage.removeItem(STORAGE_KEY_FIREBASE_CONFIG);
        return defaultFirebaseConfig;
      }
      return { ...defaultFirebaseConfig, ...parsed };
    }
  } catch (e) {
    console.warn('Error reading saved firebase config', e);
  }
  return defaultFirebaseConfig;
}

export function saveStoredFirebaseConfig(config: FirebaseConfigParams) {
  try {
    localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving firebase config', e);
  }
}

let firebaseAppInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;

export function initializeGarageFirebase(customConfig?: FirebaseConfigParams): {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  isLive: boolean;
} {
  const config = customConfig || getStoredFirebaseConfig();
  
  try {
    if (getApps().length > 0) {
      firebaseAppInstance = getApp();
    } else {
      firebaseAppInstance = initializeApp(config);
    }
    
    authInstance = getAuth(firebaseAppInstance);
    try {
      firestoreInstance = getFirestore(firebaseAppInstance);
    } catch (dbErr) {
      console.warn('Firestore instance setup deferred (fallback to offline storage):', dbErr);
      firestoreInstance = null;
    }

    return {
      app: firebaseAppInstance,
      auth: authInstance,
      db: firestoreInstance,
      isLive: true
    };
  } catch (err) {
    console.info('Firebase initialization in local storage fallback mode:', err);
    return {
      app: null,
      auth: null,
      db: null,
      isLive: false
    };
  }
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export async function loginWithGoogleFirebase(): Promise<{ success: boolean; user?: FirebaseUser; error?: string }> {
  try {
    const { auth } = initializeGarageFirebase();
    if (!auth) {
      throw new Error('Firebase Auth not available');
    }
    const result = await signInWithPopup(auth, googleProvider);
    return { success: true, user: result.user };
  } catch (error: any) {
    console.warn('Firebase Google Auth popup error (fallback available):', error);
    return { success: false, error: error.message || 'Google Auth Error' };
  }
}

export async function logoutFirebase(): Promise<void> {
  try {
    const { auth } = initializeGarageFirebase();
    if (auth) {
      await fbSignOut(auth);
    }
  } catch (e) {
    console.error('Firebase sign out error', e);
  }
}
