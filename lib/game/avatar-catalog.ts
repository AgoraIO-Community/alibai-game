// Approved visual actors extracted from the user's Anam dashboard HTML.
// These studio labels are casting metadata, not the in-game suspect identity.
// API entitlement and appearance have not been verified for every actor.
export const AVATAR_CATALOG = [
  {
    "avatarId": "36d8b673-a812-4656-8589-f518bdfab4c1",
    "catalogName": "David - Decision Coach"
  },
  {
    "avatarId": "32673c5e-f85f-4a87-a104-b92b7de9cb39",
    "catalogName": "Mei - Mandarin Partner"
  },
  {
    "avatarId": "ccf00c0e-7302-455b-ace2-057e0cf58127",
    "catalogName": "Kevin - Language Tutor"
  },
  {
    "avatarId": "6f7d4c45-4b5a-4258-9518-b48c2e92be1b",
    "catalogName": "Arthur - Roman History Professor"
  },
  {
    "avatarId": "c98240cb-78df-4ddf-a042-000ffa1821e6",
    "catalogName": "Eleanor - Patient Roleplay"
  },
  {
    "avatarId": "400b9683-114e-4336-8348-f78a6860de54",
    "catalogName": "Mateo - Portuguese Barista"
  },
  {
    "avatarId": "9e34b769-2fa0-44d8-893a-10ef913aa60e",
    "catalogName": "Gavin - Site Compliance Foreman"
  },
  {
    "avatarId": "ecfb2ddb-80ec-4526-88a7-299a4738957c",
    "catalogName": "Hunter - Consultative Sales"
  },
  {
    "avatarId": "a64dd018-7dff-4f86-a623-0230f71fffa6",
    "catalogName": "Harold - Executive Coach"
  },
  {
    "avatarId": "8d832471-2229-471a-86bb-ef3b9849647e",
    "catalogName": "Lio Wren - Bakery Apprentice"
  },
  {
    "avatarId": "76c28378-31c2-4b17-849c-a8cab2a700fd",
    "catalogName": "Nessa Quill - Route Coordinator"
  },
  {
    "avatarId": "a7665182-6b91-4e51-9baf-5f815ffac08c",
    "catalogName": "Mara - Clock Restorer"
  },
  {
    "avatarId": "b9360f87-0c5c-40c3-9def-e54044fa159e",
    "catalogName": "Vesper - 2055 City Guide"
  },
  {
    "avatarId": "a9282e1d-7261-4eee-ae7e-c990f40b2826",
    "catalogName": "Bren Ash - Canal Maintenance Scheduler"
  }
] as const;
export type AvatarId = typeof AVATAR_CATALOG[number]['avatarId'];
export function getAvatar(avatarId: string) {
  const avatar = AVATAR_CATALOG.find(item => item.avatarId === avatarId);
  if (!avatar) throw new Error('Unknown avatar in session casting');
  return avatar;
}
