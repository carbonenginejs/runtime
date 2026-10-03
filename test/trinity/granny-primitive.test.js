import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,existsSync} from 'node:fs';
import {CjsSchema} from '../../npm/dist/global/schema/index.js';
import {blue,IInitialize,INotify,NotifyModified,ResourceRequirement} from '../../npm/dist/global/blue/index.js';
import {finalizeReaderObject} from '../../npm/dist/global/schema/hydration.js';
import {Tr2GrannyPrimitiveSet,Tr2PrimitiveSet,Tr2LineSet,Tr2SolidSet,TriDevice,Tr2EffectStateManager,
  Tr2RenderContext_GetMainThreadRenderContext,RawData} from '../../npm/dist/trinity/index.js';
import {TriGeometryRes} from '../../npm/dist/resource/index.js';
import {Tr2RenderContextALStub,Tr2BufferAL,ALResult} from '../../npm/dist/trinityal/index.js';
import {TriBatchType} from '../../npm/dist/global/consts/graphics/index.js';
import {Topology} from '../../npm/dist/global/consts/renderContext/index.js';
import {Tr2PickType} from '../../npm/dist/trinity/core/view/Tr2PickType.js';
import {mat4} from '../../npm/dist/global/math/mat4.js';
import {retireDemoShips,hydrateDemoShip} from '../trinityal/webgpu/demo/demoShipLifetime.js';
import {StubResMan} from '../support/stubResMan.js';

const OPAQUE=TriBatchType.TRIBATCHTYPE_OPAQUE,PICKING=TriBatchType.TRIBATCHTYPE_PICKING;
function near(actual,expected,epsilon=1e-5){assert.equal(actual.length,expected.length);actual.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<epsilon,`${i}: ${v} != ${expected[i]}`));}
function mesh(name='ordinary',x=0) {
  return {name,vertex:{position:[x,0,0,x+6,0,0,x,3,0],normal:[0,0,1,0,0,1,0,0,1]},
    indices:[{faces:new Uint16Array([0,1,2])}],areas:[{firstElement:0,elementCount:1}]};
}
function geometry(meshes=[mesh()],ready=true){const r=new TriGeometryRes();r.SetPayload({meshes});if(ready)r.MarkPrepared();return r;}
function setup(t,resolve=null){
 const context=Tr2RenderContext_GetMainThreadRenderContext(),previous=context.GetRenderContextAL(),manager=blue.resMan;
 const before=new Set(TriDevice.GetResourcesRegistered());
 const al=new Tr2RenderContextALStub();context.SetRenderContextAL(al);al.CreateDevice();al.BeginScene();
 blue.resMan=new StubResMan(resolve);
 const maps=[],indices=[],draws=[],map=Tr2BufferAL.prototype.MapForWriting,create=al.CreateBuffer.bind(al),draw=al.DrawIndexedInstanced.bind(al);
 t.mock.method(Tr2BufferAL.prototype,'MapForWriting',function(...args){const r=map.apply(this,args);if(this.GetDesc().stride===40&&r.data)maps.push(r.data);return r;});
 al.CreateBuffer=(description,data,...args)=>{if(description.stride===4&&data)indices.push(new Uint32Array(data.buffer,data.byteOffset,data.byteLength/4).slice());return create(description,data,...args);};
 al.DrawIndexedInstanced=(...args)=>{draws.push(args);return draw(...args);};
 const shader={GetTechniqueIndex:()=>0,GetPassCount:()=>1,GetShaderTypeMask:()=>3,ApplyAllStateForPass(){}};
 const effect={GetShaderStateInterface:()=>shader,CompatibleWithGdr:()=>false,ApplyMaterialDataForPass(){}};
 t.after(()=>{for(const r of TriDevice.GetResourcesRegistered())if(!before.has(r)&&r.constructor===Tr2GrannyPrimitiveSet)r.Destroy();blue.resMan=manager;context.SetRenderContextAL(previous);});
 return {context,al,maps,indices,draws,effect,manager:blue.resMan};
}
function make(path='res:/primitive.gr2'){const p=new Tr2GrannyPrimitiveSet();p.grannyResPath=path;finalizeReaderObject(p);return p;}
function batches(p,type=OPAQUE,data=null){const out=[];p.GetBatches({Commit:b=>out.push(b)},type,data);return out;}

test('nominal reader initialization acquires geometry after population and uploads native records',t=>{
 const r=geometry([mesh('picking',20),mesh('a'),mesh('b',10)]),{maps,indices,manager}=setup(t,()=>r),p=make();
 assert.equal(CjsSchema.cast(p,IInitialize),p);assert.equal(CjsSchema.cast(p,INotify),p);
 assert.equal(manager.requests.length,1);assert.equal(manager.requests[0].options.requirement,ResourceRequirement.GEOMETRY);
 assert.equal(p.grannyRes,r);assert.equal(p._primitiveCount,3);assert.equal(p._pickingPrimitiveCount,1);assert.equal(p._pickingIndexOffset,6);
 assert.deepEqual([...p._triangleIndices],[0,1,2,3,4,5,6,7,8]);
 assert.deepEqual([...p._lineIndices.slice(0,6)],[0,1,1,2,2,0]);assert.equal(p._vertexBuffer.GetDesc().stride,40);
 assert.equal(maps.at(-1).byteLength,9*40);near(new Float32Array(maps.at(-1).buffer,maps.at(-1).byteOffset,10),[0,0,0,0,0,1,.5,.5,.5,1]);
 assert.deepEqual([...indices.at(-2)],[0,1,2,3,4,5,6,7,8]);
 const declaration=Tr2EffectStateManager.getVertexDeclarationElements(p._vertexDeclHandle);
 assert.deepEqual(declaration.items.map(x=>[x.offset,x.type]),[[0,'FLOAT32_3'],[12,'FLOAT32_3'],[24,'FLOAT32_4']]);
 near(p.boundingSphere.slice(0,3),[12,1,0]);assert.ok(Math.abs(p.boundingSphere[3]-Math.hypot(14,1))<1e-5,'mean-center bound, not AABB center');
});

test('coalesced path/color changes acquire once and retain old storage while replacement is pending',t=>{
 const a=geometry(),b=geometry([mesh('new',50)],false);const {manager}=setup(t,path=>path.endsWith('a.gr2')?a:b),p=make('res:/a.gr2');
 const old=p._points;
 CjsSchema.setValues(p,{grannyResPath:'res:/b.gr2',color:[1,0,0,1]});
 assert.equal(manager.requests.length,2);assert.equal(p._points,old);near(p._points.slice(6,10),[1,0,0,1]);
 a.EmitEvent('completed',a);a.EmitEvent('purged',a);assert.equal(p._points,old,'stale handle must not clear or rebuild');
 b.MarkPrepared();assert.notEqual(p._points,old);assert.equal(p._points[0],50);near(p._points.slice(6,10),[1,0,0,1]);
 const bound=p.boundingSphere.slice();b.EmitEvent('purged',b);assert.equal(p._points.length,0);assert.equal(p._vertexBuffer.IsValid(),false);near(p.boundingSphere,bound);
 b.EmitEvent('completed',b);assert.equal(p._points[0],50,'subscription survives initial ready callback and later reload');
 CjsSchema.setValues(p,{grannyResPath:''});assert.equal(p.grannyRes,null);assert.equal(p._points.length,0);
 b.EmitEvent('completed',b);assert.equal(p._points.length,0);
});

test('failed replacement retains cached geometry; completion after destroy cannot resurrect it',t=>{
 const a=geometry(),b=geometry([mesh('new',50)],false);setup(t,path=>path.endsWith('a.gr2')?a:b);const p=make('res:/a.gr2'),old=p._points;
 CjsSchema.setValues(p,{grannyResPath:'res:/bad.gr2'});b.SetError(new Error('fixture failure'));assert.equal(p._points,old);
 p.Destroy();b.MarkPrepared();assert.equal(p._points.length,0);assert.equal(p._vertexBuffer.IsValid(),false);assert.equal(TriDevice.GetResourcesRegistered().includes(p),false);
});

test('direct color edits upload cached vertices without changing the authored field',t=>{
 setup(t,()=>geometry());const p=make();p.SetCurrentColor([0,.25,1,.5]);near(p.color,[.5,.5,.5,1]);near(p._points.slice(6,10),[0,.25,1,.5]);
 CjsSchema.setValues(p,{color:[.2,.3,.4,1]});near(p._points.slice(6,10),[.2,.3,.4,1]);
});

test('CMF uses full binary indices, explicit LOD zero and four-wide positions',t=>{
 const first=mesh(),wrong=mesh('wrong',99);first.vertex.position=[0,0,0,123,6,0,0,456,0,3,0,789];first.vertexCount=3;
 const bytes=new Uint8Array(20),dv=new DataView(bytes.buffer);[2,0,1,1,0,2].forEach((v,i)=>dv.setUint16(4+i*2,v,true));
 first.vb={size:3*28,stride:28};first.ib={index:0,offset:4,size:12,stride:2};first.indices=[{faces:[0,0,0]}];
 const resource=geometry([{name:'cmf',lods:[first,wrong]}]);resource.GetPayload().buffers=[{data:bytes}];
 setup(t,()=>resource);const p=make();assert.deepEqual([...p._triangleIndices],[2,0,1,1,0,2]);
 near(p._points.slice(0,3),[0,0,0]);near(p._points.slice(10,13),[6,0,0]);near(p._points.slice(20,23),[0,3,0]);
});

test('CMF packed normal precedence and missing-normal zero preserve the native extraction',t=>{
 const a=mesh(),b=mesh('b',10),c=mesh('c',20);
 a.vertex.packedTangent=[0,0,0,.5,0,0,0,.5,0,0,0,.5];a.vertex.packedTangentLegacy=Array(12).fill(.5);
 b.vertex.packedTangentLegacy=[.5,.75,.75,.75,.5,.75,.75,.75,.5,.75,.75,.75];
 c.vertex.normal=undefined;setup(t,()=>geometry([a,b,c]));const p=make();
 near(p._points.slice(3,6),[0,0,.5]);near(p._points.slice(33,36),[0,0,1]);near(p._points.slice(63,66),[0,0,0]);
});

test('source provenance selects CMF exact versus Granny prefix picking names',t=>{
 const resource=geometry([mesh('picking_extra',20),mesh('visible')]);setup(t,()=>resource);const p=make();
 assert.equal(p._pickingPrimitiveCount,0);
 // Exercise the native Granny builder on the existing decoded shared shape.
 p.CleanUp();p.CreatePrimitiveFromGranny();p.PrepareResources();assert.equal(p._pickingPrimitiveCount,1);assert.equal(p._pickingIndexOffset,3);
 assert.equal(p._points[0],0);assert.equal(p._points[30],20);
});

test('ordinary, solid and dedicated picking batches issue native indexed ranges through AL',t=>{
 const {context,draws,effect}=setup(t,()=>geometry([mesh('picking'),mesh('visible',10)])),p=make();p.effect=p.pickEffect=effect;
 const pod=p.GetPerObjectData({Alloc:name=>RawData.create(name)});
 const wire=batches(p,OPAQUE,pod)[0];assert.equal(wire.topology,Topology.TOP_LINES);context.RenderBatches({GetBatches:()=>[wire]});
 p.renderSolid=true;const solid=batches(p,OPAQUE,pod)[0];assert.equal(solid.topology,Topology.TOP_TRIANGLES);context.RenderBatches({GetBatches:()=>[solid]});
 const pick=batches(p,PICKING,pod)[0];context.RenderBatches({GetBatches:()=>[pick]});
 assert.deepEqual(draws.map(x=>x.slice(0,3)),[[6,1,0],[3,1,0],[3,1,3]]);
 assert.equal(batches(p,TriBatchType.TRIBATCHTYPE_TRANSPARENT).length,0);
 const selected=[];p.GetPickingBatches({Commit:b=>selected.push(b)},Tr2PickType.PICK_TYPE_PICKING|Tr2PickType.PICK_TYPE_OPAQUE,pod);assert.equal(selected.length,2);
 p.ReleaseResources();assert.equal(batches(p).length,0);p.PrepareResources();assert.equal(batches(p).length,1);
});

test('base transforms, bounds, sort and per-object bytes match nontrivial native composition',t=>{
 setup(t);const p=new Tr2PrimitiveSet();p.localTransform.set([0,2,0,0,-3,0,0,0,0,0,4,0,5,6,7,1]);p.boundingSphere.set([1,2,3,2]);
 const view=mat4.create(),context={GetViewTransform:()=>view,GetViewPosition:()=>[5,6,21],GetFieldOfView:()=>1};
 p.scaleByDistanceToView=true;p.UpdateTransform(context);assert.equal(p.scale,2);near(p.worldTransform,[0,4,0,0,-6,0,0,0,0,0,8,0,5,6,7,1]);
 near(p.GetBoundingSphere(),[-7,10,31,4]);assert.ok(Math.abs(p.GetSortValue(context)-(Math.hypot(12,-4,-10)-4))<1e-5);
 const pod=p.GetPerObjectData({Alloc:name=>RawData.create(name)}),transposed=mat4.transpose(mat4.create(),p.worldTransform);
 near(pod.vs.GetTransposed('WorldMat'),transposed);near(pod.ps.GetTransposed('WorldMat'),transposed);assert.equal(pod.vs.GetData().length,16);assert.equal(pod.ps.GetData().length,16);
 mat4.fromZRotation(view,.4);p.viewOriented=true;p.UpdateTransform(context);
 near(p.worldTransform,[2*view[0],2*view[4],2*view[8],0,2*view[1],2*view[5],2*view[9],0,2*view[2],2*view[6],2*view[10],0,5,6,7,1]);
 assert.equal(p.GetPerObjectData({Alloc:()=>null}),null);
 p.scaleByDistanceToView=false;p.viewOriented=false;p.UpdateTransform(context);near(p.worldTransform,p.localTransform);assert.equal(p.GetWorldTransform(),p.worldTransform);assert.equal(p.GetID(9),p);assert.equal(p.HasTransparentBatches(),true);
 for(const Type of [Tr2LineSet,Tr2SolidSet]){const sibling=new Type();sibling.localTransform[12]=7;sibling.UpdateTransform(context);assert.equal(sibling.worldTransform[12],7);assert.equal(sibling.HasTransparentBatches(),true);}
});

test('allocation failure remains visible and device preparation can retry',t=>{
 const {al}=setup(t,()=>geometry()),create=al.CreateBuffer.bind(al);let fail=true;
 al.CreateBuffer=(desc,...args)=>fail&&desc.stride===40?{result:ALResult.E_FAIL,implementation:null}:create(desc,...args);
 const p=make();assert.equal(p._vertexBuffer.IsValid(),false);fail=false;assert.equal(p.PrepareResources(),true);assert.equal(p._vertexBuffer.IsValid(),true);
});

test('demo retirement and failed hydration release only owned primitive resources',t=>{
 setup(t,()=>geometry());const p=make(),keep=make();retireDemoShips([p,keep],[keep]);assert.equal(p.grannyRes,null);assert.ok(keep.grannyRes);assert.ok(TriDevice.GetResourcesRegistered().includes(keep));
 const before=new Set(TriDevice.GetResourcesRegistered());assert.throws(()=>hydrateDemoShip({_type:'Tr2GrannyPrimitiveSet',grannyResPath:'res:/primitive.gr2'}),/StartControllers/);
 assert.deepEqual(new Set(TriDevice.GetResourcesRegistered()),before);
});

test('real Granny asset produces initialized vertices and a submitted draw', {skip:!process.env.CJS_PLACEABLE_GEOMETRY},t=>{
 const r=new TriGeometryRes();r.SetPayload(r.ReadGrannyFile(readFileSync(process.env.CJS_PLACEABLE_GEOMETRY)));r.MarkPrepared();
 const {context,draws,effect}=setup(t,()=>r),p=make();p.effect=effect;assert.equal(r.IsUsingCMF(),false);assert.ok(p._points.length);assert.ok(p._primitiveCount);
 context.RenderBatches({GetBatches:()=>batches(p)});assert.equal(draws.length,1);assert.equal(draws[0][0],p._primitiveCount*6);
});

test('promotion leaves one maintained class and retains registered schema fields',()=>{
 assert.equal(existsSync('src/trinity/generated/trinityCore/Tr2GrannyPrimitiveSet.js'),false);
 assert.ok(readFileSync('src/trinity/generated/summary.json','utf8').includes('Tr2GrannyPrimitiveSet'));
 assert.equal(CjsSchema.getField(Tr2GrannyPrimitiveSet,'grannyResPath').type.kind,'path');
 assert.equal(CjsSchema.getField(Tr2GrannyPrimitiveSet,'renderSolid').type.kind,'boolean');
});


test('active draws renew the manager lease and recover a purged handle before the storage guard',t=>{
 const r=geometry(),{effect}=setup(t,()=>r),p=make();p.effect=effect;
 let renewals=0,reloads=0;
 r.SetLifecycleController({keepAlive(){renewals++;},keepPayloadAlive(){}});
 r.SetReloadHook(()=>{reloads++;r.MarkLoading();return true;});
 assert.equal(batches(p).length,1);assert.equal(renewals,1);
 r.ReleasePayload();r.MarkPurged();assert.equal(p._vertexBuffer.IsValid(),false);
 assert.equal(batches(p).length,0);assert.equal(reloads,1);assert.equal(r.IsLoading(),true);
 batches(p);assert.equal(reloads,1,'pending reload must not restart per frame');
 r.SetPayload({meshes:[mesh('reloaded',17)]});r.MarkPrepared();
 assert.equal(p.grannyRes,r);assert.equal(batches(p).length,1);assert.equal(p._points[0],17);
});

test('Granny primitives upload the complete authored stream, including ungrouped triangles', t => {
 const source=mesh();
 source.indexBuffer=new Uint16Array([0,1,2,2,1,0]);
 source.indices=[{firstElement:1,faces:source.indexBuffer.subarray(3)}];
 const r=geometry([source]),{indices}=setup(t,()=>r),p=make();
 assert.equal(p._primitiveCount,2);
 assert.deepEqual([...p._triangleIndices],[0,1,2,2,1,0]);
 assert.deepEqual([...indices.at(-2)],[0,1,2,2,1,0]);
 assert.equal(p._lineIndices.length,12);
});
