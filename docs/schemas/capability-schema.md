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

The lead routes by a coarse filter on `layer` and `task_kinds`, then picks the best
candidate by reading `description`. Add an agent by creating a file here that follows this
schema; the `SessionStart` hook will surface it automatically.
