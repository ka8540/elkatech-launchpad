import { afterEach, describe, expect, it } from "vitest";
import { __setFirebaseVerifierForTests, verifyFirebaseIdTokenForRequest } from "./firebase";

describe("verifyFirebaseIdTokenForRequest", () => {
  afterEach(() => {
    __setFirebaseVerifierForTests(null);
  });

  it("routes to the registered test verifier", async () => {
    const fakeDecoded = {
      uid: "uid-123",
      email: "user@example.com",
      email_verified: true,
      name: "Test User",
      firebase: { sign_in_provider: "password" },
    } as any;

    __setFirebaseVerifierForTests(async (token) => {
      if (token === "good") return fakeDecoded;
      return null;
    });

    expect(await verifyFirebaseIdTokenForRequest("good")).toEqual(fakeDecoded);
    expect(await verifyFirebaseIdTokenForRequest("bad")).toBeNull();
  });

  it("returns null from the test verifier without touching the real SDK", async () => {
    __setFirebaseVerifierForTests(async () => null);
    expect(await verifyFirebaseIdTokenForRequest("anything")).toBeNull();
  });
});
