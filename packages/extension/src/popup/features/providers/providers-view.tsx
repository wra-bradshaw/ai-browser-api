import { useState } from "react";
import { useMutationResource } from "@llm-bridge/reactive-core";
import { Button } from "@/shared/ui/button";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { SearchInput } from "@/popup/components/search-input";
import { useStableSortedIds } from "@/popup/hooks/use-stable-sorted-ids";
import { useProvidersState } from "@/app/state/runtime-data";
import {
  disconnectProviderMutation,
  openProviderAuthWindowMutation,
} from "@/app/state/runtime-mutations";

function createProviderOrderResetKey(
  providers: ReadonlyArray<{
    id: string;
    name: string;
    connected: boolean;
  }>,
) {
  return [...providers]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((provider) =>
      [
        provider.id,
        provider.name,
        provider.connected ? "1" : "0",
      ].join("|"),
    )
    .join("||");
}

export function ProvidersView() {
  const [search, setSearch] = useState("");
  const [pendingAction, setPendingAction] = useState<{
    providerID: string;
    type: "connect" | "disconnect";
  } | null>(null);
  const providersState = useProvidersState();
  const disconnectProvider = useMutationResource(disconnectProviderMutation);
  const openProviderAuthWindow = useMutationResource(
    openProviderAuthWindowMutation,
  );

  const providers = providersState.value ?? [];
  const orderedProviderIds = useStableSortedIds(
    providers,
    (provider) => provider.id,
    (a, b) => {
      if (a.connected && !b.connected) return -1;
      if (!a.connected && b.connected) return 1;
      return a.name.localeCompare(b.name);
    },
    createProviderOrderResetKey(providers),
  );
  const query = search.trim().toLowerCase();
  const providersById = new Map(
    providers.map((provider) => [provider.id, provider] as const),
  );
  const sorted = orderedProviderIds
    .map((id) => providersById.get(id))
    .filter(
      (provider): provider is NonNullable<typeof provider> => provider != null,
    )
    .filter((provider) => {
      if (!query) return true;
      return provider.name.toLowerCase().includes(query);
    });

  if (providersState.hasError && providers.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10 text-center">
        <p className="text-xs text-destructive">Failed to load providers.</p>
      </div>
    );
  }

  if (providersState.isLoading && providers.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10 text-center">
        <p className="text-xs text-muted-foreground">Loading providers...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SearchInput
        ariaLabel="Search providers"
        placeholder="Search providers..."
        value={search}
        onChange={setSearch}
      />

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col">
          {sorted.map((provider) => {
            const controlsDisabled =
              pendingAction?.type === "disconnect" &&
              pendingAction.providerID === provider.id;
            const connectPending =
              pendingAction?.type === "connect" &&
              pendingAction.providerID === provider.id;

            return (
              <div
                key={provider.id}
                className={`group flex items-center gap-2 border-b border-border px-3 py-2 transition-colors hover:bg-secondary/50 ${
                  !provider.connected ? "opacity-50 hover:opacity-80" : ""
                }`}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-xs font-medium text-foreground">
                    {provider.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {provider.modelCount} models available
                  </span>
                </div>

                <Button
                  onClick={() => {
                    if (provider.connected) {
                      setPendingAction({
                        providerID: provider.id,
                        type: "disconnect",
                      });
                      void disconnectProvider.execute({
                        providerID: provider.id,
                      })
                        .catch((error) => {
                          console.error(
                            "[providers-view] failed to disconnect provider",
                            error,
                          );
                        })
                        .finally(() => {
                          setPendingAction((current) =>
                            current?.providerID === provider.id &&
                            current.type === "disconnect"
                              ? null
                              : current,
                          );
                        });
                      return;
                    }
                    setPendingAction({
                      providerID: provider.id,
                      type: "connect",
                    });
                    void openProviderAuthWindow.execute({
                        providerID: provider.id,
                      })
                      .catch((error) => {
                        console.error(
                          "[providers-view] failed to open auth window",
                          error,
                        );
                      })
                      .finally(() => {
                        setPendingAction((current) =>
                          current?.providerID === provider.id &&
                          current.type === "connect"
                            ? null
                            : current,
                        );
                      });
                  }}
                  disabled={controlsDisabled || connectPending}
                  variant={provider.connected ? "destructiveGhost" : "default"}
                  size="sm"
                  className="gap-1.5 text-[10px] disabled:opacity-50"
                >
                  {provider.connected ? (
                    <>
                      <span className="hidden group-hover:inline">
                        Disconnect
                      </span>
                      <span className="inline group-hover:hidden">
                        Connected
                      </span>
                    </>
                  ) : (
                    <>{connectPending ? "Opening..." : "Connect"}</>
                  )}
                </Button>
              </div>
            );
          })}

          {sorted.length === 0 && search && (
            <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
              <p className="text-xs text-muted-foreground">
                No providers matching &ldquo;{search}&rdquo;
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
