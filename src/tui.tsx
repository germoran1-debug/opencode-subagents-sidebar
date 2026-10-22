/**
 * subagents-sidebar - list the current session's subagent child sessions in the
 * TUI sidebar, click one to open it.
 *
 * Why: V1 showed subagents in a sidebar you could click. In V2 the only way to a
 * child session is the composer's subagent tab or a timeline card, so a session
 * that fans out work loses the one view that showed all of it at once. This puts
 * the list back without asking the core for anything new.
 *
 * What it does:
 * - Direct child sessions of the session being viewed, newest activity first.
 * - A dot per row: green while the child is running, muted once it is idle.
 * - Click a row to open that child session. Click the header to collapse, and the
 *   state is remembered. `/subagents` opens a picker for the same list, so the
 *   feature also works when a terminal does not deliver clicks to slotted rows.
 * - Nothing renders for a session with no children, so ordinary sessions stay clean.
 *
 * Deliberately capped at 10 rows: an orchestration session can spawn hundreds of
 * children, and a sidebar listing all of them is unreadable. The header keeps the
 * count, and a "+N more" row says what was left out.
 *
 * Defensive on purpose: a throw inside a sidebar render can blank the whole panel,
 * so the session list is type-checked and every theme lookup has a fallback. Status
 * is read once per child when the list is built, not on every row render.
 */
import { Plugin } from "@opencode/plugin/tui"
import { createMemo, For, Show } from "solid-js"

const VISIBLE = 10

type Child = { id: string; title: string; running: boolean }

export function SidebarSubagents(props: { context: Plugin.Context; sessionID: string }) {
  const context = props.context
  const theme = context.theme
  const [view, updateView] = context.storage.store("view", { initial: { open: true } })

  const green = theme?.text?.feedback?.success?.base ?? theme?.text?.base
  const dim = theme?.text?.muted ?? theme?.text?.base

  const children = createMemo<Child[]>(() => {
    const listed = context.data.session.list()
    if (!Array.isArray(listed)) return []
    return listed
      .filter((session) => session?.parentID === props.sessionID)
      .toSorted(
        (a, b) =>
          ((b.time?.updated ?? b.time?.created) || 0) - ((a.time?.updated ?? a.time?.created) || 0),
      )
      .map((session) => ({
        id: session.id,
        title: session.title || "Subagent",
        running: context.data.session.status(session.id) === "running",
      }))
  })

  const running = createMemo(() => children().filter((child) => child.running).length)
  const shown = createMemo(() => children().slice(0, VISIBLE))

  // Route navigation, not tabs.focus: the built-in session list navigates this way,
  // and focus() can leave the view unchanged when the child has no tab yet.
  const open = (sessionID: string) => {
    context.ui.router.navigate({ type: "session", sessionID })
  }

  // A keyboard path that does not depend on mouse events reaching a slotted row.
  const pick = async () => {
    const list = children()
    if (list.length === 0) return
    const choice = await context.ui.dialog.select({
      title: "Subagents",
      options: list.map((child) => ({
        title: child.title,
        value: child.id,
        description: child.running ? "running" : "done",
      })),
    })
    if (choice) open(choice)
  }

  context.keymap.layer(() => ({
    mode: "global",
    commands: [
      {
        id: "subagents-sidebar.pick",
        title: "Subagents: open one",
        group: "Session",
        palette: true,
        slash: { name: "subagents" },
        run: () => void pick(),
      },
    ],
  }))

  return (
    <Show when={children().length > 0}>
      <box>
        <box
          flexDirection="row"
          gap={1}
          onMouseDown={() => {
            void updateView((draft) => {
              draft.open = !draft.open
            }).catch((error) => console.error("Failed to persist subagents sidebar state", error))
          }}
        >
          <text fg={theme?.text?.base}>{view.open ? "▼" : "▶"}</text>
          <text fg={theme?.text?.base}>
            <b>Subagents</b>
            <Show when={!view.open}>
              <span style={{ fg: dim }}>
                {" "}
                ({children().length}
                {running() > 0 ? `, ${running()} running` : ""})
              </span>
            </Show>
          </text>
        </box>
        <Show when={view.open}>
          <For each={shown()}>
            {(child) => (
              <box flexDirection="row" gap={1} minWidth={0} onMouseDown={() => open(child.id)}>
                <text flexShrink={0} style={{ fg: child.running ? green : dim }}>
                  •
                </text>
                <text fg={theme?.text?.base} wrapMode="none" truncate flexGrow={1} flexShrink={1} minWidth={0}>
                  {child.title}
                </text>
                <text fg={dim} wrapMode="none" flexShrink={0}>
                  {child.running ? "running" : "done"}
                </text>
              </box>
            )}
          </For>
          <Show when={children().length > VISIBLE}>
            <text fg={dim}>{`+${children().length - VISIBLE} more`}</text>
          </Show>
        </Show>
      </box>
    </Show>
  )
}

export default Plugin.define({
  id: "subagents-sidebar",
  setup(context) {
    context.ui.slot({
      append: "sidebar.content",
      render: (props) => <SidebarSubagents context={context} sessionID={props.sessionID} />,
    })
  },
})
