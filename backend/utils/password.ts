/**
 * Password hashing utilities using Bun's built-in crypto APIs
 * Following Bun best practices for secure password handling
 */

/**
 * Hashes a password using Bun's built-in password hashing
 * Uses Argon2id algorithm which is recommended for password hashing
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  
  try {
    // Use Bun's built-in password hashing with Argon2id
    const hashedPassword = await Bun.password.hash(password, {
      algorithm: 'argon2id',
    });
    
    return hashedPassword;
  } catch (error) {
    throw new Error(`Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verifies a password against its hash using Bun's built-in verification
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  
  if (!hash || typeof hash !== 'string') {
    throw new Error('Hash must be a non-empty string');
  }
  
  try {
    // Use Bun's built-in password verification
    const isValid = await Bun.password.verify(password, hash);
    return isValid;
  } catch (error: any) {
    // Handle specific Bun password errors
    if (error?.code === 'PASSWORD_UNSUPPORTED_ALGORITHM' || 
        error?.code === 'PASSWORD_INVALID_ENCODING' ||
        error?.message?.includes('UnsupportedAlgorithm') ||
        error?.message?.includes('InvalidEncoding')) {
      // For invalid hash formats, return false instead of throwing
      return false;
    }
    
    // Log the error but don't expose details for security
    console.error('Password verification failed:', error);
    return false;
  }
}

/**
 * Generates a secure random salt (for additional security if needed)
 * Note: Bun's password.hash already includes salt generation
 */
export function generateSalt(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates password hash format
 */
export function isValidPasswordHash(hash: string): boolean {
  if (!hash || typeof hash !== 'string') {
    return false;
  }
  
  // Argon2id hashes start with $argon2id$
  return hash.startsWith('$argon2id$') && hash.length > 50;
}

/**
 * Secure password comparison to prevent timing attacks
 * Note: This is mainly for educational purposes as Bun.password.verify already handles this
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}