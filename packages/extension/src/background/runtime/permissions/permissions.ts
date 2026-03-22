import {
  RuntimeValidationError,
  type RuntimePermissionDecision,
  type RuntimePermissionRuleState,
  isRuntimeRpcError,
} from "@llm-bridge/contracts";
import * as Effect from "effect/Effect";
import {
  MAX_PENDING_REQUESTS,
  MAX_PENDING_REQUESTS_PER_ORIGIN,
} from "@/background/runtime/core/constants";
import { now, randomId } from "@/background/runtime/core/util";
import { runtimeDb } from "@/background/storage/runtime-db";
import type {
  RuntimeDbModel,
  RuntimeDbPermission,
} from "@/background/storage/runtime-db-types";
import { runtimePermissionKey } from "@/background/storage/runtime-db-types";
import { runTx } from "@/background/storage/runtime-db-tx";

export interface PermissionRequest {
  id: string;
  origin: string;
  modelId: string;
  modelName: string;
  provider: string;
  capabilities: string[];
  requestedAt: number;
  dismissed: boolean;
  status: "pending" | "resolved";
}

type CreatePermissionRequestResult =
  | {
      status: "alreadyAllowed";
    }
  | {
      status: "alreadyDenied";
    }
  | {
      status: "requested";
      request: PermissionRequest;
    };

function readOriginRow(origin: string) {
  return Effect.tryPromise({
    try: () => runtimeDb.origins.get(origin),
    catch: (error) => error,
  });
}

function readPermissionRow(origin: string, modelId: string) {
  return Effect.tryPromise({
    try: async (): Promise<RuntimeDbPermission | undefined> =>
      runtimeDb.permissions.get(runtimePermissionKey(origin, modelId)),
    catch: (error) => error,
  });
}

function readPermissionRows(origin: string) {
  return Effect.tryPromise({
    try: async (): Promise<ReadonlyArray<RuntimeDbPermission>> =>
      runtimeDb.permissions.where("origin").equals(origin).toArray(),
    catch: (error) => error,
  });
}

function deletePermissionRow(origin: string, modelId: string) {
  return Effect.tryPromise({
    try: () => runtimeDb.permissions.delete(runtimePermissionKey(origin, modelId)),
    catch: (error) => error,
  }).pipe(Effect.asVoid);
}

function readPendingRequestRow(requestId: string) {
  return Effect.tryPromise({
    try: () => runtimeDb.pendingRequests.get(requestId),
    catch: (error) => error,
  });
}

function readPendingRequestRows(origin?: string) {
  return Effect.tryPromise({
    try: () =>
      runtimeDb.pendingRequests
        .where("status")
        .equals("pending")
        .filter((item) => {
          if (item.dismissed) return false;
          if (!origin) return true;
          return item.origin === origin;
        })
        .toArray(),
    catch: (error) => error,
  });
}

function readPendingRequestRowsForModel(origin: string, modelId: string) {
  return Effect.tryPromise({
    try: () =>
      runtimeDb.pendingRequests
        .where("origin")
        .equals(origin)
        .filter((item) => item.modelId === modelId)
        .toArray(),
    catch: (error) => error,
  });
}

function deletePendingRequest(requestId: string) {
  return Effect.tryPromise({
    try: () => runtimeDb.pendingRequests.delete(requestId),
    catch: (error) => error,
  }).pipe(Effect.asVoid);
}

function clearPendingRequestsForModel(origin: string, modelId: string) {
  return Effect.gen(function* () {
    const rows = yield* readPendingRequestRowsForModel(origin, modelId);
    yield* Effect.forEach(rows, (row) => deletePendingRequest(row.id), {
      concurrency: "unbounded",
      discard: true,
    });
  });
}

function readModelRow(modelId: string) {
  return Effect.tryPromise({
    try: async (): Promise<RuntimeDbModel | undefined> =>
      runtimeDb.models.get(modelId),
    catch: (error) => error,
  });
}

function partitionLegacyPendingPermissionRows<
  Row extends {
    origin: string;
    modelId: string;
    status: string;
  },
>(rows: ReadonlyArray<Row>) {
  const legacyPending = [] as Array<Row>;
  const explicit = [] as Array<Row>;

  for (const row of rows) {
    if (row.status === "pending") {
      legacyPending.push(row);
      continue;
    }

    explicit.push(row);
  }

  return {
    legacyPending,
    explicit,
  };
}

type ExplicitRuntimeDbPermission = RuntimeDbPermission & {
  status: RuntimePermissionDecision;
};

function normalizePermissionRow(
  origin: string,
  modelId: string,
  row: RuntimeDbPermission | undefined,
): Effect.Effect<ExplicitRuntimeDbPermission | undefined, unknown> {
  if (!row) {
    return Effect.succeed<ExplicitRuntimeDbPermission | undefined>(undefined);
  }

  if (row.status !== "pending") {
    return Effect.succeed(row as ExplicitRuntimeDbPermission);
  }

  return deletePermissionRow(origin, modelId).pipe(
    Effect.as<ExplicitRuntimeDbPermission | undefined>(undefined),
  );
}

function normalizePermissionRows(rows: ReadonlyArray<RuntimeDbPermission>) {
  return Effect.gen(function* () {
    const { explicit, legacyPending } = partitionLegacyPendingPermissionRows(rows);

    yield* Effect.forEach(
      legacyPending,
      (row) => deletePermissionRow(row.origin, row.modelId),
      {
        concurrency: "unbounded",
        discard: true,
      },
    );

    return explicit.filter(
      (row): row is ExplicitRuntimeDbPermission => row.status !== "pending",
    );
  });
}

export function normalizeLegacyPendingPermissionRows() {
  return Effect.gen(function* () {
    const rows = yield* Effect.tryPromise({
      try: () => runtimeDb.permissions.toArray(),
      catch: (error) => error,
    });

    yield* normalizePermissionRows(rows);
  });
}

export function listPermissions(origin: string) {
  return Effect.gen(function* () {
    const rows = yield* readPermissionRows(origin).pipe(
      Effect.flatMap((currentRows) => normalizePermissionRows(currentRows)),
    );

    return rows.map((row) => ({
      modelId: row.modelId,
      status: row.status,
      capabilities: row.capabilities,
      updatedAt: row.updatedAt,
    }));
  });
}

function toRuleMap(
  input: Array<{
    modelId: string;
    status: RuntimePermissionDecision;
    capabilities: string[];
    updatedAt: number;
  }>,
) {
  return Object.fromEntries(input.map((rule) => [rule.modelId, rule] as const));
}

export function getOriginPermissions(origin: string) {
  return Effect.gen(function* () {
    const [originRow, rules] = yield* Effect.all([
      readOriginRow(origin),
      listPermissions(origin),
    ]);

    return {
      enabled: originRow?.enabled ?? true,
      rules: toRuleMap(rules),
    };
  });
}

export function setOriginEnabled(origin: string, enabled: boolean) {
  return runTx([runtimeDb.origins], () =>
    Effect.tryPromise({
      try: () =>
        runtimeDb.origins.put({
          origin,
          enabled,
          updatedAt: now(),
        }),
      catch: (error) => error,
    }).pipe(Effect.asVoid),
  );
}

export function setModelPermission(
  origin: string,
  modelId: string,
  status: RuntimePermissionRuleState,
  capabilities?: string[],
) {
  const updatedAt = now();

  return runTx(
    [runtimeDb.permissions, runtimeDb.models, runtimeDb.pendingRequests],
    () =>
      Effect.gen(function* () {
        if (status === "implicit") {
          yield* deletePermissionRow(origin, modelId);
          yield* clearPendingRequestsForModel(origin, modelId);
          return;
        }

        const [existing, modelRow] = yield* Effect.all([
          readPermissionRow(origin, modelId).pipe(
            Effect.flatMap((row) => normalizePermissionRow(origin, modelId, row)),
          ),
          readModelRow(modelId),
        ]);

        yield* Effect.tryPromise({
          try: () =>
            runtimeDb.permissions.put({
              id: runtimePermissionKey(origin, modelId),
              origin,
              modelId,
              status,
              capabilities:
                modelRow?.capabilities ??
                capabilities ??
                existing?.capabilities ??
                [],
              updatedAt,
            }),
          catch: (error) => error,
        });

        yield* clearPendingRequestsForModel(origin, modelId);
      }),
  );
}

export function getModelPermission(
  origin: string,
  modelId: string,
): Effect.Effect<RuntimePermissionRuleState, unknown> {
  return Effect.gen(function* () {
    const permission: ExplicitRuntimeDbPermission | undefined = yield* readPermissionRow(origin, modelId).pipe(
      Effect.flatMap((row) => normalizePermissionRow(origin, modelId, row)),
    );

    return permission?.status ?? "implicit";
  });
}

export function createPermissionRequest(input: {
  origin: string;
  modelId: string;
  provider: string;
  modelName: string;
  capabilities?: string[];
}) {
  return Effect.gen(function* () {
    const permission = yield* getModelPermission(input.origin, input.modelId);

    switch (permission) {
      case "allowed":
        return {
          status: "alreadyAllowed",
        } satisfies CreatePermissionRequestResult;
      case "denied":
        return {
          status: "alreadyDenied",
        } satisfies CreatePermissionRequestResult;
      case "implicit":
        break;
    }

    const modelRow = yield* readModelRow(input.modelId);
    const capabilities = modelRow?.capabilities ?? input.capabilities ?? [];
    const provider = modelRow?.providerID ?? input.provider;
    const modelName = modelRow?.info.name ?? input.modelName;

    return yield* runTx([runtimeDb.pendingRequests], () =>
      Effect.gen(function* () {
        const duplicate = yield* Effect.tryPromise({
          try: () =>
            runtimeDb.pendingRequests
              .where("origin")
              .equals(input.origin)
              .filter(
                (item) =>
                  item.modelId === input.modelId &&
                  item.status === "pending" &&
                  !item.dismissed,
              )
              .first(),
          catch: (error) => error,
        });

        if (duplicate) {
          return {
            status: "requested",
            request: duplicate,
          } satisfies CreatePermissionRequestResult;
        }

        const originPendingCount = yield* Effect.tryPromise({
          try: () =>
            runtimeDb.pendingRequests
              .where("origin")
              .equals(input.origin)
              .filter((item) => item.status === "pending" && !item.dismissed)
              .count(),
          catch: (error) => error,
        });
        if (originPendingCount >= MAX_PENDING_REQUESTS_PER_ORIGIN) {
          return yield* new RuntimeValidationError({
            message: `Too many pending permission requests for origin ${input.origin}`,
          });
        }

        const totalPendingCount = yield* Effect.tryPromise({
          try: () =>
            runtimeDb.pendingRequests
              .where("status")
              .equals("pending")
              .filter((item) => !item.dismissed)
              .count(),
          catch: (error) => error,
        });
        if (totalPendingCount >= MAX_PENDING_REQUESTS) {
          return yield* new RuntimeValidationError({
            message: "Too many pending permission requests",
          });
        }

        const request: PermissionRequest = {
          id: randomId("prm"),
          origin: input.origin,
          modelId: input.modelId,
          provider,
          modelName,
          capabilities,
          requestedAt: now(),
          dismissed: false,
          status: "pending",
        };

        yield* Effect.tryPromise({
          try: () => runtimeDb.pendingRequests.put(request),
          catch: (error) => error,
        });

        return {
          status: "requested",
          request,
        } satisfies CreatePermissionRequestResult;
      }),
    ).pipe(
      Effect.catchAll((error) =>
        isRuntimeRpcError(error) ? Effect.fail(error) : Effect.die(error),
      ),
    );
  });
}

export function dismissPermissionRequest(requestId: string) {
  return runTx([runtimeDb.pendingRequests], () =>
    Effect.gen(function* () {
      const match = yield* readPendingRequestRow(requestId);
      if (!match) {
        return;
      }

      yield* deletePendingRequest(requestId);
    }),
  );
}

export function resolvePermissionRequest(
  requestId: string,
  decision: RuntimePermissionDecision,
) {
  return runTx([runtimeDb.pendingRequests, runtimeDb.permissions], () =>
    Effect.gen(function* () {
      const match = yield* readPendingRequestRow(requestId);
      if (!match) {
        return;
      }

      yield* Effect.tryPromise({
        try: () =>
          runtimeDb.permissions.put({
            id: runtimePermissionKey(match.origin, match.modelId),
            origin: match.origin,
            modelId: match.modelId,
            status: decision,
            capabilities: match.capabilities,
            updatedAt: now(),
          }),
        catch: (error) => error,
      });

      yield* deletePendingRequest(requestId);
    }),
  );
}

export function listPendingRequests(origin?: string) {
  return readPendingRequestRows(origin);
}

export function getPendingRequest(requestId: string) {
  return readPendingRequestRow(requestId);
}
