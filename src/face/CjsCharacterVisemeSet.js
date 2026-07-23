import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsCharacterControlLayer } from "../controls/CjsCharacterControlLayer.js";
import { CjsCharacterCapabilityRequirement } from "../parts/CjsCharacterCapabilityRequirement.js";
import { CjsCharacterGStateParameterSink } from "../controls/CjsCharacterGStateParameterSink.js";
import { CjsCharacterNode } from "../CjsCharacterNode.js";
import { CjsCharacterViseme } from "./CjsCharacterViseme.js";

@type.define({ className: "CjsCharacterVisemeSet", family: "character" })
/** Ordered, data-driven speech controls for one authored character state graph. */
export class CjsCharacterVisemeSet extends CjsCharacterNode
{
    @type.string
    @io.persist
    id = "";

    @type.string
    @io.persist
    sex = null;

    @type.path
    @io.persist
    stateGraphPath = null;

    @type.string
    @io.persist
    parameterNode = "Visemes";

    @type.string
    @io.persist
    neutralVisemeID = null;

    @type.string
    @io.persist
    maskName = null;

    @type.list("string")
    @io.persist
    maskBoneNames = [];

    @type.list("CjsCharacterViseme")
    @io.persist
    visemes = [];

    /** Validates and hydrates a detached viseme set without changing exact names. */
    static prepare(value)
    {
        const result = CjsCharacterVisemeSet.from(
            value instanceof CjsCharacterVisemeSet ? value.GetValues() : value || {}
        );

        return CjsCharacterVisemeSet.validate(result);
    }

    /** Validates and normalizes one hydrated viseme set in place. */
    static validate(result)
    {
        if (!(result instanceof CjsCharacterVisemeSet))
        {
            throw new TypeError("Character viseme validation requires a CjsCharacterVisemeSet");
        }

        const id = CjsCharacterVisemeSet.normalizeID(result.id, "set");
        const parameterNode = CjsCharacterGStateParameterSink.normalizeName(result.parameterNode, "node");
        const ids = new Set();
        const parameters = new Set();

        for (const viseme of result.visemes)
        {
            const visemeID = CjsCharacterVisemeSet.normalizeID(viseme.id, "viseme");
            const parameterName = CjsCharacterGStateParameterSink.normalizeName(
                viseme.parameterName || visemeID,
                "parameter"
            );
            const minimum = Number(viseme.minimum);
            const maximum = Number(viseme.maximum);
            const defaultValue = Number(viseme.defaultValue);

            if (ids.has(visemeID))
            {
                throw new Error(`Viseme set "${id}" contains duplicate id "${visemeID}"`);
            }
            if (parameters.has(parameterName))
            {
                throw new Error(`Viseme set "${id}" contains duplicate parameter "${parameterName}"`);
            }
            if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum > maximum)
            {
                throw new TypeError(`Viseme "${visemeID}" has an invalid range`);
            }
            if (!Number.isFinite(defaultValue) || defaultValue < minimum || defaultValue > maximum)
            {
                throw new TypeError(`Viseme "${visemeID}" has a default outside its range`);
            }

            viseme.id = visemeID;
            viseme.parameterName = parameterName;
            viseme.minimum = minimum;
            viseme.maximum = maximum;
            viseme.defaultValue = defaultValue;
            ids.add(visemeID);
            parameters.add(parameterName);
        }

        const boneNames = new Set();
        result.maskBoneNames = result.maskBoneNames.map(value =>
        {
            const name = CjsCharacterGStateParameterSink.normalizeName(value, "bone");
            if (boneNames.has(name))
            {
                throw new Error(`Viseme set "${id}" contains duplicate mask bone "${name}"`);
            }
            boneNames.add(name);
            return name;
        });

        if (result.neutralVisemeID !== null && result.neutralVisemeID !== undefined)
        {
            result.neutralVisemeID = CjsCharacterVisemeSet.normalizeID(result.neutralVisemeID, "neutral viseme");
            if (!ids.has(result.neutralVisemeID))
            {
                throw new Error(`Viseme set "${id}" neutral id "${result.neutralVisemeID}" was not found`);
            }
        }

        result.id = id;
        result.parameterNode = parameterNode;
        return result;
    }

    /** Preserves exact, case-sensitive authored IDs while removing outer whitespace. */
    static normalizeID(value, label = "viseme")
    {
        if (typeof value !== "string" || !value.trim())
        {
            throw new TypeError(`Character ${label} id must be a non-empty string`);
        }

        return value.trim();
    }

    /** Extracts a filename-level viseme suffix for discovery, without remapping it. */
    static getIDFromAnimationPath(value)
    {
        const path = String(value ?? "").replace(/\\/gu, "/");
        const match = /(?:^|\/)\w+_viseme_([^/]+?)\.gr2$/iu.exec(path);
        return match ? match[1] : null;
    }

    /** Finds one exact authored viseme ID. */
    static getViseme(value, visemeID)
    {
        const set = CjsCharacterVisemeSet.#getPrepared(value);
        const id = CjsCharacterVisemeSet.normalizeID(visemeID);
        return CjsCharacterVisemeSet.#findViseme(set, id);
    }

    /** Returns the neutral parameter key for one exact authored viseme. */
    static getControlName(value, visemeID)
    {
        const set = CjsCharacterVisemeSet.#getPrepared(value);
        return CjsCharacterVisemeSet.#getControlName(set, visemeID);
    }

    /** Validates exact viseme weights without normalizing overlapping controls. */
    static validateWeights(value, weights)
    {
        const set = CjsCharacterVisemeSet.#getPrepared(value);
        return CjsCharacterVisemeSet.#validateWeights(set, weights);
    }

    static #validateWeights(set, weights)
    {
        const entries = weights instanceof Map
            ? [ ...weights.entries() ]
            : weights && typeof weights === "object" && !Array.isArray(weights)
                ? Object.entries(weights)
                : null;

        if (!entries)
        {
            throw new TypeError("Character viseme weights must be a map or object");
        }

        const result = new Map();
        for (const [ visemeID, value ] of entries)
        {
            const id = CjsCharacterVisemeSet.normalizeID(visemeID);
            const viseme = CjsCharacterVisemeSet.#findViseme(set, id);
            const weight = Number(value);

            if (!viseme)
            {
                throw new Error(`Viseme set "${set.id}" does not contain "${id}"`);
            }
            if (result.has(id))
            {
                throw new Error(`Character viseme weights contain duplicate id "${id}"`);
            }
            if (!Number.isFinite(weight) || weight < viseme.minimum || weight > viseme.maximum)
            {
                throw new RangeError(
                    `Viseme "${id}" weight must be between ${viseme.minimum} and ${viseme.maximum}`
                );
            }

            result.set(id, weight);
        }

        return result;
    }

    /** Creates one neutral character-control layer from simultaneous viseme weights. */
    static createControlLayer(value, weights, {
        id = "visemes",
        priority = 20,
        enabled = true,
        influence = 1,
        blendMode = "replace"
    } = {})
    {
        const set = CjsCharacterVisemeSet.#getPrepared(value);
        const parameters = new Map();

        for (const [ visemeID, weight ] of CjsCharacterVisemeSet.#validateWeights(set, weights))
        {
            parameters.set(CjsCharacterVisemeSet.#getControlName(set, visemeID), weight);
        }

        return CjsCharacterControlLayer.from({
            id,
            priority,
            enabled,
            influence,
            blendMode,
            parameters
        });
    }

    /** Creates a layer for the authored neutral/cancellation control only. */
    static createNeutralLayer(value, amount, options = {})
    {
        const set = CjsCharacterVisemeSet.#getPrepared(value);

        if (!set.neutralVisemeID)
        {
            throw new Error(`Viseme set "${set.id}" does not define a neutral control`);
        }

        return CjsCharacterVisemeSet.createControlLayer(
            set,
            { [set.neutralVisemeID]: amount },
            options
        );
    }

    /** Builds the exact facial-bone requirement declared by this set's authored mask. */
    static createCapabilityRequirement(value, { id = null, morphNames = [] } = {})
    {
        const set = CjsCharacterVisemeSet.#getPrepared(value);

        if (set.maskBoneNames.length === 0 && (!Array.isArray(morphNames) || morphNames.length === 0))
        {
            throw new Error(`Viseme set "${set.id}" does not provide facial capability names`);
        }

        return CjsCharacterCapabilityRequirement.prepare({
            id: id ?? `${set.id}-facial-rig`,
            boneNames: set.maskBoneNames,
            morphNames
        });
    }

    static #getPrepared(value)
    {
        return value instanceof CjsCharacterVisemeSet
            ? CjsCharacterVisemeSet.validate(value)
            : CjsCharacterVisemeSet.prepare(value);
    }

    static #findViseme(set, visemeID)
    {
        return set.visemes.find(viseme => viseme.id === visemeID) || null;
    }

    static #getControlName(set, visemeID)
    {
        const id = CjsCharacterVisemeSet.normalizeID(visemeID);
        const viseme = CjsCharacterVisemeSet.#findViseme(set, id);

        if (!viseme)
        {
            throw new Error(`Viseme set "${set.id}" does not contain "${id}"`);
        }

        return CjsCharacterGStateParameterSink.formatParameterName(
            set.parameterNode,
            viseme.parameterName
        );
    }
}
