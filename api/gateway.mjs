var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/dotenv/package.json
var require_package = __commonJS({
  "node_modules/dotenv/package.json"(exports, module) {
    module.exports = {
      name: "dotenv",
      version: "16.6.1",
      description: "Loads environment variables from .env file",
      main: "lib/main.js",
      types: "lib/main.d.ts",
      exports: {
        ".": {
          types: "./lib/main.d.ts",
          require: "./lib/main.js",
          default: "./lib/main.js"
        },
        "./config": "./config.js",
        "./config.js": "./config.js",
        "./lib/env-options": "./lib/env-options.js",
        "./lib/env-options.js": "./lib/env-options.js",
        "./lib/cli-options": "./lib/cli-options.js",
        "./lib/cli-options.js": "./lib/cli-options.js",
        "./package.json": "./package.json"
      },
      scripts: {
        "dts-check": "tsc --project tests/types/tsconfig.json",
        lint: "standard",
        pretest: "npm run lint && npm run dts-check",
        test: "tap run --allow-empty-coverage --disable-coverage --timeout=60000",
        "test:coverage": "tap run --show-full-coverage --timeout=60000 --coverage-report=text --coverage-report=lcov",
        prerelease: "npm test",
        release: "standard-version"
      },
      repository: {
        type: "git",
        url: "git://github.com/motdotla/dotenv.git"
      },
      homepage: "https://github.com/motdotla/dotenv#readme",
      funding: "https://dotenvx.com",
      keywords: [
        "dotenv",
        "env",
        ".env",
        "environment",
        "variables",
        "config",
        "settings"
      ],
      readmeFilename: "README.md",
      license: "BSD-2-Clause",
      devDependencies: {
        "@types/node": "^18.11.3",
        decache: "^4.6.2",
        sinon: "^14.0.1",
        standard: "^17.0.0",
        "standard-version": "^9.5.0",
        tap: "^19.2.0",
        typescript: "^4.8.4"
      },
      engines: {
        node: ">=12"
      },
      browser: {
        fs: false
      }
    };
  }
});

// node_modules/dotenv/lib/main.js
var require_main = __commonJS({
  "node_modules/dotenv/lib/main.js"(exports, module) {
    var fs = __require("fs");
    var path = __require("path");
    var os = __require("os");
    var crypto = __require("crypto");
    var packageJson = require_package();
    var version = packageJson.version;
    var LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;
    function parse(src) {
      const obj = {};
      let lines = src.toString();
      lines = lines.replace(/\r\n?/mg, "\n");
      let match;
      while ((match = LINE.exec(lines)) != null) {
        const key = match[1];
        let value = match[2] || "";
        value = value.trim();
        const maybeQuote = value[0];
        value = value.replace(/^(['"`])([\s\S]*)\1$/mg, "$2");
        if (maybeQuote === '"') {
          value = value.replace(/\\n/g, "\n");
          value = value.replace(/\\r/g, "\r");
        }
        obj[key] = value;
      }
      return obj;
    }
    function _parseVault(options) {
      options = options || {};
      const vaultPath = _vaultPath(options);
      options.path = vaultPath;
      const result = DotenvModule.configDotenv(options);
      if (!result.parsed) {
        const err = new Error(`MISSING_DATA: Cannot parse ${vaultPath} for an unknown reason`);
        err.code = "MISSING_DATA";
        throw err;
      }
      const keys = _dotenvKey(options).split(",");
      const length = keys.length;
      let decrypted;
      for (let i = 0; i < length; i++) {
        try {
          const key = keys[i].trim();
          const attrs = _instructions(result, key);
          decrypted = DotenvModule.decrypt(attrs.ciphertext, attrs.key);
          break;
        } catch (error) {
          if (i + 1 >= length) {
            throw error;
          }
        }
      }
      return DotenvModule.parse(decrypted);
    }
    function _warn(message) {
      console.log(`[dotenv@${version}][WARN] ${message}`);
    }
    function _debug(message) {
      console.log(`[dotenv@${version}][DEBUG] ${message}`);
    }
    function _log(message) {
      console.log(`[dotenv@${version}] ${message}`);
    }
    function _dotenvKey(options) {
      if (options && options.DOTENV_KEY && options.DOTENV_KEY.length > 0) {
        return options.DOTENV_KEY;
      }
      if (process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0) {
        return process.env.DOTENV_KEY;
      }
      return "";
    }
    function _instructions(result, dotenvKey) {
      let uri;
      try {
        uri = new URL(dotenvKey);
      } catch (error) {
        if (error.code === "ERR_INVALID_URL") {
          const err = new Error("INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development");
          err.code = "INVALID_DOTENV_KEY";
          throw err;
        }
        throw error;
      }
      const key = uri.password;
      if (!key) {
        const err = new Error("INVALID_DOTENV_KEY: Missing key part");
        err.code = "INVALID_DOTENV_KEY";
        throw err;
      }
      const environment = uri.searchParams.get("environment");
      if (!environment) {
        const err = new Error("INVALID_DOTENV_KEY: Missing environment part");
        err.code = "INVALID_DOTENV_KEY";
        throw err;
      }
      const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`;
      const ciphertext = result.parsed[environmentKey];
      if (!ciphertext) {
        const err = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${environmentKey} in your .env.vault file.`);
        err.code = "NOT_FOUND_DOTENV_ENVIRONMENT";
        throw err;
      }
      return { ciphertext, key };
    }
    function _vaultPath(options) {
      let possibleVaultPath = null;
      if (options && options.path && options.path.length > 0) {
        if (Array.isArray(options.path)) {
          for (const filepath of options.path) {
            if (fs.existsSync(filepath)) {
              possibleVaultPath = filepath.endsWith(".vault") ? filepath : `${filepath}.vault`;
            }
          }
        } else {
          possibleVaultPath = options.path.endsWith(".vault") ? options.path : `${options.path}.vault`;
        }
      } else {
        possibleVaultPath = path.resolve(process.cwd(), ".env.vault");
      }
      if (fs.existsSync(possibleVaultPath)) {
        return possibleVaultPath;
      }
      return null;
    }
    function _resolveHome(envPath) {
      return envPath[0] === "~" ? path.join(os.homedir(), envPath.slice(1)) : envPath;
    }
    function _configVault(options) {
      const debug = Boolean(options && options.debug);
      const quiet = options && "quiet" in options ? options.quiet : true;
      if (debug || !quiet) {
        _log("Loading env from encrypted .env.vault");
      }
      const parsed = DotenvModule._parseVault(options);
      let processEnv = process.env;
      if (options && options.processEnv != null) {
        processEnv = options.processEnv;
      }
      DotenvModule.populate(processEnv, parsed, options);
      return { parsed };
    }
    function configDotenv(options) {
      const dotenvPath = path.resolve(process.cwd(), ".env");
      let encoding = "utf8";
      const debug = Boolean(options && options.debug);
      const quiet = options && "quiet" in options ? options.quiet : true;
      if (options && options.encoding) {
        encoding = options.encoding;
      } else {
        if (debug) {
          _debug("No encoding is specified. UTF-8 is used by default");
        }
      }
      let optionPaths = [dotenvPath];
      if (options && options.path) {
        if (!Array.isArray(options.path)) {
          optionPaths = [_resolveHome(options.path)];
        } else {
          optionPaths = [];
          for (const filepath of options.path) {
            optionPaths.push(_resolveHome(filepath));
          }
        }
      }
      let lastError;
      const parsedAll = {};
      for (const path2 of optionPaths) {
        try {
          const parsed = DotenvModule.parse(fs.readFileSync(path2, { encoding }));
          DotenvModule.populate(parsedAll, parsed, options);
        } catch (e) {
          if (debug) {
            _debug(`Failed to load ${path2} ${e.message}`);
          }
          lastError = e;
        }
      }
      let processEnv = process.env;
      if (options && options.processEnv != null) {
        processEnv = options.processEnv;
      }
      DotenvModule.populate(processEnv, parsedAll, options);
      if (debug || !quiet) {
        const keysCount = Object.keys(parsedAll).length;
        const shortPaths = [];
        for (const filePath of optionPaths) {
          try {
            const relative = path.relative(process.cwd(), filePath);
            shortPaths.push(relative);
          } catch (e) {
            if (debug) {
              _debug(`Failed to load ${filePath} ${e.message}`);
            }
            lastError = e;
          }
        }
        _log(`injecting env (${keysCount}) from ${shortPaths.join(",")}`);
      }
      if (lastError) {
        return { parsed: parsedAll, error: lastError };
      } else {
        return { parsed: parsedAll };
      }
    }
    function config(options) {
      if (_dotenvKey(options).length === 0) {
        return DotenvModule.configDotenv(options);
      }
      const vaultPath = _vaultPath(options);
      if (!vaultPath) {
        _warn(`You set DOTENV_KEY but you are missing a .env.vault file at ${vaultPath}. Did you forget to build it?`);
        return DotenvModule.configDotenv(options);
      }
      return DotenvModule._configVault(options);
    }
    function decrypt(encrypted, keyStr) {
      const key = Buffer.from(keyStr.slice(-64), "hex");
      let ciphertext = Buffer.from(encrypted, "base64");
      const nonce = ciphertext.subarray(0, 12);
      const authTag = ciphertext.subarray(-16);
      ciphertext = ciphertext.subarray(12, -16);
      try {
        const aesgcm = crypto.createDecipheriv("aes-256-gcm", key, nonce);
        aesgcm.setAuthTag(authTag);
        return `${aesgcm.update(ciphertext)}${aesgcm.final()}`;
      } catch (error) {
        const isRange = error instanceof RangeError;
        const invalidKeyLength = error.message === "Invalid key length";
        const decryptionFailed = error.message === "Unsupported state or unable to authenticate data";
        if (isRange || invalidKeyLength) {
          const err = new Error("INVALID_DOTENV_KEY: It must be 64 characters long (or more)");
          err.code = "INVALID_DOTENV_KEY";
          throw err;
        } else if (decryptionFailed) {
          const err = new Error("DECRYPTION_FAILED: Please check your DOTENV_KEY");
          err.code = "DECRYPTION_FAILED";
          throw err;
        } else {
          throw error;
        }
      }
    }
    function populate(processEnv, parsed, options = {}) {
      const debug = Boolean(options && options.debug);
      const override = Boolean(options && options.override);
      if (typeof parsed !== "object") {
        const err = new Error("OBJECT_REQUIRED: Please check the processEnv argument being passed to populate");
        err.code = "OBJECT_REQUIRED";
        throw err;
      }
      for (const key of Object.keys(parsed)) {
        if (Object.prototype.hasOwnProperty.call(processEnv, key)) {
          if (override === true) {
            processEnv[key] = parsed[key];
          }
          if (debug) {
            if (override === true) {
              _debug(`"${key}" is already defined and WAS overwritten`);
            } else {
              _debug(`"${key}" is already defined and was NOT overwritten`);
            }
          }
        } else {
          processEnv[key] = parsed[key];
        }
      }
    }
    var DotenvModule = {
      configDotenv,
      _configVault,
      _parseVault,
      config,
      decrypt,
      parse,
      populate
    };
    module.exports.configDotenv = DotenvModule.configDotenv;
    module.exports._configVault = DotenvModule._configVault;
    module.exports._parseVault = DotenvModule._parseVault;
    module.exports.config = DotenvModule.config;
    module.exports.decrypt = DotenvModule.decrypt;
    module.exports.parse = DotenvModule.parse;
    module.exports.populate = DotenvModule.populate;
    module.exports = DotenvModule;
  }
});

// node_modules/dotenv/lib/env-options.js
var require_env_options = __commonJS({
  "node_modules/dotenv/lib/env-options.js"(exports, module) {
    var options = {};
    if (process.env.DOTENV_CONFIG_ENCODING != null) {
      options.encoding = process.env.DOTENV_CONFIG_ENCODING;
    }
    if (process.env.DOTENV_CONFIG_PATH != null) {
      options.path = process.env.DOTENV_CONFIG_PATH;
    }
    if (process.env.DOTENV_CONFIG_QUIET != null) {
      options.quiet = process.env.DOTENV_CONFIG_QUIET;
    }
    if (process.env.DOTENV_CONFIG_DEBUG != null) {
      options.debug = process.env.DOTENV_CONFIG_DEBUG;
    }
    if (process.env.DOTENV_CONFIG_OVERRIDE != null) {
      options.override = process.env.DOTENV_CONFIG_OVERRIDE;
    }
    if (process.env.DOTENV_CONFIG_DOTENV_KEY != null) {
      options.DOTENV_KEY = process.env.DOTENV_CONFIG_DOTENV_KEY;
    }
    module.exports = options;
  }
});

// node_modules/dotenv/lib/cli-options.js
var require_cli_options = __commonJS({
  "node_modules/dotenv/lib/cli-options.js"(exports, module) {
    var re = /^dotenv_config_(encoding|path|quiet|debug|override|DOTENV_KEY)=(.+)$/;
    module.exports = function optionMatcher(args) {
      const options = args.reduce(function(acc, cur) {
        const matches = cur.match(re);
        if (matches) {
          acc[matches[1]] = matches[2];
        }
        return acc;
      }, {});
      if (!("quiet" in options)) {
        options.quiet = "true";
      }
      return options;
    };
  }
});

// services/gateway/src/index.ts
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { z as z3 } from "zod";

// packages/contracts/src/index.ts
import { z } from "zod";
var roleSchema = z.enum(["customer", "engineer", "admin"]);
var requestPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);
var requestStatusSchema = z.enum([
  "new",
  "triaged",
  "assigned",
  "in_progress",
  "waiting_for_customer",
  "resolved",
  "closed"
]);
var messageVisibilitySchema = z.enum(["customer_visible", "internal_note"]);
var productSpecSchema = z.tuple([z.string(), z.string()]);
var catalogProductSchema = z.object({
  id: z.string(),
  categorySlug: z.string(),
  slug: z.string(),
  name: z.string(),
  priceDisplay: z.string(),
  brochureUrl: z.string().url().optional(),
  images: z.array(z.string()),
  specs: z.array(productSpecSchema),
  highlights: z.array(z.string())
});
var catalogCategorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  routePath: z.string(),
  name: z.string(),
  intro: z.string(),
  products: z.array(catalogProductSchema)
});
var authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  role: roleSchema,
  emailVerified: z.boolean(),
  createdAt: z.string()
});
var productSnapshotSchema = z.object({
  id: z.string(),
  categorySlug: z.string(),
  slug: z.string(),
  name: z.string(),
  priceDisplay: z.string()
});
var serviceRequestSchema = z.object({
  id: z.string(),
  requestNumber: z.string(),
  customerId: z.string(),
  productId: z.string(),
  productSnapshot: productSnapshotSchema,
  subject: z.string(),
  description: z.string(),
  contactPhone: z.string(),
  siteLocation: z.string(),
  serialNumber: z.string().nullable().optional(),
  priority: requestPrioritySchema,
  status: requestStatusSchema,
  assignedEngineerId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
var requestMessageSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  authorId: z.string(),
  authorRole: roleSchema,
  visibility: messageVisibilitySchema,
  body: z.string(),
  createdAt: z.string()
});
var signUpInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2),
  inviteToken: z.string().optional()
});
var loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});
var forgotPasswordInputSchema = z.object({
  email: z.string().email()
});
var resetPasswordInputSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8)
});
var verifyEmailInputSchema = z.object({
  token: z.string().min(20)
});
var inviteUserInputSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(2),
  role: z.enum(["engineer", "admin"])
});
var createServiceRequestInputSchema = z.object({
  productId: z.string(),
  subject: z.string().min(4),
  description: z.string().min(10),
  contactPhone: z.string().min(7),
  siteLocation: z.string().min(2),
  serialNumber: z.string().optional(),
  priority: requestPrioritySchema.default("normal")
});
var createRequestMessageInputSchema = z.object({
  body: z.string().min(1),
  visibility: messageVisibilitySchema
});
var assignRequestInputSchema = z.object({
  engineerId: z.string()
});
var updateRequestStatusInputSchema = z.object({
  status: requestStatusSchema
});
var sessionResponseSchema = z.object({
  sessionToken: z.string(),
  csrfToken: z.string(),
  user: authUserSchema
});
var domainEventTypeSchema = z.enum([
  "user.registered",
  "user.email_verified",
  "user.password_reset_requested",
  "request.created",
  "request.assigned",
  "request.status_changed",
  "request.customer_message_posted",
  "request.staff_reply_posted"
]);
var domainEventSchema = z.object({
  id: z.string(),
  aggregateType: z.string(),
  aggregateId: z.string(),
  eventType: domainEventTypeSchema,
  payload: z.record(z.any()),
  occurredAt: z.string()
});

// packages/config/src/db.ts
import postgres from "postgres";

// node_modules/dotenv/config.js
(function() {
  require_main().config(
    Object.assign(
      {},
      require_env_options(),
      require_cli_options()(process.argv)
    )
  );
})();

// packages/config/src/env.ts
import { z as z2 } from "zod";
var envSchema = z2.object({
  NODE_ENV: z2.enum(["development", "test", "production"]).default("development"),
  POSTGRES_URL: z2.string().optional(),
  KV_URL: z2.string().optional(),
  REDIS_URL: z2.string().optional(),
  DATABASE_URL: z2.string().min(1).default("postgres://elkatech:elkatech@127.0.0.1:5432/elkatech"),
  INTERNAL_SERVICE_TOKEN: z2.string().min(1).default("dev-internal-token"),
  APP_BASE_URL: z2.string().url().default("http://127.0.0.1:8080"),
  GATEWAY_URL: z2.string().url().default("http://127.0.0.1:4000"),
  AUTH_SERVICE_URL: z2.string().url().default("http://127.0.0.1:4001"),
  CATALOG_SERVICE_URL: z2.string().url().default("http://127.0.0.1:4002"),
  SERVICE_DESK_URL: z2.string().url().default("http://127.0.0.1:4003"),
  NOTIFICATION_SERVICE_URL: z2.string().url().default("http://127.0.0.1:4004"),
  SESSION_COOKIE_NAME: z2.string().default("elkatech_session"),
  CSRF_COOKIE_NAME: z2.string().default("elkatech_csrf"),
  SESSION_TTL_HOURS: z2.coerce.number().int().positive().default(168),
  SMTP_HOST: z2.string().default("127.0.0.1"),
  SMTP_PORT: z2.coerce.number().int().positive().default(1025),
  SMTP_FROM: z2.string().email().default("no-reply@elkatech.local"),
  BOOTSTRAP_ADMIN_EMAIL: z2.string().email().default("admin@elkatech.local"),
  BOOTSTRAP_ADMIN_PASSWORD: z2.string().min(8).default("ChangeMe123!")
});
var cachedEnv = null;
function getEnv() {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
    if (process.env.VERCEL === "1" && process.env.VERCEL_URL) {
      const publicUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL}`;
      cachedEnv.APP_BASE_URL = publicUrl;
      cachedEnv.GATEWAY_URL = `${publicUrl}/api`;
      cachedEnv.AUTH_SERVICE_URL = `${publicUrl}/api/internal-auth`;
      cachedEnv.CATALOG_SERVICE_URL = `${publicUrl}/api/internal-catalog`;
      cachedEnv.SERVICE_DESK_URL = `${publicUrl}/api/internal-service-desk`;
      cachedEnv.NOTIFICATION_SERVICE_URL = `${publicUrl}/api/internal-notification`;
    }
  }
  return cachedEnv;
}

// packages/config/src/http.ts
function internalHeaders(extra = {}) {
  return {
    "content-type": "application/json",
    "x-internal-token": getEnv().INTERNAL_SERVICE_TOKEN,
    ...extra
  };
}
async function fetchJson(input, init = {}) {
  const response = await fetch(input, init);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${errorText}`);
  }
  if (response.status === 204) {
    return void 0;
  }
  return await response.json();
}

// packages/config/src/redis.ts
import { Redis } from "ioredis";

// services/gateway/src/index.ts
var env = getEnv();
var app = Fastify({ logger: true });
await app.register(cookie);
await app.register(rateLimit, {
  global: false,
  max: 10,
  timeWindow: "1 minute"
});
function getSessionCookie(request) {
  return request.cookies[env.SESSION_COOKIE_NAME];
}
function getCsrfCookie(request) {
  return request.cookies[env.CSRF_COOKIE_NAME];
}
async function resolveSession(sessionToken) {
  return fetchJson(`${env.AUTH_SERVICE_URL}/internal/session/resolve`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify({ sessionToken })
  });
}
function setSessionCookies(reply, payload) {
  const secure = env.NODE_ENV === "production";
  reply.setCookie(env.SESSION_COOKIE_NAME, payload.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: env.SESSION_TTL_HOURS * 60 * 60
  });
  reply.setCookie(env.CSRF_COOKIE_NAME, payload.csrfToken, {
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: env.SESSION_TTL_HOURS * 60 * 60
  });
}
function clearSessionCookies(reply) {
  reply.clearCookie(env.SESSION_COOKIE_NAME, { path: "/" });
  reply.clearCookie(env.CSRF_COOKIE_NAME, { path: "/" });
}
async function requireSession(request, reply, allowedRoles) {
  const sessionToken = getSessionCookie(request);
  if (!sessionToken) {
    reply.code(401).send({ message: "Authentication required." });
    return null;
  }
  try {
    const session = await resolveSession(sessionToken);
    if (allowedRoles && !allowedRoles.includes(session.user.role)) {
      reply.code(403).send({ message: "Forbidden" });
      return null;
    }
    return { ...session, sessionToken };
  } catch {
    clearSessionCookies(reply);
    reply.code(401).send({ message: "Session expired." });
    return null;
  }
}
function assertCsrf(request, reply) {
  const csrfCookie = getCsrfCookie(request);
  const csrfHeader = request.headers["x-csrf-token"];
  if (!csrfCookie || csrfHeader !== csrfCookie) {
    reply.code(403).send({ message: "CSRF validation failed." });
    return false;
  }
  return true;
}
function userHeaders(user) {
  return internalHeaders({
    "x-user-id": user.id,
    "x-user-email": user.email,
    "x-user-role": user.role,
    "x-user-display-name": user.displayName
  });
}
app.get("/health", async () => ({ ok: true, service: "gateway" }));
app.post("/api/auth/signup", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (request, reply) => {
  const input = signUpInputSchema.parse(request.body);
  const response = await fetchJson(`${env.AUTH_SERVICE_URL}/signup`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify(input)
  });
  return reply.code(201).send(response);
});
app.post("/api/auth/login", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (request, reply) => {
  const input = loginInputSchema.parse(request.body);
  const response = await fetchJson(`${env.AUTH_SERVICE_URL}/login`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify(input)
  });
  setSessionCookies(reply, response);
  return {
    user: response.user
  };
});
app.post("/api/auth/logout", async (request, reply) => {
  const sessionToken = getSessionCookie(request);
  if (sessionToken) {
    await fetchJson(`${env.AUTH_SERVICE_URL}/logout`, {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify({ sessionToken })
    });
  }
  clearSessionCookies(reply);
  return { ok: true };
});
app.get("/api/auth/me", async (request, reply) => {
  const sessionToken = getSessionCookie(request);
  if (!sessionToken) {
    clearSessionCookies(reply);
    return { user: null };
  }
  try {
    const session = await resolveSession(sessionToken);
    reply.setCookie(env.CSRF_COOKIE_NAME, session.csrfToken, {
      httpOnly: false,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      maxAge: env.SESSION_TTL_HOURS * 60 * 60
    });
    return { user: session.user };
  } catch {
    clearSessionCookies(reply);
    return { user: null };
  }
});
app.post("/api/auth/forgot-password", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (request) => {
  const input = forgotPasswordInputSchema.parse(request.body);
  return fetchJson(`${env.AUTH_SERVICE_URL}/forgot-password`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify(input)
  });
});
app.post("/api/auth/reset-password", async (request) => {
  const input = resetPasswordInputSchema.parse(request.body);
  return fetchJson(`${env.AUTH_SERVICE_URL}/reset-password`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify(input)
  });
});
app.post("/api/auth/verify-email", async (request) => {
  const input = verifyEmailInputSchema.parse(request.body);
  return fetchJson(`${env.AUTH_SERVICE_URL}/verify-email`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify(input)
  });
});
app.get("/api/catalog/categories", async () => {
  return fetchJson(`${env.CATALOG_SERVICE_URL}/categories`, {
    headers: internalHeaders()
  });
});
app.get("/api/catalog/products", async (request) => {
  const queryString = request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "";
  return fetchJson(`${env.CATALOG_SERVICE_URL}/products${queryString}`, {
    headers: internalHeaders()
  });
});
app.get("/api/catalog/products/:productId", async (request) => {
  const params = z3.object({ productId: z3.string() }).parse(request.params);
  return fetchJson(`${env.CATALOG_SERVICE_URL}/products/${params.productId}`, {
    headers: internalHeaders()
  });
});
app.post("/api/requests", async (request, reply) => {
  const session = await requireSession(request, reply, ["customer", "engineer", "admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  if (!session.user.emailVerified) {
    return reply.code(403).send({ message: "Verify your email before creating requests." });
  }
  const input = createServiceRequestInputSchema.parse(request.body);
  return fetchJson(`${env.SERVICE_DESK_URL}/requests`, {
    method: "POST",
    headers: userHeaders(session.user),
    body: JSON.stringify(input)
  });
});
app.get("/api/requests", async (request, reply) => {
  const session = await requireSession(request, reply, ["customer", "engineer", "admin"]);
  if (!session) return;
  const queryString = request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "";
  return fetchJson(`${env.SERVICE_DESK_URL}/requests${queryString}`, {
    headers: userHeaders(session.user)
  });
});
app.get("/api/requests/:requestId", async (request, reply) => {
  const session = await requireSession(request, reply, ["customer", "engineer", "admin"]);
  if (!session) return;
  const params = z3.object({ requestId: z3.string().uuid() }).parse(request.params);
  return fetchJson(`${env.SERVICE_DESK_URL}/requests/${params.requestId}`, {
    headers: userHeaders(session.user)
  });
});
app.post("/api/requests/:requestId/messages", async (request, reply) => {
  const session = await requireSession(request, reply, ["customer", "engineer", "admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  const params = z3.object({ requestId: z3.string().uuid() }).parse(request.params);
  const input = createRequestMessageInputSchema.parse(request.body);
  return fetchJson(`${env.SERVICE_DESK_URL}/requests/${params.requestId}/messages`, {
    method: "POST",
    headers: userHeaders(session.user),
    body: JSON.stringify(input)
  });
});
app.post("/api/requests/:requestId/claim", async (request, reply) => {
  const session = await requireSession(request, reply, ["engineer", "admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  const params = z3.object({ requestId: z3.string().uuid() }).parse(request.params);
  return fetchJson(`${env.SERVICE_DESK_URL}/requests/${params.requestId}/claim`, {
    method: "POST",
    headers: userHeaders(session.user)
  });
});
app.post("/api/requests/:requestId/assign", async (request, reply) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  const params = z3.object({ requestId: z3.string().uuid() }).parse(request.params);
  const input = z3.object({ engineerId: z3.string().uuid() }).parse(request.body);
  return fetchJson(`${env.SERVICE_DESK_URL}/requests/${params.requestId}/assign`, {
    method: "POST",
    headers: userHeaders(session.user),
    body: JSON.stringify(input)
  });
});
app.post("/api/requests/:requestId/status", async (request, reply) => {
  const session = await requireSession(request, reply, ["engineer", "admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  const params = z3.object({ requestId: z3.string().uuid() }).parse(request.params);
  const input = updateRequestStatusInputSchema.parse(request.body);
  return fetchJson(`${env.SERVICE_DESK_URL}/requests/${params.requestId}/status`, {
    method: "POST",
    headers: userHeaders(session.user),
    body: JSON.stringify(input)
  });
});
app.get("/api/admin/users", async (request, reply) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;
  return fetchJson(`${env.AUTH_SERVICE_URL}/internal/users`, {
    headers: internalHeaders()
  });
});
app.post("/api/admin/users/invite", async (request, reply) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  const input = inviteUserInputSchema.parse(request.body);
  return fetchJson(`${env.AUTH_SERVICE_URL}/internal/invite`, {
    method: "POST",
    headers: internalHeaders({
      "x-user-id": session.user.id,
      "x-user-role": session.user.role
    }),
    body: JSON.stringify(input)
  });
});
var port = Number(new URL(env.GATEWAY_URL).port || "4000");
if (!process.env.VERCEL) {
  app.listen({ port, host: "127.0.0.1" }).catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
}
async function handler(req, res) {
  await app.ready();
  app.server.emit("request", req, res);
}
export {
  handler as default
};
