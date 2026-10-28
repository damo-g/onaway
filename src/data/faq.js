// Every question and answer on the site, in one place. The Help page renders all of it (and its FAQPage
// JSON-LD); each service page's Questions section renders its own service group, so the wording always
// matches. Read at build time by vite.config.js (Handlebars context `faq`): restart `npm run dev` after editing.
// `confirm` notes are for the client and never shown. Answers are drafts for the client to confirm.

const QUOTE = { label: 'Get a free quote', href: '/quote/' };
const see = (name) => ({ label: `See ${name}`, href: `/${name}/` });

export const GROUPS = [
  {
    id: 'pricing',
    name: 'Quotes & pricing',
    chip: 'Pricing',
    items: [
      { q: 'How much will it cost?', a: 'Every job is different, so we quote each one. Tell us the basics and you’ll get a written quote within 2 hours, every cost listed.', link: QUOTE },
      { q: 'Is the quote really free?', a: 'Yes. No deposit, no card, no obligation. If you don’t book, that’s the end of it.', link: QUOTE },
    ],
  },
  {
    id: 'booking',
    name: 'Booking & changes',
    chip: 'Booking',
    items: [
      { q: 'How far ahead should I book?', a: 'A few days is usually enough for a clean or a delivery. Two to three weeks for most moves, longer at month-end.', link: see('moving') },
      { q: 'What if I need to cancel or reschedule?', a: 'Tell us as early as you can and we’ll move it. Our cancellation terms are in your written quote.', link: QUOTE, confirm: 'notice period and any fee' },
    ],
  },
  {
    id: 'coverage',
    name: 'Coverage & insurance',
    chip: 'Coverage',
    items: [
      { q: 'Where do you work?', a: 'Across the GTA: Toronto, Peel, York, Durham and Halton. Just outside it? Ask anyway and we’ll tell you straight.', link: { label: 'See where we work', href: '/#gta' } },
      { q: 'Are you insured?', a: 'Yes. We can send a certificate of insurance to your building or landlord before the day.', link: see('moving') },
    ],
  },
  {
    id: 'included',
    name: 'What’s included',
    chip: 'Included',
    items: [
      { q: 'What comes with a move?', a: 'A written plan, blankets and wrap, floor protection, furniture taken apart and put back, and a walkthrough before we leave.', link: see('moving') },
      { q: 'Do you work with businesses?', a: 'Yes. Offices, shops, clinics and showrooms, for cleaning, moving and delivery, evenings and weekends if needed.', link: QUOTE },
      { q: 'Can I book a recurring clean?', a: 'Yes: weekly, every two weeks or monthly, on the same day and window each visit.', link: see('cleaning') },
    ],
  },
  {
    id: 'payment',
    name: 'Payment',
    chip: 'Payment',
    items: [{ q: 'How do I pay?', a: 'By card or e-transfer once the job’s done. Businesses can be invoiced.', link: QUOTE, confirm: 'methods and terms' }],
  },
];

// The service pages' Questions sections (five each); on the Help page under "By service"
export const SERVICES = [
  {
    id: 'cleaning',
    name: 'Cleaning',
    chip: 'Cleaning',
    items: [
      { q: 'Do you bring supplies?', a: 'Yes. The crew brings everything: products, cloths, a vacuum and a mop. If you’d rather we use yours, or need scent-free products, say so in your quote.' },
      { q: 'Do I need to be home?', a: 'No, most people aren’t. Leave a key, a lockbox code or concierge instructions. We lock up and leave a note with what was done.' },
      { q: 'What if something’s missed?', a: 'Tell us within 24 hours and we’ll come back to put it right, at no cost.' },
      { q: 'Can I keep the same crew?', a: 'On a weekly or every-2-weeks rhythm, yes. We keep the same crew wherever we can, and tell you ahead of time if that changes.' },
      { q: 'What about pets?', a: 'Happy to work around them. Tell us who’s home and whether they should stay in a room while we clean.' },
    ],
  },
  {
    id: 'moving',
    name: 'Moving',
    chip: 'Moving',
    items: [
      { q: 'How far ahead should I book?', a: 'Two to three weeks for most moves, longer for month-end and summer weekends. Tell us your date and we’ll say straight away if it’s tight.' },
      { q: 'What if it takes longer than quoted?', a: 'Your written quote is the price for the job it describes. If something changes on the day, like extra items or a blocked elevator, we tell you before it costs more, never after.' },
      { q: 'Do you handle elevator bookings?', a: 'We tell you exactly what to book and when, and work with your concierge on the day. Most GTA condos need the resident to make the booking.' },
      { q: 'Do you have insurance?', a: 'Yes. We can send a certificate of insurance to your building or landlord before moving day.' },
      { q: 'Can you move just a few things?', a: 'Yes. One room, a few big pieces or a storage unit. Tell us what it is and we’ll quote it the same way.' },
    ],
  },
  {
    id: 'delivery',
    name: 'Delivery',
    chip: 'Delivery',
    items: [
      { q: 'How big can an item be?', a: 'If two people can carry it through a standard door, we can deliver it. Anything bigger or heavier, tell us in your quote and we’ll say straight.' },
      { q: 'Can you pick up from a store or a Marketplace seller?', a: 'Yes. Give us the address and a contact, and we’ll check the item when we collect it.' },
      { q: 'What if no one’s home?', a: 'Tell us where it’s safe to leave, or who can sign. If there’s nowhere safe, we call you and rebook the window.' },
      { q: 'Do you take things upstairs?', a: 'Yes, into the room you choose. Tell us about stairs or an elevator in your quote.' },
      { q: 'Is it insured on the way?', a: 'Yes, from pickup until it’s placed. Your written quote says how.' },
    ],
  },
];

const slug = (s) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Row ids for deep links (#how-much-will-it-cost); service rows carry their service (#moving-how-far-ahead-should-i-book)
// so a question asked in two places never shares an id. Service answers link back to their page.
function prepare(groups, service) {
  return groups.map((g) => ({
    ...g,
    items: g.items.map((it) => ({ ...it, id: service ? `${g.id}-${slug(it.q)}` : slug(it.q), link: it.link || (service ? see(g.id) : QUOTE) })),
  }));
}

export const faq = {
  groups: prepare(GROUPS, false),
  services: prepare(SERVICES, true),
};
faq.byService = Object.fromEntries(faq.services.map((g) => [g.id, g.items]));

export function faqJsonLd() {
  const all = [...faq.groups, ...faq.services].flatMap((g) => g.items);
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: all.map((it) => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: it.a } })),
  });
}
