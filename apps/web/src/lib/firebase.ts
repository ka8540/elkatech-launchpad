import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
  type UserCredential,
} from "firebase/auth";

type FirebaseEnv = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
};

function readEnv(): FirebaseEnv | null {
  const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;
  const apiKey = env.VITE_FIREBASE_API_KEY;
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = env.VITE_FIREBASE_PROJECT_ID;
  const appId = env.VITE_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !appId) {
    if (typeof window !== "undefined" && env.DEV) {
      // Dev-only: surface which Firebase vars are missing so the user can
      // quickly tell whether their .env / envDir wiring is working.
      // eslint-disable-next-line no-console
      console.warn("[firebase] not configured — missing:", {
        VITE_FIREBASE_API_KEY: !!apiKey,
        VITE_FIREBASE_AUTH_DOMAIN: !!authDomain,
        VITE_FIREBASE_PROJECT_ID: !!projectId,
        VITE_FIREBASE_APP_ID: !!appId,
      });
    }
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || undefined,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || undefined,
  };
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;

export function isFirebaseConfigured(): boolean {
  return readEnv() !== null;
}

export function getFirebaseAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  const cfg = readEnv();
  if (!cfg) {
    throw new Error("Firebase is not configured. Set VITE_FIREBASE_* environment variables.");
  }
  if (!cachedApp) {
    cachedApp = getApps()[0] ?? initializeApp(cfg);
  }
  cachedAuth = getAuth(cachedApp);
  return cachedAuth;
}

export async function firebaseSignUpEmail(email: string, password: string): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  // Best-effort: trigger Firebase's own verification email so the user has a
  // hosted verification flow. Failures are non-fatal.
  try {
    await sendEmailVerification(credential.user);
  } catch {
    // ignored — the user can still continue and request a new verification later.
  }
  return credential;
}

export async function firebaseSignInEmail(email: string, password: string): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function firebaseSignInWithGoogle(): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
}

export async function firebaseSendPasswordReset(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email);
}

export async function firebaseSignOut(): Promise<void> {
  if (!cachedAuth) return;
  await signOut(cachedAuth);
}

export async function getFirebaseIdToken(user: User): Promise<string> {
  return user.getIdToken(/* forceRefresh */ false);
}
