/* Resource-Allocation Graph (RAG) tools: analysis + force-directed drawing (D3 force simulation, light theme).
   Graph spec G = { P:['P1',..], R:[{n:'R1',w:2},..], req:[[P,R],..], asg:[[R,P],..], claim:[[P,R],..], wait:[[P,P],..] }
     req   = request edge   Pi → Rj        asg  = assignment edge  Rj → Pi
     claim = claim edge (dashed)           wait = wait-for edge    Pi → Pj  (wait-for graph only)
   Drawn with d3.forceSimulation (the JS counterpart of NetworkX's spring layout): nodes repel, edges act as springs, and you can drag any node. */
const RC={req:'#2563eb',asg:'#16a34a',claim:'#64748b',wait:'#7c3aed',bad:'#dc2626'};
const KEYS=['req','asg','claim','wait'];
const edgesOf=G=>KEYS.flatMap(k=>(G[k]||[]).map(e=>({s:e[0],t:e[1],type:k})));
// delta = {req:[..],asg:[..],claim:[..], rm:{claim:[..]}} → new graph (used by the "what if…" buttons)
const applyDelta=(G,d)=>{if(!d)return G;const o={...G};KEYS.forEach(k=>{const rm=(d.rm&&d.rm[k])||[];o[k]=[...(G[k]||[]).filter(e=>!rm.some(r=>r[0]==e[0]&&r[1]==e[1])),...(d[k]||[])]});return o};
// wait-for graph: Pi → Pj when Pi requests a resource currently assigned to Pj
const wfgOf=G=>{const w=[];(G.req||[]).forEach(([p,r])=>(G.asg||[]).forEach(([r2,q])=>{if(r==r2&&p!=q&&!w.some(x=>x[0]==p&&x[1]==q))w.push([p,q])}));return{P:G.P,R:[],wait:w}};

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
    :{key:'Grant the request',cls:'success',html:'<b>No cycle</b> even when claim edges are counted → the request can be granted; the state stays safe.'};
  if(G.wait)return A.hasCycle?{key:'Deadlock',cls:'danger',html:`<b>Cycle in the wait-for graph:</b> ${cyc} → <b>DEADLOCK</b> among ${A.inCycle.join(', ')}.`}:{key:'No deadlock — no cycle',cls:'success',html:'<b>No cycle</b> in the wait-for graph → no deadlock.'};
  if(!A.hasCycle)return{key:'No deadlock — no cycle',cls:'success',html:`<b>No cycle ⇒ no deadlock.</b> Graph reduction finishes the processes in the order <b>${A.order.join(' → ')}</b>.`};
  if(A.dead.length)return{key:'Deadlock',cls:'danger',html:`<b>Cycle:</b> ${cyc}. ${A.single?'Every resource type has a single instance, so a cycle ⇒ <b>DEADLOCK</b>.':'Reduction cannot finish them: no process in the set can have its requests granted ⇒ <b>DEADLOCK</b>.'} Deadlocked: <b>${A.dead.join(', ')}</b>${blocked.length?` (${blocked.join(', ')} are blocked behind the cycle).`:'.'}`};
  return{key:'No deadlock — cycle exists',cls:'warning',html:`<b>Cycle exists</b> (${cyc}) but resources have several instances: reduction still finishes everyone in the order <b>${A.order.join(' → ')}</b> ⇒ <b>no deadlock</b> (a cycle is necessary, not sufficient).`}};

const drawRAG=(host,G,o={})=>{
  const A=analyse(G,o),W=o.w||720,H=o.h||330,dead=new Set(G.wait?A.inCycle:A.dead);
  const nodes=[...G.P.map(n=>({id:n,t:'P'})),...G.R.map(r=>({id:r.n,t:'R',w:r.w||1}))];
  nodes.forEach((d,i)=>{const a=i/nodes.length*2*Math.PI;d.x=W/2+120*Math.cos(a);d.y=H/2+90*Math.sin(a);
    if(d.t=='R'){d.bw=Math.max(60,d.w*18+16);d.bh=44;d.held=(G.asg||[]).filter(e=>e[0]==d.id).length}});
  
  const L=edgesOf(G).map(e=>({source:e.s,target:e.t,type:e.type,bad:A.isBad(e)}));
  L.forEach(l=>l.pair=L.some(m=>m!==l&&m.source==l.target&&m.target==l.source));
  const sim=d3.forceSimulation(nodes).force('link',d3.forceLink(L).id(d=>d.id).distance(125).strength(.7))
    .force('charge',d3.forceManyBody().strength(-560)).force('center',d3.forceCenter(W/2,H/2)).force('collide',d3.forceCollide(46)).stop();
  for(let i=0;i<300;i++)sim.tick();
  const svg=d3.select(host).append('svg').attr('viewBox',`0 0 ${W} ${H}`).attr('class','rag-svg');
  const defs=svg.append('defs');
  Object.entries({...RC}).forEach(([k,c])=>defs.append('marker').attr('id','ah-'+k+host.id).attr('viewBox','0 0 10 10').attr('refX',9).attr('refY',5).attr('markerWidth',8).attr('markerHeight',8).attr('orient','auto-start-reverse').append('path').attr('d','M0,0L10,5L0,10z').attr('fill',c));
  const rad=(d,ux,uy)=>d.t=='P'?24:Math.min((d.bw/2)/Math.max(Math.abs(ux),1e-6),(d.bh/2)/Math.max(Math.abs(uy),1e-6))+3;
  const link=svg.append('g').selectAll('path').data(L).enter().append('path').attr('fill','none')
    .attr('stroke',d=>d.bad?RC.bad:RC[d.type]).attr('stroke-width',d=>d.bad?2.8:2).attr('stroke-dasharray',d=>d.type=='claim'?'6,5':null)
    .attr('marker-end',d=>`url(#ah-${d.bad?'bad':d.type}${host.id})`);
  const node=svg.append('g').selectAll('g').data(nodes).enter().append('g').style('cursor','grab');
  node.filter(d=>d.t=='P').each(function(d){const g=d3.select(this),bad=dead.has(d.id);
    g.append('circle').attr('r',22).attr('fill',bad?'#fef2f2':'#fff').attr('stroke',bad?RC.bad:'#172033').attr('stroke-width',bad?3:2);
    g.append('text').attr('text-anchor','middle').attr('dy','.35em').attr('class','rag-lbl').text(d.id)});
  node.filter(d=>d.t=='R').each(function(d){const g=d3.select(this);
    g.append('rect').attr('x',-d.bw/2).attr('y',-d.bh/2).attr('width',d.bw).attr('height',d.bh).attr('rx',6).attr('fill','#fffbeb').attr('stroke','#b45309').attr('stroke-width',2);
    g.append('text').attr('text-anchor','middle').attr('y',-5).attr('class','rag-lbl').text(d.id);
    for(let i=0;i<d.w;i++)g.append('circle').attr('r',5).attr('cx',(i-(d.w-1)/2)*16).attr('cy',11).attr('fill',i<d.held?'#b45309':'#fff').attr('stroke','#b45309').attr('stroke-width',1.4)});
  const place=()=>{nodes.forEach(d=>{d.x=Math.max(50,Math.min(W-50,d.x));d.y=Math.max(34,Math.min(H-34,d.y))});
    link.attr('d',d=>{const a=d.source,b=d.target,mx=(a.x+b.x)/2,my=(a.y+b.y)/2,dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1,k=d.pair?30:0,cx=mx-dy/l*k,cy=my+dx/l*k;
      const u1=[cx-a.x,cy-a.y],n1=Math.hypot(...u1)||1,u2=[cx-b.x,cy-b.y],n2=Math.hypot(...u2)||1,r1=rad(a,u1[0]/n1,u1[1]/n1),r2=rad(b,u2[0]/n2,u2[1]/n2);
      return`M${a.x+u1[0]/n1*r1},${a.y+u1[1]/n1*r1}Q${cx},${cy} ${b.x+u2[0]/n2*(r2+2)},${b.y+u2[1]/n2*(r2+2)}`});
    node.attr('transform',d=>`translate(${d.x},${d.y})`)};
  place();sim.on('tick',place);
  node.call(d3.drag().on('start',(e,d)=>{if(!e.active)sim.alphaTarget(.3).restart();d.fx=d.x;d.fy=d.y}).on('drag',(e,d)=>{d.fx=e.x;d.fy=e.y}).on('end',(e,d)=>{if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null}));
  return svg.node()};
const ragLegend=G=>`<div class="rag-leg small"><span><svg width="22" height="22"><circle cx="11" cy="11" r="9" fill="#fff" stroke="#172033" stroke-width="2"/></svg> process</span>${G.R.length?`<span><svg width="30" height="22"><rect x="2" y="3" width="26" height="16" rx="3" fill="#fffbeb" stroke="#b45309" stroke-width="2"/></svg> resource type (● = held instance, ○ = free)</span>`:''}
  ${G.wait?`<span class="lg-wait">━▶ waits for</span>`:`<span class="lg-req">━▶ request  Pᵢ → Rⱼ</span><span class="lg-asg">━▶ assignment  Rⱼ → Pᵢ</span>`}${(G.claim||[]).length?'<span class="lg-claim">╌▶ claim edge</span>':''}<span class="lg-bad">━▶ edge on a cycle</span><span class="text-muted">· drag nodes to rearrange</span></div>`;
if(typeof module!='undefined')module.exports={analyse,ragVerdict,wfgOf,applyDelta,edgesOf,drawRAG};
