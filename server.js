import express from 'express'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const app = express()
const port = Number(process.env.PORT || 3001)
const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434'
const model = process.env.OLLAMA_MODEL || 'hf.co/HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive:Q4_K_M'
const root = path.dirname(fileURLToPath(import.meta.url))

function finalAnswer(text) {
  const channelFinal = text.match(/(?:<\|channel\|>|<channel>)final(?:<\|message\|>|<message>)?\s*([\s\S]*)/i)
  if (channelFinal) return channelFinal[1].trim()

  const thoughtEnd = text.search(/(?:<\|channel\|>|<channel>)thought(?:<\|message\|>|<message>)/i)
  if (thoughtEnd !== -1) {
    const withoutThought = text.slice(thoughtEnd).replace(/[\s\S]*?(?:<\|channel\|>|<channel>)final(?:<\|message\|>|<message>)?/i, '')
    if (withoutThought.trim()) return withoutThought.trim()
  }

  return text.replace(/<\|(?:channel|message)\|>|<\/?(?:channel|message)>/gi, '').trim()
}

app.use(express.json({ limit: '1mb' }))

app.get('/api/health', async (_request, response) => {
  try {
    const ollamaResponse = await fetch(`${ollamaUrl}/api/tags`)
    response.status(ollamaResponse.ok ? 200 : 503).json({ connected: ollamaResponse.ok, model })
  } catch {
    response.status(503).json({ connected: false, model })
  }
})

app.get('/api/models', async (_request, response) => {
  try {
    const ollamaResponse = await fetch(`${ollamaUrl}/api/tags`)
    const data = await ollamaResponse.json()
    if (!ollamaResponse.ok) {
      return response.status(ollamaResponse.status).json({ error: data.error || 'Could not load Ollama models.' })
    }

    return response.json({
      models: (data.models || []).map((installedModel) => ({
        name: installedModel.name,
        size: installedModel.details?.parameter_size || '',
        family: installedModel.details?.family || '',
      })),
      defaultModel: model,
    })
  } catch {
    return response.status(503).json({ error: `Could not reach Ollama at ${ollamaUrl}.` })
  }
})

app.post('/api/chat', async (request, response) => {
  const { prompt, history = [], model: requestedModel } = request.body ?? {}
  const selectedModel = typeof requestedModel === 'string' && requestedModel.trim() ? requestedModel.trim() : model

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return response.status(400).json({ error: 'A message is required.' })
  }

  const context = Array.isArray(history)
    ? history
        .filter((message) => message && ['user', 'assistant'].includes(message.role) && typeof message.content === 'string')
        .slice(-12)
        .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`)
        .join('\n')
    : ''
  const fullPrompt = context ? `${context}\nUser: ${prompt.trim()}\nAssistant:` : prompt.trim()

  try {
    const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: selectedModel, prompt: fullPrompt, stream: false, think: false }),
    })

    const data = await ollamaResponse.json()
    if (!ollamaResponse.ok) {
      return response.status(ollamaResponse.status).json({ error: data.error || 'Ollama returned an error.' })
    }

    return response.json({ response: finalAnswer(data.response || ''), model: selectedModel })
  } catch (error) {
    return response.status(503).json({
      error: `Could not reach Ollama at ${ollamaUrl}. Make sure Ollama is running and the model is available.`,
      detail: error instanceof Error ? error.message : undefined,
    })
  }
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(root, 'dist')))
  app.get('*', (_request, response) => response.sendFile(path.join(root, 'dist', 'index.html')))
}

app.listen(port, () => {
  console.log(`Local chat server listening on http://localhost:${port}`)
  console.log(`Using Ollama model: ${model}`)
})
