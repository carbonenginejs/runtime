import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rollup } from "rollup";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const publishedRoot = path.join(packageRoot, process.env.CJS_MINIFIED_TEST === "1" ? ".cache/minified-test" : "npm");
const require = createRequire(path.join(packageRoot, "package.json"));

// This consumer resolver implements only this package's string exports/imports
// and exact sideEffects paths. Rollup performs the actual tree shaking. This is
// a retention regression, not a claim of compatibility with every bundler.
function packageTarget(map, name)
{
  if (typeof map[name] === "string") return map[name];
  for (const [pattern, target] of Object.entries(map).sort(([a], [b]) => b.indexOf("*") - a.indexOf("*") || b.length - a.length))
  {
    const star = pattern.indexOf("*");
    if (star < 0 || typeof target !== "string") continue;
    const prefix = pattern.slice(0, star);
    const suffix = pattern.slice(star + 1);
    if (name.startsWith(prefix) && name.endsWith(suffix))
    {
      return target.replace("*", name.slice(prefix.length, suffix ? -suffix.length : undefined));
    }
  }
  throw new Error(`Consumer fixture cannot resolve ${name}`);
}

async function bundleConsumer(source, manifest, sideEffects, allowDomains = false)
{
  const entry = "\0enum-consumer";
  const dependencies = new Set(Object.keys(manifest.dependencies));
  const graph = await rollup({
    input: entry,
    plugins: [{
      name: "published-enum-consumer",
      resolveId(specifier, importer)
      {
        if (specifier === entry) return entry;
        // Test observation only: reach the registry leaf without importing Blue,
        // whose own dependencies could mask a dropped bare constant import.
        if (specifier === "enum-registry-observer") return {
          id: path.join(publishedRoot, "dist/global/blue/enums/CjsBlueEnumRegistry.js"),
          moduleSideEffects: false
        };
        const packageName = specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0];
        if (dependencies.has(packageName)) return { id: specifier, external: true };
        let resolved;
        if (specifier.startsWith(manifest.name + "/"))
        {
          resolved = path.resolve(publishedRoot, packageTarget(manifest.exports, "." + specifier.slice(manifest.name.length)));
        }
        else if (specifier.startsWith("#"))
        {
          resolved = path.resolve(publishedRoot, packageTarget(manifest.imports, specifier));
        }
        else if (specifier.startsWith(".")) resolved = path.resolve(path.dirname(importer), specifier);
        else throw new Error(`Unexpected consumer dependency: ${specifier}`);
        const relative = "./" + path.relative(publishedRoot, resolved).replaceAll(path.sep, "/");
        if (!allowDomains && /^\.\/dist\/(audio|character|trinity|sof)\//.test(relative))
        {
          throw new Error(`Shared enum bundle reached a domain: ${relative}`);
        }
        return { id: resolved, moduleSideEffects: sideEffects !== false && sideEffects.includes(relative) };
      },
      load(id)
      {
        return id === entry ? source : null;
      }
    }],
    onwarn(warning)
    {
      if (warning.code !== "CIRCULAR_DEPENDENCY") throw new Error(warning.message);
    }
  });
  try
  {
    const generated = await graph.generate({
      format: "esm",
      // Third-party dependencies remain external; use their installed identities
      // when the private bundle runs outside this package's node_modules tree.
      paths: name => pathToFileURL(require.resolve(name)).href
    });
    assert.equal(generated.output.length, 1);
    return generated.output[0].code;
  }
  finally
  {
    await graph.close();
  }
}

async function runBundle(code, directory, name)
{
  const file = path.join(directory, name + ".mjs");
  await writeFile(file, code);
  return spawnSync(process.execPath, ["--input-type=module", "--eval", `
    for (const name of ["document", "window", "navigator", "AudioContext", "webkitAudioContext", "Worker"])
    {
      Object.defineProperty(globalThis, name, {
        configurable: true,
        get() { throw new Error("Consumer bundle touched " + name); }
      });
    }
    for (const name of ["fetch", "setTimeout", "setInterval", "requestAnimationFrame"])
    {
      globalThis[name] = () => { throw new Error("Consumer bundle started " + name); };
    }
    const consumer = await import(${JSON.stringify(pathToFileURL(file).href)});
    if (consumer.ready !== true) throw new Error("Shared enum registration was not retained");
  `], { encoding: "utf8" });
}

test("published metadata retains early shared enums in real consumer bundles", async () =>
{
  const manifest = JSON.parse(await readFile(path.join(publishedRoot, "package.json"), "utf8"));
  assert.ok(Array.isArray(manifest.sideEffects), "publication needs a narrow sideEffects path list");
  assert.ok(manifest.sideEffects.every(file => typeof file === "string" && !file.includes("*")));
  const fixtures = [
    ["named-blue", `
      import { blue } from "@carbonenginejs/runtime/blue";
      import { ReflectionMode } from "@carbonenginejs/runtime/consts/graphics";
      export const ready = blue.enums.GetEnum("trinity.EntityComponents.ReflectionMode") === ReflectionMode;
    `],
    ["bare-blue", `
      import "@carbonenginejs/runtime/blue";
      import { CjsSchema } from "@carbonenginejs/runtime/schema";
      import { TRIOPERATOR } from "@carbonenginejs/runtime/consts/graphics";
      export const ready = CjsSchema.getEnum("blue.TRIOPERATOR")?.type === TRIOPERATOR;
    `],
    ["bare-global", `
      import "@carbonenginejs/runtime/global";
      import { CjsSchema } from "@carbonenginejs/runtime/schema";
      import { Tr2Lod } from "@carbonenginejs/runtime/consts/trinity";
      export const ready = CjsSchema.getEnum("trinity.Tr2Lod")?.type === Tr2Lod;
    `]
  ];
  const directory = await mkdtemp(path.join(tmpdir(), "cjs-enum-consumer-"));
  try
  {
    for (const [name, source] of fixtures)
    {
      const bundled = await bundleConsumer(source, manifest, manifest.sideEffects);
      const positive = await runBundle(bundled, directory, name);
      assert.equal(positive.status, 0, positive.stderr || positive.stdout);
    }
    // A bare definition import must execute even when no constant binding is
    // referenced. Suppressing its side effect must remove the registration.
    // Named imports need no artificial failure: the used definition may itself
    // keep Create alive, unlike the former separate central registrar.
    for (const [module, enumName] of [
      ["graphics/trinityEnums", "trinity.EntityComponents.ReflectionMode"],
      ["trinity", "trinity.Tr2Lod"],
      ["media/metadata", "videoplayer.StreamType"],
      ["renderContext/presentation", "trinity.Tr2RenderContextEnum.PresentInterval"],
      ["renderContext/window", "trinity.Tr2WindowMode"],
      ["renderContext/formats", "trinity.ImageIO.PixelFormat"],
      ["renderContext/upscaling", "trinity.Tr2UpscalingAL.Technique"],
      ["renderContext/resources", "trinity.Tr2CpuUsage"]
    ])
    {
      const file = "./dist/global/consts/" + module + ".js";
      assert.ok(manifest.sideEffects.includes(file), file);
      const publicModule = module.startsWith("graphics/") ? "graphics"
        : module.startsWith("renderContext/") ? "render-context"
          : module.startsWith("media/") ? "media" : "trinity";
      const source = `
        import "@carbonenginejs/runtime/consts/${publicModule}";
        import { blueEnums } from "enum-registry-observer";
        export const ready = blueEnums.Get(${JSON.stringify(enumName)}) !== null;
      `;
      const positive = await runBundle(await bundleConsumer(source, manifest, manifest.sideEffects), directory, path.basename(module));
      assert.equal(positive.status, 0, positive.stderr || positive.stdout);
      const pruned = await bundleConsumer(source, manifest, manifest.sideEffects.filter(entry => entry !== file));
      const negative = await runBundle(pruned, directory, "pruned-" + path.basename(module));
      assert.notEqual(negative.status, 0, file + " must retain its definition-site registration");
      assert.match(negative.stderr, /Enum is not registered/);
    }
  }
  finally
  {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.ok(path.basename(directory).startsWith("cjs-enum-consumer-"));
    await rm(directory, { recursive: true, force: true });
  }
});

test("domain definition registrations survive bare public family imports", async () =>
{
  const manifest = JSON.parse(await readFile(path.join(publishedRoot, "package.json"), "utf8"));
  const directory = await mkdtemp(path.join(tmpdir(), "cjs-domain-enum-consumer-"));
  try
  {
    for (const [subpath, file, name] of [
      ["sof/hull", "sof/hull/EveSOFDataHull.js", "trinity.EveSOFDataHull.BuildClass"],
      ["trinity/eve", "trinity/eve/child/behaviors/enums.js", "trinity.BackAndForth.LocatorType"],
      ["trinity/generated/postProcess/enums.js", "trinity/generated/postProcess/enums.js", "trinity.PostProcessBlur.BlurType"]
    ])
    {
      const source = `import "@carbonenginejs/runtime/${subpath}";
        import { blueEnums } from "enum-registry-observer";
        export const ready = blueEnums.HasEnum(${JSON.stringify(name)});`;
      const bundle = await bundleConsumer(source, manifest, manifest.sideEffects, true);
      const positive = await runBundle(bundle, directory, file.replaceAll("/", "-"));
      assert.equal(positive.status, 0, positive.stderr || positive.stdout);
      const withoutDefinition = manifest.sideEffects.filter(p => p !== "./dist/" + file);
      const negativeBundle = await bundleConsumer(source, manifest, withoutDefinition, true);
      const negative = await runBundle(negativeBundle, directory, "negative-" + file.replaceAll("/", "-"));
      assert.notEqual(negative.status, 0, "omitting the defining module must lose its registration");
      assert.match(negative.stderr, /Shared enum registration was not retained/);
    }
  }
  finally { await rm(directory, {recursive: true, force: true}); }
});
