import {parseCSV, analyze, names, sampleCSV, exportCSV} from './core.mjs';
const $ = id => document.getElementById(id);
let rows = parseCSV(sampleCSV()), result;
const fmt = n => new Intl.NumberFormat('en',{maximumFractionDigits:2}).format(n);
function download(text, name) { const url=URL.createObjectURL(new Blob([text],{type:'text/csv'})); const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
function table(id, data) { $(id).replaceChildren(...data.map(cells=>{const tr=document.createElement('tr');for(const cell of cells){const td=document.createElement('td');td.textContent=cell;tr.append(td);}return tr;})); }
function chart() {
  const svg=$('chart');svg.replaceChildren();const ns='http://www.w3.org/2000/svg';
  const add=(tag,attrs,text)=>{const el=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));if(text!==undefined)el.textContent=text;svg.append(el);return el;};
  const vals=[...rows.map(r=>r.value),...result.future.flatMap(r=>[r.value,r.scenario])];let lo=Math.min(...vals),hi=Math.max(...vals);const pad=(hi-lo||Math.max(Math.abs(lo),1))*.12;lo-=pad;hi+=pad;
  const count=rows.length+result.future.length, x=i=>70+i/(count-1)*800,y=v=>280-(v-lo)/(hi-lo)*250;
  add('rect',{x:x(rows.length-1),y:20,width:870-x(rows.length-1),height:260,fill:'#edf2ff'});
  for(let i=0;i<5;i++){const v=lo+(hi-lo)*i/4;add('line',{x1:70,x2:870,y1:y(v),y2:y(v),stroke:'#dce4ef'});add('text',{x:62,y:y(v)+5,'text-anchor':'end'},fmt(v));}
  const line=(v,start,color,dash)=>add('polyline',{points:v.map((n,i)=>`${x(start+i)},${y(n)}`).join(' '),fill:'none',stroke:color,'stroke-width':2.5,...(dash?{'stroke-dasharray':'7 5'}:{})});
  line(rows.map(r=>r.value),0,'#344d70');line([rows.at(-1).value,...result.future.map(r=>r.value)],rows.length-1,'#315eda');line([rows.at(-1).value,...result.future.map(r=>r.scenario)],rows.length-1,'#a63d85',true);
  add('text',{x:70,y:315},rows[0].date);add('text',{x:870,y:315,'text-anchor':'end'},result.future.at(-1).date);add('text',{x:x(rows.length-1)+8,y:16},'FORECAST');
}
function render(){
  $('horizonLabel').textContent=$('horizon').value;$('scenarioLabel').textContent=$('scenario').value+'%';
  try { result=analyze(rows,{horizon:+$('horizon').value,season:+$('season').value,method:$('method').value,scenario:+$('scenario').value});
    $('error').textContent='';$('export').disabled=false;$('selected').textContent=names[result.selected.method];$('mae').textContent=fmt(result.selected.mae);$('next').textContent=fmt(result.future[0].value);
    $('range').textContent=`${rows.length} observations · ${rows[0].date} to ${rows.at(-1).date}`;
    $('evaluationNote').textContent=`Trained on the first ${rows.length-result.holdout} points; tested on the final ${result.holdout}. Lower error is better. Scores use original units. Seasonal repeat is included only when training has two complete cycles.`;
    table('scores',result.scores.map(s=>[names[s.method]+(s.method===result.selected.method?' · selected':''),fmt(s.mae),fmt(s.rmse)]));
    table('future',result.future.map(r=>[r.date,fmt(r.value),fmt(r.scenario)]));chart();
  } catch(e) {result=null;$('error').textContent=e.message;$('export').disabled=true;['selected','mae','next'].forEach(id=>$(id).textContent='—');$('chart').replaceChildren();$('scores').replaceChildren();$('future').replaceChildren();$('evaluationNote').textContent='Adjust the settings to calculate a forecast.';}
}
['horizon','season','method','scenario'].forEach(id=>$(id).addEventListener('input',render));
$('file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1000000)throw Error('CSV must be smaller than 1 MB.');const parsed=parseCSV(await file.text());rows=parsed;$('source').textContent='IMPORTED DATA';$('dataset').textContent=file.name;render();}catch(err){$('error').textContent=err.message+' The previous dataset is retained.';}finally{e.target.value='';}});
$('sample').onclick=()=>{rows=parseCSV(sampleCSV());$('source').textContent='SYNTHETIC SAMPLE';$('dataset').textContent='Daily shop demand';$('method').value='auto';$('season').value=7;$('horizon').value=14;$('scenario').value=0;render();};
$('template').onclick=e=>{e.preventDefault();download(sampleCSV(),'forecastforge-sample.csv');};$('export').onclick=()=>{if(result)download(exportCSV(result),'forecastforge-forecast.csv');};render();
