import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { blue } from "../../npm/dist/global/blue/blue.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { Copier } from "../../npm/dist/global/blue/Copier.js";
import { GetResources } from "../../npm/dist/global/blue/getResources.js";
import { EnumerateChildren } from "../../npm/dist/global/blue/find.js";
import { Tr2CurveConstant } from "../../npm/dist/trinity/curves/curve/Tr2CurveConstant.js";
import { Tr2CurveScalar } from "../../npm/dist/trinity/curves/curve/Tr2CurveScalar.js";
import { Tr2CurveQuaternion } from "../../npm/dist/trinity/curves/curve/Tr2CurveQuaternion.js";
import { Tr2CurveScalarKey } from "../../npm/dist/trinity/curves/key/Tr2CurveScalarKey.js";
import { Tr2CurveQuaternionKey } from "../../npm/dist/trinity/curves/key/Tr2CurveQuaternionKey.js";
import { TriCurveSet } from "../../npm/dist/trinity/curves/TriCurveSet.js";
import { ITriFunction, ITriScalarFunction, ITriVectorFunction, ITriQuaternionFunction, ITriColorFunction, ITriCurveLength } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";

const classes = [Tr2CurveConstant,Tr2CurveScalar,Tr2CurveQuaternion,Tr2CurveScalarKey,Tr2CurveQuaternionKey];
test("native private methods and JavaScript curve helpers have explicit provenance", () =>
{
    for(const [Class,name] of [[Tr2CurveScalar,"GetLocalTime"],[Tr2CurveQuaternion,"GetLocalTime"],[Tr2CurveQuaternion,"GetSegmentValue"]])
    {
        const method=CjsSchema.getMethod(Class,name);
        assert.equal(method.carbon.method,true);
        assert.equal(method.impl.status,"adapted");
    }
    for(const [Class,name] of [[Tr2CurveScalar,"FindSegment"],[Tr2CurveQuaternion,"Evaluate"],[Tr2CurveQuaternion,"SetName"],[Tr2CurveConstant,"_copyValue"]])
        assert.equal(CjsSchema.getMethod(Class,name).impl.status,"custom");
});
test("five curve classes construct through Blue without model state or convenience methods", () =>
{
    for (const Class of classes)
    {
        const base=Class===Tr2CurveConstant||Class===Tr2CurveScalar?ITriScalarFunction:Class===Tr2CurveQuaternion?ITriQuaternionFunction:null;
        assert.equal(Object.getPrototypeOf(Class.prototype),base?.prototype??Object.prototype);
        const value = blue.classes.CreateInstanceFromName(CjsSchema.getClassName(Class));
        assert.equal(value.constructor,Class);
        for (const name of ["SetValues","GetValues","OnEvent","Clone","Copy","__state"])
            assert.equal(name in value,false,`${Class.name}.${name}`);
        assert.equal("from" in Class,false);
        const out = [{}];
        assert.equal(GetResources(value,out),out);
        assert.deepEqual(out,[]);
        const children=[];
        EnumerateChildren(value,child=>children.push(child));
        assert.deepEqual(children,[]);
    }
});

test("removed curves expose exact native interfaces and inherit the function reset", () =>
{
    for(const [Class,interfaces] of [
        [Tr2CurveConstant,[Tr2CurveConstant,ITriScalarFunction,ITriVectorFunction,ITriQuaternionFunction,ITriColorFunction,ITriFunction]],
        [Tr2CurveScalar,[Tr2CurveScalar,ITriScalarFunction,ITriFunction,ITriCurveLength]],
        [Tr2CurveQuaternion,[Tr2CurveQuaternion,ITriQuaternionFunction,ITriFunction,ITriCurveLength]]
    ])
    {
        assert.deepEqual([...mappedInterfaces(Class)],interfaces);
        const curve=new Class();
        for(const Interface of interfaces) assert.equal(CjsSchema.cast(curve,Interface),curve);
        assert.equal(curve.Reset,ITriFunction.prototype.Reset);
        assert.equal(curve.Reset(),undefined);
        const set=new TriCurveSet();
        set.curves.push(curve);
        set.PlayFrom(1);
        assert.equal(set.scaledTime,1);
    }
    assert.deepEqual([...mappedInterfaces(Tr2CurveScalarKey)],[]);
    assert.deepEqual([...mappedInterfaces(Tr2CurveQuaternionKey)],[]);
});

test("Blue dictionary and Copier transport scalar key records without a model base", () =>
{
    const curve = new Tr2CurveScalar();
    const changed = new DictReader().ReadInto(curve,{name:"scalar",timeOffset:2,timeScale:0.5});
    assert.deepEqual([...changed],["name","timeOffset","timeScale"]);
    curve.AddKey(0,2,1); curve.AddKey(2,6,1);
    const copy = new Copier().CloneTo(curve);
    assert.equal(copy.constructor,Tr2CurveScalar);
    assert.notEqual(copy.keys,curve.keys);
    assert.notEqual(copy.keys[0],curve.keys[0]);
    assert.equal(copy.GetValue(1.5),4);
    copy.keys[0].value=99;
    assert.equal(curve.keys[0].value,2);
    const key = new Tr2CurveScalarKey();
    new DictReader().ReadInto(key,{time:3,value:5,id:21});
    const keyCopy=blue.classes.CloneTo(key);
    assert.equal(keyCopy.constructor,Tr2CurveScalarKey);
    assert.deepEqual([keyCopy.time,keyCopy.value,keyCopy.id],[3,5,21]);
});

test("quaternion and constant copying retains authored buffers without aliasing source storage", () =>
{
    const curve=new Tr2CurveQuaternion();
    curve.AddKey(0,[0,0,0,1]); curve.AddKey(2,[0,0,1,0]);
    const copy=blue.classes.CloneTo(curve);
    const out=new Float32Array(4);
    copy.Update(1,out);
    assert.ok(Math.abs(out[2]-Math.SQRT1_2)<1e-6);
    assert.notEqual(copy.keys[0].value,curve.keys[0].value);
    const key=new Tr2CurveQuaternionKey();
    new DictReader().ReadInto(key,{time:2,value:[0,0,1,0]});
    const keyCopy=blue.classes.CloneTo(key);
    assert.equal(keyCopy.constructor,Tr2CurveQuaternionKey);
    assert.notEqual(keyCopy.value,key.value);
    assert.deepEqual(Array.from(keyCopy.value),[0,0,1,0]);
    const constant=new Tr2CurveConstant();
    new DictReader().ReadInto(constant,{name:"fixed",value:[2,3,4,5]});
    const constantCopy=blue.classes.CloneTo(constant);
    assert.equal(constantCopy.currentValue,constantCopy.value);
    assert.notEqual(constantCopy.value,constant.value);
    assert.equal(constantCopy.Update(8),2);
});

test("the actual curve-set owner updates removed scalar and quaternion classes before bindings", () =>
{
    const scalar=new Tr2CurveScalar(); scalar.AddKey(0,0,1); scalar.AddKey(2,4,1);
    const quaternion=new Tr2CurveQuaternion(); quaternion.AddKey(0,[0,0,0,1]); quaternion.AddKey(2,[0,0,1,0]);
    const set=new TriCurveSet();
    set.curves.push(scalar,quaternion);
    let copied=false;
    set.bindings.push({CopyValue(){
        assert.equal(scalar.currentValue,2);
        assert.ok(Math.abs(quaternion.currentValue[2]-Math.SQRT1_2)<1e-6);
        copied=true;
    }});
    set.scaledTime=1;
    set.Apply();
    assert.equal(copied,true);
});

test("constant declarations expose the same native storage in native order", () =>
{
    const fields=CjsSchema.getSchema(Tr2CurveConstant).members;
    assert.deepEqual(fields.map(field=>[field.name,field.key]),[
        ["name","name"],["currentValue","value"],["value","value"]
    ]);
    assert.deepEqual(fields[1].edit,{read:true});
    const curve=new Tr2CurveConstant();
    curve.value=new Float32Array([7,8,9,10]);
    assert.equal(curve.currentValue,curve.value);
    new DictReader().ReadInto(curve,{value:[4,3,2,1]});
    assert.equal(curve.currentValue,curve.value);
    assert.deepEqual(Array.from(curve.currentValue),[4,3,2,1]);
});

test("key updates retain list and row identities with stable equal-time ordering", () =>
{
    for(const Class of [Tr2CurveScalar,Tr2CurveQuaternion])
    {
        const curve=new Class(),list=curve.keys;
        const scalar=Class===Tr2CurveScalar;
        const key1=scalar?new Tr2CurveScalarKey():new Tr2CurveQuaternionKey();
        const key2=scalar?new Tr2CurveScalarKey():new Tr2CurveQuaternionKey();
        const key3=scalar?new Tr2CurveScalarKey():new Tr2CurveQuaternionKey();
        key1.time=2; key2.time=1; key3.time=1;
        list.push(key1,key2,key3);
        curve.OnKeysChanged();
        assert.equal(curve.keys,list);
        assert.deepEqual(Array.from(list),[key2,key3,key1]);
        assert.equal(list[0],key2);
        assert.equal(list[1],key3);
        assert.equal(list[2],key1);
    }
});

test("scalar definitions copy record values before maintaining tangents and keep destination storage", () =>
{
    const curve=new Tr2CurveScalar(),list=curve.keys;
    const source=new Tr2CurveScalarKey();
    source.time=1; source.value=3; source.leftTangent=5; source.rightTangent=17;
    source.tangentType=2; // FREE_JOINED copies the arriving tangent to departure.
    curve.SetDefinition({keys:[source],keyCount:1,extrapolationBefore:0,extrapolationAfter:0});
    assert.equal(curve.keys,list);
    assert.notEqual(list[0],source);
    assert.equal(list[0].rightTangent,5);
    assert.equal(source.rightTangent,17);
    const previous=list[0];
    curve.SetDefinition(curve.GetDefinition());
    assert.equal(curve.keys,list);
    assert.notEqual(list[0],previous);
    assert.equal(list[0].value,3);
});
