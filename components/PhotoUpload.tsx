"use client";

import { useRef, useState } from "react";

interface UploadResult {
  added: number;
  skipped: number;
  errors: string[];
}

interface PhotoUploadProps {
  onUploadComplete: () => void;
}

export default function PhotoUpload({ onUploadComplete }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("photos", files[i]);
    }

    try {
      const res = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data);
      if (data.added > 0) {
        onUploadComplete();
      }
    } catch {
      setResult({ added: 0, skipped: 0, errors: ["Upload failed. Try again."] });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {/* Upload area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${dragOver ? "border-amber-500 bg-amber-50" : "border-stone-300 hover:border-amber-400"}
          ${uploading ? "opacity-50 pointer-events-none" : ""}
        `}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {uploading ? (
          <div className="space-y-2">
            <div className="animate-spin text-2xl">⏳</div>
            <p className="text-sm text-stone-600">Extracting GPS data...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-3xl">📷</div>
            <p className="text-sm font-medium text-stone-700">
              Tap to add photos or drag & drop
            </p>
            <p className="text-xs text-stone-500">
              GPS coordinates extracted automatically from EXIF data
            </p>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="rounded-lg bg-stone-100 p-3 text-sm space-y-1">
          {result.added > 0 && (
            <p className="text-emerald-700 font-medium">
              ✓ {result.added} photo{result.added !== 1 ? "s" : ""} added to map
            </p>
          )}
          {result.skipped > 0 && (
            <p className="text-amber-700">
              ⚠ {result.skipped} skipped (no GPS data)
            </p>
          )}
          {result.errors.map((err, i) => (
            <p key={i} className="text-red-600">✗ {err}</p>
          ))}
        </div>
      )}
    </div>
  );
}
