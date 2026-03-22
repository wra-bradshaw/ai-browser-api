import { Check, Copy, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { RuntimeAuthFlowInstruction } from "@llm-bridge/contracts";
import type { ExtensionAuthMethod } from "@/app/api/runtime-api";
import { ProviderAuthSchemaForm } from "@/popup/features/providers/provider-auth-schema-form";
import { useConnectProviderWindow } from "@/popup/features/providers/use-connect-provider-window";
import { Button, buttonVariants } from "@/shared/ui/button";
import { cn } from "@/shared/utils";

function formatMethodType(type: ExtensionAuthMethod["type"]) {
  if (type === "apikey") {
    return "api key";
  }

  return type.replaceAll("_", " ");
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card/30 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mt-1 text-sm font-medium text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function InlineNotice({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "destructive" | "muted";
}) {
  return (
    <div
      className={cn(
        "border px-3 py-2 text-xs leading-relaxed",
        tone === "destructive"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-border bg-secondary/40 text-muted-foreground",
      )}
    >
      {children}
    </div>
  );
}

function InstructionPanel({
  instruction,
  onCopyCode,
  onOpenUrl,
  disabled,
}: {
  instruction: RuntimeAuthFlowInstruction;
  onCopyCode: (code: string) => Promise<void> | void;
  onOpenUrl: (url: string) => void;
  disabled: boolean;
}) {
  const instructionCode = instruction.code;
  const instructionUrl = instruction.url;

  return (
    <div className="flex flex-col gap-3 border border-border bg-secondary/30 px-3 py-3">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-foreground">
          {instruction.title}
        </p>
        {instruction.message ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {instruction.message}
          </p>
        ) : null}
      </div>

      {instructionCode ? (
        <div className="flex items-center justify-between gap-3 border border-border bg-background px-3 py-2">
          <code className="truncate text-xs text-foreground">
            {instructionCode}
          </code>
          <Button
            onClick={() => {
              void onCopyCode(instructionCode);
            }}
            disabled={disabled}
            variant="secondary"
            size="sm"
          >
            <Copy className="size-3.5" />
            Copy code
          </Button>
        </div>
      ) : null}

      {instructionUrl ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => onOpenUrl(instructionUrl)}
            disabled={disabled}
            variant="secondary"
            size="sm"
          >
            <ExternalLink className="size-3.5" />
            Open verification page
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function MethodList({
  methods,
  providerID,
  selectedMethodID,
}: {
  methods: ReadonlyArray<ExtensionAuthMethod>;
  providerID: string;
  selectedMethodID: string | null;
}) {
  return (
    <div className="border-y border-border">
      {methods.map((method, index) => {
        const selected = method.id === selectedMethodID;

        return (
          <Link
            key={method.id}
            to="/providers/$providerID/methods/$methodID"
            params={{
              providerID,
              methodID: method.id,
            }}
            className={buttonVariants({
              variant: "ghost",
              className: cn(
                "h-auto w-full justify-start px-3 py-3 text-left",
                index > 0 ? "border-t border-border" : "",
                selected
                  ? "bg-secondary text-foreground hover:bg-secondary"
                  : "text-foreground hover:bg-secondary/50",
              ),
            })}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{method.label}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {formatMethodType(method.type)}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function CenteredMessage({
  message,
  tone = "muted",
}: {
  message: string;
  tone?: "destructive" | "muted";
}) {
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

function SuccessState() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="flex max-w-[240px] flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center border border-success/40 bg-success/10 text-success">
          <Check className="size-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Provider connected
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Closing this window and returning you to the popup.
          </p>
        </div>
      </div>
    </div>
  );
}

function AuthorizingState({
  instruction,
  displayError,
  disabled,
  onCopyCode,
  onDismiss,
  onOpenUrl,
}: {
  instruction?: RuntimeAuthFlowInstruction;
  displayError: string | null;
  disabled: boolean;
  onCopyCode: (code: string) => Promise<void> | void;
  onDismiss: () => Promise<void> | void;
  onOpenUrl: (url: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 px-3">
      {instruction ? (
        <InstructionPanel
          instruction={instruction}
          onCopyCode={onCopyCode}
          onOpenUrl={onOpenUrl}
          disabled={disabled}
        />
      ) : (
        <InlineNotice>
          Waiting for the provider&apos;s verification instructions. If nothing
          opens automatically, the next step will appear here.
        </InlineNotice>
      )}

      {displayError ? (
        <InlineNotice tone="destructive">{displayError}</InlineNotice>
      ) : null}

      <div className="flex justify-end ">
        <Button
          onClick={() => void onDismiss()}
          disabled={disabled}
          variant="outline"
        >
          Cancel and close
        </Button>
      </div>
    </div>
  );
}

function MethodFormState({
  selectedMethod,
  displayError,
  busyAction,
  onBack,
  onStart,
}: {
  selectedMethod: ExtensionAuthMethod | null;
  displayError: string | null;
  busyAction: "cancel" | "start" | null;
  onBack: () => void;
  onStart: (methodID: string, values: Record<string, string>) => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-4 px-3 py-4">
      {selectedMethod ? (
        <ProviderAuthSchemaForm
          method={selectedMethod}
          disabled={busyAction !== null}
          error={displayError}
          submitLabel={busyAction === "start" ? "Starting..." : "Continue"}
          onBack={onBack}
          onSubmit={(values) => onStart(selectedMethod.id, values)}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <InlineNotice tone="destructive">
            That method is no longer available. Choose another option to
            continue.
          </InlineNotice>
          <div className="flex justify-end border-t border-border pt-3">
            <Button onClick={onBack} variant="outline">
              Back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectProviderWindowFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-background font-sans">
      <SectionHeading title={title} description={description} />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

export function ConnectProviderChooserPage({
  providerID,
}: {
  providerID: string;
}) {
  const model = useConnectProviderWindow(providerID);

  return (
    <ConnectProviderWindowFrame
      title={`Choose how to connect ${model.providerName}`}
      description="Use the method that matches how you authenticate with this provider. You can review or change credentials before continuing."
    >
      {model.isLoading ? (
        <CenteredMessage message="Loading authentication flow..." />
      ) : model.hasLoadFailure ? (
        <CenteredMessage
          message="Failed to load the provider authentication flow."
          tone="destructive"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {model.methods.length > 0 ? (
            <MethodList
              methods={model.methods}
              providerID={providerID}
              selectedMethodID={null}
            />
          ) : (
            <div className="px-3">
              <InlineNotice>
                No authentication methods are available yet.
              </InlineNotice>
            </div>
          )}

          {model.displayError ? (
            <div className="px-3">
              <InlineNotice tone="destructive">
                {model.displayError}
              </InlineNotice>
            </div>
          ) : null}
        </div>
      )}
    </ConnectProviderWindowFrame>
  );
}

export function ConnectProviderMethodPage({
  providerID,
  methodID,
}: {
  providerID: string;
  methodID: string;
}) {
  const model = useConnectProviderWindow(providerID, methodID);
  const navigate = useNavigate({
    from: "/providers/$providerID/methods/$methodID",
  });

  const handleBack = () => {
    void navigate({
      to: "/providers/$providerID",
      params: {
        providerID,
      },
    });
  };

  const handleStart = async (
    selectedMethodID: string,
    values: Record<string, string>,
  ) => {
    const result = await model.handleStart(selectedMethodID, values);

    if (result?.result.status !== "success") {
      return;
    }

    void navigate({
      to: "/providers/$providerID/success",
      params: {
        providerID,
      },
      replace: true,
    });
  };

  const methodLabel = model.selectedMethod?.label ?? "Connect provider";
  const methodDescription =
    model.status === "authorizing"
      ? "Complete the provider's verification step. This window will close automatically once the connection is ready."
      : "Review credentials for this method before continuing.";

  return (
    <ConnectProviderWindowFrame
      title={methodLabel}
      description={methodDescription}
    >
      {model.isLoading ? (
        <CenteredMessage message="Loading authentication flow..." />
      ) : model.hasLoadFailure ? (
        <CenteredMessage
          message="Failed to load the provider authentication flow."
          tone="destructive"
        />
      ) : model.status === "success" ? (
        <SuccessState />
      ) : model.status === "authorizing" ? (
        <AuthorizingState
          instruction={model.flow?.instruction}
          displayError={model.displayError}
          disabled={model.isBusy}
          onCopyCode={model.handleCopyCode}
          onDismiss={model.handleDismiss}
          onOpenUrl={model.handleOpenUrl}
        />
      ) : (
        <MethodFormState
          selectedMethod={model.selectedMethod}
          displayError={model.displayError}
          busyAction={model.busyAction}
          onBack={handleBack}
          onStart={handleStart}
        />
      )}
    </ConnectProviderWindowFrame>
  );
}

export function ConnectProviderSuccessPage({
  providerID,
}: {
  providerID: string;
}) {
  const model = useConnectProviderWindow(providerID);

  return (
    <ConnectProviderWindowFrame
      title="Connection complete"
      description="The provider is now available in the popup and on sites where you grant access."
    >
      {model.isLoading ? (
        <CenteredMessage message="Loading authentication flow..." />
      ) : model.hasLoadFailure ? (
        <CenteredMessage
          message="Failed to load the provider authentication flow."
          tone="destructive"
        />
      ) : (
        <SuccessState />
      )}
    </ConnectProviderWindowFrame>
  );
}
