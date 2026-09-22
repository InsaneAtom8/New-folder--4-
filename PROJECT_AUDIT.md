# PotholeVision AI Enterprise — Full Project Audit

**Audit date:** 2026-09-21  
**Audit target:** current working tree, including staged, unstaged, and untracked changes  
**Reviewer audience:** higher-level architecture, security, and delivery review agent

## Executive verdict

The project is a promising prototype for local pothole detection and GIS visualization, but it is not release-ready or enterprise-ready. The production frontend build passes, and the local backend can load the model in the present workspace. However, the system has critical secret exposure, an unauthenticated inference API, non-reproducible model packaging, incorrect NMEA GPS parsing, race conditions in frame processing, and unsafe deduplication semantics.

**Release recommendation: HOLD.** Remediate all Critical and High findings before accepting detection output as operational or municipal work-order data.

## System inventory

### Frontend

- React 19 + TypeScript 5.7 + Vite 6.
- Tailwind CSS, Leaflet, Chart.js, Lucide icons.
- Main views: video/GPS ingestion, detector HUD, GIS map, analytics dashboard, data registry.
- Browser-local persistence through IndexedDB (`PotholeVisionDB`, store `potholes`).

### Backend

- FastAPI service in `server.py`.
- Ultralytics YOLO inference over raw base64 image bodies.
- Default endpoint: `http://localhost:8000/detect`.
- Model path is resolved from the process working directory as `pothole_yolo_dataset/best.pt`.

### Data flow

```text
Video File
  -> HTMLVideoElement
  -> canvas JPEG/base64 frame
  -> local FastAPI YOLO or direct Roboflow request
  -> normalized boxes
  -> GPS interpolation + reverse geocoding
  -> heuristic severity/area + spatial deduplication
  -> IndexedDB + map/table/dashboard/export
```

### Repository/release state

- `npm run build`: passes.
- Python syntax compilation: passes.
- Current workspace imports `server.py` and loads `pothole_yolo_dataset/best.pt` successfully.
- No automated tests, lint script, formatter script, CI workflow, Python dependency manifest, README, health check, or deployment manifest were found.
- The worktree is dirty: `server.py`, context/database files, detector/UI files, and other sources have staged and/or unstaged edits; `src/utils/reverseGeocode.ts` is untracked.

## Findings by priority

### CRITICAL — C-01: Private Roboflow credential is committed and shipped to browsers

**Evidence:** `src/context/PotholeContext.tsx:49-51` uses a hardcoded fallback API key; the same value is present in `HEAD` and in the generated `dist/assets/*.js` bundle. `src/services/roboflowService.ts:37` sends the key in the request URL.

**Impact:** Anyone with repository or deployed-bundle access can extract and abuse the credential. URL query parameters can also enter provider/proxy/request logs. The UI password field does not make a browser-held credential private.

**Required action:** Revoke/rotate the exposed key immediately. Remove it from source and git history. Route cloud inference through an authenticated server-side proxy or use a deliberately scoped public inference credential with quotas and no private privileges. Never provide a secret fallback in frontend code.

### HIGH — H-01: Local inference API has no authentication, limits, or safe network boundary

**Evidence:** `server.py:51-58` allows wildcard CORS, `server.py:69-125` exposes an unrestricted POST endpoint, and `start.sh:53-55` / `server.py:130` bind to `0.0.0.0`. There is no request-size limit, rate limit, auth, queue, or health/readiness contract.

**Impact:** Any reachable client can submit arbitrary image payloads and consume CPU/memory with inference. Multiple simultaneous requests can overload the process. Error details are returned to callers at `server.py:123-125`.

**Required action:** For desktop-only use, bind to `127.0.0.1`; otherwise add authentication, strict allowed origins, body/image dimensions and timeout limits, rate limiting, bounded concurrency, structured safe errors, and a health/readiness endpoint. Move synchronous model work off the async event loop.

### HIGH — H-02: Clean checkout is not runnable because the model artifact is ignored and configuration is machine-specific

**Evidence:** `.gitignore:20-28` ignores checkpoints and `*.pt`, while `server.py:60` requires `pothole_yolo_dataset/best.pt`. The currently working model is an ignored local file, not a tracked release artifact. `pothole_yolo_dataset/data.yaml:2` contains a Windows absolute path. Training scripts use several incompatible paths and model names.

**Impact:** A fresh clone can start the frontend but the backend will load `model = None` and return 500 for every detection. The current workspace succeeding is not a reproducible deployment result.

**Required action:** Choose and document an artifact strategy: versioned model registry/object storage with checksum and download step, or an explicitly packaged release artifact. Resolve paths relative to `__file__`, make dataset paths portable, pin Python dependencies, add a startup failure/readiness check, and document model/version compatibility.

### HIGH — H-03: NMEA parser reads the wrong fields and can produce invalid GPS coordinates

**Evidence:** `src/utils/gpxParser.ts:50-65` treats `parts[2]`/`parts[4]` as latitude/longitude. For standard `$GPRMC`, those positions are status/latitude direction; for `$GPGGA`, they are latitude/latitude direction. The implementation also does not validate checksum, status, ranges, or `NaN` before appending points.

**Impact:** NMEA uploads can be silently mapped to invalid or incorrect coordinates, contaminating records and deduplication. The UI reports parsed points without confirming that they are valid.

**Required action:** Implement separate, standards-correct GPRMC/GPGGA parsers, validate fix status/checksum and latitude/longitude ranges, reject invalid points, and add fixture tests for both sentence types.

### HIGH — H-04: Frame inference is concurrent and completion can commit incomplete results

**Evidence:** `src/components/Detector/DetectionCanvas.tsx:128-149` starts `processFrame` from `timeupdate` without a single-flight guard. `processFrame` awaits network/model inference and reverse geocoding at `:151-224`. `handleEnded` deduplicates and commits immediately at `:226-242` without waiting for in-flight work.

**Impact:** Slow inference can overlap multiple frames, race mutations of `detectedRecordsRef`, reorder observations, duplicate detections, and cause late detections to be omitted from the final IndexedDB commit. Reverse-geocoding latency makes this more likely.

**Required action:** Add a bounded frame queue or single-flight lock, explicitly track/cancel in-flight requests, drain the queue before finalization, and make component teardown abort-safe. Test with inference latency greater than the sample interval.

### HIGH — H-05: Deduplication can merge distinct potholes based only on video time

**Evidence:** `src/utils/geoDeduplication.ts:139-145` merges records when `timeDiff < 8` seconds even if they are far apart. The live matching at `DetectionCanvas.tsx:169-179` uses an OR condition, and the post-pass is not transitive because each target is compared only to the cluster's first record (`geoDeduplication.ts:121-147`).

**Impact:** Nearby or sequentially observed hazards can be merged into one record, while chained spatial duplicates can remain split. Count, coordinates, severity, and maintenance metrics become unreliable.

**Required action:** Define the identity rule explicitly. Use spatial distance plus compatible track/box evidence, not time alone. Use a deterministic connected-component/union-find or spatial index algorithm, preserve provenance of merged observations, and add adversarial tests.

### HIGH — H-06: Claimed fallback behavior and model identity do not match runtime behavior

**Evidence:** `AIConfig.useLocalFallback` is exposed in `src/components/Header/AISettingsModal.tsx:161-180` but is never read by the detection service. `analyzeFrameLocalCV` exists in `src/services/potholeDetector.ts:134-249` but is never called. A local-model failure at `:49-71` returns an empty result instead of using the advertised browser fallback. The UI labels the local model “YOLOv12 PyResearch,” while training scripts use YOLOv8 and the installed Ultralytics runtime is 8.x.

**Impact:** Users can enable a setting that has no effect, receive zero detections when the backend is unavailable, and see model/version claims that are not traceable to the loaded artifact. This is a serious trust and observability problem for safety-related output.

**Required action:** Either implement and test the fallback or remove the control and copy. Expose actual model metadata (artifact hash, architecture, training run, class names) from the backend and record it with each detection. Rename UI labels to match the actual artifact.

### HIGH — H-07: Detection measurements are heuristic and presented as operational facts

**Evidence:** Severity is derived from normalized box dimensions and confidence (`src/services/potholeDetector.ts:251-255`; `DetectionCanvas.tsx:200`). Area is calculated from pixel dimensions times arbitrary constants (`potholeDetector.ts:58-65`, `DetectionCanvas.tsx:166-203`) with no camera calibration, ground plane, altitude, or perspective correction. The dashboard health score is an arbitrary count penalty (`AnalyticsDashboard.tsx:45-47`).

**Impact:** “Critical,” physical area in cm², health score, and repair-priority claims are not validated measurements. False precision can cause incorrect maintenance prioritization.

**Required action:** Label these as estimates, calibrate area or remove it, document severity policy, and validate against a ground-truth evaluation set with precision/recall, mAP, calibration, and geolocation error metrics.

### HIGH — H-08: Imported records are not schema-validated

**Evidence:** `src/context/PotholeContext.tsx:189-212` accepts arbitrary JSON arrays as `PotholeRecord[]`; GeoJSON fields are defaulted with `||`, so valid zero coordinates are replaced and malformed values can be silently accepted. `src/db/potholeDb.ts:68-79` persists records without runtime validation.

**Impact:** A malformed or adversarial local import can corrupt IndexedDB and later crash render paths that assume numbers, valid enum values, and complete bounding boxes. IDs can overwrite existing records through `store.put`.

**Required action:** Add a runtime schema validator, reject invalid features individually with an error report, validate coordinate ranges/enums/numeric bounds, namespace or regenerate imported IDs, and cap file size/record count.

## MEDIUM findings

### M-01: Client-side data privacy and governance are undefined

Cloud mode sends sampled video frames to Roboflow (`roboflowService.ts:37-45`), and every newly created detection may send coordinates to public reverse geocoding (`reverseGeocode.ts:17-25`). There is no consent/retention/region policy, audit log, or documented distinction between local and cloud processing. Snapshots are stored as base64 strings in IndexedDB, potentially consuming significant local quota.

### M-02: Public reverse-geocoding service is called from the hot detection path

`DetectionCanvas.tsx:190-192` awaits geocoding for every new record. The cache is in-memory only and has no request coalescing, rate limiter, backoff, or persistent cache. Detection throughput and availability therefore depend on a third-party service.

### M-03: Storage and rendering do not scale

`getAllPotholes()` loads every record and its base64 snapshot (`potholeDb.ts:30-47`); map markers are recreated on every filtered-array render (`PotholeMap.tsx:110-136`); marker clustering dependencies are installed but not used. Large runs can cause memory pressure, slow UI, and IndexedDB quota failures.

### M-04: CSV export is not a compliant or safe CSV serializer

`src/db/potholeDb.ts:184-200` quotes only street names and does not escape embedded quotes/newlines or other fields. Imported values beginning with spreadsheet formula characters are not neutralized. Exports may be malformed or interpreted as formulas by spreadsheet software.

### M-05: Map heatmap control is non-functional

`PotholeMap.tsx:40` and `:321` toggle `showHeatmap`, but no heat layer is created or removed. The interface advertises a feature that has no effect.

### M-06: Pagination and ranking claims are incorrect

`PotholeTable.tsx:50-51` does not reset `currentPage` when filters/search change, so a valid filtered result can appear empty on a later page. `AnalyticsDashboard.tsx:222-233` displays `potholes.slice(0, 5)` while claiming sorting by severity and area; it does not sort.

### M-07: Error handling and resource cleanup are incomplete

Object URLs created for video/export blobs are not consistently revoked. Backend `HTTPException(400)` raised inside the broad `server.py:74-125` try block is rewrapped as a 500. There is no abort handling for fetches when a component unmounts, and the animation-frame ref is never assigned.

### M-08: Backend portability and operational hardening are weak

`server.py:60` depends on the caller's current directory. The server has no structured logging, model checksum, metrics, request IDs, readiness state, or bounded worker strategy. `start.sh` waits a fixed two seconds rather than checking backend readiness, and the Python launcher does not isolate dependencies in a declared environment.

## LOW findings / polish

- `package.json` has no test, lint, format, or typecheck scripts beyond the build's `tsc -b` step.
- Production build emits a ~607 kB minified JavaScript chunk, triggering Vite's chunk-size warning; code splitting would improve startup.
- External fonts, tile layers, and unpinned Leaflet CSS create availability, privacy, and supply-chain dependencies; only the main Leaflet stylesheet has SRI.
- Several props/imports/dead paths remain, including the unused detector `presetId`, unused local CV path, unused animation-frame cancellation path, and unused map/icon imports.
- The UI uses hardcoded “FPS: 29.9,” “100% Geotagged,” and “System Operational” statuses without measuring those conditions.
- Accessibility needs work: clickable non-button map/list containers lack keyboard semantics, modal content lacks dialog labeling/focus management, and many icon-only buttons rely on titles rather than accessible labels.

## Functional audit

| Area | Current behavior | Assessment |
|---|---|---|
| Video ingestion | Local file selection and browser playback | Works at compile level; no file-size/duration guard and no end-to-end test |
| GPS ingestion | GPX, CSV, NMEA branches | GPX/CSV are permissive; NMEA is materially incorrect |
| Local inference | Browser posts base64 frames to FastAPI | Works only when ignored model exists and backend is running |
| Cloud inference | Browser posts frames directly to Roboflow | Credential exposure and third-party data governance risk |
| Detection tracking | Time/spatial matching + post-pass merge | Race-prone and semantically over-aggressive |
| Persistence | IndexedDB records and base64 snapshots | Good prototype choice; no schema/quota/version strategy |
| Map | Leaflet markers, filtering, tiles, inspector | Basic view works; heatmap is dead, marker updates are inefficient |
| Analytics | Counts, charts, synthetic health score | Useful UI prototype; metrics are not evidence-grade |
| Import/export | GeoJSON/JSON import, GeoJSON/CSV export | Needs validation, escaping, limits, and safer ID handling |
| Operations | Shell and PowerShell launchers | Convenient local launch; not production deployment or readiness-safe |

## Verification performed

```text
npm run build                                      PASS
python3 -m py_compile ...                          PASS
import server; model is not None                   PASS in current workspace
git diff --check                                   PASS
npm audit --omit=dev --json                        NOT COMPLETED: registry DNS unavailable
automated tests                                    NONE FOUND
```

The successful local model import is not evidence of clean-clone reproducibility because the required `.pt` file is ignored and locally present.

## Remediation plan, in order

1. Revoke the exposed Roboflow credential; scrub it from source, bundles, and git history.
2. Decide deployment scope: local desktop or multi-user service. Bind local mode to loopback; add auth, CORS restrictions, request limits, bounded inference, and safe errors.
3. Make the model artifact and Python environment reproducible. Add model metadata/checksums and fail fast when the artifact is missing.
4. Correct GPS parsing and add fixtures for GPX, GPRMC, GPGGA, CSV, invalid ranges, missing timestamps, and epoch-vs-video time semantics.
5. Add a single-flight inference queue with cancellation and an explicit “drain before commit” finalization state.
6. Replace deduplication with a tested spatial/track clustering algorithm; preserve observation provenance and avoid time-only merges.
7. Add runtime validation for all imported and persisted records plus safe CSV/GeoJSON serialization.
8. Define model evaluation and calibration requirements before using severity, area, health, or repair priority operationally.
9. Add automated unit/integration tests, linting, CI, backend health checks, and clean-install documentation.
10. Remove or implement advertised features: browser fallback, heatmap, model metadata, real status/FPS, and actual ranking.

## Minimum acceptance criteria for re-review

- No secrets in source, history, or client bundles; cloud calls use a server-side or explicitly scoped credential strategy.
- Fresh checkout can install dependencies, obtain the declared model artifact, start backend/frontend, and pass a smoke test.
- Backend rejects oversized/invalid requests, is not publicly exposed by default, and reports readiness only after model load.
- NMEA fixtures produce correct coordinates; invalid fixes are rejected.
- A slow-inference test proves no frame loss at completion and no duplicate/racy writes.
- Dedup tests cover far-apart same-time detections, close distinct potholes, transitive clusters, and repeated frame observations.
- Import/export round trips preserve valid data and reject malformed data without crashing the UI.
- Evaluation report contains model version, dataset split, precision/recall/mAP, confidence calibration, and geolocation error.

## Questions for the higher-level reviewer

1. Is this intended to remain a single-user local desktop tool, or become a multi-user municipal service?
2. Is cloud upload of dashcam frames and GPS data permitted, and what retention/consent requirements apply?
3. Which exact model artifact is authoritative: the current `best.pt`, a Roboflow model, or a future YOLOv12 model?
4. Are GPS timestamps guaranteed to be seconds from video start, or can they be absolute UTC/NMEA time?
5. Should imported records be treated as trusted operator data, or must the application defend against hostile files?
6. What accuracy and location-error thresholds are required before output can drive repair dispatch?

## Handoff summary

> Review PotholeVision AI Enterprise as a safety-adjacent pothole detection prototype. The build is green, but release is blocked by exposed client credentials, an unauthenticated wildcard-CORS inference server, non-reproducible ignored model artifacts, incorrect NMEA parsing, concurrent frame-processing/finalization races, and over-aggressive deduplication. Validate the intended deployment boundary and data-governance model first, then require the remediation and acceptance criteria above before approving operational use.
