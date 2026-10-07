import {
    applySlideBackground,
    addSlideTitle,
    addAccentLine,
    addCard,
    getColors,
    getTypography,
    safeArray
} from "../renderHelpers.mjs";


// =========================================================
// ROADMAP PHASES
// =========================================================
//
// slideType:
//      roadmap
//
// layoutId:
//      roadmap-phases
//
// Canonical content:
//
// content: {
//
//     timeline: {
//
//         events: [
//             {
//                 label: "string",
//                 title: "string",
//                 description: "string"
//             }
//         ]
//
//     }
//
// }
//
// Interpretation for roadmap:
//
// label
//      → phase period / stage marker
//
// title
//      → phase title
//
// description
//      → phase explanation
//
// =========================================================

export const renderRoadmapPhases = ({
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
    // 2. CANONICAL ROADMAP CONTENT
    // =====================================================

    const phases =
        safeArray(
            slideData?.content
                ?.timeline
                ?.events
        )
            .map(
                normalizePhase
            )
            .filter(
                hasMeaningfulPhase
            )
            .slice(
                0,
                5
            );


    // =====================================================
    // 3. TITLE
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
    // 4. EMPTY STATE
    // =====================================================

    if (
        phases.length === 0
    ) {

        renderEmptyState(
            slide,
            colors,
            typography
        );

        return slide;

    }


    // =====================================================
    // 5. ROADMAP GEOMETRY
    // =====================================================

    const startX =
        0.75;


    const totalWidth =
        11.83;


    const gap =
        0.16;


    const phaseWidth =
        (
            totalWidth -
            gap *
            (
                phases.length -
                1
            )
        ) /
        phases.length;


    // =====================================================
    // 6. RENDER PHASES
    // =====================================================

    phases.forEach(
        (
            phase,
            index
        ) => {

            const x =
                startX +
                index *
                (
                    phaseWidth +
                    gap
                );


            // =============================================
            // CARD
            // =============================================

            addCard(
                slide,
                pptx,
                tokens,
                {
                    x,
                    y: 1.78,
                    w: phaseWidth,
                    h: 4.72,

                    fillColor:
                        index % 2 === 0
                            ? colors.surface
                            : colors.surfaceSecondary
                }
            );


            // =============================================
            // TOP ACCENT
            // =============================================

            slide.addShape(
                pptx.ShapeType.rect,
                {
                    x,
                    y: 1.78,
                    w: phaseWidth,
                    h: 0.08,

                    line: {
                        transparency: 100
                    },

                    fill: {
                        color:
                            index % 2 === 0
                                ? colors.accentPrimary
                                : colors.accentSecondary
                    }
                }
            );


            // =============================================
            // PHASE NUMBER
            // =============================================

            slide.addText(
                String(
                    index + 1
                ).padStart(
                    2,
                    "0"
                ),
                {
                    x:
                        x +
                        0.25,

                    y:
                        2.12,

                    w:
                        0.55,

                    h:
                        0.32,

                    fontFace:
                        typography.headingFamily,

                    fontSize:
                        10,

                    bold:
                        true,

                    color:
                        index % 2 === 0
                            ? colors.accentPrimary
                            : colors.accentSecondary,

                    margin:
                        0
                }
            );


            // =============================================
            // PHASE LABEL
            // =============================================
            //
            // The canonical timeline schema calls this
            // "label".
            //
            // For a roadmap this can represent:
            //
            // Q1
            // Month 1
            // Phase I
            // Launch
            // Short term
            // etc.
            //
            // =============================================

            if (
                phase.label
            ) {

                slide.addText(
                    phase.label,
                    {
                        x:
                            x +
                            0.25,

                        y:
                            2.62,

                        w:
                            phaseWidth -
                            0.5,

                        h:
                            0.32,

                        fontFace:
                            typography.bodyFamily,

                        fontSize:
                            8.5,

                        bold:
                            true,

                        charSpacing:
                            0.5,

                        color:
                            colors.textMuted,

                        margin:
                            0,

                        fit:
                            "shrink"
                    }
                );

            }


            // =============================================
            // PHASE TITLE
            // =============================================

            slide.addText(
                phase.title,
                {
                    x:
                        x +
                        0.25,

                    y:
                        phase.label
                            ? 3.15
                            : 2.72,

                    w:
                        phaseWidth -
                        0.5,

                    h:
                        0.78,

                    fontFace:
                        typography.headingFamily,

                    fontSize:
                        phases.length >= 5
                            ? 13
                            : 15,

                    bold:
                        true,

                    color:
                        colors.textPrimary,

                    margin:
                        0,

                    fit:
                        "shrink"
                }
            );


            // =============================================
            // DIVIDER
            // =============================================

            slide.addShape(
                pptx.ShapeType.rect,
                {
                    x:
                        x +
                        0.25,

                    y:
                        4.12,

                    w:
                        Math.min(
                            0.6,
                            Math.max(
                                phaseWidth -
                                0.5,
                                0.25
                            )
                        ),

                    h:
                        0.045,

                    line: {
                        transparency: 100
                    },

                    fill: {
                        color:
                            index % 2 === 0
                                ? colors.accentPrimary
                                : colors.accentSecondary
                    }
                }
            );


            // =============================================
            // DESCRIPTION
            // =============================================

            if (
                phase.description
            ) {

                slide.addText(
                    phase.description,
                    {
                        x:
                            x +
                            0.25,

                        y:
                            4.45,

                        w:
                            phaseWidth -
                            0.5,

                        h:
                            1.45,

                        fontFace:
                            typography.bodyFamily,

                        fontSize:
                            phases.length >= 5
                                ? 8.5
                                : 9.5,

                        color:
                            colors.textSecondary,

                        margin:
                            0,

                        valign:
                            "top",

                        fit:
                            "shrink"
                    }
                );

            }


            // =============================================
            // PROGRESSION INDICATOR
            // =============================================

            if (
                index <
                phases.length - 1
            ) {

                slide.addShape(
                    pptx.ShapeType.chevron,
                    {
                        x:
                            x +
                            phaseWidth -
                            0.02,

                        y:
                            3.78,

                        w:
                            gap +
                            0.05,

                        h:
                            0.32,

                        fill: {
                            color:
                                colors.border
                        },

                        line: {
                            transparency: 100
                        }
                    }
                );

            }

        }
    );


    return slide;

};


// =========================================================
// NORMALIZE PHASE
// =========================================================

const normalizePhase = (
    event
) => {

    if (
        typeof event !== "object" ||
        event === null
    ) {

        return {
            label: "",
            title: "",
            description: ""
        };

    }


    return {

        label:
            safeString(
                event.label
            ),

        title:
            safeString(
                event.title
            ),

        description:
            safeString(
                event.description
            )

    };

};


// =========================================================
// MEANINGFUL PHASE CHECK
// =========================================================

const hasMeaningfulPhase = (
    phase
) => {

    return Boolean(
        phase.label ||
        phase.title ||
        phase.description
    );

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
        "Roadmap data is unavailable.",
        {
            x:
                0.8,

            y:
                3.2,

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


// =========================================================
// SAFE STRING
// =========================================================

const safeString = (
    value
) => {

    if (
        typeof value !== "string"
    ) {

        return "";

    }


    return value.trim();

};