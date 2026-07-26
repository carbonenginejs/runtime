/** Shared JavaScript adapters for Carbon's ITr2ControllerAction contract. */
class ITr2ControllerAction {
  /**
   * Resolves the object an action operates on, preferring an explicitly supplied
   * owner over the controller's own owner.
   */
  static getOwner(controller, owner = null) {
    return owner ?? controller?.GetOwner?.() ?? null;
  }

  /**
   * Throws a TypeError naming the calling method when an action is invoked
   * without a controller.
   */
  static requireController(controller, methodName) {
    if (!controller) {
      throw new TypeError(`${methodName} expects a Tr2Controller as a parameter.`);
    }
    return controller;
  }

  /**
   * Gets the controller's current frame time in seconds, preferring the JS-only
   * CjsGetCurrentFrameTime hook and falling back to GetTime, then to the
   * supplied fallback.
   */
  static getTime(controller, fallback = 0) {
    if (controller?.CjsGetCurrentFrameTime) {
      return this.toNumber(controller.CjsGetCurrentFrameTime(), fallback);
    }
    return this.toNumber(controller?.GetTime?.(), fallback);
  }

  /**
   * Calls a method on a duck-typed target if it exists, returning undefined
   * rather than throwing when the target does not implement it.
   */
  static callTarget(target, methodName, ...args) {
    return this.hasFunction(target, methodName) ? target[methodName](...args) : undefined;
  }

  /**
   * Converts a value to a finite number, substituting the fallback for NaN and
   * infinities.
   */
  static toNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  /**
   * Checks whether a value is an object carrying the named key, including
   * inherited keys.
   */
  static hasProperty(value, key) {
    return !!value && typeof value === "object" && key in value;
  }

  /** Checks whether a value is an object whose named key is callable. */
  static hasFunction(value, key) {
    return this.hasProperty(value, key) && typeof value[key] === "function";
  }

  /**
   * Narrows a value to an object reference, returning null for primitives and
   * nullish values.
   */
  static asObject(value) {
    return value && typeof value === "object" ? value : null;
  }

  /**
   * Reads a property from a duck-typed target, returning undefined when the
   * target is not an object or lacks the key.
   */
  static getProperty(target, propertyName) {
    return this.hasProperty(target, propertyName) ? target[propertyName] : undefined;
  }

  /**
   * Resolves the object held by an owner's named parameter, accepting
   * GetParameterObject, parameterObject or object as the payload accessor.
   */
  static getParameterOwner(owner, name) {
    const parameter = this.callTarget(owner, "GetParameterByName", name);
    if (!parameter) {
      return null;
    }
    return this.asObject(this.callTarget(parameter, "GetParameterObject") ?? this.getProperty(parameter, "parameterObject") ?? this.getProperty(parameter, "object"));
  }

  /**
   * Finds a named sound emitter on the owner, or null when the owner exposes no
   * emitter lookup.
   */
  static findSoundEmitter(owner, name) {
    return this.callTarget(owner, "FindSoundEmitter", name) ?? null;
  }

  /**
   * Resolves an owner's animation controller from either the
   * GetAnimationController method or the animationController property.
   */
  static getAnimationController(owner) {
    return this.callTarget(owner, "GetAnimationController") ?? this.getProperty(owner, "animationController") ?? null;
  }
}

export { ITr2ControllerAction };
//# sourceMappingURL=ITr2ControllerAction.js.map
