/**
 * Serializes one character's appearance realization and publishes only complete
 * staged revisions. The injected appearance AL owns resource and GPU work;
 * this CPU coordinator owns the revision and handoff contract.
 */
export class CjsCharacterAppearanceManager
{
    #adapter;

    #capabilities;

    #committed = null;

    #committedConstruction = null;

    #lastResult = null;

    #metrics = {
        requests: 0,
        prepares: 0,
        commits: 0,
        handoffs: 0,
        releases: 0,
        reused: 0,
        morphUpdates: 0,
        staleBeforePrepare: 0,
        staleAfterPrepare: 0,
        failures: 0,
        queueDepth: 0,
        peakQueueDepth: 0
    };

    #requestedRevision = 0;

    #tail = Promise.resolve();

    /** Creates a CPU lifecycle coordinator with an optional realization AL. */
    constructor({ adapter = null, capabilities = null } = {})
    {
        this.SetAdapter(adapter);
        this.#capabilities = NormalizeCapabilities(capabilities);
    }

    /** Replaces the appearance realization AL before work is queued. */
    SetAdapter(adapter = null)
    {
        if (adapter !== null
            && (typeof adapter?.Prepare !== "function"
                || typeof adapter?.Commit !== "function"
                || typeof adapter?.Release !== "function"))
        {
            throw new TypeError(
                "Character appearance AL must expose Prepare(construction, context), "
                + "Commit(stage, context), and Release(stage, context)"
            );
        }
        if (this.#metrics.queueDepth)
        {
            throw new Error("Cannot replace the character appearance AL while work is queued");
        }
        if (this.#committed)
        {
            throw new Error("Release the committed appearance before replacing its AL");
        }

        this.#adapter = adapter;
        return this;
    }

    /** Replaces the renderer-supplied capability description. */
    SetCapabilities(capabilities = null)
    {
        this.#capabilities = NormalizeCapabilities(capabilities);
        return this;
    }

    /** Describes only capabilities supplied by the current realization AL. */
    GetCapabilities()
    {
        const result = {
            ...this.#capabilities,
            adapterConnected: this.#adapter !== null
        };
        const maximumBones = result.maximumBones;
        const requiredBones = result.requiredBones;
        if (Number.isSafeInteger(maximumBones) && Number.isSafeInteger(requiredBones))
        {
            result.completeBonePalette = maximumBones >= requiredBones;
        }
        return result;
    }

    /** Returns current capabilities, lifecycle metrics, and the latest outcome. */
    GetState()
    {
        return {
            ...this.GetCapabilities(),
            lastResult: this.#lastResult ? { ...this.#lastResult } : null,
            metrics: { ...this.#metrics }
        };
    }

    /** Warms immutable configured-model templates when the current AL supports it. */
    WarmConfiguredModelTemplates(paths)
    {
        if (typeof this.#adapter?.WarmConfiguredModelTemplates !== "function")
        {
            return Promise.resolve({
                status: "unavailable",
                reason: "adapter-warm-unavailable"
            });
        }
        return this.#adapter.WarmConfiguredModelTemplates(paths);
    }

    /** Requests an AL-specific configured-part visibility diagnostic. */
    SetConfiguredPartDisplay(partSourceRecordID, display)
    {
        if (!this.#committed)
        {
            throw new Error("Character appearance manager has no committed appearance");
        }
        if (typeof this.#adapter?.SetConfiguredPartDisplay !== "function")
        {
            throw new Error("Character appearance AL cannot isolate configured parts");
        }

        const result = this.#adapter.SetConfiguredPartDisplay(
            this.#committed,
            partSourceRecordID,
            display
        );
        this.#RefreshCommittedDiagnostics();
        return result;
    }

    /** Requests an AL-specific foundation visibility diagnostic. */
    SetFoundationDisplay(role, display)
    {
        if (!this.#committed)
        {
            throw new Error("Character appearance manager has no committed appearance");
        }
        if (typeof this.#adapter?.SetFoundationDisplay !== "function")
        {
            throw new Error("Character appearance AL cannot isolate foundations");
        }

        const result = this.#adapter.SetFoundationDisplay(this.#committed, role, display);
        this.#RefreshCommittedDiagnostics();
        return result;
    }

    /** Queues one construction and prevents stale prepared work from publishing. */
    ApplyConstruction(construction, options = {})
    {
        if (!construction
            || typeof construction !== "object"
            || !Array.isArray(construction.operations))
        {
            return Promise.reject(
                new TypeError("Character appearance manager requires a construction sequence")
            );
        }

        const requestRevision = ++this.#requestedRevision;
        this.#metrics.requests++;
        this.#metrics.queueDepth++;
        this.#metrics.peakQueueDepth = Math.max(
            this.#metrics.peakQueueDepth,
            this.#metrics.queueDepth
        );

        const operation = this.#tail.then(() => this.#Apply(
            construction,
            requestRevision,
            options
        ));
        const tracked = operation.finally(() =>
        {
            this.#metrics.queueDepth = Math.max(0, this.#metrics.queueDepth - 1);
        });
        this.#tail = tracked.catch(() => undefined);
        return tracked.then(result =>
        {
            this.#lastResult = result;
            return result;
        });
    }

    /** Releases the current stage through the serialized lifecycle. */
    ReleaseCommitted({ reason = "released", source = this } = {})
    {
        const revision = ++this.#requestedRevision;
        const operation = this.#tail.then(async () =>
        {
            const committed = this.#committed;
            this.#committed = null;
            this.#committedConstruction = null;
            if (committed)
            {
                await this.#Release(committed, { reason, revision, source });
            }

            const result = { status: "released", revision };
            this.#lastResult = result;
            return result;
        });
        this.#tail = operation.catch(() => undefined);
        return operation;
    }

    /**
     * Invalidates queued work and immediately asks the current AL to release
     * the committed stage. This is a teardown path, not a replacement path.
     */
    Dispose({ reason = "disposed", source = this } = {})
    {
        const revision = ++this.#requestedRevision;
        const committed = this.#committed;
        this.#committed = null;
        this.#committedConstruction = null;

        const result = {
            status: "disposed",
            revision,
            released: Boolean(committed)
        };
        this.#lastResult = result;
        if (!committed || typeof this.#adapter?.Release !== "function") return result;

        const completion = this.#adapter.Release(committed, { reason, revision, source });
        if (completion && typeof completion.catch === "function")
        {
            completion.catch(() => undefined);
        }
        return result;
    }

    async #Apply(construction, requestRevision, options)
    {
        if (requestRevision !== this.#requestedRevision)
        {
            this.#metrics.staleBeforePrepare++;
            return {
                status: "stale",
                revision: requestRevision,
                skippedBeforePrepare: true
            };
        }
        if (!this.#adapter)
        {
            return {
                status: "deferred",
                reason: "adapter-not-configured",
                revision: requestRevision,
                capabilities: this.GetCapabilities()
            };
        }

        const constructionState = DescribeConstruction(construction);
        const appearanceChange = ApplyConstructionDomainInvalidations(
            CompareConstructionStates(this.#committedConstruction, constructionState),
            options.invalidateDomains
        );
        const context = {
            revision: requestRevision,
            appearancePlan: options.appearancePlan ?? null,
            source: options.source ?? this,
            construction,
            appearanceChange,
            previousAppearance: this.#committed
        };

        if (this.#committed
            && requestRevision === this.#requestedRevision
            && appearanceChange.identical)
        {
            const result = {
                status: "committed",
                revision: requestRevision,
                reused: true,
                reuseRule: "identical-construction",
                appearanceChange
            };
            this.#metrics.reused++;
            this.#AppendDiagnostics(result, this.#committed);
            return result;
        }

        if (this.#committed
            && appearanceChange.dirtyDomains.length === 1
            && appearanceChange.dirtyDomains[0] === "morphs"
            && typeof this.#adapter.UpdateMorphTargets === "function")
        {
            if (requestRevision !== this.#requestedRevision)
            {
                return { status: "stale", revision: requestRevision };
            }

            const update = await this.#adapter.UpdateMorphTargets(
                this.#committed,
                construction.morphTargets ?? [],
                context
            );
            this.#metrics.morphUpdates++;
            this.#committedConstruction = constructionState;
            if (requestRevision !== this.#requestedRevision)
            {
                return { status: "stale", revision: requestRevision };
            }

            const result = {
                status: "committed",
                revision: requestRevision,
                updatedInPlace: true,
                updateRule: "morph-only",
                appearanceChange,
                update
            };
            this.#AppendDiagnostics(result, this.#committed);
            return result;
        }

        this.#metrics.prepares++;
        let staged;
        try
        {
            staged = await this.#adapter.Prepare(construction, context);
        }
        catch (error)
        {
            this.#metrics.failures++;
            throw error;
        }

        if (requestRevision !== this.#requestedRevision)
        {
            this.#metrics.staleAfterPrepare++;
            await this.#Release(staged, { ...context, reason: "stale" });
            return { status: "stale", revision: requestRevision };
        }

        const previous = this.#committed;
        try
        {
            if (previous && typeof this.#adapter.Handoff === "function")
            {
                await this.#adapter.Handoff(previous, staged, context);
                this.#metrics.handoffs++;
            }
            else
            {
                await this.#adapter.Commit(staged, context);
                this.#metrics.commits++;
            }
            this.#committed = staged;
            this.#committedConstruction = constructionState;
        }
        catch (error)
        {
            this.#metrics.failures++;
            await this.#Release(staged, { ...context, reason: "commit-failed" });
            throw error;
        }

        if (previous && previous !== staged)
        {
            await this.#Release(previous, { ...context, reason: "replaced" });
        }

        const result = { status: "committed", revision: requestRevision };
        this.#AppendDiagnostics(result, staged);
        return result;
    }

    async #Release(value, context)
    {
        if (value && typeof this.#adapter?.Release === "function")
        {
            await this.#adapter.Release(value, context);
            this.#metrics.releases++;
        }
    }

    #AppendDiagnostics(result, appearance)
    {
        if (typeof this.#adapter?.GetDiagnostics === "function")
        {
            result.details = this.#adapter.GetDiagnostics(appearance);
        }
    }

    #RefreshCommittedDiagnostics()
    {
        if (this.#lastResult?.status === "committed")
        {
            this.#AppendDiagnostics(this.#lastResult, this.#committed);
        }
    }
}

const CONSTRUCTION_DOMAIN_NAMES = Object.freeze([
    "foundation",
    "geometry",
    "bodyComposition",
    "headComposition",
    "privateComposition",
    "morphs",
    "coverage"
]);

function NormalizeCapabilities(value)
{
    if (value === null || value === undefined) return {};
    if (typeof value !== "object" || Array.isArray(value))
    {
        throw new TypeError("Character appearance capabilities must be a plain object or null");
    }

    return { ...value };
}

function DescribeConstruction(construction)
{
    const contributions = Array.isArray(construction.textureContributions)
        ? construction.textureContributions
        : [];
    const bodyContributions = [];
    const headContributions = [];
    const privateContributions = [];

    for (const contribution of contributions)
    {
        const targets = CollectContributionTargets(contribution);
        const unresolved = targets.size === 0;
        if (unresolved && !HasCompositionTextureEvidence(contribution)) continue;
        if (unresolved || targets.has("body")) bodyContributions.push(contribution);
        if (unresolved || targets.has("head")) headContributions.push(contribution);
        if (unresolved || [ ...targets ].some(value => ![ "body", "head" ].includes(value)))
        {
            privateContributions.push(contribution);
        }
    }

    const operations = Array.isArray(construction.operations) ? construction.operations : [];
    const foundation = {};
    for (const key of Object.keys(construction))
    {
        if ([
            "operations",
            "textureContributions",
            "morphTargets",
            "evidence",
            "resolvedPartCount",
            "configuredPartCount",
            "deferredContributionCount"
        ].includes(key)) continue;
        foundation[key] = construction[key];
    }

    return {
        signature: StableSignature(construction),
        domains: {
            foundation: StableSignature({
                foundation,
                operations: operations.filter(value => value?.operation !== "configured-part"
                    && value?.operation !== "deferred-contribution")
            }),
            geometry: StableSignature(operations.map(value =>
            {
                if (!value || typeof value !== "object") return value;
                const { foundationCoverage, ...operation } = value;
                return operation;
            })),
            bodyComposition: StableSignature(bodyContributions),
            headComposition: StableSignature(headContributions),
            privateComposition: StableSignature(privateContributions),
            morphs: StableSignature(construction.morphTargets ?? []),
            coverage: StableSignature(operations.map(value => value?.foundationCoverage ?? null))
        }
    };
}

function HasCompositionTextureEvidence(value)
{
    if (!value || typeof value !== "object") return false;
    return [ "selectedTextures", "textureCandidates", "textures" ].some(key =>
        Array.isArray(value[key]) && value[key].length > 0);
}

function CompareConstructionStates(previous, next)
{
    if (!previous)
    {
        return {
            identical: false,
            initial: true,
            dirtyDomains: [ ...CONSTRUCTION_DOMAIN_NAMES ]
        };
    }

    const dirtyDomains = CONSTRUCTION_DOMAIN_NAMES.filter(
        name => previous.domains[name] !== next.domains[name]
    );
    const identical = previous.signature !== null && previous.signature === next.signature;
    return {
        identical,
        initial: false,
        dirtyDomains: identical ? [] : dirtyDomains.length ? dirtyDomains : [ "construction" ]
    };
}

function ApplyConstructionDomainInvalidations(changeSet, values = [])
{
    if (!Array.isArray(values))
    {
        throw new TypeError("Appearance invalidation domains must be an array");
    }
    if (!values.length) return changeSet;

    const invalidatedDomains = [];
    for (const value of values)
    {
        const domain = String(value ?? "").trim();
        if (!CONSTRUCTION_DOMAIN_NAMES.includes(domain))
        {
            throw new TypeError(
                `Unknown appearance invalidation domain ${JSON.stringify(domain)}`
            );
        }
        if (!invalidatedDomains.includes(domain)) invalidatedDomains.push(domain);
    }
    return {
        ...changeSet,
        identical: false,
        dirtyDomains: [ ...new Set([ ...changeSet.dirtyDomains, ...invalidatedDomains ]) ],
        invalidatedDomains
    };
}

function CollectContributionTargets(value, targets = new Set())
{
    if (!value || typeof value !== "object") return targets;
    if (Array.isArray(value))
    {
        for (const item of value) CollectContributionTargets(item, targets);
        return targets;
    }
    for (const [ key, item ] of Object.entries(value))
    {
        if (key === "target" && typeof item === "string" && item.trim())
        {
            targets.add(item.trim().toLowerCase());
        }
        else
        {
            CollectContributionTargets(item, targets);
        }
    }
    return targets;
}

function StableSignature(value)
{
    try
    {
        return JSON.stringify(NormalizeSignatureValue(value, new Set()));
    }
    catch
    {
        return null;
    }
}

function NormalizeSignatureValue(value, active)
{
    if (value === null || typeof value === "string" || typeof value === "boolean")
    {
        return value;
    }
    if (typeof value === "number")
    {
        return Number.isFinite(value) ? value : { $number: String(value) };
    }
    if (typeof value === "undefined") return { $undefined: true };
    if (typeof value !== "object") throw new TypeError("Unsupported construction value");
    if (active.has(value)) throw new TypeError("Cyclic construction value");

    active.add(value);
    let result;
    if (Array.isArray(value))
    {
        result = value.map(item => NormalizeSignatureValue(item, active));
    }
    else
    {
        result = {};
        for (const key of Object.keys(value).sort())
        {
            result[key] = NormalizeSignatureValue(value[key], active);
        }
    }
    active.delete(value);
    return result;
}

export default CjsCharacterAppearanceManager;
