/** Focused-viewport policy; Tr2MainWindow owns the keyboard/pointer/wheel listeners. */
export function createDemoInput({ mainWindow, canvas, document, controls, actions,
  isEnabled = () => true, showHelp = () => {}, onError = () => {} })
{
  const held = new Map(), queue = [], listeners = [], changes = new Set();
  const motion = { orbit: [0, 0], pan: [0, 0], dolly: 0, fov: 0 };
  let gesture = null, composing = false, disposed = false;
  const commands = new Map();
  const add = (name, label, code, run, enabled = () => true, continuous = false, shift = false) =>
    commands.set(name, { name, label, run, enabled, continuous, defaults: [{ code, shift }], bindings: [{ code, shift }] });
  const invoke = (name, ...args) => actions.invoke(name, ...args);
  for (const [direction, x, y] of [["Left",-1,0],["Right",1,0],["Up",0,-1],["Down",0,1]])
  {
    add(`orbit.${direction}`, `Orbit ${direction.toLowerCase()}`, `Arrow${direction}`, dt => controls.orbit(x*300*dt,y*300*dt), undefined, true);
    add(`pan.${direction}`, `Pan ${direction.toLowerCase()}`, `Arrow${direction}`, dt => controls.pan(x*300*dt,y*300*dt), undefined, true, true);
  }
  add("dolly.in", "Dolly in", "Equal", dt => controls.dolly(-500*dt), undefined, true);
  add("dolly.out", "Dolly out", "Minus", dt => controls.dolly(500*dt), undefined, true);
  add("fov.down", "Narrow field of view", "BracketLeft", dt => controls.adjustFieldOfView(-400*dt), undefined, true);
  add("fov.up", "Widen field of view", "BracketRight", dt => controls.adjustFieldOfView(400*dt), undefined, true);
  add("frame", "Frame hull", "KeyF", () => { cancel(); controls.frame(); });
  add("reset", "Reset camera", "KeyR", () => { cancel(); controls.reset(); });
  add("post", "Toggle post processing", "KeyP", () => invoke("post", !actions.getState().post), () => actions.enabled("post"));
  add("warp", "Toggle warp visual", "KeyW", () => invoke("setShipState", "warp", !actions.getState().shipStates.find(state => state.kind === "warp")?.on), () => actions.enabled("setShipState", "warp"));
  add("cloak", "Toggle cloak", "KeyC", () => invoke("cloak", !actions.getState().cloaked), () => actions.enabled("cloak"));
  add("skin", "Change skin", "KeyK", () => invoke("skin"), () => actions.enabled("skin"));
  add("speed.down", "Decrease speed", "Comma", dt => invoke("speed", Math.max(0, actions.getState().speed-dt)), () => actions.enabled("speed"), true);
  add("speed.up", "Increase speed", "Period", dt => invoke("speed", Math.min(2, actions.getState().speed+dt)), () => actions.enabled("speed"), true);
  add("speed.stop", "Stop speed", "Digit0", () => invoke("speed", 0), () => actions.enabled("speed"));
  add("help", "Show controls", "KeyH", showHelp);
  // Registered now for a stable help/rebinding table, unbound until capture exists.
  commands.set("capture", { name:"capture", label:"Save viewport PNG", run:()=>invoke("capture"), enabled:()=>actions.enabled("capture"), defaults:[], bindings:[] });

  function notify() { for (const listener of changes) listener(); }
  function cancel()
  {
    held.clear(); queue.length=0;
    motion.orbit.fill(0); motion.pan.fill(0); motion.dolly=motion.fov=0;
    const previous=gesture; gesture=null;
    if (previous && canvas.hasPointerCapture(previous.id)) canvas.releasePointerCapture(previous.id);
    controls.cancel();
  }
  function blocked(event)
  {
    if (disposed || !isEnabled() || event.defaultPrevented || event.isComposing || composing || event.ctrlKey || event.metaKey || event.altKey || document.hidden) return true;
    return (event.composedPath ? event.composedPath() : [event.target]).some(node =>
      node?.isContentEditable || ["INPUT","TEXTAREA","SELECT","DIALOG"].includes(node?.tagName));
  }
  function keyDown(_scan, repeat, event)
  {
    if (blocked(event) || document.activeElement !== canvas) return;
    const command=Array.from(commands.values()).find(item => item.bindings.some(binding => binding.code===event.code && binding.shift===!!event.shiftKey));
    if (!command || !command.enabled()) return;
    event.preventDefault();
    if (repeat) return;
    held.delete(event.code);
    if (command.continuous) held.set(event.code, command);
    else if (queue.length<64) queue.push(command);
  }
  function execute(command, dt)
  {
    if (!command.enabled()) return;
    try
    {
      const result=command.run(dt);
      if (result && typeof result.then === "function") result.catch(onError);
    }
    catch (error) { onError(error); }
  }
  const callbacks = {
    onKeyDown:keyDown,
    onKeyUp:(_scan,event) => { held.delete(event.code); },
    onFocusChange:focused => { if (!focused) cancel(); },
    onMouseDown:(button,x,y,event) =>
    {
      if (blocked(event) || gesture || (button!==0 && button!==1)) return;
      canvas.focus({preventScroll:true}); event.preventDefault();
      gesture={id:event.pointerId,x,y,kind:button===1 || event.shiftKey ? "pan" : "orbit"};
      canvas.setPointerCapture(event.pointerId);
    },
    onMouseUp:(_button,_x,_y,event) =>
    {
      if (gesture?.id!==event.pointerId) return;
      const previous=gesture; gesture=null;
      if (canvas.hasPointerCapture(previous.id)) canvas.releasePointerCapture(previous.id);
    },
    onMouseMove:(x,y,_dx,_dy,event) =>
    {
      if (gesture?.id!==event.pointerId) return;
      if (blocked(event)) { cancel(); return; }
      motion[gesture.kind][0]+=x-gesture.x; motion[gesture.kind][1]+=y-gesture.y;
      gesture.x=x;gesture.y=y; event.preventDefault();
    },
    onMouseWheel:(delta,event) =>
    {
      if (blocked(event) || document.activeElement!==canvas) return;
      const pixels=delta*(event.deltaMode===1 ? 16 : event.deltaMode===2 ? canvas.clientHeight : 1);
      if (!Number.isFinite(pixels)) return;
      event.preventDefault(); motion[event.shiftKey ? "fov" : "dolly"]+=pixels;
    }
  };
  for (const [name,callback] of Object.entries(callbacks)) mainWindow[name]=callback;
  function listen(target,type,callback)
  {
    target.addEventListener(type,callback);listeners.push([target,type,callback]);
  }
  listen(canvas,"blur",cancel);
  listen(canvas,"pointercancel",event => { if (gesture?.id===event.pointerId) cancel(); });
  listen(canvas,"lostpointercapture",event => { if (gesture?.id===event.pointerId) cancel(); });
  listen(canvas,"compositionstart",()=>{composing=true;cancel();});
  listen(canvas,"compositionend",()=>{composing=false;});
  let revision=actions.getState().revision;
  const unsubscribe=actions.subscribe(state=>{if(state.revision!==revision){revision=state.revision;cancel();}});

  function rebind(name, bindings)
  {
    const command=commands.get(name);
    if (!command) throw new RangeError(`Unknown action ${name}`);
    const next=bindings.map(binding=>({code:binding.code,shift:!!binding.shift})), seen=new Set();
    for(const binding of next)
    {
      if (!/^(Key[A-Z]|Digit[0-9]|Arrow(Left|Right|Up|Down)|Equal|Minus|BracketLeft|BracketRight|Comma|Period|Space)$/u.test(binding.code)) throw new RangeError("Reserved or unsupported physical key");
      const chord=`${binding.shift}:${binding.code}`;
      if(seen.has(chord) || Array.from(commands.values()).some(other=>other!==command && other.bindings.some(item=>item.code===binding.code && item.shift===binding.shift))) throw new RangeError("Duplicate active chord");
      seen.add(chord);
    }
    command.bindings=next;cancel();notify();
  }
  return {
    cancel,rebind,
    enableCapture() { const command=commands.get("capture");command.defaults=[{code:"KeyV",shift:false}];rebind("capture",command.defaults); },
    resetBindings() { for(const command of commands.values()) command.bindings=command.defaults.map(binding=>({...binding}));cancel();notify(); },
    getBindings() { return Array.from(commands.values(),command=>({name:command.name,label:command.label,enabled:isEnabled()&&command.enabled(),bindings:command.bindings.map(binding=>({...binding}))})); },
    subscribe(listener) { changes.add(listener);return()=>changes.delete(listener); },
    update(dt)
    {
      if(disposed || !isEnabled() || document.hidden || document.activeElement!==canvas) { cancel();return; }
      dt=Number.isFinite(dt)?Math.max(0,Math.min(dt,0.05)):0;
      while(queue.length) execute(queue.shift(),dt);
      for(const command of held.values()) execute(command,dt);
      if(motion.orbit[0] || motion.orbit[1]) controls.orbit(...motion.orbit);
      if(motion.pan[0] || motion.pan[1]) controls.pan(...motion.pan);
      if(motion.dolly) controls.dolly(motion.dolly);
      if(motion.fov) controls.adjustFieldOfView(motion.fov);
      motion.orbit.fill(0);motion.pan.fill(0);motion.dolly=motion.fov=0;
    },
    dispose()
    {
      if(disposed)return;disposed=true;cancel();unsubscribe();changes.clear();
      for(const [target,type,callback] of listeners)target.removeEventListener(type,callback);
      for(const [name,callback] of Object.entries(callbacks))if(mainWindow[name]===callback)mainWindow[name]=null;
      mainWindow.Detach();
    }
  };
}
