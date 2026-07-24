import { CjsCharacterBlendshapeLimits } from "../deformation/CjsCharacterBlendshapeLimits.js";
import { CjsCharacterControlLayer } from "./CjsCharacterControlLayer.js";
import { CjsCharacterControlState } from "./CjsCharacterControlState.js";
import { CjsCharacterGraph } from "../library/CjsCharacterGraph.js";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";

const BLEND_MODES = new Set([ "add", "replace" ]);

/** Pure deterministic composer for authored, expression, viseme, and similar controls. */
export class CjsCharacterControlApplicator
{
    /** Composes layers without mutating the source graph or any input layer. */
    Compose(graph, layers, { limits = null } = {})
    {
        if (!(graph instanceof CjsCharacterGraph))
        {
            throw new TypeError("Character controls require a CjsCharacterGraph");
        }
        if (!Array.isArray(layers))
        {
            throw new TypeError("Character control layers must be an array");
        }

        const morphs = new Map(ReadScalarEntries(graph.morphs, "graph morphs"));
        const parameters = new Map();
        const boneOffsets = new Map();
        const prepared = PrepareLayers(layers);
        const appliedLayerIDs = [];
        let activePose = ValidatePose(graph.activePose, "graph active pose");

        for (const layer of prepared)
        {
            if (!layer.enabled || layer.influence === 0)
            {
                continue;
            }

            for (const [ name, value ] of layer.morphs)
            {
                ComposeScalar(morphs, name, value, layer, "morph");
            }

            for (const [ name, value ] of layer.parameters)
            {
                ComposeScalar(parameters, name, value, layer, "parameter");
            }

            for (const [ name, value ] of layer.boneOffsets)
            {
                ComposeVector(boneOffsets, name, value, layer);
            }

            if (layer.activePose !== null)
            {
                activePose = layer.activePose;
            }

            appliedLayerIDs.push(layer.id);
        }

        ApplyLimits(morphs, limits);

        return CjsCharacterControlState.from({
            morphs,
            parameters,
            boneOffsets,
            activePose,
            appliedLayerIDs
        });
    }
}

function PrepareLayers(values)
{
    const ids = new Set();

    return values.map((value, index) =>
    {
        const layer = value instanceof CjsCharacterControlLayer
            ? value
            : CjsCharacterControlLayer.from(value || {});
        const id = ValidateIdentifier(layer.id, `control layer ${index} id`);
        const priority = Number(layer.priority);
        const influence = Number(layer.influence);

        if (ids.has(id))
        {
            throw new Error(`Duplicate character control layer id "${id}"`);
        }
        ids.add(id);

        if (!Number.isSafeInteger(priority) || priority < -2147483648 || priority > 2147483647)
        {
            throw new TypeError(`Character control layer "${id}" priority must be a signed 32-bit integer`);
        }
        if (!Number.isFinite(influence) || influence < 0 || influence > 1)
        {
            throw new TypeError(`Character control layer "${id}" influence must be between 0 and 1`);
        }
        if (!BLEND_MODES.has(layer.blendMode))
        {
            throw new TypeError(`Character control layer "${id}" has unsupported blend mode "${layer.blendMode}"`);
        }

        return {
            id,
            index,
            priority,
            enabled: layer.enabled,
            influence,
            blendMode: layer.blendMode,
            morphs: ReadScalarEntries(layer.morphs, `control layer "${id}" morphs`),
            parameters: ReadScalarEntries(layer.parameters, `control layer "${id}" parameters`),
            boneOffsets: ReadVectorEntries(layer.boneOffsets, `control layer "${id}" bone offsets`),
            activePose: ValidateLayerPose(layer.activePose, `control layer "${id}" active pose`)
        };
    }).sort((left, right) => left.priority - right.priority || left.index - right.index);
}

function ReadScalarEntries(value, label)
{
    const entries = value instanceof Map
        ? [ ...value.entries() ]
        : value && typeof value === "object" && !Array.isArray(value)
            ? Object.entries(value)
            : null;

    if (!entries)
    {
        throw new TypeError(`${label} must be a map or object`);
    }

    const names = new Set();
    return entries.map(([ name, value ]) =>
    {
        const normalizedName = ValidateIdentifier(name, `${label} name`);
        const weight = Number(value);

        if (names.has(normalizedName))
        {
            throw new Error(`${label} contains duplicate name "${normalizedName}"`);
        }
        names.add(normalizedName);

        if (!Number.isFinite(weight))
        {
            throw new TypeError(`${label} value for "${normalizedName}" must be finite`);
        }

        return [ normalizedName, weight ];
    }).sort(([ left ], [ right ]) => Compare(left, right));
}

function ReadVectorEntries(value, label)
{
    const entries = value instanceof Map
        ? [ ...value.entries() ]
        : value && typeof value === "object" && !Array.isArray(value)
            ? Object.entries(value)
            : null;

    if (!entries)
    {
        throw new TypeError(`${label} must be a map or object`);
    }

    const names = new Set();
    return entries.map(([ name, value ]) =>
    {
        const normalizedName = ValidateIdentifier(name, `${label} name`);

        if (names.has(normalizedName))
        {
            throw new Error(`${label} contains duplicate name "${normalizedName}"`);
        }
        names.add(normalizedName);

        if (!value || value.length !== 3)
        {
            throw new TypeError(`${label} value for "${normalizedName}" must contain three components`);
        }

        const result = vec3.fromValues(Number(value[0]), Number(value[1]), Number(value[2]));
        if (!VectorIsFinite(result))
        {
            throw new TypeError(`${label} value for "${normalizedName}" must be finite`);
        }

        return [ normalizedName, result ];
    }).sort(([ left ], [ right ]) => Compare(left, right));
}

function ComposeScalar(target, name, value, layer, kind)
{
    const current = target.get(name) ?? 0;
    const next = layer.blendMode === "add"
        ? current + value * layer.influence
        : current + (value - current) * layer.influence;

    if (!Number.isFinite(next))
    {
        throw new RangeError(`Character control layer "${layer.id}" ${kind} "${name}" overflowed`);
    }

    target.set(name, next);
}

function ComposeVector(target, name, value, layer)
{
    const current = target.get(name);
    const result = vec3.create();

    for (let index = 0; index < 3; index++)
    {
        const currentValue = current ? current[index] : 0;
        result[index] = layer.blendMode === "add"
            ? currentValue + value[index] * layer.influence
            : currentValue + (value[index] - currentValue) * layer.influence;

        if (!Number.isFinite(result[index]))
        {
            throw new RangeError(`Character control layer "${layer.id}" bone offset "${name}" overflowed`);
        }
    }

    target.set(name, result);
}

function ApplyLimits(morphs, value)
{
    if (value === null || value === undefined)
    {
        return;
    }

    const limits = value instanceof CjsCharacterBlendshapeLimits
        ? value
        : CjsCharacterBlendshapeLimits.from(value);

    for (const [ name, range ] of ReadLimitEntries(limits.limits))
    {
        if (!morphs.has(name))
        {
            continue;
        }

        morphs.set(name, Math.max(range[0], Math.min(range[1], morphs.get(name))));
    }
}

function ReadLimitEntries(value)
{
    const entries = value instanceof Map
        ? [ ...value.entries() ]
        : value && typeof value === "object" && !Array.isArray(value)
            ? Object.entries(value)
            : null;

    if (!entries)
    {
        throw new TypeError("Character blendshape limits must be a map or object");
    }

    return entries.map(([ name, range ]) =>
    {
        const normalizedName = ValidateIdentifier(name, "blendshape limit name");

        if (!range || range.length < 2)
        {
            throw new TypeError(`Character blendshape limit "${normalizedName}" requires a minimum and maximum`);
        }

        const minimum = Number(range[0]);
        const maximum = Number(range[1]);

        if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum > maximum)
        {
            throw new TypeError(`Character blendshape limit "${normalizedName}" is invalid`);
        }

        return [ normalizedName, [ minimum, maximum ] ];
    });
}

function ValidateIdentifier(value, label)
{
    if (typeof value !== "string" || !value.trim())
    {
        throw new TypeError(`${label} must be a non-empty string`);
    }

    return value.trim();
}

function ValidatePose(value, label)
{
    if (typeof value !== "string")
    {
        throw new TypeError(`${label} must be a string`);
    }

    return value;
}

function ValidateLayerPose(value, label)
{
    if (value === null || value === undefined)
    {
        return null;
    }
    return ValidatePose(value, label);
}

function VectorIsFinite(value)
{
    return Number.isFinite(value[0])
        && Number.isFinite(value[1])
        && Number.isFinite(value[2]);
}

function Compare(left, right)
{
    return String(left).localeCompare(String(right), "en", { numeric: true });
}
