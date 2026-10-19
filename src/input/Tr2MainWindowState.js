import { IRoot } from "../global/blue/IRoot.js";
// Source: trinity/trinity/UI/Tr2MainWindow.h
// Source: trinity/trinity/UI/Tr2MainWindow.cpp
// Source: trinity/trinity/UI/Tr2MainWindow_Blue.cpp
import { PresentInterval, Tr2WindowMode, Tr2WindowShowState } from "#consts/render-context";
import { CjsSchema, type, blue, meta } from "#schema";
import "#consts/renderContext/presentation";
import "#consts/renderContext/window";

/**
 * Carbon main-window state record for mode, size, position, and presentation settings.
 */
export class Tr2MainWindowState
{
    // Defaults are Carbon's State() init list (Tr2MainWindow.cpp:128-136), in
    // Carbon's member order (Tr2MainWindow.h:67-82).

    /**
     * Window mode.
     * @type {number}
     */
    windowMode = Tr2WindowMode.FULL_SCREEN;

    /**
     * Video adapter index (see Tr2VideoAdapterInfo).
     * @type {number}
     */
    adapter = 0;

    /**
     * Window back buffer width.
     * @type {number}
     */
    width = 0;

    /**
     * Window back buffer height.
     * @type {number}
     */
    height = 0;

    /**
     * Present interval.
     * @type {number}
     */
    presentInterval = PresentInterval.PRESENT_INTERVAL_ONE;

    /**
     * Window left coordinate (not the client area), used for windowed mode.
     * @type {number}
     */
    left = 0;

    /**
     * Window top coordinate (not the client area), used for windowed mode.
     * @type {number}
     */
    top = 0;

    /**
     * Window show state.
     * @type {number}
     */
    showState = Tr2WindowShowState.NORMAL;

    static PresentInterval = PresentInterval;
    static Tr2WindowMode = Tr2WindowMode;
    static Tr2WindowShowState = Tr2WindowShowState;

    /**
     * Returns an independent copy of this state, as Carbon copies its State
     * struct.
     *
     * @returns {Tr2MainWindowState} The copy.
     */
    Clone()
    {
        const copy = new Tr2MainWindowState();
        copy.adapter = this.adapter;
        copy.presentInterval = this.presentInterval;
        copy.height = this.height;
        copy.width = this.width;
        copy.left = this.left;
        copy.showState = this.showState;
        copy.windowMode = this.windowMode;
        copy.top = this.top;
        return copy;
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
blue.inherit(IRoot)(Tr2MainWindowState);
blue.interface()(Tr2MainWindowState);
CjsSchema.decorateMethod(Tr2MainWindowState, "ToString", blue.method);
CjsSchema.decorateMethod(Tr2MainWindowState, "__str__", meta.renamed("ToString"));
CjsSchema.blue.define(Tr2MainWindowState, {
  className: "Tr2MainWindowState",
  fields: {
        windowMode: [ type.int32, type.enum("trinity.Tr2WindowMode"), blue.readwrite, blue.persist ],
        adapter: [ type.uint32, blue.readwrite, blue.persist ],
        width: [ type.uint32, blue.readwrite, blue.persist ],
        height: [ type.uint32, blue.readwrite, blue.persist ],
        presentInterval: [ type.int32, type.enum("trinity.Tr2RenderContextEnum.PresentInterval"), blue.readwrite, blue.persist ],
        left: [ type.int32, blue.readwrite, blue.persist ],
        top: [ type.int32, blue.readwrite, blue.persist ],
        showState: [ type.int32, type.enum("trinity.Tr2WindowShowState"), blue.readwrite, blue.persist ]
    }
});

export default Tr2MainWindowState;
