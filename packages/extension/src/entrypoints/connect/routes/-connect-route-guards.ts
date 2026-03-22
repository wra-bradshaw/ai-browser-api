import { redirect } from "@tanstack/react-router";
import * as Effect from "effect/Effect";
import type { RuntimeAuthFlowSnapshot } from "@llm-bridge/contracts";
import { getRuntimeProviderAuthFlow } from "@/app/api/runtime-api";

type ConnectRouteResolution =
  | { kind: "render" }
  | { kind: "redirect-chooser" }
  | { kind: "redirect-success" }
  | { kind: "redirect-method"; methodID: string };

async function loadProviderAuthFlow(providerID: string) {
  return await Effect.runPromise(
    getRuntimeProviderAuthFlow({
      providerID,
    }),
  );
}

function throwRedirectForResolution(
  providerID: string,
  resolution: ConnectRouteResolution,
) {
  switch (resolution.kind) {
    case "render":
      return;
    case "redirect-chooser":
      throw redirect({
        to: "/providers/$providerID",
        params: {
          providerID,
        },
        replace: true,
      });
    case "redirect-success":
      throw redirect({
        to: "/providers/$providerID/success",
        params: {
          providerID,
        },
        replace: true,
      });
    case "redirect-method":
      throw redirect({
        to: "/providers/$providerID/methods/$methodID",
        params: {
          providerID,
          methodID: resolution.methodID,
        },
        replace: true,
      });
  }
}

export async function runConnectRouteGuard(
  providerID: string,
  resolve: (flow: RuntimeAuthFlowSnapshot) => ConnectRouteResolution,
) {
  const flow = await loadProviderAuthFlow(providerID);
  const resolution = resolve(flow);

  throwRedirectForResolution(providerID, resolution);
}
