import { CjsGraph } from "../../../global/model/graph/CjsGraph.js";
import { CjsPaperDollCompositor } from "../compositor/CjsPaperDollCompositor.js";

/**
 * A paper doll's composition: every texture its targets compose, drawn the one way all of them draw. Each output is a
 * row: a target, a region and a channel, a base drawn first, then each part's layers in the definition's bake order
 * (`CjsPaperDollInstance` captures it as `order`), then the mip chain, then the output binds to its consumers. A row
 * draws into the other of its two targets each time, so a target its consumers still sample is never drawn into.
 * A row may draw its base into a region of the target only (`baseRegion`). The parts a row draws are a ready list the
 * paper doll hands over in the capture (`CjsPaperDollInstance.ready`: `lists`, by name; a row names its list, `order`
 * by default): the compositor decides nothing about parts and orders nothing.
 *
 * Parts give their layers through sources (`SetSource`), one per definition part: an object whose
 * `GetLayers(value, region, channel)` returns the `{ effect, region, writeRGBA? }` draws for a captured value, or
 * none.
 *
 * Ours (no Carbon counterpart): Carbon ships no paper doll; the client's is Python. The shape is the one in
 * character-structure-and-plugins.md R5 (composer-shape proposal, 2026-11-08); the name is a working name.
 */
export class CjsPaperDollComposition
{

    static className = "CjsPaperDollComposition";

    /**
     * The compositor every draw goes through; its owner renews and releases it.
     * @type {CjsPaperDollCompositor}
     */
    compositor = null;

    /** The outputs, in drawing order. @type {object[]} */
    _rows = [];

    /** Each part's layer source, by definition part name. @type {Map<string, { GetLayers: function(*, string, string): object[] }>} */
    _sources = new Map();

    /**
     * @param {object} context The main render context.
     * @param {{ CheckActive: function(): void, Ready: function(Promise<*>): Promise<*> }} build The build served, as
     *   `CjsPaperDollCompositor` takes it.
     */
    constructor(context, build)
    {
        this.compositor = new CjsPaperDollCompositor(context, build);
    }

    /**
     * Adds an output. Its two targets are made now, at the given size.
     * @param {{ target: number, region: string, channel: string, width: number, height: number, mips?: boolean,
     *   base: function(object): object, baseRegion?: ?function(object): Float32Array, list?: string,
     *   consumers?: Array<function(object): void> }} row The output: its target bit, region and channel; its size; whether
     *   it carries a mip chain; `base(capture)`, the effect drawn first into the cleared target; `baseRegion(capture)`,
     *   where it is drawn (the whole target when absent); `list`, the capture's ready list it draws (`order` by
     *   default); and the consumers its texture resource is handed to after each draw.
     * @returns {object} The row.
     */
    AddOutput({ target, region, channel, width, height, mips = false, base, baseRegion = null, list = "order", consumers = [] })
    {
        const buffers = [ this.compositor.TargetTexture(width, height, mips, target), this.compositor.TargetTexture(width, height, mips, target) ];
        const row = { target, region, channel, width, height, mips, base, baseRegion, list, consumers, buffers, active: 0 };
        this._rows.push(row);
        return row;
    }

    /**
     * Sets a part's layer source.
     * @param {string} name The definition part.
     * @param {{ GetLayers: function(*, string, string): object[] }} source Its layers for a captured value, region and channel.
     * @returns {void}
     */
    SetSource(name, source)
    {
        this._sources.set(name, source);
    }

    /**
     * Whether a part has a layer source.
     * @param {string} name The definition part.
     * @returns {boolean}
     */
    HasSource(name)
    {
        return this._sources.has(name);
    }

    /**
     * Draws every output of a target from its capture and binds each to its consumers.
     * @param {number} target The target bit.
     * @param {{ order: string[] }} capture The target's capture: each part's value by name, and the bake order.
     * @returns {void}
     */
    Apply(target, capture)
    {
        for (const row of this.Render(target, capture))
            for (const consumer of row.consumers) consumer(row.buffers[row.active].resource);
    }

    /**
     * Draws every output of a target from its capture without binding it: the base into the cleared target, each part's
     * layers in the order of its ready list, then the mip chain.
     * @param {number} target The target bit.
     * @param {{ order: string[] }} capture The target's capture: each part's value by name, and the bake order.
     * @returns {object[]} The rows drawn.
     * @throws {Error} For a row whose ready list the capture does not hold.
     */
    Render(target, capture)
    {
        const c = this.compositor, drawn = [];
        for (const row of this._rows)
        {
            if (row.target !== target) continue;
            const next = 1 - row.active, buffer = row.buffers[next];
            c.Draw(buffer.target, row.width, row.height, row.base(capture), row.baseRegion ? row.baseRegion(capture) : CjsPaperDollCompositor.full, true);
            const names = capture.lists[row.list];
            if (!names) throw Error("The capture holds no ready list " + row.list);
            for (const name of names)
            {
                const source = this._sources.get(name);
                if (!source) continue;
                // A layer that is material data (`writeRGBA`) writes all four channels within its cutout.
                for (const layer of source.GetLayers(capture[name], row.region, row.channel))
                    c.Draw(buffer.target, row.width, row.height, layer.effect, layer.region, false, layer.writeRGBA === true);
            }
            if (row.mips) c.Finish(buffer.target);
            row.active = next;
            drawn.push(row);
        }
        return drawn;
    }

    /**
     * An output's texture resource: the target drawn last. A row drawing another list than `order` (the brow target)
     * is not an output of its region and channel; its consumers take it.
     * @param {number} target The target bit.
     * @param {string} region The region.
     * @param {string} channel The channel.
     * @returns {object} The texture resource.
     * @throws {Error} For an output the composition does not have.
     */
    GetOutput(target, region, channel)
    {
        const row = this._rows.find(value => value.target === target && value.region === region && value.channel === channel && value.list === "order");
        if (!row) throw Error(`No composition output ${region}.${channel} in target ${target}`);
        return row.buffers[row.active].resource;
    }

    /**
     * The size an output takes from its base map: the map's stored size over its atlas extent (a base covers the
     * whole atlas, extent 1). Found: E:/ccpwgl/_dev/character-common/material-composer.mjs:174-177.
     * @param {{ width: number, height: number, cutoutWidth: number, cutoutHeight: number }} texture The base map's
     *   texture resource.
     * @returns {[number, number]} Width and height.
     */
    static sizeOf(texture)
    {
        return [ Math.round(texture.width / texture.cutoutWidth), Math.round(texture.height / texture.cutoutHeight) ];
    }

    /** @cjs Thin public entry; this plain helper has no Blue schema or graph value exposure. */
    Destruct()
    {
        CjsGraph.destruct(this);
    }

    /**
     * Releases the compositor and everything it made.
     * @returns {boolean} True: nothing here refuses.
     * @cjs Existing paper-doll composition ownership, with no native counterpart.
     */
    OnDestruct()
    {
        this.compositor.Destruct();
        return true;
    }

}

CjsGraph.defineLifetime(CjsPaperDollComposition, {});
