"use server";

import { getServerSession } from "next-auth";
import {
  createChat,
  updateChat,
  getChat,
  getChats,
  getChatsWithMessages,
  getMessages,
} from "@/db/queries";

import { authOptions } from "@/lib/auth";
import type { Chat, ChatWithMessages, Message } from "@/types";

// derive a human-friendly chat name from the first user message
function deriveName(history: Message[]) {
  const first =
    history.find((m) => m.role === "user")?.content?.trim() ?? "New chat";
  return first.replace(/\s+/g, " ").slice(0, 60);
}

async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  if (!userEmail) {
    throw new Error("Please log in to continue");
  }
  return userEmail;
}

export async function saveChatAction(
  chatId: number | null,
  messages: Message[]
): Promise<{ id: number; messages: Message[] }> {
  try {
    const userEmail = await getAuthenticatedUser();
    const name = deriveName(messages);

    // create or update the chat (and persist full message list)
    let currentChatId = chatId;
    if (!currentChatId) {
      currentChatId = await createChat(userEmail, name, messages);
    } else {
      await updateChat(currentChatId, userEmail, name, messages);
    }

    return { id: currentChatId, messages };
  } catch (error) {
    console.error("Error saving chat:", error);
    throw error;
  }
}

export async function getChatAction(chatId: number) {
  try {
    const userEmail = await getAuthenticatedUser();
    const chat = await getChat(chatId);

    if (!chat) {
      throw new Error("Chat not found");
    }

    if (chat.user_email !== userEmail) {
      throw new Error("You don't have access to this chat");
    }

    return chat;
  } catch (error) {
    console.error("Error getting chat:", error);
    throw error;
  }
}

export async function getChatsAction(): Promise<Chat[]> {
  try {
    const userEmail = await getAuthenticatedUser();
    return await getChats(userEmail);
  } catch (error) {
    console.error("Error getting chats:", error);
    throw error;
  }
}

export async function getChatsWithMessagesAction(): Promise<
  ChatWithMessages[]
> {
  try {
    const userEmail = await getAuthenticatedUser();
    return await getChatsWithMessages(userEmail);
  } catch (error) {
    console.error("Error getting chats with messages:", error);
    throw error;
  }
}

export async function getMessagesAction(chatId: number): Promise<Message[]> {
  try {
    const userEmail = await getAuthenticatedUser();
    const chat = await getChat(chatId);

    if (!chat) {
      throw new Error("Chat not found");
    }

    if (chat.user_email !== userEmail) {
      throw new Error("You don't have access to this chat");
    }

    return await getMessages(chatId);
  } catch (error) {
    console.error("Error getting messages:", error);
    throw error;
  }
}
