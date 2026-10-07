import {
    GoogleGenAI,
    Type
} from "@google/genai";

import {
    presentationStrategies,
    presentationStrategyRules
} from "../templates/presentation/presentationStrategies.mjs";

import {
    slideTypes
} from "../templates/presentation/slideTypes.mjs";

import {
    slideContentSchemas
} from "../templates/presentation/slideContentSchemas.mjs";

import {
    inferredContextSchema
} from "../templates/shared/contextSchema.mjs";

import {
    validatePresentationContent
} from "./presentationContentValidator.mjs";


// =========================================================
// GEMINI CLIENT
// =========================================================

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});


// =========================================================
// AI SERVICE
// =========================================================

export const aiService = async (
    inputType,
    input,
    outputType,
    context = {}
) => {

    let outputInstructions = "";
    let outputSchema;
    let strategyInstructions = "";
    let presentationPlanSchema;


    // =====================================================
    // PRESENTATION
    // =====================================================

        if (outputType === "presentation") {

        const strategyIds =
            presentationStrategies.map(
                (strategy) => strategy.id
            );


        const slideTypeIds =
            slideTypes.map(
                (slideType) => slideType.id
            );


        presentationPlanSchema = {
            type: Type.OBJECT,

            properties: {
                outputType: {
                    type: Type.STRING,
                    enum: ["presentation"]
                },

                inferredContext:
                    inferredContextSchema,

                strategyId: {
                    type: Type.STRING,
                    enum: strategyIds
                },

                title: {
                    type: Type.STRING
                },

                subtitle: {
                    type: Type.STRING
                },

                slides: {
                    type: Type.ARRAY,
                    maxItems: 12,

                    items: {
                        type: Type.OBJECT,

                        properties: {
                            slideNumber: {
                                type: Type.INTEGER
                            },

                            slideType: {
                                type: Type.STRING,
                                enum: slideTypeIds
                            },

                            title: {
                                type: Type.STRING
                            },

                            subtitle: {
                                type: Type.STRING
                            }
                        },

                        required: [
                            "slideNumber",
                            "slideType",
                            "title"
                        ]
                    }
                }
            },

            required: [
                "outputType",
                "inferredContext",
                "strategyId",
                "title",
                "slides"
            ]
        };



        // =================================================
        // PRESENTATION STRATEGY CATALOG
        // =================================================

        const strategyCatalog =
            presentationStrategies
                .map((strategy) => {

                    return `
STRATEGY ID:
${strategy.id}

STRATEGY FAMILY:
${strategy.family}

DESCRIPTION:
${strategy.description}

COMMUNICATION GOAL:
${strategy.communicationGoal}

CONTENT PRIORITIES:
${strategy.contentPriorities
    .map((item) => `- ${item}`)
    .join("\n")}

NARRATIVE FLOW:
${strategy.narrativeFlow
    .map((item) => `- ${item}`)
    .join("\n")}

STYLE GUIDANCE:
${strategy.styleGuidance}

AVOID:
${strategy.avoid
    .map((item) => `- ${item}`)
    .join("\n")}
`;

                })
                .join(
                    "\n========================================\n"
                );


        // =================================================
        // SLIDE TYPE CATALOG
        // =================================================

        const slideTypeCatalog =
            slideTypes
                .map((slideType) => {

                    return `
SLIDE TYPE:
${slideType.id}

CATEGORY:
${slideType.category}

DESCRIPTION:
${slideType.description}

BEST FOR:
${slideType.bestFor
    .map((item) => `- ${item}`)
    .join("\n")}

CONTENT GUIDANCE:
${slideType.contentGuidance}
`;

                })
                .join(
                    "\n----------------------------------------\n"
                );


        // =================================================
        // CONTENT SCHEMA CATALOG
        // =================================================

        const contentSchemaCatalog =
            slideContentSchemas
                .map((schema) => {

                    return `
CONTENT SCHEMA:
${schema.id}

USED BY:
${schema.usedBy
    .map((item) => `- ${item}`)
    .join("\n")}

DESCRIPTION:
${schema.description}

STRUCTURE:
${JSON.stringify(
    schema.structure,
    null,
    2
)}
`;

                })
                .join(
                    "\n----------------------------------------\n"
                );


        // =================================================
        // GLOBAL STRATEGY RULES
        // =================================================

        const globalStrategyRules = `
STRATEGY PRINCIPLE:

${presentationStrategyRules.strategyPrinciple}

ADAPTATION RULES:

${presentationStrategyRules.adaptationRules
    .map((rule) => `- ${rule}`)
    .join("\n")}
`;


        // =================================================
        // PRESENTATION INTELLIGENCE
        // =================================================

        strategyInstructions = `

=========================================================
PRESENTATION STRATEGY SYSTEM
=========================================================

First determine which presentation strategy best fits the
user's actual communication objective.

Return the selected strategy through "strategyId".


STRATEGY SELECTION MUST CONSIDER:

- user's input
- supplied source material
- inferred context
- explicitly supplied context
- user's role when known
- purpose when known
- intended audience when known
- subject matter
- explicit instructions
- nature of the information being communicated


Do NOT select a strategy based only on user role.


Examples:

A student defending experimental research may require:

research-defense


A student pitching a startup may require:

startup-pitch


A manager introducing a new project may require:

project-kickoff


A department presenting organizational performance may require:

performance-report


Use "general-presentation" only when no specialized strategy
provides a meaningful fit.


=========================================================
HOW THE STRATEGY SHOULD BE USED
=========================================================

The selected strategy should influence:

- information prioritization
- narrative progression
- terminology
- depth
- emphasis
- slide organization
- professional tone


IMPORTANT:

The presentation strategy is NOT a fixed slide template.

The narrativeFlow is guidance.

It is NOT a mandatory slide list.

You may:

- omit irrelevant stages
- combine related stages
- expand important stages
- reorder stages when appropriate
- adapt presentation length
- follow explicit user requirements


${globalStrategyRules}


AVAILABLE PRESENTATION STRATEGIES:

${strategyCatalog}


=========================================================
SEMANTIC SLIDE TYPE SYSTEM
=========================================================

After selecting the presentation strategy, assign every slide
an appropriate semantic "slideType".


PRESENTATION STRATEGY
= communication approach for the entire presentation.


SLIDE TYPE
= communication function of one slide.


CONTENT STRUCTURE
= structured information required by that slide.


VISUAL TEMPLATE
= how the application will later render that information.


Choose slide types based on the actual communication need.

Do NOT select slide types merely for visual variety.

Do NOT use a specialized slide type unless the available
information actually supports it.


AVAILABLE SLIDE TYPES:

${slideTypeCatalog}


=========================================================
SLIDE CONTENT STRUCTURE SYSTEM
=========================================================

After selecting the slideType, populate ONLY the content
structure associated with that slide type.

The slideType and content MUST agree.

Use the following canonical mapping:

title
→ content.titleContent

section-divider
→ content.sectionContent

agenda
→ content.items

key-points
→ content.items

recommendation
→ content.items

next-steps
→ content.items

focused-explanation
→ content.textContent

text-visual
→ content.visualContent

cards
→ content.cards

comparison
→ content.comparison

relationship
→ content.relationship

process
→ content.process

timeline
→ content.timeline

roadmap
→ content.roadmap

statistics
→ content.statistics

data-chart
→ content.chart

table
→ content.table

quote
→ content.quote

case-study
→ content.caseStudy

call-to-action
→ content.callToAction

summary
→ content.summary

conclusion
→ content.conclusion


EXAMPLES OF STRUCTURAL SHAPE ONLY:


PROCESS:

{
    "slideType": "process",
    "content": {
        "process": {
            "steps": []
        }
    }
}


CARDS:

{
    "slideType": "cards",
    "content": {
        "cards": []
    }
}


COMPARISON:

{
    "slideType": "comparison",
    "content": {
        "comparison": {
            "items": []
        }
    }
}


DATA CHART:

{
    "slideType": "data-chart",
    "content": {
        "chart": {
            "chartType": "bar",
            "labels": [],
            "datasets": [],
            "insight": ""
        }
    }
}


STATISTICS:

{
    "slideType": "statistics",
    "content": {
        "statistics": []
    }
}


TIMELINE:

{
    "slideType": "timeline",
    "content": {
        "timeline": {
            "events": []
        }
    }
}


ROADMAP:

{
    "slideType": "roadmap",
    "content": {
        "roadmap": {
            "phases": []
        }
    }
}


IMPORTANT:

Populate ONLY the content structure relevant to the selected
slide type.

Do not fill unrelated structures.

Do not populate several content structures on the same slide
merely because the output schema technically permits them.


AVAILABLE CONTENT STRUCTURES:

${contentSchemaCatalog}


=========================================================
CRITICAL PRESENTATION WRITING PRINCIPLE
=========================================================

A presentation is NOT a document divided into slides.

Visible slide content must be concise, scannable and designed
for visual communication.

Do NOT write essay paragraphs on slides.

Do NOT use a slide as a container for everything you know
about the subject.

Each slide should communicate ONE primary idea.

Prefer:

- short headings
- concise statements
- compact key points
- short card descriptions
- meaningful labels
- visual structures
- comparisons
- processes
- diagrams
- genuine charts when supported by data

Avoid:

- long paragraphs
- essay-style explanations
- excessive text
- repeated explanations
- unnecessary background information
- verbose headings
- verbose labels
- multiple unrelated ideas on one slide


=========================================================
FIELD-LEVEL CONTENT BUDGETS
=========================================================

These limits are mandatory presentation-writing constraints.

They are MAXIMUM limits, not targets.

Use fewer words whenever the idea can be communicated clearly
with fewer words.


PRESENTATION TITLE:

Prefer 3-12 words.

A genuine supplied research title, project title, company name,
product name or other proper title may exceed this when
shortening it would change its identity or meaning.


PRESENTATION SUBTITLE:

Maximum approximately 15 words.


SLIDE TITLE:

Maximum approximately 10 words.

A genuine supplied section title may remain slightly longer
when necessary.


SLIDE SUBTITLE:

Maximum approximately 15 words.


TITLE CONTENT:

title:
Prefer 3-12 words.

subtitle:
Maximum approximately 15 words.

supportingText:
Maximum approximately 20 words.


SECTION DIVIDER:

title:
Maximum approximately 8 words.

subtitle:
Maximum approximately 15 words.

Section-divider slides should remain minimal.


LIST ITEMS:

Used by:
- agenda
- key-points
- recommendation
- next-steps

title:
Maximum approximately 7 words.

description:
Maximum approximately 18 words.


FOCUSED EXPLANATION:

heading:
Maximum approximately 10 words.

body:
Maximum approximately 45 words.

Prefer approximately 20-35 words.


TEXT + VISUAL:

text:
Maximum approximately 40 words.

visual description:
Maximum approximately 20 words.

searchQuery:
Use a short practical visual search phrase.


CARD:

title:
Maximum approximately 7 words.

description:
Maximum approximately 22 words.


COMPARISON:

label:
Maximum approximately 7 words.

Each comparison point:
Maximum approximately 12 words.


RELATIONSHIP:

node label:
Maximum approximately 6 words.

node description:
Maximum approximately 15 words.

relationship label:
Maximum approximately 6 words.


PROCESS:

step title:
Maximum approximately 6 words.

step description:
Maximum approximately 18 words.


TIMELINE:

event label:
Keep concise.

event title:
Maximum approximately 7 words.

event description:
Maximum approximately 18 words.


ROADMAP:

phase label:
Keep concise.

phase title:
Maximum approximately 7 words.

phase description:
Maximum approximately 18 words.


STATISTICS:

label:
Maximum approximately 8 words.

context:
Maximum approximately 15 words.


CHART:

dataset label:
Maximum approximately 8 words.

insight:
Maximum approximately 30 words.


TABLE:

Keep individual cell text concise.

Prefer fewer than approximately 15 words per cell.


QUOTE:

Do not manufacture quotations.

If a genuine quotation is supplied, preserve its factual
meaning.

Do not unnecessarily use long quotations as slide content.

context:
Keep concise.


CASE STUDY:

context:
Maximum approximately 25 words.

challenge:
Maximum approximately 25 words.

action:
Maximum approximately 25 words.

outcome:
Maximum approximately 25 words.

lesson:
Maximum approximately 20 words.


SUMMARY:

statement:
Maximum approximately 25 words.

Each summary point:
Maximum approximately 15 words.


CONCLUSION:

statement:
Maximum approximately 25 words.

Each supporting point:
Maximum approximately 15 words.


CALL TO ACTION:

action:
Maximum approximately 8 words.

supportingText:
Maximum approximately 25 words.


=========================================================
COLLECTION SIZE LIMITS
=========================================================

Do not overcrowd slides.

Unless the supplied material genuinely requires otherwise:

LIST ITEMS:
Use approximately 3-5 items.

CARDS:
Use approximately 2-6 cards.

PROCESS:
Use approximately 3-6 steps.

COMPARISON:
Prefer 2-4 comparison groups.

Each comparison group should normally contain no more than
approximately 4 concise points.

RELATIONSHIP:
Prefer approximately 3-7 nodes.

TIMELINE:
Prefer approximately 3-6 events.

ROADMAP:
Prefer approximately 3-6 phases.

STATISTICS:
Prefer approximately 2-5 statistics.

TABLE:
Prefer a compact table suitable for a presentation slide.

SUMMARY:
Prefer approximately 3-5 points.

CONCLUSION:
Prefer approximately 1-4 supporting points.


=========================================================
SLIDE-LEVEL CONTENT BUDGET
=========================================================

Every slide has a finite visual space.

The total visible text on a normal content slide should usually
remain below approximately 100 words.

Most slides should contain substantially less.

A slide with several cards, list items, process steps or other
visual elements should use even less text per element.

Do not compensate for having many elements by writing long
descriptions inside each element.

If information cannot fit clearly on one slide:

- prioritize the most important information
- split the subject logically across slides when justified
- summarize supporting detail
- remove redundant explanation

Never shrink the communication quality merely to preserve
all available text.


=========================================================
NO SPEAKER NOTES
=========================================================

Do NOT generate speaker notes.

Do NOT generate presenter notes.

Do NOT generate hidden explanatory notes.

Do NOT create additional detailed content intended to sit
outside the visible slide.

All generated presentation content must serve the actual
presentation structure.


=========================================================
TOPIC GROUNDING
=========================================================

This section is mandatory.

The presentation must remain grounded in the CENTRAL TOPIC
of the user's request or supplied source material.

First identify the central topic through inferredContext.topic.

Then use that topic as a semantic anchor for the entire
presentation.

Every slide must have a clear relationship to:

- the central topic
- the selected presentation strategy
- the user's purpose
- the source material when supplied

Do NOT introduce an unrelated domain merely because it appears
in examples, instructions, strategy catalogs, schema descriptions
or model knowledge.

Examples contained in these instructions exist only to explain
the system.

NEVER copy example subject matter into the user's output.


=========================================================
ANTI-TOPIC-DRIFT RULES
=========================================================

Before creating each slide, internally verify:

1. What is the central topic?

2. What communication purpose does this slide serve?

3. What supplied information supports this slide?

4. Does this slide directly contribute to the requested
   presentation?

If the slide cannot be justified by the user's topic, purpose,
source material or legitimate general explanation of that topic,
do not create it.

Do NOT change subject halfway through the presentation.

Do NOT introduce unrelated terminology.

Do NOT introduce unrelated industries.

Do NOT introduce unrelated research fields.

Do NOT use content from examples as presentation material.

Do NOT fill missing information with material from an unrelated
domain.


=========================================================
RELEVANCE HIERARCHY
=========================================================

When deciding what information belongs in the presentation,
use this priority:

1. Explicit user instructions.

2. User-supplied source material.

3. Explicit context supplied by the user.

4. Information directly necessary to explain the central topic.

5. General knowledge that genuinely supports the central topic.

Information that is merely interesting but not useful to the
presentation should be omitted.


=========================================================
REPETITION CONTROL
=========================================================

Do not repeat the same sentence, phrase, heading or explanation
across multiple fields.

Do not generate repetitive keyword chains.

Do not generate headings containing repeated variations of the
same idea.

Do not repeat the slide title inside every item unless necessary.

Do not restate identical information across consecutive slides.

Each slide should advance the presentation.

If a field begins becoming repetitive, stop and rewrite it as
one concise statement.


=========================================================
MALFORMED CONTENT PREVENTION
=========================================================

Never generate:

- keyword spam
- repeated phrase chains
- sentence fragments repeated many times
- excessively long headings
- headings containing multiple paragraphs
- descriptions containing unrelated topics
- content created merely to fill schema fields
- duplicated slides
- empty filler language

Every generated field must have a clear communication function.


=========================================================
SOURCE GROUNDING AND DATA INTEGRITY
=========================================================

The presentation must distinguish between:

1. USER-SUPPLIED FACTS

2. RELIABLE GENERAL BACKGROUND KNOWLEDGE

3. UNSUPPORTED SPECIFIC CLAIMS


=========================================================
USER-SUPPLIED FACTS
=========================================================

Information explicitly contained in:

- the user's prompt
- an uploaded file
- extracted URL content
- explicitly supplied context

may be reorganized, summarized, clarified and presented as
factual content.

Preserve its factual meaning.


=========================================================
GENERAL BACKGROUND KNOWLEDGE
=========================================================

General knowledge may be used when it is genuinely necessary
to explain or develop the central topic.

It must be information the model can reliably support.

Examples include:

- definitions
- established concepts
- general mechanisms
- general background explanations
- broadly accepted principles
- educational context
- standard professional practices

General knowledge must be:

- relevant
- reliable
- appropriately framed
- distinguishable from user-specific evidence when necessary

Do not use uncertain or speculative information as established
fact.

General knowledge MUST NOT be transformed into a claim about
the user's specific:

- research
- experiment
- organization
- dataset
- project
- product
- customers
- financial performance
- source material

For example:

A general scientific mechanism may be explained as background.

But do NOT claim that the user's study demonstrated that
mechanism unless their supplied material actually supports it.


=========================================================
UNSUPPORTED SPECIFIC CLAIMS
=========================================================

Never invent specific factual information merely to complete
a presentation.

This applies across ALL domains.

Do not fabricate:

- research findings
- experimental results
- measurements
- percentages
- statistics
- sample sizes
- treatment groups
- experimental methods
- laboratory methods
- biomarkers
- measured variables
- doses
- exposure durations
- dates
- numerical values
- statistical significance
- citations
- references
- quotations
- named studies
- customer numbers
- revenue
- financial figures
- market share
- business performance
- survey results
- product performance
- conversion rates
- growth figures
- user counts
- awards
- partnerships
- certifications
- historical events attributed to the user
- organization-specific facts
- project-specific outcomes


=========================================================
CLAIM CLASSIFICATION CHECK
=========================================================

Before generating a factual statement, internally classify it
as one of the following:

A. SUPPLIED FACT

Directly supported by user input or supplied source material.


B. RELIABLE GENERAL KNOWLEDGE

Reliable general information that genuinely helps explain or
develop the user's requested topic.


C. PROPOSED OR CREATIVE CONTENT

A recommendation, concept, strategy, hypothetical feature,
proposed plan, suggested positioning, fictional scenario or
other original content appropriate to the user's request.


D. UNSUPPORTED SPECIFIC CLAIM

A specific factual claim about the user's study, business,
organization, dataset, product, project, customers, performance
or source material that has not been supplied.


You may generate A.

You may generate B when relevant and reliable.

You may generate C when the task permits creative or proposed
content, but it must not be disguised as verified fact.

You MUST NOT generate D.


=========================================================
RESEARCH-SPECIFIC GROUNDING
=========================================================

For research, academic, scientific, experimental or analytical
requests, NEVER invent study-specific information.

Study-specific information includes, but is not limited to:

- research objectives
- research questions
- hypotheses
- methodology
- study design
- experimental design
- sample size
- study population
- animal species or strain
- treatment groups
- control groups
- exposure groups
- doses
- concentrations
- routes of administration
- exposure duration
- treatment duration
- sampling procedures
- laboratory procedures
- assays
- staining methods
- instruments
- biomarkers
- genes
- proteins
- biochemical measurements
- statistical tests
- analytical techniques
- software used for analysis
- experimental endpoints
- measured variables
- independent variables
- dependent variables
- research findings
- observations
- experimental results
- measurements
- percentages
- numerical values
- statistical significance
- p-values
- confidence intervals
- correlations
- interpretations attributed to the study
- study conclusions
- study recommendations

A concept being scientifically plausible does NOT mean the
user's study used or observed it.

Do not infer a methodology merely because it would be common
for that type of research.

Do not infer measured biomarkers merely because they are
relevant to the topic.

Do not infer findings merely because they are biologically
plausible.

Do not infer objectives merely because they would make sense
for the research topic.


=========================================================
MISSING USER-SPECIFIC INFORMATION
=========================================================

If requested content requires specific factual information
about the user's study, business, organization, project,
dataset, product or other real entity and that information has
not been supplied:

DO NOT fabricate it.

DO NOT manufacture plausible metrics.

DO NOT invent outcomes.

DO NOT silently convert general knowledge into user-specific
evidence.

Use the information that is genuinely available.

When an important requested section cannot be factually
populated, represent the missing information honestly and
concisely.

Do not create unnecessary placeholder slides.


=========================================================
CRITICAL CHART RULE
=========================================================

Use "data-chart" ONLY when genuine quantitative data exists
that can legitimately populate the chart.

The data may come from:

- supplied user information
- supplied source material
- reliable factual information when the task legitimately
  permits external/general factual knowledge

Never invent chart data.

Before selecting "data-chart", verify that usable quantitative
values genuinely exist.

If chartable data is unavailable, select another semantic
slide type.


=========================================================
CRITICAL STATISTICS RULE
=========================================================

Use "statistics" only when genuine numerical values are
available.

Never manufacture statistics merely because a statistics slide
would look visually attractive.


=========================================================
CRITICAL TABLE RULE
=========================================================

Do not fabricate table entries.

Use a table only when sufficient factual or clearly proposed
information exists to populate meaningful rows and columns.


=========================================================
CRITICAL TIMELINE RULE
=========================================================

Do not invent historical dates or events.

A timeline may represent a proposed future plan when it is
clearly presented as proposed rather than historical fact.


=========================================================
CRITICAL ROADMAP RULE
=========================================================

A roadmap may contain proposed phases, milestones and actions
when the user's request calls for planning or strategy.

Do not present proposed milestones as completed historical
events.


=========================================================
CRITICAL COMPARISON RULE
=========================================================

Do not invent factual characteristics, experimental groups,
treatment groups, measured conditions or results merely to
create a comparison slide.

General concept comparisons may use reliable established
knowledge.

Proposed alternatives may be compared when clearly presented
as proposals.


=========================================================
CRITICAL PROCESS RULE
=========================================================

A process slide describing the USER'S existing methodology,
workflow, experiment or procedure must use supplied information.

Do not create a typical procedure and present it as the user's
actual procedure.

A process explaining a GENERAL established process may use
reliable general knowledge.

A process describing a PROPOSED workflow may be generated when
the task calls for recommendations, planning or design.


=========================================================
CRITICAL FINDINGS RULE
=========================================================

Never create findings merely because the selected presentation
strategy normally contains a findings section.

Findings attributed to the user's own study, business,
organization, project or dataset must come from supplied
information.

If findings are requested but absent, do not fabricate them.


=========================================================
CRITICAL INTERPRETATION RULE
=========================================================

Do not generate user-specific interpretation unless the
relevant finding, observation or fact has actually been
established.

General mechanisms may be explained as background knowledge,
but they must not be presented as explanations of unsupported
user-specific results.


=========================================================
CRITICAL CONCLUSION RULE
=========================================================

A conclusion must summarize information that the presentation
has actually established.

Do not introduce unsupported factual claims in the conclusion.

Do not transform a proposal into a verified result.


=========================================================
CRITICAL RECOMMENDATION RULE
=========================================================

Recommendations may be generated when appropriate.

They must be framed as recommendations, not as facts that have
already occurred.

Recommendations derived from user-specific findings must be
consistent with findings actually supplied.


=========================================================
CREATIVE AND PROPOSAL REQUESTS
=========================================================

For genuinely creative or planning tasks such as:

- startup concepts
- pitch decks
- marketing campaigns
- hypothetical products
- brainstorming
- proposed strategies
- proposed workflows
- proposed roadmaps
- fictional scenarios
- product positioning
- feature ideation

you may generate original ideas.

You may propose:

- names
- features
- strategies
- positioning
- messaging
- workflows
- phases
- priorities
- recommendations
- hypothetical concepts

However:

Do not present proposed ideas as verified existing facts.

Do not invent supporting statistics merely to make creative
ideas appear validated.

For example:

It is acceptable to propose a creator-led marketing campaign.

It is not acceptable to claim that such a campaign increased
the user's sales by a specific percentage unless that result
was actually supplied or otherwise reliably established.


=========================================================
SOURCE-BASED REQUESTS
=========================================================

When inputType is "file" or "url":

Treat supplied material as the primary factual source.

Remain within the subject matter represented by that source.

You may:

- reorganize
- summarize
- clarify
- prioritize
- adapt

but preserve the factual meaning of the supplied material.

Do not attribute information to the source when that information
does not appear in the source.

General background knowledge may be added only when it is
relevant and reliable.

Do not disguise added general knowledge as information taken
from the supplied source.


=========================================================
PROMPT-BASED REQUESTS
=========================================================

When inputType is "prompt":

You may use reliable general knowledge to explain concepts and
develop professional content.

You may also create proposed or creative content when the
request calls for it.

However:

All generated material must remain relevant to the user's
requested topic.

Do not manufacture specific evidence, citations, statistics,
research findings, numerical results, business performance,
customer metrics or other unsupported user-specific facts.

When the prompt describes an existing study, organization,
business, dataset, product or project, treat unspecified
specific factual details as UNKNOWN rather than opportunities
for creative completion.


=========================================================
PRESENTATION QUALITY
=========================================================

Create a coherent presentation rather than a collection of
unrelated slides.

Each slide should have a clear communication purpose.

The presentation should progress logically.

The opening should establish the subject.

The middle should develop the important information.

The ending should appropriately conclude, summarize or direct
the audience according to the selected strategy.

Avoid repetitive slide structures when another semantic slide
type communicates the information more effectively.

Do not force visual variety when it weakens clarity.

Do not force every strategy into the same number of slides.

Adapt presentation length and structure to the actual request.

PRESENTATION LENGTH BOUNDARIES:

For an ordinary presentation request where the user does not
specify a slide count, generate between 6 and 10 slides.

Use fewer slides when the subject can be communicated clearly
with fewer slides.

Do not exceed 12 slides unless the user explicitly requests
a larger number of slides.

Do not create unnecessary slides merely to make the
presentation appear longer.

CONTENT GENERATION BOUNDARIES:

For each slide, populate ONLY the canonical content structure
required by that slide's selected slideType.

Do not populate alternative or unused canonical content
structures merely because they exist in the response schema.

Keep slide titles short, specific and presentation-ready.

Keep subtitles, labels, descriptions, bullet points and other
visible text concise.

Do not repeat words, phrases, sentences, identifiers or
patterns within a field.

Do not continue repetitive sequences.

If a field begins becoming repetitive, stop generating content
for that field and continue with the next required field.

Do not expand text merely to consume available output space.

Prefer fewer high-quality points over excessive detail.

Generate only content that could reasonably fit on the
corresponding presentation slide.

The complete presentation JSON must remain concise enough to
finish comfortably within the available output budget.

=========================================================
VISUAL GUIDANCE
=========================================================

When a slide genuinely benefits from a visual, provide useful
visual guidance through content.visualContent.

Visual guidance may describe:

- diagrams
- photographs
- illustrations
- scientific imagery
- conceptual graphics
- icons

Charts belong to content.chart and must use genuine data.

Do not invent factual visual evidence.

Do not create chart instructions when chartable data is absent.
`;


        // =================================================
        // PRESENTATION OUTPUT INSTRUCTIONS
        // =================================================

        outputInstructions = `
Generate structured content for a professional presentation.

The presentation must be adapted to the user's actual request.

Select an appropriate presentation strategy.

Assign an appropriate semantic slide type to every slide.

Populate ONLY the canonical content structure appropriate to
each slide type.

Keep visible slide content concise and presentation-ready.

The presentation must remain on the user's central topic from
beginning to end.

Do not generate speaker notes.

Do not create the final visual presentation.

Do not include layout IDs.

Do not include theme IDs.

Do not include design tokens.

Those responsibilities belong to later application services.
`;


        // =================================================
        // PRESENTATION OUTPUT SCHEMA
        // =================================================

        outputSchema = {

            type: Type.OBJECT,

            properties: {

                outputType: {
                    type: Type.STRING,
                    enum: ["presentation"]
                },

                inferredContext:
                    inferredContextSchema,

                strategyId: {
                    type: Type.STRING,
                    enum: strategyIds
                },

                title: {
                    type: Type.STRING
                },

                subtitle: {
                    type: Type.STRING
                },

                slides: {

                    type: Type.ARRAY,

                    maxItems: 12,

                    items: {

                        type: Type.OBJECT,

                        properties: {

                            slideNumber: {
                                type: Type.INTEGER
                            },

                            slideType: {
                                type: Type.STRING,
                                enum: slideTypeIds
                            },

                            title: {
                                type: Type.STRING
                            },

                            subtitle: {
                                type: Type.STRING
                            },

                            content: {

                                type: Type.OBJECT,

                                properties: {


                                    // =============================
                                    // TITLE
                                    // =============================

                                    titleContent: {

                                        type: Type.OBJECT,

                                        properties: {

                                            title: {
                                                type: Type.STRING
                                            },

                                            subtitle: {
                                                type: Type.STRING
                                            },

                                            supportingText: {
                                                type: Type.STRING
                                            }

                                        }

                                    },


                                    // =============================
                                    // SECTION DIVIDER
                                    // =============================

                                    sectionContent: {

                                        type: Type.OBJECT,

                                        properties: {

                                            title: {
                                                type: Type.STRING
                                            },

                                            subtitle: {
                                                type: Type.STRING
                                            }

                                        }

                                    },


                                    // =============================
                                    // LIST ITEMS
                                    //
                                    // agenda
                                    // key-points
                                    // recommendation
                                    // next-steps
                                    // =============================

                                  items: {

                                    type: Type.ARRAY,

                                    maxItems: 6,

                                    items: {

                                            type: Type.OBJECT,

                                            properties: {

                                                title: {
                                                    type: Type.STRING
                                                },

                                                description: {
                                                    type: Type.STRING
                                                }

                                            },

                                            required: [
                                                "title",
                                                "description"
                                            ]

                                        }

                                    },


                                    // =============================
                                    // FOCUSED EXPLANATION
                                    // =============================

                                    textContent: {

                                        type: Type.OBJECT,

                                        properties: {

                                            heading: {
                                                type: Type.STRING
                                            },

                                            body: {
                                                type: Type.STRING
                                            }

                                        }

                                    },


                                    // =============================
                                    // TEXT + VISUAL
                                    // =============================

                                    visualContent: {

                                        type: Type.OBJECT,

                                        properties: {

                                            text: {
                                                type: Type.STRING
                                            },

                                            visual: {

                                                type: Type.OBJECT,

                                                properties: {

                                                    type: {
                                                        type: Type.STRING
                                                    },

                                                    description: {
                                                        type: Type.STRING
                                                    },

                                                    searchQuery: {
                                                        type: Type.STRING
                                                    }

                                                },

                                                required: [
                                                    "type",
                                                    "description",
                                                    "searchQuery"
                                                ]

                                            }

                                        },

                                        required: [
                                            "text",
                                            "visual"
                                        ]

                                    },


                                    // =============================
                                    // CARDS
                                    // =============================

                                    cards: {

                                        type: Type.ARRAY,

                                            maxItems: 6,

                                                items: {

                                            type: Type.OBJECT,

                                            properties: {

                                                title: {
                                                    type: Type.STRING
                                                },

                                                description: {
                                                    type: Type.STRING
                                                }

                                            },

                                            required: [
                                                "title",
                                                "description"
                                            ]

                                        }

                                    },


                                    // =============================
                                    // COMPARISON
                                    // =============================

                                    comparison: {

                                        type: Type.OBJECT,

                                        properties: {

                                            items: {

                                                type: Type.ARRAY,

                                            maxItems: 4,

                                                items: {
                                                    type: Type.OBJECT,

                                                    properties: {

                                                        label: {
                                                            type: Type.STRING
                                                        },

                                                        points: {

                                                        type: Type.ARRAY,

                                                        maxItems: 5,

                                                        items: {

                                                        type: Type.STRING
    }

}

                                                    },

                                                    required: [
                                                        "label",
                                                        "points"
                                                    ]

                                                }

                                            }

                                        }

                                    },


                                    // =============================
                                    // RELATIONSHIP
                                    // =============================

                                    relationship: {

                                        type: Type.OBJECT,

                                        properties: {

                                            nodes: {

                                                type: Type.ARRAY,

                                                maxItems: 7,

                                                items: {
                                                    type: Type.OBJECT,

                                                    properties: {

                                                        id: {
                                                            type: Type.STRING
                                                        },

                                                        label: {
                                                            type: Type.STRING
                                                        },

                                                        description: {
                                                            type: Type.STRING
                                                        }

                                                    },

                                                    required: [
                                                        "id",
                                                        "label",
                                                        "description"
                                                    ]

                                                }

                                            },

                                            relationships: {

                                                type: Type.ARRAY,

                                                maxItems: 10,

                                                items: {

                                                    type: Type.OBJECT,

                                                    properties: {

                                                        from: {
                                                            type: Type.STRING
                                                        },

                                                        to: {
                                                            type: Type.STRING
                                                        },

                                                        label: {
                                                            type: Type.STRING
                                                        }

                                                    },

                                                    required: [
                                                        "from",
                                                        "to",
                                                        "label"
                                                    ]

                                                }

                                            }

                                        }

                                    },


                                    // =============================
                                    // PROCESS
                                    // =============================

                                    process: {

                                        type: Type.OBJECT,

                                        properties: {

                                            steps: {

                                                type: Type.ARRAY,

                                                maxItems: 6,

                                                items: {

                                                    type: Type.OBJECT,

                                                    properties: {

                                                        stepNumber: {
                                                            type: Type.INTEGER
                                                        },

                                                        title: {
                                                            type: Type.STRING
                                                        },

                                                        description: {
                                                            type: Type.STRING
                                                        }

                                                    },

                                                    required: [
                                                        "stepNumber",
                                                        "title",
                                                        "description"
                                                    ]

                                                }

                                            }

                                        }

                                    },


                                    // =============================
                                    // TIMELINE
                                    // =============================

                                    timeline: {

                                        type: Type.OBJECT,

                                        properties: {

                                            events: {

                                                type: Type.ARRAY,

                                                maxItems: 6,

                                                items: {

                                                    type: Type.OBJECT,

                                                    properties: {

                                                        label: {
                                                            type: Type.STRING
                                                        },

                                                        title: {
                                                            type: Type.STRING
                                                        },

                                                        description: {
                                                            type: Type.STRING
                                                        }

                                                    },

                                                    required: [
                                                        "label",
                                                        "title",
                                                        "description"
                                                    ]

                                                }

                                            }

                                        }

                                    },


                                    // =============================
                                    // ROADMAP
                                    // =============================

                                    roadmap: {

                                        type: Type.OBJECT,

                                        properties: {

                                            phases: {

                                                type: Type.ARRAY,

                                                maxItems: 6,

                                                items: {

                                                    type: Type.OBJECT,

                                                    properties: {

                                                        label: {
                                                            type: Type.STRING
                                                        },

                                                        title: {
                                                            type: Type.STRING
                                                        },

                                                        description: {
                                                            type: Type.STRING
                                                        }

                                                    },

                                                    required: [
                                                        "label",
                                                        "title",
                                                        "description"
                                                    ]

                                                }

                                            }

                                        }

                                    },


                                    // =============================
                                    // STATISTICS
                                    // =============================

                                    statistics: {

                                     type: Type.ARRAY,

                                     maxItems: 5,

                                     items: {

                                            type: Type.OBJECT,

                                            properties: {

                                                value: {
                                                    type: Type.STRING
                                                },

                                                label: {
                                                    type: Type.STRING
                                                },

                                                context: {
                                                    type: Type.STRING
                                                }

                                            },

                                            required: [
                                                "value",
                                                "label",
                                                "context"
                                            ]

                                        }

                                    },


                                    // =============================
                                    // DATA CHART
                                    // =============================

                                    chart: {

                                        type: Type.OBJECT,

                                        properties: {

                                            chartType: {
                                                type: Type.STRING
                                            },

                                            labels: {

                                                type: Type.ARRAY,

                                                maxItems: 12,

                                                items: {
                                                    type: Type.STRING
                                                }

                                            },

                                            datasets: {

                                                type: Type.ARRAY,

                                                maxItems: 6,

                                                items: {

                                                    type: Type.OBJECT,

                                                    properties: {

                                                        label: {
                                                            type: Type.STRING
                                                        },

                                                        values: {

                                                            type: Type.ARRAY,

                                                            maxItems: 12,

                                                            items: {
                                                                type: Type.NUMBER
                                                            }

                                                        }

                                                    },

                                                    required: [
                                                        "label",
                                                        "values"
                                                    ]

                                                }

                                            },

                                            insight: {
                                                type: Type.STRING
                                            }

                                        }

                                    },


                                    // =============================
                                    // TABLE
                                    // =============================

                                        table: {

                                            type: Type.OBJECT,

                                            properties: {

                                                columns: {

                                                    type: Type.ARRAY,

                                                    maxItems: 6,

                                                    items: {
                                                        type: Type.STRING
                                                    }

                                                },

                                                rows: {

                                                    type: Type.ARRAY,

                                                    maxItems: 8,

                                                    items: {

                                                        type: Type.OBJECT,

                                                        properties: {

                                                            cells: {

                                                                type: Type.ARRAY,

                                                                maxItems: 6,

                                                                items: {
                                                                    type: Type.STRING
                                                                }

                                                            }

                                                        },

                                                        required: [
                                                            "cells"
                                                        ]

                                                    }

                                                }

                                            }

                                        },

                                    // =============================
                                    // QUOTE
                                    // =============================

                                    quote: {

                                        type: Type.OBJECT,

                                        properties: {

                                            text: {
                                                type: Type.STRING
                                            },

                                            attribution: {
                                                type: Type.STRING
                                            },

                                            context: {
                                                type: Type.STRING
                                            }

                                        }

                                    },


                                    // =============================
                                    // CASE STUDY
                                    // =============================

                                    caseStudy: {

                                        type: Type.OBJECT,

                                        properties: {

                                            context: {
                                                type: Type.STRING
                                            },

                                            challenge: {
                                                type: Type.STRING
                                            },

                                            action: {
                                                type: Type.STRING
                                            },

                                            outcome: {
                                                type: Type.STRING
                                            },

                                            lesson: {
                                                type: Type.STRING
                                            }

                                        }

                                    },


                                    // =============================
                                    // CALL TO ACTION
                                    // =============================

                                    callToAction: {

                                        type: Type.OBJECT,

                                        properties: {

                                            action: {
                                                type: Type.STRING
                                            },

                                            supportingText: {
                                                type: Type.STRING
                                            }

                                        }

                                    },


                                    // =============================
                                    // SUMMARY
                                    // =============================

                                    summary: {

                                        type: Type.OBJECT,

                                        properties: {

                                            statement: {
                                                type: Type.STRING
                                            },

                                            points: {

                                                type: Type.ARRAY,

                                                maxItems: 5,

                                                items: {
                                                    type: Type.STRING
                                                }

                                            }

                                        }

                                    },


                                    // =============================
                                    // CONCLUSION
                                    // =============================

                                    conclusion: {

                                        type: Type.OBJECT,

                                        properties: {

                                            statement: {
                                                type: Type.STRING
                                            },

                                           supportingPoints: {

                                                type: Type.ARRAY,

                                                maxItems: 4,

                                                items: {
                                                    type: Type.STRING
                                                }

                                            }

                                        }

                                    }

                                }

                            },

                        },

                        required: [
                            "slideNumber",
                            "slideType",
                            "title",
                            "content"
                        ]

                    }

                }

            },

            required: [
                "outputType",
                "inferredContext",
                "strategyId",
                "title",
                "slides"
            ]

        };
        
    // =====================================================
    // DOCUMENT
    // =====================================================

    } else if (
        outputType === "document"
    ) {

        outputInstructions = `
Generate structured content for a professional document.

Determine the appropriate document organization from:

- user's request
- inferred context
- explicitly supplied context
- purpose
- audience
- topic
- supplied material

The document should have a logical progression.

Use sections according to the actual information.

Do not force every document into the same structure.

Do not invent:

- citations
- references
- research findings
- statistics
- quotations
- numerical evidence
- named studies
- dates

unless they are genuinely supported by the user's input,
source material, or reliable established factual knowledge.

For source-based requests, preserve the meaning of the source.

Generate structured content only.

Do not create the final Word document or PDF.
`;


        outputSchema = {

            type: Type.OBJECT,

            properties: {

                outputType: {
                    type: Type.STRING,
                    enum: ["document"]
                },

                inferredContext:
                    inferredContextSchema,

                title: {
                    type: Type.STRING
                },

                subtitle: {
                    type: Type.STRING
                },

                introduction: {
                    type: Type.STRING
                },

                sections: {

                    type: Type.ARRAY,

                    items: {

                        type: Type.OBJECT,

                        properties: {

                            heading: {
                                type: Type.STRING
                            },

                            content: {
                                type: Type.STRING
                            },

                            keyPoints: {

                                type: Type.ARRAY,

                                items: {
                                    type: Type.STRING
                                }

                            }

                        },

                        required: [
                            "heading",
                            "content"
                        ]

                    }

                },

                conclusion: {
                    type: Type.STRING
                },

                recommendations: {

                    type: Type.ARRAY,

                    items: {
                        type: Type.STRING
                    }

                }

            },

        

            required: [
                "outputType",
                "inferredContext",
                "title",
                "introduction",
                "sections",
                "conclusion"
            ]

        };


    // =====================================================
    // WEBPAGE
    // =====================================================

    } else if (
        outputType === "webpage"
    ) {

        outputInstructions = `
Generate structured content for a professional webpage.

Determine the appropriate webpage structure from:

- user's request
- inferred context
- explicitly supplied context
- purpose
- audience
- topic
- instructions
- supplied material

Possible sections may include:

- hero
- explanatory sections
- features
- benefits
- steps
- statistics
- FAQs
- calls to action

Do not force every webpage into the same structure.

Do not invent factual:

- business metrics
- testimonials
- customer numbers
- statistics
- awards
- quotations
- research findings
- financial figures
- performance claims

that were not provided or otherwise genuinely supported.

Generate structured content only.

Do not create the final HTML, CSS or webpage implementation.
`;


        outputSchema = {

            type: Type.OBJECT,

            properties: {

                outputType: {
                    type: Type.STRING,
                    enum: ["webpage"]
                },

                inferredContext:
                    inferredContextSchema,

                pageType: {
                    type: Type.STRING
                },

                title: {
                    type: Type.STRING
                },

                hero: {

                    type: Type.OBJECT,

                    properties: {

                        headline: {
                            type: Type.STRING
                        },

                        subheadline: {
                            type: Type.STRING
                        }

                    },

                    required: [
                        "headline",
                        "subheadline"
                    ]

                },

                sections: {

                    type: Type.ARRAY,

                    items: {

                        type: Type.OBJECT,

                        properties: {

                            type: {
                                type: Type.STRING
                            },

                            heading: {
                                type: Type.STRING
                            },

                            content: {
                                type: Type.STRING
                            },

                            items: {

                                type: Type.ARRAY,

                                items: {

                                    type: Type.OBJECT,

                                    properties: {

                                        title: {
                                            type: Type.STRING
                                        },

                                        description: {
                                            type: Type.STRING
                                        }

                                    },

                                    required: [
                                        "title",
                                        "description"
                                    ]

                                }

                            }

                        },

                        required: [
                            "type",
                            "heading",
                            "content"
                        ]

                    }

                },

                callToAction: {

                    type: Type.OBJECT,

                    properties: {

                        heading: {
                            type: Type.STRING
                        },

                        text: {
                            type: Type.STRING
                        }

                    },

                    required: [
                        "heading",
                        "text"
                    ]

                }

            },

            required: [
                "outputType",
                "inferredContext",
                "pageType",
                "title",
                "hero",
                "sections",
                "callToAction"
            ]

        };


    // =====================================================
    // INVALID OUTPUT TYPE
    // =====================================================

    } else {

        throw new Error(
            "Invalid output type"
        );

    }


    // =====================================================
    // MAIN PROMPT
    // =====================================================

    const prompt = `
You are a professional structured-content generation engine.

Transform the user's request into high-quality structured content.


=========================================================
USER REQUEST
=========================================================

INPUT TYPE:
${inputType}

INPUT:
${input}

OUTPUT TYPE:
${outputType}

USER ROLE:
${context?.userRole || "Not specified"}

PURPOSE:
${context?.purpose || "Not specified"}

AUDIENCE:
${context?.audience || "Not specified"}


=========================================================
CONTEXT UNDERSTANDING
=========================================================

Analyze the complete user request and return an
"inferredContext" object as part of the structured response.

The purpose of inferredContext is to let the application
understand the user's communication situation without requiring
the user to complete separate role, purpose, or audience fields.

Infer only what is supported by the request or supplied source
material:

- userRole
- purpose
- audience
- topic
- tone
- keyInstructions


IMPORTANT:

Do not invent personal or situational information merely to
fill fields.

If the user's role is unknown, return:

"userRole": ""

If the intended audience is unknown, return:

"audience": ""

If the purpose cannot reasonably be determined, return:

"purpose": ""

The topic should identify the central subject of the request.

The inferred topic is especially important because it becomes
the semantic anchor for the generated output.

Do not replace the user's topic with an example topic or an
unrelated subject.

The tone should describe the communication style that best
fits the request.

Examples include:

- formal
- academic
- scientific
- executive
- persuasive
- educational
- technical
- conversational

keyInstructions must preserve important explicit instructions
and constraints supplied by the user.


=========================================================
EXPLICIT CONTEXT PRIORITY
=========================================================

Explicit information supplied by the user has priority over
inference.

If USER ROLE, PURPOSE, or AUDIENCE is supplied separately above,
treat that information as authoritative unless the user's
current instruction clearly updates or contradicts it.

Do NOT invent context simply because it would make
classification easier.

Do NOT assume:

- every presentation is academic
- every user is a student
- every document is formal
- every webpage is commercial
- every research-related request is a research defense
- an audience that has not been established

When information is unknown, preserve that uncertainty instead
of manufacturing context.


=========================================================
IMPORTANT EXAMPLE ISOLATION RULE
=========================================================

Examples contained in this prompt exist ONLY to demonstrate
expected reasoning or structure.

Never treat example subjects, industries, people, research
topics, technologies or terminology as part of the user's
request.

Never copy subject matter from an example into generated
content unless the user's actual request independently requires
that subject.


=========================================================
OUTPUT-SPECIFIC INTELLIGENCE
=========================================================

${strategyInstructions}


=========================================================
GENERAL CONTENT REQUIREMENTS
=========================================================

Consider the complete request:

- user input
- supplied source material
- inferred context
- explicitly supplied context
- user role when known
- purpose when known
- audience when known
- topic
- explicit instructions
- requested output type

Use these factors to determine:

- priorities
- depth
- terminology
- organization
- emphasis
- explanation
- professional style


=========================================================
GLOBAL TOPIC CONSISTENCY
=========================================================

The generated output must remain relevant to the user's central
subject from beginning to end.

Do not allow examples, schema descriptions, strategy catalogs
or general model knowledge to redirect the output into another
topic.

Every major section or slide must have a defensible relationship
to the user's request.

If information is not relevant to the user's central topic or
communication objective, omit it.


=========================================================
FACTUAL INTEGRITY
=========================================================

Never manufacture factual evidence to make the output appear
complete.

Reliable general knowledge may be used when it is relevant to
the user's request.

Creative or proposed content may be generated when the task
calls for it.

However, never present invented user-specific information as
verified fact.

Do not invent unsupported:

- statistics
- measurements
- research findings
- experimental results
- financial figures
- dates
- citations
- quotations
- references
- performance metrics
- customer numbers
- organization-specific claims
- factual claims attributed to supplied material

If required factual information is absent, structure the content
appropriately without pretending the missing information exists.


=========================================================
OUTPUT REQUIREMENTS
=========================================================

${outputInstructions}


=========================================================
SOURCE BEHAVIOR
=========================================================

For "file" and "url" input:

Treat supplied content as the primary factual foundation.

You may:

- reorganize
- summarize
- clarify
- prioritize
- adapt

but preserve its factual meaning.

Relevant reliable general knowledge may be added when useful,
but do not attribute added information to the source.

Do not introduce unrelated subject matter.


For "prompt" input:

You may develop:

- ideas
- explanations
- organization
- messaging
- reliable general knowledge
- general professional content
- recommendations
- proposed strategies when appropriate

but all development must remain relevant to the user's requested
subject.

Creative development must not become fabricated evidence.


=========================================================
FINAL INTERNAL QUALITY CHECK
=========================================================

Before returning the structured response, internally verify:

1. The output matches the requested outputType.

2. The inferred topic represents the user's actual central
   subject.

3. Every major section or presentation slide is relevant to
   that topic.

4. No example content has leaked into the response.

5. Every user-specific factual claim is supported by the user's
   input, supplied source material, or another genuinely reliable
   factual basis appropriate to the request.

6. No methodology, experimental procedure, sample information,
   treatment group, measurement, biomarker, variable or analytical
   method has been invented and attributed to an existing study.

7. No unsupported research finding, business result, statistic,
   numerical value, performance metric or conclusion has been
   invented.

8. General background knowledge has not been falsely presented
   as a finding or fact specific to the user's own study,
   organization, project or dataset.

9. Missing user-specific factual information has been treated
   as unknown rather than creatively completed.

10. Proposed or creative content is distinguishable from verified
    factual claims when that distinction matters.

11. The content is not repetitive.

12. The content follows the appropriate semantic structure.

13. If this is a presentation, every slide contains enough useful
    content to perform its communication function.

14. If this is a presentation, visible slide content is concise,
    scannable and presentation-ready.

15. If this is a presentation, no speaker notes or presenter notes
    have been generated.

16. If this is a presentation, headings and descriptions respect
    the content budgets.

17. If this is a presentation, no slide is overloaded with text.

18. If this is a presentation, no important slide is effectively
    empty merely because conciseness rules were applied.

19. If this is a presentation, each slide populates only the
    content structure appropriate to its slideType.

20. The response contains no malformed repetitive phrase chains.


=========================================================
APPLICATION RESPONSIBILITY
=========================================================

Generate STRUCTURED CONTENT only.

Do NOT create the final:

- PowerPoint
- presentation design
- PDF
- Word document
- webpage implementation
- HTML/CSS interface

The application will later pass this structured content into
the appropriate template and output-generation system.
`;


 // =====================================================
// GEMINI REQUEST
// =====================================================

console.log(
    JSON.stringify(
        outputSchema,
        null,
        2
    )
);

const testSchema = {
    type: "object",

    properties: {
        outputType: {
            type: "string",
            enum: ["presentation"]
        },

        title: {
            type: "string"
        }
    },

    required: [
        "outputType",
        "title"
    ]
};

const response =
    await ai.models.generateContent({

        model:
            "gemini-3.5-flash",

        contents:
            prompt,

        config: {

    responseMimeType:
        "application/json",

    responseJsonSchema:
      // outputSchema,
      presentationPlanSchema,

    maxOutputTokens:
        outputType === "presentation"
            ? 32768
            : 16384
}

    });

console.log(
    "===== GEMINI DEBUG ====="
);

console.log(
    "Response text:",
    response?.text
);

console.log(
    "Candidates:",
    JSON.stringify(
        response?.candidates,
        null,
        2
    )
);

console.log(
    "Prompt feedback:",
    JSON.stringify(
        response?.promptFeedback,
        null,
        2
    )
);

console.log(
    "Usage metadata:",
    JSON.stringify(
        response?.usageMetadata,
        null,
        2
    )
);

console.log(
    "========================"
);

// =====================================================
// VALIDATE RESPONSE
// =====================================================

const finishReason =
    response?.candidates?.[0]?.finishReason;


// A MAX_TOKENS response is usually truncated JSON.
// Detect it before JSON.parse() so the application reports
// the real generation problem instead of a misleading
// "Unterminated string" parsing error.

if (
    finishReason === "MAX_TOKENS"
) {

    throw new Error(
        "AI response was truncated because the model reached the output token limit"
    );

}


if (
    !response?.text
) {

    throw new Error(
        "AI service returned an empty response"
    );

}


// =====================================================
// PARSE RESPONSE
// =====================================================

let generatedContent;


try {

    generatedContent =
        JSON.parse(
            response.text
        );

} catch (error) {

    console.error(
        "AI JSON parse error:",
        error.message
    );

    console.error(
        "Finish reason:",
        finishReason
    );

    console.error(
        "Response text length:",
        response.text?.length || 0
    );


    throw new Error(
        `AI service returned invalid JSON: ${error.message}`
    );

}


// =====================================================
// BASIC GENERATED CONTENT VALIDATION
// =====================================================

if (
    !generatedContent
) {

    throw new Error(
        "AI service did not generate content"
    );

}


if (
    generatedContent.outputType !==
    outputType
) {

    throw new Error(
        `AI returned output type "${generatedContent.outputType}" instead of "${outputType}"`
    );

}


// =====================================================
// PRESENTATION CONTENT VALIDATION
// =====================================================
//
// Gemini's response schema guarantees the general JSON
// shape.
//
// presentationContentValidator provides the second
// protection layer.
//
// It protects the application from content that is
// structurally valid JSON but still unsuitable for an
// actual presentation.
//
// Nothing reaches the presentation layout/theme/render
// pipeline until this validation succeeds.
//
// =====================================================

if (
    outputType ===
    "presentation"
) {

    validatePresentationContent(
        generatedContent,
        {
            inputType,
            input,
            context
        }
    );

}


// =====================================================
// RETURN
// =====================================================

return {

    inputType,

    input,

    outputType,

    context,

    generatedContent

};

};


   