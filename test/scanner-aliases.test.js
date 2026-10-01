import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));

// Run the real CLI in its own process. Only scanner inputs are virtual: its
// source, imports, parser, private functions, diagnostics and exit path are real.
// No fixture files or baselines are written into the runtime checkout.
function runScanner(script, files, args = [])
{
  const input = { packageRoot, script, files, args };
  const probe = spawnSync(process.execPath, [ "--input-type=module", "--eval", `
    import fs from "node:fs";
    import promises from "node:fs/promises";
    import { syncBuiltinESMExports } from "node:module";
    import path from "node:path";
    import { pathToFileURL } from "node:url";

    const input = ${JSON.stringify(input)};
    const root = path.resolve(input.packageRoot);
    const files = new Map(Object.entries(input.files).map(([file, text]) => [path.resolve(root, file), text]));
    const directories = new Set([
      "src", "src/trinity", "src/trinity/generated", "src/trinity/postProcess",
      "src/trinityal", ".scanner-schema", ".scanner-donor"
    ].map(directory => path.resolve(root, directory)));
    for (const file of files.keys())
    {
      for (let directory = path.dirname(file); directory !== root; directory = path.dirname(directory))
      {
        if (!directory.startsWith(root + path.sep)) throw new Error("Fixture escaped its virtual root");
        directories.add(directory);
      }
    }
    directories.add(root);

    promises.readdir = async (directory, options) =>
    {
      directory = path.resolve(directory);
      if (!directories.has(directory) || options?.withFileTypes !== true)
        throw new Error("Unexpected scanner directory read: " + directory);
      const entries = new Map();
      for (const file of files.keys())
      {
        if (path.dirname(file) === directory) entries.set(path.basename(file), false);
      }
      for (const child of directories)
      {
        if (child !== directory && path.dirname(child) === directory) entries.set(path.basename(child), true);
      }
      return [...entries].map(([name, directory]) => ({
        name, isDirectory: () => directory, isFile: () => !directory
      }));
    };
    promises.readFile = async (file, encoding) =>
    {
      file = path.resolve(file);
      if (!files.has(file)) throw new Error("Unexpected scanner file read: " + file);
      return encoding === "utf8" ? files.get(file) : Buffer.from(files.get(file));
    };
    fs.existsSync = file => files.has(path.resolve(file)) || directories.has(path.resolve(file));
    for (const name of ["writeFile", "appendFile", "copyFile", "cp", "mkdir", "mkdtemp", "rename", "rm", "rmdir", "truncate", "unlink", "createWriteStream"])
    {
      promises[name] = async () => { throw new Error("Scanner attempted a filesystem mutation: " + name); };
      for (const method of [name, name + "Sync"])
      {
        if (typeof fs[method] === "function") fs[method] = () => { throw new Error("Scanner attempted a filesystem mutation: " + method); };
      }
    }
    // Node's own module loader still needs read-only opens for the real CLI.
    for (const [owner, name] of [[fs, "open"], [fs, "openSync"], [promises, "open"]])
    {
      const original = owner[name].bind(owner);
      owner[name] = (file, flags, ...args) =>
      {
        if (flags !== "r" && flags !== fs.constants.O_RDONLY && flags !== undefined)
          throw new Error("Scanner attempted a writable open: " + file);
        return original(file, flags, ...args);
      };
    }
    // AL parity imports named fs functions; publish the same isolated overlay.
    syncBuiltinESMExports();
    process.env.CARBON_SCHEMA_ROOT = path.join(root, ".scanner-schema");
    process.env.CARBON_ROOT = path.join(root, ".scanner-donor");
    const script = path.join(root, input.script);
    process.argv = [process.execPath, script, ...input.args];
    await import(pathToFileURL(script).href);
  ` ], { cwd: packageRoot, encoding: "utf8", timeout: 10000, maxBuffer: 1024 * 1024 });
  assert.ifError(probe.error);
  assert.equal(probe.signal, null, probe.stderr);
  return probe;
}

function expectStatus(probe, status)
{
  assert.equal(probe.status, status, probe.stderr || probe.stdout);
}

const nativeMethods = [ "Inherited", "FromDecorator", "FromDefinition", "FromImperative" ];

function nativeFixture({ inherit, renamed, definition, imperative })
{
  return {
    "src/trinity/ScannerProbe.js": `
class Owner { Inherited() {} }
@${inherit}
export class ScannerProbe
{
  @${renamed}
  Decorated() {}
  Defined() {}
  Imperative() {}
}
CjsSchema.define(ScannerProbe, { methods: { Defined: [${definition}] } });
CjsSchema.decorateMethod(ScannerProbe, "Imperative", ${imperative});
`,
    ".scanner-schema/ScannerProbe.json": JSON.stringify({
      blueClass: "ScannerProbe", nativeMethods: nativeMethods.map(cppName => ({ cppName }))
    }),
    "scripts/native-method-baseline.json": "{}"
  };
}

test("native-method CLI credits legacy and canonical inheritance and every renamed path equally", () =>
{
  const reports = [];
  for (const carbon of [ "carbon", "meta.carbon" ])
  {
    const probe = runScanner("scripts/trinity/lint-native-method-parity.js", nativeFixture({
      inherit: `${carbon}.inherit(Owner)`,
      renamed: `${carbon}.renamed("FromDecorator")`,
      definition: `${carbon}.renamed("FromDefinition")`,
      imperative: `${carbon}.renamed("FromImperative")`
    }));
    expectStatus(probe, 0);
    assert.match(probe.stdout, /1 ported classes checked, 0 with gaps, 0 missing methods/);
    assert.doesNotMatch(probe.stdout, /skipping/i);
    reports.push(probe.stdout);
  }
  assert.equal(reports[0], reports[1]);
});

test("native-method CLI rejects unrelated, computed and nonliteral declaration controls", () =>
{
  const probe = runScanner("scripts/trinity/lint-native-method-parity.js", nativeFixture({
    inherit: "(meta['carbon'].inherit(Owner))",
    renamed: "(meta.carbon['renamed'](\"FromDecorator\"))",
    definition: "meta.carbon.renamed(originalName)",
    imperative: "other.carbon.renamed(\"FromImperative\")"
  }));
  expectStatus(probe, 1);
  assert.match(probe.stdout, /1 ported classes checked, 1 with gaps, 4 missing methods/);
  for (const name of nativeMethods) assert.ok(probe.stderr.includes(name), probe.stderr);
});

function contextualFixture(decorators, parameters)
{
  return { "src/trinity/ScannerProbe.js": `export class ScannerProbe
{
${decorators.map((decorator, index) => `  @${decorator}
  Method${index}(${parameters[index]})
  {
  }
`).join("\n")}}
` };
}

test("style CLI applies context-first rules equally to legacy and canonical markers", () =>
{
  for (const carbon of [ "carbon", "meta.carbon" ])
  {
    const decorators = [`${carbon}.contextual(["camera"])`, `${carbon}.contextual(["camera"])`];
    const good = runScanner("scripts/trinity/lint_source_style.js",
      contextualFixture(decorators, [ "context, transform", "_updateContext = null, params" ]));
    expectStatus(good, 0);
    assert.match(good.stdout, /0 generated\/post-process files and 1 class-method files passed/);

    const bad = runScanner("scripts/trinity/lint_source_style.js",
      contextualFixture(decorators, [ "transform, out", "" ]));
    expectStatus(bad, 1);
    assert.equal((bad.stderr.match(/must be context-first/g) ?? []).length, 2, bad.stderr);
    assert.match(bad.stderr, /2 source style error\(s\)/);
  }
});

test("style CLI does not treat unrelated or computed decorators as contextual markers", () =>
{
  const decorators = [
    "other.carbon.contextual([])", "meta.other.contextual([])",
    "(carbon['contextual']([]))", "(meta['carbon'].contextual([]))", "(meta.carbon['contextual']([]))"
  ];
  const probe = runScanner("scripts/trinity/lint_source_style.js",
    contextualFixture(decorators, decorators.map(() => "value")));
  expectStatus(probe, 0);
  assert.match(probe.stdout, /1 class-method files passed/);
});

function inventoryFixture(implementation, types, controls = "")
{
  return { "src/trinity/ScannerProbe.js": `export class ScannerProbe
{
  @${implementation}.notImplemented
  MissingMethod() {}
  @${types}.unknown("NativeType")
  missingField = null;
${controls}}
` };
}

function implementationInventory(files)
{
  const probe = runScanner("scripts/audit_implementation_gaps.js", files, [ "--layer", "trinity", "--json" ]);
  expectStatus(probe, 0);
  const report = JSON.parse(probe.stdout);
  delete report.generatedAt;
  assert.equal(report.scope, "trinity");
  assert.equal(report.summary.methods.count, 1);
  assert.equal(report.summary.properties.count, 1);
  assert.deepEqual(report.methods.map(({ className, member }) => ({ className, member })),
    [{ className: "ScannerProbe", member: "MissingMethod" }]);
  assert.deepEqual(report.properties.map(({ className, member }) => ({ className, member })),
    [{ className: "ScannerProbe", member: "missingField" }]);
  return report;
}

test("implementation-gap CLI inventories legacy and canonical aliases identically", () =>
{
  const legacy = implementationInventory(inventoryFixture("impl", "type"));
  const canonical = implementationInventory(inventoryFixture("meta.impl", "types"));
  assert.deepEqual(canonical, legacy);
});

test("implementation-gap CLI rejects unrelated and computed decorators without losing real gaps", () =>
{
  implementationInventory(inventoryFixture("impl", "type", `
  @other.impl.notImplemented
  UnrelatedMethod() {}
  @(meta["impl"].notImplemented)
  ComputedOwner() {}
  @(meta.impl["notImplemented"])
  ComputedMethod() {}
  @other.unknown("NativeType")
  unrelatedField = null;
  @(types["unknown"]("NativeType"))
  computedField = null;
  @meta.types.unknown("NativeType")
  nestedType = null;
`));
});

function alFixture(declaration)
{
  return {
    "src/trinityal/ScannerProbe.js": `// Source: NativeProbe.h
${declaration}
export class RenamedProbe
{
  DoThing()
  {
  }
}
`,
    ".scanner-donor/NativeProbe.h": "class NativeProbe\n{\npublic:\n  void DoThing();\n};\n",
    "scripts/al-parity-baseline.json": "{\"problems\":[]}"
  };
}

test("AL parity CLI recognizes type.define, meta.define and types.define donor declarations", () =>
{
  const reports = [];
  for (const namespace of [ "type", "meta", "types" ])
  {
    const probe = runScanner("scripts/lint-al-parity.js",
      alFixture(`@${namespace}.define({ className: "RenamedProbe", carbon: "NativeProbe" })`));
    expectStatus(probe, 0);
    assert.match(probe.stdout, /AL parity OK: 1 classes compared, 0 known gap\(s\)/);
    assert.doesNotMatch(probe.stdout, /SKIPPED/);
    reports.push(probe.stdout);
  }
  assert.equal(reports[0], reports[1]);
  assert.equal(reports[0], reports[2]);
});

test("AL parity CLI does not assign donors from unrelated or computed define declarations", () =>
{
  for (const decorator of [ "other.define", "meta['define']" ])
  {
    const probe = runScanner("scripts/lint-al-parity.js",
      alFixture(`@(${decorator}({ className: "RenamedProbe", carbon: "NativeProbe" }))`));
    expectStatus(probe, 1);
    assert.match(probe.stderr, /RenamedProbe matches no class in its cited donors/);
    assert.match(probe.stderr, /1 NEW AL parity problem\(s\)/);
  }
});
