# Agent capability schema

Every agent in `agents/` is a Markdown file whose frontmatter the lead reads to route
work. Keep each frontmatter value on a single line.

| Field | Type | Meaning |
| --- | --- | --- |
| `name` | string | Unique agent id. |
| `description` | string | One line; what the agent does and when to pick it. |
| `capabilities` | list | Skills or domains, for example `[dotnet, api, testing]`. |
| `layer` | string | One of `orchestration`, `backend`, `frontend`, `infra`, `data`, `docs`, `review`. |
| `task_kinds` | list | What it does, for example `[implement, refactor, optimize]`. |

An agent may also carry the standard Claude Code agent fields `model` and `color`. These
are advisory presentation/runtime hints, not routing inputs; the lead ignores them when
matching tasks.

The lead routes by a coarse filter on `layer` and `task_kinds`, then picks the best
candidate by reading `description`. Add an agent by creating a file here that follows this
schema; the `SessionStart` hook will surface it automatically.

## Cross-cutting layers

The `orchestration` and `review` layers are cross-cutting: their agents (the planner and
lead, and the spec and quality reviewers) are invoked by the pipeline by name, in a fixed
order, rather than selected by the coarse capability filter. The capability filter routes
implementation work to the stack layers (`backend`, `frontend`, `infra`, `data`, `docs`).
This is why two agents may share a layer: the reviewers keep distinct `task_kinds`
(`spec-review` versus `quality-review`) so the registry stays unambiguous even though the
pipeline calls them by name.

## Populated layers

The stack layers `backend`, `frontend`, `infra`, `data`, and `docs` each ship with a
specialist as of v0.2, so the coarse filter normally finds a candidate. When it does not,
the lead scaffolds one with the writing-agents skill. The registry rejects an unknown
`layer`, empty `task_kinds`, or a duplicate agent `name`.
