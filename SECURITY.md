# Security

Croesus stores financial data (net worth, account balances, holdings) and is
built around self-hosted privacy, so a real vulnerability in it matters more
than in most side projects. If you find one, please don't open a public
GitHub issue — that gives every self-hoster's data a head start on being
exposed before there's a fix.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting for this repository:

**[Report a vulnerability](https://github.com/maelbel/croesus/security/advisories/new)**

(Also reachable from the repo's **Security** tab → **Report a vulnerability**.)
This opens a private advisory visible only to you and the maintainer — no
public issue, no separate email account to check.

Please include:

- what the vulnerability is and its likely impact (e.g. auth bypass, data
  exposure, injection);
- steps to reproduce, or a proof of concept;
- which part of the stack it's in (backend API, frontend, Tauri/desktop
  sidecar, Docker/deployment config) if known.

## What to expect

This is a small, young, largely-solo project — there's no formal SLA or
bug-bounty program. In practice: expect an initial response within a few
days, and a fix or mitigation prioritized ahead of other work once a report
is confirmed. You'll be credited in the advisory and release notes if you'd
like to be (say so in your report either way).

## Scope

In scope: the Croesus backend (FastAPI), frontend (Vue SPA), desktop app
(Tauri), and the Docker/Compose deployment config in this repository.

Out of scope: vulnerabilities in third-party services Croesus talks to
(Yahoo Finance, CoinGecko, Frankfurter, an OIDC provider you've configured)
— report those to the service in question instead. Report a vulnerability in
how Croesus *uses* one of them (e.g. mishandling their response, leaking
credentials to them) here.

## Supported versions

Croesus doesn't yet maintain multiple release branches — only the latest
released version is supported. Please make sure you can reproduce an issue
on the latest release (or `main`) before reporting.
