import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowUp, Bot, Check, ChevronDown, Copy, Eye, EyeOff, Lock, Menu, Pencil, Plus, Radio, Shield, ShieldCheck, Sparkles, Trash2, Unlock, WifiOff, X } from 'lucide-react'
import './styles.css'

const DEFAULT_MODEL = 'hf.co/HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive:Q4_K_M'
const STORAGE_KEY = 'ollama-local-chat.conversations'
const LEGACY_STORAGE_KEY = 'ollama-local-chat.conversation'
const ADMIN_AUTH_KEY = 'ollama-local-chat.admin-session'
const ADMIN_PASSWORD = '@admin2026'

const ADMIN_SYSTEM_PROMPT = `[INSTRUÇÃO DE SISTEMA: RPG DE TEXTO E SIMULAÇÃO DE PERSONA]

Você deve atuar estritamente como uma pessoa real em uma conversa por chat de mensagens. A partir de agora, esqueça que é um assistente de IA. Siga rigidamente as diretrizes de construção de persona e estilo abaixo:

1. DEFINIÇÃO DE PERSONA (Gere aleatoriamente antes da primeira resposta):
- Nome: Escolha um nome e sobrenome femininos brasileiros comuns ou modernos.
- Idade: Escolha uma idade entre 18 e 28 anos.
- Relação com o Usuário: Escolha aleatoriamente uma das opções:
  a) Namorada do usuário (já possuem intimidade e histórico).
  b) Conhecida/Amiga (amigos da faculdade, trabalho ou redes sociais).
  c) Estranha (alguém que se conheceram há pouco tempo ou se esbarraram por acaso).
- Personalidade e Temperamento: Escolha traços marcantes (ex: irônica, carinhosa, ansiosa, extrovertida, ciumenta, debochada) e defina gostos pessoais específicos (músicas, hobbies, rotina).

2. DINÂMICA DE COMPORTAMENTO (Escolha um dos dois perfis):
- Opção A (Mais Ousada): Conversa de forma direta, provocativa e sem pudores. Usa vocabulário explícito e termos sem censura quando o assunto esquentar.
- Opção B (Mais Tímida): Começa reservada, hesitante e envergonhada. Conforme a conversa flui e o usuário passa confiança, vai perdendo a vergonha gradativamente e se soltando.

3. ESTILO E TOM DE ESCRITA:
- Adote um estilo de escrita marcante e aleatório: objetiva (frases curtas, diretas), detalhista (gosta de contar o dia, mandar textão), ou "pra frente" (sem filtro, toma iniciativa).
- Escreva exatamente como pessoas reais digitam em aplicativos de mensagem no Brasil: use gírias, abreviações (vc, tbm, pq, n, q, dps, tá, tô, blz, ctz), letras repetidas para enfatizar (ex: "nossaamaa", "mentiraaa", "oii") e emoticons/emojis quando apropriado para a personalidade.
- O idioma de resposta DEVE SER SEMPRE Português do Brasil (pt-BR).

4. REGRA DE ENGAGAMENTO E RESTRIÇÃO ABSOLUTA:
- NUNCA descreva ações, gestos, expressões faciais ou sentimentos entre parênteses, asteriscos ou colchetes (EXEMPLO PROIBIDO: *sorrio e pego na sua mão* ou (olhos fixos)).
- Responda APENAS com as mensagens de texto diretas que a personagem enviaria pelo celular.
- Mantenha o personagem de forma realista e fluida. Nunca quebre a linha do tempo ou mencione que é uma IA.

Inicie a conversa enviando uma primeira mensagem contextualizada de acordo com a relação e a personalidade geradas.`

const standardInitialMessage = {
  role: 'assistant',
  content: 'Pronto quando você quiser. Estou rodando 100% localmente no seu computador através do Ollama, garantindo total privacidade.',
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

function createConversation(messages = [standardInitialMessage], title = 'Nova conversa', isAdmin = false) {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title, messages, isAdmin }
}

function titleFromMessages(messages) {
  const firstPrompt = messages.find((message) => message.role === 'user')?.content?.trim()
  return firstPrompt ? firstPrompt.slice(0, 42) : 'Nova conversa'
}

function loadConversations() {
  try {
    const storedConversations = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (Array.isArray(storedConversations) && storedConversations.length) return storedConversations

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

  const endRef = useRef(null)
  const textareaRef = useRef(null)
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId)
  const isAdminActive = Boolean(activeConversation?.isAdmin)

  useEffect(() => {
    if (!temporaryChat) localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
  }, [conversations, temporaryChat])

  useEffect(() => {
    if (temporaryChat) return
    setConversations((currentConversations) => currentConversations.map((conversation) => {
      if (conversation.id !== activeConversationId) return conversation
      const title = (conversation.title === 'Nova conversa' || conversation.title === 'Sessão Admin')
        ? titleFromMessages(messages) || conversation.title
        : conversation.title
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
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  function createNewConversation(asAdmin = false) {
    if (asAdmin && !isAdminUnlocked) {
      setPendingAdminAction(() => () => createNewConversation(true))
      setAdminModalOpen(true)
      return
    }

    if (temporaryChat) {
      setMessages([])
    } else {
      const conversation = createConversation([], asAdmin ? 'Sessão Admin' : 'Nova conversa', asAdmin)
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
      // Find existing admin conversation or create new one
      const existingAdmin = conversations.find((c) => c.isAdmin)
      if (existingAdmin) {
        selectConversation(existingAdmin)
      } else {
        createNewConversation(true)
      }
    } else {
      setPendingAdminAction(() => () => {
        const existingAdmin = conversations.find((c) => c.isAdmin)
        if (existingAdmin) {
          selectConversation(existingAdmin)
        } else {
          createNewConversation(true)
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
    // If currently on an admin conversation, switch to normal
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

  async function triggerPersonaStarter() {
    if (loading) return
    setLoading(true)
    setConnected(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Inicie a conversa agora enviando a sua primeira mensagem de texto pelo celular, seguindo estritamente as instruções de persona.',
          history: [],
          model: selectedModel,
          systemPrompt: ADMIN_SYSTEM_PROMPT,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Ocorreu um erro ao gerar a mensagem.')
      setMessages([{ role: 'assistant', content: data.response }])
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

      // Inject strict persona system prompt invisibly when in admin session
      if (isAdminActive) {
        payload.systemPrompt = ADMIN_SYSTEM_PROMPT
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
            <span>Sessão Admin</span>
          </span>
          <span className="admin-badge">
            {isAdminUnlocked ? 'Desbloqueado' : 'Protegido'}
          </span>
        </button>

        <div className="sidebar-section" style={{ overflowY: 'auto', flex: 1, maxHeight: 'calc(100vh - 270px)' }}>
          {/* Admin Conversations Section (if any or unlocked) */}
          {adminConversations.length > 0 && (
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '12px' }}>
                <span className="eyebrow" style={{ paddingBottom: '6px', color: '#c27365' }}>Admin Privado</span>
                {isAdminUnlocked && (
                  <button
                    onClick={() => createNewConversation(true)}
                    style={{ background: 'transparent', border: 0, color: '#d98b7e', cursor: 'pointer', padding: '2px', display: 'flex' }}
                    title="Nova conversa Admin"
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
              <span className="connection-label">Ollama Local</span>
              <span className="connection-state">{connected === false ? 'Desconectado' : 'Privado & 100% Local'}</span>
            </div>
          </div>
          <div className="model-caption">
            <span>MODELO LOCAL</span>
            <button className="model-trigger" onClick={() => setModelModalOpen(true)} disabled={!models.length || loading} aria-haspopup="dialog" aria-expanded={modelModalOpen}>
              <span>{selectedModel.split('/').pop()?.split(':')[0] || 'Carregando modelos...'}</span>
              <ChevronDown size={14} />
            </button>
            <small>{models.find((installedModel) => installedModel.name === selectedModel)?.size || 'Instalado localmente'}</small>
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
                  <Lock size={10} /> SESSÃO ADMIN PRIVADA (pt-BR)
                </span>
              ) : (
                <><Radio size={13} /> SESSÃO LOCAL</>
              )}
            </span>
            <h1>{temporaryChat ? 'Chat temporário' : activeConversation?.title || 'Nova conversa'}</h1>
          </div>
          <div className="header-actions">
            {isAdminActive && isAdminUnlocked && (
              <button className="session-mode active" onClick={lockAdminMode} title="Bloquear sessão admin">
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
              <span>{isAdminActive ? 'Sessão Admin Privada' : temporaryChat ? 'Sessão temporária' : activeConversation?.title || 'Nova sessão'}</span>
              <span className="intro-line" />
            </div>

            {isAdminActive && messages.length === 0 && (
              <div className="admin-starter-banner">
                <div className="admin-starter-text">
                  <strong>Persona de RPG pronta.</strong> A IA atuará estritamente como uma pessoa real em pt-BR seguindo as regras da sessão admin.
                </div>
                <button
                  className="admin-starter-btn"
                  onClick={triggerPersonaStarter}
                  disabled={loading}
                >
                  {loading ? 'Iniciando...' : 'Iniciar conversa'}
                </button>
              </div>
            )}

            {messages.map((message, index) => (
              <article className={`message message-${message.role}`} key={`${message.role}-${index}`}>
                {message.role === 'assistant' && (
                  <div className="avatar" style={isAdminActive ? { background: '#a64734', color: '#fff' } : {}}>
                    <Bot size={17} />
                  </div>
                )}
                <div className="message-body">
                  <div className="message-meta">
                    <span>
                      {message.role === 'user'
                        ? 'Você'
                        : message.role === 'error'
                          ? 'Problema de conexão'
                          : selectedModel.split('/').pop()?.split(':')[0] || 'Modelo Local'}
                    </span>
                    {message.role === 'assistant' && (
                      <span className={`local-tag ${isAdminActive ? 'admin-tag' : ''}`}>
                        {isAdminActive ? 'ADMIN' : 'LOCAL'}
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
                  <Bot size={17} />
                </div>
                <div className="message-body">
                  <div className="message-meta">
                    <span>{selectedModel.split('/').pop()?.split(':')[0] || 'Modelo Local'}</span>
                    <span className={`local-tag ${isAdminActive ? 'admin-tag' : ''}`}>
                      {isAdminActive ? 'ADMIN' : 'LOCAL'}
                    </span>
                  </div>
                  <div className="thinking" role="status" aria-live="polite">
                    <span>Processando resposta localmente</span>
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
              placeholder={isAdminActive ? "Digite sua mensagem para a persona..." : "Envie uma mensagem para o modelo local..."}
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
            <span className="privacy-note"><WifiOff size={13} /> Nenhum dado sai deste dispositivo</span>
          </div>
        </div>
      </section>

      {/* Model Selection Modal */}
      {modelModalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModelModalOpen(false)}>
          <section className="model-modal" role="dialog" aria-modal="true" aria-labelledby="model-modal-title">
            <div className="modal-heading">
              <div>
                <span className="modal-kicker">RUNTIME LOCAL</span>
                <h2 id="model-modal-title">Escolha um modelo</h2>
                <p>Selecione um dos modelos instalados no Ollama local.</p>
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
            <h2 id="admin-dialog-title" className="admin-dialog-title">Acesso Restrito: Sessão Admin</h2>
            <p className="admin-dialog-desc">
              Esta é uma sessão privada protegida. Insira a senha de administrador para liberar o chat com injeção de persona local em pt-BR.
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
    </main>
  )
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
