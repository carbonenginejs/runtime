// Fixture tests for scripts/lint-typed-array-alloc.js: each flagged kind next to
// an allowed form of the same code, so a scanner that flags nothing (or
// everything) fails.
import assert from "node:assert/strict";
import test from "node:test";
import { scanTypedArrayAlloc } from "../scripts/typed-array-alloc.js";

const kinds = code => scanTypedArrayAlloc(code, "fixture.js").allocations.map(site => site.kind);
const pool = code => scanTypedArrayAlloc(code, "fixture.js").poolProblems;

test("every allocation kind is flagged inside a method", () =>
{
  const code = `
    class A
    {
      Update(source)
      {
        const a = new Float32Array(4);
        const b = Float32Array.from(source);
        const c = vec3.create();
        const d = mat4.clone(source);
        const e = source.subarray(0, 3);
        const f = a.slice(0, 2);
        return [ a, b, c, d, e, f ];
      }
    }`;
  assert.deepEqual(kinds(code), [ "new Float32Array", "Float32Array.from", "vec3.create", "mat4.clone", ".subarray", ".slice" ]);
});

test("the same allocations are allowed where the value is made once (negative control)", () =>
{
  const code = `
    const top = new Float32Array(4);
    class A
    {
      field = vec3.create();
      static shared = new Float64Array(8);
      static { A.more = mat4.create(); }
      constructor() { this.x = new Uint8Array(2); }
      CreateBuffer(n) { return new Float32Array(n); }
      allocScratch() { return vec4.create(); }
      CloneValue(v) { return vec3.clone(v); }
      Update(out)
      {
        const kept = new Float32Array(3); // alloc: stored on the caller's record
        const scratch = vec3.alloc();
        vec3.unalloc(scratch);
        return kept;
      }
    }`;
  assert.deepEqual(kinds(code), []);
});

test(".slice is only flagged on a name known to hold a typed array", () =>
{
  assert.deepEqual(kinds("function F(list) { return list.slice(1); }"), []);
  assert.deepEqual(kinds("function F() { const t = new Int32Array(2); return t.slice(1); }"), [ "new Int32Array", ".slice" ]);
});

test("a balanced alloc/unalloc passes, including release in finally", () =>
{
  assert.deepEqual(pool("function F(a) { const v = vec3.alloc(); vec3.add(v, a, a); vec3.unalloc(v); }"), []);
  assert.deepEqual(pool("function F(a) { const v = vec3.alloc(); try { if (a) return 1; } finally { vec3.unalloc(v); } }"), []);
});

test("a missing unalloc is flagged", () =>
{
  const problems = pool("function F(a) { const v = vec3.alloc(); vec3.add(v, a, a); }");
  assert.equal(problems.length, 1);
  assert.match(problems[0], /never given back/u);
});

test("an early return or throw between alloc and unalloc is flagged", () =>
{
  assert.match(pool("function F(a) { const v = vec3.alloc(); if (!a) return;\n vec3.unalloc(v); }")[0], /return at line 1/u);
  assert.match(pool("function F(a) { const v = vec3.alloc();\n if (!a) throw new Error();\n vec3.unalloc(v); }")[0], /throw at line 2/u);
});

test("releasing through a different pool type is flagged", () =>
{
  assert.match(pool("function F() { const v = vec3.alloc(); vec2.unalloc(v); }")[0], /vec3\.alloc\(\) but released with vec2\.unalloc\(\)/u);
});

test("returning pooled scratch needs the marker", () =>
{
  assert.match(pool("function F() { const v = vec3.alloc();\n return v; }")[0], /never given back/u);
  assert.deepEqual(pool("function F() { const v = vec3.alloc(); // pool-return: the caller releases it\n return v; }"), []);
});

test("an alloc that takes arguments is a frame lease, not the math pool", () =>
{
  assert.deepEqual(pool("function F(acc) { const data = Tr2PerObjectDataStandard.alloc(acc, \"VS\", \"PS\"); return data; }"), []);
});
