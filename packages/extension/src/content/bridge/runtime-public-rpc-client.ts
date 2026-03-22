import {
  RUNTIME_PUBLIC_RPC_PORT_NAME,
  type RuntimeOriginState,
  type RuntimePendingRequest,
  RuntimePublicRpcGroup,
  type RuntimeRpcError,
  RuntimeValidationError,
} from "@llm-bridge/contracts";
import type * as RpcGroup from "@effect/rpc/RpcGroup";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { makeRuntimeRpcClientCore } from "@/shared/rpc/runtime-rpc-client-core";
import {
  bindRuntimeRpcStreamMethodByKey,
  bindRuntimeRpcUnaryMethodByKey,
  RUNTIME_RPC_CONNECTION_INVALIDATED_MESSAGE,
  type StreamRpcTag,
  type UnaryRpcTag,
} from "@/shared/rpc/runtime-rpc-client-factory";

type RuntimePublicRpc = RpcGroup.Rpcs<typeof RuntimePublicRpcGroup>;
type RuntimePublicOriginPayload = {
  origin: string;
};
type RuntimePublicPermissionStreamClient = {
  streamOriginState: (
    payload: RuntimePublicOriginPayload,
  ) => Stream.Stream<
    RuntimeOriginState,
    RuntimeRpcError | RuntimeValidationError,
    never
  >;
  streamPending: (
    payload: RuntimePublicOriginPayload,
  ) => Stream.Stream<
    ReadonlyArray<RuntimePendingRequest>,
    RuntimeRpcError | RuntimeValidationError,
    never
  >;
};

const core = makeRuntimeRpcClientCore({
  portName: RUNTIME_PUBLIC_RPC_PORT_NAME,
  rpcGroup: RuntimePublicRpcGroup,
  invalidatedError: () =>
    new RuntimeValidationError({
      message: RUNTIME_RPC_CONNECTION_INVALIDATED_MESSAGE,
    }),
});

const bindUnary = <Key extends UnaryRpcTag<RuntimePublicRpc>>(key: Key) =>
  bindRuntimeRpcUnaryMethodByKey<
    RuntimePublicRpc,
    RuntimeValidationError,
    Key
  >(
    core.ensureClient,
    key,
  );

const bindStream = <Key extends StreamRpcTag<RuntimePublicRpc>>(key: Key) =>
  bindRuntimeRpcStreamMethodByKey<
    RuntimePublicRpc,
    RuntimeValidationError,
    Key
  >(
    core.ensureClient,
    key,
  );

const ensurePermissionStreamClient =
  core.ensureClient as unknown as Effect.Effect<
    RuntimePublicPermissionStreamClient,
    RuntimeValidationError
  >;

export function getRuntimePublicRPC() {
  return {
    listModels: bindUnary("listModels"),
    streamModels: bindStream("streamModels"),
    getOriginState: bindUnary("getOriginState"),
    streamOriginState: (payload: RuntimePublicOriginPayload) =>
      Stream.unwrap(
        Effect.map(ensurePermissionStreamClient, (client) =>
          client.streamOriginState(payload),
        ),
      ),
    listPending: bindUnary("listPending"),
    streamPending: (payload: RuntimePublicOriginPayload) =>
      Stream.unwrap(
        Effect.map(ensurePermissionStreamClient, (client) =>
          client.streamPending(payload),
        ),
      ),
    acquireModel: bindUnary("acquireModel"),
    modelDoGenerate: bindUnary("modelDoGenerate"),
    modelDoStream: bindStream("modelDoStream"),
    abortModelCall: bindUnary("abortModelCall"),
    chatSendMessages: bindStream("chatSendMessages"),
    chatReconnectStream: bindStream("chatReconnectStream"),
    abortChatStream: bindUnary("abortChatStream"),
    createPermissionRequest: bindUnary("createPermissionRequest"),
  };
}
