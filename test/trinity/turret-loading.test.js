import assert from "node:assert/strict";
import test from "node:test";
import { blue } from "../../npm/dist/global/blue/index.js";
import { EveChildTurret, EveTurretFiringFX, EveComponentRegistry } from "../../npm/dist/trinity/index.js";

function pendingManager(t)
{
  const previous=blue.resMan, requests=[];
  blue.resMan={LoadObject(path){return new Promise((resolve,reject)=>requests.push({path,resolve,reject}));}};
  t.after(()=>{blue.resMan=previous;});
  return requests;
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test("child turret typed load installs through the current registry and preserves deferred call order", async t =>
{
  const requests=pendingManager(t), turret=new EveChildTurret(), registry=new EveComponentRegistry();
  turret.firingEffectResPath="res:/effect.red";
  assert.equal(turret.Initialize(),true);
  turret.Register(registry);
  const calls=[], effect=new EveTurretFiringFX();
  effect.SetControllerVariable=(name,value)=>calls.push([name,value]);
  effect.StartControllers=()=>calls.push(["start"]);
  turret.SetControllerVariable("Strength",0.25);
  turret.StartControllers();
  turret.SetControllerVariable("Strength",0.75);
  assert.equal(requests[0].path,turret.firingEffectResPath);
  requests[0].resolve(effect);
  await settle();
  assert.equal(turret.GetFiringEffect(),effect,"EveChildTurret.cpp:56 installs the typed loaded effect");
  assert.equal(effect.GetComponentRegistry(),registry,"cpp:822-835 passes the registry to Register");
  assert.deepEqual(calls,[["Strength",0.25],["start"],["Strength",0.75]]);
  turret.UnRegister(registry);
  assert.equal(effect.GetComponentRegistry(),null,"cpp:85-96 unregisters the effect entity");
  turret.Register(registry);
  assert.equal(effect.GetComponentRegistry(),registry);
});

test("inline effect wins Initialize; notified reload retains it until a typed replacement arrives", async t =>
{
  const requests=pendingManager(t), turret=new EveChildTurret(), registry=new EveComponentRegistry();
  const inline=new EveTurretFiringFX(), replacement=new EveTurretFiringFX();
  turret.Register(registry);
  turret.SetFiringEffect(inline);
  turret.firingEffectResPath="res:/replacement.red";
  turret.Initialize();
  assert.equal(requests.length,0,"cpp:54 keeps an inline effect");
  turret.OnModified("firingEffectResPath");
  assert.equal(turret.GetFiringEffect(),inline);
  assert.equal(inline.GetComponentRegistry(),registry);
  requests[0].resolve(replacement);
  await settle();
  assert.equal(inline.GetComponentRegistry(),null);
  assert.equal(replacement.GetComponentRegistry(),registry);
  turret.firingEffectResPath="";
  turret.OnModified("firingEffectResPath");
  assert.equal(turret.GetFiringEffect(),replacement,"cpp:67 does not clear an installed effect on empty path");
});

test("same-path reload, clear, explicit setter and cleanup supersede pending child turret loads", async t =>
{
  const requests=pendingManager(t), turret=new EveChildTurret();
  turret.firingEffectResPath="res:/same.red";
  turret.Initialize();
  turret.OnModified("firingEffectResPath");
  const current=new EveTurretFiringFX();
  requests[1].resolve(current); await settle();
  requests[0].resolve(new EveTurretFiringFX()); await settle();
  assert.equal(turret.GetFiringEffect(),current);
  turret.OnModified("firingEffectResPath");
  turret.firingEffectResPath=""; turret.OnModified("firingEffectResPath");
  requests[2].resolve(new EveTurretFiringFX()); await settle();
  assert.equal(turret.GetFiringEffect(),current);
  turret.firingEffectResPath="res:/pending.red"; turret.OnModified("firingEffectResPath");
  const explicit=new EveTurretFiringFX(); turret.SetFiringEffect(explicit);
  requests[3].resolve(new EveTurretFiringFX()); await settle();
  assert.equal(turret.GetFiringEffect(),explicit);
  turret.OnModified("firingEffectResPath"); turret.CleanUp();
  requests[4].resolve(new EveTurretFiringFX()); await settle();
  assert.equal(turret.GetFiringEffect(),explicit);
});

test("wrong type and rejected loads install null like Carbon's typed LoadObject", async t =>
{
  const requests=pendingManager(t), turret=new EveChildTurret(), registry=new EveComponentRegistry();
  turret.Register(registry);
  for (const reject of [false,true])
  {
    const old=new EveTurretFiringFX(); turret.SetFiringEffect(old);
    turret.firingEffectResPath="res:/invalid.red"; turret.OnModified("firingEffectResPath");
    const request=requests.at(-1);
    if(reject)request.reject(new Error("absent")); else request.resolve(new EveChildTurret());
    await settle();
    assert.equal(turret.GetFiringEffect(),null);
    assert.equal(old.GetComponentRegistry(),null);
  }
});

test("firing transitions wait for loaded effect timing and later idle cancels firing in order", async t =>
{
  const requests=pendingManager(t), turret=new EveChildTurret();
  turret.firingEffectResPath="res:/effect.red"; turret.Initialize();
  const calls=[], effect=new EveTurretFiringFX();
  turret.SetupFiringState=()=>{calls.push(["setup",turret.GetFiringEffect()]);return true;};
  effect.PrepareFiring=()=>calls.push(["fire"]);
  effect.StopFiring=()=>calls.push(["stop"]);
  turret.EnterStateFiring(); turret.EnterStateIdle();
  assert.deepEqual(calls,[]);
  requests[0].resolve(effect); await settle();
  assert.deepEqual(calls,[["setup",effect],["fire"],["stop"]]);
  assert.equal(turret.state,EveChildTurret.State.STATE_IDLE);
});
