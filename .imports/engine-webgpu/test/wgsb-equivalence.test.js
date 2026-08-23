import assert from "node:assert/strict";
import test from "node:test";
import { CjsWebgpuPackage } from "../src/index.js";
import {
  buildAllBodyPackage,
  buildSelectedPackage,
  corpusSkipReason,
  manifestFixture
} from "./support/effectPackages.js";

/**
 * Equivalence between the body-set path and the selected-package path, on real
 * effects.
 *
 * Both start from the same container. A selected package translates one body and
 * bakes its programs into the views the engine reads directly; an every-body
 * package translates all of them and reaches one through `GetBackendBody`. They
 * must agree on every field that determines what the GPU does, or the body set
 * is resolving to something other than what selection picked.
 *
 * This is stronger than a pixel comparison and costs seconds rather than a
 * device: both paths converge on a JSON blob consumed by byte-identical browser
 * code, so JSON equality of the GPU-determining fields deterministically
 * implies pixel equality. A JSON diff also names the discrepant field, where a
 * pixel diff says "row 47 byte 12 is 203 vs 204".
 *
 * Both packages are built in process from pinned source bytes; see
 * `test/support/effectPackages.js` for why, and for the one gate that remains.
 */

const SKIP = corpusSkipReason();
const BACKENDS = [ "dx11", "dx12" ];

// Fields a translation unit deliberately does not carry. A unit is stage
// bytecode, semantic bindings and layouts; Carbon reflection and render states
// belong to the description, which the body set does not duplicate. Enumerating
// them means a future drift into a GPU-determining field cannot hide inside
// "they always differed".
const ANALYSIS_ONLY_PIPELINE_FIELDS = Object.freeze([ "renderStates" ]);
const ANALYSIS_ONLY_MODULE_FIELDS = Object.freeze([
  "pipelineInputs", "bindings", "shaderBytecode", "dxbc", "dxbcError", "sourceMap", "shaderRecord"
]);
const ANALYSIS_ONLY_BINDING_FIELDS = Object.freeze([
  "name", "stageName", "stageType", "metadataName", "carbon", "annotations",
  "heapView", "stages", "isSRGB", "bufferKind", "dynamic"
]);

async function readerModule()
{
  return import("@carbonenginejs/runtime-resource/formats/webgpu");
}

function stageProjection(modules)
{
  return modules
    .map((entry) => ({
      stageName: entry.stageName,
      stageType: entry.stageType,
      entryPoint: entry.entryPoint,
      wgsl: entry.wgsl
    }))
    .sort((left, right) => left.stageName.localeCompare(right.stageName));
}

function bindingProjection(bindGroups)
{
  return bindGroups
    .flatMap((group) => group.bindings.map((entry) => ({
      group: entry.group,
      binding: entry.binding,
      identity: entry.identity,
      scopeIdentity: entry.scopeIdentity,
      resourceKind: entry.resourceKind,
      bindingKind: entry.bindingKind,
      access: entry.access,
      generatedSymbol: entry.generatedSymbol,
      registerSpace: entry.registerSpace,
      registerIndex: entry.registerIndex,
      registerCount: entry.registerCount,
      arrayCount: entry.arrayCount,
      visibility: entry.visibility,
      structureStride: entry.structureStride ?? null,
      layout: entry.layout,
      sourceTruth: entry.sourceTruth
    })))
    .sort((left, right) => (left.group - right.group) || (left.binding - right.binding));
}

function differingFields(left, right)
{
  return [ ...new Set([ ...Object.keys(left || {}), ...Object.keys(right || {}) ]) ]
    .filter((field) => JSON.stringify(left?.[field]) !== JSON.stringify(right?.[field]));
}

test("body-set and selected-package pipelines agree on every GPU-determining field", { skip: SKIP }, async () =>
{
  const { CjsWebgpuFormat } = await readerModule();
  const fixture = await manifestFixture("quadv5-ppt-main");

  for (const backend of BACKENDS)
  {
    const all = await buildAllBodyPackage(CjsWebgpuFormat, fixture, backend);
    const selectedBuild = await buildSelectedPackage(CjsWebgpuFormat, fixture, backend);

    // One emit, read once. The same document carries the selected views and the
    // complete body set; needing a second, differently-emitted object for the
    // latter was the defect this test now covers.
    const allJson = CjsWebgpuFormat.read(all.bytes, { source: all.source });
    const allBody = CjsWebgpuPackage.from(allJson);
    const selected = CjsWebgpuPackage.fromBytes(selectedBuild.bytes, {
      read: CjsWebgpuFormat.read,
      readOptions: { source: selectedBuild.source }
    });

    // Every permutation, not just the one compared below. Resolution is the
    // thing that was broken, and a single index proves only that one index
    // works - the table reaches 480.
    //
    // The two counts asserted are the ones the source container decides, so they
    // do not move when the translator improves: how many permutations there are,
    // and how many distinct bodies carry programs. `uniqueBodies` is deliberately
    // NOT asserted; it counts distinct emitted records, and on dx12 the 144
    // bodies that do not lower emit byte-identical empty records that alias down
    // to 49. That is the container's alias rule working, not a body going
    // missing - which is why the count that must hold is the translated one.
    const resolved = [];
    for (let index = 0; index < all.expected.permutations; index += 1)
    {
      resolved.push(allBody.GetBackendBody(index));
    }
    assert.equal(
      resolved.length,
      all.expected.permutations,
      `${backend}: every permutation the manifest pins must resolve`
    );
    assert.equal(
      new Set(resolved.filter((body) => body.status === "translated").map((body) => body.bodyKey)).size,
      all.expected.translationUnits,
      `${backend}: the body set must carry the translated-body count the manifest pins`
    );
    assert.equal(
      allBody.backendBodySource.permutationCount,
      all.expected.permutations,
      `${backend}: the body source must cover every permutation`
    );

    // Body identity, resolved from the selected package's own recorded
    // selections rather than assumed. Without this a green comparison could be
    // luck: any body would compare equal to itself.
    const graph = allJson.permutationGraph;
    const wanted = new Map(selected.metadata.selectedOptions.map((option) => [ option.name, option.value ]));
    const optionIndices = graph.axes.map((axis) =>
    {
      const index = axis.options.indexOf(wanted.get(axis.name));
      assert.notEqual(index, -1, `${backend}: axis ${axis.name} has no option ${wanted.get(axis.name)}`);
      return index;
    });
    const variants = graph.variants.filter(
      (variant) => variant.optionIndices.every((value, index) => value === optionIndices[index])
    );
    assert.equal(variants.length, 1, `${backend}: selections must resolve exactly one permutation`);
    assert.equal(
      variants[0].permutationIndex,
      selected.metadata.bodyIndex,
      `${backend}: the resolved permutation must be the one the selected package baked in`
    );

    const body = allBody.GetBackendBody(variants[0].permutationIndex);
    assert.equal(body.status, "translated", `${backend}: ${body.bodyKey} is ${body.status}: ${body.error}`);
    const main = body.passes.find((pass) => pass.passKey === "Main.pass0");
    assert.ok(main, `${backend}: the resolved body has no Main.pass0`);

    const bodySetPackage = CjsWebgpuPackage.from({
      sourcePath: all.source,
      analysis: {
        passes: [ { techniqueName: "Main", passIndex: 0, renderStates: 0, states: [] } ],
        stages: main.shaders.map((shader) => ({
          key: shader.key,
          techniqueName: "Main",
          passIndex: 0,
          stageName: shader.stageName,
          stageType: shader.stageType,
          bindings: []
        }))
      },
      wgsl: {
        format: "CJS_WGSL_SET",
        formatVersion: main.wgslSetVersion,
        shaders: main.shaders,
        layouts: main.layouts
      }
    });

    const fromBodySet = bodySetPackage.GetPipeline("Main", 0).ToJSON();
    const fromSelected = selected.GetPipeline("Main", 0).ToJSON();

    assert.deepEqual(
      stageProjection(fromBodySet.shaderModules),
      stageProjection(fromSelected.shaderModules),
      `${backend}: WGSL payloads differ between the body-set and selected paths`
    );
    assert.deepEqual(
      bindingProjection(fromBodySet.bindGroups),
      bindingProjection(fromSelected.bindGroups),
      `${backend}: canonical bindings differ between the body-set and selected paths`
    );

    // Everything else that differs must be analysis-only, and nothing else.
    assert.deepEqual(
      differingFields(fromBodySet, fromSelected).filter((field) => ![ "key", "shaderModules", "bindGroups" ].includes(field)),
      [ ...ANALYSIS_ONLY_PIPELINE_FIELDS ],
      `${backend}: unexpected pipeline-level divergence`
    );
    for (let index = 0; index < fromSelected.shaderModules.length; index += 1)
    {
      assert.deepEqual(
        differingFields(fromBodySet.shaderModules[index], fromSelected.shaderModules[index]).filter((field) => field !== "key"),
        [ ...ANALYSIS_ONLY_MODULE_FIELDS ].filter((field) => differingFields(
          fromBodySet.shaderModules[index],
          fromSelected.shaderModules[index]
        ).includes(field)),
        `${backend}: unexpected shader-module divergence at ${index}`
      );
    }
    const bodySetBindings = fromBodySet.bindGroups.flatMap((group) => group.bindings);
    const selectedBindings = fromSelected.bindGroups.flatMap((group) => group.bindings);
    for (let index = 0; index < selectedBindings.length; index += 1)
    {
      const differing = differingFields(bodySetBindings[index], selectedBindings[index]).filter((field) => field !== "key");
      const unexpected = differing.filter((field) => !ANALYSIS_ONLY_BINDING_FIELDS.includes(field));
      assert.deepEqual(unexpected, [], `${backend}: unexpected binding divergence at ${index}`);
    }

    // Render states are the one pipeline-level divergence, and it is expected:
    // the body set carries none at all.
    assert.equal(fromBodySet.renderStates, 0, `${backend}: a translation unit cannot carry a render-state handle`);
    assert.deepEqual(fromBodySet.states, [], `${backend}: a translation unit cannot carry render states`);
  }
});
