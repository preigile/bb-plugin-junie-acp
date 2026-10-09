# bb-plugin-junie-acp

Adds [JetBrains Junie](https://junie.jetbrains.com/) CLI to [bb](https://getbb.app) as an ACP coding-agent provider.

After installation, **Junie** appears in bb as provider **`acp-junie`**.

The npm package is `bb-plugin-junie` and the plugin id is `junie`. The plugin
locates the `junie` CLI and drives it in its native ACP mode (`junie --acp=true`)
over stdio, registering a managed entry in bb's built-in ACP providers plugin
without disturbing other agents. The launch command matches the JetBrains entry
in the [ACP registry](https://github.com/agentclientprotocol/registry/blob/main/junie/agent.json).

## Prerequisites

- bb 0.40 or newer with its built-in ACP providers plugin enabled.
- Install Junie with `curl -fsSL https://junie.jetbrains.com/install.sh | bash`,
  then authenticate it as documented at
  <https://junie.jetbrains.com/docs/get-started-with-junie.html>.

## Build the bundle first

> **Note:** the runnable bundle in `dist/` is produced by `bb plugin build .`
> using the bb plugin SDK, and is **not** committed to this repository. Run the
> build once before installing from source or before publishing to the
> marketplace. The unit tests and type-checking below do not require `bb`.

```bash
npm install
npm run typecheck
npm test
npm run build   # requires the bb CLI: bb plugin build .
```

## Install

Until the marketplace entry is merged, install directly from GitHub:

```bash
git clone https://github.com/junie-agent/bb-plugin-junie-acp
cd bb-plugin-junie-acp
npm install
npm run build   # requires the bb CLI
bb plugin install .
```

The plugin locates the CLI and writes or repairs its managed entry in the ACP
providers plugin's `customAgents` setting without disturbing other agents. It
uses `junie --acp=true` over stdio. Model ids come from Junie's ACP session
catalog.

## Skills

The managed entry declares the skill directory the Junie CLI reads, so bb lists
it in the composer next to its own:

- project: `.junie/skills/`
- user: `~/.junie/skills/`

## Permission modes

Junie's ACP mode does not expose documented launch flags for bypassing its own
permission prompts, so bb's thread permission mode adds no launch flags and every
tool call comes through ACP for approval:

| bb mode      | Junie flag |
| ------------ | ---------- |
| Auto         | none — every tool call comes through ACP for approval |
| Accept edits | none |
| Full access  | none |

## Check or repair

```bash
bb junie status
bb junie repair
bb provider models acp-junie
```

If the CLI moves after an upgrade, `bb junie repair` records its new absolute
path and reloads bb.

## Uninstall

Remove the managed provider entry before removing the plugin:

```bash
bb junie unregister
bb plugin remove junie
```

The legacy `scripts/install.sh` and `scripts/uninstall.sh` remain available for
installations made before this repository became a bb plugin. Do not use them
for new installs: they write the `customAcpAgents` array that bb removes in
0.41. Installing the plugin migrates such an entry to the setting and deletes
the legacy one.

## How it works

bb's built-in ACP provider supplies the ACP-to-bb runtime. This plugin manages
the provider-specific launch profile in that plugin's `customAgents` setting
(the old `customAcpAgents` array in `config.json` is deprecated in bb 0.40 and
removed in 0.41). Authentication and model availability remain owned by the
Junie CLI and the user's JetBrains account.

The package ID is `junie`; the provider ID is `acp-junie`. The icon is the
official Junie mark from
[junie-agent/junie-assets](https://github.com/junie-agent/junie-assets).

## Development

```bash
npm run typecheck
npm test
npm run build   # requires the bb CLI
```

`src/agent-entry.ts` holds the pure entry-building logic — what the managed
entry looks like, how it is merged into an existing `customAgents` array, and
what is safe to remove. `npm test` (vitest) covers it. `server.ts` keeps the
side effects: locating the CLI, reading and writing the setting, the CLI
commands.

The plugin requires bb 0.40+ and plugin SDK 0.4.8+.

## License

MIT, matching [bb itself](https://github.com/get-bb/bb). See [LICENSE](LICENSE).
