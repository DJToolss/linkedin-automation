"use client";

import { useActionState } from "react";

import { saveLinkedInAppAction, type SettingsFormState } from "@/app/settings/actions";

const initialState: SettingsFormState = {};

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? <p className="mt-1 text-sm text-red-700">{errors[0]}</p> : null;
}

export function LinkedInAppForm({ hasApp }: { hasApp: boolean }) {
  const [state, action, pending] = useActionState(saveLinkedInAppAction, initialState);
  return (
    <form action={action} className="mt-4 space-y-4">
      <div>
        <label className="block text-sm font-medium" htmlFor="clientId">Client ID</label>
        <input className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400" id="clientId" name="clientId" autoComplete="off" required />
        <FieldError errors={state.fieldErrors?.clientId} />
      </div>
      <div>
        <label className="block text-sm font-medium" htmlFor="clientSecret">Client Secret</label>
        <input className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400" id="clientSecret" name="clientSecret" type="password" autoComplete="off" required />
        <FieldError errors={state.fieldErrors?.clientSecret} />
      </div>
      {state.error && <p className="text-sm text-red-700" role="alert">{state.error}</p>}
      <button className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Saving…" : hasApp ? "Update credentials" : "Save credentials"}
      </button>
    </form>
  );
}
