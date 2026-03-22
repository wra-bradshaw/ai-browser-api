import { APICallError } from "@ai-sdk/provider";
import { RetryError } from "ai";
import { toRuntimeStreamPart } from "@llm-bridge/bridge-codecs";
import { isRuntimeRpcError } from "@llm-bridge/contracts";
import * as Effect from "effect/Effect";
import {
  prepareRuntimeLanguageModelCall,
  type RuntimeLanguageModelCallOptions,
} from "./language-model-runtime-context";
import { readableStreamToEffectStream } from "@/background/runtime/interop/ai-sdk-interop";
import {
  wrapExtensionError,
  wrapProviderError,
} from "@/background/runtime/core/errors";

function logRuntimeModelDebug(event: string, details?: Record<string, unknown>) {
  console.log(`[language-model-runtime] ${event}`, details);
}

function logRuntimeModelError(
  event: string,
  error: Error,
  details?: Record<string, unknown>,
) {
  console.error(`[language-model-runtime] ${event}`, {
    details,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  });
}

function toRuntimeModelLogDetails(input: {
  modelID: string;
  providerID: string;
  requestID: string;
  sessionID: string;
  callOptions: RuntimeLanguageModelCallOptions;
}) {
  return {
    modelId: input.modelID,
    providerId: input.providerID,
    requestID: input.requestID,
    sessionID: input.sessionID,
    promptMessageCount: Array.isArray(input.callOptions.prompt)
      ? input.callOptions.prompt.length
      : 0,
    hasHeaders: Object.keys(input.callOptions.headers ?? {}).length > 0,
    hasProviderOptions: input.callOptions.providerOptions != null,
    toolCount: Array.isArray(input.callOptions.tools)
      ? input.callOptions.tools.length
      : 0,
  } satisfies Record<string, unknown>;
}

function wrapProviderStyleFailure<A>(
  effect: Effect.Effect<A, unknown>,
  input: {
    operation: string;
    providerID: string;
  },
) {
  return effect.pipe(
    Effect.catchAll((error) =>
      error instanceof Error &&
      (APICallError.isInstance(error) || RetryError.isInstance(error))
        ? Effect.fail(
            wrapProviderError(error, input.providerID, input.operation),
          )
        : Effect.die(error),
    ),
  );
}

function toRuntimeStreamError(input: {
  error: unknown;
  operation: string;
  providerID: string;
}) {
  if (isRuntimeRpcError(input.error)) {
    return input.error;
  }

  if (
    input.error instanceof Error &&
    (APICallError.isInstance(input.error) || RetryError.isInstance(input.error))
  ) {
    return wrapProviderError(input.error, input.providerID, input.operation);
  }

  return wrapExtensionError(input.error, input.operation);
}

export function getRuntimeModelDescriptor(input: {
  modelID: string;
  origin: string;
  sessionID: string;
  requestID: string;
}) {
  return Effect.gen(function* () {
    const preparedCall = yield* prepareRuntimeLanguageModelCall({
      modelID: input.modelID,
      origin: input.origin,
      sessionID: input.sessionID,
      requestID: input.requestID,
      options: {
        prompt: [
          {
            role: "system",
            content: "describe capabilities",
          },
        ],
      } satisfies RuntimeLanguageModelCallOptions,
    });

    const supportedUrls = yield* wrapProviderStyleFailure(
      Effect.try({
        try: () => preparedCall.languageModel.supportedUrls,
        catch: (error) => error,
      }).pipe(
        Effect.flatMap((value) =>
          Effect.tryPromise({
            try: () => Promise.resolve(value ?? {}),
            catch: (error) => error,
          }),
        ),
      ),
      {
        providerID: preparedCall.providerID,
        operation: "describe",
      },
    );

    return {
      provider: preparedCall.languageModel.provider,
      modelId: input.modelID,
      supportedUrls,
    };
  });
}

export function runLanguageModelGenerate(input: {
  modelID: string;
  origin: string;
  sessionID: string;
  requestID: string;
  options: RuntimeLanguageModelCallOptions;
  signal?: AbortSignal;
}) {
  return Effect.gen(function* () {
    const preparedCall = yield* prepareRuntimeLanguageModelCall(input);
    const logDetails = toRuntimeModelLogDetails({
      modelID: input.modelID,
      providerID: preparedCall.providerID,
      requestID: input.requestID,
      sessionID: input.sessionID,
      callOptions: preparedCall.callOptions,
    });

    yield* Effect.sync(() => {
      logRuntimeModelDebug("generate.started", logDetails);
    });

    const result = yield* wrapProviderStyleFailure(
      Effect.tryPromise({
        try: () =>
          preparedCall.languageModel.doGenerate({
            ...preparedCall.callOptions,
            abortSignal: input.signal,
          }),
        catch: (error) => error,
      }),
      {
        providerID: preparedCall.providerID,
        operation: "generate",
      },
    ).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          logRuntimeModelError("generate.failed", error, logDetails);
        }),
      ),
    );

    return result;
  });
}

export function runLanguageModelStream(input: {
  modelID: string;
  origin: string;
  sessionID: string;
  requestID: string;
  options: RuntimeLanguageModelCallOptions;
  signal?: AbortSignal;
}) {
  return Effect.gen(function* () {
    const preparedCall = yield* prepareRuntimeLanguageModelCall(input);
    const logDetails = toRuntimeModelLogDetails({
      modelID: input.modelID,
      providerID: preparedCall.providerID,
      requestID: input.requestID,
      sessionID: input.sessionID,
      callOptions: preparedCall.callOptions,
    });

    yield* Effect.sync(() => {
      logRuntimeModelDebug("stream.started", logDetails);
    });

    const result = yield* wrapProviderStyleFailure(
      Effect.tryPromise({
        try: () =>
          preparedCall.languageModel.doStream({
            ...preparedCall.callOptions,
            abortSignal: input.signal,
          }),
        catch: (error) => error,
      }),
      {
        providerID: preparedCall.providerID,
        operation: "stream",
      },
    ).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          logRuntimeModelError("stream.failed", error, logDetails);
        }),
      ),
    );
    return readableStreamToEffectStream({
      stream: result.stream,
      map: (part) => Effect.succeed(toRuntimeStreamPart(part)),
      mapError: (error) =>
        toRuntimeStreamError({
          error,
          providerID: preparedCall.providerID,
          operation: "stream",
        }),
    });
  });
}
