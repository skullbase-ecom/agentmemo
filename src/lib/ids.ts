/** Prefixed, sortable-ish unique ids for stored entities. */

function rand(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

export function memoryId(): string {
  return `mem_${rand()}`;
}

export function usageId(): string {
  return `evt_${rand()}`;
}

export function episodeId(): string {
  return `ep_${rand()}`;
}

export function eventId(): string {
  return `evt_${rand()}`;
}

export function procedureId(): string {
  return `proc_${rand()}`;
}

export function emotionId(): string {
  return `emo_${rand()}`;
}
