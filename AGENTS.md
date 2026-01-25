# AGENTS.md

## Development Commands
- `npm run dev` - Start development server with hot reload using tsx
- `npm run build` - Compile TypeScript to JavaScript and copy assets
- `npm start` - Run compiled bot from dist/
- `npm run start:with-register` - Register commands and start bot

## Code Style Guidelines

### Imports & Structure
- Use ES modules (`import`/`export`) - project uses `"type": "module"`
- Import order: node.js built-ins → external packages → local imports
- Use `.js` extensions for all imports (TypeScript requires this in ESM mode)
- Group related imports together with newlines between groups

### Types & TypeScript
- Strict TypeScript enabled (`"strict": true`)
- Use type assertion (`as`) when needed for Discord.js interactions
- Define command interfaces in `src/types/command.ts`
- Use default exports for command modules

### Discord.js Patterns
- Commands follow `Command` interface with `data` and `execute` properties
- Use `ChatInputCommandInteraction` for slash commands
- Handle both ephemeral replies and follow-ups appropriately
- Implement proper error handling with try-catch blocks
- Use logger from `src/logger.ts` for consistent logging

### Code Organization
- Commands organized by category in `src/commands/`
- Events in `src/events/`
- Types in `src/types/`
- Assets in `src/assets/`
- Use Spanish comments and error messages (consistent with codebase)