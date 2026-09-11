import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { headerTypes, jsClasses, structDefaults, compareDefaults, literalValue } from "../scripts/lib/carbon-header-shape.js";

test("header coverage distinguishes definitions, nested types, forwards and specializations", () =>
{
    const source = `// struct Fiction {};
class Forward;
struct First
{
struct Nested {};
};
template<class T>
class Generic {};
struct hash<First> {};
struct std::hash<First> {};
BLUE_INTERFACE( IContract ) : public IRoot
{
};
BLUE_CLASS( Last ) : public IContract {};
namespace Backend {
class Implementation {};
}
`;
    assert.deepEqual(headerTypes(source).map(type => type.qualifiedName), [ "First", "Generic", "IContract", "Last", "Backend::Implementation" ]);
});

test("JS class promises cannot be satisfied by comments, strings, or nested classes", () =>
{
    const source = `// class Promised {}
const text = "class Promised {}";
export function Make() { class Nested {} return Nested; }
class Private {}
export class Named {}
export default class Default {}
`;
    assert.deepEqual(jsClasses(source).map(node => node.id.name), [ "Private", "Named", "Default" ]);
});

test("zero-argument constructor defaults do not merge parameterized overloads", () =>
{
    const [ type ] = headerTypes(`struct Sample {
Sample() : enabled(false), value(1), unknown(factory(1, 2)) { value = 3; }
Sample(int v) : enabled(true), value(v) {}
bool enabled;
int value;
Thing unknown;
};`);
    const { defaults, unchecked } = structDefaults(type);
    assert.equal(defaults.get("value"), "1");
    assert.equal(defaults.get("unknown"), "factory(1, 2)");
    assert.ok(unchecked.includes("constructor body requires review"));
    const result = compareDefaults(type, jsClasses("class Sample { enabled = false; value = 0; unknown = null; }")[0]);
    assert.deepEqual(result.mismatches, [ "value: Carbon 1, JS 0" ]);
    assert.ok(result.unchecked.some(value => value.includes("factory(1, 2)")));
});

test("unsupported constructor expressions are unchecked, never equal", () =>
{
    const [ type ] = headerTypes("struct Sample { Sample(int v = 1); int value; };");
    const result = compareDefaults(type, jsClasses("class Sample { value = 1; }")[0]);
    assert.equal(result.checked.length, 0);
    assert.equal(result.unchecked.length, 1);
    assert.equal(literalValue("0xffU").value, 255);
    assert.equal(literalValue("0x1f").value, 31);
    assert.equal(literalValue("010").value, 8);
    assert.equal(literalValue("-010").value, -8);
    assert.equal(literalValue("factory()").known, false);
});

test("constructor overrides and static fields cannot silently prove instance defaults", () =>
{
    const [ withDestructor ] = headerTypes("struct S { int x=1; ~ S() {} S():x(2){} };");
    assert.deepEqual(compareDefaults(withDestructor, jsClasses("class S { x=1; }")[0]).mismatches, [ "x: Carbon 2, JS 1" ]);
    const [ type ] = headerTypes("struct S { int x=1; S(){x=2;} };");
    const staticResult = compareDefaults(type, jsClasses("class S { static x=1; }")[0]);
    assert.equal(staticResult.checked.length, 0);
    assert.ok(staticResult.unchecked.includes("constructor body requires review"));
    const instanceResult = compareDefaults(type, jsClasses("class S { x=1; constructor(){this.x=2;} }")[0]);
    assert.ok(instanceResult.unchecked.includes("JS constructor body requires review"));
});

const donor = path.join(process.env.CARBON_ROOT ?? "E:/carbonengine", "trinity/trinityal/Tr2HalHelperStructures.h");
test("real Carbon sampler: filter, address and comparison zero mutations each fail", { skip: !existsSync(donor) && "Carbon checkout unavailable" }, () =>
{
    const type = headerTypes(readFileSync(donor, "utf8")).find(value => value.name === "Tr2SamplerDescription");
    const source = readFileSync(new URL("../src/trinityal/Tr2HalHelperStructures/Tr2SamplerDescription.js", import.meta.url), "utf8");
    const cppConstants = { "Tr2RenderContextEnum::TF_POINT": 1, "Tr2RenderContextEnum::TA_WRAP": 1, "Tr2RenderContextEnum::CMP_ALWAYS": 8 };
    const jsConstants = { "TextureFilter.TF_POINT": 1, "TextureAddressMode.TA_WRAP": 1, "CompareFunc.CMP_ALWAYS": 8 };
    const original = compareDefaults(type, jsClasses(source)[0], cppConstants, jsConstants);
    assert.deepEqual(original.mismatches, []);
    for (const member of [ "m_minFilter", "m_magFilter", "m_mipFilter", "m_addressU", "m_addressV", "m_addressW", "m_comparisonFunc" ])
    {
        const mutated = source.replace(new RegExp(`${member} = [^;]+;`), `${member} = 0;`);
        const result = compareDefaults(type, jsClasses(mutated)[0], cppConstants, jsConstants);
        assert.equal(result.mismatches.length, 1, member);
        assert.ok(result.mismatches[0].startsWith(member + ":"));
    }
    assert.ok(original.unchecked.includes("constructor body requires review"));
});
