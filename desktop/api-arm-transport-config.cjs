const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_CONFIG = Object.freeze({ enabled: false, host: "127.0.0.1", port: 32145 });

function createApiArmTransportConfigStore({ storageRoot }) {
  const integrationsRoot = path.join(storageRoot, "integrations");
  const configPath = path.join(integrationsRoot, "api-arm-transport.json");

  function normalize(config = {}) {
    const port = Number(config.port);
    return {
      enabled: config.enabled === true,
      host: "127.0.0.1",
      port: Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : DEFAULT_CONFIG.port
    };
  }

  return {
    async load() {
      if (!fs.existsSync(configPath)) return { ...DEFAULT_CONFIG };
      try {
        return normalize(JSON.parse(await fsp.readFile(configPath, "utf8")));
      } catch {
        return { ...DEFAULT_CONFIG };
      }
    },
    async save(config) {
      await fsp.mkdir(integrationsRoot, { recursive: true });
      const normalized = normalize(config);
      const tempPath = `${configPath}.${process.pid}.${Date.now()}.tmp`;
      await fsp.writeFile(tempPath, JSON.stringify(normalized, null, 2), "utf8");
      await fsp.rename(tempPath, configPath);
      return normalized;
    }
  };
}

module.exports = { createApiArmTransportConfigStore, DEFAULT_CONFIG };
