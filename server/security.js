import { randomBytes, scryptSync, timingSafeEqual, createCipheriv, createDecipheriv } from "node:crypto";

const KEY_LENGTH = 64;
const ALGORITHM = "aes-256-cbc";

// derive stable 32-byte key from ENCRYPTION_KEY or use fallback
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
  ? scryptSync(process.env.ENCRYPTION_KEY, "salt", 32)
  : Buffer.from("grafops-node-key-32-chars-long!!", "utf8");

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [algorithm, salt, hash] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, KEY_LENGTH);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function encrypt(text) {
  if (!text) return "";
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `enc:${iv.toString("hex")}:${encrypted}`;
}

export function decrypt(cipherText) {
  if (!cipherText) return "";
  if (!cipherText.startsWith("enc:")) return cipherText; // fallback for unencrypted values
  try {
    const [, ivHex, encryptedHex] = cipherText.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return "";
  }
}


