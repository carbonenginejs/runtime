import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema, meta } from "../../npm/dist/global/schema/index.js";
import { blue, BlueList, ITriFunction, ITriVectorFunction, ITriColorFunction, ITriQuaternionFunction, ITriScalarFunction, ITriCurveLength, IInitialize } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { DictWriter } from "../../npm/dist/global/blue/DictWriter.js";
import { ITriDuration } from "../../npm/dist/trinity/curves/ITriDuration.js";
import { TriVectorSequencer } from "../../npm/dist/trinity/curves/curve/TriVectorSequencer.js";
import { TriColorSequencer } from "../../npm/dist/trinity/curves/curve/TriColorSequencer.js";
import { Tr2CurveEulerRotationExpression } from "../../npm/dist/trinity/curves/curve/Tr2CurveEulerRotationExpression.js";
import { Tr2CurveScalar } from "../../npm/dist/trinity/curves/curve/Tr2CurveScalar.js";
import { Tr2CurveVector3 } from "../../npm/dist/trinity/curves/curve/Tr2CurveVector3.js";
import { Tr2CurveColor } from "../../npm/dist/trinity/curves/curve/Tr2CurveColor.js";
import { createSofHydrationAdapter } from "../../npm/dist/sof/createSofHydrationAdapter.js";
import { TriCurveSet } from "../../npm/dist/trinity/curves/TriCurveSet.js";
import { quat, fromYawPitchRoll } from "../../npm/dist/global/math/quat.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { vec4 } from "../../npm/dist/global/math/vec4.js";

for(const [Class,Base,table] of [
 [TriVectorSequencer,ITriVectorFunction,[ITriFunction,ITriVectorFunction]],
 [TriColorSequencer,ITriColorFunction,[ITriFunction,ITriColorFunction,ITriCurveLength]],
 [Tr2CurveEulerRotationExpression,ITriQuaternionFunction,[Tr2CurveEulerRotationExpression,ITriQuaternionFunction,ITriFunction,IInitialize]]
])test(Class.name+" native base and exact exposure",()=>{
 const instance=blue.classes.CreateInstanceFromName(Class.name);
 assert.equal(instance.constructor,Class);assert.equal(Object.getPrototypeOf(Class.prototype),Base.prototype);
 assert.deepEqual([...mappedInterfaces(Class)],table);
 for(const method of ["SetValues","GetValues","OnEvent","Clone","Traverse","GetResources"])assert.equal(method in instance,false);
 assert.equal("from" in Class,false);assert.equal(instance.Reset,ITriFunction.prototype.Reset);
 const list=new BlueList(ITriFunction);assert.equal(list.Append(instance),true);
});

for(const [Class,Base,math,n] of [[TriVectorSequencer,ITriVectorFunction,vec3,3],[TriColorSequencer,ITriColorFunction,vec4,4]])test(Class.name+" commits successful sampling and releases failed output lease",()=>{
 class Child extends Base{}meta.blue.interfaceTable({interfaces:[Child,Base],chainTo:null})(Child);
 const curve=new Class(),a=new Child(),b=new Child(),calls=[];curve.functions.Append(a);curve.functions.Append(b);
 a.GetValueAt=(time,out)=>{calls.push(time);out.fill(2);return out;};b.GetValueAt=(_time,out)=>{out.fill(3);return out;};
 a.Update=()=>{throw new Error("must sample child");};b.Update=a.Update;
 const cache=curve.value,out=new Float32Array(n);assert.equal(curve.Update(4,out),out);assert.equal(curve.value,cache);assert.deepEqual([...cache],Array(n).fill(6));assert.deepEqual(calls,[4]);
 const alloc=math.alloc,unalloc=math.unalloc;let leased=0;
 math.alloc=()=>{leased++;return alloc();};math.unalloc=value=>{leased--;unalloc(value);};
 try{
  b.GetValueAt=(_time,scratch)=>{scratch[0]=99;throw new Error("partial child");};
  assert.throws(()=>curve.UpdateValue(5),/partial child/);assert.equal(leased,0);assert.deepEqual([...cache],Array(n).fill(6));
  out.fill(9);assert.throws(()=>curve.Update(6,out),/partial child/);assert.deepEqual([...cache],Array(n).fill(6));assert.deepEqual([...out],Array(n).fill(2));
 }finally{math.alloc=alloc;math.unalloc=unalloc;}
});

test("color length uses declared duration/length interfaces and required methods",()=>{
 class Hidden extends ITriColorFunction{Length(){throw new Error("unmapped");}}
 class Duration extends ITriColorFunction{Length(){return 7;}}
 class Length extends ITriColorFunction{Length(){return 4;}}
 for(const [Class,extra]of [[Hidden,[]],[Duration,[ITriDuration]],[Length,[ITriCurveLength]]])meta.blue.interfaceTable({interfaces:[Class,ITriColorFunction,...extra],chainTo:null})(Class);
 const curve=new TriColorSequencer();curve.functions.Append(new Hidden());assert.equal(curve.Length(),0);
 const duration=new Duration();curve.functions.Append(duration);curve.functions.Append(new Length());assert.equal(curve.Length(),7);
 duration.Length=null;assert.throws(()=>curve.Length(),TypeError);
});

for(const [Class,field,Child]of [[TriVectorSequencer,"functions",Tr2CurveVector3],[TriColorSequencer,"functions",Tr2CurveColor],[Tr2CurveEulerRotationExpression,"inputs",Tr2CurveScalar]])test(Class.name+" declared hydration and copy retain typed list identity",()=>{
 const curve=new Class(),list=curve[field];assert.equal(list instanceof BlueList,true);assert.equal(list.Append({}),false);
 new DictReader({declarations:true}).ReadInto(curve,{[field]:[{_type:Child.name,name:"child"}]});assert.equal(curve[field],list);assert.equal(list[0].constructor,Child);
 const copy=new Class(),copyList=copy[field];blue.classes.CopyTo(curve,copy);assert.equal(copy[field],copyList);assert.notEqual(copyList[0],list[0]);assert.equal(copyList[0].name,"child");
 assert.equal(new DictWriter().WriteObject(curve,{}, {persistOnly:true})[field][0].name,"child");
 if(Class!==Tr2CurveEulerRotationExpression){assert.equal(CjsSchema.getField(Class,"name").type.kind,"wstring");assert.equal(CjsSchema.getField(Class,"start").type.kind,"int64");}
});

test("Euler native setter cache survives empty and invalid text while same text recompiles",()=>{
 const curve=new Tr2CurveEulerRotationExpression();curve.expressionYaw="0.5";const initial=curve._programs[0];assert.ok(initial);
 curve.expressionYaw="0.5";assert.notEqual(curve._programs[0],initial);const retained=curve._programs[0];
 curve.SetExpressionYaw("(");assert.equal(curve.expressionYaw,"0.5");assert.equal(curve._programs[0],retained);
 curve.expressionYaw="";assert.equal(curve.expressionYaw,"");assert.equal(curve._programs[0],retained);
 const out=quat.create();curve.GetValue(2,out);assert.deepEqual([...out],[...fromYawPitchRoll(quat.create(),0.5,0,0)]);
 curve._expressionYaw="(";assert.equal(curve.Initialize(),true);assert.equal(curve.expressionYaw,"");assert.equal(curve._programs[0],retained);
 curve.GetValue(2,out);assert.deepEqual([...out],[...fromYawPitchRoll(quat.create(),0.5,0,0)]);
});

test("Euler stored hydration bypasses live setter then factory Initialize compiles each axis",()=>{
 const original=Tr2CurveEulerRotationExpression.prototype.SetExpressionYaw;let liveCalls=0;
 Tr2CurveEulerRotationExpression.prototype.SetExpressionYaw=function(value){liveCalls++;return original.call(this,value);};
 try{
  const curve=new Tr2CurveEulerRotationExpression();new DictReader({declarations:true,initialize:false}).ReadInto(curve,{expressionYaw:"0.25",expressionPitch:"0.5",expressionRoll:"0.75"});
  assert.equal(liveCalls,0);assert.equal(curve.expressionYaw,"0.25");assert.deepEqual(curve._programs,[null,null,null]);
  curve.expressionYaw="1";assert.equal(liveCalls,1);
  const factory=new DictReader({declarations:true}).CreateObject({_type:"Tr2CurveEulerRotationExpression",expressionYaw:"0.25",expressionPitch:"0.5",expressionRoll:"0.75"});
  assert.ok(factory._programs.every(program=>program.IsValid()));assert.deepEqual(factory._programs.map(program=>program.source),["0.25","0.5","0.75"]);
  const saved=new DictWriter().WriteObject(factory,{}, {persistOnly:true});assert.equal(saved.expressionYaw,"0.25");assert.equal(Object.hasOwn(saved,"_expressionYaw"),false);
 }finally{Tr2CurveEulerRotationExpression.prototype.SetExpressionYaw=original;}
});

test("Euler SOF lazy compilation and typed scalar input times remain available",()=>{
 const curve=new Tr2CurveEulerRotationExpression(),adapter=createSofHydrationAdapter();adapter.applyValues(curve,{expressionYaw:"time"});adapter.finalize(curve,{kind:"Tr2CurveEulerRotationExpression"});assert.equal(curve._programs[0],null);
 curve.timeScale=2;const out=quat.create();curve.GetValueAt(2,out);assert.ok(curve._programs[0]);assert.deepEqual([...out],[...fromYawPitchRoll(quat.create(),1,0,0)]);
 class Scalar extends ITriScalarFunction{GetValueAt(time){return time+3;}}meta.blue.interfaceTable({interfaces:[Scalar,ITriScalarFunction],chainTo:null})(Scalar);
 const input=new Scalar();curve.inputs.Append(input);assert.equal(curve.GetInputValue(0),4);assert.equal(curve.GetInputValue(0,5),8);assert.equal(curve.GetInputValue(8),0);
 input.GetValueAt=null;assert.throws(()=>curve.GetInputValue(0),TypeError);
});

test("Euler curve set dispatch samples the retained expression program",()=>{
 const curve=new Tr2CurveEulerRotationExpression();curve.expressionRoll="0.5";curve.expressionRoll="";
 const set=new TriCurveSet();set.playOnLoad=false;set.AddCurve(curve);set.PlayFrom(1);set.Apply();assert.deepEqual([...curve.currentValue],[...fromYawPitchRoll(quat.create(),0,0,0.5)]);set.Dispose();
});

test("Euler real SOF warm hydration replaces only successful nonempty programs",()=>{
 const curve=new Tr2CurveEulerRotationExpression(),adapter=createSofHydrationAdapter(),out=quat.create();curve.expressionYaw="0.25";
 const initial=curve._programs[0];adapter.applyValues(curve,{expressionYaw:"0.75"});adapter.finalize(curve,{kind:"Tr2CurveEulerRotationExpression"});
 assert.equal(curve._programs[0],initial);curve.GetValueAt(2,out);assert.notEqual(curve._programs[0],initial);assert.equal(curve._sources[0],"0.75");assert.deepEqual([...out],[...fromYawPitchRoll(quat.create(),0.75,0,0)]);
 const retained=curve._programs[0];adapter.applyValues(curve,{expressionYaw:"("});curve.GetValueAt(2,out);assert.equal(curve.expressionYaw,"(");assert.equal(curve._programs[0],retained);assert.equal(curve._sources[0],"0.75");assert.deepEqual([...out],[...fromYawPitchRoll(quat.create(),0.75,0,0)]);
 adapter.applyValues(curve,{expressionYaw:""});curve.GetValueAt(2,out);assert.equal(curve._programs[0],retained);assert.equal(curve.expressionYaw,"");assert.deepEqual([...out],[...fromYawPitchRoll(quat.create(),0.75,0,0)]);
 curve.SetExpressionYaw("(");assert.equal(curve.expressionYaw,"");assert.equal(curve._programs[0],retained);
});
