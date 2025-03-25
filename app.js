// API Configuration
const API_BASE_URL = 'https://aeaiou.onrender.com/api/v1';
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json'
};

// DOM Elements
const generationForm = document.getElementById('generation-form');
const promptInput = document.getElementById('prompt');
const generateBtn = document.getElementById('generate-btn');
const modelTypeSelect = document.getElementById('model_type');
const widthHeightRatioSelect = document.getElementById('width_height_ratio');
const imagePreview = document.getElementById('image-preview');
const generatedImage = document.getElementById('generated-image');
const loadingIndicator = document.getElementById('loading-indicator');
const imageActions = document.getElementById('image-actions');
const downloadBtn = document.getElementById('download-btn');
const shareBtn = document.getElementById('share-btn');
const variationsBtn = document.getElementById('variations-btn');
const suggestionChips = document.querySelectorAll('.suggestion-chip');
const gallery = document.getElementById('gallery');

// State
let currentImageUrl = null;
let currentJobId = null;
let pollingInterval = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadGalleryImages();
});

function setupEventListeners() {
  // Form submission
  generationForm.addEventListener('submit', handleFormSubmit);
  
  // Suggestion chips
  suggestionChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      promptInput.value = prompt;
      // Add a subtle highlight animation
      chip.classList.add('active');
      setTimeout(() => {
        chip.classList.remove('active');
      }, 300);
    });
  });
  
  // Image actions
  downloadBtn.addEventListener('click', handleDownload);
  shareBtn.addEventListener('click', handleShare);
  variationsBtn.addEventListener('click', handleVariations);
  
  // Image preview click to enlarge
  generatedImage.addEventListener('click', () => {
    if (currentImageUrl) {
      openImageInLightbox(currentImageUrl);
    }
  });
}

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const prompt = promptInput.value.trim();
  if (!prompt) {
    showNotification('Please enter a prompt', 'error');
    return;
  }
  
  // Show loading state
  setLoading(true);
  
  // Collect parameters for the API
  const params = {
    prompt,
    model_type: modelTypeSelect.value,
    width_height_ratio: widthHeightRatioSelect.value,
    num_inference_steps: 50,
    guidance_scale: 7.5
  };
  
  try {
    // Submit generation request
    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(params),
      mode: 'cors', // Explicitly request CORS
      credentials: 'omit' // Don't send cookies
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to generate image');
    }
    
    // Store job_id and poll for results
    const jobId = data.job_id;
    pollJobStatus(jobId);
    
  } catch (error) {
    console.error('Error generating image:', error);
    showNotification(`Error: ${error.message || 'Failed to generate image'}`, 'error');
    resetUI();
  }
}

// Poll job status
async function pollJobStatus(jobId) {
  try {
    const response = await fetch(`${API_BASE_URL}/status/${jobId}`, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
      mode: 'cors',
      credentials: 'omit'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to check job status');
    }
    
    if (data.status === 'completed') {
      // Job is done, get the result
      console.log('Job completed:', data);
      fetchImage(data.result.image_url);
      clearInterval(pollingInterval);
    } else if (data.status === 'failed') {
      // Job failed
      showNotification(`Error: ${data.message || 'Image generation failed'}`, 'error');
      resetUI();
      clearInterval(pollingInterval);
    } else {
      // Job still in progress, continue polling
      currentJobId = jobId;
      if (!pollingInterval) {
        // If not already polling, set up polling
        pollingInterval = setInterval(() => pollJobStatus(jobId), 2000);
      }
    }
  } catch (error) {
    console.error('Error checking job status:', error);
    showNotification(`Error: ${error.message || 'Failed to check job status'}`, 'error');
    resetUI();
    clearInterval(pollingInterval);
  }
}

// Fetch the generated image
async function fetchImage(imageUrl) {
  try {
    // Preload the image
    const img = new Image();
    img.onload = () => {
      // Image loaded successfully
      currentImageUrl = imageUrl;
      displayImage(imageUrl);
    };
    img.onerror = () => {
      throw new Error('Failed to load the generated image');
    };
    img.src = imageUrl;
  } catch (error) {
    console.error('Error fetching image:', error);
    showNotification(`Error: ${error.message || 'Failed to fetch the generated image'}`, 'error');
    resetUI();
  }
}

// Display image in the UI
function displayImage(imageUrl) {
  // Reset class on the container
  imagePreview.classList.remove('empty');
  
  // Show the image
  generatedImage.src = imageUrl;
  generatedImage.classList.remove('hidden');
  
  // Hide placeholder and loading indicator
  const placeholderText = imagePreview.querySelector('.placeholder-text');
  if (placeholderText) {
    placeholderText.classList.add('hidden');
  }
  
  // Show image actions
  imageActions.classList.remove('hidden');
  
  // Add to gallery (for demo)
  addToGallery(imageUrl, promptInput.value);
  
  // Reset loading state
  setLoading(false);
  
  // Add a subtle reveal animation
  generatedImage.style.opacity = '0';
  setTimeout(() => {
    generatedImage.style.transition = 'opacity 0.5s ease';
    generatedImage.style.opacity = '1';
  }, 100);
}

// Handle downloading the image
function handleDownload() {
  if (!currentImageUrl) return;
  
  const link = document.createElement('a');
  link.href = currentImageUrl;
  link.download = `aeaiou-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showNotification('Image downloaded successfully', 'success');
}

// Handle sharing the image
function handleShare() {
  if (!currentImageUrl) return;
  
  if (navigator.share) {
    navigator.share({
      title: 'My AI-generated image',
      text: `Check out this image I created with aeaiou: "${promptInput.value}"`,
      url: currentImageUrl,
    })
    .then(() => console.log('Shared successfully'))
    .catch((error) => console.error('Error sharing:', error));
  } else {
    // Fallback for browsers without Web Share API
    navigator.clipboard.writeText(currentImageUrl)
      .then(() => {
        showNotification('Image URL copied to clipboard', 'success');
      })
      .catch(() => {
        showNotification('Failed to copy image URL', 'error');
      });
  }
}

// Handle creating variations
function handleVariations() {
  // This would typically send a variation request to the API
  // For now, just re-submit with a slightly modified prompt
  const currentPrompt = promptInput.value;
  promptInput.value = `${currentPrompt} (variation)`;
  generateBtn.click();
  showNotification('Creating a variation of this image...', 'info');
}

// Open image in lightbox
function openImageInLightbox(imageUrl) {
  // Create lightbox elements
  const lightbox = document.createElement('div');
  lightbox.classList.add('lightbox');
  
  const lightboxContent = document.createElement('div');
  lightboxContent.classList.add('lightbox-content');
  
  const img = document.createElement('img');
  img.src = imageUrl;
  
  const closeBtn = document.createElement('button');
  closeBtn.classList.add('lightbox-close');
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', () => {
    document.body.removeChild(lightbox);
  });
  
  lightboxContent.appendChild(img);
  lightboxContent.appendChild(closeBtn);
  lightbox.appendChild(lightboxContent);
  
  // Add lightbox to the document
  document.body.appendChild(lightbox);
  
  // Close lightbox when clicking outside the image
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      document.body.removeChild(lightbox);
    }
  });
}

// Loading state management
function setLoading(isLoading) {
  if (isLoading) {
    loadingIndicator.classList.remove('hidden');
    generateBtn.disabled = true;
    generateBtn.innerHTML = 'Generating...';
  } else {
    loadingIndicator.classList.add('hidden');
    generateBtn.disabled = false;
    generateBtn.innerHTML = 'Generate';
  }
}

// Reset UI
function resetUI() {
  setLoading(false);
  clearInterval(pollingInterval);
  pollingInterval = null;
}

// Notification system
function showNotification(message, type = 'info') {
  // Check if notification container exists, create if not
  let notificationContainer = document.querySelector('.notification-container');
  
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.classList.add('notification-container');
    document.body.appendChild(notificationContainer);
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.classList.add('notification', `notification-${type}`);
  notification.textContent = message;
  
  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.classList.add('notification-close');
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', () => {
    notification.remove();
  });
  
  notification.appendChild(closeBtn);
  notificationContainer.appendChild(notification);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      notification.remove();
    }, 500);
  }, 5000);
}

// Mock function to load gallery images (would typically come from the API)
function loadGalleryImages() {
  const mockImages = [
    {
      url: 'https://replicate.delivery/pbxt/4kXE7oP3haN6D4K0nlFk6QWwRlRaGu7hzSFvzP7UKOGwnYHhA/out-0.png',
      prompt: 'A beautiful sunset over mountains, digital art style'
    },
    {
      url: 'https://replicate.delivery/pbxt/7JjD78D2jqtpS1hBYjaKonMXfOFELWs5Xje7YnN9YUzunYHhA/out-0.png',
      prompt: 'Underwater coral reef with colorful fish'
    },
    {
      url: 'https://replicate.delivery/pbxt/7Ej0OQrhDhg9wIzgJVF9kOQhTfHRebHanrGNhXhynPi0nYHhA/out-0.png',
      prompt: 'Cyberpunk cityscape at night with neon lights'
    },
    {
      url: 'https://replicate.delivery/pbxt/1qBFTj9UCc7a0dwyk728MWdHXOzqR6TxthK7PzLcU5C9vr2QA/out-0.png',
      prompt: 'Enchanted forest with magical creatures'
    }
  ];
  
  mockImages.forEach(img => {
    addToGallery(img.url, img.prompt);
  });
}

// Add an image to the gallery
function addToGallery(imageUrl, prompt) {
  // Create gallery item
  const galleryItem = document.createElement('div');
  galleryItem.classList.add('gallery-item');
  
  // Create image element
  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = prompt;
  img.loading = 'lazy'; // Lazy load images
  
  // Create info div
  const info = document.createElement('div');
  info.classList.add('info');
  
  // Add title from prompt (limited to first few words)
  const title = document.createElement('h3');
  title.textContent = formatPromptAsTitle(prompt);
  
  // Add timestamp
  const timestamp = document.createElement('p');
  timestamp.textContent = formatDate(new Date());
  
  // Add elements to the gallery item
  info.appendChild(title);
  info.appendChild(timestamp);
  galleryItem.appendChild(img);
  galleryItem.appendChild(info);
  
  // Add click event to open in lightbox
  galleryItem.addEventListener('click', () => {
    openImageInLightbox(imageUrl);
  });
  
  // Add to gallery (prepend to show newest first)
  gallery.prepend(galleryItem);
}

// Format prompt as a title (limit to first few words)
function formatPromptAsTitle(prompt) {
  const words = prompt.split(' ');
  if (words.length <= 5) return prompt;
  return words.slice(0, 5).join(' ') + '...';
}

// Format date
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

// Add CSS for the new notification system and lightbox
function addDynamicStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Notification system */
    .notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .notification {
      background-color: white;
      color: var(--text);
      padding: 12px 16px;
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow);
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-width: 300px;
      max-width: 400px;
      border-left: 4px solid;
      animation: slideIn 0.3s ease-out forwards;
    }
    
    .notification-info {
      border-left-color: var(--primary);
    }
    
    .notification-success {
      border-left-color: #10B981;
    }
    
    .notification-error {
      border-left-color: #EF4444;
    }
    
    .notification-close {
      background: none;
      border: none;
      color: var(--text-light);
      font-size: 1.25rem;
      cursor: pointer;
      margin-left: 10px;
    }
    
    .notification.fade-out {
      animation: slideOut 0.5s ease-out forwards;
    }
    
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
    
    /* Lightbox */
    .lightbox {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.3s ease-out;
    }
    
    .lightbox-content {
      position: relative;
      max-width: 90%;
      max-height: 90%;
    }
    
    .lightbox-content img {
      max-width: 100%;
      max-height: 90vh;
      border-radius: var(--radius);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    }
    
    .lightbox-close {
      position: absolute;
      top: -40px;
      right: -40px;
      background: none;
      border: none;
      color: white;
      font-size: 2rem;
      cursor: pointer;
    }
    
    /* Suggestion chip active state */
    .suggestion-chip.active {
      background-color: var(--primary);
      color: white;
      transform: scale(1.05);
    }
  `;
  
  document.head.appendChild(style);
}

// Initialize dynamic styles when the page loads
document.addEventListener('DOMContentLoaded', addDynamicStyles);
