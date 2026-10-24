import { CjsSchema, meta, type } from "#schema";
import { CjsPaperDollEyeItem } from "./CjsPaperDollEyeItem.js";
import { eyeItemClasses } from "./eyeItemClasses.js";

/**
 * Editable eye selection for the application-owned PaperDoll API.
 * This is the operator-approved application layer, not a Carbon class port.
 * Prepared options supply verified colour areas; this class never reads pixels
 * or mutates effects. Property setters invalidate state for the doll's Update.
 */
@meta.define("CjsPaperDollEyes")
export class CjsPaperDollEyes
{
    _item = new CjsPaperDollEyeItem(this);
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

    @meta.property()
    @type.boolean
    @meta.ui.description("Eye modifier")
    get enabled() { return this._enabled; }
    set enabled(value) { if (typeof value !== "boolean") throw new TypeError("enabled requires a boolean"); if (value !== this._enabled) { this._enabled = value; this.Rebuild(); } }

    @meta.property()
    @type.string
    @meta.ui.description("Eye option")
    get option() { return this._option; }
    set option(value)
    {
        if (value !== "" && !this._options.has(value)) throw new RangeError("Unknown eye option");
        if (value === this._option) return;
        this._option = value;
        this._item = new (eyeItemClasses.get(this.GetColorAreas().join(",")))(this);
        const selected = this._options.get(value);
        if (!this._hasPalette && selected?.colorAreas.length)
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

    @meta.property()
    @type.object.embed("CjsPaperDollEyeItem")
    get item() { return this._item; }

    /** Installs prepared capability records and authored typed palettes. */
    Configure(options, palettes)
    {
        const prepared = new Map();
        for (const option of options)
        {
            if (!option.id || prepared.has(option.id) || option.colorAreas.some(area => ![1, 2, 3].includes(area))) throw new TypeError("Invalid eye capabilities");
            const areas = [...new Set(option.colorAreas)].sort();
            if (!eyeItemClasses.has(areas.join(","))) throw new RangeError("Unqualified eye colour-area shape");
            prepared.set(option.id, { ...option, colorAreas: areas });
        }
        const colors = new Map();
        for (const [id, value] of palettes)
        {
            if (value.length !== 3) throw new TypeError("A palette requires three colours");
            colors.set(id, value.map(color => CjsPaperDollEyeItem.copyColor(color)));
        }
        for (const option of prepared.values()) if (option.defaultPalette && !colors.has(option.defaultPalette)) throw new RangeError("Missing default eye palette");
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

    /** Restores the original foundation and clears remembered manual values. */
    Reset()
    {
        this._item = new CjsPaperDollEyeItem(this);
        this._enabled = true; this._option = ""; this._palette = "";
        this._hasPalette = false; this._custom = false; this._initialized = false;
        for (const color of [...this._preset, ...this._colors]) color.set(Float32Array.of(.5, .5, .5, 1));
        this.Rebuild();
    }

    /** Replaces a preset without erasing remembered manual colours. */
    _SetPreset(id)
    {
        if (id !== "" && !this._palettes.has(id)) throw new RangeError("Unknown eye palette");
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
        const next = CjsPaperDollEyeItem.copyColor(value);
        if (!this._initialized) for (let i = 0; i < 3; i++) this._colors[i].set(this._preset[i]);
        this._initialized = true; this._custom = true;
        this._colors[index].set(next); this.Rebuild();
    }
}
