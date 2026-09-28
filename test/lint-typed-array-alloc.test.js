// Fixture tests for scripts/lint-typed-array-alloc.js: each flagged case next to
// an allowed form of the same code, so a scanner that flags nothing (or
// everything) fails.
import assert from "node:assert/strict";
import test from "node:test";
import { scanTypedArrayAlloc } from "../scripts/typed-array-alloc.js";

const kinds = code => scanTypedArrayAlloc(code, "fixture.js").allocations.map(site => site.kind);
const scratch = code => scanTypedArrayAlloc(code, "fixture.js").scratchProblems;
const pool = code => scanTypedArrayAlloc(code, "fixture.js").poolProblems;

test("a fixed-size typed array is flagged anywhere", () =>
{
  const code = `
    const top = new Float32Array(3);
    class A
    {
      field = new Float32Array([ 1, 0, 0, -1 ]);
      constructor() { this.m = new Float64Array(16); }
    }`;
  assert.deepEqual(kinds(code), [ "Float32Array(fixed size)", "Float32Array(fixed size)", "Float64Array(fixed size)" ]);
});

test("a fixed-size typed array inside static scratch, or a data-length one outside functions, is allowed (negative control)", () =>
{
  const code = `
    const table = new Uint16Array(COUNT * 2);
    class A
    {
      static scratch = { vec4_0: new Float32Array(4) };
      field = new Float32Array(size);
    }`;
  assert.deepEqual(kinds(code), []);
});

test("a per-call typed array or math value inside a function body is flagged", () =>
{
  const code = `
    class A
    {
      constructor() { this.v = vec3.create(); }
      Update(source, n)
      {
        const a = new Float32Array(n);
        const b = mat4.clone(source);
        const c = box3.create();
        const d = vec4.fromValues(0, 0, 0, 1);
        return [ a, b, c, d ];
      }
    }`;
  assert.deepEqual(kinds(code), [ "vec3.create", "new Float32Array", "mat4.clone", "box3.create", "vec4.fromValues" ]);
});

test("the same values at module level, in fields, in static scratch, or marked, are allowed (negative control)", () =>
{
  const code = `
    const top = vec3.create();
    class A
    {
      static scratch = { vec3_0: vec3.create(), mat4_0: mat4.create() };
      field = mat4.create();
      Update(n)
      {
        const kept = new Float32Array(n); // alloc: stored on the caller's record
        const scratch = vec3.alloc();
        vec3.unalloc(scratch);
        return kept;
      }
      Other(node) { return node.clone(); }
    }`;
  assert.deepEqual(kinds(code), []);
});

test("scratch slots are named type_index", () =>
{
  assert.match(scratch("class A { static scratch = { vec3_0: vec3.create(), normal: vec3.create() }; }")[0], /slot "normal"/u);
  assert.deepEqual(scratch("class A { static scratch = { vec3_0: vec3.create(), box3_1: box3.create() }; }"), []);
});

test("a local bound from scratch keeps the slot's name", () =>
{
  assert.match(scratch("function F() { const { vec3_0: v } = this.constructor.scratch; vec3.set(v, 0, 0, 0); }")[0], /renames scratch slot "vec3_0"/u);
  assert.match(scratch("function F() { const v = A.scratch.vec3_0; }")[0], /renames scratch slot "vec3_0"/u);
  assert.deepEqual(scratch("function F() { const { vec3_0, mat4_0 } = this.constructor.scratch; const vec3_1 = A.scratch.vec3_1; }"), []);
});

test("scratch stored in a field, returned, or captured by a closure is flagged", () =>
{
  assert.match(scratch("function F() { const { vec3_0 } = A.scratch; this.position = vec3_0; }")[0], /stored in this\.position/u);
  assert.match(scratch("function F() { const { vec3_0 } = A.scratch; return vec3_0; }")[0], /is returned/u);
  assert.match(scratch("function F(list) { const { vec3_0 } = A.scratch; list.forEach(x => vec3.add(vec3_0, vec3_0, x)); }")[0], /captured by a closure/u);
});

test("scratch used and copied out is allowed (negative control)", () =>
{
  assert.deepEqual(scratch("function F(out) { const { vec3_0 } = A.scratch; vec3.set(vec3_0, 1, 2, 3); vec3.copy(this.position, vec3_0); return vec3.copy(out, vec3_0); }"), []);
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

test("returning pooled values needs the marker", () =>
{
  assert.match(pool("function F() { const v = vec3.alloc();\n return v; }")[0], /never given back/u);
  assert.deepEqual(pool("function F() { const v = vec3.alloc(); // pool-return: the caller releases it\n return v; }"), []);
});

test("an alloc that takes arguments is a frame lease, not the math pool", () =>
{
  assert.deepEqual(pool("function F(acc) { const data = Tr2PerObjectDataStandard.alloc(acc, \"VS\", \"PS\"); return data; }"), []);
});

test("pool use in a function that does not call itself is info, and recursion is not (negative control)", () =>
{
  const info = code => scanTypedArrayAlloc(code, "fixture.js").poolInfo;
  assert.equal(info("function F() { const v = vec3.alloc(); vec3.unalloc(v); }").length, 1);
  assert.equal(info("function F(n) { const v = vec3.alloc(); if (n) F(n - 1); vec3.unalloc(v); }").length, 0);
});
