import { Separator } from "@/components/ui/separator";
import Chat from "./components/Chat";
import { getServerSession } from "next-auth";

export default async function Home() {
  const session = await getServerSession();
  const isLoggedIn = session?.user?.name || session?.user?.email;

  return (
    <main className="p-5">
      <h1 className="text-4xl font-bold">Welcome to GPT Chat</h1>

      {isLoggedIn ? (
        <>
          <Separator className="my-5" />
          <Chat />
        </>
      ) : (
        <div>You need to log in to use the chat</div>
      )}
    </main>
  );
}
