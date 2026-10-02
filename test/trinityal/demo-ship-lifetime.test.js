import { addChild, removeChild } from "../../npm/dist/global/blue/children.js";
import { Traverse } from "../../npm/dist/global/blue/find.js";
import { GetResources } from "../../npm/dist/global/blue/getResources.js";
import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { blue } from "../../npm/dist/global/blue/index.js";
import { TriGeometryRes } from "../../npm/dist/resource/index.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { TriDevice, EveChildLineSet, Tr2CurveLineSet, EveCurveLineSet, EveCircle, Tr2ParticleSystem, Tr2ParticleElementDeclaration, Tr2InstancedMesh, Tr2DirectInstanceData, Tr2RuntimeInstanceData,
  EveShip2, EveStation2, EveChildParticleSystem, EveSpaceScene, EveMeshOverlayEffect, TriCurveSet, TriValueBinding,
  Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { StubResMan } from "../support/stubResMan.js";
import { hydrateDemoShip, retireDemoShips, replaceDemoShip } from "./webgpu/demo/demoShipLifetime.js";

function setup(t)
{
  const before=new Set(TriDevice.GetResourcesRegistered()),manager=blue.resMan;
  const context=Tr2RenderContext_GetMainThreadRenderContext(),prior=context.GetRenderContextAL();
  const al=new Tr2RenderContextALStub();context.SetRenderContextAL(al);al.CreateDevice();al.BeginScene();
  blue.resMan=new StubResMan();
  t.after(()=>{
    for(const resource of TriDevice.GetResourcesRegistered())if(!before.has(resource)){
      if(resource.constructor===Tr2ParticleSystem||resource.constructor===Tr2InstancedMesh||CjsSchema.cast(resource,EveChildLineSet)||CjsSchema.cast(resource,Tr2CurveLineSet))resource.Destroy();
      else {resource.ReleaseResources();TriDevice.UnregisterResource(resource);}
    }
    context.SetRenderContextAL(prior);blue.resMan=manager;
  });
  return new Set([...before].filter(resource=>resource.constructor===Tr2ParticleSystem||resource.constructor===Tr2InstancedMesh));
}

function makeShip(provider = new Tr2ParticleSystem())
{
  const ship=new EveShip2(),child=new EveChildParticleSystem(),mesh=new Tr2InstancedMesh();
  const geometry=new TriGeometryRes();geometry.MarkPrepared();mesh.SetGeometryRes(geometry);
  mesh.SetInstanceGeometryRes(provider);child.mesh=mesh;child.particleSystems.push(provider);
  addChild(ship, "effectChildren", child, { listNotify: ship });ship.mesh=mesh;
  return {ship,provider,mesh};
}

const namedResources=()=>TriDevice.GetResourcesRegistered().filter(resource=>resource.constructor===Tr2ParticleSystem||resource.constructor===Tr2InstancedMesh);

const values={_type:"EveShip2",effectChildren:[{_type:"EveChildParticleSystem",
  mesh:{_type:"Tr2InstancedMesh"},particleSystems:[{_type:"Tr2ParticleSystem",name:"throw"}]}]};

test("partial hydration and startup failures destroy only new named resources",t=>{
  setup(t);const existing=makeShip(),before=new Set(TriDevice.GetResourcesRegistered());
  const other={PrepareResources(){return true;},ReleaseResources(){},Destroy(){TriDevice.UnregisterResource(this);}};
  const original=Tr2ParticleSystem.prototype.Initialize;
  const mock=t.mock.method(Tr2ParticleSystem.prototype,"Initialize",function(){original.call(this);TriDevice.RegisterResource(other);throw Error("partial hydration");});
  assert.throws(()=>hydrateDemoShip(values),/partial hydration/);mock.mock.restore();
  assert.deepEqual(new Set(TriDevice.GetResourcesRegistered()),new Set([...before,other]));
  const start=t.mock.method(EveShip2.prototype,"StartControllers",()=>{throw Error("startup");});
  assert.throws(()=>hydrateDemoShip(values),/startup/);start.mock.restore();
  assert.deepEqual(new Set(TriDevice.GetResourcesRegistered()),new Set([...before,other]));
  assert.ok(TriDevice.GetResourcesRegistered().includes(existing.provider));
});

test("shared CPU providers survive old and pending ship retirement until the final root",t=>{
  const baseline=setup(t),old=makeShip(),next=makeShip(old.provider),pending=makeShip(old.provider);
  let destroyed=0;const destroy=old.provider.Destroy.bind(old.provider);old.provider.Destroy=()=>{destroyed++;destroy();};
  retireDemoShips([old.ship],[next.ship,pending.ship]);assert.equal(destroyed,0);
  assert.ok(!TriDevice.GetResourcesRegistered().includes(old.mesh));
  retireDemoShips([next.ship],[pending.ship]);assert.equal(destroyed,0);
  retireDemoShips([pending.ship,pending.ship],[]);assert.equal(destroyed,1);
  assert.deepEqual(new Set(namedResources()),baseline);
});

test("mesh-only shared providers survive retained ships and retire exactly once", t => {
  const baseline = setup(t), old = makeShip(), next = makeShip(old.provider), pending = makeShip(old.provider);
  for (const root of [old, next, pending]) root.ship.effectChildren[0].particleSystems.length = 0;
  const destroy = t.mock.method(old.provider, "Destroy");
  retireDemoShips([old.ship], [next.ship, pending.ship]);
  assert.equal(destroy.mock.callCount(), 0);
  assert.equal(old.mesh.instanceGeometryResource, null);
  assert.ok(!TriDevice.GetResourcesRegistered().includes(old.mesh));
  retireDemoShips([next.ship], [pending.ship]);
  assert.equal(destroy.mock.callCount(), 0);
  assert.ok(TriDevice.GetResourcesRegistered().includes(old.provider));
  retireDemoShips([pending.ship, pending.ship], []);
  assert.equal(destroy.mock.callCount(), 1, "collect provider before mesh destruction clears its only edge");
  assert.deepEqual(new Set(namedResources()), baseline);
});

class RetirementProviderBridge
{
  providers = new Map();
}
CjsSchema.define(RetirementProviderBridge, {
  className: "RetirementProviderBridge",
  members: [{ name: "providers", key: "providers", type: { kind: "map", valueType: Tr2ParticleSystem } }]
});

class RetirementBridgeShip extends EveShip2
{
  providerBridge = null;
}
CjsSchema.define(RetirementBridgeShip, {
  className: "RetirementBridgeShip",
  members: [{ name: "providerBridge", key: "providerBridge", type: { kind: "objectRef", className: RetirementProviderBridge } }]
});

test("retained real ship protects a provider through a plain declared Map bridge", t => {
  const baseline = setup(t), old = makeShip(), retained = new RetirementBridgeShip();
  old.ship.effectChildren[0].particleSystems.length = 0;
  retained.providerBridge = new RetirementProviderBridge();
  retained.providerBridge.providers.set("first", old.provider);
  retained.providerBridge.providers.set("shared", old.provider);
  assert.equal(retained.providerBridge.Traverse, undefined);
  const destroy = t.mock.method(old.provider, "Destroy");
  retireDemoShips([old.ship], [retained]);
  assert.equal(destroy.mock.callCount(), 0, "the plain bridge must not stop the retained graph walk");
  assert.ok(TriDevice.GetResourcesRegistered().includes(old.provider));
  assert.ok(!TriDevice.GetResourcesRegistered().includes(old.mesh));
  retireDemoShips([retained, retained], []);
  assert.equal(destroy.mock.callCount(), 1);
  assert.deepEqual(new Set(namedResources()), baseline);
});

test("ship traversal and resource collection visit geometry without retiring the asset", t => {
  const baseline = setup(t), { ship, mesh, provider } = makeShip();
  const geometry = mesh.GetGeometryResource(), visited = [];
  Traverse(ship, value => { visited.push(value); });
  assert.equal(visited.filter(value => value === geometry).length, 1);
  assert.equal(visited.filter(value => value === provider).length, 1);
  const out = ["replaced"];
  assert.equal(GetResources(ship, out), out);
  assert.deepEqual(out, [geometry]);
  const release = t.mock.method(geometry, "ReleaseResources");
  retireDemoShips([ship], []);
  assert.equal(release.mock.callCount(), 0, "visiting resource edges does not transfer asset destruction ownership");
  assert.equal(geometry.IsGood(), true);
  assert.equal(mesh.GetGeometryResource(), null);
  assert.deepEqual(new Set(namedResources()), baseline);
});

test("device reset retains CPU data while final teardown frees it and detaches late completion",t=>{
  setup(t);const {ship,provider,mesh}=makeShip();
  provider.maxParticleCount=4;provider.elements.push(Object.assign(new Tr2ParticleElementDeclaration(),{elementType:1}));
  provider.Initialize();provider.SpawnParticle({position:[1,2,3]});
  const element=provider.GetElement(1),cpu=provider._buffers[0];provider.ReleaseResources();assert.equal(provider.aliveCount,1);assert.equal(provider._buffers[0],cpu);
  assert.ok(TriDevice.GetResourcesRegistered().includes(provider));
  const late=new TriGeometryRes();mesh.SetGeometryRes(late);
  retireDemoShips([ship],[]);assert.equal(provider.aliveCount,0);assert.equal(provider._buffers[0],null);assert.equal(element.buffer,null,"constraints cannot retain retired CPU storage");
  let rebuilt=0;mesh.RebuildCachedData=()=>{rebuilt++;};late.MarkPrepared();assert.equal(rebuilt,0);
  provider.Destroy();mesh.Destroy();assert.ok(!TriDevice.GetResourcesRegistered().includes(mesh));
});

function overlay(t, failAt = 0)
{
  let calls=0;
  t.mock.method(CjsBlackFormat,"read",()=>{
    if(++calls===failAt)throw Error("overlay failed");
    const effect=new EveMeshOverlayEffect();effect.curveSet=new TriCurveSet();
    for(const name of ["old_clip","new_clip"]){const binding=new TriValueBinding();binding.name=name;binding.Initialize=()=>{};effect.curveSet.bindings.push(binding);}
    effect.curveSet.ApplyTime=()=>{for(const binding of effect.curveSet.bindings)binding.destinationObject.clipSphereFactor=0.7;};
    effect.curveSet.GetMaxCurveDuration=()=>3;effect.PlayCurveSet=()=>{};
    return {root:effect};
  });
}

test("repeated successful swaps retire old resources after detaching mutual overlay bindings",async t=>{
  const baseline=setup(t);overlay(t);let current=makeShip();const scene=new EveSpaceScene(),pending=new Set();
  addChild(scene, "objects", current.ship, { listNotify: scene });
  for(let i=0;i<4;i++){
    const next=makeShip(current.provider),old=current;
    await replaceDemoShip({old:old.ship,nextDna:"test",scene,pending,isDisposed:()=>false,
      buildShip:async()=>next.ship,applyBanners(){},resourceBytes:async()=>new Uint8Array(),wait:async()=>{},commit:ship=>{current={...next,ship};}});
    assert.deepEqual(Array.from(scene.objects),[next.ship]);assert.equal(old.ship.overlayEffects.length,0);assert.equal(next.ship.overlayEffects.length,0);
    assert.equal(namedResources().length,baseline.size+2);assert.equal(pending.size,0);
  }
  removeChild(scene, "objects", current.ship, { listNotify: scene });retireDemoShips([current.ship],[]);
  assert.deepEqual(new Set(namedResources()),baseline);
});

for(const boundary of ["build","geometry","bytes","transition","overlay"])
test(`replacement ${boundary} cancellation/failure leaves no new registrations`,async t=>{
  const baseline=setup(t);overlay(t,boundary==="overlay"?2:0);
  const old=makeShip(),next=makeShip(),scene=new EveSpaceScene(),pending=new Set();
  addChild(scene, "objects", old.ship, { listNotify: scene });old.ship.clipSphereFactor=0.25;
  if(boundary==="geometry")next.mesh.SetGeometryRes(new TriGeometryRes());
  let disposed=false,committed=false;
  const dispose=()=>{disposed=true;const roots=[old.ship,...pending];for(const root of roots)removeChild(scene, "objects", root, { listNotify: scene });retireDemoShips(roots,[]);};
  await assert.rejects(replaceDemoShip({old:old.ship,nextDna:"test",scene,pending,isDisposed:()=>disposed,
    buildShip:async()=>{if(boundary==="build")dispose();return next.ship;},applyBanners(){},
    resourceBytes:async()=>{if(boundary==="bytes")dispose();return new Uint8Array();},
    wait:async()=>{if(boundary==="geometry"||boundary==="transition")dispose();},commit:()=>{committed=true;}
  }),/disposed|overlay failed/);
  assert.equal(committed,false);assert.equal(pending.size,0);assert.equal(old.ship.overlayEffects.length,0);assert.equal(next.ship.overlayEffects.length,0);
  if(boundary==="overlay"){
    assert.deepEqual(Array.from(scene.objects),[old.ship]);assert.equal(old.ship.clipSphereFactor,0.25);
    assert.equal(namedResources().length,baseline.size+2);retireDemoShips([old.ship],[]);
  } else assert.equal(scene.objects.length,0);
  assert.deepEqual(new Set(namedResources()),baseline);
});

test("direct instance providers survive shared ship roots and retire with their final owner", t =>
{
  setup(t);
  const provider = new Tr2DirectInstanceData();
  const old = new EveShip2(), next = new EveShip2();
  old.mesh = new Tr2InstancedMesh();
  next.mesh = new Tr2InstancedMesh();
  old.mesh.SetInstanceGeometryRes(provider);
  next.mesh.SetInstanceGeometryRes(provider);
  let destroyed = 0;
  const destroy = provider.Destroy.bind(provider);
  provider.Destroy = () => { destroyed++; destroy(); };
  retireDemoShips([old], [next]);
  assert.equal(destroyed, 0);
  assert.ok(TriDevice.GetResourcesRegistered().includes(provider));
  retireDemoShips([next], []);
  assert.equal(destroyed, 1);
  assert.equal(TriDevice.GetResourcesRegistered().includes(provider), false);
});

test("failed ship startup retires its newly hydrated direct instance providers", t =>
{
  setup(t);
  const existing = new Tr2DirectInstanceData();
  const before = new Set(TriDevice.GetResourcesRegistered());
  t.mock.method(EveShip2.prototype, "StartControllers", () => { throw Error("startup"); });
  assert.throws(() => hydrateDemoShip({
    _type: "EveShip2",
    mesh: { _type: "Tr2InstancedMesh", instanceGeometryResource: { _type: "Tr2DirectInstanceData" } }
  }), /startup/);
  assert.deepEqual(new Set(TriDevice.GetResourcesRegistered()), before);
  assert.ok(TriDevice.GetResourcesRegistered().includes(existing));
});


test("demo hydration selects the declared station root and starts its controllers", t =>
{
  setup(t);
  const values = { _type: "EveStation2", name: "station root" };
  assert.equal(CjsSchema.from("EveShip2", values).constructor, EveStation2, "the schema reader honors the authored concrete root");
  const start = t.mock.method(EveStation2.prototype, "StartControllers", function () {});
  const station = hydrateDemoShip(values);
  assert.equal(station.constructor, EveStation2);
  assert.equal(station.name, "station root");
  assert.equal(start.mock.callCount(), 1);
  retireDemoShips([station], []);
});


test("runtime instance providers retain shared allocations until their final demo owner retires", t => {
  setup(t);
  const baseline=new Set(TriDevice.GetResourcesRegistered());
  const provider=new Tr2RuntimeInstanceData();
  provider.SetElementLayout([{usage:"POSITION",usageIndex:0,type:"FLOAT32_3",name:"position"}]);
  provider.SetData([[[1,2,3]]]);provider.UpdateData();
  const makeRoot=()=>{const ship=new EveShip2();ship.mesh=new Tr2InstancedMesh();ship.mesh.SetInstanceGeometryRes(provider);return ship;};
  const first=makeRoot(),last=makeRoot();
  const destroy=t.mock.method(provider,"Destroy");
  retireDemoShips([first],[last]);
  assert.equal(destroy.mock.callCount(),0);assert.equal(provider.IsInstanceDataReady(),true);
  retireDemoShips([last,last],[]);
  assert.equal(destroy.mock.callCount(),1);assert.equal(provider.IsInstanceDataReady(),false);
  assert.deepEqual(new Set(TriDevice.GetResourcesRegistered()),baseline);
});

test("failed demo startup retires newly hydrated runtime instance buffers", t => {
  setup(t);
  const baseline=new Set(TriDevice.GetResourcesRegistered());
  const destroy=t.mock.method(Tr2RuntimeInstanceData.prototype,"Destroy");
  t.mock.method(EveShip2.prototype,"StartControllers",()=>{throw Error("runtime instance startup failure");});
  assert.throws(()=>hydrateDemoShip({_type:"EveShip2",mesh:{_type:"Tr2InstancedMesh",
    instanceGeometryResource:{_type:"Tr2RuntimeInstanceData",layout:[{usage:"POSITION",usageIndex:0,type:"FLOAT32_3",name:"position"}],rows:[[[1,2,3]]]}
  }}),/runtime instance startup failure/);
  assert.equal(destroy.mock.callCount(),1);
  assert.deepEqual(new Set(TriDevice.GetResourcesRegistered()),baseline);
});

test("child and curve line resources retire once, retaining shared defaults and assigned sets",t=>{
  setup(t);
  for(const assigned of [false,true]) {
    const old=new EveShip2(),next=new EveShip2(),child=new EveChildLineSet(),other=new EveChildLineSet();
    if(assigned) child.lineSet=new EveCurveLineSet();
    const path=new EveCircle();path.numSegments=4;child.lines=[path];child.Initialize();child.OnPrepareResources();
    const shared=child.lineSet;other.lineSet=shared;other.Initialize();
    addChild(old,"effectChildren",child,{listNotify:old});addChild(next,"effectChildren",other,{listNotify:next});
    const destroy=t.mock.method(shared,"Destroy");
    assert.equal(shared._vertexBuffer.IsValid(),true);assert.equal(child._vertexBuffer.IsValid(),true);
    retireDemoShips([old,old],[next]);
    assert.equal(destroy.mock.callCount(),0);assert.equal(child._vertexBuffer.IsValid(),false);
    assert.equal(TriDevice.GetResourcesRegistered().includes(child),false);assert.equal(shared._vertexBuffer.IsValid(),true);
    assert.equal(TriDevice.GetResourcesRegistered().includes(shared),true);
    retireDemoShips([next,next],[]);assert.equal(destroy.mock.callCount(),1);
    assert.equal(shared._vertexBuffer.IsValid(),false);assert.equal(TriDevice.GetResourcesRegistered().includes(shared),false);
  }
  const first=new EveShip2(),last=new EveShip2(),a=new EveChildLineSet(),b=new EveChildLineSet();
  const shared=a.lineSet;b.lineSet=shared;b.Initialize();
  addChild(first,"effectChildren",a,{listNotify:first});addChild(last,"effectChildren",b,{listNotify:last});
  a.lineSet=new EveCurveLineSet();a.Initialize();
  assert.equal(TriDevice.GetResourcesRegistered().includes(shared),true,"replacement cannot destroy another child's default");
  const sharedDestroy=t.mock.method(shared,"Destroy");
  retireDemoShips([first],[last]);assert.equal(sharedDestroy.mock.callCount(),0);
  retireDemoShips([last],[]);assert.equal(sharedDestroy.mock.callCount(),1);
  const root=new EveShip2(),child=new EveChildLineSet();addChild(root,"effectChildren",child,{listNotify:root});
  const destroy=t.mock.method(child.lineSet,"Destroy");retireDemoShips([root,root],[]);assert.equal(destroy.mock.callCount(),1);
});

test("failed child-line hydration and startup retire both constructor and authored line resources",t=>{
  setup(t);const before=new Set(TriDevice.GetResourcesRegistered());
  const values={_type:"EveShip2",effectChildren:[{_type:"EveChildLineSet",lineSet:{_type:"EveCurveLineSet"},lines:[{_type:"EveCircle",numSegments:4}]}]};
  const initialize=EveChildLineSet.prototype.Initialize;
  const mock=t.mock.method(EveChildLineSet.prototype,"Initialize",function(){
    const result=initialize.call(this);if(this.lines.length)throw Error("partial child line hydration");return result;
  });
  assert.throws(()=>hydrateDemoShip(values),/partial child line hydration/);mock.mock.restore();
  assert.deepEqual(new Set(TriDevice.GetResourcesRegistered()),before);
  const start=t.mock.method(EveShip2.prototype,"StartControllers",()=>{throw Error("child line startup");});
  assert.throws(()=>hydrateDemoShip(values),/child line startup/);start.mock.restore();
  assert.deepEqual(new Set(TriDevice.GetResourcesRegistered()),before);
});
