import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterCapabilityCoverage } from "./CjsCharacterCapabilityCoverage.js";
import { CjsCharacterCapabilityRequirement } from "./CjsCharacterCapabilityRequirement.js";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterMeshCapability", family: "character" })
/** Per-mesh evidence that keeps declared and actively referenced palettes distinct. */
export class CjsCharacterMeshCapability extends CjsCharacterNode
{
    @type.string
    @io.persist
    id = "";

    @type.objectRef("CjsCharacterCapabilityCoverage")
    @io.persist
    declaredPaletteCoverage = null;

    @type.objectRef("CjsCharacterCapabilityCoverage")
    @io.persist
    activePaletteCoverage = null;

    @type.objectRef("CjsCharacterCapabilityCoverage")
    @io.persist
    morphCoverage = null;

    /**
     * Builds independent exact-name coverage from one normalized mesh descriptor.
     * activeBoneNames must contain only bindings referenced by non-zero vertex
     * influence weights; blend indices in zero-weight lanes are not active.
     */
    static inspect(value, requirement)
    {
        const source = value || {};
        const required = CjsCharacterCapabilityRequirement.prepare(requirement);
        const id = CjsCharacterCapabilityRequirement.normalizeName(source.id, "mesh id");
        const declaredPaletteCoverage = CjsCharacterCapabilityCoverage.inspect(
            required.boneNames,
            source.declaredBoneNames ?? null,
            { sourceComplete: source.declaredBoneNames !== null && source.declaredBoneNames !== undefined }
        );
        const activePaletteCoverage = CjsCharacterCapabilityCoverage.inspect(
            required.boneNames,
            source.activeBoneNames ?? null,
            { sourceComplete: source.activeBoneNames !== null && source.activeBoneNames !== undefined }
        );

        CjsCharacterMeshCapability.validatePaletteRelationship(
            id,
            declaredPaletteCoverage,
            activePaletteCoverage
        );

        return CjsCharacterMeshCapability.from({
            id,
            declaredPaletteCoverage: declaredPaletteCoverage.GetValues(),
            activePaletteCoverage: activePaletteCoverage.GetValues(),
            morphCoverage: CjsCharacterCapabilityCoverage.inspect(
                required.morphNames,
                source.morphTargetNames ?? null,
                { sourceComplete: source.morphTargetNames !== null && source.morphTargetNames !== undefined }
            ).GetValues()
        });
    }

    /** Requires proven active bindings to be a subset of a complete declared palette. */
    static validatePaletteRelationship(meshID, declaredCoverage, activeCoverage)
    {
        if (!declaredCoverage?.sourceComplete || !activeCoverage?.sourceComplete)
        {
            return true;
        }

        const declared = new Set(declaredCoverage.availableNames);
        const invalid = activeCoverage.availableNames.filter(name => !declared.has(name));

        if (invalid.length)
        {
            throw new Error(
                `Character mesh "${meshID}" active palette contains undeclared bone "${invalid[0]}"`
            );
        }

        return true;
    }
}
