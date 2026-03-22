import { RuntimeValidationError } from "@llm-bridge/contracts";
import * as Stream from "effect/Stream";
import { getRuntimePublicRPC } from "@/content/bridge/runtime-public-rpc-client";
import { requireTrustedWindowOrigin } from "@/shared/trusted-origin";

export function currentOrigin() {
  return requireTrustedWindowOrigin(
    "Extension content runtime API requires a trusted browser window origin.",
  );
}

function isDisabledOriginError(error: unknown) {
  return (
    error instanceof RuntimeValidationError &&
    /^Origin .* is disabled$/.test(error.message)
  );
}

export function streamContentOriginState(origin = currentOrigin()) {
  const runtime = getRuntimePublicRPC();
  return runtime.streamOriginState({ origin }).pipe(
    Stream.catchAll((error) =>
      isDisabledOriginError(error) ? Stream.empty : Stream.fail(error),
    ),
  );
}

export function streamContentPendingRequests(origin = currentOrigin()) {
  const runtime = getRuntimePublicRPC();
  return runtime.streamPending({ origin }).pipe(
    Stream.catchAll((error) =>
      isDisabledOriginError(error) ? Stream.empty : Stream.fail(error),
    ),
  );
}
