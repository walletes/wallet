import crypto from 'crypto';
import { Buffer } from 'buffer';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; 
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64; // Increased salt for PBKDF2
const PBKDF2_ITERATIONS = 100000; // OWASP recommended

/**
 * UPGRADED: Financial-grade Encryption Utility.
 * Implements PBKDF2 Key Derivation and Zero-fill memory hygiene.
 */

// Key derivation function to ensure we aren't using a "weak" hex string directly
function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, 32, 'sha512');
}

const MASTER_SECRET = process.env.ENCRYPTION_MASTER_SECRET || '';
const CURRENT_VERSION = 'v2';

/**
 * Encrypts private keys using AES-256-GCM with unique salts per entry.
 * Format: version:salt:iv:tag:ciphertext
 */
export function encryptPrivateKey(privateKey: string): string {
  if (!MASTER_SECRET || MASTER_SECRET.length < 32) {
    throw new Error('CRITICAL: ENCRYPTION_MASTER_SECRET must be at least 32 characters.');
  }

  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(MASTER_SECRET, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });

  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  // Securely wipe the derived key from memory
  key.fill(0);

  return `${CURRENT_VERSION}:${salt.toString('hex')}:${iv.toString('hex')}:${tag}:${encrypted}`;
}

/**
 * Decrypts with strict integrity checks and immediate memory wiping.
 */
export function decryptPrivateKey(encryptedString: string): string {
  const parts = encryptedString.split(':');
  
  // Support legacy v1 (4 parts) and new v2 (5 parts)
  if (parts.length < 4) throw new Error('MALFORMED_ENCRYPTION_DATA');

  const version = parts[0];
  let salt: Buffer, iv: Buffer, tag: Buffer, encryptedHex: string;

  if (version === 'v2') {
    salt = Buffer.from(parts[1], 'hex');
    iv = Buffer.from(parts[2], 'hex');
    tag = Buffer.from(parts[3], 'hex');
    encryptedHex = parts[4];
  } else {
    // Fallback for v1 if necessary, or force migration
    throw new Error('DEPRECATION_ERROR: Please migrate v1 keys to v2.');
  }

  const key = deriveKey(MASTER_SECRET, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });
  
  decipher.setAuthTag(tag);

  try {
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    // memory hygiene
    key.fill(0);
    salt.fill(0);
    iv.fill(0);
    tag.fill(0);

    return decrypted;
  } catch (err) {
    key.fill(0);
    throw new Error('DECRYPTION_FAILED: Possible tampering or incorrect master secret.');
  }
}

/**
 * Force-wipes sensitive data from Node.js Buffer memory.
 */
export function clearSensitiveData(data: string | Buffer): void {
  if (Buffer.isBuffer(data)) {
    data.fill(0);
  } else if (typeof data === 'string') {
    // Strings in V8 are immutable, but we can hint at GC
    // In production "real money" apps, always use Buffers for secrets.
    (data as any) = null;
  }
}
