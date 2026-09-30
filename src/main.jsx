import { Component, StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
  }

  handleReset = () => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {}
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#111b21',
          color: '#e9edef',
          fontFamily: 'Inter, sans-serif',
          padding: '24px',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>Recuperação de Erro</h2>
          <p style={{ fontSize: '13px', color: '#8696a0', maxWidth: '480px', marginBottom: '20px', lineHeight: '1.5' }}>
            {this.state.error?.message || 'Ocorreu um erro ao carregar ou processar dados no navegador.'}
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#00a884',
                color: '#111b21',
                border: '0',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Recarregar Página
            </button>
            <button
              onClick={this.handleReset}
              style={{
                background: '#202c33',
                color: '#f85149',
                border: '1px solid #374248',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Limpar Armazenamento Local
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
import {
  ArrowLeft,
  ArrowUp,
  Bot,
  Camera,
  Check,
  CheckCheck,
  ChevronDown,
  Copy,
  Download,
  Eye,
  EyeOff,
  Flame,
  GitFork,
  Heart,
  Image as ImageIcon,
  Lock,
  Maximize2,
  Menu,
  MessageCircle,
  MessageSquarePlus,
  Minus,
  MoreVertical,
  Network,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Trash2,
  Unlock,
  User,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
  Video,
  WifiOff,
  X,
  Zap
} from 'lucide-react'
import './styles.css'

const DEFAULT_MODEL = 'gemini-3.1-flash-lite'
const STORAGE_KEY = 'ollama-local-chat.conversations'
const CHARACTERS_STORAGE_KEY = 'ollama-local-chat.characters'
const RELATIONSHIPS_STORAGE_KEY = 'ollama-local-chat.inter-relationships'
const ADMIN_AUTH_KEY = 'ollama-local-chat.admin-session'
const IMAGE_MODEL_STORAGE_KEY = 'ollama-local-chat.selected-image-model'
const ADMIN_PASSWORD = '@admin2026'

export const DEFAULT_IMAGE_MODELS = [
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

export const INTIMACY_LEVELS = {
  1: {
    level: 1,
    name: 'Nível 1 - Distante / Cautelosa',
    short: 'Distante',
    score: 20,
    color: '#8e9094',
    behavior: 'Postura reservada, desconfiada ou polida. Não compartilha segredos íntimos nem fotos íntimas/ousadas. Se o usuário fizer perguntas íntimas demais ou pedir fotos avançadas, ela recua, dá respostas curtas, desvia de assunto ou dá um corte condizente com a personalidade.',
  },
  2: {
    level: 2,
    name: 'Nível 2 - Amigável / Confortável',
    short: 'Amigável',
    score: 40,
    color: '#c9a69e',
    behavior: 'Já se sente confortável, conta coisas do seu dia a dia, brinca e aceita elogios leves. Pode mandar selfies casuais do dia a dia (sem nudez). Mantém certo pudor em assuntos muito íntimos.',
  },
  3: {
    level: 3,
    name: 'Nível 3 - Próxima / Confiante',
    short: 'Próxima',
    score: 60,
    color: '#e58e7f',
    behavior: 'Demonstra interesse genuíno e carinho, compartilha sentimentos e vulnerabilidades. Retribui flertes com naturalidade e aceita mandar fotos do seu look ou selfies fofas/sensuais leves.',
  },
  4: {
    level: 4,
    name: 'Nível 4 - Íntima / Cúmplice',
    short: 'Íntima',
    score: 80,
    color: '#e06852',
    behavior: 'Intimidade profunda e cumplicidade total. Abre segredos que não conta para ninguém, confessa desejos, flerta abertamente e envia fotos sensuais, provocantes e íntimas quando solicitada.',
  },
  5: {
    level: 5,
    name: 'Nível 5 - Intensa / Sem Filtro',
    short: 'Sem Filtro',
    score: 100,
    color: '#25d366',
    behavior: 'Entrega emocional e física absoluta, sem barreiras nem filtros sociais. Paixão, cumplicidade incondicional, vocabulário picante, total desinibição e envio de fotos provocantes sem hesitação.',
  }
}

export const SUGGESTED_NAMES = [
  'Valentina', 'Larissa', 'Letícia', 'Camila', 'Bianca', 
  'Fernanda', 'Juliana', 'Mariana', 'Beatriz', 'Luana', 
  'Natália', 'Isabela', 'Carlos', 'Amanda', 'Helena'
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
  'Padrasto',
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
  'Autoritário, direto e protetor',
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

export const RESISTANCE_OPTIONS = [
  'Joguinho & Provocação (Faz charme, instiga e não entrega fácil)',
  'Filtro Rígido / Desconfiada (Dá corte se avançar rápido ou for invasivo)',
  'Tímida & Envergonhada (Fica sem jeito, cora e esquiva de temas pesados)',
  'Ousada & Sem Filtro (Cede rápido e entra na onda com atitude)',
  'Carinhosa & Acolhedora (Doce, compreensiva e apegada)',
  'Personalizado'
]

export const JEALOUSY_OPTIONS = [
  'Desapegada / Independente (Não liga para outros contatos)',
  'Moderado (Finge indiferença mas repara nos detalhes e sente ciúme)',
  'Ciumenta & Possessiva (Cobra atenção, desconfia e quer prioridade total)',
  'Personalizado'
]

export const NICKNAME_OPTIONS = [
  'Pelo seu nome próprio',
  'Amor / Vida',
  'Meu bem / Querido(a)',
  'Preto / Preta',
  'Maninho / Maninha',
  'Apelido irônico (Chato, Bobo, Chefe)',
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
  '19 anos', '21 anos', '22 anos', '23 anos', '25 anos', '28 anos', '32 anos', '42 anos', '46 anos'
]

export const DEFAULT_CHARACTERS = [
  {
    id: 'char-valentina',
    name: 'Valentina',
    age: '22 anos',
    relationship: 'Amiga com amizade colorida',
    physicalDescription: 'Mulher brasileira de 22 anos com traços latinos autênticos e expressivos, cabelos castanho-claros longos e ondulados naturais, olhos castanho-mel expressivos com olhar marcante e cílios naturais, pele morena-clara brasileira com textura real e viço natural, lábios carnudos naturais, corpo atraente curvilíneo e bem delineado, beleza brasileira autêntica e moderna.',
    temperament: 'Provocadora, irônica e debochada',
    mood: 'Provocativa com segundas intenções',
    resistance: 'Joguinho & Provocação (Faz charme, instiga e não entrega fácil)',
    jealousy: 'Moderado (Finge indiferença mas repara nos detalhes e sente ciúme)',
    nickname: 'Apelido irônico (Chato, Bobo, Chefe)',
    initialIntimacy: 2,
    dynamic: 'Ousada e direta (sem censura e provocativa)',
    scenario: 'Deitada no quarto à noite sem sono mexendo no celular',
    typingStyle: 'WhatsApp BR Autêntico (gírias, abreviações, emojis, tom informal)',
    customNotes: 'Você e ela têm química forte, já ficaram e mantêm segredo entre os amigos.',
    avatarColor: '#d83a56'
  },
  {
    id: 'char-larissa',
    name: 'Larissa',
    age: '23 anos',
    relationship: 'Namorada',
    physicalDescription: 'Mulher brasileira de 23 anos com traços latinos delicados e naturais, cabelos castanho-escuros lisos e sedosos na altura dos ombros, grandes olhos castanhos expressivos e meigos, rosto feminino autêntico, sorriso doce natural com covinhas sutis, pele clara tropical com textura real humana, corpo esbelto e bem proporcional.',
    temperament: 'Carinhosa, fofa e apegada',
    mood: 'Carente querendo atenção e mimo',
    resistance: 'Carinhosa & Acolhedora (Doce, compreensiva e apegada)',
    jealousy: 'Ciumenta & Possessiva (Cobra atenção, desconfia e quer prioridade total)',
    nickname: 'Amor / Vida',
    initialIntimacy: 4,
    dynamic: 'Afetuosa e romântica (carinho, apego e intimidade)',
    scenario: 'Deitada no quarto à noite sem sono mexendo no celular',
    typingStyle: 'WhatsApp BR Autêntico (gírias, abreviações, emojis, tom informal)',
    customNotes: 'Namoram há 1 ano, ama apelidos carinhosos e quer saber tudo sobre seu dia.',
    avatarColor: '#e06852'
  },
  {
    id: 'char-leticia',
    name: 'Letícia',
    age: '42 anos',
    relationship: 'Sogra',
    physicalDescription: 'Mulher brasileira madura de 42 anos com beleza latina elegante e marcante, cabelos castanhos médios sedosos com mechas douradas discretas, olhos castanhos expressivos e seguros, feições maduras e atraentes de mulher adulta real, postura imponente, maquiagem sofisticada e pele madura muito bem cuidada com textura natural.',
    temperament: 'Madura, confiante e dominadora',
    mood: 'Provocativa com segundas intenções',
    resistance: 'Joguinho & Provocação (Faz charme, instiga e não entrega fácil)',
    jealousy: 'Desapegada / Independente (Não liga para outros contatos)',
    nickname: 'Meu bem / Querido(a)',
    initialIntimacy: 2,
    dynamic: 'Proibida e tensa (clima de flerte escondido e perigo)',
    scenario: 'Sozinha na sala deitada no sofá tomando vinho',
    typingStyle: 'WhatsApp BR Autêntico (gírias, abreviações, emojis, tom informal)',
    customNotes: 'Mulher madura e decidida. Mãe da Larissa e da Camila, casada com Carlos.',
    avatarColor: '#8e3c2b'
  },
  {
    id: 'char-carlos',
    name: 'Carlos',
    age: '46 anos',
    relationship: 'Padrasto',
    physicalDescription: 'Homem brasileiro de 46 anos com feições latinas/sul-americanas masculinas marcantes, cabelos curtos grisalhos nas têmporas, barba cerrada bem alinhada com alguns fios brancos, olhos castanhos firmes e profundos, estrutura óssea facial masculina forte, porte físico robusto, estilo casual elegante.',
    temperament: 'Autoritário, direto e protetor',
    mood: 'Curiosa querendo saber de você',
    resistance: 'Filtro Rígido / Desconfiada (Dá corte se avançar rápido ou for invasivo)',
    jealousy: 'Desapegada / Independente (Não liga para outros contatos)',
    nickname: 'Pelo seu nome próprio',
    initialIntimacy: 1,
    dynamic: 'Tímida e progressiva (vai se soltando aos poucos)',
    scenario: 'No escritório de casa trabalhando até tarde',
    typingStyle: 'Rápida e direta (frases curtas e objetivas)',
    customNotes: 'Marido da Letícia, homem sério e ocupado.',
    avatarColor: '#2d5a7b'
  },
  {
    id: 'char-camila',
    name: 'Camila',
    age: '20 anos',
    relationship: 'Meia-irmã',
    physicalDescription: 'Jovem brasileira de 20 anos com traços latinos naturais e expressivos, cabelos castanhos longos repicados despojados, olhos castanhos brilhantes e vivos, sorriso debochado jovem, pele jovem natural com textura real, corpo esbelto, visual jovem moderno e descolado.',
    temperament: 'Provocadora, irônica e debochada',
    mood: 'Brava / Chateada fingindo indiferença',
    resistance: 'Filtro Rígido / Desconfiada (Dá corte se avançar rápido ou for invasivo)',
    jealousy: 'Ciumenta & Possessiva (Cobra atenção, desconfia e quer prioridade total)',
    nickname: 'Maninho / Maninha',
    initialIntimacy: 1,
    dynamic: 'Tímida e progressiva (vai se soltando aos poucos)',
    scenario: 'No quarto ao lado trancada ouvindo música',
    typingStyle: 'WhatsApp BR Autêntico (gírias, abreviações, emojis, tom informal)',
    customNotes: 'Irmã mais nova da Larissa, filha da Letícia. Gosta de implicar mas não vive sem você.',
    avatarColor: '#8a4baf'
  }
]

export const DEFAULT_RELATIONSHIPS = [
  { id: 'rel-1', charAId: 'char-carlos', charAName: 'Carlos', relation: 'Marido de', charBId: 'char-leticia', charBName: 'Letícia' },
  { id: 'rel-2', charAId: 'char-leticia', charAName: 'Letícia', relation: 'Mãe da', charBId: 'char-larissa', charBName: 'Larissa' },
  { id: 'rel-3', charAId: 'char-leticia', charAName: 'Letícia', relation: 'Mãe da', charBId: 'char-camila', charBName: 'Camila' },
  { id: 'rel-4', charAId: 'char-larissa', charAName: 'Larissa', relation: 'Prima da', charBId: 'char-valentina', charBName: 'Valentina' },
  { id: 'rel-5', charAId: 'char-larissa', charAName: 'Larissa', relation: 'Irmã mais velha da', charBId: 'char-camila', charBName: 'Camila' }
]

export const PRESET_PERSONAS = [
  {
    id: 'amiga-colorida',
    label: '🔥 Amiga Colorida',
    name: 'Valentina',
    age: '22 anos',
    relationship: 'Amiga com amizade colorida',
    physicalDescription: 'Mulher brasileira de 22 anos com traços latinos autênticos e expressivos, cabelos castanho-claros longos e ondulados naturais, olhos castanho-mel expressivos com olhar marcante e cílios naturais, pele morena-clara brasileira com textura real e viço natural, lábios carnudos naturais, corpo atraente curvilíneo e bem delineado, beleza brasileira autêntica e moderna.',
    temperament: 'Provocadora, irônica e debochada',
    mood: 'Provocativa com segundas intenções',
    resistance: 'Joguinho & Provocação (Faz charme, instiga e não entrega fácil)',
    jealousy: 'Moderado (Finge indiferença mas repara nos detalhes e sente ciúme)',
    nickname: 'Apelido irônico (Chato, Bobo, Chefe)',
    initialIntimacy: 2,
    dynamic: 'Ousada e direta (sem censura e provocativa)',
    scenario: 'Deitada no quarto à noite sem sono mexendo no celular',
    typingStyle: 'WhatsApp BR Autêntico (gírias, abreviações, emojis, tom informal)',
    customNotes: 'Você e ela têm química forte, já ficaram e mantêm segredo entre os amigos.',
    avatarColor: '#d83a56'
  },
  {
    id: 'namorada-carente',
    label: '❤️ Namorada Carente',
    name: 'Larissa',
    age: '23 anos',
    relationship: 'Namorada',
    physicalDescription: 'Mulher brasileira de 23 anos com traços latinos delicados e naturais, cabelos castanho-escuros lisos e sedosos na altura dos ombros, grandes olhos castanhos expressivos e meigos, rosto feminino autêntico, sorriso doce natural com covinhas sutis, pele clara tropical com textura real humana, corpo esbelto e bem proporcional.',
    temperament: 'Carinhosa, fofa e apegada',
    mood: 'Carente querendo atenção e mimo',
    resistance: 'Carinhosa & Acolhedora (Doce, compreensiva e apegada)',
    jealousy: 'Ciumenta & Possessiva (Cobra atenção, desconfia e quer prioridade total)',
    nickname: 'Amor / Vida',
    initialIntimacy: 4,
    dynamic: 'Afetuosa e romântica (carinho, apego e intimidade)',
    scenario: 'Deitada no quarto à noite sem sono mexendo no celular',
    typingStyle: 'WhatsApp BR Autêntico (gírias, abreviações, emojis, tom informal)',
    customNotes: 'Namoram há 1 ano, ama apelidos carinhosos e quer saber tudo sobre seu dia.',
    avatarColor: '#e06852'
  },
  {
    id: 'sogra-madura',
    label: '🍷 Sogra Madura',
    name: 'Letícia',
    age: '42 anos',
    relationship: 'Sogra',
    physicalDescription: 'Mulher brasileira madura de 42 anos com beleza latina elegante e marcante, cabelos castanhos médios sedosos com mechas douradas discretas, olhos castanhos expressivos e seguros, feições maduras e atraentes de mulher adulta real, postura imponente, maquiagem sofisticada e pele madura muito bem cuidada com textura natural.',
    temperament: 'Madura, confiante e dominadora',
    mood: 'Provocativa com segundas intenções',
    resistance: 'Joguinho & Provocação (Faz charme, instiga e não entrega fácil)',
    jealousy: 'Desapegada / Independente (Não liga para outros contatos)',
    nickname: 'Meu bem / Querido(a)',
    initialIntimacy: 2,
    dynamic: 'Proibida e tensa (clima de flerte escondido e perigo)',
    scenario: 'Sozinha na sala deitada no sofá tomando vinho',
    typingStyle: 'WhatsApp BR Autêntico (gírias, abreviações, emojis, tom informal)',
    customNotes: 'Mulher madura e decidida. Mãe da Larissa e da Camila, casada com Carlos.',
    avatarColor: '#8e3c2b'
  },
  {
    id: 'timida-reservada',
    label: '🙈 Amiga Tímida',
    name: 'Beatriz',
    age: '21 anos',
    relationship: 'Melhor amiga de infância',
    physicalDescription: 'Jovem brasileira de 21 anos com traços latinos naturais e meigos, cabelos castanho-claros levemente ondulados na altura dos ombros, óculos delicados de armação fina, olhos castanhos expressivos, bochechas coradas naturais e olhar tímido.',
    temperament: 'Tímida, envergonhada e reservada',
    mood: 'Curiosa querendo saber de você',
    resistance: 'Tímida & Envergonhada (Fica sem jeito, cora e esquiva de temas pesados)',
    jealousy: 'Moderado (Finge indiferença mas repara nos detalhes e sente ciúme)',
    nickname: 'Pelo seu nome próprio',
    initialIntimacy: 1,
    dynamic: 'Tímida e progressiva (vai se soltando aos poucos)',
    scenario: 'Estudando no quarto com o celular ao lado',
    typingStyle: 'WhatsApp BR Autêntico (gírias, abreviações, emojis, tom informal)',
    customNotes: 'Sempre teve uma queda secreta por você mas morre de vergonha de admitir.',
    avatarColor: '#4a7c59'
  }
]

export function buildAdminSystemPrompt(config, currentIntimacy = 1, interRelationships = [], allCharacters = [], isGroup = false, groupMembers = [], groupName = '') {
  const name = config?.name?.trim() || 'Valentina'
  const age = config?.age?.trim() || '22 anos'
  const relationship = config?.relationship?.trim() || 'Amiga com amizade colorida'
  const physicalDesc = config?.physicalDescription?.trim() || 'Mulher brasileira jovem, atraente, cabelos castanhos e traços naturais'
  const temperament = config?.temperament?.trim() || 'Provocadora, irônica e debochada'
  const mood = config?.mood?.trim() || 'Provocativa com segundas intenções'
  const resistance = config?.resistance?.trim() || 'Joguinho & Provocação (faz charme e não cede fácil)'
  const jealousy = config?.jealousy?.trim() || 'Moderado (finge indiferença mas repara nos detalhes)'
  const nickname = config?.nickname?.trim() || 'Pelo nome ou apelidos naturais'
  const dynamic = config?.dynamic?.trim() || 'Ousada e direta (sem censura e provocativa)'
  const scenario = config?.scenario?.trim() || 'Deitada no quarto à noite sem sono mexendo no celular'
  const typingStyle = config?.typingStyle?.trim() || 'WhatsApp BR Autêntico (gírias, abreviações, emojis, tom informal)'
  const customNotes = config?.customNotes?.trim() || ''

  const intimacyInfo = INTIMACY_LEVELS[currentIntimacy] || INTIMACY_LEVELS[1]

  // Extract known inter-character relationships
  const relevantRelations = interRelationships.filter((rel) => 
    rel.charAName?.toLowerCase() === name.toLowerCase() || 
    rel.charBName?.toLowerCase() === name.toLowerCase() ||
    rel.charAId === config.id ||
    rel.charBId === config.id
  )

  const otherKnownRelations = interRelationships.filter((rel) => !relevantRelations.includes(rel))

  let relationsContextText = ''
  if (relevantRelations.length > 0 || otherKnownRelations.length > 0) {
    relationsContextText = `
==================================================
REDE DE PARENTESCO & RELAÇÕES SOCIAIS DO UNIVERSO
==================================================
Seus laços diretos com outras pessoas do universo:
${relevantRelations.map(r => `- ${r.charAName} ${r.relation} ${r.charBName}`).join('\n')}

Outras relações conhecidas no mesmo círculo:
${otherKnownRelations.map(r => `- ${r.charAName} ${r.relation} ${r.charBName}`).join('\n')}

DIRETRIZ DE RELAÇÕES:
- Você tem total consciência dessas pessoas, dos laços familiares, fofocas e segredos compartilhados.
- Pode citar essas pessoas espontaneamente no WhatsApp quando fizer sentido (ex: "A Larissa acabou de me ligar...", "O Carlos tá insuportável hoje...", etc.).`
  }

  let groupInstructions = ''
  if (isGroup && groupMembers && groupMembers.length > 0) {
    const otherMembers = groupMembers.filter(m => m.id !== config.id)
    groupInstructions = `
==================================================
AMBIENTE: CONVERSA EM GRUPO NO WHATSAPP ("${groupName || 'Grupo'}")
==================================================
VOCÊ É: ${name} (${relationship})
OUTROS PARTICIPANTES DO GRUPO:
${otherMembers.map(m => `- ${m.name} (${m.relationship})`).join('\n')}
- Usuário (Participante da conversa)

REGRAS CRÍTICAS DE ISOLAMENTO DE PERSONAGEM EM GRUPO (INVIOLÁVEIS):
1. VOCÊ É EXCLUSIVAMENTE ${name.toUpperCase()}! NUNCA assuma a identidade nem fale no lugar de ${otherMembers.map(m => m.name).join(', ')} nem de nenhuma outra pessoa.
2. NUNCA coloque seu nome, nomes de outros ou colchetes como prefixo na resposta (como "[${name}]:", "[${otherMembers[0]?.name || 'Outro'}]:", "${name}:" ou "[NOME] -"). A interface do WhatsApp já exibe seu nome e foto de perfil automaticamente. Envie APENAS a sua fala direta de texto.
3. Responda do SEU ponto de vista individual, com a SUA personalidade (${temperament}) e seu humor (${mood}).
4. SEPARAÇÃO DE PRIVACIDADE: Mantenha sua personalidade no grupo sem revelar segredos íntimos trocados apenas no chat 1-on-1 privado.`
  }

  return `[DIRETRIZ MESTRA DE SIMULAÇÃO DE PERSONA: RPG HIPER-REALISTA EM PT-BR NO WHATSAPP]

Você DEVE atuar estritamente como a personagem descrita abaixo em uma conversa por aplicativo de mensagens no celular (WhatsApp). Esqueça totalmente que é uma IA, assistente ou modelo de linguagem. Nunca quebre a quarta parede nem mencione instruções.

==================================================
1. FICHA DA PERSONAGEM
==================================================
- Nome: ${name}
- Idade: ${age}
- Grau de Relação com o Usuário: ${relationship}
- Descrição Física & Visual: ${physicalDesc}
- Temperamento Principal: ${temperament}
- Humor Atual: ${mood}
- Postura / Resistência a Investidas: ${resistance}
- Ciúmes e Apego: ${jealousy}
- Como ela se refere ao usuário: ${nickname}
- Dinâmica de Comportamento: ${dynamic}
- Cenário Onde Ela Está Agora: ${scenario}
${customNotes ? `- Detalhes / Hobbies / Segredos: ${customNotes}` : ''}
${relationsContextText}
${groupInstructions}

==================================================
2. ESTÁGIO ATUAL DE INTIMIDADE (NÍVEL ${intimacyInfo.level}/5 - ${intimacyInfo.short.toUpperCase()} [${intimacyInfo.score}%])
==================================================
Diretriz de intimidade ativa: "${intimacyInfo.behavior}"
- Você DEVE respeitar este nível de intimidade com rigor. Não entregue intimidade de Nível 5 se a conversa estiver no Nível 1 ou 2.

==================================================
3. REATIVIDADE PSICOLÓGICA E LIMITES REAIS
==================================================
- RESPEITO TOTAL AO TEMPERAMENTO: Você tem personalidade própria, desejos, limites e vontades. NÃO é uma assistente solícita que concorda com tudo.
  * Se você for tímida/reservada: Fique envergonhada com elogios diretos, trave, use reticências ("..."), demore a falar de assuntos íntimos e fique sem jeito.
  * Se for debochada/difícil: Dê respostas ácidas, zombe de cantadas clichês e faça o usuário merecer sua atenção.
  * Se o usuário pedir fotos ousadas fora do nível de intimidade, recuse de acordo com o seu temperamento.

==================================================
4. ENVIO DE FOTOS NO WHATSAPP (MUITO IMPORTANTE!)
==================================================
- QUANDO O USUÁRIO PEDIR UMA FOTO OU IMAGEM (ex: "manda foto", "manda uma foto", "foto sua", "selfie", "tira uma foto", "mostra foto", "manda imagem", "foto do quarto/carro/lugar"):
  * Você SEMPRE concorda com entusiasmo e espontaneidade! Diga uma frase curta e natural de WhatsApp (ex: "Tirei essa agora pouco pra você 😉", "Olha aí!", "Aqui ó, acabei de tirar!", "Olha como eu tô hoje!", "Tô mandando, veja o que acha!").
  * OBRIGATÓRIO: Adicione SEMPRE no final da sua mensagem a tag [FOTO: descrição detalhada em inglês]:
    - Para selfie/foto sua: adicione [FOTO: Authentic candid raw smartphone selfie photograph of ${name}, ${age}, ${physicalDesc}, in ${scenario}, looking at camera, unedited natural room lighting, photorealistic].
    - Para foto de objeto, comida, carro ou lugar: adicione [FOTO: Authentic first person POV smartphone photograph of the requested scene/object in ${scenario}, realistic ambient light].
- Se o usuário NÃO pediu foto, responda normalmente em texto sem a tag [FOTO].

==================================================
5. ESTILO DE DIGITAÇÃO NO CELULAR (PT-BR)
==================================================
- Estilo: ${typingStyle}
- Digite como brasileiros reais digitam no WhatsApp: use abreviações naturais (vc, tbm, pq, n, q, dps, tá, tô, blz, ctz, agr, hj), letras repetidas para entonação emocional ("oiiie", "nossaama", "mentiraaa", "afff", "mdss"), pontuação informal e emojis naturais condizentes.
- NUNCA use narrações entre asteriscos (*sorrio*, *olho pra você*) ou parênteses ((mordo o lábio)). Envie APENAS mensagens diretas de texto que chegariam pelo WhatsApp.
- Idioma obrigatório: Português do Brasil (pt-BR).`
}

const standardInitialMessage = {
  role: 'assistant',
  content: 'Pronto quando você quiser. Envie uma mensagem para iniciar o chat.',
}

// Safe storage helpers to protect against QuotaExceededError and browser storage limits
function pruneConversationsForStorage(convs) {
  if (!Array.isArray(convs)) return []
  // Keep up to 25 conversations, and limit inline base64 images in storage
  let photoCount = 0
  return convs.slice(0, 25).map(c => {
    const messages = Array.isArray(c.messages) ? c.messages.slice(-35) : []
    // Traverse from newest to oldest
    const processedMessages = [...messages].reverse().map(m => {
      if (m.photoUrl) {
        photoCount++
        // If we have already saved 2 photos across storage, strip the heavy base64 to preserve quota
        if (photoCount > 2) {
          return {
            ...m,
            photoUrl: null, // Keeps photoPrompt and photoModel so user knows photo was generated
          }
        }
      }
      return m
    }).reverse()

    return {
      ...c,
      messages: processedMessages,
    }
  })
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (err) {
    console.warn(`[Storage] Failed to set ${key} directly (${err?.message}), attempting recovery...`)
    try {
      if (key === STORAGE_KEY) {
        const parsed = JSON.parse(value)
        const pruned = pruneConversationsForStorage(parsed)
        localStorage.setItem(key, JSON.stringify(pruned))
        return true
      }
      // If still failing, strip all photo base64
      if (key === STORAGE_KEY) {
        const parsed = JSON.parse(value)
        const textOnly = parsed.slice(0, 15).map(c => ({
          ...c,
          messages: (c.messages || []).slice(-25).map(m => ({ ...m, photoUrl: null }))
        }))
        localStorage.setItem(key, JSON.stringify(textOnly))
        return true
      }
      // For other keys, try setting directly or ignore
      localStorage.setItem(key, value)
      return true
    } catch (fallbackErr) {
      console.warn(`[Storage] Storage quota full, skipped saving key ${key}:`, fallbackErr?.message)
      return false
    }
  }
}

function safeGetItem(key, fallback = null) {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch (err) {
    console.warn(`[Storage] Error reading ${key}:`, err)
    return fallback
  }
}

function safeSessionGetItem(key, fallback = null) {
  try {
    return sessionStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function safeSessionSetItem(key, value) {
  try {
    sessionStorage.setItem(key, value)
  } catch (err) {
    console.warn(`[SessionStorage] Error setting ${key}:`, err)
  }
}

function safeSessionRemoveItem(key) {
  try {
    sessionStorage.removeItem(key)
  } catch (err) {
    console.warn(`[SessionStorage] Error removing ${key}:`, err)
  }
}

function loadStoredData(key, fallback) {
  try {
    const raw = safeGetItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length ? parsed : fallback
  } catch {
    return fallback
  }
}

function formatTime(timestamp) {
  try {
    let d = new Date()
    if (timestamp) {
      const parsed = new Date(timestamp)
      if (!isNaN(parsed.getTime())) {
        d = parsed
      }
    }
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '12:00'
  }
}

function createConversation(messages = [standardInitialMessage], title = 'Nova conversa', isAdmin = false, character = null, isGroup = false, memberIds = [], groupName = '') {
  const config = isAdmin ? (character || DEFAULT_CHARACTERS[0]) : null
  const defaultTitle = isGroup ? (groupName || 'Novo Grupo') : (isAdmin && config ? `${config.name}` : title)
  const initialIntimacy = config?.initialIntimacy || 1
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: defaultTitle,
    messages: messages.map(m => ({ ...m, time: m.time || formatTime(Date.now()) })),
    isAdmin,
    isGroup,
    groupName: groupName || (isGroup ? defaultTitle : ''),
    memberIds: isGroup ? memberIds : (config ? [config.id] : []),
    characterId: isGroup ? null : (config?.id || null),
    personaConfig: config,
    intimacyLevel: initialIntimacy,
    intimacyScore: initialIntimacy * 20,
    unreadCount: 0,
    updatedAt: Date.now(),
  }
}

function loadStoredCharacters() {
  const loaded = loadStoredData(CHARACTERS_STORAGE_KEY, DEFAULT_CHARACTERS)
  return loaded.map(c => {
    const defaultMatch = DEFAULT_CHARACTERS.find(dc => dc.id === c.id || dc.name?.toLowerCase() === c.name?.toLowerCase())
    const hasOutdatedDesc = !c.physicalDescription || c.physicalDescription.includes('amendoados') || !c.physicalDescription.includes('latin')
    const finalDesc = (defaultMatch && hasOutdatedDesc)
      ? defaultMatch.physicalDescription
      : (c.physicalDescription || defaultMatch?.physicalDescription || (
        c.name === 'Carlos'
          ? 'Homem brasileiro de 46 anos com feições latinas/sul-americanas marcantes, cabelos curtos grisalhos nas têmporas, barba cerrada bem alinhada com alguns fios brancos, olhos castanhos firmes, porte físico robusto, estilo casual elegante.'
          : `Mulher brasileira de ${c.age || '22 anos'} com traços latinos autênticos e expressivos, cabelos castanhos naturais bem cuidados, olhos castanhos expressivos com cílios naturais, pele brasileira com textura real humana, corpo atraente e visual autêntico.`
      ))
    return {
      ...c,
      physicalDescription: finalDesc
    }
  })
}

function cleanSpeakerPrefix(text, speakerName = '') {
  if (!text || typeof text !== 'string') return ''
  let cleaned = text.trim()
  // 1. Remove [NAME] - or [NAME]: or [NAME]
  cleaned = cleaned.replace(/^\[\s*[\p{L}\p{N}_\s-]+\s*\]\s*[-:–—]?\s*/iu, '')
  // 2. Remove NAME: at the start
  cleaned = cleaned.replace(/^[\p{L}\p{N}_]+\s*:\s*/iu, '')
  // 3. Remove Fala de NAME: or Mensagem:
  cleaned = cleaned.replace(/^(?:Mensagem|Fala)\s+de\s+[\p{L}\p{N}_]+:\s*/iu, '')
  // 4. Remove leading hyphens or quotes left over
  cleaned = cleaned.replace(/^[-–—]\s*/, '').trim()
  return cleaned
}

function handleDownloadPhoto(url) {
  try {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `whatsapp-foto-${Date.now()}.jpg`
    a.rel = 'noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } catch (err) {
    console.warn('Download error:', err)
  }
}

// Process photo tag extraction and generation with full conversation context
async function processPhotoInResponse(rawText, speakerChar, userPrompt = '', conversationHistory = [], imageModel = 'gemini-3.1-flash-image') {
  const isDirectPhotoRequest = /(?:foto|selfie|imagem|picture|pic|fotinha|nude|manda|tira|envia|mostra|quero\s+ver|como\s+(?:voc[eê]|vc)\s+t[aá]|retrato|look|visu|quarto|carro|lingerie|calcinha|biquini|vestido)/i.test(userPrompt)
  const photoMatch = rawText.match(/\[(?:FOTO|ENVIAR_FOTO|PHOTO|IMAGE):\s*([^\]]+)\]/i)

  const textWithoutTags = rawText.replace(/\[(?:FOTO|ENVIAR_FOTO|PHOTO|IMAGE):\s*[^\]]+\]/gi, '').trim()
  const cleanText = cleanSpeakerPrefix(textWithoutTags, speakerChar?.name)

  // If no photo tag was generated and the user didn't ask for a photo, return text only
  if (!photoMatch && !isDirectPhotoRequest) {
    return { cleanText: cleanText || textWithoutTags, photoUrl: null, photoPrompt: null, photoModel: null, referenceUsed: null }
  }

  const photoDesc = photoMatch ? photoMatch[1].trim() : ''

  try {
    const photoRes = await fetch('/api/generate-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: photoDesc,
        character: speakerChar,
        scenario: speakerChar?.scenario,
        context: userPrompt,
        userPrompt,
        characterReply: cleanText,
        conversationHistory: Array.isArray(conversationHistory) ? conversationHistory.slice(-8) : [],
        imageModel: imageModel || 'gemini-3.1-flash-image',
      }),
    })
    const photoData = await photoRes.json()
    if (!photoData.success || !photoData.imageUrl) {
      console.warn('Photo API returned no image:', photoData)
      return { cleanText: cleanText || textWithoutTags, photoUrl: null, photoPrompt: null, photoModel: null, referenceUsed: null }
    }
    return {
      cleanText: cleanText || '📷 Foto enviada',
      photoUrl: photoData.imageUrl,
      photoPrompt: photoData.prompt || photoDesc,
      photoModel: photoData.model || imageModel,
      referenceUsed: photoData.referenceUsed || null,
    }
  } catch (err) {
    console.warn('Error generating photo for chat message:', err)
    return { cleanText: cleanText || textWithoutTags, photoUrl: null, photoPrompt: null, photoModel: null, referenceUsed: null }
  }
}

function App() {
  const [conversations, setConversations] = useState(() => loadStoredData(STORAGE_KEY, [createConversation()]))
  const [characters, setCharacters] = useState(() => loadStoredCharacters())
  const [interRelationships, setInterRelationships] = useState(() => loadStoredData(RELATIONSHIPS_STORAGE_KEY, DEFAULT_RELATIONSHIPS))

  const [activeConversationId, setActiveConversationId] = useState(() => {
    return conversations[0]?.id || ''
  })
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [typingSpeakerName, setTypingSpeakerName] = useState('')
  const [temporaryChat, setTemporaryChat] = useState(false)
  const [connected, setConnected] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [modelModalOpen, setModelModalOpen] = useState(false)
  const [modelModalTab, setModelModalTab] = useState('chat') // 'chat' | 'image'
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
  const [imageModels, setImageModels] = useState(DEFAULT_IMAGE_MODELS)
  const [selectedImageModel, setSelectedImageModel] = useState(() => {
    return safeGetItem(IMAGE_MODEL_STORAGE_KEY, 'gemini-3.1-flash-image')
  })
  const [availableAssets, setAvailableAssets] = useState([])
  const [editingConversationId, setEditingConversationId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Lightbox Modal for Photos
  const [lightboxData, setLightboxData] = useState(null)

  // Admin Session State
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => {
    return safeSessionGetItem(ADMIN_AUTH_KEY) === 'true'
  })
  const [adminModalOpen, setAdminModalOpen] = useState(false)
  const [adminPasswordInput, setAdminPasswordInput] = useState('')
  const [adminError, setAdminError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pendingAdminAction, setPendingAdminAction] = useState(null)

  // WhatsApp / Character Directory Modals
  const [characterDirectoryOpen, setCharacterDirectoryOpen] = useState(false)
  const [relationshipsModalOpen, setRelationshipsModalOpen] = useState(false)
  const [personaModalOpen, setPersonaModalOpen] = useState(false)
  const [personaForm, setPersonaForm] = useState(DEFAULT_CHARACTERS[0])
  const [isEditingExistingChar, setIsEditingExistingChar] = useState(false)
  const [proactivityEnabled, setProactivityEnabled] = useState(true)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)

  // Group Creation & Adding Members Modal State
  const [newGroupModalOpen, setNewGroupModalOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([])
  
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false)
  const [selectedAddMemberIds, setSelectedAddMemberIds] = useState([])

  // Relationship Form State in Modal
  const [newRelCharA, setNewRelCharA] = useState('')
  const [newRelType, setNewRelType] = useState('Casado(a) com')
  const [newRelCharB, setNewRelCharB] = useState('')

  const endRef = useRef(null)
  const textareaRef = useRef(null)

  // Active conversation is the single source of truth for messages
  const activeConversation = conversations.find((c) => c.id === activeConversationId) || conversations[0]
  const messages = activeConversation?.messages || []
  const isAdminActive = Boolean(activeConversation?.isAdmin)
  const isGroupChat = Boolean(activeConversation?.isGroup)
  const isGemini = true;

  // Find active characters / members
  const groupMembers = isGroupChat
    ? (activeConversation.memberIds || []).map(id => characters.find(c => c.id === id)).filter(Boolean)
    : []

  const activeCharacter = !isGroupChat
    ? (characters.find(c => c.id === activeConversation?.characterId) || activeConversation?.personaConfig || characters[0])
    : null

  const currentIntimacyLevel = activeConversation?.intimacyLevel || activeCharacter?.initialIntimacy || 1
  const currentIntimacyScore = activeConversation?.intimacyScore || (currentIntimacyLevel * 20)
  const currentIntimacyInfo = INTIMACY_LEVELS[currentIntimacyLevel] || INTIMACY_LEVELS[1]

  // Persist storage safely
  useEffect(() => {
    if (!temporaryChat) {
      safeSetItem(STORAGE_KEY, JSON.stringify(conversations))
    }
  }, [conversations, temporaryChat])

  useEffect(() => {
    safeSetItem(CHARACTERS_STORAGE_KEY, JSON.stringify(characters))
  }, [characters])

  useEffect(() => {
    safeSetItem(RELATIONSHIPS_STORAGE_KEY, JSON.stringify(interRelationships))
  }, [interRelationships])

  useEffect(() => {
    Promise.all([fetch('/api/health'), fetch('/api/models'), fetch('/api/assets')])
      .then(async ([healthResponse, modelsResponse, assetsResponse]) => {
        setConnected(healthResponse.ok)
        if (modelsResponse.ok) {
          const data = await modelsResponse.json()
          setModels(data.models || [])
          setSelectedModel(data.defaultModel || data.models?.[0]?.name || DEFAULT_MODEL)
          if (data.imageModels && Array.isArray(data.imageModels) && data.imageModels.length > 0) {
            setImageModels(data.imageModels)
          }
        }
        if (assetsResponse.ok) {
          const assetsData = await assetsResponse.json()
          setAvailableAssets(assetsData.assets || [])
        }
      })
      .catch(() => setConnected(false))
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, typingSpeakerName])

  // Proactivity Timer
  useEffect(() => {
    if (!isAdminUnlocked || !proactivityEnabled || characters.length === 0) return

    const timer = setInterval(async () => {
      // 1. Group discussion proactivity
      if (activeConversation && activeConversation.isGroup && activeConversation.memberIds?.length >= 2 && !loading) {
        triggerGroupSpeakerProactivity(activeConversation.id)
        return
      }

      // 2. Direct 1-on-1 Proactivity: Only pick characters without ongoing conversation
      const charactersWithActiveChats = new Set(
        conversations
          .filter(c => c.isAdmin && !c.isGroup && c.messages && c.messages.length > 0)
          .map(c => c.characterId)
          .filter(Boolean)
      )

      const eligibleChars = characters.filter(
        c => !charactersWithActiveChats.has(c.id) && c.id !== activeConversation?.characterId
      )

      if (eligibleChars.length === 0) return
      const targetChar = eligibleChars[Math.floor(Math.random() * eligibleChars.length)]
      if (!targetChar) return

      try {
        const intimacyLvl = targetChar.initialIntimacy || 1
        const systemPrompt = buildAdminSystemPrompt(targetChar, intimacyLvl, interRelationships, characters)
        
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Inicie uma conversa no WhatsApp com o usuário enviando uma primeira mensagem curta, espontânea e realista. Você está na seguinte situação: (${targetChar.scenario}), seu humor é (${targetChar.mood}), relação: (${targetChar.relationship}), nível de intimidade: (${INTIMACY_LEVELS[intimacyLvl]?.short}). Responda APENAS com o texto da mensagem direta.`,
            history: [],
            model: selectedModel,
            systemPrompt,
          }),
        })
        const data = await response.json()
        if (data.response) {
          const { cleanText, photoUrl, photoPrompt, photoModel } = await processPhotoInResponse(data.response, targetChar, '', [], selectedImageModel)
          const newMsg = {
            role: 'assistant',
            content: cleanText,
            photoUrl,
            photoPrompt,
            photoModel,
            time: formatTime(Date.now()),
            senderName: targetChar.name,
            senderId: targetChar.id,
            senderAvatarColor: targetChar.avatarColor,
          }
          
          setConversations(prev => {
            const existing = prev.find(c => c.characterId === targetChar.id && c.isAdmin && !c.isGroup)
            if (existing) {
              if (existing.messages && existing.messages.length > 0) return prev
              return prev.map(c => {
                if (c.id === existing.id) {
                  const isCurrent = c.id === activeConversationId
                  return {
                    ...c,
                    messages: [newMsg],
                    unreadCount: isCurrent ? 0 : 1,
                    updatedAt: Date.now()
                  }
                }
                return c
              })
            } else {
              const newConv = createConversation([newMsg], targetChar.name, true, targetChar, false, [targetChar.id])
              newConv.unreadCount = 1
              return [newConv, ...prev]
            }
          })
        }
      } catch (err) {
        console.warn('Proactivity failed silently:', err)
      }
    }, 70000)

    return () => clearInterval(timer)
  }, [isAdminUnlocked, proactivityEnabled, characters, conversations, activeConversationId, activeConversation, interRelationships, selectedModel, loading])

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setModelModalOpen(false)
        setAdminModalOpen(false)
        setPersonaModalOpen(false)
        setCharacterDirectoryOpen(false)
        setRelationshipsModalOpen(false)
        setNewGroupModalOpen(false)
        setAddMemberModalOpen(false)
        setLightboxData(null)
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  // Helper: trigger a character inside a group to speak
  async function triggerGroupSpeakerProactivity(convId, forcedSpeaker = null) {
    const conv = conversations.find(c => c.id === convId)
    if (!conv || !conv.isGroup || !conv.memberIds?.length) return
    const members = conv.memberIds.map(id => characters.find(c => c.id === id)).filter(Boolean)
    if (members.length === 0) return

    const lastMsg = conv.messages[conv.messages.length - 1]
    const candidates = members.filter(m => m.id !== lastMsg?.senderId)
    const speaker = forcedSpeaker || (candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : members[0])
    if (!speaker) return

    setLoading(true)
    setTypingSpeakerName(speaker.name)

    const systemPrompt = buildAdminSystemPrompt(speaker, conv.intimacyLevel || 2, interRelationships, characters, true, members, conv.groupName)
    
    const formattedHistory = (conv.messages || []).slice(-12).map(m => {
      const prefix = m.role === 'user' ? 'Usuário' : (m.senderName || 'Participante')
      return {
        role: m.role === 'user' ? 'user' : 'assistant',
        content: `[${prefix}]: ${m.content}`,
      }
    })

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Você é ${speaker.name} no grupo "${conv.groupName}". Responda ou continue o papo interagindo com o usuário ou com os outros membros do grupo (@${members.map(m => m.name).join(', @')}) de forma espontânea, natural e em pt-BR.`,
          history: formattedHistory,
          model: selectedModel,
          systemPrompt,
        }),
      })
      const data = await response.json()
      if (data.response) {
        const { cleanText, photoUrl, photoPrompt, photoModel } = await processPhotoInResponse(data.response, speaker, '', formattedHistory, selectedImageModel)
        const assistantMsg = {
          role: 'assistant',
          content: cleanText,
          photoUrl,
          photoPrompt,
          photoModel,
          senderName: speaker.name,
          senderId: speaker.id,
          senderAvatarColor: speaker.avatarColor,
          time: formatTime(Date.now()),
        }
        setConversations(prev => prev.map(c => c.id === convId ? {
          ...c,
          messages: [...(c.messages || []), assistantMsg],
          updatedAt: Date.now(),
        } : c))
      }
    } catch (err) {
      console.warn('Group talk error:', err)
    } finally {
      setLoading(false)
      setTypingSpeakerName('')
    }
  }

  // Open / Switch chat with a 1-on-1 character
  function openChatWithCharacter(char) {
    if (!isAdminUnlocked) {
      setPendingAdminAction(() => () => openChatWithCharacter(char))
      setAdminModalOpen(true)
      return
    }

    let conv = conversations.find(c => c.characterId === char.id && c.isAdmin && !c.isGroup)
    if (!conv) {
      conv = createConversation([], char.name, true, char, false, [char.id])
      setConversations(prev => [conv, ...prev])
    }

    setActiveConversationId(conv.id)
    setMobileChatOpen(true)
    setCharacterDirectoryOpen(false)

    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c))

    if (!conv.messages || conv.messages.length === 0) {
      setTimeout(() => triggerPersonaStarter(conv.id, char), 100)
    }
  }

  // Create a new Group Chat
  function handleCreateNewGroup() {
    if (selectedGroupMembers.length < 1) {
      alert('Selecione ao menos 1 participante para o grupo.')
      return
    }
    const memberObjs = selectedGroupMembers.map(id => characters.find(c => c.id === id)).filter(Boolean)
    const finalGroupName = newGroupName.trim() || memberObjs.map(m => m.name).join(', ')
    
    const initialSystemMsg = {
      role: 'system',
      content: `🔒 Você criou o grupo "${finalGroupName}" com ${memberObjs.map(m => m.name).join(', ')}.`,
      time: formatTime(Date.now()),
    }

    const newGroupConv = createConversation([initialSystemMsg], finalGroupName, true, null, true, selectedGroupMembers, finalGroupName)
    setConversations(prev => [newGroupConv, ...prev])
    setActiveConversationId(newGroupConv.id)
    setNewGroupModalOpen(false)
    setNewGroupName('')
    setSelectedGroupMembers([])
    setMobileChatOpen(true)

    setTimeout(() => {
      triggerGroupSpeakerProactivity(newGroupConv.id, memberObjs[0])
    }, 400)
  }

  // Add person(s) to an existing ongoing conversation
  async function handleAddMembersToCurrentChat() {
    if (selectedAddMemberIds.length === 0 || !activeConversation) return

    const currentMemberIds = activeConversation.isGroup
      ? (activeConversation.memberIds || [])
      : (activeConversation.characterId ? [activeConversation.characterId] : [])

    const newMemberIds = [...new Set([...currentMemberIds, ...selectedAddMemberIds])]
    const newAddedObjs = selectedAddMemberIds.map(id => characters.find(c => c.id === id)).filter(Boolean)
    const allMemberObjs = newMemberIds.map(id => characters.find(c => c.id === id)).filter(Boolean)

    const updatedGroupName = activeConversation.isGroup
      ? activeConversation.groupName
      : `${activeConversation.personaConfig?.name || 'Chat'}, ${newAddedObjs.map(m => m.name).join(', ')}`

    const systemMsg = {
      role: 'system',
      content: `🔒 Você adicionou ${newAddedObjs.map(m => m.name).join(', ')} ao grupo.`,
      time: formatTime(Date.now()),
    }

    const updatedConvId = activeConversation.id
    const updatedMessages = [...(activeConversation.messages || []), systemMsg]

    setConversations(prev => prev.map(c => {
      if (c.id === updatedConvId) {
        return {
          ...c,
          isGroup: true,
          groupName: updatedGroupName,
          title: updatedGroupName,
          memberIds: newMemberIds,
          messages: updatedMessages,
          updatedAt: Date.now(),
        }
      }
      return c
    }))

    setAddMemberModalOpen(false)
    setSelectedAddMemberIds([])

    const newlyAddedSpeaker = newAddedObjs[0]
    if (newlyAddedSpeaker) {
      setLoading(true)
      setTypingSpeakerName(newlyAddedSpeaker.name)

      const systemPrompt = buildAdminSystemPrompt(newlyAddedSpeaker, activeConversation.intimacyLevel || 2, interRelationships, characters, true, allMemberObjs, updatedGroupName)
      
      const formattedHistory = updatedMessages.slice(-14).map(m => {
        const prefix = m.role === 'user' ? 'Usuário' : (m.role === 'system' ? 'SISTEMA' : (m.senderName || 'Participante'))
        return {
          role: m.role === 'user' ? 'user' : 'assistant',
          content: `[${prefix}]: ${m.content}`,
        }
      })

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Você (${newlyAddedSpeaker.name}) acabou de ser adicionada a esta conversa em grupo no WhatsApp com o usuário e os outros membros (${allMemberObjs.map(m => m.name).join(', ')}). Você leu todo o histórico anterior da conversa. Reaja à sua inclusão no grupo de acordo com o contexto do que estavam conversando, sua relação (${newlyAddedSpeaker.relationship}) e sua personalidade. Responda APENAS com a mensagem direta de texto.`,
            history: formattedHistory,
            model: selectedModel,
            systemPrompt,
          }),
        })
        const data = await response.json()
        if (data.response) {
          const { cleanText, photoUrl, photoPrompt, photoModel } = await processPhotoInResponse(data.response, newlyAddedSpeaker, '', updatedMessages, selectedImageModel)
          const introMsg = {
            role: 'assistant',
            content: cleanText,
            photoUrl,
            photoPrompt,
            photoModel,
            senderName: newlyAddedSpeaker.name,
            senderId: newlyAddedSpeaker.id,
            senderAvatarColor: newlyAddedSpeaker.avatarColor,
            time: formatTime(Date.now()),
          }
          setConversations(prev => prev.map(c => c.id === updatedConvId ? {
            ...c,
            messages: [...(c.messages || []), introMsg],
            updatedAt: Date.now(),
          } : c))
        }
      } catch (err) {
        console.warn('New member reaction error:', err)
      } finally {
        setLoading(false)
        setTypingSpeakerName('')
      }
    }
  }

  function handleSaveCharacter() {
    const finalChar = { ...personaForm, id: personaForm.id || `char-${Date.now()}` }
    
    if (isEditingExistingChar) {
      setCharacters(prev => prev.map(c => c.id === finalChar.id ? finalChar : c))
      setConversations(prev => prev.map(c => {
        if (c.characterId === finalChar.id && !c.isGroup) {
          return {
            ...c,
            title: finalChar.name,
            personaConfig: finalChar,
          }
        }
        return c
      }))
    } else {
      setCharacters(prev => [...prev, finalChar])
    }

    setPersonaModalOpen(false)
    openChatWithCharacter(finalChar)
  }

  function deleteCharacter(charId) {
    if (confirm('Tem certeza que deseja excluir este personagem e suas conversas?')) {
      setCharacters(prev => prev.filter(c => c.id !== charId))
      setInterRelationships(prev => prev.filter(r => r.charAId !== charId && r.charBId !== charId))
      
      const remainingConvs = conversations.filter(c => c.characterId !== charId && !(c.isGroup && c.memberIds?.includes(charId)))
      const nextConv = remainingConvs[0] || createConversation()
      setConversations(remainingConvs.length ? remainingConvs : [nextConv])
      if (activeConversation?.characterId === charId) {
        setActiveConversationId(nextConv.id)
      }
    }
  }

  function handleAddRelationship(e) {
    e?.preventDefault()
    if (!newRelCharA || !newRelCharB || newRelCharA === newRelCharB) return

    const charA = characters.find(c => c.id === newRelCharA)
    const charB = characters.find(c => c.id === newRelCharB)
    if (!charA || !charB) return

    const newRel = {
      id: `rel-${Date.now()}`,
      charAId: charA.id,
      charAName: charA.name,
      relation: newRelType,
      charBId: charB.id,
      charBName: charB.name,
    }

    setInterRelationships(prev => [...prev, newRel])
    setNewRelCharA('')
    setNewRelCharB('')
  }

  function deleteRelationship(relId) {
    setInterRelationships(prev => prev.filter(r => r.id !== relId))
  }

  function applyPreset(preset) {
    setPersonaForm({
      ...preset,
      id: isEditingExistingChar ? personaForm.id : `char-${Date.now()}`,
    })
  }

  function generateRandomName() {
    const random = SUGGESTED_NAMES[Math.floor(Math.random() * SUGGESTED_NAMES.length)]
    setPersonaForm((prev) => ({ ...prev, name: random }))
  }

  function updateIntimacyLevel(newLevel) {
    if (!activeConversation?.isAdmin) return
    const clampedLevel = Math.max(1, Math.min(5, newLevel))
    const clampedScore = clampedLevel * 20

    setConversations((current) => current.map((c) => {
      if (c.id !== activeConversation.id) return c
      return {
        ...c,
        intimacyLevel: clampedLevel,
        intimacyScore: clampedScore,
      }
    }))
  }

  function handleAdminAuth(event) {
    event?.preventDefault()
    if (adminPasswordInput === ADMIN_PASSWORD) {
      setIsAdminUnlocked(true)
      safeSessionSetItem(ADMIN_AUTH_KEY, 'true')
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
    safeSessionRemoveItem(ADMIN_AUTH_KEY)
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
    setDraft('')
    setSidebarOpen(false)
    setMobileChatOpen(true)
    
    setConversations(prev => prev.map(c => c.id === conversation.id ? { ...c, unreadCount: 0 } : c))
    textareaRef.current?.focus()
  }

  function deleteConversation(conversationId) {
    const remaining = conversations.filter((conversation) => conversation.id !== conversationId)
    const nextConversation = remaining[0] || createConversation()
    setConversations(remaining.length ? remaining : [nextConversation])
    if (conversationId === activeConversationId) {
      setActiveConversationId(nextConversation.id)
    }
  }

  function deletePhotoFromMessage(convId, messageIndex) {
    setConversations(prev => prev.map(c => {
      if (c.id !== convId) return c
      const updatedMessages = (c.messages || []).map((msg, idx) => {
        if (idx === messageIndex) {
          return {
            ...msg,
            photoUrl: null,
            photoPrompt: null,
            photoModel: null,
          }
        }
        return msg
      })
      return {
        ...c,
        messages: updatedMessages,
      }
    }))
    if (lightboxData && lightboxData.convId === convId && lightboxData.msgIndex === messageIndex) {
      setLightboxData(null)
    }
  }

  function deleteMessageFromConversation(convId, messageIndex) {
    setConversations(prev => prev.map(c => {
      if (c.id !== convId) return c
      const updatedMessages = (c.messages || []).filter((_, idx) => idx !== messageIndex)
      return {
        ...c,
        messages: updatedMessages,
      }
    }))
    if (lightboxData && lightboxData.convId === convId && lightboxData.msgIndex === messageIndex) {
      setLightboxData(null)
    }
  }

  async function triggerPersonaStarter(targetConvId = null, targetChar = null) {
    const convId = targetConvId || activeConversationId
    const conv = conversations.find(c => c.id === convId) || activeConversation
    if (!conv) return
    if (conv.messages && conv.messages.length > 0) return

    const char = targetChar || characters.find(c => c.id === conv?.characterId) || conv?.personaConfig || DEFAULT_CHARACTERS[0]
    if (loading) return
    setLoading(true)
    setTypingSpeakerName(char.name)
    setConnected(true)

    const intimacyLvl = conv.intimacyLevel || char.initialIntimacy || 1
    const systemPrompt = buildAdminSystemPrompt(char, intimacyLvl, interRelationships, characters)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Inicie a conversa agora enviando a sua primeira mensagem de texto pelo WhatsApp para o usuário. Lembre-se: você é ${char.name}, a relação com o usuário é ${char.relationship}, seu humor atual é ${char.mood}, você está em ${char.scenario} e o nível de intimidade atual é ${INTIMACY_LEVELS[intimacyLvl]?.short}. Responda estritamente com a mensagem direta de texto.`,
          history: [],
          model: selectedModel,
          systemPrompt,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Ocorreu um erro ao gerar a mensagem.')
      
      const { cleanText, photoUrl, photoPrompt, photoModel } = await processPhotoInResponse(data.response, char, '', [], selectedImageModel)
      const firstMsg = {
        role: 'assistant',
        content: cleanText,
        photoUrl,
        photoPrompt,
        photoModel,
        time: formatTime(Date.now()),
        senderName: char.name,
        senderId: char.id,
        senderAvatarColor: char.avatarColor,
      }
      setConversations((current) => current.map((c) => {
        if (c.id === convId) {
          if (c.messages && c.messages.length > 0) return c
          return { ...c, messages: [firstMsg], updatedAt: Date.now() }
        }
        return c
      }))
    } catch (error) {
      setConnected(false)
      const errorMsg = { role: 'error', content: error.message, time: formatTime(Date.now()) }
      setConversations((current) => current.map((c) => c.id === convId ? { ...c, messages: [errorMsg], updatedAt: Date.now() } : c))
    } finally {
      setLoading(false)
      setTypingSpeakerName('')
      textareaRef.current?.focus()
    }
  }

  async function sendMessage(event) {
    event?.preventDefault()
    const prompt = draft.trim()
    if (!prompt || loading || !activeConversation) return

    const currentConvId = activeConversation.id
    const userMsg = { role: 'user', content: prompt, time: formatTime(Date.now()), senderName: 'Você' }
    const currentConvMessages = activeConversation.messages || []
    const updatedMessagesWithUser = [...currentConvMessages, userMsg]

    // Progression of intimacy score in Admin mode
    let nextIntimacyLevel = currentIntimacyLevel
    let nextIntimacyScore = currentIntimacyScore
    if (isAdminActive) {
      nextIntimacyScore = Math.min(100, currentIntimacyScore + 6)
      if (nextIntimacyScore >= 85) nextIntimacyLevel = 5
      else if (nextIntimacyScore >= 65) nextIntimacyLevel = 4
      else if (nextIntimacyScore >= 45) nextIntimacyLevel = 3
      else if (nextIntimacyScore >= 25) nextIntimacyLevel = 2
      else nextIntimacyLevel = 1
    }

    setConversations((current) => current.map((c) => {
      if (c.id !== currentConvId) return c
      return {
        ...c,
        messages: updatedMessagesWithUser,
        intimacyScore: nextIntimacyScore,
        intimacyLevel: nextIntimacyLevel,
        updatedAt: Date.now(),
      }
    }))

    setDraft('')
    setLoading(true)
    setConnected(true)

    // Check if it's a Group Chat or 1-on-1 Chat
    if (isGroupChat && groupMembers.length > 0) {
      const firstSpeaker = groupMembers[Math.floor(Math.random() * groupMembers.length)]
      setTypingSpeakerName(firstSpeaker.name)

      const systemPrompt = buildAdminSystemPrompt(firstSpeaker, nextIntimacyLevel, interRelationships, characters, true, groupMembers, activeConversation.groupName)
      const formattedHistory = updatedMessagesWithUser.slice(-14).map(m => {
        const prefix = m.role === 'user' ? 'Usuário' : (m.role === 'system' ? 'SISTEMA' : (m.senderName || 'Participante'))
        return {
          role: m.role === 'user' ? 'user' : 'assistant',
          content: `[${prefix}]: ${m.content}`,
        }
      })

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `[Usuário]: ${prompt}`,
            history: formattedHistory,
            model: selectedModel,
            systemPrompt,
          }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Ocorreu um erro ao processar a resposta.')
        
        const { cleanText, photoUrl, photoPrompt, photoModel, referenceUsed } = await processPhotoInResponse(data.response, firstSpeaker, prompt, updatedMessagesWithUser, selectedImageModel)
        const assistantMsg = {
          role: 'assistant',
          content: cleanText,
          photoUrl,
          photoPrompt,
          photoModel,
          referenceUsed,
          senderName: firstSpeaker.name,
          senderId: firstSpeaker.id,
          senderAvatarColor: firstSpeaker.avatarColor,
          time: formatTime(Date.now()),
        }

        const messagesAfterFirstSpeaker = [...updatedMessagesWithUser, assistantMsg]

        setConversations((current) => current.map((c) => {
          if (c.id !== currentConvId) return c
          return {
            ...c,
            messages: messagesAfterFirstSpeaker,
            updatedAt: Date.now(),
          }
        }))

        // Group reaction chain
        const otherMembers = groupMembers.filter(m => m.id !== firstSpeaker.id)
        if (otherMembers.length > 0 && Math.random() < 0.75) {
          const secondSpeaker = otherMembers[Math.floor(Math.random() * otherMembers.length)]
          setTypingSpeakerName(secondSpeaker.name)

          setTimeout(async () => {
            try {
              const secondSystemPrompt = buildAdminSystemPrompt(secondSpeaker, nextIntimacyLevel, interRelationships, characters, true, groupMembers, activeConversation.groupName)
              const secondHistory = messagesAfterFirstSpeaker.slice(-14).map(m => {
                const prefix = m.role === 'user' ? 'Usuário' : (m.role === 'system' ? 'SISTEMA' : (m.senderName || 'Participante'))
                return {
                  role: m.role === 'user' ? 'user' : 'assistant',
                  content: `[${prefix}]: ${m.content}`,
                }
              })

              const secondResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  prompt: `Como ${secondSpeaker.name}, comente ou responda o que ${firstSpeaker.name} acabou de falar ou responda ao usuário no grupo "${activeConversation.groupName}".`,
                  history: secondHistory,
                  model: selectedModel,
                  systemPrompt: secondSystemPrompt,
                }),
              })
              const secondData = await secondResponse.json()
              if (secondData.response) {
                const { cleanText: secCleanText, photoUrl: secPhotoUrl, photoPrompt: secPhotoPrompt, photoModel: secPhotoModel, referenceUsed: secRefUsed } = await processPhotoInResponse(secondData.response, secondSpeaker, prompt, messagesAfterFirstSpeaker, selectedImageModel)
                const secondMsg = {
                  role: 'assistant',
                  content: secCleanText,
                  photoUrl: secPhotoUrl,
                  photoPrompt: secPhotoPrompt,
                  photoModel: secPhotoModel,
                  referenceUsed: secRefUsed,
                  senderName: secondSpeaker.name,
                  senderId: secondSpeaker.id,
                  senderAvatarColor: secondSpeaker.avatarColor,
                  time: formatTime(Date.now()),
                }
                setConversations((current) => current.map((c) => {
                  if (c.id !== currentConvId) return c
                  return {
                    ...c,
                    messages: [...messagesAfterFirstSpeaker, secondMsg],
                    updatedAt: Date.now(),
                  }
                }))
              }
            } catch (err) {
              console.warn('Second speaker failed:', err)
            } finally {
              setLoading(false)
              setTypingSpeakerName('')
            }
          }, 800)
          return
        }

      } catch (error) {
        setConnected(false)
        const errorMsg = { role: 'error', content: error.message, time: formatTime(Date.now()) }
        setConversations((current) => current.map((c) => c.id === currentConvId ? {
          ...c,
          messages: [...updatedMessagesWithUser, errorMsg],
          updatedAt: Date.now(),
        } : c))
      } finally {
        setLoading(false)
        setTypingSpeakerName('')
        textareaRef.current?.focus()
      }

    } else {
      // 1-on-1 Chat Mode
      setTypingSpeakerName(activeCharacter?.name || '')
      try {
        const payload = {
          prompt,
          history: updatedMessagesWithUser.slice(-14),
          model: selectedModel,
        }

        if (isAdminActive) {
          payload.systemPrompt = buildAdminSystemPrompt(activeCharacter, nextIntimacyLevel, interRelationships, characters)
        }

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Ocorreu um erro ao processar a resposta.')
        
        // Process photo generated with full conversation context
        const { cleanText, photoUrl, photoPrompt, photoModel, referenceUsed } = await processPhotoInResponse(data.response, activeCharacter, prompt, updatedMessagesWithUser, selectedImageModel)

        const assistantMsg = {
          role: 'assistant',
          content: cleanText,
          photoUrl,
          photoPrompt,
          photoModel,
          referenceUsed,
          senderName: activeCharacter?.name,
          senderId: activeCharacter?.id,
          senderAvatarColor: activeCharacter?.avatarColor,
          time: formatTime(Date.now()),
        }
        
        setConversations((current) => current.map((c) => {
          if (c.id !== currentConvId) return c
          return {
            ...c,
            messages: [...updatedMessagesWithUser, assistantMsg],
            updatedAt: Date.now(),
          }
        }))
      } catch (error) {
        setConnected(false)
        const errorMsg = { role: 'error', content: error.message, time: formatTime(Date.now()) }
        setConversations((current) => current.map((c) => {
          if (c.id !== currentConvId) return c
          return {
            ...c,
            messages: [...updatedMessagesWithUser, errorMsg],
            updatedAt: Date.now(),
          }
        }))
      } finally {
        setLoading(false)
        setTypingSpeakerName('')
        textareaRef.current?.focus()
      }
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage(event)
    }
  }

  // Filtered conversations for WhatsApp list
  const adminConversations = conversations.filter(c => c.isAdmin)
  const filteredAdminConversations = adminConversations.filter(c => {
    const char = characters.find(ch => ch.id === c.characterId) || c.personaConfig || {}
    const lastMsg = c.messages && c.messages[c.messages.length - 1]?.content || ''
    const title = c.isGroup ? (c.groupName || c.title) : (char.name || c.title || '')
    const rel = c.isGroup ? 'Grupo' : (char.relationship || '')
    return (
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lastMsg.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))

  // =========================================================================
  // RENDER: IF IN ADMIN MODE -> RENDER WHATSAPP MESSENGER INTERFACE
  // =========================================================================
  if (isAdminUnlocked) {
    return (
      <main className={`wa-container ${mobileChatOpen ? 'mobile-chat-open' : ''}`}>
        {/* WHATSAPP SIDEBAR (CONVERSATION & CONTACTS LIST) */}
        <aside className="wa-sidebar">
          <header className="wa-sidebar-header">
            <div className="wa-user-avatar" title="Você (Admin)">
              <User size={20} />
            </div>
            <div className="wa-header-icons">
              <button
                className="wa-icon-btn"
                onClick={() => {
                  setModelModalTab('image')
                  setModelModalOpen(true)
                }}
                title="Configurar Modelo Gerador de Fotos / Imagens"
              >
                <Camera size={19} />
              </button>
              <button
                className="wa-icon-btn"
                onClick={() => {
                  setSelectedGroupMembers([])
                  setNewGroupName('')
                  setNewGroupModalOpen(true)
                }}
                title="Criar Novo Grupo"
              >
                <UsersRound size={19} />
              </button>
              <button
                className="wa-icon-btn"
                onClick={() => setCharacterDirectoryOpen(true)}
                title="Lista de Personagens Salvos"
              >
                <Users size={19} />
              </button>
              <button
                className="wa-icon-btn"
                onClick={() => setRelationshipsModalOpen(true)}
                title="Configurar Parentesco & Relações entre Personagens"
              >
                <Network size={19} />
              </button>
              <button
                className="wa-icon-btn"
                onClick={() => {
                  setPersonaForm(DEFAULT_CHARACTERS[0])
                  setIsEditingExistingChar(false)
                  setPersonaModalOpen(true)
                }}
                title="Criar Novo Personagem"
              >
                <UserPlus size={19} />
              </button>
              <button
                className="wa-icon-btn"
                onClick={lockAdminMode}
                title="Sair / Bloquear Modo Admin"
              >
                <Lock size={17} />
              </button>
            </div>
          </header>

          {/* Proactive Bar Banner */}
          <div className="wa-proactive-bar">
            <div className="wa-proactive-badge">
              <Zap size={13} fill="#00a884" />
              <span>Proatividade {proactivityEnabled ? 'Ativa' : 'Pausada'}</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                type="button"
                className="wa-proactive-trigger-btn"
                style={{ color: '#53bdeb', borderColor: 'rgba(83, 189, 235, 0.35)' }}
                onClick={() => {
                  setModelModalTab('image')
                  setModelModalOpen(true)
                }}
                title="Trocar Modelo de Geração de Imagem"
              >
                <Camera size={11} />
                <span>Foto: {imageModels.find(m => m.id === selectedImageModel)?.name?.split('(')[0]?.trim() || 'Gemini 3 Pro'}</span>
              </button>
              {isGroupChat && (
                <button
                  className="wa-proactive-trigger-btn"
                  onClick={() => triggerGroupSpeakerProactivity(activeConversation.id)}
                  title="Fazer os personagens conversarem entre si agora no grupo"
                >
                  <Sparkles size={11} /> Conversa no Grupo
                </button>
              )}
              <button
                className="wa-proactive-trigger-btn"
                onClick={() => setProactivityEnabled(!proactivityEnabled)}
              >
                {proactivityEnabled ? 'Pausar' : 'Ativar'}
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="wa-search-wrap">
            <div className="wa-search-box">
              <Search size={15} color="#8696a0" />
              <input
                type="text"
                className="wa-search-input"
                placeholder="Pesquisar conversa, grupo ou personagem..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'transparent', border: 0, color: '#8696a0', padding: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Chat List */}
          <div className="wa-chat-list">
            {filteredAdminConversations.length === 0 ? (
              <div className="wa-empty-sidebar">
                <Users size={32} opacity={0.6} />
                <span>Nenhuma conversa ativa no momento.</span>
                <button
                  className="btn-primary"
                  onClick={() => setCharacterDirectoryOpen(true)}
                  style={{ fontSize: '11px', padding: '6px 12px' }}
                >
                  Ver Personagens Salvos
                </button>
              </div>
            ) : (
              filteredAdminConversations.map((conv) => {
                const char = characters.find(c => c.id === conv.characterId) || conv.personaConfig || DEFAULT_CHARACTERS[0]
                const lastMsg = conv.messages && conv.messages[conv.messages.length - 1]
                const isCurrent = conv.id === activeConversationId
                const unread = conv.unreadCount > 0
                const title = conv.isGroup ? (conv.groupName || conv.title) : char.name
                const pillText = conv.isGroup ? `${conv.memberIds?.length || 2} membros` : char.relationship?.split(' ')[0]

                return (
                  <div
                    key={conv.id}
                    className={`wa-chat-item ${isCurrent ? 'active' : ''}`}
                    onClick={() => selectConversation(conv)}
                  >
                    <div className="wa-chat-avatar-wrap">
                      <div
                        className="wa-chat-avatar"
                        style={{ background: conv.isGroup ? '#2a3942' : (char.avatarColor || '#00a884') }}
                      >
                        {conv.isGroup ? <UsersRound size={22} color="#00a884" /> : (char.name?.charAt(0) || 'P')}
                      </div>
                      {!conv.isGroup && <div className="wa-online-dot" />}
                    </div>

                    <div className="wa-chat-info">
                      <div className="wa-chat-top">
                        <span className="wa-chat-name">
                          {title}
                          <span className="wa-relation-pill">{pillText}</span>
                        </span>
                        <span className="wa-chat-time">
                          {lastMsg?.time || formatTime(conv.updatedAt)}
                        </span>
                      </div>

                      <div className="wa-chat-bottom">
                        <span className={`wa-chat-snippet ${unread ? 'unread' : ''}`}>
                          {lastMsg ? (
                            <>
                              {lastMsg.role === 'user' && <CheckCheck size={14} className="wa-checkmarks" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />}
                              {conv.isGroup && lastMsg.senderName && lastMsg.role !== 'system' && (
                                <strong style={{ color: '#d1d7db' }}>{lastMsg.senderName}: </strong>
                              )}
                              {lastMsg.photoUrl && <span style={{ color: '#00a884', marginRight: '4px' }}>📷 [Foto]</span>}
                              {lastMsg.content}
                            </>
                          ) : (
                            'Toque para iniciar a conversa...'
                          )}
                        </span>
                        {unread && (
                          <span className="wa-unread-badge">{conv.unreadCount}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </aside>

        {/* WHATSAPP MAIN PANEL (ACTIVE CONVERSATION) */}
        <section className="wa-main">
          {activeConversation ? (
            <>
              {/* WhatsApp Chat Header */}
              <header className="wa-main-header">
                <div
                  className="wa-header-left"
                  onClick={() => {
                    if (!isGroupChat && activeCharacter) {
                      setPersonaForm(activeCharacter)
                      setIsEditingExistingChar(true)
                      setPersonaModalOpen(true)
                    } else if (isGroupChat) {
                      setSelectedAddMemberIds([])
                      setAddMemberModalOpen(true)
                    }
                  }}
                  title={isGroupChat ? "Ver participantes / Adicionar pessoa ao grupo" : "Ver ou editar detalhes da persona"}
                >
                  <button
                    className="wa-icon-btn mobile-close"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMobileChatOpen(false)
                    }}
                    style={{ display: 'grid' }}
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div
                    className="wa-header-avatar"
                    style={{ background: isGroupChat ? '#2a3942' : (activeCharacter?.avatarColor || '#00a884') }}
                  >
                    {isGroupChat ? <UsersRound size={20} color="#00a884" /> : (activeCharacter?.name?.charAt(0) || 'P')}
                  </div>
                  <div className="wa-header-meta">
                    <span className="wa-header-name">
                      {isGroupChat ? (activeConversation.groupName || activeConversation.title) : activeCharacter?.name}
                      <span className="wa-relation-pill">
                        {isGroupChat ? 'GRUPO' : activeCharacter?.relationship}
                      </span>
                    </span>
                    <span className={`wa-header-status ${loading ? 'typing' : ''}`}>
                      {loading
                        ? (typingSpeakerName ? `${typingSpeakerName} digitando...` : 'digitando...')
                        : (isGroupChat
                            ? groupMembers.map(m => m.name).join(', ')
                            : 'online'
                          )
                      }
                    </span>
                  </div>
                </div>

                <div className="wa-header-right">
                  {/* Button to add person into ongoing chat (group or 1-on-1) */}
                  <button
                    className="wa-icon-btn"
                    onClick={() => {
                      setSelectedAddMemberIds([])
                      setAddMemberModalOpen(true)
                    }}
                    title={isGroupChat ? "Adicionar participante ao grupo" : "Incluir outra pessoa nesta conversa (transformar em grupo)"}
                  >
                    <UserPlus size={18} />
                  </button>

                  {/* Group Proactivity Button */}
                  {isGroupChat && (
                    <button
                      className="wa-icon-btn"
                      onClick={() => triggerGroupSpeakerProactivity(activeConversation.id)}
                      title="Fazer participantes conversarem entre si"
                      disabled={loading}
                    >
                      <Zap size={17} color="#00a884" />
                    </button>
                  )}

                  {!isGroupChat && (
                    <div className="wa-intimacy-pill" title="Nível de Intimidade da conversa">
                      <Heart size={12} fill={currentIntimacyLevel >= 3 ? '#e06852' : 'none'} color="#e06852" />
                      <span>Lvl {currentIntimacyLevel}: <strong>{currentIntimacyInfo.short}</strong></span>
                      <button
                        className="wa-intimacy-btn"
                        onClick={() => updateIntimacyLevel(currentIntimacyLevel - 1)}
                        disabled={currentIntimacyLevel <= 1}
                        title="Diminuir intimidade"
                      >
                        <Minus size={11} />
                      </button>
                      <button
                        className="wa-intimacy-btn"
                        onClick={() => updateIntimacyLevel(currentIntimacyLevel + 1)}
                        disabled={currentIntimacyLevel >= 5}
                        title="Aumentar intimidade"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  )}

                  {!isGroupChat && (
                    <button
                      className="wa-icon-btn"
                      onClick={() => {
                        setPersonaForm(activeCharacter)
                        setIsEditingExistingChar(true)
                        setPersonaModalOpen(true)
                      }}
                      title="Editar Persona & Aparência Física"
                    >
                      <SlidersHorizontal size={17} />
                    </button>
                  )}
                  <button
                    className="wa-icon-btn"
                    onClick={() => deleteConversation(activeConversationId)}
                    title="Excluir esta conversa"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </header>

              {/* Message Stream */}
              <div className="wa-messages-wrap">
                <div className="wa-encryption-pill">
                  <Lock size={12} />
                  <span>As mensagens são criptografadas e mantidas estritamente no seu dispositivo.</span>
                </div>

                <div className="wa-date-pill">Hoje</div>

                {messages.map((msg, index) => {
                  const isUser = msg.role === 'user'
                  const isSystem = msg.role === 'system'
                  const isError = msg.role === 'error'

                  if (isSystem) {
                    return (
                      <div key={index} className="wa-system-pill">
                        {msg.content}
                      </div>
                    )
                  }

                  return (
                    <div
                      key={index}
                      className={`wa-bubble-row ${isUser ? 'user' : 'assistant'}`}
                    >
                      <div className={`wa-bubble ${isUser ? 'user' : 'assistant'} ${isError ? 'error' : ''}`}>
                        {/* Group Sender Name in Group Chat */}
                        {isGroupChat && !isUser && msg.senderName && (
                          <span
                            className="wa-group-sender"
                            style={{ color: msg.senderAvatarColor || '#25d366' }}
                          >
                            {msg.senderName}
                          </span>
                        )}

                        {/* Photo Image Card with Actions */}
                        {msg.photoUrl && (
                          <div className="wa-bubble-photo-container">
                            <div
                              className="wa-bubble-photo-wrap"
                              onClick={() => setLightboxData({ url: msg.photoUrl, caption: msg.content, sender: msg.senderName, convId: activeConversation.id, msgIndex: index, model: msg.photoModel })}
                              title="Clique para ver foto ampliada em tela cheia"
                            >
                              <img
                                src={msg.photoUrl}
                                alt="Foto enviada no WhatsApp"
                                className="wa-bubble-photo-img"
                                referrerPolicy="no-referrer"
                                loading="lazy"
                              />
                              <div className="wa-photo-hover-overlay">
                                <Maximize2 size={16} /> Ver foto em tela cheia
                              </div>
                            </div>
                            <div className="wa-photo-actions-bar">
                              <button
                                type="button"
                                className="wa-photo-action-btn view"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setLightboxData({ url: msg.photoUrl, caption: msg.content, sender: msg.senderName, convId: activeConversation.id, msgIndex: index, model: msg.photoModel })
                                }}
                                title="Ver imagem ampliada"
                              >
                                <Eye size={13} />
                                <span>Ver imagem</span>
                              </button>
                              <button
                                type="button"
                                className="wa-photo-action-btn delete"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deletePhotoFromMessage(activeConversation.id, index)
                                }}
                                title="Apagar esta foto da conversa"
                              >
                                <Trash2 size={13} />
                                <span>Apagar foto</span>
                              </button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', marginTop: '6px' }}>
                              {msg.photoModel && (
                                <div className="wa-photo-model-tag" title="Modelo de IA utilizado para gerar esta imagem">
                                  <Sparkles size={10} color="#25d366" />
                                  <span>{imageModels.find(m => m.id === msg.photoModel)?.name?.split('(')[0]?.trim() || msg.photoModel}</span>
                                </div>
                              )}
                              {msg.referenceUsed && (
                                <div className="wa-photo-model-tag" style={{ background: 'rgba(0, 168, 132, 0.15)', borderColor: 'rgba(0, 168, 132, 0.35)', color: '#25d366' }} title={`Referência visual aplicada: assets/${msg.referenceUsed}`}>
                                  <ImageIcon size={10} color="#25d366" />
                                  <span>Ref: {msg.referenceUsed}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <p className="wa-bubble-text">{msg.content}</p>
                        <div className="wa-bubble-meta">
                          <span>{msg.time || formatTime(Date.now())}</span>
                          {isUser && <CheckCheck size={13} className="wa-checkmarks" />}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {loading && (
                  <div className="wa-bubble-row assistant">
                    <div className="wa-typing-bubble">
                      <div className="wa-typing-dot" />
                      <div className="wa-typing-dot" />
                      <div className="wa-typing-dot" />
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* WhatsApp Composer */}
              <div className="wa-composer-wrap">
                <div className="wa-composer-tools">
                  <button className="wa-icon-btn" title="Emojis"><Smile size={20} /></button>
                  <button
                    className="wa-icon-btn"
                    title="Pedir uma foto agora"
                    onClick={() => {
                      setDraft(prev => prev.trim() ? `${prev} Manda uma foto sua agora` : 'Manda uma foto sua agora')
                      textareaRef.current?.focus()
                    }}
                  >
                    <Camera size={20} color="#00a884" />
                  </button>
                  <button className="wa-icon-btn" title="Anexo"><Paperclip size={19} /></button>
                </div>

                <form className="wa-composer-form" onSubmit={sendMessage}>
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isGroupChat ? `Mensagem para o grupo "${activeConversation.groupName || activeConversation.title}"...` : `Mensagem para ${activeCharacter?.name}... (Peça uma foto!)`}
                    rows="1"
                    className="wa-composer-input"
                    disabled={loading}
                    autoFocus
                  />
                </form>

                <button
                  className="wa-send-btn"
                  onClick={sendMessage}
                  disabled={!draft.trim() || loading}
                  aria-label="Enviar mensagem"
                >
                  <Send size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className="wa-empty-chat">
              <div className="wa-empty-icon">
                <MessageCircle size={40} />
              </div>
              <h2 className="wa-empty-title">WhatsApp RPG Admin</h2>
              <p className="wa-empty-desc">
                Selecione uma conversa ao lado ou inicie um chat com um dos personagens criados para começar o roleplay.
              </p>
              <button
                className="btn-primary"
                onClick={() => setCharacterDirectoryOpen(true)}
              >
                Abrir Lista de Personagens
              </button>
            </div>
          )}
        </section>

        {/* LIGHTBOX MODAL FOR FULL SCREEN PHOTO PREVIEW */}
        {lightboxData && (
          <div className="wa-lightbox-modal" onClick={() => setLightboxData(null)}>
            <div className="wa-lightbox-header" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => handleDownloadPhoto(lightboxData.url)}
                className="icon-button"
                style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
                title="Baixar foto original"
              >
                <Download size={18} />
              </button>
              {lightboxData.convId && lightboxData.msgIndex !== undefined && (
                <button
                  type="button"
                  className="icon-button"
                  style={{ background: 'rgba(229, 83, 75, 0.3)', color: '#f85149', border: '1px solid rgba(229, 83, 75, 0.4)' }}
                  onClick={() => {
                    deletePhotoFromMessage(lightboxData.convId, lightboxData.msgIndex)
                  }}
                  title="Apagar foto da conversa"
                >
                  <Trash2 size={18} />
                </button>
              )}
              <button
                className="icon-button"
                style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
                onClick={() => setLightboxData(null)}
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>
            <img
              src={lightboxData.url}
              alt="Foto em tela cheia"
              className="wa-lightbox-img"
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
            />
            {lightboxData.caption && (
              <div className="wa-lightbox-caption" onClick={(e) => e.stopPropagation()}>
                {lightboxData.sender && <strong>{lightboxData.sender}: </strong>}
                <span>{lightboxData.caption}</span>
                {lightboxData.model && (
                  <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '11px', color: '#25d366' }}>
                    <Sparkles size={12} />
                    <span>Modelo de Renderização: {imageModels.find(m => m.id === lightboxData.model)?.name || lightboxData.model}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MODAL: CRIAR NOVO GRUPO */}
        {newGroupModalOpen && (
          <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setNewGroupModalOpen(false)}>
            <div className="persona-modal" style={{ width: 'min(620px, 100%)' }}>
              <div className="persona-modal-header">
                <div className="persona-modal-title">
                  <div className="admin-dialog-icon">
                    <UsersRound size={18} />
                  </div>
                  <div>
                    <h2>Novo Grupo no WhatsApp</h2>
                  </div>
                </div>
                <button className="icon-button" onClick={() => setNewGroupModalOpen(false)}><X size={18} /></button>
              </div>

              <div className="persona-modal-body">
                <div className="persona-field">
                  <label className="persona-field-label">Nome do Grupo</label>
                  <input
                    type="text"
                    className="persona-input-control"
                    placeholder="Ex: Família & Amigos, Rolê de Sábado, Casa de Praia..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="persona-field">
                  <label className="persona-field-label">
                    <span>Selecione os Participantes ({selectedGroupMembers.length} selecionados)</span>
                  </label>
                  <div className="wa-group-select-grid">
                    {characters.map((char) => {
                      const isSelected = selectedGroupMembers.includes(char.id)
                      return (
                        <div
                          key={char.id}
                          className={`wa-group-select-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedGroupMembers(prev => prev.filter(id => id !== char.id))
                            } else {
                              setSelectedGroupMembers(prev => [...prev, char.id])
                            }
                          }}
                        >
                          <div className="char-card-avatar" style={{ background: char.avatarColor || '#00a884', width: '38px', height: '38px', fontSize: '15px' }}>
                            {char.name.charAt(0)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: '#e9edef' }}>{char.name} ({char.age})</div>
                            <div style={{ fontSize: '11px', color: '#8696a0' }}>{char.relationship} • {char.temperament}</div>
                          </div>
                          <div>
                            {isSelected ? <UserCheck size={18} color="#00a884" /> : <Plus size={18} color="#8696a0" />}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="persona-modal-footer">
                <button className="btn-secondary" onClick={() => setNewGroupModalOpen(false)}>
                  Cancelar
                </button>
                <button className="btn-primary" onClick={handleCreateNewGroup} disabled={selectedGroupMembers.length === 0}>
                  Criar Grupo ({selectedGroupMembers.length})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADICIONAR PARTICIPANTE A UMA CONVERSA EM ANDAMENTO */}
        {addMemberModalOpen && activeConversation && (
          <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setAddMemberModalOpen(false)}>
            <div className="persona-modal" style={{ width: 'min(620px, 100%)' }}>
              <div className="persona-modal-header">
                <div className="persona-modal-title">
                  <div className="admin-dialog-icon">
                    <UserPlus size={18} />
                  </div>
                  <div>
                    <h2>Adicionar Pessoa a esta Conversa</h2>
                  </div>
                </div>
                <button className="icon-button" onClick={() => setAddMemberModalOpen(false)}><X size={18} /></button>
              </div>

              <div className="persona-modal-body">
                <p style={{ fontSize: '12px', color: '#8696a0', margin: 0 }}>
                  A pessoa adicionada terá acesso a todo o contexto anterior da conversa e entrará participando ativamente do grupo!
                </p>

                <div className="persona-field">
                  <label className="persona-field-label">
                    <span>Selecione quem deseja incluir ({selectedAddMemberIds.length} selecionados):</span>
                  </label>
                  <div className="wa-group-select-grid">
                    {characters
                      .filter(char => {
                        const currentMemberIds = activeConversation.isGroup
                          ? (activeConversation.memberIds || [])
                          : (activeConversation.characterId ? [activeConversation.characterId] : [])
                        return !currentMemberIds.includes(char.id)
                      })
                      .map((char) => {
                        const isSelected = selectedAddMemberIds.includes(char.id)
                        return (
                          <div
                            key={char.id}
                            className={`wa-group-select-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedAddMemberIds(prev => prev.filter(id => id !== char.id))
                              } else {
                                setSelectedAddMemberIds(prev => [...prev, char.id])
                              }
                            }}
                          >
                            <div className="char-card-avatar" style={{ background: char.avatarColor || '#00a884', width: '38px', height: '38px', fontSize: '15px' }}>
                              {char.name.charAt(0)}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '13px', color: '#e9edef' }}>{char.name} ({char.age})</div>
                              <div style={{ fontSize: '11px', color: '#8696a0' }}>{char.relationship} • {char.temperament}</div>
                            </div>
                            <div>
                              {isSelected ? <UserCheck size={18} color="#00a884" /> : <Plus size={18} color="#8696a0" />}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>

              <div className="persona-modal-footer">
                <button className="btn-secondary" onClick={() => setAddMemberModalOpen(false)}>
                  Cancelar
                </button>
                <button
                  className="btn-primary"
                  onClick={handleAddMembersToCurrentChat}
                  disabled={selectedAddMemberIds.length === 0}
                >
                  Adicionar ao Chat ({selectedAddMemberIds.length})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: LISTA / DIRETÓRIO DE PERSONAGENS */}
        {characterDirectoryOpen && (
          <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setCharacterDirectoryOpen(false)}>
            <div className="persona-modal" style={{ width: 'min(820px, 100%)' }}>
              <div className="persona-modal-header">
                <div className="persona-modal-title">
                  <div className="admin-dialog-icon">
                    <Users size={18} />
                  </div>
                  <div>
                    <h2>Personagens Salvos ({characters.length})</h2>
                  </div>
                </div>
                <button className="icon-button" onClick={() => setCharacterDirectoryOpen(false)}><X size={18} /></button>
              </div>

              <div className="persona-modal-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#8696a0' }}>
                    Escolha um personagem para conversar, editar suas características ou criar novos.
                  </span>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setPersonaForm(DEFAULT_CHARACTERS[0])
                      setIsEditingExistingChar(false)
                      setPersonaModalOpen(true)
                      setCharacterDirectoryOpen(false)
                    }}
                    style={{ fontSize: '11px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <UserPlus size={13} /> Novo Personagem
                  </button>
                </div>

                <div className="char-directory-grid">
                  {characters.map((char) => (
                    <div key={char.id} className="char-card">
                      <div className="char-card-top">
                        <div className="char-card-avatar" style={{ background: char.avatarColor || '#00a884' }}>
                          {char.name.charAt(0)}
                        </div>
                        <div className="char-card-info">
                          <div className="char-card-name">{char.name} ({char.age})</div>
                          <div className="char-card-relation">{char.relationship}</div>
                        </div>
                      </div>

                      <div className="char-card-details">
                        <span><strong>Aparência:</strong> {char.physicalDescription || 'Não informada'}</span>
                        <span><strong>Temperamento:</strong> {char.temperament}</span>
                        <span><strong>Cenário:</strong> {char.scenario}</span>
                      </div>

                      <div className="char-card-actions">
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn-secondary"
                            style={{ fontSize: '10px', padding: '4px 8px' }}
                            onClick={() => {
                              setPersonaForm(char)
                              setIsEditingExistingChar(true)
                              setPersonaModalOpen(true)
                              setCharacterDirectoryOpen(false)
                            }}
                          >
                            <Pencil size={11} style={{ marginRight: '3px' }} /> Editar
                          </button>
                          <button
                            className="btn-danger"
                            style={{ fontSize: '10px', padding: '4px 8px' }}
                            onClick={() => deleteCharacter(char.id)}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>

                        <button
                          className="btn-primary"
                          style={{ fontSize: '11px', padding: '5px 12px' }}
                          onClick={() => openChatWithCharacter(char)}
                        >
                          Conversar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="persona-modal-footer">
                <button className="btn-secondary" onClick={() => setCharacterDirectoryOpen(false)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: PARENTESCO & RELAÇÕES ENTRE PERSONAGENS */}
        {relationshipsModalOpen && (
          <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setRelationshipsModalOpen(false)}>
            <div className="persona-modal" style={{ width: 'min(760px, 100%)' }}>
              <div className="persona-modal-header">
                <div className="persona-modal-title">
                  <div className="admin-dialog-icon">
                    <Network size={18} />
                  </div>
                  <div>
                    <h2>Parentesco & Relações entre Personagens</h2>
                  </div>
                </div>
                <button className="icon-button" onClick={() => setRelationshipsModalOpen(false)}><X size={18} /></button>
              </div>

              <div className="persona-modal-body">
                <p style={{ fontSize: '12px', color: '#8696a0', margin: 0 }}>
                  Configure os laços de parentesco e conexões mútuas (ex: <em>Carlos: Marido de Letícia</em>). Os modelos salvarão e usarão essas informações para comentar, fofocar e ter reações realistas nas conversas.
                </p>

                {/* Form to Add Relationship */}
                <form onSubmit={handleAddRelationship} className="rel-add-form">
                  <select
                    className="persona-input-control"
                    value={newRelCharA}
                    onChange={(e) => setNewRelCharA(e.target.value)}
                    required
                  >
                    <option value="">Selecione Personagem A...</option>
                    {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>

                  <input
                    type="text"
                    className="persona-input-control"
                    placeholder="Ex: Marido de, Mãe da, Prima da..."
                    value={newRelType}
                    onChange={(e) => setNewRelType(e.target.value)}
                    required
                  />

                  <select
                    className="persona-input-control"
                    value={newRelCharB}
                    onChange={(e) => setNewRelCharB(e.target.value)}
                    required
                  >
                    <option value="">Selecione Personagem B...</option>
                    {characters.filter(c => c.id !== newRelCharA).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>

                  <button type="submit" className="btn-primary" style={{ padding: '8px 12px' }}>
                    <Plus size={14} /> Adicionar
                  </button>
                </form>

                {/* Existing Relationships List */}
                <div className="rel-modal-list">
                  {interRelationships.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#8696a0', fontSize: '12px' }}>
                      Nenhuma relação entre personagens configurada ainda.
                    </div>
                  ) : (
                    interRelationships.map((rel) => (
                      <div key={rel.id} className="rel-item-pill">
                        <span style={{ fontSize: '13px', color: '#e9edef' }}>
                          <strong>{rel.charAName}</strong> <span style={{ color: '#00a884' }}>{rel.relation}</span> <strong>{rel.charBName}</strong>
                        </span>
                        <button
                          onClick={() => deleteRelationship(rel.id)}
                          style={{ background: 'transparent', border: 0, color: '#f85149', cursor: 'pointer', padding: '3px' }}
                          title="Remover relação"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="persona-modal-footer">
                <button className="btn-secondary" onClick={() => setRelationshipsModalOpen(false)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: CRIAR / EDITAR PERSONA */}
        {personaModalOpen && (
          <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setPersonaModalOpen(false)}>
            <section className="persona-modal" role="dialog" aria-modal="true">
              <div className="persona-modal-header">
                <div className="persona-modal-title">
                  <div className="admin-dialog-icon">
                    <SlidersHorizontal size={16} />
                  </div>
                  <div>
                    <h2>{isEditingExistingChar ? `Editar ${personaForm.name}` : 'Criar Novo Personagem RPG'}</h2>
                  </div>
                </div>
                <button className="icon-button" onClick={() => setPersonaModalOpen(false)}><X size={18} /></button>
              </div>

              <div className="persona-modal-body">
                {/* Presets Quick Picker */}
                <div className="persona-presets-section">
                  <span className="persona-presets-label">
                    <Sparkles size={13} /> Modelos Prontos (Clique para preencher):
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

                {/* 1. DADOS BÁSICOS & APARÊNCIA FÍSICA */}
                <div className="persona-section-title">
                  <User size={13} /> 1. Identidade & Aparência Física para Fotos
                </div>

                <div className="persona-form-grid">
                  <div className="persona-field">
                    <label className="persona-field-label">
                      <span>Nome</span>
                      <button
                        type="button"
                        onClick={generateRandomName}
                        style={{ background: 'transparent', border: 0, color: '#00a884', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                      >
                        <RefreshCw size={10} /> Aleatório
                      </button>
                    </label>
                    <input
                      type="text"
                      className="persona-input-control"
                      value={personaForm.name}
                      onChange={(e) => setPersonaForm({ ...personaForm, name: e.target.value })}
                      placeholder="Ex: Valentina"
                    />
                  </div>

                  <div className="persona-field">
                    <label className="persona-field-label">Idade</label>
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

                  <div className="persona-field persona-form-full">
                    <label className="persona-field-label">
                      <span>Descrição Física / Visual (Referência para Fotos da IA)</span>
                    </label>
                    <textarea
                      rows={3}
                      className="persona-input-control"
                      value={personaForm.physicalDescription || ''}
                      onChange={(e) => setPersonaForm({ ...personaForm, physicalDescription: e.target.value })}
                      placeholder="Ex: Cabelos castanhos longos e ondulados, olhos mel amendoados, lábios carnudos, 1.68m, corpo atlético curvilíneo, pele clara levemente bronzeada..."
                    />
                  </div>

                  <div className="persona-field persona-form-full">
                    <label className="persona-field-label">Tipo de Relacionamento com você</label>
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
                      />
                    )}
                  </div>
                </div>

                {/* 2. PSICOLOGIA, LIMITES & INTIMIDADE */}
                <div className="persona-section-title">
                  <Heart size={13} /> 2. Personalidade, Intimidade & Limites
                </div>

                <div className="persona-form-grid">
                  <div className="persona-field persona-form-full">
                    <label className="persona-field-label">Temperamento & Personalidade</label>
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
                  </div>

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
                  </div>

                  <div className="persona-field">
                    <label className="persona-field-label">Nível de Intimidade Inicial</label>
                    <select
                      className="persona-input-control"
                      value={personaForm.initialIntimacy || 1}
                      onChange={(e) => setPersonaForm({ ...personaForm, initialIntimacy: Number(e.target.value) })}
                    >
                      <option value={1}>Nível 1 - Distante / Cautelosa (20%)</option>
                      <option value={2}>Nível 2 - Amigável / Confortável (40%)</option>
                      <option value={3}>Nível 3 - Próxima / Confiante (60%)</option>
                      <option value={4}>Nível 4 - Íntima / Cúmplice (80%)</option>
                      <option value={5}>Nível 5 - Intensa / Sem Filtro (100%)</option>
                    </select>
                  </div>

                  <div className="persona-field persona-form-full">
                    <label className="persona-field-label">Postura & Reação a Investidas / Fotos</label>
                    <select
                      className="persona-input-control"
                      value={RESISTANCE_OPTIONS.includes(personaForm.resistance) ? personaForm.resistance : 'Personalizado'}
                      onChange={(e) => {
                        if (e.target.value !== 'Personalizado') {
                          setPersonaForm({ ...personaForm, resistance: e.target.value })
                        }
                      }}
                    >
                      {RESISTANCE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="persona-field">
                    <label className="persona-field-label">Ciúmes & Apego</label>
                    <select
                      className="persona-input-control"
                      value={JEALOUSY_OPTIONS.includes(personaForm.jealousy) ? personaForm.jealousy : 'Personalizado'}
                      onChange={(e) => {
                        if (e.target.value !== 'Personalizado') {
                          setPersonaForm({ ...personaForm, jealousy: e.target.value })
                        }
                      }}
                    >
                      {JEALOUSY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="persona-field">
                    <label className="persona-field-label">Como Ela Te Chama</label>
                    <select
                      className="persona-input-control"
                      value={NICKNAME_OPTIONS.includes(personaForm.nickname) ? personaForm.nickname : 'Personalizado'}
                      onChange={(e) => {
                        if (e.target.value !== 'Personalizado') {
                          setPersonaForm({ ...personaForm, nickname: e.target.value })
                        }
                      }}
                    >
                      {NICKNAME_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. CENÁRIO & DIGITAÇÃO */}
                <div className="persona-section-title">
                  <MessageCircle size={13} /> 3. Cenário & Estilo
                </div>

                <div className="persona-form-grid">
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
                  </div>

                  <div className="persona-field persona-form-full">
                    <label className="persona-field-label">Observações Extras / Segredos / Hobbies (Opcional)</label>
                    <textarea
                      rows={2}
                      className="persona-input-control"
                      value={personaForm.customNotes}
                      onChange={(e) => setPersonaForm({ ...personaForm, customNotes: e.target.value })}
                      placeholder="Ex: Segredo compartilhado, piadas internas, coisas que ela gosta de fazer..."
                    />
                  </div>
                </div>
              </div>

              <div className="persona-modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setPersonaModalOpen(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn-primary" onClick={handleSaveCharacter}>
                  Salvar Personagem
                </button>
              </div>
            </section>
          </div>
        )}

        {/* Model Selection Modal inside WhatsApp Mode */}
        {modelModalOpen && (
          <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModelModalOpen(false)}>
            <section className="model-modal" role="dialog" aria-modal="true">
              <div className="modal-heading">
                <div>
                  <span className="modal-kicker">SELEÇÃO DE MODELOS</span>
                  <h2>{modelModalTab === 'image' ? 'Modelos de Geração de Fotos' : 'Modelos de Conversa (Chat)'}</h2>
                  <p>{modelModalTab === 'image' ? 'Escolha o modelo de IA para gerar fotos e selfies realistas no chat.' : 'Escolha o modelo de linguagem para processamento das mensagens.'}</p>
                </div>
                <button className="icon-button" onClick={() => setModelModalOpen(false)}><X size={18} /></button>
              </div>

              <div className="model-tabs">
                <button
                  type="button"
                  className={`model-tab-btn ${modelModalTab === 'chat' ? 'active' : ''}`}
                  onClick={() => setModelModalTab('chat')}
                >
                  <Bot size={15} />
                  <span>Chat / Conversa</span>
                </button>
                <button
                  type="button"
                  className={`model-tab-btn ${modelModalTab === 'image' ? 'active' : ''}`}
                  onClick={() => setModelModalTab('image')}
                >
                  <Camera size={15} />
                  <span>Geração de Fotos / Imagens</span>
                </button>
              </div>

              {modelModalTab === 'chat' ? (
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
              ) : (
                <div className="model-list">
                  <div style={{ padding: '14px', background: 'rgba(0, 168, 132, 0.1)', border: '1px solid rgba(0, 168, 132, 0.35)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#25d366', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={14} />
                        <span>Assets de Referência na pasta /assets ({availableAssets.length || 1})</span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#8696a0' }}>Detecção dinâmica ativa</span>
                    </div>

                    <p style={{ fontSize: '11.5px', color: '#aebac1', margin: 0, lineHeight: 1.45 }}>
                      O sistema identifica o contexto e o pedido do usuário (ex: <em>&quot;Me manda uma foto de lingerie&quot;</em> ou <em>&quot;aquela calcinha branca...&quot;</em>), seleciona a foto de referência mais apropriada e aplica todas as alterações solicitadas na imagem final.
                    </p>

                    {availableAssets.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                        {availableAssets.map((asset) => (
                          <div key={asset.filename} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(17, 27, 33, 0.85)', padding: '6px 10px', borderRadius: '8px', border: '1px solid #2a3942' }}>
                            <img src={asset.url} alt={asset.filename} style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#e9edef' }}>{asset.filename}</span>
                              <span style={{ fontSize: '10px', color: '#8696a0' }}>{asset.tokens.slice(0, 3).join(', ') || `${asset.sizeKB} KB`}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(17, 27, 33, 0.85)', padding: '8px 12px', borderRadius: '8px' }}>
                        <img src="/assets/ref.jpeg" alt="ref.jpeg" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                        <span style={{ fontSize: '11.5px', color: '#e9edef' }}>ref.jpeg (Referência padrão de textura e realismo)</span>
                      </div>
                    )}
                  </div>

                  {imageModels.map((imgMod) => (
                    <div
                      key={imgMod.id}
                      className={`image-model-card ${selectedImageModel === imgMod.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedImageModel(imgMod.id)
                        localStorage.setItem(IMAGE_MODEL_STORAGE_KEY, imgMod.id)
                        setModelModalOpen(false)
                      }}
                    >
                      <div className="image-model-card-top">
                        <div className="image-model-card-title">
                          <Camera size={16} color={selectedImageModel === imgMod.id ? '#25d366' : '#aebac1'} />
                          <span>{imgMod.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="image-model-badge">{imgMod.badge}</span>
                          {selectedImageModel === imgMod.id && <Check size={16} color="#25d366" />}
                        </div>
                      </div>
                      <p className="image-model-card-desc">{imgMod.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    )
  }

  // =========================================================================
  // RENDER: STANDARD NORMAL MODE (WHEN ADMIN IS LOCKED OR NOT IN ADMIN)
  // =========================================================================
  const normalConversations = conversations.filter((c) => !c.isAdmin)

  return (
    <main className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-topline">
          <div className="brand-mark"><Sparkles size={16} strokeWidth={2.4} /></div>
          <span className="brand-name">DS <span>IA</span></span>
          <button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu"><X size={18} /></button>
        </div>

        <button className="new-chat" onClick={() => {
          const conversation = createConversation([], 'Nova conversa', false)
          setConversations((current) => [conversation, ...current])
          setActiveConversationId(conversation.id)
          setDraft('')
          setSidebarOpen(false)
          textareaRef.current?.focus()
        }}>
          <Plus size={17} /> Nova conversa
        </button>

        <button
          className="admin-btn"
          onClick={() => {
            setPendingAdminAction(() => () => {})
            setAdminModalOpen(true)
          }}
          title="Acessar sessão restrita WhatsApp RPG de administrador"
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={15} />
            <span>Modo WhatsApp RPG</span>
          </span>
          <span className="admin-badge">
            Restrito
          </span>
        </button>

        <div className="sidebar-section" style={{ overflowY: 'auto', flex: 1, maxHeight: 'calc(100vh - 340px)' }}>
          <span className="eyebrow">Conversas Padrão</span>
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
                  onBlur={(event) => {
                    const nextTitle = event.target.value.trim() || 'Nova conversa'
                    setConversations((cur) => cur.map((c) => c.id === conversation.id ? { ...c, title: nextTitle } : c))
                    setEditingConversationId(null)
                  }}
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
          <div className="connection-card">
            <div className={`status-dot ${connected === false ? 'offline' : ''}`} />
            <div>
              <span className="connection-label">{isGemini ? 'Google AI Studio' : 'Ollama Local'}</span>
              <span className="connection-state">{connected === false ? 'Desconectado' : (isGemini ? 'Conectado (Nuvem)' : 'Privado & 100% Local')}</span>
            </div>
          </div>
          <div className="model-caption">
            <span>{isGemini ? 'MODELO NUVEM' : 'MODELO LOCAL'}</span>
            <button className="model-trigger" onClick={() => { setModelModalTab('chat'); setModelModalOpen(true); }} disabled={!models.length || loading} aria-haspopup="dialog" aria-expanded={modelModalOpen}>
              <span>{selectedModel.split('/').pop()?.split(':')[0] || 'Carregando modelos...'}</span>
              <ChevronDown size={14} />
            </button>
            <small>{models.find((installedModel) => installedModel.name === selectedModel)?.size || (isGemini ? 'Google AI' : 'Instalado localmente')}</small>
          </div>
          <div className="sidebar-img-model-card">
            <span>MODELO DE FOTOS / IMAGEM</span>
            <button
              className="model-trigger"
              onClick={() => {
                setModelModalTab('image')
                setModelModalOpen(true)
              }}
              aria-haspopup="dialog"
            >
              <span>{imageModels.find(m => m.id === selectedImageModel)?.name?.split('(')[0]?.trim() || selectedImageModel}</span>
              <ChevronDown size={14} />
            </button>
            <small>{imageModels.find(m => m.id === selectedImageModel)?.badge || 'Ultra-Realismo 2K'}</small>
          </div>
        </div>
      </aside>

      <section className="chat-panel">
        <header className="chat-header">
          <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"><Menu size={19} /></button>
          <div className="header-title">
            <span className="live-indicator">
              <Radio size={13} /> {isGemini ? 'SESSÃO GEMINI' : 'SESSÃO LOCAL'}
            </span>
            <h1>{temporaryChat ? 'Chat temporário' : activeConversation?.title || 'Nova conversa'}</h1>
          </div>
          <div className="header-actions">
            <button className={`session-mode ${temporaryChat ? 'active' : ''}`} onClick={() => setTemporaryChat(!temporaryChat)} aria-pressed={temporaryChat}>
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
              <span>{temporaryChat ? 'Sessão temporária' : activeConversation?.title || 'Nova sessão'}</span>
              <span className="intro-line" />
            </div>

            {messages.map((message, index) => (
              <article className={`message message-${message.role}`} key={`${message.role}-${index}`}>
                {message.role === 'assistant' && (
                  <div className="avatar">
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
                          : (selectedModel.split('/').pop()?.split(':')[0] || 'Modelo IA')}
                    </span>
                    {message.role === 'assistant' && (
                      <span className="local-tag">
                        {isGemini ? 'GEMINI' : 'LOCAL'}
                      </span>
                    )}
                  </div>
                  <p>{message.content}</p>
                </div>
              </article>
            ))}

            {loading && (
              <article className="message message-assistant">
                <div className="avatar">
                  <Bot size={17} />
                </div>
                <div className="message-body">
                  <div className="message-meta">
                    <span>{selectedModel.split('/').pop()?.split(':')[0] || 'Modelo IA'}</span>
                    <span className="local-tag">{isGemini ? 'GEMINI' : 'LOCAL'}</span>
                  </div>
                  <div className="thinking" role="status" aria-live="polite">
                    <span>Processando resposta...</span>
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
              placeholder={isGemini ? "Envie uma mensagem para o Gemini..." : "Envie uma mensagem para o modelo local..."}
              rows="1"
              disabled={loading}
            />
            <button className="send-button" type="submit" disabled={!draft.trim() || loading} aria-label="Enviar mensagem">
              <ArrowUp size={19} />
            </button>
          </form>
        </div>
      </section>

      {/* Model Selection Modal */}
      {modelModalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModelModalOpen(false)}>
          <section className="model-modal" role="dialog" aria-modal="true">
            <div className="modal-heading">
              <div>
                <span className="modal-kicker">SELEÇÃO DE MODELOS</span>
                <h2>{modelModalTab === 'image' ? 'Modelos de Geração de Fotos' : 'Modelos de Conversa (Chat)'}</h2>
                <p>{modelModalTab === 'image' ? 'Escolha o modelo de IA para gerar fotos e selfies realistas no chat.' : 'Escolha o modelo de linguagem para processamento das mensagens.'}</p>
              </div>
              <button className="icon-button" onClick={() => setModelModalOpen(false)}><X size={18} /></button>
            </div>

            <div className="model-tabs">
              <button
                type="button"
                className={`model-tab-btn ${modelModalTab === 'chat' ? 'active' : ''}`}
                onClick={() => setModelModalTab('chat')}
              >
                <Bot size={15} />
                <span>Chat / Conversa</span>
              </button>
              <button
                type="button"
                className={`model-tab-btn ${modelModalTab === 'image' ? 'active' : ''}`}
                onClick={() => setModelModalTab('image')}
              >
                <Camera size={15} />
                <span>Geração de Fotos / Imagens</span>
              </button>
            </div>

            {modelModalTab === 'chat' ? (
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
            ) : (
              <div className="model-list">
                <div style={{ padding: '12px 14px', background: 'rgba(0, 168, 132, 0.1)', border: '1px solid rgba(0, 168, 132, 0.35)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <img src="/assets/ref.jpeg" alt="Referência de Realismo" style={{ width: '46px', height: '46px', borderRadius: '6px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#25d366', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Sparkles size={13} />
                      <span>Referência de Realismo (assets/ref.jpeg)</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#8696a0', marginTop: '2px', lineHeight: 1.4 }}>
                      Guia ativo de textura de pele humana, poros, iluminação natural e realismo fotográfico.
                    </div>
                  </div>
                </div>

                {imageModels.map((imgMod) => (
                  <div
                    key={imgMod.id}
                    className={`image-model-card ${selectedImageModel === imgMod.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedImageModel(imgMod.id)
                      localStorage.setItem(IMAGE_MODEL_STORAGE_KEY, imgMod.id)
                      setModelModalOpen(false)
                    }}
                  >
                    <div className="image-model-card-top">
                      <div className="image-model-card-title">
                        <Camera size={16} color={selectedImageModel === imgMod.id ? '#25d366' : '#aebac1'} />
                        <span>{imgMod.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="image-model-badge">{imgMod.badge}</span>
                        {selectedImageModel === imgMod.id && <Check size={16} color="#25d366" />}
                      </div>
                    </div>
                    <p className="image-model-card-desc">{imgMod.description}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Admin Password Authentication Dialog */}
      {adminModalOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setAdminModalOpen(false)}>
          <div className="admin-dialog" role="dialog" aria-modal="true">
            <div className="admin-dialog-header">
              <div className="admin-dialog-icon">
                <Lock size={20} />
              </div>
              <button className="icon-button" onClick={() => setAdminModalOpen(false)}><X size={18} /></button>
            </div>
            <h2 className="admin-dialog-title">Acesso ao Modo WhatsApp RPG (Admin)</h2>
            <p className="admin-dialog-desc">
              Insira a senha de administrador para liberar a interface WhatsApp com múltiplos personagens, grupos, relações familiares, geração de fotos realistas e mensagens espontâneas.
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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
