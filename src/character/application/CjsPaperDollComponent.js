import { CjsSchema, meta } from "#schema";
import { CjsPaperDollItem } from "./CjsPaperDollItem.js";
import { PaperDollPass } from "./paperDollOrder.js";

/**
 * Editable component selection for the application-owned PaperDoll API.
 * This is the operator-approved application layer, not a Carbon class port.
 * Prepared options supply verified colour areas; this class never reads pixels
 * or mutates effects. Property setters invalidate state for the doll's Update.
 *
 * Each part class stamps what the doll needs to collect it: its bake rank,
 * the passes it feeds and whether a shape edit rebuilds it.
 */
@meta.define("CjsPaperDollComponent")
export class CjsPaperDollComponent
{
    /** Bake rank among the skin layers (`PaperDollLayer`); null for a part that is not a skin layer. */
    static layer = null;
    /** The update passes this part's settings feed, as `PaperDollPass` bits. */
    static passes = 0;
    /** Whether a foundation shape edit rebuilds this part's output while it is selected. */
    static shapeDependent = false;
    /** The recipe category this part's options are filed under (a `.prs` entry's `category`); occlusion matches it. */
    static category = "";
    /**
     * Whether each option names its own palette, so selecting an option selects
     * it: a garment or accessory option is a `.type` (part, variation, colour
     * variant) or a garment folder with its own `.color` files. Parts whose
     * options share swatches (eye shadow, hair) keep the picked palette across
     * options. Custom colours are kept either way. An option naming no palette
     * resets it, rather than keeping the previous option's.
     */
    static optionNamesPalette = false;

    _item = new CjsPaperDollItem(this);
    _itemClasses = new Map([["", CjsPaperDollItem]]);
    _defaultOption = "";
    _enabled = true;
    _option = "";
    _palette = "";
    _hasPalette = false;
    _custom = false;
    _initialized = false;
    _dirty = true;
    _options = new Map();
    _palettes = new Map();
    _preset = Array.from({ length: 3 }, () => Float32Array.of(.5, .5, .5, 1));
    _colors = Array.from({ length: 3 }, () => Float32Array.of(.5, .5, .5, 1));

    get enabled() { return this._enabled; }
    set enabled(value) { if (typeof value !== "boolean") throw new TypeError("enabled requires a boolean"); if (value !== this._enabled) { this._enabled = value; this.Rebuild(); } }

    get option() { return this._option; }
    set option(value)
    {
        if (value !== "" && !this._options.has(value)) throw new RangeError("Unknown component option");
        if (value === this._option) return;
        this._option = value;
        this._item = new (this._itemClasses.get(this.GetColorAreas().join(",")))(this);
        const selected = this._options.get(value);
        if (selected?.colorAreas.length && (!this._hasPalette || this.constructor.optionNamesPalette))
        {
            this._SetPreset(selected.defaultPalette ?? "");
            this._hasPalette = true;
        }
        this.Rebuild();
    }

    get palette() { return this._palette; }
    set palette(value) { this._SetPreset(value); this._hasPalette = true; this._custom = false; this.Rebuild(); }

    get customColors() { return this._custom; }
    set customColors(value)
    {
        if (typeof value !== "boolean") throw new TypeError("customColors requires a boolean");
        if (value === this._custom) return;
        if (value && !this._initialized)
        {
            for (let i = 0; i < 3; i++) this._colors[i].set(this._preset[i]);
            this._initialized = true;
        }
        this._custom = value;
        this.Rebuild();
    }

    get item() { return this._item; }

    /** Installs prepared capability records and authored typed palettes. */
    Configure(options, palettes, { option: defaultOption = "" } = {})
    {
        const prepared = new Map();
        for (const option of options)
        {
            if (!option.id || prepared.has(option.id) || option.colorAreas.some(area => ![1, 2, 3].includes(area))) throw new TypeError("Invalid component capabilities");
            const areas = [...new Set(option.colorAreas)].sort();
            if (!this._itemClasses.has(areas.join(","))) throw new RangeError("Unqualified component colour-area shape");
            prepared.set(option.id, { ...option, colorAreas: areas });
        }
        const colors = new Map();
        for (const [id, value] of palettes)
        {
            if (value.length !== 3) throw new TypeError("A palette requires three colours");
            colors.set(id, value.map(color => CjsPaperDollItem.copyColor(color)));
        }
        for (const option of prepared.values()) if (option.defaultPalette && !colors.has(option.defaultPalette)) throw new RangeError("Missing default component palette");
        if (defaultOption !== "" && !prepared.has(defaultOption)) throw new RangeError("Unknown default component option");
        this._defaultOption = defaultOption;
        this._options = prepared;
        this._palettes = colors;
        this.Reset();
    }

    /** Only properties declared by the current editable item configuration. */
    GetControls()
    {
        const order = ["palette", "customColors", "color1", "color2", "color3"];
        return CjsSchema.getSchema(this._item.constructor).properties.slice().sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
    }

    /** Source-derived area identities; disabled state does not change support. */
    GetColorAreas() { return this._options.get(this._option)?.colorAreas ?? []; }

    /** Prepared item choices, independent of their selected colours. */
    GetOptions() { return [...this._options.values()]; }

    /** Authored palettes for the selected item, retaining a cross-item choice. */
    GetPalettes()
    {
        const result = [...(this._options.get(this._option)?.palettes ?? [])];
        if (this._palette && !result.some(value => value.path === this._palette)) result.push({ path: this._palette, label: "Retained colour" });
        return result;
    }

    /** Active typed values; callers edit through the exposed colour setters. */
    GetColors() { return this._custom ? this._colors : this._preset; }

    /** Whether settings need to be considered by the update coordinator. */
    IsDirty() { return this._dirty; }

    /** Acknowledges the captured settings before a prepared binding runs. */
    ClearDirty() { this._dirty = false; }

    /** Marks pending work without changing an effect or scheduling a draw. */
    Rebuild() { this._dirty = true; }

    /**
     * The settings one pass reads, copied so later edits cannot reach them: the
     * selected option (empty while disabled), its colour areas and their colours.
     * @param {PaperDollPass} pass The pass being captured.
     * @returns {{option: string, colorAreas: number[], colors: Float32Array[]}}
     */
    Capture(pass = PaperDollPass.HEAD)
    {
        const option = this.enabled ? this.option : "";
        return { option, colors: this.GetColors().map(value => Float32Array.from(value)), colorAreas: option ? [...this.GetColorAreas()] : [] };
    }

    /** Restores the original foundation and clears remembered manual values. */
    Reset()
    {
        this._item = new (this._itemClasses.get(""))(this);
        this._enabled = true; this._option = ""; this._palette = "";
        this._hasPalette = false; this._custom = false; this._initialized = false;
        for (const color of [...this._preset, ...this._colors]) color.set(Float32Array.of(.5, .5, .5, 1));
        this.option = this._defaultOption;
        this.Rebuild();
    }

    /** Replaces a preset without erasing remembered manual colours. */
    _SetPreset(id)
    {
        if (id !== "" && !this._palettes.has(id)) throw new RangeError("Unknown component palette");
        this._palette = id;
        for (let i = 0; i < 3; i++)
        {
            this._preset[i].set(id ? this._palettes.get(id)[i] : Float32Array.of(.5, .5, .5, 1));
            if (!this._initialized) this._colors[i].set(this._preset[i]);
        }
    }

    /** Remembers a manual value and invalidates only this component. */
    SetColor(index, value)
    {
        if (!this.GetColorAreas().includes(index + 1)) throw new RangeError("Colour area is not exposed by the selected item");
        const next = CjsPaperDollItem.copyColor(value);
        if (!this._initialized) for (let i = 0; i < 3; i++) this._colors[i].set(this._preset[i]);
        this._initialized = true; this._custom = true;
        this._colors[index].set(next); this.Rebuild();
    }
}
