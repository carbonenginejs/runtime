/** Shared demo commands for console, panel and focused-viewport input. */
export function createDemoActions({ getShip, getShipStates, operations, readState, onShipChanged = () => {} })
{
  const listeners = new Set();
  const pending = new Map();
  const errors = new Map();
  let lastShip = getShip();
  let revision = 0;

  function refresh()
  {
    const ship = getShip();
    if (ship !== lastShip)
    {
      const previous = lastShip;
      lastShip = ship;
      revision++;
      onShipChanged(ship, previous);
    }
    const state = getState();
    for (const listener of listeners) listener(state);
    return state;
  }

  function getState()
  {
    const ship = getShip();
    const states = getShipStates(ship);
    const variables = ship ? ship.GetControllerVariables() : {};
    return {
      ...readState(), ship, revision,
      shipStates: states.map(state => ({ ...state, on: state.names.some(name => variables[name] > 0) })),
      pending: Array.from(pending.keys()), errors: Object.fromEntries(errors)
    };
  }

  function enabled(name, ...args)
  {
    if (!operations[name]) return false;
    if ((name === "cloak" || name === "skin") && (pending.has("cloak") || pending.has("skin"))) return false;
    if (pending.has(name)) return false;
    if (name === "setShipState") return getShipStates(getShip()).some(state => state.kind === args[0]);
    return !["speed", "kills", "damage", "effect", "cloak", "skin"].includes(name) || !!getShip();
  }

  function invoke(name, ...args)
  {
    // Keyboard and panel requests share one in-flight operation. The skin
    // implementation retains its own existing serialization for direct users.
    if (pending.has(name)) return pending.get(name);
    if (!enabled(name, ...args)) return undefined;
    errors.delete(name);
    let result;
    try { result = operations[name](...args); }
    catch (error)
    {
      errors.set(name, String(error.message ?? error));
      refresh();
      throw error;
    }
    if (!result || typeof result.then !== "function")
    {
      refresh();
      return result;
    }
    const operation = Promise.resolve(result).catch(error =>
    {
      errors.set(name, String(error.message ?? error));
      throw error;
    }).finally(() =>
    {
      if (pending.get(name) === operation) pending.delete(name);
      refresh();
    });
    pending.set(name, operation);
    refresh();
    return operation;
  }

  return {
    getState, enabled, invoke, refresh,
    subscribe(listener)
    {
      listeners.add(listener);
      listener(getState());
      return () => listeners.delete(listener);
    },
    dispose() { listeners.clear(); }
  };
}
