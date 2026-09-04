import { CjsCharacterGlesFoundationTranslator } from "./CjsCharacterGlesFoundationTranslator.js";

/**
 * GLES realization application layer.
 *
 * It translates a neutral construction sequence and owns its staged lifecycle,
 * while injected hosts own all Ccpwgl/Tw2 scene, GR2, effect, resource, and GL
 * details. Complex configured-part operations deliberately remain host
 * delegated until their backend-specific material realization is migrated.
 */
export class CjsCharacterGlesAppearanceAL
{
    _foundationTranslator;

    _operationHost;

    _resourceHost;

    _visualHost;

    constructor({
        resourceHost,
        visualHost,
        operationHost = null,
        foundationTranslator = new CjsCharacterGlesFoundationTranslator()
    } = {})
    {
        this._resourceHost = RequireResourceHost(resourceHost);
        this._visualHost = RequireVisualHost(visualHost);
        this._operationHost = RequireOptionalOperationHost(operationHost);
        if (typeof foundationTranslator?.Translate !== "function")
        {
            throw new TypeError("GLES appearance AL requires a foundation translator");
        }
        this._foundationTranslator = foundationTranslator;
    }

    /** Prepares a hidden, non-published stage from neutral construction data. */
    async Prepare(construction, context = {})
    {
        const translated = this._foundationTranslator.Translate(
            construction,
            { library: context?.library ?? null }
        );
        const sex = RequireSex(translated.sex);
        const stage = {
            status: "prepared",
            sex,
            resources: [],
            resourcesByPath: new Map(),
            foundationResources: new Map(),
            operationResults: [],
            translatedConstruction: translated,
            backend: await this._visualHost.CreateCharacter({
                sex,
                name: "character-" + sex + "-appearance"
            })
        };
        if (!stage.backend)
        {
            throw new Error("GLES visual host did not create a character backend");
        }

        try
        {
            for (const operation of translated.operations)
            {
                stage.operationResults.push(
                    await this._PrepareOperation(stage, operation, context)
                );
            }
            await RequireSucceeded(
                this._visualHost.FinalizePrepared(stage, context),
                "GLES visual host did not finalize prepared character"
            );
            return stage;
        }
        catch (error)
        {
            await this.Release(stage, { ...context, reason: "prepare-failed" });
            throw error;
        }
    }

    /** Publishes the first prepared stage. */
    async Commit(stage, context = {})
    {
        RequireStage(stage, "prepared");
        await RequireSucceeded(
            this._visualHost.Commit(stage, context),
            "GLES visual host did not commit character"
        );
        stage.status = "committed";
        return stage;
    }

    /** Atomically hands visible ownership from one committed stage to another. */
    async Handoff(previous, staged, context = {})
    {
        RequireStage(previous, "committed");
        RequireStage(staged, "prepared");
        await RequireSucceeded(
            this._visualHost.Handoff(previous, staged, context),
            "GLES visual host did not hand off character"
        );
        previous.status = "superseded";
        staged.status = "committed";
        return staged;
    }

    /**
     * Releases a prepared, committed, stale, or superseded stage. It is
     * deliberately idempotent so the CPU manager can safely tear down errors.
     */
    async Release(stage, context = {})
    {
        if (!stage || stage.status === "released") return false;
        const errors = [];
        try
        {
            await this._visualHost.Release(stage, context);
        }
        catch (error)
        {
            errors.push(error);
        }
        for (const resource of [ ...stage.resources ].reverse())
        {
            try
            {
                await this._resourceHost.Release(resource, context);
            }
            catch (error)
            {
                errors.push(error);
            }
        }
        stage.resources = [];
        stage.resourcesByPath.clear();
        stage.foundationResources.clear();
        stage.status = "released";
        if (errors.length)
        {
            const error = new Error("GLES character stage release failed");
            error.errors = errors;
            throw error;
        }
        return true;
    }

    /** Delegates immutable configured-template warmup when the host supports it. */
    WarmConfiguredModelTemplates(paths)
    {
        if (typeof this._operationHost?.WarmConfiguredModelTemplates !== "function")
        {
            return Promise.resolve({
                status: "unavailable",
                reason: "configured-model-warmup-unavailable"
            });
        }
        return this._operationHost.WarmConfiguredModelTemplates(paths);
    }

    /** Delegates a morph-only in-place update when the host implements it. */
    UpdateMorphTargets(stage, targets, context = {})
    {
        RequireStage(stage, "committed");
        if (typeof this._operationHost?.UpdateMorphTargets !== "function")
        {
            return Promise.resolve({
                status: "unavailable",
                reason: "morph-update-unavailable"
            });
        }
        return this._operationHost.UpdateMorphTargets(stage, targets, context);
    }

    /** Exposes host-owned configured part isolation for diagnostics. */
    SetConfiguredPartDisplay(stage, partSourceRecordID, display)
    {
        RequireStage(stage, "committed");
        if (typeof this._visualHost.SetConfiguredPartDisplay !== "function")
        {
            throw new Error("GLES visual host cannot isolate configured parts");
        }
        return this._visualHost.SetConfiguredPartDisplay(
            stage,
            partSourceRecordID,
            display
        );
    }

    /** Exposes host-owned foundation isolation for diagnostics. */
    SetFoundationDisplay(stage, role, display)
    {
        RequireStage(stage, "committed");
        if (typeof this._visualHost.SetFoundationDisplay !== "function")
        {
            throw new Error("GLES visual host cannot isolate foundations");
        }
        return this._visualHost.SetFoundationDisplay(stage, role, display);
    }

    /** Returns only detached state needed by the CPU manager and diagnostics. */
    GetDiagnostics(stage)
    {
        if (!stage || typeof stage !== "object") return null;
        return {
            status: stage.status,
            sex: stage.sex,
            resourceCount: stage.resources?.length ?? 0,
            foundationRoles: [ ...(stage.foundationResources?.keys?.() ?? []) ],
            operationResults: stage.operationResults?.map(CloneResult) ?? [],
            host: typeof this._visualHost.GetDiagnostics === "function"
                ? this._visualHost.GetDiagnostics(stage)
                : null
        };
    }

    async _PrepareOperation(stage, operation, context)
    {
        if (!operation || typeof operation !== "object")
        {
            throw new TypeError("GLES appearance construction contains an invalid operation");
        }
        switch (operation.operation)
        {
            case "skeleton":
            {
                const resource = await this._FetchPrepared(stage, operation.resourcePath, context);
                await RequireSucceeded(
                    this._visualHost.SetSkeleton(stage, resource, operation, context),
                    "GLES visual host did not set skeleton"
                );
                return { operation: operation.operation, resourcePath: operation.resourcePath };
            }
            case "geometry":
            {
                const resource = await this._FetchPrepared(stage, operation.resourcePath, context);
                const binding = await this._visualHost.SetGeometry(
                    stage,
                    resource,
                    operation,
                    context
                );
                stage.foundationResources.set(operation.role, {
                    resource,
                    binding: binding ?? null,
                    operation: CloneOperation(operation)
                });
                return {
                    operation: operation.operation,
                    role: operation.role,
                    resourcePath: operation.resourcePath
                };
            }
            case "rebuild-areas":
                await RequireSucceeded(
                    this._visualHost.RebuildAreas(stage, operation, context),
                    "GLES visual host did not rebuild areas"
                );
                return { operation: operation.operation, shaderPath: operation.shaderPath };
            case "proof-textures":
                await RequireSucceeded(
                    this._visualHost.ApplyProofTextures(stage, operation, context),
                    "GLES visual host did not apply proof textures"
                );
                return { operation: operation.operation, profile: operation.profile };
            default:
                return this._ExecuteDelegatedOperation(stage, operation, context);
        }
    }

    async _ExecuteDelegatedOperation(stage, operation, context)
    {
        if (typeof this._operationHost?.Execute !== "function")
        {
            return {
                operation: operation.operation ?? "unknown",
                status: "deferred",
                reason: "backend-operation-host-unconfigured"
            };
        }
        const result = await this._operationHost.Execute(stage, operation, context);
        return {
            operation: operation.operation ?? "unknown",
            status: result?.status ?? "applied",
            ...(result && typeof result === "object" ? CloneResult(result) : { value: result ?? null })
        };
    }

    async _FetchPrepared(stage, path, context)
    {
        const resourcePath = RequireResourcePath(path);
        let resource = stage.resourcesByPath.get(resourcePath);
        if (resource) return resource;
        resource = await this._resourceHost.Fetch(resourcePath, context);
        if (!resource)
        {
            throw new Error("GLES resource host did not fetch " + resourcePath);
        }
        await RequireSucceeded(
            this._resourceHost.Watch(resource, context),
            "GLES resource host did not prepare " + resourcePath
        );
        stage.resourcesByPath.set(resourcePath, resource);
        stage.resources.push(resource);
        return resource;
    }
}

function RequireResourceHost(host)
{
    for (const name of [ "Fetch", "Watch", "Release" ])
    {
        if (typeof host?.[name] !== "function")
        {
            throw new TypeError("GLES appearance resourceHost." + name + " is required");
        }
    }
    return host;
}

function RequireVisualHost(host)
{
    for (const name of [
        "CreateCharacter",
        "SetSkeleton",
        "SetGeometry",
        "RebuildAreas",
        "ApplyProofTextures",
        "FinalizePrepared",
        "Commit",
        "Handoff",
        "Release"
    ])
    {
        if (typeof host?.[name] !== "function")
        {
            throw new TypeError("GLES appearance visualHost." + name + " is required");
        }
    }
    return host;
}

function RequireOptionalOperationHost(host)
{
    if (host !== null && host !== undefined && typeof host !== "object")
    {
        throw new TypeError("GLES appearance operationHost must be an object or null");
    }
    return host ?? null;
}

function RequireStage(stage, expectedStatus)
{
    if (!stage || stage.status !== expectedStatus)
    {
        throw new Error(
            "GLES appearance stage must be " + expectedStatus
            + "; received " + String(stage?.status ?? "missing")
        );
    }
}

function RequireSex(value)
{
    const sex = String(value ?? "").trim().toLowerCase();
    if (!sex) throw new TypeError("GLES appearance construction requires a sex");
    return sex;
}

function RequireResourcePath(value)
{
    const path = String(value ?? "").trim();
    if (!/^res:\//iu.test(path))
    {
        throw new TypeError("GLES appearance resource path must be a res:/ path");
    }
    return path;
}

async function RequireSucceeded(value, message)
{
    if ((await value) === false) throw new Error(message);
}

function CloneOperation(value)
{
    return {
        ...value,
        compatibility: value.compatibility ? {
            ...value.compatibility,
            bonePrefixes: [ ...(value.compatibility.bonePrefixes ?? []) ]
        } : value.compatibility
    };
}

function CloneResult(value)
{
    if (!value || typeof value !== "object") return value ?? null;
    return {
        ...value,
        ...(Array.isArray(value.resources) ? { resources: [ ...value.resources ] } : {}),
        ...(Array.isArray(value.foundationRoles)
            ? { foundationRoles: [ ...value.foundationRoles ] }
            : {})
    };
}

export default CjsCharacterGlesAppearanceAL;
