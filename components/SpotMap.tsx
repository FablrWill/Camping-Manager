"use client";

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { ConfirmDialog } from "@/components/ui";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";

// Fix Leaflet default marker icon path issue with bundlers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// --- Marker Icons ---

function makeIcon(bg: string, emoji: string, badge?: string) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 32px; height: 32px; border-radius: 50%;
      background: ${bg}; border: 3px solid white;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-size: 14px;
      position: relative;
    ">${emoji}${badge ? `<span style="position:absolute;top:-4px;right:-4px;background:#f59e0b;color:white;border-radius:50%;width:14px;height:14px;font-size:9px;display:flex;align-items:center;justify-content:center;font-weight:bold;">~</span>` : ""}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

const PHOTO_ICONS = {
  exif: makeIcon("#3b82f6", "📷"),          // blue — EXIF GPS
  vision: makeIcon("#22c55e", "📷"),         // green — vision exact
  visionApprox: makeIcon("#f97316", "📷", "~"), // orange — vision approximate
};

const locationIcon = makeIcon("#059669", "📍");

// --- Activity Colors ---

const ACTIVITY_COLORS: Record<string, { color: string; icon: string }> = {
  HIKING: { color: "#34A853", icon: "🥾" },
  ON_FOOT: { color: "#34A853", icon: "🥾" },
  WALKING: { color: "#34A853", icon: "🥾" },
  RUNNING: { color: "#FBBC04", icon: "🏃" },
  CYCLING: { color: "#4285F4", icon: "🚴" },
  IN_VEHICLE: { color: "#EA4335", icon: "🚗" },
  IN_BUS: { color: "#EA4335", icon: "🚗" },
  KAYAKING_ROWING: { color: "#00ACC1", icon: "🚣" },
  SAILING: { color: "#00ACC1", icon: "🚣" },
  IN_FERRY: { color: "#00ACC1", icon: "🚣" },
  FLYING: { color: "#9C27B0", icon: "✈️" },
  UNKNOWN_ACTIVITY_TYPE: { color: "#9E9E9E", icon: "⬤" },
};

function getActivityStyle(type: string | null) {
  return ACTIVITY_COLORS[type || "UNKNOWN_ACTIVITY_TYPE"] || ACTIVITY_COLORS.UNKNOWN_ACTIVITY_TYPE;
}

// --- Tile Layers ---

const TILES = {
  light: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
};

// --- Types ---

export interface MapLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type?: string | null;
  rating?: number | null;
  description?: string | null;
  roadCondition?: string | null;
  clearanceNeeded?: string | null;
  cellSignal?: string | null;
  starlinkSignal?: string | null;
  waterAccess?: boolean;
  visitedAt?: string | null;
  notes?: string | null;
}

export interface MapPhoto {
  id: string;
  title: string;
  latitude: number | null;
  longitude: number | null;
  altitude?: number | null;
  takenAt?: string | null;
  imagePath: string;
  locationSource?: string | null;
  locationDescription?: string | null;
  locationConfidence?: string | null;
  visionApproximate?: boolean;
  googleUrl?: string | null;
}

export interface TimelinePoint {
  lat: number;
  lon: number;
  altitude?: number | null;
  timestamp: string;
  activityType?: string | null;
}

export interface PlaceVisit {
  id: string;
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  startTimestamp: string;
  endTimestamp: string;
  durationMinutes: number;
  confidence: string;
}

export interface ActivitySegment {
  id: string;
  activityType: string;
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  startTimestamp: string;
  endTimestamp: string;
  durationMinutes: number;
  distanceMeters?: number | null;
  waypoints: { lat: number; lon: number }[];
}

export interface Layers {
  photos: boolean;
  spots: boolean;
  path: boolean;
  places: boolean;
  heatmap: boolean;
}

export interface SpotMapHandle {
  animatePath: (speed: number) => void;
  stopAnimation: () => void;
}

interface SpotMapProps {
  locations: MapLocation[];
  photos: MapPhoto[];
  timelinePoints: TimelinePoint[];
  placeVisits: PlaceVisit[];
  activitySegments: ActivitySegment[];
  layers: Layers;
  darkMode: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onLocationEdit?: (locationId: string) => void;
  onAnimationTime?: (time: string | null) => void;
}

const SpotMap = forwardRef<SpotMapHandle, SpotMapProps>(function SpotMap(
  {
    locations,
    photos,
    timelinePoints,
    placeVisits,
    activitySegments,
    layers,
    darkMode,
    onMapClick,
    onLocationEdit,
    onAnimationTime,
  },
  ref
) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const pathLayersRef = useRef<L.LayerGroup>(L.layerGroup());
  const placeLayersRef = useRef<L.LayerGroup>(L.layerGroup());
  const locationLayersRef = useRef<L.LayerGroup>(L.layerGroup());
  const animRef = useRef<{ running: boolean; frameId: number | null }>({ running: false, frameId: null });
  const animDotRef = useRef<L.CircleMarker | null>(null);
  const animLineRef = useRef<L.Polyline | null>(null);
  const [ready, setReady] = useState(false);
  const [confirmDeletePhoto, setConfirmDeletePhoto] = useState<{ id: string; title: string } | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([35.87, -81.9], 10);

    const tile = darkMode ? TILES.dark : TILES.light;
    tileLayerRef.current = L.tileLayer(tile.url, {
      attribution: tile.attribution,
      maxZoom: 19,
    }).addTo(map);

    if (onMapClick) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    pathLayersRef.current.addTo(map);
    placeLayersRef.current.addTo(map);
    locationLayersRef.current.addTo(map);

    mapRef.current = map;
    setReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle dark mode tiles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const tile = darkMode ? TILES.dark : TILES.light;
    tileLayerRef.current = L.tileLayer(tile.url, {
      attribution: tile.attribution,
      maxZoom: 19,
    }).addTo(map);
  }, [darkMode, ready]);

  // Update photo markers (clustered)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Remove old cluster group
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }

    if (!layers.photos) return;

    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
    });

    const geoPhotos = photos.filter((p) => p.latitude != null && p.longitude != null);

    geoPhotos.forEach((photo) => {
      const icon =
        photo.locationSource === "vision"
          ? photo.visionApproximate
            ? PHOTO_ICONS.visionApprox
            : PHOTO_ICONS.vision
          : PHOTO_ICONS.exif;

      const marker = L.marker([photo.latitude!, photo.longitude!], { icon });

      const date = photo.takenAt
        ? new Date(photo.takenAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : null;

      const visionBadge =
        photo.locationSource === "vision"
          ? `<p style="margin:4px 0;font-size:11px;color:#666;">
              🤖 ${photo.locationDescription || "AI-inferred location"}
              ${photo.visionApproximate ? '<br><span style="color:#f59e0b;">⚠ Approximate — AI inferred from map screenshot</span>' : ""}
            </p>`
          : "";

      const googleLink = photo.googleUrl
        ? `<a href="${photo.googleUrl}" target="_blank" style="color:#3b82f6;font-size:12px;">View in Google Photos</a>`
        : "";

      const deleteBtn = `<button data-photo-delete="${photo.id}" style="margin-top:8px;padding:6px 12px;background:#dc2626;color:white;border:none;border-radius:6px;font-size:12px;cursor:pointer;width:100%;">Delete Photo</button>`;

      marker.bindPopup(`
        <div style="min-width:200px;font-family:system-ui;">
          <img src="${photo.imagePath}" alt="${photo.title}"
            style="width:100%;max-width:280px;border-radius:6px;margin-bottom:6px;"
            loading="lazy" onerror="this.style.display='none'"
          />
          <h3 style="margin:0 0 2px;font-size:14px;font-weight:600;">${photo.title}</h3>
          ${date ? `<p style="margin:2px 0;color:#666;font-size:12px;">📅 ${date}</p>` : ""}
          ${photo.altitude ? `<p style="margin:2px 0;color:#666;font-size:12px;">🏔️ ${Math.round(photo.altitude)}m</p>` : ""}
          ${visionBadge}
          ${googleLink}
          ${deleteBtn}
        </div>
      `);

      cluster.addLayer(marker);
    });

    map.addLayer(cluster);
    clusterGroupRef.current = cluster;
  }, [photos, layers.photos, ready]);

  // DOM event delegation for photo delete button in Leaflet popup (raw HTML, not React)
  useEffect(() => {
    const container = mapRef.current?.getContainer();
    if (!container) return;

    function handlePopupClick(e: Event) {
      const target = e.target as HTMLElement;
      const btn = target.closest('[data-photo-delete]') as HTMLElement | null;
      if (btn) {
        const photoId = btn.dataset.photoDelete;
        if (photoId) {
          setConfirmDeletePhoto({ id: photoId, title: 'this photo' });
        }
      }
    }

    container.addEventListener('click', handlePopupClick);
    return () => container.removeEventListener('click', handlePopupClick);
  }, [ready]);

  // Update location (spot) markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    locationLayersRef.current.clearLayers();
    if (!layers.spots) return;

    locations.forEach((loc) => {
      const marker = L.marker([loc.latitude, loc.longitude], { icon: locationIcon });

      const stars = loc.rating ? "⭐".repeat(loc.rating) : "";
      const typeLabel = loc.type
        ? loc.type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : "";

      const popup = L.popup().setContent(`
        <div style="min-width:180px;font-family:system-ui;">
          <h3 style="margin:0 0 4px;font-size:15px;font-weight:600;">${loc.name}</h3>
          ${typeLabel ? `<p style="margin:2px 0;color:#666;font-size:12px;">${typeLabel}</p>` : ""}
          ${stars ? `<p style="margin:2px 0;">${stars}</p>` : ""}
          ${loc.description ? `<p style="margin:4px 0;font-size:13px;color:#444;">${loc.description.slice(0, 120)}${loc.description.length > 120 ? "..." : ""}</p>` : ""}
          ${onLocationEdit ? `<button data-edit-location="${loc.id}" style="margin-top:6px;padding:4px 12px;background:#d97706;color:white;border:none;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;">Edit</button>` : ""}
        </div>
      `);

      marker.bindPopup(popup);

      if (onLocationEdit) {
        marker.on("popupopen", () => {
          const btn = document.querySelector(`[data-edit-location="${loc.id}"]`);
          if (btn) {
            btn.addEventListener("click", () => {
              map.closePopup();
              onLocationEdit(loc.id);
            });
          }
        });
      }

      locationLayersRef.current.addLayer(marker);
    });
  }, [locations, layers.spots, ready, onLocationEdit]);

  // Update activity segment paths
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    pathLayersRef.current.clearLayers();
    if (!layers.path) return;

    // Draw activity segments as color-coded polylines
    if (activitySegments.length > 0) {
      activitySegments.forEach((seg) => {
        const style = getActivityStyle(seg.activityType);
        const coords: L.LatLngExpression[] = seg.waypoints.map((wp) => [wp.lat, wp.lon]);

        if (coords.length < 2) {
          coords.unshift([seg.startLat, seg.startLon]);
          coords.push([seg.endLat, seg.endLon]);
        }

        const line = L.polyline(coords, {
          color: style.color,
          weight: 4,
          opacity: 0.8,
        });

        const startTime = new Date(seg.startTimestamp).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        const endTime = new Date(seg.endTimestamp).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        const distKm = seg.distanceMeters ? (seg.distanceMeters / 1000).toFixed(1) : null;
        const hrs = Math.floor(seg.durationMinutes / 60);
        const mins = seg.durationMinutes % 60;
        const duration = hrs > 0 ? `${hrs}h ${mins}min` : `${mins}min`;

        line.bindPopup(`
          <div style="font-family:system-ui;min-width:160px;">
            <p style="margin:0 0 4px;font-weight:600;">${style.icon} ${seg.activityType.replace(/_/g, " ")}</p>
            <p style="margin:2px 0;font-size:12px;color:#666;">⏱ ${duration}${distKm ? ` · 📏 ${distKm} km` : ""}</p>
            <p style="margin:2px 0;font-size:12px;color:#666;">🕐 ${startTime} → ${endTime}</p>
          </div>
        `);

        pathLayersRef.current.addLayer(line);
      });
    }

    // Fall back to raw timeline points if no segments
    if (activitySegments.length === 0 && timelinePoints.length > 0) {
      const coords: L.LatLngExpression[] = timelinePoints.map((pt) => [pt.lat, pt.lon]);
      const line = L.polyline(coords, {
        color: "#4285F4",
        weight: 3,
        opacity: 0.7,
      });
      pathLayersRef.current.addLayer(line);
    }
  }, [activitySegments, timelinePoints, layers.path, ready]);

  // Update place visit markers (pulsing circles)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    placeLayersRef.current.clearLayers();
    if (!layers.places) return;

    placeVisits.forEach((pv) => {
      const circle = L.circleMarker([pv.latitude, pv.longitude], {
        radius: 10,
        color: "#EA4335",
        fillColor: "#EA4335",
        fillOpacity: 0.6,
        weight: 2,
        className: "pulse-marker",
      });

      const startTime = new Date(pv.startTimestamp).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      const endTime = new Date(pv.endTimestamp).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      const hrs = Math.floor(pv.durationMinutes / 60);
      const mins = pv.durationMinutes % 60;
      const duration = hrs > 0 ? `${hrs}h ${mins}min` : `${mins}min`;

      circle.bindPopup(`
        <div style="font-family:system-ui;min-width:180px;">
          <h3 style="margin:0 0 4px;font-size:15px;font-weight:600;">📍 ${pv.name}</h3>
          ${pv.address ? `<p style="margin:2px 0;color:#666;font-size:12px;">📮 ${pv.address}</p>` : ""}
          <p style="margin:2px 0;color:#666;font-size:12px;">⏱ ${duration}</p>
          <p style="margin:2px 0;color:#666;font-size:12px;">🕐 ${startTime} – ${endTime}</p>
        </div>
      `);

      placeLayersRef.current.addLayer(circle);
    });
  }, [placeVisits, layers.places, ready]);

  // Fit bounds when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const bounds: L.LatLngExpression[] = [];

    if (layers.spots) {
      locations.forEach((loc) => bounds.push([loc.latitude, loc.longitude]));
    }
    if (layers.photos) {
      photos
        .filter((p) => p.latitude != null && p.longitude != null)
        .forEach((p) => bounds.push([p.latitude!, p.longitude!]));
    }
    if (layers.path && timelinePoints.length > 0) {
      // Sample every Nth point for bounds calculation
      const step = Math.max(1, Math.floor(timelinePoints.length / 100));
      for (let i = 0; i < timelinePoints.length; i += step) {
        bounds.push([timelinePoints[i].lat, timelinePoints[i].lon]);
      }
    }
    if (layers.places) {
      placeVisits.forEach((pv) => bounds.push([pv.latitude, pv.longitude]));
    }

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 14 });
    }
  }, [locations, photos, timelinePoints, placeVisits, layers, ready]);

  // Path animation
  const animatePath = useCallback(
    (speed: number) => {
      const map = mapRef.current;
      if (!map || timelinePoints.length < 2) return;

      // Stop any existing animation
      if (animRef.current.frameId) {
        cancelAnimationFrame(animRef.current.frameId);
      }
      if (animDotRef.current) {
        map.removeLayer(animDotRef.current);
      }
      if (animLineRef.current) {
        map.removeLayer(animLineRef.current);
      }

      const line = L.polyline([], { color: "#4285F4", weight: 4 }).addTo(map);
      const dot = L.circleMarker([timelinePoints[0].lat, timelinePoints[0].lon], {
        radius: 8,
        color: "#EA4335",
        fillColor: "#EA4335",
        fillOpacity: 1,
        weight: 2,
      }).addTo(map);

      animLineRef.current = line;
      animDotRef.current = dot;
      animRef.current.running = true;

      const totalFrames = Math.max(100, 300 / speed);
      const step = Math.max(1, Math.floor(timelinePoints.length / totalFrames));
      let i = 0;

      function tick() {
        if (!animRef.current.running || i >= timelinePoints.length) {
          animRef.current.running = false;
          if (animDotRef.current && map) {
            map.removeLayer(animDotRef.current);
            animDotRef.current = null;
          }
          onAnimationTime?.(null);
          return;
        }

        const pt: L.LatLngExpression = [timelinePoints[i].lat, timelinePoints[i].lon];
        line.addLatLng(pt);
        dot.setLatLng(pt);

        onAnimationTime?.(timelinePoints[i].timestamp);

        i += step;
        animRef.current.frameId = requestAnimationFrame(tick);
      }

      tick();
    },
    [timelinePoints, onAnimationTime]
  );

  const stopAnimation = useCallback(() => {
    const map = mapRef.current;
    animRef.current.running = false;
    if (animRef.current.frameId) {
      cancelAnimationFrame(animRef.current.frameId);
      animRef.current.frameId = null;
    }
    if (animDotRef.current && map) {
      map.removeLayer(animDotRef.current);
      animDotRef.current = null;
    }
    if (animLineRef.current && map) {
      map.removeLayer(animLineRef.current);
      animLineRef.current = null;
    }
    onAnimationTime?.(null);
  }, [onAnimationTime]);

  async function handleDeletePhoto(photoId: string) {
    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setConfirmDeletePhoto(null);
      window.location.reload(); // Photo markers rebuild from server data on reload
    } catch {
      console.error('Failed to delete photo');
    }
  }

  useImperativeHandle(ref, () => ({ animatePath, stopAnimation }), [animatePath, stopAnimation]);

  return (
    <>
      <style>{`
        .pulse-marker {
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
      <div
        ref={containerRef}
        className="w-full h-full rounded-lg"
        style={{ minHeight: "400px" }}
      />
      {/* Photo delete confirmation — rendered outside Leaflet DOM */}
      <ConfirmDialog
        open={!!confirmDeletePhoto}
        onClose={() => setConfirmDeletePhoto(null)}
        onConfirm={() => confirmDeletePhoto && handleDeletePhoto(confirmDeletePhoto.id)}
        title="Delete photo?"
        message="This photo will be permanently removed. The file cannot be recovered."
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </>
  );
});

export default SpotMap;
