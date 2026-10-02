import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {blue, IInitialize, INotify, NotifyModified} from '../../npm/dist/global/blue/index.js';
import {CjsSchema} from '../../npm/dist/global/schema/index.js';
import {mat4} from '../../npm/dist/global/math/mat4.js';
import {quat} from '../../npm/dist/global/math/quat.js';
import {TriBatchType} from '../../npm/dist/global/consts/graphics/index.js';
import {TriGeometryRes} from '../../npm/dist/resource/index.js';
import {EveChildLineSet,EveCircle,EveCurveLineSet,EveLineChildContainer,EveChildUpdateParams,
  Tr2Mesh,Tr2MeshArea,Tr2EffectStateManager,Tr2VertexDefinition,TriDevice,
  Tr2RenderContext_GetMainThreadRenderContext} from '../../npm/dist/trinity/index.js';
import {Tr2RenderContextALStub,ALResult} from '../../npm/dist/trinityal/index.js';
import {SharedGeometryBuffer} from '../../npm/dist/trinity/core/mesh/TriGeometryResAllocations.js';
import {RawData} from '../../npm/dist/trinity/core/rawData/RawData.js';
import {StubResMan} from '../support/stubResMan.js';
import {CjsWebgpuRenderContextAL} from '../../npm/dist/trinityal/webgpu/internal.js';

const {OBJECT_RENDER,LINE_RENDER,BOTH}=EveChildLineSet.lineSetType;
const TRANSPARENT=TriBatchType.TRIBATCHTYPE_TRANSPARENT;
function near(actual,expected,epsilon=1e-5) {
  assert.equal(actual.length,expected.length);
  actual.forEach((value,index)=>assert.ok(Math.abs(value-expected[index])<epsilon,`${index}: ${value} != ${expected[index]}`));
}
function setup(t) {
  const context=Tr2RenderContext_GetMainThreadRenderContext(),prior=context.GetRenderContextAL(),manager=blue.resMan;
  const registered=new Set(TriDevice.GetResourcesRegistered());
  const al=new Tr2RenderContextALStub();al.CreateDevice();al.BeginScene();context.SetRenderContextAL(al);
  context.SetViewTransform(mat4.create());blue.resMan=new StubResMan();
  t.after(()=>{
    const resources=TriDevice.GetResourcesRegistered().filter(x=>!registered.has(x));
    for(const resource of resources) {
      if(resource.constructor===EveChildLineSet||resource.constructor===EveCurveLineSet) resource.Destroy();
      else {resource.ReleaseResources();TriDevice.UnregisterResource(resource);}
    }
    SharedGeometryBuffer(context).ReleaseResources();context.SetRenderContextAL(prior);blue.resMan=manager;al.Destroy();
  });
  const layoutState={_vertexLayout:null,_streams:[],_shaderProgram:{GetInputs(){
    return layoutState._vertexLayout.GetDefinition().map((item,index)=>({...item,registerIndex:index}));
  }}};
  const setLayout=al.SetVertexLayout.bind(al),setStream=al.SetStreamSource.bind(al);
  al.SetVertexLayout=layout=>{layoutState._vertexLayout=layout;return setLayout(layout);};
  al.SetStreamSource=(stream,buffer,offset,stride)=>{layoutState._streams[stream]={buffer,offset,stride};return setStream(stream,buffer,offset,stride);};
  const draws=[],draw=al.DrawIndexedInstanced.bind(al);
  al.DrawIndexedInstanced=(...args)=>{
    const layouts=CjsWebgpuRenderContextAL.prototype.BuildVertexBufferLayouts.call(layoutState);
    assert.notEqual(typeof layouts,'string',layouts);
    draws.push(args);return draw(...args);
  };
  const shader={GetTechniqueIndex:()=>0,GetPassCount:()=>1,GetShaderTypeMask:()=>3,ApplyAllStateForPass(){}};
  const material={GetShaderStateInterface:()=>shader,ApplyMaterialDataForPass(){}};
  return {context,al,draws,material};
}
function circle(count=4) {const p=new EveCircle();p.numSegments=count;p.circleRadius=2;p.lineWidth=0.25;p.billboardObjects=false;return p;}
function child(t) {const c=new EveChildLineSet();c.lines=[circle()];c.Initialize();return c;}
function frame() {
  const frustum={IsSphereVisible:()=>true,GetPixelSizeAccross:()=>100};
  return {update:{GetFrustum:()=>frustum,GetDeltaT:()=>0.25},params:new EveChildUpdateParams(),frustum};
}
function update(c,f=frame()) {c.UpdateAsyncronous(f.update,f.params);c.UpdateVisibility(f.update,mat4.create(),3);c.UpdateSyncronous(f.update,f.params);return f;}
function collect(c,pod=null) {const batches=[];c.GetBatches({Commit:b=>batches.push(b)},TRANSPARENT,pod);return batches;}
function geometry() {
  const g=new TriGeometryRes();
  const make=(count,radius)=>({decl:[{usage:'Position',usageIndex:0,type:'Float32',elementCount:3,offset:0}],
    boundingSphere:[0,0,0,radius],vertex:{position:[0,0,0,1,0,0,1,1,0,0,1,0]},
    indices:[{faces:count===1?[0,1,2]:[0,1,2,0,2,3]}],areas:[{firstElement:0,elementCount:count}]});
  g.SetPayload({meshes:[make(1,3),make(2,7)]});g.MarkPrepared();return g;
}
function mesh(c,material,index=0) {
  const m=new Tr2Mesh(),g=geometry(),area=new Tr2MeshArea();area.SetMaterial(material);
  m.SetGeometryRes(g);m.meshIndex=index;m.transparentAreas.push(area);c.mesh=m;return {m,g,area};
}

test('child line hydration initializes nested paths and dispatches deferred notified edits',t=>{
  setup(t);
  const c=CjsSchema.from('EveChildLineSet',{brightness:2,baseColor:[0.2,0.4,0.6,0.8],additiveBatches:true,
    lines:[{_type:'EveCircle',numSegments:4,circleRadius:2}]});
  assert.equal(CjsSchema.cast(c,IInitialize),c);assert.equal(CjsSchema.cast(c,INotify),c);
  assert.equal(c.lines[0].GetPointCount(),4);assert.equal(c.lineSet.lines.length,4);
  near(c.lineSet.lines[0].color1,[0.4,0.8,1.2,1.6]);
  assert.equal(c.lineSet.additive,false,'native Initialize does not copy the loaded additive flag');
  update(c);c.GetRenderables([]);
  const generate=t.mock.method(c,'GenerateManagedPoints');
  CjsSchema.setValues(c,{brightness:3,baseColor:[0.1,0.2,0.3,0.4]});
  assert.equal(generate.mock.callCount(),0,'edit only invalidates');
  c.GetRenderables([]);c.GetRenderables([]);assert.equal(generate.mock.callCount(),1);
  near(c.lineSet.lines[0].color1,[0.3,0.6,0.9,1.2]);
  NotifyModified(c,['brightness','additiveBatches']);assert.equal(c.lineSet.additive,true);
});

test('collection waits for asynchronous update and selects the three native render modes',t=>{
  setup(t);const c=child(t),f=frame();
  let list=[];c.GetRenderables(list);assert.deepEqual(list,[]);
  c.UpdateSyncronous(f.update,f.params);c.GetRenderables(list);assert.deepEqual(list,[]);
  update(c,f);
  for(const [mode,expected] of [[LINE_RENDER,[c.lineSet]],[OBJECT_RENDER,[c]],[BOTH,[c,c.lineSet]]]) {
    c.renderType=mode;list=[];c.GetRenderables(list);assert.deepEqual(list,expected);
  }
  c.display=false;list=[];c.GetRenderables(list);assert.deepEqual(list,[]);assert.equal(c.IsUpdating(),false);assert.equal(c.isUpdating,false);
  c.display=true;c._isVisible=false;c.GetRenderables(list);assert.deepEqual(list,[]);
});

test('empty edited path lists retain old submitted geometry and bounds as declared',t=>{
  setup(t);const c=child(t);update(c);c.GetRenderables([]);
  const old=c.lineSet.lines[0],count=c.lineSet.currentSubmittedLineCount,bound=Array.from(c._boundingSphere);
  c.lines=[];NotifyModified(c,'lines');c.GetRenderables([]);
  assert.equal(c.lineSet.lines[0],old);assert.equal(c.lineSet.currentSubmittedLineCount,count);
  near(c._boundingSphere,bound);
});

test('child constants copy the root then encode current, previous and inverse matrices exactly once',t=>{
  setup(t);const c=child(t),f=frame(),vs=RawData.create('EveSpaceObjectVSData'),ps=RawData.create('EveSpaceObjectPSData');
  vs.Set('customData',[1,2,3,4]);ps.Set('customData',[5,6,7,8]);ps.Set('clipSphereCenter',[3,5,7]);
  const parent=mat4.fromRotationTranslationScale(mat4.create(),quat.setAxisAngle(quat.create(),[0,0,1],Math.PI/2),[10,20,30],[2,3,4]);
  c.translation.set([1,2,3]);c.rotation.set(quat.setAxisAngle(quat.create(),[0,1,0],Math.PI/2));c.scaling.set([2,1,0.5]);
  let copies=0;f.params.spaceObjectParent={GetLocalToWorldTransform:out=>mat4.copy(out,parent),GetPerObjectStructs:(a,b)=>{copies++;a.CopyFrom(vs);b.CopyFrom(ps);}};
  const old=mat4.fromTranslation(mat4.create(),[-4,-5,-6]);mat4.copy(c.worldTransform,old);
  c.UpdateAsyncronous(f.update,f.params);
  const expected=[0,0,-8,0,-3,0,0,0,0,1,0,0,4,22,42,1];
  near(c.worldTransform,expected);assert.equal(copies,1);
  const pod=c.GetPerObjectData(null);assert.equal(pod.vsData,c._vsData);assert.equal(pod.psData,c._psData);
  for(const record of pod.GetPayloads()) {
    near(record.GetTransposed('worldTransform'),mat4.transpose(mat4.create(),expected));
    near(record.GetTransposed('worldTransformLast'),mat4.transpose(mat4.create(),old));
    near(record.GetTransposed('invWorldTransform'),mat4.transpose(mat4.create(),mat4.invert(mat4.create(),expected)));
  }
  near(pod.vsData.Get('customData'),[1,2,3,4]);near(pod.psData.Get('customData'),[5,6,7,8]);near(pod.psData.Get('clipSphereCenter'),[3,5,7]);
  f.params.childParent={GetLocalToWorldTransform:out=>mat4.fromTranslation(out,[100,0,0])};
  c.UpdateAsyncronous(f.update,f.params);assert.equal(copies,1,'child parent wins and does not copy root constants');
  near(c.worldTransform.slice(12,15),[101,2,3]);
  near(pod.vsData.GetTransposed('worldTransformLast'),mat4.transpose(mat4.create(),expected));
});

test('visibility culls world bounds but measures local bounds and still visits all paths',t=>{
  setup(t);const c=child(t),f=frame(),seen=[];c._boundingSphere.set([1,2,3,4]);
  mat4.fromRotationTranslationScale(c.worldTransform,quat.create(),[10,20,30],[2,3,4]);
  f.frustum.IsSphereVisible=s=>{seen.push(Array.from(s));return true;};
  f.frustum.GetPixelSizeAccross=s=>{near(s,[1,2,3,4]);return 9;};c.minScreenSize=10;
  const path=t.mock.method(c.lines[0],'UpdateVisibility');c.UpdateVisibility(f.update,mat4.create(),2);
  near(seen[0],[12,26,42,16]);assert.equal(c.currentScreenSize,9);assert.equal(c.IsUpdating(),false);assert.equal(c.isUpdating,false);assert.equal(path.mock.callCount(),1);
  f.frustum.IsSphereVisible=()=>false;c.UpdateVisibility(f.update,mat4.create(),2);assert.equal(path.mock.callCount(),2);
  c.display=false;c._isVisible=true;c.UpdateVisibility(f.update,mat4.create(),2);assert.equal(c._isVisible,true);assert.equal(path.mock.callCount(),2);
});

test('synchronous updates animate all paths before the owner visibility gate',t=>{
  setup(t);const c=child(t),f=frame();c.lines.push(circle());c.lines.forEach(p=>p.movementSpeed=0.5);c.Initialize();
  c.display=false;f.params.ownerMaxSpeed=123;const before=c.lines.map(p=>p.animValue);
  const write=t.mock.method(c,'UpdateBuffer');c.renderType=OBJECT_RENDER;c.UpdateSyncronous(f.update,f.params);
  c.lines.forEach((p,i)=>assert.equal(p.animValue,before[i]+0.125));assert.equal(write.mock.callCount(),0);assert.equal(c.GetOwnerMaxSpeed(),123);
});

test('native instance aliases and mesh-zero LOD survive real indexed draw submission',t=>{
  const {context,draws,material}=setup(t),c=child(t),{g}=mesh(c,material,1);c.renderType=BOTH;c.Initialize();update(c);
  assert.equal(c._boundingSphere[3],9.25,'bounds use authored mesh index one');
  const base=Tr2EffectStateManager.getVertexDeclarationElements(g.GetMeshData(1).vertexDeclarationHandle),snapshot=structuredClone(base);
  const definition=Tr2EffectStateManager.getVertexDeclarationElements(c._vertexDeclarationHandle);
  const aliases=definition.items.slice(-6);
  assert.deepEqual(aliases.map(x=>[x.usage,x.usageIndex,x.offset,x.stream,x.instanceStepRate]),[8,9,10,11,12,13].map((n,i)=>[5,n,(i%3)*16,1,1]));
  assert.deepEqual(base,snapshot);assert.equal(definition.nextOffset[0],12);assert.equal(definition.nextOffset[1],48);
  const batches=collect(c);assert.equal(batches.length,1);const b=batches[0];
  assert.equal(b.geometrySource.meshIndex,0);assert.equal(b.geometrySource.lod,g.GetMeshLodByIndex(0,0));assert.equal(b.instanceCount,4);
  assert.equal(b.vertexStreams[1],c._vertexBuffer);assert.equal(b.stride[1],48);
  context.RenderBatches({GetBatches:()=>batches});assert.equal(draws.length,1);assert.equal(draws[0][0],3);assert.equal(draws[0][1],4);
  assert.equal(b.vertexStreams[1],c._vertexBuffer,'submission preserves the instance stream');
  const cdata=c._instanceCursor;
  near([cdata.view.getFloat32(12,true),cdata.view.getFloat32(28,true),cdata.view.getFloat32(44,true)],[Math.SQRT2,0,Math.SQRT2]);
  c.ReleaseResources();assert.equal(c._vertexBuffer.IsValid(),true);assert.equal(collect(c).length,0);
  c.CreateSpriteVertexDeclaration();assert.equal(collect(c).length,1);
});

test('native-shaped declaration ledger is copied rather than mutating the interned original',t=>{
  const {material}=setup(t),c=child(t),{g}=mesh(c,material);c.CreateSpriteVertexDeclaration();
  const base=new Tr2VertexDefinition();base.Add('FLOAT32_3','POSITION');base.nextOffset[0]=20;
  const data=g.GetMeshData(0);data.vertexDeclarationHandle=Tr2EffectStateManager.getVertexDeclarationHandle(base);
  c._cachedSVD=Tr2EffectStateManager.Unknown;c.CreateSpriteVertexDeclaration();
  const definition=Tr2EffectStateManager.getVertexDeclarationElements(c._vertexDeclarationHandle);
  assert.equal(base.items.length,1);assert.equal(base.nextOffset[1],0);assert.equal(definition.nextOffset[0],20);assert.equal(definition.items.length,7);
});

test('owner buffer grows, reuses capacity, zeroes hidden nested paths, and releases only at destruction',t=>{
  const {context}=setup(t),c=child(t);assert.equal(c.OnPrepareResources(),true);const buffer=c._vertexBuffer;
  assert.equal(buffer.GetDesc().count,128);
  const group=new EveLineChildContainer();group.lines=[circle(70),circle(70)];c.lines=[group];c.Initialize();
  c.UpdateBuffer(context);assert.equal(c._totalObjectCount,140);assert.equal(buffer.GetDesc().count,140);assert.equal(c._instanceCursor.offset,140*48);
  group.display=false;c.UpdateBuffer(context);
  assert.ok(new Uint8Array(c._instanceCursor.view.buffer,c._instanceCursor.view.byteOffset,140*48).every(x=>x===0));
  c.lines=[circle(4)];c.Initialize();c.UpdateBuffer(context);assert.equal(buffer.GetDesc().count,140);assert.equal(c._totalObjectCount,4);
  c.ReleaseResources();assert.equal(buffer.IsValid(),true);const owned=c.lineSet;
  c.Destroy();assert.equal(buffer.IsValid(),false);assert.equal(TriDevice.GetResourcesRegistered().includes(c),false);assert.equal(TriDevice.GetResourcesRegistered().includes(owned),false);
});

test('replaced defaults survive until final destruction while assigned line sets remain borrowed',t=>{
  setup(t);const c=child(t),old=c.lineSet,assigned=new EveCurveLineSet();c.lineSet=assigned;c.Initialize();
  assert.equal(TriDevice.GetResourcesRegistered().includes(old),true);assert.equal(TriDevice.GetResourcesRegistered().includes(assigned),true);
  c.Destroy();assert.equal(TriDevice.GetResourcesRegistered().includes(old),false);
  assert.equal(TriDevice.GetResourcesRegistered().includes(assigned),true);assigned.Destroy();
});

test('allocation and mapping failures do not publish a fabricated instance update',t=>{
  const {context,al}=setup(t),c=child(t);const create=al.CreateBuffer.bind(al);
  al.CreateBuffer=()=>({result:ALResult.E_OUTOFMEMORY,implementation:null});assert.equal(c.OnPrepareResources(),false);
  c.UpdateBuffer(context);assert.equal(c._vertexBuffer.IsValid(),false);
  al.CreateBuffer=create;assert.equal(c.OnPrepareResources(),true);
  const buffer=c._vertexBuffer,map=buffer.MapForWriting;
  buffer.MapForWriting=()=>({result:ALResult.E_INVALIDCALL,data:null});c.UpdateBuffer(context);assert.equal(c._instanceCursor.view,null);
  buffer.MapForWriting=map;const unmap=t.mock.method(buffer,'UnmapForWriting');
  c.lines[0].UpdateBuffer=()=>{throw Error('path write failed');};assert.throws(()=>c.UpdateBuffer(context),/path write failed/);assert.equal(unmap.mock.callCount(),1);
});

test('real deathless layout child line sets hydrate and produce nonzero instance draws',{
  skip:!process.env.CJS_DEATHLESS_VALUES&&'set CJS_DEATHLESS_VALUES to the captured deathless layout values'
},t=>{
  const {context,draws,material}=setup(t),values=JSON.parse(readFileSync(process.env.CJS_DEATHLESS_VALUES,'utf8')),found=[];
  const visit=x=>{if(!x||typeof x!=='object')return;if(x._type==='EveChildLineSet')found.push(x);for(const v of Object.values(x))visit(v);};visit(values);
  assert.equal(found.length,20,'captured production layout contains twenty native line owners');
  let points=0;
  for(const value of found) {
    const c=CjsSchema.from('EveChildLineSet',value);assert.ok(c.lines.length>0);assert.ok(c.lineSet);
    const originalMode=c.renderType;c.renderType=BOTH;
    // Asset-authored paths/transforms/colors are real. The tiny geometry and
    // material isolate owner instancing from external shader/geometry loading.
    mesh(c,material);c.Initialize();update(c);const renderables=[];c.GetRenderables(renderables);assert.ok(renderables.includes(c));
    const batches=collect(c);assert.equal(batches.length,1);assert.ok(c._totalObjectCount>0);points+=c._totalObjectCount;
    context.RenderBatches({GetBatches:()=>batches});c.renderType=originalMode;
  }
  assert.equal(draws.length,20);assert.ok(points>100);assert.equal(draws.reduce((n,d)=>n+d[1],0),points);
  t.diagnostic(`${found.length} authored line owners, ${points} instance records, ${draws.length} headless draws`);
});
