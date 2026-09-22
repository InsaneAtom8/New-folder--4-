# Pothole video undercount: diagnosis and implementation plan

**Video analysed:** `/Users/apurv/Downloads/pothole video-1.mp4`  
**Duration / format:** 27.68 seconds, 1280×720, 25 fps  
**Current sampling configuration:** 0.3 seconds; this video yields 87 sampled frames at the effective 0.32-second frame step.

## Confirmed result

The current result of roughly 4–6 saved potholes is reproducible from the supplied video. It is mainly caused by the application's post-processing collapsing many model observations into a few records.

| Pipeline stage | Current count at 40% UI confidence |
|---|---:|
| Raw local-model boxes, sampled frames | 52 |
| After frontend NMS | 50 |
| Live records/tracks before final deduplication | 11 |
| Saved records after final deduplication | 4 |

The visual frame at 9.60 seconds alone contains several clearly separate road defects. The app receives three boxes above 40% in that frame, reduces them to two via frontend NMS, and then can merge those with other defects that share the camera location.

## Root cause, in order of impact

### 1. Final deduplication merges unrelated potholes by time alone

`src/utils/geoDeduplication.ts:139-145` merges records whenever their video offsets are less than eight seconds apart, even when they are geographically far apart or visually distinct.

At the generated 35 km/h fallback speed, eight seconds represents roughly 78 metres of movement. This rule causes unrelated potholes seen close together in the video to collapse. Replaying this video gives four final records from 11 pre-deduplication tracks.

### 2. Live tracking treats every pothole in one frame as the same object

`src/components/Detector/DetectionCanvas.tsx:169-179` considers a record matched when its GPS distance is at most eight metres. All boxes in one frame share the dashcam's GPS coordinate, so after the first new pothole is created, other simultaneously visible potholes match it regardless of where they appear in the image.

This is why the 50 post-NMS observations become only 11 tracks before final deduplication.

### 3. Frontend NMS merges boxes that do not overlap

`src/utils/geoDeduplication.ts:74-94` merges boxes when their normalized center distance is under 0.18, even at zero IoU. It also expands and caps the resulting box dimensions.

In this video, that removes an extra box at 9.60 seconds and 24.64 seconds. This is smaller than the two tracking/deduplication faults, but it loses close potholes and corrupts their geometry.

### 4. The 40% UI confidence threshold removes most model candidates

The server returns 148 boxes at its configured 20% threshold. The frontend's 40% cutoff retains only 52.

This matters, especially for small or distant potholes. However, lowering the threshold alone does not solve the result count: replaying the same frames at thresholds from 20% through 35% still produces only 4–5 final records because the tracking and final merge rules collapse them.

| UI threshold | Raw boxes retained | Boxes after frontend NMS | Live tracks | Final saved records |
|---:|---:|---:|---:|---:|
| 20% | 148 | 137 | 21 | 5 |
| 25% | 120 | 110 | 18 | 5 |
| 30% | 92 | 86 | 18 | 5 |
| 35% | 65 | 63 | 12 | 4 |
| 40% (current) | 52 | 50 | 11 | 4 |

The raw count is not the real pothole count; lower-confidence boxes need validation because they may include false positives. The table proves that record merging, rather than the threshold alone, produces the 4–6 result.

## Implementation plan

### Phase 1 — Stop destructive box suppression

Files: `src/utils/geoDeduplication.ts`, `src/services/potholeDetector.ts`.

1. Define one bounding-box convention: normalized top-left `x`, `y`, `width`, `height`.
2. Replace `applyNMSBoundingBoxes` with standard class-aware IoU-only NMS. Remove the `centerDist < 0.18` condition, box-union expansion, and arbitrary width/height caps.
3. Keep the backend's detector NMS as the first layer and make the frontend NMS conservative; inspect raw/model output before retaining a second suppression pass.
4. Add unit tests for non-overlapping close boxes, overlapping duplicate boxes, border clipping, and confidence ordering.

Acceptance: two close but non-overlapping potholes always remain two detections; true duplicate boxes collapse to one without changing the selected box's geometry.

### Phase 2 — Replace GPS-only matching with one-to-one visual tracking

Files: add `src/services/potholeTracker.ts`; update `src/components/Detector/DetectionCanvas.tsx` and `src/types/pothole.ts`.

1. Create an internal track model with `runId`, `trackId`, `lastBoundingBox`, `lastSeenVideoTime`, `bestObservation`, and observation count.
2. For each sampled frame, match current boxes only to recently active tracks using image evidence: IoU, normalized center displacement, box-scale change, and elapsed time.
3. Use one-to-one assignment: each track receives at most one detection per frame and each unmatched detection creates its own track.
4. Never use the shared camera GPS coordinate by itself to identify a pothole. Keep it as location context for the observation.
5. Allow a short, configurable occlusion window; expire a track only after it is absent for several samples.

Acceptance: two potholes in one frame create two IDs, later frames update the corresponding ID, and two separate same-frame boxes cannot merge merely because they share GPS.

### Phase 3 — Remove time-only final merging

Files: `src/utils/geoDeduplication.ts`, `src/db/potholeDb.ts`, `src/context/PotholeContext.tsx`.

1. Persist one finalized record per visual track; do not run a second destructive deduplication pass on records from the same run.
2. Remove the `timeDiff < 8` merge rule entirely.
3. Keep manual cross-run deduplication separate from tracking. It should identify candidates for review, not automatically merge records solely by distance or timestamp.
4. Add provenance to every record: run ID, source video offset, primary bounding box, observation count, and optional evidence frame ID.
5. Preserve existing records during the migration. Records already merged from prior runs cannot be safely split without reprocessing their original video.

Acceptance: the supplied video retains all independently tracked potholes after completion, IndexedDB reload, and a manual deduplication action.

### Phase 4 — Make frame processing deterministic

Files: `DetectionCanvas.tsx`, `potholeDetector.ts`, `roboflowService.ts`.

1. Capture an immutable image/frame ID, timestamp, and GPS snapshot before starting inference.
2. Process sampled frames through a bounded single-flight queue so asynchronous responses cannot race or overwrite another frame's canvas.
3. Wait for pending inference, tracking, reverse geocoding, and IndexedDB writes before declaring analysis complete.
4. Add request timeout and cancellation handling when an upload is replaced or the user leaves the detector.
5. Generate snapshots from the immutable source frame. Store either a per-pothole crop with padding or a full frame with the selected box drawn in.

Acceptance: slow model responses cannot attach a result to another frame, and ending the video cannot drop the last detections.

### Phase 5 — Calibrate detection sensitivity against labelled evidence

Files: new private test-fixture manifest and evaluation script; detector settings.

1. Manually label the supplied video with distinct pothole identities and first/last visible frames. Keep the original video outside git if it is not licensed for repository storage.
2. Run an offline evaluation at candidate confidence thresholds (20%, 25%, 30%, 35%, and 40%) after phases 1–4 are complete.
3. Measure per-pothole recall, precision, false-positive count, duplicate-track count, merge error count, and latency.
4. Set the default threshold from those measurements. Do not lower it blindly: use temporal track confirmation, such as requiring a low-confidence candidate to recur in two nearby frames, to increase recall without accepting every one-frame false positive.
5. Save the selected threshold, model artifact checksum, input resolution, sampling interval, and evaluation results with the release.

Acceptance: a labelled-video report demonstrates the agreed recall/precision target and reports the exact retained count rather than a hardcoded estimate.

## Regression test matrix

| Case | Required result |
|---|---|
| Two close non-overlapping boxes | Two detections and two tracks |
| Duplicate boxes over one pothole | One detection after IoU NMS |
| Two potholes in one frame, same GPS | Two persisted records |
| Multiple nearby potholes over eight seconds | Separate records unless visual tracking identifies the same object |
| One pothole across successive frames | One track, best evidence retained |
| Model response slower than sample interval | Ordered processing; no lost final detections |
| End of video with inference in flight | Queue drains before saving/completion |
| Low-confidence box repeated over frames | Confirmed or rejected by the documented temporal rule |
| Imported legacy records | No unintended automatic merge |

## Delivery order

1. Merge-safe NMS and tests.
2. Visual tracker, queue, finalization, and persistence changes with mocked-inference integration tests.
3. Snapshot/crop correctness and user-facing counts.
4. Labelled-video evaluation, threshold selection, and an end-to-end replay of `pothole video-1.mp4`.

Do not treat a final count of 4–6 as model performance until this pipeline is corrected. The current code demonstrably produces that number by collapsing detections after inference.
