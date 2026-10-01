// Optional CPU proof using copied, unmodified SOF/skin-change files. Geometry,
// audio playback, wall-timer cleanup and GPU visibility are outside this test.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { blue } from "../../npm/dist/global/blue/index.js";
import { num } from "../../npm/dist/global/math/num.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { EveSOF } from "../../npm/dist/sof/index.js";
import { EveShip2, EveUpdateContext } from "../../npm/dist/trinity/index.js";
import { Tr2Lod } from "../../npm/dist/global/consts/trinity.js";
import "../../npm/dist/audio/index.js";
import { StubResMan } from "../support/stubResMan.js";

const corpus=process.env.ACTIVATION_BLACK_CORPUS_DIR;
const skip=!corpus && "set ACTIVATION_BLACK_CORPUS_DIR for the real ship activation proof";
let catalog;
async function loadCatalog()
{
  if(catalog)return catalog;
  const bytes=await readFile(join(corpus,"data.black"));
  assert.equal(bytes.length,184126948);
  assert.equal(createHash("md5").update(bytes).digest("hex"),"a800b64240ea16a7efba1d1b96df3365");
  const data=CjsBlackFormat.readPayload(bytes).object;
  const files=new Map([["res:/dx9/model/spaceobjectfactory/generic.black",data.generic]]);
  for(const [kind,dir] of Object.entries({hull:"hulls",faction:"factions",race:"races",material:"materials",pattern:"patterns",layout:"layouts"}))
  {
    for(const record of data[kind]??[])files.set(`res:/dx9/model/spaceobjectfactory/${dir}/${record.name}.black`,record);
  }
  catalog=files;
  return files;
}
async function builder(t)
{
  const files=await loadCatalog();
  const previous=blue.resMan;blue.resMan=new StubResMan();t.after(()=>{blue.resMan=previous;});
  return new EveSOF().Register({
    lazyData:{source:async path=>{assert.ok(files.has(path),path);return files.get(path);}},
    resources:{exists:async path=>files.has(path)}
  });
}
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-5,`${message}: ${a} vs ${b}`);

test("real Apocalypse skin-change bindings fade ship constants and authored sprite/spotlight quads", {skip}, async t =>
{
  const sof=await builder(t);
  const ships=[];
  for(const dna of ["ab1_t1:amarrbase:amarr","ab1_t1:angelbase:amarr"])
  {
    const ship=EveShip2.from(await sof.BuildValuesFromDNAAsync(dna));
    ship.lodLevel=Tr2Lod.TR2_LOD_HIGH;ship.isVisible=true;
    ships.push(ship);
  }
  const bytes=await readFile(join(corpus,"skin_change.black"));
  assert.equal(bytes.length,1514);
  assert.equal(createHash("sha256").update(bytes).digest("hex"),"4f5ec0fe1b7a9669f979e131bfb53bdf171d111ef46560bfdce74fb4d858c656");
  // The actual binding/setup portion of demo.js skin callback, as in larch's
  // same-start CPU probe: two render owners, each binding both ships.
  for(const owner of ships)
  {
    const overlay=CjsBlackFormat.read(bytes,{emit:"runtime"}).root;
    for(const binding of overlay.curveSet.bindings)
    {
      binding.destinationObject=binding.name.startsWith("old_")?ships[0]:ships[1];
      binding.Initialize();
    }
    owner.overlayEffects.push(overlay);
    overlay.curveSet.ApplyTime(0);
    overlay.PlayCurveSet(overlay.curveSet.name);
  }
  const context=new EveUpdateContext();
  const controllerValues=ships.map(ship=>{
    const values=[];const original=ship.SetControllerVariable.bind(ship);
    ship.SetControllerVariable=(name,value)=>{if(name==="ActivationStrength")values.push(value);original(name,value);};
    return values;
  });
  for(let step=0;step<=40;step++)
  {
    const time=step/10;context.SetTime((100+time) * 10_000_000);
    for(const ship of ships){ship.UpdateSyncronous(context);ship.UpdateAsyncronous(context);}
    for(let index=0;index<ships.length;index++)
    {
      const ship=ships[index],expected=index?Math.min(time/3,1):Math.max(1-time/3,0);
      near(ship.activationStrength,expected,"real binding raw activation");
      near(ship.spaceObjectShipData[1],expected,"EveMobile.cpp:210 effective activation");
      near(ship._psData.Get("shipData")[1],expected,"PS activation");
      near(ship._vsData.Get("shipData")[1],expected,"VS activation");
      if(controllerValues[index].length)near(controllerValues[index].at(-1),expected,"controller activation");
      const quads=[];ship.AddQuadsToQuadRenderer(null,{AddQuads(_key,bytes,count){quads.push({bytes:bytes.slice(),count});}});
      const sprites=ship.attachments.find(a=>CjsSchema.getClassName(a.constructor)==="EveSpriteSet");
      const spots=ship.attachments.find(a=>CjsSchema.getClassName(a.constructor)==="EveSpotlightSet");
      assert.equal(sprites.sprites.length,11);assert.equal(spots._spotlightData.length,7);
      for(const [size,offset,count,intensity] of [[32,12,11,sprites.intensity],[60,54,7,spots.intensity],[72,54,7,spots.intensity]])
      {
        const packet=quads.find(q=>q.bytes.byteLength===size*count && q.count===count);
        assert.ok(packet,`real ${size}-byte quad records`);
        const view=new DataView(packet.bytes.buffer,packet.bytes.byteOffset,packet.bytes.byteLength);
        assert.equal(view.getUint16(offset,true),num.toHalfFloat(Math.fround(ship.spaceObjectShipData[1]*intensity)),"real consumer packed activation");
      }
    }
  }
  t.diagnostic("41 same-start CPU samples: real curves, hull constants and real sprite/cone/glow bytes; no GPU claim");
});


test("real Abaddon sprite and Archon spotlight light records follow root async activation and movement", {skip}, async t =>
{
  const sof=await builder(t);
  for(const [dna,type,count] of [["ab3_t1:amarrbase:amarr","EveSpriteSet",6],["aca1_t1:amarrbase:amarr","EveSpotlightSet",7]])
  {
    const ship=EveShip2.from(await sof.BuildValuesFromDNAAsync(dna));
    const attachment=ship.attachments.find(a=>CjsSchema.getClassName(a.constructor)===type && a.lights.length>0);
    assert.ok(attachment,`${dna} must have real authored ${type} light records`);
    assert.equal(attachment.lights.length,count);
    const context=new EveUpdateContext();
    let baseline;
    for(const [step,activation] of [1,0.5,0].entries())
    {
      ship.activationStrength=activation;
      ship.spaceObjectShipData[0]=0.75;
      ship.worldTransform[12]=10+step*3;
      context.SetTime((100+step) * 10_000_000);
      ship.UpdateAsyncronous(context);
      near(attachment._activationStrength,activation,"EveSpaceObject2.cpp:741 forwards combined activation");
      if(type==="EveSpotlightSet")near(attachment._boosterGain,0.75,"root forwards booster gain");
      for(const light of attachment.lights)
      {
        assert.deepEqual(Array.from(light.boneMatrix),Array.from(ship.worldTransform),"no loaded skeleton: authored lights use the current parent transform");
      }
      const records=[];
      attachment.GetLights({GetCurrentSpaceSceneShadowQuality:()=>0,AddLight(record){records.push({color:Array.from(record.color),position:Array.from(record.position)});}});
      assert.equal(records.length,count);
      if(!baseline)
      {
        baseline=records;
        assert.ok(baseline.some(record=>record.color.some(value=>value>0)),"real lights must be nonblack after the root update");
      }
      else for(let index=0;index<count;index++)
      {
        for(let channel=0;channel<3;channel++)near(records[index].color[channel],baseline[index].color[channel]*activation,"real output color scales with root activation");
        near(records[index].position[0]-baseline[index].position[0],step*3,"real light follows changed parent position");
      }
    }
    t.diagnostic(`${dna}: ${count} authored ${type} light records updated by the root; external geometry/controllers remain unresolved`);
  }
});
