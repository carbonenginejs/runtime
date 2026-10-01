import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {EveShip2,EveChildContainer,EveUpdateContext,Tr2Mesh} from "../../npm/dist/trinity/index.js";
import {TriGeometryRes} from "../../npm/dist/resource/index.js";
import {CjsBlackFormat} from "../../npm/dist/resource/formats/black/index.js";
import {CjsModel} from "../../npm/dist/global/model/index.js";
import {blue} from "../../npm/dist/global/blue/index.js";
import {quat} from "../../npm/dist/global/math/quat.js";
import {Tr2Lod} from "../../npm/dist/global/consts/trinity.js";
import "../../npm/dist/audio/index.js";
import {StubResMan} from "../support/stubResMan.js";

test("root effect-child sync and async handoffs preserve the native no-bones result",()=>{
  const ship=new EveShip2();
  const calls=[];
  const child=new EveChildContainer();
  child.UpdateSyncronous=(_ctx,params)=>calls.push([params.bones,params.boneCount]);
  child.UpdateAsyncronous=(_ctx,params)=>calls.push([params.bones,params.boneCount]);
  ship.effectChildren.push(child);
  ship.UpdateSyncronous(new EveUpdateContext());ship.UpdateAsyncronous(new EveUpdateContext());
  assert.deepEqual(calls,[[null,0],[null,0]],"Tr2GrannyAnimationUtils::GetBoneList cpp:24-33 uninitialized branch");
});

const corpus=process.env.EFFECT_CHILD_BONES_CORPUS_DIR;
test("real Crisis Angel destroyer bone children follow all warp clips through non-orthogonal parents",{
  skip:!corpus&&"set EFFECT_CHILD_BONES_CORPUS_DIR for real angde1 hull and Crisis effect"
},async t=>{
  const previous=blue.resMan;blue.resMan=new StubResMan();t.after(()=>{blue.resMan=previous;});
  const bytes=await readFile(join(corpus,"angde1_t1.gr2"));
  assert.equal(createHash("md5").update(bytes).digest("hex"),"bb7f52941b4bb48184b8655ac065d863");
  const fx=await readFile(join(corpus,"angde1_t1_crisis_fx.black"));
  assert.equal(createHash("md5").update(fx).digest("hex"),"007204e6136609a2969ddb38e7a57a8d");
  const ship=new EveShip2(),mesh=new Tr2Mesh(),geometry=new TriGeometryRes();
  geometry.SetPayload(geometry.ReadGrannyFile(bytes));geometry.MarkPrepared();mesh.SetGeometryRes(geometry);ship.SetMesh(mesh);
  const crisis=EveChildContainer.from(CjsBlackFormat.readPayload(fx).object);
  CjsModel.addChild(ship,"effectChildren",crisis);
  ship.lodLevel=Tr2Lod.TR2_LOD_HIGH;ship.isVisible=true;
  const updater=ship.animationUpdater;
  assert.equal(updater.GetMeshBoneCount(),38);
  assert.deepEqual(updater.GetAnimationNames(),["NormalLoop","Normal2Warp","WarpLoop","Warp2Normal"]);
  const lightning=crisis.objects[3];
  // Isolate bone following from the independent timed kill visibility gate.
  // Native updateOnDisplay=false keeps this real subtree updating while hidden.
  lightning.updateOnDisplay=false;
  const attachments=lightning.objects.slice(0,4).map(placement=>placement.objects[0]);
  assert.deepEqual(attachments.map(child=>child.transformModifiers[0].boneIndex),[27,36,23,33]);
  const phases=[];
  for(const method of ["UpdateSyncronous","UpdateAsyncronous"]){
    const original=crisis[method].bind(crisis);
    crisis[method]=(context,params)=>{
      assert.equal(params.boneCount,38,`EveSpaceObject2.cpp:598/724 ${method} root palette count`);
      assert.equal(params.bones,updater.GetMeshBoneMatrixList(),"borrow the same Float4x3 palette, without copying or skeleton-order substitution");
      phases.push(method);return original(context,params);
    };
  }
  // A rotated child under nonuniform scale produces non-orthogonal basis
  // columns. This exercises the modifier with more than rigid transforms.
  crisis.scaling.set([2,3,4]);quat.setAxisAngle(crisis.rotation,[0,1,0],0.37);
  quat.setAxisAngle(lightning.rotation,[0,0,1],0.61);
  const captured=[];
  for(const child of attachments){
    const modifier=child.transformModifiers[0],apply=modifier.ApplyTransform.bind(modifier);
    modifier.ApplyTransform=(context,input,count,palette,out)=>{
      assert.equal(count,38);const offset=modifier.boneIndex*12;
      const b=[palette[offset],palette[offset+4],palette[offset+8],0,palette[offset+1],palette[offset+5],palette[offset+9],0,
        palette[offset+2],palette[offset+6],palette[offset+10],0,palette[offset+3],palette[offset+7],palette[offset+11],1];
      // Independent scalar oracle for Carbon row-vector bone * transform,
      // whose shared bytes are gl input * bone; includes basis and translation.
      const expected=new Array(16).fill(0);
      for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)expected[col*4+row]+=input[k*4+row]*b[col*4+k];
      const result=apply(context,input,count,palette,out);
      for(let i=0;i<16;i++)assert.ok(Math.abs(out[i]-expected[i])<2e-4,`AttachToBone.cpp:36-37 matrix[${i}]`);
      captured.push({input:Array.from(input),out:Array.from(out)});return result;
    };
  }
  const context=new EveUpdateContext();let time=100;
  const poses=[];
  for(const name of updater.GetAnimationNames()){
    updater.StopAnimations(0);updater.PlayAnimation(name,false,1,0,1);
    context.SetTime((time) * 10_000_000);ship.UpdateSyncronous(context);ship.UpdateAsyncronous(context);
    time+=4;context.SetTime((time) * 10_000_000);ship.UpdateSyncronous(context);ship.UpdateAsyncronous(context);
    poses.push(Array.from(updater.GetMeshBoneMatrixList()));time+=0.1;
  }
  t.diagnostic(JSON.stringify({captured:captured.length,rootUpdate:crisis.IsUpdating(),lightningUpdate:lightning.IsUpdating(),children:attachments.map(c=>({update:c.IsUpdating(),display:c.display}))}));
  assert.equal(phases.length,16);assert.ok(captured.length>=32,"four real bone attachments receive every frame");
  assert.ok(captured.some(({input:m})=>Math.abs(m[0]*m[4]+m[1]*m[5]+m[2]*m[6])>0.1),"test matrix includes non-orthogonal basis");
  assert.notDeepEqual(poses[0],poses[1],"real Normal2Warp changes root bones");
  assert.notDeepEqual(poses[2],poses[3],"real Warp2Normal changes root bones");
  t.diagnostic("38 mesh bones; four authored attachments27/36/23/33; both update phases and all four real root clips; CPU matrix proof only");
});
