import { blue } from "#blue";
import { CjsPaperDollCompositor } from "../compositor/CjsPaperDollCompositor.js";
import { CjsPaperDollDefinition } from "../CjsPaperDollDefinition.js";
import { PaperDollBlend } from "../paperDollOrder.js";
import { CjsCharacterTextureRoles } from "../../library/CjsCharacterTextureRoles.js";
import { CjsCharacterLibraryManager } from "../../library/CjsCharacterLibraryManager.js";

/**
 * The layer source of a map-decal part (`static blend = PaperDollBlend.DECAL`: aging, freckles, scarring, scars,
 * augmentations), whose options are folders of composed maps (`comp_<region>_<suffix>`). Each of an option's maps draws over the
 * composition output its role feeds (`CjsCharacterTextureRoles.lookup`: region, property, operation), whichever target
 * that output belongs to; the roles come from the files the option actually holds.
 *
 * The options, their parts and their maps are the parts library's (`blue.characterLibrary`: `FetchOptions`,
 * `FetchOptionPart`, `FetchOptionMaps` by the map decal rule, where a variation's maps replace the part folder's of the
 * same name). An option's part, maps and metadata (`occludesModifiers`) are read the first time it is applied
 * (`CjsPaperDollComponent.ResolveOption`).
 *
 * A role drawn through a coverage (`covered`) draws through the option's own diffuse alpha, placed at the diffuse's
 * cutout: a scar's specular is a uniform full-placement map that would otherwise cover the whole head. Derived: our
 * decision of 2026-10-25, matching Graphene's working behaviour, today's look (Graphene 6a47517 largeScars.js:46-55);
 * no source states it.
 *
 * Ours (no Carbon counterpart): Carbon ships no paper doll; the client's is Python. Moved from Graphene's
 * `surfaceDetails.js`, `freckleOptions.js`, `largeScars.js` and `augmentations.js` (character-structure-and-plugins.md
 * R5); the name is a working name.
 */
export class CjsPaperDollMapDecalSource
{

    static className = "CjsPaperDollMapDecalSource";

    /** The definition part this source serves. */
    name = "";

    /** The compositor its layers are made with. @type {CjsPaperDollCompositor} */
    _compositor = null;

    /** The build served: its waits and its content root. */
    _build = null;

    /** Each option, by id: the parts library's (`FetchOptions`). @type {Map<string, object>} */
    _definitions = new Map();

    /** Each prepared option: its id, type path, occlusion targets and per-region, per-property layers. @type {Map<string, object>} */
    _options = new Map();

    /**
     * @param {CjsPaperDollCompositor} compositor The compositor its layers are made with.
     * @param {{ Ready: function(Promise<*>): Promise<*>, content: { root: string, sex: string } }} build The build served.
     * @param {string} name The definition part.
     */
    constructor(compositor, build, name)
    {
        this._compositor = compositor;
        this._build = build;
        this.name = name;
    }


    /**
     * A source for every definition part whose class composes as a decal (`static blend = PaperDollBlend.DECAL`), each
     * configured and set on the composition.
     * @param {import("./CjsPaperDollComposition.js").CjsPaperDollComposition} composition The composition.
     * @param {import("../CjsPaperDollDefinition.js").CjsPaperDollDefinition} definition The paper doll definition.
     * @param {{ Ready: function(Promise<*>): Promise<*>, content: { root: string, sex: string } }} build The build served.
     * @returns {Promise<Map<string, CjsPaperDollMapDecalSource>>} The sources, by part.
     */
    static async prepareAll(composition, definition, build)
    {
        const sources = new Map();
        for (const name of CjsPaperDollDefinition.parts)
        {
            const type = definition[name].constructor;
            if (type.blend !== PaperDollBlend.DECAL) continue;
            const source = new CjsPaperDollMapDecalSource(composition.compositor, build, name);
            await source.Configure(definition);
            composition.SetSource(name, source);
            sources.set(name, source);
        }
        return sources;
    }

    /**
     * Takes the part's options from the parts library (`FetchOptions`) and configures the definition's component with
     * them: no option, off. What the part starts as is the character factory's (its defaults, or a loaded recipe's
     * DNA). The layers draw at full strength: the part has no weight.
     * @param {import("../CjsPaperDollDefinition.js").CjsPaperDollDefinition} definition The paper doll definition.
     * @returns {Promise<void>}
     */
    async Configure(definition)
    {
        const build = this._build, library = blue.characterLibrary, component = definition[this.name], category = CjsCharacterLibraryManager.partCategory(this.name);
        const options = await build.Ready(library.FetchOptions(build.content.sex, category));
        this._definitions = new Map(options.map(option => [ option.id, option ]));
        // An option's path is its part folder below the content root; occlusion matches against it.
        component.Configure(options.map(option => ({ id: option.id, path: option.path })), {
            option: "",
            resolve: async id =>
            {
                await this.Prepare(id);
                const prepared = this._options.get(id);
                return { path: prepared.path, occludes: prepared.occludes, colorAreas: [] };
            }
        });
        component.enabled = false;
    }

    /**
     * Reads an option's part and maps from the parts library and makes its layers, once.
     * @param {string} id The option.
     * @returns {Promise<void>}
     * @throws {Error} For a type with a colour variant; a variation with no folder that is not `v0`
     *   (`FetchOptionMaps`); or a map name the role lookup does not know or a role not drawn on its own.
     */
    async Prepare(id)
    {
        if (this._options.has(id)) return;
        const build = this._build, c = this._compositor, library = blue.characterLibrary, option = this._definitions.get(id);
        const part = await build.Ready(library.FetchOptionPart(option));
        if (part.colorVariant) throw Error("Unsupported map decal type " + option.typePath);
        // One map per name at the character texture quality; the variation's replace the part folder's of that name.
        const { paths } = await build.Ready(library.FetchOptionMaps(option));
        const roles = paths.map(file => CjsCharacterTextureRoles.lookup(file));
        // Per region and property, replacements before additions.
        roles.sort((a, b) => (a.plan === "add") - (b.plan === "add"));
        const regions = {};
        for (const role of roles)
        {
            if (!role.operation) throw Error("Unsupported map decal map " + role.path);
            const channels = regions[role.region] ??= {}, texture = await c.Texture(role.path);
            (channels[role.property] ??= []).push({ path: role.path, role, texture, region: CjsPaperDollCompositor.crop(texture), effect: null });
        }
        for (const channels of Object.values(regions)) for (const layer of Object.values(channels).flat())
        {
            // The coverage is the option's diffuse: one diffuse map per region, or an error.
            const owner = layer.role.covered ? CjsCharacterTextureRoles.one(channels.DiffuseMap ?? [], () => true) : null;
            if (owner) layer.region = owner.region;
            layer.effect = owner ? await c.Simple(layer.texture, owner.region, owner.texture, owner.region) : await c[layer.role.operation](layer.texture, layer.region);
        }
        // What the option occludes: its part's metadata (the variation's folder's first), each entry cut to its path.
        this._options.set(id, { id, definition: option.typePath, path: part.part, occludes: part.occludes, regions });
    }

    /**
     * Whether an option's maps are prepared (its first apply has finished loading them).
     * @param {string} id The option.
     * @returns {boolean}
     */
    IsPrepared(id)
    {
        return this._options.has(id);
    }

    /**
     * The option's layers for a region and channel, in drawing order; none when it has none there.
     * @param {{ option: string }} value The part's capture.
     * @param {string} region The output's region.
     * @param {string} channel The output's channel.
     * @returns {Array<{ effect: object, region: Float32Array }>}
     */
    GetLayers(value, region, channel)
    {
        const layers = this._options.get(value.option)?.regions[region]?.[channel] ?? [];
        return layers.map(layer => ({ effect: layer.effect, region: layer.region }));
    }

    /**
     * The prepared options, for the build report: each option's maps and cutouts.
     * @returns {object[]}
     */
    Describe()
    {
        return [ ...this._options.values() ].map(option => ({
            id: option.id,
            definition: option.definition,
            regions: Object.fromEntries(Object.entries(option.regions).map(([ region, channels ]) => [ region,
                Object.fromEntries(Object.entries(channels).map(([ channel, layers ]) => [ channel, layers.map(layer => ({ path: layer.path, cutout: Array.from(layer.region) })) ])) ]))
        }));
    }

}
