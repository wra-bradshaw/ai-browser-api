import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { startup } from "@llm-bridge/runtime-core";
import { defineBackground } from "wxt/utils/define-background";
import { makeRuntimeCoreInfrastructureLayer } from "@/background/rpc/runtime-adapters";
import {
  RuntimeAdminRpcHandlersLive,
  RuntimePublicRpcHandlersLive,
} from "@/background/rpc/runtime-rpc-handlers";
import { makeRuntimeRpcServerLayer } from "@/background/rpc/runtime-rpc-server";
import { ToolbarProjectionLive } from "@/background/toolbar/toolbar-projection";

const RuntimeServicesLive = makeRuntimeCoreInfrastructureLayer();

const BackgroundAppLive = Layer.unwrapEffect(
  Effect.scoped(
    Effect.gen(function* () {
      const sharedRuntimeServices = yield* Layer.memoize(RuntimeServicesLive);

      const runtimeStartupLive = Layer.effectDiscard(startup()).pipe(
        Layer.provide(sharedRuntimeServices),
      );

      const runtimePublicRpcHandlersLayer = RuntimePublicRpcHandlersLive.pipe(
        Layer.provide(sharedRuntimeServices),
      );

      const runtimeAdminRpcHandlersLayer = RuntimeAdminRpcHandlersLive.pipe(
        Layer.provide(sharedRuntimeServices),
      );

      const runtimeRpcServerLive = makeRuntimeRpcServerLayer({
        publicLayer: runtimePublicRpcHandlersLayer,
        adminLayer: runtimeAdminRpcHandlersLayer,
      });

      return Layer.mergeAll(
        runtimeStartupLive,
        ToolbarProjectionLive.pipe(Layer.provide(sharedRuntimeServices)),
        runtimeRpcServerLive,
      );
    }),
  ),
);

export default defineBackground(() => {
  void Effect.runPromise(Layer.launch(BackgroundAppLive));
});
