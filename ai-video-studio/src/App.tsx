import { useCallback, useEffect, useRef, useState } from "react";
import ChatHeader from "./components/ChatHeader";
import ChatInput from "./components/ChatInput";
import MessageList from "./components/MessageList";
import Sidebar from "./components/Sidebar";
import Welcome from "./components/Welcome";
import type { Conversation, Message } from "./types";
import "./App.css";

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function deriveTitle(content: string) {
  const trimmed = content.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 20) return trimmed;
  return `${trimmed.slice(0, 20)}…`;
}

async function readChatStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onContent: (content: string) => void
) {
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        buffer += decoder.decode();
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const segments = buffer.split("\n\n");
      buffer = segments.pop() ?? "";

      for (const segment of segments) {
        for (const line of segment.split("\n")) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("data:")) continue;

          const data = trimmedLine.slice(5).trim();

          if (data === "[DONE]") return;

          try {
            const parsed = JSON.parse(data) as { content?: string };

            if (typeof parsed.content === "string") {
              onContent(parsed.content);
            }
          } catch {
            // 忽略无法解析的数据
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatTitle, setChatTitle] = useState("新对话");
  const [activeId, setActiveId] = useState(() => createId());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isReplying, setIsReplying] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const activeIdRef = useRef(activeId);

  activeIdRef.current = activeId;

  const abortActiveRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortActiveRequest();
    };
  }, [abortActiveRequest]);

  const upsertConversation = useCallback(
    (id: string, title: string, nextMessages: Message[]) => {
      setConversations((prev) => {
        const nextItem: Conversation = {
          id,
          title,
          messages: nextMessages,
          updatedAt: Date.now(),
        };
        const exists = prev.some((item) => item.id === id);
        if (!exists) {
          return [nextItem, ...prev];
        }
        return prev.map((item) => (item.id === id ? nextItem : item));
      });
    },
    []
  );

  const handleNewChat = () => {
    if (messages.length === 0 && !isReplying) {
      return;
    }

    abortActiveRequest();
    setIsReplying(false);
    setMessages([]);
    setChatTitle("新对话");
    setActiveId(createId());
  };

  const handleSelectChat = (id: string) => {
    if (id === activeId) return;

    const target = conversations.find((item) => item.id === id);
    if (!target) return;

    abortActiveRequest();
    setIsReplying(false);
    setActiveId(target.id);
    setChatTitle(target.title);
    setMessages([...target.messages]);
  };

  const handleSend = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isReplying) return;

    const userMessage: Message = {
      id: createId(),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };

    const conversationId = activeId;
    const nextTitle = messages.length === 0 ? deriveTitle(trimmed) : chatTitle;
    const baseMessages = [...messages, userMessage];

    setMessages(baseMessages);
    setChatTitle(nextTitle);
    upsertConversation(conversationId, nextTitle, baseMessages);
    setIsReplying(true);

    const assistantId = createId();
    const assistantCreatedAt = Date.now();
    let assistantContent = "";
    let assistantCreated = false;

    const applyAssistantContent = (nextContent: string) => {
      assistantContent = nextContent;
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: assistantContent,
        createdAt: assistantCreatedAt,
      };

      if (!assistantCreated) {
        assistantCreated = true;
        const nextMessages = [...baseMessages, assistantMessage];
        setMessages(nextMessages);
        upsertConversation(conversationId, nextTitle, nextMessages);
        return;
      }

      setMessages((prev) =>
        prev.map((item) =>
          item.id === assistantId
            ? { ...item, content: assistantContent }
            : item
        )
      );
      upsertConversation(conversationId, nextTitle, [
        ...baseMessages,
        assistantMessage,
      ]);
    };

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: baseMessages.map(({ role, content }) => ({
            role,
            content,
          })),
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`请求失败（${response.status}）`);
      }

      if (!response.body) {
        throw new Error("浏览器不支持流式响应");
      }

      const reader = response.body.getReader();
      await readChatStream(reader, (chunk) => {
        if (!isMountedRef.current) return;
        if (activeIdRef.current !== conversationId) return;
        applyAssistantContent(assistantContent + chunk);
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      if (!isMountedRef.current || activeIdRef.current !== conversationId) {
        return;
      }

      const errorText =
        error instanceof Error ? error.message : "回复失败，请稍后重试。";
      applyAssistantContent(
        assistantContent
          ? `${assistantContent}\n\n[错误] ${errorText}`
          : `抱歉，生成回复时出错：${errorText}`
      );
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }

      if (isMountedRef.current && activeIdRef.current === conversationId) {
        setIsReplying(false);
      }
    }
  };

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
        ];

  const lastMessage = messages[messages.length - 1];
  const showTyping =
    isReplying && (!lastMessage || lastMessage.role !== "assistant");

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
          isReplying={showTyping}
          emptyContent={<Welcome />}
        />
        <ChatInput disabled={isReplying} onSend={handleSend} />
      </main>
    </div>
  );
}

export default App;
