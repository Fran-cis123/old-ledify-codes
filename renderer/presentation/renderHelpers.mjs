// Normalize theme tokens for the presentation renderer and visual assets.

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

export const getColors = (
    tokens
) => {
    const colors =
        tokens?.colors || {};
    return {
        background:
            normalizeColor(
                colors.canvas ||
                colors.background,
                "FFFFFF"
            ),
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
        border:
            normalizeColor(
                colors.border,
                "DDDDDD"
            )
    };
};

export const getTypography = (
    tokens
) => {
    const typography =
        tokens?.typography || {};
    const scale =
        typography?.scale || {};
    return {
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
