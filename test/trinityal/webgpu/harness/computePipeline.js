function fail(message)
{
    throw new Error(`CJS WebGPU compute harness: ${message}`);
}

function computeVisibility(visibility, shaderStage)
{
    const stages = Array.isArray(visibility) ? Array.from(new Set(visibility)) : [];
    if (stages.length !== 1 || stages[0] !== "compute")
    {
        fail("compute binding visibility must contain exactly compute");
    }
    if (!Number.isInteger(shaderStage?.COMPUTE))
    {
        fail("GPUShaderStage.COMPUTE is unavailable");
    }
    return shaderStage.COMPUTE;
}

function bindingLayout(binding)
{
    if (binding?.sourceTruth !== "wgsl-layout")
    {
        fail("all compute bindings must come from a canonical WGSL layout");
    }
    if (binding.dynamic || binding.layout?.buffer?.hasDynamicOffset)
    {
        fail(`${binding.scopeIdentity || binding.identity || binding.key || "binding"} uses unsupported dynamic offsets`);
    }
    const layout = binding.layout;
    if (!layout || typeof layout !== "object")
    {
        fail(`${binding.scopeIdentity || binding.identity || binding.key || "binding"} has no WebGPU layout`);
    }
    const keys = [ "buffer", "sampler", "texture", "storageTexture", "externalTexture" ]
        .filter((key) => layout[key] != null);
    if (keys.length !== 1)
    {
        fail(`${binding.scopeIdentity || binding.identity || binding.key || "binding"} must have exactly one WebGPU layout kind`);
    }
    return { [keys[0]]: structuredClone(layout[keys[0]]) };
}

function threadGroupSize(value)
{
    const normalized = Array.isArray(value)
        ? value
        : value && typeof value === "object"
            ? [ value.x, value.y, value.z ]
            : null;
    if (!normalized || normalized.length !== 3
        || normalized.some((entry) => !Number.isSafeInteger(entry) || entry < 1))
    {
        fail("compute shader requires a positive three-dimensional threadGroupSize");
    }
    return normalized;
}

function normalizeComputePipeline(value, shaderStage)
{
    const stages = Array.isArray(value?.shaderModules) ? value.shaderModules : [];
    if (stages.length !== 1 || stages[0]?.stageName !== "compute")
    {
        fail("compute pipelines require exactly one compute shader module");
    }
    const shader = stages[0];
    if (shader.stageType !== 2)
    {
        fail("compute shader stage type must be 2");
    }
    if (typeof shader.wgsl !== "string" || !shader.wgsl
        || typeof shader.entryPoint !== "string" || !shader.entryPoint)
    {
        fail("compute shader requires WGSL and an entry point");
    }
    const workgroup = threadGroupSize(shader.threadGroupSize);

    const groups = Array.isArray(value.bindGroups) ? value.bindGroups.slice() : [];
    groups.sort((left, right) => left.group - right.group);
    const slots = new Set();
    const bindGroupLayouts = groups.map((group, groupIndex) =>
    {
        if (group?.group !== groupIndex)
        {
            fail("canonical compute bind groups must be contiguous from group 0");
        }
        const bindings = Array.isArray(group.bindings) ? group.bindings.slice() : [];
        bindings.sort((left, right) => left.binding - right.binding);
        return {
            group: group.group,
            entries: bindings.map((binding) =>
            {
                if (binding?.group !== group.group
                    || !Number.isInteger(binding.binding) || binding.binding < 0)
                {
                    fail(`group ${group.group} has an invalid binding slot`);
                }
                const slot = `${group.group}:${binding.binding}`;
                if (slots.has(slot)) fail(`canonical compute layout duplicates binding slot ${slot}`);
                slots.add(slot);
                return {
                    binding: binding.binding,
                    visibility: computeVisibility(binding.visibility, shaderStage),
                    ...bindingLayout(binding)
                };
            })
        };
    });
    return {
        key: String(value.key || ""),
        shader: {
            wgsl: shader.wgsl,
            entryPoint: shader.entryPoint,
            threadGroupSize: workgroup
        },
        groups: bindGroupLayouts
    };
}

async function popValidationScope(device, scope)
{
    if (!scope.open) return null;
    scope.open = false;
    return device.popErrorScope();
}

/**
 * Creates one validation-only native compute pipeline for a matrix descriptor.
 *
 * This is intentionally a browser-harness helper rather than a public
 * CjsWebgpuDevice compute API.
 *
 * @param {GPUDevice} device Browser WebGPU device.
 * @param {object} pipeline CjsWebgpuPipeline JSON descriptor.
 * @param {object} shaderStage Browser GPUShaderStage constants.
 * @returns {Promise<object>} Native pipeline and zero-warning summary.
 */
export async function createHarnessComputePipeline(device, pipeline, shaderStage)
{
    if (!device || typeof device.createShaderModule !== "function"
        || typeof device.createBindGroupLayout !== "function"
        || typeof device.createPipelineLayout !== "function")
    {
        fail("a WebGPU device is required");
    }
    const descriptor = normalizeComputePipeline(pipeline, shaderStage);
    const scope = {
        open: typeof device.pushErrorScope === "function" && typeof device.popErrorScope === "function"
    };
    if (scope.open) device.pushErrorScope("validation");
    try
    {
        const module = device.createShaderModule({
            label: `${descriptor.key || "matrix"}.compute`,
            code: descriptor.shader.wgsl
        });
        const bindGroupLayouts = descriptor.groups.map((group) => device.createBindGroupLayout({
            label: `${descriptor.key || "matrix"}.group${group.group}`,
            entries: group.entries
        }));
        const layout = device.createPipelineLayout({
            label: `${descriptor.key || "matrix"}.layout`,
            bindGroupLayouts
        });
        const pipelineDescriptor = {
            label: `${descriptor.key || "matrix"} compute gate`,
            layout,
            compute: {
                module,
                entryPoint: descriptor.shader.entryPoint
            }
        };
        const nativePipelinePromise = typeof device.createComputePipelineAsync === "function"
            ? device.createComputePipelineAsync(pipelineDescriptor)
            : Promise.resolve(device.createComputePipeline(pipelineDescriptor));
        const diagnosticsPromise = typeof module.getCompilationInfo === "function"
            ? module.getCompilationInfo()
            : Promise.resolve({ messages: [] });
        const validationPromise = popValidationScope(device, scope);
        const [ nativePipeline, compilation, validationError ] = await Promise.all([
            nativePipelinePromise,
            diagnosticsPromise,
            validationPromise
        ]);
        const messages = (compilation.messages || [])
            .filter((entry) => entry.type === "error" || entry.type === "warning");
        if (messages.length)
        {
            fail(`compute WGSL produced diagnostics: ${messages.map((entry) => entry.message).join(" | ")}`);
        }
        if (validationError)
        {
            fail(`compute-pipeline validation failed: ${validationError.message || validationError}`);
        }
        return {
            pipeline: nativePipeline,
            bindingCount: descriptor.groups.reduce((count, group) => count + group.entries.length, 0),
            warningCount: 0
        };
    }
    catch (error)
    {
        await popValidationScope(device, scope).catch(() => null);
        throw error;
    }
}
