---
phase: 40-gpx-import
plan: 03
type: execute
wave: 3
depends_on: [40-P02]
files_modified:
  - components/SpotMap.tsx
  - app/spots/spots-client.tsx
  - app/spots/page.tsx
autonomous: false
requirements: [GPX-04, GPX-05]

must_haves:
  truths:
    - "A Trails toggle pill appears in the layer controls bar on the Spots page"
    - "Toggling Trails shows/hides imported trail polylines on the map"
    - "Trail polylines render in green (#22c55e), weight 3, opacity 0.8"
    - "Clicking a trail polyline shows a popup with trail name, distance (if available), and import date"
    - "The GPX import panel shows a Saved Trails list with per-trail delete buttons"
    - "Deleting a trail removes it from the list and the map without a confirmation dialog"
    - "The import success message includes trail count when trails are created"
    - "The GPX import panel description updated to mention trail routes and map overlays"
  artifacts:
    - path: "components/SpotMap.tsx"
      provides: "Trail GeoJSON layer rendering + Layers interface extended with trails boolean"
      contains: "trailLayersRef"
    - path: "app/spots/spots-client.tsx"
      provides: "Trails state, toggle pill, trails list UI, extended handleGpxFile"
      contains: "trails"
    - path: "app/spots/page.tsx"
      provides: "Trail data server-side fetch, passed to client"
  key_links:
    - from: "app/spots/spots-client.tsx"
      to: "/api/trails"
      via: "fetch('/api/trails') on mount"
      pattern: "fetch.*api/trails"
    - from: "components/SpotMap.tsx"
      to: "L.geoJSON()"
      via: "L.geoJSON(fc, { style: { color: trail.color, weight: 3, opacity: 0.8 } })"
      pattern: "L\\.geoJSON\\(fc"
    - from: "app/spots/page.tsx"
      to: "prisma.trail.findMany"
      via: "trails fetched server-side in page.tsx via API or direct prisma query"
      pattern: "trail"
---

<objective>
Wire the trail layer into the Spots map and build the trails management UI — toggle pill, trails list with delete, updated import panel with trail count messages.

Purpose: This is the user-facing layer. After this plan, Will can import a GPX trail, see it render on the map as a green polyline, toggle it off/on, and delete it from the list.
Output: Trails toggle in layer bar, trail polylines on map, Saved Trails list below GPX import panel, updated import messaging.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/40-gpx-import/40-CONTEXT.md
@.planning/phases/40-gpx-import/40-UI-SPEC.md
@.planning/phases/40-gpx-import/40-RESEARCH.md
@.planning/phases/40-gpx-import/40-P02-SUMMARY.md

Relevant source files:
@components/SpotMap.tsx
@app/spots/spots-client.tsx
@app/spots/page.tsx
</context>

<interfaces>
<!-- Types the executor needs. Extracted from codebase. -->

From components/SpotMap.tsx (current state — MUST read full file before editing):
```typescript
// Existing Layers interface at line 162 — extend it:
export interface Layers {
  photos: boolean;
  spots: boolean;
  path: boolean;
  places: boolean;
  heatmap: boolean;
  // ADD: trails: boolean;
}

// Existing SpotMapProps at line 175 — extend it:
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
  onPhotoDeleted?: (photoId: string) => void;
  // ADD: trails?: TrailOverlay[];
}

// Existing layer group refs pattern (lines 209-211):
const pathLayersRef = useRef<L.LayerGroup>(L.layerGroup());
const placeLayersRef = useRef<L.LayerGroup>(L.layerGroup());
// ADD: const trailLayersRef = useRef<L.LayerGroup>(L.layerGroup());
```

New types to add to SpotMap.tsx:
```typescript
export interface TrailOverlay {
  id: string;
  name: string;
  geoJson: string; // serialized FeatureCollection
  color: string;
  distanceKm?: number | null;
  createdAt: string; // ISO date string
}
```

From app/spots/spots-client.tsx (current Layers state at line 72):
```typescript
const [layers, setLayers] = useState<Layers>({
  photos: true,
  spots: true,
  path: true,
  places: true,
  heatmap: false,
  // ADD: trails: true,
});
```

From GET /api/trails response (built in P02):
```typescript
// Returns: Array of:
interface TrailListItem {
  id: string;
  name: string;
  color: string;
  distanceKm: number | null;
  sourceFile: string | null;
  createdAt: string; // ISO date string
}
```

From GET /api/trails/[id] response (for full geoJson):
```typescript
interface TrailRecord extends TrailListItem {
  geoJson: string; // FeatureCollection JSON
  description: string | null;
}
```

From app/spots/spots-client.tsx handleGpxFile (current at line 118):
```typescript
// Current response shape used in handleGpxFile:
const data = await res.json() as {
  locationsCreated: number;
  summary: { waypointCount: number; trackCount: number; totalTrackPoints: number };
};
// EXTEND: add trailsCreated: number to this type
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Extend SpotMap.tsx with trail GeoJSON layer</name>
  <read_first>
    - components/SpotMap.tsx (read FULL file — understand all existing useEffect patterns, especially pathLayersRef effect at lines 209-254, before adding the trail layer effect)
    - .planning/phases/40-gpx-import/40-RESEARCH.md (Pattern 3: Leaflet GeoJSON Layer section — copy the effect verbatim)
    - .planning/phases/40-gpx-import/40-UI-SPEC.md (Trail Map Popup section — inline popup HTML spec)
  </read_first>
  <files>components/SpotMap.tsx</files>
  <action>
Make these targeted additions to SpotMap.tsx:

**1. Add TrailOverlay interface** (add near the other exported interfaces, around line 160, before the Layers interface):
```typescript
export interface TrailOverlay {
  id: string;
  name: string;
  geoJson: string; // serialized FeatureCollection
  color: string;
  distanceKm?: number | null;
  createdAt: string; // ISO date string
}
```

**2. Extend Layers interface** (add `trails: boolean` to the existing Layers interface at line 162):
```typescript
export interface Layers {
  photos: boolean;
  spots: boolean;
  path: boolean;
  places: boolean;
  heatmap: boolean;
  trails: boolean;  // NEW
}
```

**3. Extend SpotMapProps** (add `trails` prop to the existing SpotMapProps interface):
```typescript
  trails?: TrailOverlay[];  // NEW — trail overlays to render when layers.trails is true
```

**4. Destructure `trails` in the component function body** (add to the destructuring of props in `forwardRef`):
```typescript
    trails = [],
```

**5. Add trailLayersRef** (add alongside the existing pathLayersRef and placeLayersRef):
```typescript
  const trailLayersRef = useRef<L.LayerGroup>(L.layerGroup());
```

**6. Add trail layer useEffect** (add after the existing path layers useEffect — find the useEffect that uses `pathLayersRef` and add the new one immediately after it):

```typescript
  // Trail GeoJSON layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    trailLayersRef.current.clearLayers();
    if (!layers.trails) {
      if (map.hasLayer(trailLayersRef.current)) map.removeLayer(trailLayersRef.current);
      return;
    }
    if (!map.hasLayer(trailLayersRef.current)) trailLayersRef.current.addTo(map);

    trails.forEach((trail) => {
      try {
        const fc = JSON.parse(trail.geoJson) as import('geojson').FeatureCollection;
        const formattedDate = new Date(trail.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const layer = L.geoJSON(fc, {
          style: {
            color: trail.color,
            weight: 3,
            opacity: 0.8,
          },
        });
        const popupHtml = `<div style="min-width:140px;font-family:inherit;">` +
          `<strong style="font-size:14px;color:#1c1917;">${escHtml(trail.name)}</strong>` +
          (trail.distanceKm ? `<div style="font-size:12px;color:#78716c;margin-top:2px;">${trail.distanceKm.toFixed(1)} km</div>` : '') +
          `<div style="font-size:12px;color:#78716c;margin-top:2px;">Imported ${formattedDate}</div>` +
          `</div>`;
        layer.bindPopup(popupHtml);
        trailLayersRef.current.addLayer(layer);
      } catch {
        console.error('Failed to render trail:', trail.id);
      }
    });
  }, [trails, layers.trails, ready]);
```

Note: Look for an existing `escHtml` helper in the file — it likely already exists (used for location popup content). If not, add a minimal implementation near the top of the component file:
```typescript
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
```

**7. Add import for geojson types** (if not already imported at the top of the file):
```typescript
import type { FeatureCollection } from 'geojson';
```
Then replace the inline `import('geojson').FeatureCollection` in the effect with just `FeatureCollection`.
  </action>
  <verify>
    <automated>npm run build 2>&1 | grep -E "error TS|TypeError" | head -5 || echo "BUILD OK"</automated>
  </verify>
  <acceptance_criteria>
    - components/SpotMap.tsx contains `trails: boolean` in the Layers interface
    - components/SpotMap.tsx contains `export interface TrailOverlay {`
    - components/SpotMap.tsx contains `trails?: TrailOverlay[]` in SpotMapProps
    - components/SpotMap.tsx contains `const trailLayersRef = useRef<L.LayerGroup>(L.layerGroup())`
    - components/SpotMap.tsx contains `trailLayersRef.current.clearLayers()`
    - components/SpotMap.tsx contains `L.geoJSON(fc, {`
    - components/SpotMap.tsx contains `color: trail.color`
    - components/SpotMap.tsx contains `weight: 3`
    - `npm run build` exits 0
  </acceptance_criteria>
  <done>SpotMap accepts trails prop, renders trail polylines as GeoJSON layer, toggles with layers.trails, shows popup with name/distance/date</done>
</task>

<task type="auto">
  <name>Task 2: Extend SpotsClient with trails state, toggle pill, trails list, and updated import handler</name>
  <read_first>
    - app/spots/spots-client.tsx (read FULL file — understand all existing state, layer toggle array, handleGpxFile, and GPX import panel JSX before editing)
    - app/spots/page.tsx (read full file — understand how locations/photos/etc are fetched server-side and passed as props)
    - .planning/phases/40-gpx-import/40-UI-SPEC.md (Component Inventory section — exact classes and copy for every UI element)
    - .planning/phases/40-gpx-import/40-CONTEXT.md (D-02, D-03, D-05 decisions on toggle and trails list)
  </read_first>
  <files>app/spots/spots-client.tsx, app/spots/page.tsx</files>
  <action>
**Changes to app/spots/spots-client.tsx:**

**1. Add TrailOverlay and TrailListItem imports at top** (alongside the existing Layers import from SpotMap):
```typescript
import type { TrailOverlay } from '@/components/SpotMap';
// Also add to Layers import: Layers already imported — just extend its use

interface TrailListItem {
  id: string;
  name: string;
  color: string;
  distanceKm: number | null;
  sourceFile: string | null;
  createdAt: string;
}
```

**2. Add trails state variables** (add alongside existing state declarations at the top of the component):
```typescript
const [trails, setTrails] = useState<TrailListItem[]>([]);
const [trailsLoading, setTrailsLoading] = useState(false);
const [deletingTrailId, setDeletingTrailId] = useState<string | null>(null);
const [trailDeleteError, setTrailDeleteError] = useState<string | null>(null);
```

**3. Add `trails: true` to the initial layers state** (extend the existing useState<Layers>({}) initializer):
```typescript
const [layers, setLayers] = useState<Layers>({
  photos: true,
  spots: true,
  path: true,
  places: true,
  heatmap: false,
  trails: true,   // NEW
});
```

**4. Add fetchTrails function and useEffect** (add alongside other data-fetching useEffects):
```typescript
const fetchTrails = useCallback(async () => {
  setTrailsLoading(true);
  try {
    const res = await fetch('/api/trails');
    if (!res.ok) throw new Error('Failed to fetch trails');
    const data = await res.json() as TrailListItem[];
    setTrails(data);
  } catch {
    // Non-blocking — trails list failing doesn't break the map
  } finally {
    setTrailsLoading(false);
  }
}, []);

useEffect(() => { fetchTrails(); }, [fetchTrails]);
```

**5. Add handleDeleteTrail function**:
```typescript
const handleDeleteTrail = useCallback(async (id: string) => {
  setDeletingTrailId(id);
  setTrailDeleteError(null);
  try {
    const res = await fetch(`/api/trails/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    setTrails((prev) => prev.filter((t) => t.id !== id));
  } catch {
    setTrailDeleteError('Could not delete trail. Try again.');
  } finally {
    setDeletingTrailId(null);
  }
}, []);
```

**6. Update handleGpxFile** to use the new response shape and refresh trails list after import:

Update the `data` type cast in handleGpxFile:
```typescript
const data = await res.json() as {
  locationsCreated: number;
  trailsCreated: number;  // NEW
  summary: { waypointCount: number; trackCount: number; totalTrackPoints: number };
};
```

Update the success message parts (per UI-SPEC Copywriting Contract):
```typescript
const parts: string[] = [];
if (data.trailsCreated > 0) parts.push(`${data.trailsCreated} trail${data.trailsCreated !== 1 ? 's' : ''} added`);
if (data.locationsCreated > 0) parts.push(`${data.locationsCreated} location${data.locationsCreated !== 1 ? 's' : ''} added`);
if (data.summary.trackCount > 0 && data.trailsCreated === 0) parts.push(`${data.summary.trackCount} track${data.summary.trackCount !== 1 ? 's' : ''} (${data.summary.totalTrackPoints} points)`);
if (data.summary.waypointCount > 0 && data.locationsCreated === 0) parts.push(`${data.summary.waypointCount} waypoint${data.summary.waypointCount !== 1 ? 's' : ''} (all already exist)`);
setGpxMessage(parts.join(', ') || 'No tracks or waypoints found in GPX file');
```

After setting the success message, add:
```typescript
if (data.trailsCreated > 0) await fetchTrails();
```

**7. Build trailOverlays for SpotMap** (add as a useMemo near other derived values):
This requires fetching full trail data including geoJson. Use a separate state for the full overlay data, populated lazily when trails exist. SIMPLER APPROACH: since the trails list only has metadata, fetch full trails when rendering the map. Use a separate fetch for the map overlays:

```typescript
const [trailOverlays, setTrailOverlays] = useState<TrailOverlay[]>([]);

// Fetch full trail data (with geoJson) for map rendering whenever trails list changes
useEffect(() => {
  if (trails.length === 0) { setTrailOverlays([]); return; }
  let cancelled = false;
  async function loadOverlays() {
    try {
      const overlays = await Promise.all(
        trails.map(async (t) => {
          const res = await fetch(`/api/trails/${t.id}`);
          if (!res.ok) return null;
          return res.json() as Promise<TrailOverlay>;
        })
      );
      if (!cancelled) setTrailOverlays(overlays.filter((o): o is TrailOverlay => o !== null));
    } catch {
      // Non-blocking
    }
  }
  loadOverlays();
  return () => { cancelled = true; };
}, [trails]);
```

**8. Add Trails toggle pill to the layer controls** (add to the existing toggle array, per UI-SPEC):

Find the `([...] as const).map(([key, label]) =>` array. Add `["trails", "🥾 Trails"]` as the last entry, AFTER `["places", "🏠 Visits"]`:
```typescript
["trails", "🥾 Trails"],
```
The `toggleLayer` function already handles any key in Layers — no changes needed there.

**9. Update the GPX import panel description** (per UI-SPEC Copywriting Contract):

Replace:
```tsx
Import trail routes from AllTrails, Wikiloc, or any GPS app. Waypoints become saved locations.
```
With:
```tsx
Import trail routes and waypoints from AllTrails, Wikiloc, or any GPS app. Tracks appear as map overlays; waypoints become saved spots.
```

**10. Add Saved Trails list inside the GPX import panel** (add after the existing `{gpxMessage && ...}` block, still inside the `{showGpxImport && ...}` panel div):
```tsx
{/* Saved Trails list */}
<div className="border-t border-stone-200 dark:border-stone-700 mt-3 pt-3">
  <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2">
    Saved Trails
  </p>
  {trailsLoading ? (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-4 animate-pulse bg-stone-200 dark:bg-stone-700 rounded" />
      ))}
    </div>
  ) : trails.length === 0 ? (
    <p className="text-xs text-stone-400 dark:text-stone-500">No trails imported yet</p>
  ) : (
    <ul>
      {trails.map((trail) => (
        <li key={trail.id} className="flex items-center justify-between py-2">
          <span>
            <span className="text-sm text-stone-700 dark:text-stone-300">{trail.name}</span>
            {trail.distanceKm != null && (
              <span className="text-xs text-stone-500 dark:text-stone-400 ml-1">
                {trail.distanceKm.toFixed(1)} km
              </span>
            )}
          </span>
          <button
            onClick={() => handleDeleteTrail(trail.id)}
            disabled={deletingTrailId === trail.id}
            aria-label="Delete trail"
            className="p-1 rounded text-stone-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
          >
            {deletingTrailId === trail.id ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        </li>
      ))}
    </ul>
  )}
  {trailDeleteError && (
    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{trailDeleteError}</p>
  )}
</div>
```

**11. Pass trails prop to SpotMap** (in the SpotMap JSX element near the bottom of the component):
Add `trails={trailOverlays}` to the existing `<SpotMap ... />` props.

**Changes to app/spots/page.tsx:**

Read the file first. If it's a Server Component that fetches data and passes to SpotsClient, no changes may be needed (trails are fetched client-side via useEffect). If the page passes an initial `layers` prop to SpotsClient, no change is needed since layers state is managed internally in SpotsClient.

Only change page.tsx if it defines the Layers initial state that is passed as prop — if so, add `trails: true` there. Otherwise skip.
  </action>
  <verify>
    <automated>npm run build 2>&1 | grep -E "error TS|TypeError" | head -5 || echo "BUILD OK"</automated>
  </verify>
  <acceptance_criteria>
    - app/spots/spots-client.tsx contains `trails: true` in the layers useState initializer
    - app/spots/spots-client.tsx contains `["trails", "🥾 Trails"]` in the layer toggle array
    - app/spots/spots-client.tsx contains `const [trails, setTrails] = useState<TrailListItem[]>([])`
    - app/spots/spots-client.tsx contains `fetchTrails`
    - app/spots/spots-client.tsx contains `handleDeleteTrail`
    - app/spots/spots-client.tsx contains `trailOverlays`
    - app/spots/spots-client.tsx contains `Saved Trails`
    - app/spots/spots-client.tsx contains `aria-label="Delete trail"`
    - app/spots/spots-client.tsx contains `trails={trailOverlays}` in the SpotMap JSX
    - app/spots/spots-client.tsx contains `trail${` (pluralization in success message)
    - `npm run build` exits 0
  </acceptance_criteria>
  <done>Trails toggle pill in layer bar, trail polylines on map via trailOverlays, Saved Trails list with delete in GPX panel, import message includes trail count</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Full GPX trail import flow:
    - Import a GPX file → Trail record created in DB
    - Trail polyline rendered as green overlay on the Spots map
    - Trails toggle pill in layer controls bar (🥾 Trails)
    - Saved Trails list below GPX import panel with per-trail delete
    - Import success message includes trail count
  </what-built>
  <how-to-verify>
    1. Run `npm run dev` and open http://localhost:3000/spots
    2. Open the GPX import panel (click "GPX" button)
    3. Verify the panel description reads: "Import trail routes and waypoints from AllTrails, Wikiloc, or any GPS app. Tracks appear as map overlays; waypoints become saved spots."
    4. Import a .gpx file with track data (use any AllTrails or Wikiloc export, or a test file with <trk> elements)
    5. Verify success message includes "X trail(s) added"
    6. Verify the Saved Trails list shows the imported trail with its name
    7. Verify a green polyline appears on the map in the trail's area
    8. Click the polyline — verify popup shows trail name + import date
    9. Click "🥾 Trails" toggle — verify the polyline disappears; click again → reappears
    10. Hover the delete button (trash icon) in the trail list — verify it turns red
    11. Click the delete button — verify the trail disappears from the list and from the map
    12. Verify no confirmation dialog appears (delete is immediate)
    13. Check that layer toggles for Photos, Spots, Path, Visits still work correctly
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues found</resume-signal>
</task>

</tasks>

<verification>
```bash
# Build passes
npm run build

# Trail toggle in layer bar
grep '🥾 Trails' app/spots/spots-client.tsx

# Trail layer in SpotMap
grep 'trailLayersRef' components/SpotMap.tsx

# Trail routes exist
ls app/api/trails/route.ts app/api/trails/[id]/route.ts
```
</verification>

<success_criteria>
- Trails toggle pill visible in layer controls bar on Spots page
- Importing a GPX with tracks creates a Trail record and shows "X trail(s) added" in success message
- Trail renders as green (#22c55e) polyline, weight 3, opacity 0.8
- Trail popup shows name, distance (if present), import date
- Saved Trails list shows all trails with per-trail delete
- Delete removes trail from list and map immediately, no confirmation
- Layers toggle works for Trails (show/hide all trail overlays)
- All other layer toggles (Photos, Spots, Path, Visits) unaffected
- TypeScript build passes
- Human UAT approved
</success_criteria>

<output>
After completion, create `.planning/phases/40-gpx-import/40-P03-SUMMARY.md`
</output>
