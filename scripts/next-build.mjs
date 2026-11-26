import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

// Clear stale .next cache before production builds to avoid Next.js 16.2.2
// Turbopack next/font/google resolution bugs on warm Vercel/local rebuilds.
rmSync(path.join(process.cwd(), ".next"), { recursive: true, force: true });

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
