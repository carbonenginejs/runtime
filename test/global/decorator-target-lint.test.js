import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inventoryRuntime } from "../../scripts/lib/decorator-target-inventory.js";
import { auditDecorators, flagMask, findingFingerprint, shrinkBaseline, run } from "../../scripts/lint-decorator-target.js";

const oracle=[{name:"Native",attributes:[{name:"value",macro:"MAP_ATTRIBUTE_WITH_CHOOSER",flagsAsWritten:"Be::READ | Be::PERSIST",chooser:"NativeChooser",condition:[]}],properties:[],methods:[],interfaces:[{name:"Native"},{name:"IRoot"}],chain:[]}];
const headers=[{name:"Native",methods:[{name:"Call"}],bases:[]}];

/** Parses real source in a disposable fixture, without importing or executing it. */
function inspect(source, relative="src/Example.js")
{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),"decorator-lint-"));
    try
    {
        const file=path.join(root,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,source);
        return auditDecorators(inventoryRuntime(root),oracle,headers,{NativeChooser:"fixture.Enum"});
    }
    finally { fs.rmSync(root,{recursive:true}); }
}

test("aliased #be imports match literal flags, chooser bindings and implicit self maps",()=>
{
    const findings=inspect(`import {exposure as target} from '#be'; import {meta} from '#schema';
        @meta.implemented @target.define('Native') class Example {
            @meta.implemented @target.mapAttributeWithChooser(target.READ | target.PERSIST, 'fixture.Enum') value=0;
            @meta.implemented Call(){}
        }`);
    assert.deepEqual(findings,[]);
});

test("flags, chooser, alias and origin failures are separate review findings",()=>
{
    const findings=inspect(`import {exposure as target} from '#be'; import {meta} from '#schema';
        @meta.implemented @target.define('Native') class Example {
            @meta.implemented @target.mapAttributeWithChooser(target.WRITE, 'wrong.Enum') value=0;
            @meta.implemented Renamed(){}
        }`);
    assert.ok(findings.some(f=>f.rule==='exposure-flags'));
    assert.ok(findings.some(f=>f.rule==='exposure-chooser'));
    assert.ok(findings.some(f=>f.rule==='carbon-origin-name'));
    assert.equal(flagMask({$expr:'target.UNKNOWN'}),null);
});

test("state is required independently of origin and renamed is not a state",()=>
{
    const findings=inspect(`import {meta} from '#schema'; @meta.define('CjsOwn') class CjsOwn {
        @meta.cjs @meta.renamed('Old') Helper(){}
    }`);
    assert.equal(findings.filter(f=>f.rule==='required-state').length,2);
});

test("backend donor audit exempts names but never treats a missing donor as declared",()=>
{
    const missing=inspect(`import {meta} from '#schema'; @meta.define('CjsGpu') class CjsGpu {}`,'src/trinityal/webgpu/CjsGpu.js');
    assert.ok(missing.some(f=>f.rule==='backend-donor'));
    const present=inspect(`import {blue,meta} from '#schema'; /** Carbon: Native (native/Native.h:1) */ @meta.implemented @blue.define({className:'CjsGpu'}) class CjsGpu {}`,'src/trinityal/webgpu/CjsGpu.js');
    assert.ok(!present.some(f=>['backend-donor','cjs-donor'].includes(f.rule)));
});

test("literal imperative registrations carry method states and native identity",()=>
{
    const findings=inspect(`import {CjsSchema,meta,blue} from '#schema'; /** Carbon: Native (native/Native.h:1) */ class Example {Call(){}}
        CjsSchema.blue.define(Example,{className:'Example',methods:{Call:[meta.implemented]}});`);
    assert.ok(!findings.some(f=>f.member==='Call'&&['required-state','carbon-origin-name'].includes(f.rule)));
});

test("explicit self maps and missing exposure decorators remain visible", () =>
{
    const findings=inspect(`import {exposure as target} from '#be'; import {meta} from '#schema';
        class Example { value=0; }
        meta.implemented(Example);
        target.define('Native')(Example);
        target.mapInterface(Example)(Example);`);
    assert.ok(findings.some(f=>f.rule==='explicit-self-map'));
    assert.ok(findings.some(f=>f.rule==='exposure-declaration-missing'));
    assert.ok(!findings.some(f=>f.rule==='required-state'&&f.member==='<class>'));
});

test("a matching native function never hides the wrong exposed method name", () =>
{
    const row={source:'src/Example.js',name:'Example',decorators:[{name:'meta.implemented',args:[]}],
        definitions:[{namespace:'exposure',kind:'exposure.define',value:'Native'}],
        members:[{name:'Call',kind:'method',decorators:[{name:'meta.implemented',args:[]},
            {name:'exposure.mapMethodAndWrap',args:['wrongAlias']}]}]};
    const native={name:'Native',attributes:[],properties:[],interfaces:[],methods:[{name:'call',function:'Call',macro:'MAP_METHOD_AND_WRAP'}]};
    const findings=auditDecorators({classes:[row],diagnostics:[]},[native],headers);
    assert.ok(findings.some(f=>f.rule==='exposure-name'));
});


test("baseline updates retire resolved findings but never absorb newly missing states", () =>
{
    const first={rule:"required-state",source:"src/A.js",class:"A",member:"Call",detail:"Missing",line:1};
    const resolved={...first,member:"Resolved"};
    const fresh={...first,member:"New"};
    const baseline={version:1,fingerprints:[findingFingerprint(first),findingFingerprint(resolved)]};
    const result=shrinkBaseline([{...first,line:100},fresh],baseline);
    assert.deepEqual(result.fingerprints,[findingFingerprint(first)]);
    assert.equal(baseline.fingerprints.length,2);
    assert.deepEqual(shrinkBaseline([],result).fingerprints,[]);
});

test("application package roots are excluded before source or oracle access", () =>
{
    const root=fs.mkdtempSync(path.join(os.tmpdir(),"decorator-scope-"));
    try
    {
        for(const name of ["@carbonenginejs/graphene","@carbonenginejs/tools-core","@carbonenginejs/server"])
        {
            fs.writeFileSync(path.join(root,"package.json"),JSON.stringify({name}));
            const report=run(["--root",root]);
            assert.equal(report.scope,"excluded");assert.equal(report.total,0);
        }
    }
    finally { fs.rmSync(root,{recursive:true}); }
});


test("direct static and prototype metadata retain state and factory rename arguments", () =>
{
    const findings = inspect(`import {meta} from '#schema';
        class Example { static Call() {} Call() {} static renamed() {} }
        meta.carbon('Native')(Example);
        meta.implemented(Example, 'Call');
        meta.adapted(Example.prototype, 'Call');
        meta.implemented(Example, 'renamed');
        meta.renamed('Call')(Example, 'renamed');`);
    assert.ok(!findings.some(f => ['Call', 'renamed'].includes(f.member)
        && ['required-state', 'carbon-origin-name'].includes(f.rule)));
});

test("class donor comments preserve native audit independent of registration syntax", () =>
{
    const relevant = findings => findings.filter(f => ['cjs-donor','carbon-origin-name'].includes(f.rule))
        .map(findingFingerprint).sort();
    const expected = inspect(`import {blue,meta} from '#schema';
        /** Carbon: Native (native/Native.h:1) */
        @blue.define('CjsAlias') class CjsAlias { Call(){} }`);
    for (const definition of ["blue.define('CjsAlias')", "target.define('CjsAlias')"])
    {
        const findings = inspect(`import {blue,meta} from '#schema'; import {exposure as target} from '#be';
            /** Carbon: Native (native/Native.h:1) */
            @${definition} export class CjsAlias { Call(){} }`);
        assert.deepEqual(relevant(findings), relevant(expected));
    }
    const imperative = inspect(`import {CjsSchema} from '#schema';
        /** Carbon: Native (native/Native.h:1) */ class CjsAlias { Call(){} }
        CjsSchema.blue.define(CjsAlias,{className:'CjsAlias'});`);
    assert.deepEqual(relevant(imperative), relevant(expected));
    assert.ok(expected.some(f => f.rule === 'cjs-donor'));
    assert.ok(!expected.some(f => f.rule === 'carbon-origin-name'));
});
