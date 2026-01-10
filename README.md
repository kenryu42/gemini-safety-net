# Gemini Safety Net

[![CI](https://github.com/kenryu42/claude-code-safety-net/actions/workflows/ci.yml/badge.svg)](https://github.com/kenryu42/claude-code-safety-net/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/kenryu42/claude-code-safety-net/branch/main/graph/badge.svg?token=C9QTION6ZF)](https://codecov.io/github/kenryu42/claude-code-safety-net)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Plugin-orange)](https://github.com/kenryu42/claude-code-safety-net)
[![OpenCode](https://img.shields.io/badge/OpenCode-Plugin-black)](https://github.com/kenryu42/claude-code-safety-net)
[![Gemini CLI](https://img.shields.io/badge/Gemini-CLI-lightblue)](https://github.com/kenryu42/gemini-safety-net)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<div align="center">

[![Gemini Safety Net](./.github/assets/gemini-safety-net.png)](https://github.com/kenryu42/gemini-safety-net)

</div>

A Gemini extension that acts as a safety net, catching destructive git and filesystem commands before they execute.

## Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
  - [Gemini CLI Installation](#gemini-cli-installation)
  - [Claude Code Installation](#claude-code-installation)
  - [OpenCode Installation](#opencode-installation)
- [Commands Blocked](#commands-blocked)
- [Commands Allowed](#commands-allowed)
- [What Happens When Blocked](#what-happens-when-blocked)
- [Testing the Hook](#testing-the-hook)
- [Development](#development)
- [Custom Rules (Experimental)](#custom-rules-experimental)
  - [Config File Location](#config-file-location)
  - [Rule Schema](#rule-schema)
  - [Matching Behavior](#matching-behavior)
  - [Examples](#examples)
  - [Error Handling](#error-handling)
- [Advanced Features](#advanced-features)
  - [Strict Mode](#strict-mode)
  - [Paranoid Mode](#paranoid-mode)
  - [Shell Wrapper Detection](#shell-wrapper-detection)
  - [Interpreter One-Liner Detection](#interpreter-one-liner-detection)
  - [Secret Redaction](#secret-redaction)
  - [Audit Logging](#audit-logging)
- [License](#license)

## Prerequisites

- **Node.js**: Version 18 or higher is required to run this plugin

## Quick Start

### Gemini CLI Installation

```bash
gemini extensions install https://github.com/kenryu42/gemini-safety-net
```

> [!IMPORTANT]
> You need to set the following settings in `.gemini/settings.json` to enable hooks:
> ```json
> {
>   "tools": {
>     "enableHooks": true
>   }
> }
> ```

---

### Claude Code Installation

```bash
/plugin marketplace add kenryu42/cc-marketplace
/plugin install safety-net@cc-marketplace
```

> [!NOTE]
> After installing the plugin, you need to restart your Claude Code for it to take effect.

### Claude Code Auto-Update

1. Run `/plugin` → Select `Marketplaces` → Choose `cc-marketplace` → Enable auto-update

---

### OpenCode Installation

**Option A: Let an LLM do it**

Paste this into any LLM agent (Claude Code, OpenCode, Cursor, etc.):

```
Install the cc-safety-net plugin in `~/.config/opencode/opencode.json` (or `.jsonc`) according to the schema at: https://opencode.ai/config.json

Then copy the following files to `~/.config/opencode/command/`:
- https://raw.githubusercontent.com/kenryu42/claude-code-safety-net/main/.opencode/command/set-custom-rules.md
- https://raw.githubusercontent.com/kenryu42/claude-code-safety-net/main/.opencode/command/verify-custom-rules.md
```

**Option B: Manual setup**

1. **Add the plugin to your config** `~/.config/opencode/opencode.json` (or `.jsonc`):

  ```json
  {
    "plugin": ["cc-safety-net"]
  }
  ```

2. **Copy the [commands](.opencode/command) to `~/.config/opencode/command/`**

---

## Commands Blocked

| Command Pattern | Why It's Dangerous |
|-----------------|-------------------|
| git checkout -- files | Discards uncommitted changes permanently |
| git checkout \<ref\> -- \<path\> | Overwrites working tree with ref version |
| git restore files | Discards uncommitted changes |
| git restore --worktree | Explicitly discards working tree changes |
| git reset --hard | Destroys all uncommitted changes |
| git reset --merge | Can lose uncommitted changes |
| git clean -f | Removes untracked files permanently |
| git push --force / -f | Destroys remote history |
| git branch -D | Force-deletes branch without merge check |
| git stash drop | Permanently deletes stashed changes |
| git stash clear | Deletes ALL stashed changes |
| git worktree remove --force | Force-deletes worktree without checking for changes |
| rm -rf (paths outside cwd) | Recursive file deletion outside the current directory |
| rm -rf / or ~ or $HOME | Root/home deletion is extremely dangerous |
| find ... -delete | Permanently removes files matching criteria |
| xargs rm -rf | Dynamic input makes targets unpredictable |
| xargs \<shell\> -c | Can execute arbitrary commands |
| parallel rm -rf | Dynamic input makes targets unpredictable |
| parallel \<shell\> -c | Can execute arbitrary commands |

## Commands Allowed

| Command Pattern | Why It's Safe |
|-----------------|--------------|
| git checkout -b branch | Creates new branch |
| git checkout --orphan | Creates orphan branch |
| git restore --staged | Only unstages, doesn't discard |
| git restore --help/--version | Help/version output |
| git branch -d | Safe delete with merge check |
| git clean -n / --dry-run | Preview only |
| git push --force-with-lease | Safe force push |
| rm -rf /tmp/... | Temp directories are ephemeral |
| rm -rf /var/tmp/... | System temp directory |
| rm -rf $TMPDIR/... | User's temp directory |
| rm -rf ./... (within cwd) | Limited to current working directory |

## What Happens When Blocked

When a destructive command is detected, the plugin blocks the tool execution and provides a reason.

Example output:
```text
BLOCKED by Safety Net

Reason: git checkout -- discards uncommitted changes permanently. Use 'git stash' first.

Command: git checkout -- src/main.py

If this operation is truly needed, ask the user for explicit permission and have them run the command manually.
```

## Testing the Hook

You can manually test the hook by attempting to run blocked commands in Claude Code:

```bash
# This should be blocked
git checkout -- README.md

# This should be allowed
git checkout -b test-branch
```

## Development

See [CONTRIBUTING.md](https://github.com/kenryu42/claude-code-safety-net/blob/main/CONTRIBUTING.md) for details on how to contribute to this project.

## Custom Rules (Experimental)

Beyond the built-in protections, you can define your own blocking rules to enforce team conventions or project-specific safety policies.

> [!TIP]
> Use `/set-custom-rules` to create custom rules interactively with natural language.

### Quick Example

Create `.safety-net.json` in your project root:

```json
{
  "version": 1,
  "rules": [
    {
      "name": "block-git-add-all",
      "command": "git",
      "subcommand": "add",
      "block_args": ["-A", "--all", "."],
      "reason": "Use 'git add <specific-files>' instead of blanket add."
    }
  ]
}
```

Now `git add -A`, `git add --all`, and `git add .` will be blocked with your custom message.

### Config File Location

Config files are loaded from two scopes and merged:

1. **User scope**: `~/.cc-safety-net/config.json` (always loaded if exists)
2. **Project scope**: `.safety-net.json` in the current working directory (loaded if exists)

**Merging behavior**:
- Rules from both scopes are combined
- If the same rule name exists in both scopes, **project scope wins**
- Rule name comparison is case-insensitive (`MyRule` and `myrule` are considered duplicates)

This allows you to define personal defaults in user scope while letting projects override specific rules.

If no config file is found in either location, only built-in rules apply.

### Config Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | integer | Yes | Schema version (must be `1`) |
| `rules` | array | No | List of custom blocking rules (defaults to empty) |

### Rule Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Unique identifier (letters, numbers, hyphens, underscores; max 64 chars) |
| `command` | string | Yes | Base command to match (e.g., `git`, `npm`, `docker`) |
| `subcommand` | string | No | Subcommand to match (e.g., `add`, `install`). If omitted, matches any. |
| `block_args` | array | Yes | Arguments that trigger the block (at least one required) |
| `reason` | string | Yes | Message shown when blocked (max 256 chars) |

### Matching Behavior

- **Commands** are normalized to basename (`/usr/bin/git` → `git`)
- **Subcommand** is the first non-option argument after the command
- **Arguments** are matched literally (no regex, no glob), with short option expansion
- A command is blocked if **any** argument in `block_args` is present
- **Short options** are expanded: `-Ap` matches `-A` (bundled flags are unbundled)
- **Long options** use exact match: `--all-files` does NOT match `--all`
- Custom rules only add restrictions—they cannot bypass built-in protections

#### Known Limitations

- **Short option expansion**: `-Cfoo` is treated as `-C -f -o -o`, not `-C foo`. Blocking `-f` may false-positive on attached option values.

### Examples

#### Block global npm installs

```json
{
  "version": 1,
  "rules": [
    {
      "name": "block-npm-global",
      "command": "npm",
      "subcommand": "install",
      "block_args": ["-g", "--global"],
      "reason": "Global npm installs can cause version conflicts. Use npx or local install."
    }
  ]
}
```

#### Block dangerous docker commands

```json
{
  "version": 1,
  "rules": [
    {
      "name": "block-docker-system-prune",
      "command": "docker",
      "subcommand": "system",
      "block_args": ["prune"],
      "reason": "docker system prune removes all unused data. Use targeted cleanup instead."
    }
  ]
}
```

#### Multiple rules

```json
{
  "version": 1,
  "rules": [
    {
      "name": "block-git-add-all",
      "command": "git",
      "subcommand": "add",
      "block_args": ["-A", "--all", ".", "-u", "--update"],
      "reason": "Use 'git add <specific-files>' instead of blanket add."
    },
    {
      "name": "block-npm-global",
      "command": "npm",
      "subcommand": "install",
      "block_args": ["-g", "--global"],
      "reason": "Use npx or local install instead of global."
    }
  ]
}
```

### Error Handling

Custom rules use **silent fallback** error handling. If your config file is invalid, the safety net silently falls back to built-in rules only:

| Scenario | Behavior |
|----------|----------|
| Config file not found | Silent — use built-in rules only |
| Empty config file | Silent — use built-in rules only |
| Invalid JSON syntax | Silent — use built-in rules only |
| Missing required field | Silent — use built-in rules only |
| Invalid field format | Silent — use built-in rules only |
| Duplicate rule name | Silent — use built-in rules only |


> [!IMPORTANT]  
> If you add or modify custom rules manually, always validate them with the `/verify-custom-rules` slash command.

### Block Output Format

When a custom rule blocks a command, the output includes the rule name:

```text
BLOCKED by Safety Net

Reason: [block-git-add-all] Use 'git add <specific-files>' instead of blanket add.

Command: git add -A
```

## Advanced Features

### Strict Mode

By default, unparseable commands are allowed through. Enable strict mode to fail-closed
when the hook input or shell command cannot be safely analyzed (e.g., invalid JSON,
unterminated quotes, malformed `bash -c` wrappers):

```bash
export SAFETY_NET_STRICT=1
```

### Paranoid Mode

Paranoid mode enables stricter safety checks that may be disruptive to normal workflows.
You can enable it globally or via focused toggles:

```bash
# Enable all paranoid checks
export SAFETY_NET_PARANOID=1

# Or enable specific paranoid checks
export SAFETY_NET_PARANOID_RM=1
export SAFETY_NET_PARANOID_INTERPRETERS=1
```

Paranoid behavior:

- **rm**: blocks non-temp `rm -rf` even within the current working directory.
- **interpreters**: blocks interpreter one-liners like `python -c`, `node -e`, `ruby -e`,
  and `perl -e` (these can hide destructive commands).

### Shell Wrapper Detection

The guard recursively analyzes commands wrapped in shells:

```bash
bash -c 'git reset --hard'    # Blocked
sh -lc 'rm -rf /'             # Blocked
```

### Interpreter One-Liner Detection

Detects destructive commands hidden in Python/Node/Ruby/Perl one-liners:

```bash
python -c 'import os; os.system("rm -rf /")'  # Blocked
```

### Secret Redaction

Block messages automatically redact sensitive data (tokens, passwords, API keys) to prevent leaking secrets in logs.

### Audit Logging

All blocked commands are logged to `~/.cc-safety-net/logs/<session_id>.jsonl` for audit purposes:

```json
{"ts": "2025-01-15T10:30:00Z", "command": "git reset --hard", "segment": "git reset --hard", "reason": "...", "cwd": "/path/to/project"}
```

Sensitive data in log entries is automatically redacted.

## License

MIT
