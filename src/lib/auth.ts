import type { NextAuthOptions } from "next-auth";
import GitHubProvider, { type GithubProfile } from "next-auth/providers/github";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: { params: { scope: "read:user user:email" } },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === "github") {
        // 1) if GitHub returned it directly
        const pEmail = (profile as GithubProfile | null)?.email;
        if (pEmail) token.email = pEmail;

        // 2) otherwise fetch verified emails
        if (!token.email && account.access_token) {
          const res = await fetch("https://api.github.com/user/emails", {
            headers: {
              Authorization: `Bearer ${account.access_token}`, // or "token ..."
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          });

          if (res.ok) {
            const list = (await res.json()) as Array<{
              email: string;
              primary: boolean;
              verified: boolean;
            }>;
            if (Array.isArray(list)) {
              const primary =
                list.find((e) => e.primary && e.verified) ??
                list.find((e) => e.verified) ??
                list[0];
              if (primary?.email) token.email = primary.email;
            }
          } else {
            console.warn(
              "GitHub /user/emails failed",
              res.status,
              await res.text()
            );
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email)
        session.user.email = token.email as string;
      return session;
    },
  },
};
