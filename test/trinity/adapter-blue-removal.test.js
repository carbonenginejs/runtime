import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { blue, ITriFunction, ITriVectorFunction, ITriQuaternionFunction } from "../../npm/dist/global/blue/index.js";
import { BlueList } from "../../npm/dist/global/blue/BlueList.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { DictWriter } from "../../npm/dist/global/blue/DictWriter.js";
import { EnumerateChildren } from "../../npm/dist/global/blue/find.js";
import { GetResources } from "../../npm/dist/global/blue/getResources.js";
import { createSofHydrationAdapter } from "../../npm/dist/sof/createSofHydrationAdapter.js";
import { Tr2TranslationAdapter } from "../../npm/dist/trinity/curves/curve/Tr2TranslationAdapter.js";
import { Tr2RotationAdapter } from "../../npm/dist/trinity/curves/curve/Tr2RotationAdapter.js";
import { Tr2VectorFunctionModifier } from "../../npm/dist/trinity/curves/curve/Tr2VectorFunctionModifier.js";
import { Tr2CurveConstant } from "../../npm/dist/trinity/curves/curve/Tr2CurveConstant.js";
import { TriValueBinding } from "../../npm/dist/trinity/core/binding/TriValueBinding.js";
import { Tr2RenderContext } from "../../npm/dist/trinity/core/context/Tr2RenderContext.js";

const cases = [
    ["Tr2TranslationAdapter",Tr2TranslationAdapter,ITriVectorFunction,[Tr2TranslationAdapter,ITriVectorFunction]],
    ["Tr2RotationAdapter",Tr2RotationAdapter,ITriQuaternionFunction,[Tr2RotationAdapter,ITriQuaternionFunction]],
    ["Tr2VectorFunctionModifier",Tr2VectorFunctionModifier,ITriVectorFunction,[ITriVectorFunction,Tr2VectorFunctionModifier]]
];
for (const [name,Class,Base,table] of cases)
{
    test(`${name} has native inheritance and exact exposure without model conveniences`, () =>
    {
        const instance = blue.classes.CreateInstanceFromName(name);
        assert.equal(instance.constructor,Class);
        assert.equal(Object.getPrototypeOf(Class.prototype),Base.prototype);
        assert.deepEqual([...mappedInterfaces(Class)],table);
        assert.equal(CjsSchema.cast(instance,Base),instance);
        assert.equal(instance.Reset,ITriFunction.prototype.Reset);
        assert.equal(instance.Reset(),undefined);
        for (const method of ["SetValues","GetValues","OnEvent","Clone","Traverse","GetResources"])
            assert.equal(method in instance,false);
        assert.equal("from" in Class,false);
        const typed = new BlueList(Base);
        assert.equal(typed.Append(instance),true);
        assert.equal(typed[0],instance);
        // Exact native QI omits ITriFunction even though JS inherits its methods.
        const functions = new BlueList(ITriFunction);
        assert.equal(functions.Append(instance),false);
        assert.equal(functions.length,0);
        assert.deepEqual(GetResources(instance),[]);
    });
}

for (const [Class,size] of [[Tr2TranslationAdapter,3],[Tr2RotationAdapter,4]])
{
    test(`${CjsSchema.getClassName(Class)} forwards scaled seconds and retains native UpdateValue cache behavior`, () =>
    {
        const adapter = new Class();
        const other = new Class();
        assert.notEqual(adapter.value,other.value);
        assert.notEqual(adapter.currentValue,other.currentValue);
        adapter.currentValue.fill(7);
        adapter.value.fill(3);
        const cache = adapter.currentValue;
        adapter.UpdateValue(4);
        assert.deepEqual([...cache],Array(size).fill(7));
        adapter.ScaleTime(2);
        const calls=[];
        adapter.curve={Update(time,out){calls.push(["Update",time,out]);out.fill(2);return out;},GetValueAt(time,out){calls.push(["GetValueAt",time,out]);out.fill(5);return out;}};
        adapter.UpdateValue(8);
        assert.equal(calls[0][0],"Update");
        assert.equal(calls[0][1],4);
        assert.equal(calls[0][2],cache);
        assert.deepEqual([...cache],Array(size).fill(2));
        const out=new Float32Array(size);
        assert.equal(adapter.GetValueAt(6,out),out);
        assert.equal(calls[1][0],"GetValueAt");
        assert.equal(calls[1][1],3);
        assert.equal(calls[1][2],out);
        assert.deepEqual([...cache],Array(size).fill(2));
        adapter.curve={};
        assert.throws(()=>adapter.UpdateValue(1),TypeError);
        assert.throws(()=>adapter.Update(1,out),TypeError);
    });
}

test("declared and SOF hydration use live adapter pointers while Copier copies persisted children",()=>
{
    const child=new Tr2CurveConstant();
    child.value.set([1,2,3,4]);
    for(const [Class,size] of [[Tr2TranslationAdapter,3],[Tr2RotationAdapter,4]])
    {
        const adapter=new Class();
        const value=Array(size).fill(0.5);
        assert.equal(createSofHydrationAdapter().applyValues(adapter,{curve:child,value}),adapter);
        assert.equal(adapter.curve,child);
        assert.deepEqual([...adapter.value],value);
        const children=[];EnumerateChildren(adapter,item=>children.push(item));
        assert.equal(children.length,1);assert.equal(children[0],child);
        const copy=new Class(), storage=copy.value;
        assert.equal(blue.classes.CopyTo(adapter,copy),copy);
        assert.equal(copy.value,storage);
        assert.deepEqual([...copy.value],value);
        assert.notEqual(copy.curve,child);
        assert.equal(copy.curve.constructor,Tr2CurveConstant);
        assert.deepEqual([...copy.curve.value],[1,2,3,4]);
        const persisted=new DictWriter().WriteObject(adapter,{}, {persistOnly:true});
        assert.equal(Object.hasOwn(persisted,"currentValue"),false);
        assert.deepEqual([...persisted.value],value);
        const read=new Class();
        new DictReader({declarations:true,initialize:false}).ReadInto(read,{value});
        assert.deepEqual([...read.value],value);
    }
});

test("SOF-shaped rotation value binding updates a plain adapter's authored output",()=>
{
    const source=new Tr2RotationAdapter();source.value.set([0,0,1,0]);
    const destination=new Tr2RotationAdapter();
    const binding=new TriValueBinding();
    binding.sourceAttribute="value";binding.destinationAttribute="value";
    binding.SetSourceObject(source);binding.SetDestinationObject(destination);
    assert.equal(binding.CopyValue(),true);
    const out=new Float32Array(4);destination.Update(2,out);
    assert.deepEqual([...out],[0,0,1,0]);
    assert.deepEqual([...destination.currentValue],[0,0,1,0]);
});

test("modifier native UpdateValue is a no-op while Update chooses the required source path",()=>
{
    const modifier=new Tr2VectorFunctionModifier();
    const calls=[];
    modifier.clientBall={Update(t,out){calls.push(["Update",t,out]);out.set([1,2,3]);},InterpolatedPosition(t,out){calls.push(["InterpolatedPosition",t,out]);out.set([4,5,6]);}};
    modifier.offsetPosition.set([1,1,1]);modifier.scaleModifier=2;
    assert.equal(modifier.UpdateValue(10),undefined);assert.equal(calls.length,0);
    const out=new Float32Array(3);
    assert.equal(modifier.Update(11,out),out);
    assert.deepEqual([...out],[4,6,8]);assert.equal(calls[0][0],"Update");assert.equal(calls[0][1],11);assert.equal(calls[0][2],out);
    modifier.useSystemCoordinates=true;
    modifier.Update(12,out);
    assert.deepEqual([...out],[10,12,14]);assert.equal(calls[1][0],"InterpolatedPosition");assert.equal(calls[1][1],12);assert.equal(calls[1][2],out);
    modifier.clientBall={};assert.throws(()=>modifier.Update(13,out),TypeError);
});

test("modifier requires methods on a present renderer while retaining null-context adaptation",()=>
{
    const modifier=new Tr2VectorFunctionModifier();
    modifier.useViewSpace=true;modifier.offsetPosition.set([3,4,5]);
    const out=new Float32Array(3);
    assert.equal(modifier.GetOffsetPosition(null,out),out);assert.deepEqual([...out],[3,4,5]);
    assert.throws(()=>modifier.GetOffsetPosition({},out),TypeError);
    const context=new Tr2RenderContext();
    // Column-major inverse view rotates +X to +Y; translation must not affect w=0.
    const inverse=new Float32Array([0,1,0,0,-1,0,0,0,0,0,1,0,100,200,300,1]);
    context.GetInverseViewTransform=()=>inverse;
    modifier.GetOffsetPosition(context,out);assert.deepEqual([...out],[-4,3,5]);
});

test("modifier fields use native order and remain transient through shared copy and persistence",()=>
{
    const names=["clientBall","offsetPosition","scaleModifier","useViewSpace","useSystemCoordinates"];
    assert.deepEqual(CjsSchema.getSchema(Tr2VectorFunctionModifier).members.map(f=>f.name),names);
    const child=new Tr2TranslationAdapter();
    const source=new Tr2VectorFunctionModifier();
    createSofHydrationAdapter().applyValues(source,{clientBall:child,offsetPosition:[1,2,3],scaleModifier:4,useViewSpace:true,useSystemCoordinates:true});
    assert.equal(source.clientBall,child);assert.deepEqual([...source.offsetPosition],[1,2,3]);assert.equal(source.scaleModifier,4);
    assert.equal(source.useViewSpace,true);assert.equal(source.useSystemCoordinates,true);
    const destination=new Tr2VectorFunctionModifier();
    destination.scaleModifier=9;destination.offsetPosition.set([7,8,9]);
    const offset=destination.offsetPosition;
    assert.equal(blue.classes.CopyTo(source,destination),destination);
    assert.equal(destination.clientBall,null);assert.equal(destination.scaleModifier,9);assert.equal(destination.offsetPosition,offset);assert.deepEqual([...offset],[7,8,9]);
    assert.equal(destination.useViewSpace,false);assert.equal(destination.useSystemCoordinates,false);
    const persisted=new DictWriter().WriteObject(source,{}, {persistOnly:true});
    for(const name of names)assert.equal(Object.hasOwn(persisted,name),false);
});
