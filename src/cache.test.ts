import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MemoryCache, CacheTTL, CacheKeys } from "./cache.js";

describe("MemoryCache", () => {
  let cache: MemoryCache;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new MemoryCache(60_000);
  });

  afterEach(() => {
    cache.destroy();
    vi.useRealTimers();
  });

  describe("get/set", () => {
    it("should store and retrieve a value", () => {
      cache.set("key1", "value1", 5000);
      expect(cache.get("key1")).toBe("value1");
    });

    it("should return undefined for non-existent keys", () => {
      expect(cache.get("nonexistent")).toBeUndefined();
    });

    it("should return undefined for expired entries", () => {
      cache.set("key1", "value1", 1000);
      expect(cache.get("key1")).toBe("value1");

      vi.advanceTimersByTime(1001);
      expect(cache.get("key1")).toBeUndefined();
    });

    it("should handle different value types", () => {
      cache.set("string", "hello", 5000);
      cache.set("number", 42, 5000);
      cache.set("object", { foo: "bar" }, 5000);
      cache.set("array", [1, 2, 3], 5000);

      expect(cache.get("string")).toBe("hello");
      expect(cache.get("number")).toBe(42);
      expect(cache.get("object")).toEqual({ foo: "bar" });
      expect(cache.get("array")).toEqual([1, 2, 3]);
    });
  });

  describe("delete", () => {
    it("should delete a specific key", () => {
      cache.set("key1", "value1", 5000);
      cache.set("key2", "value2", 5000);

      expect(cache.delete("key1")).toBe(true);
      expect(cache.get("key1")).toBeUndefined();
      expect(cache.get("key2")).toBe("value2");
    });

    it("should return false when deleting non-existent key", () => {
      expect(cache.delete("nonexistent")).toBe(false);
    });
  });

  describe("deleteByPrefix", () => {
    it("should delete all keys matching a prefix", () => {
      cache.set("user:1", "alice", 5000);
      cache.set("user:2", "bob", 5000);
      cache.set("project:1", "proj1", 5000);

      const deleted = cache.deleteByPrefix("user:");
      expect(deleted).toBe(2);
      expect(cache.get("user:1")).toBeUndefined();
      expect(cache.get("user:2")).toBeUndefined();
      expect(cache.get("project:1")).toBe("proj1");
    });

    it("should return 0 when no keys match", () => {
      cache.set("key1", "value1", 5000);
      expect(cache.deleteByPrefix("nomatch:")).toBe(0);
    });
  });

  describe("clear", () => {
    it("should remove all entries", () => {
      cache.set("key1", "value1", 5000);
      cache.set("key2", "value2", 5000);

      cache.clear();
      expect(cache.get("key1")).toBeUndefined();
      expect(cache.get("key2")).toBeUndefined();
    });
  });
});

describe("CacheTTL", () => {
  it("should have expected TTL values", () => {
    expect(CacheTTL.WORKSPACE).toBe(5 * 60 * 1000);
    expect(CacheTTL.PROJECT).toBe(5 * 60 * 1000);
    expect(CacheTTL.SESSION_INIT).toBe(60 * 1000);
    expect(CacheTTL.MEMORY_EVENTS).toBe(30 * 1000);
    expect(CacheTTL.SEARCH).toBe(60 * 1000);
    expect(CacheTTL.USER_PREFS).toBe(5 * 60 * 1000);
    expect(CacheTTL.CREDIT_BALANCE).toBe(60 * 1000);
  });
});

describe("CacheKeys", () => {
  it("should generate correct workspace key", () => {
    expect(CacheKeys.workspace("ws-123")).toBe("workspace:ws-123");
  });

  it("should generate correct workspaceList key", () => {
    expect(CacheKeys.workspaceList("user-456")).toBe("workspaces:user-456");
  });

  it("should generate correct project key", () => {
    expect(CacheKeys.project("proj-789")).toBe("project:proj-789");
  });

  it("should generate correct projectList key", () => {
    expect(CacheKeys.projectList("ws-123")).toBe("projects:ws-123");
  });

  it("should generate correct sessionInit key", () => {
    expect(CacheKeys.sessionInit("ws-123", "proj-456")).toBe("session_init:ws-123:proj-456");
    expect(CacheKeys.sessionInit("ws-123")).toBe("session_init:ws-123:");
    expect(CacheKeys.sessionInit()).toBe("session_init::");
  });

  it("should generate correct memoryEvents key", () => {
    expect(CacheKeys.memoryEvents("ws-123")).toBe("memory:ws-123");
  });

  it("should generate correct search key", () => {
    expect(CacheKeys.search("query", "ws-123")).toBe("search:ws-123:query");
    expect(CacheKeys.search("query")).toBe("search::query");
  });

  it("should generate correct creditBalance key", () => {
    expect(CacheKeys.creditBalance()).toBe("credits:balance");
  });
});
