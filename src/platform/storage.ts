// Save storage behind a tiny interface. The browser build uses localStorage;
// a Steam/Electron build can swap in a file- or Steam-Cloud-backed implementation.

export interface SaveStorage {
  load(key: string): string | null;
  save(key: string, value: string): void;
  remove(key: string): void;
}

export class LocalStorageSave implements SaveStorage {
  load(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  save(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* quota or private mode: ignore */ }
  }
  remove(key: string): void {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }
}

export class MemorySave implements SaveStorage {
  private m = new Map<string, string>();
  load(key: string) { return this.m.get(key) ?? null; }
  save(key: string, value: string) { this.m.set(key, value); }
  remove(key: string) { this.m.delete(key); }
}
