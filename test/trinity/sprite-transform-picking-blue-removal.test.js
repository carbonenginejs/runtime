import test from "node:test";
import assert from "node:assert/strict";
import { blue, GetResources } from "../../npm/dist/global/blue/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { DictWriter } from "../../npm/dist/global/blue/DictWriter.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { Tr2Sprite2dPickingMask } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dPickingMask.js";
import { Tr2Sprite2dTransform } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dTransform.js";
import { Tr2Sprite2dContainerBase } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dContainerBase.js";
import { Tr2Sprite2dRenderJob } from "../../npm/dist/trinity/sprite2d/Tr2Sprite2dRenderJob.js";
import { Tr2ImageRes } from "../../npm/dist/resource/texture/Tr2ImageRes.js";
import { ResourceRequirement } from "../../npm/dist/resource/index.js";
import { composeStubResMan } from "../support/stubResMan.js";

const image = new Tr2ImageRes();
const stub = composeStubResMan(() => image);

test("PickingMask is an independent native IRoot record with only its own query", () => {
 const mask=blue.classes.CreateInstanceFromName("Tr2Sprite2dPickingMask");
 assert.equal(mask.constructor,Tr2Sprite2dPickingMask);
 assert.equal(Object.getPrototypeOf(Tr2Sprite2dPickingMask.prototype),Object.prototype);
 for(const name of ["SetValues","GetValues","Clone","Traverse","GetResources","OnEvent"])assert.equal(name in mask,false);
 assert.equal("from" in Tr2Sprite2dPickingMask,false);
 assert.deepEqual([...mappedInterfaces(Tr2Sprite2dPickingMask)],[Tr2Sprite2dPickingMask]);
 assert.equal(mask.maskPath,"");assert.equal(mask.mask,null);assert.equal(mask.channel,3);
 for(const name of ["threshold","leftEdge","topEdge","rightEdge","bottomEdge"])assert.equal(mask[name],0);
});

test("PickingMask declarations preserve native property order, chooser and held resource",()=>{
 const schema=CjsSchema.getSchema(Tr2Sprite2dPickingMask);
 const members=[...schema.properties,...schema.members];
 assert.equal(schema.properties[0].role,"property");
 assert.deepEqual(members.map(m=>m.name),["maskPath","channel","threshold","leftEdge","topEdge","rightEdge","bottomEdge","mask"]);
 const path=CjsSchema.getField(Tr2Sprite2dPickingMask,"maskPath");assert.equal(path.type.kind,"wstring");assert.equal(path.edit.write,true);
 const channel=CjsSchema.getField(Tr2Sprite2dPickingMask,"channel");assert.deepEqual(channel.enum.values,{Red:2,Green:1,Blue:0,Alpha:3});assert.equal(channel.enum.enumType,undefined);assert.equal(channel.edit.enum,true);assert.equal(channel.type.kind,"uint32");
 const resource=CjsSchema.getField(Tr2Sprite2dPickingMask,"mask");assert.equal(resource.type.runtimeOnly,true);assert.equal(resource.type.className,"Tr2ImageRes");assert.equal(resource.edit.read,true);
 for(const member of members)assert.notEqual(member.edit?.persist,true);
});

test("direct and dictionary path writes run the live resource acquisition property",()=>{
 const mask=new Tr2Sprite2dPickingMask();const count=stub.requests.length;
 mask.maskPath="res:/test/pick-mask.png";assert.equal(mask.GetMaskPath(),mask.maskPath);assert.equal(mask.mask,image);assert.equal(stub.requests.length,count+1);assert.equal(stub.requests.at(-1).options.requirement,ResourceRequirement.IMAGE);
 mask.SetMaskPath(mask.maskPath);assert.equal(stub.requests.length,count+1);assert.equal(mask.mask,image);
 new DictReader({declarations:true}).ReadInto(mask,{maskPath:"res:/test/other-mask.png",channel:2,leftEdge:1});assert.equal(mask.maskPath,"res:/test/other-mask.png");assert.equal(stub.requests.length,count+2);assert.equal(mask.mask,image);
 const result=new DictWriter().WriteObject(mask);assert.equal(result.maskPath,mask.maskPath);assert.equal("mask" in result,false);assert.equal("_maskPath" in result,false);
 mask.maskPath="";assert.equal(mask.mask,null);assert.equal(stub.requests.length,count+2);
});

test("Blue resource traversal reaches a held image through the actual sprite owner",()=>{
 const owner=new Tr2Sprite2dRenderJob(),mask=new Tr2Sprite2dPickingMask();owner.pickingMask=mask;mask.mask=image;
 assert.deepEqual(GetResources(mask),[image]);assert.deepEqual(GetResources(owner),[image]);
 mask.mask=null;assert.deepEqual(GetResources(owner),[]);
});

test("actual sprite PickPoint consumes the preserved nine-slice mask and strict threshold",()=>{
 const owner=new Tr2Sprite2dRenderJob(),mask=new Tr2Sprite2dPickingMask();Object.assign(owner,{display:true,pickState:1,displayX:0,displayY:0,displayWidth:8,displayHeight:8,pickingMask:mask});
 Object.assign(mask,{channel:2,leftEdge:1,topEdge:1,rightEdge:1,bottomEdge:1,mask:{IsGood:()=>true,GetWidth:()=>4,GetHeight:()=>4,GetPixelColor:(x,y)=>x===2&&y===2?[255,0,0,255]:[0,0,0,0]}});
 const renderer={IsInside:()=>true,InverseTransformPoint:point=>point};
 assert.equal(owner.PickPoint(4.5,4.5,renderer),owner);assert.equal(owner.PickPoint(0.9,0.9,renderer),null);mask.threshold=1;assert.equal(owner.PickPoint(4.5,4.5,renderer),null);
});

test("Transform retains its native base, ordered notifications and exact empty local exposure",()=>{
 assert.equal(Object.getPrototypeOf(Tr2Sprite2dTransform.prototype),Tr2Sprite2dContainerBase.prototype);
 const table=Object.getOwnPropertyDescriptor(Tr2Sprite2dTransform,Symbol.for("carbonenginejs.carbon.mappedInterfaces"))?.value;
 assert.ok(table);assert.deepEqual([...table.interfaces],[]);assert.equal(table.chainTo,Tr2Sprite2dContainerBase);
 assert.deepEqual([...mappedInterfaces(Tr2Sprite2dTransform)],[...mappedInterfaces(Tr2Sprite2dContainerBase)]);
 const names=["rotationCenter","rotation","scalingCenter","scalingRotation","scale"];
 const own=CjsSchema.getSchema(Tr2Sprite2dTransform).fields.filter(f=>names.includes(f.name));assert.deepEqual(own.map(f=>f.name),names);
 for(const field of own){assert.equal(field.edit.notify,true);assert.equal(field.edit.write,true);assert.notEqual(field.edit.persist,true);}
 const a=new Tr2Sprite2dTransform(),b=new Tr2Sprite2dTransform();assert.deepEqual([...a.scale],[1,1]);assert.notEqual(a.scale,b.scale);assert.notEqual(a.rotationCenter,b.rotationCenter);assert.notEqual(a.scalingCenter,b.scalingCenter);
});

test("Transform point adapter preserves rounded-center rotation and independent results",()=>{
 const transform=new Tr2Sprite2dTransform();transform.displayWidth=transform.displayHeight=100;transform.rotationCenter.set([0.5,0.5]);transform.rotation=Math.PI/2;
 const first=transform.TransformPoint(60,50),second=transform.TransformPoint(50,60);assert.ok(Math.abs(first[0]-50)<1e-5);assert.ok(Math.abs(first[1]-60)<1e-5);assert.ok(Math.abs(second[0]-40)<1e-5);assert.ok(Math.abs(second[1]-50)<1e-5);assert.notEqual(first,second);
});
