# XTRN Server GCal

A TypeScript server application for Google Calendar integration.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Start the server:
```bash
npm start
```

### Development

For development with hot reload:
```bash
npm run dev
```

For watching TypeScript compilation:
```bash
npm run watch
```

## Project Structure

```
src/
├── index.ts          # Main application entry point
└── ...               # Additional source files

dist/                 # Compiled JavaScript output
package.json          # Project dependencies and scripts
tsconfig.json         # TypeScript configuration
README.md             # This file
```

## Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled application
- `npm run dev` - Run with ts-node for development
- `npm run watch` - Watch for changes and recompile
- `npm run clean` - Remove build artifacts

## API Endpoints

- `GET /` - Welcome message and server info
- `GET /health` - Health check endpoint

## License

MIT