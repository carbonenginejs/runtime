import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import '@carbonenginejs/runtime-utils/model';
import { CjsParameter } from './CjsParameter.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_usedByCurrentTechnique, _init_extra_usedByCurrentTechnique, _init_usedByCurrentEffect, _init_extra_usedByCurrentEffect, _init_variableName, _init_extra_variableName;

/** TriVariableParameter (shader) - generated from schema shapeHash c1071754.... */
let _TriVariableParameter;
class TriVariableParameter extends CjsParameter {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_usedByCurrentTechnique, _init_extra_usedByCurrentTechnique, _init_usedByCurrentEffect, _init_extra_usedByCurrentEffect, _init_variableName, _init_extra_variableName, _initProto],
      c: [_TriVariableParameter, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriVariableParameter",
      family: "shader"
    })], [[[void 0, io.flag("effectHandles"), io, io.notify, io, io.persist, type, type.string], 16, "name"], [[io, io.read, type, type.boolean], 16, "usedByCurrentTechnique"], [[io, io.read, type, type.boolean], 16, "usedByCurrentEffect"], [[void 0, io.flag("variable"), io, io.notify, io, io.persist, type, type.string], 16, "variableName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetParameterName"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetHashValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted], 18, "RebuildEffectHandles"], [[carbon, carbon.method, impl, impl.adapted], 18, "CopyValueToEffect"], [[carbon, carbon.method, impl, impl.adapted], 18, "CopyToResourceSet"], [[carbon, carbon.method, impl, impl.adapted], 18, "ApplyUav"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetVariableType"]], 0, void 0, CjsParameter));
  }
  /** m_name (BlueSharedString) [READWRITE, NOTIFY, PERSIST] */
  name = (_initProto(this), _init_name(this, ""));

  /** m_isUsedByEffect (bool) [READ] */
  usedByCurrentTechnique = (_init_extra_name(this), _init_usedByCurrentTechnique(this, false));

  /** m_isUsedByEffect (bool) [READ] */
  usedByCurrentEffect = (_init_extra_usedByCurrentTechnique(this), _init_usedByCurrentEffect(this, false));

  /** m_variableName (BlueSharedString) [READWRITE, NOTIFY, PERSIST] */
  variableName = (_init_extra_usedByCurrentEffect(this), _init_variableName(this, ""));
  variable = (_init_extra_variableName(this), null);
  variableStore = null;
  cachedEffect = null;

  /**
   * The shader constant or resource name the variable's value is uploaded to;
   * distinct from variableName, which names the store entry.
   */
  GetParameterName() {
    return this.name;
  }

  /** Content hash: name only - the variable's value comes from the store. */
  GetHashValue(startingHash = CjsParameter.FNV1_INITIAL) {
    return CjsParameter.hashFnv1String(this.name, startingHash);
  }

  /**
   * Resolves variableName against a store and caches the variable object; an empty variableName clears the binding. Always returns true.
   * @param variableStore store to bind against; null keeps the store supplied by an earlier call
   */
  Initialize(variableStore = null) {
    this.variableStore = variableStore ?? this.variableStore;
    if (!this.variableName) {
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
  OnModified(_options = {}) {
    const flags = this.__state.flags;
    if (flags.delete("variable")) {
      this.Initialize(this.variableStore);
    }
    if (flags.delete("effectHandles")) {
      this.RebuildEffectHandles(this.cachedEffect);
    }
    return true;
  }

  /**
   * Records usage by looking the name up as a shader resource when the bound
   * variable is a texture or buffer type and as a shader constant otherwise; an
   * unbound variable always counts as unused.
   */
  RebuildEffectHandles(effectRes) {
    this.cachedEffect = effectRes;
    this.usedByCurrentEffect = false;
    this.usedByCurrentTechnique = false;
    if (!this.name || !effectRes || !this.variable) {
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
  CopyValueToEffect(inputType, dest, size, renderContext) {
    this.variable?.CopyValueToEffect?.(inputType, dest, size, renderContext);
  }

  /**
   * Always false - populating a resource set is device work this package does
   * not do.
   */
  CopyToResourceSet() {
    return false;
  }

  /** Always false - UAV binding is left to the engine adapter. */
  ApplyUav() {
    return false;
  }

  /**
   * The bound variable's type tag, which decides whether the name binds as a
   * resource or a constant; `invalid` when nothing is bound.
   */
  GetVariableType() {
    return this.variable?.GetType?.() ?? this.variable?.type ?? "invalid";
  }
  static {
    _initClass();
  }
}

export { _TriVariableParameter as TriVariableParameter };
//# sourceMappingURL=TriVariableParameter.js.map
