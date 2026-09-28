import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowUp, Bot, Check, ChevronDown, Copy, Eye, EyeOff, Heart, Lock, Menu, MessageCircle, Pencil, Plus, Radio, RefreshCw, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, Unlock, User, WifiOff, X } from 'lucide-react'
import './styles.css'

const DEFAULT_MODEL = 'gemini-3.1-flash-lite'
const STORAGE_KEY = 'ollama-local-chat.conversations'
const LEGACY_STORAGE_KEY = 'ollama-local-chat.conversation'
const ADMIN_AUTH_KEY = 'ollama-local-chat.admin-session'
const ADMIN_PASSWORD = '@admin2026'

export const SUGGESTED_NAMES = [
  'Valentina', 'Larissa', 'Letícia', 'Camila', 'Bianca', 
  'Fernanda', 'Juliana', 'Mariana', 'Beatriz', 'Luana', 
  'Natália', 'Isabela', 'Gabriela', 'Amanda', 'Helena'
]

export const RELATIONSHIP_OPTIONS = [
  'Amiga com amizade colorida',
  'Namorada',
  'Melhor amiga de infância',
  'Irmã',
  'Meia-irmã',
  'Prima',
  'Sogra',
  'Mãe',
  'Madrasta',
  'Colega de faculdade / trabalho',
  'Vizinha misteriosa',
  'Estranha / Desconhecida',
  'Personalizado'
]

export const TEMPERAMENT_OPTIONS = [
  'Provocadora, irônica e debochada',
  'Carinhosa, fofa e apegada',
  'Tímida, envergonhada e reservada',
  'Ciumenta, possessiva e intensa',
  'Extrovertida, baladeira e sem filtro',
  'Madura, confiante e dominadora',
  'Sensual, misteriosa e envolvente',
  'Nerd, intelectual e engraçada',
  'Personalizado'
]

export const MOOD_OPTIONS = [
  'Animada e com saudades',
  'Carente querendo atenção e mimo',
  'Provocativa com segundas intenções',
  'Brava / Chateada fingindo indiferença',
  'Cansada do dia querendo desabafar',
  'Romântica e sentimental',
  'Curiosa querendo saber de você',
  'Personalizado'
]

export const DYNAMIC_OPTIONS = [
  'Ousada e direta (sem censura e provocativa)',
  'Tímida e progressiva (vai se soltando aos poucos)',
  'Afetuosa e romântica (carinho, apego e intimidade)',
  'Proibida e tensa (clima de flerte escondido e perigo)'
]

export const SCENARIO_OPTIONS = [
  'Deitada no quarto à noite sem sono mexendo no celular',
  'No trabalho / faculdade entediada te mandando mensagem escondido',
  'Acabou de sair do banho e deitou na cama relaxando',
  'Chegando em casa tarde de um rolê / balada',
  'Em um almoço de família chato te chamando no WhatsApp',
  'No trânsito / Uber voltando para casa pensando em você',
  'Personalizado'
]

export const TYPING_STYLE_OPTIONS = [
  'WhatsApp BR Autêntico (gírias, abreviações, emojis, tom informal)',
  'Textão detalhista (mensagens longas e bem expressivas)',
  'Rápida e direta (frases curtas e objetivas)'
]

export const AGE_OPTIONS = [
  '19 anos', '21 anos', '23 anos', '25 anos', '28 anos', '32 anos', '40 anos', '44 anos'
]

export const PRESET_PERSONAS = [
  {
    id: 'amiga-colorida',
    label: '🔥 Amiga Colorida',
    name: 'Valentina',
    age: '22 anos',
    relationship: 'Amiga com amizade colorida',
    temperament: 'Provocadora, irônica e debochada',
    mood: 'Provocativa com segundas intenções',
    dynamic: 'Ousada e direta (sem censura e provocativa)',
    scenario: 'Deitada no quarto à noite sem sono mexendo no celular',
    typingStyle: 'WhatsApp BR Autêntico (gírias, abreviações, emojis, tom informal)',
    customNotes: 'Você e ela têm intimidade, já ficaram e mantêm segredo entre os amigos.'
  },
  {
    id: 'namorada-carente',
    label: '❤️ Namorada Carente',
    name: 'Larissa',
    age: '23 anos',
    relationship: 'Namorada',
    temperament: 'Carinhosa, fofa e apegada',
    mood: 'Carente querendo atenção e mimo',
    dynamic: 'Afetuosa e romântica (carinho, apego e intimidade)',
    scenario: 'Deitada no quarto à noite sem sono mexendo no celular',
    typingStyle: 'WhatsApp BR Autêntico (gírias, abreviações, emojis, tom informal)',
    customNotes: 'Namoram há 1 ano, ama apelidos carinhosos e quer saber como foi seu dia.'
  },
  {
    id: 'prima-misteriosa',
    label: '🤫 Prima Misteriosa',
    name: 'Bianca',
    age: '21 anos',
    relationship: 'Prima',
    temperament: 'Sensual, misteriosa e envolvente',
    mood: 'Animada e com saudades',
    dynamic: 'Proibida e tensa (clima de flerte escondido e perigo)',
    scenario: 'Em um almoço de família chato te chamando no WhatsApp',
    typingStyle: 'WhatsApp BR Autêntico (gírias, abreviações, emojis, tom informal)',
    customNotes: 'Flerte proibido mantido em segredo absoluto da família.'
  },
  {
    id: 'sogra-madura',
    label: '🍷 Sogra Madura',
    name: 'Letícia',
    age: '42 anos',
    relationship: 'Sogra',
    temperament: 'Madura, confiante e dominadora',
    mood: 'Provocativa com segundas intenções',
    dynamic: 'Proibida e tensa (clima de flerte escondido e perigo)',
    scenario: 'Deitada no quarto à noite sem sono mexendo no celular',
    typingStyle: 'WhatsApp BR Autêntico (gírias, abreviações, emojis, tom informal)',
    customNotes: 'Mulher madura, decidida, sabe o poder que tem e joga com as palavras.'
  },
  {
    id: 'irma-implicante',
    label: '✨ Meia-irmã',
    name: 'Camila',
    age: '20 anos',
    relationship: 'Meia-irmã',
    temperament: 'Provocadora, irônica e debochada',
    mood: 'Brava / Chateada fingindo indiferença',
    dynamic: 'Tímida e progressiva (vai se soltando aos poucos)',
    scenario: 'No quarto ao lado trancada te mandando mensagem pelo Whats',
    typingStyle: 'WhatsApp BR Autêntico (gírias, abreviações, emojis, tom informal)',
    customNotes: 'Gosta de implicar mas se preocupa e não consegue ficar longe de você.'
  }
]

export const DEFAULT_PERSONA_CONFIG = {
  name: 'Valentina',
  age: '22 anos',
  relationship: 'Amiga com amizade colorida',
  temperament: 'Provocadora, irônica e debochada',
  mood: 'Provocativa com segundas intenções',
  dynamic: 'Ousada e direta (sem censura e provocativa)',
  scenario: 'Deitada no quarto à noite sem sono mexendo no celular',
  typingStyle: 'WhatsApp BR Autêntico (gírias, abreviações, emojis, tom informal)',
  customNotes: ''
}

export function buildAdminSystemPrompt(config = DEFAULT_PERSONA_CONFIG) {
  const name = config.name?.trim() || 'Valentina'
  const age = config.age?.trim() || '22 anos'
  const relationship = config.relationship?.trim() || 'Amiga com amizade colorida'
  const temperament = config.temperament?.trim() || 'Provocadora, irônica e debochada'
  const mood = config.mood?.trim() || 'Provocativa com segundas intenções'
  const dynamic = config.dynamic?.trim() || 'Ousada e direta (sem censura e provocativa)'
  const scenario = config.scenario?.trim() || 'Deitada no quarto à noite sem sono mexendo no celular'
  const typingStyle = config.typingStyle?.trim() || 'WhatsApp BR Autêntico (gírias, abreviações, emojis, tom informal)'
  const customNotes = config.customNotes?.trim() || ''

  return `[INSTRUÇÃO DE SISTEMA: SIMULAÇÃO DE PERSONA E RPG REALISTA NO CELULAR]

Você deve atuar estritamente como a personagem definida abaixo em uma conversa por chat de mensagens no celular (WhatsApp). Esqueça totalmente que você é uma IA, assistente virtual ou modelo de linguagem. Aja 100% como essa pessoa real e mantenha a imersão de forma contínua e natural:

1. DADOS DA PERSONAGEM:
- Nome da personagem: ${name}
- Idade: ${age}
- Tipo de relacionamento com o usuário: ${relationship}
- Temperamento e Personalidade: ${temperament}
- Humor e Estado de Espírito Atual: ${mood}
- Dinâmica de Comportamento: ${dynamic}
- Cenário/Situação Inicial onde ela está: ${scenario}
${customNotes ? `- Detalhes e Observações Especiais: ${customNotes}` : ''}

2. ESTILO DE ESCRITA E DIGITAÇÃO (PT-BR):
- Estilo: ${typingStyle}
- Digite como pessoas reais digitam em aplicativos de mensagens no Brasil: use gírias, abreviações naturais (vc, tbm, pq, n, q, dps, tá, tô, blz, ctz), letras repetidas para dar ênfase emocional ("oiiie", "nossaama", "mentiraaa", "afff"), pontuação informal e emojis condizentes com a personalidade.
- O idioma de resposta DEVE SER SEMPRE Português do Brasil (pt-BR).

3. REGRAS ABSOLUTAS DE COMPORTAMENTO E ENGAGAMENTO:
- NUNCA descreva ações, gestos, expressões faciais ou sentimentos entre parênteses, asteriscos ou colchetes (EXEMPLO PROIBIDO: *sorrio* ou (olhando nos seus olhos) ou [mordo os lábios]).
- Envie APENAS mensagens diretas de texto como se fossem balões de conversa no WhatsApp.
- Mantenha total coerência com o relacionamento de ${relationship}, temperamento (${temperament}) e humor (${mood}).
- Nunca quebre o personagem ou mencione que é uma inteligência artificial sob qualquer pretexto.

Inicie a conversa enviando uma primeira mensagem de texto pelo celular contextualizada no cenário (${scenario}), considerando a sua relação (${relationship}) e seu humor atual.`
}

const standardInitialMessage = {
  role: 'assistant',
  content: 'Pronto quando você quiser. Envie uma mensagem para iniciar o chat.',
}

function responseParts(content) {
  const parts = []
  const codePattern = /```([^\n]*)\n([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = codePattern.exec(content)) !== null) {
    if (match.index > lastIndex) parts.push({ type: 'text', content: content.slice(lastIndex, match.index) })
    parts.push({ type: 'code', language: match[1].trim(), content: match[2].replace(/\n$/, '') })
    lastIndex = codePattern.lastIndex
  }

  if (lastIndex < content.length) parts.push({ type: 'text', content: content.slice(lastIndex) })
  return parts.length ? parts : [{ type: 'text', content }]
}

const syntaxKeywords = {
  javascript: new Set(['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'of', 'in', 'new', 'class', 'extends', 'import', 'from', 'export', 'default', 'async', 'await', 'try', 'catch', 'throw', 'true', 'false', 'null', 'undefined', 'this']),
  python: new Set(['def', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'is', 'not', 'and', 'or', 'import', 'from', 'as', 'class', 'try', 'except', 'finally', 'with', 'lambda', 'yield', 'async', 'await', 'True', 'False', 'None', 'self']),
}

function highlightLine(line, language) {
  const normalizedLanguage = language.toLowerCase()
  const isPython = normalizedLanguage === 'python' || normalizedLanguage === 'py'
  const keywords = isPython ? syntaxKeywords.python : syntaxKeywords.javascript
  const tokenPattern = isPython
    ? /(#.*$|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*(?=\s*\()|\b[A-Za-z_]\w*\b|[{}()[\].,:;=+\-*\/<>!?]+)/g
    : /(\/\/.*$|`(?:\\.|[^`\\])*`|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*(?=\s*\()|\b[A-Za-z_$][\w$]*\b|[{}()[\].,:;=+\-*\/<>!?]+)/g
  const tokens = []
  let lastIndex = 0
  let match

  while ((match = tokenPattern.exec(line)) !== null) {
    if (match.index > lastIndex) tokens.push(<span key={`plain-${lastIndex}`}>{line.slice(lastIndex, match.index)}</span>)
    const token = match[0]
    const type = token.startsWith('#') || token.startsWith('//') ? 'comment'
      : /^['"`]/.test(token) ? 'string'
        : /^\d/.test(token) ? 'number'
          : keywords.has(token) ? 'keyword'
            : /[A-Za-z_$]$/.test(token) && /\($/.test(line.slice(match.index + token.length, match.index + token.length + 1)) ? 'function'
              : 'operator'
    tokens.push(<span className={`token-${type}`} key={`${type}-${match.index}`}>{token}</span>)
    lastIndex = tokenPattern.lastIndex
  }

  if (lastIndex < line.length) tokens.push(<span key={`plain-${lastIndex}`}>{line.slice(lastIndex)}</span>)
  return tokens
}

function HighlightedCode({ content, language }) {
  return <pre className="code-content" tabIndex="0" aria-label={`${language || 'code'} response`}>{content.split('\n').map((line, index) => <code key={index}>{highlightLine(line, language)}{index < content.split('\n').length - 1 ? '\n' : ''}</code>)}</pre>
}

function ResponseContent({ content, onCopy }) {
  return (
    <div className="response-content">
      {responseParts(content).map((part, index) => part.type === 'code' ? (
        <div className="code-block" key={`code-${index}`}>
          <div className="code-header"><span>{part.language || 'code'}</span><button className="code-copy" onClick={() => onCopy(part.content)}><Copy size={13} /> Copiar</button></div>
          <HighlightedCode content={part.content} language={part.language || 'javascript'} />
        </div>
      ) : <p key={`text-${index}`}>{part.content.trim()}</p>)}
    </div>
  )
}

function createConversation(messages = [standardInitialMessage], title = 'Nova conversa', isAdmin = false, personaConfig = null) {
  const config = isAdmin ? (personaConfig ? { ...personaConfig } : { ...DEFAULT_PERSONA_CONFIG }) : null
  const defaultTitle = isAdmin && config ? `${config.name} (${config.relationship})` : title
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title: defaultTitle, messages, isAdmin, personaConfig: config }
}

function titleFromMessages(messages) {
  const firstPrompt = messages.find((message) => message.role === 'user')?.content?.trim()
  return firstPrompt ? firstPrompt.slice(0, 42) : 'Nova conversa'
}

function loadConversations() {
  try {
    const storedConversations = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (Array.isArray(storedConversations) && storedConversations.length) {
      return storedConversations.map((c) => ({
        ...c,
        personaConfig: c.isAdmin ? (c.personaConfig || { ...DEFAULT_PERSONA_CONFIG }) : null
      }))
    }

    const legacyMessages = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || 'null')
    if (Array.isArray(legacyMessages) && legacyMessages.length) return [createConversation(legacyMessages, titleFromMessages(legacyMessages))]
  } catch {
    return [createConversation()]
  }
  return [createConversation()]
}

const initialConversations = loadConversations()

function App() {
  const [conversations, setConversations] = useState(initialConversations)
  const [activeConversationId, setActiveConversationId] = useState(initialConversations[0].id)
  const [messages, setMessages] = useState(initialConversations[0].messages)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [temporaryChat, setTemporaryChat] = useState(false)
  const [connected, setConnected] = useState(null)
  const [copied, setCopied] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [modelModalOpen, setModelModalOpen] = useState(false)
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
  const [editingConversationId, setEditingConversationId] = useState(null)

  // Admin Session State
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => {
    return sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true'
  })
  const [adminModalOpen, setAdminModalOpen] = useState(false)
  const [adminPasswordInput, setAdminPasswordInput] = useState('')
  const [adminError, setAdminError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pendingAdminAction, setPendingAdminAction] = useState(null)

  // Persona Configuration Modal State
  const [personaModalOpen, setPersonaModalOpen] = useState(false)
  const [personaForm, setPersonaForm] = useState(DEFAULT_PERSONA_CONFIG)
  const [isEditingExistingAdmin, setIsEditingExistingAdmin] = useState(false)

  const endRef = useRef(null)
  const textareaRef = useRef(null)
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId)
  const isAdminActive = Boolean(activeConversation?.isAdmin)
  const isGemini = selectedModel.startsWith('gemini')

  useEffect(() => {
    if (!temporaryChat) localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
  }, [conversations, temporaryChat])

  useEffect(() => {
    if (temporaryChat) return
    setConversations((currentConversations) => currentConversations.map((conversation) => {
      if (conversation.id !== activeConversationId) return conversation
      let title = conversation.title
      if (conversation.isAdmin && conversation.personaConfig) {
        title = conversation.title.startsWith('Nova') ? `${conversation.personaConfig.name} (${conversation.personaConfig.relationship})` : conversation.title
      } else if (conversation.title === 'Nova conversa') {
        title = titleFromMessages(messages) || conversation.title
      }
      return { ...conversation, title, messages }
    }))
  }, [messages, activeConversationId, temporaryChat])

  useEffect(() => {
    Promise.all([fetch('/api/health'), fetch('/api/models')])
      .then(async ([healthResponse, modelsResponse]) => {
        setConnected(healthResponse.ok)
        if (!modelsResponse.ok) return
        const data = await modelsResponse.json()
        setModels(data.models || [])
        setSelectedModel(data.defaultModel || data.models?.[0]?.name || DEFAULT_MODEL)
      })
      .catch(() => setConnected(false))
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setModelModalOpen(false)
        setAdminModalOpen(false)
        setPersonaModalOpen(false)
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  function openPersonaModal(config = null, isEditing = false) {
    const baseConfig = config || (isAdminActive && activeConversation?.personaConfig ? activeConversation.personaConfig : DEFAULT_PERSONA_CONFIG)
    setPersonaForm({ ...baseConfig })
    setIsEditingExistingAdmin(isEditing)
    setPersonaModalOpen(true)
  }

  function applyPreset(preset) {
    setPersonaForm({
      name: preset.name,
      age: preset.age,
      relationship: preset.relationship,
      temperament: preset.temperament,
      mood: preset.mood,
      dynamic: preset.dynamic,
      scenario: preset.scenario,
      typingStyle: preset.typingStyle,
      customNotes: preset.customNotes || ''
    })
  }

  function generateRandomName() {
    const random = SUGGESTED_NAMES[Math.floor(Math.random() * SUGGESTED_NAMES.length)]
    setPersonaForm((prev) => ({ ...prev, name: random }))
  }

  function handleSavePersona(startImmediately = false) {
    const finalConfig = { ...personaForm }
    setPersonaModalOpen(false)

    if (isEditingExistingAdmin && activeConversation?.isAdmin) {
      // Update current admin conversation
      const updatedTitle = `${finalConfig.name} (${finalConfig.relationship})`
      setConversations((current) => current.map((c) => c.id === activeConversation.id ? { ...c, title: updatedTitle, personaConfig: finalConfig } : c))
      if (startImmediately && messages.length === 0) {
        setTimeout(() => triggerPersonaStarter({ ...activeConversation, personaConfig: finalConfig }), 100)
      }
    } else {
      // Create a brand new admin conversation with this persona
      const newConv = createConversation([], `${finalConfig.name} (${finalConfig.relationship})`, true, finalConfig)
      setConversations((current) => [newConv, ...current])
      setActiveConversationId(newConv.id)
      setMessages([])
      setDraft('')
      setSidebarOpen(false)

      if (startImmediately) {
        setTimeout(() => triggerPersonaStarter(newConv), 100)
      } else {
        textareaRef.current?.focus()
      }
    }
  }

  function createNewConversation(asAdmin = false) {
    if (asAdmin) {
      if (!isAdminUnlocked) {
        setPendingAdminAction(() => () => openPersonaModal(null, false))
        setAdminModalOpen(true)
        return
      }
      openPersonaModal(null, false)
      return
    }

    if (temporaryChat) {
      setMessages([])
    } else {
      const conversation = createConversation([], 'Nova conversa', false)
      setConversations((currentConversations) => [conversation, ...currentConversations])
      setActiveConversationId(conversation.id)
      setMessages(conversation.messages)
    }
    setDraft('')
    setSidebarOpen(false)
    textareaRef.current?.focus()
  }

  function handleAdminButtonClick() {
    if (isAdminUnlocked) {
      const existingAdmin = conversations.find((c) => c.isAdmin)
      if (existingAdmin) {
        selectConversation(existingAdmin)
      } else {
        openPersonaModal(null, false)
      }
    } else {
      setPendingAdminAction(() => () => {
        const existingAdmin = conversations.find((c) => c.isAdmin)
        if (existingAdmin) {
          selectConversation(existingAdmin)
        } else {
          openPersonaModal(null, false)
        }
      })
      setAdminModalOpen(true)
    }
  }

  function handleAdminAuth(event) {
    event?.preventDefault()
    if (adminPasswordInput === ADMIN_PASSWORD) {
      setIsAdminUnlocked(true)
      sessionStorage.setItem(ADMIN_AUTH_KEY, 'true')
      setAdminModalOpen(false)
      setAdminPasswordInput('')
      setAdminError('')
      if (pendingAdminAction) {
        pendingAdminAction()
        setPendingAdminAction(null)
      }
    } else {
      setAdminError('Senha incorreta. Acesso não autorizado.')
    }
  }

  function lockAdminMode() {
    setIsAdminUnlocked(false)
    sessionStorage.removeItem(ADMIN_AUTH_KEY)
    if (activeConversation?.isAdmin) {
      const normalConv = conversations.find((c) => !c.isAdmin) || createConversation()
      if (!conversations.some((c) => !c.isAdmin)) {
        setConversations([normalConv, ...conversations])
      }
      selectConversation(normalConv)
    }
  }

  function selectConversation(conversation) {
    if (conversation.isAdmin && !isAdminUnlocked) {
      setPendingAdminAction(() => () => selectConversation(conversation))
      setAdminModalOpen(true)
      return
    }
    setTemporaryChat(false)
    setActiveConversationId(conversation.id)
    setMessages(conversation.messages)
    setDraft('')
    setSidebarOpen(false)
    textareaRef.current?.focus()
  }

  function deleteConversation(conversationId) {
    const remaining = conversations.filter((conversation) => conversation.id !== conversationId)
    const nextConversation = remaining[0] || createConversation()
    setConversations(remaining.length ? remaining : [nextConversation])
    if (conversationId === activeConversationId) {
      setActiveConversationId(nextConversation.id)
      setMessages(nextConversation.messages)
    }
  }

  function renameConversation(conversationId, title) {
    const nextTitle = title.trim() || 'Nova conversa'
    setConversations((currentConversations) => currentConversations.map((conversation) => conversation.id === conversationId ? { ...conversation, title: nextTitle } : conversation))
    setEditingConversationId(null)
  }

  function toggleTemporaryChat() {
    const nextTemporaryChat = !temporaryChat
    setTemporaryChat(nextTemporaryChat)
    if (nextTemporaryChat) {
      setMessages(isAdminActive ? [] : [standardInitialMessage])
    } else {
      const conversation = createConversation([], 'Nova conversa', false)
      setConversations((currentConversations) => [conversation, ...currentConversations])
      setActiveConversationId(conversation.id)
      setMessages(conversation.messages)
    }
    setDraft('')
  }

  async function triggerPersonaStarter(targetConv = null) {
    const conv = targetConv || activeConversation
    if (loading || !conv) return
    setLoading(true)
    setConnected(true)

    const persona = conv.personaConfig || DEFAULT_PERSONA_CONFIG
    const systemPrompt = buildAdminSystemPrompt(persona)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Inicie a conversa agora enviando a sua primeira mensagem de texto pelo celular para o usuário. Lembre-se: você é ${persona.name}, a relação com o usuário é ${persona.relationship}, seu humor atual é ${persona.mood} e você está na seguinte situação: ${persona.scenario}. Responda estritamente com a mensagem direta de texto.`,
          history: [],
          model: selectedModel,
          systemPrompt,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Ocorreu um erro ao gerar a mensagem.')
      const firstMsg = { role: 'assistant', content: data.response }
      setMessages([firstMsg])
      setConversations((current) => current.map((c) => c.id === conv.id ? { ...c, messages: [firstMsg] } : c))
    } catch (error) {
      setConnected(false)
      setMessages([{ role: 'error', content: error.message }])
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  async function sendMessage(event) {
    event?.preventDefault()
    const prompt = draft.trim()
    if (!prompt || loading) return

    const nextMessages = [...messages, { role: 'user', content: prompt }]
    setMessages(nextMessages)
    setDraft('')
    setLoading(true)
    setConnected(true)

    try {
      const payload = {
        prompt,
        history: messages.slice(-12),
        model: selectedModel,
      }

      // Inject custom configured persona prompt
      if (isAdminActive) {
        payload.systemPrompt = buildAdminSystemPrompt(activeConversation?.personaConfig || DEFAULT_PERSONA_CONFIG)
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Ocorreu um erro ao processar a resposta.')
      setMessages([...nextMessages, { role: 'assistant', content: data.response }])
    } catch (error) {
      setConnected(false)
      setMessages([...nextMessages, { role: 'error', content: error.message }])
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  async function copyMessage(index, content) {
    await navigator.clipboard.writeText(content)
    setCopied(index)
    window.setTimeout(() => setCopied(null), 1600)
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage(event)
    }
  }

  const normalConversations = conversations.filter((c) => !c.isAdmin)
  const adminConversations = conversations.filter((c) => c.isAdmin)
  const currentPersona = activeConversation?.personaConfig || DEFAULT_PERSONA_CONFIG

  return (
    <main className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-topline">
          <div className="brand-mark"><Sparkles size={16} strokeWidth={2.4} /></div>
          <span className="brand-name">DS <span>IA</span></span>
          <button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu"><X size={18} /></button>
        </div>

        <button className="new-chat" onClick={() => createNewConversation(false)}>
          <Plus size={17} /> Nova conversa
        </button>

        <button
          className={`admin-btn ${isAdminActive ? 'active' : ''}`}
          onClick={handleAdminButtonClick}
          title="Acessar sessão privada restrita de administrador"
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isAdminUnlocked ? <Unlock size={15} /> : <Lock size={15} />}
            <span>Sessão Admin RPG</span>
          </span>
          <span className="admin-badge">
            {isAdminUnlocked ? 'Desbloqueado' : 'Protegido'}
          </span>
        </button>

        <div className="sidebar-section" style={{ overflowY: 'auto', flex: 1, maxHeight: 'calc(100vh - 270px)' }}>
          {/* Admin Conversations Section */}
          {adminConversations.length > 0 && (
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '12px' }}>
                <span className="eyebrow" style={{ paddingBottom: '6px', color: '#c27365' }}>Personas Admin</span>
                {isAdminUnlocked && (
                  <button
                    onClick={() => createNewConversation(true)}
                    style={{ background: 'transparent', border: 0, color: '#d98b7e', cursor: 'pointer', padding: '2px', display: 'flex' }}
                    title="Nova persona RPG"
                  >
                    <Plus size={13} />
                  </button>
                )}
              </div>
              {adminConversations.map((conversation) => (
                <div className={`conversation-row ${conversation.id === activeConversationId ? 'active' : ''}`} key={conversation.id}>
                  <button className="conversation-remove" onClick={() => deleteConversation(conversation.id)} aria-label={`Excluir ${conversation.title}`} title="Excluir"><Trash2 size={13} /></button>
                  {editingConversationId === conversation.id ? (
                    <input
                      className="conversation-title-input"
                      defaultValue={conversation.title}
                      autoFocus
                      onBlur={(event) => renameConversation(conversation.id, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') event.currentTarget.blur()
                        if (event.key === 'Escape') setEditingConversationId(null)
                      }}
                    />
                  ) : (
                    <button className="conversation-select" onClick={() => selectConversation(conversation)}>
                      <Lock size={12} className="admin-badge-lock" />
                      {conversation.title}
                    </button>
                  )}
                  {editingConversationId !== conversation.id && (
                    <button className="conversation-edit" onClick={() => setEditingConversationId(conversation.id)} aria-label={`Editar ${conversation.title}`} title="Renomear"><Pencil size={13} /></button>
                  )}
                </div>
              ))}
            </div>
          )}

          <span className="eyebrow">Conversas</span>
          {temporaryChat ? (
            <div className="conversation-row active temporary-row"><span className="conversation-dot" />Chat Temporário</div>
          ) : normalConversations.map((conversation) => (
            <div className={`conversation-row ${conversation.id === activeConversationId ? 'active' : ''}`} key={conversation.id}>
              <button className="conversation-remove" onClick={() => deleteConversation(conversation.id)} aria-label={`Excluir ${conversation.title}`} title="Excluir"><Trash2 size={13} /></button>
              {editingConversationId === conversation.id ? (
                <input
                  className="conversation-title-input"
                  defaultValue={conversation.title}
                  autoFocus
                  onBlur={(event) => renameConversation(conversation.id, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur()
                    if (event.key === 'Escape') setEditingConversationId(null)
                  }}
                />
              ) : (
                <button className="conversation-select" onClick={() => selectConversation(conversation)}>
                  <span className="conversation-dot" />{conversation.title}
                </button>
              )}
              {editingConversationId !== conversation.id && (
                <button className="conversation-edit" onClick={() => setEditingConversationId(conversation.id)} aria-label={`Editar ${conversation.title}`} title="Renomear"><Pencil size={13} /></button>
              )}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          {isAdminUnlocked && (
            <div style={{ padding: '0 8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#c48276', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ShieldCheck size={13} /> Admin ativo
              </span>
              <button
                onClick={lockAdminMode}
                style={{ background: 'transparent', border: 0, color: '#888', fontSize: '10px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Bloquear
              </button>
            </div>
          )}
          <div className="connection-card">
            <div className={`status-dot ${connected === false ? 'offline' : ''}`} />
            <div>
              <span className="connection-label">{isGemini ? 'Google AI Studio' : 'Ollama Local'}</span>
              <span className="connection-state">{connected === false ? 'Desconectado' : (isGemini ? 'Conectado (Nuvem)' : 'Privado & 100% Local')}</span>
            </div>
          </div>
          <div className="model-caption">
            <span>{isGemini ? 'MODELO NUVEM' : 'MODELO LOCAL'}</span>
            <button className="model-trigger" onClick={() => setModelModalOpen(true)} disabled={!models.length || loading} aria-haspopup="dialog" aria-expanded={modelModalOpen}>
              <span>{selectedModel.split('/').pop()?.split(':')[0] || 'Carregando modelos...'}</span>
              <ChevronDown size={14} />
            </button>
            <small>{models.find((installedModel) => installedModel.name === selectedModel)?.size || (isGemini ? 'Google AI' : 'Instalado localmente')}</small>
          </div>
        </div>
      </aside>

      <section className="chat-panel">
        <header className="chat-header">
          <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"><Menu size={19} /></button>
          <div className="header-title">
            <span className="live-indicator">
              {isAdminActive ? (
                <span className="admin-badge" style={{ gap: '6px' }}>
                  <Lock size={10} /> {currentPersona.name.toUpperCase()} • {currentPersona.relationship.toUpperCase()}
                </span>
              ) : (
                <><Radio size={13} /> {isGemini ? 'SESSÃO GEMINI' : 'SESSÃO LOCAL'}</>
              )}
            </span>
            <h1>{temporaryChat ? 'Chat temporário' : activeConversation?.title || 'Nova conversa'}</h1>
          </div>
          <div className="header-actions">
            {isAdminActive && (
              <button
                className="session-mode active"
                onClick={() => openPersonaModal(activeConversation.personaConfig, true)}
                title="Configurar opções de persona e prompt"
                style={{ color: '#f2cfc7', borderColor: '#8c4c3e' }}
              >
                <SlidersHorizontal size={13} /> Persona
              </button>
            )}
            {isAdminActive && isAdminUnlocked && (
              <button className="session-mode" onClick={lockAdminMode} title="Bloquear sessão admin">
                <Lock size={13} /> Bloquear
              </button>
            )}
            <button className={`session-mode ${temporaryChat ? 'active' : ''}`} onClick={toggleTemporaryChat} aria-pressed={temporaryChat}>
              <Radio size={14} /> {temporaryChat ? 'Temporário' : 'Salvo'}
            </button>
            <button className="icon-button" onClick={() => deleteConversation(activeConversationId)} aria-label="Excluir conversa">
              <Trash2 size={18} />
            </button>
          </div>
        </header>

        <div className="message-scroller">
          <div className="conversation">
            <div className="conversation-intro">
              <span className="intro-line" />
              <span>{isAdminActive ? `Sessão RPG com ${currentPersona.name}` : temporaryChat ? 'Sessão temporária' : activeConversation?.title || 'Nova sessão'}</span>
              <span className="intro-line" />
            </div>

            {isAdminActive && messages.length === 0 && (
              <div className="admin-starter-banner">
                <div className="admin-starter-content">
                  <div className="admin-starter-persona-header">
                    <span className="persona-avatar-icon"><Sparkles size={15} /></span>
                    <strong>{currentPersona.name} ({currentPersona.age || '22 anos'})</strong>
                    <span className="admin-badge">{currentPersona.relationship}</span>
                    <span className="admin-badge" style={{ background: 'rgba(217, 139, 126, 0.15)' }}>{currentPersona.mood}</span>
                  </div>
                  <div className="admin-starter-details">
                    <span><strong>Temperamento:</strong> {currentPersona.temperament}</span>
                    <span><strong>Cenário:</strong> {currentPersona.scenario}</span>
                  </div>
                </div>
                <div className="admin-starter-actions">
                  <button className="admin-config-btn" onClick={() => openPersonaModal(activeConversation.personaConfig, true)}>
                    <SlidersHorizontal size={13} /> Configurar
                  </button>
                  <button
                    className="admin-starter-btn"
                    onClick={() => triggerPersonaStarter()}
                    disabled={loading}
                  >
                    {loading ? 'Iniciando...' : 'Iniciar Conversa'}
                  </button>
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <article className={`message message-${message.role}`} key={`${message.role}-${index}`}>
                {message.role === 'assistant' && (
                  <div className="avatar" style={isAdminActive ? { background: '#a64734', color: '#fff' } : {}}>
                    {isAdminActive ? <Heart size={16} /> : <Bot size={17} />}
                  </div>
                )}
                <div className="message-body">
                  <div className="message-meta">
                    <span>
                      {message.role === 'user'
                        ? 'Você'
                        : message.role === 'error'
                          ? 'Problema de conexão'
                          : isAdminActive
                            ? currentPersona.name
                            : (selectedModel.split('/').pop()?.split(':')[0] || 'Modelo IA')}
                    </span>
                    {message.role === 'assistant' && (
                      <span className={`local-tag ${isAdminActive ? 'admin-tag' : ''}`}>
                        {isAdminActive ? currentPersona.relationship : (isGemini ? 'GEMINI' : 'LOCAL')}
                      </span>
                    )}
                  </div>
                  {message.role === 'assistant' ? (
                    <ResponseContent content={message.content} onCopy={(content) => copyMessage(`code-${index}`, content)} />
                  ) : (
                    <p>{message.content}</p>
                  )}
                  {message.role === 'assistant' && (
                    <button className="copy-button" onClick={() => copyMessage(index, message.content)}>
                      {copied === index ? <Check size={13} /> : <Copy size={13} />} {copied === index ? 'Copiado' : 'Copiar'}
                    </button>
                  )}
                </div>
              </article>
            ))}

            {loading && (
              <article className="message message-assistant">
                <div className="avatar" style={isAdminActive ? { background: '#a64734', color: '#fff' } : {}}>
                  {isAdminActive ? <Heart size={16} /> : <Bot size={17} />}
                </div>
                <div className="message-body">
                  <div className="message-meta">
                    <span>{isAdminActive ? currentPersona.name : (selectedModel.split('/').pop()?.split(':')[0] || 'Modelo IA')}</span>
                    <span className={`local-tag ${isAdminActive ? 'admin-tag' : ''}`}>
                      {isAdminActive ? 'DIGITANDO...' : (isGemini ? 'GEMINI' : 'LOCAL')}
                    </span>
                  </div>
                  <div className="thinking" role="status" aria-live="polite">
                    <span>{isAdminActive ? `${currentPersona.name} está digitando...` : (isGemini ? 'Processando resposta via Gemini' : 'Processando resposta localmente')}</span>
                    <i /><i /><i />
                  </div>
                </div>
              </article>
            )}
            <div ref={endRef} />
          </div>
        </div>

        <div className="composer-area">
          <form className="composer" onSubmit={sendMessage}>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isAdminActive ? `Mandar mensagem para ${currentPersona.name}...` : (isGemini ? "Envie uma mensagem para o Gemini..." : "Envie uma mensagem para o modelo local...")}
              rows="1"
              disabled={loading}
            />
            <button className="send-button" type="submit" disabled={!draft.trim() || loading} aria-label="Enviar mensagem">
              <ArrowUp size={19} />
            </button>
          </form>
          <div className="composer-hint">
            <span><span className="key">Enter</span> para enviar</span>
            <span><span className="key">Shift + Enter</span> para nova linha</span>
            <span className="privacy-note"><WifiOff size={13} /> {isAdminActive ? 'Modo RPG Privado ativo (pt-BR)' : 'Nenhum dado sai deste dispositivo'}</span>
          </div>
        </div>
      </section>

      {/* Model Selection Modal */}
      {modelModalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModelModalOpen(false)}>
          <section className="model-modal" role="dialog" aria-modal="true" aria-labelledby="model-modal-title">
            <div className="modal-heading">
              <div>
                <span className="modal-kicker">{isGemini ? 'RUNTIME AI STUDIO' : 'RUNTIME LOCAL'}</span>
                <h2 id="model-modal-title">Escolha um modelo</h2>
                <p>Selecione um dos modelos disponíveis para esta sessão.</p>
              </div>
              <button className="icon-button" onClick={() => setModelModalOpen(false)} aria-label="Fechar seletor"><X size={18} /></button>
            </div>
            <div className="model-list">
              {models.map((installedModel) => (
                <button
                  className={`model-option ${selectedModel === installedModel.name ? 'selected' : ''}`}
                  key={installedModel.name}
                  onClick={() => {
                    setSelectedModel(installedModel.name)
                    setModelModalOpen(false)
                  }}
                >
                  <span className="model-option-icon"><Bot size={17} /></span>
                  <span className="model-option-info">
                    <strong>{installedModel.name}</strong>
                    <small>{[installedModel.family, installedModel.size].filter(Boolean).join(' · ') || 'Instalado localmente'}</small>
                  </span>
                  <span className="model-option-check">{selectedModel === installedModel.name && <Check size={17} />}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Admin Password Authentication Dialog */}
      {adminModalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setAdminModalOpen(false)}>
          <div className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title">
            <div className="admin-dialog-header">
              <div className="admin-dialog-icon">
                <Lock size={20} />
              </div>
              <button className="icon-button" onClick={() => setAdminModalOpen(false)} aria-label="Fechar"><X size={18} /></button>
            </div>
            <h2 id="admin-dialog-title" className="admin-dialog-title">Acesso Restrito: Sessão Admin RPG</h2>
            <p className="admin-dialog-desc">
              Insira a senha de administrador para liberar a criação e configuração de personas de RPG em pt-BR.
            </p>
            <form onSubmit={handleAdminAuth} className="admin-dialog-form">
              <div className="admin-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="admin-input"
                  placeholder="Digite a senha (@admin2026)"
                  value={adminPasswordInput}
                  onChange={(e) => {
                    setAdminPasswordInput(e.target.value)
                    setAdminError('')
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="admin-input-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {adminError && <div className="admin-error">{adminError}</div>}
              <div className="admin-dialog-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setAdminModalOpen(false)
                    setAdminError('')
                    setAdminPasswordInput('')
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Desbloquear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Persona Configuration Modal */}
      {personaModalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setPersonaModalOpen(false)}>
          <section className="persona-modal" role="dialog" aria-modal="true" aria-labelledby="persona-modal-title">
            <div className="persona-modal-header">
              <div className="persona-modal-title">
                <div className="admin-dialog-icon" style={{ width: '32px', height: '32px' }}>
                  <SlidersHorizontal size={16} />
                </div>
                <div>
                  <h2 id="persona-modal-title">Configurar Persona RPG (Admin)</h2>
                </div>
              </div>
              <button className="icon-button" onClick={() => setPersonaModalOpen(false)} aria-label="Fechar"><X size={18} /></button>
            </div>

            <div className="persona-modal-body">
              {/* Presets Quick Picker */}
              <div className="persona-presets-section">
                <span className="persona-presets-label">
                  <Sparkles size={13} /> Modelos Prontos (Clique para aplicar):
                </span>
                <div className="persona-presets-grid">
                  {PRESET_PERSONAS.map((preset) => (
                    <button
                      type="button"
                      key={preset.id}
                      className="preset-chip-btn"
                      onClick={() => applyPreset(preset)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Options Grid */}
              <div className="persona-form-grid">
                {/* Name & Age */}
                <div className="persona-field">
                  <label className="persona-field-label">
                    <span>Nome da Personagem</span>
                    <button
                      type="button"
                      onClick={generateRandomName}
                      style={{ background: 'transparent', border: 0, color: '#d98b7e', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <RefreshCw size={10} /> Aleatório
                    </button>
                  </label>
                  <div className="persona-input-group">
                    <input
                      type="text"
                      className="persona-input-control"
                      value={personaForm.name}
                      onChange={(e) => setPersonaForm({ ...personaForm, name: e.target.value })}
                      placeholder="Ex: Valentina"
                    />
                  </div>
                  <div className="persona-suggestions">
                    {SUGGESTED_NAMES.slice(0, 6).map((sugName) => (
                      <button
                        type="button"
                        key={sugName}
                        className={`persona-suggestion-tag ${personaForm.name === sugName ? 'active' : ''}`}
                        onClick={() => setPersonaForm({ ...personaForm, name: sugName })}
                      >
                        {sugName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Age */}
                <div className="persona-field">
                  <label className="persona-field-label">Idade da Personagem</label>
                  <select
                    className="persona-input-control"
                    value={personaForm.age}
                    onChange={(e) => setPersonaForm({ ...personaForm, age: e.target.value })}
                  >
                    {AGE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Relationship */}
                <div className="persona-field persona-form-full">
                  <label className="persona-field-label">
                    <span>Tipo de Relacionamento com você</span>
                  </label>
                  <select
                    className="persona-input-control"
                    value={RELATIONSHIP_OPTIONS.includes(personaForm.relationship) ? personaForm.relationship : 'Personalizado'}
                    onChange={(e) => {
                      if (e.target.value !== 'Personalizado') {
                        setPersonaForm({ ...personaForm, relationship: e.target.value })
                      }
                    }}
                  >
                    {RELATIONSHIP_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {(!RELATIONSHIP_OPTIONS.includes(personaForm.relationship) || personaForm.relationship === 'Personalizado') && (
                    <input
                      type="text"
                      className="persona-input-control"
                      style={{ marginTop: '5px' }}
                      value={personaForm.relationship === 'Personalizado' ? '' : personaForm.relationship}
                      onChange={(e) => setPersonaForm({ ...personaForm, relationship: e.target.value })}
                      placeholder="Digite o relacionamento personalizado..."
                      autoFocus
                    />
                  )}
                  <div className="persona-suggestions">
                    {['Amiga com amizade colorida', 'Namorada', 'Irmã', 'Prima', 'Sogra', 'Mãe', 'Colega de trabalho'].map((rel) => (
                      <button
                        type="button"
                        key={rel}
                        className={`persona-suggestion-tag ${personaForm.relationship === rel ? 'active' : ''}`}
                        onClick={() => setPersonaForm({ ...personaForm, relationship: rel })}
                      >
                        {rel}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Temperament */}
                <div className="persona-field persona-form-full">
                  <label className="persona-field-label">
                    <span>Temperamento e Personalidade</span>
                  </label>
                  <select
                    className="persona-input-control"
                    value={TEMPERAMENT_OPTIONS.includes(personaForm.temperament) ? personaForm.temperament : 'Personalizado'}
                    onChange={(e) => {
                      if (e.target.value !== 'Personalizado') {
                        setPersonaForm({ ...personaForm, temperament: e.target.value })
                      }
                    }}
                  >
                    {TEMPERAMENT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {(!TEMPERAMENT_OPTIONS.includes(personaForm.temperament) || personaForm.temperament === 'Personalizado') && (
                    <input
                      type="text"
                      className="persona-input-control"
                      style={{ marginTop: '5px' }}
                      value={personaForm.temperament === 'Personalizado' ? '' : personaForm.temperament}
                      onChange={(e) => setPersonaForm({ ...personaForm, temperament: e.target.value })}
                      placeholder="Descreva o temperamento personalizado..."
                      autoFocus
                    />
                  )}
                </div>

                {/* Mood */}
                <div className="persona-field">
                  <label className="persona-field-label">Humor Atual</label>
                  <select
                    className="persona-input-control"
                    value={MOOD_OPTIONS.includes(personaForm.mood) ? personaForm.mood : 'Personalizado'}
                    onChange={(e) => {
                      if (e.target.value !== 'Personalizado') {
                        setPersonaForm({ ...personaForm, mood: e.target.value })
                      }
                    }}
                  >
                    {MOOD_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {(!MOOD_OPTIONS.includes(personaForm.mood) || personaForm.mood === 'Personalizado') && (
                    <input
                      type="text"
                      className="persona-input-control"
                      style={{ marginTop: '5px' }}
                      value={personaForm.mood === 'Personalizado' ? '' : personaForm.mood}
                      onChange={(e) => setPersonaForm({ ...personaForm, mood: e.target.value })}
                      placeholder="Humor atual..."
                      autoFocus
                    />
                  )}
                </div>

                {/* Dynamic */}
                <div className="persona-field">
                  <label className="persona-field-label">Dinâmica de Conversa</label>
                  <select
                    className="persona-input-control"
                    value={personaForm.dynamic}
                    onChange={(e) => setPersonaForm({ ...personaForm, dynamic: e.target.value })}
                  >
                    {DYNAMIC_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Scenario */}
                <div className="persona-field persona-form-full">
                  <label className="persona-field-label">Cenário Inicial (Onde ela está)</label>
                  <select
                    className="persona-input-control"
                    value={SCENARIO_OPTIONS.includes(personaForm.scenario) ? personaForm.scenario : 'Personalizado'}
                    onChange={(e) => {
                      if (e.target.value !== 'Personalizado') {
                        setPersonaForm({ ...personaForm, scenario: e.target.value })
                      }
                    }}
                  >
                    {SCENARIO_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {(!SCENARIO_OPTIONS.includes(personaForm.scenario) || personaForm.scenario === 'Personalizado') && (
                    <input
                      type="text"
                      className="persona-input-control"
                      style={{ marginTop: '5px' }}
                      value={personaForm.scenario === 'Personalizado' ? '' : personaForm.scenario}
                      onChange={(e) => setPersonaForm({ ...personaForm, scenario: e.target.value })}
                      placeholder="Descreva o cenário onde ela está..."
                      autoFocus
                    />
                  )}
                </div>

                {/* Custom Notes / Secrets */}
                <div className="persona-field persona-form-full">
                  <label className="persona-field-label">Observações Extras / Segredos / Apelidos (Opcional)</label>
                  <textarea
                    rows={2}
                    className="persona-input-control"
                    value={personaForm.customNotes}
                    onChange={(e) => setPersonaForm({ ...personaForm, customNotes: e.target.value })}
                    placeholder="Ex: Ela te chama de apelidos secretos, gosta de mandar áudios provocantes, etc."
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="persona-preview-box">
                <div className="persona-preview-title">
                  <Sparkles size={14} /> Resumo do Prompt Gerado (pt-BR):
                </div>
                <div className="persona-preview-content">
                  <strong>{personaForm.name || 'Persona'} ({personaForm.age})</strong> • {personaForm.relationship}
                  <br />
                  <em>{personaForm.temperament}</em> • Humor: <strong>{personaForm.mood}</strong>
                  <br />
                  <span style={{ fontSize: '10px', color: '#aaa' }}>Cenário: {personaForm.scenario}</span>
                </div>
              </div>
            </div>

            <div className="persona-modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPersonaModalOpen(false)}
              >
                Cancelar
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleSavePersona(false)}
                >
                  Salvar Persona
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleSavePersona(true)}
                >
                  Iniciar Chat Agora
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
