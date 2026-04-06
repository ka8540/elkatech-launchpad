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

// services/catalog/src/index.ts
import Fastify from "fastify";
import { z as z3 } from "zod";

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
import { z } from "zod";
var envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  POSTGRES_URL: z.string().optional(),
  KV_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  DATABASE_URL: z.string().min(1).default("postgres://elkatech:elkatech@127.0.0.1:5432/elkatech"),
  INTERNAL_SERVICE_TOKEN: z.string().min(1).default("dev-internal-token"),
  APP_BASE_URL: z.string().url().default("http://127.0.0.1:8080"),
  GATEWAY_URL: z.string().url().default("http://127.0.0.1:4000"),
  AUTH_SERVICE_URL: z.string().url().default("http://127.0.0.1:4001"),
  CATALOG_SERVICE_URL: z.string().url().default("http://127.0.0.1:4002"),
  SERVICE_DESK_URL: z.string().url().default("http://127.0.0.1:4003"),
  NOTIFICATION_SERVICE_URL: z.string().url().default("http://127.0.0.1:4004"),
  SESSION_COOKIE_NAME: z.string().default("elkatech_session"),
  CSRF_COOKIE_NAME: z.string().default("elkatech_csrf"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(168),
  SMTP_HOST: z.string().default("127.0.0.1"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_FROM: z.string().email().default("no-reply@elkatech.local"),
  BOOTSTRAP_ADMIN_EMAIL: z.string().email().default("admin@elkatech.local"),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(8).default("ChangeMe123!")
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

// packages/config/src/redis.ts
import { Redis } from "ioredis";
var redisClient = null;
function getRedis() {
  if (!redisClient) {
    const url = getEnv().KV_URL || getEnv().REDIS_URL;
    if (url) {
      redisClient = new Redis(url, {
        retryStrategy(times) {
          return Math.min(times * 50, 2e3);
        }
      });
    }
  }
  return redisClient;
}

// packages/contracts/src/index.ts
import { z as z2 } from "zod";
var roleSchema = z2.enum(["customer", "engineer", "admin"]);
var requestPrioritySchema = z2.enum(["low", "normal", "high", "urgent"]);
var requestStatusSchema = z2.enum([
  "new",
  "triaged",
  "assigned",
  "in_progress",
  "waiting_for_customer",
  "resolved",
  "closed"
]);
var messageVisibilitySchema = z2.enum(["customer_visible", "internal_note"]);
var productSpecSchema = z2.tuple([z2.string(), z2.string()]);
var catalogProductSchema = z2.object({
  id: z2.string(),
  categorySlug: z2.string(),
  slug: z2.string(),
  name: z2.string(),
  priceDisplay: z2.string(),
  brochureUrl: z2.string().url().optional(),
  images: z2.array(z2.string()),
  specs: z2.array(productSpecSchema),
  highlights: z2.array(z2.string())
});
var catalogCategorySchema = z2.object({
  id: z2.string(),
  slug: z2.string(),
  routePath: z2.string(),
  name: z2.string(),
  intro: z2.string(),
  products: z2.array(catalogProductSchema)
});
var authUserSchema = z2.object({
  id: z2.string(),
  email: z2.string().email(),
  displayName: z2.string(),
  role: roleSchema,
  emailVerified: z2.boolean(),
  createdAt: z2.string()
});
var productSnapshotSchema = z2.object({
  id: z2.string(),
  categorySlug: z2.string(),
  slug: z2.string(),
  name: z2.string(),
  priceDisplay: z2.string()
});
var serviceRequestSchema = z2.object({
  id: z2.string(),
  requestNumber: z2.string(),
  customerId: z2.string(),
  productId: z2.string(),
  productSnapshot: productSnapshotSchema,
  subject: z2.string(),
  description: z2.string(),
  contactPhone: z2.string(),
  siteLocation: z2.string(),
  serialNumber: z2.string().nullable().optional(),
  priority: requestPrioritySchema,
  status: requestStatusSchema,
  assignedEngineerId: z2.string().nullable().optional(),
  createdAt: z2.string(),
  updatedAt: z2.string()
});
var requestMessageSchema = z2.object({
  id: z2.string(),
  requestId: z2.string(),
  authorId: z2.string(),
  authorRole: roleSchema,
  visibility: messageVisibilitySchema,
  body: z2.string(),
  createdAt: z2.string()
});
var signUpInputSchema = z2.object({
  email: z2.string().email(),
  password: z2.string().min(8),
  displayName: z2.string().min(2),
  inviteToken: z2.string().optional()
});
var loginInputSchema = z2.object({
  email: z2.string().email(),
  password: z2.string().min(8)
});
var forgotPasswordInputSchema = z2.object({
  email: z2.string().email()
});
var resetPasswordInputSchema = z2.object({
  token: z2.string().min(20),
  password: z2.string().min(8)
});
var verifyEmailInputSchema = z2.object({
  token: z2.string().min(20)
});
var inviteUserInputSchema = z2.object({
  email: z2.string().email(),
  displayName: z2.string().min(2),
  role: z2.enum(["engineer", "admin"])
});
var createServiceRequestInputSchema = z2.object({
  productId: z2.string(),
  subject: z2.string().min(4),
  description: z2.string().min(10),
  contactPhone: z2.string().min(7),
  siteLocation: z2.string().min(2),
  serialNumber: z2.string().optional(),
  priority: requestPrioritySchema.default("normal")
});
var createRequestMessageInputSchema = z2.object({
  body: z2.string().min(1),
  visibility: messageVisibilitySchema
});
var assignRequestInputSchema = z2.object({
  engineerId: z2.string()
});
var updateRequestStatusInputSchema = z2.object({
  status: requestStatusSchema
});
var sessionResponseSchema = z2.object({
  sessionToken: z2.string(),
  csrfToken: z2.string(),
  user: authUserSchema
});
var domainEventTypeSchema = z2.enum([
  "user.registered",
  "user.email_verified",
  "user.password_reset_requested",
  "request.created",
  "request.assigned",
  "request.status_changed",
  "request.customer_message_posted",
  "request.staff_reply_posted"
]);
var domainEventSchema = z2.object({
  id: z2.string(),
  aggregateType: z2.string(),
  aggregateId: z2.string(),
  eventType: domainEventTypeSchema,
  payload: z2.record(z2.any()),
  occurredAt: z2.string()
});

// services/catalog/src/index.ts
var app = Fastify({ logger: true });
var sql = getDb();
var env = getEnv();
app.get("/health", async () => ({ ok: true, service: "catalog" }));
app.get("/categories", async () => {
  const redis = getRedis();
  const cacheKey = "catalog:categories";
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }
  const rows = await sql`
    select id, slug, route_path, name, intro
    from catalog.categories
    order by name asc
  `;
  const result = rows.map(
    (row) => catalogCategorySchema.omit({ products: true }).parse({
      id: row.id,
      slug: row.slug,
      routePath: row.route_path,
      name: row.name,
      intro: row.intro
    })
  );
  if (redis) {
    await redis.set(cacheKey, JSON.stringify(result), "EX", 300);
  }
  return result;
});
app.get("/products", async (request) => {
  const querySchema = z3.object({
    category: z3.string().optional()
  });
  const query = querySchema.parse(request.query);
  const redis = getRedis();
  const cacheKey = `catalog:products:${query.category || "all"}`;
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }
  const rows = query.category ? await sql`
        select id, category_slug, slug, name, price_display, brochure_url, images, specs, highlights
        from catalog.products
        where category_slug = ${query.category}
        order by name asc
      ` : await sql`
        select id, category_slug, slug, name, price_display, brochure_url, images, specs, highlights
        from catalog.products
        order by category_slug asc, name asc
      `;
  const result = rows.map(
    (row) => catalogProductSchema.parse({
      id: row.id,
      categorySlug: row.category_slug,
      slug: row.slug,
      name: row.name,
      priceDisplay: row.price_display,
      brochureUrl: row.brochure_url ?? void 0,
      images: row.images,
      specs: row.specs,
      highlights: row.highlights
    })
  );
  if (redis) {
    await redis.set(cacheKey, JSON.stringify(result), "EX", 300);
  }
  return result;
});
app.get("/products/:productId", async (request, reply) => {
  const paramsSchema = z3.object({ productId: z3.string() });
  const params = paramsSchema.parse(request.params);
  const redis = getRedis();
  const cacheKey = `catalog:product:${params.productId}`;
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }
  const rows = await sql`
    select id, category_slug, slug, name, price_display, brochure_url, images, specs, highlights
    from catalog.products
    where id = ${params.productId}
    limit 1
  `;
  const product = rows[0];
  if (!product) {
    return reply.code(404).send({ message: "Product not found." });
  }
  const result = catalogProductSchema.parse({
    id: product.id,
    categorySlug: product.category_slug,
    slug: product.slug,
    name: product.name,
    priceDisplay: product.price_display,
    brochureUrl: product.brochure_url ?? void 0,
    images: product.images,
    specs: product.specs,
    highlights: product.highlights
  });
  if (redis) {
    await redis.set(cacheKey, JSON.stringify(result), "EX", 300);
  }
  return result;
});
var port = Number(new URL(env.CATALOG_SERVICE_URL).port || "4002");
if (!process.env.VERCEL) {
  app.listen({ port, host: "127.0.0.1" }).catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
}
async function handler(req, res) {
  await app.ready();
  if (req.url?.startsWith("/api/internal-catalog")) {
    req.url = req.url.replace("/api/internal-catalog", "") || "/";
  }
  app.server.emit("request", req, res);
}
export {
  handler as default
};
