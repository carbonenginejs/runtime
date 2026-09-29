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
import { EveChildTurret, EveTurretSet } from "../../npm/dist/trinity/index.js";
import "../../npm/dist/audio/index.js"; // The published FX owns AudEventCurve/AudEmitter objects.
import { StubResMan } from "../support/stubResMan.js";
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
  const set=EveTurretSet.from(CjsBlackFormat.readPayload(turretBytes).object);
  assert.equal(set.firingEffect,null,"native set loading is caller-owned");
  set.SetFiringEffect(children[0].firingEffect);
  assert.equal(set.firingEffect,children[0].firingEffect,"SetFiringEffect takes the FX root, not its stretch child");
  const effect=set.firingEffect;
  effect.PrepareFiring(0);
  const context={currentTime:1,deltaTime:0.1};
  assert.equal(effect.UpdateAsynchronous(context),false);
  assert.equal(effect.ReadyToFire(),true);
  assert.equal(effect.UpdateAsynchronous(context),true,"real pulse FX starts after Carbon's one-frame delay");
  assert.equal(children[1].firingEffect.isFiring,false,"instances do not share firing state");
});
