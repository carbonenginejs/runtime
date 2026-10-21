import { CjsSchema, meta } from "#schema";
// Source: trinity/shadercompiler/EffectData.h:366-458

import { Vector4 } from "./Vector4.js";

const ORDER = [
    "comparison", "minFilter", "magFilter", "mipFilter", "addressU", "addressV", "addressW", "mipLODBias", "maxAnisotropy",
    "comparisonFunc"
];

/**
 * A stage's sampler state: Carbon's `Sampler`. Its register is its key in
 * `StageData.samplers`. Filters are D3D9-style (`D3DTEXF_*`), addresses and
 * comparisons D3D11 values; `filter` and `srgbTexture` are not saved.
 */
export class Sampler
{
    name = "";

    filter = 0;

    comparison = 0;

    minFilter = 0;

    magFilter = 0;

    mipFilter = 0;

    addressU = 0;

    addressV = 0;

    addressW = 0;

    mipLODBias = 0;

    maxAnisotropy = 0;

    comparisonFunc = 0;

    borderColor = new Vector4();

    minLOD = 0;

    maxLOD = 0;

    srgbTexture = 0;

    isDynamic = 0;

    /**
     * Carbon's `operator==`, which ignores `name`, `filter` and `srgbTexture`.
     *
     * @param {Sampler} sampler The sampler to compare with.
     * @returns {boolean} Whether the saved state matches.
     */
    Equals(sampler)
    {
        return ORDER.every(field => this[field] === sampler[field]) &&
            this.borderColor.x === sampler.borderColor.x && this.borderColor.y === sampler.borderColor.y &&
            this.borderColor.z === sampler.borderColor.z && this.borderColor.w === sampler.borderColor.w &&
            this.minLOD === sampler.minLOD && this.maxLOD === sampler.maxLOD && this.isDynamic === sampler.isDynamic;
    }

    /**
     * Carbon's `operator<`: field by field in declaration order.
     *
     * @param {Sampler} sampler The sampler to compare with.
     * @returns {boolean} Whether this sampler orders first.
     */
    Less(sampler)
    {
        const values = s => [...ORDER.map(field => s[field]), s.borderColor.x, s.borderColor.y, s.borderColor.z, s.borderColor.w, s.minLOD, s.maxLOD, s.isDynamic];
        const mine = values(this);
        const theirs = values(sampler);
        for (let i = 0; i < mine.length; ++i)
        {
            if (mine[i] < theirs[i])
            {
                return true;
            }
            if (mine[i] > theirs[i])
            {
                return false;
            }
        }
        return false;
    }
}

CjsSchema.decorateMethod(Sampler, "Equals", meta.renamed("operator=="));
CjsSchema.decorateMethod(Sampler, "Less", meta.renamed("operator<"));
CjsSchema.meta.carbon("Sampler")(Sampler);
