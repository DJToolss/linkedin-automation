import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { authConfig } from "@/auth.config";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { readAuthSecret, readSessionMaxAge } from "@/lib/env";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(256),
});

const authSecret = readAuthSecret();

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  ...(authSecret ? { secret: authSecret } : {}),
  session: { ...authConfig.session, maxAge: readSessionMaxAge() },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const [user] = await getDb().select({ id: users.id, name: users.name, email: users.email, passwordHash: users.passwordHash }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
        if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
});
