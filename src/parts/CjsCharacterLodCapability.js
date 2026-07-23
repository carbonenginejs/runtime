import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsCharacterCapabilityCoverage } from "./CjsCharacterCapabilityCoverage.js";
import { CjsCharacterCapabilityRequirement } from "./CjsCharacterCapabilityRequirement.js";
import { CjsCharacterLodBundle } from "./CjsCharacterLodBundle.js";
import { CjsCharacterMeshCapability } from "./CjsCharacterMeshCapability.js";
import { CjsCharacterNode } from "../CjsCharacterNode.js";

@type.define({ className: "CjsCharacterLodCapability", family: "character" })
/** Capability evidence tied to one selected atomic character LOD target. */
export class CjsCharacterLodCapability extends CjsCharacterNode
{
    @type.int32
    @io.persist
    requestedLod = null;

    @type.int32
    @io.persist
    resolvedLod = null;

    @type.path
    @io.persist
    configurationPath = null;

    @type.path
    @io.persist
    geometryPath = null;

    @type.string
    @io.persist
    fallbackReason = null;

    @type.string
    @io.persist
    requirementID = "";

    @type.objectRef("CjsCharacterCapabilityCoverage")
    @io.persist
    skeletonCoverage = null;

    @type.objectRef("CjsCharacterCapabilityCoverage")
    @io.persist
    declaredMeshPaletteCoverage = null;

    @type.objectRef("CjsCharacterCapabilityCoverage")
    @io.persist
    activeMeshPaletteCoverage = null;

    @type.objectRef("CjsCharacterCapabilityCoverage")
    @io.persist
    morphCoverage = null;

    @type.list("CjsCharacterMeshCapability")
    @io.persist
    meshes = [];

    /** Builds a four-state report without collapsing independent evidence axes. */
    static inspect({
        lodBundle = null,
        requirement,
        skeletonBoneNames = null,
        meshes = null
    } = {})
    {
        const required = CjsCharacterCapabilityRequirement.prepare(requirement);
        const target = CjsCharacterLodCapability.getTargetIdentity(lodBundle);
        const meshReports = CjsCharacterLodCapability.inspectMeshes(meshes, required);
        const declared = CjsCharacterLodCapability.collectMeshCoverage(
            meshReports,
            "declaredPaletteCoverage",
            required.boneNames,
            meshes !== null
        );
        const active = CjsCharacterLodCapability.collectMeshCoverage(
            meshReports,
            "activePaletteCoverage",
            required.boneNames,
            meshes !== null
        );
        const morphs = CjsCharacterLodCapability.collectMeshCoverage(
            meshReports,
            "morphCoverage",
            required.morphNames,
            meshes !== null
        );

        return CjsCharacterLodCapability.from({
            ...target,
            requirementID: required.id,
            skeletonCoverage: CjsCharacterCapabilityCoverage.inspect(
                required.boneNames,
                skeletonBoneNames,
                { sourceComplete: skeletonBoneNames !== null && skeletonBoneNames !== undefined }
            ).GetValues(),
            declaredMeshPaletteCoverage: declared.GetValues(),
            activeMeshPaletteCoverage: active.GetValues(),
            morphCoverage: morphs.GetValues(),
            meshes: meshReports.map(value => value.GetValues())
        });
    }

    /** Extracts selected target identity without claiming that its resources loaded. */
    static getTargetIdentity(value)
    {
        if (!value || (typeof value !== "object" && typeof value !== "function"))
        {
            throw new TypeError("Character LOD capability requires an atomic LOD bundle");
        }

        const bundle = value instanceof CjsCharacterLodBundle ? value.GetValues() : value;
        const configurationPath = String(bundle.configurationPath ?? "");
        const geometryPath = String(bundle.geometryPath ?? "");

        if (!configurationPath || !geometryPath)
        {
            throw new Error("Character LOD capability requires complete configuration and geometry paths");
        }

        const requestedLod = CjsCharacterLodCapability.normalizeLod(bundle.requestedLod);
        const resolvedLod = CjsCharacterLodCapability.normalizeLod(bundle.resolvedLod ?? bundle.lod);

        return {
            requestedLod,
            resolvedLod,
            configurationPath,
            geometryPath,
            fallbackReason: bundle.fallbackReason ?? null
        };
    }

    /** Inspects caller-supplied mesh evidence in its stable source order. */
    static inspectMeshes(values, requirement)
    {
        if (values === null || values === undefined)
        {
            return [];
        }
        if (!Array.isArray(values))
        {
            throw new TypeError("Character LOD capability meshes must be an array or null");
        }

        const ids = new Set();
        return values.map(value =>
        {
            const result = CjsCharacterMeshCapability.inspect(value, requirement);
            if (ids.has(result.id))
            {
                throw new Error(`Character LOD capability contains duplicate mesh "${result.id}"`);
            }
            ids.add(result.id);
            return result;
        });
    }

    /** Combines per-mesh exact-name evidence while retaining unknown source coverage. */
    static collectMeshCoverage(meshes, field, requiredNames, sourcePresent = true)
    {
        const available = [];
        const names = new Set();
        let sourceComplete = Boolean(sourcePresent);

        for (const mesh of meshes)
        {
            const coverage = mesh[field];
            sourceComplete = sourceComplete && Boolean(coverage?.sourceComplete);

            for (const name of coverage?.availableNames || [])
            {
                if (!names.has(name))
                {
                    names.add(name);
                    available.push(name);
                }
            }
        }

        return CjsCharacterCapabilityCoverage.inspect(requiredNames, available, { sourceComplete });
    }

    /** Preserves absent LOD identity as null without inventing a tier. */
    static normalizeLod(value)
    {
        if (value === null || value === undefined)
        {
            return null;
        }

        const result = Number(value);
        if (!Number.isSafeInteger(result) || result < 0 || result > 2147483647)
        {
            throw new TypeError("Character LOD identity must be a non-negative signed 32-bit integer or null");
        }

        return result;
    }
}
