"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Input, Select, Textarea, ConfirmDialog } from "@/components/ui";
import { isValidDate } from "@/lib/validate";
import SignalLogPanel from "@/components/SignalLogPanel";
import { getAltitudeWarning, metersToFeet } from "@/lib/altitude";

type Season = "spring" | "summer" | "fall" | "winter";

interface SeasonalRatingData {
  season: Season;
  rating: number;
  notes: string;
}

const SEASONS: { key: Season; label: string; emoji: string }[] = [
  { key: "spring", label: "Spring", emoji: "🌸" },
  { key: "summer", label: "Summer", emoji: "☀️" },
  { key: "fall",   label: "Fall",   emoji: "🍂" },
  { key: "winter", label: "Winter", emoji: "❄️" },
];

export interface LocationData {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  altitude?: number | null;
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

  const emptySeasonalRatings = (): Record<Season, SeasonalRatingData> => ({
    spring: { season: "spring", rating: 0, notes: "" },
    summer: { season: "summer", rating: 0, notes: "" },
    fall:   { season: "fall",   rating: 0, notes: "" },
    winter: { season: "winter", rating: 0, notes: "" },
  });

  const [seasonalRatings, setSeasonalRatings] = useState<Record<Season, SeasonalRatingData>>(emptySeasonalRatings);

  useEffect(() => {
    if (!isEdit || !existing?.id) return;
    fetch(`/api/locations/${existing.id}/seasonal-ratings`)
      .then((r) => r.json())
      .then((data: { season: string; rating: number; notes: string | null }[]) => {
        if (!Array.isArray(data)) return;
        const next = emptySeasonalRatings();
        for (const item of data) {
          const s = item.season as Season;
          if (next[s]) {
            next[s] = { season: s, rating: item.rating, notes: item.notes ?? "" };
          }
        }
        setSeasonalRatings(next);
      })
      .catch(() => { /* ignore — ratings section just stays empty */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, existing?.id]);

  const saveSeasonRating = useCallback((season: Season, rating: number, notes: string) => {
    if (!existing?.id) return;
    fetch(`/api/locations/${existing.id}/seasonal-ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ season, rating, notes }),
    }).catch(() => { /* fire-and-forget */ });
  }, [existing?.id]);

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
      visitedAt: isValidDate(visitedAt) ? isValidDate(visitedAt)!.toISOString() : null,
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
          {/* Coordinates + altitude display */}
          <div className="text-xs text-stone-400 dark:text-stone-500 font-mono">
            {lat.toFixed(6)}, {lng.toFixed(6)}
            {existing?.altitude != null && (
              <span className="ml-2">
                · 📍 {Math.round(metersToFeet(existing.altitude)).toLocaleString()} ft
              </span>
            )}
          </div>

          {/* Altitude callout — shown for existing locations above 6,000 ft */}
          {(() => {
            if (existing?.altitude == null) return null;
            const altFt = metersToFeet(existing.altitude);
            const warning = getAltitudeWarning(altFt);
            if (!warning) return null;
            const isHigh = warning.level === 'high';
            return (
              <div className={`rounded-xl px-3 py-2.5 space-y-1.5 ${
                isHigh
                  ? 'bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800'
                  : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
              }`}>
                <p className={`text-sm font-semibold ${
                  isHigh ? 'text-orange-700 dark:text-orange-300' : 'text-amber-700 dark:text-amber-300'
                }`}>
                  ⛰️ {isHigh ? 'High altitude' : 'Elevated campsite'} — {Math.round(altFt).toLocaleString()} ft
                </p>
                <ul className={`text-xs space-y-0.5 list-disc list-inside ${
                  isHigh ? 'text-orange-600 dark:text-orange-400' : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {warning.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            );
          })()}

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

          {/* Signal history — only for existing locations */}
          {isEdit && existing?.id && (
            <SignalLogPanel locationId={existing.id} />
          )}

          {/* Seasonal ratings — only for existing locations */}
          {isEdit && existing?.id && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300">Seasonal Ratings</h3>
              <div className="grid grid-cols-2 gap-3">
                {SEASONS.map(({ key, label, emoji }) => {
                  const sr = seasonalRatings[key];
                  return (
                    <div
                      key={key}
                      className="border border-stone-200 dark:border-stone-700 rounded-xl p-3 space-y-2 bg-stone-50 dark:bg-stone-800/50"
                    >
                      <div className="flex items-center gap-1 text-sm font-medium text-stone-700 dark:text-stone-300">
                        <span>{emoji}</span>
                        <span>{label}</span>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => {
                              const newRating = sr.rating === star ? 0 : star;
                              const next = { ...seasonalRatings, [key]: { ...sr, rating: newRating } };
                              setSeasonalRatings(next);
                              if (newRating > 0) saveSeasonRating(key, newRating, sr.notes);
                            }}
                            className={`text-lg transition-colors ${
                              sr.rating >= star ? "text-amber-400" : "text-stone-300 dark:text-stone-600"
                            }`}
                            aria-label={`Rate ${label} ${star} star${star !== 1 ? "s" : ""}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={sr.notes}
                        onChange={(e) => {
                          const notes = e.target.value;
                          setSeasonalRatings((prev) => ({ ...prev, [key]: { ...prev[key], notes } }));
                        }}
                        onBlur={() => {
                          if (sr.rating > 0) saveSeasonRating(key, sr.rating, sr.notes);
                        }}
                        placeholder="Note..."
                        className="w-full text-xs px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 placeholder-stone-400"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
