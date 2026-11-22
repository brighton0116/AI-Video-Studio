import type { Message } from '../types'
import './MessageItem.css'

interface MessageItemProps {
  message: Message
}

function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`message-item${isUser ? ' message-item--user' : ' message-item--assistant'}`}>
      {!isUser && (
        <div className="message-item__avatar" aria-hidden="true">
          AI
        </div>
      )}
      <div className="message-item__bubble">{message.content}</div>
    </div>
  )
}

export default MessageItem
