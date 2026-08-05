"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction, type AuthFormState } from "@/app/(auth)/actions";

const initialState: AuthFormState = {};
function FieldError({ errors }: { errors?: string[] }) { return errors?.length ? <p className="mt-1 text-sm text-red-700">{errors[0]}</p> : null; }

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  return <form action={action} className="space-y-5"><div><label className="block text-sm font-medium" htmlFor="email">Email</label><input className="mt-1 w-full rounded border px-3 py-2" id="email" name="email" type="email" autoComplete="email" required /><FieldError errors={state.fieldErrors?.email} /></div><div><label className="block text-sm font-medium" htmlFor="password">Password</label><input className="mt-1 w-full rounded border px-3 py-2" id="password" name="password" type="password" autoComplete="current-password" required /><FieldError errors={state.fieldErrors?.password} /></div>{state.error && <p className="text-sm text-red-700" role="alert">{state.error}</p>}<button className="w-full rounded bg-blue-700 px-4 py-2 font-medium text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "Signing in…" : "Sign in"}</button><p className="text-center text-sm text-zinc-600">New here? <Link className="text-blue-700 underline" href="/register">Create an account</Link>.</p></form>;
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initialState);
  return <form action={action} className="space-y-5"><div><label className="block text-sm font-medium" htmlFor="name">Name</label><input className="mt-1 w-full rounded border px-3 py-2" id="name" name="name" autoComplete="name" required /><FieldError errors={state.fieldErrors?.name} /></div><div><label className="block text-sm font-medium" htmlFor="email">Email</label><input className="mt-1 w-full rounded border px-3 py-2" id="email" name="email" type="email" autoComplete="email" required /><FieldError errors={state.fieldErrors?.email} /></div><div><label className="block text-sm font-medium" htmlFor="password">Password</label><input className="mt-1 w-full rounded border px-3 py-2" id="password" name="password" type="password" autoComplete="new-password" minLength={12} required /><p className="mt-1 text-xs text-zinc-500">At least 12 characters, with upper/lowercase letters and a number.</p><FieldError errors={state.fieldErrors?.password} /></div>{state.error && <p className="text-sm text-red-700" role="alert">{state.error}</p>}<button className="w-full rounded bg-blue-700 px-4 py-2 font-medium text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "Creating account…" : "Create account"}</button><p className="text-center text-sm text-zinc-600">Already have an account? <Link className="text-blue-700 underline" href="/login">Sign in</Link>.</p></form>;
}
