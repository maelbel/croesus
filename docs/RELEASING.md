# Releasing

Releases are fully automated from commit history. As a maintainer, you never
manually bump a version number, write a changelog entry, or create a git tag
by hand — you just merge PRs with well-formed commit messages, and merge one
extra PR when you're ready to ship.

## The pieces

- **[Conventional Commits](https://www.conventionalcommits.org/)** — every
  commit message on `main` is structured (`feat: ...`, `fix: ...`, etc.). See
  [CONTRIBUTING.md](../CONTRIBUTING.md#commit-messages-conventional-commits)
  for the exact format.
- **[release-please](https://github.com/googleapis/release-please)** — a
  GitHub Action that watches commits on `main`. It figures out the next
  [SemVer](https://semver.org/) version from commit types (`feat` → minor,
  `fix` → patch, `!`/`BREAKING CHANGE` → major), and keeps a standing
  **"Release PR"** open with the version bump and generated `CHANGELOG.md`
  entry.
- **GitHub Releases** — created automatically when the Release PR is merged.
- **GitHub Actions `publish.yml`** — triggered by the GitHub Release being
  published. Builds and pushes the backend/frontend Docker images to GHCR,
  and builds desktop binaries for Windows/Linux/macOS via
  [tauri-action](https://github.com/tauri-apps/tauri-action), attaching them
  to the release.

## How a release actually happens

1. You merge PRs to `main` as normal, using Conventional Commit messages.
2. After each merge, `release-please` (workflow: `.github/workflows/release.yml`)
   updates (or creates) a PR titled something like `chore(main): release 0.2.0`.
   This PR contains: the version bump across `frontend/package.json`,
   `backend/pyproject.toml`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`,
   and the root manifest — plus the new `CHANGELOG.md` section. **Nothing is
   released yet at this point.**
3. When you're ready to cut a release, review and **merge that Release PR**.
   That's the entire "release button."
4. Merging it makes release-please create a git tag (`vX.Y.Z`) and a GitHub
   Release with the changelog as its description.
5. The GitHub Release being published triggers `.github/workflows/publish.yml`,
   which:
   - builds and pushes `ghcr.io/<owner>/<repo>-backend:X.Y.Z` and `:latest`
   - builds and pushes `ghcr.io/<owner>/<repo>-frontend:X.Y.Z` and `:latest`
   - builds desktop installers for Windows (`.msi`/`.exe`), macOS (`.dmg`),
     and Linux (`.deb`/`.AppImage`), and uploads them as release assets

You don't touch version numbers or the changelog by hand anywhere in this
flow — if you find yourself editing `CHANGELOG.md` or a `version` field
directly, something's off.

## Versioning policy

A single version number covers the whole project (backend, frontend, desktop
shell) — there's no independent versioning per component. This keeps things
simple for a project this size; it can be revisited if backend/frontend ever
need to evolve independently (e.g. a hosted API serving multiple frontend
versions).

### Pre-1.0 (done)

The manifest (`.release-please-manifest.json`) started at `0.1.0`, staying in
`0.x` while the API/data model was still expected to change in breaking
ways. `1.0.0` was cut once the v1 scope (Phase 0 + Phase 1 in
[ROADMAP.md](../ROADMAP.md)) was done and the project was considered stable
enough for others to rely on.

### Post-1.0

From `1.0.0` onward, the minor version tracks **ROADMAP phases**, not
individual features — a minor bump means "a whole phase shipped," not "a PR
with `feat:` merged." In practice:

- **Regular releases** (bug fixes, and features that are part of an
  in-progress phase) land as a **patch** bump: `1.0.0` → `1.0.1` → `1.0.2`...
- **Phase-completion releases** (every checkbox in a ROADMAP.md phase is
  checked) land as a **minor** bump, patch reset to `0`: finishing Phase 2 →
  `1.1.0`, Phase 3 → `1.2.0`, and so on.

release-please still infers a bump from Conventional Commit types as usual
(`fix:` → patch, `feat:` → minor), so a `feat:` commit mid-phase will
naturally propose a minor bump on its own — that's expected and fine to
leave as-is if it happens to land close to a phase boundary, but otherwise
the pending Release PR's version needs a manual nudge back to a patch bump
so day-to-day releases don't drift ahead of schedule. To force a specific
version (for either case), add a `Release-As: X.Y.Z` footer to a commit —
release-please picks this up and targets that version on its next run. This
is also how `1.0.0` itself was triggered.

## One-time repository setup

Before the first automated release can run, a maintainer needs to:

1. Push this repository to GitHub.
2. Make sure Actions have `contents: write` and `pull-requests: write`
   permissions (Settings → Actions → General → Workflow permissions), so
   `release-please` can open PRs and create releases.
3. Also under Settings → Actions → General → Workflow permissions, enable
   **"Allow GitHub Actions to create and approve pull requests"** — this is a
   separate toggle from the read/write setting above, and `release-please`
   can't open its Release PR without it.
4. Create a fine-grained PAT scoped to just this repo (`Settings → Developer
   settings → Personal access tokens` → **Contents**: read & write,
   **Pull requests**: read & write) and add it as a repository secret named
   `RELEASE_PAT` (`Settings → Secrets and variables → Actions`). A release
   created with the default `GITHUB_TOKEN` can't trigger other workflows
   (GitHub's anti-recursion rule) — without this, the Release PR gets created
   fine, but merging it produces a release that never triggers `publish.yml`.
5. Make sure GHCR packages are allowed for the repo (usually on by default for
   public repos using `GITHUB_TOKEN`).
