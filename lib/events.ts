/**
 * Simple event bus for cross-component state coordination.
 * Allows components to broadcast and listen for data changes
 * without tight coupling or prop drilling.
 */

type EventCallback<T = unknown> = (data: T) => void;

class EventBus {
  private listeners = new Map<string, Set<EventCallback>>();

  on<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback as EventCallback);
    };
  }

  emit<T = unknown>(event: string, data?: T): void {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  off(event: string, callback?: EventCallback): void {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
    } else {
      this.listeners.delete(event);
    }
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Event type constants
export const Events = {
  CONVERSATIONS_CHANGED: "conversations:changed",
  CONVERSATION_CREATED: "conversation:created",
  CONVERSATION_UPDATED: "conversation:updated",
  CONVERSATION_DELETED: "conversation:deleted",
  CHARACTERS_CHANGED: "characters:changed",
  CHARACTER_CREATED: "character:created",
  CHARACTER_UPDATED: "character:updated",
  CHARACTER_DELETED: "character:deleted",
} as const;
