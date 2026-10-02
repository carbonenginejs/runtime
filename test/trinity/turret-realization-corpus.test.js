import { CjsCmfFormat } from "../../npm/dist/resource/formats/cmf/index.js";
import { CjsGr2Format } from "../../npm/dist/resource/formats/gr2/index.js";
import { EveChildContainer, EveChildInstanceContainer, EveChildUpdateParams, EveChildModifierAttachToBone, EveUpdateContext, Tr2Lod } from "../../npm/dist/trinity/index.js";
import { TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";
import { CjsHlslFormat } from "../../npm/dist/resource/formats/hlsl/CjsHlslFormat.js";
import { SharedGeometryBuffer } from "../../npm/dist/trinity/core/mesh/TriGeometryResAllocations.js";
import { CjsWebgpuRenderContextAL } from "../../npm/dist/trinityal/webgpu/internal.js";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { blue, ResourceRequirement } from "../../npm/dist/global/blue/index.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { TriGeometryRes } from "../../npm/dist/resource/geometry/TriGeometryRes.js";
import { TriGeometryResSkeletonData } from "../../npm/dist/resource/geometry/TriGeometryResSkeletonData.js";
import { EveShip2, EveLocator2, EveTurretSet, EveTurretAiming, EveTurretFiringFX, EveComponentRegistry, Tr2RenderContext, Tr2RingBuffer, TriDevice, Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/index.js";
import { CjsGrannyCurves } from "../../npm/dist/trinity/curves/track/CjsGrannyCurves.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { makePerObjectStore } from "./helpers/perObjectStore.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import "../../npm/dist/audio/index.js";
import { StubResMan } from "../support/stubResMan.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { Copier } from "../../npm/dist/global/blue/Copier.js";
import { GetResources } from "../../npm/dist/global/blue/getResources.js";
import { Tr2Controller, TriObserverLocal } from "../../npm/dist/trinity/index.js";
const corpus=process.env.TURRET_BLACK_CORPUS_DIR;
const skip=!corpus && "set TURRET_BLACK_CORPUS_DIR for Apocalypse/type462 turret realization";
const geometryPath="res:/dx9/model/turret/energy/pulse/l/pulse_mega_t1.gr2";

test("real turret geometry remains READ-accessible and collected but is excluded from Values and copy input",{skip},async t=>
{
  const {set,resource}=await assets(t);
  set.Initialize();
  const declaration=CjsSchema.getSchema(EveTurretSet).members.find(member=>member.name==="geometryResource");
  assert.equal(declaration.edit.read,true,"native READ accessibility is retained");
  assert.ok(set.geometryResource===resource,"initialized turret owns the requested real geometry");
  assert.ok(GetResources(set).includes(resource),"the held resource remains a dependency edge");
  const values=set.GetValues();
  assert.equal(Object.hasOwn(values,"geometryResource"),false,"unfiltered Values must not serialize the loaded handle");
  assert.equal(values.geometryResPath,geometryPath,"the authored resource path remains serializable");
  assert.ok(Object.hasOwn(values,"turretEffect"),"ordinary owned graph references remain Values data");
  const incoming=Object.defineProperty({},"geometryResource",{enumerable:true,get(){throw new Error("runtime resource input must not be read");}});
  set.SetValues(incoming);assert.ok(set.geometryResource===resource);
  const descriptor=Object.getOwnPropertyDescriptor(set,"geometryResource");
  Object.defineProperty(set,"geometryResource",{configurable:true,get(){throw new Error("Copier must not read the source runtime handle");}});
  let clone;
  try { clone=new Copier().CloneTo(set); }
  finally { Object.defineProperty(set,"geometryResource",descriptor); }
  assert.ok(clone);t.after(()=>clone.Destroy());
  assert.equal(clone.geometryResPath,geometryPath);
  assert.equal(clone.geometryResource,null,"READ-only LOD is not copied, so the constructor's initial LOD has no loaded handle");
  clone.lodLevel=EveTurretSet.LOD.LOD_HIGHEST;clone.Initialize();
  assert.ok(clone.geometryResource===resource,"destination Initialize independently reacquires the resource by its authored path");
  assert.equal(declaration.type.runtimeOnly,true);
});

function updateContext({deltaTime=0,currentTime=10,...fields}={})
{
  const context=new EveUpdateContext();
  Object.assign(context,fields);
  context.SetTime((currentTime-deltaTime) * 10_000_000);
  context.SetTime((currentTime) * 10_000_000);
  return context;
}

async function assets(t)
{
  const bytes=await readFile(join(corpus,"pulse_mega_t1.gr2"));
  assert.equal(bytes.length,95176);assert.equal(createHash("md5").update(bytes).digest("hex"),"e5884e94bf4c8bec0d7998b32c3c2ae5");
  const hull=JSON.parse(await readFile(join(corpus,"ab1_t1.sof.json"),"utf8"));assert.equal(hull.name,"ab1_t1");
  const turretBytes=await readFile(join(corpus,"pulse_mega_t1.black"));
  assert.equal(createHash("sha256").update(turretBytes).digest("hex"),"dc7be4c9cf75bd167b36f807837488ef04cab90a8c5479f86bbd7e34ae65fdd9");
  const previous=blue.resMan,manager=new StubResMan(),base=manager.GetResource.bind(manager),resources=new Map(),requests=[];
  manager.GetResource=(path,options)=>{
    if(options?.requirement===ResourceRequirement.GEOMETRY){requests.push(path);return resources.get(path.toLowerCase())??null;}
    return base(path,options);
  };
  blue.resMan=manager;t.after(()=>{blue.resMan=previous;});
  const makeResource=(prepared=true)=>{const value=new TriGeometryRes();value.SetPayload(value.ReadGrannyFile(bytes));if(prepared)value.MarkPrepared();return value;};
  const resource=makeResource();resources.set(geometryPath,resource);
  const set=EveTurretSet.from(CjsBlackFormat.readPayload(turretBytes).object);set.geometryResPath=geometryPath;set.lodLevel=EveTurretSet.LOD.LOD_HIGHEST;set.slotNumber=1;
  t.after(()=>{set.ReleaseResources();TriDevice.UnregisterResource(set);});
  const ship=new EveShip2();ship.locators=hull.locatorTurrets.map(value=>CjsSchema.from("EveLocator2", value));ship.turretSets.push(set);
  return {set,ship,resource,makeResource,resources,requests,hull};
}

test("Apocalypse/type462 geometry ownership caches mesh0 and exact native bone IDs in both arrival orders",{skip},async t=>
{
  const {set,ship,resource}=await assets(t);
  ship.RebuildTurretPositions();assert.equal(set.GetTurrets().length,2);
  set.boundingSphere.fill(0);set.Initialize();
  assert.ok(set.geometryResource===resource,"the requested handle is owned by the turret");assert.equal(set._turretVertexDeclElementCount,resource.GetMeshVertexElements(0).length+1);
  assert.ok(set.boundingSphere[3]>0);assert.equal(resource.GetMeshCount(),6);
  const b=EveTurretAiming.SystemBones;assert.equal(set._systemBoneID[b.SYSBONE_ROTATION],2);assert.equal(set._systemBoneID[b.SYSBONE_PITCH],4);
  assert.equal(resource.GetMeshData(0).boneBindings.length,9,"11 skeleton bones are not the 9 mesh-bound bones");
  assert.equal(TriGeometryResSkeletonData.prototype.FindJoint.call(resource.GetSkeletonData(0),"Pos_Fire01"),10);
  assert.equal(TriGeometryResSkeletonData.prototype.FindJoint.call(resource.GetSkeletonData(0),"Pos_Fire99"),0xffffffff);
  const positions=set.GetTurrets().map(item=>Array.from(item.localPosition));
  assert.ok(Math.abs(positions[0][0]+87.181839)<1e-4);assert.ok(Math.abs(positions[1][0]-87.181801)<1e-4);
  set.GetTurrets().length=0;set.Initialize();ship.RebuildTurretPositions();assert.deepEqual(set.GetTurrets().map(item=>Array.from(item.localPosition)),positions);
  const bounds=[1,2,3,200];set.boundingSphere.set(bounds);set.Initialize();assert.deepEqual(Array.from(set.boundingSphere),bounds);
});

test("late old completion cannot replace current cache; notifications survive reload once and LOD clears geometry",{skip},async t=>
{
  const {set,ship,makeResource,resources}=await assets(t);ship.RebuildTurretPositions();
  const old=makeResource(false),next=makeResource(false);resources.set(geometryPath,old);
  set.Initialize();const second="res:/controlled-replacement.gr2";resources.set(second,next);set.geometryResPath=second;set.OnModified("geometryResPath");
  old.MarkPrepared();assert.ok(set.geometryResource===next,"replacement handle remains current");assert.equal(set._skeleton,null,"stale completion must not rebuild");
  next.MarkPrepared();assert.ok(set._skeleton===next.GetSkeletonData(0),"current resource owns cached skeleton");
  let rebuilds=0;const rebuild=set.RebuildCachedData.bind(set);set.RebuildCachedData=value=>{rebuilds++;return rebuild(value);};
  set.Initialize();set.Initialize();const before=rebuilds;
  next.MarkPurged();assert.equal(set._skeleton,null);next.MarkPrepared();assert.equal(rebuilds,before+1,"one persistent subscription after repeated initialization");
  const matrices=set.GetTurrets().map(item=>Array.from(item.localMatrix));set.lodLevel=EveTurretSet.LOD.LOD_EMPTY;set.InitializeGeometryResource();
  assert.equal(set.geometryResource,null);assert.equal(set._turretVertexDeclElementCount,0);assert.ok(Array.from(set._systemBoneID).every(value=>value===0xffffffff));
  assert.deepEqual(set.GetTurrets().map(item=>Array.from(item.localMatrix)),matrices,"resource cleanup preserves mount placement");
  set.lodLevel=EveTurretSet.LOD.LOD_HIGHEST;set.geometryResPath="";set.InitializeGeometryResource();assert.equal(set.geometryResource,null);
});

test("native locator scale removal preserves a rotated non-orthogonal basis on the real mount",{skip},async t=>
{
  const {set,ship}=await assets(t);ship.RebuildTurretPositions();
  const original=mat4.clone(set.GetTurrets()[0].localMatrix);mat4.rotateY(original,original,.43);mat4.scale(original,original,[2,3,4]);
  original[4]+=original[0]*.35;original[5]+=original[1]*.35;original[6]+=original[2]*.35;
  const expected=Array.from(original);
  for(const at of [0,4,8]){const length=Math.sqrt(original[at]**2+original[at+1]**2+original[at+2]**2);for(let i=0;i<3;i++)expected[at+i]/=length;}
  set.SetLocalTransform(0,original);const actual=set.GetTurrets()[0].localMatrix;
  for(let i=0;i<16;i++)assert.ok(Math.abs(actual[i]-expected[i])<1e-5,`TriMath.cpp:683 independent basis normalization component${i}`);
  assert.ok(Math.abs(actual[0]*actual[4]+actual[1]*actual[5]+actual[2]*actual[6])>.01,"negative control: quaternion reconstruction would orthogonalize these axes");
  assert.equal(set.SetLocalTransform(24,original),false);assert.equal(set.GetTurrets().length,2);
});

test("real paired mounts own independent sampled poses and native play-idle clocks",{skip},async t=>
{
  const {set,ship,resource}=await assets(t);ship.RebuildTurretPositions();set.Initialize();
  const [a,b]=set.GetTurrets();
  assert.ok(a.sequencer && b.sequencer,"EveTurretSet.cpp:902 owns a sequencer per mount");
  assert.ok(a.sequencer!==b.sequencer && a.pose!==b.pose && a.pose.boneTransforms[0].position!==b.pose.boneTransforms[0].position);
  assert.deepEqual(set._skeletonBoneIndices,[4,8,6,0,2,1,3,7,9]);
  set.UpdateAsyncronous(updateContext({deltaTime:0}));
  const paletteA=a.sequencer.GetMeshBoneMatrixList(),paletteB=b.sequencer.GetMeshBoneMatrixList();
  assert.equal(paletteA.length,108);assert.ok(paletteA!==paletteB);
  const beforeA=Array.from(paletteA),beforeB=Array.from(paletteB);
  const duration=set.PlayAnimation(0,"Deploy","Active",.25);
  assert.ok(Math.abs(duration-2.5416667461395264)<1e-8,"native fixture Deploy duration");
  set.UpdateAsyncronous(updateContext({deltaTime:.2}));
  assert.equal(a.sequencer.GetAnimationLayer(null).queue[0].name,"Active","old control lives until delayed replacement");
  set.UpdateAsyncronous(updateContext({deltaTime:.3}));
  assert.equal(a.sequencer.GetAnimationLayer(null).queue[0].name,"Deploy");
  assert.notDeepEqual(Array.from(a.sequencer.GetMeshBoneMatrixList()),beforeA);
  assert.deepEqual(Array.from(b.sequencer.GetMeshBoneMatrixList()),beforeB,"second mount remains unchanged while first deploys");
  const old=a.sequencer.GetAnimationLayer(null).queue[0];
  assert.equal(set.PlayAnimation(0,"missing","Active"),0);assert.equal(set.PlayAnimation(0,"Deploy","missing"),0);
  set.UpdateAsyncronous(updateContext({deltaTime:0}));
  assert.equal(a.sequencer.GetAnimationLayer(null).queue[0].elapsed,old.elapsed,"missing either name leaves native controls intact");
  set.UpdateAsyncronous(updateContext({deltaTime:duration}));
  const idle=a.sequencer.GetAnimationLayer(null).queue[0];
  const overshoot=Math.fround(.2)+Math.fround(.3)-.25;
  assert.equal(idle.name,"Active");assert.ok(Math.abs(idle.elapsed-overshoot)<1e-9,"CMF first eligible scheduler preserves float32 delta overshoot");
  resource.MarkPurged();assert.equal(a.sequencer,null);assert.equal(a.pose,null);assert.deepEqual(a.worldTransforms,[]);
});

test("pending native requests replay without delay and late mounts initialize immediately",{skip},async t=>
{
  const {set,ship,resources,makeResource}=await assets(t);const pending=makeResource(false);resources.set(geometryPath,pending);
  ship.RebuildTurretPositions();set.Initialize();
  assert.equal(set.PlayAnimation(0,"Deploy","Active",5),0);assert.equal(set._animationQueue.length,1);
  set.UpdateAsyncronous(updateContext({deltaTime:2}));pending.MarkPrepared();set.UpdateAsyncronous(updateContext({deltaTime:0}));
  const first=set.GetTurrets()[0].sequencer.GetAnimationLayer(null).queue[0];
  assert.equal(first.name,"Deploy");assert.equal(first.elapsed,0,"cpp:2483 AnimationRequest omits delay");
  assert.equal(set._animationQueue.length,0);
  set.SetLocalTransform(2,set.GetTurrets()[0].localMatrix);set.UpdateAsyncronous(updateContext({deltaTime:0}));
  const late=set.GetTurrets()[2];assert.ok(late.sequencer);assert.equal(late.sequencer.GetAnimationLayer(null).queue[0].name,"Active");
  assert.equal("display" in late,false,"SingleTurretData retains Carbon visible spelling");
  set.StopAnimation(0,0);set.UpdateAsyncronous(updateContext({deltaTime:0}));assert.equal(set.GetTurrets()[0].sequencer.GetAnimationLayer(null).queue.length,0);
});

test("native delayed stops cover future controls and extended one-shots without chained-queue drift",{skip},async t=>
{
  const {set,ship}=await assets(t);ship.RebuildTurretPositions();set.Initialize();
  const [a,b]=set.GetTurrets();
  set.PlayAnimation(0,"Deploy","Active",1);set.StopAnimation(0,.5);
  set.UpdateAsyncronous(updateContext({deltaTime:.75}));assert.equal(a.sequencer.GetAnimationLayer(null).queue.length,0);
  const duration=set.PlayAnimation(0,"Deploy","",0);set.StopAnimation(0,duration+1);
  set.UpdateAsyncronous(updateContext({deltaTime:duration+.2}));
  assert.equal(a.sequencer.GetAnimationLayer(null).queue[0].held,true,"native one-shot holds final pose until extended stop");
  set.UpdateAsyncronous(updateContext({deltaTime:.81}));assert.equal(a.sequencer.GetAnimationLayer(null).queue.length,0);
  set.PlayAnimation(0,"Deploy","Active",.25);set.PlayAnimation(1,"Deploy","Active",.25);
  set.UpdateAsyncronous(updateContext({deltaTime:duration+.55}));
  assert.ok(Math.abs(a.sequencer.GetAnimationLayer(null).queue[0].elapsed-(Math.fround(duration+.55)-duration-.25))<1e-8);
  assert.deepEqual(Array.from(a.sequencer.GetMeshBoneMatrixList()),Array.from(b.sequencer.GetMeshBoneMatrixList()));
  set.PlayAnimation(0,"","",.2);set.UpdateAsyncronous(updateContext({deltaTime:.1}));assert.equal(a.sequencer.GetAnimationLayer(null).queue[0].name,"Active");
  set.UpdateAsyncronous(updateContext({deltaTime:.11}));assert.equal(a.sequencer.GetAnimationLayer(null).queue.length,0);
});


test("real Fire is an authored static clip; Deploy moves the full Recoil and muzzle joints",{skip},async t=>
{
  const {set,ship}=await assets(t);ship.RebuildTurretPositions();set.Initialize();
  const updater=set.GetTurrets()[0].sequencer;
  const decoded=name=>CjsGrannyCurves.getTrackGroups(updater._findAnimation(name)).flatMap(group=>
    (group.transformTracks??group.TransformTracks).map(track=>({name:track.name??track.Name,curves:updater._decodeTrack(track)})));
  const fire=decoded("Fire"),active=decoded("Active"),deploy=decoded("Deploy");
  assert.deepEqual(fire,active,"indexed Fire and Active have identical decoded track targets and static controls");
  assert.ok(fire.some(track=>track.name==="Recoil") && fire.some(track=>track.name==="Pos_Fire01"));
  for(const track of fire)for(const curve of Object.values(track.curves))assert.ok(curve.format===2 || curve.format===4);
  assert.ok(deploy.find(track=>track.name==="Recoil").curves.position.knots.length>1);
  const snapshot=()=>[9,10].map(index=>Array.from(updater.GetAnimationTransforms()[index]));
  set.PlayAnimation(0,"Fire","Active");set.UpdateAsyncronous(updateContext({deltaTime:.01}));const first=snapshot();
  set.UpdateAsyncronous(updateContext({deltaTime:.2}));assert.deepEqual(snapshot(),first,"full joints remain static, not just mesh palette");
  set.PlayAnimation(0,"Deploy","Active");set.UpdateAsyncronous(updateContext({deltaTime:.2}));assert.notDeepEqual(snapshot(),first);
  const duration=set.PlayAnimation(0,"Deploy","Active",.25);
  const deltas=[.1,.15,1,1,duration-2+.3];
  for(const deltaTime of deltas)set.UpdateAsyncronous(updateContext({deltaTime}));
  const small=Array.from(updater.GetMeshBoneMatrixList()),elapsed=updater.GetAnimationLayer(null).queue[0].elapsed;
  set.PlayAnimation(0,"Deploy","Active",.25);set.UpdateAsyncronous(updateContext({deltaTime:duration+.55}));
  assert.deepEqual(Array.from(updater.GetMeshBoneMatrixList()),small);
  assert.ok(Math.abs(elapsed-(deltas.reduce((sum,delta)=>sum+Math.fround(delta),0)-duration-.25))<1e-8,"partitioned updates retain each float32 context delta");
  assert.ok(Math.abs(updater.GetAnimationLayer(null).queue[0].elapsed-(Math.fround(duration+.55)-duration-.25))<1e-8,"one large update uses its own float32 context delta");
});

// Independent scalar row-vector oracle; identical flat storage to gl matrices.
function carbonProduct(first,second)
{
  const out=new Float32Array(16);
  for(let row=0;row<4;row++)for(let column=0;column<4;column++)
  {let value=0;for(let k=0;k<4;k++)value+=first[row*4+k]*second[k*4+column];out[row*4+column]=value;}
  return out;
}

function inversePoint(matrix,point)
{
  const a=Array.from(matrix.slice(0,3)),b=Array.from(matrix.slice(4,7)),c=Array.from(matrix.slice(8,11));
  const cross=(x,y)=>[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]];
  const dot=(x,y)=>x[0]*y[0]+x[1]*y[1]+x[2]*y[2];
  const delta=point.map((value,i)=>value-matrix[12+i]),det=dot(a,cross(b,c));
  return [dot(delta,cross(b,c))/det,dot(delta,cross(c,a))/det,dot(delta,cross(a,b))/det];
}

function scalarQuaternionProduct(a,b)
{
  return [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
}

function scalarPoseWorld(pose,parents)
{
  const world=[];
  for(let index=0;index<pose.length;index++)
  {
    const {rotation:q,position:p,scaleShear:ss}=pose[index], [x,y,z,w]=q;
    const rotation=[1-2*(y*y+z*z),2*(x*y+w*z),2*(x*z-w*y),0,2*(x*y-w*z),1-2*(x*x+z*z),2*(y*z+w*x),0,2*(x*z+w*y),2*(y*z-w*x),1-2*(x*x+y*y),0,0,0,0,1];
    const scale=[ss[0],ss[1],ss[2],0,ss[3],ss[4],ss[5],0,ss[6],ss[7],ss[8],0,0,0,0,1];
    const local=carbonProduct(scale,rotation);local[12]=p[0];local[13]=p[1];local[14]=p[2];
    world[index]=parents[index]>=0 && parents[index]<pose.length?carbonProduct(local,world[parents[index]]):local;
  }
  return world;
}

function copyPose(turret)
{
  return turret.pose.boneTransforms.map(bone=>({position:Array.from(bone.position),rotation:Array.from(bone.rotation),scaleShear:Array.from(bone.scaleShear)}));
}

function assertScalars(actual,expected,message,tolerance=1e-5)
{
  for(let index=0;index<expected.length;index++)assert.ok(Math.abs(actual[index]-expected[index])<tolerance,`${message}[${index}]: ${actual[index]} vs ${expected[index]}`);
}

test("real turret aiming samples before yaw/pitch/height through a rotated scaled sheared hull",{skip},async t=>
{
  const {set,ship,resource}=await assets(t);ship.RebuildTurretPositions();set.Initialize();
  const parent=mat4.create();mat4.translate(parent,parent,[50,40,-30]);mat4.rotateZ(parent,parent,.6);mat4.rotateY(parent,parent,-.4);mat4.scale(parent,parent,[1.3,.8,2]);parent[4]+=.2;
  set.target.position.set([700,1100,-300]);set.trackingInfluence=0;set.UpdateAsyncronous(updateContext({deltaTime:.1}),parent);
  const base=set.GetTurrets().map(copyPose), influence=.65;
  set.sysBonePitchMin=-80;set.sysBonePitchMax=80;set.sysBonePitchFactor=.6;set.sysBonePitchOffset=7;set.sysBoneHeight=4;
  for(const updatePitchPose of [false,true])
  {
    set.updatePitchPose=updatePitchPose;set.trackingInfluence=influence;set.UpdateAsyncronous(updateContext({deltaTime:0}),parent);
    const targets=[];
    for(let index=0;index<2;index++)
    {
      const turret=set.GetTurrets()[index], expected=structuredClone(base[index]);
      const world=carbonProduct(turret.localMatrix,parent);assertScalars(turret.worldMatrix,world,"native local * parent");
      const target=inversePoint(world,Array.from(set.target.position));targets.push(target);
      const yaw=Math.atan2(target[0],target[2])*influence;
      expected[2].rotation=scalarQuaternionProduct([0,Math.sin(yaw/2),0,Math.cos(yaw/2)],expected[2].rotation);
      const pitchPosition=updatePitchPose?Array.from(scalarPoseWorld(expected,resource.GetSkeletonData(0).parents)[4].slice(12,15)):[0,0,0];
      const relative=target.map((v,i)=>v-pitchPosition[i]);let pitch=Math.asin(relative[1]/Math.hypot(...relative));
      if(updatePitchPose){const length=Math.hypot(...pitchPosition);const along=pitchPosition.reduce((sum,value,i)=>sum+value*target[i],0)/length;if(along<length)pitch=(relative[1]<0?-1:1)*Math.PI-pitch;}
      pitch=(.6*Math.min(80*Math.PI/180,Math.max(-80*Math.PI/180,pitch))+7*Math.PI/180)*influence;
      expected[4].rotation=scalarQuaternionProduct([-Math.sin(pitch/2),0,0,Math.cos(pitch/2)],expected[4].rotation);
      expected[3].position[1]+=Math.min(1,Math.max(0,target[1]/Math.hypot(...target)))*influence*4;
      for(const joint of [2,3,4]){assertScalars(turret.pose.boneTransforms[joint].rotation,expected[joint].rotation,"EveTurretAiming.cpp:45-146 rotation");assertScalars(turret.pose.boneTransforms[joint].position,expected[joint].position,"native height");}
      const expectedWorld=scalarPoseWorld(expected,resource.GetSkeletonData(0).parents);
      assertScalars(turret.worldTransforms[10],expectedWorld[10],"full current muzzle joint before world placement");
    }
    assert.notDeepEqual(targets[0],targets[1],"paired mounts see distinct target-local coordinates");
    const once=set.GetTurrets().map(copyPose);set.UpdateAsyncronous(updateContext({deltaTime:0}),parent);assert.deepEqual(set.GetTurrets().map(copyPose),once,"stationary frame must not accumulate aim");
    set.trackingInfluence=0;set.UpdateAsyncronous(updateContext({deltaTime:0}),parent);assert.deepEqual(set.GetTurrets().map(copyPose),base,"zero influence restores sampled pose");
  }
  set.trackingInfluence=influence;set._systemBoneID[EveTurretAiming.SystemBones.SYSBONE_ROTATION]=0xffffffff;
  set.UpdateAsyncronous(updateContext({deltaTime:0}),parent);assert.deepEqual(Array.from(set.GetTurrets()[0].pose.boneTransforms[2].rotation),base[0][2].rotation,"missing sentinel skips only yaw");
  assert.notDeepEqual(Array.from(set.GetTurrets()[0].pose.boneTransforms[4].rotation),base[0][4].rotation);
});

for(const geometryFirst of [false,true])test(`real muzzle binding handles ${geometryFirst?"geometry":"effect"} first and copies the current full joint`,{skip},async t=>
{
  const {set,ship}=await assets(t);ship.RebuildTurretPositions();
  set.geometryResPath="";set.InitializeGeometryResource();assert.equal(set.geometryResource,null);
  const bytes=await readFile(join(corpus,"pulse_mega_fx.black"));assert.equal(createHash("sha256").update(bytes).digest("hex"),"ec84e9ee2b9d9af295dff3ad7ad79551e8785027fd30a5121d4d92eaa31a1eb2");
  const effect=EveTurretFiringFX.from(CjsBlackFormat.readPayload(bytes).object);
  const duration=effect.firingDuration,initialize=t.mock.method(effect,"Initialize");
  const loadGeometry=()=>{set.geometryResPath=geometryPath;set.Initialize();};
  if(geometryFirst)loadGeometry();set.firingEffect=effect;if(!geometryFirst)loadGeometry();
  assert.equal(effect.GetPerMuzzleEffectCount(),1);assert.equal(effect.GetPerMuzzleBoneID(0),10,"cpp:320 binding must resolve at the arrival boundary, before any later geometry reload");
  set.Initialize();
  assert.equal(initialize.mock.callCount(),0,"native parent initialization and live setter do not reinitialize the already-hydrated FX");
  assert.equal(effect.firingDuration,duration,"resolved authored duration survives both arrival orders");
  assert.ok(duration>0);
  assert.equal(effect.GetPerMuzzleEffectCount(),1);assert.equal(effect.GetPerMuzzleBoneID(0),10,"cpp:320 prefix + 01 resolves full skeleton joint, not mesh binding");
  const parent=mat4.create();mat4.translate(parent,parent,[35,-18,22]);mat4.rotateY(parent,parent,.45);mat4.rotateX(parent,parent,-.3);mat4.scale(parent,parent,[1.2,.9,1.5]);
  set._activeTurret=1;set.trackingInfluence=.8;set.target.position.set([700,500,300]);set.PlayAnimation(1,"Deploy","Active");
  set.UpdateAsyncronous(updateContext({deltaTime:.2}),parent);const turret=set.GetTurrets()[1];
  assert.equal(turret.sequencer.GetMeshBoneCount(),9,"muzzle10 cannot index the9-bone skin palette");
  const expected=carbonProduct(turret.worldTransforms[10],turret.worldMatrix);
  assertScalars(set.GetFiringBoneWorldTransform(0),expected,"native full bone * turret world");
  assertScalars(effect.GetMuzzleTransform(0),expected,"same-frame FX muzzle upload");
  const retained=set.GetTurretBoneTransform(1,10),retainedValues=Array.from(retained);set.GetTurretBoneTransform(0,10);assert.deepEqual(Array.from(retained),retainedValues,"native return value is caller-owned" );
  const before=Array.from(expected);set.UpdateAsyncronous(updateContext({deltaTime:2}),parent);
  const next=carbonProduct(turret.worldTransforms[10],turret.worldMatrix);
  assert.notDeepEqual(Array.from(next),before);assertScalars(effect.GetMuzzleTransform(0),next,"animated muzzle is not one frame stale");
  set._activeTurret=EveTurretSet.INVALID_INDEX;set.chooseRandomLocator=false;
  const closest=set.GetClosestTurret();assert.ok(closest===0 || closest===1);
  assertScalars(set.GetFiringBoneWorldTransform(0),carbonProduct(set.GetTurrets()[closest].worldTransforms[10],set.GetTurrets()[closest].worldMatrix),"no active turret temporarily uses closest");
});

test("native missing-joint and unloaded-pose muzzle fallbacks preserve transform order and effect registry",{skip},async t=>
{
  const {set,ship,resource}=await assets(t);ship.RebuildTurretPositions();set.Initialize();
  const bytes=await readFile(join(corpus,"pulse_mega_fx.black")),makeEffect=()=>EveTurretFiringFX.from(CjsBlackFormat.readPayload(bytes).object);
  const registry=new EveComponentRegistry();set.Register(registry);
  const old=makeEffect(),effect=makeEffect();set.firingEffect=old;set.firingEffect=effect;
  assert.equal(old.GetComponentRegistry(),null);assert.ok(effect.GetComponentRegistry()===registry);
  const parent=mat4.create();mat4.translate(parent,parent,[60,20,10]);mat4.rotateZ(parent,parent,.3);set.UpdateAsyncronous(updateContext({deltaTime:0}),parent);set._activeTurret=0;
  const turret=set.GetTurrets()[0];effect.boneName="Absent";set.InitializeFiringEffect();assert.equal(effect.GetPerMuzzleBoneID(0),0xffffffff);
  assertScalars(set.GetFiringBoneWorldTransform(0),turret.worldMatrix,"missing joint returns turret center before orientation fallback");
  set.useLowLodFiringTransform=true;set.lowLodFiringEffectTranslation.set([2,3,7]);set.lowLodFiringEffectScale.set([2,1,3]);set.lowLodFiringEffectRotation.set([0,Math.sin(.2),0,Math.cos(.2)]);
  const low=mat4.fromRotationTranslationScale(mat4.create(),set.lowLodFiringEffectRotation,set.lowLodFiringEffectTranslation,set.lowLodFiringEffectScale);
  assertScalars(set.GetFiringBoneWorldTransform(0),carbonProduct(low,turret.worldMatrix),"native lowLOD * turretWorld");
  effect.boneName="Pos_Fire";set.InitializeFiringEffect();resource.MarkPurged();assert.equal(turret.pose,null);
  assertScalars(set.GetFiringBoneWorldTransform(0),carbonProduct(low,turret.worldMatrix),"unloaded pose uses lowLOD even with retained valid joint ID");
  set.useLowLodFiringTransform=false;set.sysBonePitchMin=0;set.target.position.set([800,900,500]);
  const direct=set.GetFiringBoneWorldTransform(0),direction=Array.from(set.target.position).map((v,i)=>v-turret.worldMatrix[12+i]);const length=Math.hypot(...direction);
  assertScalars(direct.slice(8,11),direction.map(v=>v/length),"native RotationArc normalizes the non-unit target direction");
  assertScalars(direct.slice(12,15),turret.worldMatrix.slice(12,15),"direct fallback preserves position");
  set.sysBonePitchMin=60;const launcher=mat4.fromXRotation(mat4.create(),-Math.PI/2);
  assertScalars(set.GetFiringBoneWorldTransform(0),carbonProduct(launcher,turret.worldMatrix),"narrow launcher rotates local +Y to effect +Z");
  set.firingEffect=null;assert.equal(effect.GetComponentRegistry(),null);assertScalars(set.GetFiringBoneWorldTransform(0),turret.worldMatrix,"no effect returns turret matrix");
  set._activeTurret=EveTurretSet.INVALID_INDEX;set.GetTurrets().length=0;assertScalars(set.GetFiringBoneWorldTransform(0),parent,"no mount returns parent matrix");
  set.UnRegister(registry);
});

test("first actual firing without an active turret initializes muzzle positions from the parent once",{skip},async t=>
{
  const {set,ship}=await assets(t);ship.RebuildTurretPositions();set.Initialize();
  const bytes=await readFile(join(corpus,"pulse_mega_fx.black"));
  const effect=EveTurretFiringFX.from(CjsBlackFormat.readPayload(bytes).object);set.SetFiringEffect(effect);
  const parent=mat4.fromTranslation(mat4.create(),[80,20,-30]);
  effect.PrepareFiring(0);set.UpdateAsyncronous(updateContext({deltaTime:.1,currentTime:1}),parent);
  assert.equal(set._firingEffectMuzzlePosSet,false,"no active turret: do not replace the muzzle with a closest mount during update");
  set.UpdateAsyncronous(updateContext({deltaTime:.1,currentTime:1.1}),parent);
  assert.equal(set._firingEffectMuzzlePosSet,true);assertScalars(effect.GetMuzzleTransform(0),parent,"cpp:1481 first-start parent fallback");
  const next=mat4.fromTranslation(mat4.create(),[180,30,-40]);set.UpdateAsyncronous(updateContext({deltaTime:.1,currentTime:1.2}),next);
  assertScalars(effect.GetMuzzleTransform(0),parent,"native fallback is initialized once");
});

test("normal hull ParentData and visible palettes share one Float4x3 upload with current/previous offsets",{skip},async t=>
{
  const {set,ship,resource}=await assets(t);ship.RebuildTurretPositions();set.Initialize();
  Tr2RingBuffer.ResetInstances();t.after(()=>Tr2RingBuffer.ResetInstances());
  const context=new Tr2RenderContext(),al=new Tr2RenderContextALStub();al.CreateDevice({mode:{width:64,height:64}});context.SetRenderContextAL(al);
  const ring=Tr2RingBuffer.GetInstance("Float4x3",48,context);ring.UploadTransforms(new Float32Array(24),2);
  const uploads=[],upload=ring.UploadTransforms.bind(ring);ring.UploadTransforms=(data,count)=>{uploads.push({data:Array.from(data),count});return upload(data,count);};
  const store=makePerObjectStore(),accumulator={Alloc:name=>store.Allocate(name)};
  const uint=(record,name)=>{const view=record.Get(name);return new Uint32Array(view.buffer,view.byteOffset,1)[0];};
  const first=mat4.create();mat4.translate(first,first,[50,20,-30]);mat4.rotateY(first,first,.35);mat4.copy(ship.worldTransform,first);
  ship.spaceObjectShipData.set([2,3,4,5]);ship._psData.Set("clipSphereCenter",[6,7,8]);ship._psData.Set("clipRadiusSq",[100]);ship._psData.Set("clipRadius2Sq",[200]);ship._psData.Set("clipSphereFactor",[.25]);ship._psData.Set("clipSphereFactor2",[.75]);
  set.PlayAnimation(0,"Deploy","Active");ship.UpdateTurretsAsyncronous(updateContext({deltaTime:.4}));
  assert.ok(set._parentData!==ship._turretParentData,"native ParentData is copied by value");
  ship._turretParentData.shipData[0]=999;
  const view={GetFrustum:()=>({IsSphereVisible:()=>true,GetPixelSizeAccross:()=>25})};set.UpdateVisibility(view);
  assert.equal(set.visibleCount,2);assert.equal(set.estimatedPixelDiameter,25);
  const data=set.GetPerObjectData(accumulator);
  assert.deepEqual(Array.from(data.ps.Get("shipData")),[2,3,4,5],"EveMobile.cpp:213-231 forwards the native ship data");
  assert.deepEqual(Array.from(data.ps.Get("clipData1")),[6,7,8,100]);assert.equal(data.ps.Get("clipRadius2Sq")[0],200);
  assert.equal(set._parentData.clipFactor,.25);assert.equal(set._parentData.clipFactor2,.75);
  assert.equal(uint(data.vs,"currentBoneOffset"),2);assert.equal(uint(data.vs,"prevBoneOffset"),2);
  assert.equal(uploads.length,1);assert.equal(uploads[0].count,18);assert.equal(uploads[0].data.length,216);
  const [a,b]=set.GetTurrets();const firstPalette=Array.from(a.sequencer.GetMeshBoneMatrixList()),secondPalette=Array.from(b.sequencer.GetMeshBoneMatrixList());
  assert.notDeepEqual(firstPalette,secondPalette,"Deploy makes compaction order observable");assert.deepEqual(uploads[0].data,firstPalette.concat(secondPalette));
  assertScalars(data.vs.Get("turretTranslation").slice(0,4),a.localPosition,"first instance placement");assertScalars(data.vs.Get("turretTranslation").slice(4,8),b.localPosition,"second instance placement");
  set.GetShadowPerObjectData(accumulator);assert.equal(uploads.length,1,"shadow pass cannot upload again in same frame");assert.equal(ring.head,20);
  const second=mat4.clone(first);second[12]+=100;mat4.copy(ship.worldTransform,second);
  set.UpdateSyncronous(updateContext({deltaTime:.1,GetVisibilityThreshold:()=>1}),second);ship.UpdateTurretsAsyncronous(updateContext({deltaTime:.1}));
  let call=0;set.UpdateVisibility({GetFrustum:()=>({IsSphereVisible:()=>call++===1,GetPixelSizeAccross:()=>12})});
  assert.equal(set.visibleCount,1);assert.equal(set.estimatedPixelDiameter,12,"cpp:1164 synchronous LOD selection consumes the prior views estimate");
  const compact=set.GetPerObjectData(accumulator);
  assertScalars(compact.vs.GetTransposed("prevShipMatrix"),Array.from({length:16},(_,i)=>first[(i%4)*4+Math.floor(i/4)]),"normal sync+async retains previous hull placement");
  assert.equal(uint(compact.vs,"currentBoneOffset"),20);assert.equal(uint(compact.vs,"prevBoneOffset"),2);
  assert.equal(uploads[1].count,9);assert.deepEqual(uploads[1].data,Array.from(b.sequencer.GetMeshBoneMatrixList()));
  assertScalars(compact.vs.Get("turretTranslation").slice(0,4),b.localPosition,"hidden first mount compacts second into instance0");
  ship.UpdateTurretsAsyncronous(updateContext({deltaTime:0}));a.visible=false;b.visible=true;b.valid=false;
  const invalid=set.GetPerObjectData(accumulator);assert.deepEqual(Array.from(invalid.vs.Get("turretTranslation").slice(0,4)),[0,0,0,1]);
  assert.deepEqual(uploads[2].data,Array.from({length:9},()=>[1,0,0,0,0,1,0,0,0,0,1,0]).flat(),"visible invalid record has native identity skin data");
  set.GetTurrets().length=0;ship.UpdateTurretsAsyncronous(updateContext({deltaTime:0}));assert.equal(set._boneOffsets.GetCurrentFrameOffset(),0xffffffff);assert.equal(set._boneOffsets.GetPreviousFrameOffset(),29);
  set.display=false;set.UpdateVisibility(view);assert.equal(set.visibleCount,0);
  resource.MarkPurged();assert.equal(set.GetPerObjectData(accumulator),null,"native bad-resource gate");
});

test("real packed turret shader receives native instance IDs and final opaque/shadow draw offsets",{skip},async t=>
{
  const context=Tr2RenderContext_GetMainThreadRenderContext(),prior=context.GetRenderContextAL();
  const al=new Tr2RenderContextALStub();context.SetRenderContextAL(al);al.CreateDevice();al.BeginScene();
  const shared=SharedGeometryBuffer(context);
  shared.Allocate(12,10,new Uint8Array(120),context);
  const allocate=shared.Allocate.bind(shared),instanceUploads=[];
  shared.Allocate=(stride,count,data,ctx)=>{if(stride===4&&count===24)instanceUploads.push(Array.from(data));return allocate(stride,count,data,ctx);};
  t.after(()=>{shared.ReleaseResources();context.SetRenderContextAL(prior);});
  const {set,ship,resource}=await assets(t);ship.RebuildTurretPositions();set.Initialize();
  assert.deepEqual(instanceUploads[0],Array.from({length:24},(_,i)=>i),"native cpp:296 IDs0..23");
  assert.ok(TriDevice.GetResourcesRegistered().includes(set),"native Tr2DeviceResource base registration");
  const bytes=await readFile(join(corpus,"quadv5.sm_depth"));
  assert.equal(createHash("md5").update(bytes).digest("hex"),"352fc276516262e229648fa98310bb17");
  const metadata=CjsHlslFormat.read(bytes,{emit:"metadata",source:"quadv5.sm_depth",permutation:[{name:"SPACE_OBJECT_CLIPPING",value:"SOC_DISABLED"},{name:"V5_DEBUG",value:"OFF"}]});
  const inputs=metadata.effect.techniques.find(item=>item.name==="Main").passes[0].stageInputs.find(item=>item?.stageName==="vertex").signature.pipelineInputs;
  const idInput=inputs.find(item=>item.usage===5&&item.usageIndex===2);
  assert.equal(idInput.registerIndex,5);assert.equal(idInput.usedMask,1);
  let currentInputs=inputs;
  const state={_vertexLayout:null,_streams:[],_shaderProgram:{GetInputs:()=>currentInputs}};
  const layout=al.SetVertexLayout.bind(al),stream=al.SetStreamSource.bind(al),draw=al.DrawIndexedInstanced.bind(al),draws=[];
  al.SetVertexLayout=value=>{state._vertexLayout=value;return layout(value);};
  al.SetStreamSource=(index,buffer,offset,stride)=>{state._streams[index]={buffer,offset,stride};return stream(index,buffer,offset,stride);};
  al.DrawIndexedInstanced=(...args)=>{
    const layouts=CjsWebgpuRenderContextAL.prototype.BuildVertexBufferLayouts.call(state);
    assert.notEqual(typeof layouts,"string",String(layouts));
    assert.ok(state._streams[1].buffer===set._instanceBuffer.GetBuffer(),"real instance allocation bound at final draw");
    assert.equal(layouts[1].arrayStride,4);assert.equal(layouts[1].stepMode,"instance");
    const location=currentInputs.find(item=>item.usage===5&&item.usageIndex===2).registerIndex;
    assert.deepEqual(layouts[1].attributes.find(item=>item.shaderLocation===location),{shaderLocation:location,offset:0,format:"float32"},"native TEXCOORD2 cannot be supplied by a dummy stream");
    draws.push(args);return draw(...args);
  };
  // Only pass execution is stubbed: geometry, metadata, declaration conversion,
  // allocations, batch submission and final AL draw are the real Node path.
  const shader={GetTechniqueIndex:name=>{currentInputs=metadata.effect.techniques.find(item=>item.name===name).passes[0].stageInputs.find(item=>item?.stageName==="vertex").signature.pipelineInputs;return 0;},GetPassCount:()=>1,GetShaderTypeMask:()=>3,ApplyAllStateForPass(){}};
  set.turretEffect={GetShaderStateInterface:()=>shader,ApplyMaterialDataForPass(){}};
  set.displayEffects=false;
  const coefficients=ship._psData.Get("shLightingCoefficients");for(let i=0;i<coefficients.length;i++)coefficients[i]=i+.25;
  const renderables=ship.GetRenderables([]);assert.ok(renderables.includes(set),"EveMobile.cpp:291 forwards the turret renderable and SH span");
  assert.ok(set._parentShLighting.buffer===coefficients.buffer);assert.equal(set._parentShLighting.byteOffset,coefficients.byteOffset,"RawData.Get creates views of the same borrowed coefficient span");
  Tr2RingBuffer.ResetInstances();Tr2RingBuffer.GetInstance("Float4x3",48,context);t.after(()=>Tr2RingBuffer.ResetInstances());
  const store=makePerObjectStore(),pod=set.GetPerObjectData({Alloc:name=>store.Allocate(name)});
  for(let i=0;i<7;i++)assert.deepEqual(Array.from(pod.ps.GetIndex("shLightingCoefficients",i)),Array.from(coefficients.subarray(i*4,i*4+4)));
  const committed=[],accumulator={Commit(batch){if(!batch.IsValid())return false;committed.push(batch);return true;}};
  assert.equal(set.GetBatches(accumulator,TriBatchType.TRIBATCHTYPE_OPAQUE,pod),true);
  const lod=resource.GetMeshLodByIndex(0,0),batch=committed[0];
  const expected=[5760,2,lod.indexAllocation.GetStartIndex(),lod.vertexAllocation.GetOffset()/lod.vertexAllocation.GetStride(),set._instanceBuffer.GetOffset()/4];
  assert.ok(expected[2]>0&&expected[3]>0&&expected[4]>0,"all shared offsets are nonzero");
  assert.equal(batch.geometrySource,null);context.RenderBatches({GetBatches:()=>[batch]});assert.deepEqual(draws.at(-1),expected);
  assert.equal(set.GetShadowBatches(accumulator,pod,-12345),true);context.RenderBatches({GetBatches:()=>[committed.at(-1)]},"Shadow");assert.deepEqual(draws.at(-1),expected);
  assert.equal(set.GetBatches(accumulator,TriBatchType.TRIBATCHTYPE_ADDITIVE,pod),false);
  set.display=false;assert.equal(set.GetBatches(accumulator,TriBatchType.TRIBATCHTYPE_OPAQUE,pod),false);assert.equal(set.GetShadowBatches(accumulator,pod,100),false);set.GetRenderables([]);assert.equal(set._parentShLighting,null);set.display=true;
  set.visibleCount=0;assert.equal(set.GetShadowBatches(accumulator,pod,100),false);set.visibleCount=2;
  const saved=resource.GetMeshLodByIndex;resource.GetMeshLodByIndex=()=>null;assert.equal(set.GetShadowBatches(accumulator,pod,100),false);resource.GetMeshLodByIndex=saved;
  set.ReleaseResources();assert.equal(set._instanceBuffer.IsValid(),false);assert.equal(set.GetShadowBatches(accumulator,pod,100),false);
  const firstCount=instanceUploads.length;const allocating=shared.Allocate;shared.Allocate=()=>null;
  assert.equal(set.PrepareResources(),true,"native OnPrepareResources returns true after void InitializeInstanceBuffer");assert.equal(set._instanceBuffer.IsValid(),false);assert.equal(set.GetShadowBatches(accumulator,pod,100),false);shared.Allocate=allocating;
  assert.equal(set.PrepareResources(),true);assert.equal(instanceUploads.length,firstCount+1);assert.equal(set.GetShadowBatches(accumulator,pod,100),true);
  resource.MarkPurged();assert.equal(set.GetShadowBatches(accumulator,pod,100),false);
  set.Destroy();set.Destroy();assert.equal(TriDevice.GetResourcesRegistered().includes(set),false);assert.equal(set._instanceBuffer.IsValid(),false);
  assert.equal(set.GetBatches(accumulator,TriBatchType.TRIBATCHTYPE_OPAQUE,pod),false);
});

// Independent scalar oracle: native bone-local OBB corner order and incremental
// BoundingSphereUpdate, including Float32 storage at each native output write.
function poseBoundsOracle(bindings, transforms, placement = [0,0,0])
{
  const sphere=new Float32Array(4),min=new Float32Array([Infinity,Infinity,Infinity]),max=new Float32Array([-Infinity,-Infinity,-Infinity]);
  for(const {joint,lo,hi} of bindings)
  {
    const corners=[lo,hi,[lo[0],lo[1],hi[2]],[lo[0],hi[1],lo[2]],[lo[0],hi[1],hi[2]],[hi[0],lo[1],lo[2]],[hi[0],lo[1],hi[2]],[hi[0],hi[1],lo[2]]];
    const m=transforms[joint];
    for(const c of corners)
    {
      const point=Array.from({length:3},(_,i)=>Math.fround(c[0]*m[i]+c[1]*m[i+4]+c[2]*m[i+8]+m[i+12]));
      for(let i=0;i<3;i++){min[i]=Math.min(min[i],point[i]);max[i]=Math.max(max[i],point[i]);}
      const d=point.map((v,i)=>v-sphere[i]),sq=d.reduce((a,v)=>a+v*v,0),r=sphere[3];
      if(sq>r*r+1e-4){const distance=Math.sqrt(sq),factor=.5*(1-r/distance);for(let i=0;i<3;i++)sphere[i]+=d[i]*factor;sphere[3]=.5*(r+distance);}
    }
  }
  for(let i=0;i<3;i++){sphere[i]+=placement[i];min[i]+=placement[i];max[i]+=placement[i];}
  return {sphere,min,max};
}

test("native turret LOD consumes maximum view estimate, releases and reloads poses, and freeze reloads",{skip},async t=>
{
  const {set,ship,resource}=await assets(t);ship.RebuildTurretPositions();set.Initialize();set.UpdateAsyncronous(updateContext({deltaTime:0}));
  set.firingEffect=new EveTurretFiringFX();
  const threshold=updateContext({GetVisibilityThreshold:()=>3,deltaTime:0});
  const mounts=set.GetTurrets().map(x=>Array.from(x.localMatrix)),oldPose=set.GetTurrets()[0].pose;
  assert.equal(set.UpdateLOD(threshold),false,"cpp:1146 unreliable -1 does not select LOD");
  const view=pixels=>({GetFrustum:()=>({IsSphereVisible:()=>true,GetPixelSizeAccross:()=>pixels})});
  set.UpdateVisibility(view(20));set.UpdateVisibility(view(1));assert.equal(set.estimatedPixelDiameter,20);
  set.UpdateSyncronous(threshold);assert.equal(set.lodLevel,EveTurretSet.LOD.LOD_HIGHEST);assert.equal(set.estimatedPixelDiameter,-1);
  set.UpdateVisibility(view(5.999));set.UpdateSyncronous(threshold);
  assert.equal(set.lodLevel,EveTurretSet.LOD.LOD_EMPTY);assert.equal(set.geometryResource,null);assert.equal(set.GetTurrets()[0].pose,null);assert.equal(set.firingEffect.GetDisplaySourceObject(),false);
  assert.deepEqual(set.GetTurrets().map(x=>Array.from(x.localMatrix)),mounts,"native resource LOD leaves placements intact");
  resource.MarkPrepared();assert.equal(set._skeleton,null,"unsubscribed resource completion cannot resurrect EMPTY LOD");
  set.UpdateVisibility(view(6));set.UpdateSyncronous(threshold);
  assert.equal(set.lodLevel,EveTurretSet.LOD.LOD_HIGHEST);assert.ok(set.geometryResource===resource);assert.ok(set.GetTurrets()[0].pose!==oldPose);assert.equal(set.firingEffect.GetDisplaySourceObject(),true);
  set.estimatedPixelDiameter=0;set.FreezeHighDetailLOD();assert.equal(set.lodLevel,EveTurretSet.LOD.LOD_DISABLED);
  assert.equal(set.UpdateLOD(threshold),false);assert.equal(set.estimatedPixelDiameter,0,"cpp:1133 disabled returns before estimate reset");
  const empty=new EveTurretSet();t.after(()=>empty.Destroy());empty.estimatedPixelDiameter=99;empty.UpdateSyncronous(threshold);assert.equal(empty.estimatedPixelDiameter,99,"cpp:1175 no-mount gate");
});

test("GR2 and CMF turret bounds follow donor traversal, animated world joints and optional output gates",{skip},async t=>
{
  const {set,ship,resource,resources}=await assets(t);ship.RebuildTurretPositions();set.Initialize();
  const bytes=await readFile(join(corpus,"pulse_mega_t1.gr2"));
  const cmf=new TriGeometryRes();cmf.SetPayload(CjsCmfFormat.loadShared(CjsGr2Format.read(bytes,{rebuildMissingBounds:true})));cmf.MarkPrepared();
  for(const [label,geometry] of [["GR2",resource],["CMF",cmf]])
  {
    resources.set(geometryPath,geometry);set.Initialize();set.useDynamicBounds=true;set.OnModified("useDynamicBounds");
    set.PlayAnimation(0,"Deploy","Active");set.UpdateAsyncronous(updateContext({deltaTime:.8}));
    const turret=set.GetTurrets()[0],names=set._skeleton.bones;
    const bindings=[];
    if(label==="CMF")for(const mesh of geometry.GetCMFData().meshes){if(mesh.skeleton===0)for(let joint=0;joint<names.length;joint++){const b=mesh.boneBindings.find(x=>x.name===names[joint]);if(b)bindings.push({joint,lo:b.bounds.min,hi:b.bounds.max});}}
    else {const fi=geometry.GetGrannyInfo();for(const index of fi.models[0].meshBindings)for(const b of fi.meshes[index].boneBindings)bindings.push({joint:names.indexOf(b.name),lo:b.minBounds,hi:b.maxBounds});}
    assert.deepEqual(set._boneBounds.map(x=>x.boneIndex),bindings.map(x=>x.joint),label+" cpp:524/595 native traversal");
    assert.ok(bindings.length>=9,"fixture retains its actual model-zero/skeleton-zero bindings");
    const placement=label==="GR2"?geometry.GetGrannyInfo().models[0].initialPlacement.position:[0,0,0];
    const oracle=poseBoundsOracle(bindings,turret.worldTransforms,placement);
    const sphere=new Float32Array(4),min=new Float32Array(3),max=new Float32Array(3);
    assert.equal(set.GetDynamicBounds(turret,sphere,min,max),true);
    assertScalars(sphere,oracle.sphere,label+" native incremental sphere");assertScalars(min,oracle.min,label+" world bounds min");assertScalars(max,oracle.max,label+" world bounds max");
    min.fill(123);assert.equal(set.GetDynamicBounds(turret,null,min,null),true);assert.deepEqual(Array.from(min),[123,123,123],"cpp:675 both AABB pointers required");
    set.GetTurrets()[1].valid=false;set.GetLocalBoundingBox(min,max);assertScalars(min,oracle.min,"cpp:1814 no mount offset in local bounds");
    const before=Array.from(sphere);set.PlayAnimation(0,"Deploy","Active");set.UpdateAsyncronous(updateContext({deltaTime:.1}));set.GetDynamicBounds(turret,sphere);assert.notDeepEqual(Array.from(sphere),before,"pose bounds move with actual Deploy");
    let captured;set.UpdateVisibility({GetFrustum:()=>({IsSphereVisible:value=>{captured??=Array.from(value);return true;},GetPixelSizeAccross:()=>40})});
    const expectedCenter=Array.from({length:3},(_,i)=>sphere[0]*turret.worldMatrix[i]+sphere[1]*turret.worldMatrix[i+4]+sphere[2]*turret.worldMatrix[i+8]+turret.worldMatrix[i+12]);
    assertScalars(captured.slice(0,3),expectedCenter,"dynamic sphere transformed by mount for culling");
    geometry.MarkPurged();sphere.fill(17);assert.equal(set.GetDynamicBounds(turret,sphere),false);assert.deepEqual(Array.from(sphere),[17,17,17,17]);
    geometry.MarkPrepared();assert.ok(set._boneBounds.length);set.UpdateAsyncronous(updateContext({deltaTime:0}));assert.equal(set.GetDynamicBounds(turret,sphere),true);
    set.useDynamicBounds=false;set.OnModified("useDynamicBounds");assert.equal(set._boneBounds.length,0);min.fill(8);assert.equal(set.GetLocalBoundingBox(min,max),false);assert.deepEqual(Array.from(min),[8,8,8]);
  }
});

test("native ambient instances copy controlled source, isolate controller state and survive hull registration",{skip},async t=>
{
  const {set,ship,resource}=await assets(t);ship.RebuildTurretPositions();set.Initialize();
  const source=new EveChildContainer();source.name="controlled ambient fixture";source.AddToEffectChildrenList(new EveChildContainer());
  const registry=new EveComponentRegistry();set.Register(registry);set.ambientEffect=source;
  const initializeSource=t.mock.method(source,"Initialize");
  set.Initialize();assert.equal(initializeSource.mock.callCount(),0);
  const generated=set.GetAmbientEffectOrGeneratedEffect(),[a,b]=generated.instances;
  assert.equal(generated.Initialize,undefined,"the generated container has no Initialize contract");
  assert.equal(generated.instances.length,2);assert.ok(a.objects[0]!==source && a.objects[0]!==b.objects[0]);assert.ok(a.objects[0].objects[0]!==b.objects[0].objects[0]);
  assert.ok(a.GetParent()===generated && a.objects[0].GetParent()===a);assert.ok(a.IsInRegistry() && b.IsInRegistry());
  assertScalars(a.translation,set.GetTurrets()[0].localPosition.slice(0,3),"cpp:393 ambient mount placement");
  generated.SetControllerVariable("TurretState",3);set.SetAmbientEffectControllerVariableOnInstance(0,"TurretState",4);
  assert.equal(a._controllerVariables.get("TurretState"),4);assert.equal(b._controllerVariables.get("TurretState"),3);
  assert.equal(a.objects[0]._controllerVariables.get("TurretState"),4);assert.equal(source._controllerVariables.get("TurretState"),3);
  const transform=mat4.clone(set.GetTurrets()[0].localMatrix);transform[12]+=42;set.SetLocalTransform(0,transform);assert.equal(a.translation[0],transform[12]);
  set.SetLocalTransform(2,transform);assert.equal(generated.instances.length,2,"cpp:1790 late locator updates existing instances only");
  set.InitializeAmbientEffect();assert.equal(set.generatedDistributedAmbientEffect.instances.length,3);assert.equal(generated.IsInRegistry(),false);assert.equal(a.IsInRegistry(),false);
  set.ambientEffectEditingMode=true;set.OnModified("ambientEffectEditingMode");assert.ok(set.GetAmbientEffectOrGeneratedEffect()===source);
  set.Initialize();assert.equal(initializeSource.mock.callCount(),0,"editing mode also preserves child lifecycle ownership");
  const parent=mat4.create();mat4.rotateY(parent,parent,.7);mat4.translate(parent,parent,[2,5,9]);set.SetParentTransform(parent);
  let observed;source.UpdateSyncronous=(_context,params)=>{observed={visible:params.isVisible,matrix:Array.from(params.localToWorldTransform)};};
  set._parentData.clipRadiusSq=1;set.UpdateSyncronous(updateContext({deltaTime:0}));assert.equal(observed.visible,false);
  assertScalars(observed.matrix,carbonProduct(set.GetTurrets()[0].localMatrix,parent),"cpp:1273 ambient editing offset order under rotation");
  set.SetAmbientEffectControllerVariableOnInstance(200,"TurretState",5);assert.equal(source._controllerVariables.get("TurretState"),5,"editing ignores instance index");
  let ambientLod;source.UpdateVisibility=(_context,_parent,lod)=>{ambientLod=lod;};
  for(const [turretLod,childLod] of [[EveTurretSet.LOD.LOD_INVALID,Tr2Lod.TR2_LOD_UNSPECIFIED],[EveTurretSet.LOD.LOD_EMPTY,Tr2Lod.TR2_LOD_LOW],[EveTurretSet.LOD.LOD_HIGHEST,Tr2Lod.TR2_LOD_HIGH]]){set.lodLevel=turretLod;set.UpdateVisibility({GetFrustum:()=>({IsSphereVisible:()=>false})});assert.equal(ambientLod,childLod);}
  set.ambientEffectEditingMode=false;set.OnModified("ambientEffectEditingMode");set.SetAmbientEffect(null);assert.equal(set.GetAmbientEffectOrGeneratedEffect(),null);assert.equal(source.IsInRegistry(),false);
  set.Destroy();resource.MarkPrepared();assert.equal(set.geometryResource,null);assert.equal(set.IsInRegistry(),false);assert.equal(TriDevice.GetResourcesRegistered().includes(set),false);
  ship.turretSets.length=0;assert.equal(ship.GetRenderables([]).includes(set),false,"removed/destroyed turret is not collected");
});

test("instance container native copier, bone wrapper, reset and boundary quirk",()=>
{
  const container=new EveChildInstanceContainer(),source=new EveChildContainer(),registry=new EveComponentRegistry(),owner=new EveShip2();
  container.Register(registry);container.SetOwner(owner);container.SetPartTag(9);container.SetSourceEffect(source);container.SetControllerVariable("Queued",7);
  container.transformModifiers.push(new EveChildModifierAttachToBone());
  container.AddInstanceTransform([1,2,3],[0,0,0,1],[4,5,6],2);
  const old=container.instances[0],translation=old.objects[0],copy=translation.objects[0];
  assert.ok(copy!==source);assert.ok(copy.transformModifiers[0]===container.transformModifiers[0],"cpp:251 shares added modifier, not a second clone");
  assert.equal(old.transformModifiers[0].boneIndex,2);assert.equal(translation._controllerVariables.get("Queued"),7);assert.ok(old.GetOwner()===owner);assert.equal(old.GetPartTag(),9);
  assert.equal(container.reset,false);container.reset=true;
  container.UpdateSyncronous(new EveUpdateContext(),new EveChildUpdateParams());
  assert.equal(container.reset,false);assert.equal(old.IsInRegistry(),false);assert.equal(old.GetParent(),null);assert.equal(old.GetOwner(),null);assert.ok(container.instances[0]!==old);
  assert.throws(()=>container.SetControllerVariableForInstance(1,"Boundary",1),TypeError,"Carbon bug cpp:559 admits index==size");
  assert.throws(()=>container.HandleControllerEventForInstance(1,"Boundary"),TypeError,"Carbon bug cpp:570 admits index==size");
  assert.doesNotThrow(()=>container.SetControllerVariableForInstance(2,"Ignored",1));assert.doesNotThrow(()=>container.HandleControllerEventForInstance(-1,"Ignored"));
  container.ClearInstanceList();assert.equal(container.instances.length,0);container.UnRegister(registry);
});



test("controlled bounds projection distinguishes all CMF meshes from GR2 model zero",{skip},async t=>
{
  const {set,ship,resource}=await assets(t);ship.RebuildTurretPositions();set.Initialize();set.useDynamicBounds=true;set.UpdateAsyncronous(updateContext({deltaTime:0}));
  const names=set._skeleton.bones,lo=[-2,-3,-4],hi=[5,6,7];
  const cmfBinding=name=>({name,bounds:{min:lo,max:hi}});
  const projection={skeletons:[set._skeleton],meshes:[{skeleton:0,boneBindings:[cmfBinding(names[4]),cmfBinding(names[0])]},{skeleton:1,boneBindings:[cmfBinding(names[2])]},{skeleton:0,boneBindings:[cmfBinding(names[3]),cmfBinding(names[1])]}]};
  set.InitializeDynamicBounds(projection,set._skeleton);
  assert.deepEqual(set._boneBounds.map(b=>b.boneIndex),[0,4,1,3],"cpp:562 each skeleton-zero mesh, then skeleton bone order");
  const grannyBinding=name=>({name,minBounds:lo,maxBounds:hi});
  set.InitializeGrannyDynamicBounds({models:[{meshBindings:[0]},{meshBindings:[1]}],meshes:[{boneBindings:[grannyBinding(names[4]),grannyBinding(names[0])]},{boneBindings:[grannyBinding(names[2])]}]},set._skeleton);
  assert.deepEqual(set._boneBounds.map(b=>b.boneIndex),[4,0],"cpp:625 only model zero, preserving binding order");
  const min=new Float32Array(3),max=new Float32Array(3),sphere=new Float32Array(4),turret=set.GetTurrets()[0];
  const position=resource.GetGrannyInfo().models[0].initialPlacement.position,previous=Array.from(position);
  try
  {
    for(let i=0;i<3;i++)position[i]=[70,-30,11][i];
    set.GetDynamicBounds(turret,sphere,min,max);
    const expected=poseBoundsOracle([4,0].map(joint=>({joint,lo,hi})),turret.worldTransforms,position);
    assertScalars(sphere,expected.sphere,"cpp:745 GR2 placement addition");assertScalars(min,expected.min,"GR2 placement min");assertScalars(max,expected.max,"GR2 placement max");
  }
  finally{for(let i=0;i<3;i++)position[i]=previous[i];}
});


test("hull-to-turret quad forwarding observes firing, display and ambient clip gates",()=>
{
  const ship=new EveShip2(),set=new EveTurretSet(),effect=new EveTurretFiringFX(),ambient=new EveChildContainer();
  const calls=[],renderer={},frustum={};
  // Controlled endpoint implements the native IEveFiringEffectElement quad contract.
  effect.stretch.push({RegisterWithQuadRenderer:q=>calls.push(["fire-register",q]),AddQuadsToQuadRenderer:(f,q)=>calls.push(["fire-add",f,q])});
  ambient.RegisterWithQuadRenderer=q=>calls.push(["ambient-register",q]);ambient.AddQuadsToQuadRenderer=(f,q)=>calls.push(["ambient-add",f,q]);
  set.firingEffect=effect;set.ambientEffect=ambient;set.ambientEffectEditingMode=true;ship.turretSets.push(set);
  try
  {
    set.InitializeFiringEffect();assert.equal(calls[0][0],"fire-register","cpp:327 registers even before geometry exists");calls.length=0;
    ship.RegisterWithQuadRenderer(renderer);assert.deepEqual(calls,[["fire-register",renderer],["ambient-register",renderer]]);
    calls.length=0;ship.AddQuadsToQuadRenderer(frustum,renderer);assert.deepEqual(calls,[["ambient-add",frustum,renderer]],"cpp:782 inactive fire has no quads");
    effect.isFiring=true;calls.length=0;ship.AddQuadsToQuadRenderer(frustum,renderer);assert.deepEqual(calls,[["fire-add",frustum,renderer],["ambient-add",frustum,renderer]]);
    set._parentData.clipRadiusSq=.05;calls.length=0;ship.AddQuadsToQuadRenderer(frustum,renderer);assert.deepEqual(calls,[["fire-add",frustum,renderer]]);
    set.display=false;calls.length=0;ship.AddQuadsToQuadRenderer(frustum,renderer);assert.deepEqual(calls,[]);
  }
  finally{set.firingEffect=null;set.Destroy();}
});

// The pulse asset has no authored ambient-controller recipe. This explicitly
// controlled graph qualifies actual copied controllers and their float buffers.
async function pulseStateAssets(t)
{
  const loaded = await assets(t);
  const { set, ship } = loaded;
  ship.RebuildTurretPositions();
  set.Initialize();
  const bytes = await readFile(join(corpus, "pulse_mega_fx.black"));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "ec84e9ee2b9d9af295dff3ad7ad79551e8785027fd30a5121d4d92eaa31a1eb2");
  const effect = EveTurretFiringFX.from(CjsBlackFormat.readPayload(bytes).object);
  set.firingEffect = effect;
  set.useRandomFiringDelay = false;
  set.chooseRandomLocator = false;
  set.maxTrackingTime = 0.75;
  set.UpdateAsyncronous(updateContext({ deltaTime: 0 }));
  t.after(() => { set.firingEffect = null; });
  return { ...loaded, effect };
}

async function stateAssets(t)
{
  const loaded = await pulseStateAssets(t), { set, effect } = loaded;
  const source = new EveChildContainer(), controller = new Tr2Controller();
  controller.variables.push(...["TurretState", "FiringDelay"].map(name => new DictReader({ declarations: true }).CreateObject({ _type: "Tr2ControllerFloatVariable", name, defaultValue: -7 })));
  source.AddController(controller);
  set.ambientEffect = source;
  const generated = set.GetAmbientEffectOrGeneratedEffect();
  const controllers = generated.instances.map(instance => instance.objects[0].controllers[0]);
  t.after(() =>
  {
    set.ambientEffect = null;
    for (const value of [controller, ...controllers]) value.Unlink();
  });
  assert.equal(controllers.length, 2);
  assert.equal(new Set([controller, ...controllers]).size, 3);
  assert.equal(new Set([controller, ...controllers].map(value => value.variables[0])).size, 3);
  assert.equal(new Set([controller, ...controllers].map(value => value.GetVariableBuffer())).size, 3);
  assert.deepEqual([controller, ...controllers].map(value => value.IsLinked()), [true, true, true], "source and generated controllers have their real graph owners");
  const target = new EveShip2();
  assert.equal(set.SetTargetObject(target), true);
  const moveTarget = x =>
  {
    target.worldPosition.set([x, 200, -480]);
    target.worldTransform.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, 200, -480, 1]);
    // Independent native facing scores for the authored paired mounts. This
    // controlled target uses the existing no-locator world-centre fallback;
    // nominal target-admission parity remains a separate owner dependency.
    const scores = set.GetTurrets().map(turret =>
    {
      const matrix = turret.worldMatrix;
      const direction = [x - matrix[12], 200 - matrix[13], -480 - matrix[14]];
      return direction.reduce((sum, value, i) => sum + value * matrix[4 + i], 0) / Math.hypot(...direction);
    });
    const expected = x < 0 ? 0 : 1;
    assert.ok(scores[expected] > scores[1 - expected] + 1, "non-tied native facing scores select opposite authored mounts");
    return expected;
  };
  return { ...loaded, effect, source, controller, controllers, target, moveTarget };
}

function assertAmbient(controller, state, delay)
{
  assert.equal(controller.GetFloatVariableByName("TurretState"), state);
  assert.equal(controller.GetFloatVariableByName("FiringDelay"), delay);
  assert.deepEqual(Array.from(controller.GetVariableBuffer()), [state, delay], "controller expression buffer receives the same per-instance values");
}

test("real pulse public firing preserves selected ambient state and delay through actual copied controllers", { skip }, async t =>
{
  const { set, effect, controller, controllers: [a, b], moveTarget } = await stateAssets(t);
  assert.equal(effect.isLoopFiring, false, "authored FX flag, independent of stretch loop curves");
  set.EnterStateIdle();
  assertAmbient(a, 2, -7); assertAmbient(b, 2, -7); assertAmbient(controller, 2, -7);
  const prepare = t.mock.method(effect, "PrepareFiring"), start = t.mock.method(set.target, "StartFireAtLocator");
  moveTarget(-1000);
  set.EnterStateFiring();
  assert.equal(set._activeTurret, 0); assert.equal(set.state, 4);
  assertAmbient(a, 4, 0.75); assertAmbient(b, 2, -7); assertAmbient(controller, 2, -7);
  assert.equal(prepare.mock.calls.at(-1).arguments[0], 0.75);
  assertScalars(start.mock.calls.at(-1).arguments.slice(1, 3), [0.75 + effect.GetFiringPeakTime(), effect.GetFiringDuration() - effect.GetFiringPeakTime()], "native target-impact delay and duration");
  moveTarget(1000);
  set.EnterStateFiring();
  assert.equal(set._activeTurret, 1);
  assertAmbient(a, 3, 0.75); assertAmbient(b, 4, 0); assertAmbient(controller, 3, -7);
  assert.equal(prepare.mock.calls.at(-1).arguments[0], 0);
  set.EnterStateIdle(); assertAmbient(a, 2, 0.75); assertAmbient(b, 2, 0);
  set.EnterStateReloading(); set.EnterStateFiring();
  assertAmbient(a, 5, 0.75); assertAmbient(b, 4, 0.75); assertAmbient(controller, 5, -7);
  set.EnterStateTargeting(); set.EnterStateFiring();
  assertAmbient(a, 3, 0.75); assertAmbient(b, 4, 0); assertAmbient(controller, 3, -7);
});

test("controlled looping pulse reentry reselects ambient state before moving effects without restarting FX", { skip }, async t =>
{
  const { set, effect, controllers: [a, b], moveTarget } = await stateAssets(t);
  effect.isLoopFiring = true; // Explicit augmentation; the authored flag is false.
  set.EnterStateTargeting(); moveTarget(-1000); set.EnterStateFiring();
  const stop = t.mock.method(effect, "StopFiring"), prepare = t.mock.method(effect, "PrepareFiring");
  const moveMethod = effect.PrepareFiringEffectMoveObjects, atMove = [];
  const move = t.mock.method(effect, "PrepareFiringEffectMoveObjects", function (...args)
  {
    atMove.push([set._activeTurret, Array.from(a.GetVariableBuffer()), Array.from(b.GetVariableBuffer())]);
    return moveMethod.apply(this, args);
  });
  moveTarget(1000); set.EnterStateFiring();
  assert.equal(set._activeTurret, 1);
  assertAmbient(a, 3, 0); assertAmbient(b, 4, 0);
  assert.deepEqual(atMove, [[1, [3, 0], [4, 0]]], "ambient selection is already published when moving effects begin");
  assert.equal(move.mock.callCount(), 1); assert.equal(stop.mock.callCount(), 0); assert.equal(prepare.mock.callCount(), 0);
});

test("forced turret transitions preserve ambient controls while ordinary deactivation always notifies", { skip }, async t =>
{
  const { set, source, controllers: [a, b], moveTarget } = await stateAssets(t);
  moveTarget(-1000); set.EnterStateIdle(); set.EnterStateFiring();
  const initial = [Array.from(a.GetVariableBuffer()), Array.from(b.GetVariableBuffer())];
  set.ForceStateDeactive();
  assert.deepEqual([Array.from(a.GetVariableBuffer()), Array.from(b.GetVariableBuffer())], initial);
  assert.equal(set.state, 1); assert.equal(set.trackingInfluence, 0); assert.equal(set._activeTurret, EveTurretSet.INVALID_INDEX);
  set.EnterStateFiring();
  assert.equal(set.state, 1); assert.deepEqual([Array.from(a.GetVariableBuffer()), Array.from(b.GetVariableBuffer())], initial, "deactive firing is forbidden");
  set.ForceStateTargeting();
  assert.equal(set.state, 3); assert.equal(set.trackingInfluence, 0.75);
  assert.deepEqual([Array.from(a.GetVariableBuffer()), Array.from(b.GetVariableBuffer())], initial);
  set.EnterStateDeactive(); assertAmbient(a, 1, 0.75); assertAmbient(b, 1, -7);
  source.SetControllerVariable("TurretState", 77);
  set.GetAmbientEffectOrGeneratedEffect().SetControllerVariable("TurretState", 77);
  const play = t.mock.method(set, "PlayAnimation");
  set.EnterStateDeactive();
  assertAmbient(a, 1, 0.75); assertAmbient(b, 1, -7); assert.equal(play.mock.callCount(), 0);
});

test("repeated idle preserves real playback controls but refreshes ambient state; offline transitions do nothing", { skip }, async t =>
{
  const { set, controllers: [a, b] } = await stateAssets(t);
  set.EnterStateIdle();
  set.UpdateAsyncronous(updateContext({ deltaTime: 0.2 }));
  const before = set.GetTurrets().map(turret => set._animationControls.get(turret).slice());
  set.GetAmbientEffectOrGeneratedEffect().SetControllerVariable("TurretState", 77);
  const play = t.mock.method(set, "PlayAnimation");
  set.EnterStateIdle();
  assert.equal(play.mock.callCount(), 0);
  for (const [index, turret] of set.GetTurrets().entries()) assert.deepEqual(set._animationControls.get(turret), before[index]);
  assertAmbient(a, 2, -7); assertAmbient(b, 2, -7);
  set.isOnline = false;
  set.GetAmbientEffectOrGeneratedEffect().SetControllerVariable("TurretState", 88);
  set.EnterStateTargeting(); set.EnterStateIdle();
  assert.equal(set.state, 2); assert.equal(play.mock.callCount(), 0);
  assertAmbient(a, 88, -7); assertAmbient(b, 88, -7);
});

test("targeting fade uses last mount playback result while real first mount deploys", { skip }, async t =>
{
  const { set } = await pulseStateAssets(t);
  set.ForceStateDeactive();
  const [first, last] = set.GetTurrets();
  const retained = last.sequencer;
  // Labelled readiness boundary: a temporarily absent last sequencer returns
  // zero from real PlayAnimation; no synthetic duration or animation is used.
  last.sequencer = null;
  t.after(() => { last.sequencer = retained; });
  const play = t.mock.method(set, "PlayAnimation");
  set.EnterStateTargeting();
  assert.deepEqual(play.mock.calls.map(call => call.arguments), [[0, "Deploy", "Active", 1], [1, "Deploy", "Active", 1]]);
  assert.equal(set._delayToFadeInTracking, 0.0001);
  assert.ok(set._animationControls.get(first).some(control => control.name === "Deploy"));
});

test("movement audio respects native gates and nominal emitter while preserving transition order", { skip }, async t =>
{
  const { set, effect } = await pulseStateAssets(t);
  const emitter = effect.destinationObserver.GetObserver();
  assert.equal(CjsSchema.getClassName(emitter.constructor), "AudEmitter");
  set.turretMovementObserver = effect.destinationObserver; // Controlled role reuse.
  const send = t.mock.method(emitter, "SendEvent");
  const enter = (enabled, name) =>
  {
    set.playMovementSound = enabled; set.targetingToIdleMovementAudioEvent = name;
    set.EnterStateTargeting(); set.EnterStateIdle();
  };
  enter(false, "controlled_idle_event"); enter(true, "");
  assert.equal(send.mock.callCount(), 0);
  const order = [], playMethod = set.PlayAnimation, sendMethod = emitter.SendEvent;
  t.mock.method(set, "PlayAnimation", function (...args) { order.push("play"); return playMethod.apply(this, args); });
  t.mock.method(emitter, "SendEvent", function (...args) { order.push(["event", set.state]); return sendMethod.apply(this, args); });
  set.EnterStateTargeting(); order.length = 0;
  set.targetingToIdleMovementAudioEvent = "controlled_idle_event"; set.EnterStateIdle();
  assert.deepEqual(order, ["play", "play", ["event", 3]], "event follows mount playback but precedes IDLE assignment");
  assert.equal(send.mock.callCount(), 1);
  assert.deepEqual(send.mock.calls[0].arguments, ["controlled_idle_event"]);
  const observer = new TriObserverLocal(), unrelated = new EveChildContainer();
  unrelated.SendEvent = () => { throw new Error("unrelated SendEvent receiver must not be treated as ITr2AudEmitter"); };
  observer.observer = unrelated; set.turretMovementObserver = observer;
  enter(true, "controlled_idle_event");
  observer.observer = null; enter(true, "controlled_idle_event");
  set.turretMovementObserver = null; enter(true, "controlled_idle_event");
});

test("native deactive and reload edge branches retain zero-mount and invalid-state behavior", { skip }, async t =>
{
  const { set } = await pulseStateAssets(t);
  const play = t.mock.method(set, "PlayAnimation");
  set.state = EveTurretSet.State.STATE_INVALID; set.trackingInfluence = 0.6; set._delayToFadeOutTracking = 7;
  set.EnterStateDeactive();
  assert.equal(play.mock.callCount(), 0); assert.equal(set.trackingInfluence, 0.6); assert.equal(set._delayToFadeOutTracking, 7);
  set.EnterStateReloading(); assert.equal(set.state, 5); assert.equal(play.mock.callCount(), 0, "deactive reload still assigns state without playing");
  const mounts = set._turrets; set._turrets = [];
  try
  {
    set.state = 2; set.EnterStateDeactive();
    assert.equal(set.trackingInfluence, 0); assert.equal(set._delayToFadeOutTracking, 7, "native reset is inside the empty mount loop");
    set.EnterStateTargeting(); assert.equal(set._delayToFadeInTracking, 0.0001);
  }
  finally { set._turrets = mounts; }
});

test("target attachment side effects use stored target after rejection and always refresh scale for nonnull input", { skip }, async t =>
{
  const { set, effect } = await pulseStateAssets(t);
  const emitter = effect.destinationObserver.GetObserver();
  set.turretMovementObserver = effect.destinationObserver; // Controlled movement role.
  set.idleToTargetingMovementAudioEvent = "controlled_target_event";
  set.playMovementSound = true;
  const order = [], attachMethod = set.target.SetTargetable, scaleMethod = set.SetTargetScale, sendMethod = emitter.SendEvent;
  t.mock.method(set.target, "SetTargetable", function (...args) { order.push("attach"); return attachMethod.apply(this, args); });
  t.mock.method(set, "SetTargetScale", function (...args) { order.push("scale"); return scaleMethod.apply(this, args); });
  t.mock.method(emitter, "SendEvent", function (...args) { assert.equal(args[0], "controlled_target_event"); order.push("event"); return sendMethod.apply(this, args); });
  const radius = t.mock.method(effect, "SetScaleByRadius");
  const first = new EveShip2(), second = new EveShip2(), rejected = {};
  first.boundingSphereRadius = 123; second.boundingSphereRadius = 456;
  const offer = (state, value, accepted, expectedOrder, expectedTarget, expectedRadius) =>
  {
    set.state = state; order.length = 0;
    const beforeScale = radius.mock.callCount();
    assert.equal(set.SetTargetObject(value), accepted, "existing JS acceptance return is retained");
    assert.deepEqual(order, expectedOrder);
    assert.ok(set.GetTargetObject() === expectedTarget, "admission owner retains the actual stored target");
    assert.equal(radius.mock.callCount(), beforeScale + (value === null ? 0 : 1));
    if (value !== null) assert.equal(radius.mock.calls.at(-1).arguments[0], expectedRadius);
  };
  offer(3, first, true, ["attach", "event", "scale"], first, 123);
  offer(3, first, true, ["attach", "scale"], first, 123);
  offer(3, rejected, false, ["attach", "scale"], first, 123);
  offer(2, rejected, false, ["attach", "event", "scale"], first, 123);
  offer(2, first, true, ["attach", "event", "scale"], first, 123);
  offer(3, second, true, ["attach", "event", "scale"], second, 456);
  offer(2, null, false, [], second, 456);
  set.playMovementSound = false;
  offer(2, rejected, false, ["attach", "scale"], second, 456);
  set.playMovementSound = true; set.idleToTargetingMovementAudioEvent = "";
  offer(2, rejected, false, ["attach", "scale"], second, 456);
  const observer = new TriObserverLocal(), unrelated = new EveChildContainer();
  unrelated.SendEvent = () => { throw new Error("target audio must require the nominal emitter"); };
  observer.observer = unrelated; set.turretMovementObserver = observer;
  set.idleToTargetingMovementAudioEvent = "controlled_target_event";
  offer(2, rejected, false, ["attach", "scale"], second, 456);
});

test("firing setup preserves native predecessor ordering around the real target and playback owners", { skip }, async t =>
{
  const { set } = await pulseStateAssets(t);
  const target = new EveShip2();
  set.SetTargetObject(target);
  const place = x =>
  {
    target.worldPosition.set([x, 200, -480]);
    target.worldTransform[12] = x; target.worldTransform[13] = 200; target.worldTransform[14] = -480;
  };
  const calls = [], playMethod = set.PlayAnimation, startMethod = set.target.StartFireAtLocator;
  t.mock.method(set, "PlayAnimation", function (...args) { calls.push(["play", set._activeTurret]); return playMethod.apply(this, args); });
  t.mock.method(set.target, "StartFireAtLocator", function (...args) { calls.push(["target", set._activeTurret]); return startMethod.apply(this, args); });
  for (const predecessor of ["EnterStateIdle", "EnterStateReloading", "EnterStateTargeting", null])
  {
    place(1000); set.ForceStateTargeting(); set.EnterStateFiring();
    assert.equal(set._activeTurret, 1);
    if (predecessor) set[predecessor]();
    const previous = set._activeTurret;
    const earlyAssignment = set.state === 3 || set.state === 4;
    place(-1000); calls.length = 0; set.EnterStateFiring();
    assert.equal(set._activeTurret, 0);
    assert.deepEqual(calls, [["play", previous], ["play", previous], ["target", earlyAssignment ? 0 : previous]], "native IDLE/RELOADING publish selection after target start; TARGETING/FIRING publish immediately before");
  }
  set.state = EveTurretSet.State.STATE_INVALID;
  const previous = set._activeTurret;
  calls.length = 0;
  set.SetupFiringState();
  assert.deepEqual(calls, []); assert.equal(set._activeTurret, previous, "invalid setup keeps the native default branch");
});
