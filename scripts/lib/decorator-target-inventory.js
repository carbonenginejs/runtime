// Static inventory for the staged decorator migration. Never imports class source.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parse } from "@babel/parser";
const slash = s => s.replaceAll("\\", "/");
const hash = s => crypto.createHash("sha256").update(s).digest("hex");
function files(dir, extensions, excluded = new Set([".git", "node_modules", "npm", "dist"])) {
    let result = [];
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        if (excluded.has(item.name)) continue;
        const p = path.join(dir, item.name);
        if (item.isDirectory()) { for (const child of files(p, extensions, excluded)) result.push(child); }
        else if (extensions.some(x => p.endsWith(x))) result.push(p);
    }
    return result.sort();
}
function walk(node, fn) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { for (const n of node) walk(n, fn); return; }
    if (node.type) fn(node);
    for (const [key, value] of Object.entries(node)) {
        if (!["loc", "comments", "leadingComments", "trailingComments", "innerComments", "tokens"].includes(key) &&
            typeof value === "object") walk(value, fn);
    }
}


/** Parses class/member metadata, literal definitions and finite decorator loops without executing source. */
export function inventoryRuntime(root)
{
const classes = [], manifest = [], diagnostics = [], decorators = [], filePlans = [], externals = [];
for (const file of files(path.join(root,"src"), [".js"])) {
    const raw = fs.readFileSync(file), source = slash(path.relative(root,file)), text = raw.toString("utf8");
    const dropped = source.split("/").includes("dropped");
    manifest.push({source, sha256:hash(raw)});
    let ast;
    try { ast = parse(text, {sourceType:"module", plugins:[["decorators",{version:"2023-11"}]]}); }
    catch(e) { diagnostics.push({source, kind:"parse-error", error:e.message}); continue; }
    const bindings = {}, imports = [], constants = {};
    const src = n => n ? text.slice(n.start,n.end) : null;
    const key = n => n?.name ?? n?.value ?? src(n);
    for(const n of ast.program.body) if(n.type === "ImportDeclaration") {
        imports.push({module:n.source.value, text:src(n), line:n.loc.start.line,
            specifiers:n.specifiers.map(s=>({local:s.local.name, imported:s.imported?.name ?? s.type}))});
        for(const s of n.specifiers) if(s.type === "ImportSpecifier" &&
            (/schema/.test(n.source.value) || n.source.value === "#be")) bindings[s.local.name] = n.source.value === "#be" ? "exposure" : s.imported.name;
    }
    const dotted = n => {
        if(!n) return "";
        if(n.type === "Identifier") return bindings[n.name] ?? n.name;
        if(n.type === "MemberExpression") return dotted(n.object)+"."+key(n.property);
        return src(n);
    };
    const normalize = s => s.replace(/^CjsSchema\./,"").replace(/^meta\.(blue|type)\./,"$1.").replace(/^carbon\./,"blue.");
    const val = (n, env = constants) => {
        if(!n) return null;
        if(["StringLiteral","NumericLiteral","BooleanLiteral"].includes(n.type)) return n.value;
        if(n.type === "NullLiteral") return null;
        if(n.type === "Identifier" && Object.hasOwn(env,n.name)) return env[n.name];
        if(n.type === "CallExpression" && dotted(n.callee)==="Object.freeze") return val(n.arguments[0],env);
        if(n.type === "ArrayExpression") return n.elements.map(x=>val(x,env));
        if(n.type === "ObjectExpression") return Object.fromEntries(n.properties.map(p=>
            p.type === "ObjectProperty" ? [key(p.key),val(p.value,env)] : ["$unsupported",src(p)]));
        return {$expr:src(n)};
    };
    for(const stmt of ast.program.body) {
        const n=stmt.declaration??stmt;
        if(n.type==="VariableDeclaration") for(const d of n.declarations)
            if(d.id.type==="Identifier" && d.init) constants[d.id.name]=val(d.init);
    }
    const deco = (n, env = {}) => {
        const expr = n.type === "Decorator" ? n.expression : n;
        const call = expr?.type === "CallExpression";
        const d = {name:normalize(dotted(call ? expr.callee : expr)),
            args:call ? expr.arguments.map(x=>val(x,env)) : [], text:src(n),
            line:n.loc?.start.line, start:n.start, end:n.end};
        decorators.push({source, dropped, ...d});
        return d;
    };
    const local = new Map(), classNodes = [];
    walk(ast.program,n => {if(["ClassDeclaration","ClassExpression"].includes(n.type) && n.id) classNodes.push(n);});
    for(const n of classNodes) {
        const c = {source, dropped, name:n.id.name, line:n.loc.start.line,
            extends:src(n.superClass), decorators:(n.decorators??[]).map(d=>deco(d)), definitions:[],
            members:[], imports, sourceHash:hash(raw)};
        for(const m of n.body.body) {
            if(!m.key) continue;
            c.members.push({name:key(m.key), static:!!m.static, kind:m.kind??m.type,
                line:m.loc.start.line, start:m.start, end:m.end,
                decorators:(m.decorators??[]).map(d=>deco(d)),
                comments:(m.leadingComments??[]).map(x=>x.value).join("\n"),
                params:(m.params??[]).map(src), initializer:src(m.value)});
        }
        local.set(c.name,c); classes.push(c);
    }
    function target(name) {
        if(typeof name !== "string") return null;
        if(local.has(name)) return local.get(name);
        const existing = externals.find(c=>c.source===source && c.name===name);
        if(existing) return existing;
        const c={source,dropped,name,decorators:[],definitions:[],members:[],external:true,imports};
        externals.push(c); return c;
    }
    function member(c, name, staticMember = false) {
        let m=c.members.find(x=>x.name===name && x.static===staticMember);
        // Definition.methods describes both static and instance methods.
        if(!m && !staticMember) m=c.members.find(x=>x.name===name && x.static);
        if(!m) {m={name,static:staticMember,kind:"imperative-only",decorators:[]}; c.members.push(m);}
        return m;
    }
    function definition(c, expr, ns, site, env) {
        const value = val(expr,env);
        c.definitions.push({namespace:ns,value,line:site.loc.start.line,form:"imperative"});
        if(expr?.type !== "ObjectExpression") return;
        for(const prop of expr.properties) {
            const pk=key(prop.key);
            if(!["fields","methods","properties","statics"].includes(pk)) continue;
            if(prop.value.type !== "ObjectExpression") {
                diagnostics.push({source,line:prop.loc.start.line,kind:"dynamic-definition",class:c.name,section:pk}); continue;
            }
            for(const p of prop.value.properties) {
                if(p.type !== "ObjectProperty") continue;
                const m=member(c,key(p.key),pk==="statics");
                const vals=p.value.type==="ArrayExpression" ? p.value.elements : [p.value];
                if(p.value.type==="ObjectExpression") {
                    m.legacyDefinition=val(p.value);
                } else for(const v of vals) if(v) m.decorators.push(deco(v,env));
            }
        }
    }
    function visits(n, env = constants) {
        if(!n || typeof n!=="object") return;
        if(Array.isArray(n)) {for(const v of n) visits(v,env);return;}
        if(n.type === "ForOfStatement") {
            const values=val(n.right,env), id=n.left.declarations?.[0]?.id?.name;
            if(Array.isArray(values)&&id&&values.every(v=>typeof v==="string")) {
                for(const v of values) visits(n.body,{...env,[id]:v});
                return;
            }
        }
        if(n.type==="CallExpression") {
            const name=normalize(dotted(n.callee));
            if (["meta.implemented","meta.adapted","meta.notImplemented","meta.notSupported","meta.notUsed","meta.abstract","exposure.abstract"].includes(name) && n.arguments.length === 1 && n.arguments[0].type === "Identifier") {
                const c = target(src(n.arguments[0]));
                if (c) c.decorators.push({name,args:[],line:n.loc.start.line});
            }
            if((["blue.define","meta.define"].includes(name) || dotted(n.callee)==="CjsSchema.define") && n.arguments.length>=2) {
                const c=target(src(n.arguments[0]));
                if(c) definition(c,n.arguments[1],name.split(".")[0],n,env);
            }
            if(["decorateMethod","decorateField","decorateProperty","decorateStaticMethod"].includes(name)) {
                const c=target(src(n.arguments[0])), k=val(n.arguments[1],env);
                if(c && typeof k==="string") {
                    const m=member(c,k,name==="decorateStaticMethod");
                    for(const arg of n.arguments.slice(2)) m.decorators.push(deco(arg,env));
                } else diagnostics.push({source,line:n.loc.start.line,kind:"dynamic-decoration",text:src(n)});
            }
            if(n.callee.type==="CallExpression" && n.arguments.length===1) {
                const dn=normalize(dotted(n.callee.callee));
                if(["blue.interface","blue.inherit","blue.chainTo","exposure.mapInterface","exposure.exposureChainTo","exposure.inherit","exposure.define","exposure.interface","meta.define","meta.carbon","meta.interface"].includes(dn)) {
                    const c=target(src(n.arguments[0])); if(c)c.decorators.push(deco(n.callee,env));
                }
            }
        }
        for(const [k,v] of Object.entries(n)) if(!["loc","comments","leadingComments","trailingComments","innerComments"].includes(k)&& typeof v==="object") visits(v,env);
    }
    visits(ast.program);
    for(const c of local.values()) for(const d of c.decorators) if(["blue.define","meta.define","meta.carbon","meta.interface","exposure.define","exposure.interface"].includes(d.name))
        c.definitions.push({namespace:d.name.split(".")[0],kind:d.name,value:d.args[0],line:d.line,form:"decorator"});
    const counts={};
    for(const d of decorators.filter(d=>d.source===source)) counts[d.name]=(counts[d.name]??0)+1;
    filePlans.push({source,dropped,sha256:hash(raw),imports,counts,classes:[...local.keys()]});
}
// Attach imperative registrations made in another module to an unambiguous class.
for(const e of externals) {
    let candidates=classes.filter(c=>c.name===e.name && c.dropped===e.dropped);
    const binding=e.imports.flatMap(i=>i.specifiers.map(s=>({...s,module:i.module}))).find(s=>s.local===e.name);
    if(binding?.module.startsWith(".")) {
        const expected=slash(path.relative(root,path.resolve(root,path.dirname(e.source),binding.module)));
        candidates=classes.filter(c=>c.source===expected && c.name===(binding.imported??e.name));
    }
    if(candidates.length===1) {
        const c=candidates[0];
        c.definitions.push(...e.definitions.map(x=>({...x,source:e.source})));
        c.decorators.push(...e.decorators.map(x=>({...x,source:e.source})));
        for(const m of e.members) {
            let old=c.members.find(x=>x.name===m.name&&x.static===m.static);
            if(!old)c.members.push({...m,source:e.source});
            else old.decorators.push(...m.decorators.map(x=>({...x,source:e.source})));
        }
    } else diagnostics.push({source:e.source,class:e.name,kind:"external-registration",candidates:candidates.map(c=>c.source)});
}

    return {classes,manifest,diagnostics,decorators};
}
