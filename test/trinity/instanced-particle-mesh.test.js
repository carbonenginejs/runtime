import { addChild } from "../../npm/dist/global/blue/children.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {blue} from "../../npm/dist/global/blue/index.js";
import {CjsModel} from "../../npm/dist/global/model/index.js";
import {mat4} from "../../npm/dist/global/math/mat4.js";
import {TriBatchType} from "../../npm/dist/global/consts/graphics/index.js";
import {TriGeometryRes} from "../../npm/dist/resource/index.js";
import {CjsBlackFormat} from "../../npm/dist/resource/formats/black/index.js";
import {Tr2InstancedMesh,Tr2MeshArea,Tr2ParticleSystem,Tr2ParticleElementDeclaration,Tr2EffectStateManager,
  TriDevice,EveChildParticleSystem,EveChildContainer,EveShip2,EveUpdateContext,ExecuteMainThreadActions,
  Tr2RenderContext_GetMainThreadRenderContext} from "../../npm/dist/trinity/index.js";
import {Tr2RenderContextALStub} from "../../npm/dist/trinityal/index.js";
import {SharedGeometryBuffer} from "../../npm/dist/trinity/core/mesh/TriGeometryResAllocations.js";
import {StubResMan} from "../support/stubResMan.js";
import "../../npm/dist/audio/index.js";
import { CjsWebgpuRenderContextAL } from "../../npm/dist/trinityal/webgpu/internal.js";
import { WebgpuVertexBufferLayout } from "../../npm/dist/trinityal/webgpu/index.js";

function setup(t)
{
  const registered=new Set(TriDevice.GetResourcesRegistered());
  t.after(()=>{for(const resource of TriDevice.GetResourcesRegistered())if(!registered.has(resource)&&(resource.constructor===Tr2ParticleSystem||resource.constructor===Tr2InstancedMesh))resource.Destroy();});
  const context=Tr2RenderContext_GetMainThreadRenderContext(),prior=context.GetRenderContextAL(),manager=blue.resMan;
  const al=new Tr2RenderContextALStub();context.SetRenderContextAL(al);al.CreateDevice();al.BeginScene();blue.resMan=new StubResMan();
  context.SetViewTransform(mat4.create());
  t.after(()=>{SharedGeometryBuffer(context).ReleaseResources();context.SetRenderContextAL(prior);blue.resMan=manager;});
  // Validate the state actually bound by SubmitGeometry, after ESM filtering,
  // with WebGPU's real conversion. Read every declared attribute so an unused
  // current shader input cannot hide an invalid authored layout.
  const layoutState={_vertexLayout:null,_streams:[],_shaderProgram:{GetInputs(){
    return layoutState._vertexLayout.GetDefinition().map((item,index)=>({...item,registerIndex:index}));
  }}};
  const setLayout=al.SetVertexLayout.bind(al),setStream=al.SetStreamSource.bind(al);
  al.SetVertexLayout=layout=>{layoutState._vertexLayout=layout;return setLayout(layout);};
  al.SetStreamSource=(stream,buffer,offset,stride)=>{layoutState._streams[stream]={buffer,offset,stride};return setStream(stream,buffer,offset,stride);};
  const uploads=[];
  const create=al.CreateBuffer.bind(al);
  al.CreateBuffer=(...args)=>{const buffer=create(...args);if(args[2]===true||!buffer)return buffer;const update=buffer.UpdateBuffer.bind(buffer);buffer.UpdateBuffer=(...data)=>{uploads.push({buffer,args:data.map(value=>ArrayBuffer.isView(value)?value.slice():value)});return update(...data);};return buffer;};
  const draws=[],draw=al.DrawIndexedInstanced.bind(al);al.DrawIndexedInstanced=(...args)=>{
    const layouts=CjsWebgpuRenderContextAL.prototype.BuildVertexBufferLayouts.call(layoutState);
    assert.notEqual(typeof layouts,"string",layouts);
    draws.push(args);return draw(...args);
  };
  const shader={GetTechniqueIndex:()=>0,GetPassCount:()=>1,GetShaderTypeMask:()=>3,ApplyAllStateForPass(){}};
  const material={GetShaderStateInterface:()=>shader,ApplyMaterialDataForPass(){}};
  return {context,al,draws,material,uploads};
}
function geometry()
{
  const g=new TriGeometryRes();g.SetPayload({meshes:[{decl:[{usage:"Position",usageIndex:0,type:"Float32",elementCount:3,offset:0}],
    vertex:{position:[0,0,0,1,0,0,1,1,0,0,1,0]},indices:[{faces:[0,1,2,0,2,3]}],areas:[{firstElement:0,elementCount:1},{firstElement:1,elementCount:1}]}]});
  g.MarkPrepared();return g;
}
function particles(t)
{
  const p=new Tr2ParticleSystem();p.maxParticleCount=8;
  p.elements.push(Object.assign(new Tr2ParticleElementDeclaration(),{elementType:1}));p.Initialize();
  p.SpawnParticle({position:[1,2,3]});p.SpawnParticle({position:[3,4,5]});p.SortParticles();
  t.after(()=>p.ReleaseResources());return p;
}
const collect=(mesh,areas,reverse=false)=>{const batches=[];mesh.GetBatches({Commit(b){batches.push(b);return true;}},areas,null,Infinity,reverse);return batches;};

test("cold instanced mesh merges declarations and preserves suballocation/instance offsets through submission",t=>{
  const {context,draws,material}=setup(t),provider=particles(t),g=geometry();
  SharedGeometryBuffer(context).Allocate(12,10,new Uint8Array(120),context);
  const data=provider.GetInstanceData();data.offset=data.stride*3;provider.GetInstanceData=()=>data;
  const mesh=new Tr2InstancedMesh();mesh.SetGeometryRes(g);mesh.SetInstanceGeometryRes(provider);
  const area=new Tr2MeshArea();area.index=1;area.count=1;area.SetMaterial(material);
  const original=Tr2EffectStateManager.getVertexDeclarationElements(provider.GetInstanceBufferVertexDeclaration());
  const saved=original.items.map(item=>({...item}));
  const merged=Tr2EffectStateManager.getVertexDeclarationElements(mesh.GetVertexDeclaration());
  assert.equal(merged[0].usageIndex,0);
  for(let i=0;i<original.items.length;i++){
    assert.equal(merged[i+1].stream,1);assert.equal(merged[i+1].instanceStepRate,1);
    assert.equal(merged[i+1].usageIndex,original.items[i].usageIndex+8,"Tr2InstancedMesh.cpp:482 native semantic offset");
  }
  assert.deepEqual(original.items.map(item=>({...item})),saved,"merge leaves source declaration unchanged");
  const lod=g.GetMeshLod(0,Infinity);assert.equal(lod.allocationsValid,undefined);
  const batches=collect(mesh,[area]);assert.equal(batches.length,1);assert.equal(lod.allocationsValid,true,"cold base realized before stream1 binding");
  const b=batches[0];assert.equal(b.vertexStreams[1],data.buffer);assert.equal(b.instanceCount,2);assert.equal(b.startInstanceLocation,3);
  assert.ok(b.baseVertexLocation>0);assert.equal(b.startIndexLocation,lod.indexAllocation.GetStartIndex()+3);
  context.RenderBatches({GetBatches:()=>batches});assert.deepEqual(draws.at(-1),[3,2,b.startIndexLocation,b.baseVertexLocation,3]);
  assert.equal(b.vertexStreams[1],data.buffer,"SubmitGeometry does not erase the instance stream");
  const reversed=collect(mesh,[area],true)[0];
  assert.equal(reversed.startIndexLocation,lod.reversedIndexAllocation.GetStartIndex());
  area.reversed=true;assert.equal(collect(mesh,[area],true)[0].startIndexLocation,b.startIndexLocation,"native XOR winding");
  mesh.ReleaseResources();assert.equal(mesh.GetVertexDeclaration(),Tr2EffectStateManager.Unknown);
  assert.equal(collect(mesh,[area]).length,1,"declaration rebuild after release");
  provider.elements.push(Object.assign(new Tr2ParticleElementDeclaration(),{customName:"tag"}));provider.Initialize();provider.SpawnParticle({position:[1,0,0],tag:7});
  delete provider.GetInstanceData;
  assert.equal(collect(mesh,[area]).length,1,"provider declaration change rebuilds merge");
  assert.equal(Tr2EffectStateManager.getVertexDeclarationElements(mesh.GetVertexDeclaration()).length,merged.length+1);
});

test("instanced mesh preserves native empty, readiness, display and reversed-index gates",t=>{
  const {material}=setup(t),p=particles(t),g=geometry(),mesh=new Tr2InstancedMesh(),area=new Tr2MeshArea();area.SetMaterial(material);
  mesh.SetGeometryRes(g);assert.equal(collect(mesh,[area]).length,0);
  mesh.SetInstanceGeometryRes(p);assert.equal(collect(mesh,[area]).length,1);
  mesh.display=false;assert.equal(collect(mesh,[area]).length,0);mesh.display=true;
  area.display=false;assert.equal(collect(mesh,[area]).length,0);area.display=true;
  area.count=0;assert.equal(collect(mesh,[area]).length,0);area.count=1;
  g.GetMeshLod(0,Infinity).reversedIndicesValid=false;assert.equal(collect(mesh,[area],true).length,0);
  p.ClearParticles();assert.equal(collect(mesh,[area]).length,0);p.ReleaseResources();assert.equal(collect(mesh,[area]).length,0);
});

const corpus=process.env.PARTICLE_BLACK_CORPUS_DIR;
test("real green Crisis smoke on two hulls reaches a nonzero instanced stub draw",{skip:!corpus&&"set PARTICLE_BLACK_CORPUS_DIR for real Crisis/unitplane copies"},async t=>{
  const {context,draws,material}=setup(t);
  const unit=await readFile(join(corpus,"unitplane.gr2"));assert.equal(createHash("md5").update(unit).digest("hex"),"238fdf7d1f76dfc7812f22e5aea40135");
  let ticks=100*1e7;const actual=blue.os.GetActualTime,frame=blue.os.GetCurrentFrameTime;
  blue.os.GetActualTime=()=>ticks;blue.os.GetCurrentFrameTime=()=>ticks;t.after(()=>{blue.os.GetActualTime=actual;blue.os.GetCurrentFrameTime=frame;});
  for(const file of ["angbc1_t1_crisis_fx.black","angde1_t1_crisis_fx.black"]){
    const bytes=await readFile(join(corpus,file));
    assert.equal(createHash("md5").update(bytes).digest("hex"),file.startsWith("angbc")?"fb022a5d320c37fab634d4e080243f86":"007204e6136609a2969ddb38e7a57a8d");
    const values=CjsBlackFormat.readPayload(bytes).object;
    let child;
    if(file.startsWith("angbc")){
      child=CjsSchema.from("EveChildParticleSystem", values.objects[2].objects[0]);child.particleEmitters[0].UpdateSimulation(4);
    }else{
      const root=CjsSchema.from("EveChildContainer", values),ship=new EveShip2();addChild(ship, "effectChildren", root, { listNotify: ship });
      child=root.objects[1].objects[0];ship.lodLevel=3;ship.isVisible=true;ship.StartControllers();
      const update=new EveUpdateContext();
      const zapMax=root.objects[4].objects.map(()=>0);
      const zap=root.objects[4].objects[0];let zapDraw=null;
      const zapBytes=await readFile(join(corpus,"unit_sphere.gr2"));
      assert.equal(createHash("md5").update(zapBytes).digest("hex"),"761a864d18bf591bb5f92308464eb42e");
      const zapGeometry=new TriGeometryRes();zapGeometry.SetPayload(zapGeometry.ReadGrannyFile(zapBytes));zapGeometry.MarkPrepared();zap.mesh.SetGeometryRes(zapGeometry);
      for(const area of zap.mesh.additiveAreas)area.SetMaterial(material);
      for(let step=0;step<=200;step++){
        const previousTicks=ticks;
        ticks=1_000_000_000+step*1_000_000;update.SetTime(ticks);
        assert.equal(update.GetTime(),ticks);
        assert.equal(update.GetDeltaT(),step===0?0:Math.fround((ticks-previousTicks)/10_000_000));
        if(step===20)ship.SetControllerVariable("IsWarping",1);
        ship.UpdateSyncronous(update);ship.UpdateAsyncronous(update);ExecuteMainThreadActions();
        root.objects[4].objects.forEach((zap,i)=>{zapMax[i]=Math.max(zapMax[i],zap.particleSystems[0].aliveCount);});
        if (!zapDraw && zap.particleSystems[0].aliveCount>0) {
          const system=zap.particleSystems[0];system.UpdateViewDependentData(null,mat4.create());zap._isVisible=true;zap.GetRenderables([]);
          const batches=[];zap.GetBatches({Commit(b){batches.push(b);return true;}},TriBatchType.TRIBATCHTYPE_ADDITIVE,null);
          assert.ok(batches.length>0);const before=draws.length;context.RenderBatches({GetBatches:()=>batches});
          assert.ok(draws.length>before);zapDraw=draws.at(-1);
          assert.equal(zapDraw[1],system.aliveCount,"real CPU zap live count reaches DrawIndexedInstanced");
        }
      }
      assert.ok(zapDraw&&zapDraw[0]>0&&zapDraw[1]>0,"electricity proof is an actual CPU-particle draw, not emissive/lighting");
      t.diagnostic(JSON.stringify({zap:zap.name,zapMax,zapDraw}));
      assert.ok(child.particleEmitters[0].rate>=0.49,"real ShipStandard_CS Warp_Smoke_Dark_Emit drives the CPU emitter");
    }
    const p=child.particleSystems[0];t.after(()=>p.ReleaseResources());assert.ok(p.aliveCount>0);
    const color=child.mesh.transparentAreas[0].effect.parameters.find(parameter=>parameter.name==="Colors");
    assert.ok(color,"authored motionvector Colors parameter");
    assert.equal(color.value[0],0);assert.equal(color.value[1],1);assert.ok(color.value[2]>0&&color.value[2]<0.011);
    assert.ok(color.value[3]>0,"authored/controller-driven green smoke intensity");
    const uploadedColor=new Float32Array(4);color.CopyValueToEffect(0,uploadedColor);
    assert.deepEqual(Array.from(uploadedColor),Array.from(color.value),"Tr2Vector4Parameter.cpp CopyValueToEffect preserves authored green effect constants");
    const g=new TriGeometryRes();g.SetPayload(g.ReadGrannyFile(unit));g.MarkPrepared();child.mesh.SetGeometryRes(g);
    for(const area of child.mesh.transparentAreas)area.SetMaterial(material);
    p.UpdateViewDependentData(null,mat4.create());child._isVisible=true;child.GetRenderables([]);
    const batches=[];child.GetBatches({Commit(b){batches.push(b);return true;}},TriBatchType.TRIBATCHTYPE_TRANSPARENT,null);
    assert.equal(batches.length,1);assert.equal(batches[0].instanceCount,p.aliveCount);assert.equal(batches[0].vertexStreams[1],p.GetGpuBuffer());
    const before=draws.length;context.RenderBatches({GetBatches:()=>batches});assert.equal(draws.length,before+1);
    assert.ok(draws.at(-1)[0]>0&&draws.at(-1)[1]>0,"actual nonzero DrawIndexedInstanced on stub AL");
    t.diagnostic(JSON.stringify({file,child:child.name,colors:Array.from(color.value),draw:draws.at(-1)}));
  }
});

test("every CPU particle declaration in the copied Crisis and VDS graphs fits its physical stream", {
  skip:!corpus&&"set PARTICLE_BLACK_CORPUS_DIR for copied particle effect graphs"
}, async t => {
  setup(t);
  for (const file of ["angbc1_t1_crisis_fx.black","angde1_t1_crisis_fx.black","vds_trail_fire_01a.black"]) {
    const values=CjsBlackFormat.readPayload(await readFile(join(corpus,file))).object;
    const root=CjsSchema.from("EveChildContainer", values),systems=new Set(),seen=new Set();
    function visit(child) {
      if(!child||seen.has(child))return;seen.add(child);
      for(const p of child.particleSystems??[])systems.add(p);
      for(const item of child.objects??[])visit(item);
      if(child.effect)visit(child.effect.source);
    }
    visit(root);assert.ok(systems.size>0,file);
    for(const p of systems) {
      t.after(()=>p.ReleaseResources());
      const data=p.GetInstanceData(),definition=Tr2EffectStateManager.getVertexDeclarationElements(p.GetInstanceBufferVertexDeclaration());
      assert.doesNotThrow(()=>WebgpuVertexBufferLayout(data.stride,definition.items.map((item,index)=>({registerIndex:index,element:item}))),file+":"+p.name);
    }
    t.diagnostic(file+": "+systems.size+" physical particle declarations validated");
  }
});

test("geometry instance providers preserve deferred, loaded and assigned Carbon transitions", t => {
  setup(t);
  const loaded=geometry(),assigned=geometry(),next=geometry();
  blue.resMan=new StubResMan(path=>path==="res:/next.gr2"?next:loaded);
  const mesh=new Tr2InstancedMesh();
  mesh.instanceGeometryResource=assigned;mesh.instanceGeometryResPath="res:/loaded.gr2";
  mesh.deferGeometryLoad=true;mesh.Initialize();
  assert.equal(blue.resMan.requests.length,0);assert.equal(mesh.GetInstanceGeometryResource(),assigned);
  mesh.deferGeometryLoad=false;mesh.OnModified("deferGeometryLoad");
  assert.equal(mesh.GetInstanceGeometryResource(),loaded);
  mesh.SetInstanceGeometryRes(assigned);
  assert.equal(mesh.GetInstanceGeometryResource(),loaded,"same assigned pointer retains native loaded override");
  mesh.SetInstanceMeshResPath("res:/next.gr2");assert.equal(mesh.GetInstanceGeometryResource(),next);
  mesh.SetInstanceMeshResPath("");assert.equal(mesh.GetInstanceGeometryResource(),null);
  mesh.instanceGeometryResPath="res:/loaded.gr2";mesh.Initialize();mesh.SetInstanceMeshResPath("");
  assert.equal(mesh.GetInstanceGeometryResource(),loaded,"Carbon null-assigned early return preserves loaded override");
  mesh.SetInstanceGeometryRes(assigned);assert.equal(mesh.GetInstanceGeometryResource(),assigned);
});

test("cold geometry providers bind aligned uploaded data for assigned and loaded meshes", t => {
  const {context,draws,material,uploads}=setup(t);
  for(const loaded of [false,true]) {
    const provider=geometry(),mesh=new Tr2InstancedMesh(),area=new Tr2MeshArea();area.SetMaterial(material);
    const payload=provider.GetMeshData(0);
    payload.bounds={min:[-2,-3,-4],max:[5,6,7]};
    assert.equal(provider.IsInstanceDataReady(),true);
    assert.deepEqual(provider.GetInstanceData(),{buffer:null,offset:0,stride:0,count:0});
    assert.equal(provider.GetInstanceBufferVertexDeclaration(),Tr2EffectStateManager.Unknown);
    SharedGeometryBuffer(context).Allocate(12,3,new Uint8Array(36),context);
    if(loaded) {
      blue.resMan=new StubResMan(()=>provider);mesh.instanceGeometryResPath="res:/instances.gr2";mesh.Initialize();
    } else mesh.SetInstanceGeometryRes(provider);
    mesh.SetGeometryRes(geometry());
    const batches=collect(mesh,[area]);assert.equal(batches.length,1);
    const data=provider.GetInstanceData(),batch=batches[0];
    assert.equal(data.count,4);assert.equal(data.stride,12);assert.ok(data.offset>0);
    assert.equal(batch.vertexStreams[1],data.buffer);assert.equal(batch.startInstanceLocation,data.offset/data.stride);
    assert.ok(uploads.some(upload=>upload.buffer===data.buffer && upload.args.some(value=>ArrayBuffer.isView(value) && value.byteLength===48 && new Float32Array(value.buffer,value.byteOffset,12)[3]===1)),"authored positions reach the AL upload");
    const definition=Tr2EffectStateManager.getVertexDeclarationElements(mesh.GetVertexDeclaration());
    assert.equal(definition[1].stream,1);assert.equal(definition[1].usageIndex,8);assert.equal(definition[1].instanceStepRate,1);
    context.RenderBatches({GetBatches:()=>batches});assert.equal(draws.at(-1)[1],4);
    const bounds=provider.GetInstanceBufferBoundingBox();assert.deepEqual(Array.from(bounds.min),[-2,-3,-4]);
    bounds.min[0]=100;assert.equal(payload.bounds.min[0],-2,"value-returned bounds do not mutate geometry");
    assert.deepEqual(provider.GetInstanceData(42),{buffer:null,offset:0,stride:0,count:0});
    assert.equal(provider.GetInstanceBufferVertexDeclaration(42),Tr2EffectStateManager.Unknown);
    const empty=provider.GetInstanceBufferBoundingBox(42);assert.ok(empty.min.every((v,i)=>v>empty.max[i]));
  }
});

test("requested cold instance LOD draws without preparing a broken full-detail LOD", t => {
  const {context,draws,material,uploads}=setup(t),provider=geometry(),mesh=new Tr2InstancedMesh(),area=new Tr2MeshArea();
  area.SetMaterial(material);
  const payload=provider.GetMeshData(0);
  payload.lods=[{vertex:{position:[]},areas:[]},{maxScreenSize:20,vertex:{position:[8,9,10,11,12,13]},areas:[]}];
  delete payload.vertex;delete payload.indices;delete payload.areas;
  mesh.instanceGeometryResource=provider;mesh.SetGeometryRes(geometry());
  const batches=[];
  assert.equal(mesh.GetBatches({Commit(b){batches.push(b);return true;}},[area],null,10),true);
  const data=provider.GetInstanceData(0,10);assert.equal(data.count,2);
  assert.equal(payload.lods[0].allocationsValid,undefined,"LOD0 is not needed for an LOD1 draw");
  context.RenderBatches({GetBatches:()=>batches});assert.equal(draws.at(-1)[1],2);
  assert.ok(uploads.some(upload=>upload.buffer===data.buffer && upload.args.some(value=>ArrayBuffer.isView(value) && value.byteLength===24 && new Float32Array(value.buffer,value.byteOffset,6)[0]===8)));
});

const mabebuCorpus=process.env.MABEBU_CORPUS_DIR;
test("real Mabebu traffic geometry hydrates and submits nonzero instances from warm and cold caches", {
  skip:!mabebuCorpus&&"set MABEBU_CORPUS_DIR for copied Mabebu assets"
}, async t => {
  const {context,draws,material}=setup(t);
  const bytes=await readFile(join(mabebuCorpus,"gfr1_mabebu_fx.black"));
  assert.equal(createHash("md5").update(bytes).digest("hex"),"d408c27aac546dd9f1bb14ba9ced4b05");
  const values=CjsBlackFormat.readPayload(bytes).object;
  for(const warm of [false,true]) {
    const base=new TriGeometryRes(),provider=new TriGeometryRes();
    base.SetPayload(base.ReadGrannyFile(await readFile(join(mabebuCorpus,"unit_plane.gr2")))) ;
    provider.SetPayload(provider.ReadGrannyFile(await readFile(join(mabebuCorpus,"gfr1_mabebu_traffic.gr2"))));
    if(warm){base.MarkPrepared();provider.MarkPrepared();}
    blue.resMan=new StubResMan(path=>path.endsWith("gfr1_mabebu_traffic.gr2")?provider:base);
    const root=CjsSchema.from("EveChildContainer", values),child=root.objects[0],mesh=child.mesh;
    assert.equal(child.name,"traffic");assert.equal(mesh.GetInstanceGeometryResource(),provider);
    assert.deepEqual(provider.GetMeshVertexElements(0).map(element=>element.elementCount),[4,4],"authored Position4 and TexCoord4 survive projection");
    if(!warm){base.MarkPrepared();provider.MarkPrepared();}
    for(const area of mesh.additiveAreas)area.SetMaterial(material);
    const batches=collect(mesh,mesh.additiveAreas);
    assert.ok(batches.length>0);const before=draws.length;
    context.RenderBatches({GetBatches:()=>batches});assert.ok(draws.length>before);
    assert.ok(draws.at(-1)[0]>0&&draws.at(-1)[1]>0);
    t.diagnostic(JSON.stringify({warm,draw:draws.at(-1),stride:provider.GetInstanceData().stride}));
  }
});

const electricityCorpus=process.env.ELECTRICITY_CORPUS_DIR;
test("real angde1 and angbc2 warp electricity draws repeatedly while kill lightning stays separate", {
  skip:!electricityCorpus&&"set ELECTRICITY_CORPUS_DIR for both Crisis graphs and unit_sphere/unit_plane.gr2"
}, async t => {
  const {context,draws,material}=setup(t);
  const geometries=new Map();
  for(const [file,hash] of [["unit_sphere.gr2","761a864d18bf591bb5f92308464eb42e"],["unit_plane.gr2","238fdf7d1f76dfc7812f22e5aea40135"]]) {
    const bytes=await readFile(join(electricityCorpus,file));
    assert.equal(createHash("md5").update(bytes).digest("hex"),hash);
    const resource=new TriGeometryRes();resource.SetPayload(resource.ReadGrannyFile(bytes));resource.MarkPrepared();geometries.set(file,resource);
  }
  let ticks=100*1e7;
  const actual=blue.os.GetActualTime,frame=blue.os.GetCurrentFrameTime,random=Math.random;
  blue.os.GetActualTime=()=>ticks;blue.os.GetCurrentFrameTime=()=>ticks;
  t.after(()=>{blue.os.GetActualTime=actual;blue.os.GetCurrentFrameTime=frame;Math.random=random;});
  for(const [file,hash] of [["angde1_t1_crisis_fx.black","007204e6136609a2969ddb38e7a57a8d"],["angbc2_t1_crisis_fx.black","b9faa9e2ec82b3226a77fab72ba94bcf"]]) {
    const bytes=await readFile(join(electricityCorpus,file));
    assert.equal(createHash("md5").update(bytes).digest("hex"),hash);
    for(const scenario of ["baseline","kills","warp"]) {
      ticks=100*1e7;let seed=123456789;
      Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
      const registered=new Set(TriDevice.GetResourcesRegistered());
      const root=CjsSchema.from("EveChildContainer", CjsBlackFormat.readPayload(bytes).object),ship=new EveShip2();
      addChild(ship, "effectChildren", root, { listNotify: ship });
      const electric=root.objects.find(child=>child.name==="Electric"),owners=[];
      electric.Traverse(child=>{if(child.particleEmitters?.length)owners.push(child);});
      assert.equal(owners.length,6,file);
      const curveSet=root.curveSets.find(curves=>curves.name==="Electricity");
      const stats=owners.map(owner=>{
        const family=/Emit_(\d+)/.exec(owner.name)[1];
        const curve=curveSet.curves.find(item=>item.name==="electricRate_"+family);
        const row={owner,curve,spawns:new Map(),draws:new Set()};
        for(const emitter of owner.particleEmitters) {
          assert.equal(emitter.maxParticles,-1,"Tr2DynamicEmitter.cpp:109-123: no lifetime emission budget");
          const updateEmitter=emitter.Update.bind(emitter);
          emitter.Update=argumentsValue=>{
            assert.ok(Math.abs(argumentsValue.time-ticks/10_000_000)<1e-12,"the existing JS particle argument boundary receives seconds");
            return updateEmitter(argumentsValue);
          };
          const spawn=emitter.SpawnParticles.bind(emitter);
          emitter.SpawnParticles=(...args)=>{
            const count=spawn(...args),cycle=Math.floor(curve.GetScaledTime(curveSet.scaledTime)/7);
            if(count>0)row.spawns.set(cycle,(row.spawns.get(cycle)??0)+count);
            return count;
          };
        }
        const mesh=owner.mesh,resource=geometries.get(mesh.geometryResPath.split("/").at(-1));
        assert.ok(resource,mesh.geometryResPath);mesh.SetGeometryRes(resource);
        for(const area of mesh.additiveAreas)area.SetMaterial(material);
        return row;
      });
      ship.lodLevel=3;ship.isVisible=true;ship.displayKillCounterValue=0;
      ship.SetControllerVariable("IsWarping",0);ship.SetControllerVariable("KillCount",0);
      ship.StartControllers();ExecuteMainThreadActions();
      const update=new EveUpdateContext();let wasKill=false,killEntries=0;
      for(let step=0;step<=7200;step++) {
        const previousTicks=ticks;
        ticks=1_000_000_000+Math.round(step*10_000_000/60);update.SetTime(ticks);
        assert.equal(update.GetTime(),ticks);
        assert.equal(update.GetDeltaT(),step===0?0:Math.fround((ticks-previousTicks)/10_000_000));
        if(step===60){if(scenario==="warp")ship.SetControllerVariable("IsWarping",1);if(scenario==="kills")ship.displayKillCounterValue=999;}
        ship.UpdateSyncronous(update);ship.UpdateAsyncronous(update);ExecuteMainThreadActions();
        const isKill=root.controllers.some(controller=>controller.stateMachines.some(machine=>machine.currentState?.name==="Kill"));
        if(isKill&&!wasKill)killEntries++;wasKill=isKill;
        for(const row of stats) {
          const cycle=Math.floor(row.curve.GetScaledTime(curveSet.scaledTime)/7),owner=row.owner,system=owner.particleSystems[0];
          if(system.aliveCount===0||row.draws.has(cycle))continue;
          system.UpdateViewDependentData(null,mat4.create());owner._isVisible=true;owner.GetRenderables([]);
          const batches=[];owner.GetBatches({Commit(batch){batches.push(batch);return true;}},TriBatchType.TRIBATCHTYPE_ADDITIVE,null);
          assert.ok(batches.length>0,file+":"+owner.name);
          const before=draws.length;context.RenderBatches({GetBatches:()=>batches});assert.ok(draws.length>before);
          assert.ok(draws.at(-1)[0]>0);assert.equal(draws.at(-1)[1],system.aliveCount);
          row.draws.add(cycle);
        }
      }
      for(const row of stats) {
        if(scenario==="warp") {
          // Tr2CurveScalar.cpp:360-408 cycles authored time; require recurring
          // production emission and submission, not an exact stochastic count.
          for(let cycle=0;cycle<15;cycle++) {
            assert.ok(row.spawns.get(cycle)>0,`${file}:${row.owner.name}: emission cycle ${cycle}`);
            assert.ok(row.draws.has(cycle),`${file}:${row.owner.name}: draw cycle ${cycle}`);
          }
        } else {assert.equal(row.spawns.size,0,scenario);assert.equal(row.draws.size,0,scenario);}
      }
      if(scenario==="kills")assert.ok(killEntries>1,"kill control independently repeats its authored lightning state");
      else assert.equal(killEntries,0,scenario);
      t.diagnostic(JSON.stringify({file,scenario,killEntries,cycles:stats.map(row=>row.draws.size)}));
      for(const resource of TriDevice.GetResourcesRegistered())if(!registered.has(resource)&&(resource.constructor===Tr2ParticleSystem||resource.constructor===Tr2InstancedMesh))resource.Destroy();
    }
  }
});
