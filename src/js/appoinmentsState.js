// appointmentsState.js
export let isEditMode = false;
export let currentEditId = null;

export function setEditMode(id) {
  isEditMode = true;
  currentEditId = id;
}

export function resetEditMode() {
  isEditMode = false;
  currentEditId = null;
}