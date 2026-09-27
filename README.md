# local/chat

A private web chat for a locally running Ollama model. The browser talks to the local Express server, and the server forwards prompts to Ollama at `http://localhost:11434`.

## Requirements

- Node.js 18+
- Ollama running locally
- The configured model available in Ollama

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. The default model is:

```text
hf.co/HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive:Q4_K_M
```

You can override `OLLAMA_URL`, `OLLAMA_MODEL`, or `PORT` with environment variables. The server uses the non-streaming Ollama generate endpoint and sends the last few messages as context for each prompt.

The sidebar model selector automatically lists every model installed in Ollama. Changing the selection applies it to the next message without restarting the app.

To verify Ollama independently:

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "hf.co/HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive:Q4_K_M",
  "prompt": "Explique o que é gravidade em uma frase.",
  "stream": false
}'
```

For a production build, run `npm run build`, then start the server with `NODE_ENV=production npm start`.
