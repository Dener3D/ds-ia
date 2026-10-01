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

// Helper to translate and sanitize character descriptors to English
function getEnglishCharacterDetails(character, scenario) {
  const name = character?.name || 'Character'
  
  // Clean age (e.g., '23 anos' -> '23-year-old')
  const rawAge = (character?.age || '22 anos').toLowerCase()
  const ageMatch = rawAge.match(/\d+/)
  const ageEn = ageMatch ? `${ageMatch[0]}-year-old` : '22-year-old'

  // English physical description
  let physDescEn = character?.physicalDescriptionEn || ''
  if (!physDescEn) {
    const rawDesc = character?.physicalDescription || ''
    if (name.toLowerCase().includes('larissa')) {
      physDescEn = 'Brazilian woman with delicate natural Latin facial features, silky shoulder-length straight dark brown hair, large expressive warm brown eyes, sweet natural smile with subtle dimples, fair tropical skin with real pores and texture, slender well-proportioned body'
    } else if (name.toLowerCase().includes('valentina')) {
      physDescEn = 'Brazilian woman with authentic Latin features, long wavy natural light brown hair, warm expressive honey-brown eyes, natural lashes, glowing light-tan skin with authentic human texture, soft full lips, attractive hourglass figure'
    } else if (name.toLowerCase().includes('letícia') || name.toLowerCase().includes('leticia')) {
      physDescEn = 'Mature 42-year-old Brazilian woman with sophisticated Latin beauty, shoulder-length silky brown hair with discreet golden highlights, confident expressive brown eyes, attractive mature facial features, poised posture, glowing well-cared mature skin with natural texture'
    } else if (name.toLowerCase().includes('carlos')) {
      physDescEn = '46-year-old Brazilian man with distinguished masculine South American facial features, short dark hair graying at the temples, a neat well-groomed stubble beard with slight gray strands, firm deep brown eyes, strong masculine jawline, robust build'
    } else if (name.toLowerCase().includes('camila')) {
      physDescEn = 'Youthful 20-year-old Brazilian woman with lively natural Latin features, layered long brown hair, bright sparkling brown eyes, playful youthful expression, natural fresh skin texture, slender body'
    } else if (name.toLowerCase().includes('beatriz')) {
      physDescEn = 'Charming 21-year-old Brazilian woman with sweet natural Latin features, shoulder-length soft wavy light brown hair, delicate thin-rimmed glasses, expressive brown eyes, subtle natural blushing cheeks'
    } else {
      physDescEn = rawDesc
        .replace(/mulher brasileira de (\d+) anos/gi, '$1-year-old Brazilian woman')
        .replace(/mulher brasileira/gi, 'Brazilian woman')
        .replace(/homem brasileiro/gi, 'Brazilian man')
        .replace(/traços latinos/gi, 'natural Latin features')
        .replace(/cabelos castanho-escuros/gi, 'dark brown hair')
        .replace(/cabelos castanho-claros/gi, 'light brown hair')
        .replace(/cabelos castanhos/gi, 'brown hair')
        .replace(/olhos castanhos/gi, 'brown eyes')
        .replace(/pele morena-clara/gi, 'light-tan Brazilian skin')
        .replace(/pele clara tropical/gi, 'fair tropical skin')
        .replace(/pele madura/gi, 'mature skin')
        .replace(/textura real humana/gi, 'real human skin texture')
        .replace(/corpo esbelto/gi, 'slender figure')
        .replace(/corpo curvilíneo/gi, 'curvaceous figure')
        .replace(/com covinhas sutis/gi, 'with subtle dimples')
        .replace(/sorriso doce natural/gi, 'sweet natural smile')
        || 'Brazilian woman, natural beauty, expressive brown eyes, realistic skin texture'
    }
  }

  // English scenario
  let scenarioEn = character?.scenarioEn || ''
  if (!scenarioEn) {
    const rawScen = (scenario || character?.scenario || '').toLowerCase()
    if (rawScen.includes('cama') || rawScen.includes('quarto') || rawScen.includes('deitada')) {
      scenarioEn = 'relaxing in a cozy bedroom at night with soft ambient lighting'
    } else if (rawScen.includes('banho') || rawScen.includes('toalha') || rawScen.includes('chuveiro')) {
      scenarioEn = 'in the bathroom after a warm shower with a towel'
    } else if (rawScen.includes('sofa') || rawScen.includes('sofá') || rawScen.includes('vinho') || rawScen.includes('sala')) {
      scenarioEn = 'relaxing on a living room sofa with a glass of wine under warm ambient lights'
    } else if (rawScen.includes('trabalho') || rawScen.includes('faculdade') || rawScen.includes('escritorio') || rawScen.includes('escritório')) {
      scenarioEn = 'sitting at a modern desk with ambient indoor lighting'
    } else if (rawScen.includes('carro') || rawScen.includes('uber') || rawScen.includes('transito') || rawScen.includes('trânsito')) {
      scenarioEn = 'sitting inside a modern car with city lights through the window'
    } else if (rawScen.includes('praia') || rawScen.includes('piscina') || rawScen.includes('sol')) {
      scenarioEn = 'at a sunny tropical beach under bright golden sunlight'
    } else if (rawScen.includes('academia') || rawScen.includes('treino') || rawScen.includes('fitness')) {
      scenarioEn = 'inside a modern fitness gym with athletic workout equipment'
    } else {
      scenarioEn = 'in a comfortable indoor room with warm natural lighting'
    }
  }

  return { name, ageEn, physDescEn, scenarioEn }
}

// Clean and extract visual intentions (clothing, pose, action) from Portuguese user requests
function extractVisualDetailsFromRequest(userText) {
  const text = (userText || '').toLowerCase()
  const extracted = {
    attire: '',
    action: '',
    cameraAngle: 'candid front-camera smartphone selfie',
  }

  // Attire / Clothing extraction & translation
  if (text.includes('lingerie') || text.includes('calcinha') || text.includes('sutia') || text.includes('sutiã')) {
    if (text.includes('vermelh')) extracted.attire = 'wearing sexy red lace lingerie'
    else if (text.includes('branc')) extracted.attire = 'wearing delicate white lace lingerie'
    else if (text.includes('pret')) extracted.attire = 'wearing elegant black satin lace lingerie'
    else if (text.includes('ros')) extracted.attire = 'wearing sweet pink lace lingerie'
    else if (text.includes('azul')) extracted.attire = 'wearing seductive royal blue lingerie'
    else extracted.attire = 'wearing alluring sexy lace lingerie'
  } else if (text.includes('biquini') || text.includes('biquíni') || text.includes('maio') || text.includes('maiô')) {
    if (text.includes('pret')) extracted.attire = 'wearing a stylish black bikini'
    else if (text.includes('branc')) extracted.attire = 'wearing a chic white bikini'
    else if (text.includes('vermelh')) extracted.attire = 'wearing a vibrant red bikini'
    else extracted.attire = 'wearing a flattering beach bikini'
  } else if (text.includes('vestido')) {
    if (text.includes('vermelh')) extracted.attire = 'wearing an elegant tight red dress'
    else if (text.includes('pret')) extracted.attire = 'wearing a chic black party dress'
    else if (text.includes('curto') || text.includes('decot')) extracted.attire = 'wearing a stylish fitted mini dress'
    else extracted.attire = 'wearing an elegant stylish dress'
  } else if (text.includes('pijama') || text.includes('camisola') || text.includes('baby doll') || text.includes('babydoll')) {
    extracted.attire = 'wearing cute comfortable silky nightwear'
  } else if (text.includes('toalha') || text.includes('banho')) {
    extracted.attire = 'wrapped in a fluffy white bath towel with slightly damp hair'
  } else if (text.includes('academia') || text.includes('legging') || text.includes('top')) {
    extracted.attire = 'wearing a fitted athletic workout sports top and leggings'
  } else if (text.includes('nude') || text.includes('sem roupa') || text.includes('pelad')) {
    extracted.attire = 'in an intimate sensual bedroom pose wearing delicate sheer silk lace'
  }

  // Action / Pose extraction
  if (text.includes('deitada') || text.includes('na cama')) {
    extracted.action = 'lying comfortably on her bed, resting head against the pillow, looking affectionately at camera'
  } else if (text.includes('espelho') || text.includes('corpo todo') || text.includes('inteira') || text.includes('de pe') || text.includes('de pé')) {
    extracted.action = 'standing in front of a mirror taking a full-length casual mirror selfie'
    extracted.cameraAngle = 'full-length smartphone mirror selfie'
  } else if (text.includes('sorr')) {
    extracted.action = 'smiling warmly with a sweet, genuine expression'
  } else if (text.includes('piscina') || text.includes('praia')) {
    extracted.action = 'relaxing by the water enjoying the warm sunshine'
  }

  return extracted
}

// Synthesize cohesive 100% English photographic prompt
async function synthesizePhotorealisticPrompt({ userPrompt, rawPromptTag, character, scenario, characterReply, conversationHistory, aiClient }) {
  const { name, ageEn, physDescEn, scenarioEn } = getEnglishCharacterDetails(character, scenario)
  const visualDetails = extractVisualDetailsFromRequest(userPrompt)

  // Build baseline fallback prompt (100% English, no quotes, no Portuguese)
  const attireClause = visualDetails.attire ? `, ${visualDetails.attire}` : ''
  const actionClause = visualDetails.action ? `, ${visualDetails.action}` : ', looking naturally at the camera with a gentle expression'
  
  let fallbackPrompt = `Authentic candid raw smartphone photograph, shot on iPhone 15 Pro front camera, natural ambient lighting, photorealistic shot of ${name}, a ${ageEn} ${physDescEn}${attireClause}${actionClause}, in ${scenarioEn}, authentic Brazilian Latina facial morphology, natural human skin texture with fine visible pores and realistic sheen, loose natural hair strands, unedited amateur real life photo, sharp focus, 35mm lens, depth of field. No 3D render, no CGI, no porcelain doll, no smooth plastic skin, no anime, no digital painting.`

  // If AI client is available, use Gemini to produce a masterfully crafted, 100% pure English prompt
  if (aiClient) {
    try {
      const cleanHistory = Array.isArray(conversationHistory)
        ? conversationHistory.slice(-6).map(m => `${m.role === 'user' ? 'User' : (m.senderName || name)}: ${m.content}`).join('\n')
        : ''

      const synthRes = await aiClient.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        config: {
          systemInstruction: `You are an elite photorealistic prompt engineer for cutting-edge text-to-image AI models (Gemini Flash Image / Imagen).
Your objective is to generate a SINGLE, cohesive, 100% PURE ENGLISH photographic prompt describing a realistic smartphone picture of the character.

ABSOLUTE STRICT RULES:
1. 100% PURE ENGLISH ONLY: Never include ANY Portuguese words, Portuguese numbers, or mixed-language snippets (e.g. NEVER use 'anos', 'quarto', 'calcinha', 'sutiã', 'morena', 'deitada', etc.). Translate everything to precise English photography terms.
2. NO RAW USER QUOTES OR CONVERSATIONAL TEXT: NEVER dump the user's chat message, questions, or conversational requests (e.g. NEVER write "Pode me mandar uma foto sua...", "manda foto", "como você tá", etc.). Instead, extract the visual intent: clothing style/color (e.g. "wearing sexy black lace lingerie"), pose (e.g. "lying relaxed on a cozy bed"), angle ("candid smartphone selfie shot on iPhone 15 Pro"), lighting ("warm soft bedroom lighting"), and expression.
3. CHARACTER FIDELITY: Maintain character identity (${name}, ${ageEn}, ${physDescEn}). Ensure authentic Brazilian/Latina facial features, real human skin with natural pores and subtle sheen, and realistic human proportions.
4. MAXIMUM REALISM: Specify candid amateur iPhone camera aesthetics, natural ambient room lighting, authentic visible skin pores, unedited real-life look, sharp focus. NEVER mention cartoon, 3D render, anime, CGI, porcelain skin, or digital art.
5. CLEAN OUTPUT: Return ONLY the final prompt string in English. No introductory text, no markdown formatting, no quotation marks.`,
          temperature: 0.15,
        },
        contents: `Character Data:
- Name: ${name}
- Age: ${ageEn}
- Physical Description: ${physDescEn}
- Current Scenario: ${scenarioEn}

User Request in Chat (Portuguese): "${userPrompt || ''}"
Character's Chat Reply: "${characterReply || ''}"
Recent Chat Context:
${cleanHistory}

Draft Tag (if any): "${rawPromptTag || ''}"

Generated 100% English Photorealistic Prompt:`,
      })

      const generated = synthRes.text?.trim().replace(/^["']|["']$/g, '').trim()
      // Verify generated text is clean English and not an error or Portuguese string
      if (generated && generated.length > 30 && !generated.startsWith('{') && !/(?:anos|voc[eê]|foto\s+sua|pode\s+me|manda)/i.test(generated)) {
        return generated
      }
    } catch (llmErr) {
      console.warn('[Prompt Synthesizer] LLM synthesis fallback to rule-based prompt:', llmErr?.message || llmErr)
    }
  }

  return fallbackPrompt
}

app.post('/api/generate-photo', express.json(), async (request, response) => {
  try {
    const { prompt, character, scenario, context, userPrompt, characterReply, conversationHistory } = request.body || {}
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
      scenario || character?.scenario,
      ai
    )

    if (matchedRef) {
      console.log(`[Reference Match] Matched asset "${matchedRef.filename}" (${matchedRef.matchReason}) for request: "${effectiveUserRequest}"`)
    } else {
      console.log(`[Reference Match] No reference image found in assets folder, generating purely from prompt.`)
    }

    // 2. Synthesize a pristine, 100% PURE ENGLISH photographic prompt (no Portuguese, no raw quotes)
    const refinedPrompt = await synthesizePhotorealisticPrompt({
      userPrompt: effectiveUserRequest,
      rawPromptTag: prompt,
      character,
      scenario,
      characterReply,
      conversationHistory,
      aiClient: ai,
    })

    console.log(`[Photo Prompt Synthesized] Pure English Prompt: "${refinedPrompt}"`)

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
            const refGuidance = `[REFERENCE IMAGE GUIDANCE:
Use the attached reference photo (${matchedRef.filename}) exclusively as a baseline for facial structure, pose, composition, and ambient room lighting.
STRICT USER OVERRIDE & PHOTOREALISM:
- Fulfill the specific requested scene and outfit: ${refinedPrompt}
- Style: Authentic candid smartphone photograph shot on iPhone 15 Pro, real human skin with natural pores, natural room lighting.]
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
