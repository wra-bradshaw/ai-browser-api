import {
  isFileUIPart,
  isReasoningUIPart,
  isTextUIPart,
  type FileUIPart,
  type UIMessage,
} from "ai";
import { Bot, FileIcon, User } from "lucide-react";
import { useMemo, useState } from "react";
import {
  useBridgeModels,
  useChat,
} from "@llm-bridge/client-react";
import {
  Conversation,
  ConversationContent,
  ConversationDownload,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { TooltipProvider } from "@/components/ui/tooltip";

const DEFAULT_MODEL_ID = "google/gemini-3.1-pro-preview";

function MessageAttachments({ files }: { files: FileUIPart[] }) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {files.map((file, index) => {
        const label = file.filename?.trim() || file.mediaType || "Attachment";

        return file.mediaType.startsWith("image/") ? (
          <a
            className="group block overflow-hidden rounded-lg border bg-background transition hover:border-foreground/30"
            href={file.url}
            key={`${file.url}-${index}`}
            rel="noreferrer"
            target="_blank"
          >
            <img
              alt={label}
              className="max-h-64 w-full rounded-lg object-cover"
              src={file.url}
            />
          </a>
        ) : (
          <a
            className="flex items-center gap-3 rounded-lg border bg-background/80 px-3 py-2 text-sm transition hover:border-foreground/30"
            href={file.url}
            key={`${file.url}-${index}`}
            rel="noreferrer"
            target="_blank"
          >
            <FileIcon className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="truncate font-medium">
                {label}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {file.mediaType}
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}

function ChatMessage({ message }: { message: UIMessage }) {
  const textParts: string[] = [];
  const reasoningParts: string[] = [];
  const files: FileUIPart[] = [];
  let isStreaming = false;

  for (const part of message.parts) {
    if ("state" in part && part.state === "streaming") {
      isStreaming = true;
    }

    if (isTextUIPart(part)) {
      textParts.push(part.text);
      continue;
    }

    if (isReasoningUIPart(part)) {
      reasoningParts.push(part.text);
      continue;
    }

    if (isFileUIPart(part)) {
      files.push(part);
    }
  }

  const text = textParts.join("\n\n");
  const reasoning = reasoningParts.join("\n\n");

  return (
    <Message from={message.role}>
      <div className={`flex items-start gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
        <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground">
          {message.role === "user" ? (
            <User className="size-4" />
          ) : (
            <Bot className="size-4" />
          )}
        </div>

        <MessageContent
          className={
            message.role === "user"
              ? "max-w-[85%]"
              : "max-w-[85%]"
          }
        >
          {reasoning && (
            <Reasoning
              className="mb-3"
              defaultOpen={isStreaming}
              isStreaming={isStreaming}
            >
              <ReasoningTrigger />
              <ReasoningContent>
                {reasoning}
              </ReasoningContent>
            </Reasoning>
          )}

          <MessageAttachments files={files} />

          {text ? (
            message.role === "user" ? (
              <div className="whitespace-pre-wrap break-words text-sm leading-7">
                {text}
              </div>
            ) : (
              <MessageResponse>{text}</MessageResponse>
            )
          ) : reasoning ? (
            <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
              Waiting for the final answer while the model reasons...
            </div>
          ) : null}
        </MessageContent>
      </div>
    </Message>
  );
}

export function App() {
  const { models, status, error: modelsError } = useBridgeModels();
  const {
    messages,
    sendMessage,
    clearError,
    error,
    status: chatStatus,
    stop,
    isReady: isChatReady,
    isLoading: isTransportLoading,
    transportError,
  } = useChat();
  const [requestedModelId, setRequestedModelId] = useState("");

  const selectedModelId = useMemo(
    () =>
      models.find((model) => model.id === requestedModelId)?.id ??
      models.find((model) => model.id === DEFAULT_MODEL_ID)?.id ??
      models[0]?.id ??
      "",
    [models, requestedModelId],
  );

  const isLoading = chatStatus === "submitted" || chatStatus === "streaming";
  const hasModelsFailure = status === "error" && models.length === 0;
  const hasTransportFailure = transportError != null;

  async function handleSend(input: { text: string; files: FileUIPart[] }) {
    const prompt = input.text.trim();
    const hasFiles = input.files.length > 0;

    if ((!prompt && !hasFiles) || isLoading || !selectedModelId || !isChatReady) {
      return;
    }

    clearError();

    await sendMessage(
      hasFiles
        ? {
            files: input.files,
            ...(prompt ? { text: prompt } : {}),
          }
        : { text: prompt },
      {
        body: {
          modelId: selectedModelId,
        },
      },
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-background text-foreground">
        <Conversation>
          <ConversationContent className="mx-auto w-full max-w-4xl gap-6 px-4 py-6">
            {messages.length === 0 ? (
              <ConversationEmptyState
                className="min-h-[50vh]"
                description="Use the bridge transport below to chat with any model connected through the extension."
                icon={<Bot className="size-10" />}
                title="Start a conversation"
              />
            ) : (
              messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))
            )}

            {chatStatus === "submitted" &&
              messages[messages.length - 1]?.role === "user" && (
                <Message from="assistant">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground">
                      <Bot className="size-4" />
                    </div>
                    <MessageContent>
                      <Reasoning defaultOpen isStreaming>
                        <ReasoningTrigger />
                        <ReasoningContent>
                          The model is preparing its response stream.
                        </ReasoningContent>
                      </Reasoning>
                    </MessageContent>
                  </div>
                </Message>
              )
            }

            {(error || hasModelsFailure || hasTransportFailure) && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error?.message ??
                  modelsError?.message ??
                  transportError?.message ??
                  (hasModelsFailure
                    ? "Failed to load models from the bridge."
                    : "Failed to initialize the bridge chat transport.")}
              </div>
            )}
          </ConversationContent>

          <ConversationDownload messages={messages} />
          <ConversationScrollButton />
        </Conversation>

        <div className="border-t px-3 py-2 sm:px-4">
          <div className="mx-auto w-full max-w-4xl">
            <PromptInput
              accept="image/*"
              className="w-full [&_[data-align=block-end]]:px-3 [&_[data-align=block-end]]:pb-3 [&_[data-align=block-end]]:pt-2"
              onSubmit={async ({ text, files }) => {
                await handleSend({ files, text });
              }}
            >
              <PromptInputBody>
                <PromptInputTextarea
                  className="min-h-12 border-0 bg-transparent px-3 py-3 text-base"
                  disabled={models.length === 0 || isLoading || !isChatReady}
                  placeholder={
                    models.length === 0
                        ? "Connecting to models..."
                        : !isChatReady || isTransportLoading
                          ? "Preparing chat transport..."
                        : "Ask something..."
                    }
                  />
              </PromptInputBody>

              <PromptInputFooter className="mt-1 items-center">
                <PromptInputTools>
                  <PromptInputActionMenu>
                    <PromptInputActionMenuTrigger
                      disabled={models.length === 0 || !isChatReady}
                      tooltip="Add attachment"
                    />
                    <PromptInputActionMenuContent>
                      <PromptInputActionAddAttachments />
                    </PromptInputActionMenuContent>
                  </PromptInputActionMenu>

                  <PromptInputSelect
                    onValueChange={setRequestedModelId}
                    value={selectedModelId}
                  >
                    <PromptInputSelectTrigger className="min-w-[220px]">
                      <PromptInputSelectValue placeholder="Select a model" />
                    </PromptInputSelectTrigger>
                    <PromptInputSelectContent>
                      {models.length === 0 ? (
                        <PromptInputSelectItem disabled value="no-models">
                          No models available
                        </PromptInputSelectItem>
                      ) : (
                        models.map((model) => (
                          <PromptInputSelectItem key={model.id} value={model.id}>
                            {model.name} ({model.id})
                          </PromptInputSelectItem>
                        ))
                      )}
                    </PromptInputSelectContent>
                  </PromptInputSelect>
                </PromptInputTools>

                <PromptInputSubmit
                  disabled={models.length === 0 || !isChatReady}
                  onStop={stop}
                  status={chatStatus}
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
