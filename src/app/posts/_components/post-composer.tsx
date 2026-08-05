"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";

import type { PostFormState } from "@/app/posts/actions";
import { MAX_POST_CONTENT_LENGTH } from "@/lib/posts/constants";

const initialState: PostFormState = {};

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? <p className="mt-1 text-sm text-red-700">{errors[0]}</p> : null;
}

type ExistingPost = { content: string; scheduledAtLocal: string; timezone: string; imageUrl: string | null };

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
  const [content, setContent] = useState(existing?.content ?? "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(existing?.imageUrl ?? null);
  const [removeImage, setRemoveImage] = useState(false);
  const timezoneSelectRef = useRef<HTMLSelectElement>(null);

  // The <select> is uncontrolled; this only synchronizes it with the
  // browser's detected zone once on mount, so React state never needs to
  // track a value the form doesn't otherwise read from anywhere else.
  useEffect(() => {
    if (existing || !timezoneSelectRef.current) return; // don't override an explicit edit target
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && timeZones.includes(detected)) timezoneSelectRef.current.value = detected;
  }, [existing, timeZones]);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setRemoveImage(false);
    setPreviewUrl(file ? URL.createObjectURL(file) : existing?.imageUrl ?? null);
  }

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="block text-sm font-medium" htmlFor="content">Post content</label>
        <textarea
          className="mt-1 w-full rounded border px-3 py-2"
          id="content"
          maxLength={MAX_POST_CONTENT_LENGTH}
          name="content"
          onChange={(event) => setContent(event.target.value)}
          required
          rows={6}
          value={content}
        />
        <p className="mt-1 text-xs text-zinc-500">{content.length}/{MAX_POST_CONTENT_LENGTH} characters</p>
        <FieldError errors={state.fieldErrors?.content} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium" htmlFor="scheduledAt">Date and time</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            defaultValue={existing?.scheduledAtLocal}
            id="scheduledAt"
            name="scheduledAt"
            required
            type="datetime-local"
          />
          <FieldError errors={state.fieldErrors?.scheduledAt} />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="timezone">Time zone</label>
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            defaultValue={existing?.timezone ?? "UTC"}
            id="timezone"
            name="timezone"
            ref={timezoneSelectRef}
          >
            {timeZones.map((zone) => (
              <option key={zone} value={zone}>{zone}</option>
            ))}
          </select>
          <FieldError errors={state.fieldErrors?.timezone} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium" htmlFor="image">Image (optional)</label>
        <input
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="mt-1 w-full text-sm"
          id="image"
          name="image"
          onChange={handleImageChange}
          type="file"
        />
        <FieldError errors={state.fieldErrors?.image} />
        {previewUrl && !removeImage && (
          <div className="mt-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- previewing a locally-selected file or a Cloudinary URL, not a static asset */}
            <img alt="Selected post image preview" className="max-h-48 rounded border" src={previewUrl} />
            {existing?.imageUrl && (
              <label className="mt-2 flex items-center gap-2 text-sm text-zinc-600">
                <input name="removeImage" onChange={(event) => setRemoveImage(event.target.checked)} type="checkbox" />
                Remove this image
              </label>
            )}
          </div>
        )}
      </div>

      {state.error && <p className="text-sm text-red-700" role="alert">{state.error}</p>}
      <button className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
