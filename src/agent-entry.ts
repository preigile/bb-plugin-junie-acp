export type JsonObject = Record<string, unknown>;
export type CustomAgent = JsonObject & { id?: unknown; command?: unknown; env?: unknown };

export const ACP_PLUGIN_ID = "provider-acp";

export const PROFILE = {
  id: "junie",
  providerId: "acp-junie",
  displayName: "Junie",
  binary: "junie",
  // Junie's ACP mode is launched with `junie --acp=true` over stdio
  // (matching the JetBrains entry in the ACP registry:
  // https://github.com/agentclientprotocol/registry/blob/main/junie/agent.json).
  args: ["--acp=true"],
  // The skill directories the Junie CLI reads, so bb lists them in the composer
  // beside its own. Project roots resolve from the workspace, user roots from
  // the home directory.
  nativeSkillRoots: {
    user: [".junie/skills"],
    project: [".junie/skills"],
  },
  // Junie's ACP mode exposes no documented launch flags for bypassing its own
  // permission prompts, so bb's permission modes add nothing and every tool
  // call comes through ACP for approval as usual.
  // permissionCli is omitted — Junie has no bypass flags.
  installHint: "Install Junie with `curl -fsSL https://junie.jetbrains.com/install.sh | bash` (see https://junie.jetbrains.com/docs/get-started-with-junie.html), then run `bb plugin reload junie`.",
} as const;

export function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isOwnAgent(agent: CustomAgent | undefined): boolean {
  return agent?.id === PROFILE.id;
}

/** Our entry, so a reload carries the user's own keys over. */
export function findOwnAgent(agents: CustomAgent[]): CustomAgent | undefined {
  return agents.find(isOwnAgent);
}

export function parseCustomAgents(value: unknown): CustomAgent[] {
  if (value === undefined || value === null || value === "") return [];
  if (typeof value !== "string") {
    throw new Error(`${ACP_PLUGIN_ID} customAgents must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return [];
  const parsed: unknown = JSON.parse(trimmed);
  if (!Array.isArray(parsed)) {
    throw new Error(`${ACP_PLUGIN_ID} customAgents must be a JSON array; refusing to overwrite it`);
  }
  return parsed as CustomAgent[];
}

export function stringifyCustomAgents(agents: CustomAgent[]): string {
  return `${JSON.stringify(agents, null, 2)}\n`;
}

export function managedAgent(binary: string, bridgePath: string, existing?: CustomAgent): CustomAgent {
  const existingEnv = isObject(existing?.env) ? existing.env : {};
  return {
    // Keys the user added themselves (cwd, dialect, modelCli, ...) survive a
    // reload; the fields below are ours and are rewritten every time.
    ...(existing ?? {}),
    id: PROFILE.id,
    displayName: PROFILE.displayName,
    // Point at the bridge proxy; the real Junie binary is passed via JUNIE_BIN
    command: bridgePath,
    args: [],
    env: {
      ...existingEnv,
      JUNIE_BIN: binary,
    },
    nativeSkillRoots: {
      user: [...PROFILE.nativeSkillRoots.user],
      project: [...PROFILE.nativeSkillRoots.project],
    },
  };
}

/**
 * Writes our entry. Reported as changed only when the resulting array differs,
 * so a settled configuration is never rewritten.
 */
export function upsertAgent(agents: CustomAgent[], next: CustomAgent): { agents: CustomAgent[]; changed: boolean } {
  const index = agents.findIndex(isOwnAgent);
  const copy = [...agents];
  if (index >= 0) copy[index] = next;
  else copy.push(next);
  return { agents: copy, changed: JSON.stringify(copy) !== JSON.stringify(agents) };
}

export function removeAgent(agents: CustomAgent[]): { agents: CustomAgent[]; changed: boolean } {
  const next = agents.filter((agent) => !isOwnAgent(agent));
  return { agents: next, changed: next.length !== agents.length };
}
