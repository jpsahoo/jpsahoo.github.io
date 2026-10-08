/* All teaching content. Loaded with a <script> tag, so it works from file:// as well as GitHub Pages. */
const DATA={
 "title": "Operating System · CPU Scheduling — Lecture Notes",
 "objectives": [
  "Explain what CPU scheduling decides, and define throughput, turnaround time, waiting time and response time (Galvin pp.204–205).",
  "Draw a Gantt chart with a numbered time axis and compute CT, TAT and WT for any set of processes.",
  "Apply FCFS, SJF, SRTF, Round Robin, Priority, Multilevel Queue and Multilevel Feedback Queue step by step — plus HRRN and VRR from the course list.",
  "Reproduce Galvin’s worked examples and check each result against the book (green “Matches Galvin” badges).",
  "Compare algorithms on the same data and explain why their Gantt charts differ."
 ],
 "basics": [
  {
   "h": "What scheduling decides",
   "items": [
    "CPU scheduling decides which process in the ready queue is allocated the CPU’s core (p.205).",
    "All algorithms are described for a single CPU with one processing core, so only one process runs at a time (pp.205–206).",
    "Galvin’s examples use one CPU burst (in ms) per process and compare algorithms by the <b>average waiting time</b> (p.205)."
   ]
  },
  {
   "h": "Gantt chart",
   "items": [
    "A Gantt chart is a bar chart of a schedule that shows the start and finish time of every participating process (p.206).",
    "<b>Blocks</b> = who owns the CPU; block width is proportional to its duration. <b>Numbers on the time axis</b> = clock times (ms) at which the CPU switches to another process; small ticks mark every millisecond.",
    "Read a process’s CT from the number at the right edge of its <i>last</i> block. A grey “idle” block means no process had arrived yet."
   ]
  },
  {
   "h": "Preemptive vs non-preemptive",
   "items": [
    "<b>Non-preemptive:</b> once a process has the CPU it keeps it until it terminates or requests I/O (FCFS, p.207).",
    "<b>Preemptive:</b> the scheduler may take the CPU away — when a more suitable process arrives (SRTF, preemptive priority) or when the time quantum expires (RR) (pp.209–213)."
   ]
  },
  {
   "h": "Tie-breaking",
   "items": [
    "Equal next-CPU bursts in SJF → FCFS (p.207). Equal priorities → FCFS (p.212)."
   ]
  }
 ],
 "criteria": [
  [
   "CPU utilization",
   "keep the CPU as busy as possible",
   "p.204"
  ],
  [
   "Throughput",
   "number of processes completed per time unit (tens per second for short transactions; one per several seconds for long processes)",
   "p.205"
  ],
  [
   "Turnaround time",
   "from submission to completion = time waiting in the ready queue + executing on the CPU + doing I/O",
   "p.205"
  ],
  [
   "Waiting time",
   "sum of the periods spent waiting in the ready queue; scheduling does not change execution or I/O time",
   "p.205"
  ],
  [
   "Response time",
   "from submission of a request until the <i>first</i> response is produced (not until the output is finished)",
   "p.205"
  ]
 ],
 "goal": "Goal (p.205): maximize CPU utilization and throughput; minimize turnaround, waiting and response time. Usually we optimize the <i>average</i>; sometimes the minimum or maximum instead (e.g. minimize the maximum response time). For interactive systems a predictable response time (low variance) can matter more than a fast but highly variable average.",
 "formulas": [
  "TAT = CT - AT",
  "WT = TAT - BT",
  "\\text{Avg TAT}=\\frac{\\sum TAT}{n}",
  "\\text{Avg WT}=\\frac{\\sum WT}{n}"
 ],
 "recipe": [
  "Write the table: AT, BT (and priority / queue / quantum when given).",
  "Start the clock at t = 0. If nothing has arrived yet, the CPU is idle until the first arrival.",
  "Whenever the CPU is free (or a preemption event happens) look <b>only</b> at processes that have already arrived and are not finished.",
  "Apply the algorithm’s selection rule and draw the Gantt block with its start and end time.",
  "Repeat until every burst is done. CT = right edge of the process’s last block.",
  "TAT = CT − AT, then WT = TAT − BT.",
  "Average TAT = ΣTAT / n and Average WT = ΣWT / n.",
  "Sanity check: with no idle time the last CT equals the sum of all bursts, and no WT is negative."
 ],
 "tasks": [
  "Draw the Gantt chart (show every CPU switch).",
  "Find the Completion Time (CT) of each process.",
  "Calculate Turnaround Time: TAT = CT − AT.",
  "Calculate Waiting Time: WT = TAT − BT.",
  "Calculate the average TAT and the average WT."
 ],
 "q7": {
  "title": "Practice Q7 — Priority vs Round Robin (compare)",
  "q": 2,
  "procs": [
   {
    "n": "P₁",
    "at": 0,
    "bt": 8,
    "pr": 2
   },
   {
    "n": "P₂",
    "at": 1,
    "bt": 4,
    "pr": 1
   },
   {
    "n": "P₃",
    "at": 2,
    "bt": 2,
    "pr": 3
   },
   {
    "n": "P₄",
    "at": 3,
    "bt": 5,
    "pr": 2
   }
  ],
  "hint": "For RR keep a ready queue; each turn a process runs min(q, remaining) and an unfinished process goes to the back. For Priority (non-preemptive) pick the smallest priority number among the arrived processes each time the CPU is free."
 },
 "algos": [
  {
   "id": "fcfs",
   "name": "FCFS",
   "full": "First-Come, First-Served",
   "mode": "Non-preemptive",
   "from": "galvin",
   "src": "§5.3.1, pp.206–207",
   "pick": "Earliest arrival (FIFO queue)",
   "rule": "The process that requests the CPU first is allocated the CPU first. The ready queue is a FIFO queue: a new process’s PCB is linked onto the tail; when the CPU is free it goes to the process at the head, which is then removed from the queue (p.206).",
   "steps": [
    "Order the processes by arrival time (equal arrival → the order given).",
    "The first process starts at max(clock, AT).",
    "It runs to completion: CT = start + BT. The next process starts at that time, or at its arrival if the CPU was idle.",
    "TAT = CT − AT and WT = TAT − BT for every process.",
    "Average the TAT and WT columns."
   ],
   "notes": [
    {
     "h": "Why FCFS can be slow (p.206)",
     "items": [
      "The average waiting time is often quite long, is generally not minimal, and varies substantially when CPU-burst times vary greatly.",
      "Same three processes (24, 3, 3 ms): order P₁, P₂, P₃ → average WT 17 ms; order P₂, P₃, P₁ → 3 ms. Both are in the <b>Examples</b> tab."
     ]
    },
    {
     "h": "Convoy effect (pp.206–207): one CPU-bound process + many I/O-bound processes",
     "items": [
      "The CPU-bound process gets the CPU and holds it.",
      "Meanwhile the others finish their I/O and wait in the ready queue — the I/O devices sit idle.",
      "The CPU-bound process finishes its burst and moves to I/O. The I/O-bound processes (short bursts) run quickly and return to their I/O queues — now the <i>CPU</i> sits idle.",
      "The CPU-bound process comes back, takes the CPU again, and everyone waits behind it again.",
      "Result: lower CPU and device utilization than if the shorter processes had gone first."
     ]
    },
    {
     "h": "Non-preemptive (p.207)",
     "items": [
      "A process keeps the CPU until it terminates or requests I/O.",
      "Particularly troublesome for interactive systems, where each process must get a share of the CPU at regular intervals."
     ]
    }
   ],
   "pros": "Simplest algorithm; the code is simple to write and understand; every process eventually reaches the head of the queue.",
   "cons": "Long, order-dependent average waiting time; convoy effect; non-preemptive, so poor for interactive systems.",
   "exs": [
    {
     "t": "Galvin example 1 — order P₁, P₂, P₃",
     "s": "Galvin p.206",
     "u": null,
     "n": "All three arrive at time 0 in the order P₁, P₂, P₃, so they run in that order: P₁ 0–24, P₂ 24–27, P₃ 27–30. Waiting times: 0, 24, 27 → book: (0 + 24 + 27)/3 = 17 ms.",
     "p": [
      {
       "n": "P₁",
       "at": 0,
       "bt": 24
      },
      {
       "n": "P₂",
       "at": 0,
       "bt": 3
      },
      {
       "n": "P₃",
       "at": 0,
       "bt": 3
      }
     ],
     "b": {
      "wt": 17,
      "g": [
       0,
       24,
       27,
       30
      ]
     }
    },
    {
     "t": "Galvin example 2 — same processes, order P₂, P₃, P₁",
     "s": "Galvin p.206",
     "n": "Only the arrival order changed (list order = arrival order at time 0): P₂ 0–3, P₃ 3–6, P₁ 6–30. Book: (6 + 0 + 3)/3 = 3 ms — a substantial reduction, showing that FCFS waiting time depends on the order.",
     "p": [
      {
       "n": "P₂",
       "at": 0,
       "bt": 3
      },
      {
       "n": "P₃",
       "at": 0,
       "bt": 3
      },
      {
       "n": "P₁",
       "at": 0,
       "bt": 24
      }
     ],
     "b": {
      "wt": 3,
      "g": [
       0,
       3,
       6,
       30
      ]
     }
    }
   ],
   "pr": [
    {
     "t": "Practice 1 — FCFS with different arrival times",
     "h": "Arrival order = execution order, so P₀ → P₁ → P₂ → P₃. Each process starts when the previous one completes: CT = start + BT.",
     "p": [
      {
       "n": "P₀",
       "at": 0,
       "bt": 5
      },
      {
       "n": "P₁",
       "at": 1,
       "bt": 3
      },
      {
       "n": "P₂",
       "at": 2,
       "bt": 8
      },
      {
       "n": "P₃",
       "at": 3,
       "bt": 6
      }
     ]
    }
   ],
   "defs": [
    {
     "k": "concept",
     "t": "First-come, first-served (FCFS)",
     "d": "The process that requests the CPU first is allocated the CPU first. Implemented with a FIFO queue: a new PCB joins the tail, the CPU goes to the head.",
     "s": "Galvin p.206"
    },
    {
     "k": "problem",
     "t": "Convoy effect",
     "d": "All the other processes wait for one big process to get off the CPU. Result: lower CPU and device utilization than if the shorter processes had gone first.",
     "s": "Galvin p.207"
    },
    {
     "k": "concept",
     "t": "Nonpreemptive",
     "d": "A process keeps the CPU until it terminates or requests I/O — particularly troublesome for interactive systems.",
     "s": "Galvin p.207"
    }
   ]
  },
  {
   "id": "sjf",
   "name": "SJF",
   "full": "Shortest-Job-First (non-preemptive)",
   "mode": "Non-preemptive",
   "from": "galvin",
   "src": "§5.3.2, pp.207–209",
   "pick": "Smallest next CPU burst",
   "rule": "Each process is associated with the length of its next CPU burst. When the CPU is free it goes to the process with the smallest next burst; equal bursts are broken FCFS (p.207). (‘Shortest-next-CPU-burst’ would be the more exact name — scheduling depends on the next burst, not the total length.)",
   "math": "\\tau_{n+1}=\\alpha\\,t_n+(1-\\alpha)\\,\\tau_n",
   "extra": "pred",
   "steps": [
    "Clock t = 0. Build the ready set: processes with AT ≤ t that are not finished.",
    "If the ready set is empty, jump the clock to the next arrival (CPU idle).",
    "Pick the smallest BT; tie → earlier arrival.",
    "Run it to completion (non-preemptive): CT = t + BT, then set t = CT.",
    "Repeat, then compute TAT, WT and the averages."
   ],
   "notes": [
    {
     "h": "Optimality (pp.207–208)",
     "items": [
      "SJF is provably optimal: it gives the <b>minimum average waiting time</b> for a given set of processes.",
      "Reason: moving a short process before a long one decreases the short one’s waiting time more than it increases the long one’s, so the average falls.",
      "<b>Careful:</b> Galvin’s optimality claim compares orderings of a given set of bursts. When processes arrive at different times the preemptive version (SRTF) can do even better — 6.5 ms vs 7.75 ms in Galvin’s p.209 example."
     ]
    },
    {
     "h": "The practical problem (p.208)",
     "items": [
      "At the level of CPU scheduling there is no way to know the length of the next CPU burst, so SJF cannot be implemented exactly.",
      "Fix: <i>predict</i> it. We expect the next burst to be similar to the previous ones, and pick the process with the shortest predicted burst."
     ]
    },
    {
     "h": "Exponential average (pp.208–209)",
     "items": [
      "t<sub>n</sub> = measured length of the nth CPU burst; τ<sub>n+1</sub> = predicted next burst; 0 ≤ α ≤ 1.",
      "t<sub>n</sub> holds the most recent information, τ<sub>n</sub> stores the past history; α sets their relative weight.",
      "α = 0 → τ<sub>n+1</sub> = τ<sub>n</sub> (recent history has no effect). α = 1 → τ<sub>n+1</sub> = t<sub>n</sub> (only the latest burst matters). Commonly α = 1/2.",
      "τ<sub>0</sub> can be a constant or an overall system average. Figure 5.4 uses α = 1/2 and τ<sub>0</sub> = 10 (reproduced below).",
      "Expanding the formula shows each older term gets an extra factor (1 − α) &lt; 1, so older bursts count less."
     ]
    },
    {
     "h": "Preemptive or not? (p.209)",
     "items": [
      "The choice arises when a new process arrives while another is running and its burst is shorter than what is left of the running one.",
      "Preemptive SJF preempts; non-preemptive SJF lets the running process finish its burst. Preemptive SJF is called shortest-remaining-time-first — see the SRTF tab."
     ]
    }
   ],
   "pros": "Provably optimal: minimum average waiting time for the given processes.",
   "cons": "The next burst can only be predicted (exponential average). As a special case of priority scheduling it can leave long processes waiting indefinitely (see Priority → starvation).",
   "exs": [
    {
     "t": "Galvin example — P₁=6, P₂=8, P₃=7, P₄=3 (all at time 0)",
     "s": "Galvin p.207",
     "n": "All arrive at 0, so simply sort by burst: P₄ (3), P₁ (6), P₃ (7), P₂ (8). Waiting times: P₁ 3, P₂ 16, P₃ 9, P₄ 0 → book: (3 + 16 + 9 + 0)/4 = 7 ms.",
     "p": [
      {
       "n": "P₁",
       "at": 0,
       "bt": 6
      },
      {
       "n": "P₂",
       "at": 0,
       "bt": 8
      },
      {
       "n": "P₃",
       "at": 0,
       "bt": 7
      },
      {
       "n": "P₄",
       "at": 0,
       "bt": 3
      }
     ],
     "b": {
      "wt": 7,
      "g": [
       0,
       3,
       9,
       16,
       24
      ]
     }
    },
    {
     "t": "Same data under FCFS (the book’s comparison)",
     "s": "Galvin p.207",
     "u": "fcfs",
     "n": "Running the same processes in the order P₁, P₂, P₃, P₄ gives waiting times 0, 6, 14, 21 → 41/4 = 10.25 ms. SJF (7 ms) is clearly better — that is the optimality property at work.",
     "p": [
      {
       "n": "P₁",
       "at": 0,
       "bt": 6
      },
      {
       "n": "P₂",
       "at": 0,
       "bt": 8
      },
      {
       "n": "P₃",
       "at": 0,
       "bt": 7
      },
      {
       "n": "P₄",
       "at": 0,
       "bt": 3
      }
     ],
     "b": {
      "wt": 10.25
     }
    }
   ],
   "pr": [
    {
     "t": "Practice 2 — SJF non-preemptive",
     "h": "At t = 7 the ready set is {P₁(4), P₂(1), P₃(4)}. P₂ is shortest; then P₁ and P₃ tie at 4 → P₁ arrived first.",
     "p": [
      {
       "n": "P₀",
       "at": 0,
       "bt": 7
      },
      {
       "n": "P₁",
       "at": 2,
       "bt": 4
      },
      {
       "n": "P₂",
       "at": 4,
       "bt": 1
      },
      {
       "n": "P₃",
       "at": 5,
       "bt": 4
      }
     ]
    }
   ],
   "defs": [
    {
     "k": "concept",
     "t": "Shortest-job-first (SJF)",
     "d": "Each process is associated with the length of its <i>next</i> CPU burst; the CPU goes to the process with the smallest one. Equal bursts → FCFS. “Shortest-next-CPU-burst” is the more exact name.",
     "s": "Galvin p.207"
    },
    {
     "k": "fix",
     "t": "Provably optimal",
     "d": "SJF gives the minimum average waiting time for a given set of processes: moving a short process before a long one lowers the short one’s wait more than it raises the long one’s.",
     "s": "Galvin pp.207–208"
    },
    {
     "k": "metric",
     "t": "Exponential average",
     "d": "Predicts the next burst: <b>τ<sub>n+1</sub> = α·t<sub>n</sub> + (1 − α)·τ<sub>n</sub></b>, 0 ≤ α ≤ 1. t<sub>n</sub> = latest measured burst (recent information), τ<sub>n</sub> = past history; α weighs the two (commonly ½).",
     "s": "Galvin p.208"
    }
   ]
  },
  {
   "id": "srtf",
   "name": "SRTF",
   "full": "Shortest-Remaining-Time-First (preemptive SJF)",
   "mode": "Preemptive",
   "from": "galvin",
   "src": "§5.3.2, p.209",
   "pick": "Smallest REMAINING time",
   "rule": "Preemptive SJF: if a newly arrived process needs less time than what is left of the running process, the running process is preempted and the newcomer runs (p.209).",
   "steps": [
    "At every arrival and every completion, build the ready set (arrived, not finished).",
    "Compare <b>remaining</b> times (not the original bursts) and run the smallest; on a tie keep the running process, otherwise take the earlier arrival.",
    "Advance the clock to the next event (arrival or completion) and update the remaining times.",
    "Merge consecutive blocks of the same process in the Gantt chart; CT = end of its last block.",
    "TAT = CT − AT and WT = TAT − BT (equivalently: add up the gaps in which the process was waiting)."
   ],
   "notes": [
    {
     "h": "Galvin’s walk-through (p.209)",
     "items": [
      "P₁ starts at 0 because it is the only process in the queue.",
      "P₂ arrives at 1 needing 4 ms. P₁ has 7 ms left, which is more, so P₁ is preempted and P₂ runs.",
      "The book sums the waiting gaps: [(10 − 1) + (1 − 1) + (17 − 2) + (5 − 3)]/4 = 26/4 = 6.5 ms. Each bracket is (time the process finally resumed or started) − (time it was preempted or arrived).",
      "Non-preemptive SJF on the same data gives 7.75 ms (second example)."
     ]
    }
   ],
   "pros": "On Galvin’s example it gives the smaller average waiting time of the two SJF variants (6.5 ms vs 7.75 ms).",
   "cons": "More preemptions and context switches; still needs the burst length (or a prediction of it).",
   "exs": [
    {
     "t": "Galvin example — preemptive SJF (SRTF)",
     "s": "Galvin p.209",
     "n": "Step through the chart: P₁ runs 0–1; at t = 1, P₂ (4) beats P₁ (7 left) → P₂ runs 1–5; at t = 5 the ready set is P₁ (7), P₃ (9), P₄ (5) → P₄ 5–10; then P₁ 10–17; finally P₃ 17–26. Book waiting times: P₁ 10−1 = 9, P₂ 0, P₃ 17−2 = 15, P₄ 5−3 = 2 → 26/4 = 6.5 ms.",
     "p": [
      {
       "n": "P₁",
       "at": 0,
       "bt": 8
      },
      {
       "n": "P₂",
       "at": 1,
       "bt": 4
      },
      {
       "n": "P₃",
       "at": 2,
       "bt": 9
      },
      {
       "n": "P₄",
       "at": 3,
       "bt": 5
      }
     ],
     "b": {
      "wt": 6.5,
      "g": [
       0,
       1,
       5,
       10,
       17,
       26
      ]
     }
    },
    {
     "t": "Same data with non-preemptive SJF (the book’s comparison)",
     "s": "Galvin p.209",
     "u": "sjf",
     "n": "Without preemption P₁ finishes its whole 8 ms first (0–8). Then the ready set is P₂ (4), P₃ (9), P₄ (5) → P₂, P₄, P₃. Average waiting time = 7.75 ms, worse than 6.5 ms.",
     "p": [
      {
       "n": "P₁",
       "at": 0,
       "bt": 8
      },
      {
       "n": "P₂",
       "at": 1,
       "bt": 4
      },
      {
       "n": "P₃",
       "at": 2,
       "bt": 9
      },
      {
       "n": "P₄",
       "at": 3,
       "bt": 5
      }
     ],
     "b": {
      "wt": 7.75
     }
    }
   ],
   "pr": [
    {
     "t": "Practice 3 — SRTF (SJF preemptive)",
     "h": "At t = 2, P₀ has 5 ms left but P₁ needs 4 → preempt. At t = 4, P₂ (1) preempts P₁ (2 left). Compare the result with the non-preemptive SJF practice.",
     "p": [
      {
       "n": "P₀",
       "at": 0,
       "bt": 7
      },
      {
       "n": "P₁",
       "at": 2,
       "bt": 4
      },
      {
       "n": "P₂",
       "at": 4,
       "bt": 1
      },
      {
       "n": "P₃",
       "at": 5,
       "bt": 4
      }
     ]
    }
   ],
   "defs": [
    {
     "k": "concept",
     "t": "Shortest-remaining-time-first (SRTF)",
     "d": "Preemptive SJF: if a newly arrived process needs less time than what is <i>left</i> of the running process, the running process is preempted and the newcomer runs.",
     "s": "Galvin p.209"
    }
   ]
  },
  {
   "id": "hrrn",
   "name": "HRRN",
   "full": "Highest Response Ratio Next",
   "mode": "Non-preemptive",
   "from": "stallings",
   "src": "not in Galvin §5.3",
   "pick": "Highest (W+S)/S",
   "rule": "When the CPU is free, compute the response ratio of every ready process and run the highest. W = time waited so far, S = service (burst) time. A short job has a high ratio at once, and a long job’s ratio keeps growing while it waits.",
   "math": "\\text{Response ratio}=\\frac{W+S}{S}",
   "steps": [
    "At each decision time t, take the processes that have arrived and are not finished.",
    "For each one compute W = t − AT and the ratio (W + S)/S.",
    "Run the process with the highest ratio to completion (non-preemptive); tie → earlier arrival.",
    "Repeat; then CT, TAT, WT, averages."
   ],
   "notes": [
    {
     "h": "Where it comes from",
     "items": [
      "HRRN is on the instructor’s algorithm list but is <b>not</b> in Galvin §5.3 (the supplied pages). It is described in Stallings’ text.",
      "It behaves like SJF for short jobs but, because the ratio grows with waiting, long jobs are eventually chosen — a form of aging."
     ]
    }
   ],
   "pros": "Favours short jobs like SJF, but waiting time raises a job’s priority, so long jobs are not starved.",
   "cons": "Needs the burst time in advance; ratios must be recomputed at every decision.",
   "exs": [
    {
     "t": "Worked example (our own — not from Galvin)",
     "s": "own example",
     "n": "At t = 9 the ratios are P₂ = (5+4)/4 = 2.25, P₃ = (3+5)/5 = 1.6, P₄ = (1+2)/2 = 1.5 → P₂. At t = 13: P₃ = 2.4, P₄ = 3.5 → P₄.",
     "p": [
      {
       "n": "P₀",
       "at": 0,
       "bt": 3
      },
      {
       "n": "P₁",
       "at": 2,
       "bt": 6
      },
      {
       "n": "P₂",
       "at": 4,
       "bt": 4
      },
      {
       "n": "P₃",
       "at": 6,
       "bt": 5
      },
      {
       "n": "P₄",
       "at": 8,
       "bt": 2
      }
     ]
    }
   ],
   "pr": [
    {
     "t": "Practice — HRRN",
     "h": "Compute W = t − AT for every ready process at each decision point (t = 4, 7, 9) and take the largest (W+S)/S.",
     "p": [
      {
       "n": "P₀",
       "at": 0,
       "bt": 4
      },
      {
       "n": "P₁",
       "at": 1,
       "bt": 3
      },
      {
       "n": "P₂",
       "at": 2,
       "bt": 5
      },
      {
       "n": "P₃",
       "at": 3,
       "bt": 2
      }
     ]
    }
   ],
   "defs": [
    {
     "k": "metric",
     "t": "Response ratio",
     "d": "<b>(W + S) / S</b> with W = time waited so far and S = service (burst) time. The ready process with the highest ratio runs next.",
     "s": "Stallings — not in Galvin §5.3"
    },
    {
     "k": "fix",
     "t": "Built-in aging",
     "d": "A waiting process’s ratio keeps growing, so even a long job is eventually chosen and does not starve.",
     "s": "Stallings — not in Galvin §5.3"
    }
   ]
  },
  {
   "id": "rr",
   "name": "RR",
   "full": "Round Robin",
   "mode": "Preemptive",
   "from": "galvin",
   "src": "§5.3.3, pp.209–211",
   "pick": "FIFO + time quantum",
   "rule": "Like FCFS but with preemption: each process gets at most one time quantum q (generally 10–100 ms). If its burst is longer, a timer interrupt causes a context switch and the process goes to the tail of the ready queue (pp.209–210).",
   "extra": "sweep",
   "steps": [
    "Put the arrived processes in a FIFO ready queue (tail = newest).",
    "Take the head and run it for min(q, remaining).",
    "During that slice, queue every process that arrives (convention used here: newcomers join the queue <b>before</b> the preempted process).",
    "If the process is unfinished, put it at the tail; if finished, record its CT.",
    "Repeat until the queue is empty. If it is empty but processes remain, the CPU is idle until the next arrival."
   ],
   "notes": [
    {
     "h": "How it works (pp.209–210)",
     "items": [
      "The ready queue is treated as a circular FIFO queue; new processes are added at the tail.",
      "The scheduler picks the first process, sets a timer for 1 quantum and dispatches it.",
      "Burst &lt; 1 quantum: the process releases the CPU voluntarily and the next one runs.",
      "Burst &gt; 1 quantum: timer interrupt → context switch → the process goes to the tail of the ready queue."
     ]
    },
    {
     "h": "Fairness bound (p.210)",
     "items": [
      "With n processes in the ready queue and quantum q, each process gets 1/n of the CPU in chunks of at most q.",
      "No process waits more than (n − 1) × q for its next quantum — e.g. 5 processes and q = 20 ms: up to 20 ms every 100 ms.",
      "No process holds the CPU for more than one quantum in a row (unless it is the only runnable process)."
     ]
    },
    {
     "h": "Choosing the quantum (pp.210–211)",
     "items": [
      "Very large q → RR is the same as FCFS. Very small q (say 1 ms) → a large number of context switches.",
      "If a context switch costs about 10 % of the quantum, about 10 % of CPU time is spent switching. Modern systems: q of 10–100 ms, context switch typically &lt; 10 µs.",
      "Average turnaround does not necessarily improve as q grows (Figure 5.6); it improves if most processes finish their next burst within one quantum.",
      "Rule of thumb: 80 % of the CPU bursts should be shorter than the time quantum."
     ],
     "table": {
      "cap": "Figure 5.5 — one process of 10 time units",
      "h": [
       "Quantum",
       "Context switches"
      ],
      "r": [
       [
        12,
        0
       ],
       [
        6,
        1
       ],
       [
        1,
        9
       ]
      ]
     }
    }
   ],
   "pros": "Every process gets the CPU at regular intervals — suited to interactive / time-sharing systems.",
   "cons": "Average waiting time is often long (p.210); performance depends heavily on the quantum size.",
   "exs": [
    {
     "t": "Galvin example — P₁=24, P₂=3, P₃=3, q = 4",
     "s": "Galvin p.210",
     "n": "P₁ gets the first 4 ms, needs 20 more → preempted. P₂ needs only 3 ms → quits early. P₃ 3 ms. Then P₁ is alone and receives quanta 10–14, 14–18, 18–22, 22–26, 26–30. Waiting: P₁ 10 − 4 = 6, P₂ 4, P₃ 7 → 17/3 = 5.66 ms (the book prints 5.66, i.e. 17/3 = 5.666… truncated; the table below rounds to 5.67). Slices are drawn separately here, exactly as in the book’s chart.",
     "c": {
      "q": 4,
      "split": true
     },
     "p": [
      {
       "n": "P₁",
       "at": 0,
       "bt": 24
      },
      {
       "n": "P₂",
       "at": 0,
       "bt": 3
      },
      {
       "n": "P₃",
       "at": 0,
       "bt": 3
      }
     ],
     "b": {
      "wt": 5.66,
      "g": [
       0,
       4,
       7,
       10,
       14,
       18,
       22,
       26,
       30
      ]
     }
    },
    {
     "t": "Turnaround vs quantum (a) — three 10-unit processes, q = 1",
     "s": "Galvin p.211",
     "n": "Processes alternate every 1 unit, so they finish at 28, 29, 30. Average turnaround = (28 + 29 + 30)/3 = 29, as stated in the book.",
     "c": {
      "q": 1
     },
     "p": [
      {
       "n": "P₁",
       "at": 0,
       "bt": 10
      },
      {
       "n": "P₂",
       "at": 0,
       "bt": 10
      },
      {
       "n": "P₃",
       "at": 0,
       "bt": 10
      }
     ],
     "b": {
      "tat": 29
     }
    },
    {
     "t": "Turnaround vs quantum (b) — three 10-unit processes, q = 10",
     "s": "Galvin p.211",
     "n": "Each process finishes inside its single quantum: CT = 10, 20, 30 → average turnaround = 20, as stated in the book. Most processes finishing within one quantum is what improves turnaround.",
     "c": {
      "q": 10
     },
     "p": [
      {
       "n": "P₁",
       "at": 0,
       "bt": 10
      },
      {
       "n": "P₂",
       "at": 0,
       "bt": 10
      },
      {
       "n": "P₃",
       "at": 0,
       "bt": 10
      }
     ],
     "b": {
      "tat": 20
     }
    }
   ],
   "pr": [
    {
     "t": "Practice 4 — Round Robin, q = 3",
     "h": "Ready-queue snapshots: t = 3 → [P₁, P₀] (P₁ arrived at 2, before P₀ is re-queued); t = 6 → [P₀, P₂, P₁] (P₂ arrived at 4).",
     "c": {
      "q": 3
     },
     "p": [
      {
       "n": "P₀",
       "at": 0,
       "bt": 7
      },
      {
       "n": "P₁",
       "at": 2,
       "bt": 4
      },
      {
       "n": "P₂",
       "at": 4,
       "bt": 1
      }
     ]
    }
   ],
   "defs": [
    {
     "k": "concept",
     "t": "Round-robin (RR)",
     "d": "Like FCFS but with preemption added so the system can switch between processes. The scheduler goes around the ready queue (treated as a circular queue), giving each process up to 1 time quantum.",
     "s": "Galvin p.209"
    },
    {
     "k": "concept",
     "t": "Time quantum (time slice)",
     "d": "A small unit of CPU time, generally 10 to 100 ms. When it expires, the timer interrupts and the process goes to the tail of the ready queue.",
     "s": "Galvin pp.209–210"
    },
    {
     "k": "metric",
     "t": "Fairness bound",
     "d": "With n ready processes and quantum q, each gets 1/n of the CPU in chunks of at most q, and waits at most <b>(n − 1) × q</b> for its next quantum.",
     "s": "Galvin p.210"
    },
    {
     "k": "problem",
     "t": "Quantum too large / too small",
     "d": "Very large q → RR behaves like FCFS. Very small q → many context switches (Figure 5.5: q = 1 on a 10-unit process causes 9 switches).",
     "s": "Galvin pp.210–211"
    }
   ]
  },
  {
   "id": "vrr",
   "name": "VRR",
   "full": "Virtual Round Robin",
   "mode": "Preemptive (with I/O)",
   "from": "stallings",
   "src": "not in Galvin §5.3",
   "pick": "Aux queue first, then Main",
   "rule": "RR is unfair to I/O-bound processes (they block before using q). VRR adds an auxiliary queue: a process returning from I/O joins the Aux queue, which is served before the Main queue, but it runs only for the unused part of its quantum (q − time already used). Afterwards it goes to the Main queue. Model here: io = [CPU time before the I/O, I/O duration]; each process has at most one I/O burst. Here WT = TAT − BT − I/O, i.e. only the time spent waiting in the ready queues.",
   "steps": [
    "Keep two queues: Aux (served first) and Main.",
    "Run a Main process for at most q; run an Aux process for at most its leftover quantum.",
    "When a process blocks for I/O, remember leftover = q − time used in this turn.",
    "When the I/O completes, put the process in Aux (if leftover &gt; 0). Unfinished processes whose quantum expired go to the tail of Main.",
    "CT = end of the last CPU block; WT = TAT − BT − I/O."
   ],
   "notes": [
    {
     "h": "Where it comes from",
     "items": [
      "VRR is on the instructor’s list but is <b>not</b> in Galvin §5.3; it is a Stallings refinement of Round Robin.",
      "It addresses the same concern as Galvin’s convoy effect: I/O-bound processes should not be penalised by CPU-bound ones (compare p.207)."
     ]
    }
   ],
   "pros": "Fairer to I/O-bound processes than plain RR; better device utilization.",
   "cons": "Extra queue and bookkeeping of the leftover quantum.",
   "exs": [
    {
     "t": "Worked example (our own — not from Galvin)",
     "s": "own example",
     "n": "P₁ runs 2 ms, blocks for 3 ms (back at t = 5) with 2 ms of quantum left. The CPU is busy until t = 6, then P₁ is served from Aux first and may run only 2 ms before P₃ (Main) gets its turn.",
     "c": {
      "q": 4
     },
     "p": [
      {
       "n": "P₁",
       "at": 0,
       "bt": 8,
       "io": [
        2,
        3
       ]
      },
      {
       "n": "P₂",
       "at": 0,
       "bt": 6
      },
      {
       "n": "P₃",
       "at": 1,
       "bt": 3
      }
     ]
    }
   ],
   "pr": [
    {
     "t": "Practice — VRR",
     "h": "After each block, record the leftover quantum (q − time used): that is the maximum the process may run when it is picked from the Aux queue.",
     "c": {
      "q": 3
     },
     "p": [
      {
       "n": "P₁",
       "at": 0,
       "bt": 7,
       "io": [
        2,
        2
       ]
      },
      {
       "n": "P₂",
       "at": 0,
       "bt": 5,
       "io": [
        1,
        3
       ]
      },
      {
       "n": "P₃",
       "at": 1,
       "bt": 4
      }
     ]
    }
   ],
   "defs": [
    {
     "k": "concept",
     "t": "I/O-bound process",
     "d": "A process with short CPU bursts that often leaves the CPU for I/O. Plain RR treats it unfairly because it rarely uses a whole quantum.",
     "s": "Galvin p.207"
    },
    {
     "k": "fix",
     "t": "Auxiliary queue",
     "d": "Processes returning from I/O wait here. It is served before the main queue, but each process runs only for the unused part of its quantum (q − time already used).",
     "s": "Stallings — not in Galvin §5.3"
    }
   ]
  },
  {
   "id": "prio",
   "name": "Priority",
   "full": "Priority Scheduling",
   "mode": "Non-preemptive / preemptive",
   "from": "galvin",
   "src": "§5.3.4, pp.211–214",
   "pick": "Smallest priority number",
   "rule": "A priority is associated with each process and the CPU is allocated to the highest-priority process; equal priorities are served FCFS (pp.211–212). In Galvin a <b>low number means high priority</b>. The simulator here runs the non-preemptive version.",
   "steps": [
    "Fix the convention: smaller number = higher priority (unless the question says otherwise).",
    "Whenever the CPU is free, look only at processes that have arrived and are not finished.",
    "Choose the smallest priority number; tie → earlier arrival (FCFS).",
    "Non-preemptive: run it to completion. Preemptive: re-check at every arrival and preempt if the newcomer has a higher priority.",
    "Compute CT, TAT, WT and the averages."
   ],
   "notes": [
    {
     "h": "Relation to SJF (p.212)",
     "items": [
      "SJF is the special case of priority scheduling where the priority is the <i>inverse</i> of the (predicted) next CPU burst: the longer the burst, the lower the priority."
     ]
    },
    {
     "h": "Number conventions (p.212)",
     "items": [
      "Priorities are fixed ranges such as 0 to 7 or 0 to 4,095. There is no general agreement whether 0 is the highest or the lowest priority; Galvin assumes low numbers = high priority."
     ]
    },
    {
     "h": "Internal vs external priorities (p.213)",
     "items": [
      "<b>Internal:</b> computed from measurable quantities — time limits, memory requirements, number of open files, ratio of average I/O burst to average CPU burst.",
      "<b>External:</b> set outside the OS — importance of the process, funds paid for computer use, the sponsoring department, and other (often political) factors."
     ]
    },
    {
     "h": "Preemptive or non-preemptive (p.213)",
     "items": [
      "When a process arrives, its priority is compared with the running process. Preemptive: the CPU is taken if the newcomer’s priority is higher. Non-preemptive: the newcomer is simply put at the head of the ready queue."
     ]
    },
    {
     "h": "Starvation and aging (p.213)",
     "items": [
      "<b>Indefinite blocking (starvation):</b> a steady stream of higher-priority processes can keep a low-priority process from ever getting the CPU. Anecdote: when the IBM 7094 at MIT was shut down in 1973, a low-priority process submitted in 1967 had not yet run.",
      "<b>Aging</b> gradually raises the priority of processes that wait a long time. Example: with priorities 127 (low) to 0 (high), raise a waiting process by 1 every second — a priority-127 process reaches priority 0 in a little over 2 minutes."
     ]
    },
    {
     "h": "Priority + Round Robin (pp.213–214)",
     "items": [
      "Run the highest-priority process; processes with the <i>same</i> priority share the CPU by Round Robin. See the second book example (q = 2)."
     ]
    }
   ],
   "pros": "Important processes are served first; SJF is just one choice of priority.",
   "cons": "Starvation of low-priority processes (cured by aging).",
   "exs": [
    {
     "t": "Galvin example — five processes at time 0",
     "s": "Galvin pp.212–213",
     "n": "All arrive at 0, so order purely by priority number: P₂ (1), P₅ (2), P₁ (3), P₃ (4), P₄ (5). Waiting times: P₁ 6, P₂ 0, P₃ 16, P₄ 18, P₅ 1 → book: average waiting time = 41/5 = 8.2 ms.",
     "p": [
      {
       "n": "P₁",
       "at": 0,
       "bt": 10,
       "pr": 3
      },
      {
       "n": "P₂",
       "at": 0,
       "bt": 1,
       "pr": 1
      },
      {
       "n": "P₃",
       "at": 0,
       "bt": 2,
       "pr": 4
      },
      {
       "n": "P₄",
       "at": 0,
       "bt": 1,
       "pr": 5
      },
      {
       "n": "P₅",
       "at": 0,
       "bt": 5,
       "pr": 2
      }
     ],
     "b": {
      "wt": 8.2,
      "g": [
       0,
       1,
       6,
       16,
       18,
       19
      ]
     }
    },
    {
     "t": "Galvin example — priority with Round Robin for equal priority (q = 2)",
     "s": "Galvin pp.213–214",
     "u": "prr",
     "n": "P₄ (priority 1) runs alone to completion (0–7). P₂ and P₃ (priority 2) alternate with q = 2 until P₂ finishes at 16; then P₃ is the highest-priority process and runs to completion (16–20). Finally P₁ and P₅ (priority 3) alternate until the end. The Gantt label Q# is the priority level.",
     "c": {
      "q": 2
     },
     "p": [
      {
       "n": "P₁",
       "at": 0,
       "bt": 4,
       "pr": 3
      },
      {
       "n": "P₂",
       "at": 0,
       "bt": 5,
       "pr": 2
      },
      {
       "n": "P₃",
       "at": 0,
       "bt": 8,
       "pr": 2
      },
      {
       "n": "P₄",
       "at": 0,
       "bt": 7,
       "pr": 1
      },
      {
       "n": "P₅",
       "at": 0,
       "bt": 3,
       "pr": 3
      }
     ],
     "b": {
      "g": [
       0,
       7,
       9,
       11,
       13,
       15,
       16,
       20,
       22,
       24,
       26,
       27
      ]
     }
    }
   ],
   "pr": [
    {
     "t": "Practice Q1 — Priority (non-preemptive)",
     "h": "At t = 0 only the process that has arrived can execute. Once a process starts, do not preempt it. Remember: priority 1 is higher than priority 4.",
     "p": [
      {
       "n": "P₀",
       "at": 0,
       "bt": 6,
       "pr": 3
      },
      {
       "n": "P₁",
       "at": 1,
       "bt": 4,
       "pr": 1
      },
      {
       "n": "P₂",
       "at": 2,
       "bt": 3,
       "pr": 4
      },
      {
       "n": "P₃",
       "at": 4,
       "bt": 5,
       "pr": 2
      }
     ]
    },
    {
     "t": "Practice Q2 — Priority (non-preemptive), 1 = highest",
     "h": "At every time the CPU becomes free, look only at the processes that have already arrived. Among them, select the one with the highest priority.",
     "p": [
      {
       "n": "P₁",
       "at": 0,
       "bt": 5,
       "pr": 2
      },
      {
       "n": "P₂",
       "at": 1,
       "bt": 3,
       "pr": 1
      },
      {
       "n": "P₃",
       "at": 3,
       "bt": 6,
       "pr": 4
      },
      {
       "n": "P₄",
       "at": 4,
       "bt": 2,
       "pr": 3
      },
      {
       "n": "P₅",
       "at": 6,
       "bt": 4,
       "pr": 1
      }
     ]
    }
   ],
   "defs": [
    {
     "k": "concept",
     "t": "Priority scheduling",
     "d": "A priority is associated with each process and the CPU is allocated to the highest-priority process; equal priorities are served FCFS. SJF is the special case where priority is the inverse of the predicted next burst. In this text, a <b>low number = high priority</b>.",
     "s": "Galvin pp.211–212"
    },
    {
     "k": "problem",
     "t": "Indefinite blocking (starvation)",
     "d": "A process that is ready to run but waits for the CPU indefinitely because a steady stream of higher-priority processes keeps arriving.",
     "s": "Galvin p.213"
    },
    {
     "k": "fix",
     "t": "Aging",
     "d": "Gradually increasing the priority of processes that wait in the system for a long time.",
     "s": "Galvin p.213"
    },
    {
     "k": "concept",
     "t": "Internal vs external priority",
     "d": "<b>Internal:</b> computed from measurable quantities (time limits, memory, open files, I/O-to-CPU burst ratio). <b>External:</b> set outside the OS (importance, funds paid, sponsoring department).",
     "s": "Galvin p.213"
    }
   ]
  },
  {
   "id": "mlq",
   "name": "Multilevel Queue",
   "full": "Multilevel Queue Scheduling",
   "mode": "Preemptive between queues",
   "from": "galvin",
   "src": "§5.3.5, pp.214–216",
   "pick": "Highest non-empty queue",
   "rule": "Separate queues (one per priority, or one per process type); a process stays in its queue; each queue may have its own algorithm; scheduling <i>between</i> the queues is commonly fixed-priority preemptive (pp.214–215).",
   "steps": [
    "Assign every process to its queue — it never changes.",
    "Serve the highest-priority non-empty queue, using that queue’s algorithm (RR with quantum q, or FCFS).",
    "A new arrival in a higher queue preempts a running process of a lower queue.",
    "A lower queue runs only when every higher queue is empty.",
    "Compute CT, TAT, WT and the averages. (A Q1 arrival at time t takes the CPU from a Q2 process immediately.)"
   ],
   "notes": [
    {
     "h": "One queue per priority (Figure 5.7, p.214)",
     "items": [
      "Keeping everything in one queue can need an O(n) search for the highest-priority process. Easier: a separate queue for each distinct priority; schedule from the highest non-empty queue.",
      "If the highest queue has several processes they run round-robin. In the most general form a process keeps its priority (and queue) for its whole runtime."
     ]
    },
    {
     "h": "One queue per process type (Figure 5.8, p.215)",
     "items": [
      "Common split: foreground (interactive) vs background (batch) — different response-time needs, so different scheduling; foreground may have (external) priority over background.",
      "Each queue has its own algorithm — e.g. foreground = RR, background = FCFS."
     ]
    },
    {
     "h": "Scheduling between the queues (pp.215–216)",
     "items": [
      "Commonly fixed-priority preemptive: e.g. the real-time queue has absolute priority over the interactive queue.",
      "Book’s four queues, highest to lowest: real-time, system, interactive, batch. A batch process cannot run unless the other three are empty, and a running batch process is preempted if an interactive process enters.",
      "Alternative: time-slice among the queues — e.g. 80 % of the CPU time to the foreground RR queue and 20 % to the background FCFS queue."
     ]
    }
   ],
   "pros": "Different classes of processes get different policies; low scheduling overhead (p.216).",
   "cons": "Inflexible — processes never move between queues (p.216); lower queues wait whenever higher ones are busy.",
   "exs": [
    {
     "t": "Illustration of Galvin’s four-queue scenario (our numbers — the book gives rules only)",
     "s": "illustration of Galvin pp.215–216",
     "n": "P₁ = batch (Q4, FCFS), P₂ = interactive (Q3, RR q = 2), P₃ = system (Q2, FCFS), P₄ = real-time (Q1, FCFS). The batch process starts alone; the interactive arrival at 2 preempts it; the system arrival at 4 beats the interactive queue; the real-time arrival at 5 preempts the system process. Batch gets the CPU back only when Q1–Q3 are empty (t = 8). The burst values are invented for demonstration.",
     "c": {
      "qs": [
       null,
       null,
       2,
       null
      ]
     },
     "p": [
      {
       "n": "P₁",
       "at": 0,
       "bt": 6,
       "q": 4
      },
      {
       "n": "P₂",
       "at": 2,
       "bt": 3,
       "q": 3
      },
      {
       "n": "P₃",
       "at": 4,
       "bt": 2,
       "q": 2
      },
      {
       "n": "P₄",
       "at": 5,
       "bt": 1,
       "q": 1
      }
     ]
    }
   ],
   "pr": [
    {
     "t": "Practice Q3 — Multilevel Queue (Q1: RR q = 2, Q2: FCFS)",
     "h": "Think of two separate ready queues. First serve Q1 (RR, q = 2). Q2 runs only when Q1 is empty. P₄ arrives at t = 3 and joins the tail of Q1: behind P₁ (re-queued at t = 2) but ahead of P₂ (re-queued at t = 4).",
     "c": {
      "qs": [
       2,
       null
      ]
     },
     "p": [
      {
       "n": "P₁",
       "at": 0,
       "bt": 5,
       "q": 1
      },
      {
       "n": "P₂",
       "at": 0,
       "bt": 4,
       "q": 1
      },
      {
       "n": "P₃",
       "at": 0,
       "bt": 7,
       "q": 2
      },
      {
       "n": "P₄",
       "at": 3,
       "bt": 3,
       "q": 1
      }
     ]
    },
    {
     "t": "Practice Q4 — Multilevel Queue (Q1: RR q = 3, Q2: FCFS)",
     "h": "Keep two ready queues. While Q1 holds any process, Q2 must wait. Q1 (q = 3) is never empty before t = 15 (P₁, P₂ and P₅ together need 15 ms), so P₃ and P₄ in Q2 only start at t = 15; P₅ (arrives at t = 5) simply joins the tail of Q1.",
     "c": {
      "qs": [
       3,
       null
      ]
     },
     "p": [
      {
       "n": "P₁",
       "at": 0,
       "bt": 7,
       "q": 1
      },
      {
       "n": "P₂",
       "at": 1,
       "bt": 5,
       "q": 1
      },
      {
       "n": "P₃",
       "at": 0,
       "bt": 8,
       "q": 2
      },
      {
       "n": "P₄",
       "at": 2,
       "bt": 4,
       "q": 2
      },
      {
       "n": "P₅",
       "at": 5,
       "bt": 3,
       "q": 1
      }
     ]
    }
   ],
   "defs": [
    {
     "k": "concept",
     "t": "Multilevel queue",
     "d": "Separate queues for each distinct priority (or process type); the scheduler serves the highest non-empty queue. In the general form a process stays in the same queue for its whole runtime.",
     "s": "Galvin p.214"
    },
    {
     "k": "concept",
     "t": "Foreground / background",
     "d": "Interactive (foreground) vs batch (background) processes: different response-time needs, so separate queues, each with its own algorithm (e.g. RR and FCFS). Foreground may have priority.",
     "s": "Galvin p.215"
    },
    {
     "k": "concept",
     "t": "Scheduling among the queues",
     "d": "Commonly fixed-priority preemptive (a higher queue has absolute priority); the alternative is time-slicing, e.g. 80 % CPU to the foreground RR queue, 20 % to the background FCFS queue.",
     "s": "Galvin pp.215–216"
    }
   ]
  },
  {
   "id": "mlfq",
   "name": "Multilevel Feedback Queue",
   "full": "Multilevel Feedback Queue Scheduling",
   "mode": "Preemptive",
   "from": "galvin",
   "src": "§5.3.6, pp.216–217",
   "pick": "Highest queue; demote after full quantum",
   "rule": "Like a multilevel queue, but a process may <i>move between queues</i>: a process that uses too much CPU time is moved to a lower-priority queue; one that waits too long in a lower queue may be moved up (aging) (p.216).",
   "steps": [
    "Every process enters the top queue (Q1 here; Galvin numbers the queues from 0).",
    "Serve the highest non-empty queue with that queue’s quantum (RR); the last queue is FCFS.",
    "If the process finishes within its quantum it leaves; if it uses the whole quantum and is unfinished it is demoted to the <b>tail</b> of the next queue.",
    "A new arrival in a higher queue preempts a running process of a lower queue (the preempted process resumes at the head of its queue with a fresh quantum in this simulator).",
    "Keep a table (process, remaining BT, queue), update it after every slice; then CT, TAT, WT, averages."
   ],
   "notes": [
    {
     "h": "The idea (p.216)",
     "items": [
      "Separate processes by the characteristics of their CPU bursts: CPU hogs sink; I/O-bound and interactive processes (short bursts) stay in the high-priority queues.",
      "Aging: a process that waits too long in a lower queue may be moved up, which prevents starvation.",
      "Multilevel queue has low scheduling overhead but is inflexible; MLFQ is the flexible alternative."
     ]
    },
    {
     "h": "Galvin’s three-queue example (Figure 5.9, pp.216–217)",
     "items": [
      "Queues 0, 1, 2. Queue 0 runs first; queue 1 only when queue 0 is empty; queue 2 only when queues 0 and 1 are empty. A process arriving for queue 1 preempts one in queue 2; a process arriving for queue 0 preempts one in queue 1.",
      "An entering process goes to queue 0 with a quantum of 8 ms. If unfinished it moves to the tail of queue 1 (quantum 16 ms); if still unfinished it goes to queue 2, which is FCFS.",
      "Consequences: bursts of 8 ms or less get the highest priority; bursts above 8 but below 24 ms are also served quickly (lower priority); long processes sink to queue 2 and use the CPU cycles left over from queues 0 and 1."
     ]
    },
    {
     "h": "What defines an MLFQ scheduler (p.217)",
     "items": [
      "The number of queues; the scheduling algorithm of each queue; when to upgrade a process; when to demote a process; which queue a process enters when it needs service.",
      "It is the most general CPU-scheduling algorithm — configurable to a system — and also the most complex, because choosing good values for all parameters is hard."
     ]
    },
    {
     "h": "What this simulator models",
     "items": [
      "Demotion after a full quantum, and preemption by a higher queue (resumes at the head of its queue with a fresh quantum).",
      "Galvin’s <b>aging</b> (moving a long-waiting process up, p.216) is described in the notes but <b>not</b> simulated, so examples never promote a process."
     ]
    }
   ],
   "pros": "Adapts to process behaviour: short and interactive work finishes in the upper queues; aging prevents starvation.",
   "cons": "The most complex algorithm — many parameters must be chosen (p.217).",
   "exs": [
    {
     "t": "Illustration of Galvin’s scheme: Q0 q = 8, Q1 q = 16, Q2 FCFS (our bursts — the book gives rules only)",
     "s": "illustration of Galvin p.217",
     "n": "P₁ = 5 ms (≤ 8) finishes in Q1 at once. P₂ = 20 ms (between 8 and 24): 8 ms in Q1, then the remaining 12 ms in Q2 (quantum 16) and it finishes there. P₃ = 30 ms: 8 in Q1, 16 in Q2, and the last 6 ms sink to Q3 (FCFS). The ‘Queues visited’ column shows this. (Queues are numbered 1–3 here; Galvin numbers them 0–2.)",
     "c": {
      "qs": [
       8,
       16,
       null
      ]
     },
     "p": [
      {
       "n": "P₁",
       "at": 0,
       "bt": 5
      },
      {
       "n": "P₂",
       "at": 0,
       "bt": 20
      },
      {
       "n": "P₃",
       "at": 0,
       "bt": 30
      }
     ]
    }
   ],
   "pr": [
    {
     "t": "Practice Q5 — MLFQ (Q1: RR q = 2, Q2: RR q = 4, Q3: FCFS)",
     "h": "Start everyone in Q1. Q1: run at most 2 units → if unfinished → Q2: at most 4 units → if still unfinished → Q3 (FCFS). Track the remaining burst after every quantum.",
     "c": {
      "qs": [
       2,
       4,
       null
      ]
     },
     "p": [
      {
       "n": "P₁",
       "at": 0,
       "bt": 6
      },
      {
       "n": "P₂",
       "at": 0,
       "bt": 5
      },
      {
       "n": "P₃",
       "at": 1,
       "bt": 8
      },
      {
       "n": "P₄",
       "at": 2,
       "bt": 3
      }
     ]
    },
    {
     "t": "Practice Q6 — MLFQ (Q1: RR q = 3, Q2: RR q = 5, Q3: FCFS)",
     "h": "Keep a small table (process, remaining BT, current queue) and update it after every quantum. Higher-priority queues always run before lower ones.",
     "c": {
      "qs": [
       3,
       5,
       null
      ]
     },
     "p": [
      {
       "n": "P₁",
       "at": 0,
       "bt": 10
      },
      {
       "n": "P₂",
       "at": 0,
       "bt": 4
      },
      {
       "n": "P₃",
       "at": 0,
       "bt": 12
      },
      {
       "n": "P₄",
       "at": 1,
       "bt": 6
      }
     ]
    }
   ],
   "defs": [
    {
     "k": "concept",
     "t": "Multilevel feedback queue",
     "d": "Like a multilevel queue, but a process may <i>move between queues</i>. Too much CPU time → moved to a lower-priority queue; I/O-bound and interactive processes stay in the high-priority queues.",
     "s": "Galvin p.216"
    },
    {
     "k": "fix",
     "t": "Aging (promotion)",
     "d": "A process that waits too long in a lower-priority queue may be moved to a higher-priority queue, which prevents starvation.",
     "s": "Galvin p.216"
    },
    {
     "k": "concept",
     "t": "The five MLFQ parameters",
     "d": "Number of queues · scheduling algorithm of each queue · when to upgrade a process · when to demote a process · which queue a process enters when it needs service.",
     "s": "Galvin p.217"
    }
   ]
  }
 ],
 "pred": {
  "a": 0.5,
  "tau0": 10,
  "t": [
   6,
   4,
   6,
   4,
   13,
   13,
   13
  ],
  "book": [
   10,
   8,
   6,
   6,
   5,
   9,
   11,
   12
  ]
 },
 "sweep": {
  "p": [
   {
    "n": "P₁",
    "at": 0,
    "bt": 6
   },
   {
    "n": "P₂",
    "at": 0,
    "bt": 3
   },
   {
    "n": "P₃",
    "at": 0,
    "bt": 1
   },
   {
    "n": "P₄",
    "at": 0,
    "bt": 7
   }
  ],
  "qs": [
   1,
   2,
   3,
   4,
   5,
   6,
   7
  ]
 },
 "formulas_note": "TAT, WT, CT and AT are the course’s shorthand; Galvin defines the same quantities in words on p.205 (turnaround = waiting + executing + I/O; waiting = time in the ready queue).",
 "defs": [
  {
   "k": "concept",
   "t": "Ready queue",
   "d": "The queue of processes that are ready to run and waiting for the CPU. CPU scheduling decides which of them is allocated the CPU’s core.",
   "s": "Galvin pp.205–206"
  },
  {
   "k": "concept",
   "t": "CPU burst",
   "d": "The stretch of time a process uses the CPU before it next waits (for example for I/O) or ends. Galvin’s examples give one CPU burst, in ms, per process.",
   "s": "Galvin p.205"
  },
  {
   "k": "concept",
   "t": "Gantt chart",
   "d": "A bar chart that illustrates a particular schedule, including the start and finish time of each participating process.",
   "s": "Galvin p.206"
  },
  {
   "k": "concept",
   "t": "Non-preemptive scheduling",
   "d": "Once the CPU has been allocated to a process, the process keeps it until it releases it — by terminating or by requesting I/O.",
   "s": "Galvin p.207"
  },
  {
   "k": "concept",
   "t": "Preemptive scheduling",
   "d": "The scheduler can take the CPU away from the running process — when a better process arrives, or when the time quantum expires.",
   "s": "Galvin pp.209–210, 213"
  },
  {
   "k": "concept",
   "t": "Context switch",
   "d": "Switching the CPU from one process to another. In Round Robin the timer interrupt makes the OS do a context switch and the process goes to the tail of the ready queue.",
   "s": "Galvin p.210"
  },
  {
   "k": "metric",
   "t": "Arrival time (AT)",
   "d": "Clock time at which the process enters the ready queue.",
   "s": "Course notation"
  },
  {
   "k": "metric",
   "t": "Burst time (BT)",
   "d": "CPU time the process needs — the “Burst Time” column in Galvin’s tables.",
   "s": "Galvin p.206"
  },
  {
   "k": "metric",
   "t": "Completion time (CT)",
   "d": "Clock time at which the process finishes = the number at the right edge of its last Gantt block.",
   "s": "Course notation"
  },
  {
   "k": "metric",
   "t": "Turnaround time (TAT)",
   "d": "Interval from submission of a process to its completion = time waiting in the ready queue + executing on the CPU + doing I/O.<br><b>TAT = CT − AT</b>",
   "s": "Galvin p.205"
  },
  {
   "k": "metric",
   "t": "Waiting time (WT)",
   "d": "Sum of the periods the process spends waiting in the ready queue. The scheduler does not change execution or I/O time.<br><b>WT = TAT − BT</b> (− I/O time if the process does I/O)",
   "s": "Galvin p.205"
  },
  {
   "k": "metric",
   "t": "Response time",
   "d": "Time from the submission of a request until the <i>first</i> response is produced — not until the output is finished.",
   "s": "Galvin p.205"
  },
  {
   "k": "metric",
   "t": "Throughput",
   "d": "Number of processes completed per time unit (tens per second for short transactions; one per several seconds for long processes).",
   "s": "Galvin p.205"
  },
  {
   "k": "metric",
   "t": "CPU utilization",
   "d": "How busy the CPU is kept; the goal is to keep it as busy as possible.",
   "s": "Galvin p.204"
  }
 ]
};
if(typeof window!=='undefined')window.DATA=DATA;
if(typeof module!=='undefined')module.exports=DATA;
