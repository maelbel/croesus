# Contributing

Thanks for considering contributing to Croesus! This project is small and
young, so the process is intentionally lightweight.

## Getting set up

See [README.md](./README.md) for local dev setup (backend, frontend, desktop).

## Workflow

1. **Fork** the repo (or branch directly if you have write access).
2. Create a branch off `main`: `git checkout -b feat/short-description`.
3. Make your change. Keep PRs focused — one logical change per PR.
4. Before opening a PR, run locally:
   - Backend: `cd backend && uv run ruff check .`
   - Frontend: `cd frontend && pnpm lint && pnpm build`
   - Desktop (if you touched `src-tauri/`): `cargo check --manifest-path src-tauri/Cargo.toml`
5. Open a PR against `main`. CI runs the same checks automatically.

## Commit messages: Conventional Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/),
because releases are automated from commit history (see
[docs/RELEASING.md](./docs/RELEASING.md)). The commit type directly determines
the next version number and the changelog entry, so it matters.

Format: `<type>(<optional scope>): <description>`

Common types:

| Type       | Use for                                             | Version bump |
|------------|------------------------------------------------------|--------------|
| `feat`     | A new feature                                         | minor        |
| `fix`      | A bug fix                                             | patch        |
| `perf`     | A performance improvement                             | patch        |
| `docs`     | Documentation only                                    | none         |
| `refactor` | Code change that's neither a fix nor a feature        | none         |
| `chore`    | Tooling, dependency bumps, CI config                  | none         |
| `deps`     | Dependency updates worth calling out in the changelog | patch        |

Breaking change: add `!` after the type/scope (`feat!: ...`) or a
`BREAKING CHANGE:` footer in the commit body. This triggers a major version
bump.

Examples:

```
feat(accounts): add support for real estate accounts
fix(dashboard): correct net worth history when an account has no valuations
docs: clarify desktop build prerequisites
feat(api)!: rename `remaining_amount` to `remaining_balance` on liabilities
```

## Code style

- Backend: [ruff](https://docs.astral.sh/ruff/) (`uv run ruff check .`, `--fix` to auto-fix).
- Frontend: ESLint (`pnpm lint`).
- No strict formatter is enforced yet (no Prettier/Black wired in) — match the
  surrounding code style.

## License

By contributing, you agree that your contributions will be licensed under the
project's [AGPL-3.0-or-later](./LICENSE) license.
