const context = { userRole: '', purpose: 'Explain the supplied offering', audience: 'Interested visitors', topic: 'A focused introduction', tone: 'professional', keyInstructions: [] };
const item = (title, description, detail = '') => ({ title, description, detail, url: '' });
const section = (type, heading, content, items = []) => ({ type, heading, content, items });
export const fixtures = {
    portfolio: {
        title: 'Maya Chen', pageType: 'portfolio', preset: 'editorial',
        source: 'Create a portfolio for fictional designer Maya Chen. Headline: Making complex ideas feel clear. Independent visual and digital designer. Selected concept projects: Field Journal, an editorial identity for a nature publication; Open House, a welcoming digital experience for a community space; Common Ground, a concept identity for a local gathering. Process: Listen, explore the problem; Shape, develop a clear design direction; Refine, improve the details through review. Contact maya@mayachen.example. No awards, clients, metrics or years of experience are supplied.',
        hero: { headline: 'Making complex ideas feel clear.', subheadline: 'Independent visual and digital design, shaped by curiosity and a considered approach.', actionLabel: 'Explore the work' },
        sections: [section('projects', 'Selected explorations', 'Concept projects across identity, editorial and digital design.', [item('Field Journal', 'An editorial identity inspired by close observation of the natural world.', 'Editorial concept'), item('Open House', 'A welcoming digital experience for a community gathering space.', 'Digital concept'), item('Common Ground', 'A visual identity exploring connection and shared local experiences.', 'Identity concept')]),
            section('about', 'Thoughtful by design.', 'I work across visual identity and digital experiences, bringing structure and clarity to complex ideas.'),
            section('process', 'From questions to clarity', 'A considered process that leaves room to explore.', [item('Listen', 'Understand the problem and the people it needs to serve.'), item('Shape', 'Explore a clear direction and test the essential ideas.'), item('Refine', 'Review the details and bring the work into focus.')]),
            section('contact', 'Start a conversation', 'Share your idea and explore whether there is a good fit.')],
        contact: { email: 'maya@mayachen.example', phone: '', address: '' }, cta: { heading: 'Have a thoughtful project in mind?', text: 'A clear conversation is a good place to begin.', actionLabel: 'Say hello' }
    },
    startup: {
        title: 'Tandem', pageType: 'startup', preset: 'product',
        source: 'Build a landing page for Tandem, a proposed shared-notes product for small creative teams. It is a concept, not a launched service. Proposed features: shared notes, topic organization, clear next steps. Proposed flow: capture a thought, organize it with the team, agree what comes next. No actual integrations, customers, metrics, pricing, launch dates or security guarantees are supplied. No working sign-up or product backend. Email hello@tandem.example is supplied for concept feedback.',
        hero: { headline: 'Good ideas deserve a shared home.', subheadline: 'A proposed workspace for small creative teams to collect thoughts, find focus and agree on what comes next.', actionLabel: 'Explore the concept' },
        sections: [section('features', 'Less scattered. More connected.', 'A focused concept for the conversations around creative work.', [item('Keep thoughts together', 'Proposed shared notes bring the team’s thinking into one considered space.'), item('Find the thread', 'Topic organization would help connect related ideas and make them easier to revisit.'), item('Know what comes next', 'Clear next steps would turn useful conversations into shared direction.')]),
            section('process', 'From thought to shared direction', 'A proposed flow designed around the way small teams think.', [item('Capture', 'Collect a thought while the context is still fresh.'), item('Connect', 'Organize related notes and explore them with the team.'), item('Move forward', 'Agree on a clear next step and keep it with the conversation.')]),
            section('faq', 'A few things to know', 'Clear answers about the concept and its current scope.', [item('Is Tandem available to use?', 'Tandem is a proposed product concept. This page introduces the idea; it does not provide a working workspace.'), item('Who is the idea for?', 'Small creative teams that want a clearer home for shared thinking.'), item('Can I share feedback?', 'Yes. Use the supplied email address to share your perspective on the concept.')])],
        contact: { email: 'hello@tandem.example', phone: '', address: '' }, cta: { heading: 'Help shape a clearer way to work.', text: 'Share your perspective on the Tandem concept.', actionLabel: 'Share feedback' }
    },
    business: {
        title: 'Fieldwork Studio', pageType: 'business', preset: 'classic',
        source: 'Create a professional business website for fictional Fieldwork Studio, an independent spatial design advisory. It helps small teams think clearly about places. Services: project scoping, design reviews, handover planning. Approach: understand the brief, develop a practical direction, document the next steps. Emphasize considered guidance and clear communication. Email studio@fieldwork.example. No completed client projects, credentials, years of experience, awards, addresses or statistics are supplied.',
        hero: { headline: 'Better places begin with clear thinking.', subheadline: 'Independent spatial design guidance for small teams, from an initial brief to a practical next step.', actionLabel: 'Explore our approach' },
        sections: [section('services', 'Clarity at the right moments', 'Focused guidance for the decisions that shape a place.', [item('Project scoping', 'Understand the brief, identify the questions that matter and establish a useful direction.'), item('Design reviews', 'Take a considered look at a proposal and discuss practical ways to strengthen it.'), item('Handover planning', 'Organize the essential information and clarify the next steps for the team.')]),
            section('about', 'A considered perspective.', 'Fieldwork Studio is an independent spatial design advisory focused on clear communication and practical direction for small teams.'),
            section('process', 'An approach built around your brief', 'Useful conversations, clear direction and thoughtful documentation.', [item('Understand', 'Start with the brief, its context and the questions your team needs to answer.'), item('Develop', 'Explore a practical direction and consider the decisions it brings into focus.'), item('Document', 'Bring the essential information together and clarify what happens next.')]),
            section('contact', 'Let’s consider the possibilities', 'Share your brief using the supplied studio email.')],
        contact: { email: 'studio@fieldwork.example', phone: '', address: '' }, cta: { heading: 'A clearer direction for your next project.', text: 'Tell us what you are thinking about, and start a considered conversation.', actionLabel: 'Talk to the studio' }
    },
    education: {
        title: 'Water in Motion', pageType: 'education', preset: 'academy',
        source: 'Create an independent educational website called Water in Motion. The water cycle moves water between air, land, oceans and living things. Solar energy helps evaporation; transpiration releases water vapour from plants. Condensation forms droplets; growing droplets fall as precipitation. Infiltration moves water into soil, runoff flows over land, groundwater can feed rivers and springs. Proposed activity: observe condensation on a cool surface. No quantitative measurements, credentials or contact details are supplied.',
        hero: { headline: 'Follow water’s extraordinary journey.', subheadline: 'Explore the connections between the atmosphere, the ground and the places water calls home.', actionLabel: 'Start exploring' },
        sections: [section('topics', 'A connected world of water', 'Start with the processes that keep water moving.', [item('Into the atmosphere', 'Solar energy supports evaporation, while plants release water vapour through transpiration.'), item('Back toward Earth', 'Cooling water vapour condenses into droplets. Growing droplets can fall as precipitation.'), item('Across the landscape', 'Water enters soil through infiltration, flows over land as runoff and moves through groundwater stores.')]),
            section('process', 'Try a thoughtful observation', 'A proposed activity to make condensation easier to understand.', [item('Choose a cool surface', 'Prepare a surface that is cooler than the surrounding moist air.'), item('Observe closely', 'Look for tiny droplets appearing as water vapour cools.'), item('Connect the idea', 'Discuss how cooling can change water vapour into liquid droplets.')]),
            section('faq', 'Keep asking questions', 'Build understanding by following the connections.', [item('What powers the water cycle?', 'Solar energy and gravity help drive water’s movement through Earth’s systems.'), item('How do plants contribute?', 'Plants release water vapour through transpiration.'), item('Where does groundwater go?', 'Groundwater moves through permeable material and can feed rivers and springs.')])],
        contact: { email: '', phone: '', address: '' }, cta: { heading: 'Curiosity is a good place to begin.', text: 'Revisit the key processes and look for connections in the world around you.', actionLabel: 'Explore the topics' }
    },
    restaurant: {
        title: 'Sage & Salt', pageType: 'restaurant', preset: 'table',
        source: 'Create a restaurant website for fictional Sage & Salt, a neighborhood kitchen with seasonal food and a welcoming table. Supplied sample menu: Garden Bowl, roasted seasonal vegetables and grains, $18; Market Plate, a changing selection of seasonal produce, $22; Citrus Cake, a bright citrus dessert, $12. Sample location: 14 Garden Lane, Lakeside. Email hello@sageandsalt.example. No awards, reviews, dietary guarantees, hours or booking system are supplied. Visitors may email a table inquiry; no reservation can be confirmed on the static site.',
        hero: { headline: 'Seasonal food. A welcoming table.', subheadline: 'A neighborhood kitchen for considered dishes, good conversation and the simple pleasure of gathering.', actionLabel: 'Browse the menu' },
        sections: [section('menu', 'A taste of the season', 'A supplied sample menu, shaped by seasonal ingredients.', [item('Garden Bowl', 'Roasted seasonal vegetables and grains.', '$18'), item('Market Plate', 'A changing selection of seasonal produce.', '$22'), item('Citrus Cake', 'A bright citrus dessert to finish the meal.', '$12')]),
            section('about', 'Good things, brought together.', 'Sage & Salt is a neighborhood kitchen centered on seasonal food and a warm welcome.'),
            section('contact', 'Find your way to the table', 'Visit the supplied sample location or email a table inquiry. This page cannot confirm reservations.')],
        contact: { email: 'hello@sageandsalt.example', phone: '', address: '14 Garden Lane, Lakeside' }, cta: { heading: 'Pull up a chair.', text: 'Send a table inquiry using the supplied email. A reservation is only confirmed after the restaurant responds.', actionLabel: 'Email a table inquiry' }
    }
};
export function fixturePlan(fixture) {
    return { pageType: fixture.pageType, title: fixture.title, brandName: fixture.title, inferredContext: { ...context, topic: fixture.title },
        design: { preset: fixture.preset, primary: '', accent: '' }, visualDirection: 'A considered, category-specific static website with local illustrations.',
        sections: fixture.sections.map(s => ({ type: s.type, heading: s.heading, navLabel: ({ faq: 'Questions', about: 'About', projects: 'Work', process: 'Approach', contact: 'Contact', services: 'Services', features: 'Features', topics: 'Learn', menu: 'Menu' })[s.type] || s.heading, purpose: s.content || s.heading })), limitations: [] };
}
export function fixtureDraft(fixture) {
    return { description: fixture.hero.subheadline, hero: fixture.hero, sections: fixture.sections, contact: fixture.contact, callToAction: fixture.cta };
}
export function fixtureClient(fixture) {
    let calls = 0;
    return { models: { generateContent: async () => ({ text: JSON.stringify(calls++ % 2 === 0 ? fixturePlan(fixture) : fixtureDraft(fixture)), candidates: [{ finishReason: 'STOP' }] }) } };
}
