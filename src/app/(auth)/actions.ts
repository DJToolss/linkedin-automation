"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { authRateLimit } from "@/lib/auth/rate-limit";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

const passwordSchema = z.string().min(12, "Use at least 12 characters.").max(128, "Password is too long.").regex(/[a-z]/, "Include a lowercase letter.").regex(/[A-Z]/, "Include an uppercase letter.").regex(/[0-9]/, "Include a number.");
const registerSchema = z.object({ name: z.string().trim().min(2, "Enter your name.").max(100, "Name is too long."), email: z.string().trim().toLowerCase().email("Enter a valid email address."), password: passwordSchema });
const loginSchema = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email address."), password: z.string().min(1, "Enter your password.").max(256) });

export type AuthFormState = { error?: string; fieldErrors?: Record<string, string[]> };
const validationState = (error: z.ZodError): AuthFormState => ({ fieldErrors: error.flatten().fieldErrors });

export async function registerAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({ name: formData.get("name"), email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return validationState(parsed.error);
  if (!authRateLimit.canRegister(parsed.data.email)) return { error: "Too many attempts. Please try again later." };
  try {
    const [existing] = await getDb().select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
    if (existing) throw new Error("duplicate");
    await getDb().insert(users).values({ name: parsed.data.name, email: parsed.data.email, passwordHash: await bcrypt.hash(parsed.data.password, 12) });
  } catch {
    authRateLimit.recordRegister(parsed.data.email);
    return { error: "Unable to create an account with these details." };
  }
  authRateLimit.clearRegister(parsed.data.email);
  await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirectTo: "/dashboard" });
  return { error: "Unable to sign in. Please try again." };
}

export async function loginAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return validationState(parsed.error);
  if (!authRateLimit.canLogIn(parsed.data.email)) return { error: "Too many attempts. Please try again later." };
  try {
    await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) { authRateLimit.recordLogIn(parsed.data.email); return { error: "Invalid email or password." }; }
    throw error;
  }
  return { error: "Unable to sign in. Please try again." };
}

export async function logoutAction() { await signOut({ redirectTo: "/login" }); }
