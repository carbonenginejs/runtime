import assert from "node:assert/strict";
import test from "node:test";
import { buildCmfFromShared } from "../../../../../src/resource/formats/cmf/core/shared.js";
import { PackLodGeometry } from "../../../../../src/resource/geometry/packGeometry.js";

test("explicit vertex count preserves four-component instance channels and their values",()=>{
  const mesh={vertexCount:2,vertex:{position:[1,2,3,4,5,6,7,8],texcoord0:[9,10,11,12,13,14,15,16]},indices:[]};
  const out=buildCmfFromShared(mesh).meshes[0];
  assert.deepEqual(out.decl.map(item=>[item.usage,item.elementCount,item.offset]),[["Position",4,0],["TexCoord",4,16]]);
  assert.equal(out.lods[0].vb.size,64);
  const packed=PackLodGeometry(out,0);assert.equal(packed.vertex.count,2);assert.equal(packed.vertex.stride,32);
  assert.deepEqual(Array.from(new Float32Array(packed.vertex.bytes.buffer,packed.vertex.bytes.byteOffset,16)),[1,2,3,4,9,10,11,12,5,6,7,8,13,14,15,16]);
  assert.throws(()=>buildCmfFromShared({...mesh,vertexCount:3}),/does not match vertexCount/);
  assert.throws(()=>buildCmfFromShared({...mesh,vertexCount:-1}),/vertexCount/);
});

test("ordinary xyz and two-component UV geometry keeps its existing declaration",()=>{
  const out=buildCmfFromShared({vertex:{position:[1,2,3,4,5,6],texcoord0:[7,8,9,10]},indices:[]}).meshes[0];
  assert.deepEqual(out.decl.map(item=>[item.usage,item.elementCount]),[["Position",3],["TexCoord",2]]);
  assert.equal(out.lods[0].vb.size,40);
  assert.throws(()=>buildCmfFromShared({vertex:{position:[1,2,3,4]},indices:[]}),/divisible by three/);
});
