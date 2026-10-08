/* Classic textbook-style process-scheduling diagram:
     (1) an "Arrival times" cascade — each process's own [AT, AT+BT] window, stacked in arrival order,
         showing the demand on the CPU as if every process could run the moment it arrived;
     (2) a per-process swimlane of the schedule the algorithm actually produced (one row per process,
         possibly several bars per row for a preemptive algorithm);
     (3) a Finish Time / Turnaround Time (Tr) / Tr⁄Ts summary table, exactly as in Stallings'
         "Operating Systems: Internals and Design Principles".
   Built on D3.js (https://d3js.org — BSD-3-Clause, https://github.com/d3/d3), loaded from jsDelivr
   alongside Bootstrap and MathJax. Reuses the process colours already defined in app.js (col()) so the
   rows line up visually with the rest of the page's Gantt charts.
*/
const drawSwimlane=(host,P,R,label)=>{
  const order=[...P].sort((a,b)=>a.at-b.at||P.indexOf(a)-P.indexOf(b));
  const rows=order.length,
        segOf=n=>R.g.filter(x=>x[0]==n),
        Tmax=Math.max(...order.map(p=>p.at+p.bt),...R.g.map(x=>x[2]));

  const leftW=182,rightPad=28,topPad=22,rh=25,rgap=9,secGap=30,rulerH=14,axisH=26,
        rowBlock=rows*rh+(rows-1)*rgap,
        W=900,chartW=W-leftW-rightPad,
        arrivalY=topPad,
        schedTitleY=arrivalY+rowBlock+secGap-14,
        rulerY=schedTitleY+10,
        schedY=rulerY+rulerH+6,
        axisY=schedY+rowBlock+10,
        H=axisY+axisH+10;

  const x=d3.scaleLinear().domain([0,Tmax]).range([0,chartW]);
  const svg=d3.select(host).append('svg').attr('viewBox',`0 0 ${W} ${H}`).attr('class','swim-svg');
  const g=svg.append('g').attr('transform',`translate(${leftW},0)`);

  // dashed red "t = 0" reference line spanning both sections (as in the printed figure)
  g.append('line').attr('x1',x(0)).attr('x2',x(0)).attr('y1',arrivalY-4).attr('y2',schedY+rowBlock+4)
    .attr('stroke','#9f1239').attr('stroke-width',1.3).attr('stroke-dasharray','2,3');

  // section captions sit in their own far-left column so they never collide with the row labels
  // (P₁, P₂, …) that hug the bars in a narrower column right next to the chart.
  const capX=8;
  svg.append('text').attr('x',capX).attr('y',arrivalY+rowBlock/2).attr('text-anchor','start')
    .attr('class','swim-cap').text('Arrival times');
  const capLabel=svg.append('text').attr('x',capX).attr('y',schedY+rowBlock/2).attr('text-anchor','start')
    .attr('class','swim-cap');
  const words=label.split(' '); let line='',lines=[];
  words.forEach(w=>{const t=line?line+' '+w:w; if(t.length>16){lines.push(line);line=w} else line=t}); lines.push(line);
  const dy0=-(lines.length-1)*6.5;
  lines.forEach((ln,i)=>capLabel.append('tspan').attr('x',capX).attr('dy',i?13:dy0).text(ln));

  // (1) arrival cascade — each process's own [AT, AT+BT] window, own colour, own row
  order.forEach((p,i)=>{
    const y=arrivalY+i*(rh+rgap);
    g.append('rect').attr('x',x(p.at)).attr('y',y).attr('width',Math.max(1,x(p.at+p.bt)-x(p.at))).attr('height',rh)
      .attr('fill',col(p.n)).attr('fill-opacity',.22).attr('stroke',col(p.n)).attr('stroke-width',1.4).attr('rx',2);
    g.append('text').attr('x',x(p.at)+(x(p.at+p.bt)-x(p.at))/2).attr('y',y+rh/2+4).attr('text-anchor','middle')
      .attr('class','swim-lbl').attr('fill',col(p.n)).text(p.n);
  });

  // small ruler ticks just above the schedule section
  const ticks=x.ticks(Math.min(20,Tmax));
  g.selectAll('.swim-tick').data(ticks).enter().append('line').attr('class','swim-tick')
    .attr('x1',d=>x(d)).attr('x2',d=>x(d)).attr('y1',rulerY).attr('y2',rulerY+rulerH)
    .attr('stroke','#64748b').attr('stroke-width',1);

  // (2) schedule swimlane — one row per process, dotted vertical gridlines behind it
  g.selectAll('.swim-grid').data(ticks).enter().append('line').attr('class','swim-grid')
    .attr('x1',d=>x(d)).attr('x2',d=>x(d)).attr('y1',schedY-2).attr('y2',schedY+rowBlock+2)
    .attr('stroke','#cbd5e1').attr('stroke-width',1).attr('stroke-dasharray','1,3');
  order.forEach((p,i)=>{
    const y=schedY+i*(rh+rgap);
    svg.append('text').attr('x',leftW-10).attr('y',y+rh/2+4).attr('text-anchor','end').attr('class','swim-row-lbl').text(p.n);
    segOf(p.n).forEach(seg=>{
      g.append('rect').attr('x',x(seg[1])).attr('y',y).attr('width',Math.max(1,x(seg[2])-x(seg[1]))).attr('height',rh)
        .attr('fill',col(p.n)).attr('stroke','#1f2937').attr('stroke-width',1).attr('rx',2);
    });
  });

  // bottom time axis
  svg.append('g').attr('transform',`translate(${leftW},${axisY})`)
    .call(d3.axisBottom(x).tickValues(ticks).tickSizeOuter(0))
    .call(a=>a.select('.domain').attr('stroke','#1f2937'))
    .selectAll('text').attr('class','swim-axis');
  svg.append('text').attr('x',leftW+chartW).attr('y',axisY+axisH).attr('text-anchor','end').attr('class','swim-unit').text('time (ms) →');

  return svg.node();
};

/* Finish Time / Turnaround Time (Tr) / Tr⁄Ts summary table, transposed exactly as in the printed figure:
   one column per process, metrics down the rows, a trailing "Mean" column. */
const swimTable=(P,R,shortName)=>{
  const order=[...P].sort((a,b)=>a.at-b.at||P.indexOf(a)-P.indexOf(b)),
        row=p=>R.r.find(x=>x.p===p),
        ratio=x=>fmt(x.tat/x.p.bt),
        avgR=R.r.reduce((s,x)=>s+x.tat/x.p.bt,0)/R.r.length;
  const cell=(p,v)=>`<td><b style="color:${col(p.n)}">${p.n}</b><br>${v}</td>`;
  return `<div class="table-responsive"><table class="table table-bordered table-sm text-center align-middle swim-table">
  <tr><th rowspan="3" class="swim-algo">${shortName}</th><th>Finish Time</th>${order.map(p=>cell(p,row(p).ct)).join('')}<th class="text-danger">Mean</th></tr>
  <tr><th>Turnaround Time (T<sub>r</sub>)</th>${order.map(p=>`<td>${row(p).tat}</td>`).join('')}<td class="text-danger fw-bold">${fmt(R.r.reduce((s,x)=>s+x.tat,0)/R.r.length)}</td></tr>
  <tr><th>T<sub>r</sub> / T<sub>s</sub></th>${order.map(p=>`<td>${ratio(row(p))}</td>`).join('')}<td class="text-danger fw-bold">${fmt(avgR)}</td></tr>
  </table></div>`;
};
if(typeof module!='undefined')module.exports={drawSwimlane,swimTable};
