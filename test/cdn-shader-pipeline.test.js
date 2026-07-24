import test from "node:test";
import assert from "node:assert/strict";

import { CjsFileIndexLibrary } from "../src/fileindex/index.js";

/**
 * Optional production-path integration sweep: loads the live CCP file index
 * with the browser mini file-index library (no tools-core involvement),
 * fetches one original dx11 compiled effect from the CCP CDN, and drives it
 * through every conversion stage exactly as a browser client would:
 *
 *   resfileindex -> .sm_hi bytes -> format-hlsl -> format-dxbc
 *                -> format-webgpu (CEWGPU) and format-webgl (CEWG)
 *
 * Not part of the baseline checks (baseline tests stay offline and
 * deterministic; game assets are never committed). Each run performs one
 * build-metadata request, one appfileindex, its declared resfileindexes, and
 * one shader download. Enable with:
 *   EVE_CDN_SHADER_PIPELINE=1 npm test
 *
 * Optional overrides:
 *   EVE_BUILD=<number|latest>  exact build instead of latest discovery
 *   EVE_SHADER_PATH=res:/...   a different dx11 .sm_* effect
 */

const ENABLED = process.env.EVE_CDN_SHADER_PIPELINE === "1";
const SHADER_PATH = process.env.EVE_SHADER_PATH
    || "res:/graphics/effect.dx11/managed/space/spaceobject/v5/quad/quadv5.sm_hi";
const BUILD = process.env.EVE_BUILD || "latest";

const EVE_PROVIDER = {
    game: "Eve",
    id: "ccp",
    defaultBuildRef: "latest",
    remote: {
        metadataBaseURL: "https://binaries.eveonline.com",
        indexBaseURL: "https://binaries.eveonline.com",
        appBaseURL: "https://binaries.eveonline.com",
        resBaseURL: "https://resources.eveonline.com"
    },
    clients: {
        tranquility: { metadataToken: "TQ", aliases: [ "tq" ] }
    }
};

function collectStageBytecode(effectDescription)
{
    const stages = new Map();
    for (const technique of effectDescription?.techniques ?? [])
    {
        for (let passIndex = 0; passIndex < technique.passes.length; passIndex += 1)
        {
            for (const stageInput of technique.passes[passIndex].stageInputs.filter(Boolean))
            {
                const stageName = stageInput.cjsShaderBytecode?.stageName;
                const bytes = stageInput.cjsShaderBytecode?.bytes;
                if (stageInput.m_exists && stageName && bytes?.length)
                {
                    stages.set(`${technique.name}.pass${passIndex}.${stageName}`, bytes);
                }
            }
        }
    }
    return stages;
}

test(
    "CDN dx11 effect reaches CEWGPU and CEWG through every format stage",
    { skip: ENABLED ? false : "set EVE_CDN_SHADER_PIPELINE=1 to run the networked pipeline sweep" },
    async (t) =>
    {
        const [ { readEffectAnalysis }, { CjsFormatDxbc }, { CjsFormatWebgpu }, { CjsFormatWebgl } ] = await Promise.all([
            import("@carbonenginejs/format-hlsl"),
            import("@carbonenginejs/format-dxbc"),
            import("@carbonenginejs/format-webgpu"),
            import("@carbonenginejs/format-webgl")
        ]);

        let resolved = null;
        let effectBytes = null;
        let stageBytecode = null;

        await t.test("mini file-index library discovers the build and resolves the shader", async () =>
        {
            const library = await CjsFileIndexLibrary.load(EVE_PROVIDER, { build: BUILD });

            assert.match(library.build, /^\d+$/u, "resolved build must be numeric");
            assert.ok(library.indexNames.length > 0, "no resfileindexes were declared");

            // Live builds declare the same logical path in several official
            // resfileindexes (e.g. windows + prefetch); the last declared
            // index owns the record, so the plain production call resolves.
            resolved = library.Resolve(SHADER_PATH);
            assert.ok(resolved, `${SHADER_PATH} is not present in build ${library.build}`);
            assert.ok(
                resolved.sourceURL.startsWith(`${EVE_PROVIDER.remote.resBaseURL}/`),
                `resolved URL must target the provider resource host: ${resolved.sourceURL}`
            );
        });

        await t.test("the CDN serves the original dx11 effect bytes", async () =>
        {
            const response = await fetch(resolved.sourceURL);
            assert.equal(response.ok, true, `CDN fetch failed: HTTP ${response.status}`);
            effectBytes = new Uint8Array(await response.arrayBuffer());
            assert.ok(effectBytes.length > 0, "CDN returned an empty payload");
        });

        await t.test("format-hlsl reads the effect container", () =>
        {
            const analysis = readEffectAnalysis(effectBytes, { source: SHADER_PATH });
            assert.ok(analysis.effectDescription, "effect description was not produced");
            assert.ok(analysis.effectDescription.techniques.length > 0, "effect declares no techniques");

            stageBytecode = collectStageBytecode(analysis.effectDescription);
            assert.ok(stageBytecode.size > 0, "no stage bytecode was found");
            const stageNames = new Set(Array.from(stageBytecode.keys(), (key) => key.split(".").at(-1)));
            assert.ok(stageNames.has("vertex"), "no vertex stage bytecode");
            assert.ok(stageNames.has("pixel"), "no pixel stage bytecode");
        });

        await t.test("format-dxbc decodes every stage bytecode", () =>
        {
            for (const [ key, bytes ] of stageBytecode)
            {
                const decoded = CjsFormatDxbc.read(bytes, { source: `${SHADER_PATH}#${key}` });
                assert.ok(decoded, `${key} did not decode`);
            }
        });

        await t.test("format-webgpu builds a readable CEWGPU package with WGSL", () =>
        {
            const built = CjsFormatWebgpu.buildEffect(effectBytes, { source: SHADER_PATH });
            assert.ok(built.bytes?.length > 0, "no CEWGPU package bytes were produced");
            assert.ok(built.info.shaderCount > 0, "no WGSL shaders were emitted");

            const reread = CjsFormatWebgpu.read(built.bytes, { source: `${SHADER_PATH}#cewgpu` });
            assert.ok(reread, "built CEWGPU package did not read back");
            const wgslText = JSON.stringify(CjsFormatWebgpu.toJSON(built.wgsl));
            assert.match(wgslText, /@vertex|@fragment/u, "emitted WGSL has no entry points");
        });

        await t.test("format-webgl builds a readable CEWG package with GLSL", () =>
        {
            const built = CjsFormatWebgl.buildEffect(effectBytes, { source: SHADER_PATH });
            assert.ok(built.bytes?.length > 0, "no CEWG package bytes were produced");

            const reread = CjsFormatWebgl.read(built.bytes, { source: `${SHADER_PATH}#cewg` });
            assert.ok(reread, "built CEWG package did not read back");
            const glslText = JSON.stringify(CjsFormatWebgl.toJSON(built.glsl));
            assert.match(glslText, /gl_Position|main\s*\(/u, "emitted GLSL has no entry points");
        });
    }
);
