const http = require("node:http");
const crypto = require("node:crypto");

const HOST = "127.0.0.1";
const DEFAULT_LIMITS = Object.freeze({
  maxBodyBytes: 1048576,
  maxFileBytes: 26214400,
  maxMetadataHeaderBytes: 8192,
  maxItemsPerEnvelope: 100,
  requestsPerMinutePerAddress: 60,
  headersTimeoutMs: 10000,
  requestTimeoutMs: 15000
});

function createApiArmTransport({ intakeArms, fileIntake = null, getToken, limits = {} }) {
  const policy = { ...DEFAULT_LIMITS, ...limits };
  let server = null;
  let lastError = "";
  const requestWindows = new Map();

  async function handle(request, response) {
    setResponseHeaders(response);
    const remoteAddress = normalizeRemoteAddress(request.socket.remoteAddress);
    if (remoteAddress !== HOST) return sendJson(response, 403, transportError("LOCAL_ONLY", "Local loopback requests only."));
    if (request.headers.origin) return sendJson(response, 403, transportError("BROWSER_ORIGIN_REJECTED", "Browser-origin requests are not accepted."));
    if (!withinRateLimit(requestWindows, remoteAddress, policy.requestsPerMinutePerAddress)) return sendJson(response, 429, transportError("RATE_LIMITED", "Local transport rate limit exceeded."));
    const token = await getToken();
    if (!token || !validBearerToken(request.headers.authorization, token)) return sendJson(response, 401, transportError("UNAUTHORIZED", "A valid bearer token is required."));

    const url = new URL(request.url || "/", `http://${HOST}`);
    if (request.method === "GET" && url.pathname === "/v0.1/capabilities") {
      return sendJson(response, 200, await intakeArms.describeCapabilities());
    }
    if (request.method === "POST" && url.pathname === "/v0.1/submissions") {
      if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("application/json")) return sendJson(response, 415, transportError("JSON_REQUIRED", "Submission content type must be application/json."));
      const body = await readJsonBody(request, policy.maxBodyBytes);
      if (body.error) return sendJson(response, body.status, transportError(body.error, body.message));
      if (Array.isArray(body.value?.items) && body.value.items.length > policy.maxItemsPerEnvelope) return sendJson(response, 413, transportError("TOO_MANY_ITEMS", `A submission may contain at most ${policy.maxItemsPerEnvelope} items.`));
      const receipt = await intakeArms.submitEnvelope(body.value);
      return sendJson(response, receipt.status === "rejected" ? 422 : receipt.status === "duplicate" ? 200 : 202, receipt);
    }
    if (request.method === "POST" && url.pathname === "/v0.1/files") {
      if (!fileIntake || typeof fileIntake.submitFile !== "function") return sendJson(response, 503, transportError("FILE_INTAKE_UNAVAILABLE", "File Intake is unavailable."));
      if (String(request.headers["content-type"] || "").toLowerCase() !== "application/octet-stream") return sendJson(response, 415, transportError("BINARY_REQUIRED", "File content type must be application/octet-stream."));
      const metadataResult = decodeFileMetadata(request.headers["x-project-state-file-metadata"], policy.maxMetadataHeaderBytes);
      if (metadataResult.error) return sendJson(response, 400, transportError(metadataResult.error, metadataResult.message));
      const body = await readRawBody(request, policy.maxFileBytes);
      if (body.error) return sendJson(response, body.status, transportError(body.error, body.message));
      const receipt = await fileIntake.submitFile({ metadata: metadataResult.value, bytes: body.value });
      return sendJson(response, receipt.status === "rejected" ? 422 : receipt.status === "duplicate" ? 200 : 202, receipt);
    }
    const receiptMatch = request.method === "GET" ? url.pathname.match(/^\/v0\.1\/receipts\/([^/]+)$/) : null;
    if (receiptMatch) {
      const receipt = await intakeArms.getReceipt(decodeURIComponent(receiptMatch[1]));
      return receipt ? sendJson(response, 200, receipt) : sendJson(response, 404, transportError("RECEIPT_NOT_FOUND", "No receipt was found for this submission ID."));
    }
    return sendJson(response, 404, transportError("NOT_FOUND", "Transport endpoint not found."));
  }

  return {
    async start({ port = 32145 } = {}) {
      if (server) return this.status();
      const normalizedPort = normalizePort(port);
      lastError = "";
      server = http.createServer((request, response) => {
        handle(request, response).catch(() => sendJson(response, 500, transportError("TRANSPORT_FAILURE", "The local transport could not complete the request.")));
      });
      server.headersTimeout = policy.headersTimeoutMs;
      server.requestTimeout = policy.requestTimeoutMs;
      server.keepAliveTimeout = 5000;
      try {
        await listen(server, normalizedPort, HOST);
      } catch (error) {
        lastError = error?.code || "LISTEN_FAILED";
        server = null;
        throw error;
      }
      return this.status();
    },
    async stop() {
      if (!server) return this.status();
      const closing = server;
      server = null;
      await close(closing);
      return this.status();
    },
    status() {
      const address = server?.address();
      return {
        running: Boolean(server),
        host: HOST,
        port: typeof address === "object" && address ? address.port : 0,
        baseUrl: typeof address === "object" && address ? `http://${HOST}:${address.port}` : "",
        lastError
      };
    }
  };
}

function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}

function close(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

function normalizePort(value) {
  const port = Number(value);
  if (port === 0) return 0;
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Local transport port must be between 1024 and 65535.");
  return port;
}

function normalizeRemoteAddress(value = "") {
  return value === "::ffff:127.0.0.1" ? HOST : value;
}

function validBearerToken(header = "", expected = "") {
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const actualBuffer = Buffer.from(match[1]);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function withinRateLimit(windows, key, limit) {
  const now = Date.now();
  const windowStart = now - 60000;
  const entries = (windows.get(key) || []).filter((timestamp) => timestamp >= windowStart);
  if (entries.length >= limit) {
    windows.set(key, entries);
    return false;
  }
  entries.push(now);
  windows.set(key, entries);
  return true;
}

function readJsonBody(request, maxBytes) {
  return readRawBody(request, maxBytes).then((body) => {
    if (body.error) return body;
    try {
      return { value: JSON.parse(body.value.toString("utf8")) };
    } catch {
      return { error: "INVALID_JSON", message: "Request body is not valid JSON.", status: 400 };
    }
  });
}

function readRawBody(request, maxBytes) {
  return new Promise((resolve) => {
    const chunks = [];
    let bytes = 0;
    let tooLarge = false;
    request.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) tooLarge = true;
      else chunks.push(chunk);
    });
    request.on("end", () => {
      if (tooLarge) return resolve({ error: "PAYLOAD_TOO_LARGE", message: `Request body exceeds ${maxBytes} bytes.`, status: 413 });
      resolve({ value: Buffer.concat(chunks) });
    });
    request.on("error", () => resolve({ error: "REQUEST_FAILED", message: "Request body could not be read.", status: 400 }));
  });
}

function decodeFileMetadata(header, maxBytes) {
  const encoded = String(header || "");
  if (!encoded) return { error: "FILE_METADATA_REQUIRED", message: "X-Project-State-File-Metadata is required." };
  if (Buffer.byteLength(encoded, "utf8") > maxBytes) return { error: "FILE_METADATA_TOO_LARGE", message: `Encoded file metadata exceeds ${maxBytes} bytes.` };
  try {
    return { value: JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) };
  } catch {
    return { error: "INVALID_FILE_METADATA", message: "File metadata is not valid base64url JSON." };
  }
}

function setResponseHeaders(response) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
}

function sendJson(response, status, payload) {
  if (response.writableEnded) return;
  response.statusCode = status;
  response.end(JSON.stringify(payload));
}

function transportError(code, message) {
  return { status: "error", error: { code, message } };
}

module.exports = { createApiArmTransport, HOST, DEFAULT_LIMITS };
