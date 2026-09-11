import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import { sourceIndex, baselineProblems } from "./lib/carbon-source-index.js";
import { compareDefaults, literalValue } from "./lib/carbon-header-shape.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const carbonRoot = process.env.CARBON_ROOT ?? "E:/carbonengine";
if (!existsSync(carbonRoot))
{
    console.log("Struct defaults SKIPPED: set CARBON_ROOT to the Carbon source checkout.");
}
else
{
    const { sources, classes } = await sourceIndex(root, carbonRoot);
    const cppConstants = {};
    const jsConstants = {};
    // Resolve the sampler's enum values from BOTH current source declarations.
    const enumSource = await readFile(path.join(carbonRoot, "trinity/trinityal/Tr2RenderContextEnum.h"), "utf8");
    for (const match of enumSource.matchAll(/\b((?:TF_|TA_|CMP_)\w+)\s*=\s*(\d+)\s*[,}]/g)) cppConstants[`Tr2RenderContextEnum::${match[1]}`] = Number(match[2]);
    const states = parse(await readFile(path.join(root, "src/global/consts/renderContext/renderStates.js"), "utf8"), { sourceType: "module" });
    for (const node of states.program.body)
    {
        for (const declaration of node.declaration?.declarations ?? [])
        {
            if (![ "CompareFunc", "TextureAddressMode", "TextureFilter" ].includes(declaration.id.name)) continue;
            for (const property of declaration.init.arguments[0].properties)
            {
                if (property.value.type === "NumericLiteral") jsConstants[`${declaration.id.name}.${property.key.name}`] = property.value.value;
            }
        }
    }
    // C++ float max is a language/library constant, not an assumed port value.
    cppConstants["std::numeric_limits<float>::max()"] = 3.4028234663852886e38;
    const sampler = await readFile(path.join(root, "src/trinityal/Tr2HalHelperStructures/Tr2SamplerDescription.js"), "utf8");
    const bound = sampler.match(/const SAMPLER_LOD_UNBOUNDED\s*=\s*([^;]+);/);
    if (bound) jsConstants.SAMPLER_LOD_UNBOUNDED = literalValue(bound[1]).value;
    const problems = new Map();
    const unchecked = [];
    let checked = 0;
    let structs = 0;
    for (const [ header, { types } ] of sources)
    {
        for (const type of types)
        {
            if (type.kind !== "struct") continue;
            for (const declaration of classes.get(type.qualifiedName) ?? [])
            {
                structs++;
                const result = compareDefaults(type, declaration.node, cppConstants, jsConstants);
                checked += result.checked.length;
                for (const mismatch of result.mismatches) problems.set(`${header}#${type.name}.${mismatch.split(":")[0]}`, `${declaration.file}: ${mismatch}`);
                for (const detail of result.unchecked) unchecked.push(`${header}:${type.line} ${type.name}: ${detail}`);
            }
        }
    }
    const passed = await baselineProblems(problems, path.join(root, "scripts/struct-defaults-baseline.json"), process.argv.includes("--write"));
    console.log(`Struct defaults: ${structs} cited struct/class pairs; ${checked} field initializer literals compared; ${problems.size} recorded mismatches; ${unchecked.length} unchecked items.`);
    console.log("Scope: inline field initializers and zero-argument inline constructor lists. Out-of-line/parameterized constructors, body assignments and unresolved expressions require review; they are NOT equality evidence.");
    if (process.argv.includes("--unchecked")) console.log(unchecked.join("\n"));
    process.exitCode = passed ? 0 : 1;
}
