import assert from "node:assert/strict";
import test from "node:test";
import { EveSOF, CjsSofLibraryBuilder } from "../../../npm/dist/sof/index.js";
import { BeObjectMetadata } from "../../../npm/dist/global/blue/BlueObjectMetadata.js";
import { CjsSchema } from "../../../npm/dist/global/schema/index.js";
import { EveSpaceObjectDecal } from "../../../npm/dist/trinity/index.js";

const dna = "hull:faction:race";

function Decal(x)
{
  return {
    name: "same name", usage: 0, position: [x, 0, 0], rotation: [0, 0, 0, 1], scaling: [1, 1, 1],
    boneIndex: -1, meshIndex: -1, parameters: [], textures: [],
    indexBuffers: [{ indexBuffer: new Uint32Array([0, 1, 2]) }], multiHullIndexBuffers: []
  };
}

function Data()
{
  return {
    hull: [{ name: "hull", buildClass: 0, geometryResFilePath: "res:/hull.gr2", opaqueAreas: [],
      decalSets: [{ visibilityGroup: "primary", items: [Decal(1), Decal(2)] }] }],
    faction: [{ name: "faction", visibilityGroupSet: { visibilityGroups: [{ str: "primary" }] } }],
    race: [{ name: "race" }], material: [], pattern: [], layout: [],
    generic: { decalShaderLocation: "res:/decal", shaderPrefix: "static_", decalShaders: [],
      variants: [{ name: "transparent", isTransparent: true, hullArea: { shader: "glass" } }] }
  };
}

test("SOF decal origins opt in lazily, survive builds, and remain editor-only", async () =>
{
  const data = Data(), sof = new EveSOF(), items = data.hull[0].decalSets[0].items;
  assert.equal(sof.dataMgr.SetData(data), true);
  const plain = await sof.BuildValuesFromDNA(dna);
  assert.equal(plain.decals.length, 2);
  for (let i = 0; i < items.length; i++)
  {
    assert.equal(BeObjectMetadata.GetMetadata(items[i]), null);
    assert.equal(Object.hasOwn(plain.decals[i], "__bluemetadata__"), false);
  }

  await sof.Register({ editorMode: true });
  const editor = await sof.BuildValuesFromDNA(dna);
  const ids = items.map(item => BeObjectMetadata.Get(item, "sof_source_id"));
  assert.equal(new Set(ids).size, 2, "same names and group still describe distinct sources");
  const prepared = sof.dataMgr.GetHullData("hull").hullDecalSets;
  for (let i = 0; i < items.length; i++)
  {
    assert.match(ids[i], /^[0-9a-f-]{36}$/u);
    assert.equal(Object.hasOwn(items[i], "__bluemetadata__"), false, "metadata lives in the table, not on the object");
    assert.equal(BeObjectMetadata.Get(prepared[0].items[i], "sof_source_id"), ids[i]);
    assert.deepEqual(editor.decals[i].__bluemetadata__, {
      SofDna: dna, SofParentHullName: "hull", sof_source_id: ids[i]
    });
    assert.equal(Object.hasOwn(editor.decals[i], "sof_source_id"), false);
    assert.equal(Object.hasOwn(editor.decals[i].decalEffect, "__bluemetadata__"), false);
  }
  assert.deepEqual(await sof.BuildValuesFromDNA(dna), editor);
  assert.equal(sof.dataMgr.GetHullData("hull").hullDecalSets, prepared, "identified collections are not reprojected on each build");
  await sof.Register({ editorMode: false });
  const ordinary = await sof.BuildValuesFromDNA(dna);
  assert.deepEqual(ordinary, plain);
  assert.deepEqual(items.map(item => BeObjectMetadata.Get(item, "sof_source_id")), ids);
});

test("SOF source IDs survive authored reorder and update while new items get new IDs", async () =>
{
  const data = Data(), sof = await new EveSOF().Register({ editorMode: true });
  sof.dataMgr.SetData(data);
  const initial = await sof.BuildValuesFromDNA(dna);
  const items = data.hull[0].decalSets[0].items;
  const firstId = initial.decals[0].__bluemetadata__.sof_source_id;
  const secondId = initial.decals[1].__bluemetadata__.sof_source_id;
  items.reverse();
  items[1].position[0] = 7;
  items.splice(1, 0, Decal(3));
  assert.equal(sof.dataMgr.UpdateHull("hull", data.hull[0]), true);
  const updated = await sof.BuildValuesFromDNA(dna);
  assert.deepEqual(updated.decals.map(item => item.position[0]), [2, 3, 7]);
  assert.equal(updated.decals[0].__bluemetadata__.sof_source_id, secondId);
  assert.equal(updated.decals[2].__bluemetadata__.sof_source_id, firstId);
  assert.equal(new Set(updated.decals.map(item => item.__bluemetadata__.sof_source_id)).size, 3);
});

test("SOF editor refreshes prepared items missing an existing authored ID", async () =>
{
  const data = Data(), sof = await new EveSOF().Register({ editorMode: true });
  const original = data.hull[0].decalSets[0].items[0];
  BeObjectMetadata.Set(original, "sof_source_id", "existing-source");
  sof.dataMgr.SetData(data);
  await sof.BuildValuesFromDNA(dna);
  const prepared = sof.dataMgr.GetHullData("hull").hullDecalSets;
  BeObjectMetadata.Delete(prepared[0].items[0], "sof_source_id");
  const values = await sof.BuildValuesFromDNA(dna);
  assert.equal(values.decals[0].__bluemetadata__.sof_source_id, "existing-source");
  assert.notEqual(sof.dataMgr.GetHullData("hull").hullDecalSets, prepared);
});

test("SOF editor IDs reach original partial-catalog records", async () =>
{
  const data = Data(), sof = await new EveSOF().Register({ editorMode: true });
  const library = new CjsSofLibraryBuilder({ dataMgr: sof.dataMgr, data,
    source: async () => { throw new Error("fixture catalog is complete"); } });
  await sof.SetSofLibraryBuilder(library);
  const values = await sof.BuildValuesFromDNA(dna);
  assert.equal(BeObjectMetadata.Get(data.hull[0].decalSets[0].items[0], "sof_source_id"), values.decals[0].__bluemetadata__.sof_source_id);
});

test("SOF editor leaves multi-hull and variant origins outside the supported scope", async () =>
{
  const data = Data(), sof = await new EveSOF().Register({ editorMode: true });
  data.hull.push({ ...data.hull[0], name: "other", geometryResFilePath: "res:/other.gr2" });
  sof.dataMgr.SetData(data);
  const multi = await sof.BuildValuesFromDNA("hull;other:faction:race");
  assert.ok(multi);
  for (const decal of multi.decals) assert.equal(Object.hasOwn(decal, "__bluemetadata__"), false);
  const variant = await sof.BuildValuesFromDNA(`${dna}:variant?transparent`);
  assert.deepEqual(variant.decals, []);
  for (const item of data.hull[0].decalSets[0].items) assert.equal(BeObjectMetadata.GetMetadata(item), null);
});

test("decal origin metadata hydrates without a member and stamp-only edits return false", async () =>
{
  const data = Data(), sof = await new EveSOF().Register({ editorMode: true });
  sof.dataMgr.SetData(data);
  const values = await sof.BuildValuesFromDNA(dna);
  const decal = new EveSpaceObjectDecal();
  assert.equal(CjsSchema.setValues(decal, { __bluemetadata__: values.decals[0].__bluemetadata__ }, { returnBoolean: true }), false);
  assert.equal(BeObjectMetadata.Get(decal, "sof_source_id"), values.decals[0].__bluemetadata__.sof_source_id);
  assert.equal(Object.hasOwn(decal, "__bluemetadata__"), false, "metadata lives in the table, not on the object");
  assert.equal(Object.hasOwn(decal, "sof_source_id"), false);
});
