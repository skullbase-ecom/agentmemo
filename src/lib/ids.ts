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
