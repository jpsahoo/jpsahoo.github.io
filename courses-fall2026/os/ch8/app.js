// Deadlock lecture notes — engines (safety / request / detection / recovery / lock-order), step-by-step simulators and renderer.
// All teaching text lives in data.js; graph drawing lives in rag.js.
const $=s=>document.querySelector(s),
COL=['#2563eb','#16a34a','#d97706','#dc2626','#7c3aed','#0891b2'],
col=n=>{const i=+String(n).slice(-1);return COL[(isNaN(i)?0:i)%6]},
vec=a=>'('+a.join(', ')+')',le=(a,b)=>a.every((x,i)=>x<=b[i]),ad=(a,b)=>a.map((x,i)=>x+b[i]),sb=(a,b)=>a.map((x,i)=>x-b[i]),
sumRows=m=>m.reduce((s,r)=>ad(s,r),m[0].map(()=>0)),esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
let D,GR=[],CK=[],MS={},RS={},MC=0;

/* ---------- 1. Engines ---------- */
const norm=S=>({...S,avail:S.avail||sb(S.tot,sumRows(S.alloc)),need:S.max?S.alloc.map((r,i)=>sb(S.max[i],r)):null});
const run=(S,kind)=>{const n=norm(S),M=kind=='det'?n.req:n.need,F=n.alloc.map(r=>kind=='det'&&r.every(x=>!x)),pre=F.map((f,i)=>f?i:-1).filter(i=>i>=0),steps=[],seq=[];let W=[...n.avail];
  for(;;){const i=n.alloc.findIndex((_,k)=>!F[k]&&le(M[k],W));if(i<0)break;const a=ad(W,n.alloc[i]);steps.push({i,m:M[i],w:W,a});W=a;F[i]=true;seq.push(i)}
  const stuck=F.map((f,i)=>f?-1:i).filter(i=>i>=0);return{n,M,steps,seq,stuck,pre,ok:!stuck.length,W}};
const reqAlg=(S,i,r)=>{const n=norm(S),c1=le(r,n.need[i]),c2=c1&&le(r,n.avail);let ns=null,R=null;
  if(c1&&c2){ns={...S,alloc:S.alloc.map((row,k)=>k==i?ad(row,r):row),avail:sb(n.avail,r)};R=run(ns,'safe')}
  return{c1,c2,ns,R,granted:!!R&&R.ok,n}};
const abort=(S,i)=>{const n=norm(S),f=m=>m&&m.filter((_,k)=>k!=i);return{...S,names:f(S.names),alloc:f(S.alloc),req:f(S.req),max:f(S.max),avail:ad(n.avail,S.alloc[i])}};
const minAbort=S=>{const N=S.names.length;for(let k=1;k<=N;k++){const sets=[];(function pick(s,from){if(s.length==k){sets.push(s);return}for(let i=from;i<N;i++)pick([...s,i],i+1)})([],0);
  const ok=sets.filter(c=>{let T=S;[...c].sort((a,b)=>b-a).forEach(i=>T=abort(T,i));return run(T,'det').ok});if(ok.length)return{k,sets:ok}}return{k:N,sets:[]}};
const orderCheck=(F,threads)=>threads.map(([n,seq])=>{let bad=null;for(let i=1;i<seq.length&&!bad;i++)if(F[seq[i]]<=F[seq[i-1]])bad=[seq[i-1],seq[i]];return{n,seq,bad}});

/* ---------- 2. Small renderers ---------- */
const bdg=n=>`<span class="pb" style="background:${col(n)}">${n}</span>`,
tbl=(h,rows)=>`<div class="table-responsive"><table class="table table-bordered table-sm text-center align-middle"><thead class="table-light"><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`,
ul=a=>`<ul>${a.map(x=>`<li>${x}</li>`).join('')}</ul>`,ol=a=>`<ol>${a.map(x=>`<li>${x}</li>`).join('')}</ol>`,
call=(c,x)=>`<div class="callout ${c}">${x}</div>`,
defs=a=>`<div class="defs">${a.map(d=>`<div class="def k-${d.k}"><div class="dt">${d.t}</div><div>${d.d}</div>${d.s?`<small>${d.s}</small>`:''}</div>`).join('')}</div>`,
legend='<p class="small mb-2">Colour code: <span class="chip k-metric">formula</span> <span class="chip k-concept">concept</span> <span class="chip k-problem">problem</span> <span class="chip k-fix">remedy / property</span></p>',
alert=(c,x)=>`<div class="alert alert-${c} py-2 mb-2">${x}</div>`,
formula=x=>`<div class="formula">${x}</div>`;
// matrix table: hi = highlighted rows, F = finished rows (greyed), fill = rows already computed (others show a dot)
const mx=(t,S,M,o={})=>{const{hi=[],F=[],fill=M.length}=o;return`<div class="mxb"><div class="mxt">${t}</div><table class="table table-bordered table-sm text-center mx"><thead class="table-light"><tr><th></th>${S.res.map(r=>`<th>${r}</th>`).join('')}</tr></thead><tbody>${M.map((r,i)=>`<tr class="${hi.includes(i)?'hi':''}${F[i]?' dn':''}"><th>${S.names[i]}</th>${r.map(x=>`<td>${i<fill?x:'·'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`};
const state=(S,kind)=>{const n=norm(S);return`<div class="mxrow">${mx('Allocation',S,S.alloc)}${kind=='det'?mx('Request',S,S.req):mx('Max',S,S.max)+mx('Need = Max − Allocation',S,n.need)}
  <div class="mxb"><div class="mxt">Available</div><div class="vec">${vec(n.avail)}</div><div class="small text-muted">${S.avail?'given':'= Total '+vec(S.tot)+' − ΣAlloc '+vec(sumRows(S.alloc))}</div></div></div>`};
// the "(1,1,0,1) —P2→ (1,2,1,1) —P1→ …" chain printed under the book/lecture Banker's examples
const chain=(R,stuck)=>{const nm=R.n.names;return`<div class="chain">${vec(R.n.avail)}${R.steps.map(s=>`<span class="arr"><i>${nm[s.i]}</i>→</span>${vec(s.a)}`).join('')}${R.ok?'<span class="tick">✔</span>':'<span class="stop">🚫</span>'}</div>`};
const traceTbl=(R,kind)=>{const nm=R.n.names,lab=kind=='det'?'Request':'Need';
  return(kind=='det'&&R.pre.length?`<p class="small mb-1">Initially finished (Allocation = 0): <b>${R.pre.map(i=>nm[i]).join(', ')}</b></p>`:'')+
  `<div class="table-responsive"><table class="table table-bordered table-sm text-center align-middle"><thead class="table-light"><tr><th>#</th><th>Pick</th><th>${lab}ᵢ</th><th>Work before</th><th>${lab}ᵢ ≤ Work?</th><th>Work after = Work + Allocᵢ</th></tr></thead><tbody>${
  R.steps.map((s,j)=>`<tr><td>${j+1}</td><td><b style="color:${col(nm[s.i])}">${nm[s.i]}</b></td><td>${vec(s.m)}</td><td>${vec(s.w)}</td><td class="text-success">✓</td><td>${vec(s.a)}</td></tr>`).join('')||'<tr><td colspan="6" class="text-muted">No process can start.</td></tr>'}</tbody></table></div>`+chain(R)};
const verdict=(R,kind)=>{const nm=R.n.names,L=R.seq.map(i=>nm[i]).join(', ');
  if(kind=='det')return R.ok?alert('success',`<b>No deadlock.</b> Completion order ⟨${L}⟩ — Finish[i] = true for every process.`):alert('danger',`<b>DEADLOCK.</b> Work = ${vec(R.W)}; no remaining process has Request ≤ Work. Deadlocked: <b>${R.stuck.map(i=>nm[i]).join(', ')}</b>.`);
  return R.ok?alert('success',`<b>✔ SAFE.</b> Safe sequence ⟨${L}⟩ (other safe sequences may exist).`):alert('danger',`<b>✘ UNSAFE.</b> Work = ${vec(R.W)}; none of ${R.stuck.map(i=>nm[i]).join(', ')} has Need ≤ Work. No safe sequence exists — deadlock is possible.`)};
const reqBlock=(S,reqs,chainOn)=>{let cur=S;return reqs.map(([i,r,lab])=>{const A=reqAlg(cur,i,r),nm=S.names[i],n=A.n;let h=`<div class="card card-body mb-2"><b>${lab}</b>
  <div>① Request ≤ Need? ${vec(r)} ≤ ${vec(n.need[i])} → ${A.c1?'<span class="text-success">yes</span>':'<span class="text-danger">no → error: exceeds its maximum claim</span>'}</div>`;
  if(A.c1)h+=`<div>② Request ≤ Available? ${vec(r)} ≤ ${vec(n.avail)} → ${A.c2?'<span class="text-success">yes</span>':'<span class="text-danger">no → '+nm+' must wait</span>'}</div>`;
  if(A.c2)h+=`<div>③ Pretend to allocate: Available = ${vec(A.ns.avail)}, Allocation<sub>${nm}</sub> = ${vec(A.ns.alloc[i])}, Need<sub>${nm}</sub> = ${vec(norm(A.ns).need[i])}. Safety algorithm → ${A.R.ok?'safe sequence ⟨'+A.R.seq.map(j=>S.names[j]).join(', ')+'⟩':'<b>no safe sequence</b> (stuck at Work = '+vec(A.R.W)+')'}</div>`;
  h+=alert(A.granted?'success':'danger',A.granted?'<b>GRANT</b> — the new state is safe.':(A.c2?`<b>DENY</b> — ${nm} waits; the old state is restored (resources exist, but the state would be unsafe).`:'<b>DENY / WAIT</b>.'))+'</div>';
  if(chainOn&&A.granted)cur=A.ns;return h}).join('')};

/* ---------- 3. Click-by-click simulator: ONE calculation per click ----------
   micro(S,kind,{req:[i,r]}) → frames. kind 'safe' = Banker's safety algorithm (Need ≤ Work), 'det' = detection algorithm (Request ≤ Work).
   With {req} it also performs the three checks of the resource-request algorithm before running the safety algorithm on the pretend state. */
const micro=(S0,kind,o={})=>{
  const det=kind=='det',nm=S0.names,N=nm.length,res=S0.res,lab=det?'Request':'Need',fr=[];
  let st={S:S0,needN:(det||o.req)?N:0,avail:!!o.req,work:null,F:S0.alloc.map(()=>false),seq:[],hi:[]};
  const push=(msg,tag,x='')=>fr.push({S:st.S,needN:st.needN,avail:st.avail,work:st.work&&[...st.work],F:[...st.F],seq:[...st.seq],hi:[...st.hi],msg,tag,x});
  const cmp=(a,b)=>a.map((v,j)=>`${res[j]}: ${v} ${v<=b[j]?'≤':'&gt;'} ${b[j]} ${v<=b[j]?'<span class="text-success">✓</span>':'<span class="text-danger">✗</span>'}`).join(' · ');
  if(o.req){const[i,r]=o.req,n0=norm(S0);st.hi=[i];
    push(`<b>${nm[i]}</b> requests ${vec(r)}. The state before the request is shown (Available = ${vec(n0.avail)}).`,'start');
    const c1=le(r,n0.need[i]);push(`<b>① Request ≤ Need<sub>${nm[i]}</sub>?</b> ${vec(r)} vs ${vec(n0.need[i])}<br>${cmp(r,n0.need[i])}<br>${c1?'Yes — within its declared maximum.':'<b>No → error: the process exceeded its maximum claim.</b>'}`,c1?'ok':'final-bad');
    if(!c1)return fr;
    const c2=le(r,n0.avail);push(`<b>② Request ≤ Available?</b> ${vec(r)} vs ${vec(n0.avail)}<br>${cmp(r,n0.avail)}<br>${c2?'Yes — the resources are free right now.':`<b>No → ${nm[i]} must wait</b> (the resources are not available).`}`,c2?'ok':'final-bad');
    if(!c2)return fr;
    const na=sb(n0.avail,r),nal=ad(S0.alloc[i],r);st.S={...S0,alloc:S0.alloc.map((x,k)=>k==i?nal:x),avail:na};
    push(`<b>③ Pretend to allocate.</b> Available = ${vec(n0.avail)} − ${vec(r)} = <b>${vec(na)}</b>; Allocation<sub>${nm[i]}</sub> = ${vec(S0.alloc[i])} + ${vec(r)} = <b>${vec(nal)}</b>; Need<sub>${nm[i]}</sub> = ${vec(n0.need[i])} − ${vec(r)} = <b>${vec(sb(n0.need[i],r))}</b>. Now run the safety algorithm on this state.`,'ok')}
  else{const n=norm(S0);
    push(`Press <b>Next ▶</b>. Each click performs <b>one</b> calculation.${S0.tot?` Resource totals = <b>${vec(S0.tot)}</b>.`:''}`,'start');
    st.avail=true;push(S0.avail?`<b>Available</b> is given: ${vec(S0.avail)}.`:`<b>Available = Total − Σ Allocation</b><br>${res.map((r,j)=>`${r}: ${S0.tot[j]} − (${S0.alloc.map(x=>x[j]).join(' + ')}) = <b>${n.avail[j]}</b>`).join('<br>')}`,'ok');
    if(!det)for(let i=0;i<N;i++){st.needN=i+1;st.hi=[i];push(`<b>Need<sub>${nm[i]}</sub> = Max − Allocation</b> = ${vec(S0.max[i])} − ${vec(S0.alloc[i])} = <b>${vec(n.need[i])}</b>`,'ok')}}
  const n=norm(st.S),M=det?n.req:n.need,Al=st.S.alloc;st.work=[...n.avail];st.hi=[];
  if(det){st.F=Al.map(r=>r.every(x=>!x));const z=st.F.map((f,i)=>f?nm[i]:null).filter(Boolean);push(`<b>Initialise:</b> Work = Available = ${vec(st.work)}. Finish[i] = true when Allocation<sub>i</sub> is all zeros → ${z.length?z.join(', ')+' already finished':'nobody is finished yet'}; all others false.`,'init')}
  else push(`<b>Safety algorithm — initialise:</b> Work = Available = ${vec(st.work)}; Finish[i] = false for every process.`,'init');
  let round=0;
  for(;;){round++;let found=-1;
    for(let i=0;i<N;i++){if(st.F[i])continue;const ok=le(M[i],st.work);st.hi=[i];
      push(`<b>Round ${round}:</b> is ${lab}<sub>${nm[i]}</sub> ≤ Work?  ${vec(M[i])} vs ${vec(st.work)}<br>${cmp(M[i],st.work)}<br>${ok?`<b class="text-success">Yes</b> — ${nm[i]} can run to completion.`:`<b class="text-danger">No</b> — ${nm[i]} must wait; try the next process.`}`,ok?'ok':'fail');
      if(ok){found=i;break}}
    if(found<0)break;
    const old=st.work,a=ad(old,Al[found]);st.work=a;st.F[found]=true;st.seq.push(found);
    push(`<b>${nm[found]} finishes</b> and returns what it holds: Work = Work + Allocation<sub>${nm[found]}</sub> = ${vec(old)} + ${vec(Al[found])} = <b>${vec(a)}</b>; Finish[${nm[found]}] = true.`,'upd')}
  st.hi=[];const R=run(st.S,kind),L=st.seq.map(i=>nm[i]).join(', '),stuck=st.F.map((f,i)=>f?null:nm[i]).filter(Boolean);
  if(o.req){const i=o.req[0];
    if(R.ok)push(`<b>✔ Safe state</b> — safe sequence ⟨${L}⟩. <b>GRANT</b> the request: ${nm[i]} receives ${vec(o.req[1])}.`,'final-ok',chain(R));
    else{st.S=S0;push(`<b>✘ Unsafe state</b> — stuck with Work = ${vec(st.work)}; ${stuck.join(', ')} cannot finish. <b>DENY</b>: ${nm[i]} waits and the old allocation state is restored (the resources exist, but granting would be unsafe).`,'final-bad',chain(R))}}
  else if(det)push(R.ok?`<b>No deadlock.</b> Everyone can finish in the order ⟨${L}⟩.`:`<b>DEADLOCK.</b> No unfinished process has Request ≤ Work = ${vec(st.work)}. Deadlocked: <b>${stuck.join(', ')}</b>.`,R.ok?'final-ok':'final-bad',chain(R));
  else push(R.ok?`<b>✔ SAFE.</b> Every Finish[i] is true; safe sequence ⟨${L}⟩.`:`<b>✘ UNSAFE.</b> No unfinished process has Need ≤ Work = ${vec(st.work)} (stuck: ${stuck.join(', ')}). No safe sequence exists.`,R.ok?'final-ok':'final-bad',chain(R));
  return fr};
const newM=(fr,kind)=>{const id=MC++;MS[id]={fr,up:0,kind};return id};
const ctl=(p,id)=>`<div id="${p}${id}"></div><div class="btn-group btn-group-sm mb-1 flex-wrap"><button class="btn btn-outline-dark" onclick="go${p}(${id},-999)">⏮ Reset</button><button class="btn btn-outline-dark" onclick="go${p}(${id},-1)">◀ Prev</button><button class="btn btn-dark" onclick="go${p}(${id},1)">Next ▶</button><button class="btn btn-outline-primary" onclick="go${p}(${id},'pick')" title="jump to the next process that finishes">⏩ Next pick</button><button class="btn btn-outline-dark" onclick="go${p}(${id},999)">All ⏭</button></div><div class="small text-muted mb-3" id="${p}c${id}"></div>`;
const CLS={start:'secondary',init:'info',ok:'success',upd:'success',fail:'warning','final-ok':'success','final-bad':'danger'};
const paintMs=id=>{const m=MS[id],f=m.fr[m.up],S=f.S,n=norm(S),det=m.kind=='det',o={hi:f.hi,F:f.work?f.F:[]};
  const tb=mx('Allocation',S,S.alloc,o)+(det?mx('Request',S,S.req,o):mx('Max',S,S.max,o)+mx('Need = Max − Allocation',S,n.need,{...o,fill:f.needN}));
  const side=`<div class="mxb">${S.tot?`<div class="mxt">Total</div><div class="vec">${vec(S.tot)}</div>`:''}<div class="mxt mt-2">Available</div>${f.avail?`<div class="vec">${vec(n.avail)}</div>`:'<div class="vec dim">( ? )</div>'}
    <div class="mxt mt-2">Work</div>${f.work?`<div class="vec">${vec(f.work)}</div>`:'<div class="vec dim">—</div>'}
    ${f.work?`<div class="mxt mt-2">Finish</div><div>${S.names.map((x,i)=>`<span class="fin ${f.F[i]?'on':''}">${x} ${f.F[i]?'✓':'✗'}</span>`).join(' ')}</div><div class="mxt mt-2">Sequence so far</div><div class="seqb">⟨${f.seq.map(i=>S.names[i]).join(', ')}⟩</div>`:''}</div>`;
  const log=m.fr.slice(1,m.up+1).map((g,j)=>`<li class="${j==m.up-1?'cur':''}">${g.msg}</li>`).join('');
  $('#ms'+id).innerHTML=`<div class="mxrow">${tb}${side}</div>${alert(CLS[f.tag]||'info',f.msg)}${f.x||''}${log?`<details class="mt-2"><summary class="small">Calculation log (${m.up} step${m.up==1?'':'s'})</summary><div class="trace-box"><ol class="trace">${log}</ol></div></details>`:''}`;
  $('#msc'+id).textContent=`Step ${m.up} of ${m.fr.length-1}`};
const goms=(id,d)=>{const m=MS[id];if(d=='pick'){let j=m.up+1;while(j<m.fr.length-1&&!['upd','final-ok','final-bad'].includes(m.fr[j].tag))j++;m.up=Math.min(j,m.fr.length-1)}else m.up=Math.max(0,Math.min(m.fr.length-1,m.up+d));paintMs(id)};

/* ---------- 4. Graph steppers (reduction, claim-edge life-cycle) ---------- */
const newRS=fr=>{const id=MC++;RS[id]={fr,up:0};return id};
const paintRs=id=>{const m=RS[id],f=m.fr[m.up],H=$('#rs'+id);H.innerHTML=`<div class="row g-2"><div class="col-lg-${f.G2?7:12}">${f.G2?'<div class="fig-cap">(a) Resource-Allocation Graph</div>':''}<div class="rag-host" id="rsg${id}"></div></div>${f.G2?`<div class="col-lg-5"><div class="fig-cap">(b) Corresponding wait-for graph</div><div class="rag-host" id="rsh${id}"></div></div>`:''}</div><div id="rsl${id}"></div><div id="rsm${id}"></div>`;
  drawRAG($('#rsg'+id),f.G,{claim:f.claim,mark:f.claim?true:!!f.final});if(f.G2)drawRAG($('#rsh'+id),f.G2,{h:300,mark:!!f.final});$('#rsl'+id).innerHTML=ragLegend(f.G);
  let h=alert(f.cls||'info',f.msg);if(f.claim){const v=ragVerdict(f.G,{claim:true});h+=alert(v.cls,v.html)}$('#rsm'+id).innerHTML=h;$('#rsc'+id).textContent=`Step ${m.up} of ${m.fr.length-1}`};
const gors=(id,d)=>{const m=RS[id];if(d=='pick'){let j=m.up+1;while(j<m.fr.length-1&&m.fr[j].cls!='success'&&!m.fr[j].claim)j++;m.up=Math.min(j,m.fr.length-1)}else m.up=Math.max(0,Math.min(m.fr.length-1,m.up+d));paintRs(id)};

/* ---------- 5. Example cards ---------- */
const hdr=(e)=>`<div class="d-flex flex-wrap gap-2 align-items-center"><h5 class="m-0">${e.t}</h5>${e.s?`<span class="badge text-bg-primary">${e.s}</span>`:''}</div>`;
const ragBlock=(k,e)=>{GR[k]={G:e.G,claim:e.claim,then:e.then,wfg:e.wfg,on:false,force:false};
  return`<div class="swim-wrap">${e.wfg?'<div class="fig-cap">(a) Resource-Allocation Graph</div>':''}<div id="rg${k}" class="rag-host"></div><div id="rl${k}"></div>
  <div class="d-flex flex-wrap gap-2 mb-2">${e.then&&e.then.label?`<button class="btn btn-sm btn-dark" id="rb${k}" onclick="ragToggle(${k})">${e.then.label}</button>`:''}${e.G.pos?`<button class="btn btn-sm btn-outline-secondary" id="rf${k}" onclick="ragForce(${k})">🔀 Force layout</button>`:''}</div>
  <div id="rv${k}"></div>${e.wfg?`<div class="fig-cap mt-2">(b) Corresponding wait-for graph (resource nodes removed)</div><div id="rw${k}" class="rag-host"></div><div id="rwv${k}"></div>`:''}</div>`};
const ragDraw=k=>{const g=GR[k],G=g.on?applyDelta(g.G,g.then.d||g.then):g.G,H=$('#rg'+k);H.innerHTML='';drawRAG(H,G,{claim:g.claim,force:g.force});
  $('#rl'+k).innerHTML=ragLegend(G);const rv=$('#rv'+k);if(rv){const v=ragVerdict(G,{claim:g.claim});rv.innerHTML=alert(v.cls,v.html)}
  if(g.wfg&&$('#rw'+k)){const W=wfgOf(G),h2=$('#rw'+k);h2.innerHTML='';drawRAG(h2,W,{h:300});const v2=ragVerdict(W);$('#rwv'+k).innerHTML=alert(v2.cls,v2.html)}},
ragToggle=k=>{GR[k].on=!GR[k].on;const b=$('#rb'+k);b.classList.toggle('btn-dark',!GR[k].on);b.classList.toggle('btn-outline-dark',GR[k].on);ragDraw(k)},
ragForce=k=>{GR[k].force=!GR[k].force;$('#rf'+k).textContent=GR[k].force?'📐 Textbook layout':'🔀 Force layout';ragDraw(k)};

const exCard=(e,k)=>{const body={
 rag:()=>ragBlock(k,e)+(e.reduce?`<h6>Graph reduction, one step at a time</h6>${ctl('rs',newRS(reduceFrames(e.G)))}`:''),
 ragsteps:()=>ctl('rs',newRS(e.stages.map(s=>({...s,claim:true})))),
 wfgsteps:()=>`${ctl('rs',newRS(wfgFrames(e.G)))}`,
 code:()=>`<div class="row g-2">${e.code.map(([n,c])=>`<div class="col-md-${e.code.length>1?6:12}"><div class="codebox"><div class="codehd">${n}</div><pre>${esc(c)}</pre></div></div>`).join('')}</div>
   ${e.tl?`<h6>One bad interleaving</h6>${tbl(['Step','Thread','Action','Result'],e.tl)}`:''}${e.G?`<h6>Resulting resource-allocation graph</h6>${ragBlock(k,e)}`:call('warn','⚠️ No cycle of waiting exists here: the threads are <b>running</b>, not blocked — that is what separates livelock from deadlock.')}`,
 order:()=>{const R=orderCheck(e.F,e.threads);return`<p class="mb-1"><b>Ordering F:</b> ${Object.entries(e.F).map(([a,b])=>`F(${a}) = ${b}`).join(', ')}</p>${e.G?ragBlock(k,e):''}${tbl(['Thread','Acquisition order','F values','Verdict'],R.map(r=>[`<b>${r.n}</b>`,r.seq.join(' → '),r.seq.map(x=>e.F[x]).join(' → '),r.bad?`<span class="text-danger fw-bold">✘ asks for ${r.bad[1]} (F=${e.F[r.bad[1]]}) while holding ${r.bad[0]} (F=${e.F[r.bad[0]]})</span>`:'<span class="text-success fw-bold">✔ increasing</span>']))}
   ${alert(R.some(r=>r.bad)?'danger':'success',R.some(r=>r.bad)?'<b>Ordering violated</b> ⇒ circular wait is possible.':'<b>Every thread respects F</b> ⇒ circular wait cannot occur ⇒ no deadlock.')}`},
 bank:()=>{let h=`<h6>Step through the safety algorithm — one calculation per click</h6>${ctl('ms',newM(micro(e.S,'safe'),'safe'))}`;
   if(e.reqs){h+=`<h6>Resource-request algorithm${e.chain?' (each granted request changes the state for the next one)':' (each request starts from the state above)'}</h6>`;let cur=e.S;
     e.reqs.forEach(([i,r,lab])=>{h+=`<div class="card card-body mb-3"><b>${lab}</b>${ctl('ms',newM(micro(cur,'safe',{req:[i,r]}),'safe'))}</div>`;const A=reqAlg(cur,i,r);if(e.chain&&A.granted)cur=A.ns})}return h},
 det:()=>`<h6>Detection algorithm — one calculation per click</h6>${ctl('ms',newM(micro(e.S,'det'),'det'))}`,
 rec:()=>{const R0=run(e.S,'det');let h=`${state(e.S,'det')}<h6>Step 1 — Detect</h6>${verdict(R0,'det')}`;
   if(e.order){let T=e.S;h+=`<h6>Step 2 — Abort one at a time, re-run detection</h6>`;const rows=[];e.order.forEach(nmv=>{const i=T.names.indexOf(nmv),rel=T.alloc[i];T=abort(T,i);const R=run(T,'det');rows.push([`Abort <b>${nmv}</b>`,vec(rel),vec(norm(T).avail),R.ok?'<span class="text-success fw-bold">none — recovered</span>':'<span class="text-danger">'+R.stuck.map(j=>T.names[j]).join(', ')+'</span>'])});
     h+=tbl(['Action','Released','Available now','Still deadlocked'],rows)}
   else h+=`<h6>Step 2 — Try each single victim</h6>`+tbl(['Abort','Released','Available after','Deadlock resolved?','Still deadlocked'],e.S.names.map((nmv,i)=>{const T=abort(e.S,i),R=run(T,'det');return[`<b>${nmv}</b>`,vec(e.S.alloc[i]),vec(norm(T).avail),R.ok?'<span class="text-success fw-bold">yes</span>':'<span class="text-danger">no</span>',R.ok?'—':R.stuck.map(j=>T.names[j]).join(', ')]}))+'<p class="small text-muted">Choosing among the working victims uses the cost criteria (CPU time, output, remaining time, resources held, priority, rollback count).</p>';return h}}[e.k];
 return`<div class="card card-body mb-4">${hdr(e)}<p class="mt-3">${e.n}</p>${body()}</div>`};

/* ---------- 6. Practice cards ---------- */
const OPT={rag:['Deadlock','No deadlock — cycle exists','No deadlock — no cycle'],bank:['Safe','Unsafe'],det:['No deadlock','Deadlock'],claim:['Grant the request','Deny (unsafe)'],order:['Respects the ordering','Violates the ordering'],minab:['1','2','3','4']};
const prCard=(e,k)=>{let show='',ans,sol='',opts=OPT[e.k];
  if(e.k=='rag'){GR[k]={G:e.G,wfg:false,on:false};show=`<div id="rg${k}" class="rag-host"></div><div id="rl${k}"></div>`;const v=ragVerdict(e.G);ans=v.key;sol=alert(v.cls,v.html)+(e.wfg?alert('secondary','Wait-for graph: '+ragVerdict(wfgOf(e.G)).html):'')+ctl('rs',newRS(reduceFrames(e.G)))}
  else if(e.k=='claim'){GR[k]={G:e.G,claim:true,wfg:false,on:false};show=`<div id="rg${k}" class="rag-host"></div><div id="rl${k}"></div>`;const G2=applyDelta(e.G,e.then),v=ragVerdict(G2,{claim:true});ans=v.key;sol=alert(v.cls,v.html)}
  else if(e.k=='bank'){const R=run(e.S,'safe');show=state(e.S,'safe');ans=R.ok?'Safe':'Unsafe';sol=`<p class="small text-muted mb-1">Click through the solution:</p>${ctl('ms',newM(micro(e.S,'safe'),'safe'))}`+(e.reqs?reqBlock(e.S,e.reqs):'')}
  else if(e.k=='det'){const R=run(e.S,'det');show=state(e.S,'det');ans=R.ok?'No deadlock':'Deadlock';sol=`<p class="small text-muted mb-1">Click through the solution:</p>${ctl('ms',newM(micro(e.S,'det'),'det'))}`}
  else if(e.k=='order'){const R=orderCheck(e.F,e.threads);show=`<p class="mb-1"><b>F:</b> ${Object.entries(e.F).map(([a,b])=>`F(${a}) = ${b}`).join(', ')}</p>${tbl(['Thread','Acquires in this order'],e.threads.map(t=>[`<b>${t[0]}</b>`,t[1].join(' → ')]))}`;
    ans=R.some(r=>r.bad)?'Violates the ordering':'Respects the ordering';sol=tbl(['Thread','F values','Verdict'],R.map(r=>[`<b>${r.n}</b>`,r.seq.map(x=>e.F[x]).join(' → '),r.bad?`✘ ${r.bad[0]} → ${r.bad[1]} is not increasing`:'✔ increasing']))}
  else if(e.k=='minab'){const M=minAbort(e.S);show=state(e.S,'det')+verdict(run(e.S,'det'),'det');ans=String(M.k);sol=`<p>Smallest abort sets (size ${M.k}): <b>${M.sets.map(s=>'{'+s.map(i=>e.S.names[i]).join(', ')+'}').join(' · ')}</b></p>`}
  else if(e.k=='text'){sol=e.sol}
  CK[k]=ans;
  return`<div class="card card-body mb-4"><h5>${e.t}</h5>${show}<p class="mt-2 mb-2"><b>${e.q}</b></p>
  <div><button class="btn btn-warning btn-sm" data-bs-toggle="collapse" data-bs-target="#h${k}">💡 Hint</button> <button class="btn btn-success btn-sm" data-bs-toggle="collapse" data-bs-target="#s${k}">✔ Solution</button></div>
  <div class="collapse mt-2" id="h${k}"><div class="alert alert-warning mb-0">${e.h}</div></div>
  ${opts?`<div class="d-flex flex-wrap gap-2 align-items-center my-2"><b>Check yourself:</b>${opts.map(o=>`<button class="btn btn-outline-primary btn-sm" onclick="chk(${k},this)">${o}</button>`).join('')}<span id="c${k}"></span></div>`:''}
  <div class="collapse" id="s${k}"><h6>Solution</h6>${sol}</div></div>`};
const chk=(k,b)=>{$('#c'+k).innerHTML=b.textContent==CK[k]?'<span class="badge text-bg-success">✓ Correct!</span>':'<span class="badge text-bg-danger">✗ Not yet — try the hint</span>'};

/* ---------- 7. Pages ---------- */
const DEFSET=a=>a=='coffman'?D.coffman:a=='bank'?D.defs.slice(3,6):a=='det'?[D.defs[0],D.defs[7]]:null;
const notes=a=>{const ds=DEFSET(a.defs);return call('book',`📖 <b>Source:</b> Silberschatz, Galvin &amp; Gagne, Chapter 8, ${a.src}.`)+(ds?`<h5>📘 Key definitions</h5>${legend}${defs(ds)}`:'')+
  `<h5>Rule in one line</h5><div class="callout rule">${a.rule}</div>${a.math?formula(a.math):''}<h5>How to solve — step by step</h5>${ol(a.steps)}
  ${a.notes.map(n=>`<h5>${n.h}</h5>${ul(n.items)}${n.table?`<p class="mb-1"><b>${n.table.cap}</b></p>${tbl(n.table.h,n.table.r)}`:''}`).join('')}
  ${a.pros?`<div class="row g-3 mt-1"><div class="col-md-6"><div class="alert alert-success h-100 mb-0"><b>Advantages</b><br>${a.pros}</div></div><div class="col-md-6"><div class="alert alert-danger h-100 mb-0"><b>Drawbacks</b><br>${a.cons}</div></div></div>`:''}`};
const topic=a=>{GR=[];CK=[];MS={};RS={};MC=0;let k=0;const ex=a.exs.map(e=>exCard(e,k++)).join(''),pr=a.pr.map(e=>prCard(e,k++)).join('');
  return`<h3 class="mb-1">${a.name} <small class="text-muted fs-6">${a.full}</small> <span class="badge text-bg-dark fs-6">${a.mode}</span></h3>
  <ul class="nav nav-tabs my-3">${['📖 Lecture notes','🧪 Examples ('+a.exs.length+')','✏️ Practice + solution ('+a.pr.length+')'].map((t,i)=>`<li class="nav-item"><button class="nav-link${i?'':' active'}" data-bs-toggle="tab" data-bs-target="#p${i}">${t}</button></li>`).join('')}</ul>
  <div class="tab-content card card-body"><div class="tab-pane fade show active" id="p0">${notes(a)}</div>
   <div class="tab-pane fade" id="p1">${call('book','📖 Figures are drawn exactly as in the textbook and lecture slides (blue circles = processes, grey rectangles = resource types, ● = one instance). Drag nodes to rearrange, or press <b>🔀 Force layout</b> to let a force simulation (like NetworkX’s spring layout) place them. Simulators advance <b>one calculation per click</b>.')}${ex}</div>
   <div class="tab-pane fade" id="p2">${pr}</div></div>`};
const venn=`<svg viewBox="0 0 640 240" class="venn" role="img" aria-label="Safe, unsafe and deadlock states"><rect x="4" y="4" width="632" height="232" rx="14" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/><text x="20" y="28" font-weight="700" fill="#334155">All states</text>
 <ellipse cx="190" cy="132" rx="150" ry="84" fill="#ecf9f0" stroke="#15803d" stroke-width="2.5"/><text x="190" y="136" text-anchor="middle" font-weight="700" fill="#15803d" font-size="22">SAFE</text><text x="190" y="160" text-anchor="middle" fill="#166534" font-size="13">no deadlock possible</text>
 <ellipse cx="450" cy="132" rx="170" ry="84" fill="#fff8e7" stroke="#d97706" stroke-width="2.5"/><text x="450" y="92" text-anchor="middle" font-weight="700" fill="#b45309" font-size="22">UNSAFE</text><text x="450" y="112" text-anchor="middle" fill="#92400e" font-size="13">deadlock possible</text>
 <ellipse cx="500" cy="152" rx="80" ry="40" fill="#fef2f2" stroke="#dc2626" stroke-width="2.5"/><text x="500" y="158" text-anchor="middle" font-weight="700" fill="#dc2626" font-size="18">DEADLOCK</text></svg>`;
const over=()=>{MS={};RS={};MC=0;GR=[];const S=D.topics[3].exs.find(e=>e.k=='bank').S;
  return call('book','📖 <b>Source:</b> Silberschatz, Galvin &amp; Gagne, <i>Operating System Concepts</i> (10th ed.), Chapter 8 “Deadlocks”, Sections 8.1–8.9 (page numbers below), together with the course lecture slides <i>Deadlocks – Ch. 8</i>. The notes use the same layout as the Chapter 5 (CPU Scheduling) notes.')+
  `<div class="card card-body mb-3"><h4>🎯 Learning objectives</h4>${ul(D.objectives)}</div>
  <div class="card card-body mb-3"><h4>📖 Chapter 8 map</h4>${tbl(['Section','Title','Textbook page','Tab in these notes'],D.toc)}</div>
  <div class="card card-body mb-3"><h4>📘 Key definitions</h4>${legend}${defs(D.defs)}<h6>Safe, unsafe and deadlocked states</h6>${venn}</div>
  <div class="card card-body mb-3"><h4>Part A — Basics</h4>${D.basics.map(b=>`<h6>${b.h}</h6>${ul(b.items)}`).join('')}<h6>The four Coffman conditions (all must hold)</h6>${defs(D.coffman)}
   <h6>Key formulas</h6>${D.formulas.map(formula).join('')}<h6>Recipe for every exercise</h6>${ol(D.recipe)}</div>
  <div class="card card-body mb-3"><h4>Part B — Four ways to handle deadlocks</h4>${tbl(['Approach','Idea','Needs to know','Price','Source'],D.methods.map(m=>[`<b>${m[0]}</b>`,...m.slice(1)]))}</div>
  <div class="card card-body mb-3"><h4>Part C — Try it: the Banker’s safety check</h4><p>Total = ${vec(S.tot)}. Press <b>Next ▶</b> to fill in Available and Need, then run the safety algorithm one calculation at a time.</p>${ctl('ms',newM(micro(S,'safe'),'safe'))}</div>
  <div class="card card-body"><h4>Part D — Chapter summary</h4>${defs(D.summary)}</div>`};
const show=i=>{document.querySelectorAll('#nav .nav-link').forEach((b,k)=>b.classList.toggle('active',k==i));
  $('#view').innerHTML=i?topic(D.topics[i-1]):over();
  GR.forEach((g,k)=>{if(g)ragDraw(k)});Object.keys(MS).forEach(paintMs);Object.keys(RS).forEach(paintRs);window.scrollTo&&window.scrollTo({top:0})};
if(typeof document!='undefined'){
  if(!window.DATA)$('#view').innerHTML='<div class="alert alert-danger"><b>data.js was not found.</b> Keep <code>index.html</code>, <code>app.js</code>, <code>data.js</code>, <code>rag.js</code> and <code>style.css</code> in the same folder.</div>';
  else{D=window.DATA;document.title=D.title;
    $('#nav').innerHTML=['Overview',...D.topics.map(a=>a.name)].map((t,i)=>`<li class="nav-item"><button class="nav-link" onclick="show(${i})" title="${i?D.topics[i-1].full:'Chapter overview'}">${t}</button></li>`).join('');show(0)}}
if(typeof module!='undefined')module.exports={run,reqAlg,abort,minAbort,orderCheck,micro,over,topic,setD:d=>{D=d}};
