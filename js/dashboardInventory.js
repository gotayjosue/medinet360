import { checkAuth, requireAuth, getClinicName, showToast } from './utils.js';
import i18n from './i18n.js';

// Elements
const inventoryTableBody = document.getElementById('inventoryTableBody');
const inventorySearch = document.getElementById('inventorySearch');
const addItemBtn = document.getElementById('addItemBtn');
const itemCountText = document.getElementById('itemCount');

// Modal Elements
const itemModal = document.getElementById('itemModal');
const itemForm = document.getElementById('itemForm');
const modalTitle = document.getElementById('modalTitle');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelFormBtn = document.getElementById('cancelFormBtn');

// Delete Modal Elements
const deleteModal = document.getElementById('deleteModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

let allItems = [];
let itemToDeleteId = null;

// Initialization
async function init() {
  await requireAuth();
  getClinicName();

  // Event Listeners
  addItemBtn?.addEventListener('click', openAddModal);
  closeModalBtn?.addEventListener('click', () => itemModal.close());
  cancelFormBtn?.addEventListener('click', () => itemModal.close());
  itemForm?.addEventListener('submit', handleFormSubmit);

  inventorySearch?.addEventListener('input', handleSearch);

  confirmDeleteBtn?.addEventListener('click', confirmDelete);
  cancelDeleteBtn?.addEventListener('click', () => {
    deleteModal.close();
    itemToDeleteId = null;
  });

  // Fetch initial data
  await fetchInventory();
}


async function fetchInventory() {
  const token = localStorage.getItem('authToken');
  try {
    const response = await fetch('https://medinet360-api.onrender.com/api/inventory', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      window.location.href = '../signIn.html';
      return;
    }

    if (response.status === 403) {
      showToast(i18n.t('dashboard.inventory.messages.errors.no_permission'), 'error');
      return;
    }

    const data = await response.json();
    allItems = data;
    renderTable(allItems);
    updateItemCount(allItems.length);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    showToast(i18n.t('dashboard.patients.messages.generic'), 'error');
  }
}

function renderTable(items) {
  if (!inventoryTableBody) return;

  if (items.length === 0) {
    inventoryTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-12 text-center text-gray-500">
          <div class="flex flex-col items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span data-i18n="dashboard.inventory.table.noItems">${i18n.t('dashboard.inventory.table.noItems')}</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  inventoryTableBody.innerHTML = items.map(item => {
    const isLowStock = item.quantity <= (item.minStock || 0);
    const price = item.price ? `$${parseFloat(item.price).toFixed(2)}` : '-';

    // Expiration Logic
    let expirationStatus = '';
    let expirationClass = 'text-gray-600';
    if (item.expirationDate) {
      const expDate = new Date(item.expirationDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = expDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        expirationStatus = `
          <span class="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold uppercase tracking-wider">
            ${i18n.t('dashboard.inventory.table.expired')}
          </span>
        `;
        expirationClass = 'text-red-600 font-bold';
      } else if (diffDays <= 30) {
        expirationStatus = `
          <span class="px-2 py-0.5 bg-orange-100 text-orange-600 rounded text-[10px] font-bold uppercase tracking-wider">
            ${i18n.t('dashboard.inventory.table.nearExpiration')}
          </span>
        `;
        expirationClass = 'text-orange-600 font-semibold';
      }
    }

    const formattedExpDate = item.expirationDate ? new Date(item.expirationDate).toLocaleDateString() : '-';

    return `
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="px-6 py-4">
          <div class="font-bold text-gray-800">${item.name}</div>
          <div class="text-xs text-gray-400 truncate max-w-xs">${item.description || ''}</div>
        </td>
        <td class="px-6 py-4 text-sm text-gray-600">${item.sku || '-'}</td>
        <td class="px-6 py-4">
          <span class="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
            ${i18n.t(`dashboard.inventory.categories.${item.category}`) || item.category || '-'}
          </span>
        </td>
        <td class="px-6 py-4">
          <div class="flex flex-col gap-1">
            <span class="font-bold ${isLowStock ? 'text-red-500' : 'text-gray-700'}">${item.quantity} ${item.unit || ''}</span>
            ${isLowStock ? `
              <span class="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold uppercase tracking-wider w-fit">
                ${i18n.t('dashboard.inventory.table.lowStock')}
              </span>
            ` : ''}
          </div>
        </td>
        <td class="px-6 py-4">
          <div class="flex flex-col gap-1">
            <span class="text-sm ${expirationClass}">${formattedExpDate}</span>
            ${expirationStatus}
          </div>
        </td>
        <td class="px-6 py-4 font-semibold text-gray-700">${price}</td>
        <td class="px-6 py-4">
          <div class="flex gap-2">
            <button data-id="${item._id}" class="edit-btn p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button data-id="${item._id}" class="delete-btn p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Add event listeners to buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editItem(btn.dataset.id));
  });
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteItem(btn.dataset.id));
  });
}

function updateItemCount(count) {
  if (itemCountText) {
    itemCountText.textContent = `${count} items total`;
  }
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase();
  const filtered = allItems.filter(item =>
    item.name.toLowerCase().includes(query) ||
    (item.sku && item.sku.toLowerCase().includes(query)) ||
    (item.category && item.category.toLowerCase().includes(query)) ||
    (item.description && item.description.toLowerCase().includes(query))
  );
  renderTable(filtered);
}

function openAddModal() {
  if (!itemModal) return;
  modalTitle.textContent = i18n.t('dashboard.inventory.modals.addItem');
  itemForm.reset();
  document.getElementById('itemId').value = '';
  itemModal.showModal();
}

function editItem(id) {
  const item = allItems.find(i => i._id === id);
  if (!item || !itemModal) return;

  modalTitle.textContent = i18n.t('dashboard.inventory.modals.editItem');
  document.getElementById('itemId').value = item._id;
  document.getElementById('itemName').value = item.name;
  document.getElementById('itemSku').value = item.sku || '';
  document.getElementById('itemCategory').value = item.category || 'other';
  document.getElementById('itemQuantity').value = item.quantity;
  document.getElementById('itemUnit').value = item.unit || '';
  document.getElementById('itemMinStock').value = item.minStock || 0;
  document.getElementById('itemPrice').value = item.price || 0;
  document.getElementById('itemExpirationDate').value = item.expirationDate ? item.expirationDate.split('T')[0] : '';
  document.getElementById('itemDescription').value = item.description || '';

  itemModal.showModal();
}

function deleteItem(id) {
  itemToDeleteId = id;
  deleteModal?.showModal();
}

async function confirmDelete() {
  if (!itemToDeleteId) return;

  const token = localStorage.getItem('authToken');
  try {
    const response = await fetch(`https://medinet360-api.onrender.com/api/inventory/${itemToDeleteId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 403) {
      showToast(i18n.t('dashboard.patients.messages.errors.no_permission'), 'error');
      return;
    }

    if (response.ok) {
      showToast(i18n.t('dashboard.inventory.messages.success.item_deleted'), 'success');
      await fetchInventory();
    } else {
      const errorData = await response.json();
      showToast(errorData.message || 'Error deleting item', 'error');
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    showToast('Error deleting item', 'error');
  } finally {
    deleteModal.close();
    itemToDeleteId = null;
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('itemId').value;
  const isEdit = !!id;

  const formData = {
    name: document.getElementById('itemName').value,
    sku: document.getElementById('itemSku').value,
    category: document.getElementById('itemCategory').value,
    quantity: parseInt(document.getElementById('itemQuantity').value) || 0,
    unit: document.getElementById('itemUnit').value,
    minStock: parseInt(document.getElementById('itemMinStock').value) || 0,
    price: parseFloat(document.getElementById('itemPrice').value) || 0,
    expirationDate: document.getElementById('itemExpirationDate').value || null,
    description: document.getElementById('itemDescription').value
  };

  try {
    const url = isEdit ? `https://medinet360-api.onrender.com/api/inventory/${id}` : 'https://medinet360-api.onrender.com/api/inventory';
    const method = isEdit ? 'PUT' : 'POST';
    const token = localStorage.getItem('authToken');

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });

    if (response.status === 403) {
      showToast(i18n.t('dashboard.patients.messages.errors.no_permission'), 'error');
      return;
    }

    if (response.ok) {
      showToast(isEdit ? i18n.t('dashboard.inventory.messages.success.item_updated') : i18n.t('dashboard.inventory.messages.success.item_added'), 'success');
      itemModal.close();
      await fetchInventory();
    } else {
      const errorData = await response.json();
      showToast(errorData.message || 'Error saving item', 'error');
    }
  } catch (error) {
    console.error('Error saving item:', error);
    showToast('Error saving item', 'error');
  }
}

// Start
document.addEventListener('DOMContentLoaded', init);
