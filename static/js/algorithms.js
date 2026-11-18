/**
 * RoomPilot - Resource Allocation & Operational Monitoring Component
 * Enterprise SaaS Workflows: Priority Queue Dispatch, Capacity Optimization,
 * Strategic DP Value Planning, Multi-Room Matching, and Interval Conflict Auditing.
 */

const Algorithms = (() => {
  let pendingRequests = [];

  // Default candidate datasets used by business optimizers
  const greedyCandidates = [
    { id: 'RES-A', title: 'Executive Planning Workshop', start_time: '09:00', end_time: '12:00', priority: 4 },
    { id: 'RES-B', title: 'Morning Standup', start_time: '09:30', end_time: '10:30', priority: 3 },
    { id: 'RES-C', title: 'Design System Sync', start_time: '10:30', end_time: '11:30', priority: 3 },
    { id: 'RES-D', title: 'Product Architecture Review', start_time: '11:30', end_time: '12:30', priority: 4 },
  ];

  const weightedCandidates = [
    { id: 'REQ-01', title: 'Morning Strategy Kickoff', start_time: '09:00', end_time: '10:00', weight: 20 },
    { id: 'REQ-02', title: 'Executive Investor Pitch', start_time: '09:30', end_time: '11:00', weight: 35 },
    { id: 'REQ-03', title: 'Conflicting Cross-Team Sync', start_time: '10:00', end_time: '11:30', weight: 15 },
    { id: 'REQ-04', title: 'Product Architecture Review', start_time: '11:00', end_time: '12:30', weight: 25 },
    { id: 'REQ-05', title: 'Leadership Retrospective', start_time: '11:30', end_time: '13:00', weight: 40 },
  ];

  const matchingRequests = [
    { id: 'M-REQ-1', title: 'Customer Success Sync', required_capacity: 12, allowed_rooms: ['ROOM-101', 'ROOM-102'] },
    { id: 'M-REQ-2', title: 'VIP Board Meeting', required_capacity: 18, allowed_rooms: ['ROOM-101'] },
    { id: 'M-REQ-3', title: 'UX Research Group', required_capacity: 8, allowed_rooms: ['ROOM-102', 'ROOM-103'] },
  ];

  async function loadPendingRequests() {
    try {
      const res = await fetch('/api/requests');
      if (!res.ok) throw new Error('Failed to load pending requests');
      pendingRequests = await res.json();
      renderAllocationPendingTable();
    } catch (err) {
      console.error('Failed to load requests:', err);
    }
  }

  function switchSubtab(subId) {
    document.querySelectorAll('.workflow-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.sub === subId);
    });
    document.querySelectorAll('.workflow-panel').forEach(p => {
      p.classList.toggle('active', p.id === `wpanel-${subId}`);
    });
    if (subId === 'cardinality') renderGreedyCandidates();
    if (subId === 'strategic') renderWeightedCandidates();
    if (subId === 'matching') renderMatchingMatrix();
  }

  function initSubtabs() {
    // Setup allocation workflow subtabs with delegated and direct listeners
    const subtabs = document.querySelectorAll('.workflow-tab-btn');
    subtabs.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        switchSubtab(btn.dataset.sub);
      });
    });

    // Populate candidate lists
    renderGreedyCandidates();
    renderWeightedCandidates();
    renderMatchingMatrix();

    // Wire operational action buttons
    const btnPq = document.getElementById('btn-exec-pq-dispatch');
    if (btnPq) btnPq.addEventListener('click', executePriorityQueueDispatch);

    const btnGreedy = document.getElementById('btn-exec-greedy-opt');
    if (btnGreedy) btnGreedy.addEventListener('click', runGreedySchedule);

    const btnWeighted = document.getElementById('btn-exec-weighted-opt');
    if (btnWeighted) btnWeighted.addEventListener('click', runWeightedSchedule);

    const btnMatching = document.getElementById('btn-exec-matching-opt');
    if (btnMatching) btnMatching.addEventListener('click', runBipartiteMatching);

    const btnAudit = document.getElementById('btn-audit-check-conflicts');
    if (btnAudit) btnAudit.addEventListener('click', queryIntervalConflicts);
  }

  function renderAllocationPendingTable() {
    const tbody = document.getElementById('alloc-pending-tbody');
    const badge = document.getElementById('alloc-pending-count');
    const dashBadge = document.getElementById('dash-pending-badge');
    const navAllocBadge = document.getElementById('nav-badge-alloc-count');

    if (badge) badge.textContent = `${pendingRequests.length} Requests`;
    if (dashBadge) dashBadge.textContent = `${pendingRequests.length} Pending`;
    if (navAllocBadge) navAllocBadge.textContent = pendingRequests.length;

    if (!tbody) return;

    if (pendingRequests.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No pending booking requests.</td></tr>';
      return;
    }

    tbody.innerHTML = pendingRequests.map(req => {
      const pColor = req.priority >= 4 ? 'badge-amber' : (req.priority >= 3 ? 'badge-blue' : 'badge-neutral');
      return `
        <tr>
          <td><code>${req.id}</code></td>
          <td>
            <strong>${req.title}</strong>
            <div style="font-size:0.7rem; color:var(--text-muted);">${req.organizer}</div>
          </td>
          <td><span style="font-family:var(--font-mono); font-size:0.75rem;">${req.start_time} - ${req.end_time}</span></td>
          <td>${req.required_capacity} seats</td>
          <td><span class="badge ${pColor}">Priority ${req.priority}</span></td>
        </tr>
      `;
    }).join('');
  }

  async function executePriorityQueueDispatch() {
    const container = document.getElementById('alloc-dispatch-results');
    if (!container) return;
    container.innerHTML = '<div class="empty-state"><div class="empty-state-title">Processing queue...</div></div>';

    try {
      if (!pendingRequests || pendingRequests.length === 0) {
        const resPending = await fetch('/api/requests');
        if (resPending.ok) {
          pendingRequests = await resPending.json();
          renderAllocationPendingTable();
        }
      }

      const res = await fetch('/api/algorithms/priority-queue/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: pendingRequests && pendingRequests.length > 0 ? pendingRequests : undefined })
      });
      if (!res.ok) throw new Error('Dispatch failed');
      const data = await res.json();

      if (!data.dispatch_order || data.dispatch_order.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-title">No items dispatched.</div></div>';
        return;
      }

      container.innerHTML = data.dispatch_order.map((item, idx) => {
        const pColor = item.priority >= 4 ? 'badge-amber' : (item.priority >= 3 ? 'badge-blue' : 'badge-neutral');
        return `
          <div style="display:flex; align-items:center; gap:12px; padding:10px 12px; background:var(--surface-subtle); border:1px solid var(--border-light); border-radius:var(--radius-sm); margin-bottom:8px;">
            <span style="font-weight:700; font-size:0.85rem; color:var(--primary); min-width:24px;">#${idx + 1}</span>
            <div style="flex:1;">
              <div style="font-weight:600; font-size:0.82rem;">${item.title}</div>
              <div style="font-size:0.7rem; color:var(--text-muted);">${item.id} &bull; ${item.start_time} - ${item.end_time} &bull; Organizer: ${item.organizer}</div>
            </div>
            <span class="badge ${pColor}">Priority ${item.priority}</span>
          </div>
        `;
      }).join('');

      App.showToast('Priority dispatch order computed successfully', 'success');
    } catch (err) {
      console.error(err);
      App.showToast('Failed to execute priority queue dispatch', 'error');
    }
  }

  function renderGreedyCandidates() {
    const container = document.getElementById('alloc-greedy-candidates');
    if (!container) return;

    container.innerHTML = greedyCandidates.map(c => `
      <div style="padding:10px 12px; border:1px solid var(--border-light); border-radius:var(--radius-sm); margin-bottom:8px; background:var(--surface);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong>${c.title}</strong>
          <span class="badge badge-neutral">${c.id}</span>
        </div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
          Time: <strong style="color:var(--text-main); font-family:var(--font-mono);">${c.start_time} – ${c.end_time}</strong> &bull; Priority ${c.priority}
        </div>
      </div>
    `).join('');
  }

  async function runGreedySchedule() {
    const container = document.getElementById('alloc-greedy-results');
    const metricBadge = document.getElementById('alloc-greedy-metric');
    if (!container) return;

    container.innerHTML = '<div class="empty-state"><div class="empty-state-title">Optimizing meeting schedule...</div></div>';

    try {
      const res = await fetch('/api/algorithms/greedy-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates: greedyCandidates })
      });
      if (!res.ok) throw new Error('Schedule optimizer failed');
      const data = await res.json();

      const selected = data.selected || [];
      const rejected = data.rejected || [];

      if (metricBadge) {
        metricBadge.textContent = `${selected.length} Selected / ${rejected.length} Rejected`;
      }

      const selectedHtml = selected.map(item => `
        <div style="padding:10px 12px; border:1px solid #bbf7d0; background:var(--success-subtle); border-radius:var(--radius-sm); margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>${item.title}</strong>
            <span class="badge badge-green">Scheduled</span>
          </div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">
            ${item.id} &bull; ${item.start_time} - ${item.end_time}
          </div>
        </div>
      `).join('');

      const rejectedHtml = rejected.map(item => `
        <div style="padding:10px 12px; border:1px solid #fecaca; background:var(--danger-subtle); border-radius:var(--radius-sm); margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:#991b1b; font-weight:600;">${item.title}</span>
            <span class="badge badge-red">Rejected (Conflict)</span>
          </div>
          <div style="font-size:0.72rem; color:#b91c1c; margin-top:2px;">
            ${item.id} &bull; ${item.start_time} - ${item.end_time}
          </div>
        </div>
      `).join('');

      container.innerHTML = `
        <div style="margin-bottom:12px; font-weight:700; font-size:0.8rem; color:var(--text-muted); text-transform:uppercase;">Scheduled Sessions:</div>
        ${selectedHtml || '<div style="font-size:0.8rem; color:var(--text-muted);">None selected.</div>'}
        <div style="margin:16px 0 8px; font-weight:700; font-size:0.8rem; color:var(--text-muted); text-transform:uppercase;">Declined Overlaps:</div>
        ${rejectedHtml}
      `;

      App.showToast(`Capacity optimized: ${selected.length} meetings selected`, 'success');
    } catch (err) {
      console.error(err);
      App.showToast('Failed to optimize capacity', 'error');
    }
  }

  function renderWeightedCandidates() {
    const container = document.getElementById('alloc-weighted-candidates');
    if (!container) return;

    container.innerHTML = weightedCandidates.map(c => `
      <div style="padding:10px 12px; border:1px solid var(--border-light); border-radius:var(--radius-sm); margin-bottom:8px; background:var(--surface);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong>${c.title}</strong>
          <span class="badge badge-amber">Weight ${c.weight}</span>
        </div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
          ${c.id} &bull; Time: <strong style="color:var(--text-main); font-family:var(--font-mono);">${c.start_time} – ${c.end_time}</strong>
        </div>
      </div>
    `).join('');
  }

  async function runWeightedSchedule() {
    const container = document.getElementById('alloc-weighted-results');
    const metricBadge = document.getElementById('alloc-weighted-metric');
    if (!container) return;

    container.innerHTML = '<div class="empty-state"><div class="empty-state-title">Computing optimal business score...</div></div>';

    try {
      const res = await fetch('/api/algorithms/weighted-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates: weightedCandidates })
      });
      if (!res.ok) throw new Error('Weighted optimizer failed');
      const data = await res.json();

      const selected = data.selected || [];
      const totalScore = data.total_weight || 0;

      if (metricBadge) {
        metricBadge.textContent = `Optimal Score: ${totalScore}`;
      }

      const selectedHtml = selected.map(item => `
        <div style="padding:10px 12px; border:1px solid #fde68a; background:var(--warning-subtle); border-radius:var(--radius-sm); margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>${item.title}</strong>
            <span class="badge badge-amber">Weight +${item.weight || item.priority}</span>
          </div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">
            ${item.id} &bull; ${item.start_time} - ${item.end_time}
          </div>
        </div>
      `).join('');

      container.innerHTML = `
        <div style="padding:10px 14px; background:var(--surface-subtle); border:1px solid var(--border-light); border-radius:var(--radius-sm); margin-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.8rem; font-weight:600; color:var(--text-muted);">Total Strategic Business Value:</span>
          <span style="font-size:1.1rem; font-weight:750; color:var(--warning);">${totalScore} Points</span>
        </div>
        <div style="margin-bottom:8px; font-weight:700; font-size:0.8rem; color:var(--text-muted); text-transform:uppercase;">Included Strategic Sessions:</div>
        ${selectedHtml || '<div style="font-size:0.8rem; color:var(--text-muted);">None selected.</div>'}
      `;

      App.showToast(`Strategic schedule solved: Score ${totalScore}`, 'success');
    } catch (err) {
      console.error(err);
      App.showToast('Failed to calculate optimal schedule', 'error');
    }
  }

  function renderMatchingMatrix() {
    const container = document.getElementById('alloc-matching-matrix');
    if (!container) return;

    container.innerHTML = matchingRequests.map(req => `
      <div style="padding:10px 12px; border:1px solid var(--border-light); border-radius:var(--radius-sm); margin-bottom:8px; background:var(--surface);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong>${req.title}</strong>
          <span class="badge badge-neutral">${req.id}</span>
        </div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
          Required Capacity: <strong>${req.required_capacity} seats</strong>
        </div>
        <div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px;">
          Compatible Rooms: <code>${(req.allowed_rooms || []).join(', ')}</code>
        </div>
      </div>
    `).join('');
  }

  async function runBipartiteMatching() {
    const container = document.getElementById('alloc-matching-results');
    const metricBadge = document.getElementById('alloc-matching-metric');
    if (!container) return;

    container.innerHTML = '<div class="empty-state"><div class="empty-state-title">Solving suite allocations...</div></div>';

    try {
      const res = await fetch('/api/algorithms/bipartite-matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: matchingRequests })
      });
      if (!res.ok) throw new Error('Matching failed');
      const data = await res.json();

      const assignments = data.assignments || [];
      const unassigned = data.unassigned_requests || [];
      const totalCount = matchingRequests.length;

      if (metricBadge) {
        metricBadge.textContent = `${assignments.length} / ${totalCount} Assigned`;
      }

      const assignedHtml = assignments.map(a => `
        <div style="padding:10px 12px; border:1px solid #ddd6fe; background:#f5f3ff; border-radius:var(--radius-sm); margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>${a.request_title || a.request_id}</strong>
            <span class="badge badge-purple">&rarr; ${a.room_name || a.room_id}</span>
          </div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">
            Assigned Suite: <code>${a.room_id}</code>
          </div>
        </div>
      `).join('');

      const unassignedHtml = unassigned.map(u => `
        <div style="padding:10px 12px; border:1px solid #fecaca; background:var(--danger-subtle); border-radius:var(--radius-sm); margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:#991b1b;">${u.title || u.id}</strong>
            <span class="badge badge-red">Unassigned</span>
          </div>
          <div style="font-size:0.72rem; color:#b91c1c; margin-top:2px;">
            ${u.reason || 'No compatible room available'}
          </div>
        </div>
      `).join('');

      container.innerHTML = `
        <div style="margin-bottom:8px; font-weight:700; font-size:0.8rem; color:var(--text-muted); text-transform:uppercase;">Confirmed Assignments:</div>
        ${assignedHtml || '<div style="font-size:0.8rem; color:var(--text-muted);">None assigned.</div>'}
        ${unassigned.length > 0 ? `
          <div style="margin:16px 0 8px; font-weight:700; font-size:0.8rem; color:var(--text-muted); text-transform:uppercase;">Unaccommodated Requests:</div>
          ${unassignedHtml}
        ` : ''}
      `;

      App.showToast(`Matching complete: ${assignments.length} suites assigned`, 'success');
    } catch (err) {
      console.error(err);
      App.showToast('Failed to assign rooms', 'error');
    }
  }

  async function queryIntervalConflicts() {
    const roomId = document.getElementById('audit-room-select').value;
    const startTime = document.getElementById('audit-start-time').value;
    const endTime = document.getElementById('audit-end-time').value;
    const resultsContainer = document.getElementById('audit-conflict-results');

    if (!roomId || !startTime || !endTime) {
      App.showToast('Please specify room and time range', 'error');
      return;
    }

    if (startTime >= endTime) {
      App.showToast('Start time must be strictly before end time', 'error');
      return;
    }

    resultsContainer.innerHTML = '<div class="empty-state"><div class="empty-state-title">Querying schedule index...</div></div>';

    try {
      const res = await fetch('/api/algorithms/interval-conflict-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          start_time: startTime,
          end_time: endTime,
          date: '2026-10-24'
        })
      });
      if (!res.ok) throw new Error('Conflict query failed');
      const data = await res.json();

      const conflicts = data.conflicts || [];
      if (conflicts.length === 0) {
        resultsContainer.innerHTML = `
          <div class="ops-alert info">
            <div>
              <strong>No Scheduling Conflicts Detected:</strong> The requested window <strong>${startTime} – ${endTime}</strong> in room <code>${roomId}</code> is completely free and available for booking.
            </div>
          </div>
        `;
      } else {
        const conflictCards = conflicts.map(c => `
          <div style="padding:10px 12px; border:1px solid #fecaca; background:var(--danger-subtle); border-radius:var(--radius-sm); margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong style="color:#991b1b;">${c.title}</strong>
              <span class="badge badge-red">Overlap</span>
            </div>
            <div style="font-size:0.75rem; color:#b91c1c; margin-top:4px;">
              Scheduled: <strong>${c.start_time} – ${c.end_time}</strong> &bull; ID: <code>${c.id}</code> &bull; Organizer: ${c.organizer}
            </div>
          </div>
        `).join('');

        resultsContainer.innerHTML = `
          <div class="ops-alert danger" style="margin-bottom:12px;">
            <div>
              <strong>Schedule Overlap Detected (${conflicts.length} Conflict${conflicts.length > 1 ? 's' : ''}):</strong> The proposed window <strong>${startTime} – ${endTime}</strong> collides with the following confirmed reservations in <code>${roomId}</code>:
            </div>
          </div>
          ${conflictCards}
        `;
      }
    } catch (err) {
      console.error(err);
      App.showToast('Failed to check conflicts', 'error');
    }
  }

  return {
    loadPendingRequests,
    initSubtabs,
    switchSubtab,
    executePriorityQueueDispatch,
    runGreedySchedule,
    runWeightedSchedule,
    runBipartiteMatching,
    queryIntervalConflicts
  };
})();

if (typeof window !== 'undefined') {
  window.Algorithms = Algorithms;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      Algorithms.initSubtabs();
    });
  } else {
    Algorithms.initSubtabs();
  }
}
