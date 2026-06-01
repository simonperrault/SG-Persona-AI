# Singapore AI Chat

A chat application with AI personas that can discuss Singapore-related topics.

## Prerequisites

### 1. Install Node.js

Make sure you have Node.js installed. You can download it from:
- https://nodejs.org/

Verify installation:
```bash
node --version
npm --version
```

### 2. Install Ollama (for local LLM)

**Download Ollama:**
- Visit: https://ollama.com/download
- Download and install the appropriate version for macOS
- Or use Homebrew: `brew install ollama`

**Run Ollama:**
```bash
ollama serve
```

**Pull the required model:**
```bash
ollama pull qwen3.5:9b
```

This model is required for local inference. The model will be downloaded automatically when you first use the local mode.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
# For local mode (Ollama)
MODE=local

# For OpenAI mode
# MODE=openai
# OPENAI_API_KEY=your-api-key-here
```

## Running the Project

### Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

### Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## Changing the Mode

The application supports two modes:

### Local Mode (Ollama)

Set in `.env`:
```env
MODE=local
```

- Uses Ollama running locally on `http://localhost:11434`
- Model: `qwen3.5:9b`
- No API key required
- Runs entirely offline

### OpenAI Mode

Set in `.env`:
```env
MODE=openai
OPENAI_API_KEY=sk-your-api-key-here
```

- Uses OpenAI's API
- Model: `gpt-4o-mini`
- Requires valid OpenAI API key
- Runs online (requires internet)

## Available Personas

The application includes several AI personas:

- **grab-uncle** - John Tan, a 64-year-old Grab driver in Singapore
- **singapore-born-lady** - Lim Kwai Lan, a 45-year-old Singaporean who studied in the US
- **french-dude** - Pierre Marchand, a 32-year-old French person living in Singapore

## Project Structure

```
SG-Persona-AI/
├── package.json          # Node.js dependencies and scripts
├── persona.json          # Persona definitions and prompts
├── server.js            # Express server with chat logic
├── .env                 # Environment configuration (create this)
├── public/
│   ├── index.html       # Main HTML page
│   ├── script.js        # Frontend JavaScript
│   └── style.css        # Styles
└── README.md            # This file
```

## License

MIT
