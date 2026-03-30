"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import PhotoUpload from "@/components/PhotoUpload";
import type {
  MapLocation,
  MapPhoto,
  TimelinePoint,
  PlaceVisit,
  ActivitySegment,
  Layers,
  SpotMapHandle,
} from "@/components/SpotMap";

const SpotMap = dynamic(() => import("@/components/SpotMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-stone-100 rounded-lg">
      <p className="text-stone-500">Loading map...</p>
    </div>
  ),
});

interface SpotsClientProps {
  locations: MapLocation[];
  photos: MapPhoto[];
}

export default function SpotsClient({
  locations: initialLocations,
  photos: initialPhotos,
}: SpotsClientProps) {
  const mapRef = useRef<SpotMapHandle>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [photos, setPhotos] = useState(initialPhotos);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [animating, setAnimating] = useState(false);
  const [animSpeed, setAnimSpeed] = useState(1);
  const [animTime, setAnimTime] = useState<string | null>(null);

  // Timeline data
  const [timelinePoints, setTimelinePoints] = useState<TimelinePoint[]>([]);
  const [placeVisits, setPlaceVisits] = useState<PlaceVisit[]>([]);
  const [activitySegments, setActivitySegments] = useState<ActivitySegment[]>([]);
  const [hasTimeline, setHasTimeline] = useState(false);

  // Layer toggles
  const [layers, setLayers] = useState<Layers>({
    photos: true,
    spots: true,
    path: true,
    places: true,
    heatmap: false,
  });

  const toggleLayer = (key: keyof Layers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Fetch timeline data
  const fetchTimeline = useCallback(async (date?: string) => {
    try {
      const url = date ? `/api/timeline?date=${date}` : "/api/timeline";
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setTimelinePoints(data.points || []);
      setPlaceVisits(data.placeVisits || []);
      setActivitySegments(data.activitySegments || []);
      setHasTimeline(
        (data.points?.length || 0) > 0 ||
        (data.placeVisits?.length || 0) > 0 ||
        (data.activitySegments?.length || 0) > 0
      );
    } catch {
      // Timeline data not available — degrade gracefully
    }
  }, []);

  useEffect(() => {
    fetchTimeline(selectedDate || undefined);
  }, [selectedDate, fetchTimeline]);

  const refreshPhotos = useCallback(async () => {
    const res = await fetch("/api/photos");
    if (res.ok) {
      const data = await res.json();
      setPhotos(data);
    }
    setShowUpload(false);
  }, []);

  // Filter photos by date
  const filteredPhotos = selectedDate
    ? photos.filter((p) => {
        if (!p.takenAt) return false;
        return p.takenAt.startsWith(selectedDate);
      })
    : photos;

  const geoPhotos = filteredPhotos.filter((p) => p.latitude != null && p.longitude != null);
  const unplacedPhotos = filteredPhotos.filter((p) => p.latitude == null || p.longitude == null);

  // Stats
  const totalPathPts = timelinePoints.length;
  const totalDistanceKm = activitySegments.reduce(
    (sum, seg) => sum + (seg.distanceMeters || 0),
    0
  ) / 1000;

  // Animation
  const handleAnimate = () => {
    if (animating) {
      mapRef.current?.stopAnimation();
      setAnimating(false);
    } else {
      mapRef.current?.animatePath(animSpeed);
      setAnimating(true);
    }
  };

  // Day summary
  const daySummary = selectedDate && hasTimeline ? {
    hikingKm: activitySegments
      .filter((s) => ["HIKING", "ON_FOOT", "WALKING"].includes(s.activityType))
      .reduce((sum, s) => sum + (s.distanceMeters || 0), 0) / 1000,
    drivingKm: activitySegments
      .filter((s) => ["IN_VEHICLE", "IN_BUS"].includes(s.activityType))
      .reduce((sum, s) => sum + (s.distanceMeters || 0), 0) / 1000,
    places: placeVisits.length,
    photos: filteredPhotos.length,
    activeMinutes: activitySegments.reduce((sum, s) => sum + s.durationMinutes, 0),
  } : null;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between px-2 py-2 gap-2 bg-white border-b border-stone-200">
        {/* Left: layer toggles */}
        <div className="flex gap-1 flex-wrap">
          {([
            ["photos", "📷 Photos"],
            ["spots", "📍 Spots"],
            ["path", "🗺️ Path"],
            ["places", "🏠 Visits"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => toggleLayer(key)}
              className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                layers[key]
                  ? "bg-stone-800 text-white"
                  : "bg-stone-200 text-stone-500"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
              darkMode
                ? "bg-indigo-600 text-white"
                : "bg-stone-200 text-stone-500"
            }`}
          >
            🌙
          </button>
        </div>

        {/* Right: date picker + upload */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2 py-1 text-xs border border-stone-300 rounded-lg bg-white"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate("")}
              className="px-2 py-1 text-xs bg-stone-200 text-stone-600 rounded-full hover:bg-stone-300"
            >
              All time
            </button>
          )}
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
          >
            + Add Photos
          </button>
        </div>
      </div>

      {/* Day summary card */}
      {daySummary && (
        <div className="mx-2 mt-2 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-700 flex flex-wrap gap-x-4 gap-y-1">
          <span>📅 {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}</span>
          {daySummary.hikingKm > 0 && <span>🥾 {daySummary.hikingKm.toFixed(1)}km</span>}
          {daySummary.drivingKm > 0 && <span>🚗 {daySummary.drivingKm.toFixed(1)}km</span>}
          <span>📍 {daySummary.places} places</span>
          <span>📷 {daySummary.photos} photos</span>
          {daySummary.activeMinutes > 0 && (
            <span>⏰ {Math.floor(daySummary.activeMinutes / 60)}h {daySummary.activeMinutes % 60}min</span>
          )}
        </div>
      )}

      {/* Upload panel */}
      {showUpload && (
        <div className="px-2 py-2">
          <PhotoUpload onUploadComplete={refreshPhotos} />
        </div>
      )}

      {/* Map */}
      <div className="flex-1 min-h-0 rounded-lg overflow-hidden mx-1 my-1">
        <SpotMap
          ref={mapRef}
          locations={initialLocations}
          photos={filteredPhotos}
          timelinePoints={timelinePoints}
          placeVisits={placeVisits}
          activitySegments={activitySegments}
          layers={layers}
          darkMode={darkMode}
          onAnimationTime={setAnimTime}
        />
      </div>

      {/* Animation controls */}
      {hasTimeline && timelinePoints.length > 1 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-stone-50 border-t border-stone-200">
          <button
            onClick={handleAnimate}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              animating
                ? "bg-red-500 text-white"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            {animating ? "⏸ Stop" : "▶ Animate Path"}
          </button>
          <div className="flex items-center gap-1 text-xs text-stone-500">
            <span>🐢</span>
            <input
              type="range"
              min={1}
              max={16}
              step={1}
              value={animSpeed}
              onChange={(e) => setAnimSpeed(Number(e.target.value))}
              className="w-20 h-1 accent-blue-500"
            />
            <span>🐇</span>
            <span className="ml-1 text-stone-400">{animSpeed}x</span>
          </div>
          {animTime && (
            <span className="text-xs text-stone-600 font-mono">
              {new Date(animTime).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      )}

      {/* Stats footer */}
      <div className="flex items-center justify-between px-3 py-2 text-xs text-stone-500 border-t border-stone-200">
        <div className="flex gap-3">
          <span>📷 {geoPhotos.length} photos</span>
          {totalPathPts > 0 && <span>🗺️ {totalPathPts.toLocaleString()} pts</span>}
          {placeVisits.length > 0 && <span>📍 {placeVisits.length} places</span>}
          {totalDistanceKm > 0 && <span>📏 {totalDistanceKm.toFixed(1)}km</span>}
        </div>
        {unplacedPhotos.length > 0 && (
          <span className="text-amber-600">
            📷 {unplacedPhotos.length} unplaced
          </span>
        )}
      </div>
    </div>
  );
}
