/**
 * COMP9517 Group Project Report — IEEE A4 conference format.
 *
 * Matches the official IEEE conference-template-a4.docx:
 *   - Times New Roman throughout
 *   - A4 margins: left/right 44.65pt (≈893 DXA), top 27pt title / 54pt body, bottom 72pt
 *   - Two sections: (1) single-column title+abstract, (2) continuous 2-column body
 *   - Headings: Roman-numeral, allCaps, centered (H1); letter, italic (H2)
 *   - Tables: IEEE style — horizontal rules only, no shading, 8pt Times New Roman
 *   - Table captions appear ABOVE the table
 *
 * Run:
 *   node scripts/generate_report.js
 * Output:
 *   reports/COMP9517_Group_Project_Report.docx
 */

"use strict";

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType,
  SectionType, PageNumber, Footer,
} = require("docx");
const fs   = require("fs");
const path = require("path");

// ── Page geometry ─────────────────────────────────────────────────────────────
// A4 in DXA (1 DXA = 1/1440 inch; 1 pt = 20 DXA)
const PW = 11906, PH = 16838;

// Margins matching IEEE A4 template
const ML = 893, MR = 893;   // left/right  44.65 pt
const MT1 = 540;             // top title section  27 pt
const MT2 = 1080;            // top body section   54 pt
const MB  = 1440;            // bottom             72 pt
const MH  = 720, MF = 720;  // header/footer      36 pt

// Column layout (2-column body)
const CW    = PW - ML - MR;                     // 10120 DXA full content width
const CGAP  = 360;                               // 18 pt column gap
const COL_W = Math.floor((CW - CGAP) / 2);     // 4880 DXA per column

// ── Typography constants ──────────────────────────────────────────────────────
const FONT   = "Times New Roman";
const SZ_TTL = 48;   // 24 pt — paper title
const SZ_AUT = 22;   // 11 pt — author
const SZ_AFF = 20;   // 10 pt — affiliation
const SZ_BOD = 20;   // 10 pt — body text
const SZ_ABS = 18;   //  9 pt — abstract / keywords
const SZ_TBL = 16;   //  8 pt — table text / references

// ── Run helper ────────────────────────────────────────────────────────────────
function r(text, { sz = SZ_BOD, bold = false, italic = false, allCaps = false } = {}) {
  return new TextRun({ text, font: FONT, size: sz, bold, italic, allCaps });
}

// ── Body paragraph ────────────────────────────────────────────────────────────
// 10 pt, first-line indent 14.40 pt (288 DXA), justified, single spacing
function body(textOrRuns, { noIndent = false, before = 0, after = 120 } = {}) {
  const children = typeof textOrRuns === "string" ? [r(textOrRuns)] : textOrRuns;
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing:   { before, after, line: 240, lineRule: "auto" },
    indent:    { firstLine: noIndent ? 0 : 288 },
    children,
  });
}

// ── Spacing paragraph (empty) ─────────────────────────────────────────────────
function sp(after = 120) {
  return new Paragraph({ spacing: { before: 0, after }, indent: { firstLine: 0 }, children: [] });
}

// ── Section heading  H1: "I. INTRODUCTION" ───────────────────────────────────
let secIdx = 0;
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
function h1(title) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing:   { before: 160, after: 80 },
    indent:    { firstLine: 0 },
    children:  [r(`${ROMAN[secIdx++]}. ${title}`, { allCaps: true })],
  });
}

// ── Subsection heading  H2: "A. Title" ───────────────────────────────────────
function h2(letter, title) {
  return new Paragraph({
    spacing:  { before: 120, after: 60 },
    indent:   { firstLine: 0 },
    children: [r(`${letter}. ${title}`, { italic: true })],
  });
}

// ── Table caption (goes ABOVE the table in IEEE style) ────────────────────────
// Returns TWO paragraphs: "TABLE N" (allCaps) and "Caption text" (italic)
function tblCap(num, caption) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing:   { before: 200, after: 0 },
      indent:    { firstLine: 0 },
      children:  [r(`TABLE ${num}`, { allCaps: true, sz: SZ_TBL })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing:   { before: 0, after: 60 },
      indent:    { firstLine: 0 },
      children:  [r(caption, { italic: true, sz: SZ_TBL })],
    }),
  ];
}

// ── IEEE table cell borders ───────────────────────────────────────────────────
const BNone  = { style: BorderStyle.NONE,   size: 0,  color: "FFFFFF" };
const BThin  = { style: BorderStyle.SINGLE, size: 4,  color: "000000" };
const BThick = { style: BorderStyle.SINGLE, size: 12, color: "000000" };

// rowPos: "first" | "mid" | "last"
function tblCell(text, w, { rowPos = "mid", leftAlign = false, bold = false } = {}) {
  const topB = rowPos === "first" ? BThick : BNone;
  const botB = rowPos === "first" ? BThin  : rowPos === "last" ? BThick : BNone;
  return new TableCell({
    borders: { top: topB, bottom: botB, left: BNone, right: BNone },
    width:   { size: w, type: WidthType.DXA },
    shading: { fill: "FFFFFF", type: ShadingType.CLEAR },
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({
      alignment: leftAlign ? AlignmentType.LEFT : AlignmentType.CENTER,
      spacing:   { before: 0, after: 0, line: 240 },
      indent:    { firstLine: 0 },
      children:  [r(text, { sz: SZ_TBL, bold })],
    })],
  });
}

// Build a table: header row + data rows, IEEE horizontal-rule style
// Each cell entry is a string  OR  [string, leftAlign]
function makeTable(colWidths, headerCells, dataRows) {
  const makeRow = (cells, rowPos) =>
    new TableRow({
      children: cells.map((cell, ci) => {
        const [text, left] = Array.isArray(cell) ? cell : [cell, false];
        return tblCell(text, colWidths[ci], {
          rowPos,
          leftAlign: left,
          bold: rowPos === "first",
        });
      }),
    });

  return new Table({
    width:        { size: colWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      makeRow(headerCells, "first"),
      ...dataRows.map((row, ri) =>
        makeRow(row, ri === dataRows.length - 1 ? "last" : "mid")),
    ],
  });
}

// Scale raw proportional widths to a target total (DXA), fixing rounding errors
function scaleW(raw, total) {
  const s = total / raw.reduce((a, b) => a + b, 0);
  const w = raw.map(v => Math.round(v * s));
  w[w.length - 1] += total - w.reduce((a, b) => a + b, 0);
  return w;
}

// ── TABLE I: Overall performance comparison ───────────────────────────────────
function makeTable1() {
  const w = scaleW([1280, 600, 600, 600, 680, 600, 680, 680], COL_W);
  return makeTable(w,
    [["Method", true], "IoU", "F1", "Prec.", "Recall", "PA", "Train(s)", "Infer(s)"],
    [
      [["Watershed",    true], "0.415", "0.553", "0.574", "0.585", "0.431", "34",  "0.021"],
      [["Rand. Forest", true], "0.850", "0.916", "0.915", "0.926", "0.907", "126", "0.325"],
      [["U-Net",        true], "0.874", "0.931", "0.922", "0.941", "0.923", "119", "0.028"],
    ]
  );
}

// ── TABLE II: Seasonal analysis of Method 1 ───────────────────────────────────
function makeTable2() {
  const w = scaleW([1600, 1600, 1600], COL_W);
  return makeTable(w,
    [["Period", true], "Date Range", "M1 IoU (avg)"],
    [
      [["Early season", true], "Feb \u2013 Mar", "0.81"],
      [["Mid season",   true], "Late Mar",       "0.44"],
      [["Late season",  true], "Apr \u2013 May", "0.23"],
    ]
  );
}

// ── TABLE III: Robustness under image distortions ─────────────────────────────
function makeTable3() {
  const w = scaleW([2000, 960, 960, 960], COL_W);
  return makeTable(w,
    [["Distortion", true], "M1 IoU", "M2 IoU", "M3 IoU"],
    [
      [["Clean (baseline)",  true], "0.415", "0.850", "0.874"],
      [["Noise \u03c3=15",   true], "0.474", "0.733", "0.831"],
      [["Noise \u03c3=40",   true], "0.541", "0.672", "0.728"],
      [["Blur \u03c3=1.5",   true], "0.399", "0.838", "0.864"],
      [["Blur \u03c3=3.0",   true], "0.389", "0.798", "0.815"],
      [["Brightness \u00d70.7", true], "0.424", "0.814", "0.844"],
      [["Brightness \u00d70.4", true], "0.448", "0.723", "0.739"],
      [["Contrast \u00d70.7",   true], "0.417", "0.820", "0.831"],
      [["Contrast \u00d70.4",   true], "0.424", "0.648", "0.596"],
    ]
  );
}

// ── TABLE IV: Training data reduction ────────────────────────────────────────
function makeTable4() {
  const w = scaleW([900, 700, 1091, 1091, 1091], COL_W);
  return makeTable(w,
    ["Fraction", "N", "M1 IoU", "M2 IoU", "M3 IoU"],
    [
      ["25%",  "35",  "0.415", "0.848", "0.852"],
      ["50%",  "71",  "0.415", "0.826", "0.867"],
      ["75%",  "106", "0.415", "0.846", "0.869"],
      ["100%", "142", "0.415", "0.850", "0.874"],
    ]
  );
}

// ── Shared footer ─────────────────────────────────────────────────────────────
const sharedFooter = new Footer({
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    indent:    { firstLine: 0 },
    children: [
      r("COMP9517 Computer Vision \u2014 UNSW 2026 T1   |   Page ", { sz: 16 }),
      new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16 }),
    ],
  })],
});

// ── Shared page size (used in both section properties) ────────────────────────
const pgSize = { size: { width: PW, height: PH } };

// ── Build the document ────────────────────────────────────────────────────────
const doc = new Document({
  sections: [

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 1 — Single column: Title, Authors, Abstract, Keywords
    // ════════════════════════════════════════════════════════════════════════
    {
      properties: {
        page: {
          ...pgSize,
          margin: { top: MT1, bottom: MB, left: ML, right: MR, header: MH, footer: MF },
        },
      },
      footers: { default: sharedFooter },
      children: [

        // Paper title  (24 pt Times New Roman, centered)
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing:   { before: 0, after: 120 },
          indent:    { firstLine: 0 },
          children:  [r(
            "Comparative Study of Classical, Machine Learning, and Deep Learning " +
            "Methods for Wheat Crop Segmentation",
            { sz: SZ_TTL }
          )],
        }),

        // Author line  (11 pt, centered)
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing:   { before: 360, after: 40 },
          indent:    { firstLine: 0 },
          children:  [r("COMP9517 Group Project Team", { sz: SZ_AUT })],
        }),

        // Affiliation  (10 pt, centered)
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing:   { before: 0, after: 40 },
          indent:    { firstLine: 0 },
          children:  [r("School of Computer Science and Engineering, UNSW Sydney", { sz: SZ_AFF })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing:   { before: 0, after: 240 },
          indent:    { firstLine: 0 },
          children:  [r("Sydney, NSW 2052, Australia", { sz: SZ_AFF })],
        }),

        // Abstract paragraph  (9 pt, "Abstract—" bold + body text)
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing:   { before: 0, after: 200, line: 240, lineRule: "auto" },
          indent:    { firstLine: 272 },   // 13.60 pt
          children: [
            r("Abstract", { sz: SZ_ABS, bold: true }),
            r(
              "\u2014This paper presents a comparative study of three computer vision methods for " +
              "wheat crop segmentation using the Eschikon Wheat Segmentation (EWS) dataset, which " +
              "contains 190 RGB images of 350\u00d7350 pixels with manual binary annotations. " +
              "The three methods represent fundamentally different paradigms: (1) a classical image " +
              "processing approach based on Excess Green vegetation indices with Watershed " +
              "segmentation, (2) a machine learning approach using 28-dimensional handcrafted pixel " +
              "features with a Random Forest classifier, and (3) a deep learning approach using a " +
              "lightweight U-Net architecture with data augmentation. Experiments on the held-out " +
              "test set yield IoU scores of 0.415, 0.850, and 0.874 respectively. Additional " +
              "analysis reveals that the classical method suffers a critical seasonal failure " +
              "(IoU drops from 0.81 in early spring to 0.23 by late spring as wheat matures " +
              "from green to golden-yellow), while U-Net demonstrates superior robustness to " +
              "image distortions. Both learning-based methods achieve near-peak performance with " +
              "as few as 35 training images.",
              { sz: SZ_ABS }
            ),
          ],
        }),

        // Keywords  (9 pt, "Keywords—" bold + keyword list)
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing:   { before: 0, after: 120 },
          indent:    { firstLine: 274 },   // 13.70 pt
          children: [
            r("Keywords", { sz: SZ_ABS, bold: true }),
            r(
              "\u2014wheat segmentation; image processing; random forest; U-Net; deep learning; " +
              "robustness; data efficiency; precision agriculture",
              { sz: SZ_ABS }
            ),
          ],
        }),
      ],
    },

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 2 — Two columns (continuous): Full paper body
    // ════════════════════════════════════════════════════════════════════════
    {
      properties: {
        type: SectionType.CONTINUOUS,
        page: {
          ...pgSize,
          margin: { top: MT2, bottom: MB, left: ML, right: MR, header: MH, footer: MF },
        },
        column: { count: 2, space: CGAP, equalWidth: true },
      },
      children: [

        // ── I. INTRODUCTION ──────────────────────────────────────────────────
        h1("Introduction"),
        body(
          "Reliable automated segmentation of crop plants in field images is a fundamental " +
          "challenge in precision agriculture. Accurate pixel-level delineation of wheat from " +
          "background soil supports downstream tasks such as biomass estimation, growth " +
          "monitoring, disease detection, and yield forecasting."
        ),
        body(
          "Classical computer vision methods exploit handcrafted colour cues such as the " +
          "Excess Green index (ExG), which works well when crops are green but fails as " +
          "plants mature and change colour. Machine learning methods with carefully " +
          "engineered features offer improved generalisation, while deep learning " +
          "architectures such as U-Net [1] learn hierarchical representations that adapt " +
          "across growth stages."
        ),
        body(
          "This study develops and evaluates three contrasting methods on the EWS dataset [2], " +
          "a public benchmark of 190 RGB wheat field images collected across a full growing " +
          "season. We evaluate all methods on standard metrics (IoU, F1, Precision, Recall, " +
          "Pixel Accuracy) and conduct additional robustness and data-efficiency experiments " +
          "motivated by real-world deployment considerations."
        ),

        // ── II. LITERATURE REVIEW ────────────────────────────────────────────
        h1("Literature Review"),

        h2("A", "Classical Segmentation"),
        body(
          "Watershed segmentation treats image gradients as a topographic surface and floods " +
          "regions from seed markers [3]. Applied to vegetation imagery, seed selection " +
          "based on vegetation indices such as ExG = 2G \u2212 R \u2212 B [4] provides an " +
          "unsupervised approach requiring no labelled data. GrabCut [5] extends this " +
          "paradigm by iteratively refining foreground and background Gaussian mixture " +
          "models from a user-provided or automatically generated initialisation."
        ),

        h2("B", "Machine Learning Methods"),
        body(
          "Pixel-wise classification using handcrafted features has been widely applied to " +
          "plant segmentation. Features combining colour spaces (RGB, HSV), vegetation " +
          "indices (ExG, ExGR), and local texture statistics from sliding windows provide " +
          "rich per-pixel descriptors [2]. Random Forests [6] are a natural classifier " +
          "choice: they handle high-dimensional inputs, are robust to noise, and produce " +
          "calibrated probability outputs suitable for threshold tuning."
        ),

        h2("C", "Deep Learning Methods"),
        body(
          "U-Net [1], originally proposed for biomedical image segmentation, has become the " +
          "standard encoder-decoder architecture for dense prediction. Its skip connections " +
          "preserve fine spatial detail while the bottleneck encodes semantic context. " +
          "Zenkl et al. [2] applied deep learning to EWS and reported IoU values of " +
          "0.85\u20130.95 for their best models. More recent work by Cao et al. [7] and " +
          "Zhang et al. [8] demonstrates the effectiveness of depth-informed and " +
          "foundation-model approaches for crop segmentation."
        ),

        // ── III. METHODS ─────────────────────────────────────────────────────
        h1("Methods"),

        h2("A", "Dataset and Experimental Setup"),
        body(
          "The EWS dataset contains 190 RGB images (350\u00d7350 pixels) captured in a wheat " +
          "field across an entire growing season from February to May 2017. Images are " +
          "accompanied by manually annotated binary masks (wheat = 1, soil = 0). We adopt " +
          "the canonical split: 142 training, 24 validation, and 24 test images. Split " +
          "disjointness is verified programmatically before every experiment."
        ),
        body(
          "Hyperparameters are tuned exclusively on the validation set; the test set is " +
          "used only for final evaluation. All metrics (Precision, Recall, F1, IoU, and " +
          "Pixel Accuracy) are computed per image and averaged. Training and inference " +
          "times are recorded with wall-clock timing."
        ),

        h2("B", "Method 1: ExG-guided Watershed"),
        body(
          "Method 1 is a training-free classical approach. A per-pixel vegetation score is " +
          "computed as a weighted combination of Excess Green (ExG), green dominance, HSV " +
          "saturation, and Sobel gradient magnitude: " +
          "S = 1.7\u00b7ExG + 0.9\u00b7G\u2091 + 0.4\u00b7Sat \u2212 0.15\u00b7|\u2207|. " +
          "This score drives percentile-based seed extraction, where pixels in the top and " +
          "bottom quantiles are labelled as definite foreground and background respectively."
        ),
        body(
          "Seeds initialise scipy watershed_ift (Watershed variant) or OpenCV grabCut. " +
          "The resulting mask is refined with morphological opening/closing and removal of " +
          "small connected components. Foreground/background thresholds are tuned via " +
          "validation grid search; the Watershed configuration is used for all results."
        ),

        h2("C", "Method 2: Handcrafted Features + Random Forest"),
        body(
          "Method 2 extracts a 28-dimensional feature vector per pixel: raw RGB and HSV (6), " +
          "chromaticity normalisation (3), local RGB/HSV means over a 9\u00d79 window (6), " +
          "vegetation indices ExG, ExR, ExGR (3), local ExG statistics (2), greyscale " +
          "intensity and local statistics (3), and Sobel/ExG gradient magnitudes (2). " +
          "A RandomForestClassifier (250 trees, max depth 20) is trained on balanced " +
          "pixel samples. The classification probability threshold is tuned on the " +
          "validation set to maximise IoU."
        ),

        h2("D", "Method 3: Lightweight U-Net"),
        body(
          "Method 3 uses a lightweight U-Net with base channel width 16. The encoder " +
          "applies three double-convolution blocks (Conv\u2013BN\u2013ReLU\u00d72) with " +
          "2\u00d72 max pooling, producing feature maps at 16, 32, and 64 channels. A " +
          "128-channel bottleneck is followed by a symmetric decoder with bilinear " +
          "upsampling and skip connections, ending in a 1\u00d71 convolution and sigmoid " +
          "activation. Training minimises Dice loss + BCE with Adam (lr = 0.001, batch " +
          "size 4, 20 epochs). Data augmentation includes random flips, brightness/contrast " +
          "jitter (\u00b110%), and Gaussian noise (\u03c3 = 3, 30% probability). The " +
          "checkpoint with highest validation IoU is retained."
        ),

        // ── IV. EXPERIMENTAL RESULTS ─────────────────────────────────────────
        h1("Experimental Results"),

        h2("A", "Overall Performance Comparison"),
        body(
          "Table I reports all five metrics and timing for the three methods on the " +
          "24-image test set (PA = Pixel Accuracy, Train = training time, Infer = mean " +
          "per-image inference time)."
        ),
        ...tblCap("I", "Test-set performance comparison."),
        makeTable1(),
        sp(120),
        body(
          "Methods 2 and 3 substantially outperform the classical baseline. U-Net achieves " +
          "the highest IoU (0.874) and F1 (0.931) while being 11\u00d7 faster at inference " +
          "than Random Forest (0.028 s vs 0.325 s/image). Despite the smaller gap in " +
          "average IoU, U-Net also trains slightly faster (119 s vs 126 s)."
        ),

        h2("B", "Seasonal Failure Analysis of Method 1"),
        body(
          "Per-image analysis reveals a clear temporal pattern in Method 1 performance " +
          "(Table II). Early-season images (February\u2013March) yield average IoU 0.81, " +
          "comparable to learning-based methods. From April onwards, as wheat matures " +
          "and shifts from green to golden-yellow, the ExG-based vegetation score loses " +
          "discriminative power and IoU collapses to 0.23 by late spring."
        ),
        ...tblCap("II", "Seasonal variation in Method 1 IoU (Watershed)."),
        makeTable2(),
        sp(120),
        body(
          "Methods 2 and 3 are unaffected by this seasonal shift: both learn " +
          "appearance-agnostic representations from the full-season training data."
        ),

        h2("C", "Robustness to Image Distortions"),
        body(
          "To simulate real-world image degradation, we apply four distortion types to the " +
          "test set: Gaussian noise (\u03c3 = 15 and \u03c3 = 40), Gaussian blur " +
          "(\u03c3 = 1.5 and \u03c3 = 3.0), brightness reduction (\u00d70.7 and \u00d70.4), " +
          "and contrast reduction (\u00d70.7 and \u00d70.4). Each method is trained once " +
          "on clean data; only inference uses distorted images. Table III reports IoU."
        ),
        ...tblCap("III", "IoU under image distortions (trained on clean data)."),
        makeTable3(),
        sp(120),
        body(
          "U-Net is most robust in 8 of 9 conditions. The sole exception is extreme " +
          "contrast reduction (\u00d70.4), where Random Forest (0.648) outperforms U-Net " +
          "(0.596), likely because the spatial attention mechanism of U-Net relies on " +
          "contrast cues whereas global colour statistics are more contrast-tolerant."
        ),
        body(
          "A counter-intuitive result is that Method 1 improves under noise: IoU rises " +
          "from 0.415 (clean) to 0.541 (\u03c3 = 40). Adding noise disrupts the uniform " +
          "low-ExG texture of mature golden wheat, artificially restoring ExG variance " +
          "that the vegetation score can exploit."
        ),

        h2("D", "Training Data Efficiency"),
        body(
          "We train Methods 2 and 3 on random subsets of 25%, 50%, 75%, and 100% of the " +
          "142 training images, evaluating on the full test set each time. Method 1 " +
          "serves as a data-independent baseline (Table IV)."
        ),
        ...tblCap("IV", "IoU vs. training data fraction."),
        makeTable4(),
        sp(120),
        body(
          "Both learning-based methods exhibit high data efficiency. U-Net reaches IoU 0.852 " +
          "with only 35 images (25% of training data), just 0.022 below its full-data score. " +
          "Random Forest achieves IoU 0.848 at 25% and 0.850 at 100%, indicating that " +
          "performance saturates quickly. These results are encouraging for deployment " +
          "scenarios where annotated data is scarce."
        ),

        // ── V. DISCUSSION ────────────────────────────────────────────────────
        h1("Discussion"),

        h2("A", "Method Comparison"),
        body(
          "The results confirm the expected performance hierarchy: deep learning > machine " +
          "learning > classical, with the caveat that all three perform comparably on " +
          "early-season images where colour-based cues are reliable. U-Net\u2019s practical " +
          "advantage lies not only in slightly higher IoU but in its substantially faster " +
          "inference, making it the preferred choice for large-scale field monitoring."
        ),
        body(
          "Random Forest achieves a strong IoU of 0.850 using simple features and no GPU, " +
          "making it a compelling alternative when deep learning infrastructure is " +
          "unavailable. Its higher inference cost (0.325 s/image) reflects pixel-level " +
          "feature extraction; feature selection or approximation could reduce this."
        ),

        h2("B", "Failure Cases"),
        body(
          "Method 1 fails systematically on mature wheat. Qualitative inspection of " +
          "late-season images shows that golden wheat has lower green channel dominance " +
          "than young green shoots, causing the ExG score to assign near-zero vegetation " +
          "probability to large foreground regions. Incorporating near-infrared (NIR) " +
          "reflectance or season-invariant texture features could remedy this."
        ),
        body(
          "Methods 2 and 3 occasionally fail on images with heavy shadows or out-of-focus " +
          "regions near image boundaries, corresponding to the lowest per-sample IoU values " +
          "in the per-sample metrics records."
        ),

        h2("C", "Limitations"),
        body(
          "The U-Net used here is lightweight (base channels = 16) to support CPU training. " +
          "Increasing model capacity or training for more epochs would likely push IoU above " +
          "0.90, approaching state-of-the-art values reported for this dataset. Additionally, " +
          "the robustness experiment trains on clean data; augmenting with distorted images " +
          "during training may further improve robustness, particularly for the contrast and " +
          "noise conditions where the largest IoU drops are observed."
        ),

        // ── VI. CONCLUSION ───────────────────────────────────────────────────
        h1("Conclusion"),
        body(
          "We presented a systematic comparison of three wheat segmentation methods on the " +
          "EWS dataset. The classical Watershed method, while fast and parameter-free, " +
          "fails for mature wheat due to its reliance on green-colour cues (IoU 0.415 " +
          "overall, dropping to 0.23 in late spring). The Random Forest achieves IoU 0.850, " +
          "largely insensitive to training-set size. U-Net achieves the best overall " +
          "performance (IoU 0.874) with superior distortion robustness and the fastest " +
          "inference."
        ),
        body(
          "Key findings: (1) a clear seasonal failure mode in classical colour-based " +
          "segmentation; (2) counter-intuitive robustness gain of ExG under Gaussian noise; " +
          "(3) superior extreme-contrast robustness of Random Forest over U-Net; and " +
          "(4) high data efficiency for both learning-based methods. Future work should " +
          "explore season-invariant features for classical methods, larger U-Net variants " +
          "with distortion augmentation, and semi-supervised approaches to further reduce " +
          "annotation requirements."
        ),

        // ── REFERENCES ───────────────────────────────────────────────────────
        h1("References"),
        ...[
          "[1]\tO. Ronneberger, P. Fischer, and T. Brox, \u201cU-Net: Convolutional networks for biomedical image segmentation,\u201d in Proc. MICCAI, 2015, pp. 234\u2013241.",
          "[2]\tR. Zenkl et al., \u201cOutdoor plant segmentation with deep learning for high-throughput field phenotyping on a diverse wheat dataset,\u201d Front. Plant Sci., vol. 12, p. 774068, 2022.",
          "[3]\tL. Vincent and P. Soille, \u201cWatersheds in digital spaces: An efficient algorithm based on immersion simulations,\u201d IEEE Trans. Pattern Anal. Mach. Intell., vol. 13, no. 6, pp. 583\u2013598, 1991.",
          "[4]\tT. Woebbecke et al., \u201cColor indices for weed identification under various soil, residue, and lighting conditions,\u201d Trans. ASAE, vol. 38, no. 1, pp. 259\u2013269, 1995.",
          "[5]\tC. Rother, V. Kolmogorov, and A. Blake, \u201cGrabCut: Interactive foreground extraction using iterated graph cuts,\u201d ACM Trans. Graph., vol. 23, no. 3, pp. 309\u2013314, 2004.",
          "[6]\tL. Breiman, \u201cRandom forests,\u201d Mach. Learn., vol. 45, no. 1, pp. 5\u201332, 2001.",
          "[7]\tS. Cao et al., \u201cThe blessing of Depth Anything: An almost unsupervised approach to crop segmentation with depth-informed pseudo labeling,\u201d Plant Phenomics, vol. 7, no. 1, p. 100005, 2025.",
          "[8]\tY. Zhang et al., \u201cDepthCropSeg++: Scaling a crop segmentation foundation model with depth-labeled data,\u201d IEEE J. Sel. Topics Signal Process., 2026.",
        ].map(ref => new Paragraph({
          spacing: { before: 0, after: 60 },
          indent:  { left: 320, hanging: 320, firstLine: 0 },
          children: [r(ref, { sz: SZ_TBL })],
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
