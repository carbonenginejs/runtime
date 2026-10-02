import test from "node:test";
import assert from "node:assert/strict";
import { blue, BlueList } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { DictWriter } from "../../npm/dist/global/blue/DictWriter.js";
import { Tr2SerializedMorphAnimation } from "../../npm/dist/trinity/core/mesh/Tr2SerializedMorphAnimation.js";
import { Tr2Mesh } from "../../npm/dist/trinity/core/mesh/Tr2Mesh.js";
import { ITriObserverLocal } from "../../npm/dist/global/blue/ITriObserverLocal.js";
import { TriObserverLocal, SendEventToAudEmitter } from "../../npm/dist/trinity/core/variable/TriObserverLocal.js";
import { EveChildContainer } from "../../npm/dist/trinity/eve/child/EveChildContainer.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";

test("local observer has its native base, exact query and live mute declaration",()=>{
 const observer=new TriObserverLocal();assert.equal(Object.getPrototypeOf(TriObserverLocal.prototype),ITriObserverLocal.prototype);assert.deepEqual([...mappedInterfaces(TriObserverLocal)],[ITriObserverLocal]);
 const schema=CjsSchema.getSchema(TriObserverLocal);assert.deepEqual(schema.members.map(field=>field.name),["name","position","front","observer"]);assert.deepEqual(schema.properties.map(field=>field.name),["mute"]);assert.equal(schema.properties[0].role,"property");
 for(const method of ["SetValues","GetValues","Clone","OnEvent","Traverse","GetResources"])assert.equal(method in observer,false);
 const list=new BlueList(ITriObserverLocal);assert.equal(list.Append(observer),true);assert.equal(list.Append({GetObserver(){},SetObserver(){}}),false);
 assert.equal(observer.Update(mat4.create()),false);observer.observer={};assert.throws(()=>observer.Update(mat4.create()),TypeError);
});

test("placement uses isolated pooled values with nested-call and throw cleanup",()=>{
 const observer=new TriObserverLocal(),matrix=mat4.create(),nestedMatrix=mat4.fromTranslation(mat4.create(),[10,0,0]);observer.position.set([1,2,3]);const alloc=vec3.alloc,unalloc=vec3.unalloc,active=new Set();let nested=false,calls=0,leases=0,peak=0;
 vec3.alloc=()=>{const value=alloc();assert.equal(active.has(value.buffer),false);active.add(value.buffer);leases++;peak=Math.max(peak,active.size);value.fill(99);return value;};vec3.unalloc=value=>{assert.equal(active.delete(value.buffer),true);unalloc(value);};
 try{
  observer.observer={UpdatePlacement(front,up,position){calls++;for(const value of [front,up,position])assert.equal(active.has(value.buffer),true);assert.deepEqual([...front],[0,0,1]);assert.deepEqual([...up],[0,1,0]);assert.deepEqual([...position],nested?[11,2,3]:[1,2,3]);if(!nested){nested=true;observer.Update(nestedMatrix);assert.deepEqual([...position],[1,2,3]);}}};
  assert.equal(observer.Update(matrix),true);assert.equal(calls,2);assert.equal(leases,6);assert.equal(peak,6);assert.equal(active.size,0);
  observer.observer={UpdatePlacement(){throw new Error("placement failed");}};assert.throws(()=>observer.Update(matrix),/placement failed/);assert.equal(active.size,0);
 }finally{vec3.alloc=alloc;vec3.unalloc=unalloc;}
});

test("optional unregistered audio rejects structural lookalikes without loading an emitter",()=>{
 const original=CjsSchema.GetConstructor;CjsSchema.GetConstructor=function(name){return name==="ITr2AudEmitter"?null:original.call(this,name);};
 try{const observer=new TriObserverLocal();observer.observer={Mute(){throw Error("lookalike");},SendEvent(){throw Error("lookalike");}};observer.mute=true;assert.equal(observer.GetMute(),true);SendEventToAudEmitter(observer,"event");}
 finally{CjsSchema.GetConstructor=original;}
});

test("native audio cast controls mute/event dispatch and actual container propagation",async()=>{
 const {ITr2AudEmitter}=await import("../../npm/dist/audio/trinity/trinityAudioApi/ITr2AudEmitter.js");const calls=[];
 class Emitter extends ITr2AudEmitter{Mute(){calls.push("mute");}Unmute(){calls.push("unmute");}SendEvent(event){calls.push(event);}}
 const observer=new TriObserverLocal(),emitter=new Emitter();observer.SetObserver(emitter);observer.mute=true;assert.equal(observer.SetMute(true),false);observer.mute=false;SendEventToAudEmitter(observer,"fire");assert.deepEqual(calls,["mute","unmute","fire"]);
 observer.SetObserver({Mute(){throw Error("lookalike");},Unmute(){throw Error("lookalike");},SendEvent(){throw Error("lookalike");}});observer.mute=true;SendEventToAudEmitter(observer,"ignored");assert.deepEqual(calls,["mute","unmute","fire"]);
 observer.SetObserver(emitter);assert.deepEqual(calls,["mute","unmute","fire"],"replacement does not reapply mute");observer.mute=false;
 const container=new EveChildContainer();container.observers.push(observer);container.SetMute(true);assert.equal(observer.mute,true);assert.equal(calls.at(-1),"mute");
 emitter.Unmute=null;assert.throws(()=>observer.SetMute(false),TypeError);assert.equal(observer.mute,false);emitter.SendEvent=null;assert.throws(()=>SendEventToAudEmitter(observer,"broken"),TypeError);
});

test("observer dictionary hydration and copying preserve value storage without serializing mute",()=>{
 const observer=new DictReader({declarations:true}).CreateObject({_type:"TriObserverLocal",name:"locator",position:[1,2,3],front:[1,0,0],mute:true});assert.equal(observer.mute,true);
 const copy=new TriObserverLocal();blue.classes.CopyTo(observer,copy);assert.equal(copy.name,"locator");assert.deepEqual([...copy.position],[1,2,3]);assert.equal(copy.mute,false);const written=new DictWriter().WriteObject(observer,{}, {persistOnly:true});assert.equal(Object.hasOwn(written,"mute"),false);
});

test("morph record retains exact native identity and persistent-only declarations",()=>{
 const value=blue.classes.CreateInstanceFromName("Tr2SerializedMorphAnimation");assert.equal(Object.getPrototypeOf(Tr2SerializedMorphAnimation.prototype),Object.prototype);assert.deepEqual([...mappedInterfaces(Tr2SerializedMorphAnimation)],[Tr2SerializedMorphAnimation]);assert.deepEqual([value.name,value.weight],["",0]);
 assert.deepEqual(CjsSchema.getSchema(Tr2SerializedMorphAnimation).fields.map(field=>field.name),["name","weight"]);
 for(const key of ["name","weight"])assert.equal(CjsSchema.getField(Tr2SerializedMorphAnimation,key).edit.persistOnly,true);
 for(const name of ["SetValues","GetValues","Clone","OnEvent","Traverse","GetResources"])assert.equal(name in value,false);
 const list=new BlueList(Tr2SerializedMorphAnimation);assert.equal(list.Append(value),true);assert.equal(list.Append({name:"x",weight:1}),false);
});

test("morph record declared hydration, persistence and copy preserve values",()=>{
 const value=new DictReader({declarations:true}).CreateObject({_type:"Tr2SerializedMorphAnimation",name:"Smile",weight:0.75});assert.equal(value.constructor,Tr2SerializedMorphAnimation);
 const copy=new Tr2SerializedMorphAnimation();blue.classes.CopyTo(value,copy);assert.deepEqual([copy.name,copy.weight],["Smile",0.75]);assert.deepEqual(new DictWriter().WriteObject(value,{}, {persistOnly:true}),{name:"Smile",weight:0.75});
});

test("actual mesh constructs and updates serialized morph records",()=>{
 const mesh=new Tr2Mesh(),lod={morphTargetNames:["Smile","Blink"],isBakedMorphTarget:[false,false]};
 const geometry={IsGood(){return true;},GetPayload(){return {meshes:[{lods:[lod]}]};},GetBoundingBox(_index,min,max){if(!min&&!max)return {min:[-1,-1,-1],max:[1,1,1]};min.set([-1,-1,-1]);max.set([1,1,1]);return true;}};
 mesh.Initialize();mesh.SetGeometryRes(geometry);assert.ok(mesh.serializedMorphAnimations.every(value=>value.constructor===Tr2SerializedMorphAnimation));assert.deepEqual(mesh.serializedMorphAnimations.map(value=>value.name),["Smile","Blink"]);
 const smile=mesh.serializedMorphAnimations[0];assert.equal(mesh.SetMorphTargetWeight("Smile",0.5),true);assert.equal(mesh.serializedMorphAnimations[0],smile);assert.equal(smile.weight,0.5);assert.equal(mesh.GetMorphTargetWeight("Smile"),0.5);mesh.SetGeometryRes(null);
});
