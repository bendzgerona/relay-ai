#!/data/data/com.termux/files/usr/bin/bun

// src/constants.ts
import { homedir } from "os";
import { join } from "path";

// package.json
var package_default = {
  name: "@bendzgerona/relay-ai",
  version: "0.15.4",
  publishConfig: {
    access: "public"
  },
  description: "Relay any model into any coding agent \u2014 launch Claude Code, Codex, and more with multi-provider gateways",
  author: "bendzgerona",
  license: "MIT",
  repository: {
    type: "git",
    url: "git+https://github.com/bendzgerona/relay-ai.git"
  },
  homepage: "https://github.com/bendzgerona/relay-ai#readme",
  keywords: [
    "claude",
    "claude-code",
    "codex",
    "ai",
    "llm",
    "cli",
    "gateway",
    "relay",
    "vertex"
  ],
  type: "module",
  bin: {
    "relay-ai": "dist/cli.js",
    relayai: "dist/cli.js",
    relai: "dist/cli.js"
  },
  files: [
    "dist",
    "README.md"
  ],
  engines: {
    bun: ">=1.4"
  },
  scripts: {
    build: "bun scripts/patch-napi-keyring.mjs apply && bun node_modules/.bin/tsup && bun node_modules/.bin/tsup --config tsup.core.config.ts && bun scripts/copy-ui-assets.mjs && bun scripts/fix-shebangs.mjs",
    "patch:keyring": "bun scripts/patch-napi-keyring.mjs apply",
    "verify:keyring": "bun scripts/patch-napi-keyring.mjs check",
    "build:publish": "tsup && tsup --config tsup.core.config.ts && node scripts/copy-ui-assets.mjs",
    dev: "tsup --watch",
    test: 'vitest run --exclude "tests/debug-*.test.ts"',
    "test:reasoning": "vitest run tests/reasoning-coverage.test.ts",
    "test:live:reasoning": "vitest run tests/debug-reasoning-live.test.ts",
    "test:live": "vitest run tests/debug-xai.test.ts tests/debug-openai-oauth.test.ts",
    "test:watch": "vitest",
    typecheck: "tsc --noEmit",
    "release:check": "node scripts/release-metadata.mjs",
    "refresh:models-dev": "node scripts/refresh-models-dev-cache.mjs",
    prepublishOnly: "npm run release:check && npm run build:publish"
  },
  dependencies: {
    "@ai-sdk/alibaba": "^2.0.41",
    "@ai-sdk/amazon-bedrock": "^5.0.76",
    "@ai-sdk/anthropic": "4.0.49",
    "@ai-sdk/azure": "^4.0.63",
    "@ai-sdk/cerebras": "^3.0.44",
    "@ai-sdk/cohere": "^4.0.37",
    "@ai-sdk/deepinfra": "^3.0.44",
    "@ai-sdk/gateway": "^4.0.75",
    "@ai-sdk/google": "^4.0.64",
    "@ai-sdk/google-vertex": "^5.0.76",
    "@ai-sdk/groq": "^4.0.37",
    "@ai-sdk/mistral": "^4.0.39",
    "@ai-sdk/openai": "^4.0.60",
    "@ai-sdk/openai-compatible": "^3.0.44",
    "@ai-sdk/perplexity": "^4.0.39",
    "@ai-sdk/provider-utils": "5.0.36",
    "@ai-sdk/togetherai": "^3.0.45",
    "@ai-sdk/xai": "^4.0.54",
    "@clack/prompts": "^0.9.1",
    "@openrouter/ai-sdk-provider": "^3.0.0",
    ai: "^7.0.93",
    "cross-spawn": "^7.0.6",
    "gitlab-ai-provider": "^6.15.0",
    graphql: "^16.14.2",
    "ipaddr.js": "^2.4.0",
    "node-forge": "^1.4.0",
    open: "^11.0.0",
    picocolors: "^1.1.1",
    "smol-toml": "^1.6.1",
    ws: "^8.21.0",
    zod: "^3.25.76"
  },
  devDependencies: {
    "@types/cross-spawn": "^6.0.6",
    "@types/node": "^22.0.0",
    "@types/node-forge": "^1.3.14",
    "@types/ws": "^8.18.1",
    "@vitest/coverage-v8": "^4.1.10",
    tsup: "^8.0.0",
    typescript: "^5.5.0",
    "vite-node": "^6.0.0",
    vitest: "^4.1.10"
  },
  overrides: {
    ws: "^8.21.0"
  },
  exports: {
    "./core": {
      types: "./dist/core/index.d.ts",
      import: "./dist/core/index.js",
      default: "./dist/core/index.js"
    },
    "./package.json": "./package.json"
  }
};

// src/constants.ts
var BACKENDS = {
  zen: {
    id: "zen",
    name: "OpenCode Zen",
    // No /v1 suffix — the Anthropic SDK appends /v1/messages automatically
    baseUrl: "https://opencode.ai/zen"
  },
  go: {
    id: "go",
    name: "OpenCode Go",
    baseUrl: "https://opencode.ai/zen/go"
  }
};
var CODEX_RESPONSES_LITE_WS_URL = "wss://chatgpt.com/backend-api/codex/responses";
var CODEX_RESPONSES_LITE_VERSION = "0.155.1";
var CODEX_RESPONSES_WEBSOCKETS_BETA = "responses_websockets=2026-02-06";
var CONFLICTING_ENV_VARS = [
  "CLAUDE_CODE_USE_VERTEX",
  "ANTHROPIC_VERTEX_PROJECT_ID",
  "ANTHROPIC_VERTEX_BASE_URL",
  "CLOUD_ML_REGION",
  "ANTHROPIC_BEDROCK_BASE_URL",
  "ANTHROPIC_AWS_BASE_URL",
  "ANTHROPIC_AWS_API_KEY",
  "ANTHROPIC_AWS_WORKSPACE_ID",
  "ANTHROPIC_FOUNDRY_API_KEY",
  "ANTHROPIC_FOUNDRY_BASE_URL",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_MODEL",
  "ANTHROPIC_DEFAULT_OPUS_MODEL",
  "ANTHROPIC_DEFAULT_SONNET_MODEL",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL"
];
var PARENT_SESSION_ENV_VARS = [
  "CLAUDECODE",
  "CLAUDE_CODE_CHILD_SESSION",
  "CLAUDE_CODE_SESSION_ID",
  "CLAUDE_CODE_HOST_SESSION_ID",
  "CLAUDE_CODE_ENTRYPOINT",
  "CLAUDE_PID"
];
var OPENCODE_CACHE_PATH = join(homedir(), ".cache", "opencode", "models.json");
var MAX_MODEL_CATALOG = 50;
var CODEX_SUBAGENT_MODEL_CAP = 1;
var MIN_CONTEXT_WINDOW = 128e3;
var VERTEX_ANTHROPIC_NPM = "@ai-sdk/google-vertex/anthropic";
function classifyModelFormat(modelId, providerNpm) {
  if (providerNpm === "@ai-sdk/anthropic") return "anthropic";
  if (providerNpm === "@ai-sdk/openai") return "unsupported";
  if (providerNpm === "@ai-sdk/google") return "unsupported";
  const lower = modelId.toLowerCase();
  if (lower.startsWith("claude-")) return "anthropic";
  if (lower.startsWith("gpt-")) return "unsupported";
  if (lower.startsWith("gemini-")) return "unsupported";
  return "openai";
}
var VERSION = package_default.version;

// src/paths.ts
import { homedir as homedir2 } from "os";
import { join as join2 } from "path";
var APP_DIR_NAME = "relay-ai";
var LEGACY_APP_DIR_NAME = "opencode-starter";
function userHome(env = process.env) {
  return env.HOME ?? env.USERPROFILE ?? homedir2();
}
function resolveAppHomeOverride(env = process.env) {
  const override = env.RELAY_AI_HOME ?? env.OPENCODE_STARTER_HOME;
  return override?.trim() || void 0;
}
function getAppHome(env = process.env) {
  const override = resolveAppHomeOverride(env);
  if (override) return override;
  return join2(userHome(env), `.${APP_DIR_NAME}`);
}
function getLegacyAppHome(env = process.env) {
  return join2(userHome(env), `.${LEGACY_APP_DIR_NAME}`);
}
function getConfigPath(env = process.env) {
  return join2(getAppHome(env), "config.json");
}
function getProvidersPath(env = process.env) {
  return join2(getAppHome(env), "providers.json");
}
function getSecretsPath(env = process.env) {
  return join2(getAppHome(env), "secrets.json");
}
function getLogsPath(env = process.env) {
  return join2(getAppHome(env), "logs");
}
function getVertexModelsPath(env = process.env) {
  return join2(getAppHome(env), "vertex-models.json");
}
function getLegacyConfPath(env = process.env, platform = process.platform) {
  const home = userHome(env);
  const appName = `${LEGACY_APP_DIR_NAME}-nodejs`;
  if (platform === "darwin") {
    return join2(home, "Library", "Preferences", appName, "config.json");
  }
  if (platform === "win32") {
    return join2(env.APPDATA ?? join2(home, "AppData", "Roaming"), appName, "Config", "config.json");
  }
  return join2(env.XDG_CONFIG_HOME ?? join2(home, ".config"), appName, "config.json");
}

// src/config.ts
import { dirname, join as join3 } from "path";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
function readJsonFile(path) {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
function ensureAppHomeMigrated() {
  const configPath = getConfigPath();
  if (existsSync(configPath)) return;
  const legacyConfig = join3(getLegacyAppHome(), "config.json");
  if (!existsSync(legacyConfig)) return;
  mkdirSync(getAppHome(), { recursive: true, mode: 448 });
  copyFileSync(legacyConfig, configPath);
  const legacyVertex = join3(getLegacyAppHome(), "vertex-models.json");
  const vertexPath = join3(getAppHome(), "vertex-models.json");
  if (existsSync(legacyVertex) && !existsSync(vertexPath)) {
    copyFileSync(legacyVertex, vertexPath);
  }
}
function ensureConfigMigrated() {
  ensureAppHomeMigrated();
  const configPath = getConfigPath();
  if (existsSync(configPath)) return;
  const legacyPath = getLegacyConfPath();
  if (!existsSync(legacyPath)) return;
  const legacy = readJsonFile(legacyPath);
  if (!legacy) return;
  mkdirSync(dirname(configPath), { recursive: true, mode: 448 });
  writeFileSync(configPath, `${JSON.stringify(legacy, null, 2)}
`, { encoding: "utf8", mode: 384 });
  try {
    renameSync(legacyPath, `${legacyPath}.migrated`);
  } catch {
  }
}
function readConfig() {
  ensureConfigMigrated();
  return migrateAntigravityFavorites(readJsonFile(getConfigPath()) ?? {});
}
function migrateAntigravityFavorites(config) {
  const legacy = config;
  if (!("antigravityCliFavoriteModels" in legacy) && !("antigravityCliFavoritesHintShown" in legacy)) return config;
  const merged = [...legacy.favoriteModels ?? []];
  for (const fav of legacy.antigravityCliFavoriteModels ?? []) {
    if (merged.length >= MAX_MODEL_CATALOG) break;
    if (!merged.some((m) => m.providerId === fav.providerId && m.modelId === fav.modelId)) merged.push(fav);
  }
  const { antigravityCliFavoriteModels: _models, antigravityCliFavoritesHintShown: _hint, ...rest } = legacy;
  const next = merged.length > 0 ? { ...rest, favoriteModels: merged } : rest;
  writeConfig(next);
  return next;
}
function writeConfig(config) {
  const configPath = getConfigPath();
  mkdirSync(dirname(configPath), { recursive: true, mode: 448 });
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}
`, { encoding: "utf8", mode: 384 });
}
function loadPreferences() {
  const config = readConfig();
  const lastProvider = config.lastProvider === "opencode" ? "zen" : config.lastProvider;
  return {
    lastBackend: config.lastBackend,
    lastModel: config.lastModel,
    lastProvider,
    lastCodexProvider: config.lastCodexProvider,
    lastCodexModel: config.lastCodexModel,
    lastGeminiProvider: config.lastGeminiProvider,
    lastGeminiModel: config.lastGeminiModel,
    lastAntigravityProvider: config.lastAntigravityProvider,
    lastAntigravityModel: config.lastAntigravityModel,
    lastClaudeTransparentMode: config.lastClaudeTransparentMode,
    recentModelsByProvider: config.recentModelsByProvider,
    favoriteModels: config.favoriteModels,
    codexSubagentModels: Array.isArray(config.codexSubagentModels) ? config.codexSubagentModels.slice(0, CODEX_SUBAGENT_MODEL_CAP) : void 0,
    appPathOverrides: config.appPathOverrides,
    recentLaunchFolders: config.recentLaunchFolders,
    server: config.server
  };
}
function savePreferences(prefs) {
  const config = readConfig();
  if (prefs.lastBackend !== void 0) config.lastBackend = prefs.lastBackend;
  if (prefs.lastModel !== void 0) config.lastModel = prefs.lastModel;
  if (prefs.lastProvider !== void 0) config.lastProvider = prefs.lastProvider;
  if (prefs.lastCodexProvider !== void 0) config.lastCodexProvider = prefs.lastCodexProvider;
  if (prefs.lastCodexModel !== void 0) config.lastCodexModel = prefs.lastCodexModel;
  if (prefs.lastGeminiProvider !== void 0) config.lastGeminiProvider = prefs.lastGeminiProvider;
  if (prefs.lastGeminiModel !== void 0) config.lastGeminiModel = prefs.lastGeminiModel;
  if (prefs.lastAntigravityProvider !== void 0) config.lastAntigravityProvider = prefs.lastAntigravityProvider;
  if (prefs.lastAntigravityModel !== void 0) config.lastAntigravityModel = prefs.lastAntigravityModel;
  if (prefs.lastClaudeTransparentMode !== void 0) config.lastClaudeTransparentMode = prefs.lastClaudeTransparentMode;
  if (prefs.recentModelsByProvider !== void 0) config.recentModelsByProvider = prefs.recentModelsByProvider;
  if (prefs.favoriteModels !== void 0) config.favoriteModels = prefs.favoriteModels;
  if (prefs.codexSubagentModels !== void 0) {
    config.codexSubagentModels = prefs.codexSubagentModels.slice(0, CODEX_SUBAGENT_MODEL_CAP);
  }
  if (prefs.appPathOverrides !== void 0) config.appPathOverrides = prefs.appPathOverrides;
  if (prefs.recentLaunchFolders !== void 0) config.recentLaunchFolders = prefs.recentLaunchFolders;
  writeConfig(config);
}
function getAppPathOverride(appId) {
  const value = loadPreferences().appPathOverrides?.[appId];
  return typeof value === "string" && value.trim() ? value : void 0;
}
function setAppPathOverride(appId, path) {
  const config = readConfig();
  const next = { ...config.appPathOverrides ?? {} };
  const trimmed = path?.trim() ?? "";
  if (trimmed) next[appId] = trimmed;
  else delete next[appId];
  config.appPathOverrides = next;
  if (Object.keys(next).length === 0) delete config.appPathOverrides;
  writeConfig(config);
  return next;
}
var MAX_RECENT_MODELS = 3;
var MAX_RECENT_LAUNCH_FOLDERS = 6;
function recordLaunchFolder(folder) {
  const trimmed = folder.trim();
  if (!trimmed) return loadPreferences().recentLaunchFolders ?? [];
  const config = readConfig();
  const prev = config.recentLaunchFolders ?? [];
  const next = [trimmed, ...prev.filter((path) => path !== trimmed)].slice(0, MAX_RECENT_LAUNCH_FOLDERS);
  config.recentLaunchFolders = next;
  writeConfig(config);
  return next;
}
function recordLaunchSelection(agent, providerId, modelId, prefs) {
  const prevRecent = prefs.recentModelsByProvider?.[providerId] ?? [];
  const updatedRecent = [modelId, ...prevRecent.filter((id) => id !== modelId)].slice(0, MAX_RECENT_MODELS);
  savePreferences({
    ...agent === "claude" ? { lastProvider: providerId, lastModel: modelId } : agent === "codex" ? { lastCodexProvider: providerId, lastCodexModel: modelId } : { lastGeminiProvider: providerId, lastGeminiModel: modelId },
    recentModelsByProvider: { ...prefs.recentModelsByProvider, [providerId]: updatedRecent }
  });
}
var SERVER_PASSWORD_SERVICE = "relay-ai-server-password";
var SERVER_PASSWORD_ACCOUNT = "server-password";
async function getServerPasswordKeyring() {
  try {
    const { Entry } = await import("./secrets-backend-DIUCUO5Y.js");
    return new Entry(SERVER_PASSWORD_SERVICE, SERVER_PASSWORD_ACCOUNT);
  } catch {
    return null;
  }
}
async function getSavedServerPassword() {
  const config = readConfig();
  if (config.server?.savedPassword) {
    const pwd = config.server.savedPassword;
    const keyring2 = await getServerPasswordKeyring();
    if (keyring2) {
      try {
        await keyring2.setPassword(pwd);
        delete config.server.savedPassword;
        if (Object.keys(config.server).length === 0) delete config.server;
        writeConfig(config);
      } catch {
      }
    }
    return pwd;
  }
  const keyring = await getServerPasswordKeyring();
  if (keyring) {
    try {
      return await keyring.getPassword();
    } catch {
      return null;
    }
  }
  return null;
}
function getEnvServerPassword() {
  const value = process.env["RELAY_AI_SERVER_PASSWORD"]?.trim();
  return value || null;
}
async function setSavedServerPassword(password) {
  const keyring = await getServerPasswordKeyring();
  if (keyring) {
    try {
      await keyring.setPassword(password);
      return;
    } catch {
    }
  }
  const config = readConfig();
  config.server = {
    ...config.server ?? {},
    savedPassword: password
  };
  writeConfig(config);
}
function getServerExposedProviders() {
  const list = readConfig().server?.exposedProviders;
  return list && list.length > 0 ? list : null;
}
function setServerExposedProviders(providerIds) {
  const config = readConfig();
  config.server = {
    ...config.server ?? {},
    exposedProviders: providerIds
  };
  writeConfig(config);
}
function getServerMaskGatewayIds() {
  return readConfig().server?.maskGatewayIds ?? true;
}
function setServerMaskGatewayIds(mask) {
  const config = readConfig();
  config.server = {
    ...config.server ?? {},
    maskGatewayIds: mask
  };
  writeConfig(config);
}
function getServerFavoritesOnly() {
  return readConfig().server?.favoritesOnly ?? false;
}
function setServerFavoritesOnly(favoritesOnly) {
  const config = readConfig();
  config.server = {
    ...config.server ?? {},
    favoritesOnly
  };
  writeConfig(config);
}
function getServerFreeModelsOnly() {
  return readConfig().server?.freeModelsOnly ?? false;
}
function setServerFreeModelsOnly(freeModelsOnly) {
  const config = readConfig();
  config.server = {
    ...config.server ?? {},
    freeModelsOnly
  };
  writeConfig(config);
}
function getServerListenMode() {
  return readConfig().server?.listenMode === "network" ? "network" : "local";
}
function setServerListenMode(listenMode) {
  const config = readConfig();
  config.server = {
    ...config.server ?? {},
    listenMode
  };
  writeConfig(config);
}
function getServerAutostart() {
  return readConfig().server?.autostart ?? false;
}
function setServerAutostart(autostart) {
  const config = readConfig();
  config.server = {
    ...config.server ?? {},
    autostart
  };
  writeConfig(config);
}
function resolveServerAutostart(env = process.env) {
  const envVal = env["RELAY_AI_SERVER_AUTOSTART"]?.trim().toLowerCase();
  if (envVal !== void 0 && envVal !== "") {
    return ["1", "true", "yes", "on"].includes(envVal);
  }
  return getServerAutostart();
}

export {
  BACKENDS,
  CODEX_RESPONSES_LITE_WS_URL,
  CODEX_RESPONSES_LITE_VERSION,
  CODEX_RESPONSES_WEBSOCKETS_BETA,
  CONFLICTING_ENV_VARS,
  PARENT_SESSION_ENV_VARS,
  OPENCODE_CACHE_PATH,
  MAX_MODEL_CATALOG,
  CODEX_SUBAGENT_MODEL_CAP,
  MIN_CONTEXT_WINDOW,
  VERTEX_ANTHROPIC_NPM,
  classifyModelFormat,
  VERSION,
  getAppHome,
  getConfigPath,
  getProvidersPath,
  getSecretsPath,
  getLogsPath,
  getVertexModelsPath,
  loadPreferences,
  savePreferences,
  getAppPathOverride,
  setAppPathOverride,
  recordLaunchFolder,
  recordLaunchSelection,
  getSavedServerPassword,
  getEnvServerPassword,
  setSavedServerPassword,
  getServerExposedProviders,
  setServerExposedProviders,
  getServerMaskGatewayIds,
  setServerMaskGatewayIds,
  getServerFavoritesOnly,
  setServerFavoritesOnly,
  getServerFreeModelsOnly,
  setServerFreeModelsOnly,
  getServerListenMode,
  setServerListenMode,
  setServerAutostart,
  resolveServerAutostart
};
//# sourceMappingURL=chunk-O4GCBAZH.js.map