// SSE EventSource wrapper with reconnection
// Used by the workspace chat pane to stream code generation events

type SSECallback = {
  onInit?: (data: Record<string, unknown>) => void;
  onTextDelta?: (text: string) => void;
  onWorkspaceReady?: (data: Record<string, unknown>) => void;
  onDone?: (data: Record<string, unknown>) => void;
  onError?: (err: Error | Event) => void;
};

interface SSEClient {
  close: () => void;
}

let globalEventSource: EventSource | null = null;

export function connectSSE(
  url: string,
  callbacks: SSECallback
): SSEClient {
  if (globalEventSource) {
    globalEventSource.close();
  }

  const es = new EventSource(url);
  globalEventSource = es;

  es.addEventListener("init", (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      callbacks.onInit?.(data);
    } catch {
      // ignore malformed
    }
  });

  es.addEventListener("text_delta", (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      callbacks.onTextDelta?.(data.text ?? data.content ?? "");
    } catch {
      // ignore
    }
  });

  es.addEventListener("workspace_ready", (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      callbacks.onWorkspaceReady?.(data);
    } catch {
      // ignore
    }
  });

  es.addEventListener("done", (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      callbacks.onDone?.(data);
    } catch {
      // ignore
    }
    es.close();
    globalEventSource = null;
  });

  es.onerror = (err) => {
    callbacks.onError?.(err);
    // EventSource auto-reconnects by default
  };

  return {
    close: () => {
      es.close();
      globalEventSource = null;
    },
  };
}

/**
 * POST to the chat endpoint and return an EventSource url.
 * The gateway will create an SSE stream.
 */
export function getChatSSEUrl(projectId: string): string {
  return `/api/chat/stream?projectId=${encodeURIComponent(projectId)}`;
}

export function closeSSE(): void {
  if (globalEventSource) {
    globalEventSource.close();
    globalEventSource = null;
  }
}

// Message types for the chat pane
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export function createChatMessage(
  role: ChatMessage["role"],
  content: string
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: Date.now(),
  };
}
