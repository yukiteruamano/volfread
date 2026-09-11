---
title: 'slackware-pkgcheck, file integrity checks for Slackware Linux'
description: 'I built slackware-pkgcheck to audit Slackware Linux, it walks installed packages, finds missing files and broken libraries. How it works inside.'
pubDate: 2026-09-11T20:38:56.013Z
lang: en
categories: ['software']
tags: ['personal', 'development']
cover: './cover.webp'
coverAlt: ''
translationKey: 'slackware-pkgcheck-integridad'
draft: false
math: false
author: 'Jose Maldonado "Yukiteru Amano"'
---

A few weeks ago I published the first stable release of [slackware-pkgcheck](https://github.com/yukiteruamano/slackware-pkgcheck), a tool that verifies every file registered by your Slackware packages actually exists on disk. The current release ships with 320 automated tests and 98% code coverage, and it is also available on [PyPI](https://pypi.org/project/slackware-pkgcheck/).

## Why does Slackware need an integrity checker?

Slackware is the oldest living Linux distribution and the most honest about what it is. It does not resolve dependencies for you, it hides nothing behind abstraction layers, and it trusts you to know what you are doing. That philosophy has a price. When something breaks silently, a file deleted by mistake, a half-finished removal, an upgrade that stepped on a directory, the system never tells you. You find out when the program crashes.

Other distributions have partial answers. RPM systems verify with `rpm -V`, Debian compares with `debsums`, and Gentoo rebuilds broken dependencies with `revdep-rebuild`. Slackware, meanwhile, keeps a complete record of every installed package under `/var/log/packages/`, including a `FILE LIST` section with each file, and nobody was using it systematically. That record was an inventory without an audit. Which means that having the list of what should exist, and never checking it, is the same as not having it at all.

The inventory, finally under watch.

I built this tool for a practical reason. I run Slackware systems and I wanted a simple question answered reliably. Is everything I installed still intact? I wanted the answer in seconds, package by package, with no false positives eating entire afternoons.

## Where does each package record its files?

Every installed package leaves a text file in `/var/log/packages/`. Inside there is a `FILE LIST` section with the paths of everything the package placed on the system. The first technical problem was reading that at scale. A full Slackware install accumulates thousands of packages and hundreds of thousands of paths. Opening each record from Python, one by one, works but feels slow.

The fix was handing bulk extraction to `ripgrep`. A single process walks the whole directory and emits, in one pass, every path under every `FILE LIST`, tagged with its package. When `rg` is missing, the tool falls back to a pure-Python reader that is slower but works. That choice sums up a philosophy I kept through the whole project. Fast by default, functional always.

The reader does not swallow without chewing. Real records have quirks. Names with non-ASCII bytes arrive escaped in octal (`\NNN`), some third-party packages append sections like `REQUIRES` after the list, and there are entries that never exist on disk even when everything is fine. Scripts under `install/` are package metadata, not installed files. Device nodes in `dev/` and paths in `sys/` or `proc/` are ephemeral by nature. All of that gets filtered before anything is verified, and counted separately so the report stays transparent about what was excluded and why.

## How does it check thousands of files without taking forever?

Verification runs on a thread pool firing `lstat` calls in parallel. The `lstat` detail instead of plain `stat` is deliberate. It does not follow the final link, so a broken symbolic link counts as present. And rightly so. The link itself exists physically on disk. A missing target is a dependency problem, not a file integrity problem, and the tool handles it in a different phase.

Each path gets one of six states. Present, missing, backup-only, no access, pending review, or verification error. The point is that missing does not always mean the same thing, and the report tells those cases apart instead of dumping a flat list of absences.

Slackware has its own convention for config files that defeats naive checks. A package records `foo.conf.new` and its install script renames it to `foo.conf`, unless that file already exists, in which case it keeps the `.new` suffix so the admin reviews the pending change. The tool honors that semantic to the letter. When the `.new` file sits on disk, it reports pending review. When only the renamed version exists, all is well. When neither leaves a trace, then it is genuinely missing. Similarly, when the recorded path is gone but a `.bak` or `.orig` variant exists, it reports backup-only instead of lost. Small distinctions that prevent big scares.

| State          | Meaning                            | What to do            |
| -------------- | ---------------------------------- | --------------------- |
| Present        | The file is on disk                | Nothing               |
| Missing        | No trace of the recorded path      | Reinstall the package |
| Backup-only    | A `.bak` or `.orig` variant exists | Review the copy       |
| `.new` pending | New config awaiting review         | Compare and decide    |
| No access      | Requires root privileges           | Re-run with `sudo`    |
| Error          | The check itself failed            | Investigate the case  |

## How does it detect broken libraries?

Integrity checking answers whether files are there. The second question, just as uncomfortable, is whether binaries actually run. A present executable with a missing dynamic library fails at startup, and no `lstat` catches that. So I added an opt-in mode inspired by Gentoo's `revdep-rebuild`. With `--check-libs-deps`, the tool runs `ldd` over every ELF binary and library on the system, in parallel, and records each dependency flagged `not found`.

Here I made a conscious security call. `ldd` executes the dynamic loader against its target, so it should only run on trusted installations. That is why the mode is opt-in, the environment gets sanitized (locale pinned, `LD_LIBRARY_PATH`, `LD_PRELOAD` and friends cleared so nothing hijacks loading), and the manual warns about it plainly. One step further, `--check-libs-symbols` uses `nm -D` to hunt undefined symbols no installed library provides, with the honest warning that it produces false positives from lazy binding and dynamic loading. I prefer a tool that states its limits over one that pretends certainty. Convenience never beats security.

The report groups broken binaries by package and takes a best-effort guess at which package should provide each missing library by matching sonames. That attribution is approximate by design. When the name matches nothing installed, it says so instead of inventing a culprit.

## How do you use it in practice?

Installation uses `uv`, and a normal run wants root, because protected files can only be checked as root. Without privileges, the tool warns you and verifies only what is accessible instead of failing.

```sh
uv sync
sudo uv run pkgcheck
sudo uv run pkgcheck --json
sudo uv run pkgcheck --check-libs-deps
uv run pkgcheck --orphans --orphans-root /
uv run pkgcheck --diff --from latest --to /var/log/pkgcheck/pkgcheck-....json --json
```

Each run saves an automatic log under `/var/log/pkgcheck/`, as text or JSON, written atomically with explicit `0644` permissions. The `--orphans` mode flips the question. Instead of hunting registered files that are gone, it walks the disk looking for files no package claims, like leftovers from a manual `make install`. Pseudo-filesystems and ephemeral paths stay out of that walk, or the noise would bury every real finding. And `--diff` compares two runs to show what changed between them, which proves handy after a large upgrade. I use it exactly that way myself. One run before touching the package set, one after, and the delta tells the story.

Version 1.0.0 landed in late August 2026 with the `ldd` dependency engine, and the current 1.0.2 from September 2026 consolidated quality with 320 tests. The first audit takes minutes.

The interface speaks seven languages and detects the system one automatically. It sounds cosmetic, but an admin tool that only speaks English leaves out plenty of people running servers.

## Which design decisions hold the tool together?

Behind each check there are choices you never see in the report but which decide whether you can trust it. The first is defensive input validation. Every path, suffix, and prefix the tool accepts goes through dedicated validators before touching the filesystem or a subprocess. Even the types are deliberate. Validators take `object` instead of `str` so the type checks stay meaningful to static analyzers too. It sounds like a technicality, but it marks the difference between actual defense and its appearance.

The second is privilege handling. Some paths can only be checked as root. When you run without them in an interactive terminal, it asks whether to re-run with `sudo`. With `--elevate` it does so without asking, and with `--no-elevate` it sticks to what is accessible and warns. No cryptic failures, no demanding root for operations that never needed it.

No needless friction.

The third is log writing. Every report lands atomically through a temporary file plus rename, with explicit `0644` permissions. When two runs collide within the same second, a unique suffix lands instead of an overwrite. Boring details until the day they save an audit. The JSON report itself keeps stable, never localized keys, so scripts and later diffs can rely on the format across releases and languages.

Technically, the project keeps a discipline rare in small utilities. Strict lint rules, strict static typing, 320 tests at 98% coverage, dependency auditing, and pre-commit hooks. That is not vanity. When a tool asks for `sudo` and walks your filesystem, code quality belongs in its trust contract.

## Which limits should you know about?

Honesty requires stating what it does not do. It checks existence, not contents. A corrupted file with the right name passes. It is no intrusion detection system. It verifies no signatures and compares no hashes against a trusted origin. Its job answers one question. Does the disk match the inventory?

The undefined-symbols mode, as noted, yields false positives. Orphan scanning skips whole trees like `home/` to avoid drowning in noise. And a full-system `ldd` pass costs real time, which is why it stays optional. Each limit ships documented in the project itself. A tool honest about its borders serves better than an ambitious one silent about its own.

The JSON output deserves a note of its own. Its keys stay stable and never get localized, so you can schedule nightly cron audits and compare weeks apart without breaking anything. Quiet-friendly exit paths mean automation never has to parse human prose by accident.

## What Slackware taught me about trust

Slackware trusts its admin and asks for attention in return. This tool grew from that same logic, built over several August and September weeks of focused evening work. It never tries to replace the judgment of whoever runs the system. It gives eyes where there used to be only faith. An audited inventory, a report that keeps nuances apart, and limits stated without shame.

If you run Slackware, try it. The code is open, setup takes minutes, and the first report usually brings a surprise or two. Mine certainly did. After all, that is what audits exist for. Finding what you took for granted.

It audits, it reports, and then it gets out of the way.
