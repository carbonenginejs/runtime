import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl, CjsSchema } from '@carbonenginejs/runtime-utils/schema';
import { Tr2Material as _Tr2Material } from './Tr2Material.js';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { Tr2ConstantEffectParameter as _Tr2ConstantEffectPar } from './parameter/Tr2ConstantEffectParameter.js';
import { Tr2FloatParameter as _Tr2FloatParameter } from './parameter/Tr2FloatParameter.js';
import { Tr2GeometryBufferParameter as _Tr2GeometryBufferPar } from './parameter/Tr2GeometryBufferParameter.js';
import { Tr2Matrix4Parameter as _Tr2Matrix4Parameter } from './parameter/Tr2Matrix4Parameter.js';
import { Tr2EffectConstant } from '@carbonenginejs/runtime-resource/resource/shader';
import { Tr2ShaderOption as _Tr2ShaderOption } from './reflection/Tr2ShaderOption.js';
import { Tr2SamplerOverride as _Tr2SamplerOverride } from './sampler/Tr2SamplerOverride.js';
import { Tr2Vector2Parameter as _Tr2Vector2Parameter } from './parameter/Tr2Vector2Parameter.js';
import { Tr2Vector3Parameter as _Tr2Vector3Parameter } from './parameter/Tr2Vector3Parameter.js';
import { Tr2Vector4Parameter as _Tr2Vector4Parameter } from './parameter/Tr2Vector4Parameter.js';
import { TriFloatArrayParameter as _TriFloatArrayParamet } from './parameter/TriFloatArrayParameter.js';
import { TriTextureParameter as _TriTextureParameter } from './parameter/TriTextureParameter.js';
import { TriVariableParameter as _TriVariableParameter } from './parameter/TriVariableParameter.js';
import { TriVector4 as _TriVector } from './parameter/TriVector4.js';
import { CjsParameter } from './parameter/CjsParameter.js';
import { CjsVariableStore } from './support/CjsVariableStore.js';

let _initProto, _initClass, _init_effectFilePath, _init_extra_effectFilePath, _init_options, _init_extra_options, _init_name, _init_extra_name, _init_constParameters, _init_extra_constParameters, _init_parameters, _init_extra_parameters, _init_resources, _init_extra_resources, _init_effectResource, _init_extra_effectResource, _init_actualEffectFilePath, _init_extra_actualEffectFilePath, _init_samplerOverrides, _init_extra_samplerOverrides;

/** Tr2Effect (shader) - generated from schema shapeHash b0f86b00.... */
let _Tr2Effect;
new class extends _identity {
  static [class Tr2Effect extends _Tr2Material {
    static {
      ({
        e: [_init_effectFilePath, _init_extra_effectFilePath, _init_options, _init_extra_options, _init_name, _init_extra_name, _init_constParameters, _init_extra_constParameters, _init_parameters, _init_extra_parameters, _init_resources, _init_extra_resources, _init_effectResource, _init_extra_effectResource, _init_actualEffectFilePath, _init_extra_actualEffectFilePath, _init_samplerOverrides, _init_extra_samplerOverrides, _initProto],
        c: [_Tr2Effect, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2Effect",
        family: "shader"
      })], [[[io, io.notify, void 0, io.rebuild("pipeline"), io, io.always, io, io.persist, type, type.string], 16, "effectFilePath"], [[void 0, io.rebuild("pipeline"), io, io.persist, void 0, type.list("Tr2ShaderOption")], 16, "options"], [[io, io.persist, type, type.string], 16, "name"], [[void 0, io.rebuild("bindings"), io, io.persist, void 0, type.list("Tr2ConstantEffectParameter")], 16, "constParameters"], [[void 0, io.rebuild("bindings"), io, io.persist, void 0, type.list("EffectParameter")], 16, "parameters"], [[void 0, io.rebuild("bindings"), io, io.persist, void 0, type.list("EffectResource")], 16, "resources"], [[io, io.read, void 0, type.objectRef("Tr2EffectRes")], 16, "effectResource"], [[io, io.read, type, type.string], 16, "actualEffectFilePath"], [[void 0, io.rebuild("bindings"), io, io.persist, void 0, type.list("Tr2SamplerOverride")], 16, "samplerOverrides"], [[carbon, carbon.method, impl, impl.adapted], 18, "RebuildCachedData"], [[carbon, carbon.method, impl, impl.implemented], 18, "RebuildCachedDataAsync"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetVariableStore"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetVariableStore"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetConstParameters"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetHashValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetParameterAnnotations"], [[carbon, carbon.method, impl, impl.adapted], 18, "PopulateParameters"], [[carbon, carbon.method, impl, impl.implemented], 18, "EndUpdate"], [[carbon, carbon.method, impl, impl.adapted], 18, "PruneParameters"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsParameterUsedByTechnique"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartUpdate"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetResourceTexture2D"]], 0, void 0, _Tr2Material));
    }
    /** m_effectFilePath (std::string) [READWRITE, PERSIST, NOTIFY] */
    effectFilePath = (_initProto(this), _init_effectFilePath(this, ""));

    /** m_options (PTr2ShaderOptionStructureList) [READ, PERSIST] */
    options = (_init_extra_effectFilePath(this), _init_options(this, []));

    /** m_name (std::string) [READWRITE, PERSIST] */
    name = (_init_extra_options(this), _init_name(this, ""));

    /** m_constParameters (PTr2ConstantEffectParameterStructureList) [READ, PERSIST] */
    constParameters = (_init_extra_name(this), _init_constParameters(this, []));

    /** m_parameters (EffectParameterList) [READ, PERSIST] */
    parameters = (_init_extra_constParameters(this), _init_parameters(this, []));

    /** m_resources (EffectResourceList) [READ, PERSIST] */
    resources = (_init_extra_parameters(this), _init_resources(this, []));

    /** m_effectResource (Tr2EffectResPtr) [READ] */
    effectResource = (_init_extra_resources(this), _init_effectResource(this, null));

    /** m_actualEffectFilePath (std::string) [READ] */
    actualEffectFilePath = (_init_extra_effectResource(this), _init_actualEffectFilePath(this, ""));

    /** m_samplerOverrides (PTr2SamplerOverrideStructureList) [READ, PERSIST] */
    samplerOverrides = (_init_extra_actualEffectFilePath(this), _init_samplerOverrides(this, []));
    parameterHash = (_init_extra_samplerOverrides(this), 0xffffffff);
    display = true;

    /**
     * Carbon keeps m_variableStore null and falls back to the GLOBAL store at
     * call time, so a later global-store swap is seen by existing effects.
     * Read through GetVariableStore(); never capture the global eagerly.
     */
    variableStore = null;
    insideStartUpdate = false;

    /** Carbon method RebuildCachedData -> RebuildCachedDataInternal (MAP_METHOD_AND_WRAP). */
    RebuildCachedData() {
      this.RebuildCachedDataInternal();
    }

    /**
     * The resource-arrival overload: Carbon temporarily clears
     * insideStartUpdate so a shader arriving during a batched Start/EndUpdate
     * still rebuilds immediately.
     */
    RebuildCachedDataAsync() {
      const wasInsideStartUpdate = this.insideStartUpdate;
      this.insideStartUpdate = false;
      this.RebuildCachedDataInternal();
      this.insideStartUpdate = wasInsideStartUpdate;
    }

    /**
     * Overrides the store this effect's TriVariableParameter values resolve
     * against; passing null restores the fallback to the global store.
     */
    SetVariableStore(store) {
      this.variableStore = store ?? null;
    }

    /** The effect's store, falling back to the global store at call time. */
    GetVariableStore() {
      return this.variableStore ?? CjsVariableStore.GetGlobalStore();
    }

    /**
     * The authored constant-parameter list itself, not a copy - callers that
     * mutate it mutate the effect.
     */
    GetConstParameters() {
      return this.constParameters;
    }

    /**
     * Content hash over the shader path, options, constant parameters, and
     * every parameter/resource - Carbon's effect dedup/batching key. Only
     * hashes authored content; values coming from a variable store are not
     * included. Not lightweight - do not call every frame.
     */
    GetHashValue() {
      let hash = 0;
      const path = this.actualEffectFilePath || this.effectFilePath;
      if (path) {
        hash = CjsParameter.hashFnv1String(path);
      }
      for (const option of this.options) {
        hash = CjsParameter.hashFnv1String(option?.name ?? "", hash);
        hash = CjsParameter.hashFnv1String(option?.value ?? "", hash);
      }
      for (const parameter of this.constParameters) {
        hash = CjsParameter.hashFnv1String(parameter?.name ?? "", hash);
        hash = CjsParameter.hashFnv1Floats(parameter?.value ?? [0, 0, 0, 0], hash);
      }
      for (const parameter of this.parameters) {
        hash = parameter?.GetHashValue?.(hash) ?? hash;
      }
      for (const resource of this.resources) {
        hash = resource?.GetHashValue?.(hash) ?? hash;
      }
      return hash >>> 0;
    }

    /** Carbon method GetParameterAnnotations -> PyGetParameterAnnotations (MAP_METHOD). */
    GetParameterAnnotations(parameterName) {
      return CjsParameter.getEffectAnnotations(this.shader, parameterName);
    }

    /** Carbon method PopulateParameters (MAP_METHOD_AND_WRAP). */
    PopulateParameters() {
      if (!this.shader) {
        return false;
      }
      for (const stage of _Tr2Effect.iterateShaderStages(this.shader)) {
        for (const constant of stage.constants ?? []) {
          if (!_Tr2Effect.getBool(this.shader, constant.name, "SasUiVisible", false) || this.#hasParameterLike(constant.name)) {
            continue;
          }
          const converted = _Tr2Effect.convertEffectConstant(constant, stage.constantValues);
          if (converted) {
            this.parameters.push(converted);
          }
        }
        for (const resource of _Tr2Effect.iterateResources(stage.resources)) {
          if (!_Tr2Effect.getBool(this.shader, resource.name, "SasUiVisible", false) || this.#hasParameterLike(resource.name)) {
            continue;
          }
          this.resources.push(_Tr2Effect.convertEffectResource(resource));
        }
        for (const resource of _Tr2Effect.iterateResources(stage.uavs)) {
          if (!_Tr2Effect.getBool(this.shader, resource.name, "SasUiVisible", false) || this.#hasParameterLike(resource.name)) {
            continue;
          }
          this.resources.push(_Tr2Effect.convertEffectResource(resource));
        }
      }
      this.RebuildCachedDataInternal();
      return true;
    }

    /** Carbon method EndUpdate (MAP_METHOD_AND_WRAP). */
    EndUpdate() {
      if (this.insideStartUpdate) {
        this.insideStartUpdate = false;
        this.RebuildCachedDataInternal();
      }
    }

    /** Carbon method PruneParameters (MAP_METHOD_AND_WRAP). */
    PruneParameters() {
      if (!this.shader) {
        return false;
      }
      this.parameters = this.parameters.filter(parameter => this.#isShaderParameterVisible(CjsParameter.getNamedValue(parameter)));
      this.constParameters = this.constParameters.filter(parameter => this.#isShaderParameterVisible(parameter?.name));
      this.resources = this.resources.filter(parameter => this.#isShaderParameterVisible(CjsParameter.getNamedValue(parameter)));
      return true;
    }

    /** Carbon method IsParameterUsedByTechnique (MAP_METHOD_AND_WRAP). */
    IsParameterUsedByTechnique(parameterName) {
      return !!this.shader?.GetConstant?.(parameterName);
    }

    /** Carbon method StartUpdate (MAP_METHOD_AND_WRAP). */
    StartUpdate() {
      this.insideStartUpdate = true;
    }

    /**
     * Attaches every resource to this material, derives actualEffectFilePath from
     * the authored path, and rebuilds cached shader data.
     */
    Initialize() {
      for (const resource of this.resources) {
        resource?.OnAddedToMaterial?.(this);
      }
      this.actualEffectFilePath = this.effectFilePath ? _Tr2Effect.convertEffectPath(this.effectFilePath) : "";
      this.RebuildCachedDataInternal();
      return true;
    }

    /** Re-runs Initialize after notified fields change; always returns true. */
    OnModified() {
      this.Initialize();
      return true;
    }

    /**
     * Keeps list membership consistent: a removed entry has its reroute
     * destination cleared and is detached from the material, an inserted one is
     * attached, and cached data is rebuilt either way.
     */
    OnListModified(event, _key, _key2, value) {
      if (value?.SetDestination && String(event).includes("REMOVED")) {
        value.SetDestination(null, 0);
      }
      if (value?.OnRemovedFromMaterial && String(event).includes("REMOVED")) {
        value.OnRemovedFromMaterial(this);
      }
      if (value?.OnAddedToMaterial && String(event).includes("INSERTED")) {
        value.OnAddedToMaterial(this);
      }
      this.RebuildCachedDataInternal();
    }

    /**
     * Re-resolves the shader for the current option set and re-binds every
     * parameter and resource to it, rebuilding the screen-size LOD texture list on
     * the way; a no-op while a StartUpdate batch is open. Resolves shader metadata
     * only - no GPU program is created.
     */
    RebuildCachedDataInternal() {
      if (this.insideStartUpdate) {
        return;
      }
      this.parameterHash = 0xffffffff;
      this.shader = this.effectResource?.GetShader?.(this.options) ?? this.effectResource?.getShader?.(this.options) ?? this.effectResource?.shader ?? this.shader ?? null;
      this.lodTextureParameters = [];
      this.compatibleWithGdr = true;
      for (const parameter of this.parameters) {
        if (parameter instanceof _TriVariableParameter) {
          parameter.Initialize(this.GetVariableStore());
        }
        parameter?.RebuildEffectHandles?.(this.shader);
      }
      for (const resource of this.resources) {
        resource?.RebuildEffectHandles?.(this.shader);
        if (resource?.UsedWithScreenSize && !this.lodTextureParameters.includes(resource)) {
          this.lodTextureParameters.push(resource);
        }
      }
    }

    /**
     * Drops the resolved shader and clears every parameter's and resource's effect
     * handles by rebuilding them against null.
     */
    ReleaseCachedData() {
      this.shader = null;
      for (const parameter of this.parameters) {
        parameter?.RebuildEffectHandles?.(null);
      }
      for (const resource of this.resources) {
        resource?.RebuildEffectHandles?.(null);
      }
      this.lodTextureParameters = [];
    }

    /**
     * Sets the authored effect path through SetValues so the pipeline rebuild flag
     * fires; returns whether anything changed.
     */
    SetEffectPathName(path) {
      return this.SetValues({
        effectFilePath: path ? String(path) : ""
      }, {
        source: this,
        returnBoolean: true
      });
    }

    /**
     * The authored path, not the slash-normalized actualEffectFilePath that
     * Initialize derives from it.
     */
    GetEffectPathName() {
      return this.effectFilePath;
    }

    /**
     * The effect resource the shader is resolved from, or null before one has been
     * assigned.
     */
    GetEffectRes() {
      return this.effectResource;
    }

    /** The authored effect name, which is independent of the effect file path. */
    GetName() {
      return this.name;
    }

    /**
     * Appends a resource parameter, attaches it to this material and rebuilds
     * cached data; does not check for a duplicate name and always returns true.
     */
    AddResource(parameter) {
      this.resources.push(parameter);
      parameter?.OnAddedToMaterial?.(this);
      this.RebuildCachedDataInternal();
      return true;
    }

    /**
     * Creates and attaches a TriTextureParameter for the name, returning false
     * when a resource already uses that name.
     */
    AddResourceTexture2D(name, resourcePath = "") {
      if (this.GetResourceByName(name)) {
        return false;
      }
      const parameter = new _TriTextureParameter();
      parameter.SetParameterName?.(name);
      parameter.SetResourcePath?.(resourcePath);
      return this.AddResource(parameter);
    }

    /**
     * Carbon's SetResourceTexture2D - assigns the texture path on the named
     * resource, creating the TriTextureParameter when absent.
     */
    SetResourceTexture2D(name, resourcePath = "") {
      const updated = this.#setNamedTexture(name, resourcePath);
      if (updated) {
        this.RebuildCachedDataInternal();
      }
      return updated;
    }

    /**
     * Adds a sampler override for the named resource using Carbon's authoring
     * defaults for the fields not passed in (addressW 1, filter 3, mipFilter 2);
     * returns false when an override of that name already exists.
     */
    AddSamplerOverride(name, addressU = 1, addressV = addressU) {
      if (this.HasSamplerOverride(name)) {
        return false;
      }
      const override = new _Tr2SamplerOverride();
      override.name = String(name);
      override.addressU = addressU;
      override.addressV = addressV;
      override.addressW = 1;
      override.filter = 3;
      override.mipFilter = 2;
      this.samplerOverrides.push(override);
      this.RebuildCachedDataInternal();
      return true;
    }

    /**
     * Adds an authored constant parameter, cloning the value so the caller's
     * vector is not aliased; returns false when a constant of that name already
     * exists.
     */
    AddParameterVector4(name, value = vec4.create()) {
      if (this.HasParameter(name)) {
        return false;
      }
      const parameter = new _Tr2ConstantEffectPar();
      parameter.name = String(name);
      parameter.value = vec4.clone(value);
      this.constParameters.push(parameter);
      this.RebuildCachedDataInternal();
      return true;
    }

    /**
     * Adds a constant parameter with the scalar splatted across all four
     * components, matching Carbon's float authoring.
     */
    AddParameterFloat(name, value = 0) {
      return this.AddParameterVector4(name, vec4.fromValues(value, value, value, value));
    }

    /**
     * Adds a constant parameter from a colour vector; behaviourally identical to
     * AddParameterVector4.
     */
    AddParameterColor(name, value) {
      return this.AddParameterVector4(name, value);
    }

    /**
     * JS convenience over the Carbon lists: the effect collections also accept
     * unique-name plain-object maps. Canonical arrays keep the inherited
     * CjsModel path untouched; `textures` is an input alias for `resources`.
     */
    SetValues(values = {}, options = {}) {
      const source = values && typeof values === "object" ? values : {};
      const rest = {};
      const changedCollections = new Set();
      for (const key of Object.keys(source)) {
        const route = _Tr2Effect.#VALUE_COLLECTIONS[key];
        const value = source[key];
        if (route && value && typeof value === "object" && !Array.isArray(value)) {
          if (this[route.setter](value)) {
            changedCollections.add(route.field);
          }
          continue;
        }
        if (key === "textures") {
          continue;
        }
        rest[key] = value;
      }
      const result = super.SetValues(rest, {
        ...options,
        returnBoolean: false
      });
      const changed = result instanceof Set ? result : new Set();
      for (const field of changedCollections) {
        changed.add(field);
      }
      return options?.returnBoolean === true ? changed.size > 0 : changed;
    }

    /**
     * Merges dynamic parameters by unique name. Values may be raw
     * (number/vector/matrix/res path string) or explicit `{ type, ... }`
     * descriptors; `null` removes. Texture values route to `resources`.
     */
    SetParameters(values = {}) {
      let updated = false;
      for (const name of Object.keys(values ?? {})) {
        const value = values[name];
        if (value === undefined) continue;
        if (value === null) {
          const removedParameter = this.#removeNamed(this.parameters, name);
          const removedResource = this.#removeNamed(this.resources, name);
          updated = removedParameter || removedResource || updated;
          continue;
        }
        updated = this.#setNamedParameter(name, value) || updated;
      }
      if (updated) {
        this.RebuildCachedDataInternal();
      }
      return updated;
    }

    /** Merges texture resources by unique name from res path strings. */
    SetTextures(values = {}) {
      let updated = false;
      for (const name of Object.keys(values ?? {})) {
        const value = values[name];
        if (value === undefined) continue;
        if (value === null) {
          updated = this.#removeNamed(this.resources, name) || updated;
          continue;
        }
        updated = this.#setNamedTexture(name, value) || updated;
      }
      if (updated) {
        this.RebuildCachedDataInternal();
      }
      return updated;
    }

    /**
     * Merges authored constant parameters by unique name. Numbers splat to a
     * vec4, matching Carbon's AddParameterFloat authoring behavior.
     */
    SetConstParameters(values = {}) {
      let updated = false;
      for (const name of Object.keys(values ?? {})) {
        const value = values[name];
        if (value === undefined) continue;
        if (value === null) {
          updated = this.#removeNamed(this.constParameters, name) || updated;
          continue;
        }
        const vector = _Tr2Effect.#toConstVector4(value);
        if (!vector) {
          throw new TypeError(`Tr2Effect.SetConstParameters cannot read a vec4 value for "${name}".`);
        }
        const existing = CjsParameter.findByName(this.constParameters, name);
        if (existing) {
          vec4.copy(existing.value, vector);
        } else {
          const parameter = new _Tr2ConstantEffectPar();
          parameter.name = String(name);
          parameter.value = vector;
          this.constParameters.push(parameter);
        }
        updated = true;
      }
      if (updated) {
        this.RebuildCachedDataInternal();
      }
      return updated;
    }

    /** Merges sampler overrides by unique name; `null` removes an override. */
    SetSamplerOverrides(values = {}) {
      let updated = false;
      for (const name of Object.keys(values ?? {})) {
        const value = values[name];
        if (value === undefined) continue;
        if (value === null) {
          updated = this.#removeNamed(this.samplerOverrides, name) || updated;
          continue;
        }
        const existing = CjsParameter.findByName(this.samplerOverrides, name);
        if (value instanceof _Tr2SamplerOverride) {
          if (!value.name) {
            value.name = String(name);
          }
          if (existing) {
            this.samplerOverrides[this.samplerOverrides.indexOf(existing)] = value;
          } else {
            this.samplerOverrides.push(value);
          }
          updated = true;
          continue;
        }
        if (typeof value !== "object" || Array.isArray(value) || ArrayBuffer.isView(value)) {
          throw new TypeError(`Tr2Effect.SetSamplerOverrides requires override values for "${name}".`);
        }
        let override = existing;
        if (!override) {
          override = new _Tr2SamplerOverride();
          override.name = String(name);
          this.samplerOverrides.push(override);
          updated = true;
        }
        if (override.SetValues(value, {
          returnBoolean: true
        })) {
          updated = true;
        }
      }
      if (updated) {
        this.RebuildCachedDataInternal();
      }
      return updated;
    }

    /**
     * Creates a parameter model from a raw value using the class-declared
     * isValue claims, or from an explicit `{ type, ... }` descriptor.
     * Returns null when no registered parameter class claims the value.
     */
    static CreateParameterFromValue(name, value) {
      if (value && typeof value === "object" && !Array.isArray(value) && !ArrayBuffer.isView(value)) {
        const ExplicitClass = _Tr2Effect.#resolveExplicitParameterClass(value);
        if (!ExplicitClass) {
          return null;
        }
        const {
          type,
          Type,
          _type,
          ...fields
        } = value;
        const parameter = new ExplicitClass();
        parameter.SetValues(fields);
        if (name && !CjsParameter.getNamedValue(parameter)) {
          parameter.SetValues({
            name: String(name)
          });
        }
        return parameter;
      }
      for (const ParameterClass of _Tr2Effect.INFERRED_PARAMETER_TYPES) {
        if (!ParameterClass.isValue?.(value)) {
          continue;
        }
        const parameter = new ParameterClass();
        parameter.SetValues({
          name: String(name ?? "")
        });
        if (ParameterClass === _TriTextureParameter) {
          parameter.SetValues({
            resourcePath: String(value)
          });
        } else {
          parameter.SetValue(value);
        }
        return parameter;
      }
      return null;
    }

    /**
     * Removes the named entry from one of the effect's collections, detaching it
     * from the material first when the list is `resources`; returns whether
     * anything was removed.
     */
    #removeNamed(list, name) {
      const existing = CjsParameter.findByName(list, name);
      if (!existing) {
        return false;
      }
      if (list === this.resources) {
        existing?.OnRemovedFromMaterial?.(this);
      }
      list.splice(list.indexOf(existing), 1);
      return true;
    }

    /**
     * Assigns a dynamic parameter by name, reusing the existing model when its
     * class claims the value and otherwise creating one and replacing the old
     * entry; string values route to the texture resource list instead. Throws
     * TypeError when no registered parameter class can represent the value.
     */
    #setNamedParameter(name, value) {
      if (typeof value === "string") {
        return this.#setNamedTexture(name, value);
      }
      const existing = CjsParameter.findByName(this.parameters, name);
      if (existing && existing.constructor.isValue?.(value)) {
        existing.SetValue(value);
        return true;
      }
      const created = _Tr2Effect.CreateParameterFromValue(name, value);
      if (!created) {
        throw new TypeError(`Tr2Effect.SetParameters cannot infer a parameter type for "${name}".`);
      }
      if (created instanceof _TriTextureParameter) {
        const existingResource = CjsParameter.findByName(this.resources, name);
        if (existingResource) {
          existingResource?.OnRemovedFromMaterial?.(this);
          this.resources[this.resources.indexOf(existingResource)] = created;
        } else {
          this.resources.push(created);
        }
        created?.OnAddedToMaterial?.(this);
        return true;
      }
      if (existing) {
        this.parameters[this.parameters.indexOf(existing)] = created;
      } else {
        this.parameters.push(created);
      }
      return true;
    }

    /**
     * Points the named texture resource at a res path, creating and attaching a
     * TriTextureParameter when absent; returns false when the path is already that
     * value, and throws TypeError for non-string values.
     */
    #setNamedTexture(name, value) {
      if (typeof value !== "string") {
        throw new TypeError(`Tr2Effect.SetTextures requires res path strings for "${name}".`);
      }
      const existing = CjsParameter.findByName(this.resources, name);
      if (existing) {
        if (existing.resourcePath === value) {
          return false;
        }
        if (existing.SetResourcePath) {
          existing.SetResourcePath(value);
        } else {
          existing.resourcePath = value;
        }
        return true;
      }
      const parameter = new _TriTextureParameter();
      parameter.SetParameterName?.(name);
      parameter.SetResourcePath?.(value);
      this.resources.push(parameter);
      parameter?.OnAddedToMaterial?.(this);
      return true;
    }

    /**
     * Resolves a descriptor's `Type`/`type`/`_type` field to a parameter
     * constructor, directly or through the schema registry; returns null when no
     * type field is present and throws TypeError for an unregistered class name.
     */

    /**
     * Coerces a number (splatted to all four components), a four-number array, or
     * a `{ value }` wrapper into a new vec4; returns null when no vec4 can be
     * read.
     */

    /**
     * Empties both the constant and dynamic parameter lists inside one
     * StartUpdate/EndUpdate batch, so cached data rebuilds once at the end.
     */
    ClearAllParameters() {
      this.StartUpdate();
      this.constParameters = [];
      this.parameters = [];
      this.EndUpdate();
    }

    /**
     * Detaches every resource from this material and empties the resource list,
     * then rebuilds cached data.
     */
    ClearAllResources() {
      for (const resource of this.resources) {
        resource?.OnRemovedFromMaterial?.(this);
      }
      this.resources = [];
      this.RebuildCachedDataInternal();
    }

    /**
     * Sets a shader option, adding it when absent; cached data is rebuilt only
     * when the value actually changes, since options select the shader
     * permutation.
     */
    SetOption(name, value) {
      const existing = CjsParameter.findByName(this.options, name);
      if (existing) {
        if (existing.value !== value) {
          existing.value = String(value);
          this.RebuildCachedDataInternal();
        }
        return;
      }
      const option = new _Tr2ShaderOption();
      option.name = String(name);
      option.value = String(value);
      this.options.push(option);
      this.RebuildCachedDataInternal();
    }

    /**
     * Drops the named option so the shader resolves with its default permutation
     * again.
     */
    ResetOption(name) {
      this.options = this.options.filter(option => option?.name !== name);
      this.RebuildCachedDataInternal();
    }

    /** The option's value, or the empty string when the option is not set. */
    GetOption(name) {
      return CjsParameter.findByName(this.options, name)?.value ?? "";
    }

    /**
     * Looks the name up in the dynamic parameters first, then the resources;
     * authored constant parameters are not searched.
     */
    GetParameterByName(name) {
      return this.FindParameterByName(name) ?? this.GetResourceByName(name);
    }

    /**
     * The dynamic parameter with this shader name, or null; resources and constant
     * parameters are not consulted.
     */
    FindParameterByName(name) {
      return this.parameters.find(parameter => CjsParameter.getNamedValue(parameter) === name) ?? null;
    }

    /** The resource parameter with this shader name, or null. */
    GetResourceByName(name) {
      return this.resources.find(parameter => CjsParameter.getNamedValue(parameter) === name) ?? null;
    }

    /** Whether a sampler override is authored for this resource name. */
    HasSamplerOverride(name) {
      return this.samplerOverrides.some(value => value?.name === name);
    }

    /**
     * Whether an authored constant parameter uses this name; dynamic parameters
     * and resources do not count.
     */
    HasParameter(name) {
      return this.constParameters.some(value => value?.name === name);
    }

    /**
     * Whether any collection - parameters, resources or constant parameters -
     * already claims the name; the duplicate guard PopulateParameters uses.
     */
    #hasParameterLike(name) {
      return !!(this.GetParameterByName(name) || this.HasParameter(name));
    }

    /**
     * Whether the resolved shader both marks the name SasUiVisible and exposes it
     * as a constant or resource; the predicate PruneParameters filters on.
     */
    #isShaderParameterVisible(name) {
      if (!name) {
        return false;
      }
      return _Tr2Effect.getBool(this.shader, name, "SasUiVisible", false) && !!(this.shader?.GetConstant?.(name) || this.shader?.GetResource?.(name));
    }

    /** Normalizes an authored effect path's backslashes to forward slashes. */
    static convertEffectPath(path) {
      return String(path).replaceAll("\\", "/");
    }

    /**
     * Flattens a shader's technique/pass tree into a flat array of stage inputs,
     * accepting either a GetEffectDescription accessor or a plain `effect` field.
     */
    static iterateShaderStages(shader) {
      const stages = [];
      const desc = shader?.GetEffectDescription?.() ?? shader?.effect ?? null;
      for (const technique of desc?.techniques ?? []) {
        for (const pass of technique?.passes ?? []) {
          stages.push(...(pass?.stageInputs ?? []));
        }
      }
      return stages;
    }

    /**
     * Normalizes a stage's resource collection - Map, array of entries, or plain
     * object - into a flat array of resource descriptions.
     */
    static iterateResources(values) {
      if (!values) {
        return [];
      }
      if (values instanceof Map) {
        return [...values.values()];
      }
      if (Array.isArray(values)) {
        return values.map(value => value?.[1] ?? value);
      }
      return Object.values(values);
    }

    /**
     * Reads a boolean shader annotation off a parameter, tolerating Map/array/object annotation containers and the several value field names reflection data uses.
     * @returns {boolean} defaultValue when the annotation is absent
     */
    static getBool(shader, parameterName, annotationName, defaultValue = false) {
      const annotations = shader?.GetParameterAnnotations?.(parameterName);
      const values = annotations instanceof Map ? [...annotations.values()] : Array.isArray(annotations) ? annotations : Object.values(annotations ?? {});
      const annotation = values.find(value => value?.name === annotationName);
      if (!annotation) {
        return defaultValue;
      }
      return Boolean(annotation.boolValue ?? annotation.value ?? annotation.booleanValue ?? defaultValue);
    }

    /**
     * Builds the parameter model matching a reflected shader constant - float
     * array, matrix, vector or scalar - seeded with the shader-authored defaults;
     * a 16-component constant whose name contains `Reflection` becomes an
     * EnvMapTransform variable parameter instead. Returns null for non-FLOAT
     * constants, which Carbon does not surface as parameters.
     */
    static convertEffectConstant(constant, constantValues) {
      // Carbon only populates parameters for FLOAT constants; INT/UINT/BOOL
      // constants are skipped. String types accepted for pre-enum reflection data.
      const constantType = constant?.type;
      if (constantType !== undefined && constantType !== null && constantType !== Tr2EffectConstant.Type.FLOAT && constantType !== "FLOAT") {
        return null;
      }
      const name = constant.name ?? "";
      const dimension = Number(constant.dimension ?? 1);
      const elements = Number(constant.elements ?? 1);
      if (elements > 1) {
        const parameter = new _TriFloatArrayParamet();
        parameter.name = name;
        parameter.value = Array.from({
          length: elements
        }, (_, index) => {
          const row = new _TriVector();
          row.data = _Tr2Effect.readVector4(constant, constantValues, index);
          return row;
        });
        return parameter;
      }
      if (dimension === 16 && name.includes("Reflection")) {
        const parameter = new _TriVariableParameter();
        parameter.name = name;
        parameter.variableName = "EnvMapTransform";
        parameter.Initialize();
        return parameter;
      }
      if (dimension === 16) {
        const parameter = new _Tr2Matrix4Parameter();
        parameter.name = name;
        _Tr2Effect.readComponents(parameter.value, constant, constantValues, 16);
        return parameter;
      }
      if (dimension === 2) {
        const parameter = new _Tr2Vector2Parameter();
        parameter.name = name;
        _Tr2Effect.readComponents(parameter.value, constant, constantValues, 2);
        return parameter;
      }
      if (dimension === 3) {
        const parameter = new _Tr2Vector3Parameter();
        parameter.name = name;
        _Tr2Effect.readComponents(parameter.value, constant, constantValues, 3);
        return parameter;
      }
      if (dimension > 1) {
        const parameter = new _Tr2Vector4Parameter();
        parameter.name = name;
        parameter.value = _Tr2Effect.readVector4(constant, constantValues, 0);
        return parameter;
      }
      const parameter = new _Tr2FloatParameter();
      parameter.name = name;
      parameter.value = _Tr2Effect.readScalar(constant, constantValues);
      return parameter;
    }

    /**
     * Builds a TriTextureParameter for texture resources and a
     * Tr2GeometryBufferParameter for everything else.
     */
    static convertEffectResource(resource) {
      if (_Tr2Effect.isTextureResource(resource)) {
        const parameter = new _TriTextureParameter();
        parameter.SetParameterName?.(resource.name ?? "");
        return parameter;
      }
      const parameter = new _Tr2GeometryBufferPar();
      parameter.name = resource.name ?? "";
      return parameter;
    }

    /**
     * Classifies a reflected resource as a texture: string types containing
     * TEXTURE but not BUFFER, or numeric types 1..5 (TEXTURE_1D through
     * TEXTURE_TYPELESS); buffer types start at 6.
     */
    static isTextureResource(resource) {
      const type = resource?.type;
      if (typeof type === "string") {
        return type.includes("TEXTURE") && !type.includes("BUFFER");
      }
      // Tr2EffectResource texture types are TEXTURE_1D(1)..TEXTURE_TYPELESS(5);
      // Carbon routes TYPELESS to TriTextureParameter too. Buffers start at 6.
      return Number(type) >= 1 && Number(type) <= 5;
    }

    /**
     * Reads a constant's shader-authored default scalar, preferring an inline
     * value and otherwise a little-endian float32 at the constant's offset into
     * the stage's constantValues; 0 when neither is available.
     */
    static readScalar(constant, values) {
      if (typeof constant.value === "number") {
        return constant.value;
      }
      if (ArrayBuffer.isView(values)) {
        const offset = Number(constant.offset ?? 0);
        if (offset >= 0 && offset + 4 <= values.byteLength) {
          return new DataView(values.buffer, values.byteOffset, values.byteLength).getFloat32(offset, true);
        }
      }
      return 0;
    }

    /**
     * Reads the shader-authored default components for a constant into the
     * parameter's value slot (Carbon reads them straight from constantValues
     * at the constant's offset). Missing data leaves the class default.
     */
    static readComponents(out, constant, values, count) {
      if (constant.value && typeof constant.value.length === "number") {
        for (let i = 0; i < count; i++) {
          out[i] = Number(constant.value[i]) || 0;
        }
        return out;
      }
      if (ArrayBuffer.isView(values)) {
        const view = new DataView(values.buffer, values.byteOffset, values.byteLength);
        const offset = Number(constant.offset ?? 0);
        if (offset >= 0 && offset + count * 4 <= values.byteLength) {
          for (let i = 0; i < count; i++) {
            out[i] = view.getFloat32(offset + i * 4, true);
          }
        }
      }
      return out;
    }

    /**
     * Reads the shader-authored default vec4 for one element of a constant out of the stage's constantValues (16 bytes per element), or from the constant's inline value when it has one.
     * @param element zero-based array element index; ignored when the constant carries an inline value
     * @returns {vec4} a newly allocated vector; components outside the buffer stay 0
     */
    static readVector4(constant, values, element) {
      if (constant.value && typeof constant.value.length === "number") {
        return vec4.fromValues(constant.value[0] ?? 0, constant.value[1] ?? 0, constant.value[2] ?? 0, constant.value[3] ?? 0);
      }
      const out = vec4.create();
      if (ArrayBuffer.isView(values)) {
        const view = new DataView(values.buffer, values.byteOffset, values.byteLength);
        const offset = Number(constant.offset ?? 0) + element * 16;
        for (let i = 0; i < 4; i++) {
          const componentOffset = offset + i * 4;
          if (componentOffset >= 0 && componentOffset + 4 <= values.byteLength) {
            out[i] = view.getFloat32(componentOffset, true);
          }
        }
      }
      return out;
    }
  }];
  #resolveExplicitParameterClass(value) {
    const explicit = value?.Type ?? value?.type ?? value?._type;
    if (!explicit) {
      return null;
    }
    if (typeof explicit === "function") {
      return explicit;
    }
    const Registered = CjsSchema.GetConstructor(String(explicit));
    if (!Registered) {
      throw new TypeError(`Unknown effect parameter type "${explicit}".`);
    }
    return Registered;
  }
  #toConstVector4(value) {
    if (typeof value === "number") {
      return vec4.fromValues(value, value, value, value);
    }
    if (CjsParameter.isNumberArrayValue(value, 4)) {
      return vec4.clone(value);
    }
    if (value && typeof value === "object" && !Array.isArray(value) && "value" in value) {
      return _Tr2Effect.#toConstVector4(value.value);
    }
    return null;
  }
  #VALUE_COLLECTIONS = Object.freeze({
    parameters: {
      setter: "SetParameters",
      field: "parameters"
    },
    textures: {
      setter: "SetTextures",
      field: "resources"
    },
    constParameters: {
      setter: "SetConstParameters",
      field: "constParameters"
    },
    samplerOverrides: {
      setter: "SetSamplerOverrides",
      field: "samplerOverrides"
    }
  });
  INFERRED_PARAMETER_TYPES = Object.freeze([_Tr2FloatParameter, _Tr2Vector2Parameter, _Tr2Vector3Parameter, _Tr2Vector4Parameter, _Tr2Matrix4Parameter, _TriTextureParameter]);
  constructor() {
    super(_Tr2Effect), _initClass();
  }
}();

export { _Tr2Effect as Tr2Effect };
//# sourceMappingURL=Tr2Effect.js.map
