# Changelog

## [1.1.0](https://github.com/maelbel/croesus/compare/v1.0.1...v1.1.0) (2026-09-06)


### Features

* add a logo ([#23](https://github.com/maelbel/croesus/issues/23)) ([f40f1b2](https://github.com/maelbel/croesus/commit/f40f1b2fb74d46b683c76388b2ff05068dc49ec2))
* **frontend:** redesign navigation shell and close design-fidelity gaps ([#24](https://github.com/maelbel/croesus/issues/24)) ([b047261](https://github.com/maelbel/croesus/commit/b0472610399e21add0ba66a6679d7254f9876103))


### Bug Fixes

* **backend:** OIDC callback bugs + DRY up JWT handling ([#15](https://github.com/maelbel/croesus/issues/15)) ([3ad5081](https://github.com/maelbel/croesus/commit/3ad50814c8faa110805ed5bd06945bfa2f5cab47))
* **backend:** security hardening + correctness fixes from full-codebase review ([#20](https://github.com/maelbel/croesus/issues/20)) ([545518e](https://github.com/maelbel/croesus/commit/545518e2560c3e879fd2579d8f46ed2000c02486))
* **frontend:** correctness/efficiency fixes + DRY from full-codebase review ([#22](https://github.com/maelbel/croesus/issues/22)) ([c77a56a](https://github.com/maelbel/croesus/commit/c77a56a8b98bfc9cb947c6de906d6709bc118f1c))
* **frontend:** surface OIDC callback errors + dedupe error handling ([#17](https://github.com/maelbel/croesus/issues/17)) ([76bc41b](https://github.com/maelbel/croesus/commit/76bc41bca281570fb69bb822f481d0b71734387e))
* **tauri:** fix OIDC loopback panic + bind callback to its own attempt ([#18](https://github.com/maelbel/croesus/issues/18)) ([571562a](https://github.com/maelbel/croesus/commit/571562aeda2b714bb26438ac5dbaf9d1884a599b))
* **tauri:** OIDC timeout-bypass regression + dedupe + typed mode ([#19](https://github.com/maelbel/croesus/issues/19)) ([dd5ad2c](https://github.com/maelbel/croesus/commit/dd5ad2c67592d336cf078eb3e30162746de6965e))

## [1.0.1](https://github.com/maelbel/croesus/compare/v1.0.0...v1.0.1) (2026-08-26)


### Documentation

* add stack badges to README ([#13](https://github.com/maelbel/croesus/issues/13)) ([0dc08aa](https://github.com/maelbel/croesus/commit/0dc08aa970b3b93fd83f44bc693d6857d49a7b52))

## [1.0.0](https://github.com/maelbel/croesus/compare/v0.5.0...v1.0.0) (2026-08-26)


### Documentation

* **releasing:** post-1.0 versioning policy — minor bumps track phases ([#12](https://github.com/maelbel/croesus/issues/12)) ([697d4ca](https://github.com/maelbel/croesus/commit/697d4caa4e804b1532ef6f8d429d30a22f7d5cb1))
* reverse proxy setup guide (Traefik, Caddy, nginx) ([#10](https://github.com/maelbel/croesus/issues/10)) ([0f00e7a](https://github.com/maelbel/croesus/commit/0f00e7a36e6213df83cc2296d9beaf49d2503d4a))

## [0.5.0](https://github.com/maelbel/croesus/compare/v0.4.0...v0.5.0) (2026-08-26)


### Features

* generic OIDC SSO support (self-hosted + remote desktop mode) ([#8](https://github.com/maelbel/croesus/issues/8)) ([a332589](https://github.com/maelbel/croesus/commit/a33258919c4b02520bc5056573847ea69d4f99d9))

## [0.4.0](https://github.com/maelbel/croesus/compare/v0.3.0...v0.4.0) (2026-08-25)


### Features

* desktop remote mode, security defaults, and Node-based setup scripts ([#6](https://github.com/maelbel/croesus/issues/6)) ([015278a](https://github.com/maelbel/croesus/commit/015278a4fe8803d6a4b4637444d9d24a6363ec3f))

## [0.3.0](https://github.com/maelbel/croesus/compare/v0.2.1...v0.3.0) (2026-08-14)


### Features

* add local desktop mode with FastAPI sidecar ([c063dbb](https://github.com/maelbel/croesus/commit/c063dbb305ab9594523de4807c436f67b8a607ff))

## [0.2.1](https://github.com/maelbel/croesus/compare/v0.2.0...v0.2.1) (2026-08-13)


### Bug Fixes

* **release:** use a PAT so releases can trigger the publish workflow ([5ffc1ae](https://github.com/maelbel/croesus/commit/5ffc1ae1a19005f4ad73f7ce499ad74aab6e9760))

## [0.2.0](https://github.com/maelbel/croesus/compare/v0.1.0...v0.2.0) (2026-08-13)


### Features

* add edit support across accounts, liabilities, envelopes, and valuations ([f474e28](https://github.com/maelbel/croesus/commit/f474e289d6bc25158f55d38b4cbf2c4d83412fff))
* **api:** support editing valuations ([29acda9](https://github.com/maelbel/croesus/commit/29acda9eab86a9b61d089ad569356882f0921c57))
* build the dashboard, settings, and base app shell ([12c8bec](https://github.com/maelbel/croesus/commit/12c8bec1d1e4dbbc226db063934dc98643666761))


### Bug Fixes

* **ci:** specify pnpm version via packageManager field ([d6a50c1](https://github.com/maelbel/croesus/commit/d6a50c1050ae038ecfbe98677cd3fa371b453c5d))
* **dashboard:** refresh net worth automatically after edits ([e3224c3](https://github.com/maelbel/croesus/commit/e3224c324248e24d31d8fd946f8ae223b78255a7))
* **release:** wrap config under packages for manifest mode ([c865b18](https://github.com/maelbel/croesus/commit/c865b1899fb99e24ebba719dd340125764f5eaa8))


### Documentation

* mark completed Phase 1 roadmap items ([158ede9](https://github.com/maelbel/croesus/commit/158ede90af8d2b2517b056a1302b6f1e88ba9b41))

## Changelog

All notable changes to this project are documented here. This file is
maintained automatically by [release-please](https://github.com/googleapis/release-please) —
see [docs/RELEASING.md](./docs/RELEASING.md). Don't edit it by hand.
