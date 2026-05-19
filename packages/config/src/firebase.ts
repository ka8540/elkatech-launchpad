import type { App } from "firebase-admin/app";
import { getEnv } from "./env";

type AdminAuth = import("firebase-admin/auth").Auth;
type AdminDecodedIdToken = import("firebase-admin/auth").DecodedIdToken;

let cachedApp: App | null = null;
let cachedAuth: AdminAuth | null = null;
let initFailed = false;

function decodePrivateKey(rawKey: string): string {
  // Firebase service account private keys are commonly stored with escaped
  // newlines so they survive being placed in single-line env vars. Convert
  // them back to real newlines before passing them to the Admin SDK.
  return rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;
}

export async function getFirebaseAdminAuth(): Promise<AdminAuth | null> {
  if (cachedAuth) return cachedAuth;
  if (initFailed) return null;

  const env = getEnv();
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    initFailed = true;
    return null;
  }

  const [{ initializeApp, cert, getApps }, { getAuth }] = await Promise.all([
    import("firebase-admin/app"),
    import("firebase-admin/auth"),
  ]);

  if (!cachedApp) {
    const existing = getApps();
    cachedApp = existing[0] ?? initializeApp({
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: decodePrivateKey(env.FIREBASE_PRIVATE_KEY),
      }),
    });
  }

  cachedAuth = getAuth(cachedApp);
  return cachedAuth;
}

export function isFirebaseAdminConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);
}

export async function verifyFirebaseIdToken(idToken: string): Promise<AdminDecodedIdToken | null> {
  const auth = await getFirebaseAdminAuth();
  if (!auth) return null;
  try {
    return await auth.verifyIdToken(idToken);
  } catch {
    return null;
  }
}

/**
 * Lightweight, dependency-free test seam. Tests register a mock here to avoid
 * pulling in the real Firebase Admin SDK or hitting the network.
 */
type Verifier = (idToken: string) => Promise<AdminDecodedIdToken | null>;
let testVerifier: Verifier | null = null;

export function __setFirebaseVerifierForTests(verifier: Verifier | null) {
  testVerifier = verifier;
}

export async function verifyFirebaseIdTokenForRequest(idToken: string): Promise<AdminDecodedIdToken | null> {
  if (testVerifier) return testVerifier(idToken);
  return verifyFirebaseIdToken(idToken);
}
