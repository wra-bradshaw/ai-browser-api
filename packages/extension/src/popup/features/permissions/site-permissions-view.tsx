import { useState } from "react";
import type { RuntimePermissionRuleState } from "@llm-bridge/contracts";
import { useMutationResource } from "@llm-bridge/reactive-core";
import { ModelRow } from "@/popup/features/permissions/model-row";
import { PendingRequestCard } from "@/app/components/pending-request-card";
import { buttonVariants } from "@/shared/ui/button";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Switch } from "@/shared/ui/switch";
import { Blocks } from "lucide-react";
import { SearchInput } from "@/popup/components/search-input";
import { Link } from "@tanstack/react-router";
import { useSitePermissionsData } from "@/app/state/runtime-data";
import { setOriginEnabledMutation } from "@/app/state/runtime-mutations";
import { useStableSortedIds } from "@/popup/hooks/use-stable-sorted-ids";

interface SitePermissionsViewProps {
  origin: string | null;
  originPending?: boolean;
}

export function SitePermissionsView({
  origin,
  originPending = false,
}: SitePermissionsViewProps) {
  if (originPending) {
    return <CenteredMessage message="Loading active tab..." />;
  }

  if (origin == null) {
    return (
      <CenteredMessage message="Unable to detect the active tab origin." />
    );
  }

  return <SitePermissionsContent origin={origin} />;
}

interface SitePermissionsContentProps {
  origin: string;
}

function SitePermissionsContent({ origin }: SitePermissionsContentProps) {
  const [originTogglePending, setOriginTogglePending] = useState(false);
  const dataState = useSitePermissionsData(origin);
  const setOriginEnabled = useMutationResource(setOriginEnabledMutation);
  const [search, setSearch] = useState("");
  const data = dataState.value;
  const hasLoadFailure = dataState.hasError && data == null;
  const pendingRequests = data?.pendingRequests ?? [];
  const allModels = data?.models ?? [];
  const permissionByModelId = new Map<string, RuntimePermissionRuleState>(
    (data?.permissions ?? []).map(
      (permission) => [permission.modelId, permission.status] as const,
    ),
  );
  const pendingModelIds = new Set(
    pendingRequests.map((request) => request.modelId),
  );
  const sitePermissionModels = allModels.map((model) => ({
    ...model,
    permission: permissionByModelId.get(model.id) ?? "implicit",
    isPending: pendingModelIds.has(model.id),
  }));
  const orderedModelIds = useStableSortedIds(
    sitePermissionModels,
    (model) => model.id,
    (a, b) => {
      if (a.isPending && !b.isPending) return -1;
      if (!a.isPending && b.isPending) return 1;
      if (a.permission === "allowed" && b.permission !== "allowed") return -1;
      if (a.permission !== "allowed" && b.permission === "allowed") return 1;
      if (a.permission === "implicit" && b.permission === "denied") return -1;
      if (a.permission === "denied" && b.permission === "implicit") return 1;
      return a.name.localeCompare(b.name);
    },
    [...allModels]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((model) =>
        [
          model.id,
          model.name,
          model.provider,
          model.connected ? "1" : "0",
          [...model.capabilities].sort().join(","),
        ].join("|"),
      )
      .join("||"),
  );
  const sitePermissionModelsById = new Map(
    sitePermissionModels.map((model) => [model.id, model] as const),
  );
  const searchQuery = search.trim().toLowerCase();
  const visibleModels = orderedModelIds
    .map((id) => sitePermissionModelsById.get(id))
    .filter((model): model is NonNullable<typeof model> => model != null)
    .filter((model) => !model.isPending)
    .filter((model) => {
      if (!searchQuery) return true;
      return (
        model.name.toLowerCase().includes(searchQuery) ||
        model.provider.toLowerCase().includes(searchQuery)
      );
    });

  const originEnabled = data?.originState.enabled ?? true;
  const hasConnectedProviders = allModels.length > 0;
  const controlsDisabled = originTogglePending;
  const actionsDisabled = !originEnabled || controlsDisabled;
  const showPendingSection = pendingRequests.length > 0 && search === "";
  const showModelsSection = visibleModels.length > 0;
  const showEmptySearchState = !showModelsSection && search !== "";

  if (hasLoadFailure && data == null) {
    return (
      <CenteredMessage
        message="Failed to load permissions data."
        tone="destructive"
      />
    );
  }

  if (data == null) {
    return <CenteredMessage message="Loading models..." />;
  }

  if (!hasConnectedProviders) {
    return <NoProvidersState />;
  }

  const handleOriginEnabledChange = (checked: boolean) => {
    setOriginTogglePending(true);
    void setOriginEnabled
      .execute({
        enabled: checked,
        origin,
      })
      .catch((error) => {
        console.error(
          "[site-permissions] failed to update origin state",
          error,
        );
      })
      .finally(() => {
        setOriginTogglePending(false);
      });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <label
        htmlFor="origin-enabled-switch"
        className="flex cursor-pointer items-center justify-between border-b border-border px-3 py-1.5 font-sans transition-colors hover:bg-secondary/50"
      >
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Site enabled
        </span>
        <Switch
          id="origin-enabled-switch"
          checked={originEnabled}
          disabled={controlsDisabled}
          onCheckedChange={handleOriginEnabledChange}
          aria-label="Enable extension on this site"
        />
      </label>

      <SearchInput
        ariaLabel="Search models"
        placeholder="Search models..."
        value={search}
        onChange={setSearch}
      />

      <ScrollArea className="min-h-0 w-full min-w-0 flex-1">
        <div className="flex w-full min-w-0 max-w-full flex-col">
          {showPendingSection && (
            <div className="flex w-full min-w-0 max-w-full flex-col">
              <SectionHeader tone="warning">Pending requests</SectionHeader>
              {pendingRequests.map((request) => (
                <PendingRequestCard
                  key={request.id}
                  request={request}
                  origin={origin}
                  variant="inline"
                  actionsDisabled={actionsDisabled}
                />
              ))}
            </div>
          )}

          {showModelsSection ? (
            <div className="flex w-full min-w-0 max-w-full flex-col">
              {showPendingSection && (
                <SectionHeader tone="muted">All models</SectionHeader>
              )}
              {visibleModels.map((model) => (
                <ModelRow
                  key={model.id}
                  id={model.id}
                  name={model.name}
                  provider={model.provider}
                  capabilities={model.capabilities}
                  permission={model.permission}
                  origin={origin}
                  disabled={actionsDisabled}
                />
              ))}
            </div>
          ) : showEmptySearchState ? (
            <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
              <p className="text-xs text-muted-foreground">
                No models matching &ldquo;{search}&rdquo;
              </p>
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}

interface CenteredMessageProps {
  message: string;
  tone?: "muted" | "destructive";
}

function CenteredMessage({ message, tone = "muted" }: CenteredMessageProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10 text-center">
      <p
        className={
          tone === "destructive"
            ? "text-xs text-destructive"
            : "text-xs text-muted-foreground"
        }
      >
        {message}
      </p>
    </div>
  );
}

function NoProvidersState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10">
      <div className="flex size-12 items-center justify-center bg-secondary text-muted-foreground">
        <Blocks className="size-6" />
      </div>
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-sm font-medium text-foreground">
          No providers connected
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Connect a model provider to start granting websites access to AI
          models.
        </p>
      </div>
      <Link className={buttonVariants({ size: "lg" })} to={"/providers"}>
        Connect a provider
      </Link>
    </div>
  );
}

interface SectionHeaderProps {
  children: string;
  tone: "muted" | "warning";
}

function SectionHeader({ children, tone }: SectionHeaderProps) {
  return (
    <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-3 py-1 backdrop-blur-sm">
      <span
        className={
          tone === "warning"
            ? "text-[10px] font-medium uppercase tracking-wider text-warning"
            : "text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
        }
      >
        {children}
      </span>
    </div>
  );
}
