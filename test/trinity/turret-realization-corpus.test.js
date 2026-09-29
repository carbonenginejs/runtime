import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { blue, ResourceRequirement } from "../../npm/dist/global/blue/index.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { TriGeometryRes } from "../../npm/dist/resource/geometry/TriGeometryRes.js";
import { TriGeometryResSkeletonData } from "../../npm/dist/resource/geometry/TriGeometryResSkeletonData.js";
import { EveShip2, EveLocator2, EveTurretSet, EveTurretAiming } from "../../npm/dist/trinity/index.js";
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
