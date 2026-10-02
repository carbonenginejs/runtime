import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {mat4, vec3, vec4} from "../../npm/dist/global/math/index.js";
import {Tr2GrannyAnimation, EveShip2} from "../../npm/dist/trinity/index.js";
import {TriGeometryRes} from "../../npm/dist/resource/index.js";
import {CjsGr2Format} from "../../npm/dist/resource/formats/gr2/index.js";
import {CjsCmfFormat} from "../../npm/dist/resource/formats/cmf/index.js";
import {CjsBlackFormat} from "../../npm/dist/resource/formats/black/index.js";
import {EveSOF} from "../../npm/dist/sof/index.js";
import {blue} from "../../npm/dist/global/blue/index.js";
import "../../npm/dist/audio/index.js";
import {StubResMan} from "../support/stubResMan.js";

const bounds=animation=>{
  const sphere=vec4.create(),min=vec3.create(),max=vec3.create();
  assert.equal(animation.GetDynamicBounds(sphere,min,max),true);
  return {sphere,min,max};
};
function gr2(point=[2,0,0])
{
  const skeleton={name:"rig",bones:[{name:"root",parentIndex:-1},{name:"tip",parentIndex:0}]};
  return {models:[{name:"rig",skeleton,meshBindings:[0],initialPlacement:{position:[0,0,0]}}],
    meshes:[{boneBindings:[{name:"root",minBounds:point,maxBounds:point}]}],animations:[]};
}
function bind(data)
{
  const updater=new Tr2GrannyAnimation();updater.SetUseMeshBinding(true);updater.SetGrannyResource(data);return updater;
}

test("dynamic bounds preserve failure outputs, origin sphere and native tolerance",()=>{
  const updater=new Tr2GrannyAnimation(),sphere=[1,2,3,4],min=[5,6,7],max=[8,9,10];
  assert.equal(updater.GetDynamicBounds(sphere,min,max),false,"Tr2GrannyAnimation.cpp:991-994");
  assert.deepEqual([sphere,min,max],[[1,2,3,4],[5,6,7],[8,9,10]]);
  const data=gr2();updater.SetGrannyResource(data);
  assert.equal(updater.GetDynamicBounds(sphere,min,max),false,"cpp:916 mesh binding required");
  updater.SetUseMeshBinding(true);
  assert.deepEqual(Array.from(bounds(updater).sphere),[1,0,0,1],"BoundingSphere.cpp:9,34-47 includes origin even for a single point");
  updater.SetGrannyResource(gr2([0.005,0,0]));
  assert.deepEqual(Array.from(bounds(updater).sphere),[0,0,0,0],"BoundingSphere.cpp:16-19 squared tolerance is 1e-4");
});

test("GR2 bounds use world pose, every model, native corner order and placement translation",()=>{
  const data=gr2([1,2,3]);data.models[0].skeleton.bones[0].position=[10,20,30];
  data.models[0].initialPlacement.position=[5,-7,11];
  const updater=bind(data);
  // Carbon TransformCoord: nonuniform scale then rotation then translation.
  const world=updater._runtimeModel.bones[0].worldTransform;
  world.set([0,2,0,0,-3,0,0,0,0,0,4,0,10,20,30,1]);
  const out=bounds(updater);
  assert.deepEqual(Array.from(out.min),[9,15,53],"cpp:1005 world transform then cpp:1015 initial placement");
  assert.deepEqual(Array.from(out.max),[9,15,53]);
  assert.deepEqual(Array.from(out.sphere).slice(0,3),[7,4,32],"origin-expanded center then model translation");
  assert.ok(Math.abs(out.sphere[3]-Math.hypot(4,22,42)/2)<1e-5);
  const second=gr2();second.meshes.push({boneBindings:[{name:"tip",minBounds:[-2,-3,-4],maxBounds:[5,6,7]}]});
  second.models.push({...second.models[0],meshBindings:[1]});updater.SetGrannyResource(second);
  bounds(updater);
  assert.equal(updater._boneBounds.length,2,"cpp:922-948 all models/meshes");
  assert.deepEqual(updater._boneBounds[1].corners.map(v=>Array.from(v)),[
    [-2,-3,-4],[5,6,7],[-2,-3,7],[-2,6,-4],[-2,6,7],[5,-3,-4],[5,-3,7],[5,6,-4]
  ],"cpp:938-945 sphere expansion order");
});

test("CMF bounds use first mesh in skeleton order and rebuild with geometry",()=>{
  const data={skeletons:[{name:"rig",bones:["root","tip"],parents:[0xffffffff,0],
    restTransforms:[0,1].map(()=>({position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]})),invBindTransforms:[mat4.create(),mat4.create()]}],
    meshes:[{skeleton:0,boneBindings:[{name:"tip",bounds:{min:[2,0,0],max:[2,0,0]}},{name:"root",bounds:{min:[0,0,0],max:[0,0,0]}}]},
      {skeleton:0,boneBindings:[{name:"root",bounds:{min:[900,0,0],max:[900,0,0]}}]}],animations:[]};
  const geometry=new TriGeometryRes();geometry.SetPayload(data);
  const updater=new Tr2GrannyAnimation();updater.SetUseMeshBinding(true);updater.SetSharedGeometryRes(geometry);
  assert.deepEqual(Array.from(bounds(updater).sphere),[1,0,0,1]);
  assert.deepEqual(updater._boneBounds.map(b=>b.boneIndex),[0,1],"cpp:876-899 skeleton order, first mesh only");
  const replacement=new TriGeometryRes();replacement.SetPayload({...data,meshes:[{skeleton:0,boneBindings:[{name:"root",bounds:{min:[8,0,0],max:[8,0,0]}}]}]});
  updater.SetSharedGeometryRes(replacement);
  assert.equal(updater._boneBounds.length,0,"cpp:1889 Cleanup invalidates cached binding corners");
  assert.deepEqual(Array.from(bounds(updater).sphere),[4,0,0,4]);
});

const corpus=process.env.DYNAMIC_BOUNDS_CORPUS_DIR;
test("real Svipul dynamic bounds survive stance animation and GR2/CMF rebinding",{skip:!corpus&&"set DYNAMIC_BOUNDS_CORPUS_DIR for copied real Svipul/data.black"},async t=>{
  const bytes=await readFile(join(corpus,"mde3_t3.gr2"));
  assert.equal(createHash("md5").update(bytes).digest("hex"),"12c0293aa9d0c653e45455b40be2061a");
  const black=await readFile(join(corpus,"data.black"));
  assert.equal(createHash("md5").update(black).digest("hex"),"a800b64240ea16a7efba1d1b96df3365");
  const catalog=CjsBlackFormat.readPayload(black).object;
  const files=new Map([["res:/dx9/model/spaceobjectfactory/generic.black",catalog.generic]]);
  for(const [kind,dir] of Object.entries({hull:"hulls",faction:"factions",race:"races",material:"materials",pattern:"patterns",layout:"layouts"}))
    for(const item of catalog[kind]??[])files.set(`res:/dx9/model/spaceobjectfactory/${dir}/${item.name}.black`,item);
  const previous=blue.resMan;blue.resMan=new StubResMan();t.after(()=>{blue.resMan=previous;});
  const sof=(await new EveSOF().Register({lazyData:{source:async path=>{assert.ok(files.has(path),path);return files.get(path);}},resources:{exists:async path=>files.has(path)}}));
  const values=await sof.BuildValuesFromDNAAsync("mde3_t3:minmatarbase:minmatar");
  const ship=CjsSchema.from("EveShip2", values);assert.equal(ship.dynamicBoundingSphereEnabled,true);
  const geometry=new TriGeometryRes();geometry.SetPayload(geometry.ReadGrannyFile(bytes));geometry.MarkPrepared();
  ship.mesh.SetGeometryRes(geometry);ship.PrepareForAnimation();
  assert.equal(ship.animationUpdater.GetMeshBoneCount(),30);
  ship.PrepareShaderData(null);
  const raw=CjsGr2Format.readRaw(bytes);
  raw.fileInfo.Models[0].InitialPlacement.position=[7,-9,13];
  const projected=CjsGr2Format.read(raw);
  assert.deepEqual(projected.models[0].initialPlacement.position,[7,-9,13],"reader retains cpp:1013-1020 native translation");
  const rawUpdater=bind(projected),translated=bounds(rawUpdater);
  rawUpdater._runtimeModel.model.initialPlacement.position=[0,0,0];
  const unshifted=bounds(rawUpdater);
  for(let i=0;i<3;i++)assert.ok(Math.abs(translated.min[i]-unshifted.min[i]-[7,-9,13][i])<1e-4);

  const samples=[];
  for(const cmf of [false,true]){
    if(cmf){ship.animationUpdater.StopAnimations(0);ship.animationUpdater.Update(0);const other=new TriGeometryRes();other.SetPayload(CjsCmfFormat.loadShared(CjsGr2Format.read(bytes)));other.MarkPrepared();ship.mesh.SetGeometryRes(other);ship.PrepareForAnimation();}
    const updater=ship.animationUpdater;
    assert.equal(updater.IsUsingCMF(),cmf);
    for(const name of ["NormalLoop","Speed2Sniper","Sniper2Defensive","Defensive2Speed"]){
      updater.PlayAnimation(name,false,1,0,1);updater.Update(2);
      ship.PrepareShaderData(null);
      const out=bounds(updater);assert.ok([...out.sphere,...out.min,...out.max].every(Number.isFinite));assert.ok(out.sphere[3]>0);
      for(const binding of updater._boneBounds)for(const corner of binding.corners){
        const point=vec3.transformMat4(vec3.create(),corner,updater._runtimeModel.bones[binding.boneIndex].worldTransform);
        for(let axis=0;axis<3;axis++)assert.ok(point[axis]>=out.min[axis]-1e-4&&point[axis]<=out.max[axis]+1e-4);
        assert.ok(vec3.distance(point,out.sphere)<=out.sphere[3]+1e-3,"native incremental sphere encloses transformed real corners");
      }
      samples.push({cmf,name,sphere:Array.from(out.sphere)});
    }
  }
  assert.notDeepEqual(samples[0].sphere,samples[1].sphere,"authored stance changes dynamic bounds");
  t.diagnostic(JSON.stringify(samples));
});
