/**
 * Evaluates one Wwise AkCurveInterpolation over normalized progress.
 *
 * Curve identifiers follow the public AkCurveInterpolation enum. Constant
 * retains the left value until the segment endpoint.
 */
function evaluateWwiseInterpolation(curve, progress) {
  const value = Math.max(0, Math.min(1, Number(progress) || 0));
  if (value === 0 || value === 1) {
    return value;
  }
  switch (Number(curve)) {
    case 0:
      return 1 - (1 - value) ** 3;
    // Log3
    case 1:
      return WwiseSine(value);
    case 2:
      return value * (3 - value) / 2;
    // Log1
    case 3:
      return WwiseInvertedSCurve(value);
    case 5:
      return WwiseSCurve(value);
    case 6:
      return value * (value + 1) / 2;
    // Exp1
    case 7:
      return WwiseSineReciprocal(value);
    case 8:
      return value ** 3;
    // Exp3
    case 9:
      return value < 1 ? 0 : 1;
    // Constant
    default:
      return value;
    // Linear
  }
}

/** Evaluates Wwise's polynomial constant-power fade-in approximation. */
function WwiseSine(value) {
  const angle = 1.5707964 * value;
  const squared = angle * angle;
  const polynomial = (squared * -18363654e-11 + 0.0083063254) * squared - 0.16664828;
  return (polynomial * squared + 0.9999966) * angle;
}

/** Evaluates Wwise's two-sided polynomial inverted S-curve. */
function WwiseInvertedSCurve(value) {
  const angle = value > 0.5 ? 3.1415927 * (1 - value) : 3.1415927 * value;
  const squared = angle * angle;
  const polynomial = (squared * -9181827e-11 + 0.0041531627) * squared - 0.083324142;
  const half = (polynomial * squared + 0.4999983) * angle;
  return value > 0.5 ? 1 - half : half;
}

/** Evaluates Wwise's polynomial S-curve. */
function WwiseSCurve(value) {
  const angle = 3.1415927 * value;
  const squared = angle * angle;
  const polynomial = (squared * 0.00048483399 - 0.01961384) * squared + 0.24767479;
  return polynomial * squared + 0.00069670216;
}

/** Evaluates Wwise's polynomial constant-power fade-out approximation. */
function WwiseSineReciprocal(value) {
  const angle = 1.5707964 * value;
  const squared = angle * angle;
  const polynomial = (squared * -0.0012712094 + 0.04148775) * squared - 0.49991244;
  return 1 - (polynomial * squared + 0.99999332);
}

export { evaluateWwiseInterpolation };
//# sourceMappingURL=wwiseCurve.js.map
