/**
 * RoomPilot - Timeline Calendar Component
 * Renders daily timeline grid and exposes Binary Search Predecessor lookup.
 */

const Calendar = (() => {
  let reservations = [];

  async function loadCalendar() {
    try {
      const res = await fetch('/api/reservations?date=2026-10-24');
      if (!res.ok) throw new Error('Failed to load reservations');
      reservations = await res.json();
      renderCalendar();
    } catch (err) {
      console.error(err);
      App.showToast('Error loading calendar schedule', 'error');
    }
  }

  function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  function renderCalendar() {
    const container = document.getElementById('calendar-rows-container');
    if (!container) return;

    const rooms = FloorPlan.getRooms();
    if (rooms.length === 0) {
      container.innerHTML = '<div class="empty-state">Loading timeline...</div>';
      return;
    }

    const dayStartMins = 8 * 60; // 08:00
    const dayEndMins = 18 * 60;  // 18:00
    const totalDayMins = dayEndMins - dayStartMins; // 600 mins

    container.innerHTML = rooms.map(room => {
      const roomBookings = reservations.filter(r => r.room_id === room.id);

      const blocksHtml = roomBookings.map(b => {
        const startM = Math.max(dayStartMins, timeToMinutes(b.start_time));
        const endM = Math.min(dayEndMins, timeToMinutes(b.end_time));
        if (endM <= startM) return '';

        const leftPct = ((startM - dayStartMins) / totalDayMins) * 100;
        const widthPct = ((endM - startM) / totalDayMins) * 100;

        return `
          <div class="booking-block" id="booking-block-${b.id}"
               style="left: ${leftPct}%; width: ${widthPct}%;"
               title="${b.title} (${b.start_time} - ${b.end_time}) Organizer: ${b.organizer}"
               onclick="Calendar.showBookingDetails('${b.id}')">
            <strong>${b.title}</strong>
            <span style="font-size:0.68rem; opacity:0.85;">${b.start_time} - ${b.end_time}</span>
          </div>
        `;
      }).join('');

      return `
        <div class="calendar-row" id="cal-row-${room.id}">
          <div class="calendar-room-cell">
            <span class="calendar-room-name">${room.name}</span>
            <span class="calendar-room-cap">${room.id} &bull; ${room.capacity} seats</span>
          </div>
          <div class="calendar-track">
            ${Array.from({ length: 10 }).map(() => '<div class="calendar-track-hour"></div>').join('')}
            ${blocksHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  async function runBinarySearchPredecessor() {
    const targetTime = document.getElementById('lookup-target-time').value;
    const roomId = document.getElementById('lookup-room-select').value;
    const banner = document.getElementById('predecessor-result-banner');

    try {
      const res = await fetch(`/api/algorithms/timeline-predecessor?room_id=${roomId}&target_time=${targetTime}`);
      if (!res.ok) throw new Error('Binary search query failed');
      const data = await res.json();

      // Clear previous highlights
      document.querySelectorAll('.booking-block').forEach(el => el.classList.remove('highlighted-predecessor'));

      banner.classList.remove('hidden');

      if (data.predecessor_index >= 0 && data.predecessor) {
        const pred = data.predecessor;
        banner.innerHTML = `
          <div>
            <strong>Binary Search Predecessor Result:</strong>
            Found slot index <code>#${data.predecessor_index}</code> starting at <code>${pred.start_time}</code>:
            <em>"${pred.title}"</em> (${pred.start_time} - ${pred.end_time}).
          </div>
          <span class="badge badge-teal">Match Index ${data.predecessor_index}</span>
        `;
        // Highlight in DOM
        const blockEl = document.getElementById(`booking-block-${pred.id}`);
        if (blockEl) {
          blockEl.classList.add('highlighted-predecessor');
          blockEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      } else {
        banner.innerHTML = `
          <div>
            <strong>Binary Search Predecessor Result:</strong>
            No predecessor found on or before <code>${targetTime}</code> (Algorithm returned index <code>-1</code>).
            Sorted start times in room: <code>[${data.sorted_start_times.join(', ')}]</code>.
          </div>
          <span class="badge badge-amber">No Slot (Index -1)</span>
        `;
      }
    } catch (err) {
      console.error(err);
      App.showToast('Failed to execute binary search predecessor query', 'error');
    }
  }

  function showBookingDetails(resId) {
    const booking = reservations.find(r => r.id === resId);
    if (!booking) return;

    if (confirm(`Cancel reservation "${booking.title}" (${booking.start_time} - ${booking.end_time})?`)) {
      cancelBooking(resId);
    }
  }

  async function cancelBooking(resId) {
    try {
      const res = await fetch(`/api/reservations/${resId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Cancellation failed');
      App.showToast('Reservation cancelled successfully', 'success');
      App.refreshAll();
    } catch (err) {
      console.error(err);
      App.showToast('Failed to cancel reservation', 'error');
    }
  }

  return {
    loadCalendar,
    runBinarySearchPredecessor,
    showBookingDetails,
    getReservations: () => reservations
  };
})();
