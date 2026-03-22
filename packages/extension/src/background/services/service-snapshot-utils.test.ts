import { describe, expect, it } from "vitest";
import * as Equivalence from "effect/Equivalence";
import {
  readonlyMapEquivalence,
  replaceMapEntryIfEquivalent,
} from "./service-snapshot-utils";

describe("service-snapshot-utils", () => {
  it("reuses the current map when an updated entry is equivalent", () => {
    const current = new Map([
      [
        "openai",
        {
          id: "openai",
          values: ["oauth"],
        },
      ],
    ]);
    const valueEquivalence = Equivalence.struct({
      id: Equivalence.string,
      values: Equivalence.array(Equivalence.string),
    });

    const next = replaceMapEntryIfEquivalent(
      current,
      "openai",
      {
        id: "openai",
        values: ["oauth"],
      },
      valueEquivalence,
    );

    expect(next).toBe(current);
    expect(
      readonlyMapEquivalence(valueEquivalence)(current, next),
    ).toBe(true);
  });
});
