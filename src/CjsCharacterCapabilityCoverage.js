import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsCharacterCapabilityRequirement } from "./CjsCharacterCapabilityRequirement.js";
import { CjsCharacterNode } from "./CjsCharacterNode.js";

@type.define({ className: "CjsCharacterCapabilityCoverage", family: "character" })
/** One independently evidenced complete, partial, none, or unknown capability axis. */
export class CjsCharacterCapabilityCoverage extends CjsCharacterNode
{
    @type.string
    @io.persist
    status = "unknown";

    @type.boolean
    @io.persist
    sourceComplete = false;

    @type.list("string")
    @io.persist
    requiredNames = [];

    @type.list("string")
    @io.persist
    availableNames = [];

    @type.list("string")
    @io.persist
    matchedNames = [];

    @type.list("string")
    @io.persist
    missingNames = [];

    @type.list("string")
    @io.persist
    unresolvedNames = [];

    /** Compares exact names while retaining whether the supplied evidence was complete. */
    static inspect(requiredNames, availableNames, { sourceComplete = availableNames !== null } = {})
    {
        const required = CjsCharacterCapabilityRequirement.normalizeNames(
            requiredNames || [],
            "required capability"
        );
        const available = availableNames === null || availableNames === undefined
            ? []
            : CjsCharacterCapabilityRequirement.normalizeNames(
                availableNames,
                "available capability"
            );
        const availableSet = new Set(available);
        const matched = required.filter(name => availableSet.has(name));
        const unobserved = required.filter(name => !availableSet.has(name));
        const complete = Boolean(sourceComplete);
        const missing = complete ? unobserved : [];
        const unresolved = complete ? [] : unobserved;
        let status;

        if (unobserved.length === 0)
        {
            status = "complete";
        }
        else if (!complete)
        {
            status = "unknown";
        }
        else if (matched.length === 0)
        {
            status = "none";
        }
        else
        {
            status = "partial";
        }

        return CjsCharacterCapabilityCoverage.from({
            status,
            sourceComplete: complete,
            requiredNames: required,
            availableNames: available,
            matchedNames: matched,
            missingNames: missing,
            unresolvedNames: unresolved
        });
    }
}
