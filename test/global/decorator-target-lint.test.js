import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inventoryRuntime } from "../../scripts/lib/decorator-target-inventory.js";
import { requireCarbonRoot } from "../../scripts/lib/carbon-root.js";
import { auditDecorators, findingFingerprint, readCarbonReports, shrinkBaseline, run } from "../../scripts/lint-decorator-target.js";

/** A carbon-blue report holding the given class records. */
const report = (...classes) => ({ classes: classes.map(c => ({ methods: [], bases: [], blue: { exposures: [], properties: [] }, ...c })) });
const header = (name, methods, bases = []) => ({ name, methods: methods.map(m => ({ name: m })), bases });
const carbon = readCarbonReports([ report(header("Native", [ "Call", "Native", "operator=" ])) ]);

/** Parses real source in a disposable fixture, without importing or executing it. */
function inspect(source, relative = "src/Example.js", facts = carbon, options = {})
{
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "decorator-lint-"));
    try
    {
        const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, source);
        return auditDecorators(inventoryRuntime(root), facts, options);
    }
    finally { fs.rmSync(root, { recursive: true }); }
}
const origin = findings => findings.filter(f => f.rule === "carbon-origin-name").map(f => f.member);

test("a method with no header match on a Carbon class is a carbon-origin-name finding", () =>
{
    assert.deepEqual(origin(inspect(`import {exposure as target} from '#be';
        @target.define('Native') class Example { Call(){} Renamed(){} }`)), [ "Renamed" ]);
});

test("@cjs, renamed, static and private spellings resolve before a finding", () =>
{
    assert.deepEqual(origin(inspect(`import {exposure as target} from '#be'; import {meta} from '#schema';
        @target.define('Native') class Example {
            @meta.cjs Ours(){}
            @meta.renamed('Call') Other(){}
            static call(){}
            _Call(){}
            Call__Twice(){}
        }`)), []);
});

test("literal imperative registrations carry native identity", () =>
{
    const findings = inspect(`import {CjsSchema} from '#schema'; /** Carbon: Native (native/Native.h:1) */ class Example {Call(){} Extra(){}}
        CjsSchema.be.define(Example,{name:'Example'});`);
    assert.deepEqual(origin(findings), [ "Extra" ]);
});

test("create__ and Assign__ variants resolve to the constructor and operator= of the header", () =>
{
    assert.deepEqual(origin(inspect(`import {exposure as target} from '#be';
        @target.define('Native') class Example {
            static create__Move(){}
            Assign__Move(){}
            Invented(){}
        }`)), [ "Invented" ]);
});

test("methods declared on a Carbon base resolve, and a nested class is found by either spelling", () =>
{
    const facts = readCarbonReports([ report(header("Child", [], [ "Base" ]), header("Base", [ "Shared" ]), header("Outer.Inner", [ "Step" ])) ]);
    assert.deepEqual(origin(inspect(`import {exposure as target} from '#be';
        @target.define('Child') class Child { Shared(){} }`, "src/Child.js", facts)), []);
    assert.deepEqual(origin(inspect(`import {meta} from '#schema';
        /** Carbon: Outer::Inner (native/Outer.h:1) */ class Inner { Step(){} }
        meta.carbon('Outer::Inner')(Inner);`, "src/Inner.js", facts)), []);
});

test("a be.define bag names the Carbon class", () =>
{
    assert.deepEqual(origin(inspect(`import {exposure as be} from '#be';
        @be.define({ name: "Native", members: [] }) class Example { Call(){} Extra(){} }`)), [ "Extra" ]);
});

test("direct static and prototype metadata retain factory rename arguments", () =>
{
    const findings = inspect(`import {meta} from '#schema';
        class Example { static Call() {} Call() {} static renamed() {} }
        meta.carbon('Native')(Example);
        meta.renamed('Call')(Example, 'renamed');`);
    assert.deepEqual(origin(findings), []);
});

test("class donor comments give the same identity whatever the registration syntax", () =>
{
    const expected = origin(inspect(`import {blue} from '#schema';
        /** Carbon: Native (native/Native.h:1) */
        @blue.define('CjsAlias') class CjsAlias { Call(){} Extra(){} }`));
    assert.deepEqual(expected, [ "Extra" ]);
    for (const definition of [ "blue.define('CjsAlias')", "target.define('CjsAlias')" ])
    {
        assert.deepEqual(origin(inspect(`import {blue} from '#schema'; import {exposure as target} from '#be';
            /** Carbon: Native (native/Native.h:1) */
            @${definition} export class CjsAlias { Call(){} Extra(){} }`)), expected);
    }
});

test("baseline updates retire resolved findings but never absorb new ones", () =>
{
    const first = { rule: "carbon-origin-name", source: "src/A.js", class: "A", member: "Call", detail: "No match", line: 1 };
    const resolved = { ...first, member: "Resolved" };
    const fresh = { ...first, member: "New" };
    const baseline = { version: 1, fingerprints: [ findingFingerprint(first), findingFingerprint(resolved) ] };
    const result = shrinkBaseline([ { ...first, line: 100 }, fresh ], baseline);
    assert.deepEqual(result.fingerprints, [ findingFingerprint(first) ]);
    assert.equal(baseline.fingerprints.length, 2);
    assert.deepEqual(shrinkBaseline([], result).fingerprints, []);
});

test("a declared rename carries its baselined finding and nothing else", () =>
{
    const old = { rule: "carbon-origin-name", source: "src/A.js", class: "A", member: "#Call", detail: "No match" };
    const renamed = { ...old, member: "_Call" };
    const other = { ...old, member: "_Other" };
    const baseline = { version: 1, fingerprints: [ findingFingerprint(old) ] };
    const rename = [ { class: "A", from: "#Call", to: "_Call" } ];
    assert.deepEqual(shrinkBaseline([ renamed, other ], baseline, rename).fingerprints, [ findingFingerprint(renamed) ]);
    assert.deepEqual(shrinkBaseline([ renamed, other ], baseline).fingerprints, []);
    assert.deepEqual(shrinkBaseline([ renamed ], { version: 1, fingerprints: [] }, rename).fingerprints, []);
    assert.deepEqual(shrinkBaseline([ { ...renamed, class: "B" } ], baseline, rename).fingerprints, []);
});

test("application package roots are excluded before source or report access", () =>
{
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "decorator-scope-"));
    try
    {
        for (const name of [ "@carbonenginejs/graphene", "@carbonenginejs/tools-core", "@carbonenginejs/server" ])
        {
            fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name }));
            const result = run([ "--root", root ]);
            assert.equal(result.scope, "excluded"); assert.equal(result.total, 0);
        }
    }
    finally { fs.rmSync(root, { recursive: true }); }
});

test("with no carbon-blue report the audit skips", () =>
{
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "decorator-scope-"));
    try
    {
        fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "@carbonenginejs/runtime" }));
        assert.equal(run([ "--root", root, "--reports", path.join(root, "none") ]).scope, "skipped");
    }
    finally { fs.rmSync(root, { recursive: true }); }
});

const carbonAvailable = fs.existsSync(requireCarbonRoot());
const fieldFacts = readCarbonReports([ report(
    { name: "Child", bases: [ "EveSpaceObjectChild" ], blue: { exposures: [ { name: "Child" } ], properties: [
        { name: "partTag", macro: "MAP_PROPERTY_READONLY", getter: "GetPartTag" }, { name: "wide", macro: "MAP_PROPERTY_READONLY", getter: "GetWidth" } ] } },
    header("EveSpaceObjectChild", [ "GetPartTag" ]),
    header("Tr2ImageRes", [ "GetWidth" ])) ]);

test("a class-level __Field property needs a trivial Carbon getter, found on a base when the member is inherited", { skip: !carbonAvailable }, () =>
{
    const audit = source => inspect(source, "src/Child.js", fieldFacts, { accessorBodies: true });
    const ok = audit(`import {exposure as be} from '#be'; @be.define('Child') @be.mapPropertyReadOnly__Field('partTag') class Child {}`);
    assert.equal(ok.some(f => f.rule === "property-field-body"), false);
    const refused = audit(`import {exposure as be} from '#be'; @be.define('Child') @be.mapPropertyReadOnly__Field('wide') class Child {}`);
    assert.ok(refused.some(f => f.rule === "property-field-body" && f.member === "wide"));
});

test("without Carbon's source the accessor check is not made", () =>
{
    const findings = inspect(`import {exposure as be} from '#be'; @be.define('Child') @be.mapPropertyReadOnly__Field('wide') class Child {}`, "src/Child.js", fieldFacts);
    assert.equal(findings.some(f => f.rule === "property-field-body"), false);
});
