import {
  createMutationResource,
  type MutationResource,
} from "@llm-bridge/reactive-core";
import type * as Effect from "effect/Effect";
import {
  cancelRuntimeProviderAuthFlow,
  disconnectRuntimeProvider,
  openRuntimeProviderAuthWindow,
  resolveRuntimePermissionRequest,
  setRuntimeOriginEnabled,
  startRuntimeProviderAuthFlow,
  updateRuntimeModelPermission,
  type PermissionDecision,
} from "@/app/api/runtime-api";
import { extensionReactiveRuntime } from "@/app/state/atom-runtime";

type AppMutationResource<Input, Output> = MutationResource<Input, Output, unknown>;

export const openProviderAuthWindowMutation: AppMutationResource<
  { providerID: string },
  Effect.Effect.Success<ReturnType<typeof openRuntimeProviderAuthWindow>>
> = createMutationResource(
  extensionReactiveRuntime,
  {
    run: ({ providerID }: { providerID: string }) =>
      openRuntimeProviderAuthWindow({
        providerID,
      }),
  },
);

export const disconnectProviderMutation: AppMutationResource<
  { providerID: string },
  Effect.Effect.Success<ReturnType<typeof disconnectRuntimeProvider>>
> = createMutationResource(
  extensionReactiveRuntime,
  {
    run: ({ providerID }: { providerID: string }) =>
      disconnectRuntimeProvider({
        providerID,
      }),
  },
);

export const startProviderAuthFlowMutation: AppMutationResource<
  {
    providerID: string;
    methodID: string;
    values?: Record<string, string>;
  },
  Effect.Effect.Success<ReturnType<typeof startRuntimeProviderAuthFlow>>
> = createMutationResource(
  extensionReactiveRuntime,
  {
    run: ({
      methodID,
      providerID,
      values,
    }: {
      providerID: string;
      methodID: string;
      values?: Record<string, string>;
    }) =>
      startRuntimeProviderAuthFlow({
        providerID,
        methodID,
        values,
      }),
  },
);

export const cancelProviderAuthFlowMutation: AppMutationResource<
  {
    providerID: string;
    reason?: string;
  },
  Effect.Effect.Success<ReturnType<typeof cancelRuntimeProviderAuthFlow>>
> = createMutationResource(
  extensionReactiveRuntime,
  {
    run: ({
      providerID,
      reason,
    }: {
      providerID: string;
      reason?: string;
    }) =>
      cancelRuntimeProviderAuthFlow({
        providerID,
        reason,
      }),
  },
);

export const setOriginEnabledMutation: AppMutationResource<
  {
    enabled: boolean;
    origin: string;
  },
  Effect.Effect.Success<ReturnType<typeof setRuntimeOriginEnabled>>
> = createMutationResource(
  extensionReactiveRuntime,
  {
    run: ({
      enabled,
      origin,
    }: {
      enabled: boolean;
      origin: string;
    }) =>
      setRuntimeOriginEnabled({
        enabled,
        origin,
      }),
  },
);

export const updateModelPermissionMutation: AppMutationResource<
  {
    modelId: string;
    origin: string;
    status: "allowed" | "denied" | "implicit";
  },
  Effect.Effect.Success<ReturnType<typeof updateRuntimeModelPermission>>
> = createMutationResource(
  extensionReactiveRuntime,
  {
    run: ({
      modelId,
      origin,
      status,
    }: {
      modelId: string;
      origin: string;
      status: "allowed" | "denied" | "implicit";
    }) =>
      updateRuntimeModelPermission({
        modelId,
        origin,
        status,
      }),
  },
);

export const resolvePermissionDecisionMutation: AppMutationResource<
  {
    requestId: string;
    decision: PermissionDecision;
    origin: string;
  },
  Effect.Effect.Success<ReturnType<typeof resolveRuntimePermissionRequest>>
> = createMutationResource(
  extensionReactiveRuntime,
  {
    run: ({
      decision,
      requestId,
    }: {
      requestId: string;
      decision: PermissionDecision;
      origin: string;
    }) =>
      resolveRuntimePermissionRequest({
        requestId,
        decision,
      }),
  },
);
