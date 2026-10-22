import type { Result, State } from "./core";

/** Immutable observations supplement the legacy latest-time map. They carry
 * no answer text and can be unioned safely after offline work on two devices. */
export type ExposureEvent = {
  id: string;
  wordId: string;
  time: number;
  /** A recorded answer also exposes its word; exclude that event from itself. */
  resultId?: string;
};

const isTime = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

export function validateExposureEvents(state: {
  entries: Record<string, unknown>;
  exposureEvents?: unknown;
}) {
  if (state.exposureEvents === undefined) return;
  if (!Array.isArray(state.exposureEvents))
    throw Error("Lịch sử tiếp xúc không hợp lệ.");
  const ids = new Set<string>();
  for (const value of state.exposureEvents) {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw Error("Sự kiện tiếp xúc không hợp lệ.");
    const event = value as Partial<ExposureEvent>;
    if (
      typeof event.id !== "string" ||
      !event.id ||
      ids.has(event.id) ||
      typeof event.wordId !== "string" ||
      !Object.hasOwn(state.entries, event.wordId) ||
      !isTime(event.time) ||
      (event.resultId !== undefined &&
        (typeof event.resultId !== "string" || !event.resultId))
    )
      throw Error("Sự kiện tiếp xúc không hợp lệ.");
    ids.add(event.id);
  }
}

const sameEvent = (left: ExposureEvent, right: ExposureEvent) =>
  left.id === right.id &&
  left.wordId === right.wordId &&
  left.time === right.time &&
  left.resultId === right.resultId;

/** A colliding immutable ID cannot silently turn one observation into another. */
export function mergeExposureEvents(
  ...collections: (readonly ExposureEvent[] | undefined)[]
): ExposureEvent[] | undefined {
  if (collections.every((items) => items === undefined)) return undefined;
  const records = new Map<string, ExposureEvent>();
  for (const items of collections) {
    for (const event of items || []) {
      const existing = records.get(event.id);
      if (existing && !sameEvent(existing, event))
        throw Error("ID sự kiện tiếp xúc trùng nhưng nội dung khác nhau.");
      if (!existing) records.set(event.id, { ...event });
    }
  }
  return [...records.values()].sort(
    (a, b) => a.time - b.time || a.id.localeCompare(b.id),
  );
}

export function appendExposureEvent(state: State, event: ExposureEvent): State {
  if (!Object.hasOwn(state.entries, event.wordId)) return state;
  validateExposureEvents({ entries: state.entries, exposureEvents: [event] });
  return {
    ...state,
    exposureEvents: mergeExposureEvents(state.exposureEvents, [event]),
    exposures: {
      ...state.exposures,
      [event.wordId]: Math.max(
        state.exposures?.[event.wordId] || 0,
        event.time,
      ),
    },
  };
}

/** Preserve a legacy device's latest observation before a merge takes the
 * maximum timestamp. An answer-derived timestamp belongs to that answer, not
 * a second sighting of the same word at the same millisecond. */
export function exposureEventsForSnapshot(
  state: State,
): ExposureEvent[] | undefined {
  const additions: ExposureEvent[] = [];
  const explicit = new Set(
    (state.exposureEvents || []).map((event) =>
      JSON.stringify([event.wordId, event.time]),
    ),
  );
  const resultsAt = new Map<string, Result[]>();
  for (const result of state.history) {
    const key = JSON.stringify([result.wordId, result.time]);
    const group = resultsAt.get(key) || [];
    group.push(result);
    resultsAt.set(key, group);
  }
  for (const [wordId, time] of Object.entries(state.exposures || {})) {
    const point = JSON.stringify([wordId, time]);
    if (
      !Object.hasOwn(state.entries, wordId) ||
      !isTime(time) ||
      explicit.has(point)
    )
      continue;
    const answers = resultsAt.get(point);
    if (answers?.length) {
      for (const answer of answers)
        additions.push({
          id: `legacy-result:${JSON.stringify([wordId, time, answer.id])}`,
          wordId,
          time,
          resultId: answer.id,
        });
    } else
      additions.push({
        id: `legacy-view:${point}`,
        wordId,
        time,
      });
  }
  return mergeExposureEvents(
    state.exposureEvents,
    additions.length ? additions : undefined,
  );
}

type Observation = { time: number; resultId?: string };
type ObservationIndex = {
  history: State["history"];
  historyLength: number;
  events: State["exposureEvents"];
  eventsLength: number;
  byWord: Map<string, Observation[]>;
};
const indexes = new WeakMap<State, ObservationIndex>();
function observationIndex(state: State) {
  const cached = indexes.get(state);
  if (
    cached &&
    cached.history === state.history &&
    cached.events === state.exposureEvents &&
    cached.historyLength === state.history.length &&
    cached.eventsLength === (state.exposureEvents?.length || 0)
  )
    return cached.byWord;
  const index = new Map<string, Observation[]>();
  const add = (wordId: string, point: Observation) => {
    if (!isTime(point.time)) return;
    const values = index.get(wordId) || [];
    values.push(point);
    index.set(wordId, values);
  };
  for (const event of state.exposureEvents || [])
    add(event.wordId, { time: event.time, resultId: event.resultId });
  for (const result of state.history)
    add(result.wordId, { time: result.time, resultId: result.id });
  for (const values of index.values()) values.sort((a, b) => a.time - b.time);
  indexes.set(state, {
    history: state.history,
    historyLength: state.history.length,
    events: state.exposureEvents,
    eventsLength: state.exposureEvents?.length || 0,
    byWord: index,
  });
  return index;
}

/** Reconcile derived evidence against the combined observation chronology.
 * Never rewrite a saved answer, promote non-independent work, or fabricate a
 * missing legacy gap. A new observation may only shorten the saved interval. */
export function deriveResultExposure(
  state: State,
  result: Result,
): { independent: boolean; exposureGap?: number } {
  const observations = observationIndex(state).get(result.wordId) || [];
  let left = 0,
    right = observations.length;
  while (left < right) {
    const middle = (left + right) >>> 1;
    if (observations[middle].time <= result.time) left = middle + 1;
    else right = middle;
  }
  let previous: number | undefined;
  for (let i = left - 1; i >= 0; i--) {
    if (observations[i].resultId === result.id) continue;
    previous = observations[i].time;
    break;
  }
  // Equal legacy timestamps usually describe this answer's own exposure.
  // Distinct same-time observations are handled explicitly by the event log.
  const latestLegacy = state.exposures?.[result.wordId];
  if (isTime(latestLegacy) && latestLegacy < result.time)
    previous = Math.max(previous ?? 0, latestLegacy);
  const observedGap =
    previous === undefined ? undefined : Math.max(0, result.time - previous);
  const savedGap = isTime(result.exposureGap) ? result.exposureGap : undefined;
  const exposureGap =
    savedGap === undefined
      ? undefined
      : observedGap === undefined
        ? savedGap
        : Math.min(savedGap, observedGap);
  return {
    independent:
      result.independent === true &&
      result.first &&
      !result.hint &&
      (observedGap === undefined || observedGap >= 86_400_000) &&
      (exposureGap === undefined || exposureGap >= 86_400_000),
    exposureGap,
  };
}
