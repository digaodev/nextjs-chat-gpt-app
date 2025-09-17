"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveChatAction } from "@/app/server-actions/chatActions";
import Transcript from "./Transcript";
import type { Message } from "@/types";

interface ChatProps {
  id?: number | null;
  messages?: Message[];
}

export default function Chat({
  id = null,
  messages: initialMessages = [],
}: ChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatId = useRef<number | null>(id);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No reader available");
      }

      let assistantContent = "";
      const assistantMessage: Message = { role: "assistant", content: "" };
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);

        if (chunk.trim()) {
          assistantContent += chunk;

          const updatedFinalMessages = [...updatedMessages, {
            role: "assistant" as const,
            content: assistantContent
          }];
          setMessages(updatedFinalMessages);
        }
      }

      // Save chat after completion
      try {
        const finalMessagesWithAssistant = [...updatedMessages, {
          role: "assistant" as const,
          content: assistantContent
        }];

        const result = await saveChatAction(chatId.current, finalMessagesWithAssistant);

        if (!chatId.current) {
          chatId.current = result.id;
          router.push(`/chats/${result.id}`);
          router.refresh();
        }
      } catch (err) {
        console.error("Error saving chat:", err);
      }
    } catch (err) {
      console.error("Error:", err);
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Transcript messages={messages} truncate={false} />

      <form onSubmit={handleSubmit} className="flex border-t border-t-gray-300 pt-3 mt-3">
        <Input
          className="flex-grow text-lg"
          placeholder="Type your question…"
          value={input}
          disabled={isLoading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <Button
          type="submit"
          className="ml-3 text-lg"
          disabled={isLoading}
        >
          {isLoading ? "Sending…" : "Send"}
        </Button>
      </form>
    </div>
  );
}
