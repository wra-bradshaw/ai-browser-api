import { combineQueryStates, createStreamResource, useQueryResourceState } from "@llm-bridge/reactive-core";
import {
  streamContentOriginState,
  streamContentPendingRequests,
} from "@/content/api/runtime-public-api";
import { contentReactiveRuntime } from "@/content/state/runtime-public-atom-runtime";

function buildOriginStateResource(origin: string) {
  return createStreamResource(contentReactiveRuntime, {
    load: streamContentOriginState(origin),
  });
}

function buildPendingRequestsResource(origin: string) {
  return createStreamResource(contentReactiveRuntime, {
    load: streamContentPendingRequests(origin),
  });
}

const originStateResources = new Map<
  string,
  ReturnType<typeof buildOriginStateResource>
>();
const pendingRequestsResources = new Map<
  string,
  ReturnType<typeof buildPendingRequestsResource>
>();

function getOriginStateResource(origin: string) {
  const cached = originStateResources.get(origin);
  if (cached) {
    return cached;
  }

  const resource = buildOriginStateResource(origin);
  originStateResources.set(origin, resource);
  return resource;
}

function getPendingRequestsResource(origin: string) {
  const cached = pendingRequestsResources.get(origin);
  if (cached) {
    return cached;
  }

  const resource = buildPendingRequestsResource(origin);
  pendingRequestsResources.set(origin, resource);
  return resource;
}

export function useFloatingPermissionData(origin: string) {
  return combineQueryStates({
    originState: useQueryResourceState(getOriginStateResource(origin)),
    pendingRequests: useQueryResourceState(getPendingRequestsResource(origin)),
  });
}
