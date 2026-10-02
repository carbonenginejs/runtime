import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { CjsModel } from "../../npm/dist/global/model/index.js";
import { blue } from "../../npm/dist/global/blue/index.js";
import { TriGeometryRes } from "../../npm/dist/resource/index.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { TriDevice, Tr2ParticleSystem, Tr2ParticleElementDeclaration, Tr2InstancedMesh, Tr2DirectInstanceData,
  EveShip2, EveChildParticleSystem, EveSpaceScene, EveMeshOverlayEffect, TriCurveSet, TriValueBinding,
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
      if(resource.constructor===Tr2ParticleSystem||resource.constructor===Tr2InstancedMesh)resource.Destroy();
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
  CjsModel.addChild(ship,"effectChildren",child);ship.mesh=mesh;
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
  ship.Traverse(value => { visited.push(value); });
  assert.equal(visited.filter(value => value === geometry).length, 1);
  assert.equal(visited.filter(value => value === provider).length, 1);
  const out = ["replaced"];
  assert.equal(ship.GetResources(out), out);
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
  CjsModel.addChild(scene,"objects",current.ship);
  for(let i=0;i<4;i++){
    const next=makeShip(current.provider),old=current;
    await replaceDemoShip({old:old.ship,nextDna:"test",scene,pending,isDisposed:()=>false,
      buildShip:async()=>next.ship,applyBanners(){},resourceBytes:async()=>new Uint8Array(),wait:async()=>{},commit:ship=>{current={...next,ship};}});
    assert.deepEqual(scene.objects,[next.ship]);assert.equal(old.ship.overlayEffects.length,0);assert.equal(next.ship.overlayEffects.length,0);
    assert.equal(namedResources().length,baseline.size+2);assert.equal(pending.size,0);
  }
  CjsModel.removeChild(scene,"objects",current.ship);retireDemoShips([current.ship],[]);
  assert.deepEqual(new Set(namedResources()),baseline);
});

for(const boundary of ["build","geometry","bytes","transition","overlay"])
test(`replacement ${boundary} cancellation/failure leaves no new registrations`,async t=>{
  const baseline=setup(t);overlay(t,boundary==="overlay"?2:0);
  const old=makeShip(),next=makeShip(),scene=new EveSpaceScene(),pending=new Set();
  CjsModel.addChild(scene,"objects",old.ship);old.ship.clipSphereFactor=0.25;
  if(boundary==="geometry")next.mesh.SetGeometryRes(new TriGeometryRes());
  let disposed=false,committed=false;
  const dispose=()=>{disposed=true;const roots=[old.ship,...pending];for(const root of roots)CjsModel.removeChild(scene,"objects",root);retireDemoShips(roots,[]);};
  await assert.rejects(replaceDemoShip({old:old.ship,nextDna:"test",scene,pending,isDisposed:()=>disposed,
    buildShip:async()=>{if(boundary==="build")dispose();return next.ship;},applyBanners(){},
    resourceBytes:async()=>{if(boundary==="bytes")dispose();return new Uint8Array();},
    wait:async()=>{if(boundary==="geometry"||boundary==="transition")dispose();},commit:()=>{committed=true;}
  }),/disposed|overlay failed/);
  assert.equal(committed,false);assert.equal(pending.size,0);assert.equal(old.ship.overlayEffects.length,0);assert.equal(next.ship.overlayEffects.length,0);
  if(boundary==="overlay"){
    assert.deepEqual(scene.objects,[old.ship]);assert.equal(old.ship.clipSphereFactor,0.25);
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
