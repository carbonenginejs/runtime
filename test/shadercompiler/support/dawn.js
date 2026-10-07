// WGSL validation through Dawn (the `webgpu` package), for the WebGPU target's
// tests: compile messages per module, and pipeline creation for a vertex and
// pixel pair, which checks the interface between them.

import { create, globals } from "webgpu";

/**
 * The `GPU` instance, held for the life of the process. `webgpu` 0.6.2
 * segfaults when it is collected while its device is alive: a loop creating
 * shader modules with a forced `gc()` after each crashed every run until this
 * was held, and holding it alone was enough.
 *
 * @type {GPU|null}
 */
let gpu = null;

/** @type {Promise<GPUDevice>|null} */
let devicePromise = null;

/**
 * The shared Dawn device, created on first use.
 *
 * @returns {Promise<GPUDevice>} The device.
 */
export function getDevice()
{
    if (devicePromise === null)
    {
        Object.assign(globalThis, globals);
        gpu = create([]);
        devicePromise = gpu.requestAdapter().then(adapter => adapter.requestDevice());
    }
    return devicePromise;
}

/**
 * Destroys the device, if one was made. Register it with `after`.
 *
 * @returns {Promise<void>} Resolves once destroyed.
 */
export async function releaseDevice()
{
    if (devicePromise !== null)
    {
        (await devicePromise).destroy();
    }
}

/**
 * The compile errors of a WGSL module, as `line:column message` strings.
 *
 * @param {string} code The WGSL.
 * @returns {Promise<string[]>} The errors; empty when it compiles.
 */
export async function wgslErrors(code)
{
    const device = await getDevice();
    const module = device.createShaderModule({ code });
    const info = await module.getCompilationInfo();
    return info.messages.filter(m => m.type === "error").map(m => `${m.lineNum}:${m.linePos} ${m.message}`);
}

/**
 * The validation error of a render pipeline over a vertex and pixel module,
 * with an `auto` layout and one rgba8unorm target per fragment output.
 *
 * @param {string} vertex The vertex WGSL.
 * @param {string|null} fragment The pixel WGSL, or null for a depth-only pipeline.
 * @param {object[]} buffers The vertex buffer layouts.
 * @param {number} [targets] Colour targets.
 * @returns {Promise<string|null>} The error message, or null when valid.
 */
export async function pipelineError(vertex, fragment, buffers, targets = 1)
{
    const device = await getDevice();
    device.pushErrorScope("validation");
    const descriptor = {
        layout: "auto",
        vertex: { module: device.createShaderModule({ code: vertex }), entryPoint: "main", buffers },
        primitive: { topology: "triangle-list" }
    };
    if (fragment !== null)
    {
        descriptor.fragment = {
            module: device.createShaderModule({ code: fragment }),
            entryPoint: "main",
            targets: Array.from({ length: targets }, () => ({ format: "rgba8unorm" }))
        };
    }
    device.createRenderPipeline(descriptor);
    const error = await device.popErrorScope();
    return error ? error.message : null;
}
