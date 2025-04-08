const crypto = require('crypto');

/**
 * Generate a random key of specified length
 * @param {number} length - Key length in bytes
 * @returns {Buffer} - Random key
 */
exports.generateRandomKey = (length = 32) => {
  return crypto.randomBytes(length);
};

/**
 * Generate an RSA key pair
 * @returns {Object} - Object containing public and private keys in PEM format
 */
exports.generateKeyPair = () => {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    }, (err, publicKey, privateKey) => {
      if (err) {
        reject(err);
      } else {
        resolve({ publicKey, privateKey });
      }
    });
  });
};

/**
 * Encrypt data using AES-256-GCM
 * @param {Buffer|string} data - Data to encrypt
 * @param {Buffer} key - Encryption key (32 bytes for AES-256)
 * @returns {Object} - Object containing iv, encrypted data, and auth tag
 */
exports.encryptAES = (data, key) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag().toString('base64');
  
  return {
    iv: iv.toString('base64'),
    encrypted,
    authTag
  };
};

/**
 * Decrypt data using AES-256-GCM
 * @param {Object} encryptedData - Object containing iv, encrypted data, and auth tag
 * @param {Buffer} key - Decryption key (same as encryption key)
 * @returns {string} - Decrypted data
 */
exports.decryptAES = (encryptedData, key) => {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(encryptedData.iv, 'base64')
  );
  
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

/**
 * Encrypt data using RSA public key
 * @param {Buffer|string} data - Data to encrypt
 * @param {string} publicKeyPEM - RSA public key in PEM format
 * @returns {string} - Encrypted data in base64 format
 */
exports.encryptRSA = (data, publicKeyPEM) => {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKeyPEM,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    buffer
  );
  
  return encrypted.toString('base64');
};

/**
 * Decrypt data using RSA private key
 * @param {string} encryptedData - Encrypted data in base64 format
 * @param {string} privateKeyPEM - RSA private key in PEM format
 * @returns {string} - Decrypted data
 */
exports.decryptRSA = (encryptedData, privateKeyPEM) => {
  const buffer = Buffer.from(encryptedData, 'base64');
  const decrypted = crypto.privateDecrypt(
    {
      key: privateKeyPEM,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    buffer
  );
  
  return decrypted.toString('utf8');
};

/**
 * Generate a secure hash of data
 * @param {string} data - Data to hash
 * @param {string} salt - Salt to use for hashing
 * @returns {string} - Hash in hex format
 */
exports.hash = (data, salt) => {
  return crypto.pbkdf2Sync(
    data,
    salt,
    10000,
    64,
    'sha512'
  ).toString('hex');
};

/**
 * Verify a hash against the original data
 * @param {string} data - Data to verify
 * @param {string} hash - Hash to verify against
 * @param {string} salt - Salt used for hashing
 * @returns {boolean} - True if hash matches, false otherwise
 */
exports.verifyHash = (data, hash, salt) => {
  const calcHash = this.hash(data, salt);
  return calcHash === hash;
};

/**
 * Generate a random salt
 * @param {number} length - Salt length in bytes
 * @returns {string} - Salt in hex format
 */
exports.generateSalt = (length = 16) => {
  return crypto.randomBytes(length).toString('hex');
};
