import assert from "node:assert/strict";
import test from "node:test";
import {
    GetUIScancode,
    Tr2MainWindow,
    Tr2MainWindowState,
    Tr2MouseCursor,
    UIScancode
} from "../src/index.js";

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
        for (const listener of this.listeners.get(type) ?? []) listener({ type, ...event });
    }
}

test("UIScancode maps browser physical codes onto Carbon virtual-key vocabulary", () =>
{
    const key = UIScancode.FromKeyboardEvent({ code: "KeyA", key: "a", keyCode: 65 });
    assert.equal(key.mDIK, 65);
    assert.equal(key.mName, "VK_A");
    assert.equal(key.browserCode, "KeyA");
    assert.equal(GetUIScancode("ArrowLeft").mDIK, 0x25);
    assert.equal(GetUIScancode(0x70).browserCode, "F1");
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
