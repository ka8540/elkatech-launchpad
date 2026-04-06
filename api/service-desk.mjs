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

// services/service-desk/src/index.ts
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
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

// packages/config/src/db.ts
var sqlClient = null;
function getDb() {
  if (!sqlClient) {
    const dbUrl = getEnv().POSTGRES_URL || getEnv().DATABASE_URL;
    sqlClient = postgres(dbUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10
    });
  }
  return sqlClient;
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

// services/service-desk/src/workflow.ts
var statusTransitions = {
  new: ["triaged", "assigned", "closed"],
  triaged: ["assigned", "waiting_for_customer", "closed"],
  assigned: ["in_progress", "waiting_for_customer", "resolved", "closed"],
  in_progress: ["waiting_for_customer", "resolved", "closed"],
  waiting_for_customer: ["in_progress", "resolved", "closed"],
  resolved: ["in_progress", "closed"],
  closed: []
};
function canViewRequest(actor, request) {
  if (actor.role === "admin") {
    return true;
  }
  if (actor.role === "customer") {
    return request.customerId === actor.id;
  }
  if (request.assignedEngineerId === actor.id) {
    return true;
  }
  return request.assignedEngineerId === null && request.status !== "closed";
}
function canReplyToRequest(actor, request) {
  if (actor.role === "admin") {
    return true;
  }
  if (actor.role === "customer") {
    return request.customerId === actor.id;
  }
  return request.assignedEngineerId === actor.id;
}
function canClaimRequest(actor, request) {
  if (request.status === "closed") {
    return false;
  }
  if (actor.role === "admin") {
    return true;
  }
  if (actor.role !== "engineer") {
    return false;
  }
  return !request.assignedEngineerId || request.assignedEngineerId === actor.id;
}
function canUpdateRequestStatus(actor, request) {
  if (actor.role === "admin") {
    return true;
  }
  if (actor.role !== "engineer") {
    return false;
  }
  return request.assignedEngineerId === actor.id;
}
function isValidStatusTransition(current, next) {
  if (current === next) {
    return true;
  }
  return statusTransitions[current].includes(next);
}

// services/service-desk/src/index.ts
var app = Fastify({ logger: true });
var sql = getDb();
var env = getEnv();
var userContextSchema = z3.object({
  id: z3.string().uuid(),
  email: z3.string().email(),
  role: roleSchema,
  displayName: z3.string().min(1)
});
function getUserContext(headers) {
  return userContextSchema.parse({
    id: headers["x-user-id"],
    email: headers["x-user-email"],
    role: headers["x-user-role"],
    displayName: headers["x-user-display-name"]
  });
}
function toWorkflowActor(actor) {
  return {
    id: actor.id,
    role: actor.role
  };
}
function ensureInternal(headers) {
  return headers["x-internal-token"] === env.INTERNAL_SERVICE_TOKEN;
}
async function emitOutbox(eventType, aggregateId, payload) {
  await sql`
    insert into service_desk.outbox (id, aggregate_type, aggregate_id, event_type, payload)
    values (${randomUUID()}, ${"request"}, ${aggregateId}, ${eventType}, ${sql.json(payload)})
  `;
}
async function addHistory(requestId, actor, eventType, metadata = {}) {
  await sql`
    insert into service_desk.request_history (id, request_id, actor_id, actor_role, event_type, metadata)
    values (
      ${randomUUID()},
      ${requestId},
      ${actor.id},
      ${actor.role},
      ${eventType},
      ${sql.json(metadata)}
    )
  `;
}
function buildRequestNumber() {
  return `SRV-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;
}
async function getCatalogProduct(productId) {
  return fetchJson(
    `${env.CATALOG_SERVICE_URL}/products/${productId}`,
    {
      headers: internalHeaders()
    }
  );
}
async function getUserById(userId) {
  return fetchJson(`${env.AUTH_SERVICE_URL}/internal/users/${userId}`, {
    headers: internalHeaders()
  });
}
app.get("/health", async () => ({ ok: true, service: "service-desk" }));
app.post("/requests", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const actor = getUserContext(request.headers);
  const input = createServiceRequestInputSchema.parse(request.body);
  const product = await getCatalogProduct(input.productId);
  const requestId = randomUUID();
  const requestNumber = buildRequestNumber();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const productSnapshot = {
    id: product.id,
    categorySlug: product.categorySlug,
    slug: product.slug,
    name: product.name,
    priceDisplay: product.priceDisplay
  };
  await sql`
    insert into service_desk.requests (
      id,
      request_number,
      customer_id,
      customer_email,
      product_id,
      product_snapshot,
      subject,
      description,
      contact_phone,
      site_location,
      serial_number,
      priority,
      status
    )
    values (
      ${requestId},
      ${requestNumber},
      ${actor.id},
      ${actor.email},
      ${product.id},
      ${sql.json(productSnapshot)},
      ${input.subject},
      ${input.description},
      ${input.contactPhone},
      ${input.siteLocation},
      ${input.serialNumber ?? null},
      ${input.priority},
      ${"new"}
    )
  `;
  await addHistory(requestId, actor, "request_created", { requestNumber, productId: product.id });
  await emitOutbox("request.created", requestId, {
    requestId,
    requestNumber,
    customerId: actor.id,
    customerEmail: actor.email,
    customerName: actor.displayName,
    productName: product.name,
    productId: product.id,
    subject: input.subject,
    status: "new",
    createdAt: now
  });
  return serviceRequestSchema.parse({
    id: requestId,
    requestNumber,
    customerId: actor.id,
    productId: product.id,
    productSnapshot,
    subject: input.subject,
    description: input.description,
    contactPhone: input.contactPhone,
    siteLocation: input.siteLocation,
    serialNumber: input.serialNumber ?? null,
    priority: input.priority,
    status: "new",
    assignedEngineerId: null,
    createdAt: now,
    updatedAt: now
  });
});
app.get("/requests", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const actor = getUserContext(request.headers);
  const querySchema = z3.object({
    scope: z3.enum(["mine", "queue"]).optional()
  });
  const query = querySchema.parse(request.query);
  let rows;
  if (actor.role === "customer") {
    rows = await sql`
      select *
      from service_desk.requests
      where customer_id = ${actor.id}
      order by created_at desc
    `;
  } else if (query.scope === "queue") {
    rows = await sql`
      select *
      from service_desk.requests
      where status != 'closed'
        and (
          assigned_engineer_id is null
          or assigned_engineer_id = ${actor.id}
        )
      order by created_at desc
    `;
  } else if (actor.role === "engineer") {
    rows = await sql`
      select *
      from service_desk.requests
      where assigned_engineer_id = ${actor.id}
      order by created_at desc
    `;
  } else {
    rows = await sql`
      select *
      from service_desk.requests
      order by created_at desc
    `;
  }
  return rows.map(
    (row) => serviceRequestSchema.parse({
      id: row.id,
      requestNumber: row.request_number,
      customerId: row.customer_id,
      productId: row.product_id,
      productSnapshot: row.product_snapshot,
      subject: row.subject,
      description: row.description,
      contactPhone: row.contact_phone,
      siteLocation: row.site_location,
      serialNumber: row.serial_number,
      priority: row.priority,
      status: row.status,
      assignedEngineerId: row.assigned_engineer_id,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    })
  );
});
app.get("/requests/:requestId", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const actor = getUserContext(request.headers);
  const paramsSchema = z3.object({ requestId: z3.string().uuid() });
  const params = paramsSchema.parse(request.params);
  const rows = await sql`
    select *
    from service_desk.requests
    where id = ${params.requestId}
    limit 1
  `;
  const current = rows[0];
  if (!current) {
    return reply.code(404).send({ message: "Request not found." });
  }
  const allowed = canViewRequest(toWorkflowActor(actor), {
    customerId: current.customer_id,
    assignedEngineerId: current.assigned_engineer_id,
    status: current.status
  });
  if (!allowed) {
    return reply.code(403).send({ message: "Forbidden" });
  }
  const messageRows = actor.role === "customer" ? await sql`
          select *
          from service_desk.request_messages
          where request_id = ${params.requestId}
            and visibility = 'customer_visible'
          order by created_at asc
        ` : await sql`
          select *
          from service_desk.request_messages
          where request_id = ${params.requestId}
          order by created_at asc
        `;
  const historyRows = actor.role === "customer" ? [] : await sql`
          select *
          from service_desk.request_history
          where request_id = ${params.requestId}
          order by created_at asc
        `;
  return {
    request: serviceRequestSchema.parse({
      id: current.id,
      requestNumber: current.request_number,
      customerId: current.customer_id,
      productId: current.product_id,
      productSnapshot: current.product_snapshot,
      subject: current.subject,
      description: current.description,
      contactPhone: current.contact_phone,
      siteLocation: current.site_location,
      serialNumber: current.serial_number,
      priority: current.priority,
      status: current.status,
      assignedEngineerId: current.assigned_engineer_id,
      createdAt: new Date(current.created_at).toISOString(),
      updatedAt: new Date(current.updated_at).toISOString()
    }),
    messages: messageRows.map(
      (row) => requestMessageSchema.parse({
        id: row.id,
        requestId: row.request_id,
        authorId: row.author_id,
        authorRole: row.author_role,
        visibility: row.visibility,
        body: row.body,
        createdAt: new Date(row.created_at).toISOString()
      })
    ),
    history: historyRows.map((row) => ({
      id: row.id,
      requestId: row.request_id,
      actorId: row.actor_id,
      actorRole: row.actor_role,
      eventType: row.event_type,
      metadata: row.metadata,
      createdAt: new Date(row.created_at).toISOString()
    }))
  };
});
app.post("/requests/:requestId/messages", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const actor = getUserContext(request.headers);
  const paramsSchema = z3.object({ requestId: z3.string().uuid() });
  const params = paramsSchema.parse(request.params);
  const input = createRequestMessageInputSchema.parse(request.body);
  if (actor.role === "customer" && input.visibility !== "customer_visible") {
    return reply.code(403).send({ message: "Customers cannot add internal notes." });
  }
  const requestRows = await sql`
    select *
    from service_desk.requests
    where id = ${params.requestId}
    limit 1
  `;
  const current = requestRows[0];
  if (!current) {
    return reply.code(404).send({ message: "Request not found." });
  }
  if (!canReplyToRequest(toWorkflowActor(actor), {
    customerId: current.customer_id,
    assignedEngineerId: current.assigned_engineer_id,
    status: current.status
  })) {
    return reply.code(403).send({ message: "Forbidden" });
  }
  const messageId = randomUUID();
  await sql`
    insert into service_desk.request_messages (
      id,
      request_id,
      author_id,
      author_role,
      visibility,
      body
    )
    values (
      ${messageId},
      ${params.requestId},
      ${actor.id},
      ${actor.role},
      ${input.visibility},
      ${input.body}
    )
  `;
  await sql`
    update service_desk.requests
    set updated_at = now()
    where id = ${params.requestId}
  `;
  await addHistory(params.requestId, actor, "message_added", {
    visibility: input.visibility
  });
  if (actor.role === "customer") {
    await emitOutbox("request.customer_message_posted", params.requestId, {
      requestId: params.requestId,
      requestNumber: current.request_number,
      customerEmail: current.customer_email,
      body: input.body
    });
  } else if (input.visibility === "customer_visible") {
    await emitOutbox("request.staff_reply_posted", params.requestId, {
      requestId: params.requestId,
      requestNumber: current.request_number,
      customerEmail: current.customer_email,
      body: input.body,
      authorName: actor.displayName
    });
  }
  return requestMessageSchema.parse({
    id: messageId,
    requestId: params.requestId,
    authorId: actor.id,
    authorRole: actor.role,
    visibility: input.visibility,
    body: input.body,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/requests/:requestId/claim", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const actor = getUserContext(request.headers);
  if (actor.role === "customer") {
    return reply.code(403).send({ message: "Forbidden" });
  }
  const paramsSchema = z3.object({ requestId: z3.string().uuid() });
  const params = paramsSchema.parse(request.params);
  const rows = await sql`
    select *
    from service_desk.requests
    where id = ${params.requestId}
    limit 1
  `;
  const current = rows[0];
  if (!current) {
    return reply.code(404).send({ message: "Request not found." });
  }
  if (!canClaimRequest(toWorkflowActor(actor), {
    customerId: current.customer_id,
    assignedEngineerId: current.assigned_engineer_id,
    status: current.status
  })) {
    return reply.code(403).send({ message: "Forbidden" });
  }
  await sql`
    update service_desk.requests
    set assigned_engineer_id = ${actor.id},
        status = ${"assigned"},
        updated_at = now()
    where id = ${params.requestId}
  `;
  await addHistory(params.requestId, actor, "request_claimed", {});
  await emitOutbox("request.assigned", params.requestId, {
    requestId: params.requestId,
    requestNumber: current.request_number,
    engineerEmail: actor.email,
    engineerName: actor.displayName,
    customerEmail: current.customer_email,
    status: "assigned"
  });
  return { ok: true };
});
app.post("/requests/:requestId/assign", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const actor = getUserContext(request.headers);
  if (actor.role !== "admin") {
    return reply.code(403).send({ message: "Forbidden" });
  }
  const paramsSchema = z3.object({ requestId: z3.string().uuid() });
  const params = paramsSchema.parse(request.params);
  const input = assignRequestInputSchema.parse(request.body);
  const engineer = await getUserById(input.engineerId);
  const rows = await sql`
    select *
    from service_desk.requests
    where id = ${params.requestId}
    limit 1
  `;
  const current = rows[0];
  if (!current) {
    return reply.code(404).send({ message: "Request not found." });
  }
  if (engineer.role !== "engineer") {
    return reply.code(400).send({ message: "Only engineer accounts can be assigned." });
  }
  await sql`
    update service_desk.requests
    set assigned_engineer_id = ${engineer.id},
        status = ${"assigned"},
        updated_at = now()
    where id = ${params.requestId}
  `;
  await addHistory(params.requestId, actor, "request_assigned", {
    engineerId: engineer.id,
    engineerEmail: engineer.email
  });
  await emitOutbox("request.assigned", params.requestId, {
    requestId: params.requestId,
    requestNumber: current.request_number,
    engineerEmail: engineer.email,
    engineerName: engineer.displayName,
    customerEmail: current.customer_email,
    status: "assigned"
  });
  return { ok: true };
});
app.post("/requests/:requestId/status", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const actor = getUserContext(request.headers);
  if (actor.role === "customer") {
    return reply.code(403).send({ message: "Forbidden" });
  }
  const paramsSchema = z3.object({ requestId: z3.string().uuid() });
  const params = paramsSchema.parse(request.params);
  const input = updateRequestStatusInputSchema.parse(request.body);
  const currentRows = await sql`
    select *
    from service_desk.requests
    where id = ${params.requestId}
    limit 1
  `;
  const current = currentRows[0];
  if (!current) {
    return reply.code(404).send({ message: "Request not found." });
  }
  const nextStatus = requestStatusSchema.parse(input.status);
  if (!canUpdateRequestStatus(toWorkflowActor(actor), {
    customerId: current.customer_id,
    assignedEngineerId: current.assigned_engineer_id,
    status: current.status
  })) {
    return reply.code(403).send({ message: "Forbidden" });
  }
  if (!isValidStatusTransition(current.status, nextStatus)) {
    return reply.code(400).send({ message: "Invalid status transition." });
  }
  await sql`
    update service_desk.requests
    set status = ${nextStatus},
        updated_at = now()
    where id = ${params.requestId}
  `;
  await addHistory(params.requestId, actor, "status_changed", {
    from: current.status,
    to: nextStatus
  });
  await emitOutbox("request.status_changed", params.requestId, {
    requestId: params.requestId,
    requestNumber: current.request_number,
    customerEmail: current.customer_email,
    previousStatus: current.status,
    status: nextStatus,
    actorName: actor.displayName
  });
  return { ok: true };
});
var port = Number(new URL(env.SERVICE_DESK_URL).port || "4003");
if (!process.env.VERCEL) {
  app.listen({ port, host: "127.0.0.1" }).catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
}
async function handler(req, res) {
  await app.ready();
  if (req.url?.startsWith("/api/internal-service-desk")) {
    req.url = req.url.replace("/api/internal-service-desk", "") || "/";
  }
  app.server.emit("request", req, res);
}
export {
  handler as default
};
