import test from "node:test";
import assert from "node:assert/strict";
import {CjsSchema} from "../../npm/dist/global/schema/index.js";
import {IInitialize} from "../../npm/dist/global/blue/index.js";
import {finalizeReaderObject} from "../../npm/dist/global/schema/hydration.js";
import {Tr2LineSet,Tr2SolidSet,Tr2GrannyPrimitiveSet,Tr2PrimitiveSet,TriDevice,Tr2EffectStateManager,
  Tr2RenderContext_GetMainThreadRenderContext} from "../../npm/dist/trinity/index.js";
import {Tr2RenderContextALStub,Tr2BufferAL,ALResult} from "../../npm/dist/trinityal/index.js";
import {TriBatchType} from "../../npm/dist/global/consts/graphics/index.js";
import {Topology} from "../../npm/dist/global/consts/renderContext/index.js";
import {Tr2PickType} from "../../npm/dist/trinity/core/view/Tr2PickType.js";

const red=[1,0,0,1],green=[0,1,0,1],blue=[0,0,1,1];
function setup(t){
  const context=Tr2RenderContext_GetMainThreadRenderContext(),old=context.GetRenderContextAL();
  const before=new Set(TriDevice.GetResourcesRegistered()),al=new Tr2RenderContextALStub();
  context.SetRenderContextAL(al);al.CreateDevice();al.BeginScene();
  const maps=new Map(),map=Tr2BufferAL.prototype.MapForWriting,draws=[],draw=al.DrawInstanced.bind(al);
  t.mock.method(Tr2BufferAL.prototype,"MapForWriting",function(...args){const result=map.apply(this,args);if(result.data)maps.set(this,result.data);return result;});
  al.DrawInstanced=(...args)=>{draws.push(args);return draw(...args);};
  const shader={GetTechniqueIndex:()=>0,GetPassCount:()=>1,GetShaderTypeMask:()=>3,ApplyAllStateForPass(){}};
  const effect={GetShaderStateInterface:()=>shader,CompatibleWithGdr:()=>false,ApplyMaterialDataForPass(){}};
  t.after(()=>{for(const item of TriDevice.GetResourcesRegistered())if(!before.has(item))item.Destroy();context.SetRenderContextAL(old);});
  return {context,maps,draws,effect};
}
function floats(maps,buffer){const data=maps.get(buffer);assert.ok(data,"upload must occur");return [...new Float32Array(data.buffer,data.byteOffset,data.byteLength/4)];}
function batches(object,mask=Tr2PickType.PICK_TYPE_OPAQUE){const result=[];object.GetPickingBatches({Commit:b=>result.push(b)},mask,null);return result;}
function triangle(s){s.AddTriangle([0,0,0],red,[6,0,0],green,[0,3,0],blue);}

test("lines upload colored endpoints and independent picking positions with native declarations",t=>{
  const {maps}=setup(t),s=new Tr2LineSet();
  s.AddLine([0,0,0],red,[6,0,0],green);s.AddLine([0,6,0],blue,[6,6,0],red);
  s.AddPickingTriangle([100,0,0],[110,0,0],[100,10,0]);
  assert.equal(CjsSchema.cast(s,IInitialize),s);finalizeReaderObject(s);
  assert.equal(s.maxCurrentLineCount,100);assert.equal(s.currentSubmittedLineCount,2);
  assert.equal(s._vertexBuffer.GetDesc().stride,56);assert.equal(s.pickingVertexBuffer.GetDesc().stride,36);
  assert.deepEqual(floats(maps,s._vertexBuffer),[0,0,0,...red,6,0,0,...green,0,6,0,...blue,6,6,0,...red]);
  assert.deepEqual(floats(maps,s.pickingVertexBuffer),[100,0,0,110,0,0,100,10,0]);
  assert.deepEqual([...s.boundingSphere.slice(0,3)],[3,3,0]);assert.ok(Math.abs(s.boundingSphere[3]-Math.sqrt(18))<1e-5);
  const elements=Tr2EffectStateManager.getVertexDeclarationElements(s._vertexDeclHandle).items;
  assert.deepEqual(elements.map(e=>[e.offset,e.type]),[[0,"FLOAT32_3"],[12,"FLOAT32_4"]]);
});

test("line GPU picking draws dedicated triangles and otherwise falls back to visible lines",t=>{
  const {context,draws,effect}=setup(t),s=new Tr2LineSet();s.effect=s.pickEffect=effect;
  s.AddLine([0,0,0],red,[1,1,1],green);s.SubmitChanges();
  const fallback=batches(s,Tr2PickType.PICK_TYPE_PICKING)[0];assert.equal(fallback.topology,Topology.TOP_LINES);
  s.AddPickingTriangle([0,0,0],[1,0,0],[0,1,0]);s.SubmitChanges();
  const [pick,visible]=batches(s,Tr2PickType.PICK_TYPE_PICKING|Tr2PickType.PICK_TYPE_OPAQUE);
  assert.equal(pick.topology,Topology.TOP_TRIANGLES);assert.equal(pick.stride[0],12);assert.equal(pick.vertexStreams[0],s.pickingVertexBuffer);
  assert.equal(visible.topology,Topology.TOP_LINES);assert.equal(visible.stride[0],28);
  context.RenderBatches({GetBatches:()=>[pick]});context.RenderBatches({GetBatches:()=>[visible]});
  assert.deepEqual(draws,[[3,1,0,0],[2,1,0,0]]);
  assert.equal(batches(s,Tr2PickType.PICK_TYPE_TRANSPARENT).length,0);
  s.ClearLines();s.SubmitChanges();assert.equal(batches(s,Tr2PickType.PICK_TYPE_PICKING).length,0,"native gate requires visible storage too");
});

test("solid submission uploads native normals/colors and emits nonindexed triangles",t=>{
  const {maps,effect,context,draws}=setup(t),s=new Tr2SolidSet();s.effect=s.pickEffect=effect;triangle(s);finalizeReaderObject(s);
  assert.equal(s._vertexBuffer.GetDesc().stride,40);assert.equal(s.currentSubmittedTriangleCount,1);
  assert.deepEqual(floats(maps,s._vertexBuffer),[0,0,0,-0,0,1,...red,6,0,0,-0,0,1,...green,0,3,0,-0,0,1,...blue]);
  assert.deepEqual([...s.boundingSphere.slice(0,3)],[2,1,0]);assert.ok(Math.abs(s.boundingSphere[3]-Math.sqrt(17))<1e-5);
  const [batch]=batches(s);assert.equal(batch.stride[0],40);assert.equal(batch.topology,Topology.TOP_TRIANGLES);
  context.RenderBatches({GetBatches:()=>[batch]});assert.deepEqual(draws,[[3,1,0,0]]);
  const pick=batches(s,Tr2PickType.PICK_TYPE_PICKING)[0];assert.equal(pick.vertexStreams[0],s._vertexBuffer);
});

test("native solid shrinking quirk retains submitted count until storage is released",t=>{
  setup(t);const s=new Tr2SolidSet();triangle(s);triangle(s);s.SubmitChanges();
  s.ClearTriangles();triangle(s);s.SubmitChanges();assert.equal(s.currentSubmittedTriangleCount,2);
  s.ReleaseResources();s.PrepareResources();assert.equal(s.currentSubmittedTriangleCount,1);
});

test("colors resubmit, device release can reprepare, owner destruction unregisters and stops uploads",t=>{
  const {maps}=setup(t);
  for(const Type of [Tr2LineSet,Tr2SolidSet]){
    const s=new Type();if(Type===Tr2LineSet)s.AddLine([0,0,0],red,[1,0,0],green);else triangle(s);
    s.SubmitChanges();s.SetCurrentColor([.5,.25,1,.75]);
    const stride=Type===Tr2LineSet?7:10,colorOffset=stride-4,data=floats(maps,s._vertexBuffer);
    for(let offset=colorOffset;offset<data.length;offset+=stride)assert.deepEqual(data.slice(offset,offset+4),[.5,.25,1,.75]);
    const bound=[...s.boundingSphere];s.ReleaseResources();assert.equal(s._vertexBuffer.IsValid(),false);
    assert.deepEqual([...s.boundingSphere],bound);assert.equal(s.PrepareResources(),true);assert.equal(s._vertexBuffer.IsValid(),true);
    s.Destroy();s.Destroy();assert.equal(TriDevice.GetResourcesRegistered().includes(s),false);assert.equal(s._vertexBuffer.IsValid(),false);
    assert.equal(s.OnPrepareResources(),false);
  }
});

test("AL allocation and mapping errors propagate from preparation",t=>{
  setup(t);
  for(const Type of [Tr2LineSet,Tr2SolidSet]){
    const s=new Type();if(Type===Tr2LineSet)s.AddLine([0,0,0],red,[1,0,0],green);else triangle(s);
    const creation=t.mock.method(s._vertexBuffer,"Create",()=>ALResult.E_OUTOFMEMORY);
    assert.equal(s.OnPrepareResources(),false);creation.mock.restore();
    const mapping=t.mock.method(s._vertexBuffer,"MapForWriting",()=>({result:ALResult.E_FAIL,data:null}));
    assert.equal(s.OnPrepareResources(),false);mapping.mock.restore();assert.equal(s.OnPrepareResources(),true);
  }
});

test("primitive picking methods are exposed on concrete classes without an undecided interface",t=>{
  setup(t);
  for(const Type of [Tr2LineSet,Tr2SolidSet,Tr2GrannyPrimitiveSet]){
    const s=new Type();assert.equal(s.GetID(127),s);
    for(const method of ["GetID","GetPickingBatches"]){
      assert.equal(typeof s[method],"function");assert.ok(CjsSchema.getMethod(Type,method));
    }
    assert.equal(s.GetPickingBatches,Tr2PrimitiveSet.prototype.GetPickingBatches);
  }
});
