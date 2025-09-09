import type { NextAuthOptions } from "next-auth";
import GitHubProvider, { type GithubProfile } from "next-auth/providers/github";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!, // fail fast if missing
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const login = (profile as GithubProfile | null)?.login;
      return login === "digaodev"; // or return true to allow any GitHub user
    },
  },
  // secret is optional here if NEXTAUTH_SECRET is set in env
  // secret: process.env.NEXTAUTH_SECRET,
};
