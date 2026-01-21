
import { showToast, formatDate } from './utils.js';
import i18n from './i18n.js';

const API_BASE_URL = 'https://medinet360-api.onrender.com/api';
let currentPatientId = null;
let fileIdToDelete = null;
let patientFiles = []; // Store current files for gallery navigation
let currentFileIndex = -1;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    currentPatientId = params.get('id');

    if (currentPatientId) {
        initFileManagement();
    }
});

const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
];

function isFileTypeAllowed(file) {
    // Check by mime type
    if (ALLOWED_MIME_TYPES.includes(file.type)) return true;

    // Fallback for some browsers/OS that might not resolve mime types for docx/xlsx correctly
    const ext = file.name.split('.').pop().toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'doc', 'docx', 'xls', 'xlsx', 'csv'];
    if (allowedExts.includes(ext)) return true;

    return false;
}

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
    patientFiles = data.files || [];
    renderGallery(patientFiles);
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

    gallery.innerHTML = files.map((file, index) => {
        const isImage = file.fileType.startsWith('image/');
        const icon = getFileIcon(file.fileType);
        const date = new Date(file.createdAt || Date.now()).toLocaleDateString();

        return `
            <div class="group relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div class="aspect-w-10 aspect-h-7 bg-gray-100 block overflow-hidden relative h-40">
                    ${isImage
                ? `<img src="${file.thumbnailUrl || file.signedUrl}" alt="${file.fileName}" class="object-cover w-full h-full cursor-pointer" onclick="openViewerByIndex(${index})">`
                : `<div class="flex items-center justify-center h-full cursor-pointer" onclick="openViewerByIndex(${index})">${icon}</div>`
            }
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                         <button onclick="openViewerByIndex(${index})" class="bg-white text-gray-800 p-2 rounded-full mr-2 hover:bg-gray-100 shadow-sm" title="View">
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
    if (mimeType.includes('pdf')) {
        return `
            <div class="file-preview-card bg-red-50 text-red-500">
                <svg class="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>
                <span class="file-type-badge bg-red-100 text-red-700">PDF</span>
            </div>`;
    } else if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
        return `
            <div class="file-preview-card bg-green-50 text-green-500">
                <svg class="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 100 2h4a1 1 0 100-2H8zm0-3a1 1 0 100 2h4a1 1 0 100-2H8z" clip-rule="evenodd"/></svg>
                <span class="file-type-badge bg-green-100 text-green-700">XLSX</span>
            </div>`;
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
        return `
            <div class="file-preview-card bg-blue-50 text-blue-500">
                <svg class="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>
                <span class="file-type-badge bg-blue-100 text-blue-700">DOCX</span>
            </div>`;
    } else if (mimeType.includes('video')) {
        return `
            <div class="file-preview-card bg-indigo-50 text-indigo-500">
                <svg class="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/></svg>
                <span class="file-type-badge bg-indigo-100 text-indigo-700">VIDEO</span>
            </div>`;
    } else {
        return `
            <div class="file-preview-card bg-gray-50 text-gray-400">
                <svg class="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>
                <span class="file-type-badge bg-gray-100 text-gray-600">FILE</span>
            </div>`;
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
            if (fileInput.files.length) updateDropZone(fileInput.files);
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
            const files = Array.from(dt.files);

            const filteredFiles = files.filter(file => {
                if (isFileTypeAllowed(file)) return true;
                showToast(`File type not allowed: ${file.name}`, 'error');
                return false;
            });

            if (filteredFiles.length) {
                // Create a new FileList-like object or just use the array if we can
                // Actually, fileInput.files expects a FileList. 
                // We'll use a DataTransfer object to construct a new FileList
                const dataTransfer = new DataTransfer();
                filteredFiles.forEach(f => dataTransfer.items.add(f));
                fileInput.files = dataTransfer.files;
                updateDropZone(fileInput.files);
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

    // Gallery Navigation
    const prevBtn = document.getElementById('prevFileBtn');
    const nextBtn = document.getElementById('nextFileBtn');

    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => navigateGallery(-1));
        nextBtn.addEventListener('click', () => navigateGallery(1));
    }

    // Keyboard Navigation
    document.addEventListener('keydown', (e) => {
        const viewerModal = document.getElementById('fileViewerModal');
        if (viewerModal && viewerModal.open) {
            if (e.key === 'ArrowRight') navigateGallery(1);
            else if (e.key === 'ArrowLeft') navigateGallery(-1);
            else if (e.key === 'Escape') viewerModal.close();
        }
    });

    // Touch Swipe Navigation for Mobile
    const viewerContent = document.getElementById('viewerContent');
    let touchStartX = 0;
    let touchEndX = 0;

    if (viewerContent) {
        viewerContent.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        viewerContent.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });
    }

    function handleSwipe() {
        const swipedistance = touchEndX - touchStartX;
        const threshold = 50; // pixels
        if (Math.abs(swipedistance) > threshold) {
            if (swipedistance < 0) navigateGallery(1); // Swipe Left -> Next
            else navigateGallery(-1); // Swipe Right -> Prev
        }
    }
}

function updateDropZone(files) {
    const dropZone = document.getElementById('dropZone');
    const dropText = dropZone.querySelector('p');
    if (files.length === 1) {
        dropText.textContent = `Selected: ${files[0].name}`;
    } else {
        dropText.textContent = `${files.length} files selected`;
    }
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
        showToast('Please select at least one file', 'error');
        return;
    }

    const files = Array.from(fileInput.files);
    const category = categorySelect.value;
    const description = descriptionInput.value;

    // Filter files again as extra security
    const validFiles = files.filter(file => {
        if (isFileTypeAllowed(file)) return true;
        return false;
    });

    if (validFiles.length === 0) {
        showToast('No valid files to upload (PDFs and Videos are not allowed)', 'error');
        return;
    }

    try {
        submitBtn.disabled = true;

        // Show progress bar
        if (progressContainer) {
            progressContainer.classList.remove('hidden');
            progressBar.style.width = '0%';
            progressPercent.textContent = '0%';
        }

        let uploadedCount = 0;
        const totalFiles = validFiles.length;

        for (const file of validFiles) {
            // Simple validation (mock, real limit is backend)
            if (file.size > 10 * 1024 * 1024) {
                showToast(`File ${file.name} too large (Max 10MB)`, 'error');
                continue;
            }

            submitBtn.textContent = `Uploading ${uploadedCount + 1}/${totalFiles}...`;

            await uploadFile(file, category, description, (percent) => {
                if (progressBar && progressPercent) {
                    // Update progress relative to current file and total files
                    // Simple average progress: (files_done * 100 + current_file_percent) / total_files
                    const overallPercent = Math.round(((uploadedCount * 100) + percent) / totalFiles);
                    progressBar.style.width = `${overallPercent}%`;
                    progressPercent.textContent = `${overallPercent}%`;
                }
            });

            uploadedCount++;
        }

        if (uploadedCount > 0) {
            showToast(`${uploadedCount} file(s) uploaded successfully`, 'success');
        }

        document.getElementById('fileUploadModal').close();
        document.getElementById('uploadFileForm').reset();
        document.getElementById('dropZone').querySelector('p').textContent = 'Drag and drop your file here, or click to select';

        loadPatientFiles();
        loadStorageStats();

    } catch (err) {
        showToast(i18n.t(err.message) || 'Upload failed', 'error');
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
window.openViewerByIndex = (index) => {
    if (index < 0 || index >= patientFiles.length) return;
    currentFileIndex = index;
    const file = patientFiles[index];
    openViewer(file.signedUrl, file.fileType, file.fileName);
    updateNavButtons();
}

window.openViewer = (url, type, name, direction = 'none') => {
    const modal = document.getElementById('fileViewerModal');
    const content = document.getElementById('viewerContent');
    const title = document.getElementById('viewerTitle');

    title.textContent = name;

    // Create a new container for the content to animate
    const newContent = document.createElement('div');
    newContent.className = 'w-full h-full flex items-center justify-center';

    // Animation class
    if (direction === 'next') newContent.classList.add('animate-slide-in-right');
    else if (direction === 'prev') newContent.classList.add('animate-slide-in-left');
    else newContent.classList.add('animate-fade-in');

    if (type.startsWith('image/')) {
        newContent.innerHTML = `<img src="${url}" class="max-h-[80vh] max-w-full mx-auto rounded shadow-lg" alt="${name}">`;
    } else if (type.startsWith('video/')) {
        newContent.innerHTML = `<video src="${url}" controls autoPlay class="max-h-[80vh] max-w-full mx-auto rounded shadow-lg"></video>`;
    } else {
        const isPdf = type === 'application/pdf';
        newContent.innerHTML = `
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

    // Clear old content
    content.innerHTML = '';
    content.appendChild(newContent);

    if (!modal.open) modal.showModal();
}

function navigateGallery(direction) {
    const nextIndex = currentFileIndex + direction;
    if (nextIndex >= 0 && nextIndex < patientFiles.length) {
        currentFileIndex = nextIndex;
        const file = patientFiles[currentFileIndex];
        const animDir = direction > 0 ? 'next' : 'prev';
        openViewer(file.signedUrl, file.fileType, file.fileName, animDir);
        updateNavButtons();
    }
}

function updateNavButtons() {
    const prevBtn = document.getElementById('prevFileBtn');
    const nextBtn = document.getElementById('nextFileBtn');
    if (prevBtn) prevBtn.disabled = currentFileIndex <= 0;
    if (nextBtn) nextBtn.disabled = currentFileIndex >= patientFiles.length - 1;
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
