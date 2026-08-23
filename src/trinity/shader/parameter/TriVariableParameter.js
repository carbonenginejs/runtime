// Source: trinity/trinity/Shader/Parameter/TriVariableParameter.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { CjsParameter } from "./CjsParameter.js";

/** Forwards a named variable-store entry into a named effect constant or resource. */
@type.define({ className: "TriVariableParameter", family: "shader" })
export class TriVariableParameter extends CjsParameter
{

  /** m_name (BlueSharedString) [READWRITE, NOTIFY, PERSIST] */
  @io.flag("effectHandles")
  @io.notify
  @io.persist
  @type.string
  name = "";

  /** m_isUsedByEffect (bool) [READ] */
  @io.read
  @type.boolean
  usedByCurrentTechnique = false;

  /** m_isUsedByEffect (bool) [READ] */
  @io.read
  @type.boolean
  usedByCurrentEffect = false;

  /** m_variableName (BlueSharedString) [READWRITE, NOTIFY, PERSIST] */
  @io.flag("variable")
  @io.notify
  @io.persist
  @type.string
  variableName = "";

  variable = null;

  variableStore = null;

  cachedEffect = null;

  /**
   * The shader constant or resource name the variable's value is uploaded to;
   * distinct from variableName, which names the store entry.
   */
  @carbon.method
  @impl.implemented
  GetParameterName()
  {
    return this.name;
  }

  /** Content hash: name only - the variable's value comes from the store. */
  @carbon.method
  @impl.adapted
  GetHashValue(startingHash = CjsParameter.FNV1_INITIAL)
  {
    return CjsParameter.hashFnv1String(this.name, startingHash);
  }

  /**
   * Resolves variableName against a store and caches the variable object; an empty variableName clears the binding. Always returns true.
   * @param variableStore store to bind against; null keeps the store supplied by an earlier call
   */
  @carbon.method
  @impl.adapted
  Initialize(variableStore = null)
  {
    this.variableStore = variableStore ?? this.variableStore;
    if (!this.variableName)
    {
      this.variable = null;
      return true;
    }
    this.variable = this.variableStore?.GetVariable?.(this.variableName) ?? this.variableStore?.getVariable?.(this.variableName) ?? this.variableStore?.[this.variableName] ?? this.variable;
    return true;
  }

  /**
   * Consumes the two dirty flags: `variable` re-resolves the store binding,
   * `effectHandles` re-resolves usage against the cached shader.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    const flags = this.__state.flags;
    if (flags.delete("variable"))
    {
      this.Initialize(this.variableStore);
    }
    if (flags.delete("effectHandles"))
    {
      this.RebuildEffectHandles(this.cachedEffect);
    }
    return true;
  }

  /**
   * Records usage by looking the name up as a shader resource when the bound
   * variable is a texture or buffer type and as a shader constant otherwise; an
   * unbound variable always counts as unused.
   */
  @carbon.method
  @impl.adapted
  RebuildEffectHandles(effectRes)
  {
    this.cachedEffect = effectRes;
    this.usedByCurrentEffect = false;
    this.usedByCurrentTechnique = false;
    if (!this.name || !effectRes || !this.variable)
    {
      return;
    }
    const type = this.GetVariableType();
    const isResource = type === "texture" || type === "textureRes" || type === "gpuBuffer" || type === 4 || type === 5;
    const used = isResource ? !!CjsParameter.getEffectResource(effectRes, this.name) : !!CjsParameter.getEffectConstant(effectRes, this.name);
    this.usedByCurrentEffect = used;
    this.usedByCurrentTechnique = used;
  }

  /**
   * Delegates the write to the bound variable, so the store owns the value; does
   * nothing when no variable is bound.
   */
  @carbon.method
  @impl.adapted
  CopyValueToEffect(inputType, dest, size, renderContext)
  {
    this.variable?.CopyValueToEffect?.(inputType, dest, size, renderContext);
  }

  /**
   * Always false - populating a resource set is device work this package does
   * not do.
   */
  @carbon.method
  @impl.adapted
  CopyToResourceSet()
  {
    return false;
  }

  /** Always false - UAV binding is left to the engine adapter. */
  @carbon.method
  @impl.adapted
  ApplyUav()
  {
    return false;
  }

  /**
   * The bound variable's type tag, which decides whether the name binds as a
   * resource or a constant; `invalid` when nothing is bound.
   */
  @carbon.method
  @impl.implemented
  GetVariableType()
  {
    return this.variable?.GetType?.() ?? this.variable?.type ?? "invalid";
  }

}
