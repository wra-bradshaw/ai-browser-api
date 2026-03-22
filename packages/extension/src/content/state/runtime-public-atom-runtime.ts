import * as Context from "effect/Context";
import * as Layer from "effect/Layer";
import { createReactiveRuntime } from "@llm-bridge/reactive-core";
import { getRuntimePublicRPC } from "@/content/bridge/runtime-public-rpc-client";

type ContentRuntimePublicRpcClient = ReturnType<typeof getRuntimePublicRPC>;

class ContentRuntimePublicClient extends Context.Tag(
  "@llm-bridge/extension/ContentRuntimePublicClient",
)<ContentRuntimePublicClient, ContentRuntimePublicRpcClient>() {}

const ContentRuntimePublicClientLive = Layer.sync(
  ContentRuntimePublicClient,
  () => getRuntimePublicRPC(),
);

export const contentReactiveRuntime = createReactiveRuntime(
  ContentRuntimePublicClientLive,
);
