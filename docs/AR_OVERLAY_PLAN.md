# AR Overlay Plan (Marker + Heading)

## Goal
Camera-based turn-by-turn with corridor/door labels, minimal drift, works offline with cached graph. Support marker-based alignment and heading; fallback to render-only mode.

## Tech choice
- Bare React Native (leave Expo managed) with ViroReact (ARCore/ARKit) for plane tracking + image targets (QR/AprilTag).
- Fallback (if not moving to bare yet): expo-camera + AprilTag/QR detection + Three.js overlay (no plane). Less accurate, but keeps managed.

## Data contract (Supabase)
- Uses existing tables: `floors`, `nav_nodes`, `nav_edges`, `pois`.
- Required fields:
  - floors: `origin_lat/lng`, `origin_heading`, `scale` (m per unit), `name`, `level_index`.
  - nav_nodes: `type` in corridor|door|room|stairs|elevator|junction, `x,y,z`, `metadata` may carry marker_id.
  - nav_edges: `from_node`, `to_node`, `bidirectional`, `is_accessible`, `width`.
  - pois: `label`, `category`, `metadata.descriptions` per locale, optional `audio_url`.

## UX flow (AR mode)
1) Select building/floor → download graph + POIs (cache).
2) Alignment:
   - Prompt to scan marker (QR/AprilTag/ImageTarget). On detection, set pose = marker pose, reset drift.
   - If no marker, allow heading-only start (warn about drift).
3) Guidance:
   - Compute route on nav_edges; render breadcrumb/arrow in AR anchored to corridor nodes.
   - When near a door node: show label and optional description band; tap to expand multi-language text, TTS optional.
4) Multi-floor: switching floors requires re-alignment; per-floor marker set.
5) Offline: use cached graph + POIs; marker image patterns bundled or cached.

## AR rendering
- Place small arrow/breadcrumb meshes along route nodes/edges in world coords (x,y,z from nav_nodes with scale applied).
- Door/POI labels: billboard text at node position; clamp distance; fade when off-axis.
- Alignment math: worldOrigin = markerPose or derived from origin_lat/lng + heading; apply `origin_heading` + device heading to rotate graph into camera space.

## Marker strategy
- Use AprilTag/QR printed markers at corridor junctions and major doors. Store `marker_id` in nav_nodes.metadata and bundle reference images in app.
- On detection, map marker_id → node → set world origin (translation) and heading correction.

## Accessibility / options
- `is_accessible` edge flag for accessible routing.
- Text scaling; voice guidance using POI descriptions.

## Migration path
- Short term: keep managed, prototype with expo-camera + AprilTag JS detector + Three.js overlay (no plane), best-effort arrows.
- Medium term: migrate to bare RN + ViroReact for stable ARCore/ARKit plane + ImageTargets.

## Tasks to build
- [ ] (Managed fallback) Add AR overlay screen using expo-camera + AprilTag/QR detection, render 2D/3D arrows via GLView/Three.js using nav_nodes/nav_edges.
- [ ] (Bare path) Set up RN bare + ViroReact; add ImageTargets for markers, plane-based anchors for arrows/labels.
- [ ] Marker authoring: store marker_id in nav_nodes.metadata; bundle marker images; simple admin UI to assign markers.
- [ ] Description band: use pois.metadata.descriptions[locale]; add TTS option.
- [ ] Cache graph/POI per floor for offline.
