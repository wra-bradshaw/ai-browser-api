import { useEffect, useEffectEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { useMutationResource } from "@llm-bridge/reactive-core";
import type { RuntimeAuthFlowSnapshot } from "@llm-bridge/contracts";
import { useProviderConnectData } from "@/app/state/runtime-data";
import {
  cancelProviderAuthFlowMutation,
  startProviderAuthFlowMutation,
} from "@/app/state/runtime-mutations";

type BusyAction = "cancel" | "start" | null;
type AuthFormValues = Record<string, string>;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function useConnectProviderWindowLifecycle(input: {
  providerLabel: string;
  status: RuntimeAuthFlowSnapshot["status"];
  updatedAt?: number;
}) {
  const closeWindow = useEffectEvent(() => {
    window.close();
  });
  const showSuccessToast = useEffectEvent((providerLabel: string) => {
    toast.success(`${providerLabel} connected`);
  });
  const handledSuccessAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (input.status !== "success" || input.updatedAt == null) {
      return;
    }

    if (handledSuccessAtRef.current === input.updatedAt) {
      return;
    }

    handledSuccessAtRef.current = input.updatedAt;
    showSuccessToast(input.providerLabel);

    const timeout = window.setTimeout(() => {
      closeWindow();
    }, 1200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    closeWindow,
    input.providerLabel,
    input.status,
    input.updatedAt,
    showSuccessToast,
  ]);
}

export function useConnectProviderWindow(
  providerID: string,
  routeMethodID: string | null = null,
) {
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const connectDataState = useProviderConnectData(providerID);
  const startAuthFlow = useMutationResource(startProviderAuthFlowMutation);
  const cancelAuthFlow = useMutationResource(cancelProviderAuthFlowMutation);

  const connectData = connectDataState.value;
  const provider =
    connectData?.providers.find((item) => item.id === providerID) ?? null;
  const flow = connectData?.authFlow ?? null;
  const methods = flow?.methods ?? [];
  const status = flow?.status ?? "idle";
  const runningMethodID = flow?.runningMethodID ?? null;
  const providerName = provider?.name ?? providerID;

  useConnectProviderWindowLifecycle({
    providerLabel: providerName,
    status,
    updatedAt: flow?.updatedAt,
  });

  const isBusy = busyAction !== null;
  const isLoading = connectDataState.isLoading && connectData == null;
  const hasLoadFailure = connectDataState.hasError && connectData == null;
  const displayError = localError ?? flow?.error ?? null;
  const selectedMethod =
    routeMethodID != null
      ? methods.find((method) => method.id === routeMethodID) ?? null
      : null;

  useEffect(() => {
    setLocalError(null);
  }, [providerID, routeMethodID]);

  async function runBusyAction<T>(
    action: Exclude<BusyAction, null>,
    task: () => Promise<T>,
  ) {
    setBusyAction(action);

    try {
      return await task();
    } finally {
      setBusyAction((current) => (current === action ? null : current));
    }
  }

  async function handleStart(methodID: string, values: AuthFormValues) {
    setLocalError(null);

    try {
      return await runBusyAction("start", () =>
        startAuthFlow.execute({
          providerID,
          methodID,
          values,
        }),
      );
    } catch (error) {
      setLocalError(getErrorMessage(error));
      return null;
    }
  }

  async function handleDismiss() {
    setLocalError(null);

    if (!flow?.canCancel) {
      window.close();
      return;
    }

    try {
      await runBusyAction("cancel", () =>
        cancelAuthFlow.execute({
          providerID,
          reason: "user",
        }),
      );
      window.close();
    } catch (error) {
      setLocalError(getErrorMessage(error));
    }
  }

  async function handleCopyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied");
    } catch (error) {
      setLocalError(getErrorMessage(error));
    }
  }

  function handleOpenUrl(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return {
    busyAction,
    displayError,
    flow,
    handleCopyCode,
    handleDismiss,
    handleOpenUrl,
    handleStart,
    hasLoadFailure,
    isBusy,
    isLoading,
    methods,
    providerName,
    runningMethodID,
    selectedMethod,
    selectedMethodID: routeMethodID,
    status,
  };
}
