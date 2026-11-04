import { allEvidence, publicEvidenceDTO, questionDTO, type Scenario } from './schema';
export function notebook(s:Scenario,factIds:string[]){const found=new Set(factIds);return allEvidence(s).filter(e=>e.availability==='public'||e.trigger.allFactIds.every(id=>found.has(id))).map(publicEvidenceDTO)}
export function suggestions(s:Scenario,factIds:string[],offset=0){
 if (!Number.isInteger(offset) || offset < 0) throw new Error('Invalid question offset');
 const known=new Set([...factIds,...notebook(s,factIds).map(e=>e.id)]);
 const eligible=s.suggestedQuestions.filter(q=>q.spoilerSafety!=='spoiler'&&q.prerequisiteIds.every(id=>known.has(id))).sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id));
 return {questions:eligible.slice(offset,offset+3).map(questionDTO),more:offset+3<eligible.length?offset+3:null};
}
export function briefing(s:Scenario,sessionId:string,casting?:{avatarId:string;voiceId:string}){return {sessionId,caseId:s.scenarioId,title:s.title,publicBriefing:s.publicBriefing,publicSuspect:{...s.suspect,...casting},publicEvidence:notebook(s,[]),initialSuggestedQuestions:suggestions(s,[]).questions}}
export function score(s:Scenario,verdict:'guilty'|'innocent',evidenceIds:string[],factIds:string[],elapsedSeconds:number){
 if (!Number.isFinite(elapsedSeconds)) throw new Error('Invalid elapsed time');
 const cited=new Set(evidenceIds),found=new Set(factIds.filter(id=>s.knowledge.facts.some(f=>f.id===id)));
 const visible=new Set(notebook(s,[...found]).map(e=>e.id));
 const verdictPoints=verdict===s.answerKey.verdict?500:0;
 const evidencePoints=Math.floor(300*s.answerKey.pivotal.filter(p=>cited.has(p.evidenceId)&&visible.has(p.evidenceId)).length/s.answerKey.pivotal.length);
 const factPoints=Math.floor(150*found.size/s.knowledge.facts.length);
 const timePoints=Math.floor(50*Math.max(0,180-Math.max(0,elapsedSeconds))/180);
 return {verdictPoints,evidencePoints,factPoints,timePoints,total:verdictPoints+evidencePoints+factPoints+timePoints,scoringVersion:1,reasonCodes:[verdictPoints?'VERDICT_CORRECT':'VERDICT_INCORRECT',...(evidencePoints<300?['PIVOTAL_EVIDENCE_MISSING']:[])]};
}
