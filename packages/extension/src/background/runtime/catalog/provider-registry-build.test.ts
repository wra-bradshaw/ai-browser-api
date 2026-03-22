import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import {
  buildProviderFromSource,
  providerToRows,
} from "./provider-registry-build";

describe("providerToRows", () => {
  it("derives legacy capability tags from structured capabilities instead of model ids", () => {
    const { modelRows } = providerToRows(
      {
        id: "example",
        name: "Example",
        source: "models.dev",
        env: [],
        connected: true,
        options: {},
        models: {
          "gpt-labeled-model": {
            id: "gpt-labeled-model",
            providerID: "example",
            name: "Example Vision Model",
            status: "active",
            api: {
              id: "gpt-labeled-model",
              url: "https://example.test",
              npm: "@example/sdk",
            },
            cost: {
              input: 0,
              output: 0,
              cache: {
                read: 0,
                write: 0,
              },
            },
            limit: {
              context: 1,
              output: 1,
            },
            options: {},
            headers: {},
            capabilities: {
              temperature: true,
              reasoning: true,
              attachment: false,
              toolcall: true,
              code: false,
              input: {
                text: true,
                audio: false,
                image: true,
                video: false,
                pdf: false,
              },
              output: {
                text: true,
                audio: false,
                image: false,
                video: false,
                pdf: false,
              },
            },
          },
        },
      },
      1,
    );

    expect(modelRows[0]?.capabilities).toEqual([
      "text",
      "vision",
      "reasoning",
    ]);
  });

  it("drops blacklisted providers from the built catalog", async () => {
    const result = await Effect.runPromise(
      buildProviderFromSource({
        providerID: "gitlab",
        source: {
          id: "gitlab",
          name: "GitLab",
          npm: "@gitlab/gitlab-ai-provider",
          env: ["GITLAB_TOKEN"],
          api: "https://gitlab.com",
          models: {
            "duo-chat-gpt-5-mini": {
              id: "duo-chat-gpt-5-mini",
              name: "Agentic Chat (GPT-5 Mini)",
            },
          },
        } as never,
        authMap: {},
      }),
    );

    expect(result).toBeUndefined();
  });
});
