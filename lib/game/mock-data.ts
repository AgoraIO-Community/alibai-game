import type { CaseSecret, Clue, Evidence, GameCase, LeaderboardEntry, Question, Suspect } from './types'

export const CASES: GameCase[] = [
  {
    id: 'missing-diamond',
    caseNumber: 'MM-2847',
    title: 'The Missing Diamond',
    status: 'OPEN INVESTIGATION',
    location: 'Metropolitan Museum, East Wing Vault',
    date: 'Saturday, 14 March',
    summary:
      'A priceless diamond disappeared from the Metropolitan Museum during a private evening event. Security cameras stopped recording minutes before the theft. Four employees had access to the restricted area, and investigators have identified several inconsistencies in their statements.',
    durationSeconds: 180,
    suspectIds: ['alex-morgan'],
  },
]

export const SUSPECTS: Suspect[] = [
  {
    id: 'alex-morgan',
    caseId: 'missing-diamond',
    name: 'Alex Morgan',
    occupation: 'Museum Security Guard',
    background:
      'Six years on the museum night detail. Assigned to the west entrance during the gala. Known to staff as reliable, if quiet. Has held vault access for the past two years.',
    portrait: '/images/suspect-alex-morgan.png',
    avatarProviderId: 'anam:guard-01',
  },
]

export const EVIDENCE: Evidence[] = [
  {
    id: 'ev-missing',
    caseId: 'missing-diamond',
    label: 'Diamond reported missing',
    detail: 'The Hollis Diamond was discovered gone from its case during a routine sweep.',
    icon: 'gem',
    timestamp: '9:42 PM',
  },
  {
    id: 'ev-cameras',
    caseId: 'missing-diamond',
    label: 'Security cameras stopped recording',
    detail: 'All East Wing feeds went dark simultaneously. No power fault was logged.',
    icon: 'camera-off',
    timestamp: '9:38 PM',
  },
  {
    id: 'ev-access',
    caseId: 'missing-diamond',
    label: 'Only four employees had vault access',
    detail: 'Security, conservation, curation, and events each held one credential.',
    icon: 'key-round',
  },
  {
    id: 'ev-west',
    caseId: 'missing-diamond',
    label: 'Guard reported being at the west entrance',
    detail: 'Alex Morgan radioed in from the west entrance after the alarm.',
    icon: 'door-open',
    timestamp: '9:44 PM',
  },
]

export const CLUES: Clue[] = [
  { id: 'c-west-claim', caseId: 'missing-diamond', text: 'Claims to have been at the west entrance when the alarm sounded.', isKey: false, weight: 40 },
  { id: 'c-office-930', caseId: 'missing-diamond', text: 'Admits to being inside the security office at 9:30, eight minutes before the cameras died.', isKey: false, weight: 40 },
  { id: 'c-four-names', caseId: 'missing-diamond', text: 'Names the four staff with vault access: Morgan, Reyes, Whitfield, Nair.', isKey: false, weight: 40 },
  { id: 'c-deflect-dana', caseId: 'missing-diamond', text: 'Deflects suspicion toward Dana Reyes, who left the gallery early.', isKey: false, weight: 40 },
  { id: 'c-reboot', caseId: 'missing-diamond', text: 'Admits rebooting the camera system himself at 9:38.', isKey: true, weight: 100 },
  { id: 'c-no-badge', caseId: 'missing-diamond', text: 'Cannot explain the missing west entrance badge swipe between 9:30 and 9:45.', isKey: false, weight: 40 },
  { id: 'c-vault-corridor', caseId: 'missing-diamond', text: 'Admits his keycard was in the vault corridor at 9:40, two minutes before the theft was reported.', isKey: true, weight: 100 },
  { id: 'c-dana-relationship', caseId: 'missing-diamond', text: 'Downplays a two-year working relationship with Dana Reyes.', isKey: false, weight: 40 },
  { id: 'c-no-witness', caseId: 'missing-diamond', text: 'No one can confirm he stayed outside the vault while the cameras were down.', isKey: true, weight: 100 },
]

export const QUESTIONS: Question[] = [
  {
    id: 'q-alarm',
    caseId: 'missing-diamond',
    text: 'Where were you when the alarm went off?',
    unlockedBy: null,
    suspectResponse:
      "I've already told the investigators. I was checking the west entrance when the alarm went off. That's my post during events.",
    revealsClueId: 'c-west-claim',
  },
  {
    id: 'q-cameras',
    caseId: 'missing-diamond',
    text: 'When did you last check the security cameras?',
    unlockedBy: null,
    suspectResponse:
      "I did a walkthrough of the security office around nine-thirty. Everything was running then. I don't know why they stopped.",
    revealsClueId: 'c-office-930',
  },
  {
    id: 'q-access',
    caseId: 'missing-diamond',
    text: 'Who else had access to the vault?',
    unlockedBy: null,
    suspectResponse:
      'Four of us. Me, Dana Reyes from conservation, Mr. Whitfield the curator, and Priya Nair from events. Everyone had a reason to be back there.',
    revealsClueId: 'c-four-names',
  },
  {
    id: 'q-unusual',
    caseId: 'missing-diamond',
    text: 'Did you notice anything unusual during the event?',
    unlockedBy: null,
    suspectResponse:
      'Dana left the gallery early. Said she had a headache. I thought it was odd, but it wasn\u2019t my business.',
    revealsClueId: 'c-deflect-dana',
  },
  {
    id: 'q-west-log',
    caseId: 'missing-diamond',
    text: 'The west entrance log shows no badge swipe between 9:30 and 9:45. How do you explain that?',
    unlockedBy: 'c-west-claim',
    suspectResponse:
      "That reader's been faulty for weeks. Ask maintenance. I was there. I don't care what the log says.",
    revealsClueId: 'c-no-badge',
  },
  {
    id: 'q-why-office',
    caseId: 'missing-diamond',
    text: 'Why were you near the security office when the cameras stopped recording?',
    unlockedBy: 'c-office-930',
    suspectResponse:
      "I\u2014 look. I stepped back in around nine-thirty-eight because a monitor was flickering. I rebooted the system. I didn't think it would take the cameras down.",
    revealsClueId: 'c-reboot',
  },
  {
    id: 'q-dana',
    caseId: 'missing-diamond',
    text: 'How well do you know Dana Reyes?',
    unlockedBy: 'c-four-names',
    suspectResponse:
      "We've worked the same events for two years. She's decent. I don't know why you're asking me about her.",
    revealsClueId: 'c-dana-relationship',
  },
  {
    id: 'q-keycard',
    caseId: 'missing-diamond',
    text: 'Your keycard was logged in the vault corridor at 9:40. Why?',
    unlockedBy: 'c-reboot',
    suspectResponse:
      'I had to check the corridor after the reboot. Protocol. I was there thirty seconds, maybe less. I never went inside.',
    revealsClueId: 'c-vault-corridor',
  },
  {
    id: 'q-witness',
    caseId: 'missing-diamond',
    text: 'Can anyone confirm you never entered the vault?',
    unlockedBy: 'c-vault-corridor',
    suspectResponse: "No. The cameras were down, weren't they.",
    revealsClueId: 'c-no-witness',
  },
]

/** Evasive lines the mock agent uses when the detective asks something off-script. */
export const FILLER_RESPONSES = [
  "I've already told the investigators everything I know.",
  'Six years I\u2019ve worked there. Six years without a single incident. Does that count for nothing?',
  'Can I get some water? It\u2019s hot in here.',
  'You should be talking to the people who actually handle the pieces, not the guy at the door.',
  'I was doing my job. That\u2019s all I can tell you.',
]

/** Server-only in production. Included here only for the mocked admin truth panel. */
export const CASE_SECRETS: CaseSecret[] = [
  {
    caseId: 'missing-diamond',
    guiltySuspectId: 'alex-morgan',
    truth:
      'Alex Morgan rebooted the East Wing camera system at 9:38 under the pretence of fixing a flickering monitor. During the two-minute blackout he used his vault credential to enter the corridor, removed the Hollis Diamond from its case, and hid it in his guard locker. He then walked to the west entrance and radioed in after the alarm to establish his alibi.',
    establishedAlibi: 'Claims to have been stationed at the west entrance from 9:15 PM through the alarm at 9:42 PM.',
    hiddenFacts: [
      'Keycard log places Morgan in the vault corridor at 9:40 PM.',
      'The west entrance badge reader was fully functional; no swipe is recorded for Morgan between 9:30 and 9:45.',
      'Morgan owes roughly $40,000 to a private lender.',
      'Dana Reyes left early with a documented migraine and was seen by two valets at 9:31.',
    ],
    keyClueIds: ['c-reboot', 'c-vault-corridor', 'c-no-witness'],
  },
]

export const LEADERBOARD_SEED: LeaderboardEntry[] = [
  { id: 'lb-1', detectiveName: 'Vesper Hale', score: 940, casesSolved: 3, timeTakenSeconds: 118 },
  { id: 'lb-2', detectiveName: 'Marlowe K.', score: 905, casesSolved: 2, timeTakenSeconds: 131 },
  { id: 'lb-3', detectiveName: 'Inspector Ode', score: 870, casesSolved: 4, timeTakenSeconds: 142 },
  { id: 'lb-4', detectiveName: 'Sable Finch', score: 812, casesSolved: 1, timeTakenSeconds: 150 },
  { id: 'lb-5', detectiveName: 'R. Castellanos', score: 790, casesSolved: 2, timeTakenSeconds: 165 },
  { id: 'lb-6', detectiveName: 'Tamsin Grey', score: 744, casesSolved: 1, timeTakenSeconds: 171 },
  { id: 'lb-7', detectiveName: 'Det. Okafor', score: 702, casesSolved: 2, timeTakenSeconds: 176 },
  { id: 'lb-8', detectiveName: 'June Marchetti', score: 655, casesSolved: 1, timeTakenSeconds: 180 },
  { id: 'lb-9', detectiveName: 'Hollis P.', score: 610, casesSolved: 1, timeTakenSeconds: 180 },
  { id: 'lb-10', detectiveName: 'Wren Adeyemi', score: 548, casesSolved: 1, timeTakenSeconds: 180 },
]

export function getCase(caseId: string) {
  return CASES.find((c) => c.id === caseId) ?? null
}
export function getSuspect(suspectId: string) {
  return SUSPECTS.find((s) => s.id === suspectId) ?? null
}
export function getEvidenceForCase(caseId: string) {
  return EVIDENCE.filter((e) => e.caseId === caseId)
}
export function getCluesForCase(caseId: string) {
  return CLUES.filter((c) => c.caseId === caseId)
}
export function getQuestionsForCase(caseId: string) {
  return QUESTIONS.filter((q) => q.caseId === caseId)
}
export function getClue(clueId: string) {
  return CLUES.find((c) => c.id === clueId) ?? null
}
export function getQuestion(questionId: string) {
  return QUESTIONS.find((q) => q.id === questionId) ?? null
}
export function getCaseSecret(caseId: string) {
  return CASE_SECRETS.find((s) => s.caseId === caseId) ?? null
}
