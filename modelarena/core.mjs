export const dimensions = ['Correctness', 'Relevance', 'Clarity'];
const str = (v, max, label) => { if (typeof v !== 'string' || !v.trim() || v.length > max) throw Error(`${label} must contain 1–${max} characters.`); return v.trim(); };
export function validateSuite(input) {
  if (!input || !Array.isArray(input.models) || input.models.length !== 2) throw Error('Provide exactly two model names.');
  const models = input.models.map(v=>str(v,80,'Model name'));
  if (models[0].toLowerCase() === models[1].toLowerCase()) throw Error('Use distinct model names.');
  if (!Array.isArray(input.cases) || input.cases.length < 1 || input.cases.length > 100) throw Error('Provide 1–100 cases.');
  return { title:str(input.title,120,'Suite title'), models, cases:input.cases.map(c=>{
    if (!c || !Array.isArray(c.responses) || c.responses.length !== 2) throw Error('Each case needs two responses in model order.');
    return {prompt:str(c.prompt,12000,'Prompt'),reference:typeof c.reference==='string'?c.reference.slice(0,12000):'',responses:c.responses.map(v=>str(v,20000,'Response'))};
  })};
}
export function createRun(suite, random = Math.random) { return {version:1,suite:validateSuite(suite),orders:suite.cases.map(()=>random()<.5?[0,1]:[1,0]),ratings:suite.cases.map(()=>null),revealed:false}; }
export function validateRating(r) {
  if (!r || !Array.isArray(r.scores) || r.scores.length!==2 || r.scores.some(s=>!Array.isArray(s)||s.length!==3||s.some(v=>!Number.isInteger(v)||v<1||v>5))) throw Error('Score all six criteria from 1 to 5.');
  return {scores:r.scores.map(s=>[...s]),notes:typeof r.notes==='string'?r.notes.slice(0,4000):''};
}
export function restoreRun(data) {
  if(data?.version!==1) throw Error('Unsupported saved run.');
  const suite=validateSuite(data.suite), n=suite.cases.length;
  if(!Array.isArray(data.orders)||data.orders.length!==n||data.orders.some(o=>!Array.isArray(o)||o.length!==2||!(o[0]===0&&o[1]===1||o[0]===1&&o[1]===0))||!Array.isArray(data.ratings)||data.ratings.length!==n) throw Error('Invalid saved run.');
  const ratings=data.ratings.map(r=>r===null?null:validateRating(r));
  if(typeof data.revealed!=='boolean'||data.revealed&&ratings.some(r=>!r)) throw Error('Invalid reveal state.');
  return {version:1,suite,orders:data.orders.map(o=>[...o]),ratings,revealed:data.revealed};
}
export function summarize(run) {
  const stats=run.suite.models.map(name=>({name,count:0,total:0,criteria:[0,0,0],wins:0,ties:0}));
  run.ratings.forEach((raw,i)=>{if(!raw)return;const r=validateRating(raw), totals=r.scores.map(s=>s.reduce((a,b)=>a+b,0));
    r.scores.forEach((scores,side)=>{const s=stats[run.orders[i][side]];s.count++;s.total+=totals[side];scores.forEach((v,k)=>s.criteria[k]+=v);if(totals[side]>totals[1-side])s.wins++;if(totals[0]===totals[1])s.ties++;});
  });
  return stats.map(s=>({...s,mean:s.count?s.total/(s.count*3):null,criteria:s.criteria.map(v=>s.count?v/s.count:null)}));
}
function csvCell(v){let s=String(v);if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function exportCSV(run) {
  if(!run.revealed)throw Error('Reveal the completed run before exporting identified scores.');
  const rows=[['case','model','correctness','relevance','clarity','mean','reviewer_notes']];
  run.ratings.forEach((r,i)=>r.scores.forEach((scores,side)=>rows.push([i+1,run.suite.models[run.orders[i][side]],...scores,scores.reduce((a,b)=>a+b,0)/3,r.notes])));
  return rows.map(row=>row.map(csvCell).join(',')).join('\n');
}
