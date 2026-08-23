import {
    expandDiagramBounds,
    normalizeDiagramBounds
} from "./diagramBounds.js";

/**
 * Maintains renderer-neutral 2D pan and zoom state in world and CSS-pixel
 * coordinates. It owns no gestures, animation, DOM elements, or projection UI.
 */
export class CjsDiagramViewport
{

    /**
     * Creates a diagram diagram viewport around caller-supplied browser
     * collaborators.
     */
    constructor({
        centerX = 0,
        centerY = 0,
        zoom = 1,
        width = 0,
        height = 0,
        minZoom = 0.01,
        maxZoom = 100
    } = {})
    {
        this.minZoom = positiveNumber(minZoom, "minZoom");
        this.maxZoom = positiveNumber(maxZoom, "maxZoom");

        if (this.maxZoom < this.minZoom)
        {
            throw new RangeError("maxZoom must be greater than or equal to minZoom");
        }

        this.centerX = finiteNumber(centerX, "centerX");
        this.centerY = finiteNumber(centerY, "centerY");
        this.zoom = this.#ClampZoom(zoom);
        this.width = nonNegativeNumber(width, "width");
        this.height = nonNegativeNumber(height, "height");
    }

    /** Updates the viewport's CSS-pixel dimensions. */
    SetSize(width, height)
    {
        this.width = nonNegativeNumber(width, "width");
        this.height = nonNegativeNumber(height, "height");

        return this;
    }

    /** Moves the world-space point shown at the viewport center. */
    SetCenter(x, y)
    {
        this.centerX = finiteNumber(x, "centerX");
        this.centerY = finiteNumber(y, "centerY");

        return this;
    }

    /**
     * Sets the scale while preserving the world point beneath an optional
     * screen-space anchor. The center is used when no anchor is supplied.
     */
    SetZoom(zoom, { anchorX = this.width / 2, anchorY = this.height / 2 } = {})
    {
        anchorX = finiteNumber(anchorX, "anchorX");
        anchorY = finiteNumber(anchorY, "anchorY");

        const world = this.ScreenToWorld(anchorX, anchorY);
        const nextZoom = this.#ClampZoom(zoom);

        this.zoom = nextZoom;
        this.centerX = world.x - (anchorX - this.width / 2) / nextZoom;
        this.centerY = world.y - (anchorY - this.height / 2) / nextZoom;

        return this;
    }

    /** Multiplies the current scale around an optional screen-space anchor. */
    ZoomBy(factor, options = {})
    {
        factor = positiveNumber(factor, "factor");

        return this.SetZoom(this.zoom * factor, options);
    }

    /**
     * Applies a drag delta measured in CSS pixels. Positive deltas move the
     * rendered content in the same direction as the pointer.
     */
    PanByScreen(deltaX, deltaY)
    {
        deltaX = finiteNumber(deltaX, "deltaX");
        deltaY = finiteNumber(deltaY, "deltaY");
        this.centerX -= deltaX / this.zoom;
        this.centerY -= deltaY / this.zoom;

        return this;
    }

    /** Converts one world-space position into CSS-pixel viewport coordinates. */
    WorldToScreen(x, y, result = {})
    {
        x = finiteNumber(x, "x");
        y = finiteNumber(y, "y");
        result.x = (x - this.centerX) * this.zoom + this.width / 2;
        result.y = (y - this.centerY) * this.zoom + this.height / 2;

        return result;
    }

    /** Converts one CSS-pixel viewport position into world-space coordinates. */
    ScreenToWorld(x, y, result = {})
    {
        x = finiteNumber(x, "x");
        y = finiteNumber(y, "y");
        result.x = (x - this.width / 2) / this.zoom + this.centerX;
        result.y = (y - this.height / 2) / this.zoom + this.centerY;

        return result;
    }

    /** Returns the currently visible world-space bounds. */
    GetVisibleBounds({ padding = 0 } = {})
    {
        padding = nonNegativeNumber(padding, "padding");

        return {
            minX: this.centerX - this.width / (2 * this.zoom) - padding,
            minY: this.centerY - this.height / (2 * this.zoom) - padding,
            maxX: this.centerX + this.width / (2 * this.zoom) + padding,
            maxY: this.centerY + this.height / (2 * this.zoom) + padding
        };
    }

    /**
     * Centers and scales a world-space bounds record into the current size.
     * Returns false while the viewport has no drawable area.
     */
    FitBounds(bounds, { padding = 0, minZoom = this.minZoom, maxZoom = this.maxZoom } = {})
    {
        bounds = expandDiagramBounds(normalizeDiagramBounds(bounds), nonNegativeNumber(padding, "padding"));
        minZoom = positiveNumber(minZoom, "minZoom");
        maxZoom = positiveNumber(maxZoom, "maxZoom");

        if (maxZoom < minZoom)
        {
            throw new RangeError("FitBounds maxZoom must be greater than or equal to minZoom");
        }
        if (this.width === 0 || this.height === 0)
        {
            return false;
        }

        const contentWidth = bounds.maxX - bounds.minX;
        const contentHeight = bounds.maxY - bounds.minY;
        const widthZoom = contentWidth === 0 ? Infinity : this.width / contentWidth;
        const heightZoom = contentHeight === 0 ? Infinity : this.height / contentHeight;
        let zoom = Math.min(widthZoom, heightZoom, maxZoom);

        if (!Number.isFinite(zoom)) zoom = maxZoom;
        if (zoom < minZoom) zoom = minZoom;

        this.centerX = (bounds.minX + bounds.maxX) / 2;
        this.centerY = (bounds.minY + bounds.maxY) / 2;
        this.zoom = this.#ClampZoom(zoom);

        return true;
    }

    /** Returns one mutable snapshot suitable for renderer input or persistence. */
    Snapshot()
    {
        return {
            centerX: this.centerX,
            centerY: this.centerY,
            zoom: this.zoom,
            width: this.width,
            height: this.height,
            minZoom: this.minZoom,
            maxZoom: this.maxZoom
        };
    }

    /** Constrains a requested zoom to the configured viewport limits. */
    #ClampZoom(value)
    {
        value = positiveNumber(value, "zoom");

        if (value < this.minZoom) return this.minZoom;
        if (value > this.maxZoom) return this.maxZoom;

        return value;
    }

}

function positiveNumber(value, label)
{
    value = finiteNumber(value, label);

    if (value <= 0) throw new RangeError(`${label} must be greater than zero`);

    return value;
}

function nonNegativeNumber(value, label)
{
    value = finiteNumber(value, label);

    if (value < 0) throw new RangeError(`${label} must not be negative`);

    return value;
}

function finiteNumber(value, label)
{
    value = Number(value);

    if (!Number.isFinite(value)) throw new TypeError(`${label} must be a finite number`);

    return value;
}
