// Synthetic child callers load an unmodified published FX. The real turret
// set uses its native caller-owned SetFiringEffect API; no automatic set load.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { blue, CjsResMan } from "../../npm/dist/global/blue/index.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { CjsModel } from "../../npm/dist/global/model/index.js";
import { EveChildTurret, EveTurretSet, EveTurretFiringFX, EveStretch3, EveLocalPositionCurve, EveUpdateContext, EveComponentRegistry, EveComponentType, TriFrustum, Tr2ControllerEventHandler, Tr2ActionSetValue, Tr2DynamicBinding } from "../../npm/dist/trinity/index.js";
import "../../npm/dist/audio/index.js"; // The published FX owns AudEventCurve/AudEmitter objects.
import { StubResMan } from "../support/stubResMan.js";
import { Tr2QuadRenderer } from "../../npm/dist/trinity/core/Tr2QuadRenderer/Tr2QuadRenderer.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
const corpus=process.env.TURRET_BLACK_CORPUS_DIR;
const skip=!corpus && "set TURRET_BLACK_CORPUS_DIR for the real pulse turret proof";
const fxPath="res:/dx9/model/turret/energy/pulse/l/pulse_mega_fx.red";
async function fixture(name,size,sha)
{
  const bytes=await readFile(join(corpus,name));
  assert.equal(bytes.length,size);
  assert.equal(createHash("sha256").update(bytes).digest("hex"),sha);
  return bytes;
}
test("synthetic child turrets load separate real pulse FX graphs; real set accepts the same FX root type", {skip}, async t =>
{
  const fx=await fixture("pulse_mega_fx.black",2483,"ec84e9ee2b9d9af295dff3ad7ad79551e8785027fd30a5121d4d92eaa31a1eb2");
  const turretBytes=await fixture("pulse_mega_t1.black",2290,"dc7be4c9cf75bd167b36f807837488ef04cab90a8c5479f86bbd7e34ae65fdd9");
  const previous=blue.resMan; let reads=0;
  const manager=new CjsResMan({source:{Read(path){assert.equal(path,fxPath);reads++;return fx;}}});
  manager.RegisterObjectBuilder("red",bytes=>CjsBlackFormat.createObjectBuilder(bytes));
  const handles=new StubResMan(); manager.GetResource=handles.GetResource.bind(handles);
  blue.resMan=manager; t.after(()=>{blue.resMan=previous;});
  const children=[new EveChildTurret(),new EveChildTurret()];
  for(const child of children){child.firingEffectResPath=fxPath;child.Initialize();}
  for(let i=0;i<100 && children.some(child=>child._pendingFiringEffectCalls);i++)
  {
    manager.PumpMainThreadQueue(); await new Promise(resolve=>setImmediate(resolve));
  }
  assert.equal(reads,1,"CjsResMan shares cached bytes");
  for(const child of children)
  {
    const effect=child.GetFiringEffect();
    assert.ok(effect,"EveChildTurret.cpp:56 directly loads its firing module");
    assert.equal(CjsSchema.getClassName(effect.constructor),"EveTurretFiringFX");
    assert.equal(effect.stretch.length,1);
    assert.equal(CjsSchema.getClassName(effect.stretch[0].constructor),"EveStretch2");
    assert.equal(effect.GetFiringDuration(),Math.fround(1.45));
  }
  assert.notEqual(children[0].firingEffect,children[1].firingEffect);
  assert.notEqual(children[0].firingEffect.stretch[0],children[1].firingEffect.stretch[0]);
  const set=CjsSchema.from("EveTurretSet", CjsBlackFormat.readPayload(turretBytes).object);
  assert.equal(set.firingEffect,null,"native set loading is caller-owned");
  set.SetFiringEffect(children[0].firingEffect);
  assert.equal(set.firingEffect,children[0].firingEffect,"SetFiringEffect takes the FX root, not its stretch child");
  const effect=set.firingEffect;
  effect.PrepareFiring(0);
  const context=new EveUpdateContext();
  context.SetTime((0.9) * 10_000_000);context.SetTime((1) * 10_000_000);
  assert.equal(effect.UpdateAsynchronous(context),false);
  assert.equal(effect.ReadyToFire(),true);
  assert.equal(effect.UpdateAsynchronous(context),true,"real pulse FX starts after Carbon's one-frame delay");
  assert.equal(children[1].firingEffect.isFiring,false,"instances do not share firing state");
});

const fixtureResourceManagers=new WeakMap();
function useFixtureResources(t)
{
  if (fixtureResourceManagers.has(t)) return fixtureResourceManagers.get(t);
  const previous=blue.resMan, manager=new StubResMan();
  fixtureResourceManagers.set(t,manager);blue.resMan=manager;
  t.after(()=>{blue.resMan=previous;fixtureResourceManagers.delete(t);});
  return manager;
}

async function realPulse(t)
{
  const bytes=await fixture("pulse_mega_fx.black",2483,"ec84e9ee2b9d9af295dff3ad7ad79551e8785027fd30a5121d4d92eaa31a1eb2");
  useFixtureResources(t);
  return CjsSchema.from("EveTurretFiringFX", CjsBlackFormat.readPayload(bytes).object);
}

async function realBreacher(t)
{
  const bytes=await readFile(process.env.TURRET_CONTROLLER_FX_FILE);
  assert.equal(bytes.length,5470);
  assert.equal(createHash("sha256").update(bytes).digest("hex"),"706005c7b2ad7026a3ce933c4578db4e11cf4461bd95c196b87eb5e4d72da282");
  useFixtureResources(t);
  return CjsSchema.from("EveTurretFiringFX", CjsBlackFormat.readPayload(bytes).object);
}

function quadView()
{
  const frustum=new TriFrustum();
  frustum.DeriveFrustum(mat4.lookAt(mat4.create(),[0,0,0],[0,0,-1],[0,1,0]),[0,0,0],
    mat4.perspective(mat4.create(),Math.PI/2,1,0.1,100000),{width:1024,height:1024});
  const context=new EveUpdateContext();context.SetFrustum(frustum);context.SetTime((10) * 10_000_000);
  context.lodFactor=1;context.invLodFactor=1;
  return {context,frustum};
}

test("real Breacher quad reaches the CPU renderer through displayed Stretch3", {
  skip:!process.env.TURRET_CONTROLLER_FX_FILE && "set TURRET_CONTROLLER_FX_FILE for the real Breacher quad"
}, async t=>
{
  const stretch=(await realBreacher(t)).stretch[0], quad=stretch.sourceObject.objects[1];
  assert.equal(CjsSchema.getClassName(quad.constructor),"EveChildQuad");
  assert.equal(quad.name,"FlareQuad_01");
  assert.equal(quad.brightness,0,"authored zero brightness is not a submission gate");
  const renderer=new Tr2QuadRenderer(),{context,frustum}=quadView();
  stretch.RegisterWithQuadRenderer(renderer);
  const records=[...renderer.GetEffectRecords().values()];
  assert.equal(records.length,1);
  const record=records[0];
  assert.equal(record.effect,quad.effect);assert.equal(record.instanceSize,108);assert.equal(record.quadCount,1);
  stretch.AddQuadsToQuadRenderer(frustum,renderer);
  assert.equal(record.addedSize,0,"registration does not bypass child readiness");
  stretch.SetFiringTransform([0,0,-50],[0,0,-60]);
  stretch.UpdateAsynchronous(context);
  stretch.UpdateVisibility(context,mat4.create());
  stretch.update=false;
  const paused=new Tr2QuadRenderer();
  stretch.RegisterWithQuadRenderer(paused);
  assert.equal([...paused.GetEffectRecords().values()][0].effect,quad.effect,"update=false does not gate registration");
  stretch.AddQuadsToQuadRenderer(frustum,renderer);
  assert.equal(record.pending.length,1);assert.equal(record.addedSize,108);
  stretch.display=false;
  const hidden=new Tr2QuadRenderer();
  stretch.RegisterWithQuadRenderer(hidden);
  stretch.AddQuadsToQuadRenderer(frustum,renderer);
  assert.equal(hidden.GetEffectRecords().size,0);assert.equal(record.addedSize,108);
  stretch.display=true;
  quad.display=false;
  stretch.UpdateVisibility(context,mat4.create());
  stretch.AddQuadsToQuadRenderer(frustum,renderer);
  assert.equal(record.addedSize,108,"real child applies its own visibility gate");
});

test("labelled four-role Breacher composition forwards quad owners in native component order", {
  skip:!process.env.TURRET_CONTROLLER_FX_FILE && "set TURRET_CONTROLLER_FX_FILE for the real Breacher quad"
}, async t=>
{
  const stretch=(await realBreacher(t)).stretch[0], roles=["source","dest","stretch","move"];
  // Only source is authored. Other roles reuse independently hydrated real containers.
  for(const role of roles.slice(1)) stretch[`${role}Object`]=(await realBreacher(t)).stretch[0].sourceObject;
  const calls=[],renderer=new Tr2QuadRenderer(),{frustum}=quadView();
  for(const role of roles)
  {
    const component=stretch[`${role}Object`];
    for(const method of ["RegisterWithQuadRenderer","AddQuadsToQuadRenderer"])
    {
      const original=component[method];
      t.mock.method(component,method,function(...args)
      {
        calls.push({role,method,receiver:this,args});
        return original.apply(this,args);
      });
    }
  }
  function forward(expected)
  {
    calls.length=0;
    stretch.RegisterWithQuadRenderer(renderer);stretch.AddQuadsToQuadRenderer(frustum,renderer);
    assert.deepEqual(calls.map(call=>[call.method,call.role]),[
      ...expected.map(role=>["RegisterWithQuadRenderer",role]),...expected.map(role=>["AddQuadsToQuadRenderer",role])
    ]);
    for(const call of calls)
    {
      assert.equal(call.receiver,stretch[`${call.role}Object`]);
      const expectedArguments=call.method==="RegisterWithQuadRenderer"?[renderer]:[frustum,renderer];
      assert.equal(call.args.length,expectedArguments.length);
      expectedArguments.forEach((argument,index)=>assert.equal(call.args[index],argument));
    }
  }
  forward(roles);
  stretch.destObject=null;stretch.moveObject=null;
  forward(["source","stretch"]);
  stretch.sourceObject=null;stretch.stretchObject=null;
  forward([]);
});

test("real pulse FX registers lights on firing transitions and live list edits", {skip}, async t =>
{
  const effect=await realPulse(t), donor=await realPulse(t);
  const original=effect.stretch[0], added=donor.stretch[0];
  const registry=new EveComponentRegistry();
  t.after(()=>registry.Clear());
  effect.Register(registry);
  assert.ok(original.GetComponentRegistry()===null,"expected component registry membership");
  effect.PrepareFiring(0);
  assert.ok(original.GetComponentRegistry()===registry,"expected component registry membership");
  assert.deepEqual(registry.GetComponents(EveComponentType.LightOwner),[original]);
  assert.equal(effect._perMuzzleData[0].started,false,"registration precedes the muzzle's first update");
  assert.equal(CjsModel.removeChild(donor,"stretch",added),true);
  CjsModel.addChild(effect,"stretch",added);
  assert.ok(added.GetComponentRegistry()===registry,"expected component registry membership");
  assert.deepEqual(new Set(registry.GetComponents(EveComponentType.LightOwner)),new Set([original,added]));
  assert.equal(CjsModel.removeChild(effect,"stretch",added),true);
  assert.ok(added.GetComponentRegistry()===null,"expected component registry membership");
  assert.equal(CjsModel.removeChild(effect,"stretch",added),false);
  effect.SetValues({display:false});
  assert.ok(original.GetComponentRegistry()===null,"expected component registry membership");
  CjsModel.addChild(effect,"stretch",added);
  assert.ok(added.GetComponentRegistry()===null,"hidden insertion stays unregistered");
  effect.SetValues({display:true});
  assert.ok(added.GetComponentRegistry()===registry,"expected component registry membership");
  effect.StopFiring();
  assert.ok(original.GetComponentRegistry()===null,"expected component registry membership");
  assert.ok(added.GetComponentRegistry()===null,"expected component registry membership");
  assert.deepEqual(registry.GetComponents(EveComponentType.LightOwner),[]);
  effect.PrepareFiringEffectMoveObjects();
  assert.ok(original.GetComponentRegistry()===registry,"expected component registry membership");
  effect.UnRegister(registry);
  assert.deepEqual(registry.registeredEntities,[]);
});

test("real pulse cleanup stops a started muzzle and creates a fresh context on every call", {skip}, async t =>
{
  const effect=await realPulse(t), phases=[];
  const firingContext=new EveUpdateContext();
  firingContext.SetTime((1) * 10_000_000);firingContext.SetTime((1.1) * 10_000_000);
  effect.PrepareFiring(0);
  assert.equal(effect.UpdateAsynchronous(firingContext),false);
  assert.equal(effect.UpdateAsynchronous(firingContext),true);
  assert.equal(effect.isFiring,true);
  assert.equal(effect._perMuzzleData[0].started,true,"the real muzzle has started before cleanup");
  const child=effect.stretch[0];
  assert.equal(child.start,null);assert.equal(child.end,null);
  assert.ok(child.loop,"the pulse asset authors a loop curve set, with no start/end sets");
  assert.equal(child.loop.IsPlaying(),true,"the real authored child loop is playing before cleanup");
  const childStop=t.mock.method(child,"StopFiring"); // Call through to the real child and curve set.
  for (const method of ["StopFiring","UpdateAsynchronous","UpdateSynchronous"])
  {
    const original=effect[method];
    t.mock.method(effect,method,function(context)
    {
      const phase={method,context,wasFiring:this.isFiring,muzzleWasStarted:this._perMuzzleData[0].started};
      phases.push(phase);
      const result=original.call(this,context);
      phase.isFiring=this.isFiring;phase.muzzleStarted=this._perMuzzleData[0].started;
      return result;
    });
  }
  let frameTicks=25000000;
  t.mock.method(blue.os,"GetCurrentFrameTime",()=>frameTicks);
  effect.CleanUp();
  assert.deepEqual(phases.map(phase=>phase.method),["StopFiring","UpdateAsynchronous","UpdateSynchronous"]);
  assert.equal(phases[0].wasFiring,true);assert.equal(phases[0].muzzleWasStarted,true);
  assert.equal(phases[0].isFiring,false);assert.equal(phases[0].muzzleStarted,false);
  assert.equal(childStop.mock.callCount(),1,"cleanup forwards the stop to the real loaded child");
  assert.equal(child.loop.IsPlaying(),false,"the real child stop halts its authored loop");
  assert.equal(phases[1].wasFiring,false);assert.equal(phases[1].muzzleWasStarted,false);
  const context=phases[1].context;
  assert.notEqual(context,firingContext);
  assert.equal(phases[2].context,context);
  assert.equal(CjsSchema.getClassName(context.constructor),"EveUpdateContext");
  assert.equal(context.GetTime(),25_000_000,"cleanup preserves the raw Blue tick timestamp");
  assert.equal(context.GetDeltaT(),0);
  assert.equal(context.lodFactor,1);assert.equal(context.invLodFactor,1);
  assert.equal(effect.isFiring,false);
  assert.equal(effect._perMuzzleData[0].started,false);
  frameTicks=50000000;
  effect.CleanUp();
  assert.deepEqual(phases.slice(3).map(phase=>phase.method),["StopFiring","UpdateAsynchronous","UpdateSynchronous"]);
  const nextContext=phases[4].context;
  assert.notEqual(nextContext,context,"each cleanup call constructs its own context");
  assert.equal(phases[5].context,nextContext);
  assert.equal(CjsSchema.getClassName(nextContext.constructor),"EveUpdateContext");
  assert.equal(nextContext.GetTime(),50_000_000,"the next cleanup also preserves raw Blue ticks");
  assert.equal(nextContext.GetDeltaT(),0);
  assert.equal(nextContext.lodFactor,1);assert.equal(nextContext.invLodFactor,1);
  assert.equal(effect.isFiring,false);assert.equal(effect._perMuzzleData[0].started,false);
  assert.equal(childStop.mock.callCount(),1,"already-stopped FX does not issue another child stop");
  assert.equal(child.loop.IsPlaying(),false);
});

test("real pulse target scaling and impact switches reach its authored audio emitter", {skip}, async t =>
{
  const effect=await realPulse(t), emitter=effect.destinationObserver.GetObserver();
  assert.equal(CjsSchema.getClassName(emitter.constructor),"AudEmitter");
  const attenuation=t.mock.method(emitter,"SetAttenuationScalingFactor");
  effect.scaleEffectTarget=true;effect.minRadius=100;effect.maxRadius=100;
  effect.minScale=1;effect.maxScale=10;
  effect.SetScaleByRadius(150);
  assert.equal(effect.stretch[0]._destinationScale,10,"native division then clamp retains the upper limit when the radius range is zero");
  assert.equal(attenuation.mock.callCount(),1);
  assert.deepEqual(attenuation.mock.calls[0].arguments,[150]);
  effect.SetImpactConfiguration(EveTurretFiringFX.ImpactConfiguration.IMPACT_ARMOR);
  assert.equal(emitter.GetSwitches().get("Impact_On"),"Armor");
  effect.SetImpactConfiguration(EveTurretFiringFX.ImpactConfiguration.IMPACT_HULL);
  assert.equal(emitter.GetSwitches().get("Impact_On"),"Hull");
  effect.SetImpactConfiguration(EveTurretFiringFX.ImpactConfiguration.IMPACT_INVALID);
  assert.equal(emitter.GetSwitches().get("Impact_On"),"Shield");
});

test("controlled composition of two real pulse elements preserves merge gates and the duration boundary", {skip}, async t =>
{
  const effect=await realPulse(t), donor=await realPulse(t);
  // The asset has one element; this explicitly composed pair is not an authored multi-muzzle asset.
  const second=donor.stretch[0];
  CjsModel.removeChild(donor,"stretch",second);CjsModel.addChild(effect,"stretch",second);
  const context=new EveUpdateContext(), frustum=new TriFrustum();
  frustum.viewPos.set([0,0,10000]);frustum.fov=1;context.SetFrustum(frustum);
  effect.PrepareFiring(0);
  effect.StartMuzzleEffect(0);effect.StartMuzzleEffect(1);
  effect.SetMuzzleBoneID(0,3);
  effect.useMuzzleTransform=false;
  effect.UpdateVisibility(context);
  assert.deepEqual(effect.stretch.map(stretch=>stretch._intensity),[2,0],"a bone ID alone does not suppress merging");
  effect.stretch[0].SetIntensity(0.75);second.SetIntensity(0.75);
  effect.useMuzzleTransform=true;
  effect.UpdateVisibility(context);
  assert.deepEqual(effect.stretch.map(stretch=>stretch._intensity),[0.75,0.75],"bone-directed firing suppresses intensity changes");
  effect.useMuzzleTransform=false;
  const visibility=t.mock.method(second,"UpdateVisibility");
  effect._perMuzzleData[1].elapsedTime=effect.firingDuration;
  effect.UpdateVisibility(context);
  assert.equal(visibility.mock.callCount(),1,"exact-duration element still gets visibility");
  assert.deepEqual(effect.stretch.map(stretch=>stretch._intensity),[0.75,0.75],"exact-duration element is excluded from the merge count");
});

// Carbon EveTurretFiringFX.cpp:793-813,850-858 queries controller ownership;
// EveStretch2 is a legitimate firing element without that interface.
for (const [method, args] of [
  ["SetControllerVariable", ["IsFiring", 1]],
  ["HandleControllerEvent", ["Firing"]],
  ["StartControllers", []]
])
{
  test(`real pulse FX ${method} skips its non-controller Stretch2`, {skip}, async t =>
  {
    const bytes=await fixture("pulse_mega_fx.black",2483,"ec84e9ee2b9d9af295dff3ad7ad79551e8785027fd30a5121d4d92eaa31a1eb2");
    const previous=blue.resMan;blue.resMan=new StubResMan();t.after(()=>{blue.resMan=previous;});
    const effect=CjsSchema.from("EveTurretFiringFX", CjsBlackFormat.readPayload(bytes).object);
    assert.equal(CjsSchema.getClassName(effect.stretch[0].constructor),"EveStretch2");
    assert.doesNotThrow(()=>effect[method](...args));
    assert.equal(method in effect.stretch[0],false,"do not invent controller methods on the authored Stretch2");
  });
}

const controllerFX=process.env.TURRET_CONTROLLER_FX_FILE;
const skipController=!controllerFX && "set TURRET_CONTROLLER_FX_FILE to the indexed breacherheavy_fx.black";

test("real Breacher hydration keeps stored/live child declarations separate", {skip:skipController}, async t =>
{
  for (const role of ["sourceObject","destObject","stretchObject","moveObject"])
  {
    const schema=CjsSchema.getSchema(EveStretch3);
    const members=schema.members.filter(field=>field.name===role), properties=schema.properties.filter(field=>field.name===role);
    assert.equal(members.length,1);assert.equal(properties.length,1);
    assert.equal(members[0].key,`_${role}`);
    assert.deepEqual(members[0].edit,{persist:true,persistOnly:true,hidden:true});
    assert.deepEqual(properties[0].edit,{read:true,write:true});
    assert.deepEqual(members[0].type,{kind:"objectRef",className:"EveSpaceObjectChild"});
    assert.deepEqual(properties[0].type,members[0].type);
  }
  const setter=t.mock.method(EveStretch3.prototype,"SetSourceObject",()=>assert.fail("persistence must write the backing member"));
  const effect=await realBreacher(t), stretch=effect.stretch[0];
  assert.equal(setter.mock.callCount(),0);
  assert.equal(stretch.sourceObject,stretch._sourceObject);
  assert.equal(CjsSchema.getClassName(stretch.sourceObject.constructor),"EveChildContainer");
  assert.equal(stretch.controllers[0].GetOwner(),stretch,"initialization sees the populated backing storage");
});

for (const role of ["source","dest","stretch","move"])
{
  test(`controlled ${role} placement of real Breacher children transfers live registration`, {skip:skipController}, async t =>
  {
    const effect=await realBreacher(t), donor=await realBreacher(t), stretch=effect.stretch[0];
    const original=stretch.sourceObject,replacement=donor.stretch[0].sourceObject;
    // Only sourceObject is authored. Other roles deliberately reuse an independently hydrated real child.
    if (role!=="source") { stretch.sourceObject=null;stretch[`${role}Object`]=original; }
    const registry=new EveComponentRegistry();t.after(()=>registry.Clear());
    effect.Register(registry);effect.PrepareFiring(0);
    assert.ok(original.GetComponentRegistry()===registry,"expected component registry membership");
    assert.ok(registry.GetComponents(EveComponentType.LightOwner).includes(original));
    stretch[`${role}Object`]=replacement;
    assert.ok(original.GetComponentRegistry()===null,"expected component registry membership");
    assert.ok(replacement.GetComponentRegistry()===registry,"expected component registry membership");
    assert.ok(registry.GetComponents(EveComponentType.LightOwner).includes(replacement));
    if (role==="stretch") assert.equal(CjsSchema.getClassName(stretch._stretchModifier.constructor),"EveChildModifierStretch");
    stretch.SetValues({display:false});
    assert.ok(replacement.GetComponentRegistry()===null,"expected component registry membership");
    stretch[`${role}Object`]=original;
    assert.ok(original.GetComponentRegistry()===registry,"native live setters do not test display");
    stretch.SetValues({display:true});
    assert.ok(original.GetComponentRegistry()===registry,"expected component registry membership");
    stretch[`${role}Object`]=null;
    assert.ok(original.GetComponentRegistry()===null,"expected component registry membership");
    if (role==="stretch") assert.equal(stretch._stretchModifier,null);
    effect.UnRegister(registry);
    assert.deepEqual(registry.registeredEntities,[]);
  });
}

test("real Breacher controller list removal and insertion unlink and relink ownership", {skip:skipController}, async t =>
{
  const stretch=(await realBreacher(t)).stretch[0], controller=stretch.controllers[0];
  assert.equal(CjsModel.removeChild(stretch,"controllers",controller),true);
  assert.ok(controller.GetOwner()===null,"removed controller clears its owner");
  assert.equal(controller.IsLinked(),false);
  CjsModel.addChild(stretch,"controllers",controller);
  assert.equal(controller.GetOwner(),stretch);
  assert.equal(controller.IsLinked(),true);
});

test("controlled dynamic binding on real Breacher roots follows native list ownership", {skip:skipController}, async t =>
{
  const stretch=(await realBreacher(t)).stretch[0], binding=new Tr2DynamicBinding();
  // Breacher authors TriValueBindings inside its curve set, not a dynamic binding list.
  binding.sourceObjectPath="Owner";binding.sourceObjectAttribute="display";
  binding.destinationObjectPath="SourceObject";binding.destinationObjectAttribute="display";
  CjsModel.addChild(stretch,"dynamicBindings",binding);
  assert.equal(binding.isSourceValid,true);assert.equal(binding.isDestinationValid,true);
  stretch.display=false;assert.equal(binding.Update(1),true);
  assert.equal(stretch.sourceObject.display,false);
  CjsModel.removeChild(stretch,"dynamicBindings",binding);
  assert.equal(binding.Link(),false,"removed binding no longer resolves through the stretch owner");
});

test("controlled destination changes on real Breacher maintain its native stretch modifier", {skip:skipController}, async t =>
{
  const stretch=(await realBreacher(t)).stretch[0], destination=new EveLocalPositionCurve();
  // This curve is an explicit augmentation; the Breacher asset authors no endpoint curves.
  stretch.SetValues({dest:destination});
  assert.equal(stretch._stretchModifier.dest,destination);
  stretch.SetValues({dest:null});
  assert.equal(stretch._stretchModifier,null);
  stretch.stretchObject=stretch.sourceObject;
  assert.equal(CjsSchema.getClassName(stretch._stretchModifier.constructor),"EveChildModifierStretch");
  stretch.dest=destination;stretch.Initialize();
  assert.equal(stretch._stretchModifier.dest,destination);
});

test("controlled persisted stretch-child placement initializes a modifier on the real Breacher graph", {skip:skipController}, async t =>
{
  await realBreacher(t); // Validate fixture identity and install this test's inert resource manager.
  const payload=CjsBlackFormat.readPayload(await readFile(controllerFX)).object;
  // The real authored child is moved to the stretch role before hydration.
  payload.stretch[0].stretchObject=payload.stretch[0].sourceObject;
  payload.stretch[0].sourceObject=null;
  const setter=t.mock.method(EveStretch3.prototype,"SetStretchObject",()=>assert.fail("stored hydration bypasses live replacement"));
  const effect=CjsSchema.from("EveTurretFiringFX", payload),stretch=effect.stretch[0];
  assert.equal(setter.mock.callCount(),0);
  assert.equal(stretch.sourceObject,null);
  assert.equal(CjsSchema.getClassName(stretch.stretchObject.constructor),"EveChildContainer");
  assert.ok(stretch._stretchModifier,"Initialize creates the modifier after persisted storage is populated");
  assert.equal(CjsSchema.getClassName(stretch._stretchModifier.constructor),"EveChildModifierStretch");
});

// Independent scalar transcription of Carbon's -Z arc, then its row-vector
// rotation matrix represented in column-major JS storage (TriMath.cpp:341-355).
function nativeArcMatrix(source,destination)
{
  const direction=source.map((value,index)=>value-destination[index]);
  const length=Math.hypot(...direction),[dx,dy,dz]=direction.map(value=>value/length);
  const norm=Math.hypot(dy,-dx,1-dz),x=dy/norm,y=-dx/norm,z=0,w=(1-dz)/norm;
  return [1-2*(y*y+z*z),2*(x*y+w*z),2*(x*z-w*y),0,
    2*(x*y-w*z),1-2*(x*x+z*z),2*(y*z+w*x),0,
    2*(x*z+w*y),2*(y*z-w*x),1-2*(x*x+y*y),0,...source,1];
}
function nearMatrix(actual,expected)
{
  assert.equal(actual.length,16);
  for(let index=0;index<16;index++) assert.ok(Math.abs(actual[index]-expected[index])<2e-5,`matrix[${index}]: ${actual[index]} != ${expected[index]}`);
}
test("real Breacher child receives Carbon Stretch3 orientation and exact muzzle matrices", {skip:skipController}, async t =>
{
  const stretch=(await realBreacher(t)).stretch[0], child=stretch.sourceObject;
  const context=new EveUpdateContext();context.SetTime((10) * 10_000_000);
  const original=child.UpdateAsyncronous,received=[];
  t.mock.method(child,"UpdateAsyncronous",function(ctx,params)
  {
    received.push(Array.from(params.localToWorldTransform));
    return original.call(this,ctx,params);
  });
  const source=[3,-5,7],destination=[4,-3,9];
  stretch.SetFiringTransform(source,destination);stretch.UpdateAsynchronous(context);
  nearMatrix(received.at(-1),nativeArcMatrix(source,destination));
  // Rotated, non-uniformly scaled, translated and sheared muzzle placement is copied verbatim.
  const muzzle=new Float32Array([0,2,0,0,-3,0,0,0,0.4,0,4,0,21,-13,8,1]);
  stretch.SetFiringTransform(muzzle,destination);stretch.UpdateAsynchronous(context);
  nearMatrix(received.at(-1),muzzle);
  stretch.update=false;const count=received.length;stretch.UpdateAsynchronous(context);
  assert.equal(received.length,count);
  const unchanged=new Float32Array([8,9,10]),bounds=new Float32Array([5,6,7]);
  stretch.UpdateModelCenterWorldPosition(unchanged,10);stretch.GetModelCenterWorldPosition(unchanged);
  assert.deepEqual(Array.from(unchanged),[8,9,10]);
  assert.equal(stretch.GetLocalBoundingBox(unchanged,bounds),false);
  const transform=new Float32Array(muzzle);stretch.GetLocalToWorldTransform(transform);
  nearMatrix(transform,muzzle);
});

test("controlled real Breacher child placements preserve distinct synchronous and asynchronous transforms", {skip:skipController}, async t =>
{
  const stretch=(await realBreacher(t)).stretch[0];
  for(const role of ["dest","stretch","move"]) stretch[`${role}Object`]=(await realBreacher(t)).stretch[0].sourceObject;
  const received={};
  for(const role of ["source","dest","stretch","move"])
  {
    const child=stretch[`${role}Object`];received[role]={};
    for(const phase of ["Syncronous","Asyncronous"])
    {
      const original=child[`Update${phase}`];
      t.mock.method(child,`Update${phase}`,function(context,params)
      {
        received[role][phase]={matrix:Array.from(params.localToWorldTransform),parent:params.spaceObjectParent};
        return original.call(this,context,params);
      });
    }
  }
  const source=[3,-5,7],destination=[4,-3,9],progression=0.25,scale=2;
  const translation=point=>[1,0,0,0,0,1,0,0,0,0,1,0,...point,1];
  stretch.SetFiringTransform(source,destination);stretch.moveProgression.value=progression;stretch.SetDestObjectScale(scale);
  const context=new EveUpdateContext();context.SetTime((10) * 10_000_000);
  stretch.UpdateSynchronous(context);
  assert.equal(stretch.length.value,3);
  nearMatrix(received.source.Syncronous.matrix,translation([0,0,0]));
  nearMatrix(received.stretch.Syncronous.matrix,translation([0,0,0]));
  nearMatrix(received.move.Syncronous.matrix,translation(source.map((v,i)=>(v-destination[i])*progression)));
  nearMatrix(received.dest.Syncronous.matrix,translation(destination));
  for(const role of Object.keys(received)) assert.ok(received[role].Syncronous.parent===stretch);
  stretch.UpdateAsynchronous(context);
  const expectedDestination=nativeArcMatrix(source,destination);
  for(let column=0;column<3;column++) for(let row=0;row<3;row++) expectedDestination[column*4+row]*=column===1?scale:-scale;
  expectedDestination.splice(12,3,...destination);
  nearMatrix(received.dest.Asyncronous.matrix,expectedDestination);
  const expectedMove=nativeArcMatrix(source,destination);
  expectedMove.splice(12,3,...source.map((v,i)=>v+(destination[i]-v)*progression));
  nearMatrix(received.move.Asyncronous.matrix,expectedMove);
  const expectedStretch=nativeArcMatrix(destination,source);
  for(let row=0;row<3;row++) expectedStretch[8+row]*=3;
  expectedStretch.splice(12,3,...source.map((v,i)=>(v+destination[i])/2));
  nearMatrix(received.stretch.Asyncronous.matrix,expectedStretch);
  for(const role of Object.keys(received)) assert.equal(received[role].Asyncronous.parent,null);
  stretch.OnModified("dest"); // Null dest explicitly clears the modifier, despite the retained stretch child.
  stretch.UpdateAsynchronous(context);
  nearMatrix(received.stretch.Asyncronous.matrix,translation(source));
});

test("real Breacher FX forwards variable writes and start to its authored Stretch3 controller", {
  skip: !controllerFX && "set TURRET_CONTROLLER_FX_FILE to the indexed breacherheavy_fx.black"
}, async t =>
{
  const bytes=await readFile(controllerFX);
  assert.equal(bytes.length,5470);
  assert.equal(createHash("sha256").update(bytes).digest("hex"),"706005c7b2ad7026a3ce933c4578db4e11cf4461bd95c196b87eb5e4d72da282");
  const previous=blue.resMan;blue.resMan=new StubResMan();t.after(()=>{blue.resMan=previous;});
  const effect=CjsSchema.from("EveTurretFiringFX", CjsBlackFormat.readPayload(bytes).object);
  const stretch=effect.stretch[0];
  assert.equal(CjsSchema.getClassName(stretch.constructor),"EveStretch3");
  assert.equal(stretch.controllers.length,1);
  const controller=stretch.controllers[0], machine=controller.stateMachines[0];
  assert.equal(controller.name,"CTRL_BreacherHeavy");
  assert.equal(controller.GetOwner(),stretch,"real authored controller is linked to its owning stretch");
  assert.equal(machine.GetController(),controller);
  controller.Stop();
  effect.SetControllerVariable("IsFiring",1);
  assert.equal(controller.GetVariableByName("IsFiring").GetValue(),1);
  effect.SetControllerVariable("IsFiring",0);
  assert.equal(controller.GetVariableByName("IsFiring").GetValue(),0);
  effect.StartControllers();
  assert.equal(controller.isPlaying,true);
  assert.equal(machine.GetCurrentState(),machine.startState);
  assert.equal(machine.GetCurrentState().name,"idle");

  // The unmodified asset has no event handlers. This separately controlled
  // augmentation qualifies event forwarding, not an authored Breacher event.
  assert.equal(controller.eventHandlers.length,0);
  const handler=new Tr2ControllerEventHandler(), action=new Tr2ActionSetValue();
  handler.name="controlled-forwarding-event";
  action.path="IsFiring";action.attribute="value";action.value="0.625";
  handler.actions.push(action);handler.Link(controller);controller.eventHandlers.push(handler);
  effect.HandleControllerEvent("different-event");
  assert.equal(controller.GetFloatVariableByName("IsFiring"),0);
  effect.HandleControllerEvent(handler.name);
  assert.equal(controller.GetFloatVariableByName("IsFiring"),0.625,"real controller executes the controlled action");
  controller.Stop();
  effect.SetControllerVariable("IsFiring",0);
  effect.HandleControllerEvent(handler.name);
  assert.equal(controller.GetFloatVariableByName("IsFiring"),0,"stopped controllers ignore events");
});
