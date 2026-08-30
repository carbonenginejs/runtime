import assert from "node:assert/strict";
import test from "node:test";
import {
    GetUIScancode,
    SCANCODES,
    Tr2MainWindow,
    Tr2MainWindowState,
    Tr2MouseCursor,
    UIScancode
} from "../../../npm/dist/input/index.js";

class FakeTarget
{
    listeners = new Map();
    style = {};

    addEventListener(type, listener)
    {
        const values = this.listeners.get(type) ?? [];
        values.push(listener);
        this.listeners.set(type, values);
    }

    removeEventListener(type, listener)
    {
        this.listeners.set(type, (this.listeners.get(type) ?? []).filter(value => value !== listener));
    }

    dispatch(type, event = {})
    {
        const dispatched = { type, ...event };
        for (const listener of this.listeners.get(type) ?? []) listener(dispatched);
        return dispatched;
    }
}

test("UIScancode maps browser physical codes onto Carbon virtual-key vocabulary", () =>
{
    const key = UIScancode.fromKeyboardEvent({ code: "KeyA", key: "a", keyCode: 65 });
    assert.equal(key.mDIK, 65);
    assert.equal(key.mName, "VK_A");
    assert.equal(key.browserCode, "KeyA");
    assert.equal(GetUIScancode("ArrowLeft").mDIK, 0x25);
    assert.equal(GetUIScancode(0x70).browserCode, "F1");
    assert.equal(GetUIScancode("VK_RETURN").browserCode, "Enter");
    assert.equal(GetUIScancode(0x0d).browserCode, "Enter");
});

test("Tr2MainWindowState retains Carbon defaults and reset comparison", () =>
{
    const state = new Tr2MainWindowState();
    assert.equal(state.presentInterval, Tr2MainWindowState.PresentInterval.PRESENT_INTERVAL_ONE);
    assert.equal(state.__str__(), "full screen on adapter 0 0x0, present interval one");

    const windowed = state.Clone().SetValues({
        windowMode: Tr2MainWindowState.Tr2WindowMode.WINDOWED,
        width: 1280,
        height: 720,
        left: -12,
        top: 34,
        showState: Tr2MainWindowState.Tr2WindowShowState.MAXIMIZED
    });
    assert.equal(windowed.__str__(), "windowed on adapter 0 1280x720, present interval one, position (-12, 34), maximized");
    assert.equal(windowed.RequiresDeviceReset(state), true);
    assert.throws(
        () => windowed.RequiresDeviceReset(state.GetValues()),
        /requires Tr2MainWindowState/u
    );
});

test("Tr2MouseCursor realizes browser CSS cursor state without native handles", () =>
{
    const cursor = new Tr2MouseCursor("res:/ui/cursor.png", 4, 7);
    const target = new FakeTarget();

    assert.equal(cursor.IsValid(), true);
    assert.equal(cursor.Apply(target), true);
    assert.equal(target.style.cursor, "url(\"res:/ui/cursor.png\") 4 7, auto");
    cursor.Destroy();
    assert.equal(cursor.IsValid(), false);
});

test("Tr2MainWindow tracks browser input and exposes honest host limitations", async () =>
{
    const windowTarget = new FakeTarget();
    const documentTarget = new FakeTarget();
    const element = new FakeTarget();
    let pointerLocks = 0;
    let pointerUnlocks = 0;
    element.requestPointerLock = async () => { pointerLocks++; };
    documentTarget.exitPointerLock = () => { pointerUnlocks++; };
    documentTarget.hasFocus = () => true;
    documentTarget.hidden = false;
    documentTarget.title = "before";
    documentTarget.documentElement = element;
    windowTarget.document = documentTarget;
    windowTarget.screen = { width: 1920, height: 1080, availWidth: 1900, availHeight: 1040 };
    windowTarget.innerWidth = 1280;
    windowTarget.innerHeight = 720;

    const keys = [];
    const mainWindow = new Tr2MainWindow({
        window: windowTarget,
        document: documentTarget,
        target: element,
        onKeyDown: value => keys.push(value)
    });

    windowTarget.dispatch("keydown", {
        code: "KeyW",
        key: "w",
        keyCode: 87,
        repeat: false,
        getModifierState: () => false
    });
    assert.equal(mainWindow.Key("KeyW"), true);
    assert.deepEqual(keys, [ 87 ]);
    windowTarget.dispatch("keyup", { code: "KeyW", key: "w", keyCode: 87 });
    assert.equal(mainWindow.Key("KeyW"), false);

    element.dispatch("pointermove", { clientX: 42, clientY: 19, movementX: 2, movementY: -1 });
    assert.deepEqual(mainWindow.GetCursorPos(), [ 42, 19 ]);
    assert.equal(mainWindow.SetCursorPos(10, 10), false);
    assert.equal(mainWindow.GetHwndAsLong(), 0);
    assert.equal(mainWindow.SetWindowsMessageFilter(true, [ 1 ]), false);

    assert.equal(mainWindow.SetWindowTitle("CarbonEngineJS"), true);
    assert.equal(mainWindow.GetWindowTitle(), "CarbonEngineJS");
    assert.equal(mainWindow.HasFocus(), true);
    assert.deepEqual(mainWindow.GetWindowSizeOptions(), [ [ 1280, 720 ], [ 1900, 1040 ], [ 1920, 1080 ] ]);
    assert.equal(await mainWindow.ClipCursor(), true);
    assert.equal(mainWindow.UnclipCursor(), true);
    assert.equal(pointerLocks, 1);
    assert.equal(pointerUnlocks, 1);

    mainWindow.Close();
    assert.equal(mainWindow.ProcessMessages(), false);
});

test("Tr2MainWindow normalizes callbacks once and distinguishes CallVoid from Call", () =>
{
    const windowTarget = new FakeTarget();
    const documentTarget = new FakeTarget();
    const target = new FakeTarget();
    const calls = [];
    const callback = {
        Call(...args)
        {
            calls.push([ "Call", ...args ]);
            return false;
        },
        CallVoid(...args)
        {
            calls.push([ "CallVoid", ...args ]);
        }
    };
    documentTarget.documentElement = target;
    windowTarget.document = documentTarget;

    const mainWindow = new Tr2MainWindow({
        window: windowTarget,
        document: documentTarget,
        target,
        onKeyDown: callback,
        onClose: callback
    });

    windowTarget.dispatch("keydown", {
        code: "KeyA",
        key: "a",
        keyCode: 65,
        getModifierState: () => false
    });
    const beforeUnload = windowTarget.dispatch("beforeunload", {
        preventDefault()
        {
            calls.push([ "preventDefault" ]);
        }
    });

    assert.equal(calls[0][0], "CallVoid");
    assert.equal(calls[1][0], "Call");
    assert.deepEqual(calls[2], [ "preventDefault" ]);
    assert.equal(beforeUnload.returnValue, "");
    assert.equal(mainWindow.Close(), false);
    assert.equal(mainWindow.ProcessMessages(), true);

    mainWindow.onClose = () => true;
    assert.equal(mainWindow.onClose instanceof Function, true);
    assert.equal(mainWindow.Close(), true);
    assert.equal(mainWindow.ProcessMessages(), false);
    assert.throws(
        () => { mainWindow.onKeyUp = { Call() {} }; },
        /Call and CallVoid/u
    );
    assert.equal(mainWindow.onKeyUp, null);
});

test("Tr2MainWindow emits only changed state intent from the input layer", () =>
{
    const headlessChanges = [];
    const headless = new Tr2MainWindow({
        onWindowStateChange: state => headlessChanges.push(state)
    });
    assert.deepEqual(headless.GetDefaultState().GetValues(), new Tr2MainWindowState().GetValues());
    assert.equal(headless.SetWindowState(headless.GetWindowState()), true);
    assert.equal(headlessChanges.length, 0);

    const windowTarget = new FakeTarget();
    const documentTarget = new FakeTarget();
    const target = new FakeTarget();
    documentTarget.documentElement = target;
    windowTarget.document = documentTarget;
    windowTarget.innerWidth = 1280;
    windowTarget.innerHeight = 720;
    windowTarget.screen = { width: 1920, height: 1080, availWidth: 1900, availHeight: 1040 };

    const changes = [];
    const mainWindow = new Tr2MainWindow({
        window: windowTarget,
        document: documentTarget,
        target,
        state: { width: 1280, height: 720 },
        onWindowStateChange: state => changes.push(state)
    });

    assert.equal(Object.hasOwn(mainWindow, "onBeforeSwapChainChange"), false);
    assert.equal(Object.hasOwn(mainWindow, "onSwapChainChange"), false);
    assert.equal(mainWindow.SetWindowState(mainWindow.GetWindowState()), true);
    assert.equal(changes.length, 0);

    const changed = mainWindow.GetWindowState();
    changed.width = 900;
    assert.equal(mainWindow.SetWindowState(changed), true);
    assert.equal(changes.length, 1);
    assert.equal(changes[0].width, 900);
});
