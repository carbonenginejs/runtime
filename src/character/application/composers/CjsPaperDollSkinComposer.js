import { blue } from "#blue";
import { CjsPaperDollCompositor } from "../compositor/CjsPaperDollCompositor.js";
import { CjsPaperDollMaterialLayer } from "../compositor/CjsPaperDollMaterialLayer.js";
import { PaperDollTarget } from "../paperDollOrder.js";
import { CjsPaperDollComposition } from "./CjsPaperDollComposition.js";
import { CjsCharacterTextureRoles } from "../../library/CjsCharacterTextureRoles.js";

/**
 * A paper doll's skin target, the first of `CjsPaperDollInstance.targetOrder`, in the composition: two outputs (head and
 * body diffuse), each based on the selected foundation's diffuse, and the skin part's layer source, the skin tone
 * colourised over it.
 *
 * Ours (no Carbon counterpart): Carbon ships no paper doll; the client's is Python. Moved from Graphene's
 * `skinColour.js` (character-structure-and-plugins.md R5); the name is a working name.
 */
export class CjsPaperDollSkinComposer
{

    static className = "CjsPaperDollSkinComposer";

    /** The composition the skin's outputs and source join. @type {CjsPaperDollComposition} */
    composition = null;

    /** The build served: its cancellation, its waits and its report (`report.skin`). */
    _build = null;

    /** The definition whose `skin` the report reads. */
    _definition = null;

    /** The prepared foundations by id, the map `PrepareFoundation` adds to. @type {?Map<string, object>} */
    _foundations = null;

    /** Each foundation's copied head and body diffuse maps, by foundation id. @type {Map<string, object>} */
    _foundationCopies = new Map();

    /** Per region (`head`, `body`): its inputs and prepared effects. @type {Record<string, object>} */
    _regions = {};

    /** Notes a change, for the build's log. @type {function(string): void} */
    _onChange = null;

    /**
     * @param {CjsPaperDollComposition} composition The character's composition.
     * @param {{ Ready: function(Promise<*>): Promise<*>, report: object, content: { root: string, sex: string } }} build The build
     *   served: its waits, its report, its content root and its sex.
     */
    constructor(composition, build)
    {
        this.composition = composition;
        this._build = build;
    }

    /**
     * Reads every bloodline palette, prepares the head and body inputs over the selected foundation, adds the two
     * outputs and the skin's layer source to the composition, configures the definition's skin, and draws the initial
     * skin without binding it.
     * @param {import("../CjsPaperDollDefinition.js").CjsPaperDollDefinition} definition The paper doll definition; its
     *   `skin` component is configured here.
     * @param {object} foundation The selected foundation.
     * @param {Map<string, object>} foundations The foundations prepared so far, by id; another joins with `PrepareFoundation`.
     * @param {object[]} bodyParameters The body effects' diffuse parameters the composed body base binds to.
     * @param {function(string): void} onChange Notes a change.
     * @returns {Promise<void>}
     */
    async Prepare(definition, foundation, foundations, bodyParameters, onChange)
    {
        const build = this._build, c = this.composition.compositor, library = blue.characterLibrary;
        // The skin tone is the parts library's `skintone/basic`: one option, the folder itself.
        const [ option ] = await build.Ready(library.FetchOptions(build.content.sex, "skintone/basic"));
        this._definition = definition;
        this._foundations = foundations;
        this._onChange = onChange;

        // Every bloodline's palettes (<bloodline>_<light|midlight|default|middark|dark>.color) and the neutral default,
        // by name: a palette's colours are fetched when it is applied; none is read here.
        // Their specular colours (absent from some) are not read: the skin specular is not composed yet.
        // Raw records (`FetchPalettes`): the panel labels them (Graphene paletteMenus.js).
        const records = (await build.Ready(library.FetchPalettes(option))).map(({ path, name }) => ({ path, name })).sort((a, b) => a.path.localeCompare(b.path));
        // The paint's colours until the first capture: neutral grey (the starting palette is the character factory's
        // defaults; no defaults are picked in code).
        const initial = { colors: [ 0, 1, 2 ].map(() => Float32Array.of(.5, .5, .5, 1)) };

        const areas = new Set(), { roles, skipped } = await build.Ready(library.FetchOptionMaps(option));
        if (skipped.length) throw new Error("Skin tone maps the role lookup does not name: " + skipped.join(", "));
        for (const region of [ "head", "body" ])
        {
            // The region's colourised detail and the zone map its colourising reads.
            const detailMap = CjsCharacterTextureRoles.one(roles, role => role.region === region && role.operation === "Colorized");
            const zoneMap = CjsCharacterTextureRoles.one(roles, role => role.region === region && role.inputOf === "l");
            if (!detailMap || !zoneMap) throw new Error("Incomplete skin tone maps for the " + region);
            const [ base, detail, zone ] = await Promise.all([
                c.Texture(foundation.bindings[region].DiffuseMap),
                c.Texture(detailMap.path),
                c.Texture(zoneMap.path)
            ]);
            const colorAreas = await c.ColorAreas(detail, zone);
            const skinAlpha = CjsPaperDollSkinComposer.medianAlpha(detail);
            for (const area of colorAreas) areas.add(area);
            // With the skin-tone layer drawn, the composite takes that layer's alpha: the base's colour with the
            // detail's alpha, which is uniform (50/255, within 2, over the whole head and body detail), set as the
            // current base copy's alpha multiplier (so a foundation switch keeps it). The avatar shaders darken the
            // torso's inner backing by the composite's alpha, so an alpha of 1 drew it near-black, a line round the
            // neck. The layer's own draws write colour only (RM_ALPHA_ADDITIVE). Derived: the alpha is measured from
            // the content (the median, `medianAlpha`), and taking it as the composite's is our reading of the shaders.
            const baseCopy = await c.Copy(base);
            const paint = await c.Colorized(detail, CjsPaperDollCompositor.crop(detail), zone, CjsPaperDollCompositor.crop(zone), initial.colors);
            const r = this._regions[region] = { base, detail, zone, colorAreas, baseCopy, skinAlpha, paint };
            // The output is the foundation map's size (found: the base covers the whole atlas; ccpwgl
            // _dev/character-common/material-composer.mjs:174-177), which follows characterTextureQuality.
            const [ width, height ] = CjsPaperDollComposition.sizeOf(base);
            this.composition.AddOutput({
                target: PaperDollTarget.SKIN, region, channel: "DiffuseMap", width, height,
                base: capture =>
                {
                    r.baseCopy.SetParameter("AlphaMultiplier", capture.skin.option ? r.skinAlpha : 1);
                    return r.baseCopy;
                },
                consumers: region === "body" ? [ resource => { for (const parameter of bodyParameters) parameter.SetResource(resource); } ] : []
            });
        }
        this.composition.SetSource("skin", this);
        for (const [ id, value ] of foundations) await this.PrepareFoundation(id, value);

        definition.skin.Configure([ {
            id: "basic",
            colorAreas: [ ...areas ].sort(),
            palettes: records.map(({ path, name }) => ({ path, name }))
        } ], { option: "basic" });
        build.report.skin = {
            build: "resource index",
            regions: Object.fromEntries(Object.entries(this._regions).map(([ key, r ]) => [ key, {
                base: r.base.path,
                detail: r.detail.path,
                zone: r.zone.path,
                detailCrop: Array.from(CjsPaperDollCompositor.crop(r.detail)),
                zoneCrop: Array.from(CjsPaperDollCompositor.crop(r.zone)),
                colorAreas: r.colorAreas
            } ])),
            updates: 0,
            baseFile: "deteis.base retained as evidence; not multiplied into colours"
        };
        this.composition.Render(PaperDollTarget.SKIN, { order: [ "skin" ], lists: { order: [ "skin" ] }, skin: { option: "basic", colors: definition.skin.GetColors() } });
    }

    /**
     * The skin part's layers: the skin tone, colourised with the captured colours, over the detail's cutout, in the
     * diffuse outputs; none without an option.
     * @param {{ option: string, colors: ArrayLike<number>[] }} value The skin's capture.
     * @param {string} region The output's region.
     * @param {string} channel The output's channel.
     * @returns {Array<{ effect: object, region: Float32Array }>}
     */
    GetLayers(value, region, channel)
    {
        const r = this._regions[region];
        if (!value.option || !r || channel !== "DiffuseMap") return [];
        CjsPaperDollMaterialLayer.setColors(r.paint, value.colors);
        return [ { effect: r.paint, region: CjsPaperDollCompositor.crop(r.detail) } ];
    }

    /**
     * Copies one foundation's head and body diffuse maps, the base its skin draws over; once per foundation.
     * @param {string} id The foundation's id.
     * @param {object} value The prepared foundation.
     * @returns {Promise<void>}
     */
    async PrepareFoundation(id, value)
    {
        if (this._foundationCopies.has(id)) return;
        const c = this.composition.compositor, copies = {};
        for (const region of [ "head", "body" ]) copies[region] = await c.Copy(await c.Texture(value.bindings[region].DiffuseMap));
        this._foundationCopies.set(id, copies);
    }

    /**
     * Draws the skin over a prepared foundation's base maps from the next apply.
     * @param {string} id The foundation's id.
     * @returns {void}
     * @throws {Error} For a foundation `PrepareFoundation` has not copied.
     */
    SelectFoundation(id)
    {
        const copies = this._foundationCopies.get(id);
        if (!copies) throw Error("Unprepared skin foundation " + id);
        const report = this._build.report.skin;
        for (const region of [ "head", "body" ])
        {
            this._regions[region].baseCopy = copies[region];
            report.regions[region].base = this._foundations.get(id).bindings[region].DiffuseMap;
        }
        report.foundation = id;
    }

    /** The composed body base, the texture resource of the target drawn last. */
    get bodyTexture()
    {
        return this.composition.GetOutput(PaperDollTarget.SKIN, "body", "DiffuseMap");
    }

    /** The composed head base, the texture resource of the target drawn last. */
    get headTexture()
    {
        return this.composition.GetOutput(PaperDollTarget.SKIN, "head", "DiffuseMap");
    }

    /**
     * The target's binding (`CjsPaperDollInstance`'s `skin`): draws the captured skin and binds the body base.
     * @param {object} target The skin target's capture.
     * @returns {void}
     */
    Apply(target)
    {
        this.composition.Apply(PaperDollTarget.SKIN, target);
        const value = target.skin, report = this._build.report.skin;
        report.selected = this._definition.skin.palette;
        report.enabled = this._definition.skin.enabled;
        report.colors = value.colors.map(color => Array.from(color));
        report.updates++;
        this._onChange("skin palette applied");
    }

    /**
     * A loaded RGBA texture's alpha as one value: the median of a 1/16 grid of its texels, from 0 to 1.
     * @param {object} texture A ready `TriTextureRes` with its CPU bitmap.
     * @returns {number} The alpha.
     */
    static medianAlpha(texture)
    {
        const bitmap = texture.loadedBitmap, data = bitmap.GetMipRawData(0), pitch = bitmap.GetPitch(), values = [];
        for (let y = 0; y < texture.height; y += 16) for (let x = 0; x < texture.width; x += 16) values.push(data[y * pitch + x * 4 + 3]);
        values.sort((a, b) => a - b);
        return values[values.length >> 1] / 255;
    }

}
