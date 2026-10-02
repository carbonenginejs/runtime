import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { DictReader, DictWriter, Copier } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { Tr2PostProcessAttributes } from "../../npm/dist/trinity/postProcess/Tr2PostProcessAttributes.js";
import { Tr2PostProcess2 } from "../../npm/dist/trinity/postProcess/Tr2PostProcess2.js";
import { EveChildPostProcessVolume } from "../../npm/dist/trinity/eve/child/EveChildPostProcessVolume.js";
import { Tr2MaterialBoundsAdjustment } from "../../npm/dist/trinity/utilities/Tr2MaterialBoundsAdjustment.js";
import { Tr2MeshBase } from "../../npm/dist/trinity/core/mesh/Tr2MeshBase.js";
import { box3 } from "../../npm/dist/global/math/box3.js";

for (const [Type, interfaces] of [[Tr2PostProcessAttributes, [Tr2PostProcessAttributes]], [Tr2MaterialBoundsAdjustment, []]])
test(`${Type.name} has supported native queries and no model services`, () =>
{
  const value = new Type();
  assert.equal(Object.getPrototypeOf(Type.prototype), Object.prototype);
  assert.equal("GetValues" in value, false);
  assert.deepEqual([...mappedInterfaces(Type)], interfaces);
  assert.equal(Type.from, undefined);
  for (const method of ["GetValues", "SetValues", "UpdateValues", "Dispose", "Initialize"]) assert.equal(value[method], undefined);
});

test("post-process pairs expose native RW persistence while runtime state stays unpersisted", () =>
{
  const fields = CjsSchema.getSchema(Tr2PostProcessAttributes).members;
  const names = ["priority", "intensity", ...Tr2PostProcessAttributes.AttributeNames.flatMap(name=>[name+"Enabled",name])];
  assert.equal(names.length, 114);
  assert.deepEqual(fields.map(f=>f.name), names);
  for (const field of fields)
  {
    assert.equal(field.edit.read, true, field.name);
    assert.equal(!!field.edit.write, field.name !== "intensity", field.name);
    assert.equal(!!field.edit.persist, field.name !== "intensity", field.name);
    assert.notEqual(field.edit.notify, true);
  }
  const value = new DictReader({declarations:true}).CreateObject({_type:"Tr2PostProcessAttributes",bloomBrightnessEnabled:true,bloomBrightness:4,colorGain:[1,2,3],intensity:0.5});
  value.prioritizedLuts.add("runtime");
  value.depthOfFieldForegroundBlurNeeded = true;
  const copy = new Copier().CloneTo(value);
  assert.equal(copy.bloomBrightnessEnabled, true);
  assert.equal(copy.bloomBrightness, 4);
  assert.notEqual(copy.colorGain,value.colorGain);
  assert.deepEqual(Array.from(copy.colorGain),[1,2,3]);
  assert.equal(copy.intensity,0);
  assert.equal(copy.prioritizedLuts.size,0);
  assert.equal(copy.depthOfFieldForegroundBlurNeeded,false);
  const persisted = new DictWriter().WriteObject(value,{}, {persistOnly:true});
  for (const name of ["intensity","prioritizedLuts","depthOfFieldForegroundBlurNeeded"]) assert.equal(Object.hasOwn(persisted,name),false);
  assert.equal(persisted.bloomBrightness,4);
});

test("plain attributes retain actual volume ownership and graph extraction/blending", () =>
{
  const owner = new EveChildPostProcessVolume();
  const attributes = owner._EnsureAttributes();
  assert.ok(attributes instanceof Tr2PostProcessAttributes);
  attributes.Reset();
  attributes.bloomBrightnessEnabled = true; attributes.bloomBrightness = 4; attributes.intensity = 0.5;
  const graph = new Tr2PostProcess2();
  assert.equal(Tr2PostProcessAttributes.MergeInto(graph,[attributes]),graph);
  assert.equal(graph.bloom.brightness,2);
  const captured = new Tr2PostProcessAttributes();
  captured.FromPostProcess(graph,Tr2PostProcessAttributes.HIGH_PRIORITY,0.75);
  assert.equal(captured.bloomBrightness,2);
  assert.equal(captured.intensity,0.75);
  const clone = new Copier().CloneTo(owner);
  assert.ok(clone.postProcessAttributes instanceof Tr2PostProcessAttributes);
  assert.notEqual(clone.postProcessAttributes,attributes);
  assert.equal(clone.postProcessAttributes.bloomBrightness,4);
});

test("material struct dictionary transport is distinct from persist-only copying", () =>
{
  const fields = CjsSchema.getSchema(Tr2MaterialBoundsAdjustment).members;
  assert.deepEqual(fields.map(f=>f.name),["maxLocalScale","maxLocalDisplacement","rotatesVertices"]);
  assert.deepEqual(fields.map(f=>f.type.kind),["float32","float32","boolean"]);
  for (const field of fields)
  {
    assert.notEqual(field.edit?.read,true); assert.notEqual(field.edit?.write,true); assert.notEqual(field.edit?.persist,true);
  }
  const value = new DictReader({declarations:true}).CreateObject({_type:"Tr2MaterialBoundsAdjustment",maxLocalScale:2,maxLocalDisplacement:3,rotatesVertices:true});
  const bag = new DictWriter().WriteObject(value,{}, {persistOnly:false});
  assert.deepEqual([bag.maxLocalScale,bag.maxLocalDisplacement,bag.rotatesVertices],[2,3,true]);
  const roundtrip = new DictReader({declarations:true}).CreateObject({_type:"Tr2MaterialBoundsAdjustment",...bag});
  assert.equal(roundtrip.rotatesVertices,true);
  const copy = new Copier().CloneTo(value);
  assert.deepEqual([copy.maxLocalScale,copy.maxLocalDisplacement,copy.rotatesVertices],[1,0,false]);
  const persisted = new DictWriter().WriteObject(value,{}, {persistOnly:true});
  for (const field of fields) assert.equal(Object.hasOwn(persisted,field.name),false);
  const mesh = new Tr2MeshBase();
  assert.equal(mesh.SetMaterialBoundsAdjustment(value),true);
  assert.deepEqual(mesh.GetMaterialBoundsAdjustment(),{maxLocalScale:2,maxLocalDisplacement:3,rotatesVertices:true});
  value.rotatesVertices = false;
  const box=box3.fromValues(10,0,0,12,1,1),out=box3.create();
  assert.equal(value.AdjustBounds(box,out),out);
  assert.deepEqual(Array.from(out),[17,-3,-3,27,5,5]);
  assert.deepEqual(Array.from(box),[10,0,0,12,1,1]);
});
