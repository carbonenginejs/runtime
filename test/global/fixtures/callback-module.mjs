// A callback module for BlueCallbackMan.RegisterCallbackModule tests.
export const callbacks = {
  double: value => value * 2,
  wait: (_context, { signal }) => new Promise(resolve => signal.addEventListener("abort", () => resolve("aborted"), { once: true }))
};
