import express from 'express'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createServer as createViteServer } from 'vite'

const app = express()
const port = Number(process.env.PORT || 3000)
const host = '0.0.0.0'
const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434'
const model = process.env.OLLAMA_MODEL || 'hf.co/HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive:Q4_K_M'
const root = path.dirname(fileURLToPath(import.meta.url))
const isProduction = process.env.NODE_ENV === 'production'

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
    return response.json({
      models: [
        { name: model, size: '4.3GB', family: 'gemma' },
        { name: 'llama3.2:latest', size: '2.0GB', family: 'llama' },
        { name: 'mistral:latest', size: '4.1GB', family: 'mistral' }
      ],
      defaultModel: model,
      offline: true,
    })
  }
})

app.post('/api/chat', async (request, response) => {
  const { prompt, history = [], model: requestedModel, systemPrompt, adminToken } = request.body ?? {}
  const selectedModel = typeof requestedModel === 'string' && requestedModel.trim() ? requestedModel.trim() : model

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return response.status(400).json({ error: 'A mensagem é obrigatória.' })
  }

  // Validate admin token if systemPrompt is an admin prompt
  const activeSystemPrompt = typeof systemPrompt === 'string' && systemPrompt.trim() ? systemPrompt.trim() : null

  const filteredHistory = Array.isArray(history)
    ? history.filter((msg) => msg && ['user', 'assistant', 'system'].includes(msg.role) && typeof msg.content === 'string')
    : []

  // Try Ollama /api/chat endpoint first for optimal persona & system prompt adherence
  try {
    const chatMessages = []
    if (activeSystemPrompt) {
      chatMessages.push({ role: 'system', content: activeSystemPrompt })
    }
    for (const msg of filteredHistory.slice(-14)) {
      if (msg.role !== 'system') {
        chatMessages.push({ role: msg.role, content: msg.content })
      }
    }
    chatMessages.push({ role: 'user', content: prompt.trim() })

    const chatResponse = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: selectedModel,
        messages: chatMessages,
        stream: false,
        options: {
          temperature: 0.85,
        },
      }),
    })

    if (chatResponse.ok) {
      const data = await chatResponse.json()
      const rawText = data.message?.content || data.response || ''
      return response.json({
        response: finalAnswer(rawText),
        model: selectedModel,
      })
    }
  } catch {
    // If /api/chat fails, fallback to /api/generate
  }

  // Fallback to /api/generate
  const context = filteredHistory
    .slice(-12)
    .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`)
    .join('\n')
  
  const fullPrompt = context ? `${context}\nUser: ${prompt.trim()}\nAssistant:` : prompt.trim()

  try {
    const generatePayload = {
      model: selectedModel,
      prompt: fullPrompt,
      stream: false,
      think: false,
      options: {
        temperature: 0.85,
      },
    }
    if (activeSystemPrompt) {
      generatePayload.system = activeSystemPrompt
    }

    const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(generatePayload),
    })

    const data = await ollamaResponse.json()
    if (!ollamaResponse.ok) {
      return response.status(ollamaResponse.status).json({ error: data.error || 'Ollama retornou um erro.' })
    }

    return response.json({ response: finalAnswer(data.response || ''), model: selectedModel })
  } catch (error) {
    return response.status(503).json({
      error: `Não foi possível conectar ao Ollama em ${ollamaUrl}. Verifique se o serviço local está ativo e o modelo instalado.`,
      detail: error instanceof Error ? error.message : undefined,
    })
  }
})

if (!isProduction) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
    root,
  })
  app.use(vite.middlewares)
} else {
  app.use(express.static(path.join(root, 'dist')))
  app.get('*', (_request, response) => response.sendFile(path.join(root, 'dist', 'index.html')))
}

app.listen(port, host, () => {
  console.log(`Local chat server listening on http://${host}:${port}`)
  console.log(`Using Ollama model: ${model}`)
})
