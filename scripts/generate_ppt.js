"use strict";
const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.title = "Wheat Crop Segmentation — COMP9517 Group Project";

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  darkGreen:  "1E3A2F",
  medGreen:   "2D6A4F",
  bright:     "52B788",
  pale:       "B7E4C7",
  lightGreen: "D8F3DC",
  cream:      "F8F5EE",
  white:      "FFFFFF",
  nearBlack:  "1A1A1A",
  darkGray:   "444444",
  midGray:    "888888",
  lightGray:  "CCCCCC",
  accent:     "74C69D",
};

const makeShadow = () => ({ type: "outer", blur: 4, offset: 2, angle: 135, color: "000000", opacity: 0.12 });

// helper: header bar shared across content slides
function addHeader(s, title, bgColor = C.darkGreen, fontSize = 18) {
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.75, fill: { color: bgColor }, line: { color: bgColor } });
  s.addText(title, { x: 0.4, y: 0, w: 9.2, h: 0.75, fontSize, fontFace: "Calibri", bold: true, color: C.white, valign: "middle", margin: 0 });
}

// ── SLIDE 1: COVER ─────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.darkGreen };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0,    w: 10, h: 0.06, fill: { color: C.bright }, line: { color: C.bright } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.565,w: 10, h: 0.06, fill: { color: C.bright }, line: { color: C.bright } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0,    w: 0.22, h: 5.625, fill: { color: C.medGreen }, line: { color: C.medGreen } });

  s.addText("Wheat Crop Segmentation", {
    x: 0.5, y: 1.0, w: 7.8, h: 1.05,
    fontSize: 40, fontFace: "Calibri", bold: true, color: C.white, align: "left", margin: 0,
  });
  s.addText("in Field Images Under Diverse Conditions", {
    x: 0.5, y: 2.1, w: 7.8, h: 0.6,
    fontSize: 22, fontFace: "Calibri", color: C.pale, align: "left", margin: 0,
  });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 2.85, w: 4.5, h: 0.04, fill: { color: C.bright }, line: { color: C.bright } });
  s.addText("COMP9517 Computer Vision  ·  Group Project 2026 T1  ·  UNSW", {
    x: 0.5, y: 3.05, w: 9, h: 0.38,
    fontSize: 14, fontFace: "Calibri", color: C.accent, align: "left", margin: 0,
  });

  // decorative right panel
  s.addShape(pres.shapes.RECTANGLE, { x: 8.1, y: 0.3, w: 1.7, h: 5.0, fill: { color: C.medGreen }, line: { color: C.bright, width: 0.5 } });
  s.addText("🌾", { x: 8.1, y: 1.6, w: 1.7, h: 2.4, fontSize: 58, align: "center", valign: "middle" });
}

// ── SLIDE 2: OUTLINE ───────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeader(s, "OUTLINE", C.darkGreen, 20);

  const items = [
    ["01", "Introduction & Dataset",     "EWS dataset, task definition"],
    ["02", "Literature Review",           "Related methods for crop segmentation"],
    ["03", "Methods (M1 / M2 / M3 / M3-R)", "Classical · ML · Deep Learning · Improvement"],
    ["04", "Experiments & Results",       "Main comparison, robustness, data reduction"],
    ["05", "Discussion & Conclusion",     "Analysis, limitations, future work"],
    ["06", "Demo",                        "Code walkthrough & outputs"],
  ];

  items.forEach(([num, title, desc], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.3 + col * 4.9, y = 0.95 + row * 1.48;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 4.6, h: 1.3, fill: { color: C.white }, line: { color: C.lightGray, width: 0.5 }, shadow: makeShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.55, h: 1.3, fill: { color: C.darkGreen }, line: { color: C.darkGreen } });
    s.addText(num, { x, y, w: 0.55, h: 1.3, fontSize: 16, fontFace: "Calibri", bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText(title, { x: x + 0.65, y: y + 0.12, w: 3.8, h: 0.45, fontSize: 13, fontFace: "Calibri", bold: true, color: C.nearBlack, margin: 0 });
    s.addText(desc,  { x: x + 0.65, y: y + 0.65, w: 3.8, h: 0.5,  fontSize: 11, fontFace: "Calibri", color: C.darkGray, margin: 0 });
  });
}

// ── SLIDE 3: INTRODUCTION ─────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeader(s, "INTRODUCTION", C.darkGreen, 20);

  s.addText("Why Wheat Segmentation?", { x: 0.4, y: 0.9, w: 4.8, h: 0.4, fontSize: 15, fontFace: "Calibri", bold: true, color: C.darkGreen, margin: 0 });
  s.addText([
    { text: "Supports crop monitoring across growing seasons", options: { bullet: true, breakLine: true } },
    { text: "Enables early detection of pest and disease",     options: { bullet: true, breakLine: true } },
    { text: "Distinguishes wheat from weeds automatically",   options: { bullet: true, breakLine: true } },
    { text: "Foundation for yield estimation and phenotyping",options: { bullet: true } },
  ], { x: 0.4, y: 1.38, w: 4.8, h: 1.8, fontSize: 13, fontFace: "Calibri", color: C.darkGray });

  // challenges card
  s.addShape(pres.shapes.RECTANGLE, { x: 5.4, y: 0.9, w: 4.3, h: 3.3, fill: { color: C.white }, line: { color: C.lightGray, width: 0.5 }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 5.4, y: 0.9, w: 4.3, h: 0.4, fill: { color: C.medGreen }, line: { color: C.medGreen } });
  s.addText("Key Challenges", { x: 5.4, y: 0.9, w: 4.3, h: 0.4, fontSize: 13, fontFace: "Calibri", bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
  s.addText([
    { text: "Varying illumination & cast shadows",         options: { bullet: true, breakLine: true } },
    { text: "Soil and plant colours can be similar",       options: { bullet: true, breakLine: true } },
    { text: "Seasonal appearance changes (Feb – May)",     options: { bullet: true, breakLine: true } },
    { text: "Overlapping stems and partial occlusions",    options: { bullet: true } },
  ], { x: 5.55, y: 1.38, w: 4.0, h: 2.6, fontSize: 12, fontFace: "Calibri", color: C.darkGray });

  // task definition banner
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 4.15, w: 9.2, h: 0.78, fill: { color: C.lightGreen }, line: { color: C.bright, width: 1 } });
  s.addText("Task:  Given a 350×350 RGB wheat field image → output a binary mask  (plant = 1,  soil = 0)", {
    x: 0.6, y: 4.15, w: 8.8, h: 0.78,
    fontSize: 14, fontFace: "Calibri", bold: true, color: C.darkGreen, valign: "middle", margin: 0,
  });
}

// ── SLIDE 4: DATASET ──────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeader(s, "DATASET: EWS (Eschikon Wheat Segmentation)", C.darkGreen, 17);

  // stat boxes
  const stats = [
    ["190",          "Total Images"],
    ["350 × 350",    "Pixels (RGB)"],
    ["142 / 24 / 24","Train / Val / Test"],
    ["Binary",       "Plant vs Soil Masks"],
  ];
  stats.forEach(([val, lbl], i) => {
    const x = 0.3 + i * 2.4;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 0.88, w: 2.2, h: 1.3, fill: { color: C.darkGreen }, line: { color: C.darkGreen }, shadow: makeShadow() });
    s.addText(val, { x, y: 0.88, w: 2.2, h: 0.82, fontSize: 22, fontFace: "Calibri", bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText(lbl, { x, y: 1.65, w: 2.2, h: 0.48, fontSize: 11, fontFace: "Calibri", color: C.pale, align: "center", margin: 0 });
  });

  s.addText("Dataset Properties", { x: 0.4, y: 2.38, w: 5.8, h: 0.38, fontSize: 14, fontFace: "Calibri", bold: true, color: C.darkGreen, margin: 0 });
  s.addText([
    { text: "Captured across multiple months (Feb–May 2017), Eschikon field station, Switzerland", options: { bullet: true, breakLine: true } },
    { text: "Diverse illumination: early morning, midday, overcast, shadows",                     options: { bullet: true, breakLine: true } },
    { text: "Manual binary annotation: wheat plant (foreground) vs soil/ground (background)",      options: { bullet: true, breakLine: true } },
    { text: "Official train/val/test split — never mixed to prevent data leakage",                 options: { bullet: true } },
  ], { x: 0.4, y: 2.82, w: 5.8, h: 2.4, fontSize: 12, fontFace: "Calibri", color: C.darkGray, paraSpaceAfter: 4 });

  // sample image placeholders
  [[6.4, 2.38], [7.95, 2.38], [6.4, 3.75], [7.95, 3.75]].forEach(([x, y], i) => {
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 1.35, h: 1.18, fill: { color: C.medGreen }, line: { color: C.bright, width: 0.5 } });
    s.addText(`Sample\n${i + 1}`, { x, y, w: 1.35, h: 1.18, fontSize: 10, fontFace: "Calibri", color: C.white, align: "center", valign: "middle" });
  });
  s.addText("Replace with actual sample images from outputs/", {
    x: 6.2, y: 5.1, w: 3.6, h: 0.3, fontSize: 8, fontFace: "Calibri", color: C.midGray, align: "center", italic: true, margin: 0,
  });
}

// ── SLIDE 5: LITERATURE REVIEW ────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeader(s, "LITERATURE REVIEW", C.darkGreen, 20);

  const cats = [
    { title: "Classical Methods",    bg: "52B788", items: ["Watershed algorithm (marker-based)", "GrabCut — iterative graph-cut refinement", "Vegetation indices: ExG, ExR, ExGR"],           ref: "OpenCV · ICCV 2004" },
    { title: "Machine Learning",     bg: "2D6A4F", items: ["Handcrafted feature descriptors",       "Random Forest pixel classifier",             "Colour spaces: RGB, HSV, chromaticity"],        ref: "scikit-learn" },
    { title: "Deep Learning",        bg: "1B4332", items: ["U-Net encoder-decoder architecture",    "Dice + BCE segmentation loss",               "Data augmentation & dropout regularisation"],   ref: "Ronneberger et al. 2015" },
    { title: "Crop-Specific Work",   bg: "A07000", items: ["EWS dataset (Zenkl et al. 2022)",        "DepthCropSeg++ (Zhang et al. 2026)",          "Depth-informed pseudo-label segmentation"],    ref: "Frontiers Plant Science" },
  ];

  cats.forEach(({ title, bg, items, ref }, i) => {
    const x = 0.3 + (i % 2) * 4.85, y = 0.9 + Math.floor(i / 2) * 2.28;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 4.5, h: 2.1, fill: { color: C.white }, line: { color: C.lightGray, width: 0.5 }, shadow: makeShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 4.5, h: 0.38, fill: { color: bg }, line: { color: bg } });
    s.addText(title, { x: x + 0.1, y, w: 4.3, h: 0.38, fontSize: 13, fontFace: "Calibri", bold: true, color: C.white, valign: "middle", margin: 0 });
    s.addText(items.map((it, j) => ({ text: it, options: { bullet: true, breakLine: j < items.length - 1 } })),
      { x: x + 0.1, y: y + 0.45, w: 4.3, h: 1.3, fontSize: 11, fontFace: "Calibri", color: C.darkGray });
    s.addText(ref, { x: x + 0.1, y: y + 1.83, w: 4.2, h: 0.22, fontSize: 9, fontFace: "Calibri", color: bg, italic: true, margin: 0 });
  });
}

// ── SLIDE 6: METHOD 1 ─────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeader(s, "METHOD 1: Watershed + GrabCut  (Unsupervised)");

  s.addText("Core Idea", { x: 0.4, y: 0.9, w: 5.3, h: 0.38, fontSize: 14, fontFace: "Calibri", bold: true, color: C.darkGreen, margin: 0 });
  s.addText("Exploit the fact that wheat is greener than soil.\nCompute a per-pixel vegetation score → seed-based Watershed → GrabCut refinement.", {
    x: 0.4, y: 1.32, w: 5.3, h: 0.9, fontSize: 12, fontFace: "Calibri", color: C.darkGray,
  });

  // formula card
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 2.3, w: 5.3, h: 1.55, fill: { color: C.lightGreen }, line: { color: C.bright, width: 1 } });
  s.addText("Vegetation Score Formulas", { x: 0.55, y: 2.35, w: 5.0, h: 0.35, fontSize: 12, fontFace: "Calibri", bold: true, color: C.darkGreen, margin: 0 });
  s.addText([
    { text: "Watershed:  ", options: { bold: true, breakLine: false } },
    { text: "S = 1.7·ExG + 0.9·GreenDom + 0.4·Sat − 0.15·|∇|", options: { breakLine: true } },
    { text: "GrabCut:      ", options: { bold: true, breakLine: false } },
    { text: "S = 1.5·ExG + 0.9·GreenDom + 0.35·Sat", options: {} },
  ], { x: 0.55, y: 2.75, w: 5.0, h: 0.9, fontSize: 11, fontFace: "Calibri", color: C.darkGreen });

  s.addText("No training data used — validation set for parameter tuning only.", {
    x: 0.4, y: 3.98, w: 5.3, h: 0.35, fontSize: 11, fontFace: "Calibri", color: C.midGray, italic: true, margin: 0,
  });

  // pipeline steps (right column)
  s.addText("Pipeline", { x: 6.0, y: 0.9, w: 3.7, h: 0.38, fontSize: 14, fontFace: "Calibri", bold: true, color: C.darkGreen, margin: 0 });
  const steps = [
    "Compute ExG & vegetation score map",
    "Build foreground / background seed masks",
    "Run Watershed segmentation",
    "Refine boundary with GrabCut (5 iters)",
    "Morphological post-processing",
  ];
  steps.forEach((step, i) => {
    const sy = 1.38 + i * 0.74;
    s.addShape(pres.shapes.OVAL, { x: 6.0, y: sy, w: 0.44, h: 0.44, fill: { color: C.darkGreen }, line: { color: C.darkGreen } });
    s.addText(String(i + 1), { x: 6.0, y: sy, w: 0.44, h: 0.44, fontSize: 12, fontFace: "Calibri", bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText(step, { x: 6.55, y: sy + 0.03, w: 3.1, h: 0.38, fontSize: 11, fontFace: "Calibri", color: C.darkGray, valign: "middle", margin: 0 });
    if (i < steps.length - 1)
      s.addShape(pres.shapes.LINE, { x: 6.22, y: sy + 0.44, w: 0, h: 0.3, line: { color: C.bright, width: 1.5 } });
  });
}

// ── SLIDE 7: METHOD 2 ─────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeader(s, "METHOD 2: Handcrafted Features + Random Forest");

  s.addText("26-Dimensional Feature Vector (per pixel)", {
    x: 0.4, y: 0.9, w: 5.8, h: 0.38, fontSize: 14, fontFace: "Calibri", bold: true, color: C.darkGreen, margin: 0,
  });

  const feats = [
    ["RGB values (3)",       "R, G, B channel values"],
    ["HSV values (3)",       "Hue, Saturation, Value"],
    ["Chromaticity (3)",     "Normalised r, g, b"],
    ["Local RGB mean (3)",   "9×9 window average"],
    ["Local HSV mean (3)",   "9×9 window average"],
    ["Veg. indices (3)",     "ExG, ExR, ExGR"],
    ["ExG statistics (3)",   "ExG mean, std, ExGR mean"],
    ["Greyscale stats (3)",  "Grey, local mean/std"],
    ["Gradient (2)",         "Grey gradient, ExG gradient"],
  ];
  feats.forEach(([name, desc], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.4 + col * 2.02, y = 1.38 + row * 0.72;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 1.88, h: 0.62, fill: { color: C.white }, line: { color: C.lightGray, width: 0.5 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 1.88, h: 0.2, fill: { color: C.bright }, line: { color: C.bright } });
    s.addText(name, { x: x + 0.05, y, w: 1.78, h: 0.2, fontSize: 9, fontFace: "Calibri", bold: true, color: C.white, valign: "middle", margin: 0 });
    s.addText(desc, { x: x + 0.05, y: y + 0.22, w: 1.78, h: 0.34, fontSize: 9, fontFace: "Calibri", color: C.darkGray, margin: 0 });
  });

  // RF settings card
  s.addShape(pres.shapes.RECTANGLE, { x: 6.4, y: 0.9, w: 3.3, h: 3.55, fill: { color: C.white }, line: { color: C.lightGray, width: 0.5 }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 6.4, y: 0.9, w: 3.3, h: 0.38, fill: { color: C.medGreen }, line: { color: C.medGreen } });
  s.addText("Random Forest Settings", { x: 6.4, y: 0.9, w: 3.3, h: 0.38, fontSize: 12, fontFace: "Calibri", bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });

  const rf = [
    ["n_estimators",   "250 trees"],
    ["max_depth",      "20"],
    ["class_weight",   "balanced_subsample"],
    ["threshold",      "tuned on validation set"],
    ["candidates",     "[0.35 … 0.65]  (7 values)"],
    ["random_state",   "42 (reproducible)"],
  ];
  rf.forEach(([k, v], i) => {
    const py = 1.38 + i * 0.48;
    s.addText(k + ":", { x: 6.55, y: py, w: 1.55, h: 0.38, fontSize: 11, fontFace: "Calibri", bold: true, color: C.darkGreen, valign: "middle", margin: 0 });
    s.addText(v,       { x: 8.1,  y: py, w: 1.45, h: 0.38, fontSize: 11, fontFace: "Calibri", color: C.darkGray,  valign: "middle", margin: 0 });
  });

  s.addText("Post-processing: morphological closing (2×2) + remove components < 96 px", {
    x: 0.4, y: 5.18, w: 9.2, h: 0.3, fontSize: 10, fontFace: "Calibri", color: C.midGray, italic: true, margin: 0,
  });
}

// ── SLIDE 8: METHOD 3 ─────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeader(s, "METHOD 3: Lightweight U-Net (Deep Learning)");

  s.addText("Architecture  (base_channels = 16, ≈ 480 K parameters)", {
    x: 0.4, y: 0.9, w: 5.5, h: 0.38, fontSize: 13, fontFace: "Calibri", bold: true, color: C.darkGreen, margin: 0,
  });

  // U-Net block diagram
  const enc = [
    { lbl: "Input\n3 ch",        bg: "B7E4C7" },
    { lbl: "Down 1\n16 ch",      bg: "74C69D" },
    { lbl: "Down 2\n32 ch",      bg: "52B788" },
    { lbl: "Down 3\n64 ch",      bg: "40916C" },
    { lbl: "Bottle\n128 ch",     bg: "1B4332" },
  ];
  const encTC = ["1A1A1A", "1A1A1A", "FFFFFF", "FFFFFF", "FFFFFF"];

  const bw = [0.85, 0.95, 0.95, 0.95, 1.1];
  let ex = 0.4;
  enc.forEach(({ lbl, bg }, i) => {
    const bh = 0.48 + i * 0.07;
    const by = 1.55 - i * 0.035;
    s.addShape(pres.shapes.RECTANGLE, { x: ex, y: by, w: bw[i], h: bh, fill: { color: bg }, line: { color: C.medGreen, width: 0.5 } });
    s.addText(lbl, { x: ex, y: by, w: bw[i], h: bh, fontSize: 8, fontFace: "Calibri", color: encTC[i], align: "center", valign: "middle" });
    if (i < enc.length - 1) {
      s.addShape(pres.shapes.LINE, { x: ex + bw[i], y: by + bh / 2, w: 0.15, h: 0, line: { color: C.darkGreen, width: 1.5 } });
    }
    ex += bw[i] + 0.15;
  });

  // decoder (reverse)
  const dec = [
    { lbl: "Up 3\n64 ch",  bg: "40916C" },
    { lbl: "Up 2\n32 ch",  bg: "52B788" },
    { lbl: "Up 1\n16 ch",  bg: "74C69D" },
    { lbl: "Output\n1 ch", bg: "B7E4C7" },
  ];
  const decTC = ["FFFFFF", "FFFFFF", "1A1A1A", "1A1A1A"];
  const decW  = [0.95, 0.95, 0.95, 0.85];
  // positions matching encoder (right-to-left)
  const decX  = [4.35, 3.25, 2.15, 0.4];

  dec.forEach(({ lbl, bg }, i) => {
    const bh = 0.48 + (3 - i) * 0.07;
    const by = 2.65 + i * 0.035;
    const x = decX[i];
    s.addShape(pres.shapes.RECTANGLE, { x, y: by, w: decW[i], h: bh, fill: { color: bg }, line: { color: C.medGreen, width: 0.5 } });
    s.addText(lbl, { x, y: by, w: decW[i], h: bh, fontSize: 8, fontFace: "Calibri", color: decTC[i], align: "center", valign: "middle" });
    if (i < dec.length - 1) {
      const nextX = decX[i + 1] + decW[i + 1];
      s.addShape(pres.shapes.LINE, { x: nextX, y: by + bh / 2, w: x - nextX, h: 0, line: { color: C.darkGreen, width: 1.5 } });
    }
  });

  s.addText("← skip connections", { x: 1.2, y: 2.28, w: 3.5, h: 0.28, fontSize: 9, fontFace: "Calibri", color: C.midGray, italic: true, margin: 0 });

  // training settings card
  s.addShape(pres.shapes.RECTANGLE, { x: 6.5, y: 0.9, w: 3.2, h: 4.1, fill: { color: C.white }, line: { color: C.lightGray, width: 0.5 }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 6.5, y: 0.9, w: 3.2, h: 0.38, fill: { color: C.medGreen }, line: { color: C.medGreen } });
  s.addText("Training Settings", { x: 6.5, y: 0.9, w: 3.2, h: 0.38, fontSize: 12, fontFace: "Calibri", bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });

  const m3 = [
    ["Loss",          "Dice + BCE"],
    ["Optimizer",     "Adam"],
    ["LR",            "0.001"],
    ["Epochs",        "20"],
    ["Batch size",    "4"],
    ["Channels",      "16 (base)"],
    ["Threshold",     "tuned on val set"],
    ["Augmentation",  "Flip + colour jitter"],
  ];
  m3.forEach(([k, v], i) => {
    const py = 1.38 + i * 0.44;
    s.addText(k + ":", { x: 6.65, y: py, w: 1.3,  h: 0.38, fontSize: 10, fontFace: "Calibri", bold: true, color: C.darkGreen, valign: "middle", margin: 0 });
    s.addText(v,       { x: 7.95, y: py, w: 1.6,  h: 0.38, fontSize: 10, fontFace: "Calibri", color: C.darkGray, valign: "middle", margin: 0 });
  });

  s.addText("Post-processing: closing (2×2) + remove components < 96 px", {
    x: 0.4, y: 5.18, w: 9.2, h: 0.3, fontSize: 10, fontFace: "Calibri", color: C.midGray, italic: true, margin: 0,
  });
}

// ── SLIDE 9: M3-R IMPROVEMENT ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeader(s, "M3-R: Robustness Improvement  (Advanced Method Development)", "4A1942", 15);

  const cols = [
    {
      num: "1", title: "Problem Identified", bg: "C0392B",
      lines: [
        { t: "Robustness benchmark reveals:", bold: true },
        { t: "M3 on Low-contrast ×0.4:" },
        { t: "IoU  0.874 → 0.597", bold: true },
        { t: "ΔIoU = −0.277  (worst drop)" },
        { t: "" },
        { t: "Root cause:", bold: true },
        { t: "Colour channel activations flatten under extreme contrast compression → ExG signal collapses" },
      ],
    },
    {
      num: "2", title: "Improvement Designed", bg: "D68910",
      lines: [
        { t: "Distortion augmentation during training  (p = 0.70):", bold: true },
        { t: "• Gaussian noise  σ ∈ [10, 45]" },
        { t: "• Gaussian blur  σ ∈ [1.0, 3.5]" },
        { t: "• Brightness  × [0.35, 0.75]" },
        { t: "• Contrast  × [0.35, 0.75]" },
        { t: "" },
        { t: "Only distortion_augment: true added to config — all other hyperparameters unchanged" },
      ],
    },
    {
      num: "3", title: "Result Achieved", bg: "27AE60",
      lines: [
        { t: "Low-contrast ×0.4:", bold: true },
        { t: "M3    → 0.597" },
        { t: "M3-R → 0.762  (+0.165)", bold: true },
        { t: "" },
        { t: "Clean images:", bold: true },
        { t: "M3    → 0.874" },
        { t: "M3-R → 0.861  (−0.013)" },
        { t: "" },
        { t: "Acceptable accuracy/robustness trade-off" },
      ],
    },
  ];

  cols.forEach(({ num, title, bg, lines }, i) => {
    const x = 0.3 + i * 3.25;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 0.9, w: 3.1, h: 4.55, fill: { color: C.white }, line: { color: C.lightGray, width: 0.5 }, shadow: makeShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 0.9, w: 3.1, h: 0.42, fill: { color: bg }, line: { color: bg } });
    s.addShape(pres.shapes.OVAL, { x: x + 0.08, y: 0.97, w: 0.28, h: 0.28, fill: { color: C.white }, line: { color: C.white } });
    s.addText(num, { x: x + 0.08, y: 0.97, w: 0.28, h: 0.28, fontSize: 10, fontFace: "Calibri", bold: true, color: bg, align: "center", valign: "middle", margin: 0 });
    s.addText(title, { x: x + 0.42, y: 0.9, w: 2.55, h: 0.42, fontSize: 12, fontFace: "Calibri", bold: true, color: C.white, valign: "middle", margin: 0 });
    s.addText(
      lines.map((l, j) => ({ text: l.t, options: { bold: !!l.bold, breakLine: j < lines.length - 1 } })),
      { x: x + 0.12, y: 1.4, w: 2.85, h: 3.9, fontSize: 11, fontFace: "Calibri", color: C.darkGray, paraSpaceAfter: 2 }
    );
  });
}

// ── SLIDE 10: EXPERIMENTAL SETUP ─────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeader(s, "EXPERIMENTAL SETUP", C.darkGreen, 20);

  s.addText("Evaluation Metrics", { x: 0.4, y: 0.9, w: 4.5, h: 0.38, fontSize: 14, fontFace: "Calibri", bold: true, color: C.darkGreen, margin: 0 });
  const metrics = [
    ["IoU",        "TP / (TP+FP+FN)",        "Primary metric"],
    ["F1 Score",   "2·Precision·Recall / (P+R)", "Harmonic mean"],
    ["Precision",  "TP / (TP+FP)",           "False alarm rate"],
    ["Recall",     "TP / (TP+FN)",           "Detection rate"],
    ["Pixel Acc.", "(TP+TN) / total",         "Overall accuracy"],
  ];
  metrics.forEach(([name, formula, note], i) => {
    const py = 1.38 + i * 0.57;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: py, w: 1.05, h: 0.44, fill: { color: C.darkGreen }, line: { color: C.darkGreen } });
    s.addText(name, { x: 0.4, y: py, w: 1.05, h: 0.44, fontSize: 11, fontFace: "Calibri", bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText(formula, { x: 1.55, y: py, w: 2.0, h: 0.44, fontSize: 10, fontFace: "Calibri", color: C.darkGray, valign: "middle", italic: true, margin: 0 });
    s.addText(note,    { x: 3.6,  y: py, w: 1.3, h: 0.44, fontSize: 10, fontFace: "Calibri", color: C.midGray,   valign: "middle", margin: 0 });
  });

  // experiments card
  s.addShape(pres.shapes.RECTANGLE, { x: 5.3, y: 0.9, w: 4.4, h: 4.15, fill: { color: C.white }, line: { color: C.lightGray, width: 0.5 }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 5.3, y: 0.9, w: 4.4, h: 0.38, fill: { color: C.medGreen }, line: { color: C.medGreen } });
  s.addText("Three Experiments", { x: 5.3, y: 0.9, w: 4.4, h: 0.38, fontSize: 13, fontFace: "Calibri", bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });

  const exps = [
    { num: "1", title: "Main Comparison",       desc: "Train all 3 methods on full training set; evaluate on test set; report 5 metrics + train/infer time." },
    { num: "2", title: "Robustness Benchmark",  desc: "Train once on clean data; test under 9 distortion conditions; compare M3 vs M3-R." },
    { num: "3", title: "Data Reduction",        desc: "Train at 25%/50%/75%/100% of training data; evaluate test IoU; M1 flat baseline." },
  ];
  exps.forEach(({ num, title, desc }, i) => {
    const py = 1.4 + i * 1.2;
    s.addShape(pres.shapes.OVAL, { x: 5.45, y: py, w: 0.44, h: 0.44, fill: { color: C.darkGreen }, line: { color: C.darkGreen } });
    s.addText(num, { x: 5.45, y: py, w: 0.44, h: 0.44, fontSize: 14, fontFace: "Calibri", bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText(title, { x: 6.0, y: py,        w: 3.5, h: 0.4, fontSize: 12, fontFace: "Calibri", bold: true, color: C.darkGreen, margin: 0 });
    s.addText(desc,  { x: 6.0, y: py + 0.43, w: 3.5, h: 0.65, fontSize: 10, fontFace: "Calibri", color: C.darkGray });
  });
}

// ── SLIDE 11: MAIN RESULTS ────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeader(s, "RESULTS: Method Comparison", C.darkGreen, 20);

  s.addChart(pres.charts.BAR, [{
    name: "IoU",
    labels: ["Method 1\n(Watershed)", "Method 2\n(Random Forest)", "Method 3\n(U-Net)"],
    values: [0.415, 0.850, 0.874],
  }], {
    x: 0.3, y: 0.85, w: 5.0, h: 3.35,
    barDir: "col",
    chartColors: ["74C69D", "2D6A4F", "1B4332"],
    chartArea: { fill: { color: "FFFFFF" }, roundedCorners: false },
    catAxisLabelColor: "444444", valAxisLabelColor: "444444",
    valAxisMinVal: 0, valAxisMaxVal: 1.0,
    valGridLine: { color: "E2E8F0", size: 0.5 }, catGridLine: { style: "none" },
    showValue: true, dataLabelColor: "FFFFFF", dataLabelFontSize: 13, dataLabelFontBold: true,
    showLegend: false,
    showTitle: true, title: "IoU Score", titleFontSize: 13, titleColor: "1E3A2F",
  });

  // table
  const tRows = [
    [
      { text: "Method",    options: { bold: true, fill: { color: "1E3A2F" }, color: "FFFFFF" } },
      { text: "IoU",       options: { bold: true, fill: { color: "1E3A2F" }, color: "FFFFFF" } },
      { text: "F1",        options: { bold: true, fill: { color: "1E3A2F" }, color: "FFFFFF" } },
      { text: "Precision", options: { bold: true, fill: { color: "1E3A2F" }, color: "FFFFFF" } },
      { text: "Recall",    options: { bold: true, fill: { color: "1E3A2F" }, color: "FFFFFF" } },
      { text: "Train (s)", options: { bold: true, fill: { color: "1E3A2F" }, color: "FFFFFF" } },
    ],
    ["M1 Watershed",     "0.415", "0.553", "0.574", "0.585", "34"],
    [
      { text: "M2 Rand. Forest", options: { fill: { color: "EBF5EB" } } },
      { text: "0.850", options: { fill: { color: "EBF5EB" } } },
      { text: "0.916", options: { fill: { color: "EBF5EB" } } },
      { text: "0.915", options: { fill: { color: "EBF5EB" } } },
      { text: "0.926", options: { fill: { color: "EBF5EB" } } },
      { text: "297",   options: { fill: { color: "EBF5EB" } } },
    ],
    [
      { text: "M3 U-Net ★",  options: { bold: true, fill: { color: "D5F5E3" } } },
      { text: "0.874", options: { bold: true, fill: { color: "D5F5E3" } } },
      { text: "0.931", options: { bold: true, fill: { color: "D5F5E3" } } },
      { text: "0.922", options: { bold: true, fill: { color: "D5F5E3" } } },
      { text: "0.941", options: { bold: true, fill: { color: "D5F5E3" } } },
      { text: "136",   options: { bold: true, fill: { color: "D5F5E3" } } },
    ],
  ];
  s.addTable(tRows, {
    x: 0.3, y: 4.3, w: 9.4, h: 1.12,
    fontSize: 11, fontFace: "Calibri", color: "333333",
    border: { pt: 0.5, color: "CCCCCC" },
    align: "center", valign: "middle",
    colW: [2.3, 1.0, 0.9, 1.2, 1.0, 1.6],
  });

  // key findings
  s.addShape(pres.shapes.RECTANGLE, { x: 5.5, y: 0.85, w: 4.2, h: 3.35, fill: { color: C.white }, line: { color: C.lightGray, width: 0.5 }, shadow: makeShadow() });
  s.addText("Key Findings", { x: 5.65, y: 1.0, w: 3.9, h: 0.38, fontSize: 13, fontFace: "Calibri", bold: true, color: C.darkGreen, margin: 0 });
  s.addText([
    { text: "M3 (U-Net) best IoU = 0.874, outperforms M1 by +0.459", options: { bullet: true, breakLine: true } },
    { text: "M2 (RF) competitive at 0.850 — much simpler architecture", options: { bullet: true, breakLine: true } },
    { text: "M1 limited at 0.415 — colour heuristics fail on diverse conditions", options: { bullet: true, breakLine: true } },
    { text: "M3 trains faster than M2 (136 s vs 297 s)",                          options: { bullet: true } },
  ], { x: 5.65, y: 1.48, w: 3.85, h: 2.55, fontSize: 11, fontFace: "Calibri", color: C.darkGray, paraSpaceAfter: 5 });
}

// ── SLIDE 12: ROBUSTNESS ─────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeader(s, "RESULTS: Robustness Benchmark", C.darkGreen, 20);

  const lbls = ["Clean", "Noise\nσ=15", "Noise\nσ=40", "Blur\nσ=1.5", "Blur\nσ=3.0", "Dark\n×0.7", "Dark\n×0.4", "Lo-Con\n×0.7", "Lo-Con\n×0.4"];
  s.addChart(pres.charts.LINE, [
    { name: "M1 Watershed",  labels: lbls, values: [0.415, 0.474, 0.542, 0.399, 0.389, 0.424, 0.448, 0.417, 0.424] },
    { name: "M2 Rand.Forest",labels: lbls, values: [0.850, 0.733, 0.672, 0.838, 0.798, 0.814, 0.723, 0.820, 0.648] },
    { name: "M3 U-Net",      labels: lbls, values: [0.874, 0.831, 0.728, 0.864, 0.815, 0.844, 0.740, 0.831, 0.597] },
    { name: "M3-R (Robust)", labels: lbls, values: [0.861, 0.838, 0.772, 0.855, 0.833, 0.806, 0.697, 0.844, 0.762] },
  ], {
    x: 0.3, y: 0.85, w: 9.4, h: 4.0,
    chartColors: ["95D5B2", "2D6A4F", "1B4332", "E76F51"],
    lineSize: 2.5,
    chartArea: { fill: { color: "FFFFFF" }, roundedCorners: false },
    catAxisLabelColor: "444444", valAxisLabelColor: "444444",
    valAxisMinVal: 0, valAxisMaxVal: 1.0,
    valGridLine: { color: "E2E8F0", size: 0.5 }, catGridLine: { style: "none" },
    showLegend: true, legendPos: "r", legendFontSize: 10,
  });

  s.addText("M3 drops 0.874→0.597 on low-contrast ×0.4  |  M3-R (orange) trained with distortion augmentation recovers to 0.762  (+0.165)", {
    x: 0.3, y: 5.0, w: 9.4, h: 0.42, fontSize: 10, fontFace: "Calibri", color: C.darkGray, align: "center", italic: true, margin: 0,
  });
}

// ── SLIDE 13: DATA REDUCTION ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeader(s, "RESULTS: Training Data Reduction", C.darkGreen, 20);

  const fracLbls = ["25%\n(35 imgs)", "50%\n(71 imgs)", "75%\n(106 imgs)", "100%\n(142 imgs)"];
  s.addChart(pres.charts.LINE, [
    { name: "M1 Watershed (baseline)", labels: fracLbls, values: [0.415, 0.415, 0.415, 0.415] },
    { name: "M2 Random Forest",        labels: fracLbls, values: [0.848, 0.826, 0.846, 0.850] },
    { name: "M3 U-Net",                labels: fracLbls, values: [0.852, 0.867, 0.869, 0.874] },
  ], {
    x: 0.3, y: 0.85, w: 5.9, h: 4.0,
    chartColors: ["95D5B2", "2D6A4F", "1B4332"],
    lineSize: 2.5,
    chartArea: { fill: { color: "FFFFFF" }, roundedCorners: false },
    catAxisLabelColor: "444444", valAxisLabelColor: "444444",
    valAxisMinVal: 0.3, valAxisMaxVal: 1.0,
    valGridLine: { color: "E2E8F0", size: 0.5 }, catGridLine: { style: "none" },
    showLegend: true, legendPos: "b", legendFontSize: 10,
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 6.4, y: 0.85, w: 3.3, h: 4.0, fill: { color: C.white }, line: { color: C.lightGray, width: 0.5 }, shadow: makeShadow() });
  s.addShape(pres.shapes.RECTANGLE, { x: 6.4, y: 0.85, w: 3.3, h: 0.38, fill: { color: C.medGreen }, line: { color: C.medGreen } });
  s.addText("Key Observations", { x: 6.4, y: 0.85, w: 3.3, h: 0.38, fontSize: 12, fontFace: "Calibri", bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
  s.addText([
    { text: "M1 flat at 0.415 — unsupervised, ignores training data", options: { bullet: true, breakLine: true } },
    { text: "M2 at 25% (35 imgs) already reaches 0.848 ≈ full-data 0.850 — highly sample-efficient", options: { bullet: true, breakLine: true } },
    { text: "M3 improves steadily: 0.852 → 0.874 (+0.022)", options: { bullet: true, breakLine: true } },
    { text: "Diminishing returns beyond 50% for both supervised methods", options: { bullet: true, breakLine: true } },
    { text: "Random seed = 42 ensures reproducibility", options: { bullet: true } },
  ], { x: 6.5, y: 1.3, w: 3.1, h: 3.4, fontSize: 10, fontFace: "Calibri", color: C.darkGray, paraSpaceAfter: 5 });

  s.addText("M2 generalises well from limited labelled data; M3 benefits from full data but the gain is modest on this 142-image dataset.", {
    x: 0.3, y: 5.0, w: 9.4, h: 0.42, fontSize: 10, fontFace: "Calibri", color: C.darkGray, align: "center", italic: true, margin: 0,
  });
}

// ── SLIDE 14: DISCUSSION ──────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.cream };
  addHeader(s, "DISCUSSION", C.darkGreen, 20);

  const blocks = [
    { title: "Why M3 outperforms M2?",         color: "1B4332",
      points: ["U-Net learns spatial context across entire image, not per-pixel features", "Skip connections capture both local texture and global structure", "End-to-end optimisation targets boundary quality directly"] },
    { title: "Why M1 underperforms?",           color: "74C69D",
      points: ["Vegetation score assumes consistent colour — fails under shadows / lighting change", "GrabCut requires accurate seed initialisation; propagates seed errors", "No learning from data — cannot adapt to dataset-specific appearance"] },
    { title: "Why M2 is surprisingly strong?",  color: "2D6A4F",
      points: ["26-dim features span colour spaces, local statistics, vegetation indices", "Random subspace selection makes RF robust to irrelevant features", "Only 35 images needed to reach 0.848 — very sample-efficient"] },
    { title: "M3-R robustness trade-off",       color: "D35400",
      points: ["Distortion augmentation closes the 0.277 contrast-gap to 0.112  (+0.165 IoU)", "Clean performance drops only −0.013 — acceptable trade-off", "Simple augmentation strategy effective for distribution shift"] },
  ];

  blocks.forEach(({ title, color, points }, i) => {
    const x = 0.3 + (i % 2) * 4.85, y = 0.9 + Math.floor(i / 2) * 2.3;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 4.5, h: 2.15, fill: { color: C.white }, line: { color: C.lightGray, width: 0.5 }, shadow: makeShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.12, h: 2.15, fill: { color }, line: { color } });
    s.addText(title, { x: x + 0.22, y: y + 0.1, w: 4.1, h: 0.38, fontSize: 12, fontFace: "Calibri", bold: true, color, margin: 0 });
    s.addText(points.map((p, j) => ({ text: p, options: { bullet: true, breakLine: j < points.length - 1 } })),
      { x: x + 0.22, y: y + 0.54, w: 4.1, h: 1.5, fontSize: 10, fontFace: "Calibri", color: C.darkGray, paraSpaceAfter: 3 });
  });
}

// ── SLIDE 15: CONCLUSION ──────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.darkGreen };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0,     w: 10, h: 0.06, fill: { color: C.bright }, line: { color: C.bright } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.565, w: 10, h: 0.06, fill: { color: C.bright }, line: { color: C.bright } });

  s.addText("CONCLUSION", {
    x: 0.5, y: 0.2, w: 9, h: 0.72,
    fontSize: 34, fontFace: "Calibri", bold: true, color: C.white, align: "left", margin: 0,
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 1.05, w: 5.6, h: 3.7, fill: { color: C.medGreen }, line: { color: C.bright, width: 0.5 } });
  s.addText("Summary", { x: 0.5, y: 1.1, w: 5.4, h: 0.36, fontSize: 14, fontFace: "Calibri", bold: true, color: C.white, margin: 0 });
  s.addText([
    { text: "Three meaningfully different methods: classical (M1), ML (M2), DL (M3)", options: { bullet: true, breakLine: true } },
    { text: "M3 U-Net achieves best test IoU = 0.874",                                options: { bullet: true, breakLine: true } },
    { text: "Identified robustness weakness: M3 IoU drops to 0.597 under low contrast",options: { bullet: true, breakLine: true } },
    { text: "Designed M3-R with distortion augmentation → restored to 0.762 (+0.165)", options: { bullet: true, breakLine: true } },
    { text: "Data reduction: M2 sample-efficient; M3 benefits from full 142-image set", options: { bullet: true } },
  ], { x: 0.55, y: 1.52, w: 5.3, h: 3.0, fontSize: 12, fontFace: "Calibri", color: C.white, paraSpaceAfter: 5 });

  s.addShape(pres.shapes.RECTANGLE, { x: 6.2, y: 1.05, w: 3.5, h: 3.7, fill: { color: "2D4A3E" }, line: { color: C.bright, width: 0.5 } });
  s.addText("Future Work", { x: 6.3, y: 1.1, w: 3.3, h: 0.36, fontSize: 14, fontFace: "Calibri", bold: true, color: C.white, margin: 0 });
  s.addText([
    { text: "Larger backbone (ResNet encoder U-Net)",         options: { bullet: true, breakLine: true } },
    { text: "Semi-supervised learning for unlabelled data",   options: { bullet: true, breakLine: true } },
    { text: "Test-time augmentation for robustness",          options: { bullet: true, breakLine: true } },
    { text: "Multi-season temporal modelling",                options: { bullet: true, breakLine: true } },
    { text: "Foundation model adaptation (SAM, DepthCropSeg++)", options: { bullet: true } },
  ], { x: 6.3, y: 1.52, w: 3.3, h: 3.0, fontSize: 11, fontFace: "Calibri", color: C.pale, paraSpaceAfter: 5 });

  s.addText("COMP9517 Computer Vision  ·  Group Project 2026 T1  ·  UNSW", {
    x: 0.5, y: 4.88, w: 9, h: 0.38, fontSize: 12, fontFace: "Calibri", color: C.accent, align: "center", margin: 0,
  });
}

// ── SLIDE 16: DEMO ────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: "1A1A2E" };

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.75, fill: { color: C.bright }, line: { color: C.bright } });
  s.addText("DEMO", {
    x: 0.4, y: 0, w: 9, h: 0.75,
    fontSize: 28, fontFace: "Calibri", bold: true, color: "1A1A2E", valign: "middle", margin: 0,
  });

  const cmds = [
    ["# 1 — Install", "pip install -e .", "0F2419"],
    ["# 2 — Run Method 3 (best)", "segment-image --config configs/method_3_ews.json", "0F1933"],
    ["# 3 — Robustness benchmark", "PYTHONPATH=src python scripts/run_robustness.py", "33190F"],
    ["# 4 — Data reduction", "PYTHONPATH=src python scripts/run_data_reduction.py", "0F2419"],
  ];
  cmds.forEach(([comment, cmd, bg], i) => {
    const y = 0.9 + i * 1.05;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y, w: 5.7, h: 0.88, fill: { color: bg }, line: { color: "333333" } });
    s.addText(comment, { x: 0.6, y: y + 0.05, w: 5.3, h: 0.25, fontSize: 10, fontFace: "Consolas", color: "666666", margin: 0 });
    s.addText("$ " + cmd, { x: 0.6, y: y + 0.35, w: 5.3, h: 0.45, fontSize: 10, fontFace: "Consolas", bold: true, color: "7EC8A4", margin: 0 });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 6.3, y: 0.9, w: 3.4, h: 4.1, fill: { color: "141414" }, line: { color: "444444" } });
  s.addText("Expected Outputs", { x: 6.4, y: 0.95, w: 3.2, h: 0.35, fontSize: 12, fontFace: "Calibri", bold: true, color: C.bright, margin: 0 });

  const outs = [
    "outputs/method_3/runs/…/test/",
    "  summary.json  (IoU = 0.874)",
    "  overlay/*.png  (segmentation overlay)",
    "  panel/*.png   (qualitative panel)",
    "",
    "outputs/robustness/",
    "  summary.json  (9×4 IoU table)",
    "  method_*/robustness_results.csv",
    "",
    "results/  (pre-computed, in repo)",
    "  for report reviewer cross-check",
  ];
  s.addText(outs.map((ln, j) => ({ text: ln, options: { breakLine: j < outs.length - 1 } })), {
    x: 6.4, y: 1.38, w: 3.2, h: 3.5, fontSize: 9, fontFace: "Consolas", color: "CCCCCC",
  });

  s.addText("github.com/letsnooze/COMP9517_GroupProj", {
    x: 0.4, y: 5.12, w: 9, h: 0.35, fontSize: 11, fontFace: "Calibri", color: C.bright, align: "center", margin: 0,
  });
}

// ── Write ─────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: "reports/COMP9517_Presentation.pptx" })
  .then(() => console.log("✅  Saved: reports/COMP9517_Presentation.pptx"))
  .catch(err => { console.error("❌  Error:", err); process.exit(1); });
