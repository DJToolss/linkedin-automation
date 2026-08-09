import type { NextAuthConfig } from "next-auth";

/**
 * Edge/proxy-safe Auth.js config. Keep this module free of database imports
 * and strict env validation so middleware can load before runtime secrets are
 * resolved on platforms like Railway.
 */
export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.id === "string") session.user.id = token.id;
      return session;
    },
  },
} satisfies NextAuthConfig;
