"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import PhotoUpload from "@/components/PhotoUpload";
import type { MapLocation, MapPhoto } from "@/components/SpotMap";

// Dynamic import — Leaflet needs browser window
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
  const [showUpload, setShowUpload] = useState(false);
  const [photos, setPhotos] = useState(initialPhotos);
  const [filter, setFilter] = useState<"all" | "photos" | "spots">("all");

  const refreshPhotos = useCallback(async () => {
    const res = await fetch("/api/photos");
    if (res.ok) {
      const data = await res.json();
      setPhotos(data);
    }
    setShowUpload(false);
  }, []);

  const filteredLocations = filter === "photos" ? [] : initialLocations;
  const filteredPhotos = filter === "spots" ? [] : photos;

  const totalMarkers = filteredLocations.length + filteredPhotos.length;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      {/* Controls bar */}
      <div className="flex items-center justify-between px-1 py-2 gap-2">
        <div className="flex gap-1">
          {(["all", "photos", "spots"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                filter === f
                  ? "bg-stone-800 text-white"
                  : "bg-stone-200 text-stone-600 hover:bg-stone-300"
              }`}
            >
              {f === "all" ? "All" : f === "photos" ? "📷 Photos" : "📍 Spots"}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowUpload(!showUpload)}
          className="px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
        >
          + Add Photos
        </button>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <div className="px-1 pb-2">
          <PhotoUpload onUploadComplete={refreshPhotos} />
        </div>
      )}

      {/* Map */}
      <div className="flex-1 min-h-0 rounded-lg overflow-hidden">
        <SpotMap locations={filteredLocations} photos={filteredPhotos} />
      </div>

      {/* Stats footer */}
      <div className="text-center py-2 text-xs text-stone-500">
        {totalMarkers} marker{totalMarkers !== 1 ? "s" : ""} &middot;{" "}
        {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? "s" : ""} &middot;{" "}
        {filteredLocations.length} spot{filteredLocations.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
