import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const currentOpts = process.env.NODE_OPTIONS || "";
const flag = "--disable-warning=DEP0205";
const nodeOptions = currentOpts.includes(flag)
  ? currentOpts
  : [currentOpts, flag].filter(Boolean).join(" ");

const result = spawnSync(
  process.execPath,
  [nextBin, "build", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_OPTIONS: nodeOptions,
    },
  }
);

process.exit(result.status ?? 1);
