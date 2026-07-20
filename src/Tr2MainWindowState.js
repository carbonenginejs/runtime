// Ported from CarbonEngine trinity/trinity/UI/Tr2MainWindow.h/.cpp.
import { PresentInterval, Tr2WindowMode, Tr2WindowShowState } from "@carbonenginejs/runtime-const/render-context";

export class Tr2MainWindowState
{
    static PresentInterval = PresentInterval;
    static Tr2WindowMode = Tr2WindowMode;
    static Tr2WindowShowState = Tr2WindowShowState;

    constructor(values = {})
    {
        this.adapter = 0;
        this.presentInterval = PresentInterval.PRESENT_INTERVAL_ONE;
        this.height = 0;
        this.width = 0;
        this.left = 0;
        this.showState = Tr2WindowShowState.NORMAL;
        this.windowMode = Tr2WindowMode.FULL_SCREEN;
        this.top = 0;
        this.SetValues(values);
    }

    SetValues(values = {})
    {
        for (const key of [ "adapter", "presentInterval", "height", "width", "left", "showState", "windowMode", "top" ])
        {
            if (Object.prototype.hasOwnProperty.call(values, key)) this[key] = Number(values[key]);
        }
        return this;
    }

    GetValues()
    {
        return {
            adapter: this.adapter,
            presentInterval: this.presentInterval,
            height: this.height,
            width: this.width,
            left: this.left,
            showState: this.showState,
            windowMode: this.windowMode,
            top: this.top
        };
    }

    Clone()
    {
        return new Tr2MainWindowState(this.GetValues());
    }

    RequiresDeviceReset(other)
    {
        return this.windowMode !== other.windowMode || this.adapter !== other.adapter ||
            this.width !== other.width || this.height !== other.height ||
            this.presentInterval !== other.presentInterval;
    }

    __str__()
    {
        let result = `${windowModeName(this.windowMode)} on adapter ${this.adapter} ${this.width}x${this.height}, present interval ${presentIntervalName(this.presentInterval)}`;
        if (this.windowMode !== Tr2WindowMode.FULL_SCREEN)
        {
            result += `, position (${this.left}, ${this.top}), ${showStateName(this.showState)}`;
        }
        return result;
    }

    toString()
    {
        return this.__str__();
    }
}

function windowModeName(value)
{
    switch (value)
    {
        case Tr2WindowMode.FULL_SCREEN: return "full screen";
        case Tr2WindowMode.WINDOWED: return "windowed";
        case Tr2WindowMode.FIXED_WINDOW: return "fixed window";
        default: return "INVALID WINDOW MODE";
    }
}

function showStateName(value)
{
    switch (value)
    {
        case Tr2WindowShowState.NORMAL: return "normal";
        case Tr2WindowShowState.MAXIMIZED: return "maximized";
        case Tr2WindowShowState.MINIMIZED: return "minimized";
        default: return "INVALID WINDOW SHOW STATE";
    }
}

function presentIntervalName(value)
{
    switch (value)
    {
        case PresentInterval.PRESENT_INTERVAL_IMMEDIATE: return "immediate";
        case PresentInterval.PRESENT_INTERVAL_ONE: return "one";
        default: return "INVALID PRESENT INTERVAL";
    }
}

export default Tr2MainWindowState;
