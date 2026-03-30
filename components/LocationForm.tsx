"use client";

import { useState } from "react";

export interface LocationData {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  description: string;
  rating: number | null;
  roadCondition: string;
  clearanceNeeded: string;
  cellSignal: string;
  starlinkSignal: string;
  waterAccess: boolean;
  visitedAt: string;
  notes: string;
}

interface LocationFormProps {
  lat: number;
  lng: number;
  existing?: LocationData | null;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const LOCATION_TYPES = [
  { value: "", label: "Select type..." },
  { value: "dispersed", label: "Dispersed camping" },
  { value: "campground", label: "Campground" },
  { value: "overlook", label: "Overlook / Viewpoint" },
  { value: "water_access", label: "Water access" },
  { value: "trailhead", label: "Trailhead" },
  { value: "parking", label: "Parking / Staging" },
];

const SIGNAL_OPTIONS = [
  { value: "", label: "—" },
  { value: "none", label: "None" },
  { value: "weak", label: "Weak" },
  { value: "moderate", label: "Moderate" },
  { value: "strong", label: "Strong" },
];

function formatDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  // Format as YYYY-MM-DDTHH:MM for datetime-local input
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nowLocal(): string {
  return formatDatetimeLocal(new Date().toISOString());
}

export default function LocationForm({
  lat,
  lng,
  existing,
  onSave,
  onCancel,
  onDelete,
}: LocationFormProps) {
  const isEdit = !!existing?.id;

  const [name, setName] = useState(existing?.name ?? "");
  const [type, setType] = useState(existing?.type ?? "");
  const [rating, setRating] = useState<number | null>(existing?.rating ?? null);
  const [visitedAt, setVisitedAt] = useState(
    existing?.visitedAt ? formatDatetimeLocal(existing.visitedAt) : nowLocal()
  );
  const [roadCondition, setRoadCondition] = useState(existing?.roadCondition ?? "");
  const [clearanceNeeded, setClearanceNeeded] = useState(existing?.clearanceNeeded ?? "");
  const [cellSignal, setCellSignal] = useState(existing?.cellSignal ?? "");
  const [starlinkSignal, setStarlinkSignal] = useState(existing?.starlinkSignal ?? "");
  const [waterAccess, setWaterAccess] = useState(existing?.waterAccess ?? false);
  const [description, setDescription] = useState(existing?.description ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: name.trim(),
      latitude: lat,
      longitude: lng,
      type: type || null,
      description: description.trim() || null,
      rating,
      roadCondition: roadCondition.trim() || null,
      clearanceNeeded: clearanceNeeded.trim() || null,
      cellSignal: cellSignal || null,
      starlinkSignal: starlinkSignal || null,
      waterAccess,
      visitedAt: visitedAt ? new Date(visitedAt).toISOString() : null,
      notes: notes.trim() || null,
    };

    try {
      const url = isEdit ? `/api/locations/${existing!.id}` : "/api/locations";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save location");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existing?.id || !onDelete) return;
    if (!confirm("Delete this location?")) return;

    try {
      const res = await fetch(`/api/locations/${existing.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      onDelete();
    } catch {
      setError("Failed to delete location");
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white border-t-2 border-amber-500 rounded-t-2xl shadow-2xl max-h-[75vh] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white px-4 pt-4 pb-2 border-b border-stone-200 flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">
          {isEdit ? "Edit Location" : "New Location"}
        </h2>
        <button
          onClick={onCancel}
          className="p-1.5 text-stone-400 hover:text-stone-600 text-xl leading-none"
        >
          &times;
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-3 space-y-4">
        {/* Coordinates display */}
        <div className="text-xs text-stone-400 font-mono">
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. South Rim Camp"
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            autoFocus
          />
        </div>

        {/* Date/time visited */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Date &amp; time visited
          </label>
          <input
            type="datetime-local"
            value={visitedAt}
            onChange={(e) => setVisitedAt(e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
          />
        </div>

        {/* Type + Rating row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white"
            >
              {LOCATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Rating</label>
            <div className="flex gap-1 py-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(rating === star ? null : star)}
                  className={`text-xl transition-colors ${
                    rating && star <= rating ? "text-amber-400" : "text-stone-300"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Road info */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Road condition</label>
            <input
              type="text"
              value={roadCondition}
              onChange={(e) => setRoadCondition(e.target.value)}
              placeholder="e.g. Gravel, well-maintained"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Clearance needed</label>
            <input
              type="text"
              value={clearanceNeeded}
              onChange={(e) => setClearanceNeeded(e.target.value)}
              placeholder="e.g. Standard, AWD"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            />
          </div>
        </div>

        {/* Signal + Water */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Cell signal</label>
            <select
              value={cellSignal}
              onChange={(e) => setCellSignal(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white"
            >
              {SIGNAL_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Starlink</label>
            <select
              value={starlinkSignal}
              onChange={(e) => setStarlinkSignal(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white"
            >
              {SIGNAL_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Water</label>
            <button
              type="button"
              onClick={() => setWaterAccess(!waterAccess)}
              className={`w-full px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                waterAccess
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-stone-300 text-stone-400"
              }`}
            >
              {waterAccess ? "💧 Yes" : "No"}
            </button>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What makes this spot special?"
            rows={2}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Private notes, tips, reminders..."
            rows={2}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pb-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : isEdit ? "Update" : "Save Location"}
          </button>
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2.5 text-red-600 bg-red-50 font-medium rounded-lg hover:bg-red-100 transition-colors"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-stone-600 bg-stone-100 font-medium rounded-lg hover:bg-stone-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
