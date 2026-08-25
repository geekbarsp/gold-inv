import {
  cpSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

const root = process.cwd();
loadEnvConfig(root, false);

const required = [
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "PASSCODE_HASH",
  "SESSION_SECRET",
];
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is missing from .env.local.`);
}

const standalone = path.join(root, ".next", "standalone");
const runtime = path.join(root, "desktop", "runtime");
const configPath = path.join(root, "desktop", "bootstrap-config.json");

rmSync(runtime, { recursive: true, force: true });
mkdirSync(runtime, { recursive: true });
cpSync(standalone, runtime, { recursive: true });
renameSync(
  path.join(runtime, "node_modules"),
  path.join(runtime, "server-node-modules"),
);
const serverPath = path.join(runtime, "server.js");
const serverSource = readFileSync(serverPath, "utf8").replace(
  "require('next')",
  `process.env.NODE_PATH = path.join(__dirname, 'server-node-modules')\nrequire('module').Module._initPaths()\nrequire('next')`,
);
writeFileSync(serverPath, serverSource, "utf8");
mkdirSync(path.join(runtime, ".next", "static"), { recursive: true });
cpSync(path.join(root, ".next", "static"), path.join(runtime, ".next", "static"), {
  recursive: true,
});
cpSync(path.join(root, "public"), path.join(runtime, "public"), { recursive: true });

const config = Object.fromEntries(
  [...required, "SESSION_TIMEOUT_MINUTES"].map((name) => [
    name,
    process.env[name] || "480",
  ]),
);
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

// Confirm the generated configuration was written without printing secrets.
JSON.parse(readFileSync(configPath, "utf8"));
console.log("Desktop runtime and private configuration prepared.");
