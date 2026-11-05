/* Resource-Allocation Graph (RAG) tools: analysis + force-directed drawing (D3 force simulation, light theme).
   Graph spec G = { P:['P1',..], R:[{n:'R1',w:2},..], req:[[P,R],..], asg:[[R,P],..], claim:[[P,R],..], wait:[[P,P],..] }
     req   = request edge   Pi → Rj        asg  = assignment edge  Rj → Pi
     claim = claim edge (dashed)           wait = wait-for edge    Pi → Pj  (wait-for graph only)
   Drawn with d3.forceSimulation (the JS counterpart of NetworkX's spring layout): nodes repel, edges act as springs, and you can drag any node. */
const RC={ink:'#1f2937',bad:'#dc2626'};
const KEYS=['req','asg','claim','wait'];
const edgesOf=G=>KEYS.flatMap(k=>(G[k]||[]).map(e=>({s:e[0],t:e[1],type:k})));
// delta = {req:[..],asg:[..],claim:[..], rm:{claim:[..]}} → new graph (used by the "what if…" buttons)
const applyDelta=(G,d)=>{if(!d)return G;const o={...G};KEYS.forEach(k=>{const rm=(d.rm&&d.rm[k])||[];o[k]=[...(G[k]||[]).filter(e=>!rm.some(r=>r[0]==e[0]&&r[1]==e[1])),...(d[k]||[])]});return o};
// wait-for graph: Pi → Pj when Pi requests a resource currently assigned to Pj
const wfgOf=G=>{const w=[];(G.req||[]).forEach(([p,r])=>(G.asg||[]).forEach(([r2,q])=>{if(r==r2&&p!=q&&!w.some(x=>x[0]==p&&x[1]==q))w.push([p,q])}));return{P:G.P,R:[],wait:w,pos:G.wpos}};

// analyse: strongly-connected components (cycles) + graph reduction (the detection algorithm drawn on the graph)
const analyse=(G,o={})=>{
  const E=edgesOf(G).filter(e=>e.type!='claim'||o.claim),nodes=[...G.P,...G.R.map(r=>r.n)],adj={},ix={},lo={},on={},scc={},sz=[],st=[];let c=0;
  nodes.forEach(n=>adj[n]=[]);E.forEach(e=>adj[e.s].push(e.t));
  const dfs=v=>{ix[v]=lo[v]=c++;st.push(v);on[v]=1;adj[v].forEach(w=>{if(ix[w]==null){dfs(w);lo[v]=Math.min(lo[v],lo[w])}else if(on[w])lo[v]=Math.min(lo[v],ix[w])});
    if(lo[v]==ix[v]){let n=0,w;const id=sz.length;do{w=st.pop();on[w]=0;scc[w]=id;n++}while(w!=v);sz.push(n)}};
  nodes.forEach(v=>ix[v]==null&&dfs(v));
  const bad=e=>scc[e.s]==scc[e.t]&&sz[scc[e.s]]>1,badE=E.filter(bad),hasCycle=badE.length>0,inCycle=G.P.filter(p=>sz[scc[p]]>1);
  // one explicit cycle for the caption: BFS from t back to s along cycle edges
  let path=null;if(hasCycle){const e0=badE[0],par={[e0.t]:null},q=[e0.t];
    while(q.length){const v=q.shift();if(v==e0.s)break;badE.filter(e=>e.s==v).forEach(e=>{if(!(e.t in par)){par[e.t]=v;q.push(e.t)}})}
    const chain=[];let u=e0.s;while(u!=null){chain.push(u);u=par[u]}   // s, …, t
    path=[e0.s,...chain.reverse()]}                                       // s → t → … → s
  // graph reduction (multi-instance safe): a process that can have all requests granted finishes and releases what it holds
  let dead=inCycle,order=[];
  if(!G.wait){const av={};G.R.forEach(r=>av[r.n]=(r.w||1)-(G.asg||[]).filter(e=>e[0]==r.n).length);
    const fin={};let go=true;
    while(go){go=false;for(const p of G.P){if(fin[p])continue;const need={};(G.req||[]).filter(e=>e[0]==p).forEach(e=>need[e[1]]=(need[e[1]]||0)+1);
      if(Object.keys(need).every(r=>need[r]<=av[r])){fin[p]=1;order.push(p);(G.asg||[]).filter(e=>e[1]==p).forEach(e=>av[e[0]]++);go=true}}}
    dead=G.P.filter(p=>!fin[p])}
  return{E,bad,hasCycle,inCycle,dead,order,path,single:G.R.every(r=>(r.w||1)==1),isBad:e=>badE.some(b=>b.s==e.s&&b.t==e.t&&b.type==e.type)}};

// plain-language verdict used under every graph; key is what the practice questions compare against
const ragVerdict=(G,o={})=>{const A=analyse(G,o),cyc=A.path?A.path.join(' → '):'',blocked=A.dead.filter(p=>!A.inCycle.includes(p));
  if(o.claim)return A.hasCycle?{key:'Deny (unsafe)',cls:'danger',html:`<b>Cycle found (claim edges count):</b> ${cyc}. Granting this request would leave the system in an <b>unsafe state</b> → make the process wait.`}
    :{key:'Grant the request',cls:'success',html:'<b>No cycle</b> even when claim edges are counted → the state is safe (a request that leads to this state may be granted).'};
  if(G.wait)return A.hasCycle?{key:'Deadlock',cls:'danger',html:`<b>Cycle in the wait-for graph:</b> ${cyc} → <b>DEADLOCK</b> among ${A.inCycle.join(', ')}.`}:{key:'No deadlock — no cycle',cls:'success',html:'<b>No cycle</b> in the wait-for graph → no deadlock.'};
  if(!A.hasCycle)return{key:'No deadlock — no cycle',cls:'success',html:`<b>No cycle ⇒ no deadlock.</b> Graph reduction finishes the processes in the order <b>${A.order.join(' → ')}</b>.`};
  if(A.dead.length)return{key:'Deadlock',cls:'danger',html:`<b>Cycle:</b> ${cyc}. ${A.single?'Every resource type has a single instance, so a cycle ⇒ <b>DEADLOCK</b>.':'Reduction cannot finish them: no process in the set can have its requests granted ⇒ <b>DEADLOCK</b>.'} Deadlocked: <b>${A.dead.join(', ')}</b>${blocked.length?` (${blocked.join(', ')} are blocked behind the cycle).`:'.'}`};
  return{key:'No deadlock — cycle exists',cls:'warning',html:`<b>Cycle exists</b> (${cyc}) but resources have several instances: reduction still finishes everyone in the order <b>${A.order.join(' → ')}</b> ⇒ <b>no deadlock</b> (a cycle is necessary, not sufficient).`}};


/* ---------- reduction frames: the graph-reduction algorithm as a list of one-step snapshots ---------- */
const reduceFrames=G=>{
  const av={},fin=[],fr=[],cnt=p=>{const c={};(G.req||[]).filter(e=>e[0]==p).forEach(e=>c[e[1]]=(c[e[1]]||0)+1);return c};
  G.R.forEach(r=>av[r.n]=(r.w||1)-(G.asg||[]).filter(e=>e[0]==r.n).length);
  const free=()=>G.R.map(r=>`${r.n}: ${av[r.n]}`).join(', '),
        sub=()=>({...G,P:G.P.filter(p=>!fin.includes(p)),req:(G.req||[]).filter(e=>!fin.includes(e[0])),asg:(G.asg||[]).filter(e=>!fin.includes(e[1])),claim:[]});
  fr.push({G:sub(),msg:`<b>Start.</b> Free instances = number of instances − assignment edges → ${free()}. Look for a process whose pending requests can <i>all</i> be granted.`,cls:'info'});
  for(;;){const p=G.P.find(p=>!fin.includes(p)&&Object.entries(cnt(p)).every(([r,c])=>c<=av[r]));if(!p)break;
    const c=cnt(p),held=(G.asg||[]).filter(e=>e[1]==p).map(e=>e[0]);
    const why=Object.keys(c).length?`${p} requests ${Object.entries(c).map(([r,k])=>`${k} × ${r} (free ${av[r]})`).join(', ')} — every request can be granted`:`${p} has no pending request`;
    fin.push(p);held.forEach(r=>av[r]++);
    fr.push({G:sub(),msg:`<b>${p} can finish.</b> ${why}. When it finishes it releases ${held.length?held.join(', '):'nothing'}. Delete ${p} and its edges. Free instances → ${free()}.`,cls:'success'})}
  const left=G.P.filter(p=>!fin.includes(p));
  fr.push({G:sub(),final:true,cls:left.length?'danger':'success',msg:left.length?`<b>No remaining process can finish</b> (${left.map(p=>`${p} needs ${Object.entries(cnt(p)).map(([r,k])=>k+' × '+r).join(', ')||'—'}`).join('; ')} but the free instances are ${free()}). The graph cannot be reduced ⇒ <b>DEADLOCK: ${left.join(', ')}</b>.`:`<b>Every process finished</b> in the order ${fin.join(' → ')} — the graph reduces completely ⇒ <b>no deadlock</b>.`});
  return fr};

/* ---------- drawing: textbook style (blue circles, grey rectangles with instance dots) ----------
   G.pos = {id:[fx,fy]} (0..1) gives the exact textbook layout; without pos (or with o.force) a D3 force simulation is used. */
const nameText=(sel,name,cls)=>{const m=/^([A-Za-z]+)(\d+)$/.exec(name),t=sel.append('text').attr('text-anchor','middle').attr('class',cls);
  if(m){t.append('tspan').text(m[1]);t.append('tspan').attr('class','rag-sub').attr('dy',4).text(m[2])}else t.text(name);return t};
const drawRAG=(host,G,o={})=>{
  const A=analyse(G,o),fixed=!!G.pos&&!o.force,W=o.w||620,H=o.h||(G.pos?400:330),mark=o.mark!==false,
        dead=new Set(mark?(G.wait?A.inCycle:A.dead):[]);
  const nodes=[...G.P.map(n=>({id:n,t:'P'})),...G.R.map(r=>({id:r.n,t:'R',w:r.w||1}))];
  nodes.forEach((d,i)=>{
    if(d.t=='R'){d.bw=d.w>1?58:66;d.bh=d.w>1?24*d.w+16:42;d.dots=G.nodots?[]:Array.from({length:d.w},(_,j)=>({x:0,y:d.w>1?(j-(d.w-1)/2)*24:0}))}
    if(fixed&&G.pos[d.id]){d.x=G.pos[d.id][0]*W;d.y=G.pos[d.id][1]*H}else{const a=i/nodes.length*2*Math.PI;d.x=W/2+130*Math.cos(a);d.y=H/2+95*Math.sin(a)}});
  const used={},L=edgesOf(G).map(e=>{const l={source:e.s,target:e.t,type:e.type,bad:mark&&A.isBad(e)};if(e.type=='asg'){used[e.s]=used[e.s]||0;l.di=used[e.s]++}return l});
  L.forEach(l=>l.pair=L.some(m=>m!==l&&m.source==l.target&&m.target==l.source));
  let sim=null;
  if(!fixed){sim=d3.forceSimulation(nodes).force('link',d3.forceLink(L).id(d=>d.id).distance(130).strength(.7)).force('charge',d3.forceManyBody().strength(-600))
    .force('center',d3.forceCenter(W/2,H/2)).force('collide',d3.forceCollide(48)).stop();for(let i=0;i<300;i++)sim.tick()}
  else{const by=Object.fromEntries(nodes.map(d=>[d.id,d]));L.forEach(l=>{l.source=by[l.source];l.target=by[l.target]})}
  const svg=d3.select(host).append('svg').attr('viewBox',`0 0 ${W} ${H}`).attr('class','rag-svg'),defs=svg.append('defs');
  [['k',RC.ink],['r',RC.bad]].forEach(([id,c])=>defs.append('marker').attr('id','ah'+id+host.id).attr('viewBox','0 0 10 10').attr('refX',9).attr('refY',5).attr('markerWidth',8).attr('markerHeight',8).attr('orient','auto').append('path').attr('d','M0,0L10,5L0,10z').attr('fill',c));
  const rad=(d,ux,uy)=>d.t=='P'?23:Math.min((d.bw/2)/Math.max(Math.abs(ux),1e-6),(d.bh/2)/Math.max(Math.abs(uy),1e-6))+2;
  const link=svg.append('g').selectAll('path').data(L).enter().append('path').attr('fill','none')
    .attr('stroke',d=>d.bad?RC.bad:RC.ink).attr('stroke-width',d=>d.bad?2.8:1.8).attr('stroke-dasharray',d=>d.type=='claim'?'6,5':null).attr('marker-end',d=>`url(#ah${d.bad?'r':'k'}${host.id})`);
  const node=svg.append('g').selectAll('g').data(nodes).enter().append('g').style('cursor','grab');
  node.filter(d=>d.t=='P').each(function(d){const g=d3.select(this),bad=dead.has(d.id);
    g.append('circle').attr('r',22).attr('fill',bad?'#fde2e2':'#cfe8f7').attr('stroke',bad?RC.bad:'#5b9bd5').attr('stroke-width',bad?3:1.8);nameText(g,d.id,'rag-it').attr('dy','.35em')});
  node.filter(d=>d.t=='R').each(function(d){const g=d3.select(this),top=!fixed||d.y<H*.5;
    g.append('rect').attr('x',-d.bw/2).attr('y',-d.bh/2).attr('width',d.bw).attr('height',d.bh).attr('fill','#d1d5db').attr('stroke',RC.ink).attr('stroke-width',1.6);
    d.dots.forEach(p=>g.append('circle').attr('r',4.5).attr('cx',p.x).attr('cy',p.y).attr('fill',RC.ink));
    const lb=(G.lab&&G.lab[d.id])||(top?'t':'b'),tx=nameText(g,d.id,'rag-it');
    if(lb=='r')tx.attr('text-anchor','start').attr('x',d.bw/2+8).attr('y',5);else tx.attr('y',lb=='t'?-d.bh/2-8:d.bh/2+19);
    if(G.tag&&G.tag[d.id])g.append('text').attr('text-anchor','middle').attr('class','rag-tag').attr('y',(G.lab&&G.lab[d.id]=='r')?22:(top?-d.bh/2-24:d.bh/2+34)).attr('x',(G.lab&&G.lab[d.id]=='r')?d.bw/2+8:0).attr('text-anchor',(G.lab&&G.lab[d.id]=='r')?'start':'middle').text(G.tag[d.id])});
  const place=()=>{nodes.forEach(d=>{d.x=Math.max(46,Math.min(W-46,d.x));d.y=Math.max(40,Math.min(H-40,d.y))});
    link.attr('d',d=>{const a=d.source,b=d.target,S0=(d.type=='asg'&&a.dots&&a.dots.length)?[a.x+a.dots[d.di%a.w].x,a.y+a.dots[d.di%a.w].y]:null,sx=S0?S0[0]:a.x,sy=S0?S0[1]:a.y,
      dx=b.x-sx,dy=b.y-sy,l=Math.hypot(dx,dy)||1,k=d.pair?30:0,cx=(sx+b.x)/2-dy/l*k,cy=(sy+b.y)/2+dx/l*k;
      let p0=S0;if(!p0){const u=[cx-a.x,cy-a.y],n=Math.hypot(...u)||1,r=rad(a,u[0]/n,u[1]/n);p0=[a.x+u[0]/n*r,a.y+u[1]/n*r]}
      const u2=[cx-b.x,cy-b.y],n2=Math.hypot(...u2)||1,r2=rad(b,u2[0]/n2,u2[1]/n2)+2,p1=[b.x+u2[0]/n2*r2,b.y+u2[1]/n2*r2];
      return d.pair?`M${p0}Q${cx},${cy} ${p1}`:`M${p0}L${p1}`});
    node.attr('transform',d=>`translate(${d.x},${d.y})`)};
  place();if(sim)sim.on('tick',place);
  node.call(d3.drag().on('start',(e,d)=>{if(sim&&!e.active)sim.alphaTarget(.3).restart();d.fx=d.x;d.fy=d.y}).on('drag',(e,d)=>{d.fx=e.x;d.fy=e.y;d.x=e.x;d.y=e.y;if(!sim)place()}).on('end',(e,d)=>{if(sim&&!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null}));
  return svg.node()};
const ragLegend=G=>`<div class="rag-leg small"><span><svg width="24" height="22"><circle cx="12" cy="11" r="9" fill="#cfe8f7" stroke="#5b9bd5" stroke-width="1.8"/></svg> process</span>${G.R.length?`<span><svg width="30" height="22"><rect x="2" y="3" width="26" height="16" fill="#d1d5db" stroke="#1f2937" stroke-width="1.6"/><circle cx="15" cy="11" r="3.5" fill="#1f2937"/></svg> resource type (● = one instance)</span>`:''}
  ${G.wait?'<span>→ Pᵢ waits for Pⱼ</span>':'<span>Pᵢ → Rⱼ <b>request</b> (arrow enters the rectangle)</span><span>Rⱼ → Pᵢ <b>assignment</b> (arrow leaves an instance ●)</span>'}${(G.claim||[]).length?'<span>┄► <b>claim</b> edge (dashed)</span>':''}<span class="lg-bad">━▶ red = cycle</span><span class="text-muted">· drag nodes to rearrange</span></div>`;

/* ---------- wait-for graph built one edge at a time: frames show the RAG (a) and the wait-for graph (b) growing ---------- */
const wfgFrames=G=>{const w=[],fr=[],mk=()=>({P:G.P,R:[],wait:w.map(x=>[...x]),pos:G.wpos});
  fr.push({G,G2:mk(),msg:'<b>Start.</b> Left: the resource-allocation graph (a). Right: an empty wait-for graph (b) — its nodes are only the processes. <b>Rule:</b> P<sub>i</sub> → P<sub>j</sub> if P<sub>i</sub> is waiting for P<sub>j</sub>, i.e. P<sub>i</sub> requests a resource that P<sub>j</sub> currently holds. Go through the request edges one by one.',cls:'info'});
  (G.req||[]).forEach(([p,r])=>{const hs=(G.asg||[]).filter(e=>e[0]==r).map(e=>e[1]),nw=hs.filter(q=>q!=p&&!w.some(x=>x[0]==p&&x[1]==q));nw.forEach(q=>w.push([p,q]));
    fr.push({G,G2:mk(),msg:`Request edge <b>${p} → ${r}</b>; ${r} is held by ${hs.length?hs.join(', '):'nobody'}. ${hs.length?`So ${p} waits for ${hs.join(', ')} ⇒ add wait-for edge <b>${nw.map(q=>p+' → '+q).join(', ')||'(already present)'}</b>.`:`${r} is free ⇒ no wait-for edge.`}`,cls:'success'})});
  const v=ragVerdict(mk()),n=G.P.length+G.R.length;
  fr.push({G,G2:mk(),final:true,cls:v.cls,msg:`<b>Search for a cycle</b> in the wait-for graph (nodes = processes): ${v.html}<br><span class="small">A cycle-detection algorithm needs an order of <b>n²</b> operations, where n is the number of vertices in the graph (here ${G.P.length} in the wait-for graph; ${n} in the RAG).</span>`});
  return fr};
if(typeof module!='undefined')module.exports={wfgFrames,analyse,ragVerdict,wfgOf,applyDelta,edgesOf,drawRAG,reduceFrames};
