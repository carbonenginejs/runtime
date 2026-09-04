const composedStages = new WeakMap();

/**
 * Executes prepared GLES atlas pass descriptors through an injected native
 * host. The host owns targets, effects, GL state, and resource lifetime; this
 * class owns only composition ordering and transactional cleanup.
 */
export class CjsCharacterGlesAtlasRenderer
{
    _atlasHost;

    constructor({ atlasHost } = {})
    {
        this._atlasHost = RequireAtlasHost(atlasHost);
    }

    /**
     * Creates, renders, finalizes, and retains one composed atlas stage.
     * Release must be called for each successful result.
     */
    async Compose({ name, targetSize, passes } = {})
    {
        const targetName = RequireName(name);
        const size = RequireTargetSize(targetSize);
        const descriptors = RequirePasses(passes);
        const target = await this._atlasHost.CreateTarget({
            name: targetName,
            width: size[0],
            height: size[1]
        });
        if (!target)
        {
            throw new Error("GLES atlas host did not create target " + targetName);
        }

        const effects = [];
        try
        {
            for (const descriptor of descriptors)
            {
                const effect = await this._atlasHost.CreateEffect({
                    shader: descriptor.shader,
                    parameters: CloneParameters(descriptor.parameters),
                    textures: { ...descriptor.textures }
                });
                if (!effect)
                {
                    throw new Error(
                        "GLES atlas host did not create effect for " + descriptor.shader
                    );
                }
                effects.push(effect);
                await RequireSucceeded(
                    this._atlasHost.PrepareEffect(effect),
                    "GLES atlas host did not prepare " + descriptor.shader
                );
                await RequireSucceeded(
                    this._atlasHost.RenderPass({
                        target,
                        effect,
                        viewport: [ ...descriptor.viewport ],
                        blend: descriptor.blend,
                        colorWrite: descriptor.colorWrite ?? "rgba",
                        kind: descriptor.kind
                    }),
                    "GLES atlas host did not render " + descriptor.shader
                );
            }
            await RequireSucceeded(
                this._atlasHost.FinalizeTarget(target),
                "GLES atlas host did not finalize target " + targetName
            );
            const texture = await this._atlasHost.GetTexture(target);
            if (!texture)
            {
                throw new Error("GLES atlas host did not expose texture for " + targetName);
            }
            const stage = {
                name: targetName,
                targetSize: size,
                texture,
                report: descriptors.map(value => CloneReport(value.report))
            };
            composedStages.set(stage, { target, effects });
            return stage;
        }
        catch (error)
        {
            const cleanupFailures = await DestroyResources(this._atlasHost, effects, target);
            if (cleanupFailures.length) error.cleanupFailures = cleanupFailures;
            throw error;
        }
    }

    /** Releases one successful composition result. It is safe to call twice. */
    async Release(stage)
    {
        const state = composedStages.get(stage);
        if (!state) return false;
        const failures = await DestroyResources(this._atlasHost, state.effects, state.target);
        if (failures.length)
        {
            const error = new Error("GLES atlas stage release failed");
            error.errors = failures;
            throw error;
        }
        composedStages.delete(stage);
        return true;
    }
}

function RequireAtlasHost(host)
{
    const required = [
        "CreateTarget",
        "CreateEffect",
        "PrepareEffect",
        "RenderPass",
        "FinalizeTarget",
        "GetTexture",
        "DestroyEffect",
        "DestroyTarget"
    ];
    if (!host || required.some(name => typeof host[name] !== "function"))
    {
        throw new TypeError(
            "GLES atlas renderer requires an atlas host with target, effect, render, and cleanup methods"
        );
    }
    return host;
}

function RequireName(value)
{
    const name = String(value ?? "").trim();
    if (!name) throw new TypeError("GLES atlas composition requires a target name");
    return name;
}

function RequireTargetSize(value)
{
    if (!Array.isArray(value)
        || value.length !== 2
        || !value.every(component => Number.isSafeInteger(component) && component > 0))
    {
        throw new TypeError("GLES atlas composition requires positive integer target size");
    }
    return [ ...value ];
}

function RequirePasses(value)
{
    if (!Array.isArray(value) || !value.length)
    {
        throw new TypeError("GLES atlas composition requires prepared pass descriptors");
    }
    return value.map((descriptor, index) =>
    {
        if (!descriptor
            || !String(descriptor.shader ?? "").trim()
            || !String(descriptor.kind ?? "").trim()
            || !Array.isArray(descriptor.viewport)
            || descriptor.viewport.length !== 4
            || !descriptor.viewport.every(component => Number.isFinite(component))
            || !descriptor.parameters
            || !descriptor.textures)
        {
            throw new TypeError(
                "GLES atlas composition pass " + index + " is not a valid prepared descriptor"
            );
        }
        return descriptor;
    });
}

async function RequireSucceeded(value, message)
{
    if ((await value) === false) throw new Error(message);
}

async function DestroyResources(host, effects, target)
{
    const failures = [];
    for (const effect of [ ...effects ].reverse())
    {
        try
        {
            await host.DestroyEffect(effect);
        }
        catch (error)
        {
            failures.push(error);
        }
    }
    try
    {
        await host.DestroyTarget(target);
    }
    catch (error)
    {
        failures.push(error);
    }
    return failures;
}

function CloneParameters(parameters)
{
    return Object.fromEntries(Object.entries(parameters).map(([ name, value ]) => [
        name,
        Array.isArray(value) ? [ ...value ] : value
    ]));
}

function CloneReport(report)
{
    if (!report || typeof report !== "object") return report ?? null;
    return {
        ...report,
        ...(report.placement !== undefined ? {
            placement: report.placement ? [ ...report.placement ] : report.placement
        } : {}),
        ...(report.coveragePlacement !== undefined ? {
            coveragePlacement: report.coveragePlacement
                ? [ ...report.coveragePlacement ]
                : report.coveragePlacement
        } : {}),
        ...(report.destinationPlacement !== undefined ? {
            destinationPlacement: report.destinationPlacement
                ? [ ...report.destinationPlacement ]
                : report.destinationPlacement
        } : {})
    };
}
