import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inventoryRuntime } from "./lib/decorator-target-inventory.js";
import { checkAccessorBodies } from "./lib/carbon-accessor-bodies.js";

// Build conditions the plan has ruled (decorator-upgrade.md § 00, "Build conditionals in exposure files"): each guard below is
// on for us, so its rows are exposed like any other (with a notSupported/notUsed state where the platform cannot). Any other
// condition still needs a ruling and keeps reporting.
const ruledOn = new Set(["GSTATE_ENABLED","WITH_GRANNY","BLUE_WITH_PYTHON","!defined(GAMEWORLD_64)","_WIN32","defined(_WIN32)","CCP_STACKLESS","BLUE_LIVELIST_ENABLED","!((_WIN32)) && (__APPLE__)"]);
// meta.abstract is the state of a pure virtual: an abstract method is declared, not implemented.
const states = new Set(["meta.implemented","meta.adapted","meta.notImplemented","meta.notSupported","meta.notUsed","meta.abstract"]);
const bits = { NONE:0, READ:1, WRITE:2, READWRITE:3, NOTIFY:4, HIDDEN:8, PERSIST:16, RPERSIST:32,
    FLAGS:256, ENUM:512, PERSISTONLY:24, MODMASK:15, SERMASK:240, EDMASK:3840, EDIT_FORCELONG:0xFFFFFFFF };
const oldBits = {read:1,write:2,readwrite:3,notify:4,hidden:8,persist:16,rpersist:32,persistOnly:24};
const maps = {mapAttribute:"MAP_ATTRIBUTE",mapAttributeWithChooser:"MAP_ATTRIBUTE_WITH_CHOOSER",
    mapProperty:"MAP_PROPERTY",mapPropertyReadOnly:"MAP_PROPERTY_READONLY",mapPropertyPersisted:"MAP_PROPERTY_PERSISTED",
    mapProperty__Field:"MAP_PROPERTY",mapPropertyReadOnly__Field:"MAP_PROPERTY_READONLY",mapPropertyPersisted__Field:"MAP_PROPERTY_PERSISTED",
    mapMethod:"MAP_METHOD",mapMethodAndWrap:"MAP_METHOD_AND_WRAP",mapMethodAndWrapOptionalArgs:"MAP_METHOD_AND_WRAP_OPTIONAL_ARGS",mapMethodAsMethod:"MAP_METHOD_AS_METHOD"};

/** Evaluates only literal EDITFLAGS unions; unknown expressions stay review findings. */
export function flagMask(value)
{
    if (typeof value === "number") return value;
    const expression = typeof value === "string" ? value : value?.$expr;
    if (!expression) return null;
    let mask = 0;
    for (const part of expression.replace(/[()]/g,"").split("|"))
    {
        const name = part.trim().replace(/^.*(?:::|\.)/,"");
        if (/^(?:0x[\da-f]+|\d+)$/i.test(name)) mask |= Number(name);
        else if (Object.hasOwn(bits,name)) mask |= bits[name];
        else return null;
    }
    return mask >>> 0;
}

/** Uses declared native identity, keeping own modelled-on donors distinct. */
function identity(c)
{
    const native = [], donors = [];
    const carbonComments = (c.donorComments ?? []).filter(d => !d.error && d.kind === "Carbon").map(d => d.name);
    native.push(...carbonComments);
    donors.push(...(c.donorComments ?? []).filter(d => !d.error).map(d => d.name));
    const annotations = c.definitions.filter(d => d.kind === "meta.carbon");
    const exposed = c.definitions.some(d => d.namespace === "blue" || d.namespace === "exposure");
    let own = false, declared = false;
    for (const d of c.definitions)
    {
        declared = true;
        const v = d.value;
        if (d.kind === "meta.carbon")
        {
            const names = Array.isArray(v) ? v : [v];
            native.push(...names);
            if (exposed) donors.push(...names);
        }
        else if (d.namespace === "blue" || d.namespace === "exposure")
            native.push(...(annotations.length || carbonComments.length ? [] : typeof v === "string" ? [v] : v?.carbon ? [].concat(v.carbon) : [v?.className]));
        else if (v?.carbon) native.push(...[].concat(v.carbon));
        else own = true;
    }
    return {native:[...new Set(native.filter(x=>typeof x==="string"))],donors:[...new Set(donors)],own,declared};
}

/** Compares a current source inventory with native header and exposure oracles. Findings never fail a build. */
export function auditDecorators(inventory, oracle, headers, chooserBindings = {})
{
    const findings = [], byExposure = new Map(oracle.map(c=>[c.name,c])), byHeader = new Map();
    for (const h of headers)
    {
        if (!byHeader.has(h.name)) byHeader.set(h.name,[]);
        byHeader.get(h.name).push(h);
    }
    const add = (rule,c,m,detail,evidence) => findings.push({rule,source:c.source,class:c.name,
        member:m?.name??"<class>",line:m?.line??c.line,detail,...(evidence?{evidence}: {})});
    for (const c of inventory.classes)
    {
        if (c.dropped) continue;
        const id=identity(c), nativeRows=id.native.map(n=>byExposure.get(n)).filter(Boolean);
        const searched=new Set(), nativeMethods=new Set();
        const queue=[...id.native];
        while(queue.length)
        {
            const name=queue.shift();if(searched.has(name))continue;searched.add(name);
            for(const h of byHeader.get(name)??[])
            {
                for(const m of h.methods)nativeMethods.add(m.name);
                for(const base of h.bases)queue.push(base);
            }
        }
        for(const m of [{name:"<class>",kind:"class",decorators:c.decorators,line:c.line},...c.members])
        {
            const ds=m.decorators??[], present=new Set(ds.filter(d=>states.has(d.name)).map(d=>d.name));
            // A constructor cannot carry a decorator; its state is the class's.
            if(!present.size&&m.kind!=="constructor")add("required-state",c,m,"Missing explicit target state; never inferred as implemented.");
            if(present.size>1)add("conflicting-state",c,m,[...present].join(", "));
            if(ds.some(d=>d.name==="meta.noop"))add("retired-noop",c,m,"Convert to adapted with rationale.");
            // A be.map* decorator above a class names a member the class inherits (decorator-upgrade.md § 00): the row is checked against the class's own block.
            if(m.kind==="class")
            {
                for(const d of ds.filter(d=>d.name.startsWith("exposure.")&&maps[d.name.split(".")[1]]))
                {
                    const key=d.name.split(".")[1], category=key.startsWith("mapMethod")?"methods":key.startsWith("mapProperty")?"properties":"attributes";
                    const names=[key==="mapAttribute"?d.args[1]:key==="mapAttributeWithChooser"?d.args[2]:d.args[0]].flat();
                    for(const name of names)
                    {
                        const rows=nativeRows.flatMap(n=>n[category]).filter(row=>row.name===name);
                        const at={name:String(name),line:d.line};
                        if(!rows.length){add("exposure-absent",c,at,"No own Carbon macro row for this inherited member.");continue;}
                        if(!rows.some(r=>r.macro===maps[key]))add("exposure-macro",c,at,"Macro kind differs.",rows.map(r=>r.macro));
                        if(rows.some(r=>r.condition?.length&&!r.condition.every(x=>ruledOn.has(x))))add("conditional-exposure",c,at,"Select target preprocessor conditions before migration.");
                        if(category==="attributes"&&!rows.some(r=>flagMask(r.flagsAsWritten)===flagMask(d.args[0])))add("exposure-flags",c,at,"Flag bits differ or cannot be statically resolved.",rows.map(r=>r.flagsAsWritten));
                        // A property on a plain field is faithful wherever the row sits: Carbon's getter (declared on a base when the member is inherited) must only read the member.
                        if(key.endsWith("__Field")&&fs.existsSync(process.env.CARBON_ROOT??"E:/carbonengine"))
                        {
                            const row=rows.find(r=>r.getter);
                            if(row)
                            {
                                const readOnly=key.includes("mapPropertyReadOnly");
                                let check=null;
                                for(const owner of [...searched])
                                {
                                    check=checkAccessorBodies(owner,row.getter,readOnly?null:row.setter);
                                    if(!check.reasons.some(x=>/has no definition beside the class/.test(x)))break;
                                }
                                if(check&&!check.ok)add("property-field-body",c,at,"Carbon's accessors do more than read and write one member, so the property cannot sit on a plain field.",check.reasons);
                            }
                        }
                    }
                }
                continue;
            }
            if(id.native.length && m.kind==="method" && !ds.some(d=>d.name==="meta.cjs"))
            {
                const name=m.name.replace(/^[_#]/,"").split("__")[0];
                const candidates=[m.name,name,...ds.filter(d=>d.name==="meta.renamed").map(d=>d.args[0])];
                if(m.static)candidates.push(name[0]?.toUpperCase()+name.slice(1));
                if(name==="Destruct")for(const n of id.native)candidates.push("~"+n.split("::").at(-1));
                // A constructor overload is create__Discriminator and an assignment operator is Assign__Discriminator (decorator-upgrade.md § 00); the header
                // oracle records a constructor under the class name and every operator as "operator".
                if(name==="create")for(const n of id.native)candidates.push(n.split("::").at(-1));
                if(name==="Assign")candidates.push("operator");
                if(!candidates.some(n=>nativeMethods.has(n)))add("carbon-origin-name",c,m,
                    "No header method match; review free functions, extracted helpers and explicit own origin.",{identities:id.native,searched:[...searched]});
            }
            const mapped=ds.filter(d=>d.name.startsWith("exposure.")&&maps[d.name.split(".")[1]]);
            const legacy=ds.some(d=>d.name.startsWith("blue.")&&(["property","attribute","chooser","method"].includes(d.name.slice(5))||Object.hasOwn(oldBits,d.name.slice(5))));
            if(!mapped.length && !legacy)continue;
            const isMethod=m.kind==="method", property=mapped.some(d=>d.name.includes("mapProperty"))||ds.some(d=>d.name==="blue.property");
            const category=isMethod?"methods":property?"properties":"attributes";
            let exposed=m.name, expectedMacro=null, actualFlags=null, chooser;
            if(mapped.length)
            {
                const d=mapped[0], key=d.name.split(".")[1];expectedMacro=maps[key];
                const pos=key==="mapAttributeWithChooser"?2:key==="mapAttribute"?1:0;
                if(d.args[pos]!==undefined)exposed=d.args[pos];
                if(category==="attributes")actualFlags=flagMask(d.args[0]);
                if(key==="mapAttributeWithChooser")chooser=d.args[1];
                // Carbon exposes one function under several names (several MAP_METHOD* lines): distinct names are aliases, not duplicates.
                const aliasLines=mapped.every(x=>x.name.split(".")[1].startsWith("mapMethod"))&&new Set(mapped.map(x=>x.args[0]??"")).size===mapped.length;
                // One member under two Carbon names (decorator-upgrade.md § 00): attribute or property rows, each with its own exposed name.
                const rowName=x=>{const k=x.name.split(".")[1];const at=k==="mapAttributeWithChooser"?2:k==="mapAttribute"?1:0;return x.args[at]??m.name;};
                const nameRows=mapped.every(x=>/^map(Attribute|Property)/.test(x.name.split(".")[1]))&&new Set(mapped.map(rowName)).size===mapped.length;
                if(mapped.length>1&&!aliasLines&&!nameRows)add("duplicate-exposure",c,m,"Multiple complete exposure declarations on one member.");
            }
            else
            {
                const alias=ds.find(d=>["blue.attribute","blue.property"].includes(d.name)&&typeof d.args[0]==="string");
                if(alias)exposed=alias.args[0];
                actualFlags=0;
                for(const d of ds)if(Object.hasOwn(oldBits,d.name.slice(5))&&d.name.startsWith("blue."))actualFlags|=oldBits[d.name.slice(5)];
                if(ds.some(d=>d.name==="type.enum"))actualFlags|=512;
                if(ds.some(d=>d.name==="type.flags"))actualFlags|=256;
                chooser=ds.find(d=>["blue.chooser","type.enum","type.flags"].includes(d.name))?.args[0];
            }
            const rows=nativeRows.flatMap(n=>n[category]).filter(row=>row.name===exposed||isMethod&&row.function===m.name);
            if(!rows.length)
            {
                add("exposure-absent",c,m,"No own Carbon macro row for this declaration.");continue;
            }
            // A property on a plain field is faithful only where Carbon's getter and setter just read and write one member.
            if(mapped.some(d=>d.name.endsWith("__Field"))&&fs.existsSync(process.env.CARBON_ROOT??"E:/carbonengine"))
            {
                const row=rows.find(r=>r.name===exposed&&r.getter);
                if(row)
                {
                    const readOnly=mapped.some(d=>d.name.includes("mapPropertyReadOnly"));
                    const check=checkAccessorBodies(c.name,row.getter,readOnly?null:row.setter);
                    if(!check.ok)add("property-field-body",c,m,"Carbon's accessors do more than read and write one member, so the property cannot sit on a plain field.",check.reasons);
                }
            }
            if(rows.some(r=>r.condition?.length&&!r.condition.every(c=>ruledOn.has(c))))add("conditional-exposure",c,m,"Select target preprocessor conditions before migration.",rows.map(r=>({source:r.source,line:r.line,condition:r.condition})));
            if(mapped.length&&!rows.some(r=>r.name===exposed))add("exposure-name",c,m,"Exposed name differs from the native macro.",rows.map(r=>r.name));
            if(expectedMacro&&!rows.some(r=>r.macro===expectedMacro))add("exposure-macro",c,m,"Macro kind differs.",rows.map(r=>r.macro));
            if(category==="attributes")
            {
                if(actualFlags===null||!rows.some(r=>flagMask(r.flagsAsWritten)===actualFlags))add("exposure-flags",c,m,"Flag bits differ or cannot be statically resolved.",rows.map(r=>r.flagsAsWritten));
                const chooserEqual=r=>{
                    const expected=[null,"NULL","nullptr","0"].includes(r.chooser)?null:r.chooser;
                    const actual=chooser?.$expr??chooser??null;
                    return actual===expected||[chooserBindings[expected]].flat().includes(actual);
                };
                if(!rows.some(chooserEqual))add("exposure-chooser",c,m,"Chooser identity needs equality or an explicit native-to-registry binding.",rows.map(r=>r.chooser));
            }
        }
        for(const native of nativeRows)
        {
            for(const row of [...native.attributes,...native.properties,...native.methods])
            {
                const names=[row.name,row.function].filter(Boolean);
                // The C++ function name resolves first (MAP_METHOD_AND_WRAP( "Render", RenderFromScript )), so member order never decides which
                // declaration a macro lands on; the exposed name is only a fallback.
                const byFunction=row.function?c.members.find(m=>m.name===row.function):null;
                const found=byFunction??c.members.find(m=>names.includes(m.name)||m.decorators.some(d=>
                    (["blue.attribute","blue.property"].includes(d.name)||d.name.startsWith("exposure.map"))&&d.args.some(a=>names.includes(a))));
                const classLevel=c.decorators.some(d=>d.name.startsWith("exposure.map")&&[d.args[0],d.args[1],d.args[2]].flat().some(a=>names.includes(a)));
                if(!found&&classLevel)continue;
                if(!found)add("exposure-member-unresolved",c,{name:row.name},"No own declaration resolved; inherited exposure needs review.",{source:row.source,line:row.line});
                else if(!found.decorators.some(d=>d.name.startsWith("exposure.map") || d.name.startsWith("blue.") && (["method","attribute","property","chooser"].includes(d.name.slice(5)) || Object.hasOwn(oldBits,d.name.slice(5)))))
                    add("exposure-declaration-missing",c,found,"Native macro has no exposure decorator on the resolved member.",{source:row.source,line:row.line});
            }
            const mapsInSource=c.decorators.filter(d=>["blue.interface","exposure.mapInterface"].includes(d.name)).flatMap(d=>d.args.map(x=>x?.$expr??x));
            for(const row of native.interfaces)
                if(row.name!==native.name&&row.name!=="IRoot"&&!mapsInSource.includes(row.name))
                    add("interface-map",c,null,`Missing explicit non-self map: ${row.name}`,{source:row.source,line:row.line});
            // Native explicit self-map rows are satisfied by define, never emitted.
            if(c.decorators.some(d=>d.name==="exposure.mapInterface"&&d.args.some(a=>a?.$expr===c.name)))
                add("explicit-self-map",c,null,"Remove explicit self mapping; define supplies it.");
        }
        if(c.name.startsWith("Cjs"))
        {
            const backend=/^src\/trinityal\/(webgpu|webgl2)\//.test(c.source);
            if(backend&&!id.native.length&&!id.donors.length)add("backend-donor",c,null,"Backend name is allowed; declare a donor or review own platform glue.");
            if(!backend&&(id.native.length||id.donors.length))add("cjs-donor",c,null,"Review native rename or justified merged/adapted Cjs identity.",{native:id.native,donors:id.donors});
        }
    }
    for(const diagnostic of inventory.diagnostics)add("inventory-unresolved",{source:diagnostic.source,name:diagnostic.class??"<inventory>"},null,diagnostic.kind,diagnostic);
    return findings;
}

/** Stable finding identity ignores source line shifts and platform line endings. */
export function findingFingerprint(f)
{
    return crypto.createHash("sha256").update(JSON.stringify([f.rule,f.source,f.class,f.member,f.detail,f.evidence],
        (key,value)=>key === "line" ? undefined : typeof value === "string" ? value.replaceAll("\r\n","\n") : value)).digest("hex");
}

/**
 * An update only retires resolved findings; new findings can never enter the baseline.
 * A declared rename ({class,from,to}) carries a baselined finding to its new member name: the finding must exist under `to` now and its
 * fingerprint with `from` substituted must already be in the baseline, so a genuinely new finding is never absorbed.
 */
export function shrinkBaseline(findings, baseline, renames=[])
{
    const known = new Set(baseline.fingerprints);
    for(const rename of renames)
        for(const f of findings)
            if(f.class===rename.class&&f.member===rename.to&&known.has(findingFingerprint({...f,member:rename.from})))
                known.add(findingFingerprint(f));
    const current = new Set(findings.map(findingFingerprint));
    return {version:1,fingerprints:[...known].filter(value=>current.has(value)).sort()};
}

/** Runtime-only report. Baseline updates shrink; missing states remain findings, never inferred states. */
export function run(argv)
{
    const args=new Map();for(let i=0;i<argv.length;i++)if(argv[i].startsWith("--"))args.set(argv[i],argv[i+1]?.startsWith("--")?true:argv[++i]??true);
    const root=path.resolve(args.get("--root")??fileURLToPath(new URL("..",import.meta.url)));
    const packageFile=path.join(root,"package.json");
    const packageName=fs.existsSync(packageFile)?JSON.parse(fs.readFileSync(packageFile,"utf8")).name:null;
    if(packageName!=="@carbonenginejs/runtime")
    {
        const report={mode:"report-only",scope:"excluded",packageName,counts:{},total:0,newFindings:0,findings:[],
            reason:"Decorator state/origin migration currently applies only to runtime; application packages are excluded."};
        if(args.has("--output"))fs.writeFileSync(args.get("--output"),JSON.stringify(report,null,2)+"\n");
        console.log(JSON.stringify(report));return report;
    }
    const oracleDir=args.get("--oracle");
    if(!oracleDir)throw new Error("Pass --oracle <preparation data directory> containing carbon-exposure.json and carbon-headers.json.");
    const read=name=>JSON.parse(fs.readFileSync(path.join(oracleDir,name),"utf8"));
    const findings=auditDecorators(inventoryRuntime(root),read("carbon-exposure.json"),read("carbon-headers.json"),args.has("--choosers")?JSON.parse(fs.readFileSync(args.get("--choosers"),"utf8")):{});
    const baselinePath=path.join(root,"scripts/baselines/decorator-target.json");
    let previous=fs.existsSync(baselinePath)?JSON.parse(fs.readFileSync(baselinePath,"utf8")):null;
    if(args.has("--write-baseline"))
    {
        if(!previous)throw new Error("Shrink-only baseline update requires an existing baseline.");
        const renames=[args.get("--rename")].flat().filter(v=>typeof v==="string").flatMap(v=>v.split(",")).map(v=>{const [cls,pair]=v.split(":");const [from,to]=pair.split("=");return {class:cls,from,to};});
        previous=shrinkBaseline(findings,previous,renames);
        fs.writeFileSync(baselinePath,JSON.stringify(previous,null,2)+"\n");
    }
    const baseline=new Set(previous?.fingerprints??[]);
    const counts={};for(const f of findings){counts[f.rule]=(counts[f.rule]??0)+1;f.baselined=baseline.has(findingFingerprint(f));}
    const report={mode:"report-only",scope:"runtime",baselinePolicy:"shrink-only",counts,total:findings.length,newFindings:findings.filter(f=>!f.baselined).length,findings};
    if(args.has("--output"))fs.writeFileSync(args.get("--output"),JSON.stringify(report,null,2)+"\n");
    console.log(JSON.stringify({mode:report.mode,scope:report.scope,counts,total:report.total,newFindings:report.newFindings}));
    return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)run(process.argv.slice(2));
