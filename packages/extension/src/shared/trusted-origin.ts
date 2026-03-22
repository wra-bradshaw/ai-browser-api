import { RuntimeValidationError } from "@llm-bridge/contracts";

function readWindowOrigin() {
  if (
    typeof window === "undefined" ||
    typeof window.location?.origin !== "string"
  ) {
    return null;
  }

  const origin = window.location.origin;
  return origin.length > 0 && origin !== "null" ? origin : null;
}

export function requireTrustedWindowOrigin(message: string) {
  const origin = readWindowOrigin();
  if (origin) {
    return origin;
  }

  throw new RuntimeValidationError({
    message,
  });
}

export function getTrustedWindowOrigin() {
  return readWindowOrigin();
}
