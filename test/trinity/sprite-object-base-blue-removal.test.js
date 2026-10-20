import { IRoot as ExposureRoot } from "../../npm/dist/global/blue/IRoot.js";
import test from "node:test";
import assert from "node:assert/strict";
import { be, INotify, IListNotify, BlueList } from "../../npm/dist/global/blue/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { DictWriter } from "../../npm/dist/global/blue/DictWriter.js";
import { ITr2SpriteObject } from "../../npm/dist/trinity/sprite2d/ITr2SpriteObject.js";
import { Tr2SpriteObjectBase } from "../../npm/dist/trinity/sprite2d/Tr2SpriteObjectBase.js";
import { Tr2Sprite2dContainerBase } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dContainerBase.js";
import { Tr2Sprite2dTransform } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dTransform.js";
import { Tr2Sprite2dRenderJob } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dRenderJob.js";
import { Tr2SpriteObject } from "../../npm/dist/trinity/sprite2d/Tr2SpriteObject.js";
import { Tr2Sprite2dContainer } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dContainer.js";

const descendants=[Tr2SpriteObjectBase,Tr2Sprite2dContainerBase,Tr2Sprite2dTransform,Tr2Sprite2dRenderJob,Tr2SpriteObject,Tr2Sprite2dContainer];

// Each class's exposure table as Carbon resolves it: its own entry, its MAP_INTERFACE lines, then its
// EXPOSURE_CHAINTO parent's table.
//   Tr2SpriteObjectBase      [ITr2SpriteObject, INotify] END             (Tr2SpriteObject_Blue.cpp:61-139)
//   Tr2SpriteObject          CHAINTO(Tr2SpriteObjectBase)                (Tr2SpriteObject_Blue.cpp:144-234)
//   Tr2Sprite2dContainerBase [ITr2SpriteObject, IListNotify] CHAINTO(Tr2SpriteObjectBase) (Tr2Sprite2dContainer_Blue.cpp:11-35)
//   Tr2Sprite2dContainer     CHAINTO(Tr2Sprite2dContainerBase)           (Tr2Sprite2dContainer_Blue.cpp:40-90)
//   Tr2Sprite2dTransform     CHAINTO(Tr2Sprite2dContainerBase)           (Tr2Sprite2dTransform_Blue.cpp:13-52)
//   Tr2Sprite2dRenderJob     [ITr2SpriteObject] CHAINTO(Tr2SpriteObjectBase) (Tr2Sprite2dRenderJob_Blue.cpp:10-19)
const BASE_TABLE=[Tr2SpriteObjectBase,ITr2SpriteObject,INotify];
const CONTAINER_BASE_TABLE=[Tr2Sprite2dContainerBase,ITr2SpriteObject,IListNotify,Tr2SpriteObjectBase,INotify];
const CARBON_TABLES=new Map([
 [Tr2SpriteObjectBase,BASE_TABLE],
 [Tr2SpriteObject,[Tr2SpriteObject,...BASE_TABLE]],
 [Tr2Sprite2dContainerBase,CONTAINER_BASE_TABLE],
 [Tr2Sprite2dContainer,[Tr2Sprite2dContainer,...CONTAINER_BASE_TABLE]],
 [Tr2Sprite2dTransform,[Tr2Sprite2dTransform,...CONTAINER_BASE_TABLE]],
 [Tr2Sprite2dRenderJob,[Tr2Sprite2dRenderJob,ITr2SpriteObject,Tr2SpriteObjectBase,INotify]],
]);

// Destruct is now an explicit UI resource cleanup method, not an inherited model helper.
test("native six-verb sprite interface stays abstract and model-free",()=>{
 assert.equal(Object.getPrototypeOf(ITr2SpriteObject.prototype),Object.prototype);
 const nativeVerbs=["GatherSprites","PickPoint","SetParent","SetDirty","SetChildDirty","IsAuxMouseover"];
 assert.deepEqual(Object.getOwnPropertyNames(ITr2SpriteObject.prototype).filter(n=>n!=="constructor"),[...nativeVerbs,"ClassType","QueryInterface","GetRootObject"]);
 const base=new ITr2SpriteObject();assert.equal(base.GetRootObject(),base);assert.equal(base.ClassType(),CjsSchema.getSchema(ITr2SpriteObject));for(const name of nativeVerbs){assert.throws(()=>base[name](),/must be implemented/);assert.equal(CjsSchema.getMethod(ITr2SpriteObject,name).impl.status,"abstract");}
 assert.equal(CjsSchema.getConstructor("ITr2SpriteObject"),ITr2SpriteObject);
 assert.equal(be.classes.CreateInstanceFromName("ITr2SpriteObject"),null);assert.equal(be.classes.CreateInstanceFromName("Tr2SpriteObjectBase"),null);
});

test("base and real descendants lose inherited model machinery while retaining exact native contracts",()=>{
 assert.equal(Object.getPrototypeOf(Tr2SpriteObjectBase.prototype),ITr2SpriteObject.prototype);
 for(const Class of descendants){const value=new Class();for(const name of ["SetValues","GetValues","Clone","Traverse","GetResources","OnEvent"])assert.equal(name in value,false,Class.name+"."+name);assert.equal("from" in Class,false);assert.deepEqual([...mappedInterfaces(Class)],CARBON_TABLES.get(Class).length ? [ExposureRoot, ...CARBON_TABLES.get(Class)] : [],Class.name);assert.equal(CjsSchema.cast(value,ITr2SpriteObject),value);assert.equal(CjsSchema.cast(value,INotify),value);}
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
 // display is a MAP_PROPERTY, not PERSIST: the dictionary does not carry it (DictReader.cpp:706).
 assert.throws(()=>new DictReader({declarations:true}).ReadInto(value,{display:false}),/Invalid attribute/);
 value.display=false;assert.equal(value.display,false);assert.equal(parent.isDirty,true);
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
 const clone=new Tr2Sprite2dRenderJob();be.classes.CopyTo(value,clone);assert.equal(clone.pickState,2);assert.equal(clone.name,"");assert.equal(clone.display,true);
 const written=new DictWriter().WriteObject(value,{}, {persistOnly:true});assert.deepEqual(written,{pickState:2});assert.equal(CjsSchema.getField(Tr2SpriteObjectBase,"auxMouseover").type.kind,"rootWeak");const nodes=[value,...be.FindAllReferences(value).keys()];assert.equal(nodes.includes(parent),false);assert.equal(nodes.includes(value),true);
});
