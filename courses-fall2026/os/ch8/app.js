// Deadlock lecture notes — engines (safety / request / detection / recovery / lock-order) + renderer. All teaching text lives in data.js.
const $=s=>document.querySelector(s),
COL=['#2563eb','#16a34a','#d97706','#dc2626','#7c3aed','#0891b2'],
col=n=>{const i=+String(n).slice(-1);return COL[(isNaN(i)?0:i)%6]},
vec=a=>'('+a.join(', ')+')',le=(a,b)=>a.every((x,i)=>x<=b[i]),ad=(a,b)=>a.map((x,i)=>x+b[i]),sb=(a,b)=>a.map((x,i)=>x-b[i]),
sumRows=m=>m.reduce((s,r)=>ad(s,r),m[0].map(()=>0)),esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
let D,TS=[],GR=[],CK=[],PS=[];

/* ---------- 1. Engines ---------- */
// normalise a state: Available = Total − ΣAllocation (unless given), Need = Max − Allocation
const norm=S=>({...S,avail:S.avail||sb(S.tot,sumRows(S.alloc)),need:S.max?S.alloc.map((r,i)=>sb(S.max[i],r)):null});
// safety algorithm (kind 'safe', compares Need) and detection algorithm (kind 'det', compares Request; zero-allocation rows start finished)
const run=(S,kind)=>{const n=norm(S),M=kind=='det'?n.req:n.need,F=n.alloc.map(r=>kind=='det'&&r.every(x=>!x)),pre=F.map((f,i)=>f?i:-1).filter(i=>i>=0),steps=[],seq=[];let W=[...n.avail];
  for(;;){const i=n.alloc.findIndex((_,k)=>!F[k]&&le(M[k],W));if(i<0)break;const a=ad(W,n.alloc[i]);steps.push({i,m:M[i],w:W,a});W=a;F[i]=true;seq.push(i)}
  const stuck=F.map((f,i)=>f?-1:i).filter(i=>i>=0);return{n,M,steps,seq,stuck,pre,ok:!stuck.length,W}};
// resource-request algorithm
const reqAlg=(S,i,r)=>{const n=norm(S),c1=le(r,n.need[i]),c2=c1&&le(r,n.avail);let ns=null,R=null;
  if(c1&&c2){ns={...S,alloc:S.alloc.map((row,k)=>k==i?ad(row,r):row),avail:sb(n.avail,r)};R=run(ns,'safe')}
  return{c1,c2,ns,R,granted:!!R&&R.ok,n}};
// recovery: abort process i → its Allocation returns to Available
const abort=(S,i)=>{const n=norm(S),f=(m)=>m&&m.filter((_,k)=>k!=i);return{...S,names:f(S.names),alloc:f(S.alloc),req:f(S.req),max:f(S.max),avail:ad(n.avail,S.alloc[i])}};
const minAbort=S=>{const N=S.names.length;for(let k=1;k<=N;k++){const sets=[];(function pick(s,from){if(s.length==k){sets.push(s);return}for(let i=from;i<N;i++)pick([...s,i],i+1)})([],0);
  const ok=sets.filter(c=>{let T=S;[...c].sort((a,b)=>b-a).forEach(i=>T=abort(T,i));return run(T,'det').ok});if(ok.length)return{k,sets:ok}}return{k:N,sets:[]}};
// prevention: lock ordering — every thread must acquire in strictly increasing F
const orderCheck=(F,threads)=>threads.map(([n,seq])=>{let bad=null;for(let i=1;i<seq.length&&!bad;i++)if(F[seq[i]]<=F[seq[i-1]])bad=[seq[i-1],seq[i]];return{n,seq,bad}});

/* ---------- 2. Renderer ---------- */
const bdg=n=>`<span class="pb" style="background:${col(n)}">${n}</span>`,
tbl=(h,rows)=>`<div class="table-responsive"><table class="table table-bordered table-sm text-center align-middle"><thead class="table-light"><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`,
ul=a=>`<ul>${a.map(x=>`<li>${x}</li>`).join('')}</ul>`,ol=a=>`<ol>${a.map(x=>`<li>${x}</li>`).join('')}</ol>`,
call=(c,x)=>`<div class="callout ${c}">${x}</div>`,
defs=a=>`<div class="defs">${a.map(d=>`<div class="def k-${d.k}"><div class="dt">${d.t}</div><div>${d.d}</div>${d.s?`<small>${d.s}</small>`:''}</div>`).join('')}</div>`,
legend='<p class="small mb-2">Colour code: <span class="chip k-metric">formula</span> <span class="chip k-concept">concept</span> <span class="chip k-problem">problem</span> <span class="chip k-fix">remedy / property</span></p>',
alert=(c,x)=>`<div class="alert alert-${c} py-2 mb-2">${x}</div>`;
const mx=(t,S,M,hi=[])=>`<div class="mxb"><div class="mxt">${t}</div><table class="table table-bordered table-sm text-center mx"><thead class="table-light"><tr><th></th>${S.res.map(r=>`<th>${r}</th>`).join('')}</tr></thead><tbody>${M.map((r,i)=>`<tr class="${hi.includes(i)?'hi':''}"><th>${S.names[i]}</th>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const state=(S,kind)=>{const n=norm(S);return`<div class="mxrow">${mx('Allocation',S,S.alloc)}${kind=='det'?mx('Request',S,S.req):mx('Max',S,S.max)+mx('Need = Max − Allocation',S,n.need)}
  <div class="mxb"><div class="mxt">Available</div><div class="vec">${vec(n.avail)}</div><div class="small text-muted">${S.avail?'given':'= Total '+vec(S.tot)+' − ΣAlloc '+vec(sumRows(S.alloc))}</div></div></div>`};
const traceTbl=(R,kind,up=R.steps.length)=>{const nm=R.n.names,lab=kind=='det'?'Request':'Need';
  return(kind=='det'&&R.pre.length?`<p class="small mb-1">Initially finished (Allocation = 0): <b>${R.pre.map(i=>nm[i]).join(', ')}</b></p>`:'')+
  `<div class="table-responsive"><table class="table table-bordered table-sm text-center align-middle"><thead class="table-light"><tr><th>#</th><th>Pick</th><th>${lab}ᵢ</th><th>Work before</th><th>${lab}ᵢ ≤ Work?</th><th>Work after = Work + Allocᵢ</th></tr></thead><tbody>${
  R.steps.slice(0,up).map((s,j)=>`<tr class="${j==up-1?'hi':''}"><td>${j+1}</td><td><b style="color:${col(nm[s.i])}">${nm[s.i]}</b></td><td>${vec(s.m)}</td><td>${vec(s.w)}</td><td class="text-success">✓</td><td>${vec(s.a)}</td></tr>`).join('')||'<tr><td colspan="6" class="text-muted">Press “Next ▶”.</td></tr>'}</tbody></table></div>`};
const verdict=(R,kind)=>{const nm=R.n.names,L=R.seq.map(i=>nm[i]).join(', ');
  if(kind=='det')return R.ok?alert('success',`<b>No deadlock.</b> Completion order ⟨${L}⟩ — Finish[i] = true for every process.`):alert('danger',`<b>DEADLOCK.</b> Work = ${vec(R.W)}; no remaining process has Request ≤ Work. Deadlocked: <b>${R.stuck.map(i=>nm[i]).join(', ')}</b>.`);
  return R.ok?alert('success',`<b>✔ SAFE.</b> Safe sequence ⟨${L}⟩ (other safe sequences may exist).`):alert('danger',`<b>✘ UNSAFE.</b> Work = ${vec(R.W)}; none of ${R.stuck.map(i=>nm[i]).join(', ')} has Need ≤ Work. No safe sequence exists — deadlock is possible.`)};
const stepper=(k,R,kind)=>{TS[k]={R,kind,up:0};return`<div id="ts${k}"></div><div class="btn-group btn-group-sm mb-3"><button class="btn btn-outline-dark" onclick="goT(${k},-99)">⏮ Reset</button><button class="btn btn-outline-dark" onclick="goT(${k},-1)">◀ Prev</button><button class="btn btn-dark" onclick="goT(${k},1)">Next ▶</button><button class="btn btn-outline-dark" onclick="goT(${k},99)">All ⏭</button></div>`};
const paintT=k=>{const t=TS[k];$('#ts'+k).innerHTML=traceTbl(t.R,t.kind,t.up)+(t.up==t.R.steps.length?verdict(t.R,t.kind):'')},
goT=(k,d)=>{const t=TS[k];t.up=Math.max(0,Math.min(t.R.steps.length,t.up+d));paintT(k)};

// request algorithm block (three checks + pretend allocation + safety)
const reqBlock=(S,reqs,chain)=>{let cur=S;return reqs.map(([i,r,lab])=>{const A=reqAlg(cur,i,r),nm=S.names[i],n=A.n;let h=`<div class="card card-body mb-2"><b>${lab}</b>
  <div>① Request ≤ Need? ${vec(r)} ≤ ${vec(n.need[i])} → ${A.c1?'<span class="text-success">yes</span>':'<span class="text-danger">no → error: exceeds its maximum claim</span>'}</div>`;
  if(A.c1)h+=`<div>② Request ≤ Available? ${vec(r)} ≤ ${vec(n.avail)} → ${A.c2?'<span class="text-success">yes</span>':'<span class="text-danger">no → '+nm+' must wait</span>'}</div>`;
  if(A.c2){h+=`<div>③ Pretend to allocate: Available = ${vec(A.ns.avail)}, Allocation<sub>${nm}</sub> = ${vec(A.ns.alloc[i])}, Need<sub>${nm}</sub> = ${vec(norm(A.ns).need[i])}. Safety algorithm → ${A.R.ok?'safe sequence ⟨'+A.R.seq.map(j=>S.names[j]).join(', ')+'⟩':'<b>no safe sequence</b> (stuck at Work = '+vec(A.R.W)+')'}</div>`}
  h+=alert(A.granted?'success':'danger',A.granted?`<b>GRANT</b> — the new state is safe.`:(A.c2?`<b>DENY</b> — ${nm} waits; the old state is restored (resources exist, but the state would be unsafe).`:`<b>DENY / WAIT</b>.`))+'</div>';
  if(chain&&A.granted)cur=A.ns;return h}).join('')};

/* ----- example cards ----- */
const hdr=(e,extra='')=>`<div class="d-flex flex-wrap gap-2 align-items-center"><h5 class="m-0">${e.t}</h5>${e.s?`<span class="badge text-bg-primary">${e.s}</span>`:''}${extra}</div>`;
const ragBlock=(k,e)=>{GR[k]={G:e.G,claim:e.claim,then:e.then,wfg:e.wfg,on:false};
  return`<div class="swim-wrap"><div id="rg${k}" class="rag-host"></div><div id="rl${k}"></div>${e.then&&e.then.label?`<button class="btn btn-sm btn-dark mb-2" id="rb${k}" onclick="ragToggle(${k})">${e.then.label}</button>`:''}<div id="rv${k}"></div>${e.wfg?`<h6>Wait-for graph (resource nodes collapsed)</h6><div id="rw${k}" class="rag-host"></div><div id="rwv${k}"></div>`:''}</div>`};
const ragDraw=k=>{const g=GR[k],G=g.on?applyDelta(g.G,g.then.d||g.then):g.G,H=$('#rg'+k);H.innerHTML='';H.id='rg'+k;drawRAG(H,G,{claim:g.claim});
  $('#rl'+k).innerHTML=ragLegend(G);const rv=$('#rv'+k);if(rv){const v=ragVerdict(G,{claim:g.claim});rv.innerHTML=alert(v.cls,v.html)}
  if(g.wfg&&$('#rw'+k)){const W=wfgOf(G),h2=$('#rw'+k);h2.innerHTML='';drawRAG(h2,W,{h:260});const v2=ragVerdict(W);$('#rwv'+k).innerHTML=alert(v2.cls,v2.html)}},
ragToggle=k=>{GR[k].on=!GR[k].on;const b=$('#rb'+k);b.classList.toggle('btn-dark',!GR[k].on);b.classList.toggle('btn-outline-dark',GR[k].on);ragDraw(k)};

const exCard=(e,k)=>{const body={
 rag:()=>ragBlock(k,e),
 code:()=>`<div class="row g-2">${e.code.map(([n,c])=>`<div class="col-md-${e.code.length>1?6:12}"><div class="codebox"><div class="codehd">${n}</div><pre>${esc(c)}</pre></div></div>`).join('')}</div>
   ${e.tl?`<h6>One bad interleaving</h6>${tbl(['Step','Thread','Action','Result'],e.tl)}`:''}${e.G?`<h6>Resulting resource-allocation graph</h6>${ragBlock(k,e)}`:call('warn','⚠️ No cycle of waiting exists here: the threads are <b>running</b>, not blocked — that is what separates livelock from deadlock.')}`,
 order:()=>{const R=orderCheck(e.F,e.threads);return`<p class="mb-1"><b>Ordering F:</b> ${Object.entries(e.F).map(([a,b])=>`F(${a}) = ${b}`).join(', ')}</p>${tbl(['Thread','Acquisition order','F values','Verdict'],R.map(r=>[`<b>${r.n}</b>`,r.seq.join(' → '),r.seq.map(x=>e.F[x]).join(' → '),r.bad?`<span class="text-danger fw-bold">✘ asks for ${r.bad[1]} (F=${e.F[r.bad[1]]}) while holding ${r.bad[0]} (F=${e.F[r.bad[0]]})</span>`:'<span class="text-success fw-bold">✔ increasing</span>']))}
   ${alert(R.some(r=>r.bad)?'danger':'success',R.some(r=>r.bad)?'<b>Ordering violated</b> ⇒ circular wait is possible (see the interleaving in the System Model tab).':'<b>Every thread respects F</b> ⇒ circular wait cannot occur ⇒ no deadlock.')}`},
 bank:()=>{const R=run(e.S,'safe');return`${state(e.S,'safe')}<h6>Step 1 — Safety algorithm, one pick at a time</h6>${stepper(k,R,'safe')}${e.reqs?`<h6>Step 2 — Resource-request algorithm${e.chain?' (each granted request changes the state for the next one)':' (each request is tested against the state above)'}</h6>${reqBlock(e.S,e.reqs,e.chain)}`:''}`},
 det:()=>{const R=run(e.S,'det');return`${state(e.S,'det')}<h6>Detection algorithm, one pick at a time</h6>${stepper(k,R,'det')}`},
 rec:()=>{const n=norm(e.S),R0=run(e.S,'det');let h=`${state(e.S,'det')}<h6>Step 1 — Detect</h6>${verdict(R0,'det')}`;
   if(e.order){let T=e.S;h+=`<h6>Step 2 — Abort one at a time, re-run detection</h6>`;const rows=[];e.order.forEach(nmv=>{const i=T.names.indexOf(nmv),rel=T.alloc[i];T=abort(T,i);const R=run(T,'det');rows.push([`Abort <b>${nmv}</b>`,vec(rel),vec(norm(T).avail),R.ok?'<span class="text-success fw-bold">none — recovered</span>':'<span class="text-danger">'+R.stuck.map(j=>T.names[j]).join(', ')+'</span>'])});
     h+=tbl(['Action','Released','Available now','Still deadlocked'],rows)}
   else{h+=`<h6>Step 2 — Try each single victim</h6>`+tbl(['Abort','Released','Available after','Deadlock resolved?','Still deadlocked'],e.S.names.map((nmv,i)=>{const T=abort(e.S,i),R=run(T,'det');return[`<b>${nmv}</b>`,vec(e.S.alloc[i]),vec(norm(T).avail),R.ok?'<span class="text-success fw-bold">yes</span>':'<span class="text-danger">no</span>',R.ok?'—':R.stuck.map(j=>T.names[j]).join(', ')]}))+
     '<p class="small text-muted">Choosing among the working victims uses the cost criteria (CPU time, output, remaining time, resources held, priority, rollback count).</p>'}return h}}[e.k];
 return`<div class="card card-body mb-4">${hdr(e)}<p class="mt-3">${e.n}</p>${body()}</div>`};

/* ----- practice cards ----- */
const OPT={rag:['Deadlock','No deadlock — cycle exists','No deadlock — no cycle'],bank:['Safe','Unsafe'],det:['No deadlock','Deadlock'],claim:['Grant the request','Deny (unsafe)'],order:['Respects the ordering','Violates the ordering'],minab:['1','2','3','4']};
const prCard=(e,k)=>{let show='',ans,sol='',opts=OPT[e.k];
  if(e.k=='rag'){show=ragBlockPr(k,e);const v=ragVerdict(e.G);ans=v.key;sol=alert(v.cls,v.html)+(e.wfg?alert('secondary','Wait-for graph: '+ragVerdict(wfgOf(e.G)).html):'')}
  else if(e.k=='claim'){GR[k]={G:e.G,claim:true,wfg:false,on:false};show=`<div id="rg${k}" class="rag-host"></div><div id="rl${k}"></div>`;const G2=applyDelta(e.G,e.then),v=ragVerdict(G2,{claim:true});ans=v.key;sol=alert(v.cls,v.html)}
  else if(e.k=='bank'){const R=run(e.S,'safe');show=state(e.S,'safe');ans=R.ok?'Safe':'Unsafe';sol=traceTbl(R,'safe')+verdict(R,'safe')+(e.reqs?reqBlock(e.S,e.reqs):'')}
  else if(e.k=='det'){const R=run(e.S,'det');show=state(e.S,'det');ans=R.ok?'No deadlock':'Deadlock';sol=traceTbl(R,'det')+verdict(R,'det')}
  else if(e.k=='order'){const R=orderCheck(e.F,e.threads);show=`<p class="mb-1"><b>F:</b> ${Object.entries(e.F).map(([a,b])=>`F(${a}) = ${b}`).join(', ')}</p>${tbl(['Thread','Acquires in this order'],e.threads.map(t=>[`<b>${t[0]}</b>`,t[1].join(' → ')]))}`;
    ans=R.some(r=>r.bad)?'Violates the ordering':'Respects the ordering';sol=tbl(['Thread','F values','Verdict'],R.map(r=>[`<b>${r.n}</b>`,r.seq.map(x=>e.F[x]).join(' → '),r.bad?`✘ ${r.bad[0]} → ${r.bad[1]} is not increasing`:'✔ increasing']))}
  else if(e.k=='minab'){const M=minAbort(e.S);show=state(e.S,'det')+verdict(run(e.S,'det'),'det');ans=String(M.k);sol=`<p>Smallest abort sets (size ${M.k}): <b>${M.sets.map(s=>'{'+s.map(i=>e.S.names[i]).join(', ')+'}').join(' · ')}</b></p>`}
  else if(e.k=='text'){show='';sol=e.sol}
  CK[k]=ans;
  return`<div class="card card-body mb-4"><h5>${e.t}</h5>${show}<p class="mt-2 mb-2"><b>${e.q}</b></p>
  <div><button class="btn btn-warning btn-sm" data-bs-toggle="collapse" data-bs-target="#h${k}">💡 Hint</button> <button class="btn btn-success btn-sm" data-bs-toggle="collapse" data-bs-target="#s${k}">✔ Solution</button></div>
  <div class="collapse mt-2" id="h${k}"><div class="alert alert-warning mb-0">${e.h}</div></div>
  ${opts?`<div class="d-flex flex-wrap gap-2 align-items-center my-2"><b>Check yourself:</b>${opts.map((o,i)=>`<button class="btn btn-outline-primary btn-sm" onclick="chk(${k},this)">${o}</button>`).join('')}<span id="c${k}"></span></div>`:''}
  <div class="collapse" id="s${k}"><h6>Solution</h6>${sol}</div></div>`};
const ragBlockPr=(k,e)=>{GR[k]={G:e.G,wfg:false,on:false};return`<div id="rg${k}" class="rag-host"></div><div id="rl${k}"></div>`};
const chk=(k,b)=>{$('#c'+k).innerHTML=b.textContent==CK[k]?'<span class="badge text-bg-success">✓ Correct!</span>':'<span class="badge text-bg-danger">✗ Not yet — try the hint</span>'};

/* ----- topic page ----- */
const DEFSET=a=>a=='coffman'?D.coffman:a=='bank'?D.defs.slice(3,6):a=='det'?[D.defs[0],D.defs[7]]:null;
const notes=a=>{const ds=DEFSET(a.defs);return call('book',`📖 <b>Source:</b> Galvin, Ch. 8, ${a.src}.`)+(ds?`<h5>📘 Key definitions</h5>${legend}${defs(ds)}`:'')+
  `<h5>Rule in one line</h5><div class="callout rule">${a.rule}</div>${a.math?`\\[${a.math}\\]`:''}<h5>How to solve — step by step</h5>${ol(a.steps)}
  ${a.notes.map(n=>`<h5>${n.h}</h5>${ul(n.items)}${n.table?`<p class="mb-1"><b>${n.table.cap}</b></p>${tbl(n.table.h,n.table.r)}`:''}`).join('')}
  ${a.pros?`<div class="row g-3 mt-1"><div class="col-md-6"><div class="alert alert-success h-100 mb-0"><b>Advantages</b><br>${a.pros}</div></div><div class="col-md-6"><div class="alert alert-danger h-100 mb-0"><b>Drawbacks</b><br>${a.cons}</div></div></div>`:''}`};
const topic=a=>{TS=[];GR=[];CK=[];let k=0;const ex=a.exs.map(e=>exCard(e,k++)).join(''),pr=a.pr.map(e=>prCard(e,k++)).join('');
  return`<h3 class="mb-1">${a.name} <small class="text-muted fs-6">${a.full}</small> <span class="badge text-bg-dark fs-6">${a.mode}</span></h3>
  <ul class="nav nav-tabs my-3">${['📖 Lecture notes','🧪 Examples ('+a.exs.length+')','✏️ Practice + solution ('+a.pr.length+')'].map((t,i)=>`<li class="nav-item"><button class="nav-link${i?'':' active'}" data-bs-toggle="tab" data-bs-target="#p${i}">${t}</button></li>`).join('')}</ul>
  <div class="tab-content card card-body"><div class="tab-pane fade show active" id="p0">${notes(a)}</div>
   <div class="tab-pane fade" id="p1">${call('book','📖 Examples tagged “slides” / “lecture” follow the course slides; “Galvin” follows the textbook. Drag the graph nodes — the layout is a live force simulation (D3 force-directed, the same idea as NetworkX’s spring layout).')}${ex}</div>
   <div class="tab-pane fade" id="p2">${pr}</div></div>`};

/* ----- overview ----- */
const venn=`<svg viewBox="0 0 640 240" class="venn" role="img" aria-label="Safe, unsafe and deadlock states"><rect x="4" y="4" width="632" height="232" rx="14" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/><text x="20" y="28" font-weight="700" fill="#334155">All states</text>
 <ellipse cx="190" cy="132" rx="150" ry="84" fill="#ecf9f0" stroke="#15803d" stroke-width="2.5"/><text x="190" y="136" text-anchor="middle" font-weight="700" fill="#15803d" font-size="22">SAFE</text><text x="190" y="160" text-anchor="middle" fill="#166534" font-size="13">no deadlock possible</text>
 <ellipse cx="450" cy="132" rx="170" ry="84" fill="#fff8e7" stroke="#d97706" stroke-width="2.5"/><text x="450" y="92" text-anchor="middle" font-weight="700" fill="#b45309" font-size="22">UNSAFE</text>
 <ellipse cx="500" cy="152" rx="80" ry="40" fill="#fef2f2" stroke="#dc2626" stroke-width="2.5"/><text x="500" y="158" text-anchor="middle" font-weight="700" fill="#dc2626" font-size="18">DEADLOCK</text></svg>`;
const over=()=>{const S=D.topics[3].exs[1].S,R=run(S,'safe');
  return call('book','📖 <b>Slide alignment:</b> Silberschatz, Galvin &amp; Gagne, <i>Operating System Concepts</i> (10th ed.), Chapter 8 “Deadlocks”, §8.1–8.8, and the course lecture slides <i>Deadlocks – Ch. 8</i> (slide numbers 8.x are quoted next to the facts). Chapter 5 (CPU Scheduling) notes use the same layout.')+
  `<div class="card card-body mb-3"><h4>🎯 Learning objectives</h4>${ul(D.objectives)}</div>
  <div class="card card-body mb-3"><h4>📘 Key definitions</h4>${legend}${defs(D.defs)}<h6>Safe, unsafe and deadlocked states (slide 8.23)</h6>${venn}</div>
  <div class="card card-body mb-3"><h4>Part A — Basics</h4>${D.basics.map(b=>`<h6>${b.h}</h6>${ul(b.items)}`).join('')}<h6>The four Coffman conditions (all must hold)</h6>${defs(D.coffman)}
   <h6>Key formulas</h6>${D.formulas.map(f=>`\\[${f}\\]`).join('')}<h6>Recipe for every exercise</h6>${ol(D.recipe)}</div>
  <div class="card card-body mb-3"><h4>Part B — Four ways to handle deadlocks</h4>${tbl(['Approach','Idea','Needs to know','Price','Source'],D.methods.map(m=>[`<b>${m[0]}</b>`,...m.slice(1)]))}</div>
  <div class="card card-body"><h4>Part C — Worked taste: the Banker’s safety check</h4><p>Lecture example (slide 8.32): Total = ${vec(S.tot)}. Allocation, Max and Need give Available = ${vec(norm(S).avail)}.</p>${state(S,'safe')}${traceTbl(R,'safe')}${verdict(R,'safe')}<p class="small text-muted mb-0">Open the <b>Avoidance</b> tab to step through it one pick at a time and test requests.</p></div>`};

const show=i=>{document.querySelectorAll('#nav .nav-link').forEach((b,k)=>b.classList.toggle('active',k==i));
  TS=[];GR=[];CK=[];$('#view').innerHTML=i?topic(D.topics[i-1]):over();
  GR.forEach((g,k)=>{if(g)ragDraw(k)});TS.forEach((t,k)=>t&&paintT(k));window.scrollTo&&window.scrollTo({top:0});window.MathJax&&MathJax.typesetPromise&&MathJax.typesetPromise()};

if(typeof document!='undefined'){
  if(!window.DATA)$('#view').innerHTML='<div class="alert alert-danger"><b>data.js was not found.</b> Keep <code>index.html</code>, <code>app.js</code>, <code>data.js</code>, <code>rag.js</code> and <code>style.css</code> in the same folder.</div>';
  else{D=window.DATA;document.title=D.title;
    $('#nav').innerHTML=['Overview',...D.topics.map(a=>a.name)].map((t,i)=>`<li class="nav-item"><button class="nav-link" onclick="show(${i})" title="${i?D.topics[i-1].full:'Chapter overview'}">${t}</button></li>`).join('');show(0)}}
if(typeof module!='undefined')module.exports={run,reqAlg,abort,minAbort,orderCheck,over,topic,setD:d=>{D=d}};
