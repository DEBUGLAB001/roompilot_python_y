/**
 * RoomPilot - Calendar & Reservation Management Component
 * Enterprise Schedule Timeline & Operational Data Table
 */

const Calendar = (() => {
  let reservations = [];
  let filterText = '';
  let filterRoom = '';
  let filterPriority = '';
  let filtersBound = false;

  async function loadCalendar() {
    try {
      const res = await fetch('/api/reservations?date=2026-10-24');
      if (!res.ok) throw new Error('Failed to load reservations');
      reservations = await res.json();
      bindReservationFilters();
      renderCalendar();
      renderReservationsTable();
    } catch (err) {
      console.error(err);
      App.showToast('Error loading reservations', 'error');
    }
  }

  function getReservations() {
    return reservations;
  }

  function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  function renderCalendar() {
    const container = document.getElementById('schedule-timeline-rows');
    if (!container) return;

    const rooms = FloorPlan.getRooms();
    if (!rooms || rooms.length === 0) {
      container.innerHTML = '<div class="empty-state">Loading schedule timeline...</div>';
      return;
    }

    const dayStartMins = 8 * 60;  // 08:00
    const dayEndMins = 18 * 60;   // 18:00
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
          <div class="timeline-event-block" id="booking-block-${b.id}"
               style="left: ${leftPct}%; width: ${widthPct}%;"
               title="${b.title} (${b.start_time} - ${b.end_time}) Organizer: ${b.organizer}"
               onclick="Calendar.openReservationDrawer('${b.id}')">
            <div class="timeline-event-title">${b.title}</div>
            <div class="timeline-event-time">${b.start_time} - ${b.end_time} &bull; ${b.organizer}</div>
          </div>
        `;
      }).join('');

      return `
        <div class="timeline-row" id="cal-row-${room.id}">
          <div class="timeline-room-meta">
            <span class="timeline-room-meta-title">${room.name}</span>
            <span class="timeline-room-meta-sub">${room.id} &bull; ${room.capacity} seats</span>
          </div>
          <div class="timeline-grid-track">
            ${Array.from({ length: 10 }).map(() => '<div class="timeline-grid-cell"></div>').join('')}
            ${blocksHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  function bindReservationFilters() {
    if (filtersBound) return;
    filtersBound = true;

    const search = document.getElementById('res-search-input');
    const roomSelect = document.getElementById('res-room-filter');
    const prioritySelect = document.getElementById('res-priority-filter');

    if (search) {
      search.addEventListener('input', (e) => {
        filterText = e.target.value.trim().toLowerCase();
        renderReservationsTable();
      });
    }

    if (roomSelect) {
      roomSelect.addEventListener('change', (e) => {
        filterRoom = e.target.value;
        renderReservationsTable();
      });
    }

    if (prioritySelect) {
      prioritySelect.addEventListener('change', (e) => {
        filterPriority = e.target.value;
        renderReservationsTable();
      });
    }
  }

  function renderReservationsTable() {
    const tbody = document.getElementById('res-table-body');
    const countDisplay = document.getElementById('res-count-display');
    if (!tbody) return;

    const filtered = reservations.filter(r => {
      const matchText = !filterText ||
        r.title.toLowerCase().includes(filterText) ||
        r.organizer.toLowerCase().includes(filterText) ||
        r.id.toLowerCase().includes(filterText);
      const matchRoom = !filterRoom || r.room_id === filterRoom;
      const matchPriority = !filterPriority || r.priority === parseInt(filterPriority, 10);
      return matchText && matchRoom && matchPriority;
    });

    if (countDisplay) {
      countDisplay.textContent = `Showing ${filtered.length} of ${reservations.length} reservations`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No reservations found matching active filters.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(r => {
      const pColor = r.priority >= 4 ? 'badge-amber' : (r.priority >= 3 ? 'badge-blue' : 'badge-neutral');
      return `
        <tr>
          <td><code>${r.id}</code></td>
          <td><strong>${r.title}</strong></td>
          <td>${r.organizer}</td>
          <td><span class="badge badge-neutral">${r.room_name || r.room_id}</span></td>
          <td>${r.date}</td>
          <td><span style="font-family:var(--font-mono); font-size:0.75rem;">${r.start_time} - ${r.end_time}</span></td>
          <td><span class="badge ${pColor}">Priority ${r.priority}</span></td>
          <td><span class="badge badge-green">Confirmed</span></td>
          <td style="text-align:right;">
            <div style="display:inline-flex; gap:6px;">
              <button class="btn btn-secondary btn-sm" onclick="Calendar.openReservationDrawer('${r.id}')">Inspect</button>
              <button class="btn btn-danger btn-sm" onclick="Calendar.cancelReservation('${r.id}')">Cancel</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function openReservationDrawer(resId) {
    const booking = reservations.find(r => r.id === resId);
    if (!booking) return;

    const pColor = booking.priority >= 4 ? 'badge-amber' : (booking.priority >= 3 ? 'badge-blue' : 'badge-neutral');

    const content = `
      <div class="spec-grid">
        <div class="spec-item">
          <span class="spec-label">Reservation ID</span>
          <span class="spec-value"><code>${booking.id}</code></span>
        </div>
        <div class="spec-item">
          <span class="spec-label">Room Identifier</span>
          <span class="spec-value">${booking.room_name || booking.room_id}</span>
        </div>
        <div class="spec-item">
          <span class="spec-label">Meeting Organizer</span>
          <span class="spec-value">${booking.organizer}</span>
        </div>
        <div class="spec-item">
          <span class="spec-label">Priority Level</span>
          <span class="spec-value"><span class="badge ${pColor}">Priority ${booking.priority}</span></span>
        </div>
        <div class="spec-item">
          <span class="spec-label">Scheduled Date</span>
          <span class="spec-value">${booking.date}</span>
        </div>
        <div class="spec-item">
          <span class="spec-label">Time Window</span>
          <span class="spec-value">${booking.start_time} - ${booking.end_time}</span>
        </div>
      </div>

      <div style="padding:14px; background:var(--surface-subtle); border-radius:var(--radius-sm); border:1px solid var(--border-light); margin-top:16px;">
        <div style="font-size:0.75rem; font-weight:600; color:var(--text-muted); text-transform:uppercase;">Meeting Subject</div>
        <div style="font-size:0.95rem; font-weight:700; color:var(--text-main); margin-top:4px;">${booking.title}</div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary" onclick="App.closeDrawer()">Close</button>
      <button class="btn btn-danger" onclick="Calendar.cancelReservation('${booking.id}')">Cancel Reservation</button>
    `;

    App.openDrawer(booking.title, 'Reservation Details', content, footer);
  }

  async function cancelReservation(resId) {
    if (!confirm(`Are you sure you want to cancel reservation ${resId}?`)) return;

    try {
      const res = await fetch(`/api/reservations/${resId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel reservation');

      App.showToast('Reservation cancelled successfully', 'success');
      App.closeDrawer();
      await App.refreshAll();
    } catch (err) {
      console.error(err);
      App.showToast(err.message, 'error');
    }
  }

  async function runSlotLookup() {
    const targetTime = document.getElementById('schedule-lookup-time').value;
    const roomId = document.getElementById('schedule-lookup-room').value;
    const banner = document.getElementById('schedule-lookup-banner');
    const bannerText = document.getElementById('schedule-lookup-text');

    try {
      const res = await fetch(`/api/algorithms/timeline-predecessor?room_id=${roomId}&target_time=${targetTime}`);
      if (!res.ok) throw new Error('Slot lookup query failed');
      const data = await res.json();

      // Clear previous highlights
      document.querySelectorAll('.timeline-event-block').forEach(el => el.classList.remove('highlighted-event'));

      banner.style.display = 'block';

      if (data.predecessor_index >= 0 && data.predecessor) {
        const pred = data.predecessor;
        bannerText.innerHTML = `
          <strong>Found Slot:</strong> Meeting index <strong>#${data.predecessor_index}</strong> in <code>${data.room_id}</code>:
          <em>"${pred.title}"</em> scheduled from <strong>${pred.start_time} – ${pred.end_time}</strong> (Organizer: ${pred.organizer}).
        `;

        const matchBlock = document.getElementById(`booking-block-${pred.id}`);
        if (matchBlock) {
          matchBlock.classList.add('highlighted-event');
          matchBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      } else {
        bannerText.innerHTML = `No reservation found starting at or prior to <strong>${targetTime}</strong> in room <code>${roomId}</code>.`;
      }
    } catch (err) {
      console.error(err);
      App.showToast('Slot lookup failed', 'error');
    }
  }

  return {
    loadCalendar,
    getReservations,
    renderCalendar,
    renderReservationsTable,
    openReservationDrawer,
    cancelReservation,
    runSlotLookup
  };
})();

if (typeof window !== 'undefined') {
  window.Calendar = Calendar;
}
