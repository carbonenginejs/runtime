// The character library's indexing configuration as generic data (plan step 12): the shipped generic's source members
// say what CjsCharacterLibraryConfiguration's tables say, less Incarna and the shared engine textures.
import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterLibraryConfiguration, CjsCharacterLibraryManager } from "../../../npm/dist/character/index.js";
import { CjsSchema } from "../../../npm/dist/blue/schema/index.js";

const generic = new CjsCharacterLibraryManager()._ShippedGeneric();
const incarna = path => /\/graphics\/interior\/character(creation|sheet)\//u.test(path) || /\/shaders\/shaderdescriptions\//u.test(path);

test("the shipped generic's roots, excludes, rows, patterns and static names are the configuration's, less Incarna", () =>
{
    assert.deepEqual(generic.sourceRoots, CjsCharacterLibraryConfiguration.roots.filter(root => !incarna(root)));
    assert.deepEqual(generic.sourceExcludes, CjsCharacterLibraryConfiguration.excludes);
    assert.deepEqual(generic.sourceRows.map(row => ({ match: row.match, kind: row.sourceType })), CjsCharacterLibraryConfiguration.rows);
    assert.deepEqual(generic.sourceBlackPatterns, CjsCharacterLibraryConfiguration.blackPatterns.filter(pattern => !incarna(pattern)));
    assert.deepEqual(generic.sourceStaticNames, CjsCharacterLibraryConfiguration.staticNames);
    assert.ok(!generic.sourceBlackPatterns.some(incarna) && !generic.sourceRoots.some(incarna), "no Incarna input");
});

test("the shipped generic's source types are the configuration's kinds", () =>
{
    const kinds = Object.fromEntries(generic.sourceTypes.map(type =>
    {
        const kind = { className: type.className, pdpType: type.pdpType };
        for (const flag of [ "envelope", "generic", "pathOnly", "derived" ]) if (type[flag]) kind[flag] = true;
        if (type.slots.length) kind.slots = Array.from(type.slots);
        return [ type.name, kind ];
    }));
    assert.deepEqual(kinds, CjsCharacterLibraryConfiguration.kinds);
});

test("each list form is its own record class, read by its _type, and says what the configuration's list form says", () =>
{
    const forms = {};
    for (const form of generic.sourceListForms)
    {
        const className = CjsSchema.getClassName(form.constructor);
        let value;
        if (className === "CjsCharacterDataListFormPositional") value = Array.from(form.fields);
        else
        {
            assert.equal(className, "CjsCharacterDataListFormRecords", "only the two forms the library's files use");
            value = {};
            if (form.keyed) value.keyed = form.keyed;
            if (form.value) value.value = form.value;
            if (form.tuple.length) value.tuple = Array.from(form.tuple);
            if (form.tupleByLength.length)
            {
                assert.equal(CjsSchema.getClassName(form.tupleByLength[0].constructor), "CjsCharacterDataTupleShape");
                value.tuple = Object.fromEntries(form.tupleByLength.map(shape => [ shape.length, Array.from(shape.fields) ]));
            }
            if (form.rest) value.rest = form.rest;
        }
        (forms[form.className] ??= {})[form.key] = value;
    }
    assert.deepEqual(forms, CjsCharacterLibraryConfiguration.sourceLists);
});
