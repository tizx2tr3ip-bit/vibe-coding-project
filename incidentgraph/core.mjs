export const schema=['timestamp','action','user','source','host','outcome'];
const allowed=new Set(['login','privilege_change','file_access','session_end']);
export function csvRows(text){
  const rows=[]; let row=[],s='',quote=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quote&&text[i+1]==='"'){s+='"';i++;}else if(quote||s==='')quote=!quote;else throw Error('Unexpected quote in CSV.');}else if(c===','&&!quote){row.push(s);s='';}else if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&text[i+1]==='\n')i++;row.push(s);if(row.some(v=>v.trim()))rows.push(row);row=[];s='';}else s+=c;}
  if(quote)throw Error('CSV contains an unclosed quoted field.');row.push(s);if(row.some(v=>v.trim()))rows.push(row);return rows;
}
export function parseLogs(text){
  if(text.length>5_000_000)throw Error('File exceeds 5 MB. Split it into smaller files.');
  text=text.replace(/^\uFEFF/,'').trim();if(!text)throw Error('Choose a log file or paste some events first.');let records;
  if(text.startsWith('[')){try{records=JSON.parse(text);}catch{throw Error('Invalid JSON array. Check commas, quotes, and brackets.');}}
  else if(text.startsWith('{')){try{records=text.split(/\r?\n/).filter(s=>s.trim()).map(s=>JSON.parse(s));}catch{throw Error('Use a JSON array or one complete JSON object per line (NDJSON).');}}
  else{const [head,...rows]=csvRows(text);if(!head)throw Error('CSV is empty.');const keys=head.map(s=>s.trim().toLowerCase());if(new Set(keys).size!==keys.length)throw Error('CSV has duplicate column names.');records=rows.map((r,i)=>{if(r.length!==keys.length)return {_error:`CSV row ${i+2} has ${r.length} cells; expected ${keys.length}.`};return Object.fromEntries(keys.map((k,j)=>[k,r[j]]));});}
  if(!Array.isArray(records)||!records.length)throw Error('No events found.');if(records.length>10000)throw Error('Maximum 10,000 events per case. Split this file.');
  const events=[],errors=[];records.forEach((r,i)=>{try{
    if(!r||typeof r!=='object'||Array.isArray(r))throw Error('Expected an event object.');if(r._error)throw Error(r._error);
    for(const k of schema)if(typeof r[k]!=='string'||!r[k].trim())throw Error(`Missing text field: ${k}.`);
    const timestamp=r.timestamp.trim();if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(timestamp)||!Number.isFinite(Date.parse(timestamp)))throw Error('timestamp must be ISO 8601 with an explicit timezone.');
    const [year,month,day,hour,minute,second]=timestamp.slice(0,19).split(/[-T:]/).map(Number);if(month<1||month>12||day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate()||hour>23||minute>59||second>59)throw Error('timestamp contains an invalid calendar date or time.');
    const action=r.action.trim().toLowerCase(),outcome=r.outcome.trim().toLowerCase();if(!allowed.has(action))throw Error(`Unsupported action: ${action}.`);if(!['success','failure'].includes(outcome))throw Error('outcome must be success or failure.');
    for(const k of ['user','source','host'])if(r[k].length>200)throw Error(`${k} exceeds 200 characters.`);
    const details=typeof r.details==='string'?r.details.slice(0,2000):'';
    events.push({id:`EV-${String(i+1).padStart(4,'0')}`,timestamp:new Date(timestamp).toISOString(),time:Date.parse(timestamp),action,outcome,user:r.user.trim(),source:r.source.trim(),host:r.host.trim(),details,raw:JSON.stringify(r,null,2),row:i+1});
  }catch(e){errors.push({row:i+1,message:e.message});}});
  events.sort((a,b)=>a.time-b.time||a.row-b.row);return {events,errors,total:records.length,records};
}
export function detect(events,options={}){
  const threshold=options.threshold??5,windowMinutes=options.windowMinutes??10;
  if(!Number.isInteger(threshold)||threshold<3||threshold>30||!Number.isInteger(windowMinutes)||windowMinutes<1||windowMinutes>60)throw Error('Invalid detection settings.');
  const windowMs=windowMinutes*60000,findings=[],seen=new Set();
  function add(rule,severity,title,explanation,rows,entities){const ids=[...new Set(rows.map(r=>r.id))];const key=rule+'|'+ids.join(',');if(seen.has(key))return;seen.add(key);findings.push({id:`F-${String(findings.length+1).padStart(3,'0')}`,rule,severity,title,explanation,eventIds:ids,entities,time:Math.max(...rows.map(r=>r.time))});}
  const byIdentity=new Map(),bySource=new Map();
  for(const e of [...events].sort((a,b)=>a.time-b.time)){
    if(e.action==='login'){
      const key=JSON.stringify([e.source,e.user,e.host]);let history=(byIdentity.get(key)||[]).filter(x=>e.time-x.time<=windowMs);
      if(e.outcome==='failure')history.push(e);
      if(e.outcome==='success'&&history.length>=threshold)add('success-after-failures','high','Successful login after repeated failures',`${history.length} failed logins followed by a success for ${e.user} on ${e.host}, from the same source within ${windowMinutes} minutes. Verify whether the account owner initiated this session.`,[...history,e],[e.source,e.user,e.host]);
      if(e.outcome==='success')history=[];byIdentity.set(key,history);
      if(e.outcome==='failure'){
        const recent=(bySource.get(e.source)||[]).filter(x=>e.time-x.time<=windowMs);recent.push(e);bySource.set(e.source,recent);
        const users=new Set(recent.map(x=>x.user));
        if(users.size>=threshold&&!findings.some(f=>f.rule==='multi-account-failures'&&f.entities[0]===e.source&&e.time-f.time<windowMs))add('multi-account-failures','medium','One source tried multiple accounts',`Failed logins from ${e.source} targeted ${users.size} distinct users within ${windowMinutes} minutes. Shared infrastructure or a misconfigured service can also cause this pattern.`,recent,[e.source,...users]);
      }
    }
    if(e.action==='privilege_change'&&e.outcome==='success'){
      const prior=findings.filter(f=>f.rule==='success-after-failures'&&f.entities.includes(e.user)&&f.entities.includes(e.host)&&e.time>=f.time&&e.time-f.time<=30*60000);
      if(prior.length){const f=prior.at(-1);add('privilege-after-suspicious-login','high','Privilege change after suspicious login',`A successful privilege change for ${e.user} on ${e.host} occurred within 30 minutes of a login flagged by the repeated-failure rule. Review the role change and session ownership.`,[...events.filter(x=>f.eventIds.includes(x.id)),e],[e.user,e.host,e.source]);}
    }
  }
  return findings.sort((a,b)=>(a.severity==='high'?0:1)-(b.severity==='high'?0:1)||b.time-a.time);
}
export function filterEvents(events,{query='',outcome='all',action='all',ids=null}={}){const q=query.trim().toLowerCase();return events.filter(e=>(!ids||ids.includes(e.id))&&(outcome==='all'||e.outcome===outcome)&&(action==='all'||e.action===action)&&(!q||[e.id,e.user,e.source,e.host,e.action,e.details].some(v=>v.toLowerCase().includes(q))));}
export function sampleEvents(){
  const rows=[],start=Date.parse('2026-10-14T08:00:00Z');const add=(min,action,user,source,host,outcome,details)=>rows.push({timestamp:new Date(start+min*60000).toISOString(),action,user,source,host,outcome,details});
  const users=['m.chen','a.patel','s.morgan','j.rivera','l.park','n.ali'];
  for(let i=0;i<58;i++){const u=users[i%users.length];add(i*1.4,'login',u,`10.24.1.${20+i%6}`,i%3===0?'vpn-gateway':'workspace-01',i===8||i===27?'failure':'success',i===8||i===27?'Password mistyped; subsequent login succeeded.':'Routine employee session.');}
  ['admin','svc.backup','m.chen','a.patel','ops.deploy','root'].forEach((u,i)=>add(22+i*.45,'login',u,'203.0.113.42','vpn-gateway','failure','Authentication rejected: invalid credentials.'));
  for(let i=0;i<7;i++)add(28+i*.65,'login','ops.deploy','203.0.113.42','build-runner-02','failure','SSH password authentication failed.');
  add(33,'login','ops.deploy','203.0.113.42','build-runner-02','success','SSH session accepted. Session: ssh-8842.');
  add(36,'privilege_change','ops.deploy','203.0.113.42','build-runner-02','success','Account added to deployment-admins. Change ticket: absent.');
  add(38,'file_access','ops.deploy','203.0.113.42','build-runner-02','success','Read /srv/releases/config.env. File content is not recorded.');
  add(43,'session_end','ops.deploy','203.0.113.42','build-runner-02','success','Session ssh-8842 closed.');
  add(53,'privilege_change','a.patel','10.24.1.21','workspace-01','success','Approved role update. Change ticket: CHG-2041.');
  return rows.sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
}
export function caseReport({name,events,findings,notes,bookmarks,settings,isSample}){
  const lines=[`# ${name}`,'',`Exported: ${new Date().toISOString()}`,`Dataset: ${isSample?'Synthetic training scenario':'User-imported logs'}`,`Events: ${events.length} | Findings: ${findings.length}`,'','## Method',`Rules: ${settings.threshold} failures or distinct accounts within ${settings.windowMinutes} minutes; privilege-change correlation within 30 minutes. Findings are leads, not proof of compromise. No geolocation, threat intelligence, or machine learning is used.`,'','## Findings'];
  for(const f of findings)lines.push('',`### ${f.title} (${f.severity})`,f.explanation,`Rule: ${f.rule}`,`Evidence: ${f.eventIds.join(', ')}`);
  lines.push('','## Analyst notes',notes||'No notes recorded.','','## Bookmarked evidence');
  for(const e of events.filter(e=>bookmarks.includes(e.id)))lines.push('',`### ${e.id} · ${e.timestamp}`,`${e.user} | ${e.source} → ${e.host} | ${e.action} | ${e.outcome}`,e.details,'```json',e.raw,'```');return lines.join('\n');
}
