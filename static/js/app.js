/**
 * RoomPilot - Master Application Controller
 */

const App = (() => {
  async function init() {
    setupTabNavigation();
    setupModals();
    setupActionButtons();

    Algorithms.initSubtabs();

    await refreshAll();
  }

  async function refreshAll() {
    await Promise.all([
      loadStats(),
      FloorPlan.loadRooms(),
      Calendar.loadCalendar(),
      Algorithms.loadPendingRequests()
    ]);
  }

  async function loadStats() {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Failed to load stats');
      const stats = await res.json();

      document.getElementById('stat-total-rooms').textContent = stats.total_rooms;
      document.getElementById('stat-avail-rooms').textContent = stats.available_rooms;
      document.getElementById('stat-today-bookings').textContent = stats.today_bookings;
      document.getElementById('stat-utilization').textContent = `${stats.utilization_pct}%`;
    } catch (err) {
      console.error(err);
    }
  }

  function setupTabNavigation() {
    const tabs = document.querySelectorAll('.pill-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        const viewId = `view-${tab.dataset.tab}`;
        const viewEl = document.getElementById(viewId);
        if (viewEl) viewEl.classList.add('active');
      });
    });

    // Floor toggles
    const floor1Btn = document.getElementById('btn-floor-1');
    const floor2Btn = document.getElementById('btn-floor-2');
    if (floor1Btn) floor1Btn.addEventListener('click', () => FloorPlan.setFloor(1));
    if (floor2Btn) floor2Btn.addEventListener('click', () => FloorPlan.setFloor(2));
  }

  function setupModals() {
    // Room details modal close
    const closeRoomModalBtn = document.getElementById('btn-close-room-modal');
    if (closeRoomModalBtn) {
      closeRoomModalBtn.addEventListener('click', FloorPlan.closeRoomModal);
    }

    // Booking modal open/close
    const openBookBtn = document.getElementById('btn-open-booking-modal');
    const closeBookBtn = document.getElementById('btn-close-booking-modal');
    const cancelBookBtn = document.getElementById('btn-cancel-booking-modal');

    if (openBookBtn) openBookBtn.addEventListener('click', () => openBookingModal());
    if (closeBookBtn) closeBookBtn.addEventListener('click', closeBookingModal);
    if (cancelBookBtn) cancelBookBtn.addEventListener('click', closeBookingModal);

    // Form submission
    const form = document.getElementById('form-create-reservation');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitBookingForm();
      });
    }
  }

  function openBookingModal(defaultRoomId = null) {
    const select = document.getElementById('book-room');
    if (defaultRoomId && select) {
      select.value = defaultRoomId;
    }
    document.getElementById('booking-modal-backdrop').classList.remove('hidden');
  }

  function closeBookingModal() {
    document.getElementById('booking-modal-backdrop').classList.add('hidden');
  }

  async function submitBookingForm() {
    const payload = {
      title: document.getElementById('book-title').value.trim(),
      organizer: document.getElementById('book-organizer').value.trim(),
      room_id: document.getElementById('book-room').value,
      start_time: document.getElementById('book-start').value,
      end_time: document.getElementById('book-end').value,
      priority: parseInt(document.getElementById('book-priority').value, 10),
      date: '2026-10-24'
    };

    if (payload.start_time >= payload.end_time) {
      showToast('Start time must be strictly before end time', 'error');
      return;
    }

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create reservation');
      }

      showToast('Reservation confirmed and scheduled!', 'success');
      closeBookingModal();
      document.getElementById('form-create-reservation').reset();
      await refreshAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function setupActionButtons() {
    // Reset DB
    const resetBtn = document.getElementById('btn-reset-db');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        if (confirm('Reset RoomPilot database to initial demo state?')) {
          try {
            await fetch('/api/reset-demo-data', { method: 'POST' });
            showToast('Database reset to initial demo seeds', 'success');
            await refreshAll();
          } catch (err) {
            showToast('Failed to reset data', 'error');
          }
        }
      });
    }

    // Binary search predecessor button
    const predBtn = document.getElementById('btn-run-predecessor');
    if (predBtn) predBtn.addEventListener('click', Calendar.runBinarySearchPredecessor);

    // Priority queue dispatch button
    const pqBtn = document.getElementById('btn-run-pq-dispatch');
    if (pqBtn) pqBtn.addEventListener('click', Algorithms.executePriorityQueueDispatch);

    // Greedy schedule button
    const greedyBtn = document.getElementById('btn-run-greedy');
    if (greedyBtn) greedyBtn.addEventListener('click', Algorithms.runGreedySchedule);

    // Weighted DP button
    const weightedBtn = document.getElementById('btn-run-weighted');
    if (weightedBtn) weightedBtn.addEventListener('click', Algorithms.runWeightedSchedule);

    // Bipartite matching button
    const matchingBtn = document.getElementById('btn-run-matching');
    if (matchingBtn) matchingBtn.addEventListener('click', Algorithms.runBipartiteMatching);

    // Conflict inspector button
    const conflictBtn = document.getElementById('btn-query-conflicts');
    if (conflictBtn) conflictBtn.addEventListener('click', Algorithms.queryIntervalConflicts);
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ');
    toast.innerHTML = `<span style="font-weight:700;">${icon}</span><span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  return {
    init,
    refreshAll,
    openBookingModal,
    showToast
  };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);
