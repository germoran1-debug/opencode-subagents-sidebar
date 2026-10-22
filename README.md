# opencode-subagents-sidebar

Puts subagents back in the OpenCode sidebar. Lists the current session's subagent
child sessions, shows which are still running, and opens one when you click it.

OpenCode V2 dropped the sidebar list of subagent sessions: a child session is only
reachable from the composer's subagent tab or a timeline card. A session that fans
out work therefore loses the one view that showed all of it at once. This plugin
adds that view back, using the TUI slot API only, so nothing in the core changes.

## Install

This package is not published to npm, so install it straight from Git. OpenCode
accepts npm-compatible Git specs, and nothing is built locally:

```sh
opencode plugin add github:germoran1-debug/opencode-subagents-sidebar
```

Pin a release instead of tracking `main` when you want stability:

```sh
opencode plugin add 'github:germoran1-debug/opencode-subagents-sidebar#v0.1.0'
```

It is a **terminal-only** plugin, so it also belongs in the `plugins` array of
`cli.json` (not `opencode.json`). If `opencode plugin add` wrote the server config,
add the entry there yourself:

```json title="cli.json"
{
  "plugins": ["github:germoran1-debug/opencode-subagents-sidebar"]
}
```

Then restart the terminal UI.

### Local checkout instead

Clone the repo and point `cli.json` at the folder — handy while editing:

```json title="cli.json"
{
  "plugins": ["C:/path/to/opencode-subagents-sidebar"]
}
```

## Use

- The sidebar shows a **Subagents** section, newest activity first, with a dot per
  row: green while the child is running, muted once it is idle.
- Click a row to open that child session.
- Click the header to collapse or expand the list. The choice is remembered.
- `/subagents`, or **Subagents: open one** in the command palette, opens a picker
  with the same list. Use it when your terminal does not deliver mouse clicks to
  slotted rows.
- A session with no children shows nothing, so ordinary sessions stay clean.

The list is capped at 10 rows; an orchestration session can spawn hundreds of
children and a sidebar listing all of them is unreadable. The count stays in the
header and a `+N more` row says what was left out.

## Requirements

OpenCode V2 (built and tested against v2.1.2) and a terminal that renders the TUI.
JSX plugins share the host's `solid-js` and `@opentui` packages, declared here as
peer dependencies.

## How it works

One file, `src/tui.tsx`. It appends a component to the `sidebar.content` slot,
reads direct children of the viewed session from `context.data.session`, and
navigates with `context.ui.router.navigate`. Collapse state is kept in
`context.storage.store`.

It is defensive on purpose: a throw inside a sidebar render can blank the whole
panel, so the session list is type-checked and every theme lookup has a fallback.

## License

MIT
