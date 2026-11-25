import {dimensions,validateSuite,createRun,restoreRun,validateRating,summarize,exportCSV} from './core.mjs';
import {sample} from './sample.mjs';
const $=id=>document.getElementById(id), key='modelarena-v1', fmt=n=>n.toFixed(2);
const random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
let run=createRun(sample,random), current=0, demo=true, adding=false, dirty=false;
try{const saved=localStorage.getItem(key);if(saved){const data=JSON.parse(saved);run=restoreRun(data.run);demo=!!data.demo;current=Math.max(0,run.ratings.findIndex(r=>!r));}}catch{$('notice').textContent='Saved data could not be restored. The demo is loaded; export it before replacing saved data.';}
function persist(){try{localStorage.setItem(key,JSON.stringify({run,demo}));$('saveStatus').textContent='Saved on this device';}catch{$('saveStatus').textContent='Local saving unavailable — export a backup';}}
function download(text,name,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function el(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function clearError(){$('error').textContent='';}
function ask(message){return new Promise(resolve=>{
 const dialog=el('dialog'),form=el('form'),title=el('h2','Confirm session change'),body=el('p',message),cancel=el('button','Keep current session'),accept=el('button','Continue','primary');
 title.id='confirmation-title';dialog.setAttribute('aria-labelledby',title.id);form.method='dialog';cancel.value='cancel';accept.value='confirm';form.append(title,body,cancel,accept);dialog.append(form);document.body.append(dialog);
 dialog.addEventListener('close',()=>{const confirmed=dialog.returnValue==='confirm';dialog.remove();resolve(confirmed);},{once:true});dialog.showModal();cancel.focus();
});}
async function abandon(){return !dirty||await ask('Discard the unsaved scores on this case?');}
function replaceRun(suite,isDemo=false){run=createRun(suite,random);current=0;demo=isDemo;dirty=false;persist();render();}
function render(){
 clearError();const done=run.ratings.filter(Boolean).length;
 $('title').textContent=run.suite.title;$('mode').textContent=demo?'FICTIONAL DEMO':'YOUR COMPARISON';$('progress').textContent=`${done} / ${run.suite.cases.length} cases scored`;$('meter').max=run.suite.cases.length;$('meter').value=done;
 $('judge').hidden=run.revealed;$('results').hidden=!run.revealed;$('ready').hidden=done!==run.suite.cases.length;
 $('case').replaceChildren(...run.suite.cases.map((_,i)=>{const o=el('option',`${i+1} / ${run.suite.cases.length}${run.ratings[i]?' · scored':''}`);o.value=i;return o;}));$('case').value=current;
 if(run.revealed){renderResults();return;}
 const c=run.suite.cases[current],r=run.ratings[current];$('prompt').textContent=c.prompt;$('reference').textContent=c.reference||'No reference supplied. Independently check correctness before scoring.';$('referenceBlock').open=false;
 $('responses').replaceChildren(...run.orders[current].map((model,side)=>{
   const card=el('article',undefined,'response'),head=el('header');head.append(el('h3',`Response ${side?'B':'A'}`),el('span','IDENTITY HIDDEN'));card.append(head,el('div',c.responses[model],'answer'));const scores=el('div',undefined,'scores');
   dimensions.forEach((dimension,k)=>{const row=el('div',undefined,'score-row'),label=el('label',dimension),select=el('select');label.htmlFor=`score-${side}-${k}`;label.append(el('small',['Factually accurate & sound','Follows the prompt & constraints','Clear and understandable'][k]));select.id=`score-${side}-${k}`;select.setAttribute('aria-label',`Response ${side?'B':'A'} ${dimension}`);const placeholder=el('option','Score');placeholder.value='';select.append(placeholder);for(let v=1;v<=5;v++){const option=el('option',String(v));option.value=v;select.append(option);}select.value=r?r.scores[side][k]:'';select.onchange=()=>{dirty=true;};row.append(label,select);scores.append(row);});card.append(scores);return card;
 }));$('notes').value=r?.notes||'';$('save').textContent=done===run.suite.cases.length?'Update scores':'Save scores & next case';$('add').disabled=run.suite.cases.length>=100;
}
function renderResults(){
 const stats=summarize(run),gap=stats[0].mean-stats[1].mean;
 $('resultNote').textContent=`${run.suite.cases.length} paired cases · ${gap===0?'Equal mean scores.':`${stats[gap>0?0:1].name} received the higher mean score in this run.`}`;
 $('summary').replaceChildren(...stats.map(s=>{const card=el('article');card.append(el('h3',s.name),el('strong',fmt(s.mean)+' / 5'),el('span',`${s.count} cases · equally weighted criteria`));return card;}));
 $('breakdown').replaceChildren(...stats.map(s=>{const tr=el('tr');[s.name,...s.criteria.map(fmt),s.wins,s.ties].forEach(v=>tr.append(el('td',String(v))));return tr;}));
 $('trail').replaceChildren(...run.suite.cases.map((c,i)=>{const d=el('details',undefined,'trail-case');d.append(el('summary',`Case ${i+1} · ${c.prompt.slice(0,90)}${c.prompt.length>90?'…':''}`),el('p',c.prompt));run.orders[i].forEach((m,side)=>{d.append(el('h4',`${side?'B':'A'}: ${run.suite.models[m]} · ${run.ratings[i].scores[side].join(' / ')} (correctness / relevance / clarity)`),el('p',c.responses[m]));});if(c.reference)d.append(el('p','Reference: '+c.reference));d.append(el('p','Reviewer notes: '+(run.ratings[i].notes||'None')));return d;}));
}
$('notes').oninput=()=>{dirty=true;};
$('case').onchange=async()=>{if(!await abandon()){$('case').value=current;return;}current=+$('case').value;dirty=false;render();};
$('save').onclick=()=>{try{const scores=[0,1].map(side=>dimensions.map((_,k)=>Number($(`score-${side}-${k}`).value)));run.ratings[current]=validateRating({scores,notes:$('notes').value});dirty=false;const next=run.ratings.findIndex(r=>!r);if(next>=0)current=next;persist();render();$('notice').textContent='Scores saved.';}catch(e){$('error').textContent=e.message;}};
$('reveal').onclick=()=>{if(dirty){$('error').textContent='Save your score changes before revealing.';return;}if(run.ratings.some(r=>!r))return;run.revealed=true;persist();render();$('results').scrollIntoView({behavior:'smooth',block:'start'});};
$('csv').onclick=()=>download(exportCSV(run),'modelarena-scores.csv','text/csv');
$('backup').onclick=()=>{download(JSON.stringify({run,demo},null,2),'modelarena-session.json','application/json');$('notice').textContent='Session exported with saved scores and model identities. Unsaved edits are not included. Keep it private during a blind review.';};
$('template').onclick=e=>{e.preventDefault();download(JSON.stringify(sample,null,2),'modelarena-example.json','application/json');};
$('demo').onclick=async()=>{if(await ask('Replace this session with the fictional demo? Export a session backup first if needed.'))replaceRun(sample,true);};
$('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5000000)throw Error('Use a JSON file smaller than 5 MB.');const data=JSON.parse(await file.text());const restored=data.run?restoreRun(data.run):null;const suite=restored?restored.suite:validateSuite(data);if(!await ask('Replace the current session with this imported file? Export a backup first if needed.'))return;if(restored){run=restored;demo=!!data.demo;current=Math.max(0,run.ratings.findIndex(r=>!r));dirty=false;persist();render();}else replaceRun(suite);$('notice').textContent='Import complete.';}catch(err){$('error').textContent=err.message+' Current session retained.';}finally{e.target.value='';}};
async function openEditor(add){if(!await abandon())return;adding=add;$('form').reset();$('formError').textContent='';$('editorTitle').textContent=add?'Add a case':'New comparison';$('suiteFields').hidden=add;['suiteTitle','model0','model1'].forEach(id=>$(id).required=!add);$('label0').textContent=add?`${run.suite.models[0]} response`:'First model response';$('label1').textContent=add?`${run.suite.models[1]} response`:'Second model response';$('form').querySelector('[type=submit]').textContent=add?'Add case':'Start blind review';$('editor').showModal();}
$('new').onclick=()=>openEditor(false);$('add').onclick=()=>openEditor(true);$('cancel').onclick=()=>$('editor').close();
$('form').onsubmit=async e=>{e.preventDefault();try{const c={prompt:$('newPrompt').value,reference:$('newReference').value,responses:[$('response0').value,$('response1').value]};const suite=validateSuite(adding?{...run.suite,cases:[...run.suite.cases,c]}:{title:$('suiteTitle').value,models:[$('model0').value,$('model1').value],cases:[c]});if(adding){run.suite=suite;run.orders.push(random()<.5?[0,1]:[1,0]);run.ratings.push(null);current=suite.cases.length-1;dirty=false;demo=false;persist();render();}else{if(!await ask('Replace the current session? Export a backup first if needed.'))return;replaceRun(suite);}$('editor').close();$('notice').textContent='Review ready. You may recognize identities if you prepared these responses.';}catch(err){$('formError').textContent=err.message;}};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
render();
