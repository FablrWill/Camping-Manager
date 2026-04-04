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
import ShareLocationButton from "@/components/ShareLocationButton";
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
  const [showGpxImport, setShowGpxImport] = useState(false);
  const [gpxImporting, setGpxImporting] = useState(false);
  const [gpxMessage, setGpxMessage] = useState<string | null>(null);
  const [showGmapsImport, setShowGmapsImport] = useState(false);
  const [gmapsText, setGmapsText] = useState('');
  const [gmapsImporting, setGmapsImporting] = useState(false);
  const [gmapsMessage, setGmapsMessage] = useState<string | null>(null);
  const [gmapsError, setGmapsError] = useState<string | null>(null);
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
      // Defer state reset to avoid synchronous setState in effect body
      queueMicrotask(() => setOfflineLocations([]));
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

  async function handleGpxFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setGpxImporting(true);
    setGpxMessage(null);
    try {
      const gpxText = await file.text();
      const res = await fetch('/api/import/gpx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gpx: gpxText, createLocations: true }),
      });
      if (!res.ok) throw new Error('Import failed');
      const data = await res.json() as {
        locationsCreated: number;
        summary: { waypointCount: number; trackCount: number; totalTrackPoints: number };
      };
      const parts: string[] = [];
      if (data.locationsCreated > 0) parts.push(`${data.locationsCreated} location${data.locationsCreated !== 1 ? 's' : ''} added`);
      if (data.summary.trackCount > 0) parts.push(`${data.summary.trackCount} track${data.summary.trackCount !== 1 ? 's' : ''} (${data.summary.totalTrackPoints} points)`);
      if (data.summary.waypointCount > 0 && data.locationsCreated === 0) parts.push(`${data.summary.waypointCount} waypoint${data.summary.waypointCount !== 1 ? 's' : ''} (all already exist)`);
      setGpxMessage(parts.join(', ') || 'No data found in GPX file');
      // Refresh locations if any were created
      if (data.locationsCreated > 0) {
        const locRes = await fetch('/api/locations');
        if (locRes.ok) {
          const locs = await locRes.json();
          setLocations(locs.filter((l: MapLocation) => l.latitude != null && l.longitude != null));
        }
      }
    } catch {
      setGpxMessage('Failed to import GPX file');
    } finally {
      setGpxImporting(false);
      e.target.value = '';
    }
  }

  async function handleGmapsImport() {
    if (!gmapsText.trim()) return;
    setGmapsImporting(true);
    setGmapsMessage(null);
    setGmapsError(null);
    try {
      // Detect if user pasted a URL or text
      const isUrl = gmapsText.trim().startsWith('http');
      const payload = isUrl
        ? { url: gmapsText.trim(), text: gmapsText.trim() }
        : { text: gmapsText.trim() };

      const res = await fetch('/api/import/google-maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as {
        locationsCreated?: number;
        locationsSkipped?: number;
        error?: string;
      };

      if (!res.ok) {
        setGmapsError(data.error || 'Import failed');
        return;
      }

      const parts: string[] = [];
      if (data.locationsCreated && data.locationsCreated > 0) {
        parts.push(`${data.locationsCreated} location${data.locationsCreated !== 1 ? 's' : ''} added`);
      }
      if (data.locationsSkipped && data.locationsSkipped > 0) {
        parts.push(`${data.locationsSkipped} skipped (already exist)`);
      }
      setGmapsMessage(parts.join(', ') || 'No locations found');

      // Refresh map locations if any were created
      if (data.locationsCreated && data.locationsCreated > 0) {
        const locRes = await fetch('/api/locations');
        if (locRes.ok) {
          const locs = await locRes.json();
          setLocations(locs.filter((l: MapLocation) => l.latitude != null && l.longitude != null));
        }
      }

      // Clear the text area on success
      if (data.locationsCreated && data.locationsCreated > 0) {
        setGmapsText('');
      }
    } catch {
      setGmapsError('Failed to import Google Maps data');
    } finally {
      setGmapsImporting(false);
    }
  }

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
    // fetchTimeline is an async useCallback that calls setState in a callback, not synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
          <ShareLocationButton />
          <button
            onClick={() => { setShowGmapsImport(!showGmapsImport); setShowGpxImport(false); setShowUpload(false) }}
            className="px-3 py-1.5 border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 text-sm font-medium rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            G-Maps
          </button>
          <button
            onClick={() => { setShowGpxImport(!showGpxImport); setShowGmapsImport(false); setShowUpload(false) }}
            className="px-3 py-1.5 border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 text-sm font-medium rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            GPX
          </button>
          <button
            onClick={() => { setShowUpload(!showUpload); setShowGpxImport(false); setShowGmapsImport(false) }}
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

      {/* GPX Import panel */}
      {showGpxImport && (
        <div className="mx-2 mt-2 p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg">
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
            Import GPX File
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">
            Import trail routes from AllTrails, Wikiloc, or any GPS app. Waypoints become saved locations.
          </p>
          <label className="block">
            <input
              type="file"
              accept=".gpx,application/gpx+xml"
              onChange={handleGpxFile}
              disabled={gpxImporting}
              className="block w-full text-sm text-stone-500 dark:text-stone-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-50 dark:file:bg-amber-900/30 file:text-amber-700 dark:file:text-amber-400 hover:file:bg-amber-100 dark:hover:file:bg-amber-900/50 file:cursor-pointer disabled:opacity-50"
            />
          </label>
          {gpxImporting && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 animate-pulse">Importing...</p>
          )}
          {gpxMessage && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">{gpxMessage}</p>
          )}
        </div>
      )}

      {/* Google Maps Import panel */}
      {showGmapsImport && (
        <div className="mx-2 mt-2 p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg">
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
            Import from Google Maps
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">
            Paste a Google Maps list URL, place URLs, or text with coordinates. Each pin becomes a saved location.
          </p>
          <textarea
            value={gmapsText}
            onChange={(e) => setGmapsText(e.target.value)}
            placeholder={"Paste Google Maps URLs or location data here...\n\nExamples:\nhttps://www.google.com/maps/place/.../@35.5951,-82.5515,...\n\nOr plain coordinates:\nMy Campsite\n35.5951, -82.5515"}
            rows={5}
            className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-500 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            onClick={handleGmapsImport}
            disabled={gmapsImporting || !gmapsText.trim()}
            className="mt-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {gmapsImporting ? 'Importing...' : 'Import Locations'}
          </button>
          {gmapsImporting && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 animate-pulse">Parsing locations...</p>
          )}
          {gmapsMessage && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">{gmapsMessage}</p>
          )}
          {gmapsError && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">{gmapsError}</p>
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
      <div className="flex items-center justify-between px-3 py-2 text-xs text-stone-500 dark:text-stone-400 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-700">
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
