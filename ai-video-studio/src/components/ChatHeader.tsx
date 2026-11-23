import './ChatHeader.css'

interface ChatHeaderProps {
  title: string
  messageCount: number
}

function ChatHeader({ title, messageCount }: ChatHeaderProps) {
  return (
    <header className="chat-header">
      <h1 className="chat-header__title">{title}</h1>
      <span className="chat-header__count">{messageCount} 条消息</span>
    </header>
  )
}

export default ChatHeader
