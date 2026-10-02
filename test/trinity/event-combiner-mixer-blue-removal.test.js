import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema, meta } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { blue, BlueList, ITriFunction, ITriVectorFunction, ITriColorFunction, ITriCurveLength, IInitialize } from "../../npm/dist/global/blue/index.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { DictWriter } from "../../npm/dist/global/blue/DictWriter.js";
import { EnumerateChildren } from "../../npm/dist/global/blue/find.js";
import { GetResources } from "../../npm/dist/global/blue/getResources.js";
import { TriEventCurve } from "../../npm/dist/trinity/curves/curve/TriEventCurve.js";
import { Tr2CurveCombiner } from "../../npm/dist/trinity/curves/curve/Tr2CurveCombiner.js";
import { Tr2CurveColorMixer } from "../../npm/dist/trinity/curves/curve/Tr2CurveColorMixer.js";
import { Tr2CurveVector3 } from "../../npm/dist/trinity/curves/curve/Tr2CurveVector3.js";
import { TriEventKey } from "../../npm/dist/trinity/curves/key/TriEventKey.js";
import { TriCurveSet } from "../../npm/dist/trinity/curves/TriCurveSet.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";

for(const [name,Class,Base,table] of [
    ["TriEventCurve",TriEventCurve,ITriFunction,[TriEventCurve,ITriFunction,IInitialize,ITriCurveLength]],
    ["Tr2CurveCombiner",Tr2CurveCombiner,ITriVectorFunction,[Tr2CurveCombiner,ITriFunction,ITriVectorFunction,ITriCurveLength]],
    ["Tr2CurveColorMixer",Tr2CurveColorMixer,ITriColorFunction,[Tr2CurveColorMixer,ITriColorFunction,ITriFunction,ITriCurveLength]]
])test(`${name} exposes the exact native table without model conveniences`,()=>{
    const value=blue.classes.CreateInstanceFromName(name);
    assert.equal(value.constructor,Class);assert.equal(Object.getPrototypeOf(Class.prototype),Base.prototype);
    assert.deepEqual([...mappedInterfaces(Class)],table);
    for(const method of ["SetValues","GetValues","OnEvent","Clone","Traverse","GetResources"])assert.equal(method in value,false);
    assert.equal("from" in Class,false);assert.equal(value.Reset,ITriFunction.prototype.Reset);assert.equal(value.Reset(),undefined);
    const list=new BlueList(ITriFunction);assert.equal(list.Append(value),true);assert.equal(list[0],value);
    assert.deepEqual(GetResources(value),[]);
});

test("event factory hydration initializes owned typed keys while borrowed reads remain explicit",()=>{
    const source={_type:"TriEventCurve",name:"events",keys:[{_type:"TriEventKey",time:2,value:"終"},{_type:"TriEventKey",time:1,value:"始"}]};
    const curve=new DictReader({declarations:true}).CreateObject(source);
    assert.equal(curve.Length(),2);assert.equal(curve.keys[0].value,"始");assert.equal(curve.keys[1].value,"終");
    assert.equal(curve.keys[0].constructor,TriEventKey);assert.equal(curve.keys.Append({time:9}),false);
    const borrowed=new TriEventCurve(),keys=borrowed.keys;
    new DictReader({declarations:true}).ReadInto(borrowed,source);
    assert.equal(borrowed.keys,keys);assert.equal(borrowed.length,0);assert.equal(keys[0].time,2);
    assert.equal(borrowed.Initialize(),true);assert.equal(borrowed.keys,keys);assert.equal(keys[0].time,1);
    borrowed.AddKey(3,"後");assert.equal(borrowed.keys,keys);
    borrowed.RemoveKey(0);assert.equal(borrowed.keys,keys);assert.equal(keys.length,2);
    const destination=new TriEventCurve(),destinationKeys=destination.keys;
    assert.equal(blue.classes.CopyTo(curve,destination),destination);assert.equal(destination.keys,destinationKeys);
    assert.equal(destination.length,2);assert.notEqual(destination.keys[0],curve.keys[0]);assert.equal(destination.keys[0].value,"始");
    const serialized=new DictWriter().WriteObject(curve,{}, {persistOnly:true});
    assert.equal(serialized.keys.length,2);assert.equal(serialized.keys[0].value,"始");assert.equal(Object.hasOwn(serialized,"length"),false);
    assert.equal(CjsSchema.getField(TriEventCurve,"value").type.kind,"wstring");
});

test("event named and callable dispatch remain distinct and require present listeners",t=>{
    TriEventCurve.clearPostUpdateCallbacks();t.after(()=>TriEventCurve.clearPostUpdateCallbacks());
    const curve=new TriEventCurve(),events=[],calls=[];
    curve.eventListener={HandleEvent(name){events.push(name);}};
    curve.AddKey(1,"launch");curve.AddCallableKey(2,value=>calls.push(value),["impact"]);
    curve.keys[1].value="must-not-reach-listener";
    const keys=curve.keys;curve.UpdateValue(2);
    assert.equal(curve.keys,keys);assert.deepEqual(events,["launch"]);assert.deepEqual(calls,[]);
    assert.equal(TriEventCurve.getPostUpdateCallbackCount(),1);assert.equal(TriEventCurve.runNextPostUpdateCallback(),true);assert.deepEqual(calls,["impact"]);
    const malformed=new TriEventCurve();malformed.AddKey(1,"bad");malformed.eventListener={};assert.throws(()=>malformed.UpdateValue(1),TypeError);
    const nullable=new TriEventCurve();nullable.AddKey(1,"allowed");assert.equal(nullable.UpdateValue(1),undefined);
});

test("combiner zeroes each child scratch and commits cached sum only after all children succeed",()=>{
    const combiner=new Tr2CurveCombiner(),calls=[];
    class Child extends ITriVectorFunction{Update(time,out){calls.push([time,[...out]]);out[0]=2;return out;}}
    meta.blue.interfaceTable({interfaces:[Child,ITriVectorFunction],chainTo:null})(Child);
    const first=new Child(),second=new Child();
    second.Update=(time,out)=>{calls.push([time,[...out]]);out[1]=3;return out;};
    assert.equal(combiner.curves.Append(first),true);assert.equal(combiner.curves.Append(second),true);
    const cache=combiner.currentValue;cache.set([9,8,7]);combiner.UpdateValue(4);
    assert.deepEqual(calls,[[4,[0,0,0]],[4,[0,0,0]]]);assert.equal(combiner.currentValue,cache);assert.deepEqual([...cache],[2,3,0]);
    second.Update=()=>{throw new Error("child failed");};
    assert.throws(()=>combiner.UpdateValue(5),/child failed/);assert.deepEqual([...cache],[2,3,0]);
    first.GetValueAt=(_time,out)=>{out.set([7,8,9]);return out;};
    second.GetValueAt=(_time,out)=>{out.set([4,5,6]);return out;};
    first.Update=(time,out)=>{out.set([1,2,3]);combiner.GetValueAt(time,new Float32Array(3));return out;};
    second.Update=(_time,out)=>out;
    combiner.UpdateValue(6);assert.deepEqual([...cache],[1,2,3],"nested sampling must not overwrite invocation-local update scratch");
});

test("combiner pooled update scratch is isolated, zeroed and released after child failure",()=>{
    const outer=new Tr2CurveCombiner(),inner=new Tr2CurveCombiner();
    class Child extends ITriVectorFunction{}
    meta.blue.interfaceTable({interfaces:[Child,ITriVectorFunction],chainTo:null})(Child);
    const a=new Child(),b=new Child();outer.curves.Append(a);inner.curves.Append(b);
    const originalAlloc=vec3.alloc,originalUnalloc=vec3.unalloc,active=new Set();let leases=0;
    vec3.alloc=()=>{const out=originalAlloc();assert.equal(active.has(out.buffer),false);active.add(out.buffer);out.fill(91);leases++;return out;};
    vec3.unalloc=out=>{assert.equal(active.delete(out.buffer),true);originalUnalloc(out);};
    try
    {
        b.Update=(_time,out)=>{assert.deepEqual([...out],[0,0,0]);out[1]=7;};
        a.Update=(time,out)=>{assert.deepEqual([...out],[0,0,0]);out[0]=3;inner.UpdateValue(time);assert.deepEqual([...out],[3,0,0]);};
        outer.UpdateValue(1);assert.deepEqual([...outer.currentValue],[3,0,0]);assert.deepEqual([...inner.currentValue],[0,7,0]);assert.equal(active.size,0);assert.equal(leases,4);
        b.Update=(_time,out)=>{out[2]=8;throw new Error("nested failure");};
        assert.throws(()=>outer.UpdateValue(2),/nested failure/);assert.equal(active.size,0);
        assert.deepEqual([...outer.currentValue],[3,0,0]);assert.deepEqual([...inner.currentValue],[0,7,0]);
        outer.curves.Clear();outer.UpdateValue(3);assert.deepEqual([...outer.currentValue],[0,0,0]);assert.equal(active.size,0);
    }
    finally{vec3.alloc=originalAlloc;vec3.unalloc=originalUnalloc;}
});

test("combiner length queries exact native exposure and requires advertised methods",()=>{
    const combiner=new Tr2CurveCombiner();
    class Hidden extends ITriVectorFunction{Length(){throw new Error("unmapped length");}}
    meta.blue.interfaceTable({interfaces:[Hidden,ITriVectorFunction],chainTo:null})(Hidden);
    const hidden=new Hidden();assert.equal(combiner.curves.Append(hidden),true);assert.equal(combiner.Length(),0);
    const curve=new Tr2CurveVector3();curve.AddKey(7,[1,2,3],1);assert.equal(combiner.curves.Append(curve),true);assert.equal(combiner.Length(),7);
    curve.Length=null;assert.throws(()=>combiner.Length(),TypeError);
});

test("combiner dictionary and Copier retain owned lists and persisted child topology",()=>{
    const combiner=new Tr2CurveCombiner(),list=combiner.curves;
    new DictReader({declarations:true}).ReadInto(combiner,{name:"sum",curves:[{_type:"Tr2CurveVector3",name:"first"},{_type:"Tr2CurveVector3",name:"second"}]});
    assert.equal(combiner.curves,list);assert.equal(list.length,2);assert.equal(list[0].name,"first");assert.equal(list[1].name,"second");
    const children=[];EnumerateChildren(combiner,child=>children.push(child));assert.equal(children[0],list[0]);assert.equal(children[1],list[1]);
    const copy=new Tr2CurveCombiner(),copyList=copy.curves;blue.classes.CopyTo(combiner,copy);
    assert.equal(copy.curves,copyList);assert.equal(copyList.length,2);assert.notEqual(copyList[0],list[0]);assert.equal(copyList[0].name,"first");
    assert.equal(CjsSchema.getField(Tr2CurveCombiner,"curves").type.kind,"list");
});

test("mixer Update refreshes only mixed cache while UpdateValue converts RGB without changing alpha",()=>{
    const mixer=new Tr2CurveColorMixer();mixer.color1.set([1,0,0,0.5]);mixer.color2.set([0,0,1,1]);mixer.lerpValue=0.5;
    const mixed=mixer.currentValue,converted=mixer.convertedLinearValue;converted.set([9,8,7,0.25]);
    const out=new Float32Array(4);assert.equal(mixer.Update(3,out),out);assert.equal(mixer.currentValue,mixed);assert.deepEqual([...mixed],[0.5,0,0.5,0.75]);
    assert.deepEqual([...converted],[9,8,7,0.25]);mixer.UpdateValue(3);assert.equal(mixer.convertedLinearValue,converted);
    assert.ok(Math.abs(converted[0]-0.21404114)<1e-6);assert.equal(converted[1],0);assert.ok(Math.abs(converted[2]-0.21404114)<1e-6);assert.equal(converted[3],0.25);
});

test("actual curve set advances event, combiner and mixer through required UpdateValue",()=>{
    const set=new TriCurveSet();set.playOnLoad=false;
    const event=new TriEventCurve(),events=[];event.AddKey(2,"done");event.eventListener={HandleEvent(name){events.push(name);}};
    const child=new Tr2CurveVector3();child.AddKey(0,[1,2,3],1);child.AddKey(2,[3,4,5],1);
    const combiner=new Tr2CurveCombiner();combiner.curves.Append(child);
    const mixer=new Tr2CurveColorMixer();mixer.color1.set([1,0,0,1]);
    set.AddCurve(event);set.AddCurve(combiner);set.AddCurve(mixer);assert.equal(set.GetCurvesCount(),3);assert.equal(set.GetMaxCurveDuration(),2);
    set.PlayFrom(2);set.Apply();assert.deepEqual(events,["done"]);assert.deepEqual([...combiner.currentValue],[3,4,5]);assert.deepEqual([...mixer.currentValue],[1,0,0,1]);assert.deepEqual([...mixer.convertedLinearValue],[1,0,0,1]);set.Dispose();
});
