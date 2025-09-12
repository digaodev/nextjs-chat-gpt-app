"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getCompletion } from "@/app/server-actions/getCompletion";

type Role = "user" | "assistant";
interface Message {
  role: Role;
  content: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const chatId = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // scroll to bottom when messages change
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSendMessage = async () => {
    const text = message.trim();
    if (!text || sending) return;

    const nextHistory: Message[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(nextHistory); // optimistic
    setMessage("");
    setSending(true);

    try {
      const completions = await getCompletion(chatId.current, nextHistory);
      chatId.current = completions.id;
      setMessages(completions.messages); // server is source of truth
    } catch (err) {
      // roll back optimistic add on failure
      setMessages(messages);
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={listRef} className="flex-1 overflow-auto pr-1">
        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={`mb-3 flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-md py-2 px-3 whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-900"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <div className="flex border-t border-t-gray-300 pt-3 mt-3">
        <Input
          className="flex-grow text-lg"
          placeholder="Type your question…"
          value={message}
          disabled={sending}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        <Button
          onClick={handleSendMessage}
          className="ml-3 text-lg"
          disabled={sending}
        >
          {sending ? "Sending…" : "Send"}
        </Button>
      </div>
    </div>
  );
}
