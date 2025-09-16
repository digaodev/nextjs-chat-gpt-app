import { neon, neonConfig } from "@neondatabase/serverless";
import type { Chat, ChatWithMessages, Message } from "../types";

const sql = neon(process.env.DATABASE_URL!);

// CREATE
export async function createChat(
  userEmail: string,
  name: string,
  messages: Message[]
): Promise<number> {
  // get id using RETURNING (no session-dependent currval)
  const [{ id }] = (await sql`
    INSERT INTO chats (user_email, name)
    VALUES (${userEmail}, ${name})
    RETURNING id
  `) as { id: number }[];

  if (messages.length) {
    const roles = messages.map((m) => m.role);
    const contents = messages.map((m) => m.content);
    await sql`
      INSERT INTO messages (chat_id, role, content)
      SELECT ${id}, r, c
      FROM unnest(${roles}::text[], ${contents}::text[]) AS t(r, c)
    `;
  }

  return id;
}

/**
 * Update chat name (and bump timestamp) and REPLACE its messages.
 * Only updates if the chat belongs to userEmail.
 */
export async function updateChat(
  chatId: number,
  userEmail: string,
  name: string,
  msgs: Message[]
) {
  // Prepare arrays for bulk insert (kept in sync)
  const roles = msgs.map((m) => m.role);
  const contents = msgs.map((m) => m.content);

  // Single statement: update chat -> delete old messages -> insert new messages
  const rows = (await sql`
    WITH updated AS (
      UPDATE chats
         SET name = ${name},
             "timestamp" = NOW()
       WHERE id = ${chatId} AND user_email = ${userEmail}
       RETURNING id
    ),
    deleted AS (
      DELETE FROM messages
       WHERE chat_id IN (SELECT id FROM updated)
       RETURNING 1
    ),
    inserted AS (
      INSERT INTO messages (chat_id, role, content)
      SELECT (SELECT id FROM updated), r, c
        FROM unnest(${roles}::text[], ${contents}::text[]) AS t(r, c)
      RETURNING 1
    )
    SELECT id FROM updated
  `) as { id: number }[];

  // No row -> chat not found or not owned by user
  if (!rows[0]) return null;

  // Reuse your existing loader to return the updated object
  return await getChat(chatId);
}

// READ (single chat + messages)
export async function getChat(chatId: number) {
  const chats = (await sql`
    SELECT id, user_email, name, "timestamp"
    FROM chats
    WHERE id = ${chatId}
    LIMIT 1
  `) as Chat[];
  const chat = chats[0];
  if (!chat) return null;

  const rows = (await sql`
    SELECT role, content
    FROM messages
    WHERE chat_id = ${chatId}
    ORDER BY id
  `) as { role: string; content: string }[];

  return {
    ...chat,
    messages: rows.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  };
}

// READ (list chats only)
export async function getChats(userEmail: string): Promise<Chat[]> {
  return (await sql`
    SELECT id, user_email, name, "timestamp"
    FROM chats
    WHERE user_email = ${userEmail}
    ORDER BY "timestamp" DESC
  `) as Chat[];
}

// READ (last 3 chats + their messages) — avoid N+1
export async function getChatsWithMessages(
  userEmail: string
): Promise<ChatWithMessages[]> {
  const chats = (await sql`
    SELECT id, user_email, name, "timestamp"
    FROM chats
    WHERE user_email = ${userEmail}
    ORDER BY "timestamp" DESC
    LIMIT 3
  `) as Chat[];

  if (chats.length === 0) return [];

  const ids = chats.map((c) => c.id);
  const rows = (await sql`
    SELECT chat_id, role, content
    FROM messages
    WHERE chat_id = ANY(${ids}::int[])
    ORDER BY id
  `) as { chat_id: number; role: string; content: string }[];

  const byChat = new Map<number, Message[]>();
  for (const r of rows) {
    const list = byChat.get(r.chat_id) ?? [];
    list.push({ role: r.role as "user" | "assistant", content: r.content });
    byChat.set(r.chat_id, list);
  }

  return chats.map((c) => ({
    ...c,
    messages: byChat.get(c.id) ?? [],
  })) as ChatWithMessages[];
}

// READ (messages for a chat)
export async function getMessages(chatId: number): Promise<Message[]> {
  const rows = (await sql`
    SELECT role, content
    FROM messages
    WHERE chat_id = ${chatId}
    ORDER BY id
  `) as { role: string; content: string }[];

  return rows.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
}
