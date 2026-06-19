// ===== GLOBAL STATE =====
let items = JSON.parse(localStorage.getItem('lostFoundItems')) || [];
let currentPage = 1;
const itemsPerPage = 6;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initTheme();
    initForms();
    initSearch();
    renderItems();
    updateDashboard();
    renderAdminList();
});

// ===== NAVIGATION =====
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            showSection(section);
        });
    });

    // Hamburger toggle for mobile
    document.getElementById('hamburger').addEventListener('click', () => {
        document.getElementById('navLinks').classList.toggle('active');
    });
}

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    // Show target section
    document.getElementById(sectionId).classList.add('active-section');

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
    if (activeLink) activeLink.classList.add('active');

    // Close mobile menu
    document.getElementById('navLinks').classList.remove('active');

    // Refresh content if needed
    if (sectionId === 'dashboard') {
        updateDashboard();
        renderAdminList();
    }
    if (sectionId === 'search') {
        renderItems();
    }

    window.scrollTo(0, 0);
}

// ===== DARK / LIGHT THEME TOGGLE =====
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const isDark = document.body.classList.contains('dark');
        themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}

// ===== FORM HANDLING =====
function initForms() {
    document.getElementById('lostForm').addEventListener('submit', (e) => handleSubmit(e, 'lost'));
    document.getElementById('foundForm').addEventListener('submit', (e) => handleSubmit(e, 'found'));
}

function handleSubmit(e, type) {
    e.preventDefault();
    const prefix = type;

    const name = document.getElementById(`${prefix}Name`).value.trim();
    const category = document.getElementById(`${prefix}Category`).value;
    const description = document.getElementById(`${prefix}Description`).value.trim();
    const location = document.getElementById(`${prefix}Location`).value.trim();
    const date = document.getElementById(`${prefix}Date`).value;
    const contact = document.getElementById(`${prefix}Contact`).value.trim();
    const imageInput = document.getElementById(`${prefix}Image`);

    // Validation
    if (!name || !category || !description || !location || !date || !contact) {
        showNotification('Please fill in all required fields!', 'error');
        return;
    }

    if (!/^[0-9]{10}$/.test(contact)) {
        showNotification('Please enter a valid 10-digit phone number!', 'error');
        return;
    }

    // Handle image upload
    const saveItem = (imageData) => {
        const newItem = {
            id: Date.now(),
            type: type,
            name, category, description, location, date, contact,
            image: imageData,
            status: type,
            createdAt: new Date().toISOString()
        };
        items.push(newItem);
        saveItems();
        showNotification(`${type === 'lost' ? 'Lost' : 'Found'} item reported successfully!`, 'success');
        e.target.reset();
        updateDashboard();
    };

    if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (event) => saveItem(event.target.result);
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        saveItem(null);
    }
}

// ===== LOCAL STORAGE =====
function saveItems() {
    localStorage.setItem('lostFoundItems', JSON.stringify(items));
}

// ===== SEARCH & FILTER =====
function initSearch() {
    document.getElementById('searchInput').addEventListener('input', () => { currentPage = 1; renderItems(); });
    document.getElementById('filterCategory').addEventListener('change', () => { currentPage = 1; renderItems(); });
    document.getElementById('filterStatus').addEventListener('change', () => { currentPage = 1; renderItems(); });
    document.getElementById('sortOrder').addEventListener('change', renderItems);
}

function getFilteredItems() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('filterCategory').value;
    const statusFilter = document.getElementById('filterStatus').value;
    const sortOrder = document.getElementById('sortOrder').value;

    let filtered = items.filter(item => {
        const matchesName = item.name.toLowerCase().includes(searchQuery);
        const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        return matchesName && matchesCategory && matchesStatus;
    });

    // Sort by date
    filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return sortOrder === 'latest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
}

// ===== RENDER ITEMS =====
function renderItems() {
    const grid = document.getElementById('itemsGrid');
    const filtered = getFilteredItems();

    if (filtered.length === 0) {
        grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: var(--text-light); padding: 2rem;"><i class="fas fa-inbox fa-3x"></i><br><br>No items found. Try adjusting your filters.</p>';
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    // Pagination logic
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filtered.slice(start, start + itemsPerPage);

    grid.innerHTML = paginatedItems.map(item => createItemCard(item)).join('');
    renderPagination(totalPages);
}

function createItemCard(item) {
    const imageHTML = item.image
        ? `<img src="${item.image}" alt="${item.name}" class="item-image">`
        : `<div class="item-image-placeholder"><i class="fas fa-image"></i></div>`;

    const statusClass = `status-${item.status}`;
    const claimButton = item.status !== 'claimed'
        ? `<button class="btn-claim" onclick="claimItem(${item.id})"><i class="fas fa-check"></i> Mark Claimed</button>`
        : '';

    return `
        <div class="item-card">
            ${imageHTML}
            <div class="item-body">
                <span class="item-status ${statusClass}">${item.status}</span>
                <h3>${item.name}</h3>
                <p class="item-meta"><i class="fas fa-tag"></i> ${item.category}</p>
                <p class="item-meta"><i class="fas fa-map-marker-alt"></i> ${item.location}</p>
                <p class="item-meta"><i class="fas fa-calendar"></i> ${formatDate(item.date)}</p>
                <div class="item-actions">
                    <button class="btn-view" onclick="viewItem(${item.id})"><i class="fas fa-eye"></i> View</button>
                    ${claimButton}
                </div>
            </div>
        </div>
    `;
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ===== PAGINATION =====
function renderPagination(totalPages) {
    const container = document.getElementById('pagination');
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    if (currentPage > 1) {
        html += `<button onclick="changePage(${currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
    }
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    if (currentPage < totalPages) {
        html += `<button onclick="changePage(${currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
    }
    container.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    renderItems();
    window.scrollTo({ top: document.getElementById('search').offsetTop, behavior: 'smooth' });
}

// ===== MODAL - VIEW DETAILS =====
function viewItem(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const imageHTML = item.image
        ? `<img src="${item.image}" alt="${item.name}">`
        : `<div class="item-image-placeholder"><i class="fas fa-image fa-3x"></i></div>`;

    document.getElementById('modalBody').innerHTML = `
        ${imageHTML}
        <span class="item-status status-${item.status}">${item.status}</span>
        <h2 style="margin: 0.5rem 0;">${item.name}</h2>
        <p><strong>Category:</strong> ${item.category}</p>
        <p><strong>Description:</strong> ${item.description}</p>
        <p><strong>Location:</strong> ${item.location}</p>
        <p><strong>Date:</strong> ${formatDate(item.date)}</p>
        <p><strong>Contact:</strong> <a href="tel:${item.contact}">${item.contact}</a></p>
    `;
    document.getElementById('itemModal').classList.add('active');
}

function closeModal() {
    document.getElementById('itemModal').classList.remove('active');
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('itemModal');
    if (e.target === modal) closeModal();
});

// ===== CLAIM ITEM =====
function claimItem(id) {
    const item = items.find(i => i.id === id);
    if (item) {
        item.status = 'claimed';
        saveItems();
        renderItems();
        updateDashboard();
        showNotification('Item marked as claimed!', 'success');
    }
}

// ===== DASHBOARD STATS =====
function updateDashboard() {
    const lost = items.filter(i => i.status === 'lost').length;
    const found = items.filter(i => i.status === 'found').length;
    const claimed = items.filter(i => i.status === 'claimed').length;

    document.getElementById('totalLost').textContent = lost;
    document.getElementById('totalFound').textContent = found;
    document.getElementById('totalMatched').textContent = claimed;
    document.getElementById('totalItems').textContent = items.length;
}

// ===== ADMIN PANEL =====
function renderAdminList() {
    const container = document.getElementById('adminList');
    if (items.length === 0) {
        container.innerHTML = '<p style="color: var(--text-light); text-align:center; padding: 1rem;">No reports yet.</p>';
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="admin-item">
            <div class="admin-item-info">
                <strong>${item.name}</strong>
                <small>${item.category} • ${item.status.toUpperCase()} • ${formatDate(item.date)}</small>
            </div>
            <button class="btn btn-danger" onclick="deleteItem(${item.id})">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `).join('');
}

function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this report?')) return;
    items = items.filter(i => i.id !== id);
    saveItems();
    renderAdminList();
    updateDashboard();
    renderItems();
    showNotification('Item deleted successfully!', 'success');
}

// ===== NOTIFICATIONS =====
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}