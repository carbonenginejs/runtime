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
  EveChildParticleSystem,EveChildContainer,EveShip2,EveUpdateContext,ExecuteMainThreadActions,
  Tr2RenderContext_GetMainThreadRenderContext} from "../../npm/dist/trinity/index.js";
import {Tr2RenderContextALStub} from "../../npm/dist/trinityal/index.js";
import {SharedGeometryBuffer} from "../../npm/dist/trinity/core/mesh/TriGeometryResAllocations.js";
import {StubResMan} from "../support/stubResMan.js";
import "../../npm/dist/audio/index.js";

function setup(t)
{
  const context=Tr2RenderContext_GetMainThreadRenderContext(),prior=context.GetRenderContextAL(),manager=blue.resMan;
  const al=new Tr2RenderContextALStub();context.SetRenderContextAL(al);al.CreateDevice();al.BeginScene();blue.resMan=new StubResMan();
  context.SetViewTransform(mat4.create());
  t.after(()=>{SharedGeometryBuffer(context).ReleaseResources();context.SetRenderContextAL(prior);blue.resMan=manager;});
  const draws=[],draw=al.DrawIndexedInstanced.bind(al);al.DrawIndexedInstanced=(...args)=>{draws.push(args);return draw(...args);};
  const shader={GetTechniqueIndex:()=>0,GetPassCount:()=>1,GetShaderTypeMask:()=>3,ApplyAllStateForPass(){}};
  const material={GetShaderStateInterface:()=>shader,ApplyMaterialDataForPass(){}};
  return {context,al,draws,material};
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
      child=EveChildParticleSystem.from(values.objects[2].objects[0]);child.particleEmitters[0].UpdateSimulation(4);
    }else{
      const root=EveChildContainer.from(values),ship=new EveShip2();CjsModel.addChild(ship,"effectChildren",root);
      child=root.objects[1].objects[0];ship.lodLevel=3;ship.isVisible=true;ship.StartControllers();
      const update=new EveUpdateContext();
      const zapMax=root.objects[4].objects.map(()=>0);
      const zap=root.objects[4].objects[0];let zapDraw=null;
      const zapBytes=await readFile(join(corpus,"unit_sphere.gr2"));
      assert.equal(createHash("md5").update(zapBytes).digest("hex"),"761a864d18bf591bb5f92308464eb42e");
      const zapGeometry=new TriGeometryRes();zapGeometry.SetPayload(zapGeometry.ReadGrannyFile(zapBytes));zapGeometry.MarkPrepared();zap.mesh.SetGeometryRes(zapGeometry);
      for(const area of zap.mesh.additiveAreas)area.SetMaterial(material);
      for(let step=0;step<=200;step++){
        ticks=(100+step/10)*1e7;update.SetTime(100+step/10);
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
