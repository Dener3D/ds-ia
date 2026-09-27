import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowUp, Bot, Check, ChevronDown, Copy, Menu, Pencil, Plus, Radio, Sparkles, Trash2, WifiOff, X } from 'lucide-react'
import './styles.css'

const DEFAULT_MODEL = 'hf.co/HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive:Q4_K_M'
const STORAGE_KEY = 'ollama-local-chat.conversations'
const LEGACY_STORAGE_KEY = 'ollama-local-chat.conversation'
const initialMessage = {
  role: 'assistant',
  content: 'Ready when you are. I am running locally through Ollama, so your conversation stays on this machine.',
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
          <div className="code-header"><span>{part.language || 'code'}</span><button className="code-copy" onClick={() => onCopy(part.content)}><Copy size={13} /> Copy</button></div>
          <HighlightedCode content={part.content} language={part.language || 'javascript'} />
        </div>
      ) : <p key={`text-${index}`}>{part.content.trim()}</p>)}
    </div>
  )
}

function createConversation(messages = [initialMessage], title = 'New conversation') {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title, messages }
}

function titleFromMessages(messages) {
  const firstPrompt = messages.find((message) => message.role === 'user')?.content?.trim()
  return firstPrompt ? firstPrompt.slice(0, 42) : 'New conversation'
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
  const endRef = useRef(null)
  const textareaRef = useRef(null)
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId)

  useEffect(() => {
    if (!temporaryChat) localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
  }, [conversations, temporaryChat])

  useEffect(() => {
    if (temporaryChat) return
    setConversations((currentConversations) => currentConversations.map((conversation) => {
      if (conversation.id !== activeConversationId) return conversation
      const title = conversation.title === 'New conversation' ? titleFromMessages(messages) : conversation.title
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
      if (event.key === 'Escape') setModelModalOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  function createNewConversation() {
    if (temporaryChat) {
      setMessages([initialMessage])
    } else {
      const conversation = createConversation()
      setConversations((currentConversations) => [conversation, ...currentConversations])
      setActiveConversationId(conversation.id)
      setMessages(conversation.messages)
    }
    setDraft('')
    setSidebarOpen(false)
    textareaRef.current?.focus()
  }

  function selectConversation(conversation) {
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
    const nextTitle = title.trim() || 'New conversation'
    setConversations((currentConversations) => currentConversations.map((conversation) => conversation.id === conversationId ? { ...conversation, title: nextTitle } : conversation))
    setEditingConversationId(null)
  }

  function toggleTemporaryChat() {
    const nextTemporaryChat = !temporaryChat
    setTemporaryChat(nextTemporaryChat)
    if (nextTemporaryChat) {
      setMessages([initialMessage])
    } else {
      const conversation = createConversation()
      setConversations((currentConversations) => [conversation, ...currentConversations])
      setActiveConversationId(conversation.id)
      setMessages(conversation.messages)
    }
    setDraft('')
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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, history: messages.slice(-10), model: selectedModel }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Something went wrong.')
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

  return (
    <main className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-topline">
          <div className="brand-mark"><Sparkles size={16} strokeWidth={2.4} /></div>
          <span className="brand-name">DS <span>IA</span></span>
          <button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <button className="new-chat" onClick={createNewConversation}><Plus size={17} /> New conversation</button>
        <div className="sidebar-section">
          <span className="eyebrow">Workspace</span>
          {temporaryChat ? <div className="conversation-row active temporary-row"><span className="conversation-dot" />Temporary chat</div> : conversations.map((conversation) => <div className={`conversation-row ${conversation.id === activeConversationId ? 'active' : ''}`} key={conversation.id}>
            <button className="conversation-remove" onClick={() => deleteConversation(conversation.id)} aria-label={`Delete ${conversation.title}`} title="Delete conversation"><Trash2 size={13} /></button>
            {editingConversationId === conversation.id ? <input className="conversation-title-input" defaultValue={conversation.title} autoFocus onBlur={(event) => renameConversation(conversation.id, event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') setEditingConversationId(null) }} /> : <button className="conversation-select" onClick={() => selectConversation(conversation)}><span className="conversation-dot" />{conversation.title}</button>}
            {editingConversationId !== conversation.id && <button className="conversation-edit" onClick={() => setEditingConversationId(conversation.id)} aria-label={`Edit ${conversation.title}`} title="Edit title"><Pencil size={13} /></button>}
          </div>)}
        </div>
        <div className="sidebar-footer">
          <div className="connection-card">
            <div className={`status-dot ${connected === false ? 'offline' : ''}`} />
            <div><span className="connection-label">Ollama runtime</span><span className="connection-state">{connected === false ? 'Offline' : 'Local and private'}</span></div>
          </div>
          <div className="model-caption"><span>MODEL</span><button className="model-trigger" onClick={() => setModelModalOpen(true)} disabled={!models.length || loading} aria-haspopup="dialog" aria-expanded={modelModalOpen}><span>{selectedModel.split('/').pop()?.split(':')[0] || 'Loading models...'}</span><ChevronDown size={14} /></button><small>{models.find((installedModel) => installedModel.name === selectedModel)?.size || 'Installed locally'}</small></div>
        </div>
      </aside>

      <section className="chat-panel">
        <header className="chat-header">
          <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={19} /></button>
          <div className="header-title"><span className="live-indicator"><Radio size={13} /> LOCAL SESSION</span><h1>{temporaryChat ? 'Temporary chat' : activeConversation?.title || 'New conversation'}</h1></div>
          <div className="header-actions"><button className={`session-mode ${temporaryChat ? 'active' : ''}`} onClick={toggleTemporaryChat} aria-pressed={temporaryChat}><Radio size={14} /> {temporaryChat ? 'Temporary' : 'Saved'}</button><button className="icon-button" onClick={() => deleteConversation(activeConversationId)} aria-label="Delete saved conversation"><Trash2 size={18} /></button></div>
        </header>

        <div className="message-scroller">
          <div className="conversation">
            <div className="conversation-intro"><span className="intro-line" /><span>{temporaryChat ? 'Temporary session' : activeConversation?.title || 'New session'}</span><span className="intro-line" /></div>
            {messages.map((message, index) => (
              <article className={`message message-${message.role}`} key={`${message.role}-${index}`}>
                {message.role === 'assistant' && <div className="avatar"><Bot size={17} /></div>}
                <div className="message-body">
                  <div className="message-meta"><span>{message.role === 'user' ? 'You' : message.role === 'error' ? 'Connection issue' : selectedModel.split('/').pop()?.split(':')[0] || 'Model'}</span>{message.role === 'assistant' && <span className="local-tag">LOCAL</span>}</div>
                  {message.role === 'assistant' ? <ResponseContent content={message.content} onCopy={(content) => copyMessage(`code-${index}`, content)} /> : <p>{message.content}</p>}
                  {message.role === 'assistant' && <button className="copy-button" onClick={() => copyMessage(index, message.content)}>{copied === index ? <Check size={13} /> : <Copy size={13} />} {copied === index ? 'Copied' : 'Copy'}</button>}
                </div>
              </article>
            ))}
            {loading && <article className="message message-assistant"><div className="avatar"><Bot size={17} /></div><div className="message-body"><div className="message-meta"><span>{selectedModel.split('/').pop()?.split(':')[0] || 'Model'}</span><span className="local-tag">LOCAL</span></div><div className="thinking" role="status" aria-live="polite"><span>IA está pensando</span><i /><i /><i /></div></div></article>}
            <div ref={endRef} />
          </div>
        </div>

        <div className="composer-area">
          <form className="composer" onSubmit={sendMessage}>
            <textarea ref={textareaRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} placeholder="Message your local model..." rows="1" disabled={loading} />
            <button className="send-button" type="submit" disabled={!draft.trim() || loading} aria-label="Send message"><ArrowUp size={19} /></button>
          </form>
          <div className="composer-hint"><span><span className="key">Enter</span> to send</span><span><span className="key">Shift + Enter</span> for new line</span><span className="privacy-note"><WifiOff size={13} /> Nothing leaves this device</span></div>
        </div>
      </section>
      {modelModalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModelModalOpen(false)}><section className="model-modal" role="dialog" aria-modal="true" aria-labelledby="model-modal-title"><div className="modal-heading"><div><span className="modal-kicker">LOCAL RUNTIME</span><h2 id="model-modal-title">Choose a model</h2><p>Select one of the models installed in Ollama.</p></div><button className="icon-button" onClick={() => setModelModalOpen(false)} aria-label="Close model selector"><X size={18} /></button></div><div className="model-list">{models.map((installedModel) => <button className={`model-option ${selectedModel === installedModel.name ? 'selected' : ''}`} key={installedModel.name} onClick={() => { setSelectedModel(installedModel.name); setModelModalOpen(false) }}><span className="model-option-icon"><Bot size={17} /></span><span className="model-option-info"><strong>{installedModel.name}</strong><small>{[installedModel.family, installedModel.size].filter(Boolean).join(' · ') || 'Installed locally'}</small></span><span className="model-option-check">{selectedModel === installedModel.name && <Check size={17} />}</span></button>)}</div></section></div>}
    </main>
  )
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
