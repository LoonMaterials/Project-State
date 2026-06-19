const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

function createApiArmSecretStore({ storageRoot, safeStorage }) {
  const integrationsRoot = path.join(storageRoot, "integrations");
  const tokenPath = path.join(integrationsRoot, "api-arm-token.bin");

  function encryptionReady() {
    return Boolean(safeStorage && typeof safeStorage.isEncryptionAvailable === "function" && safeStorage.isEncryptionAvailable());
  }

  async function readToken() {
    if (!fs.existsSync(tokenPath)) return "";
    if (!encryptionReady()) throw new Error("Secure token storage is unavailable.");
    const encrypted = await fsp.readFile(tokenPath);
    return safeStorage.decryptString(encrypted);
  }

  async function writeNewToken() {
    if (!encryptionReady()) throw new Error("Secure token storage is unavailable.");
    await fsp.mkdir(integrationsRoot, { recursive: true });
    const token = crypto.randomBytes(32).toString("base64url");
    const encrypted = safeStorage.encryptString(token);
    const tempPath = `${tokenPath}.${process.pid}.${Date.now()}.tmp`;
    await fsp.writeFile(tempPath, encrypted, { mode: 0o600 });
    await fsp.rename(tempPath, tokenPath);
    try {
      await fsp.chmod(tokenPath, 0o600);
    } catch {}
    return token;
  }

  return {
    encryptionReady,
    async status() {
      return { encryptionAvailable: encryptionReady(), tokenConfigured: fs.existsSync(tokenPath) };
    },
    async ensureToken() {
      const existing = await readToken();
      if (existing) return { token: existing, created: false };
      return { token: await writeNewToken(), created: true };
    },
    async getToken() {
      return readToken();
    },
    async rotateToken() {
      return { token: await writeNewToken(), created: true, rotated: true };
    },
    async revoke() {
      await fsp.rm(tokenPath, { force: true });
      return { revoked: true };
    }
  };
}

module.exports = { createApiArmSecretStore };
