import { describe, expect, it } from "vitest";
import {
  resolveChooserRouteRedirect,
  resolveMethodRouteRedirect,
  resolveSuccessRouteRedirect,
} from "@/popup/features/providers/connect-provider-route";

const baseFlow = {
  providerID: "openai",
  status: "idle",
  methods: [
    {
      id: "apiKey",
      label: "API Key",
      type: "apikey",
      fields: [],
    },
    {
      id: "oauth-browser",
      label: "OAuth",
      type: "oauth",
      fields: [],
    },
  ],
  updatedAt: 1,
  canCancel: false,
} as const;

describe("connect provider route redirects", () => {
  it("renders the chooser route when no redirect is needed", () => {
    expect(
      resolveChooserRouteRedirect({
        flow: baseFlow,
      }),
    ).toEqual({
      kind: "render",
    });
  });

  it("redirects the chooser route to the running method while authorizing", () => {
    expect(
      resolveChooserRouteRedirect({
        flow: {
          ...baseFlow,
          status: "authorizing",
          runningMethodID: "oauth-browser",
          canCancel: true,
        },
      }),
    ).toEqual({
      kind: "redirect-method",
      methodID: "oauth-browser",
    });
  });

  it("redirects the chooser route to success when the flow is complete", () => {
    expect(
      resolveChooserRouteRedirect({
        flow: {
          ...baseFlow,
          status: "success",
        },
      }),
    ).toEqual({
      kind: "redirect-success",
    });
  });

  it("renders a valid method route", () => {
    expect(
      resolveMethodRouteRedirect({
        routeMethodID: "oauth-browser",
        flow: baseFlow,
      }),
    ).toEqual({
      kind: "render",
    });
  });

  it("redirects an out-of-date method route to the running method", () => {
    expect(
      resolveMethodRouteRedirect({
        routeMethodID: "apiKey",
        flow: {
          ...baseFlow,
          status: "authorizing",
          runningMethodID: "oauth-browser",
          canCancel: true,
        },
      }),
    ).toEqual({
      kind: "redirect-method",
      methodID: "oauth-browser",
    });
  });

  it("redirects an invalid method route back to the chooser", () => {
    expect(
      resolveMethodRouteRedirect({
        routeMethodID: "missing",
        flow: baseFlow,
      }),
    ).toEqual({
      kind: "redirect-chooser",
    });
  });

  it("redirects the method route to success when the flow is complete", () => {
    expect(
      resolveMethodRouteRedirect({
        routeMethodID: "oauth-browser",
        flow: {
          ...baseFlow,
          status: "success",
        },
      }),
    ).toEqual({
      kind: "redirect-success",
    });
  });

  it("keeps the success route when the flow is complete", () => {
    expect(
      resolveSuccessRouteRedirect({
        flow: {
          ...baseFlow,
          status: "success",
        },
      }),
    ).toEqual({
      kind: "render",
    });
  });

  it("redirects the success route back to the active method when auth is in progress", () => {
    expect(
      resolveSuccessRouteRedirect({
        flow: {
          ...baseFlow,
          status: "authorizing",
          runningMethodID: "oauth-browser",
          canCancel: true,
        },
      }),
    ).toEqual({
      kind: "redirect-method",
      methodID: "oauth-browser",
    });
  });

  it("redirects the success route back to the chooser when no success is present", () => {
    expect(
      resolveSuccessRouteRedirect({
        flow: baseFlow,
      }),
    ).toEqual({
      kind: "redirect-chooser",
    });
  });
});
