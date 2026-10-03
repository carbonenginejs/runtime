import { getRegisteredClassName } from "../../npm/dist/global/compose/className.js";
import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { blue, BlueList } from "../../npm/dist/global/blue/index.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { DictWriter } from "../../npm/dist/global/blue/DictWriter.js";
import { Tr2Sprite2dTriangle } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dTriangle.js";
import { Tr2Sprite2dPolygon } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dPolygon.js";
import { Tr2UpscalingTechniqueInfo } from "../../npm/dist/trinity/core/device/Tr2UpscalingTechniqueInfo.js";

for(const [Class,fields,types,defaults]of [
 [Tr2Sprite2dTriangle,["index0","index1","index2"],["uint16","uint16","uint16"],[0,0,0]],
 [Tr2UpscalingTechniqueInfo,["technique","supportedSettings","framegeneration"],["uint32","uint32","boolean"],[0,0,false]]
])test(getRegisteredClassName(Class)+" factory exposes its record fields without model conveniences",()=>{
 const value=blue.classes.CreateInstanceFromName(getRegisteredClassName(Class));assert.equal(value.constructor,Class);assert.equal(Object.getPrototypeOf(Class.prototype),Object.prototype);
 assert.deepEqual(Object.keys(value),fields);assert.deepEqual(fields.map(field=>value[field]),defaults);
 assert.deepEqual(fields.map(field=>CjsSchema.getField(Class,field).type.kind),types);
 for(const name of ["SetValues","GetValues","Clone","OnEvent","Traverse","GetResources"])assert.equal(name in value,false);
 assert.equal("from" in Class,false);
});

test("triangle native query table admits typed-list records without struct interface invention",()=>{
 assert.deepEqual([...mappedInterfaces(Tr2Sprite2dTriangle)],[Tr2Sprite2dTriangle]);assert.deepEqual([...mappedInterfaces(Tr2UpscalingTechniqueInfo)],[]);
 const list=new BlueList(Tr2Sprite2dTriangle),triangle=new Tr2Sprite2dTriangle();assert.equal(list.Append(triangle),true);assert.equal(list.Append({index0:0,index1:1,index2:2}),false);assert.equal(list[0],triangle);
});

test("triangle declared readers, persistent writer and copier preserve indices",()=>{
 const source={_type:"Tr2Sprite2dTriangle",index0:4,index1:5,index2:65535};const triangle=new DictReader({declarations:true}).CreateObject(source);
 assert.equal(triangle.constructor,Tr2Sprite2dTriangle);assert.deepEqual([triangle.index0,triangle.index1,triangle.index2],[4,5,65535]);
 const written=new DictWriter().WriteObject(triangle,{}, {persistOnly:true});assert.deepEqual([written.index0,written.index1,written.index2],[4,5,65535]);
 const target=new Tr2Sprite2dTriangle();assert.equal(blue.classes.CopyTo(triangle,target),target);assert.deepEqual([target.index0,target.index1,target.index2],[4,5,65535]);
});

test("upscaling struct uses dictionary values while native persistence copy skips its unflagged fields",()=>{
 const source={_type:"Tr2UpscalingTechniqueInfo",technique:2,supportedSettings:7,framegeneration:true};const value=new DictReader({declarations:true}).CreateObject(source);
 assert.equal(value.constructor,Tr2UpscalingTechniqueInfo);assert.deepEqual([value.technique,value.supportedSettings,value.framegeneration],[2,7,true]);
 const target=new Tr2UpscalingTechniqueInfo();blue.classes.CopyTo(value,target);assert.deepEqual([target.technique,target.supportedSettings,target.framegeneration],[0,0,false]);
 const written=new DictWriter().WriteObject(value);assert.deepEqual([written.technique,written.supportedSettings,written.framegeneration],[2,7,true]);
 new DictReader({declarations:true}).ReadInto(target,written);assert.deepEqual([target.technique,target.supportedSettings,target.framegeneration],[2,7,true]);
 const persisted=new DictWriter().WriteObject(value,{}, {persistOnly:true});for(const field of ["technique","supportedSettings","framegeneration"])assert.equal(Object.hasOwn(persisted,field),false);
 assert.equal(Object.hasOwn(written,"framegen"),false);assert.equal(Tr2UpscalingTechniqueInfo.UpscalingTechnique.NONE,0);
});

test("actual polygon AppendTriangles constructs native records and preserves wrapping and dirty notification",()=>{
 const polygon=new Tr2Sprite2dPolygon(),list=polygon.triangles;polygon.isDirty=false;polygon.AppendTriangles([[1,2,3],[65536,-1,7]]);
 assert.equal(polygon.triangles,list);assert.equal(polygon.isDirty,true);assert.equal(list.length,2);
 assert.ok(list.every(triangle=>triangle.constructor===Tr2Sprite2dTriangle));assert.deepEqual(list.map(triangle=>[triangle.index0,triangle.index1,triangle.index2]),[[1,2,3],[0,65535,7]]);
 assert.throws(()=>polygon.AppendTriangles([[1,2]]),TypeError);assert.equal(list.length,2);
});
