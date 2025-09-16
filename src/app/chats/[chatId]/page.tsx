import Chat from "@/app/components/Chat";
import { getChat } from "@/db/queries";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

interface ChatDetailProps {
  params: {
    chatId: string;
  };
}
export default async function ChatDetail({
  params: { chatId },
}: ChatDetailProps) {
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
