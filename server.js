import express from 'express'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { createServer as createViteServer } from 'vite'
import { GoogleGenAI } from '@google/genai'

const app = express()
const port = Number(process.env.PORT || 3000)
const host = '0.0.0.0'
const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434'
const model = process.env.OLLAMA_MODEL || 'hf.co/HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive:Q4_K_M'
const root = path.dirname(fileURLToPath(import.meta.url))
const isProduction = process.env.NODE_ENV === 'production'

// Load .env if present and needed
try {
  const envPath = path.join(root, '.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    for (const line of envContent.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
      if (match) {
        const key = match[1]
        let val = (match[2] || '').trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        if (!process.env[key] || process.env[key] === 'MY_GEMINI_API_KEY') {
          process.env[key] = val
        }
      }
    }
  }
} catch {}

const geminiApiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
  ? process.env.GEMINI_API_KEY
  : null

const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null

function finalAnswer(text) {
  if (!text) return ''
  const channelFinal = text.match(/(?:<\|channel\|>|<channel>)final(?:<\|message\|>|<message>)?\s*([\s\S]*)/i)
  if (channelFinal) return channelFinal[1].trim()

  const thoughtEnd = text.search(/(?:<\|channel\|>|<channel>)thought(?:<\|message\|>|<message>)/i)
  if (thoughtEnd !== -1) {
    const withoutThought = text.slice(thoughtEnd).replace(/[\s\S]*?(?:<\|channel\|>|<channel>)final(?:<\|message\|>|<message>)?/i, '')
    if (withoutThought.trim()) return withoutThought.trim()
  }

  return text.replace(/<\|(?:channel|message)\|>|<\/?(?:channel|message)>/gi, '').trim()
}

async function pingOllama() {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 1200)
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: controller.signal })
    clearTimeout(timer)
    return res.ok
  } catch {
    return false
  }
}

app.use(express.json({ limit: '1mb' }))

app.get('/api/health', async (_request, response) => {
  const ollamaOnline = await pingOllama()
  if (ollamaOnline) {
    return response.status(200).json({ connected: true, provider: 'ollama', model })
  }

  if (ai) {
    return response.status(200).json({ connected: true, provider: 'gemini', model: 'gemini-3.8-flash' })
  }

  return response.status(503).json({ connected: false, model })
})

app.get('/api/models', async (_request, response) => {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 1200)
    const ollamaResponse = await fetch(`${ollamaUrl}/api/tags`, { signal: controller.signal })
    clearTimeout(timer)
    if (ollamaResponse.ok) {
      const data = await ollamaResponse.json()
      if (data.models && data.models.length > 0) {
        return response.json({
          models: data.models.map((installedModel) => ({
            name: installedModel.name,
            size: installedModel.details?.parameter_size || '',
            family: installedModel.details?.family || '',
          })),
          defaultModel: model,
          provider: 'ollama',
        })
      }
    }
  } catch {
    // Ollama not reachable
  }

  if (ai) {
    return response.json({
      models: [
        { name: 'gemini-3.1-flash-lite', size: 'Google AI Studio (Rápido)', family: 'gemini' },
        { name: 'gemini-3.8-flash', size: 'Google AI Studio (Padrão)', family: 'gemini' },
        { name: model, size: '4.3GB (Ollama Local)', family: 'gemma' },
        { name: 'llama3.2:latest', size: '2.0GB (Ollama Local)', family: 'llama' },
        { name: 'mistral:latest', size: '4.1GB (Ollama Local)', family: 'mistral' }
      ],
      defaultModel: 'gemini-3.1-flash-lite',
      provider: 'gemini',
    })
  }

  return response.json({
    models: [
      { name: model, size: '4.3GB', family: 'gemma' },
      { name: 'llama3.2:latest', size: '2.0GB', family: 'llama' },
      { name: 'mistral:latest', size: '4.1GB', family: 'mistral' }
    ],
    defaultModel: model,
    offline: true,
  })
})

async function callGemini(selectedModel, prompt, filteredHistory, activeSystemPrompt) {
  const modelToUse = selectedModel && selectedModel.startsWith('gemini-') ? selectedModel : 'gemini-3.8-flash'
  const contents = []

  for (const msg of filteredHistory.slice(-14)) {
    if (msg.role === 'system') continue
    const role = msg.role === 'assistant' ? 'model' : 'user'

    // Gemini requires the first turn to be 'user'
    if (contents.length === 0 && role === 'model') {
      continue
    }

    // Merge consecutive turns with the same role
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += `\n\n${msg.content}`
      continue
    }

    contents.push({
      role,
      parts: [{ text: msg.content }],
    })
  }

  // Append user prompt
  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents[contents.length - 1].parts[0].text += `\n\n${prompt.trim()}`
  } else {
    contents.push({
      role: 'user',
      parts: [{ text: prompt.trim() }],
    })
  }

  const config = {}
  if (activeSystemPrompt) {
    config.systemInstruction = activeSystemPrompt
  }

  // Attempt with requested model, fallback if high demand (503/429)
  const modelsToTry = [modelToUse]
  if (modelToUse === 'gemini-3.8-flash') {
    modelsToTry.push('gemini-3.1-flash-lite')
  }

  let lastError = null
  for (const currentModel of modelsToTry) {
    try {
      const result = await ai.models.generateContent({
        model: currentModel,
        contents,
        config,
      })
      return {
        response: finalAnswer(result.text || ''),
        model: currentModel,
      }
    } catch (err) {
      lastError = err
      console.warn(`Model ${currentModel} failed, trying fallback if available:`, err?.message || err)
    }
  }

  throw lastError || new Error('Falha ao gerar resposta com Gemini.')
}

app.post('/api/chat', async (request, response) => {
  const { prompt, history = [], model: requestedModel, systemPrompt } = request.body ?? {}
  const selectedModel = typeof requestedModel === 'string' && requestedModel.trim() ? requestedModel.trim() : (ai ? 'gemini-3.1-flash-lite' : model)

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return response.status(400).json({ error: 'A mensagem é obrigatória.' })
  }

  const activeSystemPrompt = typeof systemPrompt === 'string' && systemPrompt.trim() ? systemPrompt.trim() : null
  const filteredHistory = Array.isArray(history)
    ? history.filter((msg) => msg && ['user', 'assistant', 'system'].includes(msg.role) && typeof msg.content === 'string')
    : []

  // If Gemini model is explicitly selected, or if Ollama is not configured
  if (selectedModel.startsWith('gemini-') && ai) {
    try {
      const geminiResult = await callGemini(selectedModel, prompt, filteredHistory, activeSystemPrompt)
      return response.json(geminiResult)
    } catch (err) {
      console.error('Gemini error:', err)
      return response.status(500).json({ error: err instanceof Error ? err.message : 'Erro ao processar com Gemini.' })
    }
  }

  // Try Ollama /api/chat endpoint first
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
    // If /api/chat fails, fallback to /api/generate or Gemini
  }

  // Try Ollama /api/generate
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

    if (ollamaResponse.ok) {
      const data = await ollamaResponse.json()
      return response.json({ response: finalAnswer(data.response || ''), model: selectedModel })
    }
  } catch (error) {
    // Ollama is offline: fallback to Gemini if available
    if (ai) {
      try {
        const geminiResult = await callGemini('gemini-3.8-flash', prompt, filteredHistory, activeSystemPrompt)
        return response.json(geminiResult)
      } catch (geminiError) {
        console.error('Gemini fallback error:', geminiError)
      }
    }

    return response.status(503).json({
      error: `Não foi possível conectar ao Ollama em ${ollamaUrl}. Verifique se o serviço local está ativo e o modelo instalado.`,
      detail: error instanceof Error ? error.message : undefined,
    })
  }

  // Fallback to Gemini if reached here and ai is available
  if (ai) {
    try {
      const geminiResult = await callGemini('gemini-3.8-flash', prompt, filteredHistory, activeSystemPrompt)
      return response.json(geminiResult)
    } catch (geminiError) {
      return response.status(500).json({ error: geminiError instanceof Error ? geminiError.message : 'Erro ao processar.' })
    }
  }

  return response.status(503).json({
    error: `Serviço de IA indisponível. Verifique o Ollama ou as configurações de API.`,
  })
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
  console.log(`Using model: ${model}`)
  if (ai) {
    console.log(`Gemini API configured: using gemini-3.8-flash`)
  }
})
