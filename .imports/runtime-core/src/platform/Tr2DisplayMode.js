import { finiteNumber } from "./browserHelpers.js";

/** Current browser Screen snapshot; browsers do not expose a native mode list. */
export class Tr2DisplayMode
{
    /** Creates a browser display-mode snapshot. */
    constructor(values = {})
    {
        this.SetValues(values);
    }

    /** Applies display-mode values and returns this snapshot. */
    SetValues(values = {})
    {
        this.width = finiteNumber(values.width);
        this.height = finiteNumber(values.height);
        this.refreshRateNumerator = finiteNumber(values.refreshRateNumerator);
        this.refreshRateDenominator = finiteNumber(values.refreshRateDenominator);
        this.format = values.format ?? null;
        this.scanlineOrdering = values.scanlineOrdering ?? null;
        this.scaling = values.scaling ?? null;
        this.availWidth = finiteNumber(values.availWidth, this.width);
        this.availHeight = finiteNumber(values.availHeight, this.height);
        this.colorDepth = finiteNumber(values.colorDepth);
        this.pixelDepth = finiteNumber(values.pixelDepth);
        this.pixelRatio = finiteNumber(values.pixelRatio, 1);
        this.orientationType = values.orientationType ?? null;
        this.orientationAngle = finiteNumber(values.orientationAngle);
        this.isExtended = values.isExtended ?? null;
        return this;
    }

    /** Returns a detached display-mode value record. */
    GetValues()
    {
        return { ...this };
    }

    /** Creates a display-mode snapshot from browser Screen and Window objects. */
    static FromScreen(screen, windowObject = null, values = {})
    {
        const orientation = screen?.orientation;
        return new Tr2DisplayMode({
            ...values,
            width: values.width ?? screen?.width,
            height: values.height ?? screen?.height,
            availWidth: values.availWidth ?? screen?.availWidth,
            availHeight: values.availHeight ?? screen?.availHeight,
            colorDepth: values.colorDepth ?? screen?.colorDepth,
            pixelDepth: values.pixelDepth ?? screen?.pixelDepth,
            pixelRatio: values.pixelRatio ?? windowObject?.devicePixelRatio,
            orientationType: values.orientationType ?? orientation?.type,
            orientationAngle: values.orientationAngle ?? orientation?.angle,
            isExtended: values.isExtended ?? screen?.isExtended
        });
    }
}

export default Tr2DisplayMode;
