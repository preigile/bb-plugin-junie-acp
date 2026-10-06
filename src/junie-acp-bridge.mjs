#!/usr/bin/env node
import { spawn } from "node:child_process";
import { rewriteConfigOptions } from "./acp-transforms.mjs";

function log(...args) {
  if (process.env.JUNIE_BRIDGE_LOG) {
    console.error(new Date().toISOString(), "...", ...args);
  }
}

const junieBin = process.env.JUNIE_BIN;
if (!junieBin) {
  console.error("JUNIE_BIN environment variable is required");
  process.exit(1);
}

log("spawning", junieBin, "--acp=true");

const junie = spawn(junieBin, ["--acp=true"], {
  stdio: ["pipe", "pipe", "pipe"],
  env: {
    ...process.env,
    JUNIE_BIN: undefined,
  },
});

let junieStderr = "";
junie.stderr.on("data", (chunk) => {
  junieStderr += chunk.toString();
  process.stderr.write(chunk);
});

junie.on("error", (err) => {
  console.error("Failed to spawn Junie:", err.message);
  process.exit(1);
});

junie.on("exit", (code, signal) => {
  log("Junie exited with code", code, "signal", signal);
  process.exit(code ?? 0);
});

function processLine(line) {
  if (!line.trim()) return null;
  try {
    return JSON.parse(line);
  } catch {
    return line;
  }
}

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  const lines = chunk.split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const msg = processLine(line);
    if (msg && typeof msg === "object") {
      log("bb→junie", msg.method ?? "response", msg.id ?? "");
    }
    junie.stdin.write(line + "\n");
  }
});

junie.stdout.setEncoding("utf8");
junie.stdout.on("data", (chunk) => {
  const lines = chunk.split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const msg = processLine(line);
    if (msg && typeof msg === "object") {
      const rewritten = rewriteConfigOptions(msg);
      const outLine = JSON.stringify(rewritten);
      const method = rewritten.method ?? (rewritten.id ? "response" : "notification");
      log("junie→bb", method, rewritten.id ?? "");
      process.stdout.write(outLine + "\n");
    } else {
      process.stdout.write(line + "\n");
    }
  }
});
