import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterCapabilityRequirement", family: "character" })
/** Exact named rig and morph controls required by one character feature. */
export class CjsCharacterCapabilityRequirement extends CjsCharacterNode
{
    @type.string
    @io.persist
    id = "";

    @type.list("string")
    @io.persist
    boneNames = [];

    @type.list("string")
    @io.persist
    morphNames = [];

    /** Validates and returns a detached requirement with stable exact names. */
    static prepare(value)
    {
        const result = CjsCharacterCapabilityRequirement.from(
            value instanceof CjsCharacterCapabilityRequirement ? value.GetValues() : value || {}
        );

        result.id = CjsCharacterCapabilityRequirement.normalizeName(result.id, "requirement id");
        result.boneNames = CjsCharacterCapabilityRequirement.normalizeNames(
            result.boneNames,
            "required bone"
        );
        result.morphNames = CjsCharacterCapabilityRequirement.normalizeNames(
            result.morphNames,
            "required morph"
        );
        return result;
    }

    /** Validates one exact name without case folding. */
    static normalizeName(value, label = "capability")
    {
        if (typeof value !== "string" || !value.trim())
        {
            throw new TypeError(`Character ${label} must be a non-empty string`);
        }

        return value.trim();
    }

    /** Validates a unique exact-name list while preserving caller order. */
    static normalizeNames(values, label = "capability")
    {
        if (!Array.isArray(values))
        {
            throw new TypeError(`Character ${label} names must be an array`);
        }

        const names = new Set();
        return values.map(value =>
        {
            const name = CjsCharacterCapabilityRequirement.normalizeName(value, label);
            if (names.has(name))
            {
                throw new Error(`Character ${label} names contain duplicate "${name}"`);
            }
            names.add(name);
            return name;
        });
    }
}
