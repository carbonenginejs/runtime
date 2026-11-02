import { blue } from "#blue";
import { vec4 } from "#math/vec4";
import { PixelFormat } from "#consts/render-context";
import { RenderingMode } from "#consts/graphics";
import { Tr2Blitter } from "../../../trinity/core/Tr2Blitter.js";
import { Tr2Effect } from "../../../trinity/shader/Tr2Effect.js";
import { Tr2RenderTarget } from "../../../trinity/core/device/Tr2RenderTarget.js";
import { Tr2Renderer } from "../../../trinity/core/Tr2Renderer.js";
import { CjsPaperDollCompositionTarget } from "./CjsPaperDollCompositionTarget.js";
import { CjsPaperDollMaterialLayer } from "./CjsPaperDollMaterialLayer.js";

/**
 * A character module's texture compositor: its compositing effects and targets, the blits that fill them, and the
 * release of all of it. Textures it loads are resMan's. Every input keeps its own resource cutout; there are no option
 * names or asset placement tables here.
 *
 * The compositing steps are the game's own effects (`res:/graphics/effect/utility/compositing/*.fx`: copyblit,
 * colorizedblit, colorizedcopyblit, patternblit, simpleblit, blitintoalphawithzones, twistnormalblit,
 * maskednormalblit), drawn with `Tr2Blitter` into `Tr2RenderTarget`s.
 *
 * Ours (no Carbon counterpart): Carbon ships no paper-doll compositor; the client's is Python. Moved from Graphene's
 * character composer (`textureComposer.js`, character-structure-and-plugins.md R4); the name is the structure
 * review's working name.
 */
export class CjsPaperDollCompositor
{

    /**
     * Every effect this compositor made, released by `Destruct`.
     * @type {object[]}
     */
    effects = [];

    /**
     * Every render target this compositor made, released by `Destruct`.
     * @type {object[]}
     */
    targets = [];

    /**
     * The blitter every draw goes through.
     * @type {Tr2Blitter}
     */
    blitter = new Tr2Blitter();

    /**
     * The main render context the draws run in.
     * @type {?object}
     */
    _context = null;

    /**
     * The build this compositor serves: its cancellation check (`CheckActive`) and `Ready(promise)`.
     * @type {?{ CheckActive: function(): void, Ready: function(Promise<*>): Promise<*> }}
     */
    _build = null;

    /**
     * The targets made with a mip chain, which `Finish` regenerates.
     * @type {Set<object>}
     */
    _mipped = new Set();

    /**
     * @param {object} context The main render context.
     * @param {{ CheckActive: function(): void, Ready: function(Promise<*>): Promise<*> }} build The build it serves: its
     *   cancellation check after every read and draw, and the wait that a cancellation interrupts.
     */
    constructor(context, build)
    {
        this._context = context;
        this._build = build;
    }

    /**
     * A texture resource by path, ready. Resource identity is the source path plus ex, as TriTextureParameter's.
     * @param {string} path The texture's `res:` or `dynamic:` path.
     * @returns {Promise<object>} The ready resource.
     */
    async Texture(path)
    {
        const result = blue.resMan.GetResource(path);
        await blue.resMan.Ready(result);
        this._build.CheckActive();
        return result;
    }

    /**
     * A source's channel encoding as the compositing effects' flags take it: 0 single channel, 4 two channels,
     * 2 BGRX, 6 full colour.
     * @param {object} resource The texture resource.
     * @returns {number} The encoding.
     */
    _Encoding(resource)
    {
        const format = resource.format;
        if (format === PixelFormat.PIXEL_FORMAT_R8_UNORM || format === PixelFormat.PIXEL_FORMAT_R16_UNORM) return 0;
        if (format === PixelFormat.PIXEL_FORMAT_R8G8_UNORM || format === PixelFormat.PIXEL_FORMAT_R16G16_UNORM) return 4;
        return format === PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM ? 2 : 6;
    }

    /**
     * The `<prefix>_L8` and `<prefix>_L8A8` flags for one source.
     * @param {object} resource The texture resource.
     * @param {string} prefix The effect's flag prefix (`texture`, `zonemap`, ...).
     * @returns {Object<string, number>} The two flags.
     */
    _Flags(resource, prefix)
    {
        const type = this._Encoding(resource);
        return {
            [prefix + "_L8"]: type === 0 ? 1 : 0,
            [prefix + "_L8A8"]: type === 4 ? 1 : 0
        };
    }

    /**
     * The colour areas a detail and zone map pair use. The material-mask decode is the one character library's, by
     * the textures' paths.
     * @param {object} detail The colourise detail texture.
     * @param {object} zones Its zone map texture.
     * @returns {Promise<number[]>} The colour areas.
     */
    async ColorAreas(detail, zones)
    {
        return this._build.Ready(blue.characterLibrary.FetchMaterialMaskAreas(detail.GetPath(), zones.GetPath()));
    }

    /**
     * A compositing effect, ready, with its textures, vectors and scalars set; this compositor releases it.
     * @param {string} name The effect's name under `res:/graphics/effect/utility/compositing/`.
     * @param {Object<string, object>} resources Texture resources by effect resource name.
     * @param {Object<string, ArrayLike<number>>} [vectors={}] Vector parameters by name.
     * @param {Object<string, number>} [scalars={}] Scalar parameters by name.
     * @returns {Promise<Tr2Effect>} The effect.
     */
    async Effect(name, resources, vectors = {}, scalars = {})
    {
        const value = new Tr2Effect();
        this.effects.push(value);
        value.SetEffectPathName("res:/graphics/effect/utility/compositing/" + name + ".fx");
        await blue.resMan.Ready(value.effectResource);
        this._build.CheckActive();
        for (const [ key, resource ] of Object.entries(resources))
        {
            value.SetResourceTexture2D(key, resource.GetPath());
            value.GetResourceByName(key).SetResource(resource);
        }
        for (const [ key, vector ] of Object.entries(vectors)) value.SetParameter__Vector4(key, vector);
        for (const [ key, scalar ] of Object.entries(scalars)) value.SetParameter(key, scalar);
        return value;
    }

    /**
     * A composition target. One a mesh samples takes a full mip chain (`mips`): drawn at a distance, a single level
     * aliases into moiré on fine detail such as hair cards (operator, 26 October 2026).
     * @param {number} width Its width.
     * @param {number} height Its height.
     * @param {boolean} [mips=false] Whether it has a full mip chain; call `Finish` after drawing into it. A mipped
     *   target is R8G8B8A8 and the others B8G8R8A8: blits do not care, but anything reading a target's bytes (a
     *   readback, a PNG save) must take its format from the target.
     * @returns {Tr2RenderTarget} The render target.
     */
    MakeTarget(width, height, mips = false)
    {
        const target = new Tr2RenderTarget();
        // Carbon refuses to generate mips for BGR formats (Tr2TextureAL.GenerateMipMaps), so a mipped target is RGBA.
        target.Create(width, height, mips ? 1 + Math.floor(Math.log2(Math.max(width, height))) : 1,
            mips ? PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM : PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
        if (!target.IsValid()) throw new Error("Composition target creation failed");
        this.targets.push(target);
        if (mips) this._mipped.add(target);
        return target;
    }

    /**
     * Regenerates a mipped target's chain from its top level, after its draws (Tr2RenderTarget.GenerateMipMaps). The
     * WebGPU work queue encodes it only inside a frame, so it runs in one, as each draw does.
     * @param {Tr2RenderTarget} target The target; one without mips is left alone.
     * @returns {void}
     */
    Finish(target)
    {
        if (!this._mipped.has(target)) return;
        this._build.CheckActive();
        Tr2Renderer.BeginFrame();
        Tr2Renderer.BeginRenderContext();
        try
        {
            // An ALResult fails with its top bit set (Failed in trinityal/ALResult.js).
            const result = target.GenerateMipMaps(this._context);
            if ((result | 0) < 0) throw new Error("Composition mip generation failed: 0x" + (result >>> 0).toString(16));
        }
        finally
        {
            Tr2Renderer.EndRenderContext();
            Tr2Renderer.EndFrame();
        }
    }

    /**
     * Renews every effect this compositor holds, with its effect resource and textures, and answers whether all
     * of them can draw now.
     *
     * The effects are made once and drawn again whenever the character recomposes (an edit, a layer, a garment),
     * which can come long after the last draw; between them nothing else asks for their resources, so resMan's
     * automatic purge expired them and the next `Draw` found them reloading and threw ("Composition draw failed").
     * A live character therefore renews its compositors as part of its update, and a hidden one that should stay
     * ready through `CjsPaperDoll.EnsureGood`. Rejected: having `Draw` wait for its inputs, which would make the
     * synchronous draw calls in Graphene's composers (about 20 sites) asynchronous.
     * @returns {boolean} Whether every held effect is good.
     */
    EnsureGood()
    {
        let good = true;
        for (const value of this.effects) if (!value.EnsureGood()) good = false;
        return good;
    }

    /**
     * Releases every target and effect this compositor made, and its blitter. Textures it loaded are resMan's and
     * stay. Nothing it produced may be drawn or bound after this; a second call does nothing.
     * @returns {void}
     */
    Destruct()
    {
        for (const target of this.targets.splice(0)) target.Dispose();
        for (const value of this.effects.splice(0)) value.Destruct();
        this._mipped.clear();
        this.blitter.Destruct();
    }

    /**
     * A new composition target with its texture resource.
     * @param {number} width Its width.
     * @param {number} height Its height.
     * @param {boolean} [mips=false] Whether it has a full mip chain.
     * @returns {CjsPaperDollCompositionTarget} The target.
     */
    TargetTexture(width, height, mips = false)
    {
        return new CjsPaperDollCompositionTarget(this, width, height, mips);
    }

    /**
     * Draws one effect into a region of a target, in a frame and a managed-rendering span of its own.
     * @param {Tr2RenderTarget} target The render target.
     * @param {number} width Its width.
     * @param {number} height Its height.
     * @param {object} value The effect.
     * @param {Float32Array} region The region, as (x, y, width, height) in 0..1.
     * @param {boolean} [clear=false] Whether to clear the whole target first.
     * @param {boolean} [writeRGBA=clear] Whether to write RGBA as is (opaque states) rather than add (alpha-additive).
     * @returns {void}
     */
    Draw(target, width, height, value, region, clear = false, writeRGBA = clear)
    {
        this._build.CheckActive();
        Tr2Renderer.BeginFrame();
        Tr2Renderer.BeginRenderContext();
        const context = this._context;
        const esm = context.GetEffectStateManager();
        // A span of its own resets the state manager's redundancy cache. Without it a draw can inherit a span another
        // renderer left open (EveSpaceScene.EndRender opens one for the next frame, as Carbon does): the blit's vertex
        // declaration then reads as already applied after the previous frame unbound it, and the pipeline is built
        // with no vertex buffers ("Vertex attribute slot 1 ... not present in the VertexState").
        esm.BeginManagedRendering();
        try
        {
            esm.SetRenderTarget(0, target.GetRenderTarget(), true);
            context.SetDepthStencil(null);
            esm.SetViewport(CjsPaperDollCompositor.viewport(width, height, CjsPaperDollCompositor.full));
            if (clear) context.Clear({ color: CjsPaperDollCompositor.clear, clearColor: true, clearDepth: false });
            esm.SetViewport(CjsPaperDollCompositor.viewport(width, height, region));
            esm.ApplyStandardStates(writeRGBA ? RenderingMode.RM_OPAQUE : RenderingMode.RM_ALPHA_ADDITIVE);
            if (!this.blitter.Draw__Effect(context, value)) throw new Error("Composition draw failed");
            esm.ApplyStandardStates(RenderingMode.RM_OPAQUE);
        }
        finally
        {
            esm.EndManagedRendering();
            Tr2Renderer.EndRenderContext();
            Tr2Renderer.EndFrame();
        }
    }

    /**
     * A copyblit of a source region.
     * @param {object} source The texture.
     * @param {Float32Array} [region=full] The region it covers.
     * @param {boolean} [normal=false] Whether to blit it as a normal map.
     * @returns {Promise<Tr2Effect>} The effect.
     */
    async Copy(source, region = CjsPaperDollCompositor.full, normal = false)
    {
        return this.Effect("copyblit", { Texture: source }, {
            SourceUVs: CjsPaperDollCompositor.bounds(region),
            TextureReverseUV: CjsPaperDollCompositor.crop(source)
        }, {
            AlphaMultiplier: 1,
            ...this._Flags(source, "texture"),
            texture_blitAsNormal: normal ? 1 : 0
        });
    }

    /**
     * A material texture with full RGBA. Forward material shaders consume RGB colour and material alpha; the native
     * compositor expands compact (one- or two-channel) sources before that material boundary.
     * @param {object} source The texture.
     * @returns {Promise<object>} The source itself when already full colour, else its expansion's texture resource.
     * @throws {Error} For a compact source that does not cover its whole image.
     */
    async Material(source)
    {
        const type = this._Encoding(source);
        if (type !== 0 && type !== 4) return source;
        if (CjsPaperDollCompositor.crop(source).some((v, i) => v !== CjsPaperDollCompositor.full[i])) throw Error("Material expansion requires full-space input " + source.path);
        const expanded = this.TargetTexture(source.width, source.height);
        expanded.Draw(await this.Copy(source), CjsPaperDollCompositor.full, true, true);
        return expanded.resource;
    }

    /**
     * A colourise effect (colorizedblit or colorizedcopyblit) of a detail through its zone map.
     * @param {string} name The effect's name.
     * @param {object} source The detail texture.
     * @param {Float32Array} region The detail's region.
     * @param {object} zones The zone map.
     * @param {Float32Array} zoneRegion The zone map's region.
     * @param {ArrayLike<number>[]} palette The three colours.
     * @param {number} [strength=1] The blit's strength.
     * @returns {Promise<Tr2Effect>} The effect.
     */
    async _ColorizedEffect(name, source, region, zones, zoneRegion, palette, strength = 1)
    {
        const transparent = await this.Texture("dynamic:/color/0,0,0,0");
        return this.Effect(name, {
            DetailMap: source,
            ZoneMap: zones,
            OverlayMap: transparent,
            MaskMap: transparent
        }, {
            SourceUVs: CjsPaperDollCompositor.bounds(region),
            DetailReverseUV: region,
            ZoneReverseUV: zoneRegion,
            OverlayReverseUV: CjsPaperDollCompositor.full,
            MaskReverseUV2: CjsPaperDollCompositor.full,
            Color1: palette[0],
            Color2: palette[1],
            Color3: palette[2]
        }, {
            Strength: strength,
            UseMask: 0,
            ...this._Flags(zones, "zonemap"),
            ...this._Flags(source, "detailmap"),
            overlaymap_L8: 0,
            overlaymap_L8A8: 0,
            maskmap_L8: 0,
            maskmap_L8A8: 0
        });
    }

    /**
     * A colorizedblit of a detail through its zone map.
     * @param {object} source The detail texture.
     * @param {Float32Array} region The detail's region.
     * @param {object} zones The zone map.
     * @param {Float32Array} zoneRegion The zone map's region.
     * @param {ArrayLike<number>[]} palette The three colours.
     * @param {number} [strength=1] The blit's strength.
     * @returns {Promise<Tr2Effect>} The effect.
     */
    Colorized(source, region, zones, zoneRegion, palette, strength = 1)
    {
        return this._ColorizedEffect("colorizedblit", source, region, zones, zoneRegion, palette, strength);
    }

    /**
     * A colorizedcopyblit of a detail through its zone map (the colourised RGB with the detail's own coverage).
     * @param {object} source The detail texture.
     * @param {Float32Array} region The detail's region.
     * @param {object} zones The zone map.
     * @param {Float32Array} zoneRegion The zone map's region.
     * @param {ArrayLike<number>[]} palette The three colours.
     * @param {number} [strength=1] The blit's strength.
     * @returns {Promise<Tr2Effect>} The effect.
     */
    ColorizedCopy(source, region, zones, zoneRegion, palette, strength = 1)
    {
        return this._ColorizedEffect("colorizedcopyblit", source, region, zones, zoneRegion, palette, strength);
    }

    /**
     * ColorizedBlit with a coverage mask (UseMask=1): only where the mask's alpha covers. Used for a specular layer
     * whose own alpha is material data.
     * @param {object} source The detail texture.
     * @param {Float32Array} region The detail's region.
     * @param {object} zones The zone map.
     * @param {Float32Array} zoneRegion The zone map's region.
     * @param {object} mask The coverage mask.
     * @param {Float32Array} maskRegion The mask's region.
     * @param {ArrayLike<number>[]} palette The three colours.
     * @param {number} [strength=1] The blit's strength.
     * @returns {Promise<Tr2Effect>} The effect.
     */
    async ColorizedMasked(source, region, zones, zoneRegion, mask, maskRegion, palette, strength = 1)
    {
        const transparent = await this.Texture("dynamic:/color/0,0,0,0");
        return this.Effect("colorizedblit", {
            DetailMap: source,
            ZoneMap: zones,
            OverlayMap: transparent,
            MaskMap: mask
        }, {
            SourceUVs: CjsPaperDollCompositor.bounds(region),
            DetailReverseUV: region,
            ZoneReverseUV: zoneRegion,
            OverlayReverseUV: CjsPaperDollCompositor.full,
            MaskReverseUV2: maskRegion,
            Color1: palette[0],
            Color2: palette[1],
            Color3: palette[2]
        }, {
            Strength: strength,
            UseMask: 1,
            ...this._Flags(zones, "zonemap"),
            ...this._Flags(source, "detailmap"),
            overlaymap_L8: 0,
            overlaymap_L8A8: 0,
            ...this._Flags(mask, "maskmap")
        });
    }

    /**
     * BlitIntoAlphaWithZones: adds the source's alpha, scaled per zone by Color1.x/.y/.z (one value per colour area)
     * and capped by the mask, into the target's alpha only (the effect's own states: alpha write, ONE/ONE).
     * @param {object} source The texture.
     * @param {Float32Array} region Its region.
     * @param {object} zones The zone map.
     * @param {Float32Array} zoneRegion The zone map's region.
     * @param {object} mask The cap mask.
     * @param {Float32Array} maskRegion The mask's region.
     * @param {ArrayLike<number>} values The per-zone scales.
     * @returns {Promise<Tr2Effect>} The effect.
     */
    async BlitIntoAlphaWithZones(source, region, zones, zoneRegion, mask, maskRegion, values)
    {
        return this.Effect("blitintoalphawithzones", {
            Texture: source,
            MaskMap: mask,
            ZoneMap: zones
        }, {
            SourceUVs: CjsPaperDollCompositor.bounds(region),
            TextureReverseUV: CjsPaperDollCompositor.crop(source),
            MaskReverseUV: maskRegion,
            ZoneReverseUV: zoneRegion,
            Color1: values
        }, {
            ...this._Flags(source, "texture"),
            ...this._Flags(mask, "maskmap"),
            ...this._Flags(zones, "zonemap")
        });
    }

    /**
     * A simpleblit of a source, masked by a mask's alpha (by default its own).
     * @param {object} source The texture.
     * @param {Float32Array} region Its region.
     * @param {object} [mask=source] The mask.
     * @param {Float32Array} [maskRegion=region] The mask's region.
     * @returns {Promise<Tr2Effect>} The effect.
     */
    async Simple(source, region, mask = source, maskRegion = region)
    {
        return this.Effect("simpleblit", {
            Texture: source,
            MaskMap: mask
        }, {
            SourceUVs: CjsPaperDollCompositor.bounds(region),
            TextureReverseUV: CjsPaperDollCompositor.crop(source),
            MaskReverseUV: maskRegion
        }, {
            Strength: 1,
            MultAlpha: 0,
            ...this._Flags(source, "texture"),
            texture_blitAsNormal: 0,
            ...this._Flags(mask, "maskmap")
        });
    }

    /**
     * The layers a worn item's map draws where it has none of its own: transparent diffuse and specular, and a flat
     * normal (0.5, 0.5 in the two-channel encoding), each over the whole target.
     * @returns {Promise<Record<"DiffuseMap"|"NormalMap"|"SpecularMap", { effect: object, region: Float32Array }>>}
     */
    async NeutralLayers()
    {
        const layers = {};
        for (const [ key, color ] of [ [ "DiffuseMap", "0,0,0,0" ], [ "NormalMap", "0.5,0.5,0,1" ], [ "SpecularMap", "0,0,0,0" ] ])
            layers[key] = { effect: await this.Simple(await this.Texture("dynamic:/color/" + color), CjsPaperDollCompositor.full), region: CjsPaperDollCompositor.full };
        return layers;
    }

    /**
     * A worn item's material layer from its loaded maps.
     * @param {{ detail: object, zones?: ?object, normal?: ?object, specular?: ?object }} maps The diffuse source (a
     *   colourise detail, or a baked diffuse), its zone map, and its normal and specular.
     * @param {?ArrayLike<number>[]} palette The colours a colourised diffuse starts with; null draws the detail as it is.
     * @param {{ coverage?: boolean, patterns?: Map<string, object> }} [options] `coverage`: mask normal and specular by
     *   the detail's coverage; `patterns`: the patterned palettes the item offers (palette path to its pattern), each
     *   prepared as a patternblit diffuse when the diffuse is colourised.
     * @returns {Promise<CjsPaperDollMaterialLayer>} The layer.
     */
    async CreateMaterialLayer({ detail, zones = null, normal = null, specular = null }, palette, { coverage = false, patterns = new Map() } = {})
    {
        const crop = CjsPaperDollCompositor.crop;
        const layer = new CjsPaperDollMaterialLayer();
        layer.colourised = !!zones && !!palette;
        const covered = source => coverage ? this.Simple(source, crop(source), detail, crop(detail)) : this.Simple(source, crop(source));
        layer.DiffuseMap = { effect: layer.colourised ? await this.Colorized(detail, crop(detail), zones, crop(zones), palette) : await this.Simple(detail, crop(detail)), region: crop(detail) };
        layer.NormalMap = normal ? { effect: await covered(normal), region: crop(normal) } : null;
        layer.SpecularMap = specular ? { effect: await covered(specular), region: crop(specular) } : null;
        if (layer.colourised) for (const [ path, pattern ] of patterns) layer.patterns.set(path, await this._Patterned(detail, zones, pattern));
        return layer;
    }

    /**
     * PatternBlit (the shipped compositing effect): the detail colourised through its zone map, colour area 1 drawn as
     * the pattern (its texture placed by the pattern's offset, repeat and rotation; its R, G and B selecting the three
     * pattern colours), areas 2 and 3 flat in the pattern's own area colours.
     * @param {object} detail The colourise detail.
     * @param {object} zones Its zone map.
     * @param {{ map: string, colors: Float32Array[], areas: Float32Array[], transform: Float32Array, rotation: number }} pattern The pattern.
     * @returns {Promise<Tr2Effect>} The effect.
     */
    async _Patterned(detail, zones, pattern)
    {
        const crop = CjsPaperDollCompositor.crop;
        const [ map, transparent ] = await Promise.all([ this.Texture(pattern.map), this.Texture("dynamic:/color/0,0,0,0") ]);
        return this.Effect("patternblit", {
            DetailMap: detail,
            ZoneMap: zones,
            OverlayMap: transparent,
            PatternMap: map
        }, {
            SourceUVs: CjsPaperDollCompositor.bounds(crop(detail)),
            DetailReverseUV: crop(detail),
            ZoneReverseUV: crop(zones),
            OverlayReverseUV: CjsPaperDollCompositor.full,
            PatternColor1: pattern.colors[0],
            PatternColor2: pattern.colors[1],
            PatternColor3: pattern.colors[2],
            PatternTransform: pattern.transform,
            Color2: pattern.areas[0],
            Color3: pattern.areas[1]
        }, {
            PatternRotation: pattern.rotation,
            ...this._Flags(zones, "zonemap"),
            ...this._Flags(detail, "detailmap"),
            ...this._Flags(map, "patternmap"),
            overlaymap_L8: 0,
            overlaymap_L8A8: 0
        });
    }

    /**
     * A twistnormalblit of a twist normal map.
     * @param {object} source The texture.
     * @param {Float32Array} region Its region.
     * @param {number} [strength=1] The blit's strength.
     * @returns {Promise<Tr2Effect>} The effect.
     */
    async Twist(source, region, strength = 1)
    {
        return this.Effect("twistnormalblit", { Texture: source }, {
            SourceUVs: CjsPaperDollCompositor.bounds(region),
            TextureReverseUV: region
        }, {
            Strength: strength,
            ...this._Flags(source, "texture")
        });
    }

    /**
     * A maskednormalblit of a normal map.
     * @param {object} source The texture.
     * @param {Float32Array} region Its region.
     * @param {number} [strength=1] The blit's strength.
     * @returns {Promise<Tr2Effect>} The effect.
     */
    async MaskedNormal(source, region, strength = 1)
    {
        return this.Effect("maskednormalblit", { Texture: source }, {
            SourceUVs: CjsPaperDollCompositor.bounds(region),
            TextureReverseUV: region
        }, {
            Strength: strength,
            ...this._Flags(source, "texture")
        });
    }

    static className = "CjsPaperDollCompositor";

    /**
     * The whole target, as (x, y, width, height) in 0..1.
     * @type {Float32Array}
     */
    static full = Float32Array.of(0, 0, 1, 1);

    /**
     * Transparent black, the colour a cleared target starts with.
     * @type {Float32Array}
     */
    static clear = new Float32Array(4);

    /**
     * A texture resource's cutout in its image, as (x, y, width, height) in 0..1.
     * @param {object} resource The texture resource.
     * @returns {Float32Array} The cutout.
     */
    static crop(resource)
    {
        return vec4.fromValues(resource.cutoutX, resource.cutoutY, resource.cutoutWidth, resource.cutoutHeight);
    }

    /**
     * A region as (x0, y0, x1, y1), the SourceUVs form.
     * @param {ArrayLike<number>} value The region as (x, y, width, height).
     * @returns {Float32Array} Its bounds.
     */
    static bounds(value)
    {
        return vec4.fromValues(value[0], value[1], value[0] + value[2], value[1] + value[3]);
    }

    /**
     * A region of a target as a pixel viewport, rounded at both edges so adjacent regions meet.
     * @param {number} width The target's width.
     * @param {number} height The target's height.
     * @param {ArrayLike<number>} value The region as (x, y, width, height) in 0..1.
     * @returns {{ x: number, y: number, width: number, height: number, minZ: number, maxZ: number }} The viewport.
     */
    static viewport(width, height, value)
    {
        return {
            x: Math.round(value[0] * width),
            y: Math.round(value[1] * height),
            width: Math.round((value[0] + value[2]) * width) - Math.round(value[0] * width),
            height: Math.round((value[1] + value[3]) * height) - Math.round(value[1] * height),
            minZ: 0,
            maxZ: 1
        };
    }

}
