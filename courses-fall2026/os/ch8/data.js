/* All teaching content for Chapter 8 (Deadlocks). Loaded with a <script> tag, so it works from file:// as well as GitHub Pages.
   Sources: Silberschatz, Galvin & Gagne, Operating System Concepts (10th ed.) Ch. 8, and the "Deadlocks – Ch. 8" lecture slides (slide numbers 8.x). */
const DATA={
 title:'Operating System · Deadlocks — Lecture Notes',
 objectives:[
  'Illustrate how deadlock can occur when mutex locks and semaphores are used (Galvin §8.2, slide 8.8).',
  'State the four necessary (Coffman) conditions and say which one each prevention technique removes.',
  'Read a resource-allocation graph (RAG): decide deadlock / no deadlock, find the cycle, and convert it to a wait-for graph.',
  'Evaluate the four prevention approaches (mutual exclusion, hold-and-wait, no preemption, circular wait).',
  'Apply the safety algorithm, the resource-request algorithm and the Banker’s algorithm step by step.',
  'Apply the multiple-instance deadlock-detection algorithm and compare recovery strategies (abort, preempt, rollback).'],
 defs:[
  {k:'concept',t:'Deadlock',d:'A set of blocked processes, each holding a resource and waiting for a resource held by another process in the set — permanently.',s:'Slide 8.4'},
  {k:'concept',t:'Resource type Rᵢ / instance',d:'Resource types R₁…Rₘ (CPU cycles, memory, I/O devices, locks). Type Rᵢ has Wᵢ identical instances.',s:'§8.1 · slide 8.7'},
  {k:'concept',t:'Request → use → release',d:'The only legal life-cycle of a resource. If a request cannot be granted at once, the process waits.',s:'§8.1'},
  {k:'problem',t:'Unsafe state',d:'No safe sequence exists. Deadlock is possible (not certain) — thread behaviour decides.',s:'§8.6.1'},
  {k:'fix',t:'Safe state',d:'There is an order ⟨P₁…Pₙ⟩ in which every process can still finish: Pᵢ’s needs ≤ Available + resources held by all Pⱼ, j < i.',s:'Slide 8.22'},
  {k:'metric',t:'Need = Max − Allocation',d:'What a process may still request. Banker’s algorithm compares Need with Work.',s:'Slide 8.31'},
  {k:'problem',t:'Livelock',d:'Threads are not blocked — they keep retrying a failing action and make no progress (hallway dance).',s:'§8.2'},
  {k:'concept',t:'Starvation',d:'A process waits indefinitely although the system is not deadlocked (e.g. always chosen as the victim).',s:'Slide 8.49'}],
 coffman:[
  {k:'concept',t:'1 · Mutual exclusion',d:'Only one process at a time can use the resource.',s:'Break it: share the resource (read-only files) — usually impossible for locks, printers.'},
  {k:'concept',t:'2 · Hold and wait',d:'A process holding ≥ 1 resource waits for more held by others.',s:'Break it: request everything at once, or release all before asking.'},
  {k:'concept',t:'3 · No preemption',d:'A resource is released only voluntarily by its holder.',s:'Break it: if a request must wait, implicitly release what is held.'},
  {k:'concept',t:'4 · Circular wait',d:'{P₀…Pₙ}: P₀ waits for P₁, …, Pₙ waits for P₀.',s:'Break it: total ordering of resource types (most practical).'}],
 basics:[
  {h:'What is deadlock?',items:[
   'Permanent blocking of a set of processes that either compete for system resources or communicate with each other (slide 8.4).',
   'There is no efficient general solution; most operating systems (UNIX, Windows) do not prevent or deal with deadlocks — the “ostrich” approach (slide 8.16).',
   'Three necessary conditions are <b>not sufficient</b>; the fourth (circular wait) is what makes deadlock actually happen (slides 8.9–8.10).']},
  {h:'Basic facts about graphs (slide 8.15)',items:[
   'No cycle in the RAG ⇒ <b>no deadlock</b>.',
   'Cycle and <b>one instance</b> per resource type ⇒ <b>deadlock</b>.',
   'Cycle and <b>several instances</b> per type ⇒ deadlock <b>possible</b> (use graph reduction / Banker-style check).']}],
 methods:[
  ['🙈 Ostrich','Ignore it, reboot if needed','Nothing','Cheapest; used by most OSes when deadlocks are rare','§8.4 · slide 8.16'],
  ['🛡 Prevention','Make ≥ 1 Coffman condition impossible','Design-time rules','Low utilisation, possible starvation','§8.5 · slides 8.17–8.21'],
  ['🏦 Avoidance','Grant a request only if the state stays safe','Max demand of each process, in advance','Conservative; O(m·n²) per request','§8.6 · slides 8.22–8.35'],
  ['🔍 Detect & recover','Let it happen, find it, break it','Allocation + Request matrices','Detection overhead + lost work','§8.7–8.8 · slides 8.38–8.49']],
 formulas:['\\text{Need}[i,j]=\\text{Max}[i,j]-\\text{Allocation}[i,j]','\\text{Available}=\\text{Total}-\\sum_i \\text{Allocation}_i','\\text{Work}\\leftarrow\\text{Work}+\\text{Allocation}_i\\quad(\\text{after }P_i\\text{ finishes})','\\text{Banker’s / detection cost}=O(m\\times n^{2})\\qquad\\text{wait-for-graph cycle search}=O(n^{2})'],
 recipe:[
  'Write down the resource types, their instances and who holds / requests what.',
  'Draw the RAG (or fill the Allocation / Max / Request matrices).',
  'Single instance per type → look for a cycle. Several instances → run the reduction / safety / detection algorithm.',
  'Write the safe sequence or the set of deadlocked processes, showing Work after every step.',
  'State which method (prevention, avoidance, detection) applies and why.'],
 tasks:['Decide: deadlock / no deadlock (or safe / unsafe).','Show the sequence or the cycle that justifies your answer.'],
 topics:[
 /* ============================ 1. MODEL & CHARACTERISATION ============================ */
 {id:'model',name:'System Model',full:'System Model & Deadlock Characterization',mode:'§8.1–8.3',from:'galvin',src:'§8.1–8.3 · slides 8.4–8.10',
  defs:'coffman',
  rule:'Deadlock needs <b>all four</b> Coffman conditions at once; remove any one and it cannot occur.',
  steps:['List the resources (and instances) and the order in which each thread requests them.','Interleave the threads: which request is the first one that cannot be granted?','Check the four conditions against the situation.','Draw the RAG — a cycle through blocked threads is the circular wait.'],
  notes:[
   {h:'Resource life-cycle',items:['<b>Request</b> — if it cannot be granted immediately the thread waits (<code>wait()</code>, <code>acquire()</code>, <code>pthread_mutex_lock()</code>).','<b>Use</b> — operate on the resource (critical section, file, device).','<b>Release</b> — <code>signal()</code>, <code>release()</code>, <code>unlock()</code>.']},
   {h:'Why locks are the usual culprit',items:['The <b>order</b> in which locks are acquired decides whether deadlock is possible (§8.2).','Livelock is the cousin: <code>trylock()</code> + back-off loops that never succeed. A common fix is random back-off (like Ethernet collision handling).']},
   {h:'Necessary vs sufficient',items:['Conditions 1–3 are necessary but not sufficient.','Circular wait implies hold-and-wait, so the conditions are not fully independent.'],
    table:{cap:'Coffman conditions at a glance',h:['Condition','Meaning','Typical example'],r:[['Mutual exclusion','Non-sharable resource','Mutex, printer'],['Hold and wait','Holds one, waits for another','T1 holds first_mutex, waits for second_mutex'],['No preemption','Only the holder may release','Printer mid-job'],['Circular wait','P₀→P₁→…→Pₙ→P₀','Disk/Printer example below']]}}],
  exs:[
   {k:'code',t:'Disk and Printer (slide 8.5)',s:'Galvin-style classic',n:'P0 and P1 both need the Disk and the Printer but request them in opposite order.',
    code:[['P0','Request(Disk)\n…use disk…\nRequest(Printer)   // blocks: P1 holds Printer\nRelease(Disk)\nRelease(Printer)'],['P1','Request(Printer)\n…use printer…\nRequest(Disk)      // blocks: P0 holds Disk\nRelease(Printer)\nRelease(Disk)']],
    tl:[['1','P0','Request(Disk)','granted — P0 holds Disk'],['2','P1','Request(Printer)','granted — P1 holds Printer'],['3','P0','Request(Printer)','<b>blocked</b> — held by P1'],['4','P1','Request(Disk)','<b>blocked</b> — held by P0 ⇒ circular wait']],
    G:{P:['P0','P1'],R:[{n:'Disk'},{n:'Printer'}],asg:[['Disk','P0'],['Printer','P1']],req:[['P0','Printer'],['P1','Disk']]}},
   {k:'code',t:'Deadlock with semaphores (slide 8.8)',s:'S₁ = S₂ = 1',n:'Both semaphores are initialised to 1 (a mutex). The two processes wait on them in opposite order.',
    code:[['P1','wait(S1)\nwait(S2)'],['P2','wait(S2)\nwait(S1)']],
    tl:[['1','P1','wait(S1)','S1 = 0 (P1 holds it)'],['2','P2','wait(S2)','S2 = 0 (P2 holds it)'],['3','P1','wait(S2)','<b>blocked</b>'],['4','P2','wait(S1)','<b>blocked</b> ⇒ deadlock']],
    G:{P:['P1','P2'],R:[{n:'S1'},{n:'S2'}],asg:[['S1','P1'],['S2','P2']],req:[['P1','S2'],['P2','S1']]}},
   {k:'code',t:'Pthread mutexes (§8.2)',s:'Galvin',n:'Thread One locks first→second, Thread Two locks second→first. Whether it deadlocks depends on the scheduler — the bug may hide for months.',
    code:[['Thread One','pthread_mutex_lock(&first_mutex);\npthread_mutex_lock(&second_mutex);\n/* do some work */\npthread_mutex_unlock(&second_mutex);\npthread_mutex_unlock(&first_mutex);'],['Thread Two','pthread_mutex_lock(&second_mutex);\npthread_mutex_lock(&first_mutex);\n/* do some work */\npthread_mutex_unlock(&first_mutex);\npthread_mutex_unlock(&second_mutex);']],
    tl:[['1','One','lock(first)','granted'],['2','Two','lock(second)','granted'],['3','One','lock(second)','<b>blocked</b>'],['4','Two','lock(first)','<b>blocked</b> ⇒ deadlock']],
    G:{P:['One','Two'],R:[{n:'first'},{n:'second'}],asg:[['first','One'],['second','Two']],req:[['One','second'],['Two','first']]}},
   {k:'code',t:'Livelock with trylock (§8.2)',s:'not a deadlock',n:'Nothing is blocked, yet nothing progresses: each thread keeps releasing and retrying in lock-step.',
    code:[['Thread','while (!done) {\n  lock(first_mutex);\n  if (!trylock(second_mutex)) {\n    unlock(first_mutex);   // retry — forever?\n  }\n}']],tl:null,G:null}],
  pr:[
   {k:'text',t:'Everyday deadlocks',q:'Give three examples of deadlock that are not related to computers.',h:'Think of one-way resources that two parties approach from opposite ends.',
    sol:'Two cars meeting on a single-lane bridge; one person climbing a ladder while another climbs down; two trains approaching on the same track (the old Kansas rule: both stop and neither restarts until the other has gone).'},
   {k:'text',t:'Which condition?',q:'A system makes every thread request all the locks it will ever need before it runs. Which Coffman condition is removed, and what is the price?',h:'Look at what a thread does while it waits.',
    sol:'<b>Hold and wait</b> is removed (a thread never holds some resources while waiting for others). Price: low resource utilisation (locks held long before they are used) and possible starvation of processes that need several popular resources.'}]},
 /* ============================ 2. RESOURCE-ALLOCATION GRAPH ============================ */
 {id:'rag',name:'RAG',full:'Resource-Allocation Graph',mode:'§8.3.2',from:'galvin',src:'§8.3.2 · slides 8.11–8.15',
  rule:'No cycle ⇒ no deadlock. Cycle + single instances ⇒ deadlock. Cycle + multiple instances ⇒ maybe — reduce the graph to find out.',
  steps:['Draw one circle per process and one rectangle per resource type, with one dot per instance.','Request edge Pᵢ → Rⱼ for each pending request; assignment edge Rⱼ → Pᵢ for each held instance.','Look for a cycle. None → stop: no deadlock.','If a cycle exists and every type has one instance → deadlock.','Otherwise <b>reduce</b>: pick a process whose requests can all be granted, let it finish, delete its edges, free its resources; repeat. Anything left is deadlocked.'],
  notes:[
   {h:'Definition (slide 8.11)',items:['A directed graph G = (V, E). V = P ∪ R, where P = {P₁…Pₙ} are the processes and R = {R₁…Rₘ} the resource types.','<b>Request edge</b> Pᵢ → Rⱼ: Pᵢ is waiting for an instance of Rⱼ.','<b>Assignment edge</b> Rⱼ → Pᵢ: an instance of Rⱼ is held by Pᵢ.']},
   {h:'Wait-for graph (single instance only)',items:['Remove the resource nodes and collapse: Pᵢ → Pⱼ if Pᵢ waits for a resource held by Pⱼ.','Deadlock ⇔ cycle in the wait-for graph; cycle search costs O(n²) (slide 8.38).']}],
  exs:[
   {k:'rag',t:'RAG with multiple instances (slide 8.12)',s:'no deadlock',n:'R₁: 1 instance, R₂: 2, R₃: 1, R₄: 3. T₁ holds one R₂ and waits for R₁; T₂ holds R₁ and R₂ and waits for R₃; T₃ holds R₃. There is no cycle, so no deadlock: T₃ finishes, then T₂, then T₁.',
    G:{P:['T1','T2','T3'],R:[{n:'R1'},{n:'R2',w:2},{n:'R3'},{n:'R4',w:3}],asg:[['R2','T1'],['R1','T2'],['R2','T2'],['R3','T3']],req:[['T1','R1'],['T2','R3']]},
    then:{label:'➕ T3 requests R₂',d:{req:[['T3','R2']]}}},
   {k:'rag',t:'Cycle but no deadlock (Galvin Fig. 8.x)',s:'several instances',n:'Cycle T₁ → R₁ → T₃ → R₂ → T₁ exists, but T₂ (holding R₁) and T₄ (holding R₂) need nothing more. When they finish, the cycle breaks.',
    G:{P:['T1','T2','T3','T4'],R:[{n:'R1',w:2},{n:'R2',w:2}],asg:[['R1','T2'],['R1','T3'],['R2','T1'],['R2','T4']],req:[['T1','R1'],['T3','R2']]}},
   {k:'rag',t:'Disk / Printer (slide 8.14)',s:'single instance',n:'One instance each and a cycle P₀ → Printer → P₁ → Disk → P₀: deadlock guaranteed.',
    G:{P:['P0','P1'],R:[{n:'R0'},{n:'R1'}],asg:[['R0','P0'],['R1','P1']],req:[['P0','R1'],['P1','R0']]}},
   {k:'rag',t:'RAG → wait-for graph (slide 8.39)',s:'single instance',n:'Left: the RAG. Right: the same system with resource nodes collapsed. The cycle P₁ → P₂ → P₃ → P₁ is the deadlock; P₄ and P₅ are merely stuck behind it.',
    G:{P:['P1','P2','P3','P4','P5'],R:[{n:'R1'},{n:'R2'},{n:'R3'},{n:'R4'}],asg:[['R1','P2'],['R2','P3'],['R3','P1'],['R4','P4']],req:[['P1','R1'],['P2','R2'],['P3','R3'],['P4','R2'],['P5','R4']]},wfg:true}],
  pr:[
   {k:'rag',t:'Practice 1 — a chain',q:'Deadlock or not?',h:'Follow the edges: is there any way to come back to the start?',G:{P:['P1','P2','P3'],R:[{n:'R1'},{n:'R2'}],asg:[['R1','P2'],['R2','P3']],req:[['P1','R1'],['P2','R2']]}},
   {k:'rag',t:'Practice 2 — two instances of R₁',q:'Deadlock or not?',h:'There is a cycle, but check whether any process outside it can finish and free an instance.',G:{P:['P1','P2','P3','P4'],R:[{n:'R1',w:2},{n:'R2'}],asg:[['R1','P1'],['R1','P4'],['R2','P2']],req:[['P1','R2'],['P2','R1'],['P3','R2']]}},
   {k:'rag',t:'Practice 3 — all instances taken',q:'Deadlock or not?',h:'Count free instances of R₁ and R₂, then try to reduce.',G:{P:['P1','P2','P3'],R:[{n:'R1',w:2},{n:'R2'}],asg:[['R1','P1'],['R1','P2'],['R2','P3']],req:[['P1','R2'],['P2','R2'],['P3','R1']]}}]},
 /* ============================ 3. PREVENTION ============================ */
 {id:'prev',name:'Prevention',full:'Deadlock Prevention',mode:'§8.5',from:'galvin',src:'§8.5 · slides 8.17–8.21',
  rule:'Invalidate at least one of the four necessary conditions — design the system so it can never be true.',
  steps:['Pick the condition you can realistically deny (almost always circular wait).','Number every resource type with a function F: R → ℕ.','Require every thread to acquire resources in <b>increasing</b> F order.','If a thread violates the order, you have found a possible deadlock — fix the code path.'],
  notes:[
   {h:'Four ways to invalidate a condition',items:['<b>Mutual exclusion</b> — not required for sharable resources (read-only files), but cannot be disallowed in general for locks and printers.','<b>Hold and wait</b> — (1) request all resources at the start, or (2) request only when holding none. Drawbacks: low utilisation, starvation possible.','<b>No preemption</b> — if a request cannot be granted, all held resources are implicitly released and added to the list the process waits for. Works for CPU registers and database transactions, not for printers or tape drives.','<b>Circular wait</b> — impose a total order on resource types; acquire in increasing order. Drawback: developers must follow the order, and it does not help for dynamically chosen locks.'],
    table:{cap:'Hold-and-wait protocols: copy from DVD to disk, then print',h:['','Protocol 1 — all at once','Protocol 2 — only when holding none'],r:[['Requests','DVD + disk + printer before starting','DVD + disk; release both; then disk + printer'],['Printer is held','The whole run (idle most of the time)','Only while printing'],['Risk','Low utilisation, starvation','Data may need to be re-staged']]}}],
  exs:[
   {k:'order',t:'Lock ordering in Pthreads (§8.5.4)',s:'Galvin',n:'F(first_mutex) = 1, F(second_mutex) = 5. Thread Two grabs second_mutex first, so it asks for a lower number while holding a higher one — circular wait is possible.',F:{first_mutex:1,second_mutex:5},threads:[['Thread One',['first_mutex','second_mutex']],['Thread Two',['second_mutex','first_mutex']]]},
   {k:'order',t:'Fixing Thread Two',s:'Galvin',n:'Rewrite Thread Two to take the locks in the global order. Now a cycle cannot form: nobody holds second_mutex while asking for first_mutex.',F:{first_mutex:1,second_mutex:5},threads:[['Thread One',['first_mutex','second_mutex']],['Thread Two',['first_mutex','second_mutex']]]},
   {k:'order',t:'R₀ and R₁ (slide 8.21)',s:'slides',n:'F(R₀) = 3, F(R₁) = 5. P₀ goes R₀ → R₁ (fine); P₁ goes R₁ → R₀ (violation).',F:{R0:3,R1:5},threads:[['P0',['R0','R1']],['P1',['R1','R0']]]}],
  pr:[
   {k:'order',t:'Practice 1 — three locks',q:'Does every thread respect the ordering?',h:'Write F next to every lock in each thread; each sequence must be strictly increasing.',F:{A:1,B:2,C:3},threads:[['T1',['A','C']],['T2',['B','C']],['T3',['A','B','C']]]},
   {k:'order',t:'Practice 2 — transfer()',q:'Does every thread respect the ordering?',h:'Same account pair, opposite direction.',F:{acctX:1,acctY:2},threads:[['transfer(X→Y)',['acctX','acctY']],['transfer(Y→X)',['acctY','acctX']]]},
   {k:'text',t:'Dynamic locks',q:'Why does a fixed lock ordering not fully solve the bank-account transfer problem?',h:'Which lock comes first depends on the run-time arguments.',sol:'The lock order depends on run-time input: transfer(from, to) locks <i>from</i> then <i>to</i>, so two concurrent calls with swapped arguments take the locks in opposite order. A static F on lock <i>types</i> cannot order them; one must order by a run-time key such as the account number.'}]},
 /* ============================ 4. AVOIDANCE ============================ */
 {id:'avoid',name:'Avoidance',full:'Deadlock Avoidance · Banker’s Algorithm',mode:'§8.6',from:'galvin',src:'§8.6 · slides 8.22–8.35',
  defs:'bank',
  rule:'Grant a request only if the resulting state is <b>safe</b> — i.e. some order exists in which every process can still run to completion.',
  math:'\\text{Safe}\\iff\\exists\\,\\langle P_1,\\dots,P_n\\rangle:\\ \\text{Need}_i\\le \\text{Available}+\\sum_{j<i}\\text{Allocation}_j',
  steps:['Compute <b>Need = Max − Allocation</b> and <b>Available = Total − ΣAllocation</b>.','Safety algorithm: Work = Available, Finish[i] = false.','Find an i with Finish[i] = false and Need<sub>i</sub> ≤ Work. None → go to the last step.','Work ← Work + Allocation<sub>i</sub>; Finish[i] ← true; repeat.','If all Finish are true the state is <b>safe</b> (the picking order is a safe sequence); otherwise <b>unsafe</b>.','Resource-request: check Request ≤ Need, then Request ≤ Available, pretend to allocate, run the safety algorithm; safe → grant, unsafe → wait and restore the old state.'],
  notes:[
   {h:'Safe, unsafe, deadlock (slide 8.23)',items:['Safe ⇒ no deadlock. Unsafe ⇒ <i>possibility</i> of deadlock. Deadlock ⊂ unsafe.','Avoidance means never entering an unsafe state — even if resources are currently free (the system is conservative).']},
   {h:'Which algorithm?',items:['<b>Single instance</b> per resource type → RAG with claim edges (below). Cycle detection O(n²).','<b>Multiple instances</b> → Banker’s algorithm, O(m·n²). The name comes from a bank that never allocates cash so that it cannot satisfy all customers.']},
   {h:'RAG with claim edges (slides 8.26–8.28)',items:['Claim edge Pᵢ ⇢ Rⱼ (dashed): Pᵢ <i>may</i> request Rⱼ someday. Resources must be claimed a priori.','Claim → request edge when requested → assignment edge when granted → back to claim edge when released.','Grant a request only if converting the request edge into an assignment edge creates <b>no cycle</b> (claim edges included).']},
   {h:'Banker’s data structures (slides 8.29–8.31)',items:['<b>Available</b> (length m): free instances of each type. <b>Max</b> (n×m): maximum demand. <b>Allocation</b> (n×m): currently held. <b>Need</b> (n×m) = Max − Allocation.']}],
  pros:'Never enters a deadlock; works with several instances; no process is killed.',cons:'Max demand must be declared in advance; fixed number of resources; very conservative (limits access to resources); O(m·n²) per request.',
  exs:[
   {k:'rag',t:'Claim edges: safe vs unsafe request (slides 8.27–8.28)',s:'single instance',claim:true,n:'P₁ holds R₁; P₂ requests R₁ (waits); both may later claim R₂ (dashed). Press the button to grant R₂ to P₂: the new assignment edge closes the cycle P₁ ⇢ R₂ → P₂ → R₁ → P₁, so the grant would be unsafe and must be refused.',
    G:{P:['P1','P2'],R:[{n:'R1'},{n:'R2'}],asg:[['R1','P1']],req:[['P2','R1']],claim:[['P1','R2'],['P2','R2']]},then:{label:'➕ Grant R₂ to P₂',d:{asg:[['R2','P2']],rm:{claim:[['P2','R2']]}}}},
   {k:'bank',t:'Banker’s example — safe state (slide 8.32)',s:'lecture',n:'5 processes, 4 resource types, Total = (5, 7, 2, 3). Is the system safe? Step through the safety algorithm.',
    S:{names:['P0','P1','P2','P3','P4'],res:['R0','R1','R2','R3'],tot:[5,7,2,3],alloc:[[1,0,0,2],[1,2,0,0],[0,1,1,0],[2,3,1,0],[0,0,0,0]],max:[[1,0,2,3],[2,3,1,0],[0,2,1,1],[4,3,1,1],[2,2,2,1]]},
    reqs:[[4,[1,0,0,0],'slide 8.33: P₄ asks for an instance of R₀'],[1,[1,0,0,0],'slide 8.34: P₁ asks for an instance of R₀']]},
   {k:'bank',t:'Silberschatz example (§8.6.3)',s:'Galvin',n:'5 threads, A = 10, B = 5, C = 7. Requests are applied one after another: T₁’s request is granted and changes the state that T₄’s and T₀’s requests see.',
    S:{names:['T0','T1','T2','T3','T4'],res:['A','B','C'],tot:[10,5,7],alloc:[[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]],max:[[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]]},
    reqs:[[1,[1,0,2],'T₁ requests (1,0,2)'],[4,[3,3,0],'T₄ requests (3,3,0)'],[0,[0,2,0],'T₀ requests (0,2,0)']],chain:true}],
  pr:[
   {k:'bank',t:'Practice 1 — four resource types',q:'Is this state safe?',h:'Need = Max − Allocation first. Then find a thread whose Need ≤ Work; T₀ is a good first candidate.',
    S:{names:['T0','T1','T2','T3','T4'],res:['A','B','C','D'],alloc:[[0,0,1,2],[1,0,0,0],[1,3,5,4],[0,6,3,2],[0,0,1,4]],max:[[0,0,1,2],[1,7,5,0],[2,3,5,6],[0,6,5,2],[0,6,5,6]],avail:[1,5,2,0]},reqs:[[1,[0,4,2,0],'Can T₁ request (0,4,2,0) immediately?']]},
   {k:'bank',t:'Practice 2 — another snapshot',q:'Is this state safe?',h:'Compute Need, then check each thread against Work = (0, 3, 0, 1).',
    S:{names:['T0','T1','T2','T3','T4'],res:['A','B','C','D'],alloc:[[3,0,1,4],[2,2,1,0],[3,1,2,1],[0,5,1,0],[4,2,1,2]],max:[[5,1,1,7],[3,2,1,1],[3,3,2,1],[4,6,1,2],[6,3,2,5]],avail:[0,3,0,1]}},
   {k:'claim',t:'Practice 3 — claim edges',q:'P₂ asks for R₂. Should the system grant it?',h:'Convert the request into an assignment edge and look for a cycle (claim edges count).',
    G:{P:['P1','P2'],R:[{n:'R1'},{n:'R2'}],asg:[['R1','P1']],req:[['P2','R1']],claim:[['P1','R2'],['P2','R2']]},then:{asg:[['R2','P2']],rm:{claim:[['P2','R2'],['P2','R1']]}}},
   {k:'text',t:'Practice 4 — 4 resources, 3 threads',q:'A system has 4 resources of the same type shared by 3 threads, each needing at most 2. Show it is deadlock-free.',h:'Worst case: every thread holds one resource and asks for its second.',
    sol:'Worst case each thread holds 1 and waits for a 2nd: 3 held, 1 free. One thread gets the free resource, finishes and returns 2; another thread can then proceed, and so on. No circular wait can form. General rule: if Σ(max needs) &lt; resources + threads, the system is deadlock-free.'}]},
 /* ============================ 5. DETECTION ============================ */
 {id:'detect',name:'Detection',full:'Deadlock Detection',mode:'§8.7',from:'galvin',src:'§8.7 · slides 8.38–8.46',
  defs:'det',
  rule:'No prevention, no avoidance: let deadlocks happen, <b>look</b> for them (cycle in the wait-for graph, or a Banker-like algorithm with the <b>Request</b> matrix), then recover.',
  steps:['Work = Available. Finish[i] = true if Allocation<sub>i</sub> is all zeros, otherwise false.','Find i with Finish[i] = false and <b>Request<sub>i</sub> ≤ Work</b>. None → last step.','Optimistically assume Pᵢ finishes: Work ← Work + Allocation<sub>i</sub>; Finish[i] ← true; repeat.','Every i with Finish[i] = false is <b>deadlocked</b>.'],
  notes:[
   {h:'Two cases',items:['<b>Single instance</b>: maintain a wait-for graph; periodically search for a cycle — O(n²).','<b>Several instances</b>: the algorithm is the safety algorithm with two changes — <i>Request</i> replaces Need, and processes holding nothing are finished at the start. O(m×n²).']},
   {h:'When to invoke it (slide 8.46)',items:['Depends on how often deadlock is likely and how many processes would be rolled back (one per disjoint cycle).','On every failed request: finds deadlock early but costs CPU. Periodically (e.g. hourly, or when CPU utilisation drops below ~40%): cheaper, but many cycles may exist and you cannot tell which process “caused” the deadlock.']}],
  pros:'No restriction on how processes request resources; no declared maximum needed.',cons:'Overhead of running detection; recovery loses work; deadlocked processes sit idle until detected.',
  exs:[
   {k:'rag',t:'Single instance: RAG → wait-for graph',s:'slide 8.39',n:'Cycle in the wait-for graph ⇒ deadlock. P₄ and P₅ are not in the cycle but can never finish because the cycle holds what they wait for.',
    G:{P:['P1','P2','P3','P4','P5'],R:[{n:'R1'},{n:'R2'},{n:'R3'},{n:'R4'}],asg:[['R1','P2'],['R2','P3'],['R3','P1'],['R4','P4']],req:[['P1','R1'],['P2','R2'],['P3','R3'],['P4','R2'],['P5','R4']]},wfg:true},
   {k:'det',t:'Several instances — no deadlock (§8.7.2)',s:'Galvin',n:'5 threads, A = 7, B = 2, C = 6. Available = (0,0,0), yet a completion order exists.',
    S:{names:['T0','T1','T2','T3','T4'],res:['A','B','C'],tot:[7,2,6],alloc:[[0,1,0],[2,0,0],[3,0,3],[2,1,1],[0,0,2]],req:[[0,0,0],[2,0,2],[0,0,0],[1,0,0],[0,0,2]]}},
   {k:'det',t:'Same system after T₂ requests one more C',s:'Galvin',n:'T₂’s request becomes (0,0,1). Only T₀ can finish; its resources do not satisfy anybody else ⇒ T₁, T₂, T₃, T₄ are deadlocked.',
    S:{names:['T0','T1','T2','T3','T4'],res:['A','B','C'],tot:[7,2,6],alloc:[[0,1,0],[2,0,0],[3,0,3],[2,1,1],[0,0,2]],req:[[0,0,0],[2,0,2],[0,0,1],[1,0,0],[0,0,2]]}},
   {k:'det',t:'Lecture-slide example (slide 8.41)',s:'lecture',n:'Matrices exactly as printed on the slide with Available = (0,0,0,0,1). <b>Note:</b> the slide’s printed “Resource” row does not add up with its Allocation column (R₄), so we recompute from the matrices; the verdict below is our engine’s.',
    S:{names:['P0','P1','P2','P3'],res:['R0','R1','R2','R3','R4'],alloc:[[0,1,0,0,1],[0,0,1,0,1],[0,0,0,0,1],[1,0,1,0,1]],req:[[1,0,1,1,0],[1,1,0,0,0],[0,0,0,1,0],[0,0,0,0,0]],avail:[0,0,0,0,1]}}],
  pr:[
   {k:'det',t:'Practice 1',q:'Is the system deadlocked?',h:'Which processes hold nothing? Which have Request ≤ Work right now?',
    S:{names:['P0','P1','P2','P3'],res:['A','B','C'],alloc:[[1,0,0],[0,1,1],[1,1,0],[0,0,0]],req:[[0,1,0],[1,0,0],[0,0,1],[0,0,0]],avail:[0,0,1]}},
   {k:'det',t:'Practice 2',q:'Is the system deadlocked?',h:'Try P₃ first: its Request is small.',
    S:{names:['P0','P1','P2','P3'],res:['A','B','C'],alloc:[[1,1,0],[0,1,1],[1,0,1],[0,0,0]],req:[[0,0,1],[1,0,0],[0,1,0],[0,0,0]],avail:[0,0,0]}},
   {k:'rag',t:'Practice 3 — wait-for graph',q:'Deadlock or not?',h:'Build Pᵢ → Pⱼ whenever Pᵢ waits for a resource held by Pⱼ.',G:{P:['P1','P2','P3','P4'],R:[{n:'R1'},{n:'R2'},{n:'R3'}],asg:[['R1','P1'],['R2','P2'],['R3','P3']],req:[['P1','R2'],['P2','R3'],['P4','R1']]},wfg:true}]},
 /* ============================ 6. RECOVERY ============================ */
 {id:'recover',name:'Recovery',full:'Recovery from Deadlock',mode:'§8.8',from:'galvin',src:'§8.8 · slides 8.44–8.49',
  rule:'To break a deadlock either <b>terminate</b> processes or <b>preempt</b> resources — choosing victims by cost, and guarding against starvation.',
  steps:['Detect the deadlocked set.','Choose a strategy: abort all, or abort one at a time (re-run detection after each abort), or preempt resources.','Pick the victim with the lowest cost (criteria below).','For preemption: roll the victim back to a safe state and restart it from there.','Add the number of rollbacks to the cost so that no process is always the victim.'],
  notes:[
   {h:'Process termination (slide 8.44–8.47)',items:['<b>Abort all deadlocked processes</b> — one of the most common solutions; simple but expensive (all partial work is lost).','<b>Abort one at a time</b> until the cycle disappears — considerable overhead: detection runs again after every abort.']},
   {h:'Resource preemption (slide 8.49)',items:['<b>Selecting a victim</b> — minimise cost.','<b>Rollback</b> — return to a safe state / checkpoint and restart from there; the original deadlock may recur; needs rollback and restart mechanisms.','<b>Starvation</b> — the same process may always be picked; include the number of rollbacks in the cost factor.']},
   {h:'Victim selection criteria (slide 8.48)',items:['Least amount of processor time consumed so far','Least amount of output produced so far','Most estimated time remaining','Least total resources allocated so far','Lowest priority']}],
  pros:'Lets the system run with no restrictions on requests; recovery is only paid for when a deadlock really occurs.',cons:'Lost work, restart cost, risk of starvation, needs checkpoint / rollback infrastructure.',
  exs:[
   {k:'rec',t:'Which single victim resolves the deadlock?',s:'Galvin system',n:'The deadlocked system from the previous tab (T₂ requests (0,0,1)). For each candidate we abort it, release its Allocation and re-run the detection algorithm.',
    S:{names:['T0','T1','T2','T3','T4'],res:['A','B','C'],tot:[7,2,6],alloc:[[0,1,0],[2,0,0],[3,0,3],[2,1,1],[0,0,2]],req:[[0,0,0],[2,0,2],[0,0,1],[1,0,0],[0,0,2]]}},
   {k:'rec',t:'Abort one at a time, re-detecting after each abort',s:'lecture system',n:'Abort P₂, then P₀, running detection after every abort. Notice P₂ alone is not enough.',
    S:{names:['P0','P1','P2','P3'],res:['R0','R1','R2','R3','R4'],alloc:[[0,1,0,0,1],[0,0,1,0,1],[0,0,0,0,1],[1,0,1,0,1]],req:[[1,0,1,1,0],[1,1,0,0,0],[0,0,0,1,0],[0,0,0,0,0]],avail:[0,0,0,0,1]},order:['P2','P0']}],
  pr:[
   {k:'minab',t:'Practice 1 — smallest abort set',q:'What is the minimum number of processes that must be aborted to resolve this deadlock?',h:'Look for disjoint cycles — the slides note that one process must be rolled back for each disjoint cycle (slide 8.46).',
    S:{names:['P0','P1','P2','P3'],res:['A','B','C','D'],alloc:[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]],req:[[0,1,0,0],[1,0,0,0],[0,0,0,1],[0,0,1,0]],avail:[0,0,0,0]}},
   {k:'text',t:'Practice 2 — starvation',q:'The same process is chosen as the victim every time. Why is this a problem, and how is it fixed?',h:'Think about what the cost function ignores.',sol:'The victim never completes — <b>starvation</b>. Fix: include the <b>number of rollbacks</b> in the cost factor, so a process that has already been a victim becomes more expensive and is chosen a bounded number of times.'},
   {k:'text',t:'Practice 3 — abort all vs one at a time',q:'Compare “abort all deadlocked processes” with “abort one at a time”.',h:'Cost of work lost vs cost of repeated detection.',sol:'Abort-all: simple and certain, but throws away all partial computation. One-at-a-time: loses less work, but after every abort the detection algorithm must run again, and a victim-selection policy is needed.'}]}
 ]};
if(typeof window!='undefined')window.DATA=DATA;
if(typeof module!='undefined')module.exports=DATA;
