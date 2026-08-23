// NON-CARBON EXTENSION. Carbon's device creation has no negotiated-limit step:
// a D3D feature level is a compile-time and driver fact, not a request. WebGPU
// makes it a request, and docs/engine-backends-plan.md decision 7 puts the
// decision here rather than in an engine - "no engine deciding its own
// configuration. An engine that probes is an engine that will disagree with the
// library about what it is running on."
//
// The engine consumes the result through its existing injectable
// `deviceDescriptor` option, which it passes straight to `requestDevice`. So
// this needs no engine change and adds no coupling in either direction.
//
// WHY THE DEMAND IS AN ARGUMENT AND NOT A CONSTANT HERE. What a renderer needs
// is a property of the CONTENT it was handed, not of the backend. The v5 quad
// `.sm_depth` family is the motivating case: it carries nineteen pixel-stage
// resources raw, and where engine-webgl must lower the structured buffers and
// the light-profile array to fit WebGL2's sixteen units, engine-webgpu binds
// them natively and can instead ask for a higher sampled-texture limit. See
// docs/contracts/webgl2-texture-budget.md. Baking that count in would make it
// a fact about runtime core, which it is not.


/**
 * WebGPU's default limits, for the maximum-style limits a renderer plausibly
 * raises. A device created with no `requiredLimits` gets exactly these.
 *
 * MAXIMUM-STYLE ONLY, DELIBERATELY. WebGPU also defines `minUniformBufferOffsetAlignment`
 * and `minStorageBufferOffsetAlignment`, where a BETTER device reports a SMALLER
 * number and a request asks for a smaller one. Feeding those through a resolver
 * whose whole rule is "keep the larger" would silently invert them, so they are
 * absent and a demand naming one is rejected rather than mishandled.
 */
export const WEBGPU_DEFAULT_LIMITS = Object.freeze({
    maxTextureDimension1D: 8192,
    maxTextureDimension2D: 8192,
    maxTextureDimension3D: 2048,
    maxTextureArrayLayers: 256,
    maxBindGroups: 4,
    maxBindingsPerBindGroup: 1000,
    maxDynamicUniformBuffersPerPipelineLayout: 8,
    maxDynamicStorageBuffersPerPipelineLayout: 4,
    maxSampledTexturesPerShaderStage: 16,
    maxSamplersPerShaderStage: 16,
    maxStorageBuffersPerShaderStage: 8,
    maxStorageTexturesPerShaderStage: 4,
    maxUniformBuffersPerShaderStage: 12,
    maxUniformBufferBindingSize: 65536,
    maxStorageBufferBindingSize: 134217728,
    maxBufferSize: 268435456,
    maxVertexBuffers: 8,
    maxVertexAttributes: 16,
    maxVertexBufferArrayStride: 2048,
    maxColorAttachments: 8,
    maxComputeWorkgroupStorageSize: 16384,
    maxComputeInvocationsPerWorkgroup: 256,
    maxComputeWorkgroupSizeX: 256,
    maxComputeWorkgroupSizeY: 256,
    maxComputeWorkgroupSizeZ: 64,
    maxComputeWorkgroupsPerDimension: 65535
});


/**
 * Resolves a content demand against an adapter's advertised limits into the
 * `requiredLimits` half of a GPUDeviceDescriptor, plus what could not be met.
 *
 * Three rules, and the middle one is the reason this is a function rather than
 * a spread:
 *
 * - a demand at or below the default is OMITTED, keeping the descriptor to what
 *   is actually being asked for;
 * - a demand ABOVE what the adapter advertises is omitted and REPORTED, because
 *   `requestDevice` REJECTS an unsupportable limit outright. Requesting one
 *   would fail the whole library where reporting it lets a caller substitute a
 *   lowered shader, which is the answer the WebGL backend already takes;
 * - an unrecognised limit name THROWS, so a typo fails here instead of being
 *   silently dropped by WebIDL at `requestDevice`.
 */
export function ResolveRequiredLimits(demand = {}, adapterLimits = {})
{
    const requiredLimits = {};
    const unsatisfied = [];

    for (const [ name, requested ] of Object.entries(demand ?? {}))
    {
        const defaultValue = WEBGPU_DEFAULT_LIMITS[name];

        if (defaultValue === undefined)
        {
            throw new RangeError(`runtime/core: "${name}" is not a negotiable WebGPU maximum limit`);
        }

        const value = Number(requested);

        if (!Number.isFinite(value))
        {
            throw new RangeError(`runtime/core: limit "${name}" must be a finite number`);
        }

        if (value <= defaultValue) continue;

        const supported = Number(adapterLimits?.[name]);

        if (Number.isFinite(supported) && value > supported)
        {
            unsatisfied.push({ name, requested: value, supported, default: defaultValue });
            continue;
        }

        requiredLimits[name] = value;
    }

    return { requiredLimits, unsatisfied };
}


/**
 * Reduces a feature demand to those the adapter advertises, reporting the rest.
 *
 * Same fail-soft rule as the limits, and for the same reason: `requestDevice`
 * rejects on an unsupported feature, so asking for one turns a missing optional
 * capability into a library that cannot start.
 */
export function ResolveRequiredFeatures(demand = [], adapterFeatures = [])
{
    const available = new Set(Array.from(adapterFeatures ?? [], String));
    const requiredFeatures = [];
    const unavailable = [];

    for (const name of Array.from(demand ?? [], String))
    {
        if (available.has(name)) requiredFeatures.push(name);
        else unavailable.push(name);
    }

    return { requiredFeatures, unavailable };
}


/**
 * The full device requirement for an adapter: a GPUDeviceDescriptor an engine
 * can pass to `requestDevice` unchanged, and the demands that had to be dropped
 * so it would not reject.
 *
 * `label` is carried through because WebGPU error messages name the device by
 * it, and a library that composes two of them wants them distinguishable.
 */
export function ResolveDeviceRequirements(demand = {}, adapter = null)
{
    const limits = ResolveRequiredLimits(demand.limits, adapter?.limits);
    const features = ResolveRequiredFeatures(demand.features, adapter?.features);
    const descriptor = {};

    if (Object.keys(limits.requiredLimits).length) descriptor.requiredLimits = limits.requiredLimits;
    if (features.requiredFeatures.length) descriptor.requiredFeatures = features.requiredFeatures;
    if (demand.label !== undefined && demand.label !== null) descriptor.label = String(demand.label);

    return Object.freeze({
        descriptor: Object.freeze(descriptor),
        unsatisfiedLimits: Object.freeze(limits.unsatisfied),
        unavailableFeatures: Object.freeze(features.unavailable)
    });
}
