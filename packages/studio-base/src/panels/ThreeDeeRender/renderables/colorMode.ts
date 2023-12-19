// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { t } from "i18next";
import * as THREE from "three";

import { SettingsTreeFields, SettingsTreeNode } from "@foxglove/studio";
import { BaseSettings } from "@foxglove/studio-base/panels/ThreeDeeRender/settings";

import { rgbaGradient, rgbaToLinear, SRGBToLinear, stringToRgba } from "../color";
import { clamp } from "../math";
import type { ColorRGBA } from "../ros";

export type ColorConverter = (output: ColorRGBA, colorValue: number) => void;

const tempColor1 = { r: 0, g: 0, b: 0, a: 0 };
const tempColor2 = { r: 0, g: 0, b: 0, a: 0 };
export const NEEDS_MIN_MAX = ["gradient", "colormap"];

export interface ColorModeSettings {
  colorMode: "flat" | "gradient" | "colormap" | "rgb" | "rgba" | "rgba-fields";
  flatColor: string;
  colorField?: string;
  gradient: [string, string];
  colorMap: "turbo" | "rainbow" | "bluegold";
  explicitAlpha: number;
  minValue?: number;
  maxValue?: number;
}

export function getColorConverter<
  Settings extends ColorModeSettings & {
    readonly colorMode: Exclude<ColorModeSettings["colorMode"], "rgba-fields">;
  },
>(settings: Settings, minValue: number, maxValue: number): ColorConverter {
  switch (settings.colorMode) {
    case "flat": {
      const flatColor = stringToRgba(tempColor1, settings.flatColor);
      rgbaToLinear(flatColor, flatColor);
      return (output: ColorRGBA, _colorValue: number) => {
        output.r = flatColor.r;
        output.g = flatColor.g;
        output.b = flatColor.b;
        output.a = flatColor.a;
      };
    }
    case "gradient": {
      const valueDelta = Math.max(maxValue - minValue, Number.EPSILON);
      const minColor = stringToRgba(tempColor1, settings.gradient[0]);
      const maxColor = stringToRgba(tempColor2, settings.gradient[1]);
      rgbaToLinear(minColor, minColor);
      rgbaToLinear(maxColor, maxColor);
      return (output: ColorRGBA, colorValue: number) => {
        const frac = Math.max(0, Math.min((colorValue - minValue) / valueDelta, 1));
        rgbaGradient(output, minColor, maxColor, frac);
      };
    }
    case "colormap": {
      const valueDelta = Math.max(maxValue - minValue, Number.EPSILON);
      switch (settings.colorMap) {
        case "turbo":
          return (output: ColorRGBA, colorValue: number) => {
            const frac = Math.max(0, Math.min((colorValue - minValue) / valueDelta, 1));
            turboLinearCached(output, frac);
            output.a = settings.explicitAlpha;
          };
        case "rainbow":
          return (output: ColorRGBA, colorValue: number) => {
            const frac = Math.max(0, Math.min((colorValue - minValue) / valueDelta, 1));
            rainbowLinear(output, frac);
            output.a = settings.explicitAlpha;
          };
        case "bluegold":
          return (output: ColorRGBA, colorValue: number) => {
            // const frac = Math.max(0, Math.min((colorValue - minValue) / valueDelta, 1));
            // rainbowLinear(output, frac);
            bluegoldLookup(output, colorValue);
            output.a = settings.explicitAlpha;
          };
      }
      throw new Error(`Unrecognized color map: ${settings.colorMap}`);
    }
    case "rgb":
      return (output: ColorRGBA, colorValue: number) => {
        getColorBgra(output, colorValue);
        output.a = settings.explicitAlpha;
      };
    case "rgba":
      return getColorBgra;
  }
}

// 0xaarrggbb
// Matches rviz behavior:
// https://github.com/ros-visualization/rviz/blob/a60b334fd10785a6b74893189fcebbd419d468e4/src/rviz/default_plugin/point_cloud_transformers.cpp#L383-L406
function getColorBgra(output: ColorRGBA, colorValue: number): void {
  const num = colorValue >>> 0;
  output.a = ((num & 0xff000000) >>> 24) / 255;
  output.r = ((num & 0x00ff0000) >>> 16) / 255;
  output.g = ((num & 0x0000ff00) >>> 8) / 255;
  output.b = ((num & 0x000000ff) >>> 0) / 255;
}

function bluegoldLookup(output: ColorRGBA, pct: number): void {
  // map intensity from 0~255 -> bluegold rgb map
  const blueGoldColormapData = [
    [0,126,174],
    [4,129,177],
    [8,132,180],
    [12,135,184],
    [16,138,187],
    [20,141,190],
    [24,144,194],
    [28,147,197],
    [32,150,200],
    [36,153,204],
    [40,156,207],
    [44,159,210],
    [49,162,214],
    [53,165,217],
    [57,168,221],
    [61,171,224],
    [65,174,227],
    [69,177,231],
    [74,180,234],
    [85,183,235],
    [95,187,236],
    [106,190,237],
    [116,194,238],
    [127,197,240],
    [138,200,241],
    [148,204,242],
    [157,206,234],
    [165,207,217],
    [173,207,200],
    [181,208,183],
    [189,209,166],
    [197,210,149],
    [204,211,132],
    [212,211,115],
    [220,212,98],
    [228,213,81],
    [236,214,64],
    [244,215,47],
    [252,215,30],
    [254,215,30],
    [254,215,36],
    [254,215,43],
    [254,215,49],
    [254,215,55],
    [254,215,62],
    [254,214,68],
    [254,214,74],
    [254,214,80],
    [254,214,87],
    [254,214,93],
    [254,214,99],
    [255,214,106],
    [255,213,105],
    [255,213,105],
    [255,213,104],
    [255,213,104],
    [255,212,103],
    [255,212,103],
    [255,212,102],
    [255,212,102],
    [255,211,101],
    [255,211,101],
    [255,211,100],
    [255,211,100],
    [255,210,99],
    [255,210,99],
    [255,210,98],
    [255,210,98],
    [255,210,98],
    [255,209,97],
    [255,209,97],
    [255,209,96],
    [255,209,96],
    [255,208,95],
    [255,208,95],
    [255,208,94],
    [255,208,94],
    [254,206,92],
    [254,204,89],
    [254,202,86],
    [253,200,84],
    [253,198,81],
    [252,196,78],
    [252,194,75],
    [252,192,72],
    [251,190,70],
    [251,188,67],
    [250,186,64],
    [250,184,61],
    [250,182,58],
    [249,180,56],
    [249,178,53],
    [248,176,50],
    [248,174,47],
    [248,172,44],
    [247,170,42],
    [247,168,39],
    [246,166,36],
    [246,164,33],
    [246,162,30],
    [245,160,28],
    [245,158,25],
    [244,156,22],
    [244,154,19],
    [244,152,16],
    [243,150,14],
    [243,148,11],
    [243,146,8],
    [242,144,5],
    [242,142,2],
    [241,140,1],
    [241,140,1],
    [241,140,1],
    [241,139,1],
    [241,139,1],
    [241,138,1],
    [241,138,1],
    [241,138,1],
    [241,137,1],
    [240,137,1],
    [240,136,1],
    [240,136,1],
    [240,136,1],
    [240,135,1],
    [240,135,1],
    [240,134,1],
    [240,134,1],
    [240,134,1],
    [239,133,1],
    [239,132,1],
    [239,131,1],
    [238,130,1],
    [238,128,1],
    [238,127,1],
    [237,126,1],
    [237,125,1],
    [237,124,1],
    [236,123,1],
    [236,122,1],
    [236,121,1],
    [235,119,1],
    [235,118,1],
    [235,117,1],
    [234,116,1],
    [234,115,1],
    [234,114,1],
    [233,113,1],
    [233,113,1],
    [232,113,1],
    [232,112,1],
    [232,112,1],
    [231,112,1],
    [231,112,1],
    [230,111,1],
    [230,111,1],
    [230,111,1],
    [229,111,1],
    [229,110,1],
    [229,110,1],
    [228,110,1],
    [228,109,1],
    [227,109,1],
    [227,109,1],
    [227,109,1],
    [226,108,1],
    [225,106,1],
    [225,105,1],
    [224,104,1],
    [224,103,1],
    [223,102,1],
    [222,101,1],
    [222,99,1],
    [221,98,1],
    [220,97,1],
    [220,96,1],
    [219,95,1],
    [219,93,1],
    [218,92,1],
    [217,91,1],
    [217,90,1],
    [216,89,1],
    [216,88,1],
    [215,87,1],
    [214,87,1],
    [213,87,1],
    [213,86,1],
    [212,86,1],
    [211,86,1],
    [210,85,1],
    [210,85,1],
    [209,85,1],
    [208,85,1],
    [207,84,1],
    [207,84,1],
    [206,84,1],
    [205,83,1],
    [205,83,1],
    [204,83,1],
    [203,83,1],
    [202,82,1],
    [202,82,1],
    [201,82,1],
    [200,81,0],
    [199,81,0],
    [197,80,0],
    [196,80,0],
    [195,79,0],
    [194,78,0],
    [192,78,0],
    [191,77,0],
    [190,77,0],
    [189,76,0],
    [187,76,0],
    [186,75,0],
    [185,74,0],
    [184,74,0],
    [183,73,0],
    [181,73,0],
    [180,72,0],
    [179,72,0],
    [179,72,0],
    [178,71,0],
    [179,72,0],
    [179,72,0],
    [179,72,0],
    [179,72,0],
    [179,72,0],
    [179,72,0],
    [179,72,0],
    [179,72,0],
    [179,72,0],
    [179,72,0],
    [179,72,0],
    [179,72,0],
    [179,72,0],
    [179,72,0],
    [179,72,0],
    [179,72,0],
    [182,70,0],
    [186,67,0],
    [190,65,0],
    [194,62,0],
    [198,60,0],
    [202,58,0],
    [206,55,0],
    [210,53,0],
    [214,51,0],
    [218,48,0],
    [222,46,0],
    [226,44,0],
    [230,41,0],
    [234,39,0],
    [238,37,0],
    [242,34,0],
    [246,32,0],
    [250,30,0]];
  // pct = Math.max(0, Math.min(255, pct*255));
  if (blueGoldColormapData[pct] != undefined) {
    output.r = blueGoldColormapData[pct]![0]!/255.0;
    output.g = blueGoldColormapData[pct]![1]!/255.0;
    output.b = blueGoldColormapData[pct]![2]!/255.0;
    output.a = 1;
  }
}

// taken from http://docs.ros.org/jade/api/rviz/html/c++/point__cloud__transformers_8cpp_source.html
// line 47
function rainbowLinear(output: ColorRGBA, pct: number): void {
  const h = (1.0 - clamp(pct, 0, 1)) * 5.0 + 1.0;
  const i = Math.floor(h);
  let f = h % 1;
  // if i is even
  if (i % 2 < 1) {
    f = 1.0 - f;
  }
  const n = SRGBToLinear(1.0 - f);
  if (i <= 1) {
    output.r = n;
    output.g = 0;
    output.b = 1;
  } else if (i === 2) {
    output.r = 0;
    output.g = n;
    output.b = 1;
  } else if (i === 3) {
    output.r = 0;
    output.g = 1;
    output.b = n;
  } else if (i === 4) {
    output.r = n;
    output.g = 1;
    output.b = 0;
  } else {
    output.r = 1;
    output.g = n;
    output.b = 0;
  }
  output.a = 1;
}

const kRedVec4 = new THREE.Vector4(0.13572138, 4.6153926, -42.66032258, 132.13108234);
const kGreenVec4 = new THREE.Vector4(0.09140261, 2.19418839, 4.84296658, -14.18503333);
const kBlueVec4 = new THREE.Vector4(0.1066733, 12.64194608, -60.58204836, 110.36276771);
const kRedVec2 = new THREE.Vector2(-152.94239396, 59.28637943);
const kGreenVec2 = new THREE.Vector2(4.27729857, 2.82956604);
const kBlueVec2 = new THREE.Vector2(-89.90310912, 27.34824973);
const v4 = new THREE.Vector4();
const v2 = new THREE.Vector2();

// adapted from https://gist.github.com/mikhailov-work/0d177465a8151eb6ede1768d51d476c7
function turboLinear(output: ColorRGBA, pct: number): void {
  // Clamp the input between [0.0, 1.0], then scale to the range [0.01, 1.0]
  const x = clamp(pct, 0.0, 1.0) * 0.99 + 0.01;
  v4.set(1, x, x * x, x * x * x);
  v2.set(v4.z, v4.w);
  v2.multiplyScalar(v4.z);
  output.r = SRGBToLinear(clamp(v4.dot(kRedVec4) + v2.dot(kRedVec2), 0, 1));
  output.g = SRGBToLinear(clamp(v4.dot(kGreenVec4) + v2.dot(kGreenVec2), 0, 1));
  output.b = SRGBToLinear(clamp(v4.dot(kBlueVec4) + v2.dot(kBlueVec2), 0, 1));
  output.a = 1;
}

// A lookup table for the turbo() function
let TurboLookup: Float32Array | undefined;
const TURBO_LOOKUP_SIZE = 65535;

// Builds a one-time lookup table for the turbo() function then uses it to
// convert `pct` to a color
function turboLinearCached(output: ColorRGBA, pct: number): void {
  if (!TurboLookup) {
    TurboLookup = new Float32Array(TURBO_LOOKUP_SIZE * 3);
    const tempColor = { r: 0, g: 0, b: 0, a: 0 };
    for (let i = 0; i < TURBO_LOOKUP_SIZE; i++) {
      turboLinear(tempColor, i / (TURBO_LOOKUP_SIZE - 1));
      const offset = i * 3;
      TurboLookup[offset + 0] = tempColor.r;
      TurboLookup[offset + 1] = tempColor.g;
      TurboLookup[offset + 2] = tempColor.b;
    }
  }

  const offset = Math.trunc(pct * (TURBO_LOOKUP_SIZE - 1)) * 3;
  output.r = TurboLookup[offset + 0]!;
  output.g = TurboLookup[offset + 1]!;
  output.b = TurboLookup[offset + 2]!;
  output.a = 1;
}

export const RGBA_PACKED_FIELDS = new Set<string>(["rgb", "rgba"]);
export const INTENSITY_FIELDS = new Set<string>(["intensity", "i"]);

/**
 * Mutates output to select optimal color settings given a list of fields
 * @param output - settings object to apply auto selection of colorfield to
 * @param fields - array of string field names. PointField names should already have been checked for support
 * @param { supportsPackedRgbModes, supportsRgbaFieldsMode } - whether or not the message supports packed rgb modes or rgba fields mode
 */

export function autoSelectColorSettings<Settings extends ColorModeSettings>(
  output: Settings,
  fields: string[],
  {
    supportsPackedRgbModes,
    supportsRgbaFieldsMode,
  }: { supportsPackedRgbModes: boolean; supportsRgbaFieldsMode?: boolean },
): void {
  const bestField = bestColorByField(fields, { supportsPackedRgbModes });

  if (!bestField) {
    return;
  }

  output.colorField = bestField;
  switch (bestField.toLowerCase()) {
    case "rgb":
      output.colorMode = "rgb";
      break;
    case "rgba":
      output.colorMode = "rgba";
      break;
    default: // intensity, z, etc
      output.colorMode = "colormap";
      output.colorMap = "turbo";
      break;
  }

  if (supportsRgbaFieldsMode === true) {
    // does not depend on color field, so it's fine to leave as last was
    if (hasSeparateRgbaFields(fields)) {
      output.colorMode = "rgba-fields";
      return;
    }
  }
}

function bestColorByField(
  fields: string[],
  { supportsPackedRgbModes }: { supportsPackedRgbModes: boolean },
): string | undefined {
  if (supportsPackedRgbModes) {
    // first priority is color fields
    for (const field of fields) {
      if (RGBA_PACKED_FIELDS.has(field.toLowerCase())) {
        return field;
      }
    }
  }
  // second priority is intensity fields
  for (const field of fields) {
    if (INTENSITY_FIELDS.has(field.toLowerCase())) {
      return field;
    }
  }
  // third is 'z', then the first field
  return fields.find((field) => field === "z") ?? fields[0];
}

function hasSeparateRgbaFields(fields: string[]): boolean {
  let r = false;
  let g = false;
  let b = false;
  let a = false;
  for (const field of fields) {
    switch (field) {
      case "red":
        r = true;
        break;
      case "green":
        g = true;
        break;
      case "blue":
        b = true;
        break;
      case "alpha":
        a = true;
        break;
    }
  }
  return r && g && b && a;
}

export function colorModeSettingsFields<Settings extends ColorModeSettings & BaseSettings>({
  msgFields,
  config,
  defaults,
  modifiers: { supportsPackedRgbModes, supportsRgbaFieldsMode, hideFlatColor, hideExplicitAlpha },
}: {
  msgFields?: string[];
  config: Partial<Settings>;
  defaults: Pick<Settings, "gradient">;
  modifiers: {
    supportsPackedRgbModes: boolean;
    supportsRgbaFieldsMode: boolean;
    hideFlatColor?: boolean;
    hideExplicitAlpha?: boolean;
  };
}): NonNullable<SettingsTreeNode["fields"]> {
  const colorMode = config.colorMode ?? (hideFlatColor === true ? "gradient" : "flat");
  const flatColor = config.flatColor ?? "#ffffff";
  const gradient = config.gradient;
  const colorMap = config.colorMap ?? "turbo";
  const explicitAlpha = config.explicitAlpha ?? 1;
  const minValue = config.minValue;
  const maxValue = config.maxValue;

  const fields: SettingsTreeFields = {};

  const colorModeOptions = [
    { label: t("threeDee:colorModeColorMap"), value: "colormap" },
    { label: t("threeDee:gradient"), value: "gradient" },
  ];

  if (hideFlatColor !== true) {
    colorModeOptions.push({ label: t("threeDee:colorModeFlat"), value: "flat" });
  }
  if (msgFields && msgFields.length > 0) {
    if (supportsPackedRgbModes) {
      colorModeOptions.push(
        { label: t("threeDee:colorModeBgrPacked"), value: "rgb" },
        { label: t("threeDee:colorModeBgraPacked"), value: "rgba" },
      );
    }
    if (supportsRgbaFieldsMode && hasSeparateRgbaFields(msgFields)) {
      colorModeOptions.push({
        label: t("threeDee:colorModeRgbaSeparateFields"),
        value: "rgba-fields",
      });
    }
  }

  fields.colorMode = {
    label: t("threeDee:colorMode"),
    input: "select",
    value: colorMode,
    options: colorModeOptions,
  };

  if (colorMode === "flat") {
    fields.flatColor = { label: t("threeDee:flatColor"), input: "rgba", value: flatColor };
  } else if (colorMode !== "rgba-fields") {
    if (msgFields) {
      const colorFieldOptions = msgFields.map((field) => ({ label: field, value: field }));
      const colorField =
        config.colorField ?? bestColorByField(msgFields, { supportsPackedRgbModes });
      fields.colorField = {
        label: t("threeDee:colorBy"),
        input: "select",
        options: colorFieldOptions,
        value: colorField,
      };
    }

    switch (colorMode) {
      case "gradient":
        fields.gradient = {
          label: t("threeDee:gradient"),
          input: "gradient",
          value: gradient ?? defaults.gradient,
        };
        break;
      case "colormap":
        fields.colorMap = {
          label: t("threeDee:colorModeColorMap"),
          input: "select",
          options: [
            { label: "Turbo", value: "turbo" },
            { label: "Rainbow", value: "rainbow" },
            { label: "Bluegold", value: "bluegold" },
          ],
          value: colorMap,
        };
        break;
      default:
        break;
    }

    if (hideExplicitAlpha !== true && (colorMode === "colormap" || colorMode === "rgb")) {
      fields.explicitAlpha = {
        label: t("threeDee:opacity"),
        input: "number",
        step: 0.1,
        placeholder: "1",
        precision: 3,
        min: 0,
        max: 1,
        value: explicitAlpha,
      };
    }

    if (NEEDS_MIN_MAX.includes(colorMode)) {
      fields.minValue = {
        label: t("threeDee:valueMin"),
        input: "number",
        placeholder: "auto",
        precision: 4,
        value: minValue,
      };
      fields.maxValue = {
        label: t("threeDee:valueMax"),
        input: "number",
        placeholder: "auto",
        precision: 4,
        value: maxValue,
      };
    }
  }

  return fields;
}

const tempColor = { r: 0, g: 0, b: 0, a: 0 };
export function colorHasTransparency<Settings extends ColorModeSettings>(
  settings: Settings,
): boolean {
  switch (settings.colorMode) {
    case "flat":
      return stringToRgba(tempColor, settings.flatColor).a < 1.0;
    case "gradient":
      return (
        stringToRgba(tempColor, settings.gradient[0]).a < 1.0 ||
        stringToRgba(tempColor, settings.gradient[1]).a < 1.0
      );
    case "colormap":
    case "rgb":
      return settings.explicitAlpha < 1.0;
    case "rgba":
    case "rgba-fields":
      // It's too expensive to check the alpha value of each color. Just assume it's transparent
      return true;
  }
}

// Fragment shader chunk to convert sRGB to linear RGB. This is used by some
// PointCloud materials to avoid expensive per-point colorspace conversion on
// the CPU. Source: <https://github.com/mrdoob/three.js/blob/13b67d96/src/renderers/shaders/ShaderChunk/encodings_pars_fragment.glsl.js#L16-L18>
export const FS_SRGB_TO_LINEAR = /* glsl */ `
vec3 sRGBToLinear(in vec3 value) {
	return vec3(mix(
    pow(value.rgb * 0.9478672986 + vec3(0.0521327014), vec3(2.4)),
    value.rgb * 0.0773993808,
    vec3(lessThanEqual(value.rgb, vec3(0.04045)))
  ));
}

vec4 sRGBToLinear(in vec4 value) {
  return vec4(sRGBToLinear(value.rgb), value.a);
}
`;
