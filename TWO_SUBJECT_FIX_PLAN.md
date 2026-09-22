# Two-subject detection and snapshot implementation plan

Date: 2026-09-21. Scope: current PotholeVision working tree.

## Scope and diagnosis

The reported “clipping” issue is interpreted as bounding-box/snapshot behavior when two potholes are visible. No temporal video clipping, subject selection, or individual crop implementation was found. If the report concerns another application or video editing, this diagnosis needs that project's source and reproduction instead. No application implementation was changed for this investigation.

### Confirmed by executing current utility code

1. `src/utils/geoDeduplication.ts:74-94`: postprocessing merges boxes when center distance is below 0.18, even with zero intersection. Two boxes at `(0.20,0.40,0.06,0.06)` and `(0.30,0.40,0.06,0.06)` have IoU 0 but become one box of width 0.16. Arbitrary width/height caps can also truncate merged bounds. Both inference providers use this function.
2. `src/components/Detector/DetectionCanvas.tsx:168-179`: the live matcher accepts distance <=8 meters independent of box identity. Every box from a single frame shares the same camera GPS; after the first box creates a record, the second matches it even when visually separate. There is no one-to-one assignment rule.
3. `src/utils/geoDeduplication.ts:139-145`: final/manual deduplication again merges shared-position detections. It also merges unrelated records solely because their video offsets differ by less than eight seconds, without a video/run identifier. Execution confirmed both same-position records and records at (19,72) and (28,77) collapse to one.

### Additional confirmed code issues; timing effects not replayed with user video

- `DetectionCanvas.tsx:155-161`: snapshots are taken from a shared canvas after asynchronous inference. A newer request can overwrite that canvas, attaching a different frame to the returned boxes.
- `DetectionCanvas.tsx:161,206`: every subject receives the full frame image. DOM box overlays are not burned into that snapshot.
- `DetectionCanvas.tsx:181-188`: replacing the best snapshot does not replace its box/time metadata, and updates do not directly publish a new React records array.
- `DetectionCanvas.tsx:226-240`: finalization neither drains pending inference/geocoding nor waits for storage before declaring completion.

No supplied video was replayed and no model accuracy conclusion is implied. These are independently reproducible postprocessing defects; a model that emits only one raw detection requires separate evaluation.

## Implementation sequence

### 1. Preserve independent boxes

Files: `src/utils/geoDeduplication.ts`, both detector adapters, `src/types/pothole.ts`.

- Standardize the box contract as normalized top-left x/y plus width/height; fix the misleading center-coordinate type comment.
- Validate finite dimensions, intersect boxes with image bounds, and reject empty boxes.
- Replace proximity-based union with class-aware IoU suppression. Preserve the selected box's geometry; do not expand or apply arbitrary size caps.
- Inspect raw backend output against postprocessed output before tuning overlap thresholds. The local backend already applies IoU suppression; avoid unnecessarily aggressive second suppression. Calibrate on adjacent and overlapping potholes.

Acceptance: the reproduced zero-overlap pair remains two boxes, duplicate boxes collapse to one, different classes do not suppress one another, and border boxes stay inside the image.

### 2. Make frames immutable and processing ordered

Files: `src/components/Detector/DetectionCanvas.tsx`, `src/services/potholeDetector.ts`, `src/services/roboflowService.ts`; extract a processing helper.

- Capture a frame object containing runId, frameId, video offset, GPS, dimensions, and immutable image pixels/blob before inference starts. Return predictions associated with that object.
- For uploaded-video analysis, process sampled frames sequentially with playback backpressure so slow inference cannot silently skip required samples. Bound memory rather than queuing an entire video.
- Give inference a timeout and cancellation signal; invalidate results from cancelled or superseded runs.
- Commit detections before asynchronous street-name enrichment. Coalesce enrichment requests and keep their results tied to record IDs.
- Drain scheduled work, finish record persistence, then mark the run complete. Report failed/incomplete runs explicitly.

Acceptance: delayed and out-of-order mock responses cannot attach boxes to another frame; finishing during inference persists both final subjects; cancellation prevents late writes.

### 3. Track subjects with one-to-one assignments

Files: new `src/services/potholeTracker.ts`, `DetectionCanvas.tsx`, `src/types/pothole.ts`.

- Separate raw frame observations, temporal tracks, and persisted records. Add optional runId/trackId and observation metadata for legacy compatibility.
- Associate a frame's detections against the previous active tracks using class, IoU, center displacement, scale change, elapsed time, and a short motion prediction. Use a deterministic minimum-cost one-to-one assignment with explicit gates and unmatched handling.
- A track can receive at most one detection per frame. Unmatched detections create separate tracks even at identical GPS positions.
- Track last-seen geometry/time separately from the best-evidence snapshot. Retain short occlusions with a bounded expiry; do not force ambiguous matches.
- Treat camera GPS as observation context, not a ground location for each individual pothole. Record co-visible tracks as distinct evidence.

Acceptance: two visible subjects create two IDs; subsequent frames update those IDs; brief occlusion and re-entry do not collapse both subjects into one. Crossing/ambiguous cases must be evaluated and may require a stronger appearance-aware tracker.

### 4. Preserve identities through save and manual deduplication

Files: `src/utils/geoDeduplication.ts`, `src/db/potholeDb.ts`, `src/context/PotholeContext.tsx`.

- Finalize one record per track instead of clustering camera positions.
- Never merge tracks observed together in a frame. Remove time-only identity checks, especially across runs.
- Make manual cross-run deduplication conservative: geographic proximity suggests a candidate, but cannot authorize a destructive merge without supporting evidence or operator review. Keep uncertain legacy records separate.
- Preserve original IDs/provenance and repair status history when an approved merge happens. Update in-memory records by ID to match IndexedDB upsert behavior.
- Previously merged records cannot reliably recover the missing subject from stored data; reprocess original video where available.

Acceptance: two records at identical GPS survive finalization, reload, and manual deduplication; same-time detections in different cities or different runs remain distinct.

### 5. Keep each subject's evidence correctly framed

Files: a new snapshot helper, `DetectionCanvas.tsx`, map/table snapshot views, record types.

- Generate a per-subject crop from the immutable inference frame using its own box, configurable padding, and image-bound clamping. Keep an optional full-frame reference with the selected subject highlighted for context.
- Store crop, original box, frame dimensions, frame ID, offset, and confidence atomically when choosing better evidence.
- Render source frames and overlays with a shared aspect-ratio transform; test portrait and 4:3 inputs as well as 16:9. Prefer contain/letterboxing over unaccounted object-cover cropping.
- Preserve existing full-frame snapshots as a supported legacy format; identify the new evidence format explicitly.

Acceptance: two subjects get distinct crops from the correct frame, crops do not stretch or truncate at borders, and improved evidence updates all associated metadata together.

## Verification and delivery

Add a small TypeScript test runner and regression fixtures before changing the defective algorithms. Use generated frame images and mocked inference to verify exact geometry, identity, and persistence without depending on cloud inference.

Required cases: adjacent non-overlapping subjects; genuine duplicate boxes; partial overlap; shared/missing GPS; stationary camera; repeated frames; short occlusion; differing aspect ratios; edge-of-frame crops; inference slower than sampling; reverse-geocoder timeout; end-of-video pending work; cancelled runs; legacy record loading; final/manual deduplication.

Deliver in three reviewable changes: (1) box contract and suppression with tests, (2) frame scheduling/tracking/persistence with integration tests, (3) subject crops and display alignment. Run the production build and replay a representative user video after integration. The decisive check is that two independently detected subjects retain two identities and matching evidence throughout the run and after reload.

## Limits and decisions

- Do not promise exact ground coordinates from monocular boxes and a shared GPS point.
- Tracking thresholds need real footage; perfect identity through complete occlusion is not guaranteed by geometry alone.
- Full-frame context adds storage cost; choose thumbnail dimensions/quality and a storage budget during implementation.
- If “clipping” means exporting time-bounded video clips, define desired subject selection, aspect ratio, and output behavior before adding that separate feature.
