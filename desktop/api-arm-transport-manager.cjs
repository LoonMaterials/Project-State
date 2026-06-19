const fsp = require("node:fs/promises");
const path = require("node:path");
const { createApiArmTransport } = require("./api-arm-transport.cjs");
const { createApiArmSecretStore } = require("./api-arm-secret-store.cjs");
const { createApiArmTransportConfigStore } = require("./api-arm-transport-config.cjs");

function createApiArmTransportManager({ storageRoot, safeStorage, intakeArms, fileIntake }) {
  const secrets = createApiArmSecretStore({ storageRoot, safeStorage });
  const configs = createApiArmTransportConfigStore({ storageRoot });
  const transport = createApiArmTransport({ intakeArms, fileIntake, getToken: () => secrets.getToken() });
  let config = null;

  async function audit(event, context = {}, details = {}) {
    const logPath = path.join(storageRoot, "logs", "api-arm-transport-audit.jsonl");
    await fsp.mkdir(path.dirname(logPath), { recursive: true });
    const record = {
      event,
      at: new Date().toISOString(),
      actorId: clean(context.actorId),
      reason: clean(context.reason),
      ...details
    };
    await fsp.appendFile(logPath, `${JSON.stringify(record)}\n`, "utf8");
  }

  function requireContext(context = {}) {
    if (!clean(context.actorId)) throw new Error("Actor is required for local transport changes.");
    if (!clean(context.reason)) throw new Error("Reason is required for local transport changes.");
  }

  async function status() {
    if (!config) config = await configs.load();
    const secretStatus = await secrets.status();
    return {
      ...transport.status(),
      configuredEnabled: config.enabled,
      configuredPort: config.port,
      encryptionAvailable: secretStatus.encryptionAvailable,
      tokenConfigured: secretStatus.tokenConfigured
    };
  }

  return {
    async initialize() {
      config = await configs.load();
      if (config.enabled) {
        try {
          await secrets.ensureToken();
          await transport.start({ port: config.port });
        } catch (error) {
          await audit("auto-start-failed", {}, { code: error?.code || "START_FAILED" });
        }
      }
      return status();
    },
    status,
    async enable(input = {}) {
      requireContext(input);
      const tokenResult = await secrets.ensureToken();
      const port = Number(input.port || config?.port || 32145);
      if (transport.status().running && transport.status().port !== port) await transport.stop();
      const running = await transport.start({ port });
      config = await configs.save({ enabled: true, port: running.port });
      await audit("enabled", input, { port: running.port, tokenCreated: tokenResult.created });
      return { ...(await status()), token: tokenResult.created ? tokenResult.token : "", tokenCreated: tokenResult.created };
    },
    async disable(input = {}) {
      requireContext(input);
      await transport.stop();
      config = await configs.save({ ...(config || {}), enabled: false });
      await audit("disabled", input, { port: config.port });
      return status();
    },
    async rotateToken(input = {}) {
      requireContext(input);
      const result = await secrets.rotateToken();
      await audit("token-rotated", input, { port: transport.status().port || config?.port || 0 });
      return { ...(await status()), token: result.token, tokenRotated: true };
    },
    async revoke(input = {}) {
      requireContext(input);
      await transport.stop();
      await secrets.revoke();
      config = await configs.save({ ...(config || {}), enabled: false });
      await audit("revoked", input, { port: config.port });
      return status();
    },
    async stopForShutdown() {
      return transport.stop();
    }
  };
}

function clean(value) {
  return String(value || "").trim();
}

module.exports = { createApiArmTransportManager };
