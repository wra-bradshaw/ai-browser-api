import type {
  RuntimeAbortChatStreamInput,
  RuntimeChatReconnectStreamInput,
  RuntimeChatSendMessagesInput,
  RuntimeChatStreamChunk,
  RuntimeRpcError,
} from "@llm-bridge/contracts";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { ChatExecutionService, type AppRuntime } from "./environment";

export function sendChatMessages(
  input: RuntimeChatSendMessagesInput,
): Stream.Stream<RuntimeChatStreamChunk, RuntimeRpcError, AppRuntime> {
  return Stream.unwrap(
    Effect.flatMap(ChatExecutionService, (service) => service.sendMessages(input)),
  );
}

export function reconnectChatStream(
  input: RuntimeChatReconnectStreamInput,
): Stream.Stream<RuntimeChatStreamChunk, RuntimeRpcError, AppRuntime> {
  return Stream.unwrap(
    Effect.flatMap(ChatExecutionService, (service) =>
      service.reconnectStream(input),
    ),
  );
}

export function abortChatStream(input: RuntimeAbortChatStreamInput) {
  return Effect.flatMap(ChatExecutionService, (service) =>
    service.abortStream(input),
  );
}
