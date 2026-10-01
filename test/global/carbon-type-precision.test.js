import assert from "node:assert/strict";
import test from "node:test";

import {
    CARBON_TYPE,
    defaultCarbonValue,
    getCarbonTypeDefinition,
    inferCarbonTypeFromCpp,
    normalizeCarbonTypeDescriptor,
    normalizeCarbonValue
} from "../../src/global/schema/types/carbonTypes.js";

// BlueTypes.h STDSTRING/STDWSTRING and IROOTPTR/IROOTWEAKREF are distinct
// declarations even when JavaScript uses the same value representation.
test("narrow and wide Carbon string declarations remain distinct", () =>
{
    assert.equal(CARBON_TYPE.WSTRING, "wstring");
    assert.deepEqual(getCarbonTypeDefinition("string"), { kind: "string", js: "string" });
    assert.deepEqual(getCarbonTypeDefinition("wstring"), { kind: "wstring", js: "string" });

    for (const cppType of [ "std::string", "const std::string &", "BlueSharedString" ])
    {
        assert.equal(inferCarbonTypeFromCpp(cppType).kind, "string", cppType);
    }
    for (const cppType of [ "std::wstring", "const std::wstring &", "BlueSharedStringW" ])
    {
        assert.equal(inferCarbonTypeFromCpp(cppType).kind, "wstring", cppType);
    }
});

test("basic_string inference retains character width with nested template arguments", () =>
{
    for (const [ character, kind ] of [ [ "char", "string" ], [ "wchar_t", "wstring" ] ])
    {
        const declarations = [
            `std::basic_string<${character}>`,
            `const std::basic_string< ${character} > &`,
            `std::basic_string<${character}, std::char_traits<${character}>, std::allocator<${character}>>`,
            `const std::basic_string< ${character}, std::char_traits<${character}>, std::allocator<${character}> > &`
        ];
        for (const cppType of declarations)
        {
            assert.equal(inferCarbonTypeFromCpp(cppType).kind, kind, cppType);
            assert.equal(normalizeCarbonTypeDescriptor({ cppType }).kind, kind, cppType);
        }
    }
});

test("string normalization does not collapse enclosing collection or unsupported character types", () =>
{
    const declaration = inferCarbonTypeFromCpp("std::vector<std::basic_string<wchar_t>>");
    assert.equal(declaration.kind, "array");
    assert.equal(declaration.elementType.kind, "wstring");
    assert.equal(inferCarbonTypeFromCpp("std::basic_string<char16_t>").kind, "rawStruct");
});

test("expression naming retains wide string storage", () =>
{
    assert.equal(inferCarbonTypeFromCpp("std::string", "expression").kind, "expression");
    const wide = inferCarbonTypeFromCpp("std::wstring", "expression");
    assert.equal(wide.kind, "wstring");
    assert.equal(wide.semantic, "expression");
});

test("wide strings keep JavaScript string defaults and coercion", () =>
{
    assert.equal(defaultCarbonValue("wstring"), "");
    assert.equal(normalizeCarbonValue(undefined, "wstring"), "");
    assert.equal(normalizeCarbonValue(42, "wstring"), "42");
    assert.equal(normalizeCarbonValue("é漢🚀", "wstring"), "é漢🚀");
    assert.equal(normalizeCarbonValue(null, "wstring"), null);
});

test("explicit weak references remain distinct without adding a lifetime policy", () =>
{
    assert.equal(CARBON_TYPE.WEAK_REF, "weakRef");
    assert.deepEqual(getCarbonTypeDefinition("weakRef"), { kind: "weakRef", js: "object|null" });
    assert.equal(defaultCarbonValue("weakRef"), null);
    const declaration = { kind: "weakRef", className: "IRoot", structure: true };
    assert.deepEqual(normalizeCarbonTypeDescriptor(declaration), {
        ...declaration, js: "object|null"
    });
    assert.equal(normalizeCarbonTypeDescriptor("objectRef").kind, "objectRef");
});

test("type normalization retains existing structure metadata", () =>
{
    const declaration = { kind: "struct", structure: "NativeValue", cppType: "NativeValue" };
    assert.deepEqual(normalizeCarbonTypeDescriptor(declaration), {
        ...declaration, js: "object"
    });
});
