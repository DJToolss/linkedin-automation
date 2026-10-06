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
          className={`mt-1 flex cursor-pointer flex-col items-center justify-center rounded-[10px] border-2 border-dashed px-6 py-10 transition-colors ${
            dragging ? "border-brass bg-paper-2" : "border-line bg-paper-2 hover:border-brass hover:bg-paper"
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
          <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-card text-slate-light shadow-card ring-1 ring-line">
            <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="mt-4 text-[13.5px] font-medium text-text">Drop an image here, or click to browse</p>
          <p className="mt-1 text-[12px] text-text-faint">PNG, JPG, GIF, or WebP</p>
        </div>
      ) : (
        <div className="ui-panel mt-1 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- local preview or Cloudinary URL */}
          <img alt="Post image preview" className="max-h-64 w-full bg-paper-2 object-contain" src={previewUrl} />
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-medium text-text">{fileName ?? "Current image"}</p>
              {fileSize !== null && <p className="font-mono text-[12px] text-text-faint">{formatFileSize(fileSize)}</p>}
            </div>
            <div className="flex shrink-0 gap-2">
              <button className="ui-btn-secondary px-3 py-1.5 text-[13px]" onClick={() => inputRef.current?.click()} type="button">
                Replace
              </button>
              <button
                className="ui-btn-danger px-3 py-1.5 text-[13px]"
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

      {error?.length ? <p className="ui-error">{error[0]}</p> : null}
    </div>
  );
}
