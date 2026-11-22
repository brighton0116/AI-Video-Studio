import { useState, type KeyboardEvent } from 'react'
import './ChatInput.css'

interface ChatInputProps {
  disabled?: boolean
  onSend: (content: string) => void
}

function ChatInput({ disabled = false, onSend }: ChatInputProps) {
  const [value, setValue] = useState('')
  const canSend = value.trim().length > 0 && !disabled

  const handleSend = () => {
    const content = value.trim()
    if (!content || disabled) return
    onSend(content)
    setValue('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chat-input">
      <div className="chat-input__box">
        <textarea
          className="chat-input__textarea"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="描述你的视频创意…"
          rows={1}
          disabled={disabled}
          aria-label="消息输入框"
        />
        <button
          type="button"
          className="chat-input__send"
          onClick={handleSend}
          disabled={!canSend}
        >
          发送
        </button>
      </div>
      <p className="chat-input__hint">Enter 发送 · Shift + Enter 换行</p>
    </div>
  )
}

export default ChatInput
