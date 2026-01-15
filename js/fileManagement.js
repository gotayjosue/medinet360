
import { showToast, formatDate } from './utils.js';

const API_BASE_URL = 'https://medinet360-api.onrender.com/api';
let currentPatientId = null;
let fileIdToDelete = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    currentPatientId = params.get('id');

    if (currentPatientId) {
        initFileManagement();
    }
});

function initFileManagement() {
    loadPatientFiles();
    loadStorageStats();
    setupEventListeners();
}

// --- API Calls ---

async function fetchFiles() {
    const token = localStorage.getItem('authToken');
    if (!token) return { files: [] };

    try {
        const res = await fetch(`${API_BASE_URL}/files/patient/${currentPatientId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load files');
        return await res.json();
    } catch (err) {
        console.error(err);
        showToast('Error loading files', 'error');
        return { files: [] };
    }
}

async function fetchStorageStats() {
    const token = localStorage.getItem('authToken');
    if (!token) return null;

    try {
        const res = await fetch(`${API_BASE_URL}/files/stats/storage`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (err) {
        console.error(err);
        return null;
    }
}

async function uploadFile(file, category, description, onProgress) {
    return new Promise((resolve, reject) => {
        const token = localStorage.getItem('authToken');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('patientId', currentPatientId);
        formData.append('category', category);
        formData.append('description', description);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/files/upload`, true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
                const percentComplete = (e.loaded / e.total) * 100;
                onProgress(percentComplete);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    resolve(JSON.parse(xhr.responseText));
                } catch (err) {
                    resolve({ message: 'Success (parse error)' });
                }
            } else {
                try {
                    const errorData = JSON.parse(xhr.responseText);
                    reject(new Error(errorData.message || 'Upload failed'));
                } catch (err) {
                    reject(new Error('Upload failed with status ' + xhr.status));
                }
            }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(formData);
    });
}

async function deleteFileApi(fileId) {
    const token = localStorage.getItem('authToken');
    try {
        const res = await fetch(`${API_BASE_URL}/files/${fileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to delete');
        return true;
    } catch (err) {
        throw err;
    }
}


// --- UI Functions ---

async function loadPatientFiles() {
    const gallery = document.getElementById('filesGallery');
    if (!gallery) return;

    gallery.innerHTML = '<div class="col-span-full text-center py-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div></div>';

    const data = await fetchFiles();
    renderGallery(data.files || []);
}

function renderGallery(files) {
    const gallery = document.getElementById('filesGallery');
    if (!gallery) return;

    if (files.length === 0) {
        gallery.innerHTML = `
            <div class="col-span-full text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p class="mt-2 text-sm text-gray-500">No files uploaded yet.</p>
            </div>
        `;
        return;
    }

    gallery.innerHTML = files.map(file => {
        const isImage = file.fileType.startsWith('image/');
        const icon = getFileIcon(file.fileType);
        const date = new Date(file.createdAt || Date.now()).toLocaleDateString();

        return `
            <div class="group relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div class="aspect-w-10 aspect-h-7 bg-gray-100 block overflow-hidden relative h-40">
                    ${isImage
                ? `<img src="${file.thumbnailUrl || file.signedUrl}" alt="${file.fileName}" class="object-cover w-full h-full cursor-pointer" onclick="openViewer('${file.signedUrl}', '${file.fileType}', '${file.fileName}')">`
                : `<div class="flex items-center justify-center h-full cursor-pointer" onclick="openViewer('${file.signedUrl}', '${file.fileType}', '${file.fileName}')">${icon}</div>`
            }
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                         <button onclick="openViewer('${file.signedUrl}', '${file.fileType}', '${file.fileName}')" class="bg-white text-gray-800 p-2 rounded-full mr-2 hover:bg-gray-100 shadow-sm" title="View">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                         </button>
                         <button onclick="confirmDeleteFile('${file._id}')" class="bg-white text-red-600 p-2 rounded-full hover:bg-gray-100 shadow-sm" title="Delete">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                         </button>
                    </div>
                </div>
                <div class="p-3">
                    <p class="text-sm font-medium text-gray-900 truncate" title="${file.fileName}">${file.fileName}</p>
                    <div class="flex justify-between items-center mt-1">
                        <span class="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-0.5 rounded">${file.fileCategory || 'other'}</span>
                        <span class="text-xs text-gray-400">${date}</span>
                    </div>
                     ${file.description ? `<p class="text-xs text-gray-500 mt-1 truncate">${file.description}</p>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function getFileIcon(mimeType) {
    // Return SVG strings based on mime type
    if (mimeType.includes('pdf')) {
        return `<svg class="w-12 h-12 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>`;
    } else if (mimeType.includes('video')) {
        return `<svg class="w-12 h-12 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/></svg>`;
    } else {
        return `<svg class="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>`;
    }
}

async function loadStorageStats() {
    const stats = await fetchStorageStats();
    if (!stats) return;

    const storageBar = document.getElementById('storageBar');
    const storageText = document.getElementById('storageText');

    if (storageBar && storageText) {
        const percent = Math.min(stats.usedPercentage, 100);
        storageBar.style.width = `${percent}%`;

        // Color coding
        if (percent < 70) storageBar.className = 'h-2 rounded-full bg-green-500 transition-all duration-500';
        else if (percent < 90) storageBar.className = 'h-2 rounded-full bg-yellow-500 transition-all duration-500';
        else storageBar.className = 'h-2 rounded-full bg-red-500 transition-all duration-500';

        storageText.textContent = `${stats.usedStorage} used of ${stats.limitStorage}`;
    }
}


// --- Event Listeners & Interaction ---

function setupEventListeners() {
    // Upload Modal
    const uploadBtn = document.getElementById('openUploadModal');
    const uploadModal = document.getElementById('fileUploadModal');
    const closeUploadBtn = document.getElementById('closeUploadModal');
    const cancelUploadBtn = document.getElementById('cancelUpload');
    const uploadForm = document.getElementById('uploadFileForm');

    if (uploadBtn && uploadModal) {
        uploadBtn.addEventListener('click', () => uploadModal.showModal());
        closeUploadBtn.addEventListener('click', () => uploadModal.close());
        cancelUploadBtn.addEventListener('click', () => uploadModal.close());
    }

    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUploadSubmit);
    }

    // Drag & Drop
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            if (fileInput.files.length) updateDropZone(fileInput.files[0]);
        });

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('border-indigo-500', 'bg-indigo-50'));
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('border-indigo-500', 'bg-indigo-50'));
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length) {
                fileInput.files = files;
                updateDropZone(files[0]);
            }
        });
    }

    // Viewer Modal Close
    const viewerModal = document.getElementById('fileViewerModal');
    const closeViewerBtn = document.getElementById('closeViewerModal');
    if (viewerModal && closeViewerBtn) {
        closeViewerBtn.addEventListener('click', () => {
            viewerModal.close();
            // Stop video if playing
            const video = viewerModal.querySelector('video');
            if (video) video.pause();
            // Clear content
            document.getElementById('viewerContent').innerHTML = '';
        });
    }

    // Delete Confirmation Modal
    const deleteModal = document.getElementById('deleteFileModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteFile');
    const confirmDeleteBtn = document.getElementById('confirmDeleteFileBtn');

    if (deleteModal && cancelDeleteBtn && confirmDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => deleteModal.close());
        confirmDeleteBtn.addEventListener('click', () => {
            if (fileIdToDelete) {
                deleteModal.close();
                deleteFileApi(fileIdToDelete)
                    .then(() => {
                        showToast('File deleted', 'success');
                        loadPatientFiles();
                        loadStorageStats();
                    })
                    .catch(err => showToast(err.message, 'error'))
                    .finally(() => { fileIdToDelete = null; });
            }
        });
    }
}

function updateDropZone(file) {
    const dropZone = document.getElementById('dropZone');
    const dropText = dropZone.querySelector('p');
    dropText.textContent = `Selected: ${file.name}`;
}

async function handleUploadSubmit(e) {
    e.preventDefault();
    const fileInput = document.getElementById('fileInput');
    const categorySelect = document.getElementById('fileCategory');
    const descriptionInput = document.getElementById('fileDescription');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    // UI Progress Elements
    const progressContainer = document.getElementById('uploadProgressContainer');
    const progressBar = document.getElementById('uploadProgressBar');
    const progressPercent = document.getElementById('uploadProgressPercent');

    if (!fileInput.files.length) {
        showToast('Please select a file', 'error');
        return;
    }

    const file = fileInput.files[0];
    const category = categorySelect.value;
    const description = descriptionInput.value;

    // Simple validation (mock, real limit is backend)
    // 50 MB limit for safety check on client
    if (file.size > 50 * 1024 * 1024) {
        showToast('File too large (Max 50MB)', 'error');
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading...';

        // Show progress bar
        if (progressContainer) {
            progressContainer.classList.remove('hidden');
            progressBar.style.width = '0%';
            progressPercent.textContent = '0%';
        }

        await uploadFile(file, category, description, (percent) => {
            if (progressBar && progressPercent) {
                const rounded = Math.round(percent);
                progressBar.style.width = `${rounded}%`;
                progressPercent.textContent = `${rounded}%`;
            }
        });

        showToast('File uploaded successfully', 'success');
        document.getElementById('fileUploadModal').close();
        document.getElementById('uploadFileForm').reset();
        document.getElementById('dropZone').querySelector('p').textContent = 'Drag and drop your file here, or click to select';

        loadPatientFiles();
        loadStorageStats();

    } catch (err) {
        showToast(err.message || 'Upload failed', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload';
        // Hide progress bar after a short delay
        if (progressContainer) {
            setTimeout(() => {
                progressContainer.classList.add('hidden');
            }, 1000);
        }
    }
}

// Global scope functions for onclick events in HTML
window.openViewer = (url, type, name) => {
    const modal = document.getElementById('fileViewerModal');
    const content = document.getElementById('viewerContent');
    const title = document.getElementById('viewerTitle');

    title.textContent = name;
    content.innerHTML = '';

    if (type.startsWith('image/')) {
        content.innerHTML = `<img src="${url}" class="max-h-[80vh] max-w-full mx-auto rounded shadow-lg" alt="${name}">`;
    } else if (type.startsWith('video/')) {
        content.innerHTML = `<video src="${url}" controls class="max-h-[80vh] max-w-full mx-auto rounded shadow-lg"></video>`;
    } else {
        // Fallback for pdf, doc, xls, etc.
        const isPdf = type === 'application/pdf';
        content.innerHTML = `
            <div class="text-center py-10">
                <div class="mb-4 flex justify-center">${getFileIcon(type)}</div>
                <p class="text-gray-600 mb-4">${isPdf ? 'PDF' : 'Document'} preview not available.</p>
                <a href="${url}" target="_blank" download="${name}" class="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition shadow-md font-medium inline-flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    Download to View
                </a>
            </div>
        `;
    }

    modal.showModal();
}

window.confirmDeleteFile = (fileId) => {
    fileIdToDelete = fileId;
    const modal = document.getElementById('deleteFileModal');
    if (modal) {
        modal.showModal();
    } else {
        // Fallback if modal not found
        if (confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
            deleteFileApi(fileId)
                .then(() => {
                    showToast('File deleted', 'success');
                    loadPatientFiles();
                    loadStorageStats();
                })
                .catch(err => showToast(err.message, 'error'));
        }
    }
}
