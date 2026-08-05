import { CjsFormatReadError } from "../../../format/CjsFormatError.js";
import { HlslEffectConstant } from "./tr2/shader/HlslEffectConstant.js";
import { HlslEffectLibrary } from "./tr2/shader/HlslEffectLibrary.js";
import { HlslEffectParameterAnnotation } from "./tr2/shader/HlslEffectParameterAnnotation.js";
import { HlslEffectResource } from "./tr2/shader/HlslEffectResource.js";
import { HlslEffectStageInput } from "./tr2/shader/HlslEffectStageInput.js";
import { HlslEffectStateManager } from "./HlslEffectStateManager.js";
import { HlslEffectTechnique } from "./tr2/shader/HlslEffectTechnique.js";
import { HlslPass } from "./tr2/shader/HlslPass.js";
import { HlslShaderBytecode } from "./HlslShaderBytecode.js";
import { HlslRenderContextEnum, HlslUsageCodeNames } from "./tr2/HlslRenderContextEnum.js";
import { HlslRenderStateSetup } from "./HlslRenderStateSetup.js";
import { HlslResourceSetDescription } from "./HlslResourceSetDescription.js";
import { HlslSamplerDescription } from "./tr2/shader/HlslSamplerDescription.js";
import { HlslSamplerSetup } from "./tr2/shader/HlslSamplerSetup.js";

/**
 * Rebuilds the runtime effect-description shape from a Carbon record tree.
 *
 * This is a **shape adapter and nothing else**. It adds no semantics: its whole
 * job is to turn the parsed container records into the object graph
 * `HlslEffectBindingManifest.fromEffectDescription` already consumes, so that
 * `buildEffectAnalysis` runs unchanged on a container-derived description. The
 * derived view stays the same function it has always been rather than a
 * reimplementation free to drift from it.
 *
 * ## Why this is not a field copy
 *
 * The wire shape and the runtime shape are genuinely different shapes, and every
 * difference is a place a copying adapter produces something that reads as
 * plausible and is wrong:
 *
 * | wire | runtime | conversion |
 * |---|---|---|
 * | `name: {offset, value}` | `name: "NormalMap"` | unwrap the arena string reference |
 * | `count` | `arrayElements` | **renamed** — see `mapTextureRecord` |
 * | `isSRGB: 0` | `isSRGB: false` | integer to boolean |
 * | flat sampler fields | `{name, sampler: {...}}` | **re-nested** — see `mapSamplerRecord` |
 * | UAV has no `isSRGB` | `isSRGB: false` | **synthesised** — see `mapUavRecord` |
 * | `registerIndex` field | map key | consumed as the key, not a payload field |
 *
 * Three of those are silent when wrong. `arrayElements` is read at
 * `packageHelpers.js:869` and a rename yields `undefined` there. `isSRGB` as `0`
 * is *accidentally correct* — `0` is falsy, `1` is truthy — so it survives every
 * behavioural test and only a structural diff sees it. A flat sampler puts all
 * fourteen descriptor fields at the wrong depth at once.
 *
 * ## The tables are closed
 *
 * Every record is built through `mapClosed`, which walks the **source** keys and
 * throws on any key with no rule. Nothing is spread and nothing is copied
 * wholesale. That converts "did we enumerate every field?" — a question whose
 * wrong answer shows up months later as `undefined` in the engine — into an error
 * the first time the adapter meets a record it does not fully understand.
 *
 * This is deliberately redundant with the two-sided diff in
 * `test/formats/webgpu/carbon-analysis-adapter.test.mjs`, and neither replaces the
 * other. The table catches *the wire has something we do not handle*; the diff
 * catches *our output differs from the reference*. A complete table can still map
 * a field wrongly, and a passing diff on one fixture says nothing about a key that
 * fixture never exercises.
 *
 * ## What is derived rather than stored
 *
 * `m_shader`, `pass.shaderProgram` and `pass.renderStates` are registration
 * handles from `HlslEffectStateManager`, which are monotonic counters and
 * therefore reproduce exactly when registration happens in the same order. That
 * is why stages are walked in **wire array order** rather than by ascending
 * stage type: the source reader registers them in the order the file lists them.
 * `resourceSetDesc` and its `heapViews` are likewise rebuilt by running the same
 * derivation the source reader runs, not carried on the wire.
 */

/** Carbon annotation type for a string-valued annotation. */
const ANNOTATION_TYPE_STRING = HlslEffectParameterAnnotation.Type.STRING;

const rawView = new DataView(new ArrayBuffer(4));

/**
 * Unwraps an arena string reference to its text.
 *
 * @param {{offset:number, value:string}|null} reference Wire string reference.
 * @returns {string} The referenced text.
 */
function text(reference)
{
    return typeof reference?.value === "string" ? reference.value : "";
}

/**
 * Converts a wire `u8` flag to the boolean the runtime shape carries.
 *
 * @param {number} value Wire flag.
 * @returns {boolean} Boolean form.
 */
function flag(value)
{
    return Boolean(value);
}

/**
 * Reads four wire bytes as the little-endian `u32` the runtime annotation holds.
 *
 * @param {Uint8Array|null} bytes Four raw bytes.
 * @returns {number} Unsigned 32-bit value.
 */
function rawUint32(bytes)
{
    if (!bytes || bytes.length < 4) return 0;
    rawView.setUint8(0, bytes[0]);
    rawView.setUint8(1, bytes[1]);
    rawView.setUint8(2, bytes[2]);
    rawView.setUint8(3, bytes[3]);
    return rawView.getUint32(0, true);
}

/**
 * Reinterprets a `u32` bit pattern as the float it encodes.
 *
 * @param {number} bits Raw 32-bit pattern.
 * @returns {number} The float those bits encode.
 */
function floatFromBits(bits)
{
    rawView.setUint32(0, bits >>> 0, true);
    return rawView.getFloat32(0, true);
}

/**
 * Builds an object from a record by walking the record's own keys against a
 * closed rule table, throwing on any key the table does not name.
 *
 * Walking the **source** keys is the point. A table walked from its own entries
 * would silently ignore a field the wire gained, which is exactly the failure
 * this exists to make loud.
 *
 * @param {object} record Source wire record.
 * @param {object} rules Rule table keyed by source field name.
 * @param {object} target Object to populate.
 * @param {string} what Record kind, for the error message.
 * @returns {object} The populated target.
 */
function mapClosed(record, rules, target, what)
{
    for (const key of Object.keys(record))
    {
        const rule = rules[key];
        if (!rule)
        {
            throw new CjsFormatReadError(
                `Carbon ${what} record carries field "${key}" with no mapping rule`,
                { record: what, field: key }
            );
        }
        rule(target, record[key], record);
    }
    return target;
}

/** Consumes a field that is deliberately not part of the runtime payload. */
const consumed = () => {};

/** Texture record rules. `count` is Carbon's name for `arrayElements`. */
const TEXTURE_RULES = Object.freeze({
    // Carried as the map key by the caller, not as a payload field.
    registerIndex: consumed,
    name: (target, value) => { target.name = text(value); },
    type: (target, value) => { target.type = value; },
    // RENAME: the wire calls this `count`; the runtime calls it `arrayElements`.
    // Copying the field name yields `arrayElements: undefined`, read silently at
    // `packageHelpers.js:869`.
    count: (target, value) => { target.arrayElements = value; },
    isSRGB: (target, value) => { target.isSRGB = flag(value); },
    isAutoregister: (target, value) => { target.isAutoregister = flag(value); }
});

/** UAV record rules. A UAV record has no `isSRGB`; it is synthesised. */
const UAV_RULES = Object.freeze({
    registerIndex: consumed,
    name: (target, value) => { target.name = text(value); },
    type: (target, value) => { target.type = value; },
    // RENAME: same as the texture record.
    count: (target, value) => { target.arrayElements = value; },
    isAutoregister: (target, value) => { target.isAutoregister = flag(value); }
});

/** Sampler record rules. The wire record is flat; the runtime shape is nested. */
const SAMPLER_RULES = Object.freeze({
    registerIndex: consumed,
    // Handled after the walk: the name depends on `isDynamic`, which the walk
    // may not have reached yet.
    name: consumed,
    isDynamic: (target, value) => { target.sampler.isDynamic = flag(value); },
    comparison: (target, value) => { target.sampler.comparison = flag(value); },
    minFilter: (target, value) => { target.sampler.minFilter = value; },
    magFilter: (target, value) => { target.sampler.magFilter = value; },
    mipFilter: (target, value) => { target.sampler.mipFilter = value; },
    addressU: (target, value) => { target.sampler.addressU = value; },
    addressV: (target, value) => { target.sampler.addressV = value; },
    addressW: (target, value) => { target.sampler.addressW = value; },
    mipLODBias: (target, value) => { target.sampler.mipLODBias = value; },
    maxAnisotropy: (target, value) => { target.sampler.maxAnisotropy = value; },
    comparisonFunc: (target, value) => { target.sampler.comparisonFunc = value; },
    borderColor: (target, value) => { target.sampler.borderColor = value.slice(0, 4); },
    minLOD: (target, value) => { target.sampler.minLOD = value; },
    maxLOD: (target, value) => { target.sampler.maxLOD = value; }
});

/** Static sampler rules. `borderColor` is a one-byte enum here, not four floats. */
const STATIC_SAMPLER_RULES = Object.freeze({
    registerIndex: (target, value) => { target.registerIndex = value; },
    registerSpace: (target, value) => { target.registerSpace = value; },
    comparison: (target, value) => { target.sampler.comparison = flag(value); },
    minFilter: (target, value) => { target.sampler.minFilter = value; },
    magFilter: (target, value) => { target.sampler.magFilter = value; },
    mipFilter: (target, value) => { target.sampler.mipFilter = value; },
    addressU: (target, value) => { target.sampler.addressU = value; },
    addressV: (target, value) => { target.sampler.addressV = value; },
    addressW: (target, value) => { target.sampler.addressW = value; },
    mipLODBias: (target, value) => { target.sampler.mipLODBias = value; },
    maxAnisotropy: (target, value) => { target.sampler.maxAnisotropy = value; },
    comparisonFunc: (target, value) => { target.sampler.comparisonFunc = value; },
    borderColor: (target, value) => { target.sampler.borderColor = value; },
    minLOD: (target, value) => { target.sampler.minLOD = value; },
    maxLOD: (target, value) => { target.sampler.maxLOD = value; }
});

/** Constant record rules. */
const CONSTANT_RULES = Object.freeze({
    name: (target, value) => { target.name = text(value); },
    offset: (target, value) => { target.offset = value; },
    size: (target, value) => { target.size = value; },
    type: (target, value) => { target.type = value; },
    dimension: (target, value) => { target.dimension = value; },
    elements: (target, value) => { target.elements = value; },
    isSRGB: (target, value) => { target.isSRGB = flag(value); },
    isAutoregister: (target, value) => { target.isAutoregister = flag(value); }
});

/** Register declaration rules. */
const REGISTER_RULES = Object.freeze({
    registerType: (target, value) => { target.registerType = value; },
    registerIndex: (target, value) => { target.registerIndex = value; },
    // Carbon stores one field its reader calls `arrayCount` and its writer calls
    // `registerCount`. The runtime shape carries both names, always equal — the
    // producer refuses to write them when they disagree.
    registerCount: (target, value) => { target.registerCount = value; target.arrayCount = value; },
    registerSpace: (target, value) => { target.registerSpace = value; }
});

/**
 * Pipeline input rules.
 *
 * `usageName` is derived from the `usage` byte rather than carried: it is a
 * display name looked up from a table, exactly as Carbon derives it through
 * `GetStringForUsageCode` (`EffectData.h:86`). Nothing goes on the wire for it.
 */
const PIPELINE_INPUT_RULES = Object.freeze({
    usage: (target, value) =>
    {
        target.usage = value;
        target.usageName = HlslUsageCodeNames[value] || `USAGE_${value}`;
    },
    registerIndex: (target, value) => { target.registerIndex = value; },
    usageIndex: (target, value) => { target.usageIndex = value; },
    usedMask: (target, value) => { target.usedMask = value; },
    type: (target, value) => { target.type = value; },
    dimension: (target, value) => { target.dimension = value; }
});

/** Annotation rules. */
const ANNOTATION_RULES = Object.freeze({
    name: (target, value) => { target.name = text(value); },
    type: (target, value) => { target.type = value; },
    stringValue: (target, value) => { if (value) target.stringValue = text(value); },
    // A non-string annotation value is four raw bytes: Carbon writes it through a
    // float union and reads it through a different one, so the bytes are the only
    // faithful form. The three typed views are derived from those bytes, one per
    // union member Carbon reads back through.
    rawValue: (target, value, record) =>
    {
        if (record.type === ANNOTATION_TYPE_STRING) return;
        const bits = rawUint32(value);
        target.rawValue = bits;
        target.boolValue = bits !== 0;
        target.intValue = bits | 0;
        target.floatValue = floatFromBits(bits);
    }
});

/**
 * Maps one texture record onto its runtime resource object.
 *
 * @param {object} record Wire texture record.
 * @returns {HlslEffectResource} Runtime resource.
 */
function mapTextureRecord(record)
{
    return mapClosed(record, TEXTURE_RULES, new HlslEffectResource(), "texture");
}

/**
 * Maps one UAV record onto its runtime resource object.
 *
 * A UAV record is one byte shorter than a texture record: it carries no
 * `isSRGB`. Carbon's reader hardcodes it false (`Tr2EffectDescription.cpp:450`),
 * so the runtime object's
 * constructor default is restored explicitly rather than left to chance —
 * `metadata.toJSON()` emits the key for a UAV even though the wire never carries
 * it, because both kinds share `HlslEffectResource`.
 *
 * @param {object} record Wire UAV record.
 * @returns {HlslEffectResource} Runtime resource.
 */
function mapUavRecord(record)
{
    const resource = mapClosed(record, UAV_RULES, new HlslEffectResource(), "uav");
    resource.isSRGB = false;
    return resource;
}

/**
 * Maps one sampler record onto its runtime sampler setup.
 *
 * Two conversions beyond the flat-to-nested reshape:
 *
 * - Carbon nulls a sampler's name when it is not dynamic
 *   (`Tr2EffectDescription.cpp:430-433`), so the wire's empty string must become
 *   `null` again. A pre-v13 record carries no `isDynamic` at all; the class
 *   default (dynamic) then keeps the name, matching the legacy reader, which
 *   never assigned the flag for those versions. Like `isSRGB`, the nulling is
 *   *accidentally correct* if left alone —
 *   `""` and `null` are both falsy, so `metadataName` and the heap-view lookup
 *   behave identically — and only a structural diff catches it.
 * - `comparison` and `isDynamic` are `u8` on the wire and boolean at runtime.
 *
 * @param {object} record Wire sampler record.
 * @returns {HlslSamplerSetup} Runtime sampler setup.
 */
function mapSamplerRecord(record)
{
    const setup = new HlslSamplerSetup();
    setup.sampler = new HlslSamplerDescription();
    mapClosed(record, SAMPLER_RULES, setup, "sampler");
    setup.name = setup.sampler.isDynamic ? text(record.name) : null;
    return setup;
}

/**
 * Maps one static sampler record onto its runtime signature entry.
 *
 * The runtime shape keeps the `*Raw` companions non-enumerable, so a
 * `cloneJson` of the descriptor sees the value form only.
 *
 * @param {object} record Wire static sampler record.
 * @returns {object} Runtime static sampler entry.
 */
function mapStaticSamplerRecord(record)
{
    const entry = { registerIndex: 0, registerSpace: 0, sampler: {
        comparison: false,
        minFilter: 0,
        magFilter: 0,
        mipFilter: 0,
        addressU: 0,
        addressV: 0,
        addressW: 0,
        mipLODBias: 0,
        maxAnisotropy: 0,
        comparisonFunc: 0,
        borderColor: 0,
        minLOD: 0,
        maxLOD: 0
    } };
    mapClosed(record, STATIC_SAMPLER_RULES, entry, "static sampler");
    Object.defineProperties(entry.sampler, {
        mipLODBiasRaw: { value: 0, writable: true },
        minLODRaw: { value: 0, writable: true },
        maxLODRaw: { value: 0, writable: true }
    });
    return entry;
}

/**
 * Maps one constant record onto its runtime constant object.
 *
 * @param {object} record Wire constant record.
 * @returns {HlslEffectConstant} Runtime constant.
 */
function mapConstantRecord(record)
{
    return mapClosed(record, CONSTANT_RULES, new HlslEffectConstant(), "constant");
}

/**
 * Maps one annotation record onto its runtime annotation object.
 *
 * @param {object} record Wire annotation record.
 * @returns {HlslEffectParameterAnnotation} Runtime annotation.
 */
function mapAnnotationRecord(record)
{
    return mapClosed(record, ANNOTATION_RULES, new HlslEffectParameterAnnotation(), "annotation");
}

/**
 * Restores the `dynamic` flag the source reader derives per register.
 *
 * Reproduced rather than stored: it is a function of the register type, the
 * stage type and the caller's per-frame start registers, none of which the
 * container needs to carry.
 *
 * @param {object} register Runtime register declaration.
 * @param {number} stageType Stage enum value.
 * @param {object} context Adapter context carrying the per-frame registers.
 * @returns {boolean} True when the register is dynamic.
 */
function isRegisterDynamic(register, stageType, context)
{
    if (register.registerType !== 0) return true;
    if (stageType === HlslRenderContextEnum.VERTEX_SHADER
        && register.registerIndex === context.perFrameVSStartRegister) return false;
    if (stageType === HlslRenderContextEnum.PIXEL_SHADER
        && register.registerIndex === context.perFramePSStartRegister) return false;
    return true;
}

/**
 * Populates one runtime stage input from a wire `StageData` block.
 *
 * @param {HlslEffectStageInput} input Destination stage input.
 * @param {object} data Wire stage data.
 * @param {number} stageType Stage enum value.
 * @param {object} context Adapter context.
 */
function applyStageData(input, data, stageType, context)
{
    input.signature.registers = (data.registers ?? []).map((record) =>
    {
        const register = mapClosed(record, REGISTER_RULES, {}, "register");
        register.dynamic = isRegisterDynamic(register, stageType, context);
        return register;
    });
    input.signature.samplers = (data.staticSamplers ?? []).map(mapStaticSamplerRecord);

    input.constants = (data.constants ?? []).map(mapConstantRecord);

    // The declared size is the unclamped one; the runtime clamps it to
    // SHADER_CONSTANTS_MAX and slices the payload to match, as Carbon does
    // (`Tr2EffectDescription.h:160`). `packMaterial` allocates an
    // ArrayBuffer of exactly this size, so restoring the unclamped value would
    // write past the layout the shader expects — on any effect above 4096 bytes
    // of constants, which is precisely the size a small fixture never reaches.
    const declaredSize = data.defaultValues?.size ?? 0;
    input.sourceConstantValueSize = declaredSize;
    input.sourceConstantValues = Uint8Array.from(data.defaultValues?.bytes ?? new Uint8Array(0));
    input.m_constantValueSize = Math.min(declaredSize, HlslEffectStageInput.SHADER_CONSTANTS_MAX);
    input.constantValues = input.sourceConstantValues.slice(0, input.m_constantValueSize);

    input.resources = new Map((data.textures ?? [])
        .map((record) => [ record.registerIndex, mapTextureRecord(record) ]));
    input.samplers = new Map((data.samplers ?? [])
        .map((record) => [ record.registerIndex, mapSamplerRecord(record) ]));
    input.uavs = new Map((data.uavs ?? [])
        .map((record) => [ record.registerIndex, mapUavRecord(record) ]));

    input.annotation = (data.annotations ?? []).map(mapAnnotationRecord);

    // Runs last, because it needs the sampler map. See the function's own note
    // for why it exists.
    for (const constant of input.constants) patchSamplerHeapIndexConstant(input, constant);
}

/**
 * Grows the constant block to cover a sampler heap-index constant.
 *
 * Applied to every constant once samplers are known, as Carbon's reader does:
 * a `UINT`/dimension-1 constant whose name matches a sampler is a heap index,
 * and the declared constant-value size can be smaller than the offset it sits
 * at. The block is extended rather than read out of bounds.
 *
 * **This is derived, not stored, and missing it is not cosmetic.** `packMaterial`
 * allocates `new ArrayBuffer(constantValueSize)`, so an unpatched size
 * under-allocates and the write runs past the end of the buffer the shader
 * expects. It appears only on dx12 -- the whole dx11 corpus is unaffected --
 * which is exactly why the analysis diff had to cover dx12 before this was
 * trustworthy. On `quaddetailv5.sm_depth` the declared 608 becomes 620.
 *
 * @param {object} input Runtime stage input, with samplers already populated.
 * @param {object} constant Runtime constant record.
 */
function patchSamplerHeapIndexConstant(input, constant)
{
    if (constant.type !== HlslEffectConstant.Type.UINT || constant.dimension !== 1) return;

    for (const sampler of input.samplers.values())
    {
        if (sampler.name !== constant.name) continue;
        const neededSize = constant.offset + constant.size;
        if (neededSize > input.m_constantValueSize)
        {
            const next = new Uint8Array(neededSize);
            next.set(input.constantValues);
            input.constantValues = next;
            input.m_constantValueSize = neededSize;
        }
        break;
    }
}

/**
 * Rebuilds one runtime pass from a wire pass record.
 *
 * @param {object} record Wire pass record.
 * @param {object} context Adapter context.
 * @returns {HlslPass} Runtime pass.
 */
function buildPass(record, context)
{
    const pass = new HlslPass();
    const shaderTypes = [];
    const signatures = [];
    const shaderHandles = [];

    // Wire array order, not ascending stage type. The source reader registers
    // shaders in the order the file lists its stages, and the state manager's
    // handles are monotonic counters, so any other order reproduces the shape
    // with the handles permuted.
    for (const stage of record.stages ?? [])
    {
        const stageType = stage.type;
        const input = pass.stageInputs[stageType];
        if (!input)
        {
            throw new CjsFormatReadError(
                `Carbon stage record declares stage type ${stageType}, outside the runtime stage range`,
                { stageType }
            );
        }
        if (input.m_exists)
        {
            throw new CjsFormatReadError(
                `Carbon pass declares stage type ${stageType} twice; the later stage would clobber the earlier`,
                { stageType }
            );
        }

        input.m_exists = true;
        input.signature.threadGroupSize = {
            x: stage.threadGroupSize[0],
            y: stage.threadGroupSize[1],
            z: stage.threadGroupSize[2]
        };
        input.signature.pipelineInputs = (stage.pipelineInputs ?? [])
            .map((entry) => mapClosed(entry, PIPELINE_INPUT_RULES, {}, "pipeline input"));

        applyStageData(input, stage, stageType, context);

        input.cjsShaderBytecode = context.bytecodeFor
            ? context.bytecodeFor(stage, stageType, pass)
            : null;

        input.m_shader = context.effectStateManager.RegisterShader(
            stageType,
            input.cjsShaderBytecode,
            input.signature,
            context.effectName
        );
        shaderHandles.push(input.m_shader);
        shaderTypes.push(stageType);
        signatures.push(input.signature);
        pass.shaderTypeMask |= (1 << stageType);
    }

    pass.resourceSetDesc = new HlslResourceSetDescription(shaderTypes, signatures);
    for (let stageType = 0; stageType < HlslRenderContextEnum.SHADER_TYPE_COUNT; stageType += 1)
    {
        const input = pass.stageInputs[stageType];
        if (!input?.m_exists) continue;
        for (const [ registerIndex, sampler ] of input.samplers.entries())
        {
            pass.resourceSetDesc.SetSampler(stageType, registerIndex, sampler.sampler);
        }
    }

    pass.shaderProgram = context.effectStateManager.RegisterShaderProgram(
        shaderHandles,
        shaderHandles.length
    );

    const states = new Map();
    for (const entry of record.renderStates ?? [])
    {
        if (states.has(entry.state))
        {
            throw new CjsFormatReadError(
                `Carbon pass declares render state ${entry.state} twice`,
                { state: entry.state }
            );
        }
        states.set(entry.state, entry.value);
    }
    pass.cjsRenderStateSetup = new HlslRenderStateSetup(states);
    pass.renderStates = context.effectStateManager.RegisterRenderStateSetup(pass.cjsRenderStateSetup);

    return pass;
}

/** Names an export slot per Carbon's raytracing export type codes. */
const LIBRARY_EXPORT_NAME_FIELDS = Object.freeze([
    "rayGenName",
    "missName",
    "closestHitName",
    "anyHitName",
    "intersectionName"
]);

/** Library record rules; the nested pieces are handled by `buildLibrary`. */
const LIBRARY_RULES = Object.freeze({
    payloadSize: (target, value) => { target.payloadSize = value; },
    hitGroupName: (target, value) => { target.hitGroupName = text(value); },
    // Consumed by buildLibrary: the blob becomes the registered bytecode.
    shaderData: consumed,
    // Consumed by buildLibrary: exports carry per-type name routing.
    exports: consumed,
    globalInputs: consumed,
    localInputs: consumed
});

/**
 * Rebuilds one runtime shader library from a wire library record.
 *
 * The two stage-data blocks reuse `applyStageData`, so a library's constants,
 * defaults, resources, samplers and UAVs go through exactly the rules a pass
 * stage goes through. The library bytecode is registered the way the runtime
 * registers it: a compute-typed `HlslShaderBytecode` under the state manager's
 * library registry, whose handles are a separate monotonic counter — adding
 * libraries does not shift any shader or program handle.
 *
 * @param {object} record Wire library record.
 * @param {object} context Adapter context.
 * @returns {HlslEffectLibrary} Runtime library.
 */
function buildLibrary(record, context)
{
    const library = mapClosed(record, LIBRARY_RULES, new HlslEffectLibrary(), "library");
    const shaderType = HlslRenderContextEnum.COMPUTE_SHADER;

    library.cjsShaderBytecode = new HlslShaderBytecode({
        stageType: shaderType,
        stageName: "library",
        bytes: record.shaderData?.bytes ?? new Uint8Array(0),
        shaderSize: record.shaderData?.size ?? 0,
        stringTableOffset: record.shaderData?.offset ?? null
    });
    library.libraryHandle = context.effectStateManager.RegisterShaderLibrary(
        library.cjsShaderBytecode
    );

    for (const entry of record.exports ?? [])
    {
        const name = text(entry.name);
        library.exports.push({ type: entry.type, name });
        const field = LIBRARY_EXPORT_NAME_FIELDS[entry.type];
        if (field) library[field] = name;
    }

    applyStageData(library.globalInput, record.globalInputs ?? {}, shaderType, context);
    library.globalResourceSetDesc = new HlslResourceSetDescription(
        [ shaderType ],
        [ library.globalInput.signature ]
    );
    for (const [ registerIndex, sampler ] of library.globalInput.samplers.entries())
    {
        library.globalResourceSetDesc.SetSampler(shaderType, registerIndex, sampler.sampler);
    }

    applyStageData(library.localInput, record.localInputs ?? {}, shaderType, context);

    return library;
}

/**
 * Applies the `IsHeapView` annotations to the rebuilt resource-set descriptions.
 *
 * Derived rather than carried, over the annotations the container holds,
 * exactly as Carbon derives it after reading
 * (`Tr2EffectDescription.cpp:474-530`): a parameter whose top-level
 * annotations contain a true BOOL `IsHeapView` marks its register as a heap
 * view in the owning resource-set description, for library global inputs as
 * well as pass stages.
 *
 * @param {object} effectDescription Rebuilt effect description.
 */
function applyHeapViewAnnotations(effectDescription)
{
    const isHeapView = (name) =>
    {
        if (!name) return false;
        const annotations = effectDescription.annotations.get(name) || [];
        return annotations.some((annotation) =>
            annotation.name === "IsHeapView"
            && annotation.type === HlslEffectParameterAnnotation.Type.BOOL
            && annotation.boolValue);
    };

    for (const technique of effectDescription.techniques)
    {
        for (const library of technique.libraries ?? [])
        {
            const shaderType = HlslRenderContextEnum.COMPUTE_SHADER;
            for (const [ registerIndex, resource ] of library.globalInput.resources.entries())
            {
                if (isHeapView(resource.name)) library.globalResourceSetDesc?.SetSrvHeapView(shaderType, registerIndex);
            }
            for (const [ registerIndex, resource ] of library.globalInput.uavs.entries())
            {
                if (isHeapView(resource.name)) library.globalResourceSetDesc?.SetUavHeapView(shaderType, registerIndex);
            }
            for (const [ registerIndex, sampler ] of library.globalInput.samplers.entries())
            {
                if (isHeapView(sampler.name)) library.globalResourceSetDesc?.SetSamplerHeapView(shaderType, registerIndex);
            }
        }

        for (const pass of technique.passes)
        {
            for (let stageType = 0; stageType < pass.stageInputs.length; stageType += 1)
            {
                const stage = pass.stageInputs[stageType];
                if (!stage?.m_exists) continue;
                for (const [ registerIndex, resource ] of stage.resources.entries())
                {
                    if (isHeapView(resource.name)) pass.resourceSetDesc?.SetSrvHeapView(stageType, registerIndex);
                }
                for (const [ registerIndex, resource ] of stage.uavs.entries())
                {
                    if (isHeapView(resource.name)) pass.resourceSetDesc?.SetUavHeapView(stageType, registerIndex);
                }
                for (const [ registerIndex, sampler ] of stage.samplers.entries())
                {
                    if (isHeapView(sampler.name)) pass.resourceSetDesc?.SetSamplerHeapView(stageType, registerIndex);
                }
            }
        }
    }
}

/**
 * Rebuilds the runtime effect-description shape from a Carbon record tree.
 *
 * @param {object} description Parsed Carbon description record tree.
 * @param {object} [options] Adapter options.
 * @param {string} [options.effectName] Effect name or source path.
 * @param {number} [options.version] Carbon effect-data version.
 * @param {number} [options.perFrameVSStartRegister] Per-frame vertex start register.
 * @param {number} [options.perFramePSStartRegister] Per-frame pixel start register.
 * @param {Function} [options.bytecodeFor] Supplies `cjsShaderBytecode` per stage.
 * @param {HlslEffectStateManager} [options.effectStateManager] Registry override.
 * @returns {object} Runtime-shaped effect description.
 */
export function runtimeDescriptionFromCarbon(description, options = {})
{
    if (!description?.techniques)
    {
        throw new CjsFormatReadError("Carbon description has no techniques", {});
    }

    const context = {
        effectName: options.effectName ?? "",
        effectStateManager: options.effectStateManager ?? new HlslEffectStateManager(),
        bytecodeFor: options.bytecodeFor ?? null,
        perFrameVSStartRegister: Number.isInteger(options.perFrameVSStartRegister)
            ? options.perFrameVSStartRegister
            : null,
        perFramePSStartRegister: Number.isInteger(options.perFramePSStartRegister)
            ? options.perFramePSStartRegister
            : null
    };

    const effectDescription = {
        effectName: context.effectName,
        version: options.version ?? 15,
        techniques: [],
        annotations: new Map(),
        effectStateManager: context.effectStateManager
    };

    for (const record of description.techniques)
    {
        const technique = new HlslEffectTechnique();
        technique.name = text(record.name);
        technique.passes = (record.passes ?? []).map((pass) => buildPass(pass, context));
        for (const pass of technique.passes) technique.shaderTypeMask |= pass.shaderTypeMask;
        // Raytracing libraries were once deliberately dropped here, when this
        // adapter served only `buildEffectAnalysis` — which reaches libraries
        // through no path, a claim the dx12 corpus diff measured (every body
        // of `unpacked_quadv5.sm_hi` carries an `RtShadow` library, and the
        // diff stayed green). Since the runtime read path converged on this
        // adapter, that scope no longer holds: `metadata.js` and `json.js`
        // emit `technique.libraries`, and the effect-resource contract
        // requires every library's exports, inputs and payload preserved.
        technique.libraries = (record.libraries ?? []).map((library) => buildLibrary(library, context));
        effectDescription.techniques.push(technique);
    }

    for (const group of description.annotations ?? [])
    {
        const name = text(group.name);
        if (effectDescription.annotations.has(name))
        {
            throw new CjsFormatReadError(
                `Duplicate effect parameter annotation group ${name}`,
                { name }
            );
        }
        effectDescription.annotations.set(
            name,
            (group.annotations ?? []).map(mapAnnotationRecord)
        );
    }

    applyHeapViewAnnotations(effectDescription);

    return effectDescription;
}

export default runtimeDescriptionFromCarbon;
