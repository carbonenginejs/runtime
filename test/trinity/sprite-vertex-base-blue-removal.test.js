import { getRegisteredClassName } from "../../npm/dist/global/compose/className.js";
import test from "node:test";
import assert from "node:assert/strict";
import { blue } from "../../npm/dist/global/blue/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { DictWriter } from "../../npm/dist/global/blue/DictWriter.js";
import { Tr2Sprite2dVertexBase } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dVertexBase.js";
import { Tr2Sprite2dVertex } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dVertex.js";
import { Tr2Sprite2dD3DVertex } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dD3DVertex.js";
import { Tr2Sprite2dPolygon } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dPolygon.js";
import { Tr2Sprite2dClipRect } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dClipRect.js";

for(const Class of [Tr2Sprite2dVertexBase,Tr2Sprite2dVertex,Tr2Sprite2dD3DVertex])test(getRegisteredClassName(Class)+" loses inherited model helpers while retaining independent typed vertex storage",()=>{
 const a=blue.classes.CreateInstanceFromName(getRegisteredClassName(Class)),b=new Class();assert.equal(a.constructor,Class);assert.equal(Object.getPrototypeOf(Tr2Sprite2dVertexBase.prototype),Object.prototype);
 for(const key of ["SetValues","GetValues","Clone","OnEvent","Traverse","GetResources"])assert.equal(key in a,false);assert.equal("from" in Class,false);
 assert.deepEqual([...a.position],[0,0,0]);assert.deepEqual([...a.color],[1,1,1,1]);assert.deepEqual(a.texCoord.map(value=>[...value]),[[0,0],[0,0]]);
 for(const key of ["position","color"])assert.notEqual(a[key],b[key]);assert.notEqual(a.texCoord,b.texCoord);assert.notEqual(a.texCoord[0],a.texCoord[1]);assert.notEqual(a.texCoord[0],b.texCoord[0]);
 assert.ok(ArrayBuffer.isView(a.position));assert.ok(ArrayBuffer.isView(a.color));assert.ok(a.texCoord.every(ArrayBuffer.isView));
});

test("plain base has no native query and preserves its existing declaration adapter",()=>{
 assert.deepEqual([...mappedInterfaces(Tr2Sprite2dVertexBase)],[]);const fields=CjsSchema.getSchema(Tr2Sprite2dVertexBase).fields;assert.deepEqual(fields.map(field=>field.name),["position","color","texCoord"]);assert.deepEqual(fields.map(field=>field.type.kind),["vec3","color","array"]);
 assert.equal(CjsSchema.getField(Tr2Sprite2dVertexBase,"position").edit.persist,true);
});

test("D3D derived vertex dictionary transport retains base and derived typed values",()=>{
 const vertex=new Tr2Sprite2dD3DVertex(),position=vertex.position,color=vertex.color;new DictReader({declarations:true}).ReadInto(vertex,{position:[1,2,3],color:[0,0.5,1,1],glowBrightness:2,transformIndex:3,outlineColor:[1,0,0,1]});assert.equal(vertex.position,position);assert.equal(vertex.color,color);assert.deepEqual([...vertex.position],[1,2,3]);assert.deepEqual([...vertex.color],[0,0.5,1,1]);assert.equal(vertex.glowBrightness,2);assert.equal(vertex.transformIndex,3);
 vertex.texCoord[0].set([0.25,0.5]);vertex.texCoord[1].set([0.75,1]);vertex.clipRect=Object.assign(new Tr2Sprite2dClipRect(),{left:1,top:2,right:30,bottom:40});
 const written=new DictWriter().WriteObject(vertex);assert.deepEqual(written.position,[1,2,3]);assert.deepEqual(written.texCoord,[[0.25,0.5],[0.75,1]]);assert.equal(written.clipRect.right,30);assert.deepEqual(written.outlineColor,[1,0,0,1]);
 const copy=new Tr2Sprite2dD3DVertex();blue.classes.CopyTo(vertex,copy);assert.deepEqual([...copy.position],[1,2,3]);assert.notEqual(copy.position,vertex.position);assert.deepEqual([...copy.color],[1,1,1,1],"existing unflagged base color is not persisted");
});

test("actual polygon consumer retains authored vertices and texture-coordinate methods",()=>{
 const polygon=new Tr2Sprite2dPolygon();polygon.AppendVertices([[1,2],[3,4]],[[1,0,0],[0,1,0],[10,20,1]],[1,0,0,1],[[0,0],[1,1]]);const vertex=polygon.vertices[0],position=vertex.position;assert.equal(vertex.constructor,Tr2Sprite2dVertex);assert.deepEqual([...position],[11,22,0]);assert.deepEqual([...vertex.color],[1,0,0,1]);
 vertex.SetTexCoord(1,[0.5,0.75]);const uv=vertex.GetTexCoord(1);assert.deepEqual([...uv],[0.5,0.75]);uv[0]=9;assert.equal(vertex.texCoord[1][0],0.5);assert.throws(()=>vertex.SetTexCoord(2,[0,0]),RangeError);
 polygon.SetVertices([[5,6],[7,8]],null,[0,1,0,1]);assert.equal(polygon.vertices[0],vertex);assert.equal(vertex.position,position);assert.deepEqual([...position],[5,6,0]);assert.deepEqual([...vertex.color],[0,1,0,1]);
});
