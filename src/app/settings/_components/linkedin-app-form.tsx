"use client";

import { useActionState } from "react";

import { saveLinkedInAppAction, type SettingsFormState } from "@/app/settings/actions";

const initialState: SettingsFormState = {};

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? <p className="ui-error">{errors[0]}</p> : null;
}

export function LinkedInAppForm({ hasApp }: { hasApp: boolean }) {
  const [state, action, pending] = useActionState(saveLinkedInAppAction, initialState);
  return (
    <form action={action} className="mt-4 space-y-4">
      <div>
        <label className="ui-label" htmlFor="clientId">
          Client ID
        </label>
        <input autoComplete="off" className="ui-input mt-1 font-mono" id="clientId" name="clientId" required />
        <FieldError errors={state.fieldErrors?.clientId} />
      </div>
      <div>
        <label className="ui-label" htmlFor="clientSecret">
          Client Secret
        </label>
        <input autoComplete="off" className="ui-input mt-1 font-mono" id="clientSecret" name="clientSecret" required type="password" />
        <FieldError errors={state.fieldErrors?.clientSecret} />
      </div>
      {state.error && (
        <p className="ui-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="ui-btn-primary" disabled={pending} type="submit">
        {pending ? "Saving…" : hasApp ? "Update credentials" : "Save credentials"}
      </button>
    </form>
  );
}
