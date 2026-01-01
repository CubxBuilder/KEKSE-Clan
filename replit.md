# Replit.md

## Project Configuration

### Interactions Endpoint URL
For your Discord Application settings, use this URL:
`https://968c384e-f526-43fc-8b13-7ce1571ef8ed-00-3vgzr940f3do3.spock.replit.dev/interactions`

## Overview

This is a Discord bot application built with Express.js that handles Discord slash commands via HTTP interactions. The bot provides moderation functionality (ban, kick, timeout, warn) and admin utilities (send messages, embeds, clear). It uses Discord's interactions endpoint pattern rather than a traditional gateway connection, making it suitable for serverless or lightweight hosting environments.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Interaction-Based Architecture
The bot uses Discord's HTTP-based interactions instead of WebSocket gateway connections. This approach:
- Receives slash commands via POST requests to `/interactions` endpoint
- Verifies request signatures using Discord's public key
- Responds synchronously to interactions
- Reduces resource usage compared to persistent gateway connections

### Express Server Setup
- Single Express.js server handling HTTP requests
- Request signature verification middleware (`verifyKeyMiddleware`) applied before processing
- Raw body preservation for signature verification
- Runs on configurable PORT (default 5000)

### Local Command Simulation
- A CLI tool (`cli.js`) allows simulating Discord interactions locally.
- Uses `inquirer` for interactive command selection and option input.
- Bypasses signature verification via a custom `x-signature-ed25519: simulated` header.
- Useful for testing command logic without triggering actual Discord API calls for the interaction response.

## Data Storage
- Warnings stored in `warnings.json`.
- Counting game state stored in `counting.json`.
- Three-tier permission model:
  1. Bot owner (hardcoded user ID) - full access
  2. Mod role holders - moderation commands
  3. Server administrators - moderation commands
- Owner-only commands: send, embed, ping, clear
- Mod-accessible commands: ban, kick, timeout, untimeout, unban, warn, warns

### Data Storage
- Warnings stored in `warnings.json` file (simple JSON file-based persistence)
- No database currently configured
- File-based storage suitable for small-scale use

### Utility Functions
- `utils.js` provides Discord API request wrapper
- Global command installation helper
- Simple utility functions (random emoji, string capitalize)

## External Dependencies

### Discord Integration
- **Discord API v10**: Core API for bot interactions
- **discord.js**: Discord library for embeds and client utilities
- **discord-interactions**: Signature verification and interaction types
- **@discordjs/rest**: REST API client for command registration

### Environment Variables Required
- `BOT_TOKEN` / `DISCORD_TOKEN`: Bot authentication token
- `PUBLIC_KEY`: Discord application public key for signature verification
- `APP_ID`: Discord application ID
- `GUILD_ID`: Target server ID for command registration
- `PORT`: Server port (optional, defaults to 5000)

### Runtime Requirements
- Node.js >= 18.x
- Express.js for HTTP server
- dotenv for environment configuration