import { useRef } from "react";

interface StableSortedIdsState {
  resetKey: string;
  orderedIds: ReadonlyArray<string>;
}

export function sortIds<T>(
  items: ReadonlyArray<T>,
  getId: (item: T) => string,
  compareFn: (a: T, b: T) => number,
) {
  return [...items].sort(compareFn).map(getId);
}

export function reconcileIds<T>(
  items: ReadonlyArray<T>,
  getId: (item: T) => string,
  previousIds: ReadonlyArray<string>,
) {
  const nextIds = items.map(getId);
  const nextIdSet = new Set(nextIds);
  const retainedIds = previousIds.filter((id) => nextIdSet.has(id));
  const retainedIdSet = new Set(retainedIds);
  const appendedIds = nextIds.filter((id) => !retainedIdSet.has(id));

  return [...retainedIds, ...appendedIds];
}

export function useStableSortedIds<T>(
  items: ReadonlyArray<T>,
  getId: (item: T) => string,
  compareFn: (a: T, b: T) => number,
  resetKey: string,
) {
  const stateRef = useRef<StableSortedIdsState | undefined>(undefined);

  const orderedIds =
    stateRef.current?.resetKey === resetKey
      ? reconcileIds(items, getId, stateRef.current.orderedIds)
      : sortIds(items, getId, compareFn);

  stateRef.current = {
    resetKey,
    orderedIds,
  };

  return orderedIds;
}
