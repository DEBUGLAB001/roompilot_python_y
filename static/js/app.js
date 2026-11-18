/**
 * RoomPilot - Master Application Controller
 * Enterprise Workplace Operations Platform
 */

const App = (() => {
  let currentNav = 'overview';
  let roomViewMode = 'cards';
  let cachedStats = null;

  function updateDynamicDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    const formatted = now.toLocaleDateString('en-US', options);

    const headerDateEl = document.getElementById('current-system-date');
    if (headerDateEl) headerDateEl.textContent = formatted;

    const scheduleDateEl = document.getElementById('schedule-system-date');
    if (scheduleDateEl) scheduleDateEl.textContent = formatted;

    // ISO format for date picker YYYY-MM-DD
    const isoDate = now.toISOString().split('T')[0];
    const bookDateInput = document.getElementById('book-date');
    if (bookDateInput) bookDateInput.value = isoDate;
  }

  async function init() {
    updateDynamicDate();
    setupSidebarNavigation();
    setupModalsAndDrawers();
    setupGlobalActions();
    
    // Initialize components
    if (typeof Algorithms !== 'undefined' && Algorithms.initSubtabs) {
      Algorithms.initSubtabs();
    }

    await refreshAll();
  }

  async function refreshAll() {
    await Promise.all([
      loadStats(),
      FloorPlan.loadRooms(),
      Calendar.loadCalendar(),
      Algorithms.loadPendingRequests()
    ]);
    renderOverviewDashboard();
  }

  async function loadStats() {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Failed to load stats');
      cachedStats = await res.json();

      // Overview KPI updates
      const totalRoomsEl = document.getElementById('dash-total-rooms');
      const availRoomsEl = document.getElementById('dash-avail-rooms');
      const todayBookingsEl = document.getElementById('dash-today-bookings');
      const utilEl = document.getElementById('dash-utilization');
      const navResCountEl = document.getElementById('nav-badge-res-count');

      if (totalRoomsEl) totalRoomsEl.textContent = cachedStats.total_rooms;
      if (availRoomsEl) availRoomsEl.textContent = cachedStats.available_rooms;
      if (todayBookingsEl) todayBookingsEl.textContent = cachedStats.today_bookings;
      if (utilEl) utilEl.textContent = `${cachedStats.utilization_pct}%`;
      if (navResCountEl) navResCountEl.textContent = cachedStats.today_bookings;

    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }

  function setupSidebarNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetView = item.dataset.nav;
        navigateTo(targetView);
      });
    });
  }

  function navigateTo(viewId) {
    currentNav = viewId;
    
    // Update sidebar buttons
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.nav === viewId);
    });

    // Update view panels
    document.querySelectorAll('.app-view').forEach(panel => {
      panel.classList.toggle('active', panel.id === `view-${viewId}`);
    });

    // Trigger view-specific re-renders if necessary
    if (viewId === 'reservations') {
      Calendar.renderReservationsTable();
    } else if (viewId === 'rooms') {
      FloorPlan.renderRoomDirectory();
    } else if (viewId === 'schedule') {
      Calendar.renderCalendar();
    } else if (viewId === 'overview') {
      renderOverviewDashboard();
    }
  }

  function renderOverviewDashboard() {
    const reservations = Calendar.getReservations();
    const rooms = FloorPlan.getRooms();
    
    // Render Today's Schedule Activity
    const tbody = document.getElementById('dash-upcoming-table-body');
    if (tbody) {
      if (!reservations || reservations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No scheduled meetings for today.</td></tr>';
      } else {
        const sorted = [...reservations].sort((a, b) => a.start_time.localeCompare(b.start_time));
        tbody.innerHTML = sorted.map(r => {
          const pColor = r.priority >= 4 ? 'badge-amber' : (r.priority >= 3 ? 'badge-blue' : 'badge-neutral');
          return `
            <tr>
              <td><span style="font-family:var(--font-mono); font-weight:600;">${r.start_time} - ${r.end_time}</span></td>
              <td><strong>${r.title}</strong></td>
              <td><span class="badge badge-neutral">${r.room_name || r.room_id}</span></td>
              <td>${r.organizer}</td>
              <td><span class="badge ${pColor}">P${r.priority}</span></td>
              <td><span class="badge badge-green">Confirmed</span></td>
            </tr>
          `;
        }).join('');
      }
    }

    // Render Room Availability Summary List
    const roomList = document.getElementById('dash-room-status-list');
    if (roomList && rooms) {
      roomList.innerHTML = rooms.map(room => {
        const isAvail = room.is_available_now;
        const statusClass = isAvail ? 'available' : 'occupied';
        const statusText = isAvail ? 'Available' : 'Occupied';
        return `
          <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-light);">
            <div>
              <div style="font-weight:600; font-size:0.82rem;">${room.name}</div>
              <div style="font-size:0.7rem; color:var(--text-muted);">${room.id} &bull; ${room.capacity} seats &bull; Floor ${room.floor}</div>
            </div>
            <span class="room-status-dot ${statusClass}">${statusText}</span>
          </div>
        `;
      }).join('');
    }
  }

  function setupModalsAndDrawers() {
    // Booking modal open/close
    const openBookBtns = document.querySelectorAll('[data-open-booking]');
    const closeBookBtn = document.getElementById('btn-close-booking-modal');
    const cancelBookBtn = document.getElementById('btn-cancel-booking-modal');

    openBookBtns.forEach(btn => btn.addEventListener('click', () => openBookingModal()));
    if (closeBookBtn) closeBookBtn.addEventListener('click', closeBookingModal);
    if (cancelBookBtn) cancelBookBtn.addEventListener('click', closeBookingModal);

    // Form submit
    const form = document.getElementById('form-create-reservation');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitBookingForm();
      });
    }

    // Drawer close
    const closeDrawerBtn = document.getElementById('btn-close-drawer');
    const drawerOverlay = document.getElementById('details-drawer-overlay');
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
    if (drawerOverlay) {
      drawerOverlay.addEventListener('click', (e) => {
        if (e.target === drawerOverlay) closeDrawer();
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

  function openDrawer(title, badgeText, contentHtml, footerHtml = '') {
    const overlay = document.getElementById('details-drawer-overlay');
    const titleEl = document.getElementById('drawer-title');
    const badgeEl = document.getElementById('drawer-badge');
    const bodyEl = document.getElementById('drawer-body-content');
    const footerEl = document.getElementById('drawer-footer-actions');

    if (titleEl) titleEl.textContent = title;
    if (badgeEl) badgeEl.textContent = badgeText;
    if (bodyEl) bodyEl.innerHTML = contentHtml;
    if (footerEl) footerEl.innerHTML = footerHtml;

    overlay.classList.remove('hidden');
  }

  function closeDrawer() {
    const overlay = document.getElementById('details-drawer-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  function toggleSidebar() {
    const shell = document.querySelector('.app-shell');
    if (shell) shell.classList.toggle('sidebar-collapsed');
  }

  function setupGlobalActions() {
    // Sidebar toggle collapse / expand
    const toggleSidebarBtn = document.getElementById('btn-toggle-sidebar');
    if (toggleSidebarBtn) {
      toggleSidebarBtn.addEventListener('click', toggleSidebar);
    }

    // Schedule Jump to Slot lookup button
    const scheduleLookupBtn = document.getElementById('btn-run-schedule-lookup');
    if (scheduleLookupBtn) {
      scheduleLookupBtn.addEventListener('click', Calendar.runSlotLookup);
    }
  }

  function setRoomViewMode(mode) {
    roomViewMode = mode;
    const cardsWrap = document.getElementById('room-cards-container-wrap');
    const tableWrap = document.getElementById('room-table-container-wrap');
    const btnCards = document.getElementById('btn-view-cards');
    const btnTable = document.getElementById('btn-view-table');

    if (mode === 'cards') {
      cardsWrap.style.display = 'block';
      tableWrap.style.display = 'none';
      btnCards.classList.add('active');
      btnTable.classList.remove('active');
    } else {
      cardsWrap.style.display = 'none';
      tableWrap.style.display = 'block';
      btnCards.classList.remove('active');
      btnTable.classList.add('active');
    }
    FloorPlan.renderRoomDirectory();
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
    navigateTo,
    openBookingModal,
    closeBookingModal,
    openDrawer,
    closeDrawer,
    setRoomViewMode,
    showToast,
    toggleSidebar
  };
})();

if (typeof window !== 'undefined') {
  window.App = App;
}

document.addEventListener('DOMContentLoaded', App.init);
