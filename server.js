import express from 'express'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { createServer as createViteServer } from 'vite'
import { GoogleGenAI } from '@google/genai'

const root = path.dirname(fileURLToPath(import.meta.url))

// Load .env if present
function reloadEnvFile() {
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
          process.env[key] = val
        }
      }
    }
  } catch {}
}
reloadEnvFile()

const app = express()
const port = Number(process.env.PORT || 3000)
const host = '0.0.0.0'
const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434'
const model = process.env.OLLAMA_MODEL || 'hf.co/HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive:Q4_K_M'
const isProduction = process.env.NODE_ENV === 'production'

// Helper to get active Gemini API key from environment
function getGeminiApiKey() {
  reloadEnvFile()
  const rawKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY || process.env.VITE_GEMINI_API_KEY
  if (!rawKey || rawKey === 'MY_GEMINI_API_KEY' || rawKey === 'YOUR_GEMINI_API_KEY') {
    return null
  }
  return rawKey.trim()
}

// Instantiate fresh client with latest env key
function getAiClient() {
  const apiKey = getGeminiApiKey()
  return new GoogleGenAI({
    ...(apiKey ? { apiKey } : {}),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  })
}

function isApiKeyError(err) {
  if (!err) return false
  const msg = (err.message || String(err)).toLowerCase()
  return (
    msg.includes('api key not valid') ||
    msg.includes('api_key_invalid') ||
    msg.includes('pass a valid api key') ||
    msg.includes('invalid_argument') && msg.includes('api key')
  )
}

app.use('/assets', express.static(path.join(root, 'assets')))
app.use('/public/assets', express.static(path.join(root, 'public/assets')))

const SUPPORTED_IMG_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp'])

// Semantic dictionary linking common user requests to asset filename tokens
const THEME_CLUSTERS = [
  {
    theme: 'lingerie',
    terms: ['lingerie', 'calcinha', 'calcinhas', 'sutia', 'sutias', 'sutiã', 'sutiãs', 'fio dental', 'renda', 'intima', 'intimas', 'baby doll', 'babydoll', 'camisola', 'corselet', 'cueca', 'underwear', 'bojo', 'sensual'],
    fileTokens: ['lingerie', 'calcinha', 'sutia', 'intima', 'renda', 'underwear', 'babydoll', 'provocante']
  },
  {
    theme: 'praia_biquini',
    terms: ['biquini', 'biquíni', 'maio', 'maiô', 'praia', 'piscina', 'sol', 'mar', 'areia', 'bronze', 'bronzeado', 'bikini', 'swimsuit', 'swimwear', 'verao', 'verão'],
    fileTokens: ['biquini', 'bikini', 'praia', 'piscina', 'maio', 'swimwear', 'beach', 'sol']
  },
  {
    theme: 'vestido_festa',
    terms: ['vestido', 'festa', 'balada', 'elegante', 'gala', 'salto', 'decote', 'formatura', 'casamento', 'dress', 'noite', 'evento'],
    fileTokens: ['vestido', 'dress', 'festa', 'gala', 'balada', 'night', 'elegante']
  },
  {
    theme: 'cama_quarto',
    terms: ['cama', 'quarto', 'deitada', 'dormir', 'acordando', 'pijama', 'lencol', 'lençol', 'travesseiro', 'bedroom', 'bed', 'sono', 'acordar'],
    fileTokens: ['cama', 'quarto', 'pijama', 'bed', 'bedroom', 'sleep', 'morning', 'deitada']
  },
  {
    theme: 'banho_toalha',
    terms: ['banho', 'chuveiro', 'toalha', 'banheira', 'box', 'molhada', 'cabelo molhado', 'espelho do banheiro', 'shower', 'towel', 'bath', 'ensaboada'],
    fileTokens: ['banho', 'toalha', 'shower', 'bath', 'towel', 'banheiro', 'box']
  },
  {
    theme: 'academia_fitness',
    terms: ['academia', 'treino', 'treinar', 'fitness', 'legging', 'top', 'gym', 'workout', 'musculacao', 'musculação', 'agachamento', 'esteira'],
    fileTokens: ['academia', 'treino', 'fitness', 'gym', 'legging', 'workout', 'fit']
  },
  {
    theme: 'carro',
    terms: ['carro', 'dirigindo', 'volante', 'passageiro', 'carona', 'car', 'transito', 'trânsito', 'uber'],
    fileTokens: ['carro', 'car', 'auto', 'veiculo', 'volante']
  },
  {
    theme: 'selfie_casual',
    terms: ['selfie', 'rosto', 'sorriso', 'olhando', 'cara', 'close', 'face', 'expressao', 'expressão', 'linda', 'bonita'],
    fileTokens: ['selfie', 'face', 'rosto', 'close', 'casual', 'sorriso']
  }
]

// Scan /assets and /public/assets for available reference images
function listAvailableAssets() {
  const dirs = [
    path.join(root, 'assets'),
    path.join(root, 'public', 'assets'),
  ]
  const found = new Map()

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue
    try {
      const files = fs.readdirSync(dir)
      for (const file of files) {
        const ext = path.extname(file).toLowerCase()
        if (SUPPORTED_IMG_EXTS.has(ext)) {
          const fullPath = path.join(dir, file)
          const stat = fs.statSync(fullPath)
          if (stat.isFile() && !found.has(file.toLowerCase())) {
            const nameWithoutExt = path.basename(file, ext)
            const cleanTokens = nameWithoutExt
              .toLowerCase()
              .replace(/[-_.,+]/g, ' ')
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .split(/\s+/)
              .filter(t => t.length >= 2)

            found.set(file.toLowerCase(), {
              filename: file,
              path: fullPath,
              ext,
              sizeKB: (stat.size / 1024).toFixed(1),
              tokens: cleanTokens,
              mimeType: ext === '.png' ? 'image/png' : (ext === '.webp' ? 'image/webp' : (ext === '.bmp' ? 'image/bmp' : 'image/jpeg')),
              url: `/assets/${file}`,
            })
          }
        }
      }
    } catch (err) {
      console.warn(`[Assets Scanner] Error reading dir ${dir}:`, err)
    }
  }

  return Array.from(found.values())
}

// Find the best reference image based on conversation context and request
async function findBestReferenceImage(contextText, userRequest, charScenario, aiClient) {
  const allAssets = listAvailableAssets()
  if (allAssets.length === 0) return null

  // If there is only 1 asset in folder, use it
  if (allAssets.length === 1) {
    const single = allAssets[0]
    try {
      const buffer = fs.readFileSync(single.path)
      return {
        ...single,
        inlineData: {
          mimeType: single.mimeType,
          data: buffer.toString('base64'),
        },
        matchReason: `Único asset disponível (${single.filename})`,
      }
    } catch {
      return null
    }
  }

  const combinedSearchText = `${userRequest || ''} ${contextText || ''} ${charScenario || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  // 1. Keyword & Cluster Scoring Heuristic
  let bestAsset = null
  let maxScore = 0

  for (const asset of allAssets) {
    let score = 0
    const assetNameClean = asset.filename.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    // Direct token occurrence in user query or context
    for (const token of asset.tokens) {
      if (token === 'ref' || token === 'jpeg' || token === 'jpg' || token === 'png' || token === 'webp') continue
      const regex = new RegExp(`\\b${token}\\b`, 'i')
      if (regex.test(userRequest || '')) {
        score += 8 // High priority for words directly in user prompt
      } else if (regex.test(combinedSearchText)) {
        score += 4
      } else if (combinedSearchText.includes(token)) {
        score += 2
      }
    }

    // Semantic cluster matching (e.g. "lingerie" matches "calcinha_vermelha.jpg" or "sutia.jpg")
    for (const cluster of THEME_CLUSTERS) {
      const userHasClusterTerm = cluster.terms.some(t => {
        const r = new RegExp(`\\b${t}\\b`, 'i')
        return r.test(combinedSearchText)
      })

      const assetBelongsToCluster = cluster.fileTokens.some(ft => {
        return asset.tokens.includes(ft) || assetNameClean.includes(ft)
      })

      if (userHasClusterTerm && assetBelongsToCluster) {
        score += 6
      }
    }

    if (score > maxScore) {
      maxScore = score
      bestAsset = asset
    }
  }

  // 2. If multiple assets exist and AI client is available, refine selection with Gemini
  if (aiClient && allAssets.length > 1) {
    try {
      const assetListStr = allAssets.map(a => `- ${a.filename} (identificadores: ${a.tokens.join(', ')})`).join('\n')
      const selectRes = await aiClient.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        config: {
          systemInstruction: `You are an intelligent reference photo selector for an AI image generation engine.
You will receive the user's photo request, conversation context, and the list of available reference images in the /assets folder.
Task:
1. Identify the reference image filename that best matches the requested clothing type (e.g. lingerie, calcinha, biquíni, vestido), pose, or environment (quarto, praia, banho, academia).
2. Note: Even if the user requested a specific color (like 'calcinha branca') and the asset is 'calcinha_vermelha.jpg' or 'lingerie.jpg', you MUST pick that asset because it provides the right clothing/pose reference!
3. If no specific theme matches, choose 'ref.jpeg' if available, or the most neutral photo.
Return ONLY the chosen filename (e.g. "lingerie.jpg"), nothing else.`,
          temperature: 0.1,
        },
        contents: `Available reference image files:\n${assetListStr}\n\nUser photo request: "${userRequest}"\nConversation & Scenario Context: "${combinedSearchText}"\n\nChosen filename:`,
      })

      const chosenFilename = selectRes.text?.trim().replace(/[`"'*]/g, '').trim().toLowerCase()
      if (chosenFilename && chosenFilename !== 'none') {
        const found = allAssets.find(a => a.filename.toLowerCase() === chosenFilename || chosenFilename.includes(a.filename.toLowerCase()))
        if (found) {
          bestAsset = found
          maxScore = 12
        }
      }
    } catch (llmErr) {
      console.warn('[Asset Matcher LLM] Selection fallback to keyword score:', llmErr?.message || llmErr)
    }
  }

  // Fallback to ref.jpeg if no specific thematic match was found
  if (!bestAsset || maxScore === 0) {
    const genericRef = allAssets.find(a => a.filename.toLowerCase().startsWith('ref.'))
    if (genericRef) {
      bestAsset = genericRef
    } else {
      bestAsset = allAssets[0]
    }
  }

  if (bestAsset) {
    try {
      const buffer = fs.readFileSync(bestAsset.path)
      return {
        ...bestAsset,
        inlineData: {
          mimeType: bestAsset.mimeType,
          data: buffer.toString('base64'),
        },
        matchReason: maxScore > 0 ? `Correspondência contextual (${bestAsset.filename})` : 'Referência base padrão',
      }
    } catch (err) {
      console.warn(`[Asset Matcher] Error reading ${bestAsset.path}:`, err)
      return null
    }
  }

  return null
}

app.get('/api/assets', (_req, res) => {
  const assets = listAvailableAssets()
  res.json({
    count: assets.length,
    assets: assets.map(a => ({
      filename: a.filename,
      sizeKB: a.sizeKB,
      url: a.url,
      tokens: a.tokens,
    })),
  })
})

app.get('/api/reference-image-info', (_req, res) => {
  const assets = listAvailableAssets()
  const ref = assets.find(a => a.filename.toLowerCase().startsWith('ref.')) || assets[0]
  res.json({
    exists: Boolean(ref),
    url: ref ? ref.url : null,
    filename: ref?.filename || 'ref.jpeg',
    sizeKB: ref?.sizeKB || null,
    totalAssetsCount: assets.length,
    assets: assets.map(a => a.filename),
    description: 'Imagens de referência na pasta assets ativas para guiar textura de pele, iluminação, pose e roupas.',
  })
})

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
    const timer = setTimeout(() => controller.abort(), 1000)
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

  const apiKey = getGeminiApiKey()
  if (apiKey) {
    return response.status(200).json({ connected: true, provider: 'gemini', model: 'gemini-3.1-flash-lite' })
  }

  return response.status(200).json({ connected: false, model, error: 'Ollama local e Gemini API desconectados.' })
})

export const AVAILABLE_IMAGE_MODELS = [
  {
    id: 'gemini-3.1-flash-image',
    name: 'Gemini 3.1 Flash Image',
    alias: 'Nano Banana 2',
    badge: 'Flash 2K · Rápido & Estável',
    description: 'Alta fidelidade fotográfica e resposta rápida na geração de fotos realistas.',
    family: 'gemini',
    resolution: '2K',
    recommended: true,
  },
  {
    id: 'gemini-3.1-flash-lite-image',
    name: 'Gemini 3.1 Flash Lite Image',
    alias: 'Nano Banana Lite',
    badge: 'Lite · Ultra-Rápido',
    description: 'Modelo leve para geração instantânea de fotos com baixo consumo de recursos.',
    family: 'gemini',
    resolution: '1K',
    recommended: false,
  },
  {
    id: 'gemini-3-pro-image',
    name: 'Gemini 3 Pro Image',
    alias: 'Nano Banana Pro',
    badge: 'Pro 2K · Ultra-Detalhes',
    description: 'Máxima resolução e texturas avançadas de iluminação ambiente.',
    family: 'gemini',
    resolution: '2K',
    recommended: false,
  },
]

app.get('/api/models', async (_request, response) => {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 1000)
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
          imageModels: AVAILABLE_IMAGE_MODELS,
          defaultImageModel: 'gemini-3.1-flash-image',
        })
      }
    }
  } catch {
    // Ollama not reachable
  }

  const apiKey = getGeminiApiKey()
  if (apiKey) {
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
      imageModels: AVAILABLE_IMAGE_MODELS,
      defaultImageModel: 'gemini-3.1-flash-image',
    })
  }

  return response.json({
    models: [
      { name: 'gemini-3.1-flash-lite', size: 'Google AI Studio (Rápido)', family: 'gemini' },
      { name: 'gemini-3.8-flash', size: 'Google AI Studio (Padrão)', family: 'gemini' },
      { name: model, size: '4.3GB', family: 'gemma' },
      { name: 'llama3.2:latest', size: '2.0GB', family: 'llama' },
      { name: 'mistral:latest', size: '4.1GB', family: 'mistral' }
    ],
    defaultModel: 'gemini-3.1-flash-lite',
    offline: true,
    imageModels: AVAILABLE_IMAGE_MODELS,
    defaultImageModel: 'gemini-3.1-flash-image',
  })
})

async function callGemini(selectedModel, prompt, filteredHistory, activeSystemPrompt) {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    throw new Error('Chave de API do Gemini (GEMINI_API_KEY) não configurada. Defina a chave nas variáveis de ambiente ou inicie o Ollama local.')
  }

  const ai = getAiClient()
  const modelToUse = selectedModel && selectedModel.startsWith('gemini-') ? selectedModel : 'gemini-3.1-flash-lite'
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

  // Resilient models list
  const modelsToTry = [modelToUse, 'gemini-3.8-flash', 'gemini-3.1-flash-lite'].filter((v, i, a) => a.indexOf(v) === i)

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
      if (isApiKeyError(err)) {
        throw new Error('Chave de API do Gemini inválida ou não autorizada. Verifique sua GEMINI_API_KEY.')
      }
      console.warn(`Model ${currentModel} error, trying next fallback...`, err?.message || err)
    }
  }

  throw lastError || new Error('Falha ao gerar resposta com Gemini.')
}

app.post('/api/chat', async (request, response) => {
  const { prompt, history = [], model: requestedModel, systemPrompt } = request.body ?? {}
  const apiKey = getGeminiApiKey()
  const selectedModel = typeof requestedModel === 'string' && requestedModel.trim() ? requestedModel.trim() : (apiKey ? 'gemini-3.1-flash-lite' : model)

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return response.status(400).json({ error: 'A mensagem é obrigatória.' })
  }

  const activeSystemPrompt = typeof systemPrompt === 'string' && systemPrompt.trim() ? systemPrompt.trim() : null
  const filteredHistory = Array.isArray(history)
    ? history.filter((msg) => msg && ['user', 'assistant', 'system'].includes(msg.role) && typeof msg.content === 'string')
    : []

  // If Gemini model is explicitly selected, or if Ollama is not configured
  if (selectedModel.startsWith('gemini-')) {
    try {
      const geminiResult = await callGemini(selectedModel, prompt, filteredHistory, activeSystemPrompt)
      return response.json(geminiResult)
    } catch (err) {
      console.error('Gemini error:', err?.message || err)
      const isKeyErr = isApiKeyError(err) || (err?.message && err.message.includes('GEMINI_API_KEY'))
      return response.status(isKeyErr ? 401 : 500).json({
        error: err instanceof Error ? err.message : 'Erro ao processar com Gemini.',
      })
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
      signal: AbortSignal.timeout(60000),
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
      signal: AbortSignal.timeout(60000),
    })

    if (ollamaResponse.ok) {
      const data = await ollamaResponse.json()
      return response.json({ response: finalAnswer(data.response || ''), model: selectedModel })
    }
  } catch (error) {
    // Ollama is offline: fallback to Gemini if available
    if (apiKey) {
      try {
        const geminiResult = await callGemini('gemini-3.1-flash-lite', prompt, filteredHistory, activeSystemPrompt)
        return response.json(geminiResult)
      } catch (geminiError) {
        console.error('Gemini fallback error:', geminiError?.message || geminiError)
        return response.status(isApiKeyError(geminiError) ? 401 : 500).json({
          error: geminiError instanceof Error ? geminiError.message : 'Erro ao processar.',
        })
      }
    }

    return response.status(503).json({
      error: `Não foi possível conectar ao Ollama em ${ollamaUrl}. Verifique se o serviço local está ativo ou configure a GEMINI_API_KEY.`,
      detail: error instanceof Error ? error.message : undefined,
    })
  }

  // Fallback to Gemini if reached here and apiKey is available
  if (apiKey) {
    try {
      const geminiResult = await callGemini('gemini-3.1-flash-lite', prompt, filteredHistory, activeSystemPrompt)
      return response.json(geminiResult)
    } catch (geminiError) {
      return response.status(isApiKeyError(geminiError) ? 401 : 500).json({
        error: geminiError instanceof Error ? geminiError.message : 'Erro ao processar.',
      })
    }
  }

  return response.status(503).json({
    error: `Serviço de IA indisponível. Inicie o Ollama local ou configure a GEMINI_API_KEY.`,
  })
})

app.post('/api/generate-photo', express.json(), async (request, response) => {
  try {
    const { prompt, character, scenario, context, userPrompt, characterReply, conversationHistory } = request.body || {}
    const charName = character?.name || 'Personagem'
    const charAge = character?.age || '22 anos'
    const physDesc = character?.physicalDescription || 'Brazilian woman, natural beauty, expressive dark eyes, attractive, realistic look'
    const charScenario = scenario || character?.scenario || 'quarto aconchegante relaxando'
    const effectiveUserRequest = userPrompt || prompt || context || 'Manda uma foto'

    let historySummary = ''
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      historySummary = conversationHistory.slice(-8).map(m => `${m.role === 'user' ? 'User' : (m.senderName || 'Character')}: ${m.content}`).join('\n')
    } else if (typeof context === 'string' && context.trim()) {
      historySummary = context
    }

    const apiKey = getGeminiApiKey()
    if (!apiKey) {
      return response.status(401).json({
        success: false,
        error: 'Chave de API Gemini (GEMINI_API_KEY) não configurada.',
        shouldGenerate: false,
      })
    }

    const ai = getAiClient()

    // 1. Identify context and find the best matching reference image from /assets
    const matchedRef = await findBestReferenceImage(
      `${historySummary} ${characterReply || ''}`,
      effectiveUserRequest,
      charScenario,
      ai
    )

    if (matchedRef) {
      console.log(`[Reference Match] Matched asset "${matchedRef.filename}" (${matchedRef.matchReason}) for request: "${effectiveUserRequest}"`)
    } else {
      console.log(`[Reference Match] No reference image found in assets folder, generating purely from prompt.`)
    }

    // 2. Build refined prompt with user-requested modifications
    let refinedPrompt = ''
    const isExplicitCharacterRequest = !prompt && /(?:foto\s+sua|selfie|voc[eê]|sua\s+foto|foto\s+de\s+vc|foto\s+de\s+voc[eê]|tomando\s+banho|deitada|seu\s+rosto|seu\s+corpo|voc[eê]\s+aqui|como\s+voc[eê]\s+t[aá]|uma\s+foto\s+tua|manda\s+uma\s+foto|manda\s+foto|quero\s+ver|look|roupa|lingerie|calcinha|biquini|vestido|quarto)/i.test(effectiveUserRequest)
    
    if (prompt && prompt.trim().length > 15) {
      refinedPrompt = `Authentic candid raw smartphone photograph, taken with an iPhone 15 Pro, natural ambient lighting, unedited real life amateur photo, sharp focus: ${prompt.trim()}`
    } else if (isExplicitCharacterRequest) {
      refinedPrompt = `Authentic candid raw smartphone selfie photograph, taken on an iPhone 15 Pro front camera, natural ambient room lighting, realistic shot of ${charName}, ${charAge}, ${physDesc}, in ${charScenario}, looking at camera, authentic Brazilian Latina woman with natural Latina facial features, natural warm brown eyes, real human skin with visible fine pores and subtle natural texture, natural hair with loose strands, unedited amateur real life photo, sharp focus. No 3D render, no CGI, no porcelain doll, no smooth plastic skin, no anime, no manga, no East Asian features, no digital art, no videogame graphics`
    } else {
      refinedPrompt = `Authentic candid raw smartphone photograph, taken with an iPhone 15 Pro, first-person POV shot of ${effectiveUserRequest}, in ${charScenario}, natural real-world lighting, fine textures, photorealistic documentary style, sharp focus, unedited real life photo. No 3D render, no CGI, no cartoon, no digital illustration`
    }

    // Try fast prompt enhancement with context awareness
    try {
      const evalRes = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        config: {
          systemInstruction: `You are an expert realistic photography director. Convert the photo request for character (${charName}, ${charAge}, ${physDesc}, in scenario "${charScenario}") into a single ultra-detailed photorealistic iPhone camera prompt in English.
CRITICAL RULES:
1. STRICT USER SPECIFICATIONS & OVERRIDES: If the user requested specific clothing items, specific colors (for example 'calcinha branca' -> white panties/lingerie, 'vestido vermelho' -> red dress, 'biquini preto' -> black bikini), hairstyles, or scene elements, you MUST explicitly describe those exact colors, clothing items, and details in the prompt so that any reference image's original colors are overridden.
2. PHOTOREALISM: Keep it strictly photorealistic with real human skin pores, authentic Brazilian/Latina facial morphology, natural ambient room lighting.
3. NEVER return cartoon, anime, 3D CGI, doll-like skin, or digital art terms.
Return ONLY the final prompt string in English.`,
          temperature: 0.2,
        },
        contents: `User photo request: "${effectiveUserRequest}".\nConversation context: "${historySummary} ${characterReply || ''}".\nScenario: "${charScenario}".\nBase guideline: "${prompt || refinedPrompt}".`,
      })
      const enhanced = evalRes.text?.trim()
      if (enhanced && enhanced.length > 20 && !enhanced.startsWith('{')) {
        refinedPrompt = enhanced
      }
    } catch {
      // Keep baseline refinedPrompt
    }

    // 3. Synthesize image using Google Gemini image generation models
    let imageUrl = null
    let usedModel = null

    const requestedImageModel = typeof request.body?.imageModel === 'string' && request.body.imageModel.trim() && request.body.imageModel !== 'flux'
      ? request.body.imageModel.trim()
      : 'gemini-3.1-flash-image'

    const imageModels = [
      requestedImageModel,
      'gemini-3.1-flash-image',
      'gemini-3.1-flash-lite-image',
      'gemini-3-pro-image',
    ].filter((v, i, a) => a.indexOf(v) === i)

    for (const imgModel of imageModels) {
      try {
        const imgConfig = {
          imageConfig: {
            aspectRatio: '3:4',
          },
        }

        // Try with reference image first if available
        if (matchedRef?.inlineData?.data) {
          try {
            const refGuidance = `[REFERENCE PHOTO INSTRUCTION:
Use the attached reference image (${matchedRef.filename}) as a visual baseline for the pose, angle, composition, and ambient lighting.
CRITICAL OVERRIDE & MODIFICATION INSTRUCTIONS:
- You MUST adapt the photo to fulfill the user's specific request: "${effectiveUserRequest}".
- If the user specified a certain color, clothing item, or alteration (e.g. "calcinha branca" / white lingerie, or different colors, outfit, or hair), you MUST generate the final image with the user's requested color and outfit, even if the reference photo has a different color or style!
- Maintain character identity: ${charName}, ${charAge}, ${physDesc}, in ${charScenario}.
- Style: Authentic candid raw iPhone 15 Pro photograph, realistic human skin with visible pores, natural room lighting.]
Detailed Prompt: ${refinedPrompt}`
            
            const multiRes = await ai.models.generateContent({
              model: imgModel,
              contents: {
                parts: [
                  {
                    inlineData: {
                      mimeType: matchedRef.inlineData.mimeType || 'image/jpeg',
                      data: matchedRef.inlineData.data,
                    },
                  },
                  {
                    text: refGuidance,
                  },
                ],
              },
              config: imgConfig,
            })

            for (const cand of multiRes?.candidates || []) {
              for (const part of cand.content?.parts || []) {
                if (part.inlineData && part.inlineData.data) {
                  const mime = part.inlineData.mimeType || 'image/png'
                  const cleanBase64 = String(part.inlineData.data).replace(/\s+/g, '').trim()
                  imageUrl = `data:${mime};base64,${cleanBase64}`
                  usedModel = imgModel
                  break
                }
              }
              if (imageUrl) break
            }
          } catch (multiErr) {
            console.warn(`[Photo Generation] Multi-modal attempt with ${matchedRef.filename} on ${imgModel} skipped (${multiErr?.message || multiErr}), falling back to direct prompt...`)
          }
        }

        // Direct generation fallback if multi-modal was not used or didn't yield an image
        if (!imageUrl) {
          const directRes = await ai.models.generateContent({
            model: imgModel,
            contents: {
              parts: [
                {
                  text: refinedPrompt,
                },
              ],
            },
            config: imgConfig,
          })

          for (const cand of directRes?.candidates || []) {
            for (const part of cand.content?.parts || []) {
              if (part.inlineData && part.inlineData.data) {
                const mime = part.inlineData.mimeType || 'image/png'
                const cleanBase64 = String(part.inlineData.data).replace(/\s+/g, '').trim()
                imageUrl = `data:${mime};base64,${cleanBase64}`
                usedModel = imgModel
                break
              }
            }
            if (imageUrl) break
          }
        }

        if (imageUrl) {
          console.log(`[Photo Generation] Successfully generated photo using Gemini model: ${imgModel} ${matchedRef ? `(Ref: ${matchedRef.filename})` : ''}`)
          break
        }
      } catch (imgErr) {
        if (isApiKeyError(imgErr)) {
          return response.status(401).json({
            success: false,
            error: 'Chave de API Gemini inválida ou não autorizada.',
            shouldGenerate: false,
          })
        }
        console.warn(`[Photo Generation] Model ${imgModel} attempt failed, trying next fallback:`, imgErr?.message || imgErr)
      }
    }

    if (!imageUrl) {
      return response.status(500).json({
        success: false,
        error: 'Não foi possível gerar a foto no momento. Verifique a chave de API.',
        shouldGenerate: false,
      })
    }

    return response.json({
      success: true,
      shouldGenerate: true,
      imageUrl,
      model: usedModel,
      prompt: refinedPrompt,
      referenceUsed: matchedRef?.filename || null,
      referenceMatchReason: matchedRef?.matchReason || null,
    })
  } catch (err) {
    console.error('Photo generation endpoint error:', err)
    return response.status(500).json({ error: 'Erro ao gerar foto', detail: err.message })
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
  console.log(`Using default local model: ${model}`)
  if (getGeminiApiKey()) {
    console.log(`Gemini cloud engine active`)
  }
})
