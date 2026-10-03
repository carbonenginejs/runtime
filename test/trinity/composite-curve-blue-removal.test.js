import { getRegisteredClassName } from "../../npm/dist/global/compose/className.js";
import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { blue, ITriFunction, ITriVectorFunction, ITriColorFunction, ITriCurveLength } from "../../npm/dist/global/blue/index.js";
import { DictReader } from "../../npm/dist/global/blue/DictReader.js";
import { DictWriter } from "../../npm/dist/global/blue/DictWriter.js";
import { GetResources } from "../../npm/dist/global/blue/getResources.js";
import { EnumerateChildren } from "../../npm/dist/global/blue/find.js";
import { CjsBlackReader } from "../../npm/dist/resource/formats/black/core/CjsBlackReader.js";
import { Tr2CurveVector2 } from "../../npm/dist/trinity/curves/curve/Tr2CurveVector2.js";
import { Tr2CurveVector3 } from "../../npm/dist/trinity/curves/curve/Tr2CurveVector3.js";
import { Tr2CurveColor } from "../../npm/dist/trinity/curves/curve/Tr2CurveColor.js";
import { Tr2CurveScalar } from "../../npm/dist/trinity/curves/curve/Tr2CurveScalar.js";

const cases=[
    [Tr2CurveVector2,["x","y"],ITriFunction,[ITriFunction,ITriCurveLength]],
    [Tr2CurveVector3,["x","y","z"],ITriVectorFunction,[ITriFunction,ITriVectorFunction,ITriCurveLength]],
    [Tr2CurveColor,["r","g","b","a"],ITriColorFunction,[ITriColorFunction,ITriFunction,ITriCurveLength]]
];
for(const [Class,components,Base,interfaces] of cases)
{
    const name=getRegisteredClassName(Class);
    test(`${name} is a model-free native function with independent scalar storage`,()=>
    {
        const curve=blue.classes.CreateInstanceFromName(name);
        assert.equal(Object.getPrototypeOf(Class.prototype),Base.prototype);
        assert.deepEqual([...mappedInterfaces(Class)],[Class,...interfaces]);
        for(const Interface of interfaces) assert.equal(CjsSchema.cast(curve,Interface),curve);
        if(Class===Tr2CurveVector2) assert.equal(CjsSchema.cast(curve,ITriVectorFunction),null);
        assert.equal(curve.Reset,ITriFunction.prototype.Reset);
        assert.equal(curve.Reset(),undefined);
        for(const method of ["SetValues","GetValues","OnEvent","Clone"])
            assert.equal(method in curve,false);
        assert.equal("from" in Class,false);
        assert.equal(new Set(components.map(key=>curve[key])).size,components.length);
        for(const key of components) assert.equal(curve[key].constructor,Tr2CurveScalar);
        const children=[];
        EnumerateChildren(curve,child=>children.push(child));
        assert.deepEqual(children,components.map(key=>curve[key]));
        components.forEach((key,index)=>assert.equal(children[index],curve[key]));
        assert.deepEqual(GetResources(curve),[]);
    });

    test(`${name} uses shared dictionary and Copier graph operations`,()=>
    {
        const source={_type:name,name:"shared"};
        components.forEach(key=>source[key]={name:"scalar"});
        const curve=new Class();
        const original=components.map(key=>curve[key]);
        new DictReader().ReadInto(curve,source);
        components.forEach((key,index)=>assert.equal(curve[key],original[index]));
        components.forEach(key=>assert.equal(curve[key].name,"scalar"));
        for(const key of components)
        {
            curve[key].AddKey(0,2,1);
            curve[key].AddKey(2,6,1);
        }
        const copy=new Class();
        const destinations=components.map(key=>copy[key]);
        assert.equal(blue.classes.CopyTo(curve,copy),copy);
        assert.equal(copy.constructor,Class);
        components.forEach((key,index)=>
        {
            assert.equal(copy[key],destinations[index]);
            assert.notEqual(copy[key],curve[key]);
            assert.notEqual(copy[key].keys,curve[key].keys);
            assert.notEqual(copy[key].keys[0],curve[key].keys[0]);
        });
        copy.UpdateValue(1);
        assert.deepEqual(Array.from(copy.currentValue),components.map(()=>4));
        const persisted=new DictWriter().WriteObject(copy,{}, {persistOnly:true});
        assert.equal(Object.hasOwn(persisted,"currentValue"),false);
        assert.equal(persisted.name,"shared");
        for(const key of components)
        {
            assert.equal(persisted[key].name,"scalar");
            assert.equal(persisted[key].keys.length,2);
            assert.equal(persisted[key].keys[0].value,2);
            assert.equal(persisted[key].keys[1].value,6);
        }
    });

    test(`${name} updates each required component before producing its cached value`,()=>
    {
        const curve=new Class();
        curve.AddKey(0,components.map((_,i)=>i),1);
        curve.AddKey(2,components.map((_,i)=>i+4),1);
        const storage=curve.currentValue;
        curve.UpdateValue(1);
        assert.equal(curve.currentValue,storage);
        components.forEach((key,index)=>assert.equal(curve[key].currentValue,index+2));
        assert.deepEqual(Array.from(storage),components.map((_,i)=>i+2));
        curve.SetExtrapolation(2);
        for(const key of components)
            assert.deepEqual([curve[key].extrapolationBefore,curve[key].extrapolationAfter],[2,2]);
        assert.equal(curve.Length(),2);
        curve[components[0]]=null;
        assert.throws(()=>curve.UpdateValue(1),TypeError,"Required owned scalar calls must fail when storage is malformed");
    });

    test(`${name} canonical Black preserves embedded scalar storage without model hydration`,()=>
    {
        const f=new BlackFixture();
        const record=new Uint8Array(20);
        new DataView(record.buffer).setFloat32(4,2,true);
        record[18]=1; // LINEAR interpolation; the remaining scalar fields are zero.
        const fields=components.map(key=>[key,f.Object(2,"IgnoredEmbeddedWireClass",[
            ["keys",concat([u32(1),u16(20),record])],["name",f.String("child")]
        ]).subarray(4)]);
        fields.push(["name",f.String("BlackComposite")]);
        let children,keys;
        class RecordingReader extends CjsBlackReader
        {
            CreateRuntimeTarget(kind,shape)
            {
                const target=super.CreateRuntimeTarget(kind,shape);
                children=components.map(key=>target[key]);
                keys=children.map(child=>child.keys);
                return target;
            }
        }
        const reader=new RecordingReader(f.Finish(f.Object(1,name,fields)),{schema:null,initialize:false});
        const curve=reader.ReadRuntime().root;
        assert.equal(curve.constructor,Class);
        components.forEach((key,index)=>
        {
            assert.equal(curve[key],children[index]);
            assert.equal(curve[key].keys,keys[index]);
            assert.equal(curve[key].keys.length,1);
            assert.equal(curve[key].keys[0].value,2);
        });
        assert.equal(reader.references.size,1);
        assert.equal(curve.name,"BlackComposite");
        assert.equal(curve[components[0]].name,"child");
        assert.equal(reader.references.get(1),curve);
        assert.equal(reader.reader.AtEnd(),true);
        assert.deepEqual(reader.reports,[]);
        curve.UpdateValue(1);
        assert.deepEqual(Array.from(curve.currentValue),components.map(()=>2));
    });
}

test("Color updates its empty alpha child before substituting the parent alpha default",()=>
{
    const curve=new Tr2CurveColor();
    curve.a.currentValue=123;
    curve.UpdateValue(2);
    assert.equal(curve.a.currentValue,0);
    assert.equal(curve.currentValue[3],1);
});

test("Vector3 and Color Update sample without updating scalar caches; native vector derivative noops retain output",()=>
{
    for(const [Class,components]of cases.slice(1))
    {
        const curve=new Class(),out=new Float32Array(components.length);
        curve.AddKey(0,components.map(()=>2),1);
        components.forEach(key=>curve[key].currentValue=99);
        assert.equal(curve.Update(1,out),out);
        assert.deepEqual(Array.from(out),components.map(()=>2));
        components.forEach(key=>assert.equal(curve[key].currentValue,99));
    }
    const vector=new Tr2CurveVector3(),out=new Float32Array([1,2,3]);
    for(const name of ["GetValueDotAt","GetValueDoubleDotAt","InterpolatedPosition"])
    {
        assert.equal(vector[name](1,out),out);
        assert.deepEqual(Array.from(out),[1,2,3]);
    }
});
/** Bounded wire fixture for Black header/object framing, with no runtime schema source. */
class BlackFixture
{
    strings = [];
    String(value)
    {
        let index = this.strings.indexOf(value);
        if (index === -1) { index = this.strings.length; this.strings.push(value); }
        return u16(index);
    }
    Object(id, kind = null, fields = [])
    {
        if (kind === null) return u32(id);
        const parts = [this.String(kind)];
        for (const [name, value] of fields) parts.push(concat([this.String(name), value]));
        const body = concat(parts);
        return concat([u32(id), u32(body.length), body]);
    }
    Finish(root, wide = [])
    {
        const narrowParts = [u16(this.strings.length)];
        for (const value of this.strings) narrowParts.push(concat([new TextEncoder().encode(value), new Uint8Array(1)]));
        const wideParts = [u16(wide.length)];
        for (const value of wide)
        {
            for (let i = 0; i < value.length; i++) wideParts.push(u16(value.charCodeAt(i)));
            wideParts.push(u16(0));
        }
        const strings = concat(narrowParts), wideStrings = concat(wideParts);
        return concat([u32(0xb1acf11e), u32(1), u32(strings.length), strings, u32(wideStrings.length), wideStrings, root]);
    }
}

function concat(parts)
{
    const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.length; }
    return bytes;
}
function u16(value)
{
    const bytes = new Uint8Array(2);
    new DataView(bytes.buffer).setUint16(0, value, true);
    return bytes;
}
function u32(value)
{
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint32(0, value, true);
    return bytes;
}
