import { describe, expect, it, vi } from "vitest";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import { withOpenAICompatibleInlineDataUrlSupport } from "./factory-language-model";

describe("withOpenAICompatibleInlineDataUrlSupport", () => {
  it("adds inline data URL support for images and pdfs", async () => {
    const model: LanguageModelV3 = {
      specificationVersion: "v3",
      provider: "test",
      modelId: "model-1",
      supportedUrls: {
        "image/*": [/^https:\/\/cdn\.example\.com\//],
      },
      doGenerate: vi.fn(async () => {
        throw new Error("unused");
      }),
      doStream: vi.fn(async () => {
        throw new Error("unused");
      }),
    };

    const wrapped = withOpenAICompatibleInlineDataUrlSupport(model);
    const supportedUrls = await Promise.resolve(wrapped.supportedUrls);

    expect(supportedUrls["image/*"]).toHaveLength(2);
    expect(
      supportedUrls["image/*"]?.some((pattern: RegExp) =>
        pattern.test("data:image/png;base64,SGVsbG8="),
      ),
    ).toBe(true);
    expect(
      supportedUrls["image/*"]?.some((pattern: RegExp) =>
        pattern.test("https://cdn.example.com/image.png"),
      ),
    ).toBe(true);
    expect(
      supportedUrls["application/pdf"]?.some((pattern: RegExp) =>
        pattern.test("data:application/pdf;base64,SGVsbG8="),
      ),
    ).toBe(true);
  });
});
