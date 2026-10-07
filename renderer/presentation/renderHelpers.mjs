// =========================================================
// PRESENTATION RENDER HELPERS
// =========================================================
//
// Shared low-level rendering utilities.
//
// IMPORTANT:
//
// presentationDesignTokens.mjs uses semantic design names:
//
// colors.canvas
// colors.surface
// colors.surfaceAlt
// colors.primary
// colors.secondary
// colors.accent
// colors.text
// colors.textMuted
// colors.border
//
// typography.scale.display
// typography.scale.h1
// typography.scale.h2
// typography.scale.body
// typography.scale.caption
//
// Individual layout renderers should NOT need to know
// the exact token schema.
//
// This helper layer normalizes the design-token system
// into a stable renderer-facing API.
//
// =========================================================


// =========================================================
// SLIDE SIZE
// =========================================================
//
// Standard PowerPoint widescreen dimensions.
//
// =========================================================

export const SLIDE = {

    width: 13.333,

    height: 7.5

};


// =========================================================
// NORMALIZE COLOR
// =========================================================
//
// PptxGenJS expects hexadecimal colors without "#".
//
// "#17324D"
//      ↓
// "17324D"
//
// =========================================================

export const normalizeColor = (
    color,
    fallback = "000000"
) => {

    if (!color) {
        return fallback;
    }


    return String(color)
        .replace("#", "")
        .trim();

};


// =========================================================
// GET COLORS
// =========================================================
//
// This is the translation layer between:
//
// presentationDesignTokens.mjs
//
// and
//
// the layout renderers.
//
// Layout renderers can therefore consistently request:
//
// background
// surface
// surfaceSecondary
// textPrimary
// textSecondary
// textMuted
// accentPrimary
// accentSecondary
// border
//
// without knowing how the original theme stores them.
//
// =========================================================

export const getColors = (
    tokens
) => {

    const colors =
        tokens?.colors || {};


    return {

        // -------------------------------------------------
        // BACKGROUND
        // -------------------------------------------------

        background:
            normalizeColor(
                colors.canvas ||
                colors.background,
                "FFFFFF"
            ),


        // -------------------------------------------------
        // SURFACES
        // -------------------------------------------------

        surface:
            normalizeColor(
                colors.surface,
                "F5F5F5"
            ),


        surfaceSecondary:
            normalizeColor(
                colors.surfaceAlt ||
                colors.surfaceSecondary ||
                colors.surface,
                "EEEEEE"
            ),


        // -------------------------------------------------
        // TEXT
        // -------------------------------------------------

        textPrimary:
            normalizeColor(
                colors.text ||
                colors.textPrimary,
                "111111"
            ),


        textSecondary:
            normalizeColor(
                colors.textMuted ||
                colors.textSecondary ||
                colors.secondary ||
                colors.text,
                "555555"
            ),


        textMuted:
            normalizeColor(
                colors.textMuted ||
                colors.textSecondary,
                "777777"
            ),


        // -------------------------------------------------
        // ACCENTS
        // -------------------------------------------------

        accentPrimary:
            normalizeColor(
                colors.accent ||
                colors.accentPrimary ||
                colors.primary,
                "3366FF"
            ),


        accentSecondary:
            normalizeColor(
                colors.secondary ||
                colors.accentSecondary ||
                colors.primary,
                "7C3AED"
            ),


        // -------------------------------------------------
        // BRAND / SEMANTIC COLORS
        // -------------------------------------------------
        //
        // These are exposed as well because future
        // renderers may need stronger semantic distinction.
        //
        // -------------------------------------------------

        primary:
            normalizeColor(
                colors.primary ||
                colors.accent ||
                colors.text,
                "17324D"
            ),


        secondary:
            normalizeColor(
                colors.secondary ||
                colors.primary,
                "486581"
            ),


        accent:
            normalizeColor(
                colors.accent ||
                colors.primary,
                "A66A3F"
            ),


        // -------------------------------------------------
        // BORDER
        // -------------------------------------------------

        border:
            normalizeColor(
                colors.border,
                "DDDDDD"
            )

    };

};


// =========================================================
// GET TYPOGRAPHY
// =========================================================
//
// Converts the actual typography token structure:
//
// typography.scale.display
// typography.scale.h1
// typography.scale.h2
// typography.scale.body
// typography.scale.caption
//
// into the names expected by layout renderers.
//
// =========================================================

export const getTypography = (
    tokens
) => {

    const typography =
        tokens?.typography || {};


    const scale =
        typography?.scale || {};


    return {

        // -------------------------------------------------
        // FONT FAMILIES
        // -------------------------------------------------

        displayFamily:
            typography.displayFamily ||
            typography.headingFamily ||
            typography.bodyFamily ||
            "Arial",


        headingFamily:
            typography.headingFamily ||
            typography.displayFamily ||
            typography.bodyFamily ||
            "Arial",


        bodyFamily:
            typography.bodyFamily ||
            typography.headingFamily ||
            "Arial",


        // -------------------------------------------------
        // FONT SIZES
        // -------------------------------------------------

        displaySize:
            scale.display ??
            typography?.display?.size ??
            typography?.displaySize ??
            34,


        titleSize:
            scale.h1 ??
            typography?.title?.size ??
            typography?.titleSize ??
            28,


        headingSize:
            scale.h2 ??
            typography?.heading?.size ??
            typography?.headingSize ??
            22,


        subheadingSize:
            scale.h3 ??
            typography?.subheading?.size ??
            typography?.subheadingSize ??
            18,


        bodySize:
            scale.body ??
            typography?.body?.size ??
            typography?.bodySize ??
            16,


        captionSize:
            scale.caption ??
            typography?.caption?.size ??
            typography?.captionSize ??
            11,


        statisticSize:
            scale.display ??
            typography?.statistic?.size ??
            typography?.statisticSize ??
            34,


        // -------------------------------------------------
        // OPTIONAL TYPOGRAPHY CHARACTERISTICS
        // -------------------------------------------------

        headingWeight:
            typography.headingWeight ||
            typography?.weights?.heading ||
            "bold",


        bodyWeight:
            typography.bodyWeight ||
            typography?.weights?.body ||
            "normal",


        lineHeight:
            typography.lineHeight ||
            typography?.body?.lineHeight ||
            1.2

    };

};


// =========================================================
// GET GEOMETRY
// =========================================================
//
// Provides normalized access to geometry tokens.
//
// Not every layout uses these yet, but exposing them here
// means future refinements can use the theme's geometry
// without reading the raw token structure directly.
//
// =========================================================

export const getGeometry = (
    tokens
) => {

    const geometry =
        tokens?.geometry || {};


    return {

        cornerRadius:
            geometry.cornerRadius ??
            geometry.radius ??
            0.08,


        cardRadius:
            geometry.cardRadius ??
            geometry.cornerRadius ??
            geometry.radius ??
            0.08,


        borderWidth:
            geometry.borderWidth ??
            1,


        contentPadding:
            geometry.contentPadding ??
            0.3,


        sectionGap:
            geometry.sectionGap ??
            0.25

    };

};


// =========================================================
// GET EFFECTS
// =========================================================
//
// Central access point for visual effects.
//
// We intentionally keep this conservative because
// PowerPoint effects can become visually excessive quickly.
//
// =========================================================

export const getEffects = (
    tokens
) => {

    const effects =
        tokens?.effects || {};


    return {

        shadow:
            effects.shadow ??
            false,


        transparency:
            effects.transparency ??
            0,


        cardTransparency:
            effects.cardTransparency ??
            0

    };

};


// =========================================================
// APPLY SLIDE BACKGROUND
// =========================================================

export const applySlideBackground = (
    slide,
    tokens
) => {

    const colors =
        getColors(tokens);


    slide.background = {

        color:
            colors.background

    };

};


// =========================================================
// ADD SLIDE TITLE
// =========================================================

export const addSlideTitle = (
    slide,
    title,
    tokens,
    options = {}
) => {

    if (!title) {
        return;
    }


    const colors =
        getColors(tokens);


    const typography =
        getTypography(tokens);


    slide.addText(
        title,
        {

            x:
                options.x ??
                0.72,

            y:
                options.y ??
                0.5,

            w:
                options.w ??
                11.85,

            h:
                options.h ??
                0.62,

            fontFace:
                options.fontFace ??
                typography.headingFamily,

            fontSize:
                options.fontSize ??
                typography.headingSize,

            bold:
                options.bold ??
                true,

            color:
                options.color ??
                colors.textPrimary,

            margin: 0,

            breakLine: false,

            valign:
                options.valign ??
                "mid",

            align:
                options.align ??
                "left",

            fit:
                "shrink"

        }
    );

};


// =========================================================
// ADD BODY TEXT
// =========================================================

export const addBodyText = (
    slide,
    text,
    tokens,
    options = {}
) => {

    if (!text) {
        return;
    }


    const colors =
        getColors(tokens);


    const typography =
        getTypography(tokens);


    slide.addText(
        text,
        {

            x:
                options.x ??
                0.72,

            y:
                options.y ??
                1.4,

            w:
                options.w ??
                5.5,

            h:
                options.h ??
                4,

            fontFace:
                options.fontFace ??
                typography.bodyFamily,

            fontSize:
                options.fontSize ??
                typography.bodySize,

            color:
                options.color ??
                colors.textSecondary,

            bold:
                options.bold ??
                false,

            margin:
                options.margin ??
                0,

            valign:
                options.valign ??
                "top",

            align:
                options.align ??
                "left",

            breakLine: false,

            fit:
                "shrink",

            paraSpaceAfterPt:
                options.paraSpaceAfterPt ??
                8

        }
    );

};


// =========================================================
// ADD ACCENT LINE
// =========================================================

export const addAccentLine = (
    slide,
    pptx,
    tokens,
    options = {}
) => {

    if (!pptx) {

        throw new Error(
            "PowerPoint instance is required to draw an accent line"
        );

    }


    const colors =
        getColors(tokens);


    slide.addShape(
        pptx.ShapeType.rect,
        {

            x:
                options.x ??
                0.72,

            y:
                options.y ??
                1.22,

            w:
                options.w ??
                0.75,

            h:
                options.h ??
                0.055,

            line: {

                color:
                    options.color ??
                    colors.accentPrimary,

                transparency: 100

            },

            fill: {

                color:
                    options.color ??
                    colors.accentPrimary

            }

        }
    );

};


// =========================================================
// ADD CARD
// =========================================================

export const addCard = (
    slide,
    pptx,
    tokens,
    options = {}
) => {

    if (!pptx) {

        throw new Error(
            "PowerPoint instance is required to draw a card"
        );

    }


    const colors =
        getColors(tokens);


    const geometry =
        getGeometry(tokens);


    const effects =
        getEffects(tokens);


    slide.addShape(
        pptx.ShapeType.roundRect,
        {

            x:
                options.x,

            y:
                options.y,

            w:
                options.w,

            h:
                options.h,

            rectRadius:
                options.radius ??
                geometry.cardRadius,

            fill: {

                color:
                    options.fillColor ??
                    colors.surface,

                transparency:
                    options.transparency ??
                    effects.cardTransparency

            },

            line: {

                color:
                    options.borderColor ??
                    colors.border,

                width:
                    options.borderWidth ??
                    geometry.borderWidth

            }

        }
    );

};


// =========================================================
// ADD CARD TITLE
// =========================================================

export const addCardTitle = (
    slide,
    title,
    tokens,
    options = {}
) => {

    if (!title) {
        return;
    }


    const colors =
        getColors(tokens);


    const typography =
        getTypography(tokens);


    slide.addText(
        title,
        {

            x:
                options.x,

            y:
                options.y,

            w:
                options.w,

            h:
                options.h ??
                0.35,

            fontFace:
                options.fontFace ??
                typography.headingFamily,

            fontSize:
                options.fontSize ??
                15,

            bold:
                options.bold ??
                true,

            color:
                options.color ??
                colors.textPrimary,

            margin: 0,

            align:
                options.align ??
                "left",

            valign:
                options.valign ??
                "mid",

            fit:
                "shrink"

        }
    );

};


// =========================================================
// SAFE ARRAY
// =========================================================
//
// Prevents renderer crashes when optional AI-generated
// arrays are absent or malformed.
//
// =========================================================

export const safeArray = (
    value
) => {

    return Array.isArray(value)
        ? value
        : [];

};


// =========================================================
// CLAMP
// =========================================================

export const clamp = (
    value,
    min,
    max
) => {

    return Math.min(
        Math.max(
            value,
            min
        ),
        max
    );

};


// =========================================================
// SAFE TEXT
// =========================================================
//
// Converts unknown values into renderer-safe strings.
//
// Useful because AI output may occasionally contain
// numbers, nulls or unexpected primitive values.
//
// =========================================================

export const safeText = (
    value,
    fallback = ""
) => {

    if (
        value === null ||
        value === undefined
    ) {

        return fallback;

    }


    if (
        typeof value === "string"
    ) {

        return value;

    }


    if (
        typeof value === "number" ||
        typeof value === "boolean"
    ) {

        return String(value);

    }


    return fallback;

};


// =========================================================
// HAS TEXT
// =========================================================

export const hasText = (
    value
) => {

    return (
        typeof value === "string" &&
        value.trim().length > 0
    );

};