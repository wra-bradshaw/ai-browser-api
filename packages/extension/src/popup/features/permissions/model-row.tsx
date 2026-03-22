import { useState } from "react";
import type { RuntimePermissionRuleState } from "@llm-bridge/contracts";
import { useMutationResource } from "@llm-bridge/reactive-core";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { updateModelPermissionMutation } from "@/app/state/runtime-mutations";
import { getProviderLabel } from "@/shared/provider-labels";
import { cn } from "@/shared/utils";

interface ModelRowProps {
  id: string;
  name: string;
  provider: string;
  capabilities: ReadonlyArray<string>;
  permission: RuntimePermissionRuleState;
  origin: string;
  disabled?: boolean;
}

const permissionOptions = [
  {
    label: "Allow",
    value: "allowed",
  },
  {
    label: "Ask",
    value: "implicit",
  },
  {
    label: "Deny",
    value: "denied",
  },
] as const satisfies ReadonlyArray<{
  label: string;
  value: RuntimePermissionRuleState;
}>;

export function ModelRow({
  id,
  name,
  provider,
  capabilities,
  permission,
  origin,
  disabled = false,
}: ModelRowProps) {
  const [pending, setPending] = useState(false);
  const updatePermission = useMutationResource(updateModelPermissionMutation);
  const controlsDisabled = disabled || pending;

  return (
    <div className="grid w-full max-w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 overflow-hidden border-b border-border px-3 py-2">
      <div className="min-w-0 overflow-hidden">
        <span className="block w-full overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs font-medium text-foreground">
          {name}
        </span>
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
          <span className="text-[10px] text-muted-foreground">
            {getProviderLabel(provider)}
          </span>
          {capabilities.map((capability) => (
            <Badge
              key={capability}
              variant="outline"
              className="h-3.5 rounded border-border px-1 text-[9px] font-normal text-muted-foreground"
            >
              {capability}
            </Badge>
          ))}
        </div>
      </div>

      <div
        role="group"
        aria-label={`Permission state for ${name}`}
        className="flex shrink-0 overflow-hidden border border-border"
      >
        {permissionOptions.map((option) => {
          const selected = option.value === permission;

          return (
            <Button
              key={option.value}
              onClick={() => {
                setPending(true);
                void updatePermission
                  .execute({
                    modelId: id,
                    origin,
                    status: option.value,
                  })
                  .catch((error) => {
                    console.error(
                      "[model-row] failed to update permission",
                      error,
                    );
                  })
                  .finally(() => {
                    setPending(false);
                  });
              }}
              disabled={controlsDisabled}
              variant="ghost"
              size="sm"
              className={cn(
                "min-w-[44px] rounded-none border-l border-border px-2 first:border-l-0",
                selected
                  ? "bg-secondary text-foreground hover:bg-secondary"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
              )}
              aria-pressed={selected}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
