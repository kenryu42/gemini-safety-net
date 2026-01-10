# Gemini Safety Net

> [!WARNING]
> **Work in Progress**

## Overview

Blocks destructive git and filesystem commands before they execute.

## Installation

```bash
gemini extensions install https://github.com/kenryu42/gemini-safety-net
```

> [!IMPORTANT]
> After installing the plugin, you need to restart your Gemini CLI for it to take effect.
> ```json
> {
>   "tools": {
>     "enableHooks": true
>   }
> }
> ```

## Requirements

- Node.js >= 18.0.0
- Gemini CLI

## Commands

| Command | Description |
|---------|-------------|
| `/set-custom-rules` | Configure custom blocking rules |
| `/verify-custom-rules` | Validate your custom rules config |

## License

[MIT](LICENSE)
