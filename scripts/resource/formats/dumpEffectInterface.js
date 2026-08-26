/**
 * Dumps one resolved permutation of a Carbon effect container as text: the
 * options that were selected, the resources in register order, the constant
 * layout with Carbon's own default values decoded, and optionally the emitted
 * GLSL for a stage.
 *
 * This exists because nothing else in the repository prints a shader's
 * interface. Reaching it otherwise means writing the same throwaway script
 * again -- load the container, resolve a permutation, build a binding manifest,
 * find the matching translated body -- and every re-derivation is a chance to
 * repeat one of the three mistakes below.
 *
 * 1. **The permutation is not the default.** Resources and constants are gated
 *    by option axes as well as by tier. On the quad family the production
 *    permutation is `.sm_depth` with `SPACE_OBJECT_PPT_ENABLED=SOPPT_ENABLED`;
 *    the default body of `.sm_hi` omits dirt, dust, patterns and local lights
 *    while remaining a complete, valid, warning-free shader. Nothing warns that
 *    a smaller answer was measured, so this tool always prints every axis with
 *    the value it resolved to and whether that came from the default.
 *
 * 2. **`constantValues` is a byte array, not floats.** Read as numbers it
 *    prints `0, 0, 128, 63` for every default, which reads as corrupt data and
 *    invites the conclusion that the container carries no defaults at all. It
 *    is little-endian `1.0`. This tool reinterprets through `Float32Array`.
 *    Those defaults matter: a consumer composing a material from SOF alone is
 *    missing every value SOF did not resolve, and the container is where the
 *    rest come from.
 *
 * 3. **Register indices shift between permutations.** A texture's register is
 *    a property of the body, not of the shader, so a consumer that binds by
 *    number rather than by name silently swaps maps when an axis changes. Both
 *    are printed together to make that visible.
 *
 * The emitted GLSL is the WebGL backend's output and carries that backend's
 * documented lowering -- dropped light profiles, merged detail-map arrays,
 * emulated addressing. Any transform that applied to the selected body is
 * reported alongside it, because a difference inside one of those blocks is
 * policy rather than a defect.
 *
 * Usage:
 *   node scripts/resource/formats/dumpEffectInterface.js <file-or-dir> [...]
 *        [--option NAME=VALUE]...  select a permutation axis, repeatable
 *        [--technique NAME]        default Main
 *        [--pass N]                default 0
 *        [--stage NAME]            default pixel
 *        [--glsl <dir>]            also write the translated stage source
 *        [--axes]                  list every option axis and its values, then stop
 *        [--json]                  emit one JSON document instead of text
 *
 * Input files are Carbon effect containers (`.sm_depth` / `.sm_hi` / `.sm_lo`).
 * Directories are scanned non-recursively for those extensions.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { Tr2EffectRes } from "../../../src/resource/shader/index.js";
import { CjsWebglFormat } from "../../../src/resource/formats/webgl/index.js";

const CONTAINER_EXTENSIONS = [".sm_depth", ".sm_hi", ".sm_lo"];

/** Carbon stage type for the pixel stage, and the names this tool accepts. */
const STAGE_TYPES = new Map([
    [ "vertex", 0 ],
    [ "pixel", 1 ],
    [ "geometry", 2 ],
    [ "hull", 3 ],
    [ "domain", 4 ],
    [ "compute", 5 ]
]);

/**
 * Parse argv into inputs and options.
 *
 * @param {string[]} argv Raw arguments after the script name.
 * @returns {{inputs: string[], options: Array<{name: string, value: string}>, technique: string, pass: number, stage: string, glslDir: string|null, axes: boolean, json: boolean}} Parsed arguments.
 */
function parseArguments(argv)
{
    const parsed = {
        inputs: [],
        options: [],
        technique: "Main",
        pass: 0,
        stage: "pixel",
        glslDir: null,
        axes: false,
        json: false
    };

    for (let index = 0; index < argv.length; index++)
    {
        const argument = argv[index];
        switch (argument)
        {
            case "--option":
            {
                const pair = argv[++index] || "";
                const split = pair.indexOf("=");
                if (split < 0) throw new Error(`--option expects NAME=VALUE, got "${pair}"`);
                parsed.options.push({ name: pair.slice(0, split), value: pair.slice(split + 1) });
                break;
            }
            case "--technique": parsed.technique = argv[++index]; break;
            case "--pass": parsed.pass = Number(argv[++index]); break;
            case "--stage": parsed.stage = argv[++index]; break;
            case "--glsl": parsed.glslDir = argv[++index]; break;
            case "--axes": parsed.axes = true; break;
            case "--json": parsed.json = true; break;
            default:
                if (argument.startsWith("--")) throw new Error(`Unknown flag "${argument}"`);
                parsed.inputs.push(argument);
        }
    }

    if (!parsed.inputs.length) throw new Error("No input file or directory given.");
    return parsed;
}

/**
 * Expand inputs into container file paths.
 *
 * @param {string[]} inputs File or directory paths.
 * @returns {string[]} Container file paths.
 */
function collectContainers(inputs)
{
    const files = [];
    for (const input of inputs)
    {
        if (statSync(input).isDirectory())
        {
            for (const entry of readdirSync(input).sort())
            {
                if (CONTAINER_EXTENSIONS.some((extension) => entry.endsWith(extension)))
                {
                    files.push(join(input, entry));
                }
            }
        }
        else
        {
            files.push(input);
        }
    }
    return files;
}

/**
 * Decode a Carbon constant-value blob into floats.
 *
 * The blob is raw bytes. Reading it as numbers yields the byte pattern rather
 * than the value, which is the single most common misreading of this field.
 *
 * @param {ArrayLike<number>} values Raw constant bytes.
 * @returns {Float32Array} The same storage viewed as floats.
 */
function decodeConstantValues(values)
{
    const bytes = Uint8Array.from(values || []);
    return new Float32Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.length / 4));
}

/**
 * Build the interface record for one container and permutation.
 *
 * @param {string} file Container path.
 * @param {object} parsed Parsed arguments.
 * @returns {object} Interface record.
 */
function describeContainer(file, parsed)
{
    const source = basename(file);
    const bytes = new Uint8Array(readFileSync(file));

    const effect = new Tr2EffectRes();
    effect.DoLoad(bytes);

    const axes = effect.GetPermutationDescription().map((permutation) => ({
        name: permutation.name,
        options: permutation.options.slice(),
        defaultOption: permutation.defaultOption
    }));

    if (parsed.axes)
    {
        return { source, axes };
    }

    const selection = resolveSelection(axes, parsed.options);
    const shader = effect.GetShader(parsed.options);

    // The live reflection graph, not GetValues(): the stage input owns the
    // buffer extent through GetConstantBufferSize(), and that is a question to
    // ask rather than arithmetic to repeat.
    const techniqueIndex = shader.GetTechniqueIndex(parsed.technique);
    const pass = techniqueIndex >= 0
        ? shader.GetEffect()?.techniques?.[techniqueIndex]?.passes?.[parsed.pass]
        : null;
    const stageType = STAGE_TYPES.get(parsed.stage);
    const stage = pass?.stageInputs?.[stageType];

    if (!stage || !stage.exists)
    {
        return { source, axes, selection, error: `No ${parsed.technique}.pass${parsed.pass}.${parsed.stage} stage.` };
    }

    // Register index is the position in the stage's resource list; it is a
    // property of this body, not of the shader.
    const resources = toArray(stage.resources).map((resource, index) => ({
        register: index,
        name: resource.name,
        type: resource.type,
        isSRGB: resource.isSRGB
    }));

    const floats = decodeConstantValues(stage.constantValues);
    const buffers = [ {
        symbol: "cb0",
        // The extent the buffer must be allocated at, and separately the length
        // of the authored default block. These are different quantities that
        // happen to coincide on much of the quad family, so using one for the
        // other is right by luck rather than by rule.
        sizeInBytes: stage.GetConstantBufferSize(),
        defaultBlockBytes: stage.constantValueSize || 0,
        constants: toArray(stage.constants).map((constant) => ({
            name: constant.name,
            offset: constant.offset,
            vec4: constant.offset / 16,
            defaultValue: Array.from(floats.slice(constant.offset / 4, constant.offset / 4 + 4))
        }))
    } ];

    const record = {
        source,
        permutationIndex: selection.index,
        selectedOptions: selection.options,
        unmatchedOptions: selection.unmatched,
        axes,
        resources,
        buffers
    };

    if (parsed.glslDir)
    {
        record.glsl = emitStageSource(bytes, source, selection.index, parsed);
    }

    return record;
}

/**
 * Normalize a value that the schema may export as an array or as an indexed map.
 *
 * @param {*} value Collection value.
 * @returns {Array} The collection as an array.
 */
function toArray(value)
{
    if (!value) return [];
    if (Array.isArray(value)) return value;
    // The reflection graph is not uniform: a stage input's `resources` is a Map
    // keyed by name while its `constants` is a plain array. `Object.values` on a
    // Map returns an empty list rather than failing, so a helper that does not
    // test for it reports a stage with no resources at all.
    if (value instanceof Map) return [ ...value.values() ];
    return Object.values(value);
}

/**
 * Resolve the requested options against the effect's axes.
 *
 * The permutation index is the mixed-radix combination of each axis's selected
 * option, in axis order, which is how a body is addressed.
 *
 * @param {Array<{name: string, options: string[], defaultOption: number}>} axes Option axes.
 * @param {Array<{name: string, value: string}>} requested Requested selections.
 * @returns {{index: number, options: Array<object>}} Resolved selection.
 */
function resolveSelection(axes, requested)
{
    let index = 0;
    let multiplier = 1;
    const options = [];

    // An option naming an axis this effect does not have, or a value that axis
    // does not offer, would otherwise be dropped in silence and the caller
    // would read the default body believing it had selected something else.
    // Members of one family do not share axes: the quad family's pattern axis
    // exists on five of its ten members.
    const unmatched = requested
        .filter((entry) =>
        {
            const axis = axes.find((candidate) => candidate.name === entry.name);
            return !axis || !axis.options.includes(entry.value);
        })
        .map((entry) => `${entry.name}=${entry.value}`);

    for (const axis of axes)
    {
        const wanted = requested.find((entry) => entry.name === axis.name);
        const found = wanted ? axis.options.indexOf(wanted.value) : -1;
        const optionIndex = found >= 0 ? found : axis.defaultOption;

        options.push({
            name: axis.name,
            value: axis.options[optionIndex] ?? null,
            source: found >= 0 ? "selected" : "default"
        });

        index += optionIndex * multiplier;
        multiplier *= axis.options.length || 1;
    }

    return { index, options, unmatched };
}

/**
 * Translate the selected body and write the stage source.
 *
 * @param {Uint8Array} bytes Container payload.
 * @param {string} source Container name.
 * @param {object} analysis Resolved analysis.
 * @param {object} parsed Parsed arguments.
 * @returns {object} Translation report.
 */
function emitStageSource(bytes, source, permutationIndex, parsed)
{
    const built = CjsWebglFormat.buildEffect(bytes, { source, allowFailures: true });
    const variant = built.glsl.variants.find((entry) => entry.permutationIndex === permutationIndex);
    if (!variant) return { error: `No translated variant for permutation ${permutationIndex}.` };

    const key = `shader_${variant.bodyKey}.${parsed.technique}.pass${parsed.pass}.${parsed.stage}`;
    const shader = built.glsl.shaders.find((entry) => entry.key === key);
    if (!shader) return { error: `No translated stage "${key}".` };

    const name = `${source}.${parsed.technique}.pass${parsed.pass}.${parsed.stage}.glsl`;
    const path = join(parsed.glslDir, name);
    writeFileSync(path, shader.source || "");

    return {
        path,
        bodyKey: variant.bodyKey,
        lines: (shader.source || "").split("\n").length,
        emitWarnings: shader.emitWarnings || [],
        transforms: {
            detailMapArray: shader.detailMapArray || null,
            localLights: shader.localLights || null,
            emulatedAddressing: shader.emulatedAddressing || null
        }
    };
}

/**
 * Render one record as text.
 *
 * @param {object} record Interface record.
 * @param {object} parsed Parsed arguments.
 * @returns {void}
 */
function printRecord(record, parsed)
{
    console.log(`\n=== ${record.source} ===`);

    if (record.error)
    {
        console.log(`  ${record.error}`);
        return;
    }

    if (parsed.axes)
    {
        for (const axis of record.axes)
        {
            const values = axis.options
                .map((option, index) => (index === axis.defaultOption ? `${option} (default)` : option))
                .join(" | ");
            console.log(`  ${axis.name}: ${values}`);
        }
        return;
    }

    console.log(`  permutation index ${record.permutationIndex}`);
    if (record.unmatchedOptions && record.unmatchedOptions.length)
    {
        console.log(`  !! this effect has no such option, so it was IGNORED: ${record.unmatchedOptions.join(", ")}`);
    }
    for (const option of record.selectedOptions)
    {
        const marker = option.source === "default" ? "" : "  <- selected";
        console.log(`    ${option.name} = ${option.value}${marker}`);
    }

    console.log(`\n  resources (${record.resources.length}) -- bind by NAME, registers move between permutations:`);
    for (const resource of record.resources)
    {
        console.log(`    t${String(resource.register).padEnd(4)} ${resource.name ?? "(unnamed)"}`);
    }

    for (const buffer of record.buffers)
    {
        if (!buffer.constants.length) continue;
        const blob = buffer.defaultBlockBytes === buffer.sizeInBytes
            ? "default block covers all of it"
            : `default block is ${buffer.defaultBlockBytes} bytes`;
        console.log(`\n  ${buffer.symbol} -- extent ${buffer.sizeInBytes} bytes / ${buffer.sizeInBytes / 16} vec4, ${blob}:`);
        for (const constant of buffer.constants)
        {
            const value = constant.defaultValue.map((entry) => entry.toFixed(4)).join(", ");
            console.log(`    vec4[${String(constant.vec4).padStart(2)}] off ${String(constant.offset).padStart(4)}  ${constant.name.padEnd(24)} = ${value}`);
        }
    }

    if (record.glsl)
    {
        if (record.glsl.error)
        {
            console.log(`\n  glsl: ${record.glsl.error}`);
            return;
        }
        console.log(`\n  glsl: ${record.glsl.path} (${record.glsl.lines} lines, body ${record.glsl.bodyKey})`);
        if (record.glsl.emitWarnings.length)
        {
            console.log(`    emit warnings: ${JSON.stringify(record.glsl.emitWarnings)}`);
        }
        for (const [name, value] of Object.entries(record.glsl.transforms))
        {
            if (value) console.log(`    backend transform applied -- ${name}: ${JSON.stringify(value)}`);
        }
    }
}

const parsed = parseArguments(process.argv.slice(2));
const records = collectContainers(parsed.inputs).map((file) => describeContainer(file, parsed));

if (parsed.json)
{
    console.log(JSON.stringify(records, null, 2));
}
else
{
    for (const record of records) printRecord(record, parsed);
}
