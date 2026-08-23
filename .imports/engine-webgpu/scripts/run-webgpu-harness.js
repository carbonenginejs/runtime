import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { buildMatrixPipelines } from "../src/core/matrixPipelines.js";
import { validateDecalCounterV5PackagePair } from "../harness/webgpu/decalCounterV5Fixture.js";
import { validateDecalCylindricV5PackagePair } from "../harness/webgpu/decalCylindricV5Fixture.js";
import { validateDecalGlowCylindricV5PackagePair } from "../harness/webgpu/decalGlowCylindricV5Fixture.js";
import { validateDecalGlowV5PackagePair } from "../harness/webgpu/decalGlowV5Fixture.js";
import { validateDecalHoleV5PackagePair } from "../harness/webgpu/decalHoleV5Fixture.js";
import { validateDecalV5PackagePair } from "../harness/webgpu/decalV5Fixture.js";
import { validateQuadDetailV5PackagePair } from "../harness/webgpu/quadDetailV5Fixture.js";
import { validateQuadGlassV5PackagePair } from "../harness/webgpu/quadGlassV5Fixture.js";
import { validateQuadHeatV5PackagePair } from "../harness/webgpu/quadHeatV5Fixture.js";
import { validateQuadOilV5PackagePair } from "../harness/webgpu/quadOilV5Fixture.js";
import { validateQuadSailsV5PackagePair } from "../harness/webgpu/quadSailsV5Fixture.js";
import { validateQuadV5PackagePair } from "../harness/webgpu/quadV5Fixture.js";

import { chromium } from "playwright";

const REQUIRED = process.argv.includes("--required");
const COMPILE_WGSL_INDEX = process.argv.indexOf("--compile-wgsl");
if (COMPILE_WGSL_INDEX >= 0 && !process.argv[COMPILE_WGSL_INDEX + 1])
{
    throw new Error("--compile-wgsl requires a WGSL file path");
}
const COMPILE_WGSL_PATH = COMPILE_WGSL_INDEX >= 0 ? resolve(process.argv[COMPILE_WGSL_INDEX + 1]) : null;
const DRAW_WGSL_INDEX = process.argv.indexOf("--draw-wgsl");
if (DRAW_WGSL_INDEX >= 0 && (!process.argv[DRAW_WGSL_INDEX + 1] || !process.argv[DRAW_WGSL_INDEX + 2]))
{
    throw new Error("--draw-wgsl requires vertex and fragment WGSL file paths");
}
const DRAW_VERTEX_PATH = DRAW_WGSL_INDEX >= 0 ? resolve(process.argv[DRAW_WGSL_INDEX + 1]) : null;
const DRAW_FRAGMENT_PATH = DRAW_WGSL_INDEX >= 0 ? resolve(process.argv[DRAW_WGSL_INDEX + 2]) : null;
const DRAW_CARBONWEBGPU_INDEX = process.argv.indexOf("--draw-carbonwebgpu");
if (DRAW_CARBONWEBGPU_INDEX >= 0 && !process.argv[DRAW_CARBONWEBGPU_INDEX + 1])
{
    throw new Error("--draw-carbonwebgpu requires a Carbon WebGPU file path");
}
if (DRAW_CARBONWEBGPU_INDEX >= 0 && DRAW_WGSL_INDEX >= 0)
{
    throw new Error("--draw-carbonwebgpu and --draw-wgsl are mutually exclusive");
}
const DRAW_CARBONWEBGPU_PATH = DRAW_CARBONWEBGPU_INDEX >= 0 ? resolve(process.argv[DRAW_CARBONWEBGPU_INDEX + 1]) : null;
const DRAW_QUADV5_INDEX = process.argv.indexOf("--draw-quadv5");
const DRAW_SKINNED_QUADV5_INDEX = process.argv.indexOf("--draw-skinned-quadv5");
const DRAW_SKINNED_QUADHEATV5_INDEX =
    process.argv.indexOf("--draw-skinned-quadheatv5");
const DRAW_SKINNED_QUADHEATDETAILV5_INDEX =
    process.argv.indexOf("--draw-skinned-quadheatdetailv5");
const DRAW_QUADGLASSV5_INDEX = process.argv.indexOf("--draw-quadglassv5");
const DRAW_SKINNED_QUADGLASSV5_INDEX =
    process.argv.indexOf("--draw-skinned-quadglassv5");
const DRAW_QUADHEATV5_INDEX = process.argv.indexOf("--draw-quadheatv5");
const DRAW_QUADDETAILV5_INDEX = process.argv.indexOf("--draw-quaddetailv5");
const DRAW_SKINNED_QUADDETAILV5_INDEX =
    process.argv.indexOf("--draw-skinned-quaddetailv5");
const DRAW_SKINNED_QUADOILV5_INDEX =
    process.argv.indexOf("--draw-skinned-quadoilv5");
const DRAW_QUADSAILSV5_INDEX = process.argv.indexOf("--draw-quadsailsv5");
const DRAW_SKINNED_QUADSAILSV5_INDEX =
    process.argv.indexOf("--draw-skinned-quadsailsv5");
const DRAW_DECALV5_INDEX = process.argv.indexOf("--draw-decalv5");
const DRAW_DECALCYLINDRICV5_INDEX = process.argv.indexOf("--draw-decalcylindricv5");
const DRAW_DECALHOLEV5_INDEX = process.argv.indexOf("--draw-decalholev5");
const DRAW_DECALCOUNTERV5_INDEX = process.argv.indexOf("--draw-decalcounterv5");
const DRAW_DECALGLOWV5_INDEX = process.argv.indexOf("--draw-decalglowv5");
const DRAW_DECALGLOWCYLINDRICV5_INDEX =
    process.argv.indexOf("--draw-decalglowcylindricv5");
if ([
    DRAW_QUADV5_INDEX,
    DRAW_SKINNED_QUADV5_INDEX,
    DRAW_SKINNED_QUADHEATV5_INDEX,
    DRAW_SKINNED_QUADHEATDETAILV5_INDEX
].filter((index) => index >= 0).length > 1)
{
    throw new Error("QuadV5 draw flags are mutually exclusive");
}
const ACTIVE_QUADV5_INDEX = DRAW_SKINNED_QUADHEATDETAILV5_INDEX >= 0
    ? DRAW_SKINNED_QUADHEATDETAILV5_INDEX
    : (DRAW_SKINNED_QUADHEATV5_INDEX >= 0
        ? DRAW_SKINNED_QUADHEATV5_INDEX
        : (DRAW_SKINNED_QUADV5_INDEX >= 0 ? DRAW_SKINNED_QUADV5_INDEX : DRAW_QUADV5_INDEX));
const QUADV5_VARIANT = DRAW_SKINNED_QUADHEATDETAILV5_INDEX >= 0
    ? "skinnedHeatDetail"
    : (DRAW_SKINNED_QUADHEATV5_INDEX >= 0
        ? "skinnedHeat"
        : (DRAW_SKINNED_QUADV5_INDEX >= 0 ? "skinned" : "static"));
const QUADV5_FLAG = QUADV5_VARIANT === "skinnedHeatDetail"
    ? "--draw-skinned-quadheatdetailv5"
    : (QUADV5_VARIANT === "skinnedHeat"
        ? "--draw-skinned-quadheatv5"
        : (QUADV5_VARIANT === "skinned" ? "--draw-skinned-quadv5" : "--draw-quadv5"));
if (ACTIVE_QUADV5_INDEX >= 0
  && (!process.argv[ACTIVE_QUADV5_INDEX + 1] || !process.argv[ACTIVE_QUADV5_INDEX + 2]
    || process.argv[ACTIVE_QUADV5_INDEX + 1].startsWith("--")
    || process.argv[ACTIVE_QUADV5_INDEX + 2].startsWith("--")))
{
    throw new Error(`${QUADV5_FLAG} requires DX11-derived and DX12-derived Carbon WebGPU file paths`);
}
const DRAW_QUADV5_PATHS = ACTIVE_QUADV5_INDEX >= 0
    ? [ resolve(process.argv[ACTIVE_QUADV5_INDEX + 1]), resolve(process.argv[ACTIVE_QUADV5_INDEX + 2]) ]
    : null;
if (DRAW_QUADGLASSV5_INDEX >= 0 && DRAW_SKINNED_QUADGLASSV5_INDEX >= 0)
{
    throw new Error("QuadGlassV5 draw flags are mutually exclusive");
}
const ACTIVE_QUADGLASSV5_INDEX = DRAW_SKINNED_QUADGLASSV5_INDEX >= 0
    ? DRAW_SKINNED_QUADGLASSV5_INDEX
    : DRAW_QUADGLASSV5_INDEX;
const QUADGLASSV5_VARIANT = DRAW_SKINNED_QUADGLASSV5_INDEX >= 0
    ? "skinned"
    : "static";
const QUADGLASSV5_FLAG = QUADGLASSV5_VARIANT === "skinned"
    ? "--draw-skinned-quadglassv5"
    : "--draw-quadglassv5";
if (ACTIVE_QUADGLASSV5_INDEX >= 0
  && (!process.argv[ACTIVE_QUADGLASSV5_INDEX + 1]
    || !process.argv[ACTIVE_QUADGLASSV5_INDEX + 2]
    || process.argv[ACTIVE_QUADGLASSV5_INDEX + 1].startsWith("--")
    || process.argv[ACTIVE_QUADGLASSV5_INDEX + 2].startsWith("--")))
{
    throw new Error(
        `${QUADGLASSV5_FLAG} requires DX11-derived and DX12-derived Carbon WebGPU file paths`
    );
}
if (ACTIVE_QUADGLASSV5_INDEX >= 0 && ACTIVE_QUADV5_INDEX >= 0)
{
    throw new Error(`${QUADGLASSV5_FLAG} cannot be combined with a QuadV5 draw flag`);
}
const DRAW_QUADGLASSV5_PATHS = ACTIVE_QUADGLASSV5_INDEX >= 0
    ? [
        resolve(process.argv[ACTIVE_QUADGLASSV5_INDEX + 1]),
        resolve(process.argv[ACTIVE_QUADGLASSV5_INDEX + 2])
    ]
    : null;
if (DRAW_QUADHEATV5_INDEX >= 0
  && (!process.argv[DRAW_QUADHEATV5_INDEX + 1] || !process.argv[DRAW_QUADHEATV5_INDEX + 2]
    || process.argv[DRAW_QUADHEATV5_INDEX + 1].startsWith("--")
    || process.argv[DRAW_QUADHEATV5_INDEX + 2].startsWith("--")))
{
    throw new Error(
        "--draw-quadheatv5 requires DX11-derived and DX12-derived Carbon WebGPU file paths"
    );
}
if (DRAW_QUADHEATV5_INDEX >= 0
  && (ACTIVE_QUADV5_INDEX >= 0 || ACTIVE_QUADGLASSV5_INDEX >= 0))
{
    throw new Error("--draw-quadheatv5 cannot be combined with another QuadV5 draw flag");
}
const DRAW_QUADHEATV5_PATHS = DRAW_QUADHEATV5_INDEX >= 0
    ? [
        resolve(process.argv[DRAW_QUADHEATV5_INDEX + 1]),
        resolve(process.argv[DRAW_QUADHEATV5_INDEX + 2])
    ]
    : null;
if (DRAW_QUADSAILSV5_INDEX >= 0 && DRAW_SKINNED_QUADSAILSV5_INDEX >= 0)
{
    throw new Error("QuadSailsV5 draw flags are mutually exclusive");
}
const ACTIVE_QUADSAILSV5_INDEX = DRAW_SKINNED_QUADSAILSV5_INDEX >= 0
    ? DRAW_SKINNED_QUADSAILSV5_INDEX
    : DRAW_QUADSAILSV5_INDEX;
const QUADSAILSV5_VARIANT = DRAW_SKINNED_QUADSAILSV5_INDEX >= 0
    ? "skinned"
    : "static";
const QUADSAILSV5_FLAG = QUADSAILSV5_VARIANT === "skinned"
    ? "--draw-skinned-quadsailsv5"
    : "--draw-quadsailsv5";
if (ACTIVE_QUADSAILSV5_INDEX >= 0
  && (!process.argv[ACTIVE_QUADSAILSV5_INDEX + 1]
    || !process.argv[ACTIVE_QUADSAILSV5_INDEX + 2]
    || process.argv[ACTIVE_QUADSAILSV5_INDEX + 1].startsWith("--")
    || process.argv[ACTIVE_QUADSAILSV5_INDEX + 2].startsWith("--")))
{
    throw new Error(
        `${QUADSAILSV5_FLAG} requires DX11-derived and DX12-derived Carbon WebGPU file paths`
    );
}
if (ACTIVE_QUADSAILSV5_INDEX >= 0
  && (ACTIVE_QUADV5_INDEX >= 0
    || ACTIVE_QUADGLASSV5_INDEX >= 0
    || DRAW_QUADHEATV5_INDEX >= 0))
{
    throw new Error(
        `${QUADSAILSV5_FLAG} cannot be combined with another QuadV5 draw flag`
    );
}
const DRAW_QUADSAILSV5_PATHS = ACTIVE_QUADSAILSV5_INDEX >= 0
    ? [
        resolve(process.argv[ACTIVE_QUADSAILSV5_INDEX + 1]),
        resolve(process.argv[ACTIVE_QUADSAILSV5_INDEX + 2])
    ]
    : null;
if (DRAW_QUADDETAILV5_INDEX >= 0 && DRAW_SKINNED_QUADDETAILV5_INDEX >= 0)
{
    throw new Error("QuadDetailV5 draw flags are mutually exclusive");
}
const ACTIVE_QUADDETAILV5_INDEX = DRAW_SKINNED_QUADDETAILV5_INDEX >= 0
    ? DRAW_SKINNED_QUADDETAILV5_INDEX
    : DRAW_QUADDETAILV5_INDEX;
const QUADDETAILV5_VARIANT = DRAW_SKINNED_QUADDETAILV5_INDEX >= 0
    ? "skinned"
    : "static";
const QUADDETAILV5_FLAG = QUADDETAILV5_VARIANT === "skinned"
    ? "--draw-skinned-quaddetailv5"
    : "--draw-quaddetailv5";
if (ACTIVE_QUADDETAILV5_INDEX >= 0
  && (!process.argv[ACTIVE_QUADDETAILV5_INDEX + 1]
    || !process.argv[ACTIVE_QUADDETAILV5_INDEX + 2]
    || process.argv[ACTIVE_QUADDETAILV5_INDEX + 1].startsWith("--")
    || process.argv[ACTIVE_QUADDETAILV5_INDEX + 2].startsWith("--")))
{
    throw new Error(
        `${QUADDETAILV5_FLAG} requires DX11-derived and DX12-derived Carbon WebGPU file paths`
    );
}
if (ACTIVE_QUADDETAILV5_INDEX >= 0
  && (ACTIVE_QUADV5_INDEX >= 0
    || ACTIVE_QUADGLASSV5_INDEX >= 0
    || DRAW_QUADHEATV5_INDEX >= 0
    || ACTIVE_QUADSAILSV5_INDEX >= 0))
{
    throw new Error(
        `${QUADDETAILV5_FLAG} cannot be combined with another QuadV5 draw flag`
    );
}
const DRAW_QUADDETAILV5_PATHS = ACTIVE_QUADDETAILV5_INDEX >= 0
    ? [
        resolve(process.argv[ACTIVE_QUADDETAILV5_INDEX + 1]),
        resolve(process.argv[ACTIVE_QUADDETAILV5_INDEX + 2])
    ]
    : null;
if (DRAW_SKINNED_QUADOILV5_INDEX >= 0
  && (!process.argv[DRAW_SKINNED_QUADOILV5_INDEX + 1]
    || !process.argv[DRAW_SKINNED_QUADOILV5_INDEX + 2]
    || process.argv[DRAW_SKINNED_QUADOILV5_INDEX + 1].startsWith("--")
    || process.argv[DRAW_SKINNED_QUADOILV5_INDEX + 2].startsWith("--")))
{
    throw new Error(
        "--draw-skinned-quadoilv5 requires DX11-derived and DX12-derived Carbon WebGPU file paths"
    );
}
if (DRAW_SKINNED_QUADOILV5_INDEX >= 0
  && (ACTIVE_QUADV5_INDEX >= 0
    || ACTIVE_QUADGLASSV5_INDEX >= 0
    || DRAW_QUADHEATV5_INDEX >= 0
    || ACTIVE_QUADSAILSV5_INDEX >= 0
    || ACTIVE_QUADDETAILV5_INDEX >= 0))
{
    throw new Error(
        "--draw-skinned-quadoilv5 cannot be combined with another QuadV5 draw flag"
    );
}
const DRAW_QUADOILV5_PATHS = DRAW_SKINNED_QUADOILV5_INDEX >= 0
    ? [
        resolve(process.argv[DRAW_SKINNED_QUADOILV5_INDEX + 1]),
        resolve(process.argv[DRAW_SKINNED_QUADOILV5_INDEX + 2])
    ]
    : null;
if ([
    DRAW_DECALV5_INDEX,
    DRAW_DECALCYLINDRICV5_INDEX,
    DRAW_DECALHOLEV5_INDEX,
    DRAW_DECALCOUNTERV5_INDEX,
    DRAW_DECALGLOWV5_INDEX,
    DRAW_DECALGLOWCYLINDRICV5_INDEX
]
    .filter((index) => index >= 0).length > 1)
{
    throw new Error("DecalV5 family draw flags are mutually exclusive");
}
const ACTIVE_DECALV5_INDEX = DRAW_DECALHOLEV5_INDEX >= 0
    ? DRAW_DECALHOLEV5_INDEX
    : (DRAW_DECALCYLINDRICV5_INDEX >= 0
    ? DRAW_DECALCYLINDRICV5_INDEX
    : (DRAW_DECALGLOWCYLINDRICV5_INDEX >= 0
    ? DRAW_DECALGLOWCYLINDRICV5_INDEX
    : (DRAW_DECALGLOWV5_INDEX >= 0
        ? DRAW_DECALGLOWV5_INDEX
        : (DRAW_DECALCOUNTERV5_INDEX >= 0
            ? DRAW_DECALCOUNTERV5_INDEX
            : DRAW_DECALV5_INDEX))));
const DECALV5_VARIANT = DRAW_DECALHOLEV5_INDEX >= 0
    ? "hole"
    : (DRAW_DECALCYLINDRICV5_INDEX >= 0
    ? "cylindric"
    : (DRAW_DECALGLOWCYLINDRICV5_INDEX >= 0
    ? "glowCylindric"
    : (DRAW_DECALGLOWV5_INDEX >= 0
        ? "glow"
        : (DRAW_DECALCOUNTERV5_INDEX >= 0 ? "counter" : "standard"))));
const DECALV5_FLAG = DECALV5_VARIANT === "hole"
    ? "--draw-decalholev5"
    : (DECALV5_VARIANT === "cylindric"
    ? "--draw-decalcylindricv5"
    : (DECALV5_VARIANT === "glowCylindric"
    ? "--draw-decalglowcylindricv5"
    : (DECALV5_VARIANT === "glow"
        ? "--draw-decalglowv5"
        : (DECALV5_VARIANT === "counter" ? "--draw-decalcounterv5" : "--draw-decalv5"))));
if (ACTIVE_DECALV5_INDEX >= 0 && ACTIVE_QUADV5_INDEX >= 0)
{
    throw new Error(`${DECALV5_FLAG} cannot be combined with a QuadV5 draw flag`);
}
if (ACTIVE_DECALV5_INDEX >= 0 && ACTIVE_QUADGLASSV5_INDEX >= 0)
{
    throw new Error(`${DECALV5_FLAG} cannot be combined with ${QUADGLASSV5_FLAG}`);
}
if (ACTIVE_DECALV5_INDEX >= 0 && DRAW_QUADHEATV5_INDEX >= 0)
{
    throw new Error(`${DECALV5_FLAG} cannot be combined with --draw-quadheatv5`);
}
if (ACTIVE_DECALV5_INDEX >= 0 && ACTIVE_QUADSAILSV5_INDEX >= 0)
{
    throw new Error(`${DECALV5_FLAG} cannot be combined with ${QUADSAILSV5_FLAG}`);
}
if (ACTIVE_DECALV5_INDEX >= 0 && ACTIVE_QUADDETAILV5_INDEX >= 0)
{
    throw new Error(`${DECALV5_FLAG} cannot be combined with ${QUADDETAILV5_FLAG}`);
}
if (ACTIVE_DECALV5_INDEX >= 0 && DRAW_SKINNED_QUADOILV5_INDEX >= 0)
{
    throw new Error(
        `${DECALV5_FLAG} cannot be combined with --draw-skinned-quadoilv5`
    );
}
if (ACTIVE_DECALV5_INDEX >= 0
  && (!process.argv[ACTIVE_DECALV5_INDEX + 1] || !process.argv[ACTIVE_DECALV5_INDEX + 2]
    || process.argv[ACTIVE_DECALV5_INDEX + 1].startsWith("--")
    || process.argv[ACTIVE_DECALV5_INDEX + 2].startsWith("--")))
{
    throw new Error(`${DECALV5_FLAG} requires DX11-derived and DX12-derived Carbon WebGPU file paths`);
}
const DRAW_DECALV5_PATHS = ACTIVE_DECALV5_INDEX >= 0
    ? [ resolve(process.argv[ACTIVE_DECALV5_INDEX + 1]), resolve(process.argv[ACTIVE_DECALV5_INDEX + 2]) ]
    : null;
// The hull draw takes ONE package, not a DX11/DX12 pair. Every other
// ship-family flag exists to prove two independently translated packages agree,
// so it needs both; this one exists to put real content on screen and a second
// backend would only double the work without changing the picture.
const DRAW_HULL_INDEX = process.argv.indexOf("--draw-hull");
if (DRAW_HULL_INDEX >= 0
  && (!process.argv[DRAW_HULL_INDEX + 1] || process.argv[DRAW_HULL_INDEX + 1].startsWith("--")))
{
    throw new Error("--draw-hull requires a packed quadv5 Carbon WebGPU file path");
}
const DRAW_HULL_PATH = DRAW_HULL_INDEX >= 0
    ? resolve(process.argv[DRAW_HULL_INDEX + 1])
    : null;
// The hull's geometry and material maps are CCP game assets. They are served
// from a directory the caller names and are never carried in this repository:
// the package ships to npm, and shipping someone else's ship with it is not a
// thing a renderer gets to do. `scripts/prepare-hull-assets.js` fetches them.
const HULL_ASSETS_INDEX = process.argv.indexOf("--hull-assets");
if (HULL_ASSETS_INDEX >= 0
  && (!process.argv[HULL_ASSETS_INDEX + 1] || process.argv[HULL_ASSETS_INDEX + 1].startsWith("--")))
{
    throw new Error("--hull-assets requires a directory path");
}
if (DRAW_HULL_INDEX >= 0 && HULL_ASSETS_INDEX < 0)
{
    throw new Error("--draw-hull requires --hull-assets <dir> holding the prepared hull binaries");
}
const HULL_ASSETS_DIR = HULL_ASSETS_INDEX >= 0
    ? resolve(process.argv[HULL_ASSETS_INDEX + 1])
    : null;
const CAPTURE_HULL_INDEX = process.argv.indexOf("--capture-hull");
if (CAPTURE_HULL_INDEX >= 0
  && (!process.argv[CAPTURE_HULL_INDEX + 1] || process.argv[CAPTURE_HULL_INDEX + 1].startsWith("--")))
{
    throw new Error("--capture-hull requires a PNG output path");
}
if (CAPTURE_HULL_INDEX >= 0 && DRAW_HULL_INDEX < 0)
{
    throw new Error("--capture-hull requires --draw-hull");
}
const CAPTURE_HULL_PATH = CAPTURE_HULL_INDEX >= 0
    ? resolve(process.argv[CAPTURE_HULL_INDEX + 1])
    : null;
const CAPTURE_QUADV5_INDEX = process.argv.indexOf("--capture-quadv5");
if (CAPTURE_QUADV5_INDEX >= 0
  && (!process.argv[CAPTURE_QUADV5_INDEX + 1] || process.argv[CAPTURE_QUADV5_INDEX + 1].startsWith("--")))
{
    throw new Error("--capture-quadv5 requires a PNG output path");
}
if (CAPTURE_QUADV5_INDEX >= 0 && ACTIVE_QUADV5_INDEX < 0)
{
    throw new Error("--capture-quadv5 requires a unified QuadV5 draw flag");
}
const CAPTURE_QUADV5_PATH = CAPTURE_QUADV5_INDEX >= 0
    ? resolve(process.argv[CAPTURE_QUADV5_INDEX + 1])
    : null;
if ((ACTIVE_QUADV5_INDEX >= 0 || ACTIVE_QUADGLASSV5_INDEX >= 0
  || DRAW_QUADHEATV5_INDEX >= 0 || ACTIVE_QUADSAILSV5_INDEX >= 0
  || ACTIVE_QUADDETAILV5_INDEX >= 0
  || DRAW_SKINNED_QUADOILV5_INDEX >= 0
  || ACTIVE_DECALV5_INDEX >= 0)
  && (DRAW_CARBONWEBGPU_INDEX >= 0 || DRAW_WGSL_INDEX >= 0))
{
    throw new Error("a ship-family draw flag cannot be combined with another draw input");
}
const PREPARE_CARBONWEBGPU_INDEX = process.argv.indexOf("--prepare-carbonwebgpu");
if (PREPARE_CARBONWEBGPU_INDEX >= 0 && !process.argv[PREPARE_CARBONWEBGPU_INDEX + 1])
{
    throw new Error("--prepare-carbonwebgpu requires a Carbon WebGPU file path");
}
if (PREPARE_CARBONWEBGPU_INDEX >= 0
  && (DRAW_CARBONWEBGPU_INDEX >= 0 || DRAW_WGSL_INDEX >= 0
    || ACTIVE_QUADV5_INDEX >= 0 || ACTIVE_QUADGLASSV5_INDEX >= 0
    || DRAW_QUADHEATV5_INDEX >= 0
    || ACTIVE_QUADSAILSV5_INDEX >= 0
    || ACTIVE_QUADDETAILV5_INDEX >= 0
    || DRAW_SKINNED_QUADOILV5_INDEX >= 0
    || ACTIVE_DECALV5_INDEX >= 0))
{
    throw new Error("--prepare-carbonwebgpu cannot be combined with a draw input");
}
const PREPARE_CARBONWEBGPU_PATH = PREPARE_CARBONWEBGPU_INDEX >= 0 ? resolve(process.argv[PREPARE_CARBONWEBGPU_INDEX + 1]) : null;
const PREPARE_MATRIX_INDEX = process.argv.indexOf("--prepare-matrix");
if (PREPARE_MATRIX_INDEX >= 0 && !process.argv[PREPARE_MATRIX_INDEX + 1])
{
    throw new Error("--prepare-matrix requires a CJS_WEBGPU_EFFECT_MATRIX JSON file path");
}
if (PREPARE_MATRIX_INDEX >= 0
  && (PREPARE_CARBONWEBGPU_INDEX >= 0 || DRAW_CARBONWEBGPU_INDEX >= 0 || DRAW_WGSL_INDEX >= 0
    || ACTIVE_QUADV5_INDEX >= 0 || ACTIVE_QUADGLASSV5_INDEX >= 0
    || DRAW_QUADHEATV5_INDEX >= 0
    || ACTIVE_QUADSAILSV5_INDEX >= 0
    || ACTIVE_QUADDETAILV5_INDEX >= 0
    || DRAW_SKINNED_QUADOILV5_INDEX >= 0
    || ACTIVE_DECALV5_INDEX >= 0))
{
    throw new Error("--prepare-matrix cannot be combined with another package or draw input");
}
const PREPARE_MATRIX_PATH = PREPARE_MATRIX_INDEX >= 0 ? resolve(process.argv[PREPARE_MATRIX_INDEX + 1]) : null;
const PREPARE_BODYSET_INDEX = process.argv.indexOf("--prepare-bodyset");
if (PREPARE_BODYSET_INDEX >= 0
  && (!process.argv[PREPARE_BODYSET_INDEX + 1] || process.argv[PREPARE_BODYSET_INDEX + 1].startsWith("--")))
{
    throw new Error("--prepare-bodyset requires an all-body Carbon WebGPU file path");
}
if (PREPARE_BODYSET_INDEX >= 0 && PREPARE_MATRIX_INDEX >= 0)
{
    throw new Error("--prepare-bodyset cannot be combined with --prepare-matrix");
}
if (PREPARE_BODYSET_INDEX >= 0
  && (PREPARE_CARBONWEBGPU_INDEX >= 0 || DRAW_CARBONWEBGPU_INDEX >= 0 || DRAW_WGSL_INDEX >= 0
    || ACTIVE_QUADV5_INDEX >= 0 || ACTIVE_QUADGLASSV5_INDEX >= 0
    || DRAW_QUADHEATV5_INDEX >= 0
    || ACTIVE_QUADSAILSV5_INDEX >= 0
    || ACTIVE_QUADDETAILV5_INDEX >= 0
    || DRAW_SKINNED_QUADOILV5_INDEX >= 0
    || ACTIVE_DECALV5_INDEX >= 0))
{
    throw new Error("--prepare-bodyset cannot be combined with another package or draw input");
}
const PREPARE_BODYSET_PATH = PREPARE_BODYSET_INDEX >= 0
    ? resolve(process.argv[PREPARE_BODYSET_INDEX + 1])
    : null;
const HOST = "127.0.0.1";
const BROWSER_ARGS = Object.freeze([
    "--enable-unsafe-webgpu",
    "--use-webgpu-adapter=swiftshader",
    "--enable-unsafe-swiftshader",
    "--enable-dawn-features=allow_unsafe_apis",
    "--use-gpu-in-tests",
    "--disable-gpu-sandbox"
]);

async function ReadPackagePipeline(path)
{
    const [ { CjsWebgpuFormat }, { CjsWebgpuPackage }, { buildCopyblitDrawDescriptor } ] = await Promise.all([
        import("@carbonenginejs/runtime-resource/formats/webgpu"),
        import("../src/index.js"),
        import("../src/core/packageDraw.js")
    ]);
    const pkg = CjsWebgpuPackage.fromBytes(await readFile(path), {
        read: CjsWebgpuFormat.read,
        readOptions: { source: path }
    });
    const pipeline = pkg.GetPipeline("Main", 0);
    if (!pipeline) throw new Error("Carbon WebGPU package has no Main pass 0 pipeline");
    if (!pipeline.HasCompleteWgsl()) throw new Error("Carbon WebGPU Main pass 0 does not have complete WGSL");
    return { pipeline: pipeline.ToJSON(), validateCopyblit: buildCopyblitDrawDescriptor };
}

async function ReadBodySetPrepare(path)
{
    const [ { CjsWebgpuFormat }, { CjsWebgpuPackage }, { buildBodySetPipelines } ] = await Promise.all([
        import("@carbonenginejs/runtime-resource/formats/webgpu"),
        import("../src/index.js"),
        import("../src/core/bodySetPipelines.js")
    ]);
    // One emit. The container's single read carries the complete body set, so
    // there is no second emit to ask for and no chunk to reach past.
    const pkg = CjsWebgpuPackage.fromBytes(await readFile(path), {
        read: CjsWebgpuFormat.read,
        readOptions: { source: path }
    });
    if (!pkg.backendBodySource)
    {
        throw new Error(`${path} carries no backend body set; build it with mode "all"`);
    }
    return buildBodySetPipelines(pkg);
}

/**
 * Read the single packed-quadv5 package the hull draw binds against.
 *
 * The fixture rejects an unpacked package by its input signature, so this only
 * has to get a complete Main.pass0 pipeline into the browser; it does not
 * re-check the variant here and then again there.
 *
 * @param {string} path Carbon WebGPU file path.
 * @returns {Promise<object>} Serializable package record.
 */
async function ReadHullPackage(path)
{
    const [ { CjsWebgpuFormat }, { CjsWebgpuPackage } ] = await Promise.all([
        import("@carbonenginejs/runtime-resource/formats/webgpu"),
        import("../src/index.js")
    ]);
    const pkg = CjsWebgpuPackage.fromBytes(await readFile(path), {
        read: CjsWebgpuFormat.read,
        readOptions: { source: path }
    });
    const pipeline = pkg.GetPipeline("Main", 0);
    if (!pipeline || !pipeline.HasCompleteWgsl())
    {
        throw new Error(`${path} has no complete Main.pass0 pipeline`);
    }
    return {
        label: basename(path),
        backend: "dx11",
        filePath: path,
        resourcePath: "res:/webgpu-harness/hull/quadv5.carbonwebgpu",
        // No analysis chunk: the fixture takes the material layout from the
        // pass binding, which keeps this draw off the engine's analysis-reading
        // fallback rather than adding another caller to it.
        pipeline: pipeline.ToJSON()
    };
}

async function ReadQuadV5Packages(paths, variant)
{
    const comparablePath = (value) => process.platform === "win32" ? value.toLowerCase() : value;
    if (comparablePath(paths[0]) === comparablePath(paths[1]))
    {
        throw new Error(`${QUADV5_FLAG} requires distinct DX11 and DX12 package files`);
    }
    const [
        { CjsWebgpuFormat },
        { CjsWebgpuPackage }
    ] = await Promise.all([
        import("@carbonenginejs/runtime-resource/formats/webgpu"),
        import("../src/index.js")
    ]);
    const requests = [ "dx11", "dx12" ].map((backend, index) => ({
        backend,
        variant,
        filePath: paths[index],
        resourcePath: `res:/webgpu-harness/${variant}-quadv5/${backend}.carbonwebgpu`
    }));

    const records = [];
    for (const request of requests)
    {
        const pkg = CjsWebgpuPackage.fromBytes(await readFile(request.filePath), {
            read: CjsWebgpuFormat.read,
            readOptions: { source: request.filePath }
        });
        if (!(pkg instanceof CjsWebgpuPackage))
        {
            throw new Error(`${request.filePath} did not prepare as CjsWebgpuPackage`);
        }
        const pipeline = pkg.GetPipeline("Main", 0);
        if (!pipeline || !pipeline.HasCompleteWgsl())
        {
            throw new Error(`${request.filePath} has no complete Main.pass0 pipeline`);
        }
        const record = {
            backend: request.backend,
            variant: request.variant,
            label: basename(request.filePath),
            filePath: request.filePath,
            resourcePath: request.resourcePath,
            loadPath: "readFile -> CjsWebgpuFormat -> CjsWebgpuPackage",
            analysis: pkg.analysis,
            metadata: pkg.metadata,
            pipeline: pipeline.ToJSON()
        };
        records.push(record);
    }
    validateQuadV5PackagePair(records);
    return records;
}

async function ReadQuadGlassV5Packages(paths, variant)
{
    const comparablePath = (value) => process.platform === "win32"
        ? value.toLowerCase()
        : value;
    if (comparablePath(paths[0]) === comparablePath(paths[1]))
    {
        throw new Error(
            `${QUADGLASSV5_FLAG} requires distinct DX11 and DX12 package files`
        );
    }
    const [
        { CjsWebgpuFormat },
        { CjsWebgpuPackage }
    ] = await Promise.all([
        import("@carbonenginejs/runtime-resource/formats/webgpu"),
        import("../src/index.js")
    ]);
    const requests = [ "dx11", "dx12" ].map((backend, index) => ({
        backend,
        variant,
        filePath: paths[index],
        resourcePath: variant === "static"
            ? `res:/webgpu-harness/quadglassv5/${backend}.carbonwebgpu`
            : `res:/webgpu-harness/quadglassv5/${variant}/${backend}.carbonwebgpu`
    }));
    const records = [];
    for (const request of requests)
    {
        const pkg = CjsWebgpuPackage.fromBytes(await readFile(request.filePath), {
            read: CjsWebgpuFormat.read,
            readOptions: { source: request.filePath }
        });
        if (!(pkg instanceof CjsWebgpuPackage))
        {
            throw new Error(`${request.filePath} did not prepare as CjsWebgpuPackage`);
        }
        const pipelines = [ 0, 1 ].map((passIndex) =>
        {
            const pipeline = pkg.GetPipeline("Main", passIndex);
            if (!pipeline || !pipeline.HasCompleteWgsl())
            {
                throw new Error(
                    `${request.filePath} has no complete Main.pass${passIndex} pipeline`
                );
            }
            return pipeline.ToJSON();
        });
        records.push({
            backend: request.backend,
            variant: request.variant,
            label: basename(request.filePath),
            filePath: request.filePath,
            resourcePath: request.resourcePath,
            loadPath: "readFile -> CjsWebgpuFormat -> CjsWebgpuPackage",
            analysis: pkg.analysis,
            metadata: pkg.metadata,
            pipelines
        });
    }
    validateQuadGlassV5PackagePair(records);
    return records;
}

async function ReadQuadHeatV5Packages(paths)
{
    const comparablePath = (value) => process.platform === "win32"
        ? value.toLowerCase()
        : value;
    if (comparablePath(paths[0]) === comparablePath(paths[1]))
    {
        throw new Error(
            "--draw-quadheatv5 requires distinct DX11 and DX12 package files"
        );
    }
    const [
        { CjsWebgpuFormat },
        { CjsWebgpuPackage }
    ] = await Promise.all([
        import("@carbonenginejs/runtime-resource/formats/webgpu"),
        import("../src/index.js")
    ]);
    const requests = [ "dx11", "dx12" ].map((backend, index) => ({
        backend,
        filePath: paths[index],
        resourcePath: `res:/webgpu-harness/quadheatv5/${backend}.carbonwebgpu`
    }));
    const records = [];
    for (const request of requests)
    {
        const pkg = CjsWebgpuPackage.fromBytes(await readFile(request.filePath), {
            read: CjsWebgpuFormat.read,
            readOptions: { source: request.filePath }
        });
        if (!(pkg instanceof CjsWebgpuPackage))
        {
            throw new Error(`${request.filePath} did not prepare as CjsWebgpuPackage`);
        }
        const pipeline = pkg.GetPipeline("Main", 0);
        if (!pipeline || !pipeline.HasCompleteWgsl())
        {
            throw new Error(`${request.filePath} has no complete Main.pass0 pipeline`);
        }
        records.push({
            backend: request.backend,
            label: basename(request.filePath),
            filePath: request.filePath,
            resourcePath: request.resourcePath,
            loadPath: "readFile -> CjsWebgpuFormat -> CjsWebgpuPackage",
            analysis: pkg.analysis,
            metadata: pkg.metadata,
            pipeline: pipeline.ToJSON()
        });
    }
    validateQuadHeatV5PackagePair(records);
    return records;
}

async function ReadQuadSailsV5Packages(paths, variant)
{
    const comparablePath = (value) => process.platform === "win32"
        ? value.toLowerCase()
        : value;
    if (comparablePath(paths[0]) === comparablePath(paths[1]))
    {
        throw new Error(
            `${QUADSAILSV5_FLAG} requires distinct DX11 and DX12 package files`
        );
    }
    const [
        { CjsWebgpuFormat },
        { CjsWebgpuPackage }
    ] = await Promise.all([
        import("@carbonenginejs/runtime-resource/formats/webgpu"),
        import("../src/index.js")
    ]);
    const requests = [ "dx11", "dx12" ].map((backend, index) => ({
        backend,
        variant,
        filePath: paths[index],
        resourcePath: `res:/webgpu-harness/quadsailsv5/${variant}/${backend}.carbonwebgpu`
    }));
    const records = [];
    for (const request of requests)
    {
        const pkg = CjsWebgpuPackage.fromBytes(await readFile(request.filePath), {
            read: CjsWebgpuFormat.read,
            readOptions: { source: request.filePath }
        });
        if (!(pkg instanceof CjsWebgpuPackage))
        {
            throw new Error(`${request.filePath} did not prepare as CjsWebgpuPackage`);
        }
        const pipeline = pkg.GetPipeline("Main", 0);
        if (!pipeline || !pipeline.HasCompleteWgsl())
        {
            throw new Error(`${request.filePath} has no complete Main.pass0 pipeline`);
        }
        records.push({
            backend: request.backend,
            variant: request.variant,
            label: basename(request.filePath),
            filePath: request.filePath,
            resourcePath: request.resourcePath,
            loadPath: "readFile -> CjsWebgpuFormat -> CjsWebgpuPackage",
            analysis: pkg.analysis,
            metadata: pkg.metadata,
            pipeline: pipeline.ToJSON()
        });
    }
    validateQuadSailsV5PackagePair(records);
    return records;
}

async function ReadQuadDetailV5Packages(paths, variant)
{
    const comparablePath = (value) => process.platform === "win32"
        ? value.toLowerCase()
        : value;
    if (comparablePath(paths[0]) === comparablePath(paths[1]))
    {
        throw new Error(
            `${QUADDETAILV5_FLAG} requires distinct DX11 and DX12 package files`
        );
    }
    const [
        { CjsWebgpuFormat },
        { CjsWebgpuPackage }
    ] = await Promise.all([
        import("@carbonenginejs/runtime-resource/formats/webgpu"),
        import("../src/index.js")
    ]);
    const requests = [ "dx11", "dx12" ].map((backend, index) => ({
        backend,
        variant,
        filePath: paths[index],
        resourcePath: `res:/webgpu-harness/quaddetailv5/${variant}/${backend}.carbonwebgpu`
    }));
    const records = [];
    for (const request of requests)
    {
        const pkg = CjsWebgpuPackage.fromBytes(await readFile(request.filePath), {
            read: CjsWebgpuFormat.read,
            readOptions: { source: request.filePath }
        });
        if (!(pkg instanceof CjsWebgpuPackage))
        {
            throw new Error(`${request.filePath} did not prepare as CjsWebgpuPackage`);
        }
        const pipeline = pkg.GetPipeline("Main", 0);
        if (!pipeline || !pipeline.HasCompleteWgsl())
        {
            throw new Error(`${request.filePath} has no complete Main.pass0 pipeline`);
        }
        records.push({
            backend: request.backend,
            variant: request.variant,
            label: basename(request.filePath),
            filePath: request.filePath,
            resourcePath: request.resourcePath,
            loadPath: "readFile -> CjsWebgpuFormat -> CjsWebgpuPackage",
            analysis: pkg.analysis,
            metadata: pkg.metadata,
            pipeline: pipeline.ToJSON()
        });
    }
    validateQuadDetailV5PackagePair(records);
    return records;
}

async function ReadQuadOilV5Packages(paths)
{
    const comparablePath = (value) => process.platform === "win32"
        ? value.toLowerCase()
        : value;
    if (comparablePath(paths[0]) === comparablePath(paths[1]))
    {
        throw new Error(
            "--draw-skinned-quadoilv5 requires distinct DX11 and DX12 package files"
        );
    }
    const [
        { CjsWebgpuFormat },
        { CjsWebgpuPackage }
    ] = await Promise.all([
        import("@carbonenginejs/runtime-resource/formats/webgpu"),
        import("../src/index.js")
    ]);
    const requests = [ "dx11", "dx12" ].map((backend, index) => ({
        backend,
        variant: "skinned",
        filePath: paths[index],
        resourcePath:
            `res:/webgpu-harness/quadoilv5/skinned/${backend}.carbonwebgpu`
    }));
    const records = [];
    for (const request of requests)
    {
        const pkg = CjsWebgpuPackage.fromBytes(await readFile(request.filePath), {
            read: CjsWebgpuFormat.read,
            readOptions: { source: request.filePath }
        });
        if (!(pkg instanceof CjsWebgpuPackage))
        {
            throw new Error(`${request.filePath} did not prepare as CjsWebgpuPackage`);
        }
        const pipeline = pkg.GetPipeline("Main", 0);
        if (!pipeline || !pipeline.HasCompleteWgsl())
        {
            throw new Error(`${request.filePath} has no complete Main.pass0 pipeline`);
        }
        records.push({
            backend: request.backend,
            variant: request.variant,
            label: basename(request.filePath),
            filePath: request.filePath,
            resourcePath: request.resourcePath,
            loadPath: "readFile -> CjsWebgpuFormat -> CjsWebgpuPackage",
            analysis: pkg.analysis,
            metadata: pkg.metadata,
            pipeline: pipeline.ToJSON()
        });
    }
    validateQuadOilV5PackagePair(records);
    return records;
}

async function ReadDecalV5Packages(paths, variant)
{
    const comparablePath = (value) => process.platform === "win32" ? value.toLowerCase() : value;
    if (comparablePath(paths[0]) === comparablePath(paths[1]))
    {
        throw new Error(`${DECALV5_FLAG} requires distinct DX11 and DX12 package files`);
    }
    const [
        { CjsWebgpuFormat },
        { CjsWebgpuPackage }
    ] = await Promise.all([
        import("@carbonenginejs/runtime-resource/formats/webgpu"),
        import("../src/index.js")
    ]);
    const requests = [ "dx11", "dx12" ].map((backend, index) => ({
        backend,
        variant,
        filePath: paths[index],
        resourcePath: `res:/webgpu-harness/decalv5/${variant}/${backend}.carbonwebgpu`
    }));

    const records = [];
    for (const request of requests)
    {
        const pkg = CjsWebgpuPackage.fromBytes(await readFile(request.filePath), {
            read: CjsWebgpuFormat.read,
            readOptions: { source: request.filePath }
        });
        if (!(pkg instanceof CjsWebgpuPackage))
        {
            throw new Error(`${request.filePath} did not prepare as CjsWebgpuPackage`);
        }
        const pipeline = pkg.GetPipeline("Main", 0);
        if (!pipeline || !pipeline.HasCompleteWgsl())
        {
            throw new Error(`${request.filePath} has no complete Main.pass0 pipeline`);
        }
        records.push({
            backend: request.backend,
            variant: request.variant,
            label: basename(request.filePath),
            filePath: request.filePath,
            resourcePath: request.resourcePath,
            loadPath: "readFile -> CjsWebgpuFormat -> CjsWebgpuPackage",
            analysis: pkg.analysis,
            metadata: pkg.metadata,
            pipeline: pipeline.ToJSON()
        });
    }
    const validatePair = variant === "hole"
        ? validateDecalHoleV5PackagePair
        : (variant === "cylindric"
        ? validateDecalCylindricV5PackagePair
        : (variant === "glowCylindric"
        ? validateDecalGlowCylindricV5PackagePair
        : (variant === "glow"
            ? validateDecalGlowV5PackagePair
            : (variant === "counter"
                ? validateDecalCounterV5PackagePair
                : validateDecalV5PackagePair))));
    validatePair(records);
    return records;
}

const PACKAGE_DRAW_RECORD = DRAW_CARBONWEBGPU_PATH ? await ReadPackagePipeline(DRAW_CARBONWEBGPU_PATH) : null;
if (PACKAGE_DRAW_RECORD) PACKAGE_DRAW_RECORD.validateCopyblit(PACKAGE_DRAW_RECORD.pipeline);
const PACKAGE_DRAW = PACKAGE_DRAW_RECORD?.pipeline || null;
const PACKAGE_PREPARE = PREPARE_CARBONWEBGPU_PATH ? (await ReadPackagePipeline(PREPARE_CARBONWEBGPU_PATH)).pipeline : null;
// Both prepare inputs converge on one CJS_WEBGPU_PREPARE_MATRIX document, so
// the browser prepares a body set with no browser-side code of its own.
const MATRIX_PREPARE = PREPARE_MATRIX_PATH
    ? buildMatrixPipelines(JSON.parse(await readFile(PREPARE_MATRIX_PATH, "utf8")))
    : (PREPARE_BODYSET_PATH ? await ReadBodySetPrepare(PREPARE_BODYSET_PATH) : null);
const QUADV5_DRAW = DRAW_QUADV5_PATHS
    ? await ReadQuadV5Packages(DRAW_QUADV5_PATHS, QUADV5_VARIANT)
    : null;
const QUADGLASSV5_DRAW = DRAW_QUADGLASSV5_PATHS
    ? await ReadQuadGlassV5Packages(DRAW_QUADGLASSV5_PATHS, QUADGLASSV5_VARIANT)
    : null;
const QUADHEATV5_DRAW = DRAW_QUADHEATV5_PATHS
    ? await ReadQuadHeatV5Packages(DRAW_QUADHEATV5_PATHS)
    : null;
const QUADSAILSV5_DRAW = DRAW_QUADSAILSV5_PATHS
    ? await ReadQuadSailsV5Packages(DRAW_QUADSAILSV5_PATHS, QUADSAILSV5_VARIANT)
    : null;
const QUADDETAILV5_DRAW = DRAW_QUADDETAILV5_PATHS
    ? await ReadQuadDetailV5Packages(DRAW_QUADDETAILV5_PATHS, QUADDETAILV5_VARIANT)
    : null;
const QUADOILV5_DRAW = DRAW_QUADOILV5_PATHS
    ? await ReadQuadOilV5Packages(DRAW_QUADOILV5_PATHS)
    : null;
const DECALV5_DRAW = DRAW_DECALV5_PATHS
    ? await ReadDecalV5Packages(DRAW_DECALV5_PATHS, DECALV5_VARIANT)
    : null;

const HULL_DRAW = DRAW_HULL_PATH ? await ReadHullPackage(DRAW_HULL_PATH) : null;

const ASSETS = new Map([
    [ "/", { path: new URL("../harness/webgpu/index.html", import.meta.url), type: "text/html; charset=utf-8" } ],
    [ "/index.html", { path: new URL("../harness/webgpu/index.html", import.meta.url), type: "text/html; charset=utf-8" } ],
    [ "/run.js", { path: new URL("../harness/webgpu/run.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/computePipeline.js", { path: new URL("../harness/webgpu/computePipeline.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/CjsWebgpuDevice.js", { path: new URL("../src/CjsWebgpuDevice.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/packageDraw.js", { path: new URL("../src/core/packageDraw.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/spaceObjectMainUniforms.js", { path: new URL("../harness/webgpu/spaceObjectMainUniforms.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/trinityBatchDispatcher.js", { path: new URL("../src/core/trinityBatchDispatcher.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/trinityPassEncoder.js", { path: new URL("../src/core/trinityPassEncoder.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/decalCounterV5Fixture.js", { path: new URL("../harness/webgpu/decalCounterV5Fixture.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/decalCylindricV5Fixture.js", { path: new URL("../harness/webgpu/decalCylindricV5Fixture.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/decalGlowCylindricV5Fixture.js", { path: new URL("../harness/webgpu/decalGlowCylindricV5Fixture.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/decalGlowV5Fixture.js", { path: new URL("../harness/webgpu/decalGlowV5Fixture.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/decalHoleV5Fixture.js", { path: new URL("../harness/webgpu/decalHoleV5Fixture.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/decalV5Fixture.js", { path: new URL("../harness/webgpu/decalV5Fixture.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/quadGlassV5Fixture.js", { path: new URL("../harness/webgpu/quadGlassV5Fixture.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/quadHeatV5Fixture.js", { path: new URL("../harness/webgpu/quadHeatV5Fixture.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/quadDetailV5Fixture.js", { path: new URL("../harness/webgpu/quadDetailV5Fixture.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/quadOilV5Fixture.js", { path: new URL("../harness/webgpu/quadOilV5Fixture.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/quadSailsV5Fixture.js", { path: new URL("../harness/webgpu/quadSailsV5Fixture.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/quadV5Fixture.js", { path: new URL("../harness/webgpu/quadV5Fixture.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/hullFixture.js", { path: new URL("../harness/webgpu/hullFixture.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/freeze.js", { path: new URL("../src/core/freeze.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    // Served under two shapes because the importer decides the URL: a core
    // module importing a sibling asks for "/x.js", while CjsWebgpuDevice.js
    // sits a directory up and asks for "/core/x.js". Adding a module here is
    // part of adding one to src/core — `npm test` does not load this page, so
    // a missing route only shows up as a 404 in the browser.
    [ "/batchGroups.js", { path: new URL("../src/core/batchGroups.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/materialConstants.js", { path: new URL("../src/core/materialConstants.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    // The harness serializer lives beside the fixtures but imports the engine
    // module by its real relative path, so the browser needs that URL too.
    [ "/src/core/materialConstants.js", { path: new URL("../src/core/materialConstants.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/core/batchGroups.js", { path: new URL("../src/core/batchGroups.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/core/pipelineCache.js", { path: new URL("../src/core/pipelineCache.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/core/textureLayout.js", { path: new URL("../src/core/textureLayout.js", import.meta.url), type: "text/javascript; charset=utf-8" } ],
    [ "/config.json", {
        body: JSON.stringify({
            compileWgsl: !!COMPILE_WGSL_PATH,
            label: COMPILE_WGSL_PATH ? basename(COMPILE_WGSL_PATH) : null,
            drawWgsl: !!DRAW_VERTEX_PATH,
            drawCarbonWebgpu: !!PACKAGE_DRAW,
            drawHull: !!HULL_DRAW,
            drawQuadV5: !!QUADV5_DRAW,
            drawQuadGlassV5: !!QUADGLASSV5_DRAW,
            drawQuadHeatV5: !!QUADHEATV5_DRAW,
            drawQuadDetailV5: !!QUADDETAILV5_DRAW,
            drawQuadOilV5: !!QUADOILV5_DRAW,
            drawQuadSailsV5: !!QUADSAILSV5_DRAW,
            drawDecalV5: !!DECALV5_DRAW && DECALV5_VARIANT === "standard",
            drawDecalCylindricV5: !!DECALV5_DRAW && DECALV5_VARIANT === "cylindric",
            drawDecalHoleV5: !!DECALV5_DRAW && DECALV5_VARIANT === "hole",
            drawDecalCounterV5: !!DECALV5_DRAW && DECALV5_VARIANT === "counter",
            drawDecalGlowV5: !!DECALV5_DRAW && DECALV5_VARIANT === "glow",
            drawDecalGlowCylindricV5:
                !!DECALV5_DRAW && DECALV5_VARIANT === "glowCylindric",
            decalV5Variant: DECALV5_DRAW ? DECALV5_VARIANT : null,
            quadV5Variant: QUADV5_DRAW ? QUADV5_VARIANT : null,
            quadGlassV5Variant:
                QUADGLASSV5_DRAW ? QUADGLASSV5_VARIANT : null,
            quadSailsV5Variant: QUADSAILSV5_DRAW ? QUADSAILSV5_VARIANT : null,
            prepareCarbonWebgpu: !!PACKAGE_PREPARE,
            prepareMatrix: !!MATRIX_PREPARE,
            packageLabel: DRAW_CARBONWEBGPU_PATH ? basename(DRAW_CARBONWEBGPU_PATH) : null,
            quadV5Labels: DRAW_QUADV5_PATHS?.map((path) => basename(path)) || [],
            quadGlassV5Labels:
                DRAW_QUADGLASSV5_PATHS?.map((path) => basename(path)) || [],
            quadHeatV5Labels:
                DRAW_QUADHEATV5_PATHS?.map((path) => basename(path)) || [],
            quadDetailV5Labels:
                DRAW_QUADDETAILV5_PATHS?.map((path) => basename(path)) || [],
            quadOilV5Labels:
                DRAW_QUADOILV5_PATHS?.map((path) => basename(path)) || [],
            quadSailsV5Labels:
                DRAW_QUADSAILSV5_PATHS?.map((path) => basename(path)) || [],
            decalV5Labels: DRAW_DECALV5_PATHS?.map((path) => basename(path)) || [],
            preparePackageLabel: PREPARE_CARBONWEBGPU_PATH ? basename(PREPARE_CARBONWEBGPU_PATH) : null,
            prepareMatrixLabel: PREPARE_MATRIX_PATH
                ? basename(PREPARE_MATRIX_PATH)
                : (PREPARE_BODYSET_PATH ? basename(PREPARE_BODYSET_PATH) : null),
            vertexLabel: DRAW_VERTEX_PATH ? basename(DRAW_VERTEX_PATH) : null,
            fragmentLabel: DRAW_FRAGMENT_PATH ? basename(DRAW_FRAGMENT_PATH) : null
        }),
        type: "application/json; charset=utf-8"
    } ]
]);
if (COMPILE_WGSL_PATH)
{
    ASSETS.set("/candidate.wgsl", { path: COMPILE_WGSL_PATH, type: "text/plain; charset=utf-8" });
}
if (HULL_DRAW)
{
    ASSETS.set("/draw-hull.json", {
        body: JSON.stringify(HULL_DRAW),
        type: "application/json; charset=utf-8"
    });
    // Named one by one rather than serving the directory. A harness that will
    // happily read any path under a caller-supplied root is a file server, and
    // this one only ever needs nine files.
    const hullFiles = [
        [ "af1_vertices.bin", "application/octet-stream" ],
        [ "af1_indices.bin", "application/octet-stream" ],
        [ "af1_geometry.json", "application/json; charset=utf-8" ],
        [ "af1_a.dds", "application/octet-stream" ],
        [ "af1_n.dds", "application/octet-stream" ],
        [ "af1_r.dds", "application/octet-stream" ],
        [ "af1_m.dds", "application/octet-stream" ],
        [ "af1_p3.dds", "application/octet-stream" ],
        [ "af1_g.dds", "application/octet-stream" ]
    ];
    for (const [ name, type ] of hullFiles)
    {
        ASSETS.set(`/hull/${name}`, { path: resolve(HULL_ASSETS_DIR, name), type });
    }
}
if (DRAW_VERTEX_PATH)
{
    ASSETS.set("/vertex.wgsl", { path: DRAW_VERTEX_PATH, type: "text/plain; charset=utf-8" });
    ASSETS.set("/fragment.wgsl", { path: DRAW_FRAGMENT_PATH, type: "text/plain; charset=utf-8" });
}
if (PACKAGE_DRAW)
{
    ASSETS.set("/draw-package.json", {
        body: JSON.stringify(PACKAGE_DRAW),
        type: "application/json; charset=utf-8"
    });
}
if (PACKAGE_PREPARE)
{
    ASSETS.set("/prepare-package.json", {
        body: JSON.stringify(PACKAGE_PREPARE),
        type: "application/json; charset=utf-8"
    });
}
if (MATRIX_PREPARE)
{
    ASSETS.set("/prepare-matrix.json", {
        body: JSON.stringify(MATRIX_PREPARE),
        type: "application/json; charset=utf-8"
    });
}
if (QUADV5_DRAW)
{
    ASSETS.set("/draw-quadv5.json", {
        body: JSON.stringify(QUADV5_DRAW),
        type: "application/json; charset=utf-8"
    });
}
if (QUADGLASSV5_DRAW)
{
    ASSETS.set("/draw-quadglassv5.json", {
        body: JSON.stringify(QUADGLASSV5_DRAW),
        type: "application/json; charset=utf-8"
    });
}
if (QUADHEATV5_DRAW)
{
    ASSETS.set("/draw-quadheatv5.json", {
        body: JSON.stringify(QUADHEATV5_DRAW),
        type: "application/json; charset=utf-8"
    });
}
if (QUADDETAILV5_DRAW)
{
    ASSETS.set("/draw-quaddetailv5.json", {
        body: JSON.stringify(QUADDETAILV5_DRAW),
        type: "application/json; charset=utf-8"
    });
}
if (QUADOILV5_DRAW)
{
    ASSETS.set("/draw-quadoilv5.json", {
        body: JSON.stringify(QUADOILV5_DRAW),
        type: "application/json; charset=utf-8"
    });
}
if (QUADSAILSV5_DRAW)
{
    ASSETS.set("/draw-quadsailsv5.json", {
        body: JSON.stringify(QUADSAILSV5_DRAW),
        type: "application/json; charset=utf-8"
    });
}
if (DECALV5_DRAW)
{
    const route = DECALV5_VARIANT === "hole"
        ? "/draw-decalholev5.json"
        : (DECALV5_VARIANT === "cylindric"
        ? "/draw-decalcylindricv5.json"
        : (DECALV5_VARIANT === "glowCylindric"
        ? "/draw-decalglowcylindricv5.json"
        : (DECALV5_VARIANT === "glow"
            ? "/draw-decalglowv5.json"
            : (DECALV5_VARIANT === "counter"
                ? "/draw-decalcounterv5.json"
                : "/draw-decalv5.json"))));
    ASSETS.set(route, {
        body: JSON.stringify(DECALV5_DRAW),
        type: "application/json; charset=utf-8"
    });
}

function Listen(server)
{
    return new Promise((resolve, reject) =>
    {
        server.once("error", reject);
        server.listen(0, HOST, () => resolve(server.address()));
    });
}

function Close(server)
{
    return new Promise((resolve, reject) =>
    {
        server.close((error) => error ? reject(error) : resolve());
    });
}

function CreateHarnessServer()
{
    return createServer(async (request, response) =>
    {
        try
        {
            const pathname = new URL(request.url || "/", `http://${HOST}`).pathname;
            const asset = ASSETS.get(pathname);
            if (!asset)
            {
                response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
                response.end("Not found");
                return;
            }

            response.writeHead(200, {
                "cache-control": "no-store",
                "content-type": asset.type
            });
            response.end(asset.body ?? await readFile(asset.path));
        }
        catch (error)
        {
            response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
            response.end(error instanceof Error ? error.stack : String(error));
        }
    });
}

async function LaunchBrowser()
{
    const requestedChannel = process.env.CJS_WEBGPU_BROWSER_CHANNEL;
    const channels = requestedChannel ? [ requestedChannel ] : [ "chrome", null ];
    const failures = [];

    for (const channel of channels)
    {
        try
        {
            return await chromium.launch({
                ...(channel ? { channel } : {}),
                headless: true,
                args: BROWSER_ARGS
            });
        }
        catch (error)
        {
            failures.push(`${channel || "playwright-chromium"}: ${error instanceof Error ? error.message : error}`);
        }
    }

    throw new Error(`No Chromium browser could be launched:\n${failures.join("\n")}`);
}

/**
 * Write the hull draw's colour target to a PNG at its native size.
 *
 * Deliberately plain next to `CaptureQuadV5`, which frames two targets side by
 * side with a grid overlay because its subject is a 64-pixel silhouette nobody
 * can read unaided. This one's subject is a picture, so it gets no chrome and
 * no scaling: one canvas at 1:1, screenshotted.
 *
 * @param {object} page Playwright page.
 * @param {object} draw Hull draw result carrying `targetPixels`.
 * @param {string} outputPath PNG output path.
 */
async function CaptureHull(page, draw, outputPath)
{
    if (!Array.isArray(draw?.targetPixels) || !draw.targetPixels.length)
    {
        throw new Error("hull capture requires at least one target readback");
    }
    await page.setViewportSize({ width: draw.targetWidth, height: draw.targetHeight });
    await page.setContent(
        `<!doctype html><html><head><meta charset="utf-8"><style>
html, body { margin: 0; padding: 0; background: #000; }
canvas { display: block; }
</style></head><body><canvas id="hull"></canvas></body></html>`
    );
    // Every target, not just the colour one. MRT1 carries what the pixel stage
    // resolved for the surface itself, so it reads the tangent frame and the
    // normal map without the lighting in the way — which is the difference
    // between "the picture looks wrong" and knowing which layer is wrong.
    for (let index = 0; index < draw.targetPixels.length; index += 1)
    {
        await page.evaluate((value) =>
        {
            const canvas = document.getElementById("hull");
            canvas.width = value.targetWidth;
            canvas.height = value.targetHeight;
            canvas.getContext("2d").putImageData(new ImageData(
                new Uint8ClampedArray(value.pixels), value.targetWidth, value.targetHeight
            ), 0, 0);
        }, {
            targetWidth: draw.targetWidth,
            targetHeight: draw.targetHeight,
            pixels: draw.targetPixels[index]
        });
        await page.locator("#hull").screenshot({
            path: index === 0 ? outputPath : outputPath.replace(/\.png$/i, `-mrt${index}.png`),
            type: "png"
        });
    }
}

async function CaptureQuadV5(page, comparison, outputPath)
{
    if (!Array.isArray(comparison?.targetPixels) || comparison.targetPixels.length !== 2)
    {
        throw new Error("QuadV5 capture requires two target readbacks");
    }
    await page.setViewportSize({ width: 1080, height: 700 });
    await page.setContent(`<!doctype html>
<html><head><meta charset="utf-8"><style>
* { box-sizing: border-box; }
body { margin: 0; padding: 42px; color: #e8eefc; background: #090d16;
  font: 16px/1.45 Inter, "Segoe UI", sans-serif; }
h1 { margin: 0 0 6px; font-size: 34px; letter-spacing: -0.02em; }
.subtitle { color: #9eabc5; margin-bottom: 30px; }
.targets { display: flex; gap: 28px; }
.card { flex: 1; padding: 20px; border: 1px solid #273149; border-radius: 16px;
  background: linear-gradient(145deg, #141b2b, #0d121e); box-shadow: 0 16px 45px #0008; }
.card h2 { margin: 0 0 4px; font-size: 20px; }
.rgba { color: #9eabc5; font-family: Consolas, monospace; margin-bottom: 14px; }
.pixels { position: relative; width: 100%; aspect-ratio: 1; border: 1px solid #42506e;
  border-radius: 8px; overflow: hidden; background: #000; }
canvas { width: 100%; height: 100%; image-rendering: pixelated; }
.grid { position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(90deg, #fff2 1px, transparent 1px),
    linear-gradient(#fff2 1px, transparent 1px); background-size: 25% 25%; }
.footer { margin-top: 24px; color: #7f8ba5; }
</style></head><body>
<h1>${comparison.variant === "skinnedHeatDetail"
        ? "Skinned QuadHeatDetailV5"
        : (comparison.variant === "skinnedHeat"
            ? "Skinned QuadHeatV5"
            : `${comparison.variant === "skinned" ? "Skinned " : ""}QuadV5`)} PPT-on · body 4</h1>
<div class="subtitle">Actual WebGPU readback - DX11 and DX12 RGBA8 bytes matched after target quantization</div>
<div class="targets">
  <section class="card"><h2>MRT 0 · color</h2><div class="rgba" id="rgba0"></div>
    <div class="pixels"><canvas id="target0"></canvas><div class="grid"></div></div></section>
  <section class="card"><h2>MRT 1 · auxiliary</h2><div class="rgba" id="rgba1"></div>
    <div class="pixels"><canvas id="target1"></canvas><div class="grid"></div></div></section>
</div>
<div class="footer" id="footer"></div>
</body></html>`);
    await page.evaluate((value) =>
    {
        for (let targetIndex = 0; targetIndex < value.targetPixels.length; targetIndex += 1)
        {
            const bytes = value.targetPixels[targetIndex];
            const canvas = document.getElementById(`target${targetIndex}`);
            canvas.width = value.targetWidth;
            canvas.height = value.targetHeight;
            canvas.getContext("2d").putImageData(new ImageData(
                new Uint8ClampedArray(bytes), value.targetWidth, value.targetHeight
            ), 0, 0);
            document.getElementById(`rgba${targetIndex}`).textContent =
                `RGBA8 [${bytes.slice(0, 4).join(", ")}] · ${value.targetWidth}×${value.targetHeight}`;
        }
        document.getElementById("footer").textContent =
            `${value.labels.join("  ↔  ")} · ${value.drawKind} · ${value.indexCount} indices · zero WGSL warnings`;
    }, comparison);
    await page.screenshot({ path: outputPath, type: "png", fullPage: true });
}

async function Main()
{
    const server = CreateHarnessServer();
    let browser = null;
    try
    {
        const address = await Listen(server);
        browser = await LaunchBrowser();
        const page = await browser.newPage();
        page.on("pageerror", (error) => console.error(`browser page error: ${error.message}`));
        page.on("requestfailed", (request) => console.error(`browser request failed: ${request.url()} ${request.failure()?.errorText || "unknown"}`));
        page.on("console", (message) =>
        {
            if (message.type() === "error")
            {
                console.error(`browser: ${message.text()}`);
            }
        });
        await page.goto(`http://${HOST}:${address.port}/`, { waitUntil: "load" });
        const result = await page.evaluate(() => globalThis.webgpuHarnessResult);

        if (result.status === "skipped")
        {
            const message = `SKIP engine-webgpu WebGPU harness: ${result.reason}`;
            if (REQUIRED)
            {
                throw new Error(`${message}\nA supported browser GPU adapter is required by this command.`);
            }
            console.log(message);
            console.log("Run `npm.cmd run test:webgpu:required` on a supported runner to enforce the GPU gate.");
            return;
        }
        if (result.status !== "passed")
        {
            throw new Error(`WebGPU harness failed: ${result.error || "unknown browser failure"}`);
        }
        if (CAPTURE_HULL_PATH)
        {
            await CaptureHull(page, result.hullDraw, CAPTURE_HULL_PATH);
            console.log(`Captured the hull colour target to ${CAPTURE_HULL_PATH}`);
        }
        if (CAPTURE_QUADV5_PATH)
        {
            await CaptureQuadV5(page, result.quadV5Comparison, CAPTURE_QUADV5_PATH);
            console.log(`Captured QuadV5 MRT readbacks to ${CAPTURE_QUADV5_PATH}`);
        }

        console.log(`PASS engine-webgpu WebGPU harness: ${result.adapter}`);
        console.log(`Compiled WGSL and verified ${result.pixelCount} offscreen RGBA8 pixels.`);
        if (result.geometryAdapter)
        {
            console.log(`Uploaded and drew ${result.geometryAdapter} geometry.`);
        }
        if (result.textureAdapter)
        {
            console.log(`Uploaded, bound, and sampled ${result.textureAdapter} texture resources.`);
        }
        if (result.arrayTextureDraw)
        {
            const arrayDraw = result.arrayTextureDraw;
            console.log(
                `Created, bound, and sampled a device-owned ${arrayDraw.layers}-layer 2d-array texture; ` +
                `${arrayDraw.pixelCount} pixels matched exactly per layer ` +
                `(${arrayDraw.layerPixels.join(" + ")}) with 0 WGSL warnings.`
            );
        }
        if (result.samplerAdapter)
        {
            console.log(`Normalized, cached, and bound ${result.samplerAdapter} sampler resources.`);
        }
        if (result.resourcePublication)
        {
            console.log(`Published prepared resource bundles through the ${result.resourcePublication} seam.`);
        }
        if (result.compiledCandidate)
        {
            console.log(`Compiled candidate WGSL ${result.compiledCandidate.label} with ${result.compiledCandidate.warningCount} warnings.`);
        }
        if (result.generatedDraw)
        {
            const label = result.generatedDraw.packageLabel
                || `${result.generatedDraw.vertexLabel} + ${result.generatedDraw.fragmentLabel}`;
            console.log(`Rendered generated pair ${label} with 0 validation errors.`);
        }
        if (result.quadV5Comparison)
        {
            const quad = result.quadV5Comparison;
            const detailControls = quad.heatDetailOracle;
            const heatControl = quad.heatOracle;
            console.log(
                `Rendered PPT-on QuadV5 body ${quad.bodyIndex} from ` +
                `${quad.variant}${quad.tier ? ` ${quad.tier}-tier` : ""} ` +
                `${quad.labels.join(" and ")} from direct Carbon WebGPU reads; ` +
                (quad.physicalBindingCount
                    ? `${quad.logicalBindingCount} logical bindings over ` +
                        `${quad.physicalBindingCount} physical; `
                    : "") +
                `${quad.pixelCount} pixels matched exactly across ${quad.renderCaseCount} ` +
                `case${quad.renderCaseCount === 1 ? "" : "s"}, both MRTs, and both ` +
                `backends with 0 WGSL warnings.` +
                (detailControls
                    ? ` Detail changed ${detailControls.detail.changedPixels}/` +
                        `${detailControls.detail.coveredPixels} covered pixels; heat changed ` +
                        `${detailControls.heat.changedPixels}/${detailControls.heat.coveredPixels}.`
                    : (heatControl
                        ? ` Heat changed ${heatControl.changedPixels}/` +
                            `${heatControl.coveredPixels} covered pixels.`
                        : ""))
            );
        }
        if (result.quadGlassV5Comparison)
        {
            const glass = result.quadGlassV5Comparison;
            const skinned = glass.variant === "skinned";
            console.log(
                `Rendered non-bindless ${skinned ? "PPT-on skinned" : "PPT-off"} ` +
                `QuadGlassV5 body ${glass.bodyIndex} ` +
                `from ${glass.labels.join(" and ")} from direct Carbon WebGPU reads; ` +
                `${glass.pixelCount} pixels matched exactly across both complementary ` +
                `Main passes, ${glass.renderCaseCount} PaintMask cases, both MRTs, ` +
                `and both backends with 0 WGSL warnings ` +
                `(${glass.paintMaskOracle.controlledPixels} covered pixels switched ` +
                `alpha ${glass.paintMaskOracle.opaqueAlpha}->` +
                `${glass.paintMaskOracle.transparentAlpha}; pass sides ` +
                `${glass.paintMaskOracle.passSides.join("/")}` +
                (glass.paintMaskOracle.skinningOracle
                    ? "; indexed non-identity BoneTransforms observed"
                    : "") +
                ")."
            );
        }
        if (result.quadHeatV5Comparison)
        {
            const heat = result.quadHeatV5Comparison;
            console.log(
                `Rendered non-bindless PPT-off QuadHeatV5 body ${heat.bodyIndex} ` +
                `from ${heat.labels.join(" and ")} from direct Carbon WebGPU reads; ` +
                `${heat.pixelCount} pixels matched exactly across ${heat.renderCaseCount} ` +
                `thermal cases, both MRTs, and both backends with 0 WGSL warnings ` +
                `(${heat.heatOracle.changedPixels}/${heat.heatOracle.coveredPixels} ` +
                `covered pixels gained red heat with ` +
                `${heat.heatOracle.distinctRedDeltas} distinct byte deltas).`
            );
        }
        if (result.quadDetailV5Comparison)
        {
            const detail = result.quadDetailV5Comparison;
            const oracle = detail.quadDetailOracle;
            const skinned = detail.variant === "skinned";
            console.log(
                `Rendered non-bindless PPT-on ${skinned ? "skinned" : "static"} ` +
                `QuadDetailV5 body ` +
                `${detail.bodyIndex} from ${detail.labels.join(" and ")} from direct ` +
                `Carbon WebGPU reads; ${detail.pixelCount} pixels matched exactly across ` +
                `${detail.renderCaseCount} synthetic PPT/detail cases, both MRTs, and ` +
                `both backends with 0 WGSL warnings ` +
                `(PPT ${oracle.ppt.changedPixels}/${oracle.ppt.coveredPixels}, ` +
                `Detail1 ${oracle.detail1.changedPixels}/` +
                `${oracle.detail1.coveredPixels}, Detail2 ` +
                `${oracle.detail2.changedPixels}/${oracle.detail2.coveredPixels} ` +
                `covered pixels changed; Detail1/Detail2 delta maps were distinct` +
                (skinned ? "; indexed non-identity BoneTransforms observed" : "") +
                `).`
            );
        }
        if (result.quadOilV5Comparison)
        {
            const oil = result.quadOilV5Comparison;
            console.log(
                `Rendered non-bindless PPT-off skinned QuadOilV5 body ` +
                `${oil.bodyIndex} from ${oil.labels.join(" and ")} from direct ` +
                `Carbon WebGPU reads; ${oil.pixelCount} pixels matched exactly across ` +
                `${oil.renderCaseCount} OilFilm lookup cases, both MRTs, and both ` +
                `backends with 0 WGSL warnings ` +
                `(${oil.oilFilmOracle.changedPixels}/` +
                `${oil.oilFilmOracle.coveredPixels} covered MRT0 pixels changed ` +
                `across ${oil.oilFilmOracle.changedChannels} RGB channels and ` +
                `${oil.oilFilmOracle.distinctDeltas} distinct byte deltas; MRT1 ` +
                `remained invariant; indexed non-identity BoneTransforms observed).`
            );
        }
        if (result.quadSailsV5Comparison)
        {
            const sails = result.quadSailsV5Comparison;
            const skinned = sails.variant === "skinned";
            console.log(
                `Rendered non-bindless ${skinned ? "PPT-on skinned" : "PPT-off static"} ` +
                `QuadSailsV5 body ${sails.bodyIndex} ` +
                `from ${sails.labels.join(" and ")} from direct Carbon WebGPU reads; ` +
                `${sails.pixelCount} pixels matched exactly across ${sails.renderCaseCount} ` +
                `sails-detail cases, both MRTs, and both backends with 0 WGSL warnings ` +
                `(${sails.sailsDetailOracle.changedPixels}/` +
                `${sails.sailsDetailOracle.coveredPixels} covered pixels changed with ` +
                `${sails.sailsDetailOracle.distinctDeltas} distinct byte deltas; ` +
                (skinned ? "indexed non-identity BoneTransforms observed; " : "") +
                `provisional depth-write ` +
                `attachment exercised).`
            );
        }
        if (result.decalV5Comparison)
        {
            console.log(
                `Rendered non-bindless DecalV5 body ${result.decalV5Comparison.bodyIndex} from ` +
                `${result.decalV5Comparison.labels.join(" and ")} from direct Carbon WebGPU reads; ` +
                `${result.decalV5Comparison.pixelCount} pixels matched exactly across the color target ` +
                `and both backends with 0 WGSL warnings.`
            );
        }
        if (result.decalCylindricV5Comparison)
        {
            const alpha = result.decalCylindricV5Comparison
                .textureInfluence.cylindricalAlpha;
            console.log(
                `Rendered non-bindless DecalCylindricV5 body ` +
                `${result.decalCylindricV5Comparison.bodyIndex} from ` +
                `${result.decalCylindricV5Comparison.labels.join(" and ")} from direct ` +
                `Carbon WebGPU reads; ${result.decalCylindricV5Comparison.pixelCount} pixels ` +
                `matched exactly across ` +
                `${result.decalCylindricV5Comparison.renderCaseCount} transparency cases and ` +
                `both backends with 0 WGSL warnings ` +
                `(${result.decalCylindricV5Comparison.statistics.coverage} active pixels; ` +
                `angular/axial alpha MAE ${alpha.angularMeanAbsoluteError.toFixed(3)}/` +
                `${alpha.axialMeanAbsoluteError.toFixed(3)} bytes).`
            );
        }
        if (result.decalHoleV5Comparison)
        {
            const hole = result.decalHoleV5Comparison
                .textureInfluence.holeProjection;
            console.log(
                `Rendered non-bindless DecalHoleV5 body ` +
                `${result.decalHoleV5Comparison.bodyIndex} from ` +
                `${result.decalHoleV5Comparison.labels.join(" and ")} from direct ` +
                `Carbon WebGPU reads; ${result.decalHoleV5Comparison.pixelCount} pixels ` +
                `matched exactly across ${result.decalHoleV5Comparison.renderCaseCount} ` +
                `discard/texture cases and both backends with 0 WGSL warnings ` +
                `(${hole.activePixels} surviving, ${hole.discardedPixels} discarded; ` +
                `base alpha/RGB MAE ${hole.baseAlphaMeanAbsoluteError.toFixed(3)}/` +
                `${hole.baseRgbMeanAbsoluteError.toFixed(3)} bytes).`
            );
        }
        if (result.decalCounterV5Comparison)
        {
            console.log(
                `Rendered non-bindless DecalCounterV5 body ${result.decalCounterV5Comparison.bodyIndex} from ` +
                `${result.decalCounterV5Comparison.labels.join(" and ")} from direct Carbon WebGPU reads; ` +
                `${result.decalCounterV5Comparison.pixelCount} pixels matched exactly across the color target ` +
                `and both backends with 0 WGSL warnings ` +
                `(${result.decalCounterV5Comparison.statistics.coverage} active pixels, bounds ` +
                `${JSON.stringify(result.decalCounterV5Comparison.statistics.bounds)}).`
            );
        }
        if (result.decalGlowV5Comparison)
        {
            const influence = result.decalGlowV5Comparison.textureInfluence;
            console.log(
                `Rendered non-bindless DecalGlowV5 body ${result.decalGlowV5Comparison.bodyIndex} from ` +
                `${result.decalGlowV5Comparison.labels.join(" and ")} from direct Carbon WebGPU reads; ` +
                `${result.decalGlowV5Comparison.pixelCount} pixels matched exactly across ` +
                `${result.decalGlowV5Comparison.renderCaseCount} texture cases and both backends ` +
                `with 0 WGSL warnings (${result.decalGlowV5Comparison.statistics.coverage} active ` +
                `pixels; transparency/glow controls changed ` +
                `${influence.transparency.changedPixels}/${influence.glow.changedPixels} pixels).`
            );
        }
        if (result.decalGlowCylindricV5Comparison)
        {
            const influence = result.decalGlowCylindricV5Comparison.textureInfluence;
            const coordinates = influence.cylindricalControls;
            console.log(
                `Rendered non-bindless DecalGlowCylindricV5 body ` +
                `${result.decalGlowCylindricV5Comparison.bodyIndex} from ` +
                `${result.decalGlowCylindricV5Comparison.labels.join(" and ")} from direct ` +
                `Carbon WebGPU reads; ${result.decalGlowCylindricV5Comparison.pixelCount} pixels ` +
                `matched exactly across ` +
                `${result.decalGlowCylindricV5Comparison.renderCaseCount} texture cases and ` +
                `both backends with 0 WGSL warnings ` +
                `(${result.decalGlowCylindricV5Comparison.statistics.coverage} active pixels; ` +
                `transparency/glow controls changed ` +
                `${influence.transparency.changedPixels}/${influence.glow.changedPixels} pixels; ` +
                `angular/axial sample MAE ` +
                `${coordinates.transparencyCoordinateMeanAbsoluteError.toFixed(4)}/` +
                `${coordinates.glowCoordinateMeanAbsoluteError.toFixed(4)}).`
            );
        }
        if (result.preparedPackage)
        {
            console.log(`Prepared Carbon WebGPU package ${result.preparedPackage.label} with ${result.preparedPackage.bindingCount} canonical bindings and 0 WGSL warnings.`);
        }
        if (result.preparedMatrix)
        {
            console.log(
                `Compiled ${result.preparedMatrix.uniqueShaderModules} unique emitted modules and prepared ` +
                `${result.preparedMatrix.uniquePipelines} unique pipelines ` +
                `(${result.preparedMatrix.uniqueRenderPipelines} render, ` +
                `${result.preparedMatrix.uniqueComputePipelines} compute) from ${result.preparedMatrix.label}, ` +
                `covering ${result.preparedMatrix.coveredShaderOccurrences} emitted stage occurrences and ` +
                `${result.preparedMatrix.coveredOccurrences} ready permutation/pass occurrences with 0 WGSL warnings.`
            );
        }
        if (result.preparedMatrix && MATRIX_PREPARE?.bodySet)
        {
            const bodySet = MATRIX_PREPARE.bodySet;
            console.log(
                `Body set: ${bodySet.permutationCount} permutations resolved to ${bodySet.uniqueBodies} unique ` +
                `bodies (${bodySet.declaredBodies} declared) and ${MATRIX_PREPARE.uniquePipelines} translation ` +
                `units (${bodySet.declaredUnits} declared), ${bodySet.unsupportedBodies.length} unsupported.`
            );
            // Log the observed sharing so a silent cap or a degenerate 1:1
            // case is visible rather than hidden behind an aggregate.
            for (const [ passKey, entry ] of Object.entries(bodySet.sharing))
            {
                console.log(
                    `  ${passKey}: ${entry.bodyPasses} body-passes -> ${entry.units} units ` +
                    `(${entry.bodyRatio}:1 stored, ${entry.permutationRatio}:1 over ` +
                    `${entry.permutationPasses} permutation-passes)`
                );
            }
            for (const body of bodySet.unsupportedBodies)
            {
                console.log(`  unsupported ${body.bodyKey} (${body.permutationCount} permutations): ${body.error}`);
            }
        }
    }
    finally
    {
        await browser?.close();
        await Close(server).catch(() => undefined);
    }
}

Main().catch((error) =>
{
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
});
