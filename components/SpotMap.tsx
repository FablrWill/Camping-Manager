"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon path issue with bundlers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const photoIcon = L.divIcon({
  className: "photo-marker",
  html: `<div style="
    width: 32px; height: 32px; border-radius: 50%;
    background: #d97706; border: 3px solid white;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-size: 14px;
  ">📷</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const locationIcon = L.divIcon({
  className: "location-marker",
  html: `<div style="
    width: 32px; height: 32px; border-radius: 50%;
    background: #059669; border: 3px solid white;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-size: 14px;
  ">📍</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

export interface MapLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type?: string | null;
  rating?: number | null;
  description?: string | null;
}

export interface MapPhoto {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  altitude?: number | null;
  takenAt?: string | null;
  imagePath: string;
}

interface SpotMapProps {
  locations: MapLocation[];
  photos: MapPhoto[];
  onMapClick?: (lat: number, lng: number) => void;
}

export default function SpotMap({
  locations,
  photos,
  onMapClick,
}: SpotMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([35.87, -81.9], 10);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    if (onMapClick) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    mapRef.current = map;
    setReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    const bounds: L.LatLngExpression[] = [];

    // Add location markers
    locations.forEach((loc) => {
      const marker = L.marker([loc.latitude, loc.longitude], {
        icon: locationIcon,
      }).addTo(map);

      const stars = loc.rating ? "⭐".repeat(loc.rating) : "";
      const typeLabel = loc.type
        ? loc.type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : "";

      marker.bindPopup(`
        <div style="min-width: 180px; font-family: system-ui;">
          <h3 style="margin: 0 0 4px; font-size: 15px; font-weight: 600;">${loc.name}</h3>
          ${typeLabel ? `<p style="margin: 2px 0; color: #666; font-size: 12px;">${typeLabel}</p>` : ""}
          ${stars ? `<p style="margin: 2px 0;">${stars}</p>` : ""}
          ${loc.description ? `<p style="margin: 4px 0; font-size: 13px; color: #444;">${loc.description.slice(0, 120)}${loc.description.length > 120 ? "..." : ""}</p>` : ""}
        </div>
      `);

      bounds.push([loc.latitude, loc.longitude]);
    });

    // Add photo markers
    photos.forEach((photo) => {
      const marker = L.marker([photo.latitude, photo.longitude], {
        icon: photoIcon,
      }).addTo(map);

      const date = photo.takenAt
        ? new Date(photo.takenAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : null;

      marker.bindPopup(`
        <div style="min-width: 200px; font-family: system-ui;">
          <img
            src="${photo.imagePath}"
            alt="${photo.title}"
            style="width: 100%; max-width: 280px; border-radius: 6px; margin-bottom: 6px;"
            loading="lazy"
          />
          <h3 style="margin: 0 0 2px; font-size: 14px; font-weight: 600;">${photo.title}</h3>
          ${date ? `<p style="margin: 2px 0; color: #666; font-size: 12px;">📅 ${date}</p>` : ""}
          ${photo.altitude ? `<p style="margin: 2px 0; color: #666; font-size: 12px;">🏔️ ${Math.round(photo.altitude)}m</p>` : ""}
        </div>
      `);

      bounds.push([photo.latitude, photo.longitude]);
    });

    // Fit bounds to show all markers
    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 14 });
    }
  }, [locations, photos, ready]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-lg"
      style={{ minHeight: "400px" }}
    />
  );
}
