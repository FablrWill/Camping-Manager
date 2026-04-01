"use client";

import { useState } from "react";
import { Button, Input, Select, Textarea, ConfirmDialog } from "@/components/ui";

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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/locations/${existing.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      onDelete();
    } catch {
      setError("Failed to delete location");
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white dark:bg-stone-900 border-t-2 border-amber-500 rounded-t-2xl shadow-2xl max-h-[75vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-stone-900 px-4 pt-4 pb-2 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-800 dark:text-stone-50">
            {isEdit ? "Edit Location" : "New Location"}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            aria-label="Close"
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xl leading-none"
          >
            &times;
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-3 space-y-4">
          {/* Coordinates display */}
          <div className="text-xs text-stone-400 dark:text-stone-500 font-mono">
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </div>

          {/* Name */}
          <Input
            label="Name *"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. South Rim Camp"
            autoFocus
          />

          {/* Date/time visited */}
          <Input
            label="Date & time visited"
            type="datetime-local"
            value={visitedAt}
            onChange={(e) => setVisitedAt(e.target.value)}
          />

          {/* Type + Rating row */}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={LOCATION_TYPES}
            />
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Rating</label>
              <div className="flex gap-1 py-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Button
                    key={star}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRating(rating === star ? null : star)}
                    className={`text-xl transition-colors px-1 ${
                      rating && star <= rating ? "text-amber-400" : "text-stone-300"
                    }`}
                  >
                    ★
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Road info */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Road condition"
              type="text"
              value={roadCondition}
              onChange={(e) => setRoadCondition(e.target.value)}
              placeholder="e.g. Gravel, well-maintained"
            />
            <Input
              label="Clearance needed"
              type="text"
              value={clearanceNeeded}
              onChange={(e) => setClearanceNeeded(e.target.value)}
              placeholder="e.g. Standard, AWD"
            />
          </div>

          {/* Signal + Water */}
          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Cell signal"
              value={cellSignal}
              onChange={(e) => setCellSignal(e.target.value)}
              options={SIGNAL_OPTIONS}
            />
            <Select
              label="Starlink"
              value={starlinkSignal}
              onChange={(e) => setStarlinkSignal(e.target.value)}
              options={SIGNAL_OPTIONS}
            />
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Water</label>
              <Button
                type="button"
                variant={waterAccess ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setWaterAccess(!waterAccess)}
                className={`w-full ${
                  waterAccess
                    ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/30 dark:border-blue-700 dark:text-blue-300"
                    : "text-stone-400 dark:text-stone-500"
                }`}
              >
                {waterAccess ? "💧 Yes" : "No"}
              </Button>
            </div>
          </div>

          {/* Description */}
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What makes this spot special?"
            rows={2}
          />

          {/* Notes */}
          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Private notes, tips, reminders..."
            rows={2}
          />

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pb-2">
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              loading={saving}
            >
              {isEdit ? "Update" : "Save Location"}
            </Button>
            {isEdit && onDelete && (
              <Button
                type="button"
                variant="danger"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>

      {/* Delete location confirmation dialog */}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete location?"
        message="This location will be permanently removed. This can't be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={isDeleting}
      />
    </>
  );
}
