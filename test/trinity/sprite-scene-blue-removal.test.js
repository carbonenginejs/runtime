import test from "node:test";
import assert from "node:assert/strict";
import { blue, INotify, IListNotify, BlueList } from "../../npm/dist/global/blue/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { DictWriter } from "../../npm/dist/global/blue/DictWriter.js";
import { ITr2Scene } from "../../npm/dist/trinity/core/ITr2Scene.js";
import { ITr2Updateable } from "../../npm/dist/trinity/core/ITr2Updateable.js";
import { ITr2SpriteObject } from "../../npm/dist/trinity/sprite2d/ITr2SpriteObject.js";
import { Tr2Sprite2dScene } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dScene.js";
import { Tr2Sprite2dRenderJob } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dRenderJob.js";
import { TriStepUpdate } from "../../npm/dist/trinity/renderJob/step/TriStepUpdate.js";
import { TriStepRenderScene } from "../../npm/dist/trinity/renderJob/step/TriStepRenderScene.js";
import { Tr2RenderNodeSprite2dScene } from "../../npm/dist/trinity/renderJob/node/Tr2RenderNodeSprite2dScene.js";
import { TriCurveSet } from "../../npm/dist/trinity/curves/TriCurveSet.js";
import { Tr2CurveScalar } from "../../npm/dist/trinity/curves/curve/Tr2CurveScalar.js";
import { Tr2VariableStore } from "../../npm/dist/trinity/core/variable/Tr2VariableStore.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";

import { Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/core/context/Tr2RenderContext.js";

import { Copier } from "../../npm/dist/global/blue/Copier.js";
import { Traverse } from "../../npm/dist/global/blue/find.js";

const context={GetViewTransform:()=>mat4.create()};

test("Scene uses its native primary and exact query while removing model helpers",()=>{
 const scene=blue.classes.CreateInstanceFromName("Tr2Sprite2dScene");assert.equal(scene.constructor,Tr2Sprite2dScene);assert.equal(Object.getPrototypeOf(Tr2Sprite2dScene.prototype),ITr2Scene.prototype);assert.equal(Object.getPrototypeOf(ITr2Scene.prototype),ITr2Updateable.prototype);
 assert.deepEqual([...mappedInterfaces(Tr2Sprite2dScene)],[Tr2Sprite2dScene,ITr2Scene,ITr2Updateable,INotify]);for(const name of ["SetValues","GetValues","Clone","Traverse","GetResources","OnEvent","Destroy"])assert.equal(name in scene,false);
 assert.equal("from" in Tr2Sprite2dScene,false);assert.equal(blue.classes.CreateInstanceFromName("ITr2Scene"),null);assert.throws(()=>new ITr2Scene().Render(context),/must be implemented/);
 const list=new BlueList(ITr2Scene);assert.equal(list.Append(scene),true);assert.equal(list.Append({Update(){},Render(){}}),false);
});

test("Scene declaration order, stored aliases and list identities match native shape",()=>{
 const scene=new Tr2Sprite2dScene(),schema=CjsSchema.getSchema(Tr2Sprite2dScene);assert.deepEqual(schema.members.map(f=>f.name),["name","display","drawWireFrame","ignoreClip","lastPickPos","isFullscreen","is2dRender","is2dPick","translation","displayX","displayY","rotation","scaling","displayWidth","displayHeight","depthMin","depthMax","pickState","clearBackground","backgroundColor","children","background","clearFinishedCurveSets","curveSets","ubershader2d","ubershader3d","defaultTextureUpdates","maxItemsToRender","maxDrawCallsToRender","maxSpriteCount","captureIndexDataCapacity"]);assert.deepEqual(schema.properties,[]);assert.deepEqual(schema.fields,[]);assert.equal(CjsSchema.getField(Tr2Sprite2dScene,"name"),null);
 assert.equal(schema.members.find(f=>f.name==="name").type.kind,"wstring");for(const name of ["displayX","displayY"]){const f=schema.members.find(f=>f.name===name);assert.equal(f.key,"translation");assert.equal(f.index,name==="displayX"?0:1);assert.equal(f.edit.read,true);assert.equal(f.edit.write,true);assert.equal(f.edit.persist,true);}
 assert.deepEqual([...scene.backgroundColor],[0,0,1,0]);assert.equal(scene.captureIndexDataCapacity,0);assert.equal(scene.ubershader2d,null);assert.equal(scene.ubershader3d,null);
 assert.ok(scene.children instanceof BlueList);assert.ok(scene.background instanceof BlueList);assert.ok(scene.curveSets instanceof BlueList);assert.equal(scene.children.Append(new Tr2Sprite2dRenderJob()),true);assert.equal(scene.children.Append({}),false);
 assert.equal(CjsSchema.cast(scene.children[0],ITr2SpriteObject),scene.children[0]);
});

test("actual step forwards both raw clocks and caller view to real curve sets",()=>{
 const scene=new Tr2Sprite2dScene(),step=new TriStepUpdate();step.object=scene;
 const values=[];for(const useRealTime of [true,false]){const set=new TriCurveSet(),curve=new Tr2CurveScalar();curve.AddKey(0,0);curve.AddKey(100,100);set.curves.Append(curve);set.useRealTime=useRealTime;set.isPlaying=true;scene.curveSets.Append(set);values.push(set);}
 const view=mat4.create();view[2]=1;view[6]=0;view[10]=0;let reads=0;step.Execute(20_000_000,50_000_000,{GetViewTransform(){reads++;return view;}});assert.equal(reads,1);assert.deepEqual(values.map(s=>s.scaledTime),[2,5]);assert.equal(scene._realTime,20_000_000);assert.equal(scene._simTime,50_000_000);
 const qx=0.332621,qy=0.332621,qw=0.882455,expected=[qw*qw+qx*qx-qy*qy,2*qx*qy,-2*qy*qw,1];const dot=Tr2VariableStore.globalStore().GetVariable("g_DotVector").GetValue();for(let i=0;i<4;i++)assert.ok(Math.abs(dot[i]-expected[i])<1e-6);
 // The variable must not retain released pool memory.
 const temporary=vec3.alloc();temporary.fill(99);vec3.unalloc(temporary);for(let i=0;i<4;i++)assert.ok(Math.abs(dot[i]-expected[i])<1e-6);
});

test("hidden Scene retains clocks and skips view, updates and cleanup",()=>{
 const scene=new Tr2Sprite2dScene(),set=new TriCurveSet();assert.deepEqual([...Tr2VariableStore.globalStore().GetVariable("g_DotVector").GetValue()],[0,0,0,1]);scene.curveSets.Append(set);scene.clearFinishedCurveSets=true;scene.display=false;set.Update=()=>{throw Error("hidden update");};scene.Update(31,47,{GetViewTransform(){throw Error("hidden camera");}});assert.deepEqual([scene._realTime,scene._simTime],[31,47]);assert.equal(scene.curveSets.length,1);assert.deepEqual([...Tr2VariableStore.globalStore().GetVariable("g_DotVector").GetValue()],[0,0,0,1]);
});

test("cleanup follows all updates and removes adjacent stopped sets with Blue notifications",()=>{
 const scene=new Tr2Sprite2dScene(),events=[],sets=Array.from({length:3},()=>new TriCurveSet());sets.forEach((set,i)=>{set.Update=()=>events.push("update"+i);set.isPlaying=i===2;scene.curveSets.Append(set);});class Observer extends IListNotify{OnListModified(_event,_key,_key2,value){events.push("remove"+sets.indexOf(value));}}scene.curveSets.SetNotify(new Observer());const list=scene.curveSets;scene.clearFinishedCurveSets=true;scene.Update(1,2,context);assert.equal(scene.curveSets,list);assert.deepEqual([...list],[sets[2]]);assert.deepEqual(events,["update0","update1","update2","remove0","remove1"]);
});

test("required updateable and curve calls fail rather than skip malformed objects",()=>{
 const step=new TriStepUpdate();step.object={};assert.throws(()=>step.Execute(1,2,context),TypeError);const scene=new Tr2Sprite2dScene();scene.curveSets.push({});assert.throws(()=>scene.Update(1,2,context),TypeError);
 const alloc=vec3.alloc,unalloc=vec3.unalloc;let active=0;vec3.alloc=()=>{active++;return alloc();};vec3.unalloc=value=>{active--;unalloc(value);};try{scene._dotVectorVar={SetValue(){throw Error("variable");}};assert.throws(()=>scene.Update(1,2,context),/variable/);assert.equal(active,0);}finally{vec3.alloc=alloc;vec3.unalloc=unalloc;}
});

test("declared persisted hydration preserves aliases and actual owner scene identity",()=>{
 const scene=new DictReader({declarations:true}).CreateObject({_type:"Tr2Sprite2dScene",name:"ui",translation:[1,2,3],displayX:7,children:[{_type:"Tr2Sprite2dRenderJob"}],curveSets:[]});assert.equal(scene.displayX,7);assert.deepEqual([...scene.translation],[7,2,3]);assert.equal(scene.children[0].constructor,Tr2Sprite2dRenderJob);
 scene.displayY=9;const data=new DictWriter().WriteObject(scene,{}, {persistOnly:true,forceTypeTags:true});assert.equal(data.displayX,7);assert.equal(data.displayY,9);assert.equal("maxSpriteCount" in data,false);const copy=new DictReader({declarations:true}).CreateObject({...data,_type:"Tr2Sprite2dScene"});assert.equal(copy.name,"ui");assert.equal(copy.displayX,7);assert.equal(copy.displayY,9);
 const owner=new Tr2RenderNodeSprite2dScene();owner.scene=copy;assert.equal(owner.Validate([[32,32]],[],0,0),true);
});

test("backend-specific notifications and rendering are explicitly unsupported",()=>{
 const scene=new Tr2Sprite2dScene();assert.equal(scene.OnModified("name"),true);assert.throws(()=>new DictReader({declarations:true}).ReadInto(scene,{maxSpriteCount:20000}),/unimplemented ReleaseResources/);assert.equal(scene.maxSpriteCount,16383);assert.throws(()=>scene.OnModified("maxSpriteCount"),/unimplemented ReleaseResources/);
 assert.equal(scene.RenderDebugInfo(context),undefined);const step=new TriStepRenderScene();step.scene=scene;assert.throws(()=>step.Execute(0,0,context),/Render is not implemented/);assert.throws(()=>scene.PickObject(0,0),/PickObject is not implemented/);
});


test("Scene uses the main-thread view fallback and tolerates a missing shader handle", () =>
{
  const main = Tr2RenderContext_GetMainThreadRenderContext();
  const saved = mat4.clone(main.GetViewTransform());
  try
  {
    main.SetViewTransform(mat4.create());
    const scene = new Tr2Sprite2dScene();
    const set = new TriCurveSet();
    const received = [];
    set.Update = (...times) => received.push(times);
    scene.curveSets.Append(set);
    scene.Update(17, 23);
    const expected = [2 * 0.332621 * 0.882455, -2 * 0.332621 * 0.882455, 0.882455 ** 2 - 2 * 0.332621 ** 2, 1];
    const actual = scene._dotVectorVar.GetValue();
    expected.forEach((value, index) => assert.ok(Math.abs(actual[index] - value) < 1e-6));
    scene._dotVectorVar = null;
    scene.Update(29, 31);
    assert.deepEqual(received, [[17, 23], [29, 31]]);
  }
  finally
  {
    main.SetViewTransform(saved);
  }
});


test("canonical Scene declarations drive Copier and traversal without legacy fields", () =>
{
  const scene = new Tr2Sprite2dScene();
  scene.name = "original";
  scene.displayX = 12;
  const child = new Tr2Sprite2dRenderJob();
  const background = new Tr2Sprite2dRenderJob();
  const set = new TriCurveSet();
  scene.children.Append(child);
  scene.background.Append(background);
  scene.curveSets.Append(set);
  const visited = [];
  Traverse(scene, value => visited.push(value));
  assert.equal(visited.length, 4);
  [scene, child, background, set].forEach((value, index) => assert.equal(visited[index], value));
  const clone = new Copier().CloneTo(scene);
  assert.equal(clone.constructor, Tr2Sprite2dScene);
  assert.equal(clone.name, "original");
  assert.equal(clone.displayX, 12);
  assert.notEqual(clone.translation, scene.translation);
  assert.equal(clone.children[0].constructor, Tr2Sprite2dRenderJob);
  assert.notEqual(clone.children[0], child);
  assert.equal(clone.background[0].constructor, Tr2Sprite2dRenderJob);
  assert.equal(clone.curveSets[0].constructor, TriCurveSet);
  assert.deepEqual(CjsSchema.getDefaults(Tr2Sprite2dScene), {_type: "Tr2Sprite2dScene"});
});
