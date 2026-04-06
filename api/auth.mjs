var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/@phc/format/index.js
var require_format = __commonJS({
  "node_modules/@phc/format/index.js"(exports, module) {
    var idRegex = /^[a-z0-9-]{1,32}$/;
    var nameRegex = /^[a-z0-9-]{1,32}$/;
    var valueRegex = /^[a-zA-Z0-9/+.-]+$/;
    var b64Regex = /^([a-zA-Z0-9/+.-]+|)$/;
    var decimalRegex = /^((-)?[1-9]\d*|0)$/;
    var versionRegex = /^v=(\d+)$/;
    function objToKeyVal(obj) {
      return objectKeys(obj).map((k) => [k, obj[k]].join("=")).join(",");
    }
    function keyValtoObj(str) {
      const obj = {};
      str.split(",").forEach((ps) => {
        const pss = ps.split("=");
        if (pss.length < 2) {
          throw new TypeError(`params must be in the format name=value`);
        }
        obj[pss.shift()] = pss.join("=");
      });
      return obj;
    }
    function objectKeys(object) {
      return Object.keys(object);
    }
    function objectValues(object) {
      if (typeof Object.values === "function") return Object.values(object);
      return objectKeys(object).map((k) => object[k]);
    }
    function serialize(opts) {
      const fields = [""];
      if (typeof opts !== "object" || opts === null) {
        throw new TypeError("opts must be an object");
      }
      if (typeof opts.id !== "string") {
        throw new TypeError("id must be a string");
      }
      if (!idRegex.test(opts.id)) {
        throw new TypeError(`id must satisfy ${idRegex}`);
      }
      fields.push(opts.id);
      if (typeof opts.version !== "undefined") {
        if (typeof opts.version !== "number" || opts.version < 0 || !Number.isInteger(opts.version)) {
          throw new TypeError("version must be a positive integer number");
        }
        fields.push(`v=${opts.version}`);
      }
      if (typeof opts.params !== "undefined") {
        if (typeof opts.params !== "object" || opts.params === null) {
          throw new TypeError("params must be an object");
        }
        const pk = objectKeys(opts.params);
        if (!pk.every((p) => nameRegex.test(p))) {
          throw new TypeError(`params names must satisfy ${nameRegex}`);
        }
        pk.forEach((k) => {
          if (typeof opts.params[k] === "number") {
            opts.params[k] = opts.params[k].toString();
          } else if (Buffer.isBuffer(opts.params[k])) {
            opts.params[k] = opts.params[k].toString("base64").split("=")[0];
          }
        });
        const pv = objectValues(opts.params);
        if (!pv.every((v) => typeof v === "string")) {
          throw new TypeError("params values must be strings");
        }
        if (!pv.every((v) => valueRegex.test(v))) {
          throw new TypeError(`params values must satisfy ${valueRegex}`);
        }
        const strpar = objToKeyVal(opts.params);
        fields.push(strpar);
      }
      if (typeof opts.salt !== "undefined") {
        if (!Buffer.isBuffer(opts.salt)) {
          throw new TypeError("salt must be a Buffer");
        }
        fields.push(opts.salt.toString("base64").split("=")[0]);
        if (typeof opts.hash !== "undefined") {
          if (!Buffer.isBuffer(opts.hash)) {
            throw new TypeError("hash must be a Buffer");
          }
          fields.push(opts.hash.toString("base64").split("=")[0]);
        }
      }
      const phcstr = fields.join("$");
      return phcstr;
    }
    function deserialize(phcstr) {
      if (typeof phcstr !== "string" || phcstr === "") {
        throw new TypeError("pchstr must be a non-empty string");
      }
      if (phcstr[0] !== "$") {
        throw new TypeError("pchstr must contain a $ as first char");
      }
      const fields = phcstr.split("$");
      fields.shift();
      let maxf = 5;
      if (!versionRegex.test(fields[1])) maxf--;
      if (fields.length > maxf) {
        throw new TypeError(
          `pchstr contains too many fileds: ${fields.length}/${maxf}`
        );
      }
      const id = fields.shift();
      if (!idRegex.test(id)) {
        throw new TypeError(`id must satisfy ${idRegex}`);
      }
      let version;
      if (versionRegex.test(fields[0])) {
        version = parseInt(fields.shift().match(versionRegex)[1], 10);
      }
      let hash;
      let salt;
      if (b64Regex.test(fields[fields.length - 1])) {
        if (fields.length > 1 && b64Regex.test(fields[fields.length - 2])) {
          hash = Buffer.from(fields.pop(), "base64");
          salt = Buffer.from(fields.pop(), "base64");
        } else {
          salt = Buffer.from(fields.pop(), "base64");
        }
      }
      let params;
      if (fields.length > 0) {
        const parstr = fields.pop();
        params = keyValtoObj(parstr);
        if (!objectKeys(params).every((p) => nameRegex.test(p))) {
          throw new TypeError(`params names must satisfy ${nameRegex}`);
        }
        const pv = objectValues(params);
        if (!pv.every((v) => valueRegex.test(v))) {
          throw new TypeError(`params values must satisfy ${valueRegex}`);
        }
        const pk = objectKeys(params);
        pk.forEach((k) => {
          params[k] = decimalRegex.test(params[k]) ? parseInt(params[k], 10) : params[k];
        });
      }
      if (fields.length > 0) {
        throw new TypeError(`pchstr contains unrecognized fileds: ${fields}`);
      }
      const phcobj = { id };
      if (version) phcobj.version = version;
      if (params) phcobj.params = params;
      if (salt) phcobj.salt = salt;
      if (hash) phcobj.hash = hash;
      return phcobj;
    }
    module.exports = {
      serialize,
      deserialize
    };
  }
});

// node_modules/node-gyp-build/node-gyp-build.js
var require_node_gyp_build = __commonJS({
  "node_modules/node-gyp-build/node-gyp-build.js"(exports, module) {
    var fs = __require("fs");
    var path = __require("path");
    var os = __require("os");
    var runtimeRequire = typeof __webpack_require__ === "function" ? __non_webpack_require__ : __require;
    var vars = process.config && process.config.variables || {};
    var prebuildsOnly = !!process.env.PREBUILDS_ONLY;
    var abi = process.versions.modules;
    var runtime = isElectron() ? "electron" : isNwjs() ? "node-webkit" : "node";
    var arch = process.env.npm_config_arch || os.arch();
    var platform = process.env.npm_config_platform || os.platform();
    var libc = process.env.LIBC || (isAlpine(platform) ? "musl" : "glibc");
    var armv = process.env.ARM_VERSION || (arch === "arm64" ? "8" : vars.arm_version) || "";
    var uv = (process.versions.uv || "").split(".")[0];
    module.exports = load;
    function load(dir) {
      return runtimeRequire(load.resolve(dir));
    }
    load.resolve = load.path = function(dir) {
      dir = path.resolve(dir || ".");
      try {
        var name = runtimeRequire(path.join(dir, "package.json")).name.toUpperCase().replace(/-/g, "_");
        if (process.env[name + "_PREBUILD"]) dir = process.env[name + "_PREBUILD"];
      } catch (err) {
      }
      if (!prebuildsOnly) {
        var release = getFirst(path.join(dir, "build/Release"), matchBuild);
        if (release) return release;
        var debug = getFirst(path.join(dir, "build/Debug"), matchBuild);
        if (debug) return debug;
      }
      var prebuild = resolve(dir);
      if (prebuild) return prebuild;
      var nearby = resolve(path.dirname(process.execPath));
      if (nearby) return nearby;
      var target = [
        "platform=" + platform,
        "arch=" + arch,
        "runtime=" + runtime,
        "abi=" + abi,
        "uv=" + uv,
        armv ? "armv=" + armv : "",
        "libc=" + libc,
        "node=" + process.versions.node,
        process.versions.electron ? "electron=" + process.versions.electron : "",
        typeof __webpack_require__ === "function" ? "webpack=true" : ""
        // eslint-disable-line
      ].filter(Boolean).join(" ");
      throw new Error("No native build was found for " + target + "\n    loaded from: " + dir + "\n");
      function resolve(dir2) {
        var tuples = readdirSync(path.join(dir2, "prebuilds")).map(parseTuple);
        var tuple = tuples.filter(matchTuple(platform, arch)).sort(compareTuples)[0];
        if (!tuple) return;
        var prebuilds = path.join(dir2, "prebuilds", tuple.name);
        var parsed = readdirSync(prebuilds).map(parseTags);
        var candidates = parsed.filter(matchTags(runtime, abi));
        var winner = candidates.sort(compareTags(runtime))[0];
        if (winner) return path.join(prebuilds, winner.file);
      }
    };
    function readdirSync(dir) {
      try {
        return fs.readdirSync(dir);
      } catch (err) {
        return [];
      }
    }
    function getFirst(dir, filter) {
      var files = readdirSync(dir).filter(filter);
      return files[0] && path.join(dir, files[0]);
    }
    function matchBuild(name) {
      return /\.node$/.test(name);
    }
    function parseTuple(name) {
      var arr = name.split("-");
      if (arr.length !== 2) return;
      var platform2 = arr[0];
      var architectures = arr[1].split("+");
      if (!platform2) return;
      if (!architectures.length) return;
      if (!architectures.every(Boolean)) return;
      return { name, platform: platform2, architectures };
    }
    function matchTuple(platform2, arch2) {
      return function(tuple) {
        if (tuple == null) return false;
        if (tuple.platform !== platform2) return false;
        return tuple.architectures.includes(arch2);
      };
    }
    function compareTuples(a, b) {
      return a.architectures.length - b.architectures.length;
    }
    function parseTags(file) {
      var arr = file.split(".");
      var extension = arr.pop();
      var tags = { file, specificity: 0 };
      if (extension !== "node") return;
      for (var i = 0; i < arr.length; i++) {
        var tag = arr[i];
        if (tag === "node" || tag === "electron" || tag === "node-webkit") {
          tags.runtime = tag;
        } else if (tag === "napi") {
          tags.napi = true;
        } else if (tag.slice(0, 3) === "abi") {
          tags.abi = tag.slice(3);
        } else if (tag.slice(0, 2) === "uv") {
          tags.uv = tag.slice(2);
        } else if (tag.slice(0, 4) === "armv") {
          tags.armv = tag.slice(4);
        } else if (tag === "glibc" || tag === "musl") {
          tags.libc = tag;
        } else {
          continue;
        }
        tags.specificity++;
      }
      return tags;
    }
    function matchTags(runtime2, abi2) {
      return function(tags) {
        if (tags == null) return false;
        if (tags.runtime && tags.runtime !== runtime2 && !runtimeAgnostic(tags)) return false;
        if (tags.abi && tags.abi !== abi2 && !tags.napi) return false;
        if (tags.uv && tags.uv !== uv) return false;
        if (tags.armv && tags.armv !== armv) return false;
        if (tags.libc && tags.libc !== libc) return false;
        return true;
      };
    }
    function runtimeAgnostic(tags) {
      return tags.runtime === "node" && tags.napi;
    }
    function compareTags(runtime2) {
      return function(a, b) {
        if (a.runtime !== b.runtime) {
          return a.runtime === runtime2 ? -1 : 1;
        } else if (a.abi !== b.abi) {
          return a.abi ? -1 : 1;
        } else if (a.specificity !== b.specificity) {
          return a.specificity > b.specificity ? -1 : 1;
        } else {
          return 0;
        }
      };
    }
    function isNwjs() {
      return !!(process.versions && process.versions.nw);
    }
    function isElectron() {
      if (process.versions && process.versions.electron) return true;
      if (process.env.ELECTRON_RUN_AS_NODE) return true;
      return typeof window !== "undefined" && window.process && window.process.type === "renderer";
    }
    function isAlpine(platform2) {
      return platform2 === "linux" && fs.existsSync("/etc/alpine-release");
    }
    load.parseTags = parseTags;
    load.matchTags = matchTags;
    load.compareTags = compareTags;
    load.parseTuple = parseTuple;
    load.matchTuple = matchTuple;
    load.compareTuples = compareTuples;
  }
});

// node_modules/node-gyp-build/index.js
var require_node_gyp_build2 = __commonJS({
  "node_modules/node-gyp-build/index.js"(exports, module) {
    var runtimeRequire = typeof __webpack_require__ === "function" ? __non_webpack_require__ : __require;
    if (typeof runtimeRequire.addon === "function") {
      module.exports = runtimeRequire.addon.bind(runtimeRequire);
    } else {
      module.exports = require_node_gyp_build();
    }
  }
});

// node_modules/argon2/argon2.cjs
var require_argon2 = __commonJS({
  "node_modules/argon2/argon2.cjs"(exports, module) {
    var assert = __require("node:assert");
    var { randomBytes: randomBytes2, timingSafeEqual } = __require("node:crypto");
    var { promisify } = __require("node:util");
    var { deserialize, serialize } = require_format();
    var gypBuild = require_node_gyp_build2();
    var { hash: bindingsHash } = gypBuild(__dirname);
    var generateSalt = promisify(randomBytes2);
    var argon2d = 0;
    var argon2i = 1;
    var argon2id = 2;
    module.exports.argon2d = argon2d;
    module.exports.argon2i = argon2i;
    module.exports.argon2id = argon2id;
    var types = Object.freeze({ argon2d, argon2i, argon2id });
    var names = Object.freeze({
      [types.argon2d]: "argon2d",
      [types.argon2i]: "argon2i",
      [types.argon2id]: "argon2id"
    });
    var defaults = Object.freeze({
      hashLength: 32,
      timeCost: 3,
      memoryCost: 1 << 16,
      parallelism: 4,
      type: argon2id,
      version: 19
    });
    var limits = Object.freeze({
      hashLength: { min: 4, max: 2 ** 32 - 1 },
      memoryCost: { min: 1 << 10, max: 2 ** 32 - 1 },
      timeCost: { min: 2, max: 2 ** 32 - 1 },
      parallelism: { min: 1, max: 2 ** 24 - 1 }
    });
    module.exports.limits = limits;
    async function hash(password, options) {
      let { raw, salt, ...rest } = { ...defaults, ...options };
      for (const [key, { min, max }] of Object.entries(limits)) {
        const value = rest[key];
        assert(
          min <= value && value <= max,
          `Invalid ${key}, must be between ${min} and ${max}.`
        );
      }
      salt = salt ?? await generateSalt(16);
      const {
        hashLength,
        secret = Buffer.alloc(0),
        type,
        version,
        memoryCost: m,
        timeCost: t,
        parallelism: p,
        associatedData: data = Buffer.alloc(0)
      } = rest;
      const hash2 = await bindingsHash({
        password: Buffer.from(password),
        salt,
        secret,
        data,
        hashLength,
        m,
        t,
        p,
        version,
        type
      });
      if (raw) {
        return hash2;
      }
      return serialize({
        id: names[type],
        version,
        params: { m, t, p, ...data.byteLength > 0 ? { data } : {} },
        salt,
        hash: hash2
      });
    }
    module.exports.hash = hash;
    function needsRehash(digest, options = {}) {
      const { memoryCost, timeCost, version } = { ...defaults, ...options };
      const {
        version: v,
        params: { m, t }
      } = deserialize(digest);
      return +v !== +version || +m !== +memoryCost || +t !== +timeCost;
    }
    module.exports.needsRehash = needsRehash;
    async function verify(digest, password, options = {}) {
      const { id, ...rest } = deserialize(digest);
      if (!(id in types)) {
        return false;
      }
      const {
        version = 16,
        params: { m, t, p, data = "" },
        salt,
        hash: hash2
      } = rest;
      const { secret = Buffer.alloc(0) } = options;
      return timingSafeEqual(
        await bindingsHash({
          password: Buffer.from(password),
          salt,
          secret,
          data: Buffer.from(data, "base64"),
          hashLength: hash2.byteLength,
          m: +m,
          t: +t,
          p: +p,
          version: +version,
          type: types[id]
        }),
        hash2
      );
    }
    module.exports.verify = verify;
  }
});

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

// services/auth/src/index.ts
var import_argon2 = __toESM(require_argon2(), 1);
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

// packages/config/src/crypto.ts
import { createHash, randomBytes } from "node:crypto";
function hashToken(value) {
  return createHash("sha256").update(value).digest("hex");
}
function generateToken(size = 32) {
  return randomBytes(size).toString("hex");
}

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

// packages/config/src/redis.ts
import { Redis } from "ioredis";

// services/auth/src/index.ts
var app = Fastify({ logger: true });
var sql = getDb();
var env = getEnv();
function mapUser(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    emailVerified: row.email_verified,
    createdAt: new Date(row.created_at).toISOString()
  };
}
async function emitOutbox(aggregateType, aggregateId, eventType, payload) {
  await sql`
    insert into auth.outbox (id, aggregate_type, aggregate_id, event_type, payload)
    values (${randomUUID()}, ${aggregateType}, ${aggregateId}, ${eventType}, ${sql.json(payload)})
  `;
}
async function createVerificationToken(userId, email) {
  const rawToken = generateToken();
  await sql`
    insert into auth.tokens (id, token_hash, user_id, email, role, purpose, expires_at)
    values (
      ${randomUUID()},
      ${hashToken(rawToken)},
      ${userId},
      ${email},
      ${"customer"},
      ${"verify_email"},
      now() + interval '48 hours'
    )
  `;
  return rawToken;
}
function ensureInternal(request) {
  return request.headers["x-internal-token"] === env.INTERNAL_SERVICE_TOKEN;
}
app.get("/health", async () => ({ ok: true, service: "auth" }));
app.post("/signup", async (request, reply) => {
  const input = signUpInputSchema.parse(request.body);
  const passwordHash = await import_argon2.default.hash(input.password);
  if (input.inviteToken) {
    const inviteRows = await sql`
      select id, user_id, email, role
      from auth.tokens
      where token_hash = ${hashToken(input.inviteToken)}
        and purpose = 'invite_signup'
        and consumed_at is null
        and expires_at > now()
      limit 1
    `;
    const invite = inviteRows[0];
    if (!invite || !invite.role) {
      return reply.code(400).send({ message: "Invite is invalid or expired." });
    }
    if (invite.email.toLowerCase() !== input.email.toLowerCase()) {
      return reply.code(400).send({ message: "Invite email does not match." });
    }
    const userId2 = invite.user_id ?? randomUUID();
    await sql`
      insert into auth.users (id, email, display_name, role, password_hash, email_verified, status)
      values (
        ${userId2},
        ${input.email.toLowerCase()},
        ${input.displayName},
        ${invite.role},
        ${passwordHash},
        ${false},
        ${"active"}
      )
      on conflict (id)
      do update set
        email = excluded.email,
        display_name = excluded.display_name,
        role = excluded.role,
        password_hash = excluded.password_hash,
        status = excluded.status,
        updated_at = now()
    `;
    await sql`
      update auth.tokens
      set consumed_at = now()
      where id = ${invite.id}
    `;
    const verifyToken2 = await createVerificationToken(userId2, input.email.toLowerCase());
    await emitOutbox("user", userId2, "user.registered", {
      userId: userId2,
      email: input.email.toLowerCase(),
      displayName: input.displayName,
      role: invite.role,
      invitation: true,
      verifyUrl: `${env.APP_BASE_URL}/verify-email?token=${verifyToken2}`
    });
    return reply.code(201).send({
      message: "Invitation accepted. Verify your email to continue."
    });
  }
  const existingUsers = await sql`
    select id
    from auth.users
    where lower(email) = ${input.email.toLowerCase()}
    limit 1
  `;
  if (existingUsers.length > 0) {
    return reply.code(409).send({ message: "An account with this email already exists." });
  }
  const userId = randomUUID();
  await sql`
    insert into auth.users (id, email, display_name, role, password_hash, email_verified, status)
    values (
      ${userId},
      ${input.email.toLowerCase()},
      ${input.displayName},
      ${"customer"},
      ${passwordHash},
      ${false},
      ${"active"}
    )
  `;
  const verifyToken = await createVerificationToken(userId, input.email.toLowerCase());
  await emitOutbox("user", userId, "user.registered", {
    userId,
    email: input.email.toLowerCase(),
    displayName: input.displayName,
    role: "customer",
    invitation: false,
    verifyUrl: `${env.APP_BASE_URL}/verify-email?token=${verifyToken}`
  });
  return reply.code(201).send({
    message: "Account created. Please verify your email before creating requests."
  });
});
app.post("/login", async (request, reply) => {
  const input = loginInputSchema.parse(request.body);
  const userRows = await sql`
    select *
    from auth.users
    where lower(email) = ${input.email.toLowerCase()}
    limit 1
  `;
  const user = userRows[0];
  if (!user || !user.password_hash) {
    return reply.code(401).send({ message: "Invalid email or password." });
  }
  const validPassword = await import_argon2.default.verify(user.password_hash, input.password);
  if (!validPassword) {
    return reply.code(401).send({ message: "Invalid email or password." });
  }
  const sessionToken = generateToken();
  const csrfToken = generateToken(16);
  await sql`
    insert into auth.sessions (
      id,
      token_hash,
      csrf_token,
      user_id,
      user_agent,
      ip_address,
      expires_at
    )
    values (
      ${randomUUID()},
      ${hashToken(sessionToken)},
      ${csrfToken},
      ${user.id},
      ${request.headers["user-agent"] ?? null},
      ${request.ip},
      now() + ${sql`${env.SESSION_TTL_HOURS} * interval '1 hour'`}
    )
  `;
  return reply.send(
    sessionResponseSchema.parse({
      sessionToken,
      csrfToken,
      user: mapUser(user)
    })
  );
});
app.post("/logout", async (request) => {
  const schema = z3.object({ sessionToken: z3.string().min(1) });
  const input = schema.parse(request.body);
  await sql`
    delete from auth.sessions
    where token_hash = ${hashToken(input.sessionToken)}
  `;
  return { ok: true };
});
app.post("/forgot-password", async (request) => {
  const input = forgotPasswordInputSchema.parse(request.body);
  const userRows = await sql`
    select *
    from auth.users
    where lower(email) = ${input.email.toLowerCase()}
    limit 1
  `;
  const user = userRows[0];
  if (user) {
    const resetToken = generateToken();
    await sql`
      insert into auth.tokens (id, token_hash, user_id, email, role, purpose, expires_at)
      values (
        ${randomUUID()},
        ${hashToken(resetToken)},
        ${user.id},
        ${user.email},
        ${user.role},
        ${"reset_password"},
        now() + interval '2 hours'
      )
    `;
    await emitOutbox("user", user.id, "user.password_reset_requested", {
      userId: user.id,
      email: user.email,
      displayName: user.display_name,
      resetUrl: `${env.APP_BASE_URL}/reset-password?token=${resetToken}`
    });
  }
  return {
    message: "If that email exists, a password reset link has been sent."
  };
});
app.post("/reset-password", async (request, reply) => {
  const input = resetPasswordInputSchema.parse(request.body);
  const tokenRows = await sql`
    select id, user_id
    from auth.tokens
    where token_hash = ${hashToken(input.token)}
      and purpose = 'reset_password'
      and consumed_at is null
      and expires_at > now()
    limit 1
  `;
  const token = tokenRows[0];
  if (!token?.user_id) {
    return reply.code(400).send({ message: "Password reset link is invalid or expired." });
  }
  const passwordHash = await import_argon2.default.hash(input.password);
  await sql.begin(async (transaction) => {
    await transaction`
      update auth.users
      set password_hash = ${passwordHash},
          updated_at = now()
      where id = ${token.user_id}
    `;
    await transaction`
      update auth.tokens
      set consumed_at = now()
      where id = ${token.id}
    `;
  });
  return { message: "Password has been reset." };
});
app.post("/verify-email", async (request, reply) => {
  const input = verifyEmailInputSchema.parse(request.body);
  const tokenRows = await sql`
    select id, user_id, email
    from auth.tokens
    where token_hash = ${hashToken(input.token)}
      and purpose = 'verify_email'
      and consumed_at is null
      and expires_at > now()
    limit 1
  `;
  const token = tokenRows[0];
  if (!token?.user_id) {
    return reply.code(400).send({ message: "Verification link is invalid or expired." });
  }
  await sql.begin(async (transaction) => {
    await transaction`
      update auth.users
      set email_verified = true,
          updated_at = now()
      where id = ${token.user_id}
    `;
    await transaction`
      update auth.tokens
      set consumed_at = now()
      where id = ${token.id}
    `;
  });
  await emitOutbox("user", token.user_id, "user.email_verified", {
    userId: token.user_id,
    email: token.email
  });
  return { message: "Email verified successfully." };
});
app.post("/internal/session/resolve", async (request, reply) => {
  if (!ensureInternal(request)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const schema = z3.object({ sessionToken: z3.string().min(1) });
  const input = schema.parse(request.body);
  const rows = await sql`
    select
      u.*,
      s.csrf_token,
      s.id as session_id
    from auth.sessions s
    inner join auth.users u on u.id = s.user_id
    where s.token_hash = ${hashToken(input.sessionToken)}
      and s.expires_at > now()
    limit 1
  `;
  const session = rows[0];
  if (!session) {
    return reply.code(401).send({ message: "Invalid session." });
  }
  await sql`
    update auth.sessions
    set last_seen_at = now()
    where id = ${session.session_id}
  `;
  return {
    user: mapUser(session),
    csrfToken: session.csrf_token,
    sessionId: session.session_id
  };
});
app.get("/internal/users", async (request, reply) => {
  if (!ensureInternal(request)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const querySchema = z3.object({
    role: roleSchema.optional()
  });
  const query = querySchema.parse(request.query);
  const rows = query.role ? await sql`
        select *
        from auth.users
        where role = ${query.role}
        order by created_at desc
      ` : await sql`
        select *
        from auth.users
        order by created_at desc
      `;
  return rows.map(mapUser);
});
app.get("/internal/users/:id", async (request, reply) => {
  if (!ensureInternal(request)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const paramsSchema = z3.object({ id: z3.string().uuid() });
  const params = paramsSchema.parse(request.params);
  const rows = await sql`
    select *
    from auth.users
    where id = ${params.id}
    limit 1
  `;
  const user = rows[0];
  if (!user) {
    return reply.code(404).send({ message: "User not found." });
  }
  return mapUser(user);
});
app.post("/internal/invite", async (request, reply) => {
  if (!ensureInternal(request)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const input = inviteUserInputSchema.parse(request.body);
  const email = input.email.toLowerCase();
  const existingUsers = await sql`
    select id
    from auth.users
    where lower(email) = ${email}
    limit 1
  `;
  const userId = existingUsers[0]?.id ?? randomUUID();
  await sql`
    insert into auth.users (id, email, display_name, role, status)
    values (${userId}, ${email}, ${input.displayName}, ${input.role}, ${"invited"})
    on conflict (id)
    do update set
      email = excluded.email,
      display_name = excluded.display_name,
      role = excluded.role,
      status = excluded.status,
      updated_at = now()
  `;
  const inviteToken = generateToken();
  await sql`
    insert into auth.tokens (id, token_hash, user_id, email, role, purpose, expires_at)
    values (
      ${randomUUID()},
      ${hashToken(inviteToken)},
      ${userId},
      ${email},
      ${input.role},
      ${"invite_signup"},
      now() + interval '7 days'
    )
  `;
  const inviteUrl = `${env.APP_BASE_URL}/signup?inviteToken=${inviteToken}&email=${encodeURIComponent(email)}&role=${input.role}`;
  await emitOutbox("user", userId, "user.registered", {
    userId,
    email,
    displayName: input.displayName,
    role: input.role,
    invitation: true,
    inviteUrl
  });
  return {
    userId,
    inviteUrl
  };
});
var port = Number(new URL(env.AUTH_SERVICE_URL).port || "4001");
if (!process.env.VERCEL) {
  app.listen({ port, host: "127.0.0.1" }).catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
}
async function handler(req, res) {
  await app.ready();
  if (req.url?.startsWith("/api/internal-auth")) {
    req.url = req.url.replace("/api/internal-auth", "") || "/";
  }
  app.server.emit("request", req, res);
}
export {
  handler as default
};
