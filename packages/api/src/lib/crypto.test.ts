import { describe, expect, it } from "vitest";
import { encrypt, decrypt } from "./crypto";

describe("crypto", () => {
  it("round-trips plaintext through encrypt/decrypt", () => {
    const plaintext = "hello beam, this is a secret";
    const ciphertext = encrypt(plaintext);

    expect(ciphertext).not.toEqual(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const plaintext = "same input";
    expect(encrypt(plaintext)).not.toEqual(encrypt(plaintext));
  });

  it("handles empty-adjacent and unicode content", () => {
    const plaintext = "emoji: 🚀, multi-line\ntext, and unicode: héllo";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it("throws when the ciphertext has been tampered with", () => {
    const ciphertext = encrypt("tamper me");
    const buffer = Buffer.from(ciphertext, "base64");
    // Flip a byte inside the ciphertext portion to invalidate the auth tag.
    buffer[buffer.length - 1] ^= 0xff;
    const tampered = buffer.toString("base64");

    expect(() => decrypt(tampered)).toThrow();
  });

  it("throws when ENCRYPTION_KEY is missing", () => {
    const original = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    try {
      expect(() => encrypt("x")).toThrow(/ENCRYPTION_KEY/);
    } finally {
      process.env.ENCRYPTION_KEY = original;
    }
  });
});
