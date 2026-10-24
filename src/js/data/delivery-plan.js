// Delivery · What's included (MV-02 component). Five stops per space; edit freely.
// A plain string is always shown. { add, t } shows only while that add-on chip is on (assembly).
// Client to confirm: carry-in and stairs, assembly, size and weight limits, signatures.
export const DELIVERY = {
  home: [
    { n: 'Pickup', t: ['From a store, a seller or your old place', 'Checked against what you told us'] },
    { n: 'Wrapped and secured', t: ['Blankets and wrap on anything that can scratch', 'Strapped for the ride'] },
    { n: 'A message on the way', t: ['A text when we set off', 'Inside the window we gave you'] },
    { n: 'Carried in and placed', t: ['Carried to the room you choose', 'Packaging taken away on request', { add: 'assembly', t: 'Assembled where it’s going' }] },
    { n: 'You check it', t: ['You look it over before we leave', 'Anything wrong, sorted on the spot'] },
  ],
  business: [
    { n: 'Pickup', t: ['From your shop, warehouse or supplier', 'Labelled to its drop'] },
    { n: 'Wrapped and secured', t: ['Protected for the trip', 'Loaded in drop order'] },
    { n: 'A message on the way', t: ['Your customer gets a text when we set off', 'Inside the window you promised them'] },
    { n: 'Carried in and placed', t: ['Delivered to the door, room or loading dock', 'Signed for on request', { add: 'assembly', t: 'Assembled on site' }] },
    { n: 'You check it', t: ['Proof of delivery to you', 'Any issue reported the same day'] },
  ],
};
