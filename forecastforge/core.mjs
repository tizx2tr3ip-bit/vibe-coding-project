export function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  if (lines.shift()?.trim().toLowerCase() !== 'date,value') throw Error('Use the header date,value.');
  const rows = lines.map((line, i) => {
    const cells = line.split(',').map(x => x.trim());
    const [date, raw] = cells;
    if (cells.length !== 2 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !raw || !Number.isFinite(Number(raw))) throw Error(`Invalid date or value on row ${i + 2}.`);
    const stamp = Date.parse(date + 'T00:00:00Z');
    if (!Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0, 10) !== date) throw Error(`Invalid calendar date on row ${i + 2}.`);
    return { date, value: Number(raw), stamp };
  });
  if (rows.length < 12 || rows.length > 5000) throw Error('Provide between 12 and 5,000 observations.');
  for (let i = 1; i < rows.length; i++) if (rows[i].stamp <= rows[i-1].stamp) throw Error('Dates must be unique and in ascending order.');
  const step = rows[1].stamp - rows[0].stamp;
  if (rows.some((r, i) => i && r.stamp - rows[i-1].stamp !== step)) throw Error('Use equally spaced dates (for example daily or weekly). Missing dates and variable-length months are not supported.');
  return rows;
}
export const names = { naive: 'Last value', mean: 'Recent mean', trend: 'Linear trend', seasonal: 'Seasonal repeat' };
export function predict(values, horizon, method, season = 7) {
  if (!values.length || values.some(x => !Number.isFinite(x)) || !Number.isInteger(horizon) || horizon < 1 || !Number.isInteger(season) || season < 2) throw Error('Invalid forecast input.');
  const n = values.length;
  if (method === 'naive') return Array(horizon).fill(values[n-1]);
  if (method === 'mean') { const tail = values.slice(-Math.min(7, n)); return Array(horizon).fill(tail.reduce((a,b) => a+b,0) / tail.length); }
  if (method === 'seasonal') { if (n < season * 2) throw Error('Seasonal repeat needs two full cycles in training.'); return Array.from({length:horizon}, (_,i) => values[n-season+i%season]); }
  if (method === 'trend') {
    const xm = (n-1)/2, ym = values.reduce((a,b)=>a+b,0)/n;
    const den = values.reduce((s,_,i)=>s+(i-xm)**2,0);
    const slope = den ? values.reduce((s,y,i)=>s+(i-xm)*(y-ym),0)/den : 0;
    return Array.from({length:horizon},(_,i)=>ym+slope*(n+i-xm));
  }
  throw Error('Unknown method.');
}
export function analyze(rows, { horizon = 14, season = 7, method = 'auto', scenario = 0 } = {}) {
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > 90 || !Number.isInteger(season) || season < 2 || season > 365 || !Number.isFinite(scenario) || scenario < -100 || scenario > 100) throw Error('Invalid forecast settings.');
  const values = rows.map(r=>r.value), holdout = Math.max(3, Math.floor(values.length * .2));
  const train = values.slice(0,-holdout), actual = values.slice(-holdout);
  const scores = Object.keys(names).filter(m=>m !== 'seasonal' || train.length >= season*2).map(m=> {
    const predictions = predict(train, holdout, m, season);
    const errors = actual.map((y,i)=>y-predictions[i]);
    return { method:m, mae:errors.reduce((s,e)=>s+Math.abs(e),0)/holdout, rmse:Math.sqrt(errors.reduce((s,e)=>s+e*e,0)/holdout), predictions };
  }).sort((a,b)=>a.mae-b.mae);
  const selected = method === 'auto' ? scores[0] : scores.find(s=>s.method===method);
  if (!selected) throw Error('Selected method needs more training data. Reduce the season length or choose another method.');
  const baseline = predict(values, horizon, selected.method, season);
  const step = rows[1].stamp-rows[0].stamp;
  const future = baseline.map((value,i)=>({date:new Date(rows.at(-1).stamp+step*(i+1)).toISOString().slice(0,10),value,scenario:value*(1+scenario/100)}));
  if (future.some(r=>!Number.isFinite(r.value)||!Number.isFinite(r.scenario)) || scores.some(s=>!Number.isFinite(s.mae)||!Number.isFinite(s.rmse))) throw Error('Values are too large to calculate safely.');
  return { scores, selected, future, holdout };
}
export function sampleCSV() {
  return 'date,value\n' + Array.from({length:84},(_,i)=>`${new Date(Date.UTC(2026,7,1+i)).toISOString().slice(0,10)},${(120+i*.7+[0,5,8,3,15,40,32][i%7]+Math.sin(i*2.3)*5).toFixed(2)}`).join('\n');
}
export function exportCSV(result) { return 'date,baseline,scenario\n'+result.future.map(r=>`${r.date},${r.value},${r.scenario}`).join('\n'); }
