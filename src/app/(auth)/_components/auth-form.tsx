"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction, type AuthFormState } from "@/app/(auth)/actions";

const initialState: AuthFormState = {};
function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? <p className="ui-error">{errors[0]}</p> : null;
}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="ui-label" htmlFor="email">
          Email
        </label>
        <input autoComplete="email" className="ui-input mt-1" id="email" name="email" required type="email" />
        <FieldError errors={state.fieldErrors?.email} />
      </div>
      <div>
        <label className="ui-label" htmlFor="password">
          Password
        </label>
        <input autoComplete="current-password" className="ui-input mt-1" id="password" name="password" required type="password" />
        <FieldError errors={state.fieldErrors?.password} />
      </div>
      {state.error && (
        <p className="ui-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="ui-btn-primary w-full" disabled={pending} type="submit">
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-[13px] text-text-muted">
        New here?{" "}
        <Link className="font-medium text-brass hover:text-brass-dark" href="/register">
          Create an account
        </Link>
        .
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initialState);
  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="ui-label" htmlFor="name">
          Name
        </label>
        <input autoComplete="name" className="ui-input mt-1" id="name" name="name" required />
        <FieldError errors={state.fieldErrors?.name} />
      </div>
      <div>
        <label className="ui-label" htmlFor="email">
          Email
        </label>
        <input autoComplete="email" className="ui-input mt-1" id="email" name="email" required type="email" />
        <FieldError errors={state.fieldErrors?.email} />
      </div>
      <div>
        <label className="ui-label" htmlFor="password">
          Password
        </label>
        <input autoComplete="new-password" className="ui-input mt-1" id="password" minLength={12} name="password" required type="password" />
        <p className="ui-help">At least 12 characters, with upper/lowercase letters and a number.</p>
        <FieldError errors={state.fieldErrors?.password} />
      </div>
      {state.error && (
        <p className="ui-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="ui-btn-primary w-full" disabled={pending} type="submit">
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-[13px] text-text-muted">
        Already have an account?{" "}
        <Link className="font-medium text-brass hover:text-brass-dark" href="/login">
          Sign in
        </Link>
        .
      </p>
    </form>
  );
}
