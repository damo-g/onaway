// Moving · From quote to keys (MV-02). Five stops per space; edit freely.
// A plain string is always shown. { add, t } shows only while that add-on chip is on
// (packing · boxes · clean); link + href turn those words into a link.
export const MOVING = {
  home: [
    { n: 'Request a quote', t: ['What, from where, to where, when', 'Stairs, elevators and parking noted', 'Big or awkward items flagged'] },
    { n: 'Get it in writing', t: ['Crew size and arrival window', 'Truck and timing', 'Every cost, itemized', 'In writing within 2 hours', { add: 'packing', t: 'Packing plan and materials, costed' }] },
    { n: 'Confirm your date', t: ['Date and window held in writing', 'Elevator and loading dock booked with your building', 'One person to call', { add: 'boxes', t: 'Boxes and tape dropped off before the day' }] },
    { n: 'Moving day', t: ['Floors and door frames protected', 'Furniture wrapped in blankets and stretch wrap', 'Beds and tables taken apart', 'Loaded, driven, unloaded', { add: 'packing', t: 'Kitchen, closets and fragiles packed by the crew' }] },
    { n: 'Final walkthrough', t: ['Every room placed where you chose', 'Furniture put back together', 'You check every room before we go', { add: 'boxes', t: 'Empty boxes collected' }, { add: 'clean', t: 'Move-out clean at the old place', link: 'Move-out clean', href: '/cleaning/' }] },
  ],
  business: [
    { n: 'Request a quote', t: ['Floors, desks and equipment', 'Building rules and elevator times noted', 'Evenings and weekends if needed'] },
    { n: 'Get it in writing', t: ['Crew, timing and every cost', 'Out-of-hours priced up front', 'Certificate of insurance on request', { add: 'packing', t: 'Packing plan and materials, costed' }] },
    { n: 'Confirm your date', t: ['One coordinator, start to finish', 'Building and loading dock booked', 'Schedule agreed with your team', { add: 'boxes', t: 'Crates delivered for desks and files' }] },
    { n: 'Moving day', t: ['Every item labelled to its spot', 'Desks, chairs and equipment moved', 'Floors, walls and doors protected', { add: 'packing', t: 'Desks and files packed by the crew' }] },
    { n: 'Final walkthrough', t: ['Desks and furniture placed to plan', 'Labels removed', 'You check every floor before we leave', { add: 'boxes', t: 'Crates collected' }, { add: 'clean', t: 'Move-out clean of the old office', link: 'Move-out clean', href: '/cleaning/' }] },
  ],
};
