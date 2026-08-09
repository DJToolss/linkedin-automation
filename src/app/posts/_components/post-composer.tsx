"use client";

import { useActionState, useState } from "react";

import type { PostFormState } from "@/app/posts/actions";
import { ImageUploader } from "@/app/posts/_components/image-uploader";
import { TimezonePicker } from "@/app/posts/_components/timezone-picker";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_HEADING_LENGTH,
  MAX_SUBHEADING_LENGTH,
} from "@/lib/posts/constants";

const initialState: PostFormState = {};

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? <p className="mt-1 text-sm text-red-700">{errors[0]}</p> : null;
}

type ExistingPost = {
  heading: string;
  subHeading: string;
  content: string;
  scheduledAtLocal: string;
  timezone: string;
  imageUrl: string | null;
};

function LinkedInPreview({ heading, subHeading, description }: { heading: string; subHeading: string; description: string }) {
  if (!heading.trim() && !subHeading.trim() && !description.trim()) {
    return <p className="text-sm text-zinc-500">Your LinkedIn preview will appear here.</p>;
  }

  return (
    <div className="space-y-3 text-sm leading-relaxed text-zinc-900">
      {heading.trim() && <p className="text-base font-bold">{heading.trim()}</p>}
      {subHeading.trim() && <p className="text-sm font-medium italic text-zinc-700">{subHeading.trim()}</p>}
      {description.trim() && <p className="whitespace-pre-wrap">{description.trim()}</p>}
    </div>
  );
}

export function PostComposer({
  action,
  timeZones,
  existing,
  submitLabel,
}: {
  action: (state: PostFormState, formData: FormData) => Promise<PostFormState>;
  timeZones: string[];
  existing?: ExistingPost;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [heading, setHeading] = useState(existing?.heading ?? "");
  const [subHeading, setSubHeading] = useState(existing?.subHeading ?? "");
  const [content, setContent] = useState(existing?.content ?? "");

  return (
    <form action={formAction} className="space-y-5">
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-zinc-700">
        LinkedIn does not support native bold in the API. Heading and subheading are styled with Unicode characters so they appear bold and italic on LinkedIn.
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="heading">Heading (bold on LinkedIn)</label>
        <input
          className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400"
          id="heading"
          maxLength={MAX_HEADING_LENGTH}
          name="heading"
          onChange={(event) => setHeading(event.target.value)}
          placeholder="Why System Design Matters"
          type="text"
          value={heading}
        />
        <p className="mt-1 text-xs text-zinc-600">{heading.length}/{MAX_HEADING_LENGTH} characters</p>
        <FieldError errors={state.fieldErrors?.heading} />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="subHeading">Subheading (italic on LinkedIn)</label>
        <input
          className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400"
          id="subHeading"
          maxLength={MAX_SUBHEADING_LENGTH}
          name="subHeading"
          onChange={(event) => setSubHeading(event.target.value)}
          placeholder="Series: System Design from First Principles | Post 1 of 70"
          type="text"
          value={subHeading}
        />
        <p className="mt-1 text-xs text-zinc-600">{subHeading.length}/{MAX_SUBHEADING_LENGTH} characters</p>
        <FieldError errors={state.fieldErrors?.subHeading} />
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="content">Description</label>
        <textarea
          className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400"
          id="content"
          maxLength={MAX_DESCRIPTION_LENGTH}
          name="content"
          onChange={(event) => setContent(event.target.value)}
          placeholder="Most engineers learn to write correct code long before they learn to design systems that survive real users."
          rows={6}
          value={content}
        />
        <p className="mt-1 text-xs text-zinc-600">{content.length}/{MAX_DESCRIPTION_LENGTH} characters</p>
        <FieldError errors={state.fieldErrors?.content} />
      </div>

      <div className="rounded-xl border bg-zinc-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">LinkedIn preview</p>
        <div className="mt-3">
          <LinkedInPreview description={content} heading={heading} subHeading={subHeading} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium" htmlFor="scheduledAt">Date and time</label>
          <input
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-400"
            defaultValue={existing?.scheduledAtLocal}
            id="scheduledAt"
            name="scheduledAt"
            required
            type="datetime-local"
          />
          <FieldError errors={state.fieldErrors?.scheduledAt} />
        </div>
        <div>
          <label className="block text-sm font-medium">Time zone</label>
          <TimezonePicker defaultValue={existing?.timezone ?? "UTC"} error={state.fieldErrors?.timezone} timeZones={timeZones} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Image (optional)</label>
        <ImageUploader error={state.fieldErrors?.image} existingImageUrl={existing?.imageUrl} />
      </div>

      {state.error && <p className="text-sm text-red-700" role="alert">{state.error}</p>}
      <button className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
