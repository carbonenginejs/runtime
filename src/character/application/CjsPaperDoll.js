import { meta, type } from "#schema";
import { CjsPaperDollDefinition } from "./CjsPaperDollDefinition.js";

/**
 * One paper doll character as a manager lists it: its definition (who and
 * what it is) and the instance built from it that is drawn (`front`).
 *
 * A `back` instance, built from edits while the front stays on screen and
 * swapped in when complete, is reserved for an edit mode and is not built
 * yet: with no back instance, edits rebuild the front in place, which is safe
 * because every binding composes synchronously before the frame.
 *
 * The doll owns what its character's composition and animation hold (each
 * character instance owns its composition targets, effects and caches;
 * operator, 2026-10-25, docs projects/character-graphene-demo.md): the
 * compositors and the animation's skeleton and clip resources are handed to
 * it when they are built, kept as fields, and released by `Destruct`.
 *
 * An application class (operator-approved character application); no Carbon
 * donor.
 */
@meta.define("CjsPaperDoll")
export class CjsPaperDoll
{

    /** Who and what this character is: identity, foundation and part settings. */
    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollDefinition")
    definition = new CjsPaperDollDefinition();

    /** The instance drawn on screen; null until one is built. */
    front = null;

    /** The instance an edit builds while `front` stays on screen; reserved, always null for now. */
    back = null;

    /**
     * The compositors this character's composition draws with (`CjsPaperDollCompositor`), set when it is built.
     * @type {object[]}
     */
    compositors = [];

    /**
     * The animation's skeleton resource; null until its animation is built.
     * @type {?object}
     */
    skeletonResource = null;

    /**
     * The animation's clip resources by path, as its animation loads them; null until its animation is built.
     * @type {?Map<string, object>}
     */
    animationResources = null;

    /**
     * @param {CjsPaperDollDefinition} [definition] The character's settings; a new, empty definition when omitted.
     */
    constructor(definition = new CjsPaperDollDefinition())
    {
        this.definition = definition;
    }

    /**
     * Applies the definition's pending edits to the front instance.
     * @returns {boolean} Whether any output was rebuilt; false with no front instance.
     * @throws {Error} Whatever the instance's bindings throw.
     */
    Update()
    {
        return this.front ? this.front.Update(this.definition) : false;
    }

    /**
     * Renews everything this character needs to be drawn, animated and recomposed, and answers whether all of it
     * is good: its compositors' effects, its skeleton and clips, and the geometry and area effects of its drawn
     * objects.
     *
     * For a character that is hidden entirely but should stay ready: whoever hid it calls this periodically
     * (well inside resMan's idle limit) so nothing it owns expires. A visible character does not need it, since
     * drawing and its update renew the same things, and a back-buffer character is renewed through its twin.
     *
     * The composers and the authored animation are Graphene's today, so they hand their compositors and resources
     * to the doll; moving them into the runtime character is a separate operator call.
     * @returns {boolean} Whether everything is good.
     */
    EnsureGood()
    {
        let good = true;
        for (const compositor of this.compositors) if (!compositor.EnsureGood()) good = false;
        if (this.skeletonResource && !this.skeletonResource.EnsureGood()) good = false;
        if (this.animationResources) for (const resource of this.animationResources.values()) if (!resource.EnsureGood()) good = false;
        if (this.front)
        {
            for (const object of this.front.objects)
            {
                const model = object.visualModel;
                if (!model) continue;
                if (model.geometryRes && !model.geometryRes.EnsureGood()) good = false;
                for (const mesh of model.GetMeshes())
                {
                    const geometry = mesh.GetGeometryResource();
                    if (!geometry || !geometry.EnsureGood()) good = false;
                    for (const area of mesh.GetAllAreas())
                    {
                        const material = area.GetMaterialInterface();
                        if (material && !material.EnsureGood()) good = false;
                    }
                }
            }
        }
        return good;
    }

    /**
     * Releases what the doll was handed, so nothing it owned is renewed through it again.
     * @returns {void}
     */
    Destruct()
    {
        this.compositors = [];
        this.skeletonResource = null;
        this.animationResources = null;
    }

}
