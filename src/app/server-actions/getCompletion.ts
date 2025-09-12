"use server";

import { createChat, updateChat } from "@/db/queries";
import { getServerSession } from "next-auth";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type Role = "user" | "assistant";
interface Message {
  role: Role;
  content: string;
}

// derive a human-friendly chat name from the first user message
function deriveName(history: Message[]) {
  const first =
    history.find((m) => m.role === "user")?.content?.trim() ?? "New chat";
  return first.replace(/\s+/g, " ").slice(0, 60);
}

export async function getCompletion(
  id: number | null,
  messageHistory: Message[]
) {
  const session = await getServerSession();
  const userEmail = session?.user?.email;
  if (!userEmail) throw new Error("Unauthorized");

  // ask OpenAI using the existing history
  const resp = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: messageHistory, // already in {role, content} shape
  });

  const assistant = resp.choices[0]?.message?.content?.trim() ?? "";
  const messages: Message[] = [
    ...messageHistory,
    { role: "assistant", content: assistant },
  ];

  const name = deriveName(messageHistory);

  // create or update the chat (and persist full message list)
  let chatId = id;
  if (!chatId) {
    chatId = await createChat(userEmail, name, messages);
  } else {
    await updateChat(chatId, userEmail, name, messages);
  }

  return { id: chatId, messages };
}
