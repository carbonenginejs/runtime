import assert from "node:assert/strict";
import test from "node:test";
import { ScopedThreadStatus } from "../../npm/dist/blue/services/ScopedThreadStatus.js";
import { BeThreadMonitor, BlueThreadMonitor } from "../../npm/dist/blue/services/BlueThreadMonitor.js";
import { IBlueThreadMonitor } from "../../npm/dist/blue/interfaces/IBlueThreadMonitor.js";

test("nested status scopes restore their predecessor through graph teardown", () =>
{
  const prior = BeThreadMonitor.SetThreadStatus(IBlueThreadMonitor.BTS_IDLE);
  try
  {
    const outer = new ScopedThreadStatus(IBlueThreadMonitor.BTS_WORKING), inner = new ScopedThreadStatus(IBlueThreadMonitor.BTS_LOADING);
    const current = () => BeThreadMonitor.GetStatus().find(([name]) => name === BlueThreadMonitor.MAIN_THREAD)[1];
    assert.equal(current(), IBlueThreadMonitor.BTS_LOADING);
    inner.Destruct();
    assert.equal(current(), IBlueThreadMonitor.BTS_WORKING);
    outer.Destruct();
    assert.equal(current(), IBlueThreadMonitor.BTS_IDLE);
    BeThreadMonitor.SetThreadStatus(IBlueThreadMonitor.BTS_LOADING);
    assert.equal(outer.Destruct(), false);
    assert.equal(current(), IBlueThreadMonitor.BTS_LOADING, "a second Destruct restores nothing: the graph holds the state");
  }
  finally { BeThreadMonitor.SetThreadStatus(prior); }
});
