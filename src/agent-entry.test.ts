import { describe, expect, it } from "vitest";
import {
  PROFILE,
  findOwnAgent,
  managedAgent,
  parseCustomAgents,
  removeAgent,
  stringifyCustomAgents,
  upsertAgent,
  type CustomAgent,
} from "./agent-entry.js";

const BINARY = "/usr/local/bin/junie";
const BRIDGE = "/path/to/junie-acp-bridge.mjs";

function otherAgent(id: string): CustomAgent {
  return { id, displayName: id, command: id, args: ["--acp"], env: {} };
}

describe("managedAgent", () => {
  it("declares the fields the plugin owns", () => {
    const agent = managedAgent(BINARY, BRIDGE);
    expect(agent).toMatchObject({
      id: PROFILE.id,
      displayName: PROFILE.displayName,
      command: BRIDGE,
      args: [],
      env: { JUNIE_BIN: BINARY },
      nativeSkillRoots: {
        user: [".junie/skills"],
        project: [".junie/skills"],
      },
    });
  });

  it("keeps keys the user added and env they set", () => {
    const existing: CustomAgent = {
      id: PROFILE.id,
      command: "junie",
      args: ["--acp=true", "--banner"],
      env: { JUNIE_API_KEY: "x" },
      cwd: "/tmp/workspace",
      dialect: "cursor",
    };
    const agent = managedAgent(BINARY, BRIDGE, existing);
    expect(agent.cwd).toBe("/tmp/workspace");
    expect(agent.dialect).toBe("cursor");
    expect(agent.env).toEqual({ JUNIE_API_KEY: "x", JUNIE_BIN: BINARY });
    // Fields we manage are rewritten even when the user edited them.
    expect(agent.args).toEqual([]);
    expect(agent.command).toBe(BRIDGE);
  });

  it("ignores a non-object env rather than passing it through", () => {
    expect(managedAgent(BINARY, BRIDGE, { id: PROFILE.id, env: "nope" }).env).toEqual({ JUNIE_BIN: BINARY });
  });
});

describe("findOwnAgent", () => {
  it("finds our entry by id and carries the user's keys", () => {
    const current = { ...managedAgent(BINARY, BRIDGE), cwd: "/current" };
    expect(findOwnAgent([otherAgent("auggie"), current])?.cwd).toBe("/current");
  });

  it("returns undefined when our entry is absent", () => {
    expect(findOwnAgent([otherAgent("auggie")])).toBeUndefined();
  });
});

describe("upsertAgent", () => {
  it("appends the entry and leaves other agents in place", () => {
    const agents = [otherAgent("auggie"), otherAgent("droid")];
    const result = upsertAgent(agents, managedAgent(BINARY, BRIDGE));
    expect(result.changed).toBe(true);
    expect(result.agents.map((agent) => agent.id)).toEqual(["auggie", "droid", PROFILE.id]);
  });

  it("is idempotent once provisioned", () => {
    const first = upsertAgent([otherAgent("auggie")], managedAgent(BINARY, BRIDGE));
    const second = upsertAgent(first.agents, managedAgent(BINARY, BRIDGE));
    expect(second.changed).toBe(false);
    expect(second.agents).toEqual(first.agents);
  });

  it("reports a change when the resolved binary moved", () => {
    const provisioned = upsertAgent([], managedAgent("/opt/homebrew/bin/junie", BRIDGE)).agents;
    const result = upsertAgent(provisioned, managedAgent(BINARY, BRIDGE));
    expect(result.changed).toBe(true);
    expect(result.agents).toHaveLength(1);
    expect(result.agents[0]?.command).toBe(BRIDGE);
  });
});

describe("removeAgent", () => {
  it("removes our entry and nothing else", () => {
    const agents = [otherAgent("auggie"), managedAgent(BINARY, BRIDGE)];
    const result = removeAgent(agents);
    expect(result.changed).toBe(true);
    expect(result.agents).toEqual([otherAgent("auggie")]);
  });

  it("reports no change when nothing is registered", () => {
    expect(removeAgent([otherAgent("auggie")]).changed).toBe(false);
  });
});

describe("parseCustomAgents", () => {
  it("treats an unset or blank setting as no agents", () => {
    expect(parseCustomAgents(undefined)).toEqual([]);
    expect(parseCustomAgents(null)).toEqual([]);
    expect(parseCustomAgents("")).toEqual([]);
    expect(parseCustomAgents("   \n")).toEqual([]);
  });

  it("round-trips what stringifyCustomAgents writes", () => {
    const agents = [otherAgent("auggie"), managedAgent(BINARY, BRIDGE)];
    expect(parseCustomAgents(stringifyCustomAgents(agents))).toEqual(agents);
  });

  it("refuses a setting it would otherwise clobber", () => {
    expect(() => parseCustomAgents('{"id":"junie"}')).toThrow(/JSON array/);
    expect(() => parseCustomAgents(["already parsed"])).toThrow(/must be a string/);
    expect(() => parseCustomAgents("[not json")).toThrow();
  });
});
