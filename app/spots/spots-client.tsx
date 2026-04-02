"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import PhotoUpload from "@/components/PhotoUpload";
import LocationForm from "@/components/LocationForm";
import ChatContextButton from "@/components/ChatContextButton";
import type { LocationData } from "@/components/LocationForm";
import type {
  MapLocation,
  MapPhoto,
  TimelinePoint,
  PlaceVisit,
  ActivitySegment,
  Layers,
  SpotMapHandle,
} from "@/components/SpotMap";
import { useOnlineStatus } from "@/lib/use-online-status";
import { getTripSnapshot, getCachedTripIds } from "@/lib/offline-storage";

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
  const isOnline = useOnlineStatus();
  const [locations, setLocations] = useState(initialLocations);
  const [offlineLocations, setOfflineLocations] = useState<MapLocation[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [photos, setPhotos] = useState(initialPhotos);
  const [darkMode, setDarkMode] = useState(false);

  // Location form state
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [editingLocation, setEditingLocation] = useState<LocationData | null>(null);
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

  // Load cached spot data from all trip snapshots when offline
  useEffect(() => {
    if (isOnline) {
      setOfflineLocations([]);
      return;
    }
    let cancelled = false;
    async function loadCachedSpots() {
      const tripIds = await getCachedTripIds();
      if (cancelled || tripIds.length === 0) return;
      // Merge spots from ALL cached trip snapshots (not just first)
      const allSpots: MapLocation[] = [];
      const seenIds = new Set<string>();
      for (const tid of tripIds) {
        const snap = await getTripSnapshot(tid);
        if (cancelled) return;
        if (snap?.spots) {
          for (const spot of snap.spots as MapLocation[]) {
            // Deduplicate by location id
            const spotId = (spot as { id?: string }).id ?? JSON.stringify({ lat: spot.latitude, lon: spot.longitude });
            if (!seenIds.has(spotId)) {
              seenIds.add(spotId);
              allSpots.push(spot);
            }
          }
        }
      }
      if (!cancelled) setOfflineLocations(allSpots);
    }
    loadCachedSpots();
    return () => { cancelled = true; };
  }, [isOnline]);

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

  const refreshLocations = useCallback(async () => {
    const res = await fetch("/api/locations");
    if (res.ok) {
      const data = await res.json();
      // Filter to only locations with coordinates for the map
      setLocations(
        data.filter((l: MapLocation) => l.latitude != null && l.longitude != null)
      );
    }
  }, []);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setPendingCoords({ lat, lng });
    setEditingLocation(null);
    setShowLocationForm(true);
  }, []);

  const handleLocationEdit = useCallback(
    (locationId: string) => {
      const loc = locations.find((l) => l.id === locationId);
      if (!loc) return;
      setPendingCoords({ lat: loc.latitude, lng: loc.longitude });
      setEditingLocation({
        id: loc.id,
        name: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude,
        type: loc.type ?? "",
        description: loc.description ?? "",
        rating: loc.rating ?? null,
        roadCondition: loc.roadCondition ?? "",
        clearanceNeeded: loc.clearanceNeeded ?? "",
        cellSignal: loc.cellSignal ?? "",
        starlinkSignal: loc.starlinkSignal ?? "",
        waterAccess: loc.waterAccess ?? false,
        visitedAt: loc.visitedAt ?? "",
        notes: loc.notes ?? "",
      });
      setShowLocationForm(true);
    },
    [locations]
  );

  const handleLocationSaved = useCallback(async () => {
    await refreshLocations();
    setShowLocationForm(false);
    setPendingCoords(null);
    setEditingLocation(null);
  }, [refreshLocations]);

  const handleLocationDeleted = useCallback(async () => {
    await refreshLocations();
    setShowLocationForm(false);
    setPendingCoords(null);
    setEditingLocation(null);
  }, [refreshLocations]);

  const handleLocationCancel = useCallback(() => {
    setShowLocationForm(false);
    setPendingCoords(null);
    setEditingLocation(null);
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
      <div className="flex flex-wrap items-center justify-between px-2 py-2 gap-2 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700">
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
                  ? "bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900"
                  : "bg-stone-200 text-stone-500 dark:bg-stone-700 dark:text-stone-400"
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
                : "bg-stone-200 text-stone-500 dark:bg-stone-700 dark:text-stone-400"
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
            className="px-2 py-1 text-xs border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 dark:text-stone-100"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate("")}
              className="px-2 py-1 text-xs bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400 rounded-full hover:bg-stone-300 dark:hover:bg-stone-600"
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
        <div className="mx-2 mt-2 px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-700 dark:text-stone-300 flex flex-wrap gap-x-4 gap-y-1">
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
      <div className="flex-1 min-h-0 rounded-lg overflow-hidden mx-1 my-1 relative">
        {!isOnline && offlineLocations.length > 0 && (
          <div className="absolute top-2 left-2 z-[1000] bg-stone-800/90 text-stone-300 text-xs px-2 py-1 rounded-lg pointer-events-none">
            (Showing cached spots)
          </div>
        )}
        <SpotMap
          ref={mapRef}
          locations={isOnline ? locations : (offlineLocations.length > 0 ? offlineLocations : locations)}
          photos={filteredPhotos}
          timelinePoints={timelinePoints}
          placeVisits={placeVisits}
          activitySegments={activitySegments}
          layers={layers}
          darkMode={darkMode}
          onMapClick={handleMapClick}
          onLocationEdit={handleLocationEdit}
          onAnimationTime={setAnimTime}
          onPhotoDeleted={(photoId) => setPhotos(prev => prev.filter(p => p.id !== photoId))}
        />
        {showLocationForm && pendingCoords && (
          <LocationForm
            lat={pendingCoords.lat}
            lng={pendingCoords.lng}
            existing={editingLocation}
            onSave={handleLocationSaved}
            onCancel={handleLocationCancel}
            onDelete={editingLocation ? handleLocationDeleted : undefined}
          />
        )}
      </div>

      {/* Animation controls */}
      {hasTimeline && timelinePoints.length > 1 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-700">
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
          <div className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
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
            <span className="ml-1 text-stone-400 dark:text-stone-500">{animSpeed}x</span>
          </div>
          {animTime && (
            <span className="text-xs text-stone-600 dark:text-stone-400 font-mono">
              {new Date(animTime).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      )}

      {/* Stats footer */}
      <div className="flex items-center justify-between px-3 py-2 text-xs text-stone-500 dark:text-stone-400 border-t border-stone-200 dark:border-stone-700">
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

      {/* Context-aware FAB — show when editing an existing spot */}
      {editingLocation?.id && (
        <ChatContextButton contextType="spot" contextId={editingLocation.id} />
      )}
    </div>
  );
}
