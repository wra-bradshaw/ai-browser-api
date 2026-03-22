import type { RuntimeAuthFlowSnapshot } from "@llm-bridge/contracts";

export function resolveChooserRouteRedirect(input: {
  flow: RuntimeAuthFlowSnapshot;
}) {
  if (
    input.flow.status === "authorizing" &&
    input.flow.runningMethodID != null
  ) {
    return {
      kind: "redirect-method" as const,
      methodID: input.flow.runningMethodID,
    };
  }

  if (input.flow.status === "success") {
    return {
      kind: "redirect-success" as const,
    };
  }

  return {
    kind: "render" as const,
  };
}

export function resolveMethodRouteRedirect(input: {
  routeMethodID: string;
  flow: RuntimeAuthFlowSnapshot;
}) {
  if (input.flow.status === "success") {
    return {
      kind: "redirect-success" as const,
    };
  }

  if (
    input.flow.status === "authorizing" &&
    input.flow.runningMethodID != null &&
    input.flow.runningMethodID !== input.routeMethodID
  ) {
    return {
      kind: "redirect-method" as const,
      methodID: input.flow.runningMethodID,
    };
  }

  const routeMethodExists = input.flow.methods.some(
    (method) => method.id === input.routeMethodID,
  );

  if (!routeMethodExists) {
    return {
      kind: "redirect-chooser" as const,
    };
  }

  return {
    kind: "render" as const,
  };
}

export function resolveSuccessRouteRedirect(input: {
  flow: RuntimeAuthFlowSnapshot;
}) {
  if (input.flow.status === "success") {
    return {
      kind: "render" as const,
    };
  }

  if (
    input.flow.status === "authorizing" &&
    input.flow.runningMethodID != null
  ) {
    return {
      kind: "redirect-method" as const,
      methodID: input.flow.runningMethodID,
    };
  }

  return {
    kind: "redirect-chooser" as const,
  };
}
