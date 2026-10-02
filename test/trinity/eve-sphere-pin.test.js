import assert from 'node:assert/strict';
import test from 'node:test';
import {blue,NotifyModified,IInitialize,INotify} from '../../npm/dist/global/blue/index.js';
import {CjsSchema} from '../../npm/dist/global/schema/index.js';
import {mat4} from '../../npm/dist/global/math/mat4.js';
import {TriBatchType} from '../../npm/dist/global/consts/graphics/index.js';
import {TriGeometryRes} from '../../npm/dist/resource/index.js';
import {EveSpherePin,EveSpherePinIndexTree,TriDevice,Tr2RenderContext_GetMainThreadRenderContext} from '../../npm/dist/trinity/index.js';
import {Tr2RenderContextALStub,ALResult} from '../../npm/dist/trinityal/index.js';
import {Tr2PickType} from '../../npm/dist/trinity/core/view/Tr2PickType.js';
import {SharedGeometryBuffer} from '../../npm/dist/trinity/core/mesh/TriGeometryResAllocations.js';
import {RawData} from '../../npm/dist/trinity/core/rawData/RawData.js';
import {StubResMan} from '../support/stubResMan.js';

const TRANSPARENT=TriBatchType.TRIBATCHTYPE_TRANSPARENT;
const point=(theta,phi)=>[Math.cos(theta)*Math.cos(phi),Math.sin(theta),-Math.cos(theta)*Math.sin(phi)];
const triangle=(theta,phi)=>[point(theta-0.025,phi-0.025),point(theta+0.025,phi-0.025),point(theta,phi+0.025)];
function near(actual,expected,epsilon=1e-5){assert.equal(actual.length,expected.length);actual.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<epsilon,`${i}: ${v} != ${expected[i]}`));}
function geometry(points=triangle(0,0),faces=points.map((_,i)=>i)) {
  const g=new TriGeometryRes();
  g.SetPayload({meshes:[{decl:[{usage:'Position',usageIndex:0,type:'Float32',elementCount:3,offset:0}],
    vertex:{position:points.flat()},indices:[{faces}],areas:[{firstElement:0,elementCount:faces.length/3}]}]});
  g.MarkPrepared();return g;
}
function tree(g){const result=new EveSpherePinIndexTree(g);assert.equal(result.Initialize(),1);return result;}
function indices(index,p,r){const out={primitives:99,indices:[]};assert.equal(index.GetIndices(p,r,out),1);return out;}
function setup(t) {
  const context=Tr2RenderContext_GetMainThreadRenderContext(),prior=context.GetRenderContextAL(),manager=blue.resMan;
  const before=new Set(TriDevice.GetResourcesRegistered()),al=new Tr2RenderContextALStub();
  al.CreateDevice();al.BeginScene();context.SetRenderContextAL(al);context.SetViewTransform(mat4.create());blue.resMan=new StubResMan();
  t.after(()=>{
    for(const resource of TriDevice.GetResourcesRegistered().filter(x=>!before.has(x))) {
      if(CjsSchema.cast(resource,EveSpherePin))resource.Destroy();
      else {resource.ReleaseResources();TriDevice.UnregisterResource(resource);}
    }
    SharedGeometryBuffer(context).ReleaseResources();context.SetRenderContextAL(prior);blue.resMan=manager;al.Destroy();
  });
  const draws=[],draw=al.DrawIndexedInstanced.bind(al);
  al.DrawIndexedInstanced=(...args)=>{draws.push(args);return draw(...args);};
  const shader={GetTechniqueIndex:()=>0,GetPassCount:()=>1,GetShaderTypeMask:()=>3,ApplyAllStateForPass(){}};
  const material={GetShaderStateInterface:()=>shader,ApplyMaterialDataForPass(){}};
  return {context,al,draws,material,manager:blue.resMan};
}
function pin(g=geometry()) {
  blue.resMan.resources.set('res:/sphere.gr2',g);
  const p=new EveSpherePin();p.geometryResPath='res:/sphere.gr2';p.centerNormal.set([1,0,0]);p.Initialize();p.UpdateSyncronous({});return p;
}
function collect(p,pod=null,type=TRANSPARENT){const batches=[];p.GetBatches({Commit:b=>batches.push(b)},type,pod);return batches;}

test('spherical index waits for geometry without changing caller outputs',()=>{
  const g=new TriGeometryRes(),index=new EveSpherePinIndexTree(g),out={primitives:9,indices:[7]};
  assert.equal(index.Initialize(),0);assert.equal(index.GetIndices([1,0,0],0.2,out),0);assert.deepEqual(out,{primitives:9,indices:[7]});
  g.SetPayload(geometry().GetPayload());g.MarkPrepared();assert.equal(index.Initialize(),1);assert.equal(index.IsInitialized(),1);
  assert.equal(CjsSchema.GetConstructor('EveSpherePinIndexTree'),null,'native helper has no Blue identity');
});

test('native tree traversal orders faces left first and deduplicates overlapping leaves',()=>{
  const index=tree(geometry([...triangle(0,0.2),...triangle(0,-0.2)]));
  for(let i=0;i<2;i++) {
    const out=indices(index,[1,0,0],0.4);assert.equal(out.primitives,2);assert.deepEqual(out.indices,[3,4,5,0,1,2]);
    assert.equal(index.markedFaces.length,0);assert.ok(index.faces.every(f=>!f.flag));
  }
});

test('native candidate tail remains after Cartesian rejection',()=>{
  const index=tree(geometry([point(0.16,0.16),point(0.18,0.16),point(0.17,0.18)]));
  for(let i=0;i<2;i++) {
    const out=indices(index,point(0.02,0.02),0.001);assert.equal(out.primitives,0);assert.equal(out.indices.length,3);
  }
});

test('native seam insertion and strict upper pole boundary remain asymmetric',()=>{
  // EveSpherePinIndexTree.cpp:325-330 inserts only the positive seam segment.
  const index=tree(geometry([point(-0.05,3.13),point(0.05,-3.13),point(0,3.13)]));
  assert.equal(indices(index,point(0,3.12),0.001).primitives,1);
  assert.equal(indices(index,point(0,-3.12),0.001).primitives,0);
  assert.equal(indices(tree(geometry([[0,1,0],[0,1,0],[0,1,0]])),[0,1,0],0.3).primitives,0);
});

test('pole queries span longitude but still filter Cartesian distance',()=>{
  const index=tree(geometry([...triangle(1.4,2),...triangle(-1.4,-2)]));
  assert.deepEqual(indices(index,[0,1,0],0.3).indices.slice(0,3),[0,1,2]);
  assert.deepEqual(indices(index,[0,-1,0],0.3).indices.slice(0,3),[3,4,5]);
});

test('index source uses LOD zero and truncates native output to uint16',()=>{
  const g=geometry(),mesh=g.GetPayload().meshes[0];
  const positions=new Float32Array(65539*3);positions.set(triangle(0,0).flat(),65536*3);
  mesh.lods=[{vertex:{position:positions},indices:[{faces:[65536,65537,65538]}]}];
  mesh.vertex.position=triangle(0,Math.PI).flat();
  const out=indices(tree(g),[1,0,0],0.2);assert.equal(out.primitives,1);assert.deepEqual(out.indices.slice(0,3),[0,1,2]);
});

test('pin hydration and coalesced notifications apply every changed native branch once',t=>{
  const {manager}=setup(t);const g=geometry();manager.resources.set('res:/sphere.gr2',g);
  const p=CjsSchema.from('EveSpherePin',{geometryResPath:'res:/sphere.gr2',pinEffectResPath:'res:/initial.fx',centerNormal:[1,0,0]});
  assert.equal(CjsSchema.cast(p,IInitialize),p);assert.equal(CjsSchema.cast(p,INotify),p);assert.equal(p._geometryResource,g);
  assert.equal(manager.requests.some(r=>r.path==='res:/initial.fx'),false,'native Initialize does not apply effect path');
  const notify=t.mock.method(p,'OnModified'),effect=t.mock.method(p.pinEffect,'SetEffectPathName');
  CjsSchema.setValues(p,{geometryResPath:'res:/other.gr2',pinEffectResPath:'res:/other.fx',centerNormal:[0,1,0],pinRadius:0.4,color:[0.2,0.3,0.4,0.5]});
  assert.equal(notify.mock.callCount(),1);assert.equal(effect.mock.callCount(),1);assert.equal(p._geometryResource,manager.resources.get('res:/other.gr2'));
  near(p.boundingSphere,[0,1,0,0.4]);assert.equal(p._rebuildIndices,1);assert.equal(p.pinColor,p.color);near(p.pinColor,[0.2,0.3,0.4,0.5]);
  p._rebuildIndices=0;CjsSchema.setValues(p,{pinRadius:0.7});near(p.boundingSphere,[0,1,0,0.7]);assert.equal(p._rebuildIndices,0);
});

test('pins share source indexes and publish before advancing curves in seconds',t=>{
  setup(t);const g=geometry(),a=pin(g),b=pin(g);assert.equal(a._tree,b._tree);assert.equal(a.primitiveCount,1);assert.equal(a._rebuildIndices,0);
  const order=[];a.curveSets=[{Update:seconds=>{order.push(seconds);assert.equal(a._indexBuffer.IsValid(),true);}}];
  t.mock.method(a,'UpdateSyncronous',()=>order.push('sync'));a.Update({GetTime:()=>25000000});assert.deepEqual(order,['sync',2.5]);
  a.geometryResPath='res:/replacement.gr2';NotifyModified(a,'geometryResPath');assert.equal(a._tree,null);assert.notEqual(a._geometryResource,g);
});

test('selected sphere triangles submit through AL with separate native VS and PS registers',t=>{
  const {context,draws,material}=setup(t),p=pin();p.pinEffect=material;p.pickEffect=material;
  const pod=p.GetPerObjectData({Alloc:name=>RawData.create(name)});assert.equal(pod.GetData().byteLength,160);
  const bindings=[],bind=context.SetConstants.bind(context);
  t.mock.method(context,'SetConstants',(buffer,stage,register)=>{bindings.push({buffer,stage,register});return bind(buffer,stage,register);});
  const batches=collect(p,pod);assert.equal(batches.length,1);assert.equal(batches[0].indexBuffer,p._indexBuffer);
  context.RenderBatches({GetBatches:()=>batches});assert.equal(draws.length,1);assert.deepEqual(draws[0].slice(0,3),[3,1,0]);
  assert.ok(bindings.some(b=>b.stage===0&&b.register===3));assert.ok(bindings.some(b=>b.stage===1&&b.register===4));
  assert.equal(collect(p,null,TriBatchType.TRIBATCHTYPE_OPAQUE).length,0);
  assert.equal(collect(p,null,TriBatchType.TRIBATCHTYPE_PICKING).length,1);p.enablePicking=false;assert.equal(collect(p,null,TriBatchType.TRIBATCHTYPE_PICKING).length,0);
  const picked=[];p.GetPickingBatches({Commit:b=>picked.push(b)},Tr2PickType.PICK_TYPE_PICKING|Tr2PickType.PICK_TYPE_TRANSPARENT);assert.equal(picked.length,1);
  p.display=false;const list=[];p.GetRenderables(list);assert.deepEqual(list,[]);assert.equal(collect(p).length,1,'native display gate belongs to collection');
});

test('empty index selections and failed allocations stay dirty until a successful retry',t=>{
  setup(t);const p=pin();assert.equal(p._indexBuffer.IsValid(),true);
  p.centerNormal.set([-1,0,0]);NotifyModified(p,'centerNormal');p.UpdateSyncronous({});assert.equal(p.primitiveCount,0);assert.equal(p._indexBuffer.IsValid(),false);assert.equal(p._rebuildIndices,1);
  p.centerNormal.set([1,0,0]);const failed=t.mock.method(p._indexBuffer,'Create',()=>ALResult.E_FAIL);
  p.UpdateSyncronous({});assert.equal(p._rebuildIndices,1);assert.equal(p._indexBuffer.IsValid(),false);failed.mock.restore();
  p.UpdateSyncronous({});assert.equal(p._rebuildIndices,0);assert.equal(p._indexBuffer.IsValid(),true);
  p.ReleaseResources();assert.equal(p._indexBuffer.IsValid(),true);p._indexBuffer.Destroy();p.OnPrepareResources();assert.equal(p._rebuildIndices,1);
});

test('visibility places pins without frustum culling and bounds remain local',t=>{
  setup(t);const p=pin();p.translation.set([1,2,3]);p.scaling.set([2,3,4]);
  const parent=mat4.fromRotationTranslation(mat4.create(),[0,0,Math.SQRT1_2,Math.SQRT1_2],[10,20,30]);
  p.UpdateVisibility({GetFrustum:()=>({IsSphereVisible(){throw Error('native does not cull');}})},parent);
  near(p.worldTransform.slice(12,15),[8,21,33]);const sphere=new Float32Array(4);assert.equal(p.GetBoundingSphere(sphere),true);near(sphere,[1,0,0,0.2]);
  assert.ok(Math.abs(p.GetSortValue({GetViewPosition:()=>[8,23,30]})-3)<1e-5);
  const queried=mat4.create();p.GetLocalToWorldTransform(queried);near(queried,mat4.create());assert.equal(p.GetLocalBoundingBox([],[]),false);
  assert.equal(p.GetPerObjectData({Alloc:()=>null}),null);
});

test('final pin destruction releases default effects and registration but preserves assigned effects',t=>{
  setup(t);const p=pin(),owned=[...p._ownedEffects],calls=owned.map(e=>t.mock.method(e,'Destroy'));
  const borrowed={Destroy(){throw Error('borrowed effect destroyed');}};p.pinEffect=borrowed;p.Destroy();p.Destroy();
  calls.forEach(c=>assert.equal(c.mock.callCount(),1));assert.equal(p._indexBuffer.IsValid(),false);assert.equal(TriDevice.GetResourcesRegistered().includes(p),false);
});
