import { useCallback, useEffect, useRef, useState } from 'react'
import ChatHeader from './components/ChatHeader'
import ChatInput from './components/ChatInput'
import MessageList from './components/MessageList'
import Sidebar from './components/Sidebar'
import Welcome from './components/Welcome'
import type { Conversation, Message } from './types'
import './App.css'

const AI_REPLY = '收到你的创意，我正在为你构思视频脚本。'
const REPLY_DELAY_MS = 900

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function deriveTitle(content: string) {
  const trimmed = content.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= 20) return trimmed
  return `${trimmed.slice(0, 20)}…`
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [chatTitle, setChatTitle] = useState('新对话')
  const [activeId, setActiveId] = useState(() => createId())
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isReplying, setIsReplying] = useState(false)

  const replyTimerRef = useRef<number | null>(null)
  const isMountedRef = useRef(true)
  const activeIdRef = useRef(activeId)

  activeIdRef.current = activeId

  const clearReplyTimer = useCallback(() => {
    if (replyTimerRef.current !== null) {
      window.clearTimeout(replyTimerRef.current)
      replyTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      clearReplyTimer()
    }
  }, [clearReplyTimer])

  const upsertConversation = useCallback(
    (id: string, title: string, nextMessages: Message[]) => {
      setConversations((prev) => {
        const nextItem: Conversation = {
          id,
          title,
          messages: nextMessages,
          updatedAt: Date.now(),
        }
        const exists = prev.some((item) => item.id === id)
        if (!exists) {
          return [nextItem, ...prev]
        }
        return prev.map((item) => (item.id === id ? nextItem : item))
      })
    },
    [],
  )

  const handleNewChat = () => {
    if (messages.length === 0 && !isReplying) {
      return
    }

    clearReplyTimer()
    setIsReplying(false)
    setMessages([])
    setChatTitle('新对话')
    setActiveId(createId())
  }

  const handleSelectChat = (id: string) => {
    if (id === activeId) return

    const target = conversations.find((item) => item.id === id)
    if (!target) return

    clearReplyTimer()
    setIsReplying(false)
    setActiveId(target.id)
    setChatTitle(target.title)
    setMessages([...target.messages])
  }

  const handleSend = (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || isReplying) return

    const userMessage: Message = {
      id: createId(),
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    }

    const conversationId = activeId
    const nextTitle = messages.length === 0 ? deriveTitle(trimmed) : chatTitle
    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    setChatTitle(nextTitle)
    upsertConversation(conversationId, nextTitle, nextMessages)
    setIsReplying(true)

    replyTimerRef.current = window.setTimeout(() => {
      replyTimerRef.current = null

      if (!isMountedRef.current) return
      // 新建/切换对话时已清理定时器；此处再防护一次，避免过期更新
      if (activeIdRef.current !== conversationId) return

      const assistantMessage: Message = {
        id: createId(),
        role: 'assistant',
        content: AI_REPLY,
        createdAt: Date.now(),
      }

      setMessages((prev) => {
        const withAssistant = [...prev, assistantMessage]
        return withAssistant
      })
      // 基于发送时已确认的 nextMessages 追加回复，避免在 updater 里产生副作用
      upsertConversation(conversationId, nextTitle, [
        ...nextMessages,
        assistantMessage,
      ])
      setIsReplying(false)
    }, REPLY_DELAY_MS)
  }

  const sidebarConversations =
    conversations.length > 0
      ? conversations
      : [
          {
            id: activeId,
            title: chatTitle,
            messages,
            updatedAt: Date.now(),
          },
        ]

  return (
    <div className="app">
      <Sidebar
        conversations={sidebarConversations}
        activeId={activeId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
      />
      <main className="app__main">
        <ChatHeader title={chatTitle} messageCount={messages.length} />
        <MessageList
          messages={messages}
          isReplying={isReplying}
          emptyContent={<Welcome />}
        />
        <ChatInput disabled={isReplying} onSend={handleSend} />
      </main>
    </div>
  )
}

export default App
