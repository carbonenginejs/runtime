import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {blue} from "../../npm/dist/global/blue/index.js";
import {CjsBlackFormat} from "../../npm/dist/resource/formats/black/index.js";
import {Tr2ParticleSystem,Tr2ParticleElementDeclaration,Tr2GpuSharedEmitter,Tr2GpuUniqueEmitter,
  ITr2GenericEmitterUpdateArguments,EveChildContainer,Tr2RenderContext_GetMainThreadRenderContext} from "../../npm/dist/trinity/index.js";
import {Tr2RenderContextALStub} from "../../npm/dist/trinityal/index.js";
import {StubResMan} from "../support/stubResMan.js";
import "../../npm/dist/audio/index.js";

function setup(t)
{
  const context=Tr2RenderContext_GetMainThreadRenderContext(),previous=context.GetRenderContextAL(),manager=blue.resMan;
  const al=new Tr2RenderContextALStub();context.SetRenderContextAL(al);al.CreateDevice();blue.resMan=new StubResMan();
  t.after(()=>{context.SetRenderContextAL(previous);blue.resMan=manager;});
}
function system(t)
{
  const p=new Tr2ParticleSystem();p.maxParticleCount=2;
  for(const type of [1,2])p.elements.push(Object.assign(new Tr2ParticleElementDeclaration(),{elementType:type}));
  p.Initialize();p.SpawnParticle({position:[1,2,3],velocity:[2,4,6]});t.after(()=>p.ReleaseResources());return p;
}
test("during-life generic spawn receives pre-force and post-integration endpoints; stationary branch stays point form",t=>{
  setup(t);const p=system(t),calls=[];
  p.forces.push({Update(){},GetForce(_p,_v,_dt,_m,out){out.set([2,0,-2]);return out;}});
  p.emitParticleDuringLifeEmitter={SpawnParticles(...args){calls.push(args.map(value=>ArrayBuffer.isView(value)?Array.from(value):value));}};
  const args=new ITr2GenericEmitterUpdateArguments();p.UpdateSimulation(0.5,args);
  assert.equal(calls[0].length,6,"Tr2ParticleSystem.cpp:699-706 six-argument generic overload");
  assert.equal(calls[0][0],args);
  assert.deepEqual(calls[0].slice(1),[[1,2,3],[2.5,4,5.5],[2,4,6],[3,4,5],0.5]);
  p.updateSimulation=false;p.UpdateSimulation(0.25,args);
  assert.deepEqual(calls[1].slice(1),[[2.5,4,5.5],[3,4,5],0.25],"cpp:790 stationary/missing-element branch retains point form");
});

for(const Emitter of [Tr2GpuSharedEmitter,Tr2GpuUniqueEmitter])test(`${Emitter===Tr2GpuSharedEmitter?"shared":"unique"} GPU generic segment call preserves distance density and native dt cap`,()=>{
  const e=new Emitter();e.rate=30;e.emissionDensity=2;e.Initialize();
  const args=new ITr2GenericEmitterUpdateArguments(),requests=[];
  args.system={Emit(emitter){requests.push({count:emitter.count,start:Array.from(emitter.positionPrevious),end:Array.from(emitter.position),v0:Array.from(emitter.velocityPrevious),v1:Array.from(emitter.velocity)});}};
  e.SpawnParticles(args,[0,0,0],[3,0,0],[1,0,0],[2,0,0],0.5);
  assert.deepEqual(requests,[{count:8,start:[0,0,0],end:[3,0,0],v0:[1,0,0],v1:[2,0,0]}],"Shared.cpp:189 cap1/15; cpp:204-213 time rate plus segment density");
  requests.length=0;e.SpawnParticles(args,[9,0,0],[2,0,0],0.1);
  assert.deepEqual(requests,[{count:3,start:[9,0,0],end:[9,0,0],v0:[2,0,0],v1:[2,0,0]}],"point overload preserves its existing rate modifier");
});

const corpus=process.env.PARTICLE_BLACK_CORPUS_DIR;
test("real VDS fire during-life smoke reaches GPU Emit with distinct segment endpoints and carry",{
  skip:!corpus&&"set PARTICLE_BLACK_CORPUS_DIR for copied vds_trail_fire_01a.black"
},async t=>{
  setup(t);const bytes=await readFile(join(corpus,"vds_trail_fire_01a.black"));
  assert.equal(createHash("md5").update(bytes).digest("hex"),"bad944852d13145ae96983af73858927");
  const root=CjsSchema.from("EveChildContainer", CjsBlackFormat.readPayload(bytes).object);
  const source=root.objects[0].effect.source;
  const p=source.objects[0].objects[2].objects[1].objects[1].mesh.instanceGeometryResource;
  assert.equal(p.name,"FireMainParticleSystem");const emitter=p.emitParticleDuringLifeEmitter;assert.equal(emitter.name,"postSmoke");
  t.after(()=>p.ReleaseResources());
  let binding;
  function find(node){for(const set of node.curveSets??[])for(const b of set.bindings??[])if(b.destinationObject===emitter&&b.destinationAttribute==="rate")binding=b;for(const child of node.objects??[])find(child);}
  find(source);assert.ok(binding,"authored postSmoke_rate binding");
  binding.sourceObject.input1=1000;binding.sourceObject.UpdateValue(0);binding.CopyValue();
  assert.ok(Math.abs(emitter.rate-5)<1e-5,"real ship-speed curve extrapolates with authored tangent0.005");
  p.ClearParticles();p.SpawnParticle({position:[1,2,3],velocity:[40,5,-7],lifetime:[0,100],sizeDynamic:[1,1],rotation:0,rotationVelocity:[0,0]});
  const args=new ITr2GenericEmitterUpdateArguments(),requests=[];
  args.system={Emit(e){requests.push({count:e.count,start:Array.from(e.positionPrevious),end:Array.from(e.position),v0:Array.from(e.velocityPrevious),v1:Array.from(e.velocity)});}};
  for(let frame=0;frame<30;frame++)p.UpdateSimulation(1/60,args);
  assert.ok(requests.length>=2,"native segment carry emits at a sub-one-particle per-frame rate");
  assert.ok(requests.every(r=>r.count>0&&r.start.some((v,i)=>v!==r.end[i])),"real fire motion spans distinct endpoints");
  assert.ok(requests.every(r=>r.start.every(Number.isFinite)&&r.end.every(Number.isFinite)));
  t.diagnostic(JSON.stringify({file:"vds_trail_fire_01a.black",parent:p.name,emitter:emitter.name,rate:emitter.rate,requests}));
});
