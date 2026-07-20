// Browser adaptation of CarbonEngine trinity/trinity/UI/Tr2MainWindow.
import { Tr2WindowMode, Tr2WindowShowState } from "@carbonenginejs/runtime-const/render-context";
import { GetUIScancode, UIScancode } from "./UIScancode.js";
import { Tr2MainWindowState } from "./Tr2MainWindowState.js";
import { Tr2MouseCursor } from "./Tr2MouseCursor.js";

const CALLBACK_FIELDS = Object.freeze([
    "onSwapChainChange", "onBeforeSwapChainChange", "onWindowsMessage", "onKeyDown",
    "onKeyUp", "onChar", "onMouseDown", "onMouseUp", "onMouseMove", "onMouseWheel",
    "onClose", "onFocusChange", "onWindowStateChange", "onInsertTextIME_MacOS",
    "onSetMarkedTextIME_MacOS", "onKeyboardLayoutChange_MacOS"
]);

export class Tr2MainWindow
{
    constructor(options = {})
    {
        for (const field of CALLBACK_FIELDS) this[field] = null;
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
        this.#listen(this.#window, "keypress", event => this.#invoke("onChar", event.key, event));
        this.#listen(this.#window, "focus", event => this.#invoke("onFocusChange", true, event));
        this.#listen(this.#window, "blur", event => this.#invoke("onFocusChange", false, event));
        this.#listen(this.#window, "resize", event => this.#onResize(event));
        this.#listen(this.#window, "beforeunload", event => this.#invoke("onClose", event));
        this.#listen(this.#target, "pointermove", event => this.#onPointerMove(event));
        this.#listen(this.#target, "pointerdown", event => this.#invoke("onMouseDown", event.button, event.clientX, event.clientY, event));
        this.#listen(this.#target, "pointerup", event => this.#invoke("onMouseUp", event.button, event.clientX, event.clientY, event));
        this.#listen(this.#target, "wheel", event => this.#invoke("onMouseWheel", event.deltaY, event));
        this.#listen(this.#document, "visibilitychange", event => this.#invoke("onFocusChange", !this.IsHidden(), event));
        return this;
    }

    Detach()
    {
        for (const [ target, type, listener ] of this.#listeners) target.removeEventListener(type, listener);
        this.#listeners.length = 0;
        this.#pressed.clear();
        return this;
    }

    IsActive()
    {
        return this.HasFocus();
    }

    HasFocus()
    {
        return !this.#closed && (typeof this.#document?.hasFocus === "function" ? this.#document.hasFocus() : true);
    }

    IsHidden()
    {
        return this.#document?.hidden === true || this.#state.showState === Tr2WindowShowState.MINIMIZED;
    }

    SetMinimumSize(width, height)
    {
        this.#minimumSize.width = Math.max(0, Math.trunc(Number(width) || 0));
        this.#minimumSize.height = Math.max(0, Math.trunc(Number(height) || 0));
        return this;
    }

    SetWindowState(state)
    {
        const next = state instanceof Tr2MainWindowState ? state.Clone() : new Tr2MainWindowState(state);
        this.SanitizeState(next);
        this.#invoke("onBeforeSwapChainChange", this.#state.Clone(), next.Clone());
        this.#state = next;
        this.#invoke("onWindowStateChange", this.#state.Clone());
        this.#invoke("onSwapChainChange", this.#state.Clone());
        return true;
    }

    GetWindowState()
    {
        return this.#state.Clone();
    }

    SanitizeState(state)
    {
        if (!(state instanceof Tr2MainWindowState)) throw new TypeError("Tr2MainWindow.SanitizeState requires Tr2MainWindowState.");
        const maximumWidth = Number(this.#screen?.availWidth ?? this.#screen?.width ?? this.#window?.innerWidth) || Number.MAX_SAFE_INTEGER;
        const maximumHeight = Number(this.#screen?.availHeight ?? this.#screen?.height ?? this.#window?.innerHeight) || Number.MAX_SAFE_INTEGER;
        state.adapter = 0;
        state.width = Math.min(maximumWidth, Math.max(this.#minimumSize.width, Math.trunc(state.width || maximumWidth)));
        state.height = Math.min(maximumHeight, Math.max(this.#minimumSize.height, Math.trunc(state.height || maximumHeight)));
        state.left = Math.trunc(Number(state.left) || 0);
        state.top = Math.trunc(Number(state.top) || 0);
        return state;
    }

    GetDefaultState(windowMode = Tr2WindowMode.FULL_SCREEN)
    {
        const state = new Tr2MainWindowState({ windowMode });
        state.width = Number(windowMode === Tr2WindowMode.FULL_SCREEN ? this.#screen?.width : this.#window?.innerWidth) || 0;
        state.height = Number(windowMode === Tr2WindowMode.FULL_SCREEN ? this.#screen?.height : this.#window?.innerHeight) || 0;
        return this.SanitizeState(state);
    }

    StoreStateSettings(state)
    {
        const value = state instanceof Tr2MainWindowState ? state : new Tr2MainWindowState(state);
        this.#storedStates.set(value.windowMode, value.Clone());
        return this;
    }

    GetWindowSizeOptions()
    {
        const sizes = [
            [ Number(this.#window?.innerWidth) || 0, Number(this.#window?.innerHeight) || 0 ],
            [ Number(this.#screen?.availWidth) || 0, Number(this.#screen?.availHeight) || 0 ],
            [ Number(this.#screen?.width) || 0, Number(this.#screen?.height) || 0 ]
        ].filter(([ width, height ]) => width > 0 && height > 0);
        return sizes.filter(([ width, height ], index) => sizes.findIndex(item => item[0] === width && item[1] === height) === index);
    }

    SetWindowTitle(title)
    {
        if (!this.#document) return false;
        this.#document.title = String(title ?? "");
        return true;
    }

    GetWindowTitle()
    {
        return this.#document?.title ?? "";
    }

    SetMouseCursor(cursor)
    {
        if (cursor !== null && !(cursor instanceof Tr2MouseCursor)) throw new TypeError("Tr2MainWindow cursor must be a Tr2MouseCursor.");
        this.#cursor = cursor;
        return cursor ? cursor.Apply(this.#target) : true;
    }

    GetMouseCursor()
    {
        return this.#cursor;
    }

    ClipCursor()
    {
        if (typeof this.#target?.requestPointerLock !== "function") return false;
        const result = this.#target.requestPointerLock();
        return result && typeof result.then === "function" ? result.then(() => true) : true;
    }

    UnclipCursor()
    {
        if (typeof this.#document?.exitPointerLock !== "function") return false;
        this.#document.exitPointerLock();
        return true;
    }

    GetCursorPos()
    {
        return [ ...this.#cursorPosition ];
    }

    SetCursorPos()
    {
        // Browsers deliberately do not allow scripts to warp the system cursor.
        return false;
    }

    Key(value)
    {
        const scancode = GetUIScancode(value);
        const code = scancode?.browserCode ?? String(value);
        return this.#pressed.has(code);
    }

    IsKeyToggled(value)
    {
        const scancode = GetUIScancode(value);
        const code = scancode?.browserCode ?? String(value);
        return this.#toggled.has(code);
    }

    GetKeyNameText(value)
    {
        const scancode = GetUIScancode(value);
        return scancode?.mDescription ?? String(value ?? "");
    }

    GetBackBufferFormat()
    {
        return this.#backBufferFormat;
    }

    GetHwndAsLong()
    {
        return 0;
    }

    SetWindowsMessageFilter()
    {
        return false;
    }

    GetWindowsMessageFilter()
    {
        return [ false, [] ];
    }

    ProcessMessages()
    {
        // The browser owns and drains its event loop.
        return !this.#closed;
    }

    RequestFullscreen(options)
    {
        if (typeof this.#target?.requestFullscreen !== "function") return false;
        return this.#target.requestFullscreen(options);
    }

    ExitFullscreen()
    {
        if (typeof this.#document?.exitFullscreen !== "function") return false;
        return this.#document.exitFullscreen();
    }

    Close()
    {
        if (this.#closed) return this;
        this.#closed = true;
        this.#invoke("onClose");
        this.Detach();
        return this;
    }

    #listen(target, type, listener)
    {
        if (typeof target?.addEventListener !== "function") return;
        target.addEventListener(type, listener);
        this.#listeners.push([ target, type, listener ]);
    }

    #invoke(field, ...args)
    {
        const callback = this[field];
        if (typeof callback === "function") return callback(...args);
        if (callback && typeof callback.Call === "function") return callback.Call(...args);
        return undefined;
    }

    #onKeyDown(event)
    {
        const scancode = UIScancode.FromKeyboardEvent(event);
        this.#pressed.add(scancode.browserCode);
        for (const key of [ "CapsLock", "NumLock", "ScrollLock" ])
        {
            if (typeof event.getModifierState === "function" && event.getModifierState(key)) this.#toggled.add(key);
            else this.#toggled.delete(key);
        }
        this.#invoke("onKeyDown", scancode.mDIK, event.repeat === true, event);
    }

    #onKeyUp(event)
    {
        const scancode = UIScancode.FromKeyboardEvent(event);
        this.#pressed.delete(scancode.browserCode);
        this.#invoke("onKeyUp", scancode.mDIK, event);
    }

    #onPointerMove(event)
    {
        this.#cursorPosition[0] = Number(event.clientX) || 0;
        this.#cursorPosition[1] = Number(event.clientY) || 0;
        this.#invoke("onMouseMove", this.#cursorPosition[0], this.#cursorPosition[1], Number(event.movementX) || 0, Number(event.movementY) || 0, event);
    }

    #onResize(event)
    {
        this.#state.width = Number(this.#window?.innerWidth) || this.#state.width;
        this.#state.height = Number(this.#window?.innerHeight) || this.#state.height;
        this.#invoke("onWindowStateChange", this.#state.Clone(), event);
    }
}

export default Tr2MainWindow;
