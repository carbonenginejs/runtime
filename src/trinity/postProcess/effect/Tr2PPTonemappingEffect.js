// Source: trinity/trinity/PostProcess/Effects/Tr2PPTonemappingEffect.h
// Source: trinity/trinity/PostProcess/Effects/Tr2PPTonemappingEffect.cpp
import { io, type } from "#schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";


/**
 * Tonemapping curve selection - Uncharted2, ACES or AgX - together with the toe,
 * shoulder and clipping parameters that shape it.
 */
@type.define({ className: "Tr2PPTonemappingEffect", family: "postProcess" })
export class Tr2PPTonemappingEffect extends Tr2PPEffect
{

  @io.persist
  @type.int32
  @type.enum("Method")
  method = Tr2PPTonemappingEffect.Aces;

  @io.persist
  @type.float32
  toe = 0.55;

  @io.persist
  @type.float32
  shoulder = 0.26;

  @io.persist
  @type.float32
  blackClip = 0;

  @io.persist
  @type.float32
  whiteClip = 0.04;

  @io.persist
  @type.float32
  blueCorrection = 0;

  @io.persist
  @type.float32
  slope = 0.88;

  @io.persist
  @type.float32
  scale = 1;

  @io.persist
  @type.boolean
  useSweeteners = true;

  @io.persist
  @type.float32
  shoulderStrength = 0.125;

  @io.persist
  @type.float32
  linearStrength = 0.25;

  @io.persist
  @type.float32
  linearAngle = 0.1;

  @io.persist
  @type.float32
  toeStrength = 0.15;

  @io.persist
  @type.float32
  toeNumerator = 0.021;

  @io.persist
  @type.float32
  toeDenominator = 0.3;

  @io.persist
  @type.float32
  whiteScale = 2.5;

  static Method = Object.freeze({ Uncharted2: 0, Aces: 1, AgX: 2 });

  static Uncharted2 = 0;

  static Aces = 1;

  static AgX = 2;

}
