# Operating System · IC3012301 · Fall 2026 — Chapter 8: Deadlocks (lecture notes)

Same layout, light theme and teaching style as the *CPU Scheduling* notes (Chapter 5): an **Overview** page plus one tab per topic, each with
**📖 Lecture notes · 🧪 Examples · ✏️ Practice + solution**.

## Run
Open `index.html` in a browser (works from `file://`; needs internet once for the Bootstrap and D3 CDNs).
For GitHub Pages: push the folder and enable Pages — no build step.

 

## Tabs
Overview · System Model (Coffman conditions, mutex/semaphore code, livelock) · RAG (+ wait-for graph) · Prevention (lock ordering) ·
Avoidance (safe state, claim edges, Banker’s algorithm, request algorithm) · Detection · Recovery.

## Notes
*  **drag nodes** to rearrange. Edges on a cycle turn red; deadlocked processes get a red outline; “what-if” buttons add the request that closes a cycle.
* Every verdict (safe / unsafe, deadlock / none, grant / deny) is **computed**, not typed in.
* Sources: Silberschatz, Galvin & Gagne, *Operating System Concepts* (10th ed.), Chapter 8 (textbook page numbers in the Overview), and the lecture slides *Deadlocks – Ch. 8* (figures reproduced; slide numbers are not quoted).
  The lecture’s detection example has a Resource row that does not match its Allocation column; the page recomputes it and says so.
* Figures use the textbook layout (blue circles = processes, grey rectangles = resource types, ● = instance). **🔀 Force layout** switches to a D3 force simulation.
* Simulators (Banker’s safety / request algorithm, detection, graph reduction, claim-edge life-cycle) advance **one calculation per click**: ◀ Prev · Next ▶ · ⏩ Next pick · All ⏭.
