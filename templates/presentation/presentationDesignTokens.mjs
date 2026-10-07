// =========================================================
// PRESENTATION DESIGN TOKENS
// =========================================================
//
// Design tokens define the actual visual language used by
// presentation themes.
//
// They control:
// - colors
// - typography
// - geometry
// - effects
// - imagery treatment
// - chart colors
// - composition
//
// A design token set does NOT determine slide structure.
// Layouts determine structure.
// Tokens determine visual appearance.
// =========================================================


export const presentationDesignTokens = {


    // =====================================================
    // SCHOLARLY CLEAN
    // =====================================================

    "scholarly-clean": {

        defaultVariant: "ivory-journal",

        variants: {

            // -------------------------------------------------
            // IVORY JOURNAL
            // -------------------------------------------------

            "ivory-journal": {

                description:
                    "An elegant academic visual system inspired by scholarly journals, research publications and refined editorial design.",

                colors: {

                    canvas: "#F7F4ED",

                    surface: "#FFFFFF",

                    surfaceAlt: "#EEEAE1",

                    primary: "#17324D",

                    secondary: "#486581",

                    accent: "#A66A3F",

                    text: "#18212B",

                    textMuted: "#65717D",

                    border: "#D8D2C7",

                    positive: "#39745A",

                    warning: "#A36A22",

                    negative: "#A44747",

                    chartPalette: [
                        "#17324D",
                        "#A66A3F",
                        "#567D6A",
                        "#687D9C",
                        "#B28B5E",
                        "#7D6B86"
                    ]
                },

                typography: {

                    displayFamily: "Georgia",

                    headingFamily: "Georgia",

                    bodyFamily: "Arial",

                    numericFamily: "Arial",

                    displayWeight: 700,

                    headingWeight: 700,

                    bodyWeight: 400,

                    scale: {

                        display: 34,

                        h1: 28,

                        h2: 22,

                        body: 16,

                        caption: 11

                    }
                },

                geometry: {

                    radius: 6,

                    cardRadius: 8,

                    borderWidth: 1,

                    cardStyle: "editorial",

                    lineStyle: "fine"
                },

                effects: {

                    shadow: "subtle",

                    gradient: "none",

                    glow: "none",

                    overlay: "soft"
                },

                imagery: {

                    treatment: "natural",

                    cropStyle: "structured",

                    overlayStyle: "light",

                    borderTreatment: "fine"
                },

                composition: {

                    whitespace: "generous",

                    alignmentBias: "left",

                    density: "moderate",

                    titleScale: "large",

                    visualWeight: "balanced"
                }
            },


            // -------------------------------------------------
            // MIDNIGHT RESEARCH
            // -------------------------------------------------

            "midnight-research": {

                description:
                    "A sophisticated dark academic theme for scientific presentations, research defenses and technical material requiring stronger visual contrast.",

                colors: {

                    canvas: "#101820",

                    surface: "#17232E",

                    surfaceAlt: "#20303D",

                    primary: "#DCE8F2",

                    secondary: "#93AFC3",

                    accent: "#D6A85F",

                    text: "#F4F7F9",

                    textMuted: "#AAB8C3",

                    border: "#344653",

                    positive: "#72B899",

                    warning: "#E0B46C",

                    negative: "#D77A7A",

                    chartPalette: [
                        "#D6A85F",
                        "#6EA7C7",
                        "#72B899",
                        "#A58BC2",
                        "#D98273",
                        "#A9B9C7"
                    ]
                },

                typography: {

                    displayFamily: "Georgia",

                    headingFamily: "Georgia",

                    bodyFamily: "Arial",

                    numericFamily: "Arial",

                    displayWeight: 700,

                    headingWeight: 700,

                    bodyWeight: 400,

                    scale: {

                        display: 34,

                        h1: 28,

                        h2: 22,

                        body: 16,

                        caption: 11
                    }
                },

                geometry: {

                    radius: 6,

                    cardRadius: 8,

                    borderWidth: 1,

                    cardStyle: "outlined",

                    lineStyle: "fine"
                },

                effects: {

                    shadow: "none",

                    gradient: "subtle",

                    glow: "none",

                    overlay: "dark"
                },

                imagery: {

                    treatment: "high-contrast",

                    cropStyle: "structured",

                    overlayStyle: "dark",

                    borderTreatment: "fine"
                },

                composition: {

                    whitespace: "generous",

                    alignmentBias: "left",

                    density: "moderate",

                    titleScale: "large",

                    visualWeight: "balanced"
                }
            }
        }
    },


    // =====================================================
    // CORPORATE MODERN
    // =====================================================

    "corporate-modern": {

        defaultVariant: "slate-blue",

        variants: {

            "slate-blue": {

                description:
                    "A crisp contemporary corporate system combining deep navy, cool blue and restrained cyan accents.",

                colors: {

                    canvas: "#F4F7FA",

                    surface: "#FFFFFF",

                    surfaceAlt: "#EAF0F5",

                    primary: "#173B57",

                    secondary: "#356A8A",

                    accent: "#1F9BB6",

                    text: "#17232D",

                    textMuted: "#657784",

                    border: "#D7E0E6",

                    positive: "#31866B",

                    warning: "#B27B2C",

                    negative: "#B64D55",

                    chartPalette: [
                        "#173B57",
                        "#1F9BB6",
                        "#547FA0",
                        "#43A383",
                        "#D39B4A",
                        "#826FA6"
                    ]
                },

                typography: {

                    displayFamily: "Arial",

                    headingFamily: "Arial",

                    bodyFamily: "Arial",

                    numericFamily: "Arial",

                    displayWeight: 700,

                    headingWeight: 700,

                    bodyWeight: 400,

                    scale: {

                        display: 36,

                        h1: 28,

                        h2: 21,

                        body: 15,

                        caption: 11
                    }
                },

                geometry: {

                    radius: 8,

                    cardRadius: 10,

                    borderWidth: 1,

                    cardStyle: "clean",

                    lineStyle: "precise"
                },

                effects: {

                    shadow: "soft",

                    gradient: "subtle",

                    glow: "none",

                    overlay: "clean"
                },

                imagery: {

                    treatment: "professional",

                    cropStyle: "geometric",

                    overlayStyle: "brand-tinted",

                    borderTreatment: "none"
                },

                composition: {

                    whitespace: "balanced",

                    alignmentBias: "left",

                    density: "moderate",

                    titleScale: "large",

                    visualWeight: "structured"
                }
            }
        }
    },


    // =====================================================
    // EXECUTIVE MINIMAL
    // =====================================================

    "executive-minimal": {

        defaultVariant: "obsidian-gold",

        variants: {

            "obsidian-gold": {

                description:
                    "A premium executive visual system using deep charcoal surfaces, warm metallic accents and highly restrained composition.",

                colors: {

                    canvas: "#111111",

                    surface: "#1A1A1A",

                    surfaceAlt: "#242424",

                    primary: "#F1E8D5",

                    secondary: "#B9B0A0",

                    accent: "#C9A55A",

                    text: "#F7F4EE",

                    textMuted: "#AAA59B",

                    border: "#373737",

                    positive: "#76A987",

                    warning: "#D2AD62",

                    negative: "#C46B6B",

                    chartPalette: [
                        "#C9A55A",
                        "#E4D4AE",
                        "#7796A6",
                        "#789780",
                        "#A78396",
                        "#9C9589"
                    ]
                },

                typography: {

                    displayFamily: "Arial",

                    headingFamily: "Arial",

                    bodyFamily: "Arial",

                    numericFamily: "Arial",

                    displayWeight: 700,

                    headingWeight: 600,

                    bodyWeight: 400,

                    scale: {

                        display: 42,

                        h1: 30,

                        h2: 21,

                        body: 15,

                        caption: 10
                    }
                },

                geometry: {

                    radius: 2,

                    cardRadius: 4,

                    borderWidth: 1,

                    cardStyle: "minimal",

                    lineStyle: "fine"
                },

                effects: {

                    shadow: "none",

                    gradient: "none",

                    glow: "none",

                    overlay: "dark-premium"
                },

                imagery: {

                    treatment: "cinematic",

                    cropStyle: "large",

                    overlayStyle: "dark",

                    borderTreatment: "none"
                },

                composition: {

                    whitespace: "very-generous",

                    alignmentBias: "left",

                    density: "low",

                    titleScale: "very-large",

                    visualWeight: "statement-led"
                }
            },


            "ivory-charcoal": {

                description:
                    "A light executive theme combining warm ivory backgrounds, charcoal typography and restrained bronze accents.",

                colors: {

                    canvas: "#F5F1E8",

                    surface: "#FCFAF5",

                    surfaceAlt: "#EAE4D8",

                    primary: "#242424",

                    secondary: "#55514B",

                    accent: "#9D743E",

                    text: "#202020",

                    textMuted: "#716C64",

                    border: "#D7D0C4",

                    positive: "#557760",

                    warning: "#9C733B",

                    negative: "#9B5555",

                    chartPalette: [
                        "#242424",
                        "#9D743E",
                        "#657A88",
                        "#627A69",
                        "#8D687A",
                        "#B1A28C"
                    ]
                },

                typography: {

                    displayFamily: "Georgia",

                    headingFamily: "Arial",

                    bodyFamily: "Arial",

                    numericFamily: "Arial",

                    displayWeight: 700,

                    headingWeight: 600,

                    bodyWeight: 400,

                    scale: {

                        display: 42,

                        h1: 30,

                        h2: 21,

                        body: 15,

                        caption: 10
                    }
                },

                geometry: {

                    radius: 2,

                    cardRadius: 4,

                    borderWidth: 1,

                    cardStyle: "minimal",

                    lineStyle: "fine"
                },

                effects: {

                    shadow: "none",

                    gradient: "none",

                    glow: "none",

                    overlay: "warm"
                },

                imagery: {

                    treatment: "editorial",

                    cropStyle: "large",

                    overlayStyle: "warm",

                    borderTreatment: "none"
                },

                composition: {

                    whitespace: "very-generous",

                    alignmentBias: "left",

                    density: "low",

                    titleScale: "very-large",

                    visualWeight: "statement-led"
                }
            }
        }
    },


    // =====================================================
    // STARTUP BOLD
    // =====================================================

    "startup-bold": {

        defaultVariant: "electric-violet",

        variants: {

            "electric-violet": {

                description:
                    "A high-energy technology-oriented visual system combining deep near-black surfaces with electric violet and cyan accents.",

                colors: {

                    canvas: "#0C0B14",

                    surface: "#171525",

                    surfaceAlt: "#211D35",

                    primary: "#F4F1FF",

                    secondary: "#BEB5D8",

                    accent: "#8B5CF6",

                    accentAlt: "#22D3EE",

                    text: "#F8F7FC",

                    textMuted: "#AAA3BC",

                    border: "#302B45",

                    positive: "#4DD4A8",

                    warning: "#F0B95C",

                    negative: "#EF7185",

                    chartPalette: [
                        "#8B5CF6",
                        "#22D3EE",
                        "#4DD4A8",
                        "#F0B95C",
                        "#EF7185",
                        "#C084FC"
                    ]
                },

                typography: {

                    displayFamily: "Arial",

                    headingFamily: "Arial",

                    bodyFamily: "Arial",

                    numericFamily: "Arial",

                    displayWeight: 800,

                    headingWeight: 700,

                    bodyWeight: 400,

                    scale: {

                        display: 44,

                        h1: 32,

                        h2: 22,

                        body: 15,

                        caption: 10
                    }
                },

                geometry: {

                    radius: 14,

                    cardRadius: 16,

                    borderWidth: 1,

                    cardStyle: "floating",

                    lineStyle: "dynamic"
                },

                effects: {

                    shadow: "deep",

                    gradient: "vibrant",

                    glow: "controlled",

                    overlay: "dramatic"
                },

                imagery: {

                    treatment: "immersive",

                    cropStyle: "dynamic",

                    overlayStyle: "gradient",

                    borderTreatment: "none"
                },

                composition: {

                    whitespace: "generous",

                    alignmentBias: "dynamic",

                    density: "low",

                    titleScale: "very-large",

                    visualWeight: "high-impact"
                }
            },


            "midnight-cyan": {

                description:
                    "A futuristic but disciplined startup visual system built around midnight blue, bright cyan and cool luminous accents.",

                colors: {

                    canvas: "#07151D",

                    surface: "#0D222D",

                    surfaceAlt: "#13313E",

                    primary: "#EAFBFF",

                    secondary: "#9EC4CE",

                    accent: "#21D4E5",

                    accentAlt: "#63F2C6",

                    text: "#F2FCFE",

                    textMuted: "#8EB0B8",

                    border: "#23434D",

                    positive: "#63F2C6",

                    warning: "#F0C76A",

                    negative: "#F27878",

                    chartPalette: [
                        "#21D4E5",
                        "#63F2C6",
                        "#75A7FF",
                        "#B48DF2",
                        "#F0C76A",
                        "#F27878"
                    ]
                },

                typography: {

                    displayFamily: "Arial",

                    headingFamily: "Arial",

                    bodyFamily: "Arial",

                    numericFamily: "Arial",

                    displayWeight: 800,

                    headingWeight: 700,

                    bodyWeight: 400,

                    scale: {

                        display: 44,

                        h1: 32,

                        h2: 22,

                        body: 15,

                        caption: 10
                    }
                },

                geometry: {

                    radius: 14,

                    cardRadius: 16,

                    borderWidth: 1,

                    cardStyle: "floating",

                    lineStyle: "dynamic"
                },

                effects: {

                    shadow: "deep",

                    gradient: "luminous",

                    glow: "controlled",

                    overlay: "dramatic"
                },

                imagery: {

                    treatment: "immersive",

                    cropStyle: "dynamic",

                    overlayStyle: "cool-gradient",

                    borderTreatment: "none"
                },

                composition: {

                    whitespace: "generous",

                    alignmentBias: "dynamic",

                    density: "low",

                    titleScale: "very-large",

                    visualWeight: "high-impact"
                }
            }
        }
    },


    // =====================================================
    // PROPOSAL PERSUASIVE
    // =====================================================

    "proposal-persuasive": {

        defaultVariant: "warm-confidence",

        variants: {

            "warm-confidence": {

                description:
                    "A polished persuasive system using warm neutrals, confident green and amber accents to emphasize benefits, trust and action.",

                colors: {

                    canvas: "#FAF7F2",

                    surface: "#FFFFFF",

                    surfaceAlt: "#F0EBE3",

                    primary: "#183D35",

                    secondary: "#49665F",

                    accent: "#D78A3D",

                    text: "#202A27",

                    textMuted: "#68746F",

                    border: "#DED8CE",

                    positive: "#398264",

                    warning: "#C78436",

                    negative: "#B75656",

                    chartPalette: [
                        "#183D35",
                        "#D78A3D",
                        "#4D8A78",
                        "#6686A3",
                        "#B36F76",
                        "#A39363"
                    ]
                },

                typography: {

                    displayFamily: "Arial",

                    headingFamily: "Arial",

                    bodyFamily: "Arial",

                    numericFamily: "Arial",

                    displayWeight: 700,

                    headingWeight: 700,

                    bodyWeight: 400,

                    scale: {

                        display: 38,

                        h1: 29,

                        h2: 21,

                        body: 15,

                        caption: 11
                    }
                },

                geometry: {

                    radius: 10,

                    cardRadius: 12,

                    borderWidth: 1,

                    cardStyle: "polished",

                    lineStyle: "clean"
                },

                effects: {

                    shadow: "soft",

                    gradient: "subtle",

                    glow: "none",

                    overlay: "warm"
                },

                imagery: {

                    treatment: "human-centered",

                    cropStyle: "balanced",

                    overlayStyle: "warm",

                    borderTreatment: "soft"
                },

                composition: {

                    whitespace: "balanced",

                    alignmentBias: "left",

                    density: "moderate",

                    titleScale: "large",

                    visualWeight: "benefit-led"
                }
            }
        }
    },


    // =====================================================
    // PROJECT STRUCTURED
    // =====================================================

    "project-structured": {

        defaultVariant: "modular-teal",

        variants: {

            "modular-teal": {

                description:
                    "A modular project-management visual system using structured surfaces, functional teal accents and clear phase differentiation.",

                colors: {

                    canvas: "#F3F7F7",

                    surface: "#FFFFFF",

                    surfaceAlt: "#E7F0EF",

                    primary: "#174A4A",

                    secondary: "#497373",

                    accent: "#2B9A91",

                    text: "#1D2B2B",

                    textMuted: "#647777",

                    border: "#D2E0DE",

                    positive: "#3C8A68",

                    warning: "#C78A3E",

                    negative: "#B75B5B",

                    chartPalette: [
                        "#174A4A",
                        "#2B9A91",
                        "#5E86A1",
                        "#77A45B",
                        "#D09A4E",
                        "#8D72A6"
                    ]
                },

                typography: {

                    displayFamily: "Arial",

                    headingFamily: "Arial",

                    bodyFamily: "Arial",

                    numericFamily: "Arial",

                    displayWeight: 700,

                    headingWeight: 700,

                    bodyWeight: 400,

                    scale: {

                        display: 36,

                        h1: 28,

                        h2: 21,

                        body: 15,

                        caption: 11
                    }
                },

                geometry: {

                    radius: 8,

                    cardRadius: 8,

                    borderWidth: 1,

                    cardStyle: "modular",

                    lineStyle: "functional"
                },

                effects: {

                    shadow: "subtle",

                    gradient: "none",

                    glow: "none",

                    overlay: "clean"
                },

                imagery: {

                    treatment: "supporting",

                    cropStyle: "structured",

                    overlayStyle: "minimal",

                    borderTreatment: "clean"
                },

                composition: {

                    whitespace: "balanced",

                    alignmentBias: "grid",

                    density: "moderate",

                    titleScale: "large",

                    visualWeight: "structured"
                }
            }
        }
    },


    // =====================================================
    // ANALYTICAL DATA
    // =====================================================

    "analytical-data": {

        defaultVariant: "precision-light",

        variants: {

            "precision-light": {

                description:
                    "A data-first analytical theme with neutral surfaces, disciplined blue accents and a chart palette optimized for categorical distinction.",

                colors: {

                    canvas: "#F6F8FA",

                    surface: "#FFFFFF",

                    surfaceAlt: "#EDF1F4",

                    primary: "#1D405C",

                    secondary: "#557188",

                    accent: "#2878A5",

                    text: "#17242E",

                    textMuted: "#697985",

                    border: "#D8E0E5",

                    positive: "#338466",

                    warning: "#B78233",

                    negative: "#B84E57",

                    chartPalette: [
                        "#2878A5",
                        "#D17A3F",
                        "#3D9474",
                        "#826FB0",
                        "#C25365",
                        "#6B8798"
                    ]
                },

                typography: {

                    displayFamily: "Arial",

                    headingFamily: "Arial",

                    bodyFamily: "Arial",

                    numericFamily: "Arial",

                    displayWeight: 700,

                    headingWeight: 700,

                    bodyWeight: 400,

                    scale: {

                        display: 36,

                        h1: 28,

                        h2: 21,

                        body: 14,

                        caption: 10
                    }
                },

                geometry: {

                    radius: 4,

                    cardRadius: 6,

                    borderWidth: 1,

                    cardStyle: "analytical",

                    lineStyle: "precise"
                },

                effects: {

                    shadow: "minimal",

                    gradient: "none",

                    glow: "none",

                    overlay: "neutral"
                },

                imagery: {

                    treatment: "data-supporting",

                    cropStyle: "structured",

                    overlayStyle: "minimal",

                    borderTreatment: "fine"
                },

                composition: {

                    whitespace: "balanced",

                    alignmentBias: "grid",

                    density: "moderate-high",

                    titleScale: "medium",

                    visualWeight: "data-first"
                }
            }
        }
    },


    // =====================================================
    // CREATIVE EDITORIAL
    // =====================================================

    "creative-editorial": {

        defaultVariant: "coral-ink",

        variants: {

            "coral-ink": {

                description:
                    "An expressive editorial visual system combining warm paper tones, deep ink typography and vivid coral accents.",

                colors: {

                    canvas: "#F4EFE8",

                    surface: "#FFFDFC",

                    surfaceAlt: "#E9E0D7",

                    primary: "#171719",

                    secondary: "#555158",

                    accent: "#EF6351",

                    accentAlt: "#536DFE",

                    text: "#171719",

                    textMuted: "#777077",

                    border: "#D8CEC4",

                    positive: "#54826A",

                    warning: "#C98A42",

                    negative: "#C34E4E",

                    chartPalette: [
                        "#EF6351",
                        "#536DFE",
                        "#171719",
                        "#4E8C74",
                        "#D79A45",
                        "#9868A8"
                    ]
                },

                typography: {

                    displayFamily: "Georgia",

                    headingFamily: "Arial",

                    bodyFamily: "Arial",

                    numericFamily: "Arial",

                    displayWeight: 700,

                    headingWeight: 700,

                    bodyWeight: 400,

                    scale: {

                        display: 46,

                        h1: 32,

                        h2: 22,

                        body: 15,

                        caption: 10
                    }
                },

                geometry: {

                    radius: 0,

                    cardRadius: 2,

                    borderWidth: 1,

                    cardStyle: "editorial",

                    lineStyle: "expressive"
                },

                effects: {

                    shadow: "none",

                    gradient: "none",

                    glow: "none",

                    overlay: "editorial"
                },

                imagery: {

                    treatment: "dominant",

                    cropStyle: "asymmetric",

                    overlayStyle: "editorial",

                    borderTreatment: "none"
                },

                composition: {

                    whitespace: "very-generous",

                    alignmentBias: "asymmetric",

                    density: "low",

                    titleScale: "very-large",

                    visualWeight: "image-led"
                }
            }
        }
    },


    // =====================================================
    // PROFESSIONAL NEUTRAL
    // =====================================================

    "professional-neutral": {

        defaultVariant: "graphite-sage",

        variants: {

            "graphite-sage": {

                description:
                    "A sophisticated general-purpose system combining graphite typography, soft neutral surfaces and restrained sage accents.",

                colors: {

                    canvas: "#F5F6F3",

                    surface: "#FFFFFF",

                    surfaceAlt: "#E9ECE7",

                    primary: "#293330",

                    secondary: "#5F6D68",

                    accent: "#6F8F7B",

                    text: "#202724",

                    textMuted: "#6C7772",

                    border: "#D9DED9",

                    positive: "#568069",

                    warning: "#AD7B3F",

                    negative: "#A85454",

                    chartPalette: [
                        "#293330",
                        "#6F8F7B",
                        "#65849A",
                        "#B08450",
                        "#9A6C83",
                        "#889078"
                    ]
                },

                typography: {

                    displayFamily: "Arial",

                    headingFamily: "Arial",

                    bodyFamily: "Arial",

                    numericFamily: "Arial",

                    displayWeight: 700,

                    headingWeight: 700,

                    bodyWeight: 400,

                    scale: {

                        display: 36,

                        h1: 28,

                        h2: 21,

                        body: 15,

                        caption: 11
                    }
                },

                geometry: {

                    radius: 8,

                    cardRadius: 10,

                    borderWidth: 1,

                    cardStyle: "balanced",

                    lineStyle: "clean"
                },

                effects: {

                    shadow: "subtle",

                    gradient: "none",

                    glow: "none",

                    overlay: "neutral"
                },

                imagery: {

                    treatment: "natural",

                    cropStyle: "balanced",

                    overlayStyle: "minimal",

                    borderTreatment: "clean"
                },

                composition: {

                    whitespace: "balanced",

                    alignmentBias: "left",

                    density: "moderate",

                    titleScale: "large",

                    visualWeight: "balanced"
                }
            }
        }
    }

};


// =========================================================
// GET DESIGN TOKENS
// =========================================================

export const getPresentationDesignTokens = (
    themeId,
    variantId
) => {

    const theme =
        presentationDesignTokens[themeId];


    if (!theme) {

        throw new Error(
            `Presentation design tokens not found for theme: ${themeId}`
        );

    }


    const selectedVariant =
        variantId || theme.defaultVariant;


    const tokens =
        theme.variants[selectedVariant];


    if (!tokens) {

        throw new Error(
            `Variant "${selectedVariant}" not found for theme "${themeId}"`
        );

    }


    return {
        themeId,
        variantId: selectedVariant,
        ...tokens
    };

};