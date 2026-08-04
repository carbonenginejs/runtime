/**
 * Reports the per-stage resource budget of Carbon effect containers for both
 * backends, so the same question does not get re-derived by hand each time.
 *
 * The question this answers is "does this shader fit", and it has been answered
 * wrongly more than once for two reasons this tool removes:
 *
 * 1. **Tier.** Local lights exist only in `.sm_depth`. Measuring `.sm_hi` and
 *    reporting it as the family's number understates the worst case by three
 *    resources. This tool always reports every tier it is given and marks which
 *    one is the constraint, so a partial measurement is visible as partial.
 * 2. **What counts.** WebGL2 has no structured buffers, so Carbon's structured
 *    resources are emitted as `usampler2D` and each costs a fragment texture
 *    image unit like any other sampler. They carry names like `sb13`, are absent
 *    from the effect's texture list, and do not match `s<digits>`, so hand-rolled
 *    counts routinely miss them. This tool counts emitted bindings, not textures.
 *
 * The two backends genuinely differ and both numbers are reported: on WebGPU the
 * structured buffers bind natively and do not consume a sampled-texture slot, so
 * a shader can be over budget on WebGL while comfortable on WebGPU.
 *
 * Usage:
 *   node scripts/formats/reportTextureBudget.js <file-or-dir> [...] [--json]
 *                                               [--backend webgl|webgpu|both]
 *
 * Input files are Carbon effect containers (`.sm_depth` / `.sm_hi` / `.sm_lo`).
 * Directories are scanned non-recursively for those extensions.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { CjsWebglFormat } from "../../src/formats/webgl/index.js";
import { CjsWebgpuFormat } from "../../src/formats/webgpu/index.js";

/**
 * WebGL2's guaranteed floor for fragment texture image units. Every emitted
 * sampler in a pixel stage consumes one, structured buffers included.
 */
const WEBGL2_MAX_TEXTURE_IMAGE_UNITS = 16;

/**
 * WebGPU's default `maxSampledTexturesPerShaderStage`. Storage buffers are
 * counted separately against `maxStorageBuffersPerShaderStage` and so are
 * reported separately here.
 */
const WEBGPU_MAX_SAMPLED_TEXTURES_PER_STAGE = 16;

/**
 * Carbon resource families worth reporting, because each is a candidate for a
 * different consolidation and the choice between them is a budget decision.
 *
 * Name-driven on purpose: registers are not fixed across permutations, so a
 * register-based recogniser silently misclassifies. This matches how
 * `formats/hlsl/core/localLightFamily.js` recognises the same family.
 */
const FAMILIES = Object.freeze({
    /** Four single-channel maps, historically one packed RGBA texture. */
    pmdg: [ "PaintMaskMap", "MaterialMap", "DirtMap", "GlowMap" ],
    /** Full-colour maps, consolidated as array layers rather than channels. */
    detail: [ "Detail1Map", "Detail2Map", "Detail3Map" ],
    /** Two structured buffers plus an optional profile lookup. */
    light: [ "LightIndexBuffer", "LightBuffer", "LightProfileArray" ]
});

/** Carbon resources that are structured buffers rather than sampled textures. */
const STRUCTURED_RESOURCES = new Set([ "LightIndexBuffer", "LightBuffer", "BoneTransforms" ]);

/**
 * Counts a stage's bindings by kind, keeping the resource names.
 *
 * @param {Array<object>} bindings Emitted bindings for one stage.
 * @returns {{ resources: string[], samplers: number, constantBuffers: number }}
 */
function summariseBindings(bindings)
{
    const resources = [];
    let samplers = 0;
    let constantBuffers = 0;

    for (const binding of bindings ?? [])
    {
        if (binding?.kind === "resource") resources.push(binding.name ?? binding.metadataName ?? "(unnamed)");
        else if (binding?.kind === "sampler") samplers++;
        else if (binding?.kind === "constantBuffer") constantBuffers++;
    }

    return { resources, samplers, constantBuffers };
}

/**
 * Finds the worst-case pixel stage across every body in a built container.
 *
 * A container carries every permutation body, and they do not all bind the same
 * resources. Reporting one body's count describes that body, not the shader, so
 * the maximum is the only number that answers "does this shader fit".
 *
 * @param {Array<object>} stages Stages from a read container.
 * @param {(stage: object) => Array<object>} getBindings Backend binding accessor.
 * @returns {{ count: number, resources: string[], samplers: number, bodyKey: string|null }}
 */
function worstPixelStage(stages, getBindings)
{
    let worst = { count: 0, resources: [], samplers: 0, bodyKey: null };

    for (const stage of stages ?? [])
    {
        if (stage?.stageName !== "pixel") continue;
        const summary = summariseBindings(getBindings(stage));
        if (summary.resources.length <= worst.count) continue;
        worst = {
            count: summary.resources.length,
            resources: summary.resources,
            samplers: summary.samplers,
            bodyKey: stage.bodyKey ?? null
        };
    }

    return worst;
}

/**
 * Measures one effect container on both backends.
 *
 * @param {Uint8Array} bytes Carbon effect container.
 * @param {string} backend "webgl", "webgpu" or "both".
 * @returns {object} Per-backend worst-case counts and family membership.
 */
function measure(bytes, backend)
{
    const out = {};

    if (backend === "webgl" || backend === "both")
    {
        const built = CjsWebglFormat.buildEffect(bytes, {});
        const read = CjsWebglFormat.read(built.bytes);
        const sources = new Map(read.shaders.map((shader) => [ shader.key, shader.source ]));

        // Count emitted sampler declarations, NOT manifest bindings. A
        // consolidation already applied by the packager - the detail-map array
        // is applied unconditionally when the family is recognised - leaves all
        // of the original resource names in the manifest while emitting a single
        // sampler for them. Counting bindings therefore overstates any shader
        // that carries such a family, and matches the emitted count only on
        // shaders that carry none.
        let units = 0;
        let declarations = [];
        let resources = [];

        for (const stage of read.stages ?? [])
        {
            if (stage?.stageName !== "pixel") continue;
            const source = sources.get(stage.shaderKey);
            if (!source) continue;
            const emitted = source.match(/uniform\s+\w+\s+u?sampler\w+\s+\w+\s*;/g) ?? [];
            if (emitted.length <= units) continue;
            units = emitted.length;
            declarations = emitted.map((entry) => entry.match(/(\w+)\s*;/)[1]);
            resources = summariseBindings(stage.manifest?.bindings).resources;
        }

        out.webgl = {
            // Every emitted sampler is a fragment texture image unit on this
            // backend, structured buffers included - that is the point of
            // reporting it.
            units,
            limit: WEBGL2_MAX_TEXTURE_IMAGE_UNITS,
            over: units > WEBGL2_MAX_TEXTURE_IMAGE_UNITS,
            declarations,
            resources
        };
    }

    if (backend === "webgpu" || backend === "both")
    {
        const built = CjsWebgpuFormat.buildEffect(bytes, {});
        const read = CjsWebgpuFormat.read(built.bytes);
        const worst = worstPixelStage(read.stages, (stage) => stage.bindings);
        const structured = worst.resources.filter((name) => STRUCTURED_RESOURCES.has(name));
        const sampled = worst.resources.length - structured.length;
        out.webgpu = {
            sampledTextures: sampled,
            storageBuffers: structured.length,
            limit: WEBGPU_MAX_SAMPLED_TEXTURES_PER_STAGE,
            over: sampled > WEBGPU_MAX_SAMPLED_TEXTURES_PER_STAGE,
            resources: worst.resources
        };
    }

    const names = out.webgl?.resources ?? out.webgpu?.resources ?? [];
    out.families = {};
    for (const [ family, members ] of Object.entries(FAMILIES))
    {
        out.families[family] = members.filter((member) => names.includes(member));
    }

    return out;
}

/**
 * Consolidating N resources into one frees N-1 units; one or zero frees nothing.
 *
 * @param {number} present How many of the family the shader actually binds.
 * @returns {number} Units freed.
 */
function saving(present)
{
    return present > 1 ? present - 1 : 0;
}

/**
 * Expands inputs into a flat list of container files.
 *
 * @param {string[]} inputs Files or directories.
 * @returns {string[]} Container paths.
 */
function collectFiles(inputs)
{
    const files = [];
    for (const input of inputs)
    {
        if (statSync(input).isDirectory())
        {
            for (const entry of readdirSync(input).sort())
            {
                if (/\.sm_(depth|hi|lo)$/.test(entry)) files.push(join(input, entry));
            }
        }
        else files.push(input);
    }
    return files;
}

function main(argv)
{
    const args = argv.slice(2);
    const asJson = args.includes("--json");
    const backendIndex = args.indexOf("--backend");
    const backend = backendIndex >= 0 ? args[backendIndex + 1] : "both";
    // Guard the value index: with no `--backend`, `backendIndex + 1` is 0 and
    // would silently drop the first input file.
    const backendValueIndex = backendIndex >= 0 ? backendIndex + 1 : -1;
    const inputs = args.filter((arg, index) =>
        !arg.startsWith("--") && index !== backendValueIndex);

    if (!inputs.length)
    {
        console.error("usage: reportTextureBudget.js <file-or-dir> [...] [--json] [--backend webgl|webgpu|both]");
        process.exitCode = 1;
        return;
    }

    const rows = [];
    for (const file of collectFiles(inputs))
    {
        const name = file.split(/[\\/]/).pop();
        try
        {
            const result = measure(new Uint8Array(readFileSync(file)), backend);
            rows.push({ name, ...result });
        }
        catch (error)
        {
            rows.push({ name, error: error.message });
        }
    }

    if (asJson)
    {
        console.log(JSON.stringify(rows, null, 1));
        return;
    }

    const header = [
        "shader".padEnd(38),
        "wgl".padStart(4),
        "gpu tex".padStart(8),
        "gpu buf".padStart(8),
        "PMDG".padStart(5),
        "detail".padStart(7),
        "light".padStart(6),
        "  -PMDG",
        "  -both"
    ].join(" ");
    console.log(header);
    console.log("-".repeat(header.length));

    for (const row of rows)
    {
        if (row.error)
        {
            console.log(`${row.name.padEnd(38)} ERROR ${row.error}`);
            continue;
        }

        const units = row.webgl?.units ?? 0;
        const pmdg = row.families.pmdg.length;
        const detail = row.families.detail.length;
        const light = row.families.light.length;
        const afterPmdg = units - saving(pmdg);
        const afterBoth = afterPmdg - saving(detail);
        const flag = row.webgl?.over ? " OVER" : "";

        console.log([
            row.name.padEnd(38),
            String(units).padStart(4),
            String(row.webgpu?.sampledTextures ?? "-").padStart(8),
            String(row.webgpu?.storageBuffers ?? "-").padStart(8),
            String(pmdg).padStart(5),
            String(detail).padStart(7),
            String(light).padStart(6),
            String(afterPmdg).padStart(7),
            String(afterBoth).padStart(7) + flag
        ].join(" "));
    }
}

main(process.argv);
