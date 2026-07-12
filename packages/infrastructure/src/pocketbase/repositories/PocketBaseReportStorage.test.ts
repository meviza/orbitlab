// @ts-nocheck — infrastructure package has no @types/node; domain excludes *.test.ts.
/**
 * Pure unit tests (no network). Run:
 *   pnpm --filter @orbitlab/domain exec tsx --test \
 *     ../infrastructure/src/pocketbase/repositories/PocketBaseReportStorage.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DomainError, err, ok } from "@orbitlab/domain";
import {
  assertSafeRunId,
  buildReportPath,
  buildReportUploadPath,
  PocketBaseReportStorage,
  REPORT_COLLECTION,
  REPORT_CONTENT_TYPES,
  REPORT_FIELD_NAMES,
} from "./PocketBaseReportStorage.js";

/** In-memory FileStoragePort — no network. */
function fakeFileStorage(handlers = {}) {
  return {
    upload:
      handlers.upload ?? (async () => err(DomainError.validation("unused"))),
    getUrl:
      handlers.getUrl ?? (async () => err(DomainError.validation("unused"))),
  };
}

describe("assertSafeRunId", () => {
  it("accepts alphanumeric run ids", () => {
    const r = assertSafeRunId("abc123xyz000001");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value, "abc123xyz000001");
  });

  it("trims whitespace", () => {
    const r = assertSafeRunId("  run01  ");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value, "run01");
  });

  it("rejects empty / whitespace-only", () => {
    for (const bad of ["", "   "]) {
      const r = assertSafeRunId(bad);
      assert.equal(r.ok, false);
      if (!r.ok) {
        assert.ok(r.error instanceof DomainError);
        assert.equal(r.error.code, "VALIDATION");
      }
    }
  });

  it("rejects path traversal and special characters", () => {
    for (const bad of [
      "../etc",
      "a/b",
      "a\\b",
      "run.id",
      "run-id",
      "run_id",
      "id with space",
      "rün",
    ]) {
      const r = assertSafeRunId(bad);
      assert.equal(r.ok, false, `expected reject for ${JSON.stringify(bad)}`);
      if (!r.ok) assert.equal(r.error.code, "VALIDATION");
    }
  });
});

describe("buildReportPath", () => {
  it("builds sim_runs/${runId}/report.${kind}", () => {
    for (const kind of ["md", "csv", "html"]) {
      const r = buildReportPath("abc123xyz000001", kind);
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.equal(
          r.value,
          `${REPORT_COLLECTION}/abc123xyz000001/report.${kind}`
        );
      }
    }
  });

  it("fails when runId is unsafe", () => {
    const r = buildReportPath("../x", "md");
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.code, "VALIDATION");
  });
});

describe("buildReportUploadPath", () => {
  it("maps kind to PB field names", () => {
    assert.deepEqual(
      buildReportUploadPath("run1", "md"),
      ok(`${REPORT_COLLECTION}/run1/${REPORT_FIELD_NAMES.md}`)
    );
    assert.deepEqual(
      buildReportUploadPath("run1", "csv"),
      ok(`${REPORT_COLLECTION}/run1/${REPORT_FIELD_NAMES.csv}`)
    );
    assert.deepEqual(
      buildReportUploadPath("run1", "html"),
      ok(`${REPORT_COLLECTION}/run1/${REPORT_FIELD_NAMES.html}`)
    );
  });
});

describe("PocketBaseReportStorage", () => {
  it("exposes pure helpers without FileStoragePort", () => {
    const storage = new PocketBaseReportStorage();
    assert.deepEqual(
      storage.buildReportPath("r1", "md"),
      ok("sim_runs/r1/report.md")
    );
    assert.deepEqual(storage.assertSafeRunId("r1"), ok("r1"));
  });

  it("uploadReport errors when FileStoragePort is missing", async () => {
    const storage = new PocketBaseReportStorage();
    const r = await storage.uploadReport("r1", "md", new Uint8Array([1]));
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.match(r.error.message, /FileStoragePort is not configured/);
    }
  });

  it("getReportUrl errors when FileStoragePort is missing", async () => {
    const storage = new PocketBaseReportStorage();
    const r = await storage.getReportUrl("r1", "html");
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.match(r.error.message, /FileStoragePort is not configured/);
    }
  });

  it("uploadReport delegates to FileStoragePort with PB field path + content type", async () => {
    let seen;
    const files = fakeFileStorage({
      upload: async (input) => {
        seen = input;
        return ok({ path: input.path, url: "https://example.test/file" });
      },
    });

    const storage = new PocketBaseReportStorage(files);
    const data = new TextEncoder().encode("# report");
    const r = await storage.uploadReport("run99", "md", data);

    assert.equal(r.ok, true);
    assert.ok(seen);
    assert.equal(seen.path, "sim_runs/run99/report_md");
    assert.equal(seen.contentType, REPORT_CONTENT_TYPES.md);
    assert.equal(seen.data, data);
    if (r.ok) {
      assert.equal(r.value.url, "https://example.test/file");
    }
  });

  it("uploadReport rejects unsafe runId before calling storage", async () => {
    let called = false;
    const files = fakeFileStorage({
      upload: async () => {
        called = true;
        return ok({ path: "x", url: "y" });
      },
    });

    const storage = new PocketBaseReportStorage(files);
    const r = await storage.uploadReport("bad/id", "csv", new Uint8Array());
    assert.equal(r.ok, false);
    assert.equal(called, false);
  });

  it("getReportUrl delegates to FileStoragePort", async () => {
    let path;
    const files = fakeFileStorage({
      getUrl: async (p) => {
        path = p;
        return ok("https://cdn.example/report.html");
      },
    });

    const storage = new PocketBaseReportStorage(files);
    const r = await storage.getReportUrl("id01", "html");
    assert.equal(r.ok, true);
    assert.equal(path, "sim_runs/id01/report_html");
    if (r.ok) assert.equal(r.value, "https://cdn.example/report.html");
  });

  it("propagates FileStoragePort errors", async () => {
    const files = fakeFileStorage({
      upload: async () => err(DomainError.validation("pb refused")),
    });

    const storage = new PocketBaseReportStorage(files);
    const r = await storage.uploadReport("okid", "csv", new ArrayBuffer(0));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.message, "pb refused");
  });
});
