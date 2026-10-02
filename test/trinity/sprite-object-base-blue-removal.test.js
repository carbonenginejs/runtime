import test from "node:test";
import assert from "node:assert/strict";
import { blue, INotify, BlueList, Traverse } from "../../npm/dist/global/blue/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { DictWriter } from "../../npm/dist/global/blue/DictWriter.js";
import { ITr2SpriteObject } from "../../npm/dist/trinity/sprite2d/ITr2SpriteObject.js";
import { Tr2SpriteObjectBase } from "../../npm/dist/trinity/sprite2d/Tr2SpriteObjectBase.js";
import { Tr2Sprite2dContainerBase } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dContainerBase.js";
import { Tr2Sprite2dTransform } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dTransform.js";
import { Tr2Sprite2dRenderJob } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dRenderJob.js";
import { Tr2SpriteObject } from "../../npm/dist/trinity/generated/sprite2d/Tr2SpriteObject.js";
import { Tr2Sprite2dContainer } from "../../npm/dist/trinity/generated/sprite2d/Tr2Sprite2dContainer.js";

const descendants=[Tr2SpriteObjectBase,Tr2Sprite2dContainerBase,Tr2Sprite2dTransform,Tr2Sprite2dRenderJob,Tr2SpriteObject,Tr2Sprite2dContainer];

test("native six-verb sprite interface stays abstract and model-free",()=>{
 assert.equal(Object.getPrototypeOf(ITr2SpriteObject.prototype),Object.prototype);
 assert.deepEqual(Object.getOwnPropertyNames(ITr2SpriteObject.prototype).filter(n=>n!=="constructor"),["GatherSprites","PickPoint","SetParent","SetDirty","SetChildDirty","IsAuxMouseover"]);
 const base=new ITr2SpriteObject();for(const name of Object.getOwnPropertyNames(ITr2SpriteObject.prototype).filter(n=>n!=="constructor")){assert.throws(()=>base[name](),/must be implemented/);assert.equal(CjsSchema.getMethod(ITr2SpriteObject,name).impl.status,"abstract");}
 assert.equal(CjsSchema.GetConstructor("ITr2SpriteObject"),ITr2SpriteObject);
 assert.equal(blue.classes.CreateInstanceFromName("ITr2SpriteObject"),null);assert.equal(blue.classes.CreateInstanceFromName("Tr2SpriteObjectBase"),null);
});

test("base and real descendants lose inherited model machinery while retaining exact native contracts",()=>{
 assert.equal(Object.getPrototypeOf(Tr2SpriteObjectBase.prototype),ITr2SpriteObject.prototype);
 for(const Class of descendants){const value=new Class();for(const name of ["SetValues","GetValues","Clone","Traverse","GetResources","OnEvent","Destroy"])assert.equal(name in value,false,Class.name+"."+name);assert.equal("from" in Class,false);assert.deepEqual([...mappedInterfaces(Class)],[ITr2SpriteObject,INotify],Class.name);assert.equal(CjsSchema.cast(value,ITr2SpriteObject),value);assert.equal(CjsSchema.cast(value,INotify),value);}
 const list=new BlueList(ITr2SpriteObject);assert.equal(list.Append(new Tr2Sprite2dRenderJob()),true);assert.equal(list.Append({SetDirty(){},GatherSprites(){}}),false);
});

test("base native members and live display retain defaults, order, types and flags",()=>{
 const schema=CjsSchema.getSchema(Tr2SpriteObjectBase);
 assert.deepEqual(schema.members.map(f=>f.name),["name","auxMouseover","isDirty","displayX","displayY","displayWidth","displayHeight","pickState","pickingMask"]);
 assert.deepEqual(schema.properties.map(f=>f.name),["display"]);assert.equal(schema.properties[0].role,"property");assert.equal(schema.properties[0].type.kind,"boolean");
 assert.equal(CjsSchema.getField(Tr2SpriteObjectBase,"name").type.kind,"wstring");
 for(const name of ["displayX","displayY","displayWidth","displayHeight"]){const field=CjsSchema.getField(Tr2SpriteObjectBase,name);assert.equal(field.edit.notify,true);assert.equal(field.edit.read,true);assert.equal(field.edit.write,true);assert.equal(field.type.kind,"float32");}
 const persist=schema.members.filter(f=>f.edit?.persist).map(f=>f.name);assert.deepEqual(persist,["pickState"]);
 const value=new Tr2SpriteObjectBase();assert.deepEqual([value.name,value.auxMouseover,value.display,value.isDirty,value.displayX,value.displayY,value.displayWidth,value.displayHeight,value.pickState,value.pickingMask],["",null,true,true,0,0,0,0,1,null]);assert.equal(value.IsAuxMouseover(),false);
});

test("live display propagates once on change through real nested container parents",()=>{
 const outer=new Tr2Sprite2dContainerBase(),inner=new Tr2Sprite2dContainerBase(),leaf=new Tr2Sprite2dRenderJob();inner.SetParent(outer);leaf.SetParent(inner);
 let calls=0;const notify=inner.SetChildDirty;inner.SetChildDirty=function(child){calls++;return notify.call(this,child);};
 const reset=()=>{calls=0;for(const value of [outer,inner,leaf])value.isDirty=false;};reset();leaf.display=false;assert.equal(calls,1);assert.deepEqual([outer.isDirty,inner.isDirty,leaf.isDirty],[true,true,true]);assert.equal(leaf.GetDisplay(),false);
 reset();leaf.SetDisplay(false);assert.equal(calls,0);assert.deepEqual([outer.isDirty,inner.isDirty,leaf.isDirty],[false,false,false]);leaf.display=true;assert.equal(calls,1);assert.deepEqual([outer.isDirty,inner.isDirty,leaf.isDirty],[true,true,true]);
 reset();leaf.SetParent(null);reset();leaf.SetDirty();assert.deepEqual([outer.isDirty,inner.isDirty,leaf.isDirty],[false,false,true]);
 assert.throws(()=>leaf.SetParent({}),TypeError);assert.throws(()=>leaf.SetDirty(),TypeError);
});

test("declared dictionary notification and inherited transform notify reach native parent dirty callbacks",()=>{
 const parent=new Tr2Sprite2dContainerBase(),value=new Tr2Sprite2dTransform();value.SetParent(parent);parent.isDirty=value.isDirty=false;
 const notifications=[];const notify=value.OnModified;value.OnModified=function(name){notifications.push(name);return notify.call(this,name);};
 new DictReader({declarations:true}).ReadInto(value,{displayX:3});assert.equal(value.displayX,3);assert.equal(parent.isDirty,true);assert.equal(value.isDirty,true);assert.deepEqual(notifications,["displayX"]);
 parent.isDirty=value.isDirty=false;new DictReader({declarations:true}).ReadInto(value,{rotation:0.5});assert.equal(value.rotation,0.5);assert.equal(parent.isDirty,true);assert.equal(value.isDirty,true);assert.deepEqual(notifications,["displayX","rotation"]);
 parent.isDirty=value.isDirty=false;new DictReader({declarations:true}).ReadInto(value,{name:"label"});assert.equal(parent.isDirty,false);assert.equal(value.isDirty,false);
 new DictReader({declarations:true}).ReadInto(value,{display:false});assert.equal(value.display,false);assert.equal(parent.isDirty,true);
});

test("scalar setters retain change guards and required parent failures",()=>{
 const leaf=new Tr2Sprite2dRenderJob();let calls=0;leaf.SetParent({SetChildDirty(child){assert.equal(child,leaf);calls++;}});calls=0;
 for(const axis of ["X","Y","Width","Height"]){leaf["SetDisplay"+axis](4);assert.equal(leaf["GetDisplay"+axis](),4);leaf["SetDisplay"+axis](4);}assert.equal(calls,4);assert.equal(leaf.OnModified("name"),true);assert.equal(calls,5);
});

test("actual RenderJob gathers and picks using inherited display state without model helpers",()=>{
 const value=new Tr2Sprite2dRenderJob(),job={};value.renderJob=job;const calls=[];const renderer={RunJob(j){calls.push(j);},IsInside(){return true;}};
 value.GatherSprites(renderer);assert.deepEqual(calls,[job]);assert.equal(value.PickPoint(1,2,renderer),value);value.display=false;value.GatherSprites(renderer);assert.equal(calls.length,1);assert.equal(value.PickPoint(1,2,renderer),null);
});

test("dictionary copy persists only pickState and declared traversal excludes the parent link",()=>{
 const parent=new Tr2Sprite2dContainerBase(),value=new Tr2Sprite2dRenderJob();value.SetParent(parent);value.auxMouseover=parent;value.name="authored";value.pickState=2;value.display=false;
 const clone=new Tr2Sprite2dRenderJob();blue.classes.CopyTo(value,clone);assert.equal(clone.pickState,2);assert.equal(clone.name,"");assert.equal(clone.display,true);
 const written=new DictWriter().WriteObject(value,{}, {persistOnly:true});assert.deepEqual(written,{pickState:2});assert.equal(CjsSchema.getField(Tr2SpriteObjectBase,"auxMouseover").type.kind,"weakRef");const nodes=[];Traverse(value,node=>nodes.push(node));assert.equal(nodes.includes(parent),false);assert.equal(nodes.includes(value),true);
});
