import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "crypto";
import { compare as compareBcrypt } from "bcryptjs";
const SCRYPT_PREFIX = "scrypt";
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_SALT_LENGTH = 16;
const SCRYPT_COST = 1 << 15;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const LEGACY_SHA256_PATTERN = /^[a-f0-9]{64}$/i;

function getScryptHashParts(hash: string) {
  const [prefix, cost, blockSize, parallelization, salt, derivedKey] = hash.split("$");

  if (
    prefix !== SCRYPT_PREFIX ||
    !cost ||
    !blockSize ||
    !parallelization ||
    !salt ||
    !derivedKey
  ) {
    return null;
  }

  const parsedCost = Number(cost);
  const parsedBlockSize = Number(blockSize);
  const parsedParallelization = Number(parallelization);

  if (
    !Number.isInteger(parsedCost) ||
    !Number.isInteger(parsedBlockSize) ||
    !Number.isInteger(parsedParallelization)
  ) {
    return null;
  }

  return {
    cost: parsedCost,
    blockSize: parsedBlockSize,
    parallelization: parsedParallelization,
    salt: Buffer.from(salt, "base64url"),
    derivedKey: Buffer.from(derivedKey, "base64url")
  };
}

async function deriveScryptKey(
  password: string,
  salt: Buffer,
  cost = SCRYPT_COST,
  blockSize = SCRYPT_BLOCK_SIZE,
  parallelization = SCRYPT_PARALLELIZATION
) {
  return await new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(password, salt, SCRYPT_KEY_LENGTH, {
      N: cost,
      r: blockSize,
      p: parallelization,
      maxmem: 256 * cost * blockSize
    }, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

async function verifyScryptPassword(password: string, storedHash: string) {
  const parts = getScryptHashParts(storedHash);

  if (!parts) {
    return false;
  }

  const derivedKey = await deriveScryptKey(
    password,
    parts.salt,
    parts.cost,
    parts.blockSize,
    parts.parallelization
  );

  if (derivedKey.length !== parts.derivedKey.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, parts.derivedKey);
}

async function verifyLegacySha256Password(password: string, storedHash: string) {
  if (!LEGACY_SHA256_PATTERN.test(storedHash)) {
    return false;
  }

  const passwordHash = createHash("sha256").update(password).digest();
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (passwordHash.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(passwordHash, storedBuffer);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(SCRYPT_SALT_LENGTH);
  const derivedKey = await deriveScryptKey(password, salt);

  return [
    SCRYPT_PREFIX,
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString("base64url"),
    derivedKey.toString("base64url")
  ].join("$");
}

export async function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) {
    return {
      isValid: false,
      needsRehash: false
    };
  }

  if (storedHash.startsWith(`${SCRYPT_PREFIX}$`)) {
    return {
      isValid: await verifyScryptPassword(password, storedHash),
      needsRehash: false
    };
  }

  if (storedHash.startsWith("$2")) {
    return {
      isValid: await compareBcrypt(password, storedHash),
      needsRehash: true
    };
  }

  if (LEGACY_SHA256_PATTERN.test(storedHash)) {
    return {
      isValid: await verifyLegacySha256Password(password, storedHash),
      needsRehash: true
    };
  }

  return {
    isValid: false,
    needsRehash: false
  };
}

export function getPasswordHashAlgorithm(hash: string | null | undefined) {
  if (!hash) {
    return "none";
  }

  if (hash.startsWith(`${SCRYPT_PREFIX}$`)) {
    return "scrypt";
  }

  if (hash.startsWith("$2")) {
    return "bcrypt";
  }

  if (LEGACY_SHA256_PATTERN.test(hash)) {
    return "sha256";
  }

  return "unknown";
}
