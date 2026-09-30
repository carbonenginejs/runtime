/** Demo-only controls shared with the existing template effect editor. */
export function createEffectFields(initialEffect, { document, expanded = false, includeDisplay = false, readOnly = false, disabledFields = [] } = {})
{
  let effect = initialEffect;
  let shape = "";
  const controls = [];
  const element = document.createElement("details");
  element.className = "fields";
  element.open = expanded;
  const summary = document.createElement("summary");
  summary.textContent = "settings";
  element.append(summary);

  function update(next = effect, nextReadOnly = readOnly)
  {
    effect = next;
    readOnly = nextReadOnly;
    const fields = [];
    for (const key of Object.keys(effect))
    {
      if (key.startsWith("_") || (!includeDisplay && key === "display")) continue;
      const value = effect[key];
      const vector = value && value.length >= 2 && value.length <= 4 && typeof value[0] === "number";
      const kind = vector ? `vector${value.length}` : typeof value;
      if (kind !== "number" && kind !== "boolean" && !vector) continue;
      fields.push([key, kind]);
    }
    const nextShape = JSON.stringify(fields);
    if (shape !== nextShape)
    {
      shape = nextShape;
      element.replaceChildren(summary);
      controls.length = 0;
      for (const [key, kind] of fields)
      {
        const input = document.createElement("input");
        input.type = kind === "boolean" ? "checkbox" : kind === "number" ? "number" : "text";
        input.step = "any";
        input.addEventListener("change", () =>
        {
          if (input.disabled) return;
          if (kind === "boolean") effect[key] = input.checked;
          else if (kind === "number")
          {
            const value = Number(input.value);
            if (input.value.trim() && Number.isFinite(value)) effect[key] = value;
          }
          else
          {
            const parts = input.value.split(",").map(Number);
            const value = effect[key];
            if (parts.length === value.length && parts.every(Number.isFinite))
              for (let i = 0; i < parts.length; i++) value[i] = parts[i];
          }
          update();
        });
        const label = document.createElement("label");
        label.append(key, input);
        element.append(label);
        controls.push({ key, kind, input });
      }
    }
    for (const { key, kind, input } of controls)
    {
      input.disabled = readOnly || disabledFields.includes(key);
      input.title = disabledFields.includes(key) ? "Not supported by this demo" : readOnly ? "Merged value; edited at its source" : key;
      if (document.activeElement === input && !input.disabled) continue;
      const value = effect[key];
      if (kind === "boolean") input.checked = value;
      else
      {
        const text = kind === "number" ? String(Math.round(value * 1e4) / 1e4)
          : Array.from(value, part => Math.round(part * 1e4) / 1e4).join(", ");
        if (input.value !== text) input.value = text;
      }
    }
  }
  update();
  return { element, update };
}

const EFFECT_SLOTS = [
  ["dynamicExposure", "GetDynamicExposureIfAvailable"],
  ["tonemapping", "GetTonemappingIfAvailable"],
  ["colorCorrection", "GetColorCorrectionIfAvailable"],
  ["lut", null], ["luts", null],
  ["desaturate", "GetDesaturateIfAvailable"],
  ["vignette", "GetVignetteIfAvailable"],
  ["fade", "GetFadeIfAvailable"],
  ["filmGrain", "GetFilmGrainIfAvailable"],
  ["signalLoss", "GetSignalLossIfAvailable"],
  ["bloom", "GetBloomIfAvailable"],
  ["godRays", "GetGodRaysIfAvailable"],
  ["fog", "GetFogIfAvailable"],
  ["depthOfField", "GetDepthOfFieldIfAvailable"],
  ["taa", "GetTaaIfAvailable"],
  ["genericEffect", "GetGenericEffectIfAvailable"]
];

/**
 * Shows the effective scene graph independently of the settings collapse.
 * Only known scene-default owners are editable; merged values are read-only.
 * Polling is four times a second, outside the render loop, with stable rows.
 */
export function createPostProcessPanel({ document, driver, getDefaultPostProcess, postState, schedule = setInterval, cancel = clearInterval })
{
  const style = document.createElement("style");
  style.textContent = `
    #demo-right-panels { position:fixed; top:52px; right:12px; z-index:2;
      width:min(340px, calc(100vw - 24px)); height:calc(100dvh - 64px);
      display:flex; flex-direction:column; gap:8px; overflow:auto; pointer-events:none; }
    #demo-right-panels > #ship { position:static; width:auto; box-sizing:border-box;
      max-height:40%; min-height:32px; flex:0 1 auto; overflow:auto; pointer-events:auto; }
    #post-processing { flex:1 1 0; min-height:100px; overflow:auto; padding:8px 10px;
      background:rgba(8,12,18,.88); color:#cfd6e4; pointer-events:auto;
      font:13px/1.6 "Eve Sans Neue",system-ui,sans-serif; }
    #post-processing h4 { margin:0 0 4px; text-transform:uppercase; letter-spacing:.04em; }
    #post-processing h5 { margin:8px 0 0; font-size:12px; }
    #post-processing .note { color:#aab3c2; font-size:11px; }
    #post-processing label { display:flex; justify-content:space-between; gap:8px; align-items:center; }
    #post-processing input { width:96px; min-width:0; font:inherit; color:inherit; background:#000; border:1px solid #2a3444; }
    #post-processing input[type=checkbox] { width:auto; }
    #post-processing input:disabled { opacity:.75; }
    #post-processing .fields { margin:2px 0 6px; }
    #post-processing .fields > summary { cursor:pointer; font-size:11px; color:#aab3c2; }
  `;
  document.head.append(style);
  const stack = document.createElement("div");
  stack.id = "demo-right-panels";
  document.body.append(stack);
  const ship = document.getElementById("ship");
  if (ship) stack.append(ship);
  const panel = document.createElement("section");
  panel.id = "post-processing";
  const heading = document.createElement("h4");
  heading.textContent = "Post Processing";
  const status = document.createElement("div");
  status.className = "note";
  panel.append(heading, status);
  stack.append(panel);
  const rows = new Map();
  const luts = [], allLuts = [];

  function refresh()
  {
    const graph = driver.scene.GetPostProcess();
    const source = getDefaultPostProcess();
    const quality = driver.postProcess.GetPostProcessingQuality();
    const text = `Post ${postState.off ? "disabled" : "enabled"} · quality ${["low", "medium", "high"][quality] ?? quality}${graph ? "" : " · no effective graph"}`;
    if (status.textContent !== text) status.textContent = text;
    luts.length = 0;
    allLuts.length = 0;
    if (graph)
    {
      graph.GetAvilableSortedLuts(luts, quality);
      graph.GetAvilableSortedLuts(allLuts, Infinity);
    }
    const seen = new Set();
    for (const [slot, getter] of EFFECT_SLOTS)
    {
      const count = slot === "luts" ? Math.max(graph?.luts.length ?? 0, source?.luts.length ?? 0, 1) : 1;
      for (let index = 0; index < count; index++)
      {
        const name = slot === "luts" ? `luts[${index}]` : slot;
        seen.add(name);
        const live = (slot === "luts" ? graph?.luts[index] : graph?.[slot]) ?? null;
        const authored = (slot === "luts" ? source?.luts[index] : source?.[slot]) ?? null;
        const effect = live ?? authored;
        let row = rows.get(name);
        if (!row)
        {
          const element = document.createElement("div"), title = document.createElement("h5"), note = document.createElement("div");
          title.textContent = name;
          note.className = "note";
          element.append(title, note);
          panel.append(element);
          row = { element, note, fields: null, sourceFields: null };
          rows.set(name, row);
        }
        const available = live && (getter ? graph[getter](quality) === live : luts.includes(live));
        const atAnyQuality = live && (getter ? graph[getter](Infinity) === live : allLuts.includes(live));
        const state = !effect ? "absent" : !effect.IsActive() ? "disabled"
          : !live ? "not in effective graph" : available ? "available"
            : atAnyQuality ? "quality gated" : "inactive";
        const derived = !!live && live !== authored;
        const note = `${state}${effect ? derived ? " · merged values (read-only)" : " · scene default (editable)" : ""}`;
        if (row.note.textContent !== note) row.note.textContent = note;
        const options = { document, expanded: true, includeDisplay: true, readOnly: derived, disabledFields: slot === "dynamicExposure" ? ["debug"] : [] };
        if (effect)
        {
          if (!row.fields)
          {
            row.fields = createEffectFields(effect, options);
            row.element.append(row.fields.element);
          }
          else row.fields.update(effect, derived);
        }
        else if (row.fields)
        {
          row.fields.element.remove();
          row.fields = null;
        }
        // A blended result is transient. Edit the real scene default separately.
        if (derived && authored)
        {
          if (!row.sourceFields)
          {
            row.sourceFields = createEffectFields(authored, { ...options, readOnly: false });
            row.sourceFields.element.firstChild.textContent = "scene default contribution (editable)";
            row.element.append(row.sourceFields.element);
          }
          else row.sourceFields.update(authored);
        }
        else if (row.sourceFields)
        {
          row.sourceFields.element.remove();
          row.sourceFields = null;
        }
      }
    }
    for (const [name, row] of rows)
    {
      if (!seen.has(name)) { row.element.remove(); rows.delete(name); }
    }
  }
  refresh();
  const timer = schedule(refresh, 250);
  return {
    refresh,
    dispose()
    {
      cancel(timer);
      if (ship) document.body.append(ship);
      stack.remove();
      style.remove();
    }
  };
}
