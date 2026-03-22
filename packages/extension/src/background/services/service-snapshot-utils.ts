import * as Equivalence from "effect/Equivalence";
import * as Stream from "effect/Stream";

export function readonlyMapEquivalence<K, V>(
  valueEquivalence: Equivalence.Equivalence<V>,
): Equivalence.Equivalence<ReadonlyMap<K, V>> {
  return Equivalence.make<ReadonlyMap<K, V>>((left, right) => {
    if (left.size !== right.size) {
      return false;
    }

    for (const [key, leftValue] of left.entries()) {
      if (!right.has(key)) {
        return false;
      }

      if (!valueEquivalence(leftValue, right.get(key)!)) {
        return false;
      }
    }

    return true;
  });
}

export function replaceIfEquivalent<A>(
  current: A,
  next: A,
  equivalence: Equivalence.Equivalence<A>,
) {
  return equivalence(current, next) ? current : next;
}

export function replaceMapEntryIfEquivalent<K, V>(
  current: ReadonlyMap<K, V>,
  key: K,
  nextValue: V,
  equivalence: Equivalence.Equivalence<V>,
) {
  if (current.has(key) && equivalence(current.get(key)!, nextValue)) {
    return current;
  }

  const next = new Map(current);
  next.set(key, nextValue);
  return next;
}

export function changesWithEquivalence<A>(
  equivalence: Equivalence.Equivalence<A>,
) {
  return <E, R>(stream: Stream.Stream<A, E, R>) =>
    stream.pipe(Stream.changesWith(equivalence));
}
