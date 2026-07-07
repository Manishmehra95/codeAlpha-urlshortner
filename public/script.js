// ==================== DOM Elements ====================
const urlInput = document.getElementById('urlInput');
const shortenBtn = document.getElementById('shortenBtn');
const btnText = shortenBtn.querySelector('.btn-text');
const btnLoader = shortenBtn.querySelector('.btn-loader');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');
const shortUrl = document.getElementById('shortUrl');
const copyBtn = document.getElementById('copyBtn');
const qrSection = document.getElementById('qrSection');
const qrCode = document.getElementById('qrCode');
const downloadQR = document.getElementById('downloadQR');
const clickCount = document.getElementById('clickCount');
const createdDate = document.getElementById('createdDate');
const expiryStat = document.getElementById('expiryStat');
const expiryDate = document.getElementById('expiryDate');
const shareBtn = document.getElementById('shareBtn');
const deleteBtn = document.getElementById('deleteBtn');
const shortenAnother = document.getElementById('shortenAnother');
const customAlias = document.getElementById('customAlias');
const expiresIn = document.getElementById('expiresIn');
const toggleAdvanced = document.getElementById('toggleAdvanced');
const advancedOptions = document.getElementById('advancedOptions');
const themeToggle = document.getElementById('themeToggle');
const toastContainer = document.getElementById('toastContainer');

// ==================== State ====================
let currentShortCode = null;
let currentQRCode = null;

// ==================== Event Listeners ====================
document.addEventListener('DOMContentLoaded', initializeApp);
shortenBtn.addEventListener('click', handleShortenUrl);
copyBtn.addEventListener('click', handleCopyUrl);
downloadQR.addEventListener('click', handleDownloadQR);
shareBtn.addEventListener('click', handleShareUrl);
deleteBtn.addEventListener('click', handleDeleteUrl);
shortenAnother.addEventListener('click', resetForm);
toggleAdvanced.addEventListener('click', toggleAdvancedOptions);
themeToggle.addEventListener('click', toggleTheme);
urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleShortenUrl();
});

// ==================== Initialization ====================
function initializeApp() {
    // Check for saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    // Focus on input
    urlInput.focus();
}

// ==================== Theme Toggle ====================
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
}

// ==================== Toggle Advanced Options ====================
function toggleAdvancedOptions() {
    const isVisible = advancedOptions.style.display !== 'none';
    advancedOptions.style.display = isVisible ? 'none' : 'block';
    toggleAdvanced.innerHTML = isVisible 
        ? '<i class="fas fa-cog"></i> Advanced Options'
        : '<i class="fas fa-times"></i> Hide Advanced Options';
}

// ==================== URL Shortening ====================
async function handleShortenUrl() {
    const url = urlInput.value.trim();
    
    // Validate input
    if (!url) {
        showError('Please enter a URL to shorten');
        return;
    }
    
    // Show loading state
    setLoading(true);
    hideError();
    hideResult();
    
    try {
        // Prepare request body
        const requestBody = { originalUrl: url };
        
        // Add custom alias if provided
        if (customAlias.value.trim()) {
            requestBody.customAlias = customAlias.value.trim();
        }
        
        // Add expiration if provided
        if (expiresIn.value) {
            requestBody.expiresInDays = parseInt(expiresIn.value);
        }
        
        // Make API request
        const response = await fetch('/api/shorten', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to shorten URL');
        }
        
        // Display result
        displayResult(data.data);
        showToast('URL shortened successfully!', 'success');
        
    } catch (error) {
        showError(error.message || 'An error occurred. Please try again.');
        showToast(error.message, 'error');
    } finally {
        setLoading(false);
    }
}

// ==================== Display Result ====================
function displayResult(data) {
    currentShortCode = data.shortCode;
    
    // Set shortened URL
    shortUrl.href = data.shortUrl;
    shortUrl.textContent = data.shortUrl;
    
    // Show result section
    resultSection.style.display = 'block';
    
    // Update stats
    clickCount.textContent = data.clicks || 0;
    createdDate.textContent = new Date(data.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Show expiration if exists
    if (data.expiresAt) {
        expiryStat.style.display = 'flex';
        expiryDate.textContent = new Date(data.expiresAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } else {
        expiryStat.style.display = 'none';
    }
    
    // Generate QR Code
    generateQRCode(data.shortUrl);
    
    // Show delete button
    deleteBtn.style.display = 'flex';
    
    // Scroll to result
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ==================== QR Code Generation ====================
function generateQRCode(url) {
    // Clear previous QR code
    qrCode.innerHTML = '';
    
    // Show QR section
    qrSection.style.display = 'block';
    
    // Generate new QR code
    currentQRCode = new QRCode(qrCode, {
        text: url,
        width: 150,
        height: 150,
        colorDark: '#2d3748',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
}

// ==================== Download QR Code ====================
function handleDownloadQR() {
    const canvas = qrCode.querySelector('canvas');
    if (!canvas) {
        showToast('QR code not found', 'error');
        return;
    }
    
    // Convert canvas to image and download
    const link = document.createElement('a');
    link.download = `qr-code-${currentShortCode}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    showToast('QR code downloaded!', 'success');
}

// ==================== Copy to Clipboard ====================
async function handleCopyUrl() {
    try {
        await navigator.clipboard.writeText(shortUrl.href);
        
        // Update button state
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i><span>Copied!</span>';
        copyBtn.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
        
        showToast('URL copied to clipboard!', 'success');
        
        // Reset button after 2 seconds
        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            copyBtn.style.background = '';
        }, 2000);
        
    } catch (error) {
        showToast('Failed to copy URL', 'error');
    }
}

// ==================== Share URL ====================
async function handleShareUrl() {
    const url = shortUrl.href;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Shortened URL',
                text: 'Check out this shortened URL!',
                url: url,
            });
            showToast('URL shared successfully!', 'success');
        } catch (error) {
            if (error.name !== 'AbortError') {
                showToast('Failed to share URL', 'error');
            }
        }
    } else {
        // Fallback: copy to clipboard
        await handleCopyUrl();
        showToast('URL copied (sharing not supported)', 'info');
    }
}

// ==================== Delete URL ====================
async function handleDeleteUrl() {
    if (!currentShortCode) return;
    
    if (!confirm('Are you sure you want to delete this shortened URL?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/url/${currentShortCode}`, {
            method: 'DELETE',
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to delete URL');
        }
        
        showToast('URL deleted successfully!', 'success');
        resetForm();
        
    } catch (error) {
        showToast(error.message || 'Failed to delete URL', 'error');
    }
}

// ==================== UI Helpers ====================
function setLoading(isLoading) {
    shortenBtn.disabled = isLoading;
    btnText.style.display = isLoading ? 'none' : 'inline';
    btnLoader.style.display = isLoading ? 'inline' : 'none';
    
    if (isLoading) {
        shortenBtn.style.cursor = 'wait';
    } else {
        shortenBtn.style.cursor = 'pointer';
    }
}

function showError(message) {
    errorSection.style.display = 'block';
    errorMessage.textContent = message;
    errorSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideError() {
    errorSection.style.display = 'none';
}

function hideResult() {
    resultSection.style.display = 'none';
    currentShortCode = null;
}

function resetForm() {
    urlInput.value = '';
    customAlias.value = '';
    expiresIn.value = '';
    hideResult();
    hideError();
    advancedOptions.style.display = 'none';
    toggleAdvanced.innerHTML = '<i class="fas fa-cog"></i> Advanced Options';
    urlInput.focus();
}

// ==================== Toast Notifications ====================
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// ==================== Handle URL Stats Update ====================
async function updateStats() {
    if (!currentShortCode) return;
    
    try {
        const response = await fetch(`/api/stats/${currentShortCode}`);
        const data = await response.json();
        
        if (data.success) {
            clickCount.textContent = data.data.clicks;
        }
    } catch (error) {
        console.error('Failed to update stats:', error);
    }
}

// Update stats periodically
setInterval(updateStats, 30000); // Every 30 seconds