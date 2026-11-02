---
title: 'Pi is the AI harness I live in, and 1.4.0 is the polish I wanted'
description: 'I use Pi every day inside a Docker container. Version 1.4.0 adds no new features: it fixes the daily annoyances, which is exactly the release I needed.'
pubDate: 2026-11-01T12:00:00.000Z
lang: en
cover: './cover.webp'
coverAlt: 'Pi is the AI harness I live in, and 1.4.0 is the polish I wanted'
categories: ['ai']
tags: ['pi', 'ai', 'tooling', 'development']
translationKey: 'pi-harness-ia'
draft: false
math: false
author: 'Jose Maldonado "Yukiteru Amano"'
---

Some tools I try for an afternoon and uninstall without regret. Pi is not one of them. I have been opening it every morning for months inside a Docker container, with one project mounted and the rest of my disk invisible to it, and somewhere along the way it stopped being an experiment and became how I work. On 21 October 2026 it shipped version 1.4.0, eleven days before I write this, and its [changelog](https://pi.dev/changelog/releases/1.4.0) tells an unusual story for a release: almost everything in it is a fix.

What kept me was not a feature list I could tick off in a spreadsheet. It is the shape of the harness, the layer that puts tools, context and permissions around the model. In Pi that means extensions and MCP servers to connect what is missing, codemode to batch tool calls inside a script, compaction that keeps a long session alive and a terminal interface that behaves like a terminal. When that layer is badly designed, the best model in the world is unpleasant to use.

Version 1.4.0 does not change the product. It fixes the terminal that stayed dirty on exit, the compaction that failed on long reasoning and the parallel scripts that gave up when no slot was free. None of that looks good on a slide deck, and all of it shows up every day. I am writing this as a personal opinion, with what I like, with what still costs me and without dressing the release up as something it is not.

## How I use it every day

Pi lives in a container, not on my system. I run it with [pi-dockerized](/en/projects/pi-dockerized), a fork of opencode-dockerized I moved over to Pi ([code on GitHub](https://github.com/yukiteruamano/pi-dockerized)), and I already wrote about the isolation model in [Docker and AI agents](/en/blog/docker-ai-agents-sandboxed/). The container runs as my UID and GID, with no `sudo` and no capabilities, and the agent only sees the project directory I mount.

One design detail explains why I picked it for this. Pi ships no native permission system, so enforcement lives in a security extension baked into the image and mounted read-only. Extensions are Pi Packages installed with `pi install` that stay on the host, also read-only: a session cannot add capabilities to itself, and rebuilding the image does not download them again.

The day-to-day is the one I described for other agents: build, authenticate, start, work. The difference is inside. `pi-dockerized audit` lists the calls the guard blocked, `doctor` checks the guard, the credentials and SSH and GPG forwarding, and every session prints one line with what it can reach. When something breaks, I look there before assuming anything.

```sh
curl -fsSL https://raw.githubusercontent.com/yukiteruamano/pi-dockerized/master/install.sh | bash
pi-dockerized build
pi-dockerized auth
pi-dockerized run ~/projects/my-app
pi-dockerized audit
```

## What 1.4.0 actually fixes

The five fixes I noticed most fit in a table, and none of them is a feature you could show in a demo. They are the things that cost me a minute several times a week.

| Daily annoyance                    | What 1.4.0 changed                           |
| ---------------------------------- | -------------------------------------------- |
| Two codemode scripts at once       | They wait up to 60 s for a free worker       |
| Compaction on long sessions        | Summaries use the model's output limit       |
| A dirty terminal after a hard exit | Pi restores mouse, focus and screen          |
| A `grep` that stopped being regex  | It now runs `rg --no-config`                 |
| Two extension dialogs at once      | The second no longer loses the first promise |

Compaction is the part that decides whether a long session stays alive or breaks, and until this release summaries had a fixed output cap. When the model spent most of it reasoning, compaction died with the "generation hit the token cap" message and the turn was left half done. That error arrives at the worst possible moment, near the end of a turn you have already paid for. Summaries now use the model's output limit, and `compaction.reserveTokens` keeps one job: deciding when compaction starts.

Codemode is the part I use for batch work, because one script can chain several tool calls without asking me for permission twenty times. Its limit was two workers and it failed as soon as both were busy, which happened with parallel scripts or with subagents inside the same process. Two workers is a low ceiling when one script does the work of ten tool calls. Since 1.4.0 those scripts wait up to 60 seconds for a free worker, and `PI_CODEMODE_MAX_WORKERS` raises the ceiling of two.

The rest of the list is quieter, and that is exactly why it matters. These are failures that never show up in a screenshot but eat your whole afternoon and force a restart.

1.4.0 adds support for Rex: OSC 8 hyperlinks, truecolor and inline images. The teardown fix deserves its own mention because you only notice it when it is missing. If Pi exited without its normal cleanup sequence, the terminal stayed in mouse-tracking mode with focus reporting and Kitty keyboard still on, and the prompt filled with escape sequences you had to clear by hand.

The concurrent dialogs case did hit me daily. Opening a second extension dialog replaced the first and its promise never settled, so the flow hung in silence and the only way back was restarting the session.

Other fixes are small and very specific. A resumed session or a `/tree` navigation could leave extension tools inactive. A tool call truncated at the output limit broke every later request in that session. `/compact` with instructions ignored them when compaction split a turn. An `mcp.json` or a `managed-install.json` file starting with a UTF-8 BOM failed to parse, and the BOM does turn up because Windows PowerShell 5.1 writes one when it rewrites the file.

Three more details that looked minor and hit me close. The `grep` tool followed `RIPGREP_CONFIG_PATH`, so a `--fixed-strings` in the ripgrep config silently turned a regex search into a literal one. HTML export showed literal asterisks for bold and italics next to CJK punctuation. An unclosed `$$` display-math block swallowed every Markdown table after it.

## What still costs me

Configuration surface is still the awkward part. `models.json` is better documented from this release on, with a reference generated from its own schema covering every provider, model, override and compat field, but that reference existing also says something: there is a lot to learn before the harness feels like yours. I built mine by copying what worked and reading errors.

Extensions are the other bill. 1.4.0 fixes import paths that broke extensions and at the same time changes who sees provider attribution headers: `before_provider_headers` handlers no longer receive the OpenRouter, NVIDIA NIM and OpenCode ones. Reasonable changes that still force you to reread your own extension now and then.

Then there are the default models, which change without me doing anything. GitHub Copilot's default became `gpt-6.1-sol` because Copilot retired `gpt-5.4`, NVIDIA's became `nvidia/nemotron-3.5-super-vl-120b-a12b` and Xiaomi's became `mimo-v2.6-pro`. None of those is bad, but if you had a preference fixed in your head, that preference is not what starts when you run it.

## Why polish beats a new feature

My argument is that a harness is judged by friction, not by catalogue. I have switched tools twice in the last few years, not because they lacked a feature but because they wasted my time on silly things. 1.4.0 boasts nothing new: it fixes the terminal, compaction, the codemode queue and a few parsers. None of those lines can be presented as a novelty, and all of them show up in the first long session.

That choice has a cost and I will say it plainly. A polish release attracts nobody new and makes no headlines. In exchange, the tool I already use loses that class of surprises, which is all I ask from it at this point.

## The harness I am staying in

I am still opening Pi every morning, and I still do not miss it when I work on something else. What convinces me is not a specific version but the sense that the harness is looked after: extensions you can add and remove, codemode that survives a batch of calls, compaction that holds and a terminal that comes back clean. 1.4.0 did not change how I work; it made that way of working less fragile.

If you already use Pi, this release will spare you the annoyances I had been living with. If you do not, it will not win you over on its own. What I will defend is that in a harness you open every day, polish is the feature you use most.

Update, check your extensions and keep coding inside the box.
