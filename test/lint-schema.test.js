import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import test from "node:test";
import { collectReport, inspectSchemaTree, packageRoot } from "../scripts/schema/audit.js";
import { baselineFromReport, evaluate, findingKey, updateBaseline } from "../scripts/schema/policy.js";

const parser = createRequire(path.join(process.env.CARBON_SCHEMA_RUNTIME_ROOT || packageRoot, "package.json"))("@babel/parser");

function sampleReport()
{
    const filePath = "src/trinity/Sample.js";
    const field = { name: "value", verdict: "match", severity: "error", expected: { type: "float32", default: 1, defaultDeterminate: true }, actual: { type: "float32", default: 2, defaultDeterminate: true, line: 5 }, notes: ["wrong-default: schema 1 vs file 2"] };
    const method = { name: "Required", verdict: "missing-method", severity: "error", expected: { name: "Required" }, actual: null, notes: [] };
    const native = { name: "Native", verdict: "additional-carbon-method", severity: "info", expected: null, actual: { name: "Native", carbon: ["method"], implementation: ["implemented"], line: 8 }, notes: ["Carbon-decorated runtime method is outside this Blue schema (line 8)"] };
    return {
        status: "COMPLETE",
        inventory: [{ filePath, state: "maintained", class: "Sample" }],
        classInventory: [{ filePath, class: "Sample", state: "maintained", exported: true, schemaMatches: [{ family: "example" }], nestedCandidates: [] }],
        schemaCoverage: ["family:example", "example/Sample", "example/Unused"],
        reports: [{ tool: "carbon-class", mode: "check", schemaVersion: 1, filePath, class: "Sample", family: "example", fields: [field], methods: [method, native], summary: { drift: true }, fallback: null }]
    };
}

function withBaseline()
{
    const report = sampleReport();
    return { report, baseline: baselineFromReport(report), row: report.reports[0] };
}

test("existing debt passes; update banks a corrected default without banking new debt", () =>
{
    const { report, baseline, row } = withBaseline();
    assert.equal(evaluate(report, baseline).status, "PASS");
    row.fields[0].actual.default = 1;
    row.fields[0].severity = "ok";
    row.fields[0].notes = [];
    const updated = updateBaseline(report, baseline);
    assert.equal(updated.findings.length, baseline.findings.length - 1);
    assert.equal(baseline.findings.length, 2);
    row.methods.push({ ...row.methods[0], name: "NewRequired" });
    assert.equal(evaluate(report, baseline).status, "FAIL");
    assert.throws(() => updateBaseline(report, baseline), /bank fixes only/);
});

test("line movement does not change finding identity; changed defaults do", () =>
{
    const { row } = withBaseline();
    const native = structuredClone(row.methods[1]);
    native.actual.line = 100;
    native.notes[0] = native.notes[0].replace("line 8", "line 100");
    assert.equal(findingKey(native), findingKey(row.methods[1]));
    const field = structuredClone(row.fields[0]);
    field.actual.line = 99;
    assert.equal(findingKey(field), findingKey(row.fields[0]));
    field.actual.default = 3;
    assert.notEqual(findingKey(field), findingKey(row.fields[0]));
});

test("strict errors still fail when the field verdict says match", () =>
{
    const { report, baseline, row } = withBaseline();
    row.fields[0].actual.default = 3;
    assert.equal(evaluate(report, baseline).newFindings.length, 1);
});

test("family routing and additional native methods stay advisory and print growth", () =>
{
    const { report, baseline, row } = withBaseline();
    row.fields.push({ name: "<class>", verdict: "class-policy", severity: "error", expected: { family: "example" }, actual: { family: "example/subdomain" }, notes: ['@type.define family must be "example"; found example/subdomain'] });
    row.methods.push({ ...row.methods[1], name: "AnotherNative" });
    const result = evaluate(report, baseline);
    assert.equal(result.status, "PASS");
    assert.equal(result.counts.additionalCarbonMethods, 2);
    assert.equal(result.counts.additionalCarbonMethodsDelta, 1);
});

test("new ambiguity and fallback are coverage debt, not clean checks", () =>
{
    const { report, baseline, row } = withBaseline();
    row.fallback = { reason: "no details" };
    assert.equal(evaluate(report, baseline).newGaps.length, 1);
    row.error = "Ambiguous";
    row.code = "schema-doc-ambiguous";
    const result = evaluate(report, baseline);
    assert.equal(result.status, "FAIL");
    assert.equal(result.lostCoverage.length, 1);
});

test("lost classes and unused schema identities cannot be erased by update", () =>
{
    const { report, baseline, row } = withBaseline();
    report.schemaCoverage.pop();
    assert.equal(evaluate(report, baseline).lostSchemaCoverage.length, 1);
    assert.throws(() => updateBaseline(report, baseline), /lost coverage/);
    row.error = "Missing";
    row.code = "schema-doc-missing";
    assert.equal(evaluate(report, baseline).lostCoverage.length, 1);
});

test("a no-op checker fails even when it still reports the same class", () =>
{
    const { report, baseline, row } = withBaseline();
    row.fields = [];
    row.methods = [];
    row.summary = { drift: false };
    const result = evaluate(report, baseline);
    assert.equal(result.lostCoverage.length, 0);
    assert.ok(result.lostMemberCoverage.length > 0);
    assert.equal(result.status, "FAIL");
    assert.throws(() => updateBaseline(report, baseline), /lost coverage/);
});

test("same member counts cannot hide replaced identities or vanished evidence", () =>
{
    const { report, baseline, row } = withBaseline();
    row.methods[0].name = "Replacement";
    assert.ok(evaluate(report, baseline).lostMemberCoverage.length > 0);
    row.methods[0].name = "Required";
    row.fields[0].actual.defaultDeterminate = false;
    assert.ok(evaluate(report, baseline).lostMemberCoverage.some(item => item.member.endsWith("/defaultDeterminate")));
    row.fields[0].actual = null;
    assert.ok(evaluate(report, baseline).lostMemberCoverage.some(item => item.member.includes('"actual"')));
});

test("parse/process/contract errors fail independently of baseline debt", () =>
{
    const { report, baseline, row } = withBaseline();
    report.status = "INPUTS_CHANGED";
    assert.equal(evaluate(report, baseline).status, "FAIL");
    report.status = "COMPLETE";
    row.methods[0].verdict = "unknown";
    assert.throws(() => evaluate(report, baseline), /Unknown finding contract/);
    row.error = "Unparseable";
    row.code = "class-file-unparseable";
    assert.equal(evaluate(report, baseline).failures.length, 2);
});

test("skipped runs cannot initialize or update a baseline", () =>
{
    const report = { status: "SKIP", reason: "Absent" };
    assert.equal(evaluate(report, null).status, "SKIP");
    assert.throws(() => updateBaseline(report, null), /bank fixes only/);
    assert.throws(() => baselineFromReport(report), /skipped/);
});

function fixture(t)
{
    const fixtureRoot = process.env.SCHEMA_GATE_TEST_TMP || os.tmpdir();
    fs.mkdirSync(fixtureRoot, { recursive: true });
    const tempRoot = fs.realpathSync(fixtureRoot);
    const root = fs.mkdtempSync(path.join(tempRoot, "runtime-schema-gate-"));
    t.after(() =>
    {
        // The fixture creates only ordinary files/directories under this root.
        assert.equal(path.dirname(fs.realpathSync(root)), tempRoot);
        assert.ok(path.basename(root).startsWith("runtime-schema-gate-"));
        fs.rmSync(root, { recursive: true });
    });
    const put = (name, value) =>
    {
        const file = path.join(root, name);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, typeof value === "string" ? value : JSON.stringify(value));
        return file;
    };
    const item = { blueClass: "Sample", cppClass: "Sample", jsonFile: "Sample.json" };
    put("schema/index.json", { schemaVersion: 1, families: [{ name: "example", index: "example/index.json", classes: 1 }], enums: 0 });
    put("schema/example/index.json", { schemaVersion: 1, family: "example", classes: [item] });
    put("schema/example/Sample.json", { schemaVersion: 1, family: "example", blueClass: "Sample", cppClass: "Sample" });
    put("schema/enums.json", { schemaVersion: 1, enums: [] });
    fs.mkdirSync(path.join(root, "carbon"));
    return { root, put, schemaRoot: path.join(root, "schema"), carbonRoot: path.join(root, "carbon") };
}

test("entire missing tree skips, partial or corrupt indexed trees fail", async t =>
{
    const f = fixture(t);
    assert.equal((await collectReport({ schemaRoot: path.join(f.root, "absent") })).status, "SKIP");
    assert.equal((await collectReport({ schemaRoot: f.schemaRoot, carbonRoot: path.join(f.root, "absent") })).status, "SKIP");
    f.put("schema/example/Sample.json", "{");
    await assert.rejects(collectReport({ schemaRoot: f.schemaRoot, carbonRoot: f.carbonRoot }), SyntaxError);
    fs.unlinkSync(path.join(f.schemaRoot, "example/Sample.json"));
    assert.throws(() => inspectSchemaTree(f.schemaRoot), /ENOENT/);
    fs.unlinkSync(path.join(f.schemaRoot, "example/index.json"));
    assert.throws(() => inspectSchemaTree(f.schemaRoot), /ENOENT/);
});

test("index identities, family counts, and path boundaries are validated", t =>
{
    const f = fixture(t);
    f.put("schema/example/Sample.json", { schemaVersion: 1, family: "example", blueClass: "Wrong", cppClass: "Sample" });
    assert.throws(() => inspectSchemaTree(f.schemaRoot), /disagrees/);
    f.put("schema/example/index.json", { schemaVersion: 1, family: "example", classes: [] });
    assert.throws(() => inspectSchemaTree(f.schemaRoot), /Inconsistent/);
    f.put("schema/index.json", { schemaVersion: 1, families: [{ name: "../outside", index: "../outside/index.json", classes: 1 }] });
    assert.throws(() => inspectSchemaTree(f.schemaRoot), /leaves its directory/);
});

test("collector preserves drift when a batch exit is schema-missing, including anonymous classes", async t =>
{
    const f = fixture(t);
    f.put("runtime/src/Sample.js", "export class Sample { value = 2; }\n");
    f.put("runtime/src/Helper.js", "export class Helper {}\n");
    f.put("runtime/src/Anonymous.js", "export default class {}\n");
    f.put("tools/package.json", { type: "module" });
    f.put("tools/src/schema/index.js", "// synthetic checker implementation\n");
    f.put("tools/src/schema/core/classTool.js", "export function deriveExpectedFields() { return { fields: [{name:'value'}], methods: [{name:'Required'}] }; }\n");
    const sample = sampleReport().reports[0];
    f.put("tools/bin/cjs-carbon-class.js", `import path from 'node:path';
const args = process.argv.slice(2);
if (!args.includes('--strict') || !args.includes('--json')) throw new Error('Missing machine flags');
const files = args.slice(args.indexOf('--check') + 1, args.indexOf('--schema-root'));
const rows = files.map(filePath => path.basename(filePath) === 'Sample.js' ? {...${JSON.stringify(sample)},filePath,schemaPath:path.join(args[args.indexOf('--schema-root')+1],'example/Sample.json')} : {filePath,error:'Missing schema',code:'schema-doc-missing'});
console.log(JSON.stringify(rows.length === 1 ? rows[0] : rows));
process.exitCode = 3;
`);
    const report = await collectReport({ runtimeRoot: path.join(f.root, "runtime"), toolsRoot: path.join(f.root, "tools"), schemaRoot: f.schemaRoot, carbonRoot: f.carbonRoot, parser });
    assert.equal(report.status, "COMPLETE");
    assert.equal(report.batches[0].exitCode, 3);
    assert.equal(report.reports.length, 3);
    assert.ok(report.classInventory.some(item => item.class === "<anonymous>"));
    const baseline = baselineFromReport(report);
    assert.equal(baseline.findings.length, 2);
    assert.equal(evaluate(report, baseline).status, "PASS");
    f.put("tools/bin/cjs-carbon-class.js", fs.readFileSync(path.join(f.root, "tools/bin/cjs-carbon-class.js"), "utf8").replace("console.log(JSON.stringify(rows.length", "rows.find(row => row.class === 'Sample').methods = [];\nconsole.log(JSON.stringify(rows.length"));
    await assert.rejects(collectReport({ runtimeRoot: path.join(f.root, "runtime"), toolsRoot: path.join(f.root, "tools"), schemaRoot: f.schemaRoot, carbonRoot: f.carbonRoot, parser }), /Checker omitted expected methods member Sample.Required/);
});

test("partial enums fail validation and self-consistent enum removals lose coverage", t =>
{
    const f = fixture(t);
    f.put("schema/enums.json", {});
    assert.throws(() => inspectSchemaTree(f.schemaRoot), /enum document/);
    const index = JSON.parse(fs.readFileSync(path.join(f.schemaRoot, "index.json"), "utf8"));
    index.enums = 1;
    f.put("schema/index.json", index);
    f.put("schema/enums.json", { schemaVersion: 1, enums: [{ name: "Mode", family: "example", values: [{ name: "Enabled", value: 1 }] }] });
    const report = sampleReport();
    report.schemaCoverage = inspectSchemaTree(f.schemaRoot).coverage;
    const baseline = baselineFromReport(report);
    index.enums = 0;
    f.put("schema/index.json", index);
    f.put("schema/enums.json", { schemaVersion: 1, enums: [] });
    report.schemaCoverage = inspectSchemaTree(f.schemaRoot).coverage;
    assert.equal(evaluate(report, baseline).lostSchemaCoverage.length, 2);
});

test("CLI refuses --update on SKIP and leaves the checked-in baseline untouched", t =>
{
    const f = fixture(t);
    const baselineFile = path.join(packageRoot, "scripts/schema-baseline.json");
    const before = fs.readFileSync(baselineFile);
    const result = spawnSync(process.execPath, [path.join(packageRoot, "scripts/lint-schema.js"), "--update"], {
        env: { ...process.env, CARBON_SCHEMA_ROOT: path.join(f.root, "absent") }, encoding: "utf8"
    });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Never use it to silence a fresh finding/);
    assert.deepEqual(fs.readFileSync(baselineFile), before);
});

test("lint and npm builds invoke the schema gate", () =>
{
    const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
    assert.match(pkg.scripts.lint, /npm run lint:schema(?: &&|$)/);
    assert.equal(pkg.scripts["prebuild:npm"], "npm run lint:schema");
});
