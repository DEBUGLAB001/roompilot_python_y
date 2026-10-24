/**
 * RoomPilot - Floor Plan & Room Inventory Component
 */

const FloorPlan = (() => {
  let roomsData = [];
  let currentFloor = 1;

  async function loadRooms() {
    try {
      const res = await fetch('/api/rooms');
      if (!res.ok) throw new Error('Failed to load rooms');
      roomsData = await res.json();
      renderFloorPlan();
      populateRoomDropdowns();
    } catch (err) {
      console.error(err);
      App.showToast('Error loading rooms inventory', 'error');
    }
  }

  function setFloor(floor) {
    currentFloor = parseInt(floor, 10);
    document.querySelectorAll('.btn-floor').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.floor, 10) === currentFloor);
    });
    renderFloorPlan();
  }

  function renderFloorPlan() {
    const container = document.getElementById('floorplan-container');
    if (!container) return;

    const filteredRooms = roomsData.filter(r => r.floor === currentFloor);
    if (filteredRooms.length === 0) {
      container.innerHTML = '<div class="empty-state">No rooms found on this floor.</div>';
      return;
    }

    container.innerHTML = filteredRooms.map(room => {
      const isAvail = room.is_available_now;
      const statusClass = isAvail ? 'available' : 'occupied';
      const statusText = isAvail ? 'Available Now' : 'Currently Occupied';

      const amenitiesHtml = room.amenities.map(a => `<span class="amenity-tag">${a}</span>`).join('');

      return `
        <div class="room-card" data-room-id="${room.id}" onclick="FloorPlan.openRoomModal('${room.id}')">
          <div>
            <div class="room-card-header">
              <span class="room-id-tag">${room.id}</span>
              <span class="status-pill ${statusClass}">
                <span class="live-dot" style="${isAvail ? '' : 'background-color: #f59e0b; box-shadow: 0 0 8px #f59e0b;'}"></span>
                ${statusText}
              </span>
            </div>
            <h3 class="room-name">${room.name}</h3>
            <div class="room-capacity-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>Capacity: <strong>${room.capacity}</strong> attendees</span>
            </div>
            <div class="room-amenities-tags">
              ${amenitiesHtml}
            </div>
          </div>
          <div class="room-card-footer">
            <span style="font-size: 0.75rem; color: var(--text-muted);">${room.bookings_count} bookings scheduled</span>
            <span class="btn btn-sm btn-secondary">Details &rarr;</span>
          </div>
        </div>
      `;
    }).join('');
  }

  async function openRoomModal(roomId) {
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      if (!res.ok) throw new Error('Failed to load room details');
      const room = await res.json();

      document.getElementById('modal-room-chip').textContent = room.id;
      document.getElementById('modal-room-name').textContent = room.name;
      document.getElementById('modal-room-capacity').textContent = room.capacity;
      document.getElementById('modal-room-floor').textContent = `Floor ${room.floor}`;

      const isAvail = !room.reservations.some(b => b.start_time <= '10:00' && b.end_time > '10:00');
      const statusEl = document.getElementById('modal-room-status');
      statusEl.textContent = isAvail ? 'Available Now' : 'In Use';
      statusEl.className = isAvail ? 'text-teal' : 'text-amber';

      const amenContainer = document.getElementById('modal-room-amenities');
      amenContainer.innerHTML = room.amenities.map(a => `<span class="amenity-tag">${a}</span>`).join('');

      const schedContainer = document.getElementById('modal-room-schedule');
      if (room.reservations.length === 0) {
        schedContainer.innerHTML = '<div class="empty-state" style="padding:15px;">No reservations for today.</div>';
      } else {
        schedContainer.innerHTML = room.reservations.map(r => `
          <div class="mini-res-item">
            <span class="mini-res-title">${r.title} (${r.organizer})</span>
            <span class="mini-res-time">${r.start_time} - ${r.end_time}</span>
          </div>
        `).join('');
      }

      const quickBookBtn = document.getElementById('btn-modal-quick-book');
      quickBookBtn.onclick = () => {
        closeRoomModal();
        App.openBookingModal(room.id);
      };

      document.getElementById('room-modal-backdrop').classList.remove('hidden');
    } catch (err) {
      console.error(err);
      App.showToast('Error opening room details', 'error');
    }
  }

  function closeRoomModal() {
    document.getElementById('room-modal-backdrop').classList.add('hidden');
  }

  function populateRoomDropdowns() {
    const bookSelect = document.getElementById('book-room');
    const lookupSelect = document.getElementById('lookup-room-select');
    const conflictSelect = document.getElementById('conflict-room-select');

    const options = roomsData.map(r => `<option value="${r.id}">${r.name} (${r.id})</option>`).join('');

    if (bookSelect) bookSelect.innerHTML = options;
    if (lookupSelect) lookupSelect.innerHTML = options;
    if (conflictSelect) conflictSelect.innerHTML = options;
  }

  return {
    loadRooms,
    setFloor,
    openRoomModal,
    closeRoomModal,
    getRooms: () => roomsData
  };
})();
