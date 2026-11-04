// IDs checked against MiniMax's primary system catalog on 2026-11-04:
// https://platform.minimax.io/docs/faq/system-voice-id
// Selection rationales are casting judgments, not claims of listening or visual review.
// All voices remain provisional until auditioned with the actual Anam rendering.
export const AVATAR_VOICES = [
  {
    "avatarId": "36d8b673-a812-4656-8589-f518bdfab4c1",
    "catalogName": "David - Decision Coach",
    "voiceId": "English_Steadymentor",
    "rationale": "A measured coaching delivery is a plausible fit for the decision-coach role; appearance not reviewed.",
    "selectionBasis": "catalog-role-provisional",
    "auditionStatus": "pending",
    "managedAvailability": "unverified"
  },
  {
    "avatarId": "32673c5e-f85f-4a87-a104-b92b7de9cb39",
    "catalogName": "Mei - Mandarin Partner",
    "voiceId": "English_Graceful_Lady",
    "rationale": "A restrained adult delivery for conversation; English is the game language, independent of the catalog Mandarin-partner role. Appearance not reviewed.",
    "selectionBasis": "catalog-role-provisional",
    "auditionStatus": "pending",
    "managedAvailability": "unverified"
  },
  {
    "avatarId": "ccf00c0e-7302-455b-ace2-057e0cf58127",
    "catalogName": "Kevin - Language Tutor",
    "voiceId": "English_PatientMan",
    "rationale": "Patient conversational pacing suits the language-tutor role; appearance not reviewed.",
    "selectionBasis": "catalog-role-provisional",
    "auditionStatus": "pending",
    "managedAvailability": "unverified"
  },
  {
    "avatarId": "6f7d4c45-4b5a-4258-9518-b48c2e92be1b",
    "catalogName": "Arthur - Roman History Professor",
    "voiceId": "English_WiseScholar",
    "rationale": "A scholarly delivery fits the history-professor role; age and appearance need visual review.",
    "selectionBasis": "catalog-role-provisional",
    "auditionStatus": "pending",
    "managedAvailability": "unverified"
  },
  {
    "avatarId": "c98240cb-78df-4ddf-a042-000ffa1821e6",
    "catalogName": "Eleanor - Patient Roleplay",
    "voiceId": "English_Wiselady",
    "rationale": "A composed mature delivery is a provisional patient-role casting; age and appearance not reviewed.",
    "selectionBasis": "catalog-role-provisional",
    "auditionStatus": "pending",
    "managedAvailability": "unverified"
  },
  {
    "avatarId": "400b9683-114e-4336-8348-f78a6860de54",
    "catalogName": "Mateo - Portuguese Barista",
    "voiceId": "English_FriendlyPerson",
    "rationale": "An approachable conversational delivery fits the barista role; no accent or language is inferred from the catalog name. Appearance not reviewed.",
    "selectionBasis": "catalog-role-provisional",
    "auditionStatus": "pending",
    "managedAvailability": "unverified"
  },
  {
    "avatarId": "9e34b769-2fa0-44d8-893a-10ef913aa60e",
    "catalogName": "Gavin - Site Compliance Foreman",
    "voiceId": "English_Diligent_Man",
    "rationale": "Practical, focused delivery suits a site foreman; appearance not reviewed.",
    "selectionBasis": "catalog-role-provisional",
    "auditionStatus": "pending",
    "managedAvailability": "unverified"
  },
  {
    "avatarId": "ecfb2ddb-80ec-4526-88a7-299a4738957c",
    "catalogName": "Hunter - Consultative Sales",
    "voiceId": "English_Debator",
    "rationale": "Clear, articulate delivery fits consultative conversation; appearance not reviewed.",
    "selectionBasis": "catalog-role-provisional",
    "auditionStatus": "pending",
    "managedAvailability": "unverified"
  },
  {
    "avatarId": "a64dd018-7dff-4f86-a623-0230f71fffa6",
    "catalogName": "Harold - Executive Coach",
    "voiceId": "English_Deep-VoicedGentleman",
    "rationale": "A mature register is a provisional executive-coach casting; appearance not reviewed.",
    "selectionBasis": "catalog-role-provisional",
    "auditionStatus": "pending",
    "managedAvailability": "unverified"
  },
  {
    "avatarId": "8d832471-2229-471a-86bb-ef3b9849647e",
    "catalogName": "Lio Wren - Bakery Apprentice",
    "voiceId": "English_DecentYoungMan",
    "rationale": "Matches the authored 30-year-old male apprentice and earnest, plainspoken delivery; generated avatar and audio still need audition.",
    "selectionBasis": "authored-prompt-match",
    "auditionStatus": "pending",
    "managedAvailability": "unverified"
  },
  {
    "avatarId": "76c28378-31c2-4b17-849c-a8cab2a700fd",
    "catalogName": "Nessa Quill - Route Coordinator",
    "voiceId": "English_ConfidentWoman",
    "rationale": "Matches the authored 36-year-old woman and brisk, professional coordinator delivery; generated avatar and audio still need audition.",
    "selectionBasis": "authored-prompt-match",
    "auditionStatus": "pending",
    "managedAvailability": "unverified"
  },
  {
    "avatarId": "a7665182-6b91-4e51-9baf-5f815ffac08c",
    "catalogName": "Mara - Clock Restorer",
    "voiceId": "English_CalmWoman",
    "rationale": "Matches the authored 38-year-old woman and precise, measured restorer delivery; generated avatar and audio still need audition.",
    "selectionBasis": "authored-prompt-match",
    "auditionStatus": "pending",
    "managedAvailability": "unverified"
  },
  {
    "avatarId": "b9360f87-0c5c-40c3-9def-e54044fa159e",
    "catalogName": "Vesper - 2055 City Guide",
    "voiceId": "English_SereneWoman",
    "rationale": "Provisional calm city-guide casting only; no authored prompt or inspected appearance was available for Vesper.",
    "selectionBasis": "catalog-role-provisional",
    "auditionStatus": "pending",
    "managedAvailability": "unverified"
  },
  {
    "avatarId": "a9282e1d-7261-4eee-ae7e-c990f40b2826",
    "catalogName": "Bren Ash - Canal Maintenance Scheduler",
    "voiceId": "English_MaturePartner",
    "rationale": "Matches the authored 43-year-old man and grounded, matter-of-fact scheduler delivery; generated avatar and audio still need audition.",
    "selectionBasis": "authored-prompt-match",
    "auditionStatus": "pending",
    "managedAvailability": "unverified"
  }
] as const;

export function getAvatarVoice(avatarId: string) {
  const voice = AVATAR_VOICES.find(entry => entry.avatarId === avatarId);
  if (!voice) throw new Error('UNKNOWN_AVATAR_VOICE');
  return voice;
}

/** Validate the frozen session voice without silently changing it after catalog edits. */
export function validateSessionVoice(voiceId: string): string {
  if (!AVATAR_VOICES.some(entry => entry.voiceId === voiceId)) throw new Error('UNKNOWN_MINIMAX_VOICE');
  return voiceId;
}
