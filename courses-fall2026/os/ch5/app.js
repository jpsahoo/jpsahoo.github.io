// CPU Scheduling lecture notes — schedulers (engine) + renderer. All teaching text lives in data.js.
const $=s=>document.querySelector(s),fmt=x=>+x.toFixed(2),nm=a=>a.map(p=>p.n).join(', '),sum=(a,k)=>a.reduce((s,x)=>s+x[k],0),
COL=['#2563eb','#16a34a','#d97706','#dc2626','#7c3aed','#0891b2'],
col=n=>{if(n=='idle')return'#94a3b8';const c=n.slice(-1),i='₀₁₂₃₄₅₆₇₈₉'.indexOf(c);return COL[(i>=0?i:(+c||0))%6]};
let D,ST=[],CK=[],SW=[],GN=0,RO=null;

/* ---------- 1. Schedulers: each returns a Gantt list [[proc,start,end,note,queue]] ---------- */
const add=(g,n,s,e,i,l,keep)=>{ // append a slice, auto-insert idle gaps, merge contiguous slices (unless keep)
  const end=g.length?g[g.length-1][2]:0; if(s>end)g.push(['idle',end,s,'No process has arrived yet']);
  const M=g[g.length-1]; if(!keep&&M&&M[0]==n&&M[2]==s&&M[4]==l)M[2]=e; else g.push([n,s,e,i,l]);};

// non-preemptive family (FCFS, SJF, HRRN, Priority): pick the best READY process whenever the CPU is free
const np=(P,key,lab)=>{const g=[];let t=0,L=[...P];
  while(L.length){const r=L.filter(p=>p.at<=t);if(!r.length){t=Math.min(...L.map(p=>p.at));continue}
    r.sort((a,b)=>key(a,t)-key(b,t)||a.at-b.at);const p=r[0];
    add(g,p.n,t,t+p.bt,'Ready: '+r.map(x=>x.n+' ('+lab(x,t)+')').join(', ')+' → pick '+p.n);t+=p.bt;L=L.filter(x=>x!==p)}
  return g};

// multilevel queue (fb=0, fixed queue per process) and multilevel feedback queue (fb=1, demote after a full quantum)
// 1-ms ticks; a higher queue preempts a lower one (preempted process resumes at the head of its queue with a fresh quantum)
const ml=(P,{qs},fb)=>{const g=[],Q=qs.map(()=>[]),rem={},lv={},vis={};let cur=null,used=0,left=P.length;
  P.forEach(p=>{rem[p.n]=p.bt;lv[p.n]=fb?0:p.q-1;vis[p.n]=new Set});
  for(let t=0;left;t++){
    P.filter(p=>p.at==t).forEach(p=>Q[lv[p.n]].push(p));
    if(cur&&!rem[cur.n]){left--;cur=null}
    else if(cur&&qs[lv[cur.n]]&&used>=qs[lv[cur.n]]){if(fb)lv[cur.n]=Math.min(lv[cur.n]+1,qs.length-1);Q[lv[cur.n]].push(cur);cur=null}
    if(cur&&Q.slice(0,lv[cur.n]).some(x=>x.length)){Q[lv[cur.n]].unshift(cur);cur=null}
    if(!cur){const k=Q.findIndex(x=>x.length);if(k>=0){cur=Q[k].shift();used=0}}
    if(cur){const l=lv[cur.n];vis[cur.n].add(l);add(g,cur.n,t,t+1,'Waiting → '+Q.map((x,k)=>'Q'+(k+1)+'['+nm(x)+']').join('  '),'Q'+(l+1));rem[cur.n]--;used++}}
  g.vis=vis;return g};

const S={
  fcfs:P=>np(P,()=>0,p=>'AT '+p.at),
  sjf:P=>np(P,p=>p.bt,p=>'BT '+p.bt),
  hrrn:P=>np(P,(p,t)=>-(t-p.at+p.bt)/p.bt,(p,t)=>'ratio '+fmt((t-p.at+p.bt)/p.bt)),
  prio:P=>np(P,p=>p.pr,p=>'priority '+p.pr),
  srtf:P=>{const g=[],rem={};let t=0,cur;P.forEach(p=>rem[p.n]=p.bt);
    while(P.some(p=>rem[p.n])){const r=P.filter(p=>p.at<=t&&rem[p.n]);if(!r.length){t++;continue}
      r.sort((a,b)=>rem[a.n]-rem[b.n]||(b==cur)-(a==cur)||a.at-b.at);cur=r[0];
      add(g,cur.n,t,t+1,'Ready (remaining): '+r.map(p=>p.n+' '+rem[p.n]).join(', ')+' → '+cur.n);rem[cur.n]--;t++}
    return g},
  rr:(P,{q,split})=>{const g=[],A=[...P].sort((a,b)=>a.at-b.at),Q=[],rem={};let t=0,i=0;P.forEach(p=>rem[p.n]=p.bt);
    const arr=()=>{while(i<A.length&&A[i].at<=t)Q.push(A[i++])};
    for(arr();Q.length||i<A.length;){if(!Q.length){t=A[i].at;arr()}
      const p=Q.shift(),r=Math.min(q,rem[p.n]),s=t;t+=r;rem[p.n]-=r;arr();if(rem[p.n])Q.push(p);
      add(g,p.n,s,t,'Remaining '+rem[p.n]+' · ready queue now ['+nm(Q)+']',undefined,split)}
    return g},
  vrr:(P,{q})=>{const g=[],A=[...P].sort((a,b)=>a.at-b.at),s={},M=[],X=[];let B=[],i=0,t=0;
    P.forEach(p=>s[p.n]={rem:p.bt,done:0,left:0,io:!!p.io});
    const ev=()=>{const n=A.slice(i).filter(p=>p.at<=t),E=[...n.map(p=>[p.at,p]),...B.filter(b=>b[0]<=t)].sort((a,b)=>a[0]-b[0]);
      i+=n.length;B=B.filter(b=>b[0]>t);E.forEach(([,p])=>(s[p.n].left>0?X:M).push(p))};
    while(i<A.length||M.length||X.length||B.length){ev();
      if(!M.length&&!X.length){t=Math.min(...A.slice(i).map(p=>p.at),...B.map(b=>b[0]));continue}
      const aux=X.length>0,p=(aux?X:M).shift(),k=s[p.n],lim=aux?k.left:q,r=Math.min(lim,k.rem,k.io?p.io[0]-k.done:1e9),s0=t;
      t+=r;k.rem-=r;k.done+=r;ev();
      if(k.rem>0){if(k.io&&k.done==p.io[0]){k.io=false;k.left=lim-r;B.push([t+p.io[1],p])}else M.push(p)}
      add(g,p.n,s0,t,(aux?'From Aux':'From Main')+' (max '+lim+' ms) · now Aux['+nm(X)+'] Main['+nm(M)+']'+(k.rem&&!M.includes(p)?' · blocked for I/O':''))}
    return g},
  mlq:(P,c)=>ml(P,c,0),mlfq:(P,c)=>ml(P,c,1),
  prr:(P,c)=>ml(P.map(p=>({...p,q:p.pr})),{qs:Array(Math.max(...P.map(p=>p.pr))).fill(c.q)},0)}; // priority + RR inside each priority level

// CT comes from the Gantt chart; TAT = CT-AT; WT = TAT-BT (minus I/O time for VRR)
const solve=(id,P,c={})=>{const g=S[id](P,c),r=P.map(p=>{const ct=Math.max(...g.filter(x=>x[0]==p.n).map(x=>x[2])),tat=ct-p.at,io=p.io?p.io[1]:0;return{p,ct,tat,io,wt:tat-p.bt-io}});
  return{g,r,T:fmt(sum(r,'tat')/r.length),W:fmt(sum(r,'wt')/r.length)}};

/* ---------- 2. Renderer ---------- */
const bdg=n=>`<span class="pb" style="background:${col(n)}">${n}</span>`,
tbl=(h,rows)=>`<div class="table-responsive"><table class="table table-bordered table-sm text-center align-middle"><thead class="table-light"><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`,
capt=t=>`<b>Gantt chart ${++GN}.</b> ${t}`,
// Gantt chart = bars (width ∝ duration) + time axis. Every boundary is numbered; fit() hides only labels that would overlap.
gantt=(g,u=g.length,cap='')=>{
  const T0=g[0][1],T1=g[g.length-1][2],sp=T1-T0,pc=t=>((t-T0)/sp*100).toFixed(3)+'%',
    B=[T0,...g.map(x=>x[2])],step=sp<=45?1:sp<=120?5:10,mt=[];
  for(let t=Math.ceil(T0/step)*step;t<=T1;t+=step)mt.push(t);
  const names=[...new Set(g.map(x=>x[0]))];
  return `<figure class="gc">
  <div class="gbar">${g.map((x,i)=>`<div class="blk${i<u?'':' off'}" title="${x[0]}: ${x[1]} → ${x[2]} ms (${x[2]-x[1]} ms)${x[4]?' · '+x[4]:''}" style="left:${pc(x[1])};width:${((x[2]-x[1])/sp*100).toFixed(3)}%;background:${col(x[0])}"><b>${x[0]}</b>${x[4]?`<small>${x[4]}</small>`:''}</div>`).join('')}</div>
  <div class="axis">${mt.map(t=>`<i class="mt" style="left:${pc(t)}"></i>`).join('')}${B.slice(0,u+1).map((t,i,a)=>`<span class="tk${i==a.length-1?' last':''}" style="left:${pc(t)}"><i></i><em>${t}</em></span>`).join('')}<span class="unit">time (ms) →</span></div>
  <figcaption class="gcap">${cap?cap+'<br>':''}<span class="small text-muted">Switch times (ms): <b>${B.slice(0,u+1).join(' → ')}</b>${u<g.length?' …':''}</span>
   <span class="lg">${names.map(n=>n=='idle'?'<span class="pb" style="background:#94a3b8">idle</span>':bdg(n)).join(' ')}</span></figcaption></figure>`},
fit=gc=>{const W=gc.clientWidth;if(!W)return;
  gc.querySelectorAll('.blk').forEach(b=>{const w=b.offsetWidth;b.classList.toggle('xs',w<24);b.classList.toggle('nosub',w<70)});
  const ts=[...gc.querySelectorAll('.tk')];ts.forEach(t=>t.classList.remove('hide'));if(ts.length<3)return;
  const geo=t=>{const w=t.querySelector('em').offsetWidth,x=t.offsetLeft;return[x-w/2,x+w/2]};
  let right=geo(ts[0])[1];const stop=geo(ts[ts.length-1])[0]-4;
  for(let i=1;i<ts.length-1;i++){const[l,r]=geo(ts[i]);if(l>=right+4&&r<=stop)right=r;else ts[i].classList.add('hide')}},
watch=root=>root.querySelectorAll('.gc').forEach(gc=>{fit(gc);RO?RO.observe(gc):0}),
trace=(g,u)=>u?g.slice(0,u).map((x,i)=>`<li class="${i==u-1?'cur':''}"><b>${x[1]} → ${x[2]} ms</b>: ${x[0]=='idle'?'CPU idle':x[0]+' runs '+(x[2]-x[1])+' ms'}${x[4]?` <span class="badge text-bg-secondary">${x[4]}</span>`:''}<div class="small text-muted">${x[3]||''}</div></li>`).join(''):'<li class="text-muted">Press “Next ▶”.</li>',
inp=P=>{const h=k=>P.some(p=>p[k]!=null);
  return tbl(['Process','AT (ms)','BT (ms)',...h('pr')?['Priority']:[],...h('q')?['Queue']:[],...h('io')?['I/O']:[]],
    P.map(p=>[bdg(p.n),p.at,p.bt,...h('pr')?[p.pr]:[],...h('q')?['Q'+p.q]:[],...h('io')?[p.io?`CPU ${p.io[0]} ms → I/O ${p.io[1]} ms`:'—']:[]]))},
out=(R,a)=>tbl(['Process','AT','BT','CT','TAT = CT − AT','WT = TAT − BT'+(R.r.some(x=>x.io)?' − I/O':''),...a.id=='mlfq'?['Queues visited']:[]],
  R.r.map(x=>[bdg(x.p.n),x.p.at,x.p.bt,`<b>${x.ct}</b>`,`${x.ct} − ${x.p.at} = <b>${x.tat}</b>`,`${x.tat} − ${x.p.bt}${x.io?' − '+x.io:''} = <b>${x.wt}</b>`,
    ...a.id=='mlfq'?[[...R.g.vis[x.p.n]].sort().map(k=>'Q'+(k+1)).join(' → ')]:[]])),
avg=R=>`\\[\\text{Avg TAT}=\\frac{${R.r.map(x=>x.tat).join('+')}}{${R.r.length}}=\\boxed{${R.T}\\text{ ms}}\\qquad\\text{Avg WT}=\\frac{${R.r.map(x=>x.wt).join('+')}}{${R.r.length}}=\\boxed{${R.W}\\text{ ms}}\\]`,
cfg=(a,c)=>c&&c.q?`<p>Time quantum: <b>q = ${c.q} ms</b></p>`:c&&c.qs?`<p>${c.qs.map((q,i)=>`<b>Q${i+1}</b>: ${q?'Round Robin, q = '+q:'FCFS'}`).join(' · ')} — Q1 has the highest priority${a.id=='mlfq'?'; a process that uses its full quantum is demoted':''}.</p>`:'',
bnd=g=>[g[0][1],...g.map(x=>x[2])],
// compare our result with the value Galvin prints (avg WT, avg TAT, Gantt boundaries)
verify=(b,R)=>{if(!b)return'';const m=[];let ok=true;
  if(b.wt!=null){ok=ok&&Math.abs(R.W-b.wt)<=.011;m.push('avg WT = '+b.wt+' ms')}
  if(b.tat!=null){ok=ok&&Math.abs(R.T-b.tat)<=.011;m.push('avg TAT = '+b.tat+' ms')}
  if(b.g){ok=ok&&JSON.stringify(b.g)==JSON.stringify(bnd(R.g));m.push('Gantt boundaries '+b.g.join(', '))}
  return ok?`<span class="badge text-bg-success">✔ Matches Galvin: ${m.join(' · ')}</span>`:`<span class="badge text-bg-danger">✘ Differs from the book — check the inputs</span>`},
ul=a=>`<ul>${a.map(x=>`<li>${x}</li>`).join('')}</ul>`,ol=a=>`<ol>${a.map(x=>`<li>${x}</li>`).join('')}</ol>`,
call=(c,x)=>`<div class="callout ${c}">${x}</div>`,
defs=a=>`<div class="defs">${a.map(d=>`<div class="def k-${d.k}"><div class="dt">${d.t}</div><div>${d.d}</div>${d.s?`<small>${d.s}</small>`:''}</div>`).join('')}</div>`,
legend='<p class="small mb-2">Colour code: <span class="chip k-metric">measure / formula</span> <span class="chip k-concept">concept</span> <span class="chip k-problem">problem</span> <span class="chip k-fix">remedy / property</span></p>';

// Figure 5.4: exponential average, reproduced and checked against the book’s row of guesses
const pred=x=>{let τ=x.tau0;const g=[τ],rows=x.t.map((t,i)=>{const n=x.a*t+(1-x.a)*τ;const r=[i+1,fmt(τ),t,fmt(n)];τ=n;g.push(fmt(n));return r}),ok=JSON.stringify(g)==JSON.stringify(x.book);
  return `<h5>Figure 5.4 reproduced — α = ${x.a}, τ₀ = ${x.tau0}</h5>${tbl(['Burst #','Guess before it (τ)','Measured burst (t)','Next guess  α·t + (1−α)·τ'],rows)}
  <p>Guess row: <b>${g.join(', ')}</b> ${ok?'<span class="badge text-bg-success">✔ matches Galvin p.208</span>':'<span class="badge text-bg-danger">✘ differs</span>'}</p>`};
// RR: avg turnaround as the quantum changes (compare with Galvin Figure 5.6, p.212)
const sweep=x=>`<h5>Average turnaround vs time quantum (data of Galvin Figure 5.6, p.212)</h5>${inp(x.p)}${tbl(['q',...x.qs],[['Avg TAT',...x.qs.map(q=>solve('rr',x.p,{q}).T)],['Avg WT',...x.qs.map(q=>solve('rr',x.p,{q}).W)]])}
  <p class="small text-muted">The curve is <b>not</b> monotonic: a larger quantum does not always lower the average turnaround time.</p>`;

const notes=a=>call(a.from=='galvin'?'book':'warn',a.from=='galvin'?`📖 <b>Source:</b> Galvin, Ch. 5, ${a.src}.`:`⚠️ <b>Beyond Galvin §5.3.</b> This algorithm is on the instructor’s list but is not covered in Galvin, Ch. 5, §5.3; the notes and example below are our own.`)+(a.defs?`<h5>📘 Key definitions</h5>${legend}${defs(a.defs)}`:'')+
  `<h5>Rule in one line</h5><div class="callout rule">${a.rule}</div>${a.math?`\\[${a.math}\\]`:''}
  <h5>How to solve — step by step</h5>${ol(a.steps)}
  ${a.notes.map(n=>`<h5>${n.h}</h5>${ul(n.items)}${n.table?`<p class="mb-1"><b>${n.table.cap}</b></p>${tbl(n.table.h,n.table.r)}`:''}`).join('')}
  ${a.extra=='pred'?pred(D.pred):a.extra=='sweep'?sweep(D.sweep):''}
  <div class="row g-3 mt-1"><div class="col-md-6"><div class="alert alert-success h-100 mb-0"><b>Advantages</b><br>${a.pros}</div></div><div class="col-md-6"><div class="alert alert-danger h-100 mb-0"><b>Drawbacks</b><br>${a.cons}</div></div></div>`;

const exCard=(a,e,k)=>{const id=e.u||a.id,A={id},R=solve(id,e.p,e.c);ST[k]={g:R.g,up:1,cap:capt(e.t+(e.s?' · '+e.s:''))};
  SW[k]={P:e.p,R,label:a.full||a.name,short:a.name};
  return `<div class="card card-body mb-4"><div class="d-flex flex-wrap gap-2 align-items-center"><h5 class="m-0">${e.t}</h5><span class="badge text-bg-primary">${e.s}</span>${verify(e.b,R)}</div>
  <p class="mt-3">${e.n}</p>${inp(e.p)}${cfg(A,e.c)}
  <h6>Step 1 — Gantt chart, one scheduling decision at a time</h6><div id="g${k}"></div>
  <div class="btn-group btn-group-sm mb-3"><button class="btn btn-outline-dark" onclick="go(${k},-99)">⏮ Reset</button><button class="btn btn-outline-dark" onclick="go(${k},-1)">◀ Prev</button><button class="btn btn-dark" onclick="go(${k},1)">Next ▶</button><button class="btn btn-outline-dark" onclick="go(${k},99)">All ⏭</button></div>
  <ol class="trace" id="tr${k}"></ol>
  <h6>Step 2 — Completion, turnaround and waiting time</h6>${out(R,A)}<h6>Step 3 — Averages</h6>${avg(R)}
  <h6>Step 4 — Classic textbook diagram (Stallings-style): arrival cascade, per-process schedule and T<sub>r</sub>/T<sub>s</sub> table</h6>
  <div class="swim-wrap" id="sw${k}"></div><div id="swt${k}"></div></div>`};

const prCard=(a,e,k)=>{const R=solve(a.id,e.p,e.c);CK[k]=R;
  return `<div class="card card-body mb-4"><h5>${e.t}</h5>${inp(e.p)}${cfg(a,e.c)}
  <b>Using ${a.full}:</b>${ol([...D.tasks,...a.id=='mlfq'?['State which queues each process enters.']:[]])}
  <div><button class="btn btn-warning btn-sm" data-bs-toggle="collapse" data-bs-target="#h${k}">💡 Hint</button>
  <button class="btn btn-success btn-sm" data-bs-toggle="collapse" data-bs-target="#s${k}">✔ Solution</button></div>
  <div class="collapse mt-2" id="h${k}"><div class="alert alert-warning mb-0">${e.h}</div></div>
  <div class="row g-2 my-2 align-items-center"><div class="col-auto"><b>Check yourself:</b></div>
   <div class="col-auto"><input id="aT${k}" class="form-control form-control-sm" placeholder="Avg TAT"></div><div class="col-auto"><input id="aW${k}" class="form-control form-control-sm" placeholder="Avg WT"></div>
   <div class="col-auto"><button class="btn btn-primary btn-sm" onclick="check(${k})">Check</button></div><div class="col-auto" id="c${k}"></div></div>
  <div class="collapse" id="s${k}"><h6>Solution</h6>${gantt(R.g,undefined,capt('Solution — '+e.t))}${out(R,a)}${avg(R)}</div></div>`};

const algo=a=>{ST=[];CK=[];SW=[];let k=0;const ex=a.exs.map(e=>exCard(a,e,k++)).join(''),pr=a.pr.map(e=>prCard(a,e,k++)).join('');
  return `<h3 class="mb-1">${a.name} <small class="text-muted fs-6">${a.full}</small> <span class="badge text-bg-dark fs-6">${a.mode}</span></h3>
  <ul class="nav nav-tabs my-3">${['📖 Lecture notes','🧪 Examples ('+a.exs.length+')','✏️ Practice + solution ('+a.pr.length+')'].map((t,i)=>`<li class="nav-item"><button class="nav-link${i?'':' active'}" data-bs-toggle="tab" data-bs-target="#p${i}">${t}</button></li>`).join('')}</ul>
  <div class="tab-content card card-body"><div class="tab-pane fade show active" id="p0">${notes(a)}</div>
   <div class="tab-pane fade" id="p1">${call(a.from=='galvin'?'book':'warn',a.from=='galvin'?'📖 Examples tagged “Galvin” use the book’s data; a green badge means our simulator reproduces the value printed in the book. “Illustration” = our numbers following the book’s rules.':'⚠️ Our own example (not from Galvin).')}${ex}</div>
   <div class="tab-pane fade" id="p2">${pr}</div></div>`};

const over=()=>{const P=D.algos[1].pr[0].p,ids=['fcfs','sjf','srtf','hrrn','rr'],R=ids.map(i=>solve(i,P,{q:3})),m=Math.min(...R.map(r=>r.W)),
  q7=D.q7,PR=solve('prio',q7.procs),RR=solve('rr',q7.procs,{q:q7.q}),A={id:'x'};
  return call('book','📖 <b>Slide alignment:</b> Silberschatz, Galvin &amp; Gagne, <i>Operating System Concepts</i>, Chapter 5, “CPU Scheduling,” §5.3 Scheduling Algorithms (pp.205–217). Page numbers next to each fact refer to Galvin, Ch. 5.')+
  call('warn','⚠️ <b>Beyond Galvin:</b> HRRN (Highest Response Ratio Next) and VRR (Virtual Round Robin) are on the instructor’s list but are not covered in Galvin, Ch. 5, §5.3. Multilevel Queue (MLQ) and Multilevel Feedback Queue (MLFQ) have no numeric example in the book, so their examples are labelled <i>illustration</i>.')+
  `<div class="card card-body mb-3"><h4>🎯 Learning objectives</h4>${ul(D.objectives)}</div>
  <div class="card card-body mb-3"><h4>📘 Key definitions</h4>${legend}${defs(D.defs)}
   <h6>How to read a Gantt chart</h6>${gantt(solve('fcfs',D.algos[0].exs[0].p).g,undefined,capt('FCFS example from Galvin p.206 (P₁ = 24, P₂ = 3, P₃ = 3 ms).'))}
   ${call('def-how','<b>Blocks</b> show who has the CPU; width ∝ duration. <b>Numbers on the axis</b> are clock times where the CPU switches. Here P₂ starts at 24 and ends at 27, so CT(P₂) = 27; P₁ waited 0 ms, P₂ waited 24 ms, P₃ waited 27 ms.')}</div>
  <div class="card card-body mb-3"><h4>Part A — Basics</h4>${D.basics.map(b=>`<h6>${b.h}</h6>${ul(b.items)}`).join('')}
   <h6>Scheduling criteria</h6>${tbl(['Criterion','Meaning','Galvin'],D.criteria.map(c=>[`<b>${c[0]}</b>`,c[1],c[2]]))}<p>${D.goal}</p>
   <h6>Key formulas</h6>${D.formulas.map(f=>`\\[${f}\\]`).join('')}<p class="small text-muted">${D.formulas_note}</p>
   <h6>Recipe for every exercise</h6>${ol(D.recipe)}</div>
  <div class="card card-body mb-3"><h4>Part B — Algorithms at a glance</h4>${tbl(['Algorithm','Type','Picks next…','Source'],D.algos.map(a=>[`<b>${a.name}</b><br><small class="text-muted">${a.full}</small>`,a.mode,a.pick,a.from=='galvin'?'Galvin, Ch. 5, '+a.src:'<span class="text-warning-emphasis">'+a.src+'</span>']))}
   <h6>Same data, different algorithms</h6>${inp(P)}${tbl(['Algorithm','Avg TAT','Avg WT','Context switches'],R.map((r,k)=>[`<b>${D.algos.find(a=>a.id==ids[k]).name}</b><br><small class="text-muted">${D.algos.find(a=>a.id==ids[k]).full}</small>${ids[k]=='rr'?' (q = 3)':''}`,r.T,r.W==m?`<b class="text-success">${r.W} ★</b>`:r.W,r.g.filter(x=>x[0]!='idle').length-1]))}
   <p class="mb-0 text-muted">★ = smallest average waiting time (Galvin: SJF/SRTF are optimal for waiting time; RR trades waiting time for regular CPU access).</p></div>
  <div class="card card-body"><h4>Part C — ${q7.title}</h4>${inp(q7.procs)}
   <button class="btn btn-success btn-sm align-self-start" data-bs-toggle="collapse" data-bs-target="#q7">✔ Solution</button><div class="collapse mt-2" id="q7">
   <h6>A. Priority (non-preemptive)</h6>${gantt(PR.g,undefined,capt('Priority (non-preemptive)'))}${out(PR,A)}${avg(PR)}<h6>B. Round Robin, q = ${q7.q}</h6>${gantt(RR.g,undefined,capt('Round Robin, q = '+q7.q))}${out(RR,A)}${avg(RR)}
   <h6>C. Comparison</h6>${tbl(['','Avg TAT','Avg WT'],[['Priority',PR.T,PR.W],['Round Robin (q = '+q7.q+')',RR.T,RR.W]])}
   <p>Smaller average WT: <b>${PR.W<RR.W?'Priority':RR.W<PR.W?'Round Robin':'equal'}</b> · Smaller average TAT: <b>${PR.T<RR.T?'Priority':RR.T<PR.T?'Round Robin':'equal'}</b>.</p>
   <p class="mb-0">The charts differ because Priority runs the highest-priority arrived process to completion (no preemption), whereas Round Robin gives every ready process at most q ms in turn and sends unfinished ones to the back of the queue.</p></div>
   <div class="alert alert-warning mt-2 mb-0">💡 ${q7.hint}</div></div>`};

const paint=k=>{$('#g'+k).innerHTML=gantt(ST[k].g,ST[k].up,ST[k].cap);$('#tr'+k).innerHTML=trace(ST[k].g,ST[k].up);watch($('#g'+k))},
go=(k,d)=>{const s=ST[k];s.up=Math.max(0,Math.min(s.g.length,s.up+d));paint(k)},
check=k=>{const ok=(i,v)=>Math.abs(parseFloat($(i+k).value)-v)<.015;$('#c'+k).innerHTML=ok('#aT',CK[k].T)&&ok('#aW',CK[k].W)?'<span class="badge text-bg-success">✓ Correct!</span>':'<span class="badge text-bg-danger">✗ Not yet — try the hint</span>'},
show=i=>{document.querySelectorAll('#nav .nav-link').forEach((b,k)=>b.classList.toggle('active',k==i));
  GN=0;ST=[];CK=[];SW=[];RO&&RO.disconnect();
  $('#view').innerHTML=i?algo(D.algos[i-1]):over();ST.forEach((_,k)=>ST[k]&&paint(k));
  SW.forEach((s,k)=>{if(s){drawSwimlane($('#sw'+k),s.P,s.R,s.label);$('#swt'+k).innerHTML=swimTable(s.P,s.R,s.short)}});
  watch($('#view'));window.scrollTo&&window.scrollTo({top:0});window.MathJax&&MathJax.typesetPromise&&MathJax.typesetPromise()};

if(typeof document!='undefined'){
  if(window.ResizeObserver)RO=new ResizeObserver(es=>es.forEach(e=>fit(e.target)));else addEventListener('resize',()=>document.querySelectorAll('.gc').forEach(fit));
  if(!window.DATA)$('#view').innerHTML='<div class="alert alert-danger"><b>data.js was not found.</b> Keep <code>index.html</code>, <code>app.js</code>, <code>data.js</code> and <code>style.css</code> in the same folder.</div>';
  else{D=window.DATA;document.title=D.title;
    $('#nav').innerHTML=['Overview',...D.algos.map(a=>a.name)].map((t,i)=>`<li class="nav-item"><button class="nav-link" onclick="show(${i})" title="${i?D.algos[i-1].full:'Chapter overview'}">${t}</button></li>`).join('');show(0)}}
if(typeof module!='undefined')module.exports={solve,over,algo,verify,setD:d=>{D=d}};
