import { BoundingBox, PotholeRecord } from '../types/pothole';
import { calculateIoU } from '../utils/geoDeduplication';

export interface PotholeTrack {
  record: PotholeRecord;
  lastBoundingBox: BoundingBox;
  lastSeenVideoTime: number;
  lastFrameId: number;
}

const MAX_TRACK_GAP_SECONDS = 1.2;
const MIN_TRACK_IOU = 0.08;
const MAX_NEARBY_CENTER_DISTANCE = 0.07;

function centerDistance(a: BoundingBox, b: BoundingBox): number {
  const aX = a.x + a.width / 2;
  const aY = a.y + a.height / 2;
  const bX = b.x + b.width / 2;
  const bY = b.y + b.height / 2;
  return Math.hypot(aX - bX, aY - bY);
}

function hasComparableArea(a: BoundingBox, b: BoundingBox): boolean {
  const aArea = a.width * a.height;
  const bArea = b.width * b.height;
  if (aArea <= 0 || bArea <= 0) return false;
  const ratio = bArea / aArea;
  return ratio >= 0.5 && ratio <= 2;
}

/**
 * Finds one eligible visual track for a detection. GPS is deliberately excluded: every object
 * visible in a frame has the same camera coordinate and would otherwise be collapsed.
 */
export function findBestTrackMatch(
  tracks: PotholeTrack[],
  box: BoundingBox,
  videoTime: number,
  frameId: number
): number {
  let bestIndex = -1;
  let bestScore = -1;

  tracks.forEach((track, index) => {
    if (track.lastFrameId === frameId) return;

    const timeGap = videoTime - track.lastSeenVideoTime;
    if (timeGap < 0 || timeGap > MAX_TRACK_GAP_SECONDS) return;

    const overlap = calculateIoU(track.lastBoundingBox, box);
    const nearby = centerDistance(track.lastBoundingBox, box) <= MAX_NEARBY_CENTER_DISTANCE
      && hasComparableArea(track.lastBoundingBox, box)
      && timeGap <= 0.7;

    if (overlap < MIN_TRACK_IOU && !nearby) return;

    const score = overlap + (nearby ? 0.05 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}
