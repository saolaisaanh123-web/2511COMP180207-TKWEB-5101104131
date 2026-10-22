import { contentKey, type Schedule, type State } from "./core";

const historyVersions = new WeakMap<
  State,
  {
    history: State["history"];
    count: number;
    groups: Map<string, Set<string>>;
  }
>();
const reviewKey = (id: string, skill: number, time: number) =>
  JSON.stringify([id, skill, time]);
function versionsAtLast(
  source: State,
  id: string,
  skill: number,
  time: number,
) {
  let cached = historyVersions.get(source);
  if (
    !cached ||
    cached.history !== source.history ||
    cached.count !== source.history.length
  ) {
    const groups = new Map<string, Set<string>>();
    for (const r of source.history) {
      if (
        r.scheduled === false ||
        r.method === "ungraded" ||
        r.contentVersion === undefined
      )
        continue;
      const key = reviewKey(r.wordId, r.skill, r.time);
      const versions = groups.get(key) || new Set<string>();
      versions.add(r.contentVersion);
      groups.set(key, versions);
    }
    cached = { history: source.history, count: source.history.length, groups };
    historyVersions.set(source, cached);
  }
  return cached.groups.get(reviewKey(id, skill, time));
}

/** Associate an older, unstamped schedule with its own vocabulary snapshot,
 * never with whichever meaning happens to win a later merge. */
export function scheduleForEntries(
  source: State,
  key: string,
  entries: State["entries"],
): Schedule | undefined {
  const schedule = source.schedules[key];
  if (!schedule) return undefined;
  const boundary = key.lastIndexOf(":"),
    id = key.slice(0, boundary),
    skill = Number(key.slice(boundary + 1));
  if (
    boundary < 1 ||
    !/^[0-5]$/.test(key.slice(boundary + 1)) ||
    !Object.hasOwn(source.entries, id) ||
    !Object.hasOwn(entries, id)
  )
    return undefined;
  const sourceVersion = contentKey(source.entries[id].word, skill),
    targetVersion = contentKey(entries[id].word, skill);
  if (sourceVersion !== targetVersion) return undefined;
  if (schedule.contentVersion !== undefined)
    return schedule.contentVersion === targetVersion ? schedule : undefined;

  // Legacy snapshots usually have no version on the schedule, but do have a
  // versioned result for the review that set `last`. A known disagreement must
  // not be hidden by assigning the current word's version during migration.
  const versions = versionsAtLast(source, id, skill, schedule.last);
  if (versions && [...versions].some((version) => version !== sourceVersion))
    return undefined;
  return schedule;
}

/** Keep old valid schedules byte-for-byte; stamp new reviews in record(). */
export function compatibleSchedules(
  source: State,
  entries: State["entries"] = source.entries,
): State["schedules"] {
  const result: State["schedules"] = {};
  for (const key of Object.keys(source.schedules)) {
    const schedule = scheduleForEntries(source, key, entries);
    if (schedule) result[key] = structuredClone(schedule);
  }
  return result;
}

/** Backup union keeps current schedules first, while legacy backup schedules
 * remain bound to the backup's own sense/POS/examples. Histories are untouched. */
export function mergeBackupSchedules(
  current: State,
  backup: State,
  entries: State["entries"] = { ...backup.entries, ...current.entries },
): State["schedules"] {
  const result = compatibleSchedules(current, entries);
  for (const key of Object.keys(backup.schedules)) {
    if (Object.hasOwn(result, key)) continue;
    const schedule = scheduleForEntries(backup, key, entries);
    if (schedule) result[key] = structuredClone(schedule);
  }
  return result;
}
