import {
    applySlideBackground,
    addSlideTitle,
    addAccentLine,
    getColors,
    getTypography,
    safeArray
} from "../renderHelpers.mjs";


// =========================================================
// PROCESS HORIZONTAL
// =========================================================
//
// slideType:
//      process
//
// layoutId:
//      process-horizontal
//
// Canonical content:
//
// content: {
//
//     process: {
//
//         steps: [
//             {
//                 stepNumber: "integer",
//                 title: "string",
//                 description: "string"
//             }
//         ]
//
//     }
//
// }
//
// Purpose:
//
// Displays a short ordered process horizontally.
//
// This layout is intended for approximately 2–5 steps.
//
// The renderer does NOT:
// - invent steps
// - reorder steps
// - generate step numbers
// - rewrite titles
// - rewrite descriptions
//
// =========================================================

export const renderProcessHorizontal = ({
    slide,
    slideData,
    tokens,
    pptx
}) => {

    // =====================================================
    // 1. BACKGROUND
    // =====================================================

    applySlideBackground(
        slide,
        tokens
    );


    const colors =
        getColors(tokens);


    const typography =
        getTypography(tokens);


    // =====================================================
    // 2. TITLE
    // =====================================================

    addSlideTitle(
        slide,
        slideData.title,
        tokens
    );


    addAccentLine(
        slide,
        pptx,
        tokens,
        {
            x: 0.72,
            y: 1.22,
            w: 0.75
        }
    );


    // =====================================================
    // 3. PROCESS DATA
    // =====================================================

    const steps =
        normalizeSteps(
            slideData
                ?.content
                ?.process
                ?.steps
        )
        .slice(0, 5);


    // =====================================================
    // 4. EMPTY STATE
    // =====================================================

    if (
        steps.length === 0
    ) {

        renderEmptyState(
            slide,
            colors,
            typography
        );

        return slide;

    }


    // =====================================================
    // 5. LAYOUT GEOMETRY
    // =====================================================

    const startX =
        1.15;


    const endX =
        12.18;


    const nodeY =
        3.05;


    const usableWidth =
        endX -
        startX;


    const spacing =
        steps.length > 1
            ? usableWidth /
              (steps.length - 1)
            : 0;


    // =====================================================
    // 6. CONNECTING LINE
    // =====================================================

    if (
        steps.length > 1
    ) {

        slide.addShape(
            pptx.ShapeType.line,
            {
                x:
                    startX,

                y:
                    nodeY +
                    0.31,

                w:
                    usableWidth,

                h:
                    0,

                line: {
                    color:
                        colors.border,

                    width:
                        1.5
                }
            }
        );

    }


    // =====================================================
    // 7. STEPS
    // =====================================================

    steps.forEach(
        (
            step,
            index
        ) => {

            const centerX =
                steps.length === 1
                    ? 6.665
                    : startX +
                      index *
                      spacing;


            renderStep(
                {
                    slide,
                    pptx,
                    colors,
                    typography,
                    step,
                    index,
                    centerX,
                    nodeY,
                    totalSteps:
                        steps.length
                }
            );

        }
    );


    return slide;

};


// =========================================================
// NORMALIZE STEPS
// =========================================================

const normalizeSteps = (
    rawSteps
) => {

    return safeArray(
        rawSteps
    )
        .filter(
            (step) => {

                return (
                    step &&
                    typeof step ===
                        "object" &&
                    !Array.isArray(
                        step
                    )
                );

            }
        )
        .map(
            (step) => {

                const stepNumber =
                    normalizeStepNumber(
                        step.stepNumber
                    );


                const title =
                    normalizeText(
                        step.title
                    );


                const description =
                    normalizeText(
                        step.description
                    );


                return {
                    stepNumber,
                    title,
                    description
                };

            }
        )
        .filter(
            (step) => {

                return (
                    step.stepNumber !==
                        null &&
                    step.title
                );

            }
        );

};


// =========================================================
// NORMALIZE STEP NUMBER
// =========================================================

const normalizeStepNumber = (
    value
) => {

    const number =
        Number(value);


    if (
        !Number.isInteger(
            number
        ) ||
        number < 1
    ) {

        return null;

    }


    return number;

};


// =========================================================
// NORMALIZE TEXT
// =========================================================

const normalizeText = (
    value
) => {

    if (
        typeof value !== "string"
    ) {

        return "";

    }


    return value.trim();

};


// =========================================================
// RENDER STEP
// =========================================================

const renderStep = ({
    slide,
    pptx,
    colors,
    typography,
    step,
    index,
    centerX,
    nodeY,
    totalSteps
}) => {

    // =====================================================
    // NODE
    // =====================================================

    slide.addShape(
        pptx.ShapeType.ellipse,
        {
            x:
                centerX -
                0.31,

            y:
                nodeY,

            w:
                0.62,

            h:
                0.62,

            fill: {
                color:
                    index === 0
                        ? colors.accentPrimary
                        : colors.surface
            },

            line: {
                color:
                    colors.accentPrimary,

                width:
                    1.5
            }
        }
    );


    // =====================================================
    // STEP NUMBER
    // =====================================================

    slide.addText(
        String(
            step.stepNumber
        ),
        {
            x:
                centerX -
                0.31,

            y:
                nodeY,

            w:
                0.62,

            h:
                0.62,

            fontFace:
                typography.bodyFamily,

            fontSize:
                11,

            bold:
                true,

            color:
                index === 0
                    ? colors.background
                    : colors.accentPrimary,

            align:
                "center",

            valign:
                "mid",

            margin:
                0,

            fit:
                "shrink"
        }
    );


    // =====================================================
    // TITLE
    // =====================================================

    const textWidth =
        totalSteps >= 5
            ? 1.95
            : 2.15;


    slide.addText(
        step.title,
        {
            x:
                centerX -
                textWidth / 2,

            y:
                4.05,

            w:
                textWidth,

            h:
                0.52,

            fontFace:
                typography.headingFamily,

            fontSize:
                totalSteps >= 5
                    ? 11
                    : 12,

            bold:
                true,

            color:
                colors.textPrimary,

            align:
                "center",

            valign:
                "mid",

            margin:
                0,

            fit:
                "shrink"
        }
    );


    // =====================================================
    // DESCRIPTION
    // =====================================================

    if (
        step.description
    ) {

        slide.addText(
            step.description,
            {
                x:
                    centerX -
                    textWidth / 2,

                y:
                    4.72,

                w:
                    textWidth,

                h:
                    1.05,

                fontFace:
                    typography.bodyFamily,

                fontSize:
                    totalSteps >= 5
                        ? 8.8
                        : 9.5,

                color:
                    colors.textSecondary,

                align:
                    "center",

                valign:
                    "top",

                margin:
                    0,

                fit:
                    "shrink"
            }
        );

    }

};


// =========================================================
// EMPTY STATE
// =========================================================

const renderEmptyState = (
    slide,
    colors,
    typography
) => {

    slide.addText(
        "Process data is unavailable.",
        {
            x:
                0.8,

            y:
                3.3,

            w:
                11.7,

            h:
                0.5,

            fontFace:
                typography.bodyFamily,

            fontSize:
                12,

            color:
                colors.textMuted,

            align:
                "center",

            margin:
                0
        }
    );

};