import { useEffect, useRef, type ReactNode } from 'react'
import type { Message } from '../types'
import MessageItem from './MessageItem'
import './MessageList.css'

interface MessageListProps {
  messages: Message[]
  isReplying: boolean
  emptyContent?: ReactNode
}

function MessageList({ messages, isReplying, emptyContent }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isEmpty = messages.length === 0

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // 只滚动消息区域，避免带动整个页面
    container.scrollTop = container.scrollHeight
  }, [messages, isReplying])

  return (
    <div className="message-list" ref={containerRef}>
      <div className="message-list__inner">
        {isEmpty ? (
          emptyContent ?? null
        ) : (
          messages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))
        )}

        {isReplying && (
          <div className="message-list__typing" aria-live="polite">
            <div className="message-list__typing-avatar" aria-hidden="true">
              AI
            </div>
            <div className="message-list__typing-bubble">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        <div ref={bottomRef} aria-hidden="true" />
      </div>
    </div>
  )
}

export default MessageList
