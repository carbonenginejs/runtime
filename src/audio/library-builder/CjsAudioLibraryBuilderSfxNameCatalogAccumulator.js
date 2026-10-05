// CarbonEngineJS original (no Carbon counterpart).
import { CjsBnkFormat } from "#resource/formats/bnk";
import { CjsAudioLibraryBuilderUtils, WWISE_FILTERING_OVER_TIME_RAMP } from "./CjsAudioLibraryBuilderUtils.js";

/** Owns ordered Wwise name and default-value catalog accumulation. */
export class CjsAudioLibraryBuilderSfxNameCatalogAccumulator
{
    _groups = new Map();

    _parameters = new Map();

    _parameterDefaults = new Map();

    _parameterBuiltIns = new Map();

    _parameterTransitions = new Map();

    _stateFilterBehavior;

    _stateTransitionSettings = new Map();

    /** Adds authored names from parsed SoundbanksInfo metadata. */
    AddSoundbanksInfo(soundbanksInfo)
    {
        if (!soundbanksInfo)
        {
            return this;
        }

        const parsed = CjsBnkFormat.wwise.parseSoundbanksInfo(
            soundbanksInfo,
        );

        for (const bank of parsed.banks)
        {
            for (const [ scope, entries, valuesField ] of [
                [ "switch", bank.switchGroups, "switches" ],
                [ "state", bank.stateGroups, "states" ],
            ])
            {
                for (const entry of entries)
                {
                    this._AddGroup(scope, entry, valuesField);
                }
            }

            // SoundbanksInfo is an ordered authored catalog. Preserve its
            // historical later-bank-wins rule for duplicate parameter IDs.
            for (const parameter of bank.gameParameters)
            {
                this._parameters.set(
                    Number(parameter.id) >>> 0,
                    parameter.name,
                );
            }
        }
        return this;
    }

    /** Adds STMG state-transition and Game Parameter defaults in bank order. */
    AddInspections(inspections)
    {
        for (const inspection of inspections)
        {
            this._AddGlobalSettings(inspection?.globalSettings);
        }
        return this;
    }

    /** Adds optional external Game Parameter names and defaults last. */
    AddEnrichment(enrichment)
    {
        if (enrichment?.gameParameters === undefined)
        {
            return this;
        }

        for (const [ rawID, value ] of CjsAudioLibraryBuilderUtils.metadataEntries(
            enrichment.gameParameters,
            "Audio enrichment gameParameters",
        ))
        {
            const id = NormalizeGameParameterID(rawID);

            if (!value
                || typeof value !== "object"
                || Array.isArray(value))
            {
                throw new TypeError(
                    `Audio enrichment gameParameters.${rawID}`
                    + " must be an object",
                );
            }

            this._AddEnrichedParameterName(rawID, id, value);
            this._AddEnrichedParameterDefault(rawID, id, value);
        }
        return this;
    }

    /** Builds the unchanged plain catalog consumed by graph projection. */
    Build()
    {
        return {
            groups: this._groups,
            parameters: this._parameters,
            parameterDefaults: this._parameterDefaults,
            parameterBuiltIns: this._parameterBuiltIns,
            parameterTransitions: this._parameterTransitions,
            stateTransitions: this._CreateStateTransitions(),
            stateFilterBehavior: this._stateFilterBehavior,
        };
    }

    /** Merges one named Switch or State group and its values. */
    _AddGroup(scope, entry, valuesField)
    {
        const key = `${scope}:${Number(entry.id) >>> 0}`;
        const entryName = this._NormalizeOptionalName(entry.name);
        const group = this._groups.get(key) ?? {
            ...(entryName ? { name: entryName } : {}),
            values: new Map(),
        };

        if (entryName && group.name && group.name !== entryName)
        {
            throw new TypeError(
                `Audio ${scope} group ${entry.id}`
                + ` name conflicts between ${group.name}`
                + ` and ${entryName}`,
            );
        }
        if (entryName)
        {
            for (const [ otherKey, otherGroup ] of this._groups)
            {
                if (otherKey !== key
                    && otherKey.startsWith(`${scope}:`)
                    && otherGroup.name?.toLowerCase()
                        === entryName.toLowerCase())
                {
                    throw new TypeError(
                        `Audio ${scope} group ${entryName}`
                        + ` conflicts between ${otherKey} and ${key}`,
                    );
                }
            }
            group.name = entryName;
        }

        for (const value of entry[valuesField])
        {
            this._AddValueName(
                group.values,
                Number(value.id) >>> 0,
                value.name,
                `Audio ${scope} group ${entry.id}`,
            );
        }
        this._groups.set(key, group);
    }

    /** Validates and merges one inspection's optional STMG settings. */
    _AddGlobalSettings(globalSettings)
    {
        if (globalSettings === null || globalSettings === undefined)
        {
            return;
        }
        if (!globalSettings
            || typeof globalSettings !== "object"
            || !Array.isArray(globalSettings.rtpcParameters)
            || !Array.isArray(globalSettings.stateGroups))
        {
            throw new TypeError(
                "Audio STMG globalSettings must contain"
                + " stateGroups and rtpcParameters",
            );
        }

        const filterBehavior = globalSettings.filterBehavior === undefined
            ? undefined
            : Number(globalSettings.filterBehavior);

        if (filterBehavior !== undefined
            && (!Number.isSafeInteger(filterBehavior)
                || filterBehavior < 0
                || filterBehavior > 1))
        {
            throw new TypeError(
                `Audio STMG filterBehavior ${globalSettings.filterBehavior} is invalid`,
            );
        }
        if (filterBehavior !== undefined
            && this._stateFilterBehavior !== undefined
            && this._stateFilterBehavior !== filterBehavior)
        {
            throw new TypeError(
                "Audio STMG filterBehavior conflicts between banks",
            );
        }
        if (filterBehavior !== undefined)
        {
            this._stateFilterBehavior = filterBehavior;
        }

        for (const rawGroup of globalSettings.stateGroups)
        {
            this._AddStateTransitionSettings(rawGroup);
        }
        for (const parameter of globalSettings.rtpcParameters)
        {
            this._AddParameterDefault(parameter);
        }
    }

    /** Validates and merges one STMG State group's transition settings. */
    _AddStateTransitionSettings(rawGroup)
    {
        if (!rawGroup
            || typeof rawGroup !== "object"
            || Array.isArray(rawGroup)
            || !Array.isArray(rawGroup.transitions))
        {
            throw new TypeError(
                "Audio STMG State group must contain transitions",
            );
        }
        const id = CjsAudioLibraryBuilderUtils.normalizeWwiseUint32(
            rawGroup.id,
            "Audio STMG State group id",
        );
        const defaultTransitionMs = CjsAudioLibraryBuilderUtils.normalizeWwiseUint32(
            rawGroup.defaultTransitionTimeMs,
            `Audio STMG State group ${id} defaultTransitionTimeMs`,
        );
        const routes = new Set();
        const transitions = rawGroup.transitions.map((raw, index) =>
        {
            if (!raw
                || typeof raw !== "object"
                || Array.isArray(raw))
            {
                throw new TypeError(
                    `Audio STMG State group ${id}`
                    + ` transition ${index} must be an object`,
                );
            }
            const fromId = CjsAudioLibraryBuilderUtils.normalizeWwiseUint32(
                raw.fromId,
                `Audio STMG State group ${id} transition ${index} fromId`,
            );
            const toId = CjsAudioLibraryBuilderUtils.normalizeWwiseUint32(
                raw.toId,
                `Audio STMG State group ${id} transition ${index} toId`,
            );
            const route = `${fromId}:${toId}`;

            if (routes.has(route))
            {
                throw new TypeError(
                    `Audio STMG State group ${id}`
                    + ` has duplicate transition ${route}`,
                );
            }
            routes.add(route);
            return {
                fromId,
                toId,
                transitionMs: CjsAudioLibraryBuilderUtils.normalizeWwiseUint32(
                    raw.transitionTimeMs,
                    `Audio STMG State group ${id}`
                    + ` transition ${index} transitionTimeMs`,
                ),
            };
        }).sort((left, right) =>
            left.fromId - right.fromId || left.toId - right.toId);
        const normalized = { id, defaultTransitionMs, transitions };
        const existing = this._stateTransitionSettings.get(id);

        if (existing
            && JSON.stringify(existing) !== JSON.stringify(normalized))
        {
            throw new TypeError(
                `Audio STMG State group ${id} has conflicting settings`,
            );
        }
        this._stateTransitionSettings.set(id, normalized);
    }

    /** Validates and merges one STMG Game Parameter default. */
    _AddParameterDefault(parameter)
    {
        if (!parameter
            || typeof parameter !== "object"
            || Array.isArray(parameter))
        {
            throw new TypeError(
                "Audio STMG RTPC parameter must be an object",
            );
        }
        const id = NormalizeGameParameterID(parameter.id);
        const defaultValue = Number(parameter.defaultValue);

        if (!Number.isFinite(defaultValue))
        {
            throw new TypeError(
                `Audio STMG game parameter ${id}`
                + " defaultValue must be finite",
            );
        }
        const existing = this._parameterDefaults.get(id);

        if (existing !== undefined && existing !== defaultValue)
        {
            throw new TypeError(
                `Audio STMG game parameter ${id}`
                + ` defaultValue conflicts with ${existing}`,
            );
        }
        this._parameterDefaults.set(id, defaultValue);
        const builtInParameter = parameter.builtInParameter === undefined
            ? undefined
            : Number(parameter.builtInParameter);

        if (builtInParameter !== undefined
            && (!Number.isSafeInteger(builtInParameter)
                || builtInParameter < 0
                || builtInParameter > 255))
        {
            throw new TypeError(
                `Audio STMG game parameter ${id}`
                + " builtInParameter is invalid",
            );
        }
        const existingBuiltIn = this._parameterBuiltIns.get(id);

        if (builtInParameter !== undefined
            && existingBuiltIn !== undefined
            && existingBuiltIn !== builtInParameter)
        {
            throw new TypeError(
                `Audio STMG game parameter ${id}`
                + ` builtInParameter conflicts with ${existingBuiltIn}`,
            );
        }
        if (builtInParameter !== undefined)
        {
            this._parameterBuiltIns.set(id, builtInParameter);
        }
        const hasTransition = parameter.rampType !== undefined
            || parameter.rampUp !== undefined
            || parameter.rampDown !== undefined;

        if (!hasTransition) return;
        const rampType = Number(parameter.rampType);
        const rampUpSeconds = Number(parameter.rampUp);
        const rampDownSeconds = Number(parameter.rampDown);

        if (!Number.isSafeInteger(rampType)
            || rampType < 0
            || rampType > WWISE_FILTERING_OVER_TIME_RAMP
            || !Number.isFinite(rampUpSeconds)
            || rampUpSeconds < 0
            || !Number.isFinite(rampDownSeconds)
            || rampDownSeconds < 0)
        {
            throw new TypeError(
                `Audio STMG game parameter ${id}`
                + " transition settings are invalid",
            );
        }
        const transition = { rampType, rampUpSeconds, rampDownSeconds };
        const existingTransition = this._parameterTransitions.get(id);

        if (existingTransition
            && JSON.stringify(existingTransition)
                !== JSON.stringify(transition))
        {
            throw new TypeError(
                `Audio STMG game parameter ${id}`
                + " transition settings conflict between banks",
            );
        }
        this._parameterTransitions.set(id, transition);
    }

    /** Merges one optional enrichment Game Parameter name. */
    _AddEnrichedParameterName(rawID, id, value)
    {
        if (value.name === undefined)
        {
            return;
        }
        const name = String(value.name).trim();

        if (!name)
        {
            throw new TypeError(
                `Audio enrichment gameParameters.${rawID}`
                + " name must be non-empty",
            );
        }
        const existing = this._parameters.get(id);

        if (existing && existing !== name)
        {
            throw new TypeError(
                `Audio enrichment gameParameters.${rawID}`
                + ` name conflicts with ${existing}`,
            );
        }
        this._parameters.set(id, name);
    }

    /** Merges one optional enrichment Game Parameter default. */
    _AddEnrichedParameterDefault(rawID, id, value)
    {
        if (value.defaultValue === undefined)
        {
            return;
        }
        const defaultValue = Number(value.defaultValue);

        if (!Number.isFinite(defaultValue))
        {
            throw new TypeError(
                `Audio enrichment gameParameters.${rawID}`
                + " defaultValue must be finite",
            );
        }
        const existing = this._parameterDefaults.get(id);

        if (existing !== undefined && existing !== defaultValue)
        {
            throw new TypeError(
                `Audio enrichment gameParameters.${rawID}`
                + ` defaultValue conflicts with ${existing}`,
            );
        }
        this._parameterDefaults.set(id, defaultValue);
    }

    /** Projects normalized State settings with any known authored names. */
    _CreateStateTransitions()
    {
        return [ ...this._stateTransitionSettings.values() ]
            .sort((left, right) => left.id - right.id)
            .map(settings =>
            {
                const named = this._groups.get(`state:${settings.id}`);

                return {
                    groupId: String(settings.id),
                    ...(named?.name ? { group: named.name } : {}),
                    defaultTransitionMs: settings.defaultTransitionMs,
                    ...(named?.values.size
                        ? {
                            states: [ ...named.values ]
                                .sort((left, right) => left[0] - right[0])
                                .map(([ stateId, state ]) => ({
                                    stateId: String(stateId),
                                    state,
                                })),
                        }
                        : {}),
                    transitions: settings.transitions.map(transition => ({
                        fromId: String(transition.fromId),
                        ...(named?.values.has(transition.fromId)
                            ? { from: named.values.get(transition.fromId) }
                            : {}),
                        toId: String(transition.toId),
                        ...(named?.values.has(transition.toId)
                            ? { to: named.values.get(transition.toId) }
                            : {}),
                        transitionMs: transition.transitionMs,
                    })),
                };
            });
    }

    /** Adds one optional value name while enforcing per-group uniqueness. */
    _AddValueName(values, id, rawName, label)
    {
        const name = this._NormalizeOptionalName(rawName);

        if (!name)
        {
            return;
        }
        const existing = values.get(id);

        if (existing !== undefined && existing !== name)
        {
            throw new TypeError(
                `${label} value ${id} name conflicts between`
                + ` ${existing} and ${name}`,
            );
        }
        for (const [ otherId, otherName ] of values)
        {
            if (otherId !== id
                && otherName.toLowerCase() === name.toLowerCase())
            {
                throw new TypeError(
                    `${label} value ${name} conflicts between`
                    + ` ${otherId} and ${id}`,
                );
            }
        }
        values.set(id, name);
    }

    /** Trims one optional authored catalog name. */
    _NormalizeOptionalName(value)
    {
        const name = String(value ?? "").trim();

        return name || undefined;
    }
}

function NormalizeGameParameterID(value)
{
    const text = String(value);
    const number = Number(text);

    if (!/^(?:0|[1-9]\d*)$/u.test(text)
        || !Number.isSafeInteger(number)
        || number < 0
        || number > 0xffffffff)
    {
        throw new TypeError(
            `Audio game parameter ID ${text} must be uint32`,
        );
    }

    return number >>> 0;
}
