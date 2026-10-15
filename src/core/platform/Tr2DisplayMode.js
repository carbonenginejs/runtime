import { CjsSchema, blue } from "#schema";
import { IRoot } from "../../global/blue/IRoot.js";
import { finiteNumber } from "./browserHelpers.js";

/**
 * Current browser Screen snapshot of Carbon's Tr2DisplayMode
 * (Tr2VideoAdapters.h), a read-only report the display-mode query fills.
 *
 * Browsers expose no native display-mode list, scanline ordering or reliable
 * refresh rate, so FromScreen does not invent them: the refresh-rate fields
 * stay 0 and scanline ordering stays null unless the caller supplies values.
 * The available size, colour and pixel depth, pixel ratio, orientation and
 * extended-screen fields are browser facts Carbon's mode does not have.
 */
export class Tr2DisplayMode
{
    /** Back buffer width. */
    width = 0;

    /** Back buffer height. */
    height = 0;

    /** Refresh rate numerator. */
    refreshRateNumerator = 0;

    /** Refresh rate denominator. */
    refreshRateDenominator = 0;

    /** Back buffer format, or null. */
    format = null;

    /** Scanline ordering, or null. */
    scanlineOrdering = null;

    /** Video scaling mode, or null. */
    scaling = null;

    /** Screen width available to windows. */
    availWidth = 0;

    /** Screen height available to windows. */
    availHeight = 0;

    /** Screen colour depth. */
    colorDepth = 0;

    /** Screen pixel depth. */
    pixelDepth = 0;

    /** Device pixel ratio. */
    pixelRatio = 1;

    /** Screen orientation type, or null. */
    orientationType = null;

    /** Screen orientation angle. */
    orientationAngle = 0;

    /** Whether the screen is part of an extended desktop, or null when unknown. */
    isExtended = null;

    /**
     * Creates a display-mode report from the browser's Screen and Window, as
     * Carbon's display-mode query fills its report from the device.
     *
     * @param {object} screen A Screen-like object.
     * @param {object|null} [windowObject] A Window-like object, for the pixel ratio.
     * @param {object} [overrides] Fields that replace what the screen reports, such as `format`.
     * @returns {Tr2DisplayMode} The report.
     */
    static FromScreen(screen, windowObject = null, overrides = {})
    {
        const orientation = screen?.orientation;
        const mode = new Tr2DisplayMode();
        mode.width = finiteNumber(overrides.width ?? screen?.width);
        mode.height = finiteNumber(overrides.height ?? screen?.height);
        mode.refreshRateNumerator = finiteNumber(overrides.refreshRateNumerator);
        mode.refreshRateDenominator = finiteNumber(overrides.refreshRateDenominator);
        mode.format = overrides.format ?? null;
        mode.scanlineOrdering = overrides.scanlineOrdering ?? null;
        mode.scaling = overrides.scaling ?? null;
        mode.availWidth = finiteNumber(overrides.availWidth ?? screen?.availWidth, mode.width);
        mode.availHeight = finiteNumber(overrides.availHeight ?? screen?.availHeight, mode.height);
        mode.colorDepth = finiteNumber(overrides.colorDepth ?? screen?.colorDepth);
        mode.pixelDepth = finiteNumber(overrides.pixelDepth ?? screen?.pixelDepth);
        mode.pixelRatio = finiteNumber(overrides.pixelRatio ?? windowObject?.devicePixelRatio, 1);
        mode.orientationType = overrides.orientationType ?? orientation?.type ?? null;
        mode.orientationAngle = finiteNumber(overrides.orientationAngle ?? orientation?.angle);
        mode.isExtended = overrides.isExtended ?? screen?.isExtended ?? null;
        return mode;
    }
}

export default Tr2DisplayMode;

blue.inherit(IRoot)(Tr2DisplayMode);
blue.interface()(Tr2DisplayMode);
CjsSchema.blue.define(Tr2DisplayMode, {
    className: "Tr2DisplayMode",
    fields: {
        width: [blue.read],
        height: [blue.read],
        refreshRateNumerator: [blue.read],
        refreshRateDenominator: [blue.read],
        format: [blue.read],
        scanlineOrdering: [blue.read],
        scaling: [blue.read]
    }
});
