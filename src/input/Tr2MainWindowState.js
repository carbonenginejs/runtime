// Source: trinity/trinity/UI/Tr2MainWindow.h
// Source: trinity/trinity/UI/Tr2MainWindow.cpp
// Source: trinity/trinity/UI/Tr2MainWindow_Blue.cpp
import { PresentInterval, Tr2WindowMode, Tr2WindowShowState } from "#consts/render-context";
import { CjsSchema, meta } from "#schema";
import "#consts/renderContext/presentation";
import "#consts/renderContext/window";

/**
 * Carbon main-window state record for mode, size, position, and presentation settings.
 */
export class Tr2MainWindowState
{
    static PresentInterval = PresentInterval;
    static Tr2WindowMode = Tr2WindowMode;
    static Tr2WindowShowState = Tr2WindowShowState;

    /** Creates a main-window state record with Carbon-compatible defaults. */
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

    /** Applies recognized numeric state values and returns this record. */
    SetValues(values = {})
    {
        for (const key of [ "adapter", "presentInterval", "height", "width", "left", "showState", "windowMode", "top" ])
        {
            if (Object.prototype.hasOwnProperty.call(values, key)) this[key] = Number(values[key]);
        }
        return this;
    }

    /** Returns a detached main-window state record. */
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

    /** Returns an independent copy of this state. */
    Clone()
    {
        return new Tr2MainWindowState(this.GetValues());
    }

    /**
     * Reports whether applying another state requires device reconfiguration:
     * window mode, adapter, width, height or present interval differ. Throws
     * TypeError unless `other` is a Tr2MainWindowState.
     */
    RequiresDeviceReset(other)
    {
        if (!(other instanceof Tr2MainWindowState))
        {
            throw new TypeError("Tr2MainWindowState.RequiresDeviceReset requires Tr2MainWindowState.");
        }
        return this.windowMode !== other.windowMode || this.adapter !== other.adapter ||
            this.width !== other.width || this.height !== other.height ||
            this.presentInterval !== other.presentInterval;
    }

    /** Returns the Carbon-style human-readable state description. */
    __str__()
    {
        let result = `${windowModeName(this.windowMode)} on adapter ${this.adapter} ${this.width}x${this.height}, present interval ${presentIntervalName(this.presentInterval)}`;
        if (this.windowMode !== Tr2WindowMode.FULL_SCREEN)
        {
            result += `, position (${this.left}, ${this.top}), ${showStateName(this.showState)}`;
        }
        return result;
    }

    /** Returns the human-readable state description. */
    toString()
    {
        return this.__str__();
    }

    /** Carbon ToString (Tr2MainWindow.cpp:161/:191) - the same description
     *  under Carbon's own method name; __str__ and toString ride it. */
    ToString()
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

// Tr2MainWindow_Blue.cpp:59-76, in Carbon's order. `input` ships as raw
// source (package.json "./input"), so the schema is defined here rather than
// with decorator syntax.
CjsSchema.define(Tr2MainWindowState, {
    className: "Tr2MainWindowState",
    carbon: "Tr2MainWindowState",
    family: "input",
    fields: {
        windowMode: [ meta.type.int32, meta.type.enum("trinity.Tr2WindowMode"), meta.blue.readwrite, meta.blue.persist ],
        adapter: [ meta.type.uint32, meta.blue.readwrite, meta.blue.persist ],
        width: [ meta.type.uint32, meta.blue.readwrite, meta.blue.persist ],
        height: [ meta.type.uint32, meta.blue.readwrite, meta.blue.persist ],
        presentInterval: [ meta.type.int32, meta.type.enum("trinity.Tr2RenderContextEnum.PresentInterval"), meta.blue.readwrite, meta.blue.persist ],
        left: [ meta.type.int32, meta.blue.readwrite, meta.blue.persist ],
        top: [ meta.type.int32, meta.blue.readwrite, meta.blue.persist ],
        showState: [ meta.type.int32, meta.type.enum("trinity.Tr2WindowShowState"), meta.blue.readwrite, meta.blue.persist ]
    }
});

export default Tr2MainWindowState;
