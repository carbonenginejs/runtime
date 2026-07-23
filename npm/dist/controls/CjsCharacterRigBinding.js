import { mat4 } from '@carbonenginejs/core-math/mat4';

const IDENTITY_PALETTE = Object.freeze([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]);

/** CPU-only mapping from animation-rig world transforms to a render-rig skinning palette. */
class CjsCharacterRigBinding {
  #animationBoneNames = [];
  #bound = false;
  #mapping = new Int32Array();
  #palette = new Float32Array();
  #renderJoints = [];
  #revision = 0;

  /** Binds exact animation-bone names to render joints and resets the palette to bind pose. */
  Bind(renderJoints, animationBoneNames) {
    const nextRenderJoints = ReadRenderJoints(renderJoints);
    const nextAnimationBoneNames = ReadBoneNames(animationBoneNames, "animation rig");
    if (this.#bound && JointsEqual(this.#renderJoints, nextRenderJoints) && NamesEqual(this.#animationBoneNames, nextAnimationBoneNames)) {
      return false;
    }
    const renderIndices = new Map(nextRenderJoints.map((joint, index) => [joint.name, index]));
    const mapping = Int32Array.from(nextAnimationBoneNames, name => renderIndices.has(name) ? renderIndices.get(name) : -1);
    this.#renderJoints = nextRenderJoints;
    this.#animationBoneNames = nextAnimationBoneNames;
    this.#mapping = mapping;
    this.#palette = CreateIdentityPalette(mapping.length);
    this.#bound = true;
    this.#revision++;
    return true;
  }

  /** Rebuilds the palette from animation-rig world transforms, or identity bind pose for null. */
  Update(animationTransforms) {
    if (!this.#bound) {
      throw new Error("Character rig binding must be bound before it can be updated");
    }
    if (animationTransforms === null || animationTransforms === undefined) {
      this.#palette = CreateIdentityPalette(this.#mapping.length);
      return;
    }
    if (!Array.isArray(animationTransforms) || animationTransforms.length !== this.#animationBoneNames.length) {
      throw new TypeError(`Character rig update requires ${this.#animationBoneNames.length} animation transforms`);
    }
    const transforms = animationTransforms.map((value, index) => ReadMatrix(value, `animation transform ${index}`));
    const palette = CreateIdentityPalette(this.#mapping.length);
    const final = mat4.create();
    for (let index = 0; index < transforms.length; index++) {
      const renderIndex = this.#mapping[index];
      if (renderIndex < 0) {
        continue;
      }
      mat4.multiply(final, transforms[index], this.#renderJoints[renderIndex].inverseWorldTransform);
      WritePaletteMatrix(palette, index, final);
    }
    this.#palette = palette;
  }

  /** Returns a detached 3x4 palette with one entry per animation-rig bone. */
  GetPalette() {
    return new Float32Array(this.#palette);
  }

  /** Returns detached animation-rig to render-rig joint indices; -1 means unmapped. */
  GetAnimationToRenderMapping() {
    return new Int32Array(this.#mapping);
  }

  /** Returns a value that changes only when the rig binding changes or is reset. */
  GetRevision() {
    return this.#revision;
  }

  /** Clears the rig binding and palette. */
  Reset() {
    if (!this.#bound) {
      return false;
    }
    this.#animationBoneNames = [];
    this.#renderJoints = [];
    this.#mapping = new Int32Array();
    this.#palette = new Float32Array();
    this.#bound = false;
    this.#revision++;
    return true;
  }
}
function ReadRenderJoints(values) {
  if (!Array.isArray(values)) {
    throw new TypeError("Character render rig must be an array");
  }
  const names = new Set();
  return values.map((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError(`Character render joint ${index} must be an object`);
    }
    const name = ReadBoneName(value.name, `render joint ${index}`);
    if (names.has(name)) {
      throw new Error(`Character render rig contains duplicate bone name "${name}"`);
    }
    names.add(name);
    return {
      name,
      inverseWorldTransform: ReadMatrix(value.inverseWorldTransform, `render joint "${name}" inverse world transform`)
    };
  });
}
function ReadBoneNames(values, label) {
  if (!Array.isArray(values)) {
    throw new TypeError(`Character ${label} bone names must be an array`);
  }
  const names = new Set();
  return values.map((value, index) => {
    const name = ReadBoneName(value, `${label} bone ${index}`);
    if (names.has(name)) {
      throw new Error(`Character ${label} contains duplicate bone name "${name}"`);
    }
    names.add(name);
    return name;
  });
}
function ReadBoneName(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`Character ${label} name must be a non-empty string`);
  }
  return value.trim();
}
function ReadMatrix(value, label) {
  if (!value || value.length !== 16) {
    throw new TypeError(`Character ${label} must contain 16 components`);
  }
  const result = new Float32Array(16);
  for (let index = 0; index < 16; index++) {
    const component = Number(value[index]);
    if (!Number.isFinite(component)) {
      throw new TypeError(`Character ${label} must contain only finite components`);
    }
    result[index] = component;
    if (!Number.isFinite(result[index])) {
      throw new RangeError(`Character ${label} exceeds float32 range`);
    }
  }
  return result;
}
function CreateIdentityPalette(count) {
  const result = new Float32Array(count * 12);
  for (let index = 0; index < count; index++) {
    result.set(IDENTITY_PALETTE, index * 12);
  }
  return result;
}
function WritePaletteMatrix(palette, index, value) {
  const offset = index * 12;
  if (!Number.isFinite(value[0]) || !Number.isFinite(value[1]) || !Number.isFinite(value[2]) || !Number.isFinite(value[4]) || !Number.isFinite(value[5]) || !Number.isFinite(value[6]) || !Number.isFinite(value[8]) || !Number.isFinite(value[9]) || !Number.isFinite(value[10]) || !Number.isFinite(value[12]) || !Number.isFinite(value[13]) || !Number.isFinite(value[14])) {
    throw new RangeError(`Character skinning palette bone ${index} overflowed`);
  }

  // Carbon Float4x3 packs (_11,_21,_31,_41) per row (MatrixUtils.cpp:6-20),
  // which on the shared byte layout is the COLUMN stride (v[0],v[4],v[8],
  // v[12]) - the same 3x4 layout as granny_matrix_3x4 and runtime-sof's
  // packInstanceMatrix. Row-stride packing transposes the rotation block.
  palette[offset] = value[0];
  palette[offset + 1] = value[4];
  palette[offset + 2] = value[8];
  palette[offset + 3] = value[12];
  palette[offset + 4] = value[1];
  palette[offset + 5] = value[5];
  palette[offset + 6] = value[9];
  palette[offset + 7] = value[13];
  palette[offset + 8] = value[2];
  palette[offset + 9] = value[6];
  palette[offset + 10] = value[10];
  palette[offset + 11] = value[14];
}
function JointsEqual(left, right) {
  return left.length === right.length && left.every((joint, index) => joint.name === right[index].name && MatrixEquals(joint.inverseWorldTransform, right[index].inverseWorldTransform));
}
function NamesEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
function MatrixEquals(left, right) {
  for (let index = 0; index < 16; index++) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

export { CjsCharacterRigBinding };
//# sourceMappingURL=CjsCharacterRigBinding.js.map
