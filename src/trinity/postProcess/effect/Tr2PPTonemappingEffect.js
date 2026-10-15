// Source: trinity/trinity/PostProcess/Effects/Tr2PPTonemappingEffect.h
// Source: trinity/trinity/PostProcess/Effects/Tr2PPTonemappingEffect.cpp
import { meta, type, blue } from "#schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";


/**
 * Tonemapping curve selection - Uncharted2, ACES or AgX - together with the toe,
 * shoulder and clipping parameters that shape it.
 */
@blue.define("Tr2PPTonemappingEffect")
export class Tr2PPTonemappingEffect extends Tr2PPEffect
{

  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("Method")
  method = Tr2PPTonemappingEffect.Aces;

  @blue.readwrite
  @blue.persist
  @type.float32
  @meta.ui.group("Aces (new)")
  toe = 0.55;

  @blue.readwrite
  @blue.persist
  @type.float32
  @meta.ui.group("Aces (new)")
  shoulder = 0.26;

  @blue.readwrite
  @blue.persist
  @type.float32
  @meta.ui.group("Aces (new)")
  blackClip = 0;

  @blue.readwrite
  @blue.persist
  @type.float32
  @meta.ui.group("Aces (new)")
  whiteClip = 0.04;

  @blue.readwrite
  @blue.persist
  @type.float32
  @meta.ui.group("Aces (new)")
  blueCorrection = 0;

  @blue.readwrite
  @blue.persist
  @type.float32
  @meta.ui.group("Aces (new)")
  slope = 0.88;

  @blue.readwrite
  @blue.persist
  @type.float32
  @meta.ui.group("Aces (new)")
  scale = 1;

  @blue.readwrite
  @blue.persist
  @type.boolean
  @meta.ui.group("Aces (new)")
  useSweeteners = true;

  @blue.readwrite
  @blue.persist
  @type.float32
  @meta.ui.group("Uncharted 2 (old)")
  shoulderStrength = 0.125;

  @blue.readwrite
  @blue.persist
  @type.float32
  @meta.ui.group("Uncharted 2 (old)")
  linearStrength = 0.25;

  @blue.readwrite
  @blue.persist
  @type.float32
  @meta.ui.group("Uncharted 2 (old)")
  linearAngle = 0.1;

  @blue.readwrite
  @blue.persist
  @type.float32
  @meta.ui.group("Uncharted 2 (old)")
  toeStrength = 0.15;

  @blue.readwrite
  @blue.persist
  @type.float32
  @meta.ui.group("Uncharted 2 (old)")
  toeNumerator = 0.021;

  @blue.readwrite
  @blue.persist
  @type.float32
  @meta.ui.group("Uncharted 2 (old)")
  toeDenominator = 0.3;

  @blue.readwrite
  @blue.persist
  @type.float32
  @meta.ui.group("Uncharted 2 (old)")
  whiteScale = 2.5;

  static Method = Object.freeze({ Uncharted2: 0, Aces: 1, AgX: 2 });

  static Uncharted2 = 0;

  static Aces = 1;

  static AgX = 2;

}
