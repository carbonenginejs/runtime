import { exposure as be } from "#be";
import { CjsSchema, type } from "#schema";
import { IRoot } from "../blue/exposure/IRoot.js";
import { IBlueEvents } from "../blue/interfaces/IBlueEvents.js";
// Source: trinity/trinity/UI/Tr2MainWindow.h
// Source: trinity/trinity/UI/Tr2MainWindow.cpp
// Source: trinity/trinity/UI/Tr2MainWindow_Windows.cpp
// Source: trinity/trinity/UI/Tr2MainWindow_Blue.cpp
import { Tr2ImeState_MacOS, Tr2WindowMode, Tr2WindowShowState } from "#consts/render-context";
import { BlueScriptCallback } from "#blue";
import { GetUIScancode, UIScancode } from "./UIScancode.js";
import { Tr2MainWindowState } from "./Tr2MainWindowState.js";
import { Tr2MouseCursor } from "./Tr2MouseCursor.js";

const CALLBACK_FIELDS = Object.freeze([
    "onKeyDown", "onKeyUp", "onChar", "onMouseDown", "onMouseUp",
    "onMouseMove", "onMouseWheel", "onClose", "onFocusChange",
    "onWindowStateChange", "onPointerCancel", "onCompositionStart"
]);

// An unset callback field still holds a nominal target. Carbon spells that as a
// default-constructed BlueScriptCallback, which reports IsValid() false and
// returns CALL_ERROR rather than failing when invoked, so nothing here has to
// test for absence before calling.
const EMPTY_CALLBACK = new BlueScriptCallback();

/**
 * Browser adaptation of CarbonEngine's main-window state and input boundary.
 *
 * Callback fields accept a function, a BlueScriptCallback, or an object with
 * `Call` and `CallVoid`; each assignment is normalized once. Notifications
 * dispatch through `CallVoid`; the return-bearing close callback dispatches
 * through `Call`. A `beforeunload` whose close callback returns literal
 * `false` is cancelled (`preventDefault` plus `returnValue`).
 */
export class Tr2MainWindow
{
    /**
     * macOS IME state (Carbon m_imeState_MacOS, Tr2MainWindow.h:253, default
     * Tr2ImeState_MacOS::DISABLED).
     *
     * @notSupported `__APPLE__` build only (Tr2MainWindow_Blue.cpp:355); the browser handles IME, so the value is
     *   stored and never blocks key events.
     * @type {number}
     */
    imeState_MacOS = Tr2ImeState_MacOS.DISABLED;

    _window = null;
    _document = null;
    _target = null;
    _screen = null;
    _state = new Tr2MainWindowState();
    _storedStates = new Map();
    _minimumSize = { width: 100, height: 100 };
    _pressed = new Set();
    _toggled = new Set();
    _cursor = null;
    _cursorPosition = [ 0, 0 ];
    _listeners = [];
    _closed = false;
    _backBufferFormat = null;
    _callbacks = new Map();
    _callbackValues = new Map();

    // The callback fields are prototype accessors so every assignment is
    // normalized once through _setCallback.

    /**
     * Key-down callback. Reads return the assigned value; writes normalize it once.
     * @type {*}
     */
    get onKeyDown()
    {
        return this._callbackValues.get("onKeyDown");
    }

    set onKeyDown(value)
    {
        this._setCallback("onKeyDown", value);
    }

    /**
     * Key-up callback. Reads return the assigned value; writes normalize it once.
     * @type {*}
     */
    get onKeyUp()
    {
        return this._callbackValues.get("onKeyUp");
    }

    set onKeyUp(value)
    {
        this._setCallback("onKeyUp", value);
    }

    /**
     * Character-input callback. Reads return the assigned value; writes normalize it once.
     * @type {*}
     */
    get onChar()
    {
        return this._callbackValues.get("onChar");
    }

    set onChar(value)
    {
        this._setCallback("onChar", value);
    }

    /**
     * Mouse-button-down callback. Reads return the assigned value; writes normalize it once.
     * @type {*}
     */
    get onMouseDown()
    {
        return this._callbackValues.get("onMouseDown");
    }

    set onMouseDown(value)
    {
        this._setCallback("onMouseDown", value);
    }

    /**
     * Mouse-button-up callback. Reads return the assigned value; writes normalize it once.
     * @type {*}
     */
    get onMouseUp()
    {
        return this._callbackValues.get("onMouseUp");
    }

    set onMouseUp(value)
    {
        this._setCallback("onMouseUp", value);
    }

    /**
     * Mouse-move callback. Reads return the assigned value; writes normalize it once.
     * @type {*}
     */
    get onMouseMove()
    {
        return this._callbackValues.get("onMouseMove");
    }

    set onMouseMove(value)
    {
        this._setCallback("onMouseMove", value);
    }

    /**
     * Mouse-wheel callback. Reads return the assigned value; writes normalize it once.
     * @type {*}
     */
    get onMouseWheel()
    {
        return this._callbackValues.get("onMouseWheel");
    }

    set onMouseWheel(value)
    {
        this._setCallback("onMouseWheel", value);
    }

    /**
     * Close callback; a literal false return cancels beforeunload. Reads return the assigned value; writes normalize it once.
     * @type {*}
     */
    get onClose()
    {
        return this._callbackValues.get("onClose");
    }

    set onClose(value)
    {
        this._setCallback("onClose", value);
    }

    /**
     * Focus-change callback. Reads return the assigned value; writes normalize it once.
     * @type {*}
     */
    get onFocusChange()
    {
        return this._callbackValues.get("onFocusChange");
    }

    set onFocusChange(value)
    {
        this._setCallback("onFocusChange", value);
    }

    /**
     * Window-state-change callback. Reads return the assigned value; writes normalize it once.
     * @type {*}
     */
    get onWindowStateChange()
    {
        return this._callbackValues.get("onWindowStateChange");
    }

    set onWindowStateChange(value)
    {
        this._setCallback("onWindowStateChange", value);
    }

    /**
     * Pointer-cancel callback (browser capture ended without a mouse-up). Reads return the assigned value; writes normalize it once.
     * @type {*}
     */
    get onPointerCancel()
    {
        return this._callbackValues.get("onPointerCancel");
    }

    set onPointerCancel(value)
    {
        this._setCallback("onPointerCancel", value);
    }

    /**
     * IME composition-start callback. Reads return the assigned value; writes normalize it once.
     * @type {*}
     */
    get onCompositionStart()
    {
        return this._callbackValues.get("onCompositionStart");
    }

    set onCompositionStart(value)
    {
        this._setCallback("onCompositionStart", value);
    }

    /** Creates a browser main-window adapter and optionally attaches host listeners. */
    constructor(options = {})
    {
        for (const field of CALLBACK_FIELDS) this[field] = null;
        if (options.state) this._state = options.state.Clone();
        this._backBufferFormat = options.backBufferFormat ?? null;
        for (const field of CALLBACK_FIELDS)
        {
            if (Object.prototype.hasOwnProperty.call(options, field)) this[field] = options[field];
        }
        if (options.window || options.document || options.target) this.Attach(options);
    }

    /** Attaches keyboard, pointer, window, and visibility listeners to injected hosts. */
    Attach(options = {})
    {
        this.Detach();
        this._window = options.window ?? globalThis.window ?? null;
        this._document = options.document ?? this._window?.document ?? globalThis.document ?? null;
        this._target = options.target ?? this._document?.documentElement ?? this._window ?? null;
        this._screen = options.screen ?? this._window?.screen ?? null;
        this._closed = false;

        this._listen(this._window, "keydown", event => this._onKeyDown(event));
        this._listen(this._window, "keyup", event => this._onKeyUp(event));
        this._listen(this._window, "keypress", event => this._invokeVoid("onChar", event.key, event));
        this._listen(this._window, "focus", event => this._invokeVoid("onFocusChange", true, event));
        this._listen(this._window, "blur", event => this._invokeVoid("onFocusChange", false, event));
        this._listen(this._target, "blur", event => this._invokeVoid("onFocusChange", false, event));
        this._listen(this._target, "compositionstart", event => this._invokeVoid("onCompositionStart", event));
        this._listen(this._window, "resize", event => this._onResize(event));
        this._listen(this._window, "beforeunload", event => this._onBeforeUnload(event));
        this._listen(this._target, "pointermove", event => this._onPointerMove(event));
        this._listen(this._target, "pointerdown", event => this._invokeVoid("onMouseDown", event.button, event.clientX, event.clientY, event));
        this._listen(this._target, "pointerup", event => this._invokeVoid("onMouseUp", event.button, event.clientX, event.clientY, event));
        // Browser capture can end without a mouse-up (touch cancellation, focus
        // changes or capture reassignment). The shared router must release drags.
        this._listen(this._target, "pointercancel", event => this._invokeVoid("onPointerCancel", event));
        this._listen(this._target, "lostpointercapture", event => this._invokeVoid("onPointerCancel", event));
        this._listen(this._target, "wheel", event => this._invokeVoid("onMouseWheel", event.deltaY, event));
        this._listen(this._document, "visibilitychange", event => this._invokeVoid("onFocusChange", !this.IsHidden(), event));
        return this;
    }

    /**
     * Carbon: ~Tr2MainWindow (trinity/trinity/UI/Tr2MainWindow.cpp:207-212).
     * @adapted This adapter acquires browser event listeners, not a native window or Blue tick; Detach releases those listeners without invoking vetoable Close or closing the host browser.
     * @returns {void}
     */
    _Destructor()
    {
        this.Detach();
    }

    /** Removes attached host listeners and clears pressed-key state. */
    Detach()
    {
        for (const [ target, type, listener ] of this._listeners) target.removeEventListener(type, listener);
        this._listeners.length = 0;
        this._pressed.clear();
        return this;
    }

    /**
     * Reports whether the adapted window is active.
     *
     * @adapted
     * @renamed HasFocus
     */
    IsActive()
    {
        return this.HasFocus();
    }

    /**
     * Reports whether the adapted document currently has focus.
     *
     * @adapted
     */
    HasFocus()
    {
        return !this._closed && (typeof this._document?.hasFocus === "function" ? this._document.hasFocus() : true);
    }

    /**
     * active (MAP_PROPERTY_READONLY): Carbon's property over HasFocus, which the macro calls.
     * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/UI/Tr2MainWindow_Blue.cpp:166).
     *
     * @adapted
     */
    get active()
    {
        return this.HasFocus();
    }

    /**
     * Reports whether the adapted document or window state is hidden.
     *
     * @adapted
     * @renamed IsMinimized
     */
    IsHidden()
    {
        return this._document?.hidden === true || this._state.showState === Tr2WindowShowState.MINIMIZED;
    }

    /**
     * Sets the minimum sanitized browser window dimensions.
     *
     * @adapted
     */
    SetMinimumSize(width, height)
    {
        this._minimumSize.width = Math.max(0, Math.trunc(Number(width) || 0));
        this._minimumSize.height = Math.max(0, Math.trunc(Number(height) || 0));
        return this;
    }

    /**
     * Applies changed sanitized window state and emits input-layer state intent.
     * Re-applying a state equal to the current one emits nothing.
     *
     * @adapted
     * @renamed SetStateScript
     */
    SetWindowState(state)
    {
        const next = state.Clone();
        this.SanitizeState(next);
        if (statesEqual(this._state, next)) return true;
        this._state = next;
        this._invokeVoid("onWindowStateChange", this._state.Clone());
        return true;
    }

    /**
     * Returns a detached snapshot of the current window state.
     *
     * @adapted
     * @renamed GetStateScript
     */
    GetWindowState()
    {
        return this._state.Clone();
    }

    /**
     * Clamps a window state to browser and configured size limits, and forces adapter index 0.
     *
     * @adapted
     * @renamed SanitizeStateScript
     */
    SanitizeState(state)
    {
        if (!(state instanceof Tr2MainWindowState)) throw new TypeError("Tr2MainWindow.SanitizeState requires Tr2MainWindowState.");
        const maximumWidth = Number(this._screen?.availWidth ?? this._screen?.width ?? this._window?.innerWidth) || 0;
        const maximumHeight = Number(this._screen?.availHeight ?? this._screen?.height ?? this._window?.innerHeight) || 0;
        state.adapter = 0;
        state.width = sanitizeDimension(state.width, maximumWidth, this._minimumSize.width);
        state.height = sanitizeDimension(state.height, maximumHeight, this._minimumSize.height);
        state.left = Math.trunc(Number(state.left) || 0);
        state.top = Math.trunc(Number(state.top) || 0);
        return state;
    }

    /**
     * Creates the default sanitized state for one window mode.
     *
     * @adapted
     */
    GetDefaultState(windowMode = Tr2WindowMode.FULL_SCREEN)
    {
        const state = new Tr2MainWindowState();
        state.windowMode = windowMode;
        state.width = Number(windowMode === Tr2WindowMode.FULL_SCREEN ? this._screen?.width : this._window?.innerWidth) || 0;
        state.height = Number(windowMode === Tr2WindowMode.FULL_SCREEN ? this._screen?.height : this._window?.innerHeight) || 0;
        return this.SanitizeState(state);
    }

    /**
     * Stores a detached state snapshot for its window mode.
     *
     * @adapted
     */
    StoreStateSettings(state)
    {
        this._storedStates.set(state.windowMode, state.Clone());
        return this;
    }

    /**
     * Returns unique browser window and screen size options; native display modes are not enumerated.
     *
     * @adapted
     */
    GetWindowSizeOptions()
    {
        const sizes = [
            [ Number(this._window?.innerWidth) || 0, Number(this._window?.innerHeight) || 0 ],
            [ Number(this._screen?.availWidth) || 0, Number(this._screen?.availHeight) || 0 ],
            [ Number(this._screen?.width) || 0, Number(this._screen?.height) || 0 ]
        ].filter(([ width, height ]) => width > 0 && height > 0);
        return sizes.filter(([ width, height ], index) => sizes.findIndex(item => item[0] === width && item[1] === height) === index);
    }

    /**
     * Sets the adapted document title when a document is available.
     *
     * @adapted
     */
    SetWindowTitle(title)
    {
        if (!this._document) return false;
        this._document.title = String(title ?? "");
        return true;
    }

    /**
     * Returns the adapted document title.
     *
     * @adapted
     */
    GetWindowTitle()
    {
        return this._document?.title ?? "";
    }

    /**
     * Applies or clears a Tr2MouseCursor on the event target.
     *
     * @adapted
     */
    SetMouseCursor(cursor)
    {
        if (cursor !== null && !(cursor instanceof Tr2MouseCursor)) throw new TypeError("Tr2MainWindow cursor must be a Tr2MouseCursor.");
        this._cursor = cursor;
        return cursor ? cursor.Apply(this._target) : true;
    }

    /**
     * Returns the currently configured mouse cursor.
     *
     * @adapted
     */
    GetMouseCursor()
    {
        return this._cursor;
    }

    /**
     * Requests browser pointer lock when supported. Returns false when the
     * target has no `requestPointerLock`, otherwise true or a promise resolving
     * true; the browser may still require a user gesture or reject.
     *
     * @adapted
     */
    ClipCursor()
    {
        if (typeof this._target?.requestPointerLock !== "function") return false;
        const result = this._target.requestPointerLock();
        return result && typeof result.then === "function" ? result.then(() => true) : true;
    }

    /**
     * Exits browser pointer lock when supported.
     *
     * @adapted
     */
    UnclipCursor()
    {
        if (typeof this._document?.exitPointerLock !== "function") return false;
        this._document.exitPointerLock();
        return true;
    }

    /**
     * Returns the last observed pointer position.
     *
     * @adapted
     */
    GetCursorPos()
    {
        return [ ...this._cursorPosition ];
    }

    /**
     * Returns false: browsers cannot warp the system cursor.
     *
     * @adapted
     */
    SetCursorPos()
    {
        // Browsers deliberately do not allow scripts to warp the system cursor.
        return false;
    }

    /**
     * Reports whether one browser or Carbon key is currently pressed.
     *
     * @adapted
     * @renamed IsKeyPressed
     */
    Key(value)
    {
        const scancode = GetUIScancode(value);
        const code = scancode?.browserCode ?? String(value);
        return this._pressed.has(code);
    }

    /**
     * Reports whether one toggle key is currently active.
     *
     * @adapted
     */
    IsKeyToggled(value)
    {
        const scancode = GetUIScancode(value);
        const code = scancode?.browserCode ?? String(value);
        return this._toggled.has(code);
    }

    /**
     * Returns the maintained display text for one key.
     *
     * @adapted
     * @renamed GetKeyName
     */
    GetKeyNameText(value)
    {
        const scancode = GetUIScancode(value);
        return scancode?.mDescription ?? String(value ?? "");
    }

    /**
     * Returns the caller-supplied back-buffer format token.
     *
     * @adapted
     */
    GetBackBufferFormat()
    {
        return this._backBufferFormat;
    }

    /**
     * Returns 0: browser windows expose no native HWND.
     *
     * @adapted
     * @renamed GetHwnd
     */
    GetHwndAsLong()
    {
        return 0;
    }

    /**
     * Returns false: browsers expose no Windows message filter.
     *
     * @notSupported `_WIN32` build only; there is no window handle to filter messages on.
     */
    SetWindowsMessageFilter()
    {
        return false;
    }

    /**
     * Returns the explicit unsupported Windows message-filter result, `[false, []]`.
     *
     * @notSupported `_WIN32` build only; there is no window handle to filter messages on.
     */
    GetWindowsMessageFilter()
    {
        return [ false, [] ];
    }

    /**
     * Returns true until Close(); the browser owns and drains its event loop.
     *
     * @adapted
     */
    ProcessMessages()
    {
        // The browser owns and drains its event loop.
        return !this._closed;
    }

    /**
     * Requests browser fullscreen mode on the configured target. Returns false
     * when unsupported, otherwise the host's result (normally a promise the
     * browser may reject).
     */
    RequestFullscreen(options)
    {
        if (typeof this._target?.requestFullscreen !== "function") return false;
        return this._target.requestFullscreen(options);
    }

    /** Exits browser fullscreen mode when supported. */
    ExitFullscreen()
    {
        if (typeof this._document?.exitFullscreen !== "function") return false;
        return this._document.exitFullscreen();
    }

    /**
     * Requests closure, then marks the adapter closed and detaches listeners
     * unless vetoed. Returns false when `onClose` returns literal false, and
     * true after closing or when already closed.
     */
    Close()
    {
        if (this._closed) return true;
        if (this._invokeCall("onClose") === false) return false;
        this._closed = true;
        this.Detach();
        return true;
    }

    /** Registers one host listener for deterministic teardown. */
    _listen(target, type, listener)
    {
        if (typeof target?.addEventListener !== "function") return;
        // Browser wheel consumers must be able to cancel page scrolling.
        target.addEventListener(type, listener, type === "wheel" ? { passive: false } : undefined);
        this._listeners.push([ target, type, listener ]);
    }

    /** Normalizes one external callback assignment at its boundary. */
    _setCallback(field, value)
    {
        const callback = BlueScriptCallback.from(value);
        this._callbackValues.set(field, value ?? null);
        this._callbacks.set(field, callback ?? EMPTY_CALLBACK);
    }

    /** Directly invokes one notification callback through its nominal target. */
    _invokeVoid(field, ...args)
    {
        this._callbacks.get(field).CallVoid(...args);
    }

    /** Directly invokes one return-bearing callback through its nominal target. */
    _invokeCall(field, ...args)
    {
        return this._callbacks.get(field).Call(...args);
    }

    /** Applies browser close-cancellation semantics to a beforeunload event. */
    _onBeforeUnload(event)
    {
        if (this._invokeCall("onClose", event) !== false) return;
        event.preventDefault?.();
        event.returnValue = "";
    }

    /** Updates pressed and toggled keys before forwarding a key-down event. */
    _onKeyDown(event)
    {
        const scancode = UIScancode.fromKeyboardEvent(event);
        this._pressed.add(scancode.browserCode);
        for (const key of [ "CapsLock", "NumLock", "ScrollLock" ])
        {
            if (typeof event.getModifierState === "function" && event.getModifierState(key)) this._toggled.add(key);
            else this._toggled.delete(key);
        }
        this._invokeVoid("onKeyDown", scancode.mDIK, event.repeat === true, event);
    }

    /** Clears one pressed key before forwarding its key-up event. */
    _onKeyUp(event)
    {
        const scancode = UIScancode.fromKeyboardEvent(event);
        this._pressed.delete(scancode.browserCode);
        this._invokeVoid("onKeyUp", scancode.mDIK, event);
    }

    /** Records and forwards one browser pointer movement. */
    _onPointerMove(event)
    {
        this._cursorPosition[0] = Number(event.clientX) || 0;
        this._cursorPosition[1] = Number(event.clientY) || 0;
        this._invokeVoid("onMouseMove", this._cursorPosition[0], this._cursorPosition[1], Number(event.movementX) || 0, Number(event.movementY) || 0, event);
    }

    /** Synchronizes the window state with one browser resize. */
    _onResize(event)
    {
        this._state.width = Number(this._window?.innerWidth) || this._state.width;
        this._state.height = Number(this._window?.innerHeight) || this._state.height;
        this._invokeVoid("onWindowStateChange", this._state.Clone(), event);
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


be.inherit(IRoot, IBlueEvents)(Tr2MainWindow);

CjsSchema.decorateField(Tr2MainWindow, "onKeyDown", type.scriptCallback, be.mapAttribute(be.READWRITE));
CjsSchema.decorateField(Tr2MainWindow, "onKeyUp", type.scriptCallback, be.mapAttribute(be.READWRITE));
CjsSchema.decorateField(Tr2MainWindow, "onChar", type.scriptCallback, be.mapAttribute(be.READWRITE));
CjsSchema.decorateField(Tr2MainWindow, "onMouseDown", type.scriptCallback, be.mapAttribute(be.READWRITE));
CjsSchema.decorateField(Tr2MainWindow, "onMouseUp", type.scriptCallback, be.mapAttribute(be.READWRITE));
CjsSchema.decorateField(Tr2MainWindow, "onMouseMove", type.scriptCallback, be.mapAttribute(be.READWRITE));
CjsSchema.decorateField(Tr2MainWindow, "onMouseWheel", type.scriptCallback, be.mapAttribute(be.READWRITE));
CjsSchema.decorateField(Tr2MainWindow, "onClose", type.scriptCallback, be.mapAttribute(be.READWRITE));
CjsSchema.decorateField(Tr2MainWindow, "onFocusChange", type.scriptCallback, be.mapAttribute(be.READWRITE));
CjsSchema.decorateField(Tr2MainWindow, "onWindowStateChange", type.scriptCallback, be.mapAttribute(be.READWRITE));
CjsSchema.decorateField(Tr2MainWindow, "imeState_MacOS", type.int32, be.mapAttribute(be.READWRITE));
CjsSchema.decorateMethod(Tr2MainWindow, "HasFocus", be.mapMethodAndWrap("IsActive"));
CjsSchema.decorateField(Tr2MainWindow, "active", type.boolean, be.mapPropertyReadOnly());
CjsSchema.decorateMethod(Tr2MainWindow, "SetMinimumSize", be.mapMethodAndWrap());
CjsSchema.decorateMethod(Tr2MainWindow, "GetDefaultState", be.mapMethodAndWrap());
CjsSchema.decorateMethod(Tr2MainWindow, "StoreStateSettings", be.mapMethodAndWrap());
CjsSchema.decorateMethod(Tr2MainWindow, "GetWindowSizeOptions", be.mapMethodAndWrap());
CjsSchema.decorateMethod(Tr2MainWindow, "SetWindowTitle", be.mapMethodAndWrap());
CjsSchema.decorateMethod(Tr2MainWindow, "GetWindowTitle", be.mapMethodAndWrap());
CjsSchema.decorateMethod(Tr2MainWindow, "ClipCursor", be.mapMethodAndWrap());
CjsSchema.decorateMethod(Tr2MainWindow, "UnclipCursor", be.mapMethodAndWrap());
CjsSchema.decorateMethod(Tr2MainWindow, "GetCursorPos", be.mapMethodAndWrap());
CjsSchema.decorateMethod(Tr2MainWindow, "SetCursorPos", be.mapMethodAndWrap());
CjsSchema.decorateMethod(Tr2MainWindow, "IsKeyToggled", be.mapMethodAndWrap());
CjsSchema.decorateMethod(Tr2MainWindow, "GetBackBufferFormat", be.mapMethodAndWrap());
CjsSchema.decorateMethod(Tr2MainWindow, "SetWindowsMessageFilter", be.mapMethodAndWrap());
CjsSchema.decorateMethod(Tr2MainWindow, "GetWindowsMessageFilter", be.mapMethodAndWrap());
CjsSchema.decorateMethod(Tr2MainWindow, "ProcessMessages", be.mapMethodAndWrap());
CjsSchema.exposure.define("Tr2MainWindow")(Tr2MainWindow);
