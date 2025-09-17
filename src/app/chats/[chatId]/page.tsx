import Chat from "@/app/components/Chat";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import { getChat } from "@/db/queries";

interface ChatDetailProps {
  params: {
    chatId: string;
  };
}
export default async function ChatDetail(props: ChatDetailProps) {
  // https://nextjs.org/docs/messages/sync-dynamic-apis
  const { chatId } = await props.params; // Await to get params
  const chatIdNumber = Number(chatId);
  const chat = await getChat(chatIdNumber);
  if (!chat) {
    return notFound();
  }

  const session = await getServerSession();
  if (!session || chat.user_email !== session.user?.email) {
    return redirect("/");
  }

  return (
    <main>
      <Chat
        key={chatIdNumber}
        id={chatIdNumber}
        messages={chat?.messages || []}
      />
    </main>
  );
}
