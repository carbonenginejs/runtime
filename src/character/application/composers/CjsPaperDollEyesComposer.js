import { CjsPaperDollCompositor } from "../compositor/CjsPaperDollCompositor.js";
import { CjsPaperDollMaterialLayer } from "../compositor/CjsPaperDollMaterialLayer.js";
import { PaperDollTarget } from "../paperDollOrder.js";
import { CjsPaperDollMakeupCatalog } from "./CjsPaperDollMakeupCatalog.js";
import { CjsCharacterTextureRoles } from "../../library/CjsCharacterTextureRoles.js";
import { blue } from "#blue";

/** The eye material's channels: the effect properties its outputs feed. */
const CHANNELS = [ "DiffuseMap", "NormalMap", "SpecularMap" ];

/** The colourise colours before a selection's own arrive: neutral grey. */
const NEUTRAL = [ 0, 1, 2 ].map(() => Float32Array.of(.5, .5, .5, 1));

/**
 * A paper doll's eyes target, in the composition: the iris material every EyeShader consumer samples, three outputs
 * (diffuse, normal, specular) based on the consumers' own maps, and the eyes part's source, the selected option's
 * diffuse (colourised when it has colour areas) and its normal and specular copied in as material data. An option not
 * yet resolved draws nothing: the consumers take their own maps back.
 *
 * Ours (no Carbon counterpart): Carbon ships no paper doll; the client's is Python. Moved from Graphene's
 * `eyeMaterial.js` (character-structure-and-plugins.md R5); the name is a working name.
 */
export class CjsPaperDollEyesComposer
{

    static className = "CjsPaperDollEyesComposer";

    /** The composition the eyes' outputs join. @type {import("./CjsPaperDollComposition.js").CjsPaperDollComposition} */
    composition = null;

    /** The build served: its cancellation, its waits, its report (`report.eyes`) and its content root. */
    _build = null;

    /** The consumers: each EyeShader effect and its mesh. @type {Array<{ effect: object, mesh: object }>} */
    _consumers = [];

    /** Each consumer's own maps, by channel, which an unresolved option binds back. @type {object[]} */
    _originals = [];

    /** The catalogue's options, by id. @type {Map<string, object>} */
    _options = new Map();

    /** Each resolved option's prepared inputs, by id. @type {Map<string, object>} */
    _prepared = new Map();

    /** The definition's eyes component. */
    _component = null;

    /** Notes a change, for the build's log. @type {function(string): void} */
    _onChange = null;

    /** The library the catalogue and the texture roles are read through (`Prepare`). */
    _characterLibrary = null;

    /**
     * @param {import("./CjsPaperDollComposition.js").CjsPaperDollComposition} composition The character's composition.
     * @param {{ CheckActive: function(): void, Ready: function(Promise<*>): Promise<*>, report: object, content: { root: string } }} build
     *   The build served.
     */
    constructor(composition, build)
    {
        this.composition = composition;
        this._build = build;
    }

    /**
     * Reads the eyes catalogue, copies the consumers' maps as the outputs' bases, adds the three outputs and the eyes'
     * source, and configures the definition's eyes. Nothing is drawn until an option is resolved and applied.
     * @param {import("../CjsPaperDollDefinition.js").CjsPaperDollDefinition} definition The paper doll definition.
     * @param {Array<{ effect: object, mesh: object }>} consumers The EyeShader effects and their meshes.
     * @param {function(string): void} onChange Notes a change.
     * @param {{ characterLibrary?: object }} [services] The library the catalogue and the texture roles are read
     *   through (`CjsPaperDollMakeupCatalog.read`); `blue.characterLibrary` by default.
     * @returns {Promise<void>}
     * @throws {Error} With no consumers, or consumers that do not share their maps.
     */
    async Prepare(definition, consumers, onChange, { characterLibrary = blue.characterLibrary } = {})
    {
        const build = this._build, c = this.composition.compositor;
        this._characterLibrary = characterLibrary;
        const catalog = await CjsPaperDollMakeupCatalog.read("eyes", build, { characterLibrary });
        if (!consumers.length) throw new Error("No EyeShader consumers");
        this._consumers = consumers;
        this._onChange = onChange;
        this._originals = consumers.map(({ effect }) => Object.fromEntries(CHANNELS.map(name => [ name, effect.GetResourceByName(name).GetResource() ])));
        const base = this._originals[0];
        for (const original of this._originals) for (const name of CHANNELS) if (original[name] !== base[name]) throw new Error("Eye consumers need separate composition foundations");
        // The outputs are the consumers' diffuse map's size.
        const width = base.DiffuseMap.width, height = base.DiffuseMap.height;
        for (const name of CHANNELS)
        {
            const seed = await c.Copy(base[name], CjsPaperDollCompositor.full, name === "NormalMap");
            this.composition.AddOutput({
                target: PaperDollTarget.EYES, region: "eyes", channel: name, width, height, base: () => seed,
                consumers: [ resource => { for (const { effect } of consumers) effect.GetResourceByName(name).SetResource(resource); } ]
            });
        }
        this.composition.SetSource("eyes", this);

        build.report.eyes = {
            build: catalog.build, untypedDirectories: catalog.untypedDirectories,
            consumers: consumers.map(({ mesh }) => ({ name: mesh.name, index: mesh.meshIndex })),
            selected: null, palette: null, updates: 0, validation: null,
            component: "CjsPaperDollEyes", updatePasses: 0
        };
        this._component = definition.eyes;
        this._options = new Map(catalog.options.map(option => [ option.id, option ]));
        this._component.Configure(catalog.options.map(option => ({ ...option })), { resolve: id => this._PrepareOption(this._options.get(id)) });
        this._ReportState();
    }

    /**
     * The eyes part's layers: the selected option's diffuse over the diffuse output, and its normal and specular,
     * which are material data, copied in with all four channels.
     * @param {{ option: string, colors: ?ArrayLike<number>[] }} value The eyes' capture.
     * @param {string} region The output's region.
     * @param {string} channel The output's channel.
     * @returns {Array<{ effect: object, region: Float32Array, writeRGBA?: boolean }>}
     */
    GetLayers(value, region, channel)
    {
        const prepared = this._prepared.get(value.option);
        if (!prepared || region !== "eyes") return [];
        if (channel === "DiffuseMap")
        {
            if (prepared.coloured) CjsPaperDollMaterialLayer.setColors(prepared.paint, value.colors ?? NEUTRAL);
            return [ { effect: prepared.paint, region: prepared.region } ];
        }
        // N/S are material data. Copy their RGBA within their independent cutouts; specular alpha is the highlight
        // exponent, never blend coverage.
        const patch = prepared.patches[channel];
        return patch ? [ { effect: patch.effect, region: patch.region, writeRGBA: true } ] : [];
    }

    /**
     * The target's binding (`CjsPaperDollInstance`'s `eyes`): composes the selected option, or binds the consumers' own
     * maps back while it is unresolved.
     * @param {object} target The eyes target's capture.
     * @returns {void}
     */
    Apply(target)
    {
        const build = this._build, report = build.report.eyes, value = target.eyes, id = value.option || null;
        build.CheckActive();
        const composed = id !== null && this._prepared.has(id);
        if (composed) this.composition.Apply(PaperDollTarget.EYES, target);
        else for (let i = 0; i < this._consumers.length; i++)
            for (const name of CHANNELS) this._consumers[i].effect.GetResourceByName(name).SetResource(this._originals[i][name]);
        report.selected = id;
        report.palette = this._component.palette || null;
        report.updates++;
        report.bindings = this._consumers.map(({ effect }) => Object.fromEntries(CHANNELS.map(name => [ name,
            effect.GetResourceByName(name).GetResource() === (composed ? this.composition.GetOutput(PaperDollTarget.EYES, "eyes", name) : this._originals[0][name]) ])));
        this._onChange("eyes " + (id ?? "foundation"));
        this._ReportState();
        report.updatePasses++;
        this._onChange("eye update applied");
    }

    /**
     * Loads and prepares an option's maps the first time it is applied (`CjsPaperDollComponent.ResolveOption`).
     * @param {object} option The catalogue option.
     * @returns {Promise<{ colorAreas: number[] }>} Its colour areas.
     * @throws {Error} For an option with dependencies, ambiguous or incomplete inputs, or colour metadata that conflicts.
     */
    async _PrepareOption(option)
    {
        const c = this.composition.compositor;
        if (option.metadata?.dependantModifiers?.length) throw new Error("Unresolved eye dependencies " + option.definition);
        // The option's maps by role (CjsCharacterTextureRoles): a diffuse drawn as it is or colourised through its zone
        // map, and the normal and specular copied in as patches.
        const textureRoles = this._characterLibrary.GetTextureRoles();
        const roles = Object.values(option.channels).map(value => CjsCharacterTextureRoles.lookup(textureRoles, value.path));
        const one = match => CjsCharacterTextureRoles.one(roles, match);
        const detailRole = one(role => role.property === "DiffuseMap" && role.operation !== ""), zoneRole = one(role => role.inputOf === "l");
        const coloured = detailRole?.operation === "Colorized";
        if (!detailRole || coloured !== !!zoneRole) throw new Error("Ambiguous diffuse inputs " + option.definition);
        if (option.metadata?.numColorAreas === 0 && coloured) throw new Error("Colour metadata conflicts with channel inputs");
        const patchRoles = { NormalMap: one(role => role.property === "NormalMap"), SpecularMap: one(role => role.property === "SpecularMap") };
        if (!patchRoles.NormalMap || !patchRoles.SpecularMap) throw new Error("Incomplete eye material " + option.definition);
        const [ detail, zone, ...patchTextures ] = await Promise.all([ detailRole, zoneRole, patchRoles.NormalMap, patchRoles.SpecularMap ]
            .map(role => role ? c.Texture(role.path) : null));
        const region = CjsPaperDollCompositor.crop(detail);
        const paint = coloured
            ? await c.Colorized(detail, region, zone, CjsPaperDollCompositor.crop(zone), NEUTRAL)
            : await c.Simple(detail, region);
        const patches = {};
        for (const [ index, name ] of [ "NormalMap", "SpecularMap" ].entries())
        {
            const resource = patchTextures[index];
            patches[name] = { effect: await c.Copy(resource, CjsPaperDollCompositor.crop(resource), name === "NormalMap"), region: CjsPaperDollCompositor.crop(resource) };
        }
        const colorAreas = coloured ? await c.ColorAreas(detail, zone) : [];
        this._prepared.set(option.id, { option, coloured, roles, paint, region, patches, colorAreas });
        return { colorAreas };
    }

    /** Writes the component's state into the report. */
    _ReportState()
    {
        const report = this._build.report.eyes, component = this._component;
        report.option = component.option || null;
        report.enabled = component.enabled;
        report.palette = component.palette || null;
        report.manualColours = {
            custom: component.customColors,
            available: component.enabled && component.GetColorAreas().length > 0,
            colorAreas: component.GetColorAreas(),
            colors: component.GetColors().map(color => Array.from(color))
        };
        report.exposedControls = component.GetControls().map(control => ({ name: control.key, type: control.type.kind }));
    }

}
