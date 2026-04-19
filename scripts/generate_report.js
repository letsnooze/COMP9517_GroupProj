/**
 * COMP9517 Group Project — IEEE A4 conference format, 7-8 pages.
 * Run:  node scripts/generate_report.js
 * Out:  reports/COMP9517_Group_Project_Report.docx
 */
"use strict";

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType,
  SectionType, PageNumber, Footer, ImageRun,
  HorizontalPositionRelativeFrom, HorizontalPositionAlign,
  VerticalPositionRelativeFrom, TextWrappingType, TextWrappingSide,
  Math: MathEl, MathRun, MathFraction, MathSubScript,
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

// ── Math paragraph helper ─────────────────────────────────────────────────────
function mathPara(...mathEls) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 60, line: 276, lineRule: "auto" },
    indent: { firstLine: 0 },
    children: mathEls,
  });
}

// fraction shorthand
function frac(num, den) {
  return new MathFraction({ numerator: [new MathRun(num)], denominator: [new MathRun(den)] });
}

// ── Figure helper ─────────────────────────────────────────────────────────────
function figureBlock(imgPath, figNum, caption) {
  const data = fs.readFileSync(imgPath);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 0 },
      indent: { firstLine: 0 },
      children: [
        new ImageRun({
          type: "png",
          data,
          transformation: { width: 300, height: 62 },  // fits within one column (~3.1in)
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 120 },
      indent: { firstLine: 0 },
      children: [
        r(`Fig. ${figNum}. `, { sz: SZ_TBL, bold: true }),
        r(caption, { sz: SZ_TBL }),
      ],
    }),
  ];
}

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
      [["Chromaticity",true],"3","r = R/(R+G+B),\u2003g = G/(R+G+B),\u2003b = B/(R+G+B)"],
      [["Local means",true],"6","Mean RGB and HSV in 9\u00d79 neighbourhood"],
      [["Veg. indices",true],"3","ExG = 2G\u2212R\u2212B;\u2003ExR = 1.4R\u2212G;\u2003ExGR = ExG\u2212ExR"],
      [["Local ExG/ExGR stats",true],"3","ExG mean; ExG var; ExGR mean in 9\u00d79 window"],
      [["Greyscale",true],"3","Grey intensity, local mean, local var"],
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
          children: [r("Chenci Liu,\u2003Jianyu Zhou,\u2003Junwen Xue,\u2003Liuyunan He,\u2003Mengyang Yuan", { sz:SZ_AUT })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before:0, after:20 },
          indent: { firstLine:0 },
          children: [r("Group \u201cVision Pro\u201d \u2014 COMP9517 Computer Vision", { sz:SZ_AFF })],
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
              "pixels) spanning multiple growing seasons from 2017 to 2020. The training set " +
              "covers November to April across four years with no May images; the test set is " +
              "drawn exclusively from 2017, including seven May images not seen during training. " +
              "The three methods represent fundamentally different paradigms: (1) a " +
              "training-free classical approach combining Excess Green vegetation indices " +
              "with Watershed segmentation; (2) a machine learning approach using a " +
              "26-dimensional handcrafted feature vector with a Random Forest classifier; " +
              "and (3) a deep learning approach using a lightweight U-Net encoder-decoder " +
              "with skip connections and Dice+BCE loss. Evaluation on the held-out test set " +
              "yields IoU scores of 0.415, 0.850, and 0.874 respectively. " +
              "Our analysis shows that the classical method fails on late-season images " +
              "(IoU drops from 0.713 in February to 0.272 in May as canopy closure, " +
              "leaf shadows, and fragmented background make reliable seed placement " +
              "increasingly difficult for the classical method), " +
              "while both learning-based methods work well with as few as 35 training images. Training U-Net with stronger data augmentation improves " +
              "its robustness to contrast reduction, raising IoU from 0.596 to 0.762 (+0.166).",
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
          "season. Early-season wheat is distinctly green against bare brown soil, making " +
          "colour-based separation straightforward. By late spring, two factors make " +
          "colour-based separation harder: plant coverage grows from under 2% in " +
          "February to over 55% in May, and background ExG rises as weeds and ground " +
          "cover develop between the wheat rows, increasing spectral overlap between " +
          "plant and background pixels. " +
          "Real-world deployment also introduces image quality degradation from camera " +
          "shake, dirt on lenses, and variable lighting conditions."
        ),
        body(
          "This report compares three different segmentation approaches on the publicly " +
          "available EWS dataset [2]: (1) a classical method using Watershed and GrabCut " +
          "with vegetation index seeding; (2) a machine learning method using handcrafted " +
          "features with a Random Forest classifier; and (3) a deep learning method using " +
          "a lightweight U-Net. We also evaluate seasonal performance, robustness to image " +
          "distortions, and the effect of reducing training data size."
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
          "Related indices such as Excess Red (ExR) and ExGR also help separate vegetation " +
          "from background in more difficult images."
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
          "classifier for this task: they can handle many input features and output " +
          "probability scores for each class, which allows threshold tuning to improve IoU."
        ),
        body(
          "The EWS benchmark paper [2] demonstrates that pixel-wise classifiers with " +
          "carefully engineered features achieve IoU above 0.80 on seasonal wheat data. " +
          "We use a 26-dimensional feature set and tune the classification threshold on the validation set."
        ),

        h2("C", "Deep Learning Segmentation"),
        body(
          "Fully Convolutional Networks (FCN) [8] established the paradigm of replacing " +
          "classification heads with upsampling layers for dense prediction. U-Net [1] " +
          "introduced symmetric skip connections between encoder and decoder stages, " +
          "enabling precise localisation even with limited training data \u2014 a " +
          "property particularly valuable for agricultural datasets where annotation is " +
          "costly. Zenkl et al. [2] reported IoU values of 0.85\u20130.95 for deep " +
          "learning models on EWS. More recent work incorporates depth information [7] " +
          "to further improve robustness."
        ),
        body(
          "Data augmentation is important when training on small datasets. We apply " +
          "standard augmentations such as flips, brightness and contrast changes, and " +
          "Gaussian noise. We also test whether adding stronger distortions during " +
          "training can improve robustness against specific image quality problems."
        ),

        // ── III. METHODS ─────────────────────────────────────────────────────
        h1("Methods"),

        h2("A", "Dataset and Experimental Protocol"),
        body(
          "The EWS dataset [2] contains 190 RGB images (350\u00d7350 pixels) captured " +
          "at the Eschikon field station, ETH Zurich, using a fixed overhead camera " +
          "mounted above wheat plots. The dataset spans multiple growing seasons " +
          "from 2017 to 2020. The training set (142 images) covers November to April " +
          "across years 2017\u20132020 and contains no May images. The validation and " +
          "test sets (24 images each) are drawn exclusively from 2017, covering " +
          "February to May; the test set includes seven May images representing the " +
          "densest canopy stage not seen during training. " +
          "Each image is paired with a manually annotated binary mask (wheat pixel = 1, " +
          "soil/background = 0)."
        ),
        body(
          "All hyperparameters are tuned on the validation set; the test set is only " +
          "used for final evaluation."
        ),
        body("Five evaluation metrics are computed per image and averaged across the test set:"),
        mathPara(new MathEl({ children: [new MathRun("IoU = "), frac("TP","TP+FP+FN")] })),
        mathPara(new MathEl({ children: [new MathRun("F1 = "), frac("2\u22c5Prec\u22c5Recall","Prec+Recall")] })),
        mathPara(
          new MathEl({ children: [new MathRun("Prec = "), frac("TP","TP+FP")] }),
          new TextRun({ text: "\u2003\u2003", font: FONT, size: SZ_BOD }),
          new MathEl({ children: [new MathRun("Recall = "), frac("TP","TP+FN")] }),
        ),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80, line: 240, lineRule: "auto" },
          indent: { firstLine: 0 },
          children: [r("PA = correct pixels / total pixels", { italic: true })],
        }),
        body("Training and inference times are measured with wall-clock timing on an Apple M-series CPU."),

        h2("B", "Method 1: ExG-guided Watershed / GrabCut"),
        body(
          "Method 1 is a training-free classical pipeline. A per-pixel composite " +
          "vegetation score S aggregates four complementary cues:"
        ),
        mathPara(new MathEl({
          children: [
            new MathRun("S = 1.7\u22c5ExG + 0.9\u22c5"),
            new MathSubScript({
              children: [new MathRun("G")],
              subScript: [new MathRun("e")],
            }),
            new MathRun(" + 0.4\u22c5Sat \u2212 0.15\u22c5|\u2207|"),
          ],
        })),
        body(
          "where ExG is the Excess Green index [4], G\u2091 is normalised green dominance " +
          "(G/(R+G+B)), Sat is HSV saturation, and |\u2207| is Sobel edge magnitude " +
          "(subtracted to suppress spurious seeds at boundaries). S is smoothed with " +
          "a Gaussian blur (\u03c3\u00a0=\u00a01.0) before seed extraction."
        ),
        body(
          "Seeds are extracted by percentile thresholding: pixels above the foreground " +
          "percentile (\u03b8\u209c) are labelled definite foreground; pixels below the " +
          "background percentile (\u03b8\u2082) are definite background. The remainder " +
          "is marked unknown. Two segmentation variants share this seeding framework " +
          "but use slightly different vegetation score coefficients: (a) " +
          "\u2018Watershed\u2019 uses the formula above and runs scipy watershed_ift " +
          "on the gradient image [9]; (b) \u2018GrabCut\u2019 uses a simplified score " +
          "(1.5\u00b7ExG + 0.9\u00b7G\u2091 + 0.35\u00b7Sat, without the gradient " +
          "suppression term) and runs OpenCV grabCut for iterative GMM refinement [5][10]. " +
          "Both variants were evaluated on the validation set; GrabCut achieved slightly " +
          "higher validation IoU (0.472 vs. 0.444), but requires much longer parameter " +
          "tuning time due to iterative GMM optimisation. Watershed was selected for all " +
          "reported results as the preferred trade-off between accuracy and speed. " +
          "Output masks are post-processed with morphological opening (size 2) and " +
          "closing (size 3), followed by removal of connected components smaller than 96 pixels."
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
          "per pixel (Table I). Features are organised into seven groups spanning " +
          "colour, texture, vegetation indices, and gradient information, giving the " +
          "classifier a more complete description of each pixel's appearance."
        ),
        ...tblCap("I", "Feature groups used in Method 2 (26 dimensions total)."),
        makeTable5(),
        sp(120),
        body(
          "A scikit-learn RandomForestClassifier [6][11] with 250 trees and maximum depth 20 " +
          "is trained on balanced pixel samples: 4,000 randomly sampled pixels per " +
          "training image, with equal class proportions, yielding approximately 566,000 " +
          "training pixels. Balanced sampling prevents the dominant soil class from " +
          "overwhelming the classifier. A classification probability threshold is " +
          "selected from candidates {0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65} to " +
          "maximise validation IoU; the optimal threshold is 0.35, indicating that " +
          "the forest assigns relatively low confidence to wheat pixels \u2014 " +
          "likely because late-season images exhibit high spectral overlap between " +
          "plant and background pixels, making classification genuinely ambiguous. Post-" +
          "processing applies morphological closing (size 2) and removal of connected " +
          "components smaller than 96 pixels."
        ),

        h2("D", "Method 3: Lightweight U-Net"),
        body(
          "Method 3 uses a lightweight U-Net [1] with base channel width 16. The encoder " +
          "consists of three DownBlocks, each comprising a double-convolution unit " +
          "(Conv2d\u2013BN\u2013ReLU\u00d72) followed by 2\u00d72 max pooling, " +
          "producing feature maps at 16, 32, and 64 channels respectively. A bottleneck " +
          "double-convolution at 128 channels captures global context. The decoder " +
          "mirrors the encoder with three UpBlocks (bilinear upsampling + skip " +
          "concatenation + double convolution). A 1\u00d71 convolutional head with " +
          "sigmoid activation produces the probability map. Total trainable parameters: " +
          "approximately 490,000."
        ),
        body(
          "The model is implemented in PyTorch [12]. " +
          "Training minimises the sum of Dice loss and binary cross-entropy (BCE). " +
          "Dice loss directly optimises the IoU-related overlap score and is " +
          "insensitive to class imbalance; BCE provides stable gradient at the " +
          "pixel level. The Adam optimiser (lr\u00a0=\u00a00.001) is used with " +
          "batch size 4 for 20 epochs. The checkpoint achieving the highest " +
          "validation IoU (0.870 at epoch 20) is restored before test-set " +
          "evaluation. The decision threshold is tuned on the validation set, " +
          "yielding 0.6."
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
          "Table II reports all five evaluation metrics and timing on the 24-image " +
          "test set. The two learning-based methods substantially outperform the " +
          "classical baseline across every metric."
        ),
        ...tblCap("II", "Test-set performance comparison (mean over 24 test images)."),
        makeTable1(),
        sp(120),
        body(
          "Method 1 (Watershed) achieves IoU 0.415, Precision 0.574, and Recall 0.585. " +
          "The low overall performance is mainly caused by failure on late-season May images, " +
          "where plant coverage rises to ~57% and background vegetation increases " +
          "spectral overlap between plant and soil pixels, making reliable seed " +
          "placement for the watershed algorithm increasingly difficult. Precision and Recall are similar, " +
          "suggesting the method does not strongly favour false positives or false negatives."
        ),
        body(
          "Method 2 (Random Forest) achieves IoU 0.850 and F1 0.916, with balanced " +
          "Precision (0.915) and Recall (0.926). The optimal classification threshold " +
          "tuned on the validation set is 0.35, lower than the default 0.50, which " +
          "improved IoU by including more wheat pixels that the classifier assigned " +
          "moderate confidence."
        ),
        body(
          "Method 3 (U-Net) achieves the highest score on all metrics: IoU 0.874, " +
          "F1 0.931, Precision 0.922, Recall 0.941, Pixel Accuracy 0.923. It also " +
          "trains in a similar time to Random Forest (119\u00a0s vs. 126\u00a0s) and is 11.6\u00d7 " +
          "faster at inference (0.028 vs. 0.325\u00a0s/image). The inference speed " +
          "advantage makes U-Net more practical for large-scale field monitoring " +
          "where thousands of images must be processed."
        ),

        h2("B", "Seasonal Performance Analysis"),
        body(
          "Table III breaks down test-set performance by calendar month for all three " +
          "methods. The seasonal gradient is striking for Method 1 but is also " +
          "present, to a lesser degree, in the learning-based methods."
        ),
        ...tblCap("III", "Average IoU per month for all three methods on the test set."),
        makeTable2(),
        sp(120),
        body(
          "Method 1 collapses dramatically: average IoU falls from 0.713 (February, " +
          "n\u00a0=\u00a02) to 0.573 (March), 0.292 (April), and 0.272 (May). " +
          "The February images show small wheat shoots (covering only ~2% of the image) " +
          "against large expanses of bare soil, giving the watershed algorithm a clear " +
          "clear spectral contrast between plant and background. By May, two changes " +
          "combine to cause failure: plant coverage rises to ~57%, leaving less " +
          "background area for seed placement; and background ExG rises as weeds or " +
          "other ground cover develop between wheat rows, so that many background pixels " +
          "become spectrally similar to plant pixels and seed placement becomes unreliable. " +
          "The worst individual test image (20170505) achieves IoU\u00a0=\u00a00.086, " +
          "indicating near-total segmentation failure."
        ),
        body(
          "Methods 2 and 3 also show a seasonal decline, but it is much smaller: " +
          "Method 2 drops from 0.977 (February) to 0.763 (May); Method 3 from 0.977 " +
          "to 0.796. Two factors contribute: (1) the training set contains no May images, " +
          "so both models must generalise to a canopy density not seen during weight " +
          "fitting (though May images are present in the validation set, which is used " +
          "for threshold and checkpoint selection); " +
          "(2) the May images are visually harder due to dense overlapping leaves, " +
          "heavy internal shadows, and reduced visible soil. Both methods still maintain " +
          "IoU above 0.68 on the worst May test images, compared to 0.086 for Method 1."
        ),
        ...figureBlock(
          path.join(__dirname, "../reports/fig1_qualitative.png"),
          1,
          "Qualitative segmentation results for a February image (top row) and a May image (bottom row). " +
          "Each panel shows: input image, ground-truth mask, and predicted overlay for each method. " +
          "Method 1 underperforms on the May image (IoU\u00a0=\u00a00.32) while Methods 2 and 3 " +
          "maintain reasonable performance (IoU\u00a0=\u00a00.68 and 0.69 respectively)."
        ),

        h2("C", "Robustness to Image Distortions"),
        body(
          "Table IV reports IoU under nine distortion conditions. M3-R is the " +
          "distortion-augmented U-Net variant trained with noise (\u03c3\u223c[10,45]), " +
          "blur (\u03c3\u223c[1.0,3.5]), and brightness/contrast factor\u223c[0.35,0.75] " +
          "applied randomly at 70% probability during training."
        ),
        ...tblCap("IV", "IoU under image distortions. M3-R = U-Net with distortion augmentation."),
        makeTable3(),
        sp(120),
        body(
          "Among the clean-trained models, U-Net (M3) leads in 8 of 9 conditions. " +
          "The exception is extreme contrast reduction (\u00d70.4), where Random " +
          "Forest (0.648) outperforms U-Net (0.596) by 0.052. This is likely because " +
          "U-Net relies more heavily on contrast differences in the image to detect " +
          "edges and boundaries, while Random Forest uses colour features that are " +
          "less sensitive to overall contrast changes."
        ),
        body(
          "The distortion-augmented variant M3-R directly addresses this weakness. " +
          "By training on contrast-reduced images, the network learns to handle low-contrast " +
          "inputs better, raising IoU under extreme contrast reduction from 0.596 to 0.762 (+0.166). M3-R also improves over M3 on noise conditions " +
          "(+0.007 and +0.044) and strong blur (+0.018). The trade-off is a small " +
          "clean-data IoU reduction (0.874 \u2192 0.861, \u22120.013) and reduced " +
          "brightness robustness (\u22120.038 at mild, \u22120.042 at strong). " +
          "This shows that training on specific distortions improves robustness to " +
          "those distortions, but may slightly reduce performance in other conditions."
        ),
        body(
          "An unexpected result is that Method 1 actually improves under Gaussian " +
          "noise: IoU rises from 0.415 (clean) to 0.474 (\u03c3=15) and 0.541 " +
          "(\u03c3=40). This is likely because random noise disrupts the ambiguous " +
          "background pixels that were causing false seeds, and the post-processing " +
          "step removes the many small noisy fragments that the watershed produces, " +
          "leaving a cleaner segmentation. Smaller improvements also occur under " +
          "brightness and contrast reduction, while Gaussian blur is the only " +
          "distortion that consistently hurts M1, as it smooths out the gradient " +
          "edges that the watershed relies on."
        ),

        h2("D", "Training Data Efficiency"),
        body(
          "Table V shows IoU as the training set is reduced to 25%, 50%, 75%, " +
          "and 100% of the 142 available training images. Method 1 is data-" +
          "independent and serves as a flat reference."
        ),
        ...tblCap("V", "IoU vs. training data fraction (test set, seed=42)."),
        makeTable4(),
        sp(120),
        body(
          "Both learning-based methods demonstrate remarkable data efficiency. " +
          "U-Net reaches IoU\u00a0=\u00a00.852 with only 35 images (25%), just " +
          "0.022 below its full-data score of 0.874. Performance generally improves " +
          "as more training images are added. Random " +
          "Forest achieves IoU\u00a0=\u00a00.848 at 25% but dips to 0.826 at " +
          "50% before recovering to 0.850 at 100%. This slight variation is likely " +
          "due to the random selection of training images: the particular 50% subset " +
          "may have underrepresented harder growth stages or certain year-to-year " +
          "variation within the available training pool. Overall, both methods " +
          "perform well even with limited training data, which is useful in practice " +
          "since annotating field images is time-consuming."
        ),

        // ── V. DISCUSSION ────────────────────────────────────────────────────
        h1("Discussion"),

        h2("A", "Method Comparison and Practical Guidance"),
        body(
          "The three methods form a clear performance hierarchy: U-Net (IoU 0.874) " +
          "> Random Forest (0.850) > Watershed (0.415). However, this ordering " +
          "should be interpreted in context. On early-season February images, the " +
          "Watershed method reaches IoU\u00a00.713 with no training at all, though " +
          "the learning-based methods score much higher (IoU\u00a00.977 each). " +
          "For operators who only need to process early-growth images where wheat is " +
          "clearly green against bare soil, Method 1 may be sufficient without " +
          "the overhead of collecting labelled data."
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
          "Method 1\u2019s failure follows a clear seasonal direction. " +
          "In February, wheat shoots cover only ~2% of the image against bare soil, " +
          "giving the watershed algorithm a clear spectral contrast for reliable seed placement. " +
          "By May, two factors combine: plant coverage rises to ~57% (less background " +
          "to seed from), and background ExG rises as weeds or other ground cover " +
          "develop between wheat rows, making many background pixels spectrally similar " +
          "to plant pixels. This spectral overlap, combined with less available " +
          "background area, makes seed placement unreliable and causes the watershed " +
          "to flood incorrectly. A possible remedy would be to supplement ExG with " +
          "texture features that remain discriminative even when colour cues overlap."
        ),
        body(
          "The worst-performing test image for Methods 2 and 3 is from 17 May 2017 " +
          "(IoU\u00a0\u22480.680 for Random Forest, \u22480.688 for U-Net). " +
          "Inspection reveals dense overlapping leaves and heavy internal shadows " +
          "creating a complex foreground that looks quite different from earlier " +
          "training images. Both methods also struggle with strongly shadowed " +
          "boundary regions. These issues could be improved by adding more augmentation " +
          "during training, such as rotations and perspective changes."
        ),

        h2("C", "Robustness Improvement Analysis"),
        body(
          "The M3-R experiment shows a direct connection between testing and improvement: " +
          "the robustness results showed that extreme contrast reduction was U-Net's " +
          "main weakness, so we added contrast distortions to the training augmentation " +
          "and IoU improved by +0.166. The remaining issue is that M3-R performs worse " +
          "under brightness changes despite brightness reduction already being included " +
          "in its distortion augmentation (factor\u00a0\u223c[0.35,\u00a00.75]). A " +
          "likely cause is that brightness reduction is only one of four distortion " +
          "types applied randomly during training, so the network sees relatively few " +
          "brightness-reduced examples compared to what is needed to fully compensate."
        ),
        body(
          "The trade-off is that M3-R scores slightly lower on clean images " +
          "(0.874 \u2192 0.861) and on brightness distortions. This suggests that " +
          "adding more types of augmentation during training could help cover more " +
          "distortion conditions without sacrificing clean performance."
        ),

        h2("D", "Limitations"),
        body(
          "Several limitations of the current work deserve attention. First, the " +
          "U-Net used here is deliberately lightweight (base channels\u00a0=\u00a016, " +
          "\u223c490K parameters) to support CPU-only training; larger architectures " +
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
          "We compared three different approaches to wheat segmentation on the EWS dataset. The classical Watershed method, while " +
          "parameter-free and fast, suffers a severe seasonal failure as monthly " +
          "average IoU declines from 0.713 (February) to 0.272 (May), making it " +
          "unsuitable for full-season deployment. The Random Forest classifier with " +
          "a 26-dimensional handcrafted feature set achieves IoU\u00a0=\u00a00.850 " +
          "and remains competitive with as few as 35 training images. The lightweight " +
          "U-Net achieves the best performance (IoU\u00a0=\u00a00.874, F1\u00a0=\u00a0" +
          "0.931) with substantially faster inference (0.028\u00a0s/image)."
        ),
        body(
          "Additional analysis showed that seasonal performance drops gradually for " +
          "Methods 2 and 3 (Method 2 drops by 0.21, Method 3 by 0.18, from February to May), " +
          "but neither fails as severely as Method 1. The robustness experiments " +
          "identified extreme contrast reduction as the main weakness of U-Net. " +
          "Training with distortion augmentation (M3-R) directly improved this, " +
          "raising IoU from 0.596 to 0.762 (+0.166)."
        ),
        body(
          "Limitations include the small dataset and the fact that the seasonal " +
          "analysis is based on a single 2017 test season, the lightweight " +
          "U-Net architecture chosen for CPU training, and the use of synthetic " +
          "distortions rather than real captured degradations. " +
          "Future work could explore larger U-Net models, more diverse augmentation " +
          "strategies, and testing on datasets from different crops or locations."
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
          "[8]\tJ. Long, E. Shelhamer, and T. Darrell, \u201cFully convolutional networks for semantic segmentation,\u201d in Proc. CVPR, 2015, pp. 3431\u20133440.",
          "[9]\tP. Virtanen et al., \u201cSciPy 1.0: Fundamental algorithms for scientific computing in Python,\u201d Nat. Methods, vol. 17, pp. 261\u2013272, 2020.",
          "[10]\tG. Bradski, \u201cThe OpenCV library,\u201d Dr. Dobb\u2019s J. Softw. Tools, 2000.",
          "[11]\tF. Pedregosa et al., \u201cScikit-learn: Machine learning in Python,\u201d J. Mach. Learn. Res., vol. 12, pp. 2825\u20132830, 2011.",
          "[12]\tA. Paszke et al., \u201cPyTorch: An imperative style, high-performance deep learning library,\u201d in Proc. NeurIPS, 2019, pp. 8024\u20138035.",
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
