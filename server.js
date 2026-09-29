import express from 'express'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { createServer as createViteServer } from 'vite'

const app = express()
const port = Number(process.env.PORT || 3000)
const host = '0.0.0.0'
const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434'
const model = process.env.OLLAMA_MODEL || 'hf.co/HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive:Q4_K_M'
const root = path.dirname(fileURLToPath(import.meta.url))
const isProduction = process.env.NODE_ENV === 'production'

// Dynamically import @google/genai if available (prevents ERR_MODULE_NOT_FOUND on pure local Ollama)
let GoogleGenAI = null
try {
  const genaiModule = await import('@google/genai')
  GoogleGenAI = genaiModule.GoogleGenAI
} catch {
  // @google/genai is optional when running local Ollama only
}

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

const rawKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY || process.env.VITE_GEMINI_API_KEY
const geminiApiKey = rawKey && rawKey !== 'MY_GEMINI_API_KEY' ? rawKey.trim() : null

const ai = GoogleGenAI
  ? new GoogleGenAI({
      ...(geminiApiKey ? { apiKey: geminiApiKey } : {}),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null

app.use('/assets', express.static(path.join(root, 'assets')))
app.use('/public/assets', express.static(path.join(root, 'public/assets')))

// Helper to get realism reference image from assets/ref.jpeg
function getReferenceImagePart() {
  try {
    const possiblePaths = [
      path.join(root, 'assets', 'ref.jpeg'),
      path.join(root, 'assets', 'ref.jpg'),
      path.join(root, 'public', 'assets', 'ref.jpeg'),
      path.join(root, 'src', 'assets', 'ref.jpeg'),
    ]
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        const buffer = fs.readFileSync(p)
        return {
          inlineData: {
            mimeType: 'image/jpeg',
            data: buffer.toString('base64'),
          },
          path: p,
          sizeKB: (buffer.length / 1024).toFixed(1),
        }
      }
    }
  } catch (err) {
    console.warn('[Reference Image] Error reading assets/ref.jpeg:', err)
  }
  return null
}

app.get('/api/reference-image-info', (req, res) => {
  const ref = getReferenceImagePart()
  res.json({
    exists: Boolean(ref),
    url: ref ? '/assets/ref.jpeg' : null,
    filename: 'ref.jpeg',
    sizeKB: ref?.sizeKB || null,
    description: 'Imagem de referência de realismo (assets/ref.jpeg) ativa para guiar textura de pele, iluminação e fotografia.',
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

  if (ai) {
    return response.status(200).json({ connected: true, provider: 'gemini', model: 'gemini-3.1-flash-lite' })
  }

  return response.status(503).json({ connected: false, model })
})

export const AVAILABLE_IMAGE_MODELS = [
  {
    id: 'gemini-3-pro-image',
    name: 'Gemini 3 Pro Image',
    alias: 'Nano Banana Pro',
    badge: 'Pro 2K · Ultra-Realismo',
    description: 'Máxima fidelidade fotográfica, micro-detalhes de textura de pele e poros, iluminação ambiente natural realista e resolução 2K nativa.',
    family: 'gemini',
    resolution: '2K',
    recommended: true,
  },
  {
    id: 'gemini-3.1-flash-image',
    name: 'Gemini 3.1 Flash Image',
    alias: 'Nano Banana 2',
    badge: 'Flash 2K · Rápido',
    description: 'Alta qualidade e rapidez na geração de fotografias realistas com suporte a 2K e excelente consistência visual.',
    family: 'gemini',
    resolution: '2K',
    recommended: false,
  },
  {
    id: 'gemini-3.1-flash-lite-image',
    name: 'Gemini 3.1 Flash Lite Image',
    alias: 'Nano Banana Lite',
    badge: 'Lite · Econômico',
    description: 'Modelo leve para geração rápida de fotos com baixo consumo de recursos.',
    family: 'gemini',
    resolution: '1K',
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
          defaultImageModel: 'gemini-3-pro-image',
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
      imageModels: AVAILABLE_IMAGE_MODELS,
      defaultImageModel: 'gemini-3-pro-image',
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
    imageModels: AVAILABLE_IMAGE_MODELS,
    defaultImageModel: 'gemini-3-pro-image',
  })
})

async function callGemini(selectedModel, prompt, filteredHistory, activeSystemPrompt) {
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
    for (let attempt = 0; attempt < 2; attempt++) {
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
        console.warn(`Model ${currentModel} (attempt ${attempt + 1}) failed, retrying/falling back...`, err?.message || err)
        await new Promise((resolve) => setTimeout(resolve, 600))
      }
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
    if (ai) {
      try {
        const geminiResult = await callGemini('gemini-3.1-flash-lite', prompt, filteredHistory, activeSystemPrompt)
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
      const geminiResult = await callGemini('gemini-3.1-flash-lite', prompt, filteredHistory, activeSystemPrompt)
      return response.json(geminiResult)
    } catch (geminiError) {
      return response.status(500).json({ error: geminiError instanceof Error ? geminiError.message : 'Erro ao processar.' })
    }
  }

  return response.status(503).json({
    error: `Serviço de IA indisponível. Verifique o Ollama local ou a chave de API.`,
  })
})

app.post('/api/generate-photo', express.json(), async (request, response) => {
  try {
    const { prompt, character, scenario, context, userPrompt, characterReply, conversationHistory } = request.body || {}
    const charName = character?.name || 'Personagem'
    const charAge = character?.age || '22 anos'
    const physDesc = character?.physicalDescription || 'Brazilian woman, natural beauty, expressive eyes, attractive, realistic look'
    const charTemp = character?.temperament || 'Natural and expressive'
    const charScenario = scenario || character?.scenario || 'cozy bedroom relaxing'
    const effectiveUserRequest = userPrompt || prompt || context || 'Manda uma foto'
    const effectiveCharReply = characterReply || ''

    let historySummary = ''
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      historySummary = conversationHistory.slice(-8).map(m => `${m.role === 'user' ? 'User' : (m.senderName || 'Character')}: ${m.content}`).join('\n')
    } else if (typeof context === 'string' && context.trim()) {
      historySummary = context
    }

    // 1. Analyze consent, subject, and build high-fidelity prompt with Gemini
    let shouldGenerate = true
    const isExplicitCharacterRequest = /(?:foto\s+sua|selfie|voc[eê]|sua\s+foto|foto\s+de\s+vc|foto\s+de\s+voc[eê]|tomando\s+banho|deitada|seu\s+rosto|seu\s+corpo|voc[eê]\s+aqui|como\s+voc[eê]\s+t[aá]|uma\s+foto\s+tua|manda\s+uma\s+foto)/i.test(effectiveUserRequest)
    
    // Default photorealistic prompt with strict Brazilian/Latina ethnicity and human skin texture
    let refinedPrompt = isExplicitCharacterRequest
      ? `Authentic candid raw smartphone selfie photograph, taken on an iPhone 15 Pro front camera, natural ambient room lighting, realistic shot of ${charName}, ${physDesc}, in ${charScenario}, looking at camera, authentic Brazilian Latina woman with natural Latina facial features, natural warm brown eyes with natural double eyelids, real human skin with visible fine pores and subtle natural texture, natural hair with loose strands, unedited amateur real life photo, sharp focus. No 3D render, no CGI, no porcelain doll, no smooth plastic skin, no anime, no manga, no East Asian features, no K-pop aesthetic, no digital art, no videogame graphics`
      : `Authentic candid raw smartphone photograph, taken with an iPhone 15 Pro, first-person POV shot of ${effectiveUserRequest}, in ${charScenario}, natural real-world lighting, fine textures, photorealistic documentary style, sharp focus, unedited real life photo. No 3D render, no CGI, no cartoon, no digital illustration`

    if (ai) {
      const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash']
      for (const modelName of modelsToTry) {
        try {
          const evalRes = await ai.models.generateContent({
            model: modelName,
            config: {
              systemInstruction: `You are a world-class realistic photography director and prompt engineer for a WhatsApp roleplay simulation.
Analyze the user request, the character reply, and the chat history. Decide if an image should actually be generated and write the exact ultra-photorealistic image generation prompt.

CRITICAL RULES:
1. CONSENT & WILLINGNESS CHECK:
   - Check the character's reply and mood: If the character REFUSED, declined, is angry/annoyed, says no (e.g. "Nem pensar", "Não vou mandar nada", "Agora não", "Tô brava", "Sai fora", "Nem a pau", "Esquece", "Não quero"), you MUST set "shouldGenerate": false.
   - If the character AGREED, accepted, or sent the picture (e.g. "Tá bom, vou mandar", "Olha aí", "Tirei essa agora", "Espera aí que já te mando", "Aqui ó", or included a [FOTO] tag), set "shouldGenerate": true.

2. SUBJECT IDENTIFICATION (STRICT SEPARATION):
   - OBJECT / VEHICLE / SCENERY / PLACE / FOOD / ANIMAL:
     If the user asked for an object, car, motorcycle, room, food, view, beach, pet, street (e.g. "foto do carro", "foto da pizza", "foto do seu cachorro", "foto da praia"):
     The imagePrompt MUST depict ONLY that requested object/vehicle/place in first-person POV smartphone camera perspective. DO NOT include the character or any random person!
   - CHARACTER / PERSON SELFIE:
     ONLY when the user explicitly asked for a photo of the person/character herself/himself (e.g. "foto sua", "uma selfie sua", "foto sua agora tomando banho", "foto de você na cama", "selfie"):
     Generate an authentic, raw smartphone selfie of the character matching the exact physical attributes and ethnicity.

3. STRICT ETHNICITY & FACIAL ATTRIBUTE FIDELITY (PREVENT ASIAN / ANIME BIAS):
   - You MUST faithfully translate and strictly maintain the character's exact nationality and ethnicity (e.g., Brazilian Latina woman, Brazilian man, etc.).
   - NEVER default to East Asian, Japanese, Korean, K-pop, or anime faces!
   - DO NOT use ambiguous words like "almond eyes" which trigger Asian bias. Instead, describe: "authentic Brazilian Latina facial morphology, expressive warm dark eyes with natural double eyelids and natural lashes, natural Brazilian light-tan/olive skin tone, natural full lips, authentic Brazilian/Latina facial bone structure".
   - Age fidelity: Exactly match the character's specified age (${charAge}) with age-appropriate natural facial characteristics (e.g. 20, 22, 23, 42, 46 years old).
   - Hair & Physical traits: Precisely match the character's hair color, hair length, hair texture (${physDesc}), and body type.

4. ULTRA-PHOTOREALISM & HUMAN SKIN TEXTURE:
   - The photo MUST look 100% like an authentic, amateur, unedited photo taken with an iPhone 15 Pro front camera (selfie) in everyday ambient room/natural light.
   - Genuine human skin: realistic visible micro-pores, natural skin texture, subtle natural blemishes, fine skin tone variations, natural shadows and real ambient reflections.
   - Hair: natural real strands with slight flyaways and natural parting.
   - Lighting: natural realistic indoor or outdoor room lighting matching the scenario (${charScenario}).
   - NO AI SLOP / ANTI-PLASTIC MANDATE: Include explicit negative terms: "no 3D render, no CGI, no porcelain doll, no plastic skin, no airbrushing, no digital art, no videogame graphics, no anime, no manga, no East Asian features, no heavy glamour makeup filter, no fake studio backdrop".

Return valid JSON with these keys:
{
  "shouldGenerate": boolean,
  "reason": string,
  "subjectType": "object" | "character",
  "imagePrompt": string
}`,
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
            contents: `Character Profile:
- Name: ${charName}
- Age: ${charAge}
- Physical Appearance & Features: ${physDesc}
- Temperament: ${charTemp}
- Current Scenario/Location: ${charScenario}

Recent Conversation History:
${historySummary || 'User asked for a photo'}

User Request for photo:
"${effectiveUserRequest}"

Character Reply in chat:
"${effectiveCharReply}"`,
          })

          if (evalRes.text) {
            try {
              const parsed = JSON.parse(evalRes.text.trim())
              if (parsed.shouldGenerate === false) {
                shouldGenerate = false
                return response.json({
                  success: true,
                  shouldGenerate: false,
                  reason: parsed.reason || 'Character refused photo request',
                  imageUrl: null,
                })
              }
              if (parsed.imagePrompt && parsed.imagePrompt.trim().length > 15) {
                refinedPrompt = parsed.imagePrompt.trim()
                shouldGenerate = true
                break
              }
            } catch (jsonErr) {
              console.warn('JSON parse warning on photo evaluation:', jsonErr)
            }
          }
        } catch (err) {
          console.warn(`Gemini photo prompt evaluation (${modelName}) warning:`, err?.message || err)
        }
      }
    }

    if (!shouldGenerate) {
      return response.json({
        success: true,
        shouldGenerate: false,
        imageUrl: null,
      })
    }

    // 2. Synthesize ultra-high quality realistic image with Google Gemini Nano Banana / Imagen models
    let imageUrl = null
    let usedModel = null

    const requestedImageModel = typeof request.body?.imageModel === 'string' && request.body.imageModel.trim() && request.body.imageModel !== 'flux'
      ? request.body.imageModel.trim()
      : 'gemini-3-pro-image'

    if (ai) {
      // Prioritize the user's selected Gemini image model first, then fallback to other Gemini models
      const imageModels = [
        requestedImageModel,
        'gemini-3.1-flash-image',
        'gemini-3-pro-image',
        'gemini-3.1-flash-lite-image',
      ].filter((v, i, a) => a.indexOf(v) === i)

      const refImage = getReferenceImagePart()
      for (const imgModel of imageModels) {
        try {
          const isProOrFlash = imgModel === 'gemini-3-pro-image' || imgModel === 'gemini-3.1-flash-image'
          const imgConfig = {
            imageConfig: {
              aspectRatio: '3:4',
              ...(isProOrFlash ? { imageSize: '2K' } : {}),
            },
          }

          const parts = []
          if (refImage?.inlineData?.data) {
            parts.push({
              inlineData: {
                mimeType: refImage.inlineData.mimeType || 'image/jpeg',
                data: refImage.inlineData.data,
              },
            })
          }
          parts.push({
            text: `Use the realism, real skin texture with visible skin pores, and natural lighting of the reference as the photorealistic baseline. Generate: ${refinedPrompt}`,
          })

          let imgRes = null
          try {
            imgRes = await ai.models.generateContent({
              model: imgModel,
              contents: {
                parts,
              },
              config: imgConfig,
            })
          } catch (multiPartErr) {
            // Text-only direct generation with Gemini
            imgRes = await ai.models.generateContent({
              model: imgModel,
              contents: {
                parts: [
                  {
                    text: `${refinedPrompt}. Visual style & realism standard: authentic real human skin texture with natural pores, natural Latina facial features, documentary room lighting, unedited raw smartphone photo taken on iPhone 15 Pro, 35mm lens.`,
                  },
                ],
              },
              config: imgConfig,
            })
          }

          for (const cand of imgRes?.candidates || []) {
            for (const part of cand.content?.parts || []) {
              if (part.inlineData && part.inlineData.data) {
                const mime = part.inlineData.mimeType || 'image/jpeg'
                const cleanBase64 = String(part.inlineData.data).replace(/\s+/g, '').trim()
                imageUrl = `data:${mime};base64,${cleanBase64}`
                usedModel = imgModel
                break
              }
            }
            if (imageUrl) break
          }

          if (imageUrl) {
            console.log(`[Photo Generation] Successfully generated realistic photo using Gemini model: ${imgModel}`)
            break
          }
        } catch (imgErr) {
          console.warn(`[Photo Generation] Model ${imgModel} attempt warning:`, imgErr?.message || imgErr)
        }
      }
    }

    if (!imageUrl) {
      return response.status(500).json({
        success: false,
        error: 'Não foi possível gerar a foto com o Gemini. Verifique a chave de API ou tente novamente.',
        shouldGenerate: false,
      })
    }

    return response.json({
      success: true,
      shouldGenerate: true,
      imageUrl,
      model: usedModel,
      prompt: refinedPrompt,
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
  if (ai) {
    console.log(`Gemini cloud engine active`)
  }
})
