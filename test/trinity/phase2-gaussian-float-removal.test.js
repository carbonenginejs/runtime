import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { DictReader, DictWriter, Copier } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { GaussianData } from "../../npm/dist/trinity/postProcess/GaussianData.js";
import { Float4x3 } from "../../npm/dist/trinity/utilities/Float4x3.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";

for (const Type of [GaussianData, Float4x3]) test(`${Type.name} is a plain typed record without Blue queries or model services`, () =>
{
  const record = new Type();
  assert.equal(Object.getPrototypeOf(Type.prototype),Object.prototype);
  assert.equal("GetValues" in record, false);
  assert.deepEqual([...mappedInterfaces(Type)],[]);
  for (const name of ["GetValues","SetValues","UpdateValues","Initialize","Dispose"]) assert.equal(record[name],undefined);
  assert.equal(Type.from,undefined);
  for (const member of CjsSchema.getSchema(Type).members)
  {
    for (const flag of ["read","write","persist","notify"]) assert.notEqual(member.edit?.[flag],true);
  }
});

test("Float4x3 dictionary arrays retain twelve values while persist-only copying retains defaults", () =>
{
  const field = CjsSchema.getField(Float4x3,"elements");
  assert.equal(field.type.kind,"array");
  const values=Array.from({length:12},(_,i)=>i+1);
  const record=new DictReader({declarations:true}).CreateObject({_type:"Float4x3",elements:values});
  assert.deepEqual(Array.from(record.elements),values);
  const bag=new DictWriter().WriteObject(record,{}, {persistOnly:false});
  assert.deepEqual(bag.elements,values);
  const roundtrip=new DictReader({declarations:true}).CreateObject({_type:"Float4x3",...bag});
  assert.deepEqual(Array.from(roundtrip.elements),values);
  const copied=new Copier().CloneTo(record);
  assert.deepEqual(Array.from(copied.elements),Array(12).fill(0));
  assert.equal(Object.hasOwn(new DictWriter().WriteObject(record,{}, {persistOnly:true}),"elements"),false);
});

test("Float4x3 packs exact column strides and restores the affine fourth column", () =>
{
  const matrix=Float32Array.from([1,2,3,91,4,5,6,92,7,8,9,93,10,11,12,94]);
  const before=Array.from(matrix),record=new Float4x3();
  assert.equal(record.SetFromMat4(matrix),record);
  assert.deepEqual(Array.from(record.elements),[1,4,7,10,2,5,8,11,3,6,9,12]);
  const out=mat4.create();
  assert.equal(record.GetMat4(out),out);
  assert.deepEqual(Array.from(out),[1,2,3,0,4,5,6,0,7,8,9,0,10,11,12,1]);
  assert.deepEqual(Array.from(matrix),before);
});

test("Gaussian dictionary values and packed layout survive plain construction without persistence", () =>
{
  assert.deepEqual(CjsSchema.getSchema(GaussianData).members.map(f=>[f.name,f.type.kind]),[["overallWeight","vec3"],["count","uint32"],["weightOffset","array"]]);
  const source=GaussianData.calculateGaussianPassParameters(40,0,1/512,[1,1,1],[1,0]);
  const bag=new DictWriter().WriteObject(source,{}, {persistOnly:false});
  const decoded=new DictReader({declarations:true}).CreateObject({_type:"GaussianData",...bag});
  assert.equal(decoded.weightOffset.length,64);
  assert.deepEqual(GaussianData.pack(decoded),GaussianData.pack(source));
  const clone=new Copier().CloneTo(source);
  assert.equal(clone.count,0);
  assert.deepEqual(Array.from(clone.overallWeight),[0,0,0]);
  assert.equal(Object.hasOwn(new DictWriter().WriteObject(source,{}, {persistOnly:true}),"weightOffset"),false);
  GaussianData.calculateGaussianPassParameters(3,0,1/64,[0.5,0.25,1],[0,1],source);
  const bytes=new Uint8Array(GaussianData.byteSize+16).fill(0xff),window=bytes.subarray(8,8+GaussianData.byteSize);
  assert.equal(GaussianData.pack(source,window),window);
  const view=new DataView(window.buffer,window.byteOffset,window.byteLength);
  assert.equal(window.length,1040);
  assert.equal(view.getFloat32(0,true),0.5);
  assert.equal(view.getFloat32(4,true),0.25);
  assert.equal(view.getFloat32(8,true),1);
  assert.equal(view.getUint32(12,true),source.count);
  assert.equal(view.getFloat32(20,true),source.weightOffset[0][1]);
  for(let i=source.count;i<64;i++)assert.deepEqual(Array.from(source.weightOffset[i]),[0,0,0,0]);
  assert.deepEqual(Array.from(bytes.subarray(0,8)),Array(8).fill(255));
  assert.deepEqual(Array.from(bytes.subarray(bytes.length-8)),Array(8).fill(255));
});
