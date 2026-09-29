import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { blue, ResourceRequirement } from "../../npm/dist/global/blue/index.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { TriGeometryRes } from "../../npm/dist/resource/geometry/TriGeometryRes.js";
import { TriGeometryResSkeletonData } from "../../npm/dist/resource/geometry/TriGeometryResSkeletonData.js";
import { EveShip2, EveLocator2, EveTurretSet, EveTurretAiming, EveTurretFiringFX, EveComponentRegistry } from "../../npm/dist/trinity/index.js";
import { CjsGrannyCurves } from "../../npm/dist/trinity/curves/track/CjsGrannyCurves.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import "../../npm/dist/audio/index.js";
import { StubResMan } from "../support/stubResMan.js";
const corpus=process.env.TURRET_BLACK_CORPUS_DIR;
const skip=!corpus && "set TURRET_BLACK_CORPUS_DIR for Apocalypse/type462 turret realization";
const geometryPath="res:/dx9/model/turret/energy/pulse/l/pulse_mega_t1.gr2";

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
  const ship=new EveShip2();ship.locators=hull.locatorTurrets.map(value=>EveLocator2.from(value));ship.turretSets.push(set);
  return {set,ship,resource,makeResource,resources,requests,hull};
}

test("Apocalypse/type462 geometry ownership caches mesh0 and exact native bone IDs in both arrival orders",{skip},async t=>
{
  const {set,ship,resource}=await assets(t);
  ship.RebuildTurretPositions();assert.equal(set.GetTurrets().length,2);
  set.boundingSphere.fill(0);set.Initialize();
  assert.ok(set.geometryResource===resource,"the requested handle is owned by the turret");assert.equal(set._turretVertexDeclElementCount,resource.GetMeshVertexElements(0).length);
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
  set.UpdateAsyncronous({deltaTime:0});
  const paletteA=a.sequencer.GetMeshBoneMatrixList(),paletteB=b.sequencer.GetMeshBoneMatrixList();
  assert.equal(paletteA.length,108);assert.ok(paletteA!==paletteB);
  const beforeA=Array.from(paletteA),beforeB=Array.from(paletteB);
  const duration=set.PlayAnimation(0,"Deploy","Active",.25);
  assert.ok(Math.abs(duration-2.5416667461395264)<1e-8,"native fixture Deploy duration");
  set.UpdateAsyncronous({deltaTime:.2});
  assert.equal(a.sequencer.GetAnimationLayer(null).queue[0].name,"Active","old control lives until delayed replacement");
  set.UpdateAsyncronous({deltaTime:.3});
  assert.equal(a.sequencer.GetAnimationLayer(null).queue[0].name,"Deploy");
  assert.notDeepEqual(Array.from(a.sequencer.GetMeshBoneMatrixList()),beforeA);
  assert.deepEqual(Array.from(b.sequencer.GetMeshBoneMatrixList()),beforeB,"second mount remains unchanged while first deploys");
  const old=a.sequencer.GetAnimationLayer(null).queue[0];
  assert.equal(set.PlayAnimation(0,"missing","Active"),0);assert.equal(set.PlayAnimation(0,"Deploy","missing"),0);
  set.UpdateAsyncronous({deltaTime:0});
  assert.equal(a.sequencer.GetAnimationLayer(null).queue[0].elapsed,old.elapsed,"missing either name leaves native controls intact");
  set.UpdateAsyncronous({deltaTime:duration});
  const idle=a.sequencer.GetAnimationLayer(null).queue[0];
  assert.equal(idle.name,"Active");assert.ok(Math.abs(idle.elapsed-.25)<1e-9,"CMF first eligible scheduler preserves boundary overshoot");
  resource.MarkPurged();assert.equal(a.sequencer,null);assert.equal(a.pose,null);assert.deepEqual(a.worldTransforms,[]);
});

test("pending native requests replay without delay and late mounts initialize immediately",{skip},async t=>
{
  const {set,ship,resources,makeResource}=await assets(t);const pending=makeResource(false);resources.set(geometryPath,pending);
  ship.RebuildTurretPositions();set.Initialize();
  assert.equal(set.PlayAnimation(0,"Deploy","Active",5),0);assert.equal(set._animationQueue.length,1);
  set.UpdateAsyncronous({deltaTime:2});pending.MarkPrepared();set.UpdateAsyncronous({deltaTime:0});
  const first=set.GetTurrets()[0].sequencer.GetAnimationLayer(null).queue[0];
  assert.equal(first.name,"Deploy");assert.equal(first.elapsed,0,"cpp:2483 AnimationRequest omits delay");
  assert.equal(set._animationQueue.length,0);
  set.SetLocalTransform(2,set.GetTurrets()[0].localMatrix);set.UpdateAsyncronous({deltaTime:0});
  const late=set.GetTurrets()[2];assert.ok(late.sequencer);assert.equal(late.sequencer.GetAnimationLayer(null).queue[0].name,"Active");
  assert.equal("display" in late,false,"SingleTurretData retains Carbon visible spelling");
  set.StopAnimation(0,0);set.UpdateAsyncronous({deltaTime:0});assert.equal(set.GetTurrets()[0].sequencer.GetAnimationLayer(null).queue.length,0);
});

test("native delayed stops cover future controls and extended one-shots without chained-queue drift",{skip},async t=>
{
  const {set,ship}=await assets(t);ship.RebuildTurretPositions();set.Initialize();
  const [a,b]=set.GetTurrets();
  set.PlayAnimation(0,"Deploy","Active",1);set.StopAnimation(0,.5);
  set.UpdateAsyncronous({deltaTime:.75});assert.equal(a.sequencer.GetAnimationLayer(null).queue.length,0);
  const duration=set.PlayAnimation(0,"Deploy","",0);set.StopAnimation(0,duration+1);
  set.UpdateAsyncronous({deltaTime:duration+.2});
  assert.equal(a.sequencer.GetAnimationLayer(null).queue[0].held,true,"native one-shot holds final pose until extended stop");
  set.UpdateAsyncronous({deltaTime:.81});assert.equal(a.sequencer.GetAnimationLayer(null).queue.length,0);
  set.PlayAnimation(0,"Deploy","Active",.25);set.PlayAnimation(1,"Deploy","Active",.25);
  set.UpdateAsyncronous({deltaTime:duration+.55});
  assert.ok(Math.abs(a.sequencer.GetAnimationLayer(null).queue[0].elapsed-.3)<1e-8);
  assert.deepEqual(Array.from(a.sequencer.GetMeshBoneMatrixList()),Array.from(b.sequencer.GetMeshBoneMatrixList()));
  set.PlayAnimation(0,"","",.2);set.UpdateAsyncronous({deltaTime:.1});assert.equal(a.sequencer.GetAnimationLayer(null).queue[0].name,"Active");
  set.UpdateAsyncronous({deltaTime:.11});assert.equal(a.sequencer.GetAnimationLayer(null).queue.length,0);
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
  set.PlayAnimation(0,"Fire","Active");set.UpdateAsyncronous({deltaTime:.01});const first=snapshot();
  set.UpdateAsyncronous({deltaTime:.2});assert.deepEqual(snapshot(),first,"full joints remain static, not just mesh palette");
  set.PlayAnimation(0,"Deploy","Active");set.UpdateAsyncronous({deltaTime:.2});assert.notDeepEqual(snapshot(),first);
  const duration=set.PlayAnimation(0,"Deploy","Active",.25);
  for(const deltaTime of [.1,.15,1,1,duration-2+.3])set.UpdateAsyncronous({deltaTime});
  const small=Array.from(updater.GetMeshBoneMatrixList()),elapsed=updater.GetAnimationLayer(null).queue[0].elapsed;
  set.PlayAnimation(0,"Deploy","Active",.25);set.UpdateAsyncronous({deltaTime:duration+.55});
  assert.deepEqual(Array.from(updater.GetMeshBoneMatrixList()),small);
  assert.ok(Math.abs(updater.GetAnimationLayer(null).queue[0].elapsed-elapsed)<1e-8,"one large update agrees with smaller updates at same native clock");
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
  set.target.position.set([700,1100,-300]);set.trackingInfluence=0;set.UpdateAsyncronous({deltaTime:.1},parent);
  const base=set.GetTurrets().map(copyPose), influence=.65;
  set.sysBonePitchMin=-80;set.sysBonePitchMax=80;set.sysBonePitchFactor=.6;set.sysBonePitchOffset=7;set.sysBoneHeight=4;
  for(const updatePitchPose of [false,true])
  {
    set.updatePitchPose=updatePitchPose;set.trackingInfluence=influence;set.UpdateAsyncronous({deltaTime:0},parent);
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
    const once=set.GetTurrets().map(copyPose);set.UpdateAsyncronous({deltaTime:0},parent);assert.deepEqual(set.GetTurrets().map(copyPose),once,"stationary frame must not accumulate aim");
    set.trackingInfluence=0;set.UpdateAsyncronous({deltaTime:0},parent);assert.deepEqual(set.GetTurrets().map(copyPose),base,"zero influence restores sampled pose");
  }
  set.trackingInfluence=influence;set._systemBoneID[EveTurretAiming.SystemBones.SYSBONE_ROTATION]=0xffffffff;
  set.UpdateAsyncronous({deltaTime:0},parent);assert.deepEqual(Array.from(set.GetTurrets()[0].pose.boneTransforms[2].rotation),base[0][2].rotation,"missing sentinel skips only yaw");
  assert.notDeepEqual(Array.from(set.GetTurrets()[0].pose.boneTransforms[4].rotation),base[0][4].rotation);
});

for(const geometryFirst of [false,true])test(`real muzzle binding handles ${geometryFirst?"geometry":"effect"} first and copies the current full joint`,{skip},async t=>
{
  const {set,ship}=await assets(t);ship.RebuildTurretPositions();
  const bytes=await readFile(join(corpus,"pulse_mega_fx.black"));assert.equal(createHash("sha256").update(bytes).digest("hex"),"ec84e9ee2b9d9af295dff3ad7ad79551e8785027fd30a5121d4d92eaa31a1eb2");
  const effect=EveTurretFiringFX.from(CjsBlackFormat.readPayload(bytes).object);
  if(geometryFirst)set.Initialize();set.SetFiringEffect(effect);if(!geometryFirst)set.Initialize();
  assert.equal(effect.GetPerMuzzleEffectCount(),1);assert.equal(effect.GetPerMuzzleBoneID(0),10,"cpp:320 prefix + 01 resolves full skeleton joint, not mesh binding");
  const parent=mat4.create();mat4.translate(parent,parent,[35,-18,22]);mat4.rotateY(parent,parent,.45);mat4.rotateX(parent,parent,-.3);mat4.scale(parent,parent,[1.2,.9,1.5]);
  set._activeTurret=1;set.trackingInfluence=.8;set.target.position.set([700,500,300]);set.PlayAnimation(1,"Deploy","Active");
  set.UpdateAsyncronous({deltaTime:.2},parent);const turret=set.GetTurrets()[1];
  assert.equal(turret.sequencer.GetMeshBoneCount(),9,"muzzle10 cannot index the9-bone skin palette");
  const expected=carbonProduct(turret.worldTransforms[10],turret.worldMatrix);
  assertScalars(set.GetFiringBoneWorldTransform(0),expected,"native full bone * turret world");
  assertScalars(effect.GetMuzzleTransform(0),expected,"same-frame FX muzzle upload");
  const retained=set.GetTurretBoneTransform(1,10),retainedValues=Array.from(retained);set.GetTurretBoneTransform(0,10);assert.deepEqual(Array.from(retained),retainedValues,"native return value is caller-owned" );
  const before=Array.from(expected);set.UpdateAsyncronous({deltaTime:2},parent);
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
  const old=makeEffect(),effect=makeEffect();set.SetFiringEffect(old);set.SetFiringEffect(effect);
  assert.equal(old.GetComponentRegistry(),null);assert.ok(effect.GetComponentRegistry()===registry);
  const parent=mat4.create();mat4.translate(parent,parent,[60,20,10]);mat4.rotateZ(parent,parent,.3);set.UpdateAsyncronous({deltaTime:0},parent);set._activeTurret=0;
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
  set.SetFiringEffect(null);assert.equal(effect.GetComponentRegistry(),null);assertScalars(set.GetFiringBoneWorldTransform(0),turret.worldMatrix,"no effect returns turret matrix");
  set._activeTurret=EveTurretSet.INVALID_INDEX;set.GetTurrets().length=0;assertScalars(set.GetFiringBoneWorldTransform(0),parent,"no mount returns parent matrix");
  set.UnRegister(registry);
});

test("first actual firing without an active turret initializes muzzle positions from the parent once",{skip},async t=>
{
  const {set,ship}=await assets(t);ship.RebuildTurretPositions();set.Initialize();
  const bytes=await readFile(join(corpus,"pulse_mega_fx.black"));
  const effect=EveTurretFiringFX.from(CjsBlackFormat.readPayload(bytes).object);set.SetFiringEffect(effect);
  const parent=mat4.fromTranslation(mat4.create(),[80,20,-30]);
  effect.PrepareFiring(0);set.UpdateAsyncronous({deltaTime:.1,currentTime:1},parent);
  assert.equal(set._firingEffectMuzzlePosSet,false,"no active turret: do not replace the muzzle with a closest mount during update");
  set.UpdateAsyncronous({deltaTime:.1,currentTime:1.1},parent);
  assert.equal(set._firingEffectMuzzlePosSet,true);assertScalars(effect.GetMuzzleTransform(0),parent,"cpp:1481 first-start parent fallback");
  const next=mat4.fromTranslation(mat4.create(),[180,30,-40]);set.UpdateAsyncronous({deltaTime:.1,currentTime:1.2},next);
  assertScalars(effect.GetMuzzleTransform(0),parent,"native fallback is initialized once");
});
