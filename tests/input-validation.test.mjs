import test from "node:test";
import assert from "node:assert/strict";
import { validDate, validTime, validGoals } from "../lib/validation.mjs";
import { cleanMemo } from "../lib/memo-sanitize.mjs";

test("rejects impossible calendar dates and clock times", () => {
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2028-02-29"), true);
  assert.equal(validDate({}), false);
  assert.equal(validTime("24:99"), false);
  assert.equal(validTime("23:59"), true);
});

test("rejects malformed goal structures before persistence", () => {
  assert.equal(validGoals({ mandala: {}, roots: [] }), false);
  const doc = { motto: "", center: "", roots: Array(4).fill({ tag: "", title: "", desc: "" }),
    mandala: Array(8).fill({ key: "A", name: "", items: [] }) };
  assert.equal(validGoals(doc), true);
  assert.equal(validGoals({ ...doc, center: 5 }), false);
});

test("removes executable pasted markup while preserving editor content", () => {
  const output = cleanMemo('<h2>Notes</h2><script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">link</a><input type="text" onfocus="alert(1)"><table><tr><td>cell</td></tr></table>');
  assert.doesNotMatch(output, /script|onerror|onfocus|javascript:|type="text"/);
  assert.match(output, /<h2>Notes<\/h2>/);
  assert.match(output, /<td>cell<\/td>/);
  assert.match(output, /type="checkbox"/);
});
