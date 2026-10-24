/**
 * RoomPilot - Algorithmic Scheduling Insights Component
 * Coordinates UI interactions for Priority Queue, Greedy, DP, Matching, and Interval Tree.
 */

const Algorithms = (() => {
  let pendingRequests = [];

  async function loadPendingRequests() {
    try {
      const res = await fetch('/api/requests');
      if (!res.ok) throw new Error('Failed to load pending requests');
      pendingRequests = await res.json();
      renderQueueTable();
    } catch (err) {
      console.error(err);
    }
  }

  function renderQueueTable() {
    const tbody = document.getElementById('queue-table-body');
    const countBadge = document.getElementById('pending-queue-count');
    if (!tbody) return;

    if (countBadge) countBadge.textContent = `${pendingRequests.length} Requests`;

    if (pendingRequests.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No pending booking requests.</td></tr>';
      return;
    }

    tbody.innerHTML = pendingRequests.map(req => {
      const pColor = req.priority >= 4 ? 'badge-amber' : (req.priority >= 3 ? 'badge-violet' : 'badge-neutral');
      return `
        <tr>
          <td><code>${req.id}</code></td>
          <td>
            <strong>${req.title}</strong>
            <div style="font-size:0.72rem; color:var(--text-muted);">${req.organizer}</div>
          </td>
          <td>${req.start_time} - ${req.end_time}</td>
          <td>${req.required_capacity} seats</td>
          <td><span class="badge ${pColor}">Priority ${req.priority}</span></td>
          <td><span class="status-pill available">${req.status}</span></td>
        </tr>
      `;
    }).join('');
  }

  async function executePriorityQueueDispatch() {
    const streamContainer = document.getElementById('pq-dispatch-results');
    streamContainer.innerHTML = '<div class="empty-state">Running binary heap dispatch...</div>';

    try {
      const res = await fetch('/api/algorithms/priority-queue/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: pendingRequests })
      });
      if (!res.ok) throw new Error('Dispatch failed');
      const data = await res.json();

      if (data.dispatch_order.length === 0) {
        streamContainer.innerHTML = '<div class="empty-state">No items dispatched.</div>';
        return;
      }

      streamContainer.innerHTML = data.dispatch_order.map((item, idx) => {
        const pBadge = item.priority >= 4 ? 'badge-amber' : (item.priority >= 3 ? 'badge-violet' : 'badge-neutral');
        return `
          <div class="dispatch-item">
            <span class="dispatch-rank">#${idx + 1}</span>
            <div class="dispatch-content">
              <div class="dispatch-title">${item.title}</div>
              <div class="dispatch-meta">${item.id} &bull; ${item.start_time} - ${item.end_time} &bull; Org: ${item.organizer}</div>
            </div>
            <span class="badge ${pBadge}">Priority ${item.priority}</span>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error(err);
      App.showToast('Failed to execute priority queue dispatch', 'error');
    }
  }

  // --- Greedy Scheduling ---
  const defaultGreedyCandidates = [
    { id: 'REQ-G1', title: 'All-Day Architecture Bootcamp', start_time: '08:30', end_time: '17:00', priority: 3 },
    { id: 'REQ-G2', title: 'Morning Standup', start_time: '09:00', end_time: '10:00', priority: 4 },
    { id: 'REQ-G3', title: 'Design System Review', start_time: '10:30', end_time: '12:00', priority: 3 },
    { id: 'REQ-G4', title: 'Client Roadmap Demo', start_time: '13:00', end_time: '14:30', priority: 5 },
    { id: 'REQ-G5', title: 'Sprint Retrospective', start_time: '15:00', end_time: '16:30', priority: 4 },
  ];

  function initGreedyView() {
    const list = document.getElementById('greedy-candidate-list');
    if (!list) return;
    list.innerHTML = defaultGreedyCandidates.map(c => `
      <div class="candidate-item">
        <div>
          <strong>${c.title}</strong>
          <div style="font-size:0.72rem; color:var(--text-muted);">${c.id} &bull; ${c.start_time} - ${c.end_time}</div>
        </div>
        <span class="badge badge-neutral">Priority ${c.priority}</span>
      </div>
    `).join('');
  }

  async function runGreedySchedule() {
    const output = document.getElementById('greedy-output-container');
    const badge = document.getElementById('greedy-metric-badge');
    output.innerHTML = '<div class="empty-state">Evaluating interval compatibility...</div>';

    try {
      const res = await fetch('/api/algorithms/greedy-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates: defaultGreedyCandidates })
      });
      const data = await res.json();

      badge.textContent = `${data.total_selected} Selected / ${data.total_rejected} Rejected`;

      const selectedHtml = data.selected.map(s => `
        <div class="candidate-item" style="border-left: 3px solid #10b981;">
          <div>
            <strong class="text-teal">${s.title}</strong>
            <div style="font-size:0.72rem; color:var(--text-muted);">${s.id} &bull; ${s.start_time} - ${s.end_time}</div>
          </div>
          <span class="badge badge-teal">SCHEDULED</span>
        </div>
      `).join('');

      const rejectedHtml = data.rejected.map(r => `
        <div class="candidate-item" style="opacity: 0.6; border-left: 3px solid #ef4444;">
          <div>
            <span style="color:var(--text-muted); text-decoration: line-through;">${r.title}</span>
            <div style="font-size:0.72rem; color:var(--text-muted);">${r.id} &bull; ${r.start_time} - ${r.end_time}</div>
          </div>
          <span class="badge badge-neutral" style="color:#ef4444;">REJECTED</span>
        </div>
      `).join('');

      output.innerHTML = selectedHtml + rejectedHtml;
    } catch (err) {
      console.error(err);
      App.showToast('Greedy scheduling failed', 'error');
    }
  }

  // --- Weighted DP Scheduling ---
  const defaultWeightedCandidates = [
    { id: 'W-REQ-1', title: 'Morning Strategy Kickoff', start_time: '09:00', end_time: '10:00', weight: 15 },
    { id: 'W-REQ-2', title: 'Executive Investor Pitch', start_time: '10:00', end_time: '11:30', weight: 25 },
    { id: 'W-REQ-3', title: 'Conflicting Cross-Team Sync', start_time: '09:30', end_time: '10:45', weight: 30 },
    { id: 'W-REQ-4', title: 'Afternoon Tech Deep Dive', start_time: '11:30', end_time: '13:00', weight: 20 },
  ];

  function initWeightedView() {
    const list = document.getElementById('weighted-candidate-list');
    if (!list) return;
    list.innerHTML = defaultWeightedCandidates.map(c => `
      <div class="candidate-item">
        <div>
          <strong>${c.title}</strong>
          <div style="font-size:0.72rem; color:var(--text-muted);">${c.id} &bull; ${c.start_time} - ${c.end_time}</div>
        </div>
        <span class="badge badge-amber">Weight: ${c.weight}</span>
      </div>
    `).join('');
  }

  async function runWeightedSchedule() {
    const output = document.getElementById('weighted-output-container');
    const badge = document.getElementById('weighted-metric-badge');
    output.innerHTML = '<div class="empty-state">Computing Bellman recurrence...</div>';

    try {
      const res = await fetch('/api/algorithms/weighted-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates: defaultWeightedCandidates })
      });
      const data = await res.json();

      badge.textContent = `Optimal Score: ${data.total_weight}`;

      const selectedHtml = data.selected.map(s => `
        <div class="candidate-item" style="border-left: 3px solid #f59e0b;">
          <div>
            <strong class="text-amber">${s.title}</strong>
            <div style="font-size:0.72rem; color:var(--text-muted);">${s.id} &bull; ${s.start_time} - ${s.end_time}</div>
          </div>
          <span class="badge badge-amber">+${s.weight} Score</span>
        </div>
      `).join('');

      const dpSummaryHtml = `
        <div style="margin-top: 12px; padding: 10px; background: rgba(8,9,14,0.6); border-radius: 6px; font-size: 0.75rem; font-family: var(--font-mono); color: var(--text-secondary);">
          <div>DP Table [OPT(j)]: [${data.dp_table.join(', ')}]</div>
          <div>Predecessors [p(j)]: [${data.predecessors.join(', ')}]</div>
        </div>
      `;

      output.innerHTML = selectedHtml + dpSummaryHtml;
    } catch (err) {
      console.error(err);
      App.showToast('Weighted DP computation failed', 'error');
    }
  }

  // --- Bipartite Matching ---
  const defaultMatchingRequests = [
    { id: 'M-REQ-1', title: 'Customer Success Sync', required_capacity: 12, allowed_rooms: ['ROOM-101', 'ROOM-102'] },
    { id: 'M-REQ-2', title: 'VIP Board Meeting', required_capacity: 18, allowed_rooms: ['ROOM-101'] },
    { id: 'M-REQ-3', title: 'UX Research Group', required_capacity: 8, allowed_rooms: ['ROOM-102', 'ROOM-103'] },
  ];

  function initMatchingView() {
    const container = document.getElementById('matching-matrix-container');
    if (!container) return;
    container.innerHTML = defaultMatchingRequests.map(r => `
      <div class="candidate-item">
        <div>
          <strong>${r.title}</strong> (${r.id})
          <div style="font-size:0.72rem; color:var(--text-muted);">Compatible Suites: <code>${r.allowed_rooms.join(', ')}</code></div>
        </div>
      </div>
    `).join('');
  }

  async function runBipartiteMatching() {
    const output = document.getElementById('matching-output-container');
    const badge = document.getElementById('matching-metric-badge');
    output.innerHTML = '<div class="empty-state">Searching augmenting paths...</div>';

    try {
      const res = await fetch('/api/algorithms/bipartite-matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: defaultMatchingRequests })
      });
      const data = await res.json();

      badge.textContent = `${data.matched_count} / ${defaultMatchingRequests.length} Assigned`;

      const assignmentsHtml = Object.entries(data.assignments).map(([reqId, roomId]) => {
        const reqObj = defaultMatchingRequests.find(r => r.id === reqId);
        return `
          <div class="candidate-item" style="border-left: 3px solid #84f82a;">
            <div>
              <strong class="text-violet">${reqObj ? reqObj.title : reqId}</strong>
              <div style="font-size:0.72rem; color:var(--text-muted);">Assigned to <code>${roomId}</code></div>
            </div>
            <span class="badge badge-violet">MATCHED &rarr; ${roomId}</span>
          </div>
        `;
      }).join('');

      const unassignedHtml = data.unassigned_requests.map(u => `
        <div class="candidate-item" style="opacity: 0.6; border-left: 3px solid #ef4444;">
          <div>
            <span style="color:#ef4444;">${u.title} (${u.id})</span>
            <div style="font-size:0.72rem; color:var(--text-muted);">No room could be assigned</div>
          </div>
          <span class="badge badge-neutral" style="color:#ef4444;">UNASSIGNED</span>
        </div>
      `).join('');

      output.innerHTML = assignmentsHtml + (unassignedHtml || '');
    } catch (err) {
      console.error(err);
      App.showToast('Bipartite matching failed', 'error');
    }
  }

  // --- Interval Tree Conflict Inspector ---
  async function queryIntervalConflicts() {
    const roomId = document.getElementById('conflict-room-select').value;
    const startTime = document.getElementById('conflict-start-time').value;
    const endTime = document.getElementById('conflict-end-time').value;
    const resultsBox = document.getElementById('conflict-results-box');

    resultsBox.innerHTML = '<div class="empty-state">Querying interval tree nodes...</div>';

    try {
      const res = await fetch('/api/algorithms/interval-conflict-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomId, start_time: startTime, end_time: endTime })
      });
      const data = await res.json();

      if (!data.has_conflict) {
        resultsBox.innerHTML = `
          <div style="padding: 20px; text-align:center;">
            <div style="font-size: 2rem; margin-bottom: 8px;">🟢</div>
            <h3 style="color: #34d399; margin-bottom: 4px;">No Booking Conflicts Detected</h3>
            <p style="font-size: 0.84rem; color: var(--text-secondary);">
              Interval tree query for [${data.query_range[0]} - ${data.query_range[1]}) in <code>${data.room_id}</code> returned 0 overlaps. Room is ready for reservation!
            </p>
          </div>
        `;
      } else {
        const conflictsHtml = data.conflicts.map(c => `
          <div class="candidate-item" style="border-left: 3px solid #ef4444; margin-top: 8px;">
            <div>
              <strong style="color: #ef4444;">${c.title}</strong>
              <div style="font-size:0.72rem; color:var(--text-muted);">
                Scheduled: <code>${c.start_time} - ${c.end_time}</code> &bull; Organizer: ${c.organizer}
              </div>
            </div>
            <span class="badge badge-neutral" style="color:#ef4444;">OVERLAP DETECTED</span>
          </div>
        `).join('');

        resultsBox.innerHTML = `
          <div style="margin-bottom: 12px;">
            <h3 style="color: #ef4444;">⚠️ Conflict Detected (${data.conflict_count} Overlap${data.conflict_count > 1 ? 's' : ''})</h3>
            <p style="font-size: 0.82rem; color: var(--text-secondary);">
              The proposed time range [${data.query_range[0]} - ${data.query_range[1]}) clashes with existing reservations in <code>${data.room_id}</code>:
            </p>
          </div>
          ${conflictsHtml}
        `;
      }
    } catch (err) {
      console.error(err);
      App.showToast('Interval tree query failed', 'error');
    }
  }

  function initSubtabs() {
    document.querySelectorAll('.algo-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.algo-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.algo-subpanel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const sub = btn.dataset.sub;
        const panel = document.getElementById(`subpanel-${sub}`);
        if (panel) panel.classList.add('active');
      });
    });

    initGreedyView();
    initWeightedView();
    initMatchingView();
  }

  return {
    loadPendingRequests,
    executePriorityQueueDispatch,
    runGreedySchedule,
    runWeightedSchedule,
    runBipartiteMatching,
    queryIntervalConflicts,
    initSubtabs
  };
})();
