import { useCallback, useEffect, useRef, useState } from 'react'
import ChatHeader from './components/ChatHeader'
import ChatInput from './components/ChatInput'
import MessageList from './components/MessageList'
import Sidebar from './components/Sidebar'
import type { Conversation, Message } from './types'
import './App.css'

const AI_REPLY = '收到你的创意，我正在为你构思视频脚本。'
const REPLY_DELAY_MS = 900

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function createConversation(): Conversation {
  return {
    id: createId(),
    title: '新对话',
    messages: [],
    updatedAt: Date.now(),
  }
}

function deriveTitle(content: string) {
  const trimmed = content.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= 20) return trimmed
  return `${trimmed.slice(0, 20)}…`
}

function App() {
  const [session, setSession] = useState(() => {
    const first = createConversation()
    return {
      conversations: [first] as Conversation[],
      activeId: first.id,
    }
  })
  const [isReplying, setIsReplying] = useState(false)
  const replyTimerRef = useRef<number | null>(null)

  const { conversations, activeId } = session
  const activeConversation =
    conversations.find((item) => item.id === activeId) ?? conversations[0]!

  const clearReplyTimer = useCallback(() => {
    if (replyTimerRef.current !== null) {
      window.clearTimeout(replyTimerRef.current)
      replyTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => clearReplyTimer()
  }, [clearReplyTimer])

  const handleNewChat = () => {
    if (activeConversation.messages.length === 0 && !isReplying) {
      return
    }

    clearReplyTimer()
    setIsReplying(false)

    const next = createConversation()
    setSession((prev) => ({
      conversations: [next, ...prev.conversations],
      activeId: next.id,
    }))
  }

  const handleSelectChat = (id: string) => {
    if (id === activeId) return
    clearReplyTimer()
    setIsReplying(false)
    setSession((prev) => ({ ...prev, activeId: id }))
  }

  const handleSend = (content: string) => {
    if (isReplying || !activeConversation) return

    const userMessage: Message = {
      id: createId(),
      role: 'user',
      content,
      createdAt: Date.now(),
    }

    const conversationId = activeConversation.id
    const shouldRename = activeConversation.messages.length === 0

    setSession((prev) => ({
      ...prev,
      conversations: prev.conversations.map((item) => {
        if (item.id !== conversationId) return item
        return {
          ...item,
          title: shouldRename ? deriveTitle(content) : item.title,
          messages: [...item.messages, userMessage],
          updatedAt: Date.now(),
        }
      }),
    }))

    setIsReplying(true)

    replyTimerRef.current = window.setTimeout(() => {
      const assistantMessage: Message = {
        id: createId(),
        role: 'assistant',
        content: AI_REPLY,
        createdAt: Date.now(),
      }

      setSession((prev) => ({
        ...prev,
        conversations: prev.conversations.map((item) => {
          if (item.id !== conversationId) return item
          return {
            ...item,
            messages: [...item.messages, assistantMessage],
            updatedAt: Date.now(),
          }
        }),
      }))
      setIsReplying(false)
      replyTimerRef.current = null
    }, REPLY_DELAY_MS)
  }

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        activeId={activeConversation.id}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
      />
      <main className="app__main">
        <ChatHeader title={activeConversation.title} />
        <MessageList
          messages={activeConversation.messages}
          isReplying={isReplying}
        />
        <ChatInput disabled={isReplying} onSend={handleSend} />
      </main>
    </div>
  )
}

export default App
