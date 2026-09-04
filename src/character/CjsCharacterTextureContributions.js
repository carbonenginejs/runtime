/** Validates the one-to-one identity relationship between plan layers and textures. */
export class CjsCharacterTextureContributions
{
    /**
     * Verifies that every expected appearance layer owns exactly one retained
     * texture contribution with the same part and selected group identity.
     */
    static validate(contributions, expected, label = "Character texture contributions")
    {
        if (!Array.isArray(contributions) || !Array.isArray(expected))
        {
            throw new TypeError(`${label} requires texture contributions and expected layers`);
        }
        if (contributions.length !== expected.length)
        {
            throw new Error(`${label} requires one texture contribution per expected layer`);
        }

        const expectedByLayer = new Map(expected.map(value => [ value.layerIndex, value ]));
        const seen = new Set();

        for (const contribution of contributions)
        {
            const layerIndex = contribution?.layerIndex;
            if (!Number.isSafeInteger(layerIndex)
                || layerIndex < 0
                || layerIndex >= expected.length
                || seen.has(layerIndex))
            {
                throw new Error(`${label} requires unique contiguous texture layer indices`);
            }

            const expectedContribution = expectedByLayer.get(layerIndex);
            if (!expectedContribution
                || contribution.partIndex !== expectedContribution.partIndex
                || String(contribution.groupID ?? "").trim() !== expectedContribution.groupID)
            {
                throw new Error(`${label} texture contribution identity does not match its layer`);
            }
            seen.add(layerIndex);
        }

        return contributions;
    }
}

export default CjsCharacterTextureContributions;
