/**
 * COMP9517 Group Project — IEEE A4 conference format, 7-8 pages.
 * Run:  node scripts/generate_report.js
 * Out:  reports/COMP9517_Group_Project_Report.docx
 */
"use strict";

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType,
  SectionType, PageNumber, Footer,
} = require("docx");
const fs   = require("fs");
const path = require("path");

// ── Page geometry (IEEE A4 template) ─────────────────────────────────────────
const PW = 11906, PH = 16838;
const ML = 893, MR = 893;
const MT1 = 540, MT2 = 1080, MB = 1440;
const MH = 720, MF = 720;
const CW   = PW - ML - MR;
const CGAP = 360;
const COL_W = Math.floor((CW - CGAP) / 2);

// ── Typography ────────────────────────────────────────────────────────────────
const FONT   = "Times New Roman";
const SZ_TTL = 48;
const SZ_AUT = 22;
const SZ_AFF = 20;
const SZ_BOD = 20;
const SZ_ABS = 18;
const SZ_TBL = 16;

function r(text, { sz=SZ_BOD, bold=false, italic=false, allCaps=false } = {}) {
  return new TextRun({ text, font: FONT, size: sz, bold, italic, allCaps });
}

function body(textOrRuns, { noIndent=false, before=0, after=120 } = {}) {
  const children = typeof textOrRuns === "string" ? [r(textOrRuns)] : textOrRuns;
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before, after, line: 240, lineRule: "auto" },
    indent: { firstLine: noIndent ? 0 : 288 },
    children,
  });
}

function sp(after = 120) {
  return new Paragraph({ spacing: { before:0, after }, indent:{firstLine:0}, children:[] });
}

let secIdx = 0;
const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X"];
function h1(title) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 160, after: 80 },
    indent: { firstLine: 0 },
    children: [r(`${ROMAN[secIdx++]}. ${title}`, { allCaps: true })],
  });
}

function h2(letter, title) {
  return new Paragraph({
    spacing: { before: 120, after: 60 },
    indent: { firstLine: 0 },
    children: [r(`${letter}. ${title}`, { italic: true })],
  });
}

function tblCap(num, caption) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 0 },
      indent: { firstLine: 0 },
      children: [r(`TABLE ${num}`, { allCaps: true, sz: SZ_TBL })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
      indent: { firstLine: 0 },
      children: [r(caption, { italic: true, sz: SZ_TBL })],
    }),
  ];
}

const BNone  = { style: BorderStyle.NONE,   size: 0,  color: "FFFFFF" };
const BThin  = { style: BorderStyle.SINGLE, size: 4,  color: "000000" };
const BThick = { style: BorderStyle.SINGLE, size: 12, color: "000000" };

function tblCell(text, w, { rowPos="mid", leftAlign=false, bold=false } = {}) {
  const topB = rowPos==="first" ? BThick : BNone;
  const botB = rowPos==="first" ? BThin  : rowPos==="last" ? BThick : BNone;
  return new TableCell({
    borders: { top:topB, bottom:botB, left:BNone, right:BNone },
    width: { size:w, type:WidthType.DXA },
    shading: { fill:"FFFFFF", type:ShadingType.CLEAR },
    margins: { top:40, bottom:40, left:80, right:80 },
    children: [new Paragraph({
      alignment: leftAlign ? AlignmentType.LEFT : AlignmentType.CENTER,
      spacing: { before:0, after:0, line:240 },
      indent: { firstLine:0 },
      children: [r(text, { sz:SZ_TBL, bold })],
    })],
  });
}

function makeTable(colWidths, headerCells, dataRows) {
  const makeRow = (cells, rowPos) => new TableRow({
    children: cells.map((cell, ci) => {
      const [text, left] = Array.isArray(cell) ? cell : [cell, false];
      return tblCell(text, colWidths[ci], { rowPos, leftAlign:left, bold: rowPos==="first" });
    }),
  });
  return new Table({
    width: { size:colWidths.reduce((a,b)=>a+b,0), type:WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      makeRow(headerCells, "first"),
      ...dataRows.map((row,ri) => makeRow(row, ri===dataRows.length-1?"last":"mid")),
    ],
  });
}

function scaleW(raw, total) {
  const s = total / raw.reduce((a,b)=>a+b,0);
  const w = raw.map(v => Math.round(v*s));
  w[w.length-1] += total - w.reduce((a,b)=>a+b,0);
  return w;
}

// ── TABLE I: Overall performance ──────────────────────────────────────────────
function makeTable1() {
  const w = scaleW([1280,600,600,600,680,600,680,680], COL_W);
  return makeTable(w,
    [["Method",true],"IoU","F1","Prec.","Recall","PA","Train(s)","Infer(s)"],
    [
      [["Watershed",true],"0.415","0.553","0.574","0.585","0.431","34","0.021"],
      [["Rand. Forest",true],"0.850","0.916","0.915","0.926","0.907","126","0.325"],
      [["U-Net",true],"0.874","0.931","0.922","0.941","0.923","119","0.028"],
    ]
  );
}

// ── TABLE II: Monthly IoU breakdown (all 3 methods) ───────────────────────────
function makeTable2() {
  const w = scaleW([1000,700,700,700,700], COL_W);
  return makeTable(w,
    ["Month","n","M1 IoU","M2 IoU","M3 IoU"],
    [
      ["Feb", "2","0.713","0.977","0.977"],
      ["Mar", "8","0.573","0.923","0.926"],
      ["Apr", "7","0.292","0.817","0.863"],
      ["May", "7","0.272","0.763","0.796"],
      [["All",false],"24","0.415","0.850","0.874"],
    ]
  );
}

// ── TABLE III: Robustness ─────────────────────────────────────────────────────
function makeTable3() {
  const w = scaleW([1600,700,700,700,780], COL_W);
  return makeTable(w,
    [["Distortion",true],"M1","M2","M3","M3-R"],
    [
      [["Clean",true],"0.415","0.850","0.874","0.861"],
      [["Noise \u03c3=15",true],"0.474","0.733","0.831","0.838"],
      [["Noise \u03c3=40",true],"0.541","0.672","0.728","0.772"],
      [["Blur \u03c3=1.5",true],"0.399","0.838","0.864","0.854"],
      [["Blur \u03c3=3.0",true],"0.389","0.798","0.815","0.833"],
      [["Brightness \u00d70.7",true],"0.424","0.814","0.844","0.806"],
      [["Brightness \u00d70.4",true],"0.448","0.723","0.739","0.697"],
      [["Contrast \u00d70.7",true],"0.417","0.820","0.831","0.844"],
      [["Contrast \u00d70.4",true],"0.424","0.648","0.596","0.762"],
    ]
  );
}

// ── TABLE IV: Data reduction ──────────────────────────────────────────────────
function makeTable4() {
  const w = scaleW([900,700,1091,1091,1091], COL_W);
  return makeTable(w,
    ["Fraction","N","M1 IoU","M2 IoU","M3 IoU"],
    [
      ["25%","35","0.415","0.848","0.852"],
      ["50%","71","0.415","0.826","0.867"],
      ["75%","106","0.415","0.846","0.869"],
      ["100%","142","0.415","0.850","0.874"],
    ]
  );
}

// ── TABLE V: Method 2 feature groups ─────────────────────────────────────────
function makeTable5() {
  const W = COL_W;
  const w = scaleW([1400, 500, 2980], W);
  return makeTable(w,
    [["Feature Group",true],"Dims","Description"],
    [
      [["Raw colour",true],"6","RGB values + HSV (H, S, V)"],
      [["Chromaticity",true],"3","r=R/(R+G+B), g=G/(R+G+B), b=B/(R+G+B)"],
      [["Local means",true],"6","Mean RGB and HSV in 9\u00d79 neighbourhood"],
      [["Veg. indices",true],"3","ExG=2G\u2212R\u2212B; ExR=1.4R\u2212G; ExGR=ExG\u2212ExR"],
      [["Local ExG stats",true],"2","Mean and std of ExG in 9\u00d79 window"],
      [["Greyscale",true],"3","Grey intensity, local mean, local std"],
      [["Gradients",true],"2","Sobel magnitude; ExG gradient magnitude"],
      [["Total",false],"26",""],
    ]
  );
}

// ── Shared footer ─────────────────────────────────────────────────────────────
const sharedFooter = new Footer({
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    indent: { firstLine: 0 },
    children: [
      r("COMP9517 Computer Vision \u2014 UNSW 2026 T1   |   Page ", { sz:16 }),
      new TextRun({ children:[PageNumber.CURRENT], font:FONT, size:16 }),
    ],
  })],
});

const pgSize = { size:{ width:PW, height:PH } };

// ── Build document ────────────────────────────────────────────────────────────
const doc = new Document({
  sections: [

    // ══════════════════════════════════════════════════════════════════════════
    // SECTION 1 — Title / Authors / Abstract
    // ══════════════════════════════════════════════════════════════════════════
    {
      properties: {
        page: { ...pgSize, margin:{ top:MT1, bottom:MB, left:ML, right:MR, header:MH, footer:MF } },
      },
      footers: { default: sharedFooter },
      children: [

        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before:0, after:120 },
          indent: { firstLine:0 },
          children: [r(
            "Comparative Study of Classical, Machine Learning, and Deep Learning " +
            "Methods for Wheat Crop Segmentation",
            { sz:SZ_TTL }
          )],
        }),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before:360, after:40 },
          indent: { firstLine:0 },
          children: [r("COMP9517 Group Project Team", { sz:SZ_AUT })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before:0, after:40 },
          indent: { firstLine:0 },
          children: [r("School of Computer Science and Engineering, UNSW Sydney", { sz:SZ_AFF })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before:0, after:240 },
          indent: { firstLine:0 },
          children: [r("Sydney, NSW 2052, Australia", { sz:SZ_AFF })],
        }),

        // Abstract
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before:0, after:200, line:240, lineRule:"auto" },
          indent: { firstLine:272 },
          children: [
            r("Abstract", { sz:SZ_ABS, bold:true }),
            r(
              "\u2014This paper presents a systematic comparison of three computer vision " +
              "approaches to wheat crop segmentation using the Eschikon Wheat Segmentation " +
              "(EWS) benchmark dataset, which contains 190 RGB field images (350\u00d7350 " +
              "pixels) captured across a complete growing season from February to May 2017. " +
              "The three methods represent fundamentally different paradigms: (1) a " +
              "training-free classical approach combining Excess Green vegetation indices " +
              "with Watershed segmentation; (2) a machine learning approach using a " +
              "26-dimensional handcrafted feature vector with a Random Forest classifier; " +
              "and (3) a deep learning approach using a lightweight U-Net encoder-decoder " +
              "with skip connections and Dice+BCE loss. Evaluation on the held-out test set " +
              "yields IoU scores of 0.415, 0.850, and 0.874 respectively. " +
              "In-depth analysis reveals a critical seasonal failure of the classical " +
              "method (monthly average IoU declining from 0.713 in February to 0.272 in " +
              "May as wheat changes colour from green to golden-yellow), high data " +
              "efficiency of both learning-based methods (near-peak IoU with only 35 " +
              "training images), and a targeted robustness improvement: training U-Net " +
              "with strong distortion augmentation raises IoU under extreme contrast " +
              "reduction from 0.596 to 0.762 (+0.166), demonstrating a clear " +
              "analysis\u2013improvement loop.",
              { sz:SZ_ABS }
            ),
          ],
        }),

        // Keywords
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before:0, after:120 },
          indent: { firstLine:274 },
          children: [
            r("Keywords", { sz:SZ_ABS, bold:true }),
            r(
              "\u2014wheat segmentation; image processing; random forest; U-Net; " +
              "deep learning; robustness; data efficiency; precision agriculture",
              { sz:SZ_ABS }
            ),
          ],
        }),
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    // SECTION 2 — Two-column body
    // ══════════════════════════════════════════════════════════════════════════
    {
      properties: {
        type: SectionType.CONTINUOUS,
        page: { ...pgSize, margin:{ top:MT2, bottom:MB, left:ML, right:MR, header:MH, footer:MF } },
        column: { count:2, space:CGAP, equalWidth:true },
      },
      children: [

        // ── I. INTRODUCTION ──────────────────────────────────────────────────
        h1("Introduction"),
        body(
          "Wheat is one of the world\u2019s most important staple crops, covering over " +
          "220 million hectares globally. Precision agriculture increasingly relies on " +
          "computer vision to monitor crop health, estimate biomass, detect disease, and " +
          "forecast yield. A fundamental prerequisite for these downstream tasks is " +
          "reliable pixel-level segmentation: accurately delineating wheat plants from " +
          "background soil in field imagery."
        ),
        body(
          "The challenge is deceptively difficult. Unlike controlled laboratory conditions, " +
          "field images exhibit substantial variation in illumination, shadow, plant " +
          "density, and \u2014 critically \u2014 plant appearance across the growing " +
          "season. Early-season wheat is distinctly green and easily separated from brown " +
          "soil by colour cues alone. By late spring, however, ripening wheat turns " +
          "golden-yellow, causing colour-based classical methods to fail catastrophically. " +
          "Real-world deployment also introduces image quality degradation from camera " +
          "shake, dirt on lenses, and variable lighting conditions."
        ),
        body(
          "This study addresses these challenges through a rigorous three-way comparison " +
          "of paradigms on the publicly available EWS dataset [2]. Our contributions are: " +
          "(1) implementation and comparison of Watershed and GrabCut variants for " +
          "classical segmentation with ExG-guided seed extraction; " +
          "(2) a 26-dimensional handcrafted feature pipeline with Random Forest " +
          "classification and probability-threshold tuning; " +
          "(3) a lightweight U-Net trained with Dice+BCE loss and colour augmentation; " +
          "(4) in-depth seasonal failure analysis identifying a month-by-month collapse " +
          "in classical method performance; " +
          "(5) a systematic robustness benchmark under nine distortion conditions, with " +
          "a targeted distortion-augmentation improvement that recovers the extreme-" +
          "contrast weakness of U-Net; and " +
          "(6) a training data efficiency study across four subsampling levels."
        ),

        // ── II. LITERATURE REVIEW ────────────────────────────────────────────
        h1("Literature Review"),

        h2("A", "Classical Vegetation Segmentation"),
        body(
          "Early work on plant segmentation exploited the spectral difference between " +
          "chlorophyll-rich vegetation and bare soil. The Excess Green index " +
          "ExG\u00a0=\u00a02G\u00a0\u2212\u00a0R\u00a0\u2212\u00a0B introduced by " +
          "Woebbecke et al. [4] remains a foundational feature because it is " +
          "parameter-free and produces large positive values for green vegetation. " +
          "Subsequent indices such as the Excess Red (ExR) and the combined ExGR extend " +
          "discriminability to more complex scenes."
        ),
        body(
          "Watershed segmentation [3] treats the gradient magnitude image as a " +
          "topographic surface and floods it from seed markers to find watershed lines " +
          "between regions. Marker selection is critical: poorly placed seeds lead to " +
          "over- or under-segmentation. GrabCut [5] takes a probabilistic approach, " +
          "iteratively refining foreground and background Gaussian mixture models " +
          "(GMMs) via graph cuts. Both methods benefit from vegetation-index " +
          "preprocessing to generate reliable initial seeds."
        ),

        h2("B", "Machine Learning Methods"),
        body(
          "Pixel-wise classification with handcrafted features has been widely applied " +
          "to plant and crop segmentation. The key design question is which features " +
          "capture the multi-scale appearance of vegetation reliably across growing " +
          "conditions. Colour space transformations, local statistical descriptors, " +
          "and gradient features complement raw pixel values to provide invariance to " +
          "illumination changes [2]. Random Forests [6] are a natural ensemble " +
          "classifier for this task: they handle high-dimensional correlated features, " +
          "provide calibrated class probabilities, and support threshold tuning to " +
          "optimise a target metric such as IoU."
        ),
        body(
          "The EWS benchmark paper [2] demonstrates that pixel-wise classifiers with " +
          "carefully engineered features achieve IoU above 0.80 on seasonal wheat data. " +
          "Our implementation extends this line of work with a systematic 26-dimensional " +
          "feature set and grid-searched probability threshold."
        ),

        h2("C", "Deep Learning Segmentation"),
        body(
          "Fully Convolutional Networks (FCN) [9] established the paradigm of replacing " +
          "classification heads with upsampling layers for dense prediction. U-Net [1] " +
          "introduced symmetric skip connections between encoder and decoder stages, " +
          "enabling precise localisation even with limited training data \u2014 a " +
          "property particularly valuable for agricultural datasets where annotation is " +
          "costly. Zenkl et al. [2] reported IoU values of 0.85\u20130.95 for deep " +
          "learning models on EWS. More recent work incorporates depth information [7] " +
          "or foundation models [8] to further improve robustness."
        ),
        body(
          "Data augmentation is a crucial component of deep learning training for " +
          "small agricultural datasets. Standard augmentations include geometric " +
          "transforms (flips, rotations) and photometric transforms (brightness, " +
          "contrast, noise). Training with distortion augmentation that matches the " +
          "expected test-time degradations has been shown to improve robustness " +
          "in general image classification, but its systematic effect on segmentation " +
          "metrics under specific distortion types has received less attention."
        ),

        // ── III. METHODS ─────────────────────────────────────────────────────
        h1("Methods"),

        h2("A", "Dataset and Experimental Protocol"),
        body(
          "The EWS dataset [2] contains 190 RGB images (350\u00d7350 pixels) captured " +
          "at the Eschikon field station, ETH Zurich, using a fixed overhead camera " +
          "mounted above wheat plots. Images span the complete growing season from " +
          "22 February 2017 to 17 May 2017, covering tillering, stem elongation, " +
          "heading, and ripening stages. Each image is paired with a manually annotated " +
          "binary mask (wheat pixel = 1, soil/background = 0)."
        ),
        body(
          "We adopt the canonical train/validation/test split: 142 training, " +
          "24 validation, and 24 test images. The split is provided by the dataset " +
          "authors and maintained throughout all experiments to ensure comparability. " +
          "Split disjointness is verified programmatically before each experiment " +
          "to preclude data leakage. Hyperparameters are tuned exclusively on the " +
          "validation set; the test set is reserved for final evaluation only."
        ),
        body(
          "Five evaluation metrics are computed per image and averaged across the " +
          "test set: Intersection over Union (IoU = TP\u2215(TP+FP+FN)), " +
          "F1-score (= 2\u00b7Prec\u00b7Recall\u2215(Prec+Recall)), Precision " +
          "(=TP\u2215(TP+FP)), Recall (=TP\u2215(TP+FN)), and Pixel Accuracy " +
          "(=correct pixels\u2215total pixels). Training and inference times are " +
          "measured with wall-clock timing on an Apple M-series CPU."
        ),

        h2("B", "Method 1: ExG-guided Watershed / GrabCut"),
        body(
          "Method 1 is a training-free classical pipeline. A per-pixel composite " +
          "vegetation score S aggregates four complementary cues:"
        ),
        body(
          "S\u00a0=\u00a01.7\u00b7ExG\u00a0+\u00a00.9\u00b7G\u2091\u00a0+\u00a0" +
          "0.4\u00b7Sat\u00a0\u2212\u00a00.15\u00b7|\u2207|",
          { noIndent: true }
        ),
        body(
          "where ExG is the Excess Green index, G\u2091 is normalised green dominance " +
          "(G/(R+G+B)), Sat is HSV saturation, and |\u2207| is Sobel edge magnitude " +
          "(subtracted to suppress spurious seeds at boundaries). S is smoothed with " +
          "a Gaussian blur (\u03c3\u00a0=\u00a01.0) before seed extraction."
        ),
        body(
          "Seeds are extracted by percentile thresholding: pixels above the foreground " +
          "percentile (\u03b8\u209c) are labelled definite foreground; pixels below the " +
          "background percentile (\u03b8\u2082) are definite background. The remainder " +
          "is marked unknown. Two segmentation variants share this seeding: (a) " +
          "\u2018Watershed\u2019 runs scipy watershed_ift on the gradient image; " +
          "(b) \u2018GrabCut\u2019 uses OpenCV grabCut for iterative GMM refinement. " +
          "Output masks are post-processed with morphological opening and closing, " +
          "followed by removal of connected components smaller than 96 pixels."
        ),
        body(
          "A grid search over three parameters tunes on the validation set: " +
          "\u03b8\u209c \u2208 {75, 80, 85, 90}, \u03b8\u2082 \u2208 {10, 15, 20, 25}, " +
          "and a spatial majority filter threshold \u2208 {0.45, 0.48, 0.50, 0.52}. " +
          "Best validation IoU is 0.444 (Watershed variant), which is selected for " +
          "all test-set evaluations."
        ),

        h2("C", "Method 2: Handcrafted Features + Random Forest"),
        body(
          "Method 2 trains a pixel classifier on a 26-dimensional feature vector " +
          "per pixel (Table V). Features are organised into seven groups spanning " +
          "colour, texture, vegetation indices, and gradient information, providing " +
          "multi-scale representation that complements vegetation indices with " +
          "local spatial context."
        ),
        ...tblCap("V", "Feature groups used in Method 2 (26 dimensions total)."),
        makeTable5(),
        sp(120),
        body(
          "A scikit-learn RandomForestClassifier with 250 trees and maximum depth 20 " +
          "is trained on balanced pixel samples: 4,000 randomly sampled pixels per " +
          "training image, with equal class proportions, yielding approximately 566,000 " +
          "training pixels. Balanced sampling prevents the dominant soil class from " +
          "overwhelming the classifier. A classification probability threshold is " +
          "selected from candidates {0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65} to " +
          "maximise validation IoU; the optimal threshold is 0.35, indicating that " +
          "the forest assigns relatively low confidence to wheat pixels \u2014 " +
          "consistent with the high class imbalance in late-season images. Post-" +
          "processing is identical to Method 1."
        ),

        h2("D", "Method 3: Lightweight U-Net"),
        body(
          "Method 3 uses a lightweight U-Net with base channel width 16. The encoder " +
          "consists of three DownBlocks, each comprising a double-convolution unit " +
          "(Conv2d\u2013BN\u2013ReLU\u00d72) followed by 2\u00d72 max pooling, " +
          "producing feature maps at 16, 32, and 64 channels respectively. A bottleneck " +
          "double-convolution at 128 channels captures global context. The decoder " +
          "mirrors the encoder with three UpBlocks (bilinear upsampling + skip " +
          "concatenation + double convolution). A 1\u00d71 convolutional head with " +
          "sigmoid activation produces the probability map. Total trainable parameters: " +
          "approximately 480,000."
        ),
        body(
          "Training minimises the sum of Dice loss and binary cross-entropy (BCE). " +
          "Dice loss directly optimises the IoU-related overlap score and is " +
          "insensitive to class imbalance; BCE provides stable gradient at the " +
          "pixel level. The Adam optimiser (lr\u00a0=\u00a00.001) is used with " +
          "batch size 4 for 20 epochs. The checkpoint achieving the highest " +
          "validation IoU (0.870 at epoch 20) is restored before test-set " +
          "evaluation. The decision threshold is tuned on the validation set, " +
          "yielding 0.6 (higher than default 0.5, reflecting that the network " +
          "is slightly over-confident on the positive class)."
        ),
        body(
          "Standard data augmentation is applied during training: random horizontal " +
          "and vertical flips (p\u00a0=\u00a00.5 each), brightness jitter " +
          "(\u00d7[0.9, 1.1]), contrast jitter (\u00d7[0.9, 1.1]), and Gaussian " +
          "noise (\u03c3\u00a0=\u00a03, p\u00a0=\u00a00.3). A separate robust " +
          "variant (M3-R) replaces the mild noise with a strong distortion " +
          "augmentation step described in Section IV-C."
        ),

        // ── IV. EXPERIMENTAL RESULTS ─────────────────────────────────────────
        h1("Experimental Results"),

        h2("A", "Overall Performance Comparison"),
        body(
          "Table I reports all five evaluation metrics and timing on the 24-image " +
          "test set. The two learning-based methods substantially outperform the " +
          "classical baseline across every metric."
        ),
        ...tblCap("I", "Test-set performance comparison (mean over 24 test images)."),
        makeTable1(),
        sp(120),
        body(
          "Method 1 (Watershed) achieves IoU 0.415, Precision 0.574, and Recall 0.585. " +
          "The near-equal precision and recall suggest that the ExG-based seeds " +
          "partition errors symmetrically between false positives and false negatives " +
          "rather than systematically mis-classifying one class. The low Pixel Accuracy " +
          "(0.431) is consistent with a method that partially succeeds on some images " +
          "and fails completely on others."
        ),
        body(
          "Method 2 (Random Forest) achieves IoU 0.850 and F1 0.916, with high and " +
          "near-balanced Precision (0.915) and Recall (0.926). The optimal probability " +
          "threshold of 0.35 \u2014 lower than the conventional 0.50 \u2014 suggests " +
          "that the forest\u2019s per-pixel confidence scores are systematically " +
          "under-confident for wheat, likely because late-season images dominate the " +
          "training distribution and reduce per-pixel vegetation confidence."
        ),
        body(
          "Method 3 (U-Net) achieves the highest score on all metrics: IoU 0.874, " +
          "F1 0.931, Precision 0.922, Recall 0.941, Pixel Accuracy 0.923. It also " +
          "trains slightly faster (119\u00a0s vs. 126\u00a0s) and is 11.6\u00d7 " +
          "faster at inference (0.028 vs. 0.325\u00a0s/image) compared to Random " +
          "Forest. The inference speed advantage makes U-Net more practical for " +
          "large-scale field monitoring where thousands of images must be processed."
        ),

        h2("B", "Seasonal Performance Analysis"),
        body(
          "Table II breaks down test-set performance by calendar month for all three " +
          "methods. The seasonal gradient is striking for Method 1 but is also " +
          "present, to a lesser degree, in the learning-based methods."
        ),
        ...tblCap("II", "Average IoU per month for all three methods on the test set."),
        makeTable2(),
        sp(120),
        body(
          "Method 1 collapses dramatically: average IoU falls from 0.713 (February, " +
          "n\u00a0=\u00a02) to 0.573 (March), 0.292 (April), and 0.272 (May). " +
          "The February and early-March images (green wheat shoots) are " +
          "straightforward for ExG-based segmentation; by April the chlorophyll " +
          "content drops sharply as wheat enters the ripening phase, reducing the " +
          "ExG score of wheat pixels to near-soil values. The worst individual test " +
          "image (20170505) achieves IoU\u00a0=\u00a00.086, indicating near-total " +
          "segmentation failure."
        ),
        body(
          "Methods 2 and 3 also show a seasonal decline, but it is far more gradual " +
          "and never catastrophic: Method 2 drops from 0.977 (February) to 0.763 " +
          "(May); Method 3 from 0.977 to 0.796. This decline reflects the fact that " +
          "late-season images are intrinsically harder (more complex textures, " +
          "overlapping ears, lodging effects) even for appearance-agnostic learned " +
          "representations. Critically, both methods maintain IoU above 0.68 even " +
          "on the worst May test images, compared to 0.086 for Method 1."
        ),

        h2("C", "Robustness to Image Distortions"),
        body(
          "Table III reports IoU under nine distortion conditions. M3-R is the " +
          "distortion-augmented U-Net variant trained with noise (\u03c3\u223c[10,45]), " +
          "blur (\u03c3\u223c[1.0,3.5]), and brightness/contrast factor\u223c[0.35,0.75] " +
          "applied randomly at 70% probability during training."
        ),
        ...tblCap("III", "IoU under image distortions. M3-R = U-Net with distortion augmentation."),
        makeTable3(),
        sp(120),
        body(
          "Among the clean-trained models, U-Net (M3) leads in 8 of 9 conditions. " +
          "The exception is extreme contrast reduction (\u00d70.4), where Random " +
          "Forest (0.648) outperforms U-Net (0.596) by 0.052. This reversal can be " +
          "explained architecturally: U-Net\u2019s spatial attention in the encoder " +
          "relies on contrast gradients to guide feature extraction, which collapse " +
          "under strong contrast reduction. Random Forest\u2019s global colour " +
          "statistics are less sensitive to contrast scaling because they operate on " +
          "normalised chromaticity features."
        ),
        body(
          "The distortion-augmented variant M3-R directly addresses this weakness. " +
          "Training exposure to contrast-reduced images enables the network to learn " +
          "contrast-invariant features, raising extreme-contrast IoU from 0.596 to " +
          "0.762 (\u0394+0.166). M3-R also improves over M3 on noise conditions " +
          "(+0.007 and +0.043) and strong blur (+0.018). The trade-off is a small " +
          "clean-data IoU reduction (0.874 \u2192 0.861, \u22120.013) and reduced " +
          "brightness robustness (\u22120.038 at mild, \u22120.042 at strong). " +
          "This trade-off is a well-known accuracy-robustness phenomenon: exposure " +
          "to one class of distortions can reduce performance on others unless the " +
          "augmentation distribution is carefully balanced."
        ),
        body(
          "A counter-intuitive finding is that Method 1 improves under Gaussian " +
          "noise: IoU rises from 0.415 (clean) to 0.474 (\u03c3=15) and 0.541 " +
          "(\u03c3=40). This occurs because the late-season test images contain " +
          "uniform low-ExG regions of golden wheat. Gaussian noise introduces " +
          "random intensity variation that partially disrupts this uniformity, " +
          "creating false positive ExG responses that inadvertently recover some " +
          "true foreground area. This counterintuitive benefit disappears for blur " +
          "and brightness distortions, which preserve the spectral uniformity that " +
          "confuses the ExG score."
        ),

        h2("D", "Training Data Efficiency"),
        body(
          "Table IV shows IoU as the training set is reduced to 25%, 50%, 75%, " +
          "and 100% of the 142 available training images. Method 1 is data-" +
          "independent and serves as a flat reference."
        ),
        ...tblCap("IV", "IoU vs. training data fraction (test set, seed=42)."),
        makeTable4(),
        sp(120),
        body(
          "Both learning-based methods demonstrate remarkable data efficiency. " +
          "U-Net reaches IoU\u00a0=\u00a00.852 with only 35 images (25%), just " +
          "0.022 below its full-data score of 0.874. Performance increases " +
          "monotonically with data, following a typical learning curve. Random " +
          "Forest achieves IoU\u00a0=\u00a00.848 at 25% but dips to 0.826 at " +
          "50% before recovering to 0.850 at 100%. This non-monotonic behaviour " +
          "reflects the stochastic nature of pixel subsampling: the 50% subset " +
          "(71 images) may have sampled a less representative distribution of " +
          "late-season images. At 100% training data, the performance gap between " +
          "Random Forest and U-Net is only 0.024 IoU, suggesting that the " +
          "information bottleneck at this scale lies in the feature representation " +
          "rather than the amount of data. The strong data efficiency of both " +
          "methods is encouraging for practical deployment, where annotating " +
          "large numbers of field images is expensive."
        ),

        // ── V. DISCUSSION ────────────────────────────────────────────────────
        h1("Discussion"),

        h2("A", "Method Comparison and Practical Guidance"),
        body(
          "The three methods form a clear performance hierarchy: U-Net (IoU 0.874) " +
          "> Random Forest (0.850) > Watershed (0.415). However, this ordering " +
          "should be interpreted in context. On early-season images (February), " +
          "all three methods achieve IoU above 0.685, and the Watershed method " +
          "reaches 0.713 \u2014 competitive with the learning-based approaches at " +
          "no training cost whatsoever. For operators who only need to segment green " +
          "early-growth images, Method 1 may be perfectly adequate."
        ),
        body(
          "For year-round or late-season deployment, Random Forest offers a strong " +
          "intermediate option: it requires no GPU, trains in approximately two " +
          "minutes on commodity hardware, and maintains IoU above 0.76 across all " +
          "months. Its main drawback is slow per-image inference (0.325\u00a0s), " +
          "driven by the cost of extracting 26 features for every pixel in a " +
          "350\u00d7350 image (122,500 pixels). U-Net achieves higher accuracy " +
          "with 11.6\u00d7 faster inference (0.028\u00a0s/image), making it the " +
          "preferred choice for large-scale or real-time monitoring tasks."
        ),

        h2("B", "Failure Mode Analysis"),
        body(
          "Method 1\u2019s failure is systematic and predictable: it is triggered by " +
          "any condition that reduces the green channel dominance of wheat pixels. " +
          "In our dataset this is primarily seasonal (ripening), but similar failure " +
          "would be expected for winter wheat varieties, post-harvest stubble, or " +
          "drought-stressed crops. A simple yet effective remedy would be to " +
          "supplement ExG with near-infrared (NIR) reflectance, which remains " +
          "high for live vegetation regardless of chlorophyll content."
        ),
        body(
          "The worst-performing test image for Methods 2 and 3 is from 17 May 2017 " +
          "(IoU\u00a0\u22480.688 for both). Inspection reveals dense overlapping " +
          "wheat ears creating a complex, highly textured foreground that differs " +
          "markedly from the training distribution. Both methods also struggle " +
          "with strongly shadowed boundary regions. These failure cases could be " +
          "addressed by targeted augmentation (rotation, perspective warp) or by " +
          "incorporating temporal context from sequential field images."
        ),

        h2("C", "Robustness Improvement Analysis"),
        body(
          "The M3-R experiment demonstrates a clear insight-to-improvement cycle: " +
          "(1) the robustness benchmark identified that extreme contrast reduction " +
          "was U-Net\u2019s principal vulnerability; (2) distortion augmentation " +
          "covering the training range (\u00d7[0.35, 0.75]) was added to training; " +
          "(3) the weakness was largely resolved (+0.166 IoU). The residual trade-off " +
          "\u2014 reduced brightness robustness in M3-R \u2014 points directly to " +
          "the next improvement: adding brightness distortions to the augmentation " +
          "mix with higher probability."
        ),
        body(
          "The clean-data cost of distortion augmentation (\u22120.013) is small " +
          "but non-zero. This is the typical accuracy-robustness trade-off documented " +
          "in adversarial training literature. A curriculum approach \u2014 starting " +
          "training on clean images and gradually introducing distortions \u2014 may " +
          "reduce this cost while preserving the robustness gains."
        ),

        h2("D", "Limitations"),
        body(
          "Several limitations of the current work deserve attention. First, the " +
          "U-Net used here is deliberately lightweight (base channels\u00a0=\u00a016, " +
          "\u223c480K parameters) to support CPU-only training; larger architectures " +
          "or pre-trained encoders (e.g., ResNet50 backbone) would likely push IoU " +
          "above 0.90. Second, all methods are evaluated on a single wheat dataset " +
          "at one geographic location; generalisation to other crop types, camera " +
          "setups, or locations remains to be verified. Third, the robustness " +
          "benchmark uses synthetic distortions; real-world degradations (e.g., " +
          "motion blur from UAV vibration, rain drops) may have different " +
          "characteristics. Finally, the seasonal analysis is based on a single " +
          "growing season; inter-year variation could affect conclusions."
        ),

        // ── VI. CONCLUSION ───────────────────────────────────────────────────
        h1("Conclusion"),
        body(
          "We presented a comprehensive comparison of three wheat segmentation " +
          "paradigms on the EWS dataset. The classical Watershed method, while " +
          "parameter-free and fast, suffers a severe seasonal failure as monthly " +
          "average IoU declines from 0.713 (February) to 0.272 (May), making it " +
          "unsuitable for full-season deployment. The Random Forest classifier with " +
          "a 26-dimensional handcrafted feature set achieves IoU\u00a0=\u00a00.850 " +
          "and remains competitive with as few as 35 training images. The lightweight " +
          "U-Net achieves the best performance (IoU\u00a0=\u00a00.874, F1\u00a0=\u00a0" +
          "0.931) with substantially faster inference (0.028\u00a0s/image)."
        ),
        body(
          "Beyond the standard comparison, three original analyses strengthen the " +
          "results. A month-by-month breakdown reveals that Methods 2 and 3 also " +
          "show a gradual seasonal decline (IoU \u22120.181 and \u22120.181 from " +
          "February to May respectively), though never approaching the catastrophic " +
          "drop of Method 1. A systematic robustness benchmark identifies extreme " +
          "contrast reduction as U-Net\u2019s principal vulnerability, confirmed " +
          "by an architectural explanation. Distortion augmentation (M3-R) " +
          "specifically addresses this vulnerability, raising IoU from 0.596 to " +
          "0.762 (+0.166), closing the gap with Random Forest and illustrating a " +
          "complete analysis\u2013improvement loop."
        ),
        body(
          "Future directions include season-invariant feature engineering for " +
          "classical methods (e.g., NIR-augmented ExG), curriculum distortion " +
          "training to recover brightness robustness in M3-R, larger U-Net " +
          "architectures with pre-trained encoders, and semi-supervised learning " +
          "strategies to reduce annotation costs further."
        ),

        // ── REFERENCES ───────────────────────────────────────────────────────
        h1("References"),
        ...[
          "[1]\tO. Ronneberger, P. Fischer, and T. Brox, \u201cU-Net: Convolutional networks for biomedical image segmentation,\u201d in Proc. MICCAI, 2015, pp. 234\u2013241.",
          "[2]\tR. Zenkl et al., \u201cOutdoor plant segmentation with deep learning for high-throughput field phenotyping on a diverse wheat dataset,\u201d Front. Plant Sci., vol. 12, p. 774068, 2022.",
          "[3]\tL. Vincent and P. Soille, \u201cWatersheds in digital spaces: An efficient algorithm based on immersion simulations,\u201d IEEE Trans. Pattern Anal. Mach. Intell., vol. 13, no. 6, pp. 583\u2013598, 1991.",
          "[4]\tD. M. Woebbecke, G. E. Meyer, K. Von Bargen, and D. A. Mortensen, \u201cColor indices for weed identification under various soil, residue, and lighting conditions,\u201d Trans. ASAE, vol. 38, no. 1, pp. 259\u2013269, 1995.",
          "[5]\tC. Rother, V. Kolmogorov, and A. Blake, \u201cGrabCut: Interactive foreground extraction using iterated graph cuts,\u201d ACM Trans. Graph., vol. 23, no. 3, pp. 309\u2013314, 2004.",
          "[6]\tL. Breiman, \u201cRandom forests,\u201d Mach. Learn., vol. 45, no. 1, pp. 5\u201332, 2001.",
          "[7]\tS. Cao et al., \u201cThe blessing of Depth Anything: An almost unsupervised approach to crop segmentation with depth-informed pseudo labeling,\u201d Plant Phenomics, vol. 7, no. 1, p. 100005, 2025.",
          "[8]\tY. Zhang et al., \u201cDepthCropSeg++: Scaling a crop segmentation foundation model with depth-labeled data,\u201d IEEE J. Sel. Topics Signal Process., 2026.",
          "[9]\tJ. Long, E. Shelhamer, and T. Darrell, \u201cFully convolutional networks for semantic segmentation,\u201d in Proc. CVPR, 2015, pp. 3431\u20133440.",
        ].map(ref => new Paragraph({
          spacing: { before:0, after:60 },
          indent:  { left:320, hanging:320, firstLine:0 },
          children: [r(ref, { sz:SZ_TBL })],
        })),

        sp(200),
      ],
    },
  ],
});

// ── Write output ──────────────────────────────────────────────────────────────
const outDir  = path.join(__dirname, "..", "reports");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "COMP9517_Group_Project_Report.docx");

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log("Report saved to:", outPath);
}).catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
