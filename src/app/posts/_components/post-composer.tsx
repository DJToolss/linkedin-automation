"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import type { PostFormState } from "@/app/posts/actions";
import { ImageUploader } from "@/app/posts/_components/image-uploader";
import { ScheduleDatePicker } from "@/app/posts/_components/schedule-date-picker";
import { resolveInitialZone, TimezonePicker } from "@/app/posts/_components/timezone-picker";
import {
  DEFAULT_TIMEZONE,
  MAX_DESCRIPTION_LENGTH,
  MAX_HEADING_LENGTH,
  MAX_SUBHEADING_LENGTH,
} from "@/lib/posts/constants";

const initialState: PostFormState = {};

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? <p className="ui-error">{errors[0]}</p> : null;
}

function ComposerActions({ submitLabel }: { submitLabel: string }) {
  const { pending, data } = useFormStatus();
  const intent = data?.get("intent");

  return (
    <div className="flex flex-wrap gap-3">
      <button className="ui-btn-primary" disabled={pending} name="intent" type="submit" value="schedule">
        {pending && intent === "schedule" ? "Saving…" : submitLabel}
      </button>
      <button className="ui-btn-secondary" disabled={pending} formNoValidate name="intent" type="submit" value="post_now">
        {pending && intent === "post_now" ? "Posting…" : "Post now"}
      </button>
    </div>
  );
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
    return <p className="text-[13.5px] text-text-faint">Your LinkedIn preview will appear here.</p>;
  }

  return (
    <div className="space-y-3 text-[13.5px] leading-relaxed text-text">
      {heading.trim() && <p className="text-[15px] font-semibold">{heading.trim()}</p>}
      {subHeading.trim() && <p className="text-[13px] font-medium italic text-text-muted">{subHeading.trim()}</p>}
      {description.trim() && <p className="whitespace-pre-wrap">{description.trim()}</p>}
    </div>
  );
}

export function PostComposer({
  action,
  timeZones,
  existing,
  submitLabel,
  scheduledAtIsos = [],
}: {
  action: (state: PostFormState, formData: FormData) => Promise<PostFormState>;
  timeZones: string[];
  existing?: ExistingPost;
  submitLabel: string;
  scheduledAtIsos?: string[];
}) {
  const [state, formAction] = useActionState(action, initialState);
  const [heading, setHeading] = useState(existing?.heading ?? "");
  const [subHeading, setSubHeading] = useState(existing?.subHeading ?? "");
  const [content, setContent] = useState(existing?.content ?? "");
  const [timezone, setTimezone] = useState(() => resolveInitialZone(existing?.timezone ?? DEFAULT_TIMEZONE, timeZones));

  return (
    <form action={formAction} className="space-y-5">
      <div className="ui-notice p-4 text-[13.5px] text-text">
        LinkedIn does not support native bold in the API. Heading and subheading are styled with Unicode characters so they appear bold and italic on LinkedIn.
      </div>

      <div>
        <label className="ui-label" htmlFor="heading">
          Heading (bold on LinkedIn)
        </label>
        <input
          className="ui-input mt-1"
          id="heading"
          maxLength={MAX_HEADING_LENGTH}
          name="heading"
          onChange={(event) => setHeading(event.target.value)}
          placeholder="Why System Design Matters"
          type="text"
          value={heading}
        />
        <p className="ui-help font-mono">
          {heading.length}/{MAX_HEADING_LENGTH} characters
        </p>
        <FieldError errors={state.fieldErrors?.heading} />
      </div>

      <div>
        <label className="ui-label" htmlFor="subHeading">
          Subheading (italic on LinkedIn)
        </label>
        <input
          className="ui-input mt-1"
          id="subHeading"
          maxLength={MAX_SUBHEADING_LENGTH}
          name="subHeading"
          onChange={(event) => setSubHeading(event.target.value)}
          placeholder="Series: System Design from First Principles | Post 1 of 70"
          type="text"
          value={subHeading}
        />
        <p className="ui-help font-mono">
          {subHeading.length}/{MAX_SUBHEADING_LENGTH} characters
        </p>
        <FieldError errors={state.fieldErrors?.subHeading} />
      </div>

      <div>
        <label className="ui-label" htmlFor="content">
          Description
        </label>
        <textarea
          className="ui-input mt-1"
          id="content"
          maxLength={MAX_DESCRIPTION_LENGTH}
          name="content"
          onChange={(event) => setContent(event.target.value)}
          placeholder="Most engineers learn to write correct code long before they learn to design systems that survive real users."
          rows={6}
          value={content}
        />
        <p className="ui-help font-mono">
          {content.length}/{MAX_DESCRIPTION_LENGTH} characters
        </p>
        <FieldError errors={state.fieldErrors?.content} />
      </div>

      <div className="rounded-[10px] border border-line bg-paper-2 p-4">
        <p className="text-[12px] font-semibold text-slate">LinkedIn preview</p>
        <div className="mt-3">
          <LinkedInPreview description={content} heading={heading} subHeading={subHeading} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="ui-label" htmlFor="scheduledAt">
            Date and time
          </label>
          <div className="mt-1">
            <ScheduleDatePicker
              defaultValue={existing?.scheduledAtLocal}
              error={state.fieldErrors?.scheduledAt}
              scheduledAtIsos={scheduledAtIsos}
              timezone={timezone}
            />
          </div>
          <p className="ui-help">Needed to schedule. Skip this if you Post now.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="ui-label">Time zone</label>
          <TimezonePicker error={state.fieldErrors?.timezone} onChange={setTimezone} timeZones={timeZones} value={timezone} />
        </div>
      </div>

      <div>
        <label className="ui-label">Image (optional)</label>
        <ImageUploader error={state.fieldErrors?.image} existingImageUrl={existing?.imageUrl} />
      </div>

      {state.error && (
        <p className="ui-error" role="alert">
          {state.error}
        </p>
      )}
      <ComposerActions submitLabel={submitLabel} />
    </form>
  );
}
