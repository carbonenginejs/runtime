import { getRegisteredClassName } from "../../npm/dist/global/compose/className.js";
import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { blue, BlueList } from "../../npm/dist/global/blue/index.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { DictWriter } from "../../npm/dist/global/blue/DictWriter.js";
import { Tr2Sprite2dClipRect } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dClipRect.js";
import { Tr2Sprite2dLineTraceVertex } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dLineTraceVertex.js";
import { Tr2Sprite2dLineTrace } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dLineTrace.js";
import { Tr2Sprite2dD3DVertex } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dD3DVertex.js";

for(const [Class,fields,types,table]of [
 [Tr2Sprite2dClipRect,["left","top","right","bottom"],["float32","float32","float32","float32"],[]],
 [Tr2Sprite2dLineTraceVertex,["name","position","color"],["string","vec2","color"],[Tr2Sprite2dLineTraceVertex]]
])test(getRegisteredClassName(Class)+" native declaration and exposure shape",()=>{
 const value=blue.classes.CreateInstanceFromName(getRegisteredClassName(Class));assert.equal(value.constructor,Class);assert.equal(Object.getPrototypeOf(Class.prototype),Object.prototype);assert.deepEqual(Object.keys(value),fields);
 assert.deepEqual(fields.map(key=>CjsSchema.getField(Class,key).type.kind),types);assert.deepEqual([...mappedInterfaces(Class)],table);
 for(const key of ["SetValues","GetValues","OnEvent","Clone","Traverse","GetResources"])assert.equal(key in value,false);assert.equal("from" in Class,false);
});

test("line trace vertex has independent native defaults and persistent typed record copying",()=>{
 const first=new Tr2Sprite2dLineTraceVertex(),second=new Tr2Sprite2dLineTraceVertex();assert.equal(first.name,"");assert.deepEqual([...first.position],[0,0]);assert.deepEqual([...first.color],[1,1,1,1]);assert.notEqual(first.position,second.position);assert.notEqual(first.color,second.color);
 const list=new BlueList(Tr2Sprite2dLineTraceVertex);assert.equal(list.Append(first),true);assert.equal(list.Append({}),false);
 new DictReader({declarations:true}).ReadInto(first,{name:"point",position:[2,3],color:[0,1,0,1]});blue.classes.CopyTo(first,second);assert.equal(second.name,"point");assert.deepEqual([...second.position],[2,3]);assert.deepEqual([...second.color],[0,1,0,1]);assert.notEqual(first.position,second.position);
 const written=new DictWriter().WriteObject(second,{}, {persistOnly:true});assert.deepEqual(Object.keys(written),["name","position","color"]);assert.equal(written.name,"point");
});

test("clip struct dictionary values travel through the existing D3D vertex field without invented persistence",()=>{
 const clip=new Tr2Sprite2dClipRect();assert.deepEqual([clip.left,clip.top,clip.right,clip.bottom],[0,0,0,0]);
 new DictReader({declarations:true}).ReadInto(clip,{left:1,top:2,right:30,bottom:40});const vertex=new Tr2Sprite2dD3DVertex();vertex.clipRect=clip;
 assert.equal(vertex.clipRect,clip);assert.equal(CjsSchema.getField(Tr2Sprite2dD3DVertex,"clipRect").type.kind,"rawStruct");
 const transported=new DictWriter().WriteObject(vertex).clipRect;assert.deepEqual([transported.left,transported.top,transported.right,transported.bottom],[1,2,30,40]);
 const written=new DictWriter().WriteObject(clip),copy=new Tr2Sprite2dClipRect();new DictReader({declarations:true}).ReadInto(copy,written);assert.deepEqual([copy.left,copy.top,copy.right,copy.bottom],[1,2,30,40]);
 const persisted=new DictWriter().WriteObject(clip,{}, {persistOnly:true});for(const field of ["left","top","right","bottom"])assert.equal(Object.hasOwn(persisted,field),false);
 // The current scene has no clipping algorithm; this proves only existing record transport.
 assert.deepEqual([vertex.clipRect.left,vertex.clipRect.top,vertex.clipRect.right,vertex.clipRect.bottom],[1,2,30,40]);
});

test("actual line trace append and update retain records, transform values and dirty state",()=>{
 const trace=new Tr2Sprite2dLineTrace(),list=trace.vertices;trace.isDirty=false;
 trace.AppendVertices([[1,2],[3,4]],[[1,0,0],[0,1,0],[10,20,1]],[[1,0,0,1],[0,1,0,1]],["a","b"]);
 assert.equal(trace.vertices,list);assert.equal(trace.isDirty,true);assert.ok(list.every(value=>value.constructor===Tr2Sprite2dLineTraceVertex));assert.deepEqual(list.map(value=>[...value.position]),[[11,22],[13,24]]);assert.deepEqual(list.map(value=>value.name),["a","b"]);
 const vertex=list[0],position=vertex.position,color=vertex.color;trace.isDirty=false;trace.SetVertices([[5,6],[7,8]],null,[0,0,1,1],"renamed");
 assert.equal(list[0],vertex);assert.equal(vertex.position,position);assert.equal(vertex.color,color);assert.deepEqual([...position],[5,6]);assert.deepEqual([...color],[0,0,1,1]);assert.equal(vertex.name,"renamed");assert.equal(trace.isDirty,true);
 assert.throws(()=>trace.AppendVertices([[1]],null,[1,1,1,1]),TypeError);assert.equal(list.length,2);
});
