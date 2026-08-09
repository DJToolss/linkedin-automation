"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

type ImageUploaderProps = {
  existingImageUrl?: string | null;
  error?: string[];
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageUploader({ existingImageUrl, error }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl ?? null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [removeExisting, setRemoveExisting] = useState(false);

  function applyFile(file: File | undefined) {
    if (!file) return;
    setRemoveExisting(false);
    setFileName(file.name);
    setFileSize(file.size);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    const transfer = new DataTransfer();
    transfer.items.add(file);
    if (inputRef.current) inputRef.current.files = transfer.files;
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    applyFile(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    applyFile(event.dataTransfer.files?.[0]);
  }

  function clearSelection() {
    setPreviewUrl(null);
    setFileName(null);
    setFileSize(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleRemoveExisting(checked: boolean) {
    setRemoveExisting(checked);
    if (checked) setPreviewUrl(null);
    else if (existingImageUrl) setPreviewUrl(existingImageUrl);
  }

  const showPreview = previewUrl && !removeExisting;

  return (
    <div>
      <input
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="sr-only"
        id="image"
        name="image"
        onChange={handleInputChange}
        ref={inputRef}
        type="file"
      />

      {!showPreview ? (
        <div
          className={`mt-1 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
            dragging ? "border-blue-500 bg-blue-50/50" : "border-zinc-300 bg-zinc-50 hover:border-blue-400 hover:bg-blue-50/30"
          }`}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragging(false);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-blue-700 shadow-sm ring-1 ring-zinc-200">
            <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-900">Drop an image here, or click to browse</p>
          <p className="mt-1 text-xs text-zinc-500">PNG, JPG, GIF, or WebP</p>
        </div>
      ) : (
        <div className="mt-1 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element -- local preview or Cloudinary URL */}
          <img alt="Post image preview" className="max-h-64 w-full object-contain bg-zinc-100" src={previewUrl} />
          <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900">{fileName ?? "Current image"}</p>
              {fileSize !== null && <p className="text-xs text-zinc-500">{formatFileSize(fileSize)}</p>}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                className="rounded border px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                onClick={() => inputRef.current?.click()}
                type="button"
              >
                Replace
              </button>
              <button
                className="rounded border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                onClick={() => {
                  if (existingImageUrl && !fileName) handleRemoveExisting(true);
                  else clearSelection();
                }}
                type="button"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {existingImageUrl && (
        <input name="removeImage" type="hidden" value={removeExisting ? "on" : ""} />
      )}

      {error?.length ? <p className="mt-1 text-sm text-red-700">{error[0]}</p> : null}
    </div>
  );
}
