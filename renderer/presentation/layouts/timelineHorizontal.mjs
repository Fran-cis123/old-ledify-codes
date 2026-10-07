import {
    applySlideBackground,
    addSlideTitle,
    addAccentLine,
    getColors,
    getTypography,
    safeArray
} from "../renderHelpers.mjs";


// =========================================================
// TIMELINE HORIZONTAL
// =========================================================
//
// slideType:
//      timeline
//
// layoutId:
//      timeline-horizontal
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
// Purpose:
//
// Displays chronological events horizontally.
//
// The renderer only displays information already supplied
// through the canonical timeline schema.
//
// It does NOT:
// - invent dates
// - invent events
// - infer chronology
// - rewrite event titles
// - manufacture missing descriptions
//
// =========================================================

export const renderTimelineHorizontal = ({
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
    // 3. TIMELINE EVENTS
    // =====================================================

    const events =
        normalizeEvents(
            slideData
                ?.content
                ?.timeline
                ?.events
        )
        .slice(0, 6);


    // =====================================================
    // 4. EMPTY STATE
    // =====================================================

    if (
        events.length === 0
    ) {

        renderEmptyState(
            slide,
            colors,
            typography
        );

        return slide;

    }


    // =====================================================
    // 5. TIMELINE GEOMETRY
    // =====================================================

    const startX =
        1.05;


    const endX =
        12.28;


    const timelineY =
        3.35;


    const usableWidth =
        endX -
        startX;


    const spacing =
        events.length > 1
            ? usableWidth /
              (events.length - 1)
            : 0;


    // =====================================================
    // 6. MAIN TIMELINE LINE
    // =====================================================

    if (
        events.length > 1
    ) {

        slide.addShape(
            pptx.ShapeType.line,
            {
                x:
                    startX,

                y:
                    timelineY,

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
    // 7. EVENTS
    // =====================================================

    events.forEach(
        (
            event,
            index
        ) => {

            const centerX =
                events.length === 1
                    ? 6.665
                    : startX +
                      index *
                      spacing;


            renderTimelineEvent(
                {
                    slide,
                    pptx,
                    colors,
                    typography,
                    event,
                    index,
                    centerX,
                    timelineY,
                    totalEvents:
                        events.length
                }
            );

        }
    );


    return slide;

};


// =========================================================
// NORMALIZE EVENTS
// =========================================================

const normalizeEvents = (
    rawEvents
) => {

    return safeArray(
        rawEvents
    )
        .filter(
            (event) => {

                return (
                    event &&
                    typeof event === "object" &&
                    !Array.isArray(event)
                );

            }
        )
        .map(
            (event) => {

                return {

                    label:
                        normalizeText(
                            event.label
                        ),

                    title:
                        normalizeText(
                            event.title
                        ),

                    description:
                        normalizeText(
                            event.description
                        )

                };

            }
        )
        .filter(
            (event) => {

                return Boolean(
                    event.title
                );

            }
        );

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
// RENDER TIMELINE EVENT
// =========================================================

const renderTimelineEvent = ({
    slide,
    pptx,
    colors,
    typography,
    event,
    index,
    centerX,
    timelineY,
    totalEvents
}) => {

    const nodeSize =
        0.32;


    const textWidth =
        totalEvents >= 5
            ? 1.75
            : 2.05;


    // =====================================================
    // NODE
    // =====================================================

    slide.addShape(
        pptx.ShapeType.ellipse,
        {
            x:
                centerX -
                nodeSize / 2,

            y:
                timelineY -
                nodeSize / 2,

            w:
                nodeSize,

            h:
                nodeSize,

            fill: {
                color:
                    index % 2 === 0
                        ? colors.accentPrimary
                        : colors.accentSecondary
            },

            line: {
                color:
                    colors.background,

                width:
                    1
            }
        }
    );


    // =====================================================
    // LABEL
    // =====================================================

    if (
        event.label
    ) {

        slide.addText(
            event.label,
            {
                x:
                    centerX -
                    textWidth / 2,

                y:
                    2.15,

                w:
                    textWidth,

                h:
                    0.38,

                fontFace:
                    typography.bodyFamily,

                fontSize:
                    totalEvents >= 5
                        ? 8
                        : 9,

                bold:
                    true,

                color:
                    index % 2 === 0
                        ? colors.accentPrimary
                        : colors.accentSecondary,

                align:
                    "center",

                margin:
                    0,

                fit:
                    "shrink"
            }
        );

    }


    // =====================================================
    // CONNECTOR
    // =====================================================

    slide.addShape(
        pptx.ShapeType.line,
        {
            x:
                centerX,

            y:
                timelineY +
                nodeSize / 2,

            w:
                0,

            h:
                0.42,

            line: {
                color:
                    colors.border,

                width:
                    1
            }
        }
    );


    // =====================================================
    // EVENT TITLE
    // =====================================================

    slide.addText(
        event.title,
        {
            x:
                centerX -
                textWidth / 2,

            y:
                4.05,

            w:
                textWidth,

            h:
                0.55,

            fontFace:
                typography.headingFamily,

            fontSize:
                totalEvents >= 5
                    ? 10.5
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
        event.description
    ) {

        slide.addText(
            event.description,
            {
                x:
                    centerX -
                    textWidth / 2,

                y:
                    4.78,

                w:
                    textWidth,

                h:
                    1.15,

                fontFace:
                    typography.bodyFamily,

                fontSize:
                    totalEvents >= 5
                        ? 8.3
                        : 9.2,

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
        "Timeline data is unavailable.",
        {
            x:
                0.8,

            y:
                3.25,

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