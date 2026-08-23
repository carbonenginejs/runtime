// Source: trinity/trinity/UI/Tr2MainWindow.h
// Source: trinity/trinity/UI/Tr2MainWindow.cpp
// Source: trinity/trinity/UI/Tr2MainWindow_Windows.cpp
// Source: trinity/trinity/UI/Tr2MainWindow_Blue.cpp
import { Tr2WindowMode, Tr2WindowShowState } from "#consts/render-context";
import { CjsScriptCallback } from "#contracts";
import { GetUIScancode, UIScancode } from "./UIScancode.js";
import { Tr2MainWindowState } from "./Tr2MainWindowState.js";
import { Tr2MouseCursor } from "./Tr2MouseCursor.js";

const CALLBACK_FIELDS = Object.freeze([
    "onKeyDown", "onKeyUp", "onChar", "onMouseDown", "onMouseUp",
    "onMouseMove", "onMouseWheel", "onClose", "onFocusChange",
    "onWindowStateChange"
]);

const EMPTY_CALLBACK = new class extends CjsScriptCallback
{

    Call()
    {
        return undefined;
    }

    CallVoid()
    {
        // Intentionally empty: optional callback fields always have a nominal target.
    }

}();

/**
 * Browser adaptation of CarbonEngine's main-window state and input boundary.
 */
export class Tr2MainWindow
{
    /** Creates a browser main-window adapter and optionally attaches host listeners. */
    constructor(options = {})
    {
        for (const field of CALLBACK_FIELDS)
        {
            Object.defineProperty(this, field, {
                enumerable: true,
                get: () => this.#callbackValues.get(field),
                set: value => this.#setCallback(field, value)
            });
            this[field] = null;
        }
        this.imeState_MacOS = 0;
        this.#state = new Tr2MainWindowState(options.state);
        this.#storedStates = new Map();
        this.#minimumSize = { width: 100, height: 100 };
        this.#pressed = new Set();
        this.#toggled = new Set();
        this.#cursorPosition = [ 0, 0 ];
        this.#listeners = [];
        this.#backBufferFormat = options.backBufferFormat ?? null;
        for (const field of CALLBACK_FIELDS)
        {
            if (Object.prototype.hasOwnProperty.call(options, field)) this[field] = options[field];
        }
        if (options.window || options.document || options.target) this.Attach(options);
    }

    #window = null;
    #document = null;
    #target = null;
    #screen = null;
    #state;
    #storedStates;
    #minimumSize;
    #pressed;
    #toggled;
    #cursor = null;
    #cursorPosition;
    #listeners;
    #closed = false;
    #backBufferFormat;
    #callbacks = new Map();
    #callbackValues = new Map();

    /** Attaches keyboard, pointer, window, and visibility listeners to injected hosts. */
    Attach(options = {})
    {
        this.Detach();
        this.#window = options.window ?? globalThis.window ?? null;
        this.#document = options.document ?? this.#window?.document ?? globalThis.document ?? null;
        this.#target = options.target ?? this.#document?.documentElement ?? this.#window ?? null;
        this.#screen = options.screen ?? this.#window?.screen ?? null;
        this.#closed = false;

        this.#listen(this.#window, "keydown", event => this.#onKeyDown(event));
        this.#listen(this.#window, "keyup", event => this.#onKeyUp(event));
        this.#listen(this.#window, "keypress", event => this.#invokeVoid("onChar", event.key, event));
        this.#listen(this.#window, "focus", event => this.#invokeVoid("onFocusChange", true, event));
        this.#listen(this.#window, "blur", event => this.#invokeVoid("onFocusChange", false, event));
        this.#listen(this.#window, "resize", event => this.#onResize(event));
        this.#listen(this.#window, "beforeunload", event => this.#onBeforeUnload(event));
        this.#listen(this.#target, "pointermove", event => this.#onPointerMove(event));
        this.#listen(this.#target, "pointerdown", event => this.#invokeVoid("onMouseDown", event.button, event.clientX, event.clientY, event));
        this.#listen(this.#target, "pointerup", event => this.#invokeVoid("onMouseUp", event.button, event.clientX, event.clientY, event));
        this.#listen(this.#target, "wheel", event => this.#invokeVoid("onMouseWheel", event.deltaY, event));
        this.#listen(this.#document, "visibilitychange", event => this.#invokeVoid("onFocusChange", !this.IsHidden(), event));
        return this;
    }

    /** Removes attached host listeners and clears pressed-key state. */
    Detach()
    {
        for (const [ target, type, listener ] of this.#listeners) target.removeEventListener(type, listener);
        this.#listeners.length = 0;
        this.#pressed.clear();
        return this;
    }

    /** Reports whether the adapted window is active. */
    IsActive()
    {
        return this.HasFocus();
    }

    /** Reports whether the adapted document currently has focus. */
    HasFocus()
    {
        return !this.#closed && (typeof this.#document?.hasFocus === "function" ? this.#document.hasFocus() : true);
    }

    /** Reports whether the adapted document or window state is hidden. */
    IsHidden()
    {
        return this.#document?.hidden === true || this.#state.showState === Tr2WindowShowState.MINIMIZED;
    }

    /** Sets the minimum sanitized browser window dimensions. */
    SetMinimumSize(width, height)
    {
        this.#minimumSize.width = Math.max(0, Math.trunc(Number(width) || 0));
        this.#minimumSize.height = Math.max(0, Math.trunc(Number(height) || 0));
        return this;
    }

    /** Applies changed sanitized window state and emits input-layer state intent. */
    SetWindowState(state)
    {
        const next = state instanceof Tr2MainWindowState ? state.Clone() : new Tr2MainWindowState(state);
        this.SanitizeState(next);
        if (statesEqual(this.#state, next)) return true;
        this.#state = next;
        this.#invokeVoid("onWindowStateChange", this.#state.Clone());
        return true;
    }

    /** Returns a detached snapshot of the current window state. */
    GetWindowState()
    {
        return this.#state.Clone();
    }

    /** Clamps a window state to browser and configured size limits. */
    SanitizeState(state)
    {
        if (!(state instanceof Tr2MainWindowState)) throw new TypeError("Tr2MainWindow.SanitizeState requires Tr2MainWindowState.");
        const maximumWidth = Number(this.#screen?.availWidth ?? this.#screen?.width ?? this.#window?.innerWidth) || 0;
        const maximumHeight = Number(this.#screen?.availHeight ?? this.#screen?.height ?? this.#window?.innerHeight) || 0;
        state.adapter = 0;
        state.width = sanitizeDimension(state.width, maximumWidth, this.#minimumSize.width);
        state.height = sanitizeDimension(state.height, maximumHeight, this.#minimumSize.height);
        state.left = Math.trunc(Number(state.left) || 0);
        state.top = Math.trunc(Number(state.top) || 0);
        return state;
    }

    /** Creates the default sanitized state for one window mode. */
    GetDefaultState(windowMode = Tr2WindowMode.FULL_SCREEN)
    {
        const state = new Tr2MainWindowState({ windowMode });
        state.width = Number(windowMode === Tr2WindowMode.FULL_SCREEN ? this.#screen?.width : this.#window?.innerWidth) || 0;
        state.height = Number(windowMode === Tr2WindowMode.FULL_SCREEN ? this.#screen?.height : this.#window?.innerHeight) || 0;
        return this.SanitizeState(state);
    }

    /** Stores a detached state snapshot for its window mode. */
    StoreStateSettings(state)
    {
        const value = state instanceof Tr2MainWindowState ? state : new Tr2MainWindowState(state);
        this.#storedStates.set(value.windowMode, value.Clone());
        return this;
    }

    /** Returns unique browser window and screen size options. */
    GetWindowSizeOptions()
    {
        const sizes = [
            [ Number(this.#window?.innerWidth) || 0, Number(this.#window?.innerHeight) || 0 ],
            [ Number(this.#screen?.availWidth) || 0, Number(this.#screen?.availHeight) || 0 ],
            [ Number(this.#screen?.width) || 0, Number(this.#screen?.height) || 0 ]
        ].filter(([ width, height ]) => width > 0 && height > 0);
        return sizes.filter(([ width, height ], index) => sizes.findIndex(item => item[0] === width && item[1] === height) === index);
    }

    /** Sets the adapted document title when a document is available. */
    SetWindowTitle(title)
    {
        if (!this.#document) return false;
        this.#document.title = String(title ?? "");
        return true;
    }

    /** Returns the adapted document title. */
    GetWindowTitle()
    {
        return this.#document?.title ?? "";
    }

    /** Applies or clears a Tr2MouseCursor on the event target. */
    SetMouseCursor(cursor)
    {
        if (cursor !== null && !(cursor instanceof Tr2MouseCursor)) throw new TypeError("Tr2MainWindow cursor must be a Tr2MouseCursor.");
        this.#cursor = cursor;
        return cursor ? cursor.Apply(this.#target) : true;
    }

    /** Returns the currently configured mouse cursor. */
    GetMouseCursor()
    {
        return this.#cursor;
    }

    /** Requests browser pointer lock when supported. */
    ClipCursor()
    {
        if (typeof this.#target?.requestPointerLock !== "function") return false;
        const result = this.#target.requestPointerLock();
        return result && typeof result.then === "function" ? result.then(() => true) : true;
    }

    /** Exits browser pointer lock when supported. */
    UnclipCursor()
    {
        if (typeof this.#document?.exitPointerLock !== "function") return false;
        this.#document.exitPointerLock();
        return true;
    }

    /** Returns the last observed pointer position. */
    GetCursorPos()
    {
        return [ ...this.#cursorPosition ];
    }

    /** Reports unsupported because browsers cannot warp the system cursor. */
    SetCursorPos()
    {
        // Browsers deliberately do not allow scripts to warp the system cursor.
        return false;
    }

    /** Reports whether one browser or Carbon key is currently pressed. */
    Key(value)
    {
        const scancode = GetUIScancode(value);
        const code = scancode?.browserCode ?? String(value);
        return this.#pressed.has(code);
    }

    /** Reports whether one toggle key is currently active. */
    IsKeyToggled(value)
    {
        const scancode = GetUIScancode(value);
        const code = scancode?.browserCode ?? String(value);
        return this.#toggled.has(code);
    }

    /** Returns the maintained display text for one key. */
    GetKeyNameText(value)
    {
        const scancode = GetUIScancode(value);
        return scancode?.mDescription ?? String(value ?? "");
    }

    /** Returns the caller-supplied back-buffer format token. */
    GetBackBufferFormat()
    {
        return this.#backBufferFormat;
    }

    /** Returns zero because browser windows expose no native HWND. */
    GetHwndAsLong()
    {
        return 0;
    }

    /** Reports unsupported because browsers expose no Windows message filter. */
    SetWindowsMessageFilter()
    {
        return false;
    }

    /** Returns the explicit unsupported Windows message-filter result. */
    GetWindowsMessageFilter()
    {
        return [ false, [] ];
    }

    /** Reports whether the browser-owned event loop may continue processing. */
    ProcessMessages()
    {
        // The browser owns and drains its event loop.
        return !this.#closed;
    }

    /** Requests browser fullscreen mode on the configured target. */
    RequestFullscreen(options)
    {
        if (typeof this.#target?.requestFullscreen !== "function") return false;
        return this.#target.requestFullscreen(options);
    }

    /** Exits browser fullscreen mode when supported. */
    ExitFullscreen()
    {
        if (typeof this.#document?.exitFullscreen !== "function") return false;
        return this.#document.exitFullscreen();
    }

    /** Requests closure, then marks the adapter closed and detaches listeners unless vetoed. */
    Close()
    {
        if (this.#closed) return true;
        if (this.#invokeCall("onClose") === false) return false;
        this.#closed = true;
        this.Detach();
        return true;
    }

    /** Registers one host listener for deterministic teardown. */
    #listen(target, type, listener)
    {
        if (typeof target?.addEventListener !== "function") return;
        target.addEventListener(type, listener);
        this.#listeners.push([ target, type, listener ]);
    }

    /** Normalizes one external callback assignment at its boundary. */
    #setCallback(field, value)
    {
        const callback = CjsScriptCallback.from(value);
        this.#callbackValues.set(field, value ?? null);
        this.#callbacks.set(field, callback ?? EMPTY_CALLBACK);
    }

    /** Directly invokes one notification callback through its nominal target. */
    #invokeVoid(field, ...args)
    {
        this.#callbacks.get(field).CallVoid(...args);
    }

    /** Directly invokes one return-bearing callback through its nominal target. */
    #invokeCall(field, ...args)
    {
        return this.#callbacks.get(field).Call(...args);
    }

    /** Applies browser close-cancellation semantics to a beforeunload event. */
    #onBeforeUnload(event)
    {
        if (this.#invokeCall("onClose", event) !== false) return;
        event.preventDefault?.();
        event.returnValue = "";
    }

    /** Updates pressed and toggled keys before forwarding a key-down event. */
    #onKeyDown(event)
    {
        const scancode = UIScancode.fromKeyboardEvent(event);
        this.#pressed.add(scancode.browserCode);
        for (const key of [ "CapsLock", "NumLock", "ScrollLock" ])
        {
            if (typeof event.getModifierState === "function" && event.getModifierState(key)) this.#toggled.add(key);
            else this.#toggled.delete(key);
        }
        this.#invokeVoid("onKeyDown", scancode.mDIK, event.repeat === true, event);
    }

    /** Clears one pressed key before forwarding its key-up event. */
    #onKeyUp(event)
    {
        const scancode = UIScancode.fromKeyboardEvent(event);
        this.#pressed.delete(scancode.browserCode);
        this.#invokeVoid("onKeyUp", scancode.mDIK, event);
    }

    /** Records and forwards one browser pointer movement. */
    #onPointerMove(event)
    {
        this.#cursorPosition[0] = Number(event.clientX) || 0;
        this.#cursorPosition[1] = Number(event.clientY) || 0;
        this.#invokeVoid("onMouseMove", this.#cursorPosition[0], this.#cursorPosition[1], Number(event.movementX) || 0, Number(event.movementY) || 0, event);
    }

    /** Synchronizes the window state with one browser resize. */
    #onResize(event)
    {
        this.#state.width = Number(this.#window?.innerWidth) || this.#state.width;
        this.#state.height = Number(this.#window?.innerHeight) || this.#state.height;
        this.#invokeVoid("onWindowStateChange", this.#state.Clone(), event);
    }
}

function statesEqual(left, right)
{
    return left.adapter === right.adapter &&
        left.presentInterval === right.presentInterval &&
        left.height === right.height &&
        left.width === right.width &&
        left.left === right.left &&
        left.showState === right.showState &&
        left.windowMode === right.windowMode &&
        left.top === right.top;
}

function sanitizeDimension(value, maximum, minimum)
{
    const requested = Math.max(0, Math.trunc(Number(value) || 0));
    if (maximum <= 0) return requested;
    return Math.min(maximum, Math.max(minimum, requested || maximum));
}

export default Tr2MainWindow;
