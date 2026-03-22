import { describe, expect, it } from "vitest";
import { resolveAdapterForProvider } from "./index";

describe("resolveAdapterForProvider", () => {
  it("falls back to the generic Google SDK adapter when no provider override exists", () => {
    const adapter = resolveAdapterForProvider({
      providerID: "google",
      source: {
        id: "google",
        name: "Google",
        models: {
          "gemini-2.5-pro": {
            provider: {
              npm: "@ai-sdk/google",
            },
          },
        },
      } as never,
    });

    expect(adapter?.key).toBe("@ai-sdk/google");
  });

  it("does not resolve a removed GitLab adapter", () => {
    const adapter = resolveAdapterForProvider({
      providerID: "gitlab",
      source: {
        id: "gitlab",
        name: "GitLab",
        npm: "@gitlab/gitlab-ai-provider",
        models: {
          "duo-chat-gpt-5-mini": {
            provider: {
              npm: "@gitlab/gitlab-ai-provider",
            },
          },
        },
      } as never,
    });

    expect(adapter).toBeUndefined();
  });
});
