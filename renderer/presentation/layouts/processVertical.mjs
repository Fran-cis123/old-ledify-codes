import {
    applySlideBackground,
    addSlideTitle,
    addAccentLine,
    getColors,
    getTypography,
    safeArray
} from "../renderHelpers.mjs";


// =========================================================
// PROCESS VERTICAL
// =========================================================
//
// slideType:
//      process
//
// layoutId:
//      process-vertical
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
// Displays an ordered process vertically.
//
// This layout is intended for longer processes where a
// horizontal arrangement would become too compressed.
//
// The renderer does NOT:
// - invent steps
// - generate step numbers
// - rewrite titles
// - rewrite descriptions
// - infer missing process information
//
// =========================================================

export const renderProcessVertical = ({
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
        .slice(0, 7);


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

    const startY =
        1.65;


    const availableHeight =
        4.95;


    const rowHeight =
        availableHeight /
        steps.length;


    const spineX =
        1.2;


    // =====================================================
    // 6. VERTICAL SPINE
    // =====================================================

    if (
        steps.length > 1
    ) {

        const firstNodeCenterY =
            startY +
            rowHeight / 2;


        const lastNodeCenterY =
            startY +
            (
                steps.length - 1
            ) *
            rowHeight +
            rowHeight / 2;


        slide.addShape(
            pptx.ShapeType.line,
            {
                x:
                    spineX,

                y:
                    firstNodeCenterY,

                w:
                    0,

                h:
                    lastNodeCenterY -
                    firstNodeCenterY,

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
    // 7. PROCESS STEPS
    // =====================================================

    steps.forEach(
        (
            step,
            index
        ) => {

            const rowY =
                startY +
                index *
                rowHeight;


            const nodeCenterY =
                rowY +
                rowHeight / 2;


            renderStep(
                {
                    slide,
                    pptx,
                    colors,
                    typography,
                    step,
                    index,
                    rowY,
                    rowHeight,
                    nodeCenterY,
                    spineX,
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

                return {

                    stepNumber:
                        normalizeStepNumber(
                            step.stepNumber
                        ),

                    title:
                        normalizeText(
                            step.title
                        ),

                    description:
                        normalizeText(
                            step.description
                        )

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
    rowY,
    rowHeight,
    nodeCenterY,
    spineX,
    totalSteps
}) => {

    // =====================================================
    // NODE
    // =====================================================

    const nodeSize =
        totalSteps >= 6
            ? 0.44
            : 0.52;


    slide.addShape(
        pptx.ShapeType.ellipse,
        {
            x:
                spineX -
                nodeSize / 2,

            y:
                nodeCenterY -
                nodeSize / 2,

            w:
                nodeSize,

            h:
                nodeSize,

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
                    1.4
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
                spineX -
                nodeSize / 2,

            y:
                nodeCenterY -
                nodeSize / 2,

            w:
                nodeSize,

            h:
                nodeSize,

            fontFace:
                typography.bodyFamily,

            fontSize:
                totalSteps >= 6
                    ? 8
                    : 9,

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

    slide.addText(
        step.title,
        {
            x:
                1.8,

            y:
                rowY +
                0.08,

            w:
                3.25,

            h:
                Math.max(
                    rowHeight -
                    0.16,
                    0.38
                ),

            fontFace:
                typography.headingFamily,

            fontSize:
                totalSteps >= 6
                    ? 10.5
                    : 12,

            bold:
                true,

            color:
                colors.textPrimary,

            margin:
                0,

            valign:
                "mid",

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
                    5.25,

                y:
                    rowY +
                    0.08,

                w:
                    6.85,

                h:
                    Math.max(
                        rowHeight -
                        0.16,
                        0.38
                    ),

                fontFace:
                    typography.bodyFamily,

                fontSize:
                    totalSteps >= 6
                        ? 9
                        : 10,

                color:
                    colors.textSecondary,

                margin:
                    0,

                valign:
                    "mid",

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