import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // NIST recommended 96-bit IV
const AUTH_TAG_LENGTH = 16; // Standard 128-bit authentication tag

// Support for key rotation: map versions to keys from env
const KEY_MAP: Record<string, Buffer> = {
  v1: Buffer.from(process.env.ENCRYPTION_KEY_V1 || '', 'hex'),
};

const CURRENT_VERSION = 'v1';

/**
 * Encrypts sensitive data with versioned AES-256-GCM
 * Format: version:iv:tag:ciphertext
 */
export function encryptPrivateKey(privateKey: string): string {
  const key = KEY_MAP[CURRENT_VERSION];
  if (!key || key.length !== 32) {
    throw new Error(`CRITICAL: Encryption key for ${CURRENT_VERSION} must be 32 bytes hex.`);
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return `${CURRENT_VERSION}:${iv.toString('hex')}:${tag}:${encrypted}`;
}

/**
 * Decrypts with automatic version detection and memory cleanup
 */
export function decryptPrivateKey(encryptedString: string): string {
  const parts = encryptedString.split(':');
  if (parts.length !== 4) throw new Error('Invalid encrypted data format.');

  const [version, ivHex, tagHex, encryptedHex] = parts;
  const key = KEY_MAP[version];
  if (!key) throw new Error(`Unsupported encryption version: ${version}`);

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  // Memory Hygiene: Wipe transient buffers from RAM immediately
  iv.fill(0);
  tag.fill(0);

  return decrypted;
}

/**
 * Securely clear a string from memory (best-effort for V8)
 */
export function clearSensitiveData(data: string | Buffer): void {
  if (Buffer.isBuffer(data)) {
    data.fill(0);
  }
}
