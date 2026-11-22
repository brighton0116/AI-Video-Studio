import type { Conversation } from "../types";
import "./Sidebar.css";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
}

function Sidebar({
  conversations,
  activeId,
  onNewChat,
  onSelectChat,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">AI Video Studio</div>

      <button type="button" className="sidebar__new-chat" onClick={onNewChat}>
        <span className="sidebar__new-chat-icon" aria-hidden="true">
          +
        </span>
        新建对话
      </button>

      <div className="sidebar__section-label">历史对话</div>
      <nav className="sidebar__history" aria-label="历史对话">
        {conversations.length === 0 ? (
          <p className="sidebar__empty">暂无对话</p>
        ) : (
          <ul className="sidebar__list">
            {conversations.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`sidebar__item${
                    item.id === activeId ? " is-active" : ""
                  }`}
                  onClick={() => onSelectChat(item.id)}
                >
                  {item.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__avatar" aria-hidden="true">
          U
        </div>
        <div className="sidebar__account">
          <span className="sidebar__account-name">演示用户</span>
          <span className="sidebar__account-email">user@example.com</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
