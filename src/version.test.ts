import { describe, it, expect } from "vitest";
import { compareVersions, getVersion, VERSION } from "./version.js";

describe("compareVersions", () => {
  it("should return 0 for equal versions", () => {
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("0.4.28", "0.4.28")).toBe(0);
    expect(compareVersions("2.10.5", "2.10.5")).toBe(0);
  });

  it("should return -1 when v1 < v2", () => {
    expect(compareVersions("1.0.0", "2.0.0")).toBe(-1);
    expect(compareVersions("0.4.27", "0.4.28")).toBe(-1);
    expect(compareVersions("1.9.0", "1.10.0")).toBe(-1);
    expect(compareVersions("0.0.1", "0.0.2")).toBe(-1);
  });

  it("should return 1 when v1 > v2", () => {
    expect(compareVersions("2.0.0", "1.0.0")).toBe(1);
    expect(compareVersions("0.4.28", "0.4.27")).toBe(1);
    expect(compareVersions("1.10.0", "1.9.0")).toBe(1);
    expect(compareVersions("0.0.2", "0.0.1")).toBe(1);
  });

  it("should handle versions with different segment counts", () => {
    expect(compareVersions("1.0", "1.0.0")).toBe(0);
    expect(compareVersions("1.0.0", "1.0")).toBe(0);
    expect(compareVersions("1.0", "1.0.1")).toBe(-1);
    expect(compareVersions("1.0.1", "1.0")).toBe(1);
  });

  it("should handle single segment versions", () => {
    expect(compareVersions("1", "2")).toBe(-1);
    expect(compareVersions("2", "1")).toBe(1);
    expect(compareVersions("1", "1")).toBe(0);
  });

  it("should handle multi-digit version numbers", () => {
    expect(compareVersions("0.4.28", "0.4.100")).toBe(-1);
    expect(compareVersions("0.10.0", "0.9.0")).toBe(1);
    expect(compareVersions("10.0.0", "9.0.0")).toBe(1);
  });
});

describe("getVersion", () => {
  it("should return a version string", () => {
    const version = getVersion();
    expect(typeof version).toBe("string");
    expect(version.length).toBeGreaterThan(0);
  });

  it("should match semver format or be 'unknown'", () => {
    const version = getVersion();
    const semverPattern = /^\d+\.\d+\.\d+$/;
    expect(version === "unknown" || semverPattern.test(version)).toBe(true);
  });
});

describe("VERSION", () => {
  it("should be a string", () => {
    expect(typeof VERSION).toBe("string");
  });

  it("should match getVersion result", () => {
    expect(VERSION).toBe(getVersion());
  });
});
