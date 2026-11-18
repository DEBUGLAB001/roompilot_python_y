/**
 * RoomPilot - Floor Plan & Room Directory Component
 * Enterprise SaaS Room Management
 */

const FloorPlan = (() => {
  let roomsData = [];
  let searchQuery = '';
  let selectedFloor = '';
  let minimumCapacity = 0;
  let availableOnly = false;
  let filtersBound = false;

  async function loadRooms() {
    try {
      const res = await fetch('/api/rooms');
      if (!res.ok) throw new Error('Failed to load rooms');
      roomsData = await res.json();
      bindDirectoryFilters();
      renderRoomDirectory();
      populateRoomDropdowns();
    } catch (err) {
      console.error('Error loading rooms:', err);
      App.showToast('Error loading room directory', 'error');
    }
  }

  function getRooms() {
    return roomsData;
  }

  function renderRoomDirectory() {
    const grid = document.getElementById('room-directory-grid');
    const tbody = document.getElementById('room-directory-tbody');
    if (!grid && !tbody) return;

    const query = searchQuery.trim().toLowerCase();
    const filtered = roomsData.filter(room => {
      const searchable = `${room.id} ${room.name} ${room.amenities.join(' ')}`.toLowerCase();
      const matchQuery = !query || searchable.includes(query);
      const matchFloor = !selectedFloor || room.floor === parseInt(selectedFloor, 10);
      const matchCap = room.capacity >= minimumCapacity;
      const matchAvail = !availableOnly || room.is_available_now;
      return matchQuery && matchFloor && matchCap && matchAvail;
    });

    // Render Cards View
    if (grid) {
      if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><div class="empty-state-title">No rooms match your filter criteria</div><div class="empty-state-desc">Try clearing or adjusting capacity and floor filters.</div></div>';
      } else {
        grid.innerHTML = filtered.map(room => {
          const isAvail = room.is_available_now;
          const statusClass = isAvail ? 'available' : 'occupied';
          const statusText = isAvail ? 'Available Now' : 'Occupied';
          const amenitiesHtml = room.amenities.map(a => `<span class="amenity-chip">${a}</span>`).join('');

          return `
            <div class="enterprise-room-card" onclick="FloorPlan.openRoomDrawer('${room.id}')">
              <div class="room-card-head">
                <span class="room-code-tag">${room.id} &bull; Floor ${room.floor}</span>
                <span class="room-status-dot ${statusClass}">${statusText}</span>
              </div>
              <h3 class="room-name-title">${room.name}</h3>
              <div class="room-capacity-spec">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                <span>Capacity: <strong>${room.capacity} seats</strong></span>
              </div>
              <div class="room-amenities-wrap">
                <div style="font-size:0.68rem; font-weight:600; color:var(--text-muted); margin-bottom:4px; text-transform:uppercase;">Equipment:</div>
                <div>${amenitiesHtml}</div>
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between; margin-top:12px; font-size:0.75rem; color:var(--text-muted);">
                <span>${room.bookings_count} bookings today</span>
                <span class="btn btn-secondary btn-sm" style="font-size:0.7rem; padding:4px 8px;">View Details &rarr;</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Render Table View
    if (tbody) {
      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No meeting rooms found matching current criteria.</td></tr>';
      } else {
        tbody.innerHTML = filtered.map(room => {
          const isAvail = room.is_available_now;
          const statusClass = isAvail ? 'available' : 'occupied';
          const statusText = isAvail ? 'Available' : 'Occupied';
          const amenitiesHtml = room.amenities.map(a => `<span class="amenity-chip">${a}</span>`).join('');

          return `
            <tr>
              <td><code>${room.id}</code></td>
              <td><strong>${room.name}</strong></td>
              <td>Floor ${room.floor}</td>
              <td><strong>${room.capacity}</strong> attendees</td>
              <td>${amenitiesHtml}</td>
              <td><span class="room-status-dot ${statusClass}">${statusText}</span></td>
              <td>${room.bookings_count} sessions</td>
              <td style="text-align:right;">
                <button class="btn btn-secondary btn-sm" onclick="FloorPlan.openRoomDrawer('${room.id}')">Inspect</button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  }

  function bindDirectoryFilters() {
    if (filtersBound) return;
    filtersBound = true;

    const search = document.getElementById('room-dir-search');
    const floorSelect = document.getElementById('room-dir-floor');
    const capacitySelect = document.getElementById('room-dir-capacity');
    const availCheckbox = document.getElementById('room-dir-available-only');

    if (search) {
      search.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderRoomDirectory();
      });
    }

    if (floorSelect) {
      floorSelect.addEventListener('change', (e) => {
        selectedFloor = e.target.value;
        renderRoomDirectory();
      });
    }

    if (capacitySelect) {
      capacitySelect.addEventListener('change', (e) => {
        minimumCapacity = parseInt(e.target.value, 10) || 0;
        renderRoomDirectory();
      });
    }

    if (availCheckbox) {
      availCheckbox.addEventListener('change', (e) => {
        availableOnly = e.target.checked;
        renderRoomDirectory();
      });
    }
  }

  function populateRoomDropdowns() {
    const bookSelect = document.getElementById('book-room');
    const auditSelect = document.getElementById('audit-room-select');
    const schedSelect = document.getElementById('schedule-lookup-room');
    const resRoomFilter = document.getElementById('res-room-filter');

    const optionsHtml = roomsData.map(r => `
      <option value="${r.id}">${r.name} (${r.id} · ${r.capacity}p)</option>
    `).join('');

    if (bookSelect) bookSelect.innerHTML = optionsHtml;
    if (auditSelect) auditSelect.innerHTML = optionsHtml;
    if (schedSelect) schedSelect.innerHTML = optionsHtml;

    if (resRoomFilter) {
      resRoomFilter.innerHTML = '<option value="">All Meeting Rooms</option>' + roomsData.map(r => `
        <option value="${r.id}">${r.name}</option>
      `).join('');
    }
  }

  async function openRoomDrawer(roomId) {
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      if (!res.ok) throw new Error('Could not load room details');
      const room = await res.json();

      const amenitiesHtml = room.amenities.map(a => `<span class="amenity-chip">${a}</span>`).join('');
      const bookingsHtml = room.reservations && room.reservations.length > 0
        ? room.reservations.map(b => `
            <div style="padding:8px 10px; background:var(--surface-subtle); border:1px solid var(--border-light); border-radius:var(--radius-sm); margin-bottom:6px;">
              <div style="font-weight:600; font-size:0.8rem;">${b.title}</div>
              <div style="font-size:0.72rem; color:var(--text-muted);">${b.start_time} - ${b.end_time} &bull; ${b.organizer}</div>
            </div>
          `).join('')
        : '<div style="font-size:0.78rem; color:var(--text-muted);">No reservations scheduled today.</div>';

      const content = `
        <div class="spec-grid">
          <div class="spec-item">
            <span class="spec-label">Room Identifier</span>
            <span class="spec-value"><code>${room.id}</code></span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Floor Location</span>
            <span class="spec-value">Floor ${room.floor}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Seating Capacity</span>
            <span class="spec-value">${room.capacity} attendees</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Today's Sessions</span>
            <span class="spec-value">${room.reservations ? room.reservations.length : 0} bookings</span>
          </div>
        </div>

        <div style="margin-bottom:20px;">
          <h4 style="font-size:0.8rem; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px;">Amenities & Equipment</h4>
          <div>${amenitiesHtml}</div>
        </div>

        <div>
          <h4 style="font-size:0.8rem; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px;">Today's Schedule</h4>
          <div>${bookingsHtml}</div>
        </div>
      `;

      const footer = `
        <button class="btn btn-secondary" onclick="App.closeDrawer()">Close</button>
        <button class="btn btn-primary" onclick="App.closeDrawer(); App.openBookingModal('${room.id}');">Book This Room</button>
      `;

      App.openDrawer(room.name, room.id, content, footer);
    } catch (err) {
      console.error(err);
      App.showToast('Failed to load room details', 'error');
    }
  }

  return {
    loadRooms,
    getRooms,
    renderRoomDirectory,
    openRoomDrawer
  };
})();

if (typeof window !== 'undefined') {
  window.FloorPlan = FloorPlan;
}
