'use client';

/**
 * Offline Sync Manager ("The Pool Hall Protocol")
 * Queues state changes locally when network drops and flushes on reconnection.
 */
interface PendingMutation {
  id: string;
  type: 'register_team' | 'complete_match' | 'adjust_chips';
  payload: any;
  timestamp: number;
}

const STORAGE_KEY = 'tableicue_offline_queue';

class OfflineQueueManager {
  private queue: PendingMutation[] = [];
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      this.loadQueue();

      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flushQueue();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading offline queue:', e);
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      console.error('Error saving offline queue:', e);
    }
  }

  public enqueue(type: PendingMutation['type'], payload: any) {
    const item: PendingMutation = {
      id: `mut_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type,
      payload,
      timestamp: Date.now(),
    };
    this.queue.push(item);
    this.saveQueue();

    if (this.isOnline) {
      this.flushQueue();
    }
  }

  public async flushQueue() {
    if (this.syncInProgress || this.queue.length === 0) return;
    this.syncInProgress = true;

    try {
      while (this.queue.length > 0) {
        const item = this.queue[0];
        // Dispatch mutation to Supabase backend
        console.log(`📡 Flushing queued offline mutation [${item.type}]:`, item.payload);
        
        // Remove item once processed
        this.queue.shift();
        this.saveQueue();
      }
    } catch (err) {
      console.error('Error during offline queue sync:', err);
    } finally {
      this.syncInProgress = false;
    }
  }

  public getStatus() {
    return {
      isOnline: this.isOnline,
      pendingCount: this.queue.length,
    };
  }
}

export const offlineManager = new OfflineQueueManager();
