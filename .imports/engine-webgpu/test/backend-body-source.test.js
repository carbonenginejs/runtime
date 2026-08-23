import assert from "node:assert/strict";
import test from "node:test";
import { CjsWebgpuPackage } from "../src/index.js";
import { createBackendBodySource } from "../src/core/backendBodySource.js";

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);

function samplerBinding(binding)
{
  return {
    identity: "sampler:0:0",
    scopeIdentity: "sampler:0:0@fragment",
    resourceKind: "sampler",
    generatedSymbol: "s0",
    registerSpace: 0,
    registerIndex: 0,
    group: 0,
    binding,
    visibility: [ "fragment" ],
    type: "sampler",
    sampler: { type: "filtering" }
  };
}

function unit(key, sha256, passKey)
{
  return {
    key,
    sha256,
    wgslSetVersion: 3,
    shaders: [ {
      key: `${passKey}.vertex`,
      stageName: "vertex",
      entryPoint: "main",
      code: "// vertex",
      sourceMap: []
    } ],
    layouts: [ { key: passKey, bindGroups: [ { group: 0, bindings: [ samplerBinding(0) ] } ] } ]
  };
}

function wgslDocument()
{
  return {
    format: "CJS_WGSL_SET",
    formatVersion: 3,
    shaders: [],
    layouts: [ { key: "Main.pass0", bindGroups: [ { group: 0, bindings: [ samplerBinding(0) ] } ] } ]
  };
}

function analysisDocument()
{
  return {
    source: "res:/test/effect.dx11/quad.sm_hi",
    stages: [ {
      key: "Main.pass0.pixel",
      techniqueName: "Main",
      passIndex: 0,
      stageName: "pixel",
      stageType: 1,
      bindings: []
    } ]
  };
}

/**
 * The one package shape a `.carbonwebgpu` read produces.
 *
 * Two permutations share one body, because that is the case the join has to get
 * right: the permutation graph maps both to `body0` and the body set stores it
 * once. A fixture with one permutation per body would pass whether the engine
 * read the mapping or just used the index.
 *
 * @param {object} [overrides] Field overrides.
 * @returns {object} Package data.
 */
function packageData(overrides = {})
{
  const bodies = overrides.bodies ?? [ {
    bodyKey: "body0",
    representativePermutationIndex: 0,
    status: "translated",
    error: null,
    passCount: 2,
    passes: [ { passKey: "Main.pass0", unitKey: "unit0" }, { passKey: "Depth.pass0", unitKey: "unit1" } ]
  } ];
  const passUnits = overrides.passUnits
    ?? [ unit("unit0", SHA_A, "Main.pass0"), unit("unit1", SHA_B, "Depth.pass0") ];
  const variants = overrides.variants ?? [
    { permutationIndex: 0, bodyKey: bodies[0].bodyKey, optionIndices: [ 0 ] },
    { permutationIndex: 1, bodyKey: bodies[0].bodyKey, optionIndices: [ 1 ] }
  ];

  return {
    format: "Carbon WebGPU",
    version: 15,
    sourcePath: "res:/test/effect.dx11/quad.sm_hi",
    info: { format: "CARBON_WEBGPU", effectVersion: 15, permutationCount: variants.length },
    metadata: { bodyIndex: 4, bodyMode: "all" },
    analysis: analysisDocument(),
    wgsl: wgslDocument(),
    permutationGraph: overrides.permutationGraph !== undefined
      ? overrides.permutationGraph
      : {
        format: "CJS_EFFECT_PERMUTATION_GRAPH",
        formatVersion: 1,
        axes: [],
        variants,
        bodies: bodies.map((body) => ({ key: body.bodyKey }))
      },
    backendBodySet: overrides.backendBodySet !== undefined
      ? overrides.backendBodySet
      : {
        format: "CJS_WGSL_BODY_SET",
        formatVersion: 1,
        bodyCount: bodies.length,
        translatedBodyCount: bodies.filter((body) => body.status === "translated").length,
        passUnitCount: passUnits.length,
        passUnits,
        bodies
      }
  };
}

test("one package shape carries both the selected views and the complete body set", () =>
{
  const pkg = CjsWebgpuPackage.from(packageData());

  assert.deepEqual(pkg.wgsl, wgslDocument());
  assert.deepEqual(pkg.analysis, analysisDocument());
  assert.equal(pkg.sourcePath, "res:/test/effect.dx11/quad.sm_hi");
  assert.equal(pkg.pipelines.length, 1);
  assert.equal(pkg.pipelines[0].bindGroups[0].bindings[0].scopeIdentity, "sampler:0:0@fragment");

  // The same read that produced those pipelines also resolves bodies. Needing a
  // second, differently-emitted object for this was the whole defect.
  assert.notEqual(pkg.backendBodySource, null);
  assert.equal(pkg.GetBackendBody(0).status, "translated");
});

// A container has no chunk table, so the package must not offer one. Asserted
// rather than merely deleted: a re-added `chunks: []` reads as harmless and puts
// the retired vocabulary back on the engine's public surface.
test("the package exposes no chunk table", () =>
{
  const pkg = CjsWebgpuPackage.from(packageData());
  assert.equal("chunks" in pkg, false);
  assert.equal("chunks" in pkg.ToJSON(), false);
});

test("a package exposes its body set keyed by translation-unit identity", () =>
{
  const pkg = CjsWebgpuPackage.from(packageData());
  assert.equal(pkg.backendBodySource.bodyCount, 1);
  assert.equal(pkg.backendBodySource.unitCount, 2);
  assert.equal(pkg.backendBodySource.permutationCount, 2);

  const body = pkg.GetBackendBody(0);
  assert.equal(body.status, "translated");
  assert.equal(body.bodyKey, "body0");
  assert.equal(body.error, null);
  assert.deepEqual(body.passes.map((pass) => pass.passKey), [ "Main.pass0", "Depth.pass0" ]);
  // sha256, not the per-package ordinal key, is the shareable identity.
  assert.deepEqual(body.passes.map((pass) => pass.sha256), [ SHA_A, SHA_B ]);
  assert.deepEqual(body.passes.map((pass) => pass.unitKey), [ "unit0", "unit1" ]);
  assert.equal(body.passes[0].wgslSetVersion, 3);
  assert.equal(body.passes[0].resourceTransforms, null);
});

// The permutation-to-body mapping is the container's, decided by Carbon's alias
// dedupe. Two permutations sharing one body is the ordinary case - 480 rows over
// 24 bodies at `.sm_lo` - so resolving by index instead of by the published
// mapping would silently return the wrong body's programs.
test("distinct permutations resolve through the published mapping, not by index", () =>
{
  const pkg = CjsWebgpuPackage.from(packageData());
  const first = pkg.GetBackendBody(0);
  const second = pkg.GetBackendBody(1);

  assert.equal(first.bodyKey, "body0");
  assert.equal(second.bodyKey, "body0");
  assert.equal(first.permutationIndex, 0);
  assert.equal(second.permutationIndex, 1);
  assert.deepEqual(first.passes.map((pass) => pass.sha256), second.passes.map((pass) => pass.sha256));
});

test("a body source clones the shared unit objects it hands out", () =>
{
  const data = packageData();
  const source = createBackendBodySource(data);
  const first = source.ResolveBody(0);
  const second = source.ResolveBody(1);
  const shared = data.backendBodySet.passUnits[0];

  // Both permutations resolve to the same unit, so an uncloned hand-out would
  // let freezing one body freeze the other's passes.
  assert.notEqual(first.passes[0].shaders, shared.shaders);
  assert.notEqual(first.passes[0].shaders, second.passes[0].shaders);
  assert.deepEqual(first.passes[0].shaders, shared.shaders);

  Object.freeze(first.passes[0].shaders);
  assert.equal(Object.isFrozen(shared.shaders), false);
});

test("an unsupported body is a success return carrying its reason", () =>
{
  const pkg = CjsWebgpuPackage.from(packageData({
    bodies: [ {
      bodyKey: "body7",
      representativePermutationIndex: 0,
      status: "unsupported",
      error: "geometry stage is not supported",
      passCount: 0,
      passes: []
    } ],
    variants: [ { permutationIndex: 0, bodyKey: "body7", optionIndices: [ 0 ] } ]
  }));

  const body = pkg.GetBackendBody(0);
  assert.equal(body.status, "unsupported");
  assert.equal(body.bodyKey, "body7");
  assert.equal(body.error, "geometry stage is not supported");
  assert.deepEqual(body.passes, []);
});

test("an unresolvable permutation is named as an ingestion fault, never as an empty body", () =>
{
  const pkg = CjsWebgpuPackage.from(packageData());
  assert.throws(
    () => pkg.GetBackendBody(9),
    /resolved no backend body.*permutation graph.*out of range/su
  );
});

test("a package with no body set is not an error", () =>
{
  const pkg = CjsWebgpuPackage.from(packageData({ backendBodySet: null }));
  assert.equal(pkg.backendBodySource, null);
  assert.equal(pkg.GetBackendBody(0), null);
});

test("a body set with unusable translation-unit identities fails closed", () =>
{
  assert.throws(
    () => createBackendBodySource(packageData({
      passUnits: [ { ...unit("unit0", SHA_A, "Main.pass0"), sha256: undefined } ]
    })),
    /unit0 has no sha256 identity/u
  );

  assert.throws(
    () => createBackendBodySource(packageData({
      passUnits: [ unit("unit0", SHA_A, "Main.pass0"), unit("unit0", SHA_B, "Depth.pass0") ]
    })),
    /duplicates translation unit unit0/u
  );

  const missingUnit = packageData({ passUnits: [ unit("unit0", SHA_A, "Main.pass0") ] });
  assert.throws(
    () => createBackendBodySource(missingUnit).ResolveBody(0),
    /references missing translation unit unit1/u
  );
});

// Both documents are checked by format string rather than duck-typed. A body set
// and a permutation graph are plain objects, so a mis-wired producer handing over
// the wrong document would otherwise read as "no variants" - which is silence.
test("the body seam fails closed on a document that is not what it claims to be", () =>
{
  assert.throws(
    () => createBackendBodySource(packageData({
      backendBodySet: { format: "WGSB", passUnits: [], bodies: [] }
    })),
    /body set declares format "WGSB", expected CJS_WGSL_BODY_SET/u
  );

  assert.throws(
    () => createBackendBodySource(packageData({
      permutationGraph: { format: "PGRF", variants: [] }
    })),
    /permutation graph declares format "PGRF", expected CJS_EFFECT_PERMUTATION_GRAPH/u
  );

  assert.throws(
    () => createBackendBodySource(packageData({
      variants: [ { permutationIndex: 0, bodyKey: "bodyNope", optionIndices: [ 0 ] } ]
    })),
    /permutation 0 names body bodyNope, which the body set does not carry/u
  );
});
