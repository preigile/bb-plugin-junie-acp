// Copies the bridge script (+ transforms) from the source tree to the runtime
// directory so they're available regardless of build process.

import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync, chmodSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = join(__dirname, "..");

// Canonical sources: bridge lives in scripts/, shared transforms in src/.
const CANONICAL_BRIDGE = join(ROOT, "scripts", "junie-acp-bridge.mjs");
const CANONICAL_TRANSFORMS = join(ROOT, "src", "acp-transforms.mjs");

function copyIfNewer(sourcePath: string, targetPath: string, executable = false): void {
  if (!existsSync(sourcePath)) return;

  let shouldCopy = true;
  if (existsSync(targetPath)) {
    shouldCopy = statSync(sourcePath).mtimeMs > statSync(targetPath).mtimeMs;
  }
  if (!shouldCopy) return;

  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, readFileSync(sourcePath, "utf8"), "utf8");
  if (executable) {
    try {
      chmodSync(targetPath, 0o755);
    } catch {
      // chmod may fail on some platforms; the script still works via `node <path>`
    }
  }
}

/**
 * Ensure the bridge script (and its transforms dependency) exist at the runtime
 * target (beside this file) and return the bridge absolute path. Refresh from
 * source if newer, so path-install via server.ts cannot stick on a stale copy.
 */
export function ensureBridgeScript(): string {
  const targetDir = __dirname; // dist/ when built, src/ when running from source
  const targetBridge = join(targetDir, "junie-acp-bridge.mjs");
  const targetTransforms = join(targetDir, "acp-transforms.mjs");

  // Keep transforms next to the bridge so `import "./acp-transforms.mjs"` resolves.
  if (existsSync(CANONICAL_TRANSFORMS)) {
    copyIfNewer(CANONICAL_TRANSFORMS, targetTransforms);
  }

  if (existsSync(CANONICAL_BRIDGE)) {
    copyIfNewer(CANONICAL_BRIDGE, targetBridge, true);
    return targetBridge;
  }

  // Fallback: packaged install without scripts/ — use whatever is already there.
  if (existsSync(targetBridge)) {
    return targetBridge;
  }

  // Caller will get a clear error when bb tries to execute a missing file.
  return targetBridge;
}
