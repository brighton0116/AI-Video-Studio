import { useEffect, useRef } from 'react'
import type { Message } from '../types'
import MessageItem from './MessageItem'
import './MessageList.css'

interface MessageListProps {
  messages: Message[]
  isReplying: boolean
}

function MessageList({ messages, isReplying }: MessageListProps) {
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
          <div className="message-list__welcome">
            <h2 className="message-list__welcome-title">你好，我是 AI 创作助手</h2>
            <p className="message-list__welcome-text">
              告诉我你的创意，我可以帮你生成视频脚本和分镜
            </p>
          </div>
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
