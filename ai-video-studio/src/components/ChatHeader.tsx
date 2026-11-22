import './ChatHeader.css'

interface ChatHeaderProps {
  title: string
}

function ChatHeader({ title }: ChatHeaderProps) {
  return (
    <header className="chat-header">
      <h1 className="chat-header__title">{title}</h1>
    </header>
  )
}

export default ChatHeader
