import { SseEvent, EventType } from "./types";
import { API_BASE } from "./api";

type EventHandler = (evt: SseEvent) => void;

export class ConversationSse {
  private es: EventSource | null = null;
  private url: string;
  private handler: EventHandler;
  private reconnectDelay = 1000;
  private closed = false;

  constructor(conversationId: string, handler: EventHandler) {
    const base = (API_BASE || "").replace(/\/$/, "");
    this.url = base ? `${base}/chat/${conversationId}/stream` : `/chat/${conversationId}/stream`;
    this.handler = handler;
    this.connect();
  }

  private connect() {
    this.closed = false;
  // Use non-credentialed EventSource for prototype (server uses Access-Control-Allow-Origin: *).
  this.es = new EventSource(this.url);

    // Generic onmessage used as fallback
    this.es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        this.handler(payload as SseEvent);
      } catch (err) {
        // ignore parse errors
      }
    };

    // Map known event types to specific handlers
    const eventTypes: EventType[] = [
      "typing",
      "tool_call_started",
      "tool_call_finished",
      "text_delta",
      "citation_map",
      "citation",
      "info",
      "error",
      "done",
    ];

    eventTypes.forEach((t) => {
      this.es!.addEventListener(t, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          this.handler({ type: t, data });
        } catch (err) {
          // ignore
        }
      });
    });

    this.es.onerror = () => {
      if (this.closed) return;
      // try reconnect after a delay
      this.es?.close();
      setTimeout(() => this.connect(), this.reconnectDelay);
    };
  }

  public close() {
    this.closed = true;
    this.es?.close();
    this.es = null;
  }
}
