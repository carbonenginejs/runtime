// Carbon's constant-buffer registers, in one place.
//
// Carbon never asks what a register is. Each producer names the slot it owns
// when it fills it - EveSpaceScene writes 1 and 2, a per-object record writes
// 3 and 4 - so a buffer arrives already labelled and nothing downstream
// classifies anything.
//
// Reading a pipeline's declared bindings runs the other way and does have to
// ask, so the map is written down. It used to read "anything past b2 is
// per-object", which is right for 3 and 4 and silently wrong for the rest.
//
// Values are Tr2Renderer.cpp:38-43. The header calls them the defaults "for the
// currently set shader model", but nothing ever reassigns the statics, so they
// are constants in practice - which is why they are referred to by name here
// rather than spelled as bare numbers at each use.

/** perFrameVS, owned by the scene. */
export const PER_FRAME_VS = 1;

/** perFramePS, owned by the scene. */
export const PER_FRAME_PS = 2;

/** The effect's own constants. */
export const EFFECT_CONSTANTS = 0;

/** Registers by number. */
export const CONSTANT_SLOTS = Object.freeze({
  0: "effect",
  1: "perFrameVS",
  2: "perFramePS",
  3: "perObjectVS",
  4: "perObjectPS",
  5: "perObjectRTVertexBufferData",
  6: "perObjectVSGUI",
  8: "emulatedAddressing"
});

/** Mapped registers nothing fills yet, kept apart from an unmapped one. */
export const UNSOURCED_SLOTS = Object.freeze([
  "perObjectRTVertexBufferData",
  "perObjectVSGUI",
  "emulatedAddressing"
]);
