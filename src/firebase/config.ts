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
  initializeFirestore,
  setLogLevel,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  limit,
  query,
  deleteDoc,
  onSnapshot,
  Firestore,
  Unsubscribe
} from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';
import { setStoredGoogleToken } from '../services/googleSheetsService';

export interface FirebaseConfigParams {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  oAuthClientId?: string;
}

const STORAGE_KEY_FIREBASE_CONFIG = 'songkarn_garage_firebase_config';

// Real provisioned Firebase configuration for Songkarn Garage Applet
export const defaultFirebaseConfig: FirebaseConfigParams = {
  apiKey: appletConfig.apiKey || "AIzaSyD7aKEF2fhE4HdW7R9bHlNvgxi2pe3bn0c",
  authDomain: appletConfig.authDomain || "project-bb64d669-b421-4bcd-a20.firebaseapp.com",
  projectId: appletConfig.projectId || "project-bb64d669-b421-4bcd-a20",
  storageBucket: appletConfig.storageBucket || "project-bb64d669-b421-4bcd-a20.firebasestorage.app",
  messagingSenderId: appletConfig.messagingSenderId || "326652231901",
  appId: appletConfig.appId || "1:326652231901:web:272eb5e7525215345c1b34",
  oAuthClientId: appletConfig.oAuthClientId || "326652231901-0juius0ojgqjc4muokto8u2uk51p132k.apps.googleusercontent.com"
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

// Set Firestore internal log level to 'silent' to prevent harmless stream retry/offline notifications from leaking to console
try {
  setLogLevel('silent');
} catch {
  // ignore
}

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
    
    if (!authInstance) {
      authInstance = getAuth(firebaseAppInstance);
    }

    if (!firestoreInstance) {
      try {
        // Use Long-Polling WebChannel exclusively to avoid WebSocket connection drops in iframe/sandbox environments
        firestoreInstance = initializeFirestore(firebaseAppInstance, {
          experimentalForceLongPolling: true,
        });
      } catch {
        firestoreInstance = getFirestore(firebaseAppInstance);
      }
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
// Add Google Sheets and Drive permissions for direct integration
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export async function loginWithGoogleFirebase(): Promise<{ success: boolean; user?: FirebaseUser; accessToken?: string; error?: string }> {
  try {
    const { auth } = initializeGarageFirebase();
    if (!auth) {
      throw new Error('Firebase Auth not available');
    }
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      setStoredGoogleToken(credential.accessToken);
    }
    return {
      success: true,
      user: result.user,
      accessToken: credential?.accessToken || undefined
    };
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

/**
 * Diagnostic helper: Tests live connectivity to Firestore
 */
export async function testFirebaseConnection(): Promise<{
  connected: boolean;
  latencyMs: number;
  mode: 'firestore' | 'offline_fallback';
  message: string;
  projectId: string;
}> {
  const startTime = Date.now();
  const config = getStoredFirebaseConfig();
  try {
    const { db, isLive } = initializeGarageFirebase();
    if (!isLive || !db) {
      return {
        connected: false,
        latencyMs: 0,
        mode: 'offline_fallback',
        message: 'Firebase SDK ไม่พร้อมใช้งานในโหมด Live กำลังใช้ระบบ Local-First Storage สำรอง',
        projectId: config.projectId,
      };
    }

    // Ping Firestore with a fast write & read on a test heartbeat document
    const testDocRef = doc(db, '_connection_test', 'status');
    await setDoc(testDocRef, {
      pingAt: new Date().toISOString(),
      testedBy: 'Songkarn Garage Applet',
      timestamp: Date.now()
    }, { merge: true });

    const latency = Date.now() - startTime;
    return {
      connected: true,
      latencyMs: latency,
      mode: 'firestore',
      message: `เชื่อมต่อ Firebase Firestore สำเร็จ (เวลาตอบสนอง: ${latency}ms)`,
      projectId: config.projectId,
    };
  } catch (err: any) {
    return {
      connected: false,
      latencyMs: Date.now() - startTime,
      mode: 'offline_fallback',
      message: `ไม่สามารถเชื่อมต่อ Firestore: ${err?.message || 'Permission or Network error'}`,
      projectId: config.projectId,
    };
  }
}

/**
 * Recursively cleans data objects before sending to Firestore setDoc/updateDoc/addDoc.
 * Firestore strictly rejects documents containing fields with value `undefined`.
 * This helper strips any keys with `undefined` values at any depth.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object') {
    if (data instanceof Date) {
      return data.toISOString() as any;
    }
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}
