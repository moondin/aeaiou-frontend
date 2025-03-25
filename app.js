// API Configuration
const API_BASE_URL = 'https://api.aeaiou.com/api/v1';
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json'
};

// API Endpoints
const API_ENDPOINTS = {
  login: `${API_BASE_URL}/auth/login`,
  register: `${API_BASE_URL}/auth/register`,
  me: `${API_BASE_URL}/auth/me`,
  generateImage: `${API_BASE_URL}/generate`,
  userImages: `${API_BASE_URL}/user-images`,
  gallery: `${API_BASE_URL}/gallery`
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
const saveBtn = document.getElementById('save-btn');
const suggestionChips = document.querySelectorAll('.suggestion-chip');
const gallery = document.getElementById('gallery');
const personalGallery = document.getElementById('personal-gallery-grid');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const personalGalleryTab = document.getElementById('personal-gallery-tab');

// Auth Elements
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const authModal = document.getElementById('auth-modal');
const closeModal = document.querySelector('.close-modal');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const switchToSignup = document.getElementById('switch-to-signup');
const switchToLogin = document.getElementById('switch-to-login');
const loginFormElement = document.getElementById('login-form-element');
const signupFormElement = document.getElementById('signup-form-element');
const userProfile = document.getElementById('user-profile');
const usernameDisplay = document.getElementById('username-display');
const logoutBtn = document.getElementById('logout-btn');
const myGalleryLink = document.getElementById('my-gallery-link');

// State
let currentImageUrl = null;
let currentJobId = null;
let pollingInterval = null;
let authToken = null;
let currentUser = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  initializeGallery();
});

function initializeGallery() {
  // Initialize components
  addDynamicStyles();
  createComponents();
  setupEventListeners();
  
  // Create authentication UI and gallery tabs
  createAuthUI();
  
  // Check authentication status (this will update UI accordingly)
  checkAuthStatus();
  
  // Load public gallery initially
  loadGallery('public');
}

function setupEventListeners() {
  // Existing event listeners
  generationForm.addEventListener('submit', handleFormSubmit);
  downloadBtn.addEventListener('click', handleDownload);
  shareBtn.addEventListener('click', handleShare);
  variationsBtn.addEventListener('click', handleVariations);
  saveBtn && saveBtn.addEventListener('click', saveToUserGallery);

  // Suggestion chips
  suggestionChips.forEach(chip => {
    chip.addEventListener('click', () => {
      promptInput.value = chip.getAttribute('data-prompt');
      promptInput.focus();
    });
  });

  // Auth event listeners
  loginBtn && loginBtn.addEventListener('click', openLoginModal);
  signupBtn && signupBtn.addEventListener('click', openSignupModal);
  closeModal && closeModal.addEventListener('click', closeAuthModal);
  switchToSignup && switchToSignup.addEventListener('click', (e) => {
    e.preventDefault();
    showSignupForm();
  });
  switchToLogin && switchToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    showLoginForm();
  });
  loginFormElement && loginFormElement.addEventListener('submit', handleLogin);
  signupFormElement && signupFormElement.addEventListener('submit', handleSignup);
  logoutBtn && logoutBtn.addEventListener('click', handleLogout);
  myGalleryLink && myGalleryLink.addEventListener('click', (e) => {
    e.preventDefault();
    showPersonalGallery();
  });

  // Tab switching
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      switchTab(tabName);
    });
  });

  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    if (authModal && e.target === authModal) {
      closeAuthModal();
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
    const response = await fetch(API_ENDPOINTS.generateImage, {
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
  const img = new Image();
  img.onload = () => {
    setLoading(false);
    imagePreview.classList.remove('empty');
    generatedImage.src = imageUrl;
    generatedImage.classList.remove('hidden');
    imageActions.classList.remove('hidden');
    
    // Make the image clickable to open in lightbox
    generatedImage.addEventListener('click', () => {
      openImageInLightbox(imageUrl);
    });
    
    // Save the current image URL for download and share
    currentImageUrl = imageUrl;
    
    // Show/hide save button based on authentication
    if (saveBtn) {
      if (isAuthenticated()) {
        saveBtn.classList.remove('hidden');
      } else {
        saveBtn.classList.add('hidden');
      }
    }
    
    // Add to public gallery automatically
    addToGallery(imageUrl, promptInput.value, 'gallery');
  };
  
  img.onerror = () => {
    setLoading(false);
    showNotification('Failed to load the generated image', 'error');
  };
  
  img.src = imageUrl;
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
function setLoading(isLoading, element = null) {
  if (isLoading) {
    if (element) {
      element.disabled = true;
      element.innerHTML = 'Loading...';
    } else {
      loadingIndicator.classList.remove('hidden');
      generateBtn.disabled = true;
      generateBtn.innerHTML = 'Generating...';
    }
  } else {
    if (element) {
      element.disabled = false;
      element.innerHTML = 'Save';
    } else {
      loadingIndicator.classList.add('hidden');
      generateBtn.disabled = false;
      generateBtn.innerHTML = 'Generate';
    }
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
  fetch(`${API_BASE_URL}/gallery/public`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch gallery images');
      }
      return response.json();
    })
    .then(data => {
      gallery.innerHTML = '';
      if (data.length === 0) {
        gallery.innerHTML = '<p class="empty-message">No images in the gallery yet. Be the first to create one!</p>';
        return;
      }
      
      data.forEach(image => {
        addToGallery(image.url, image.prompt, 'gallery');
      });
    })
    .catch(error => {
      console.error('Error loading gallery:', error);
      gallery.innerHTML = '<p class="error-message">Failed to load gallery images</p>';
    });
}

// Add an image to the gallery
function addToGallery(imageUrl, prompt, targetGallery = 'gallery') {
  const targetElement = targetGallery === 'gallery' ? gallery : personalGallery;
  
  const galleryItem = document.createElement('div');
  galleryItem.classList.add('gallery-item');
  
  const galleryImage = document.createElement('img');
  galleryImage.src = imageUrl;
  galleryImage.alt = prompt;
  galleryImage.loading = 'lazy';
  
  const galleryCaption = document.createElement('div');
  galleryCaption.classList.add('gallery-caption');
  
  const galleryTitle = document.createElement('h3');
  galleryTitle.textContent = formatPromptAsTitle(prompt);
  
  const galleryDate = document.createElement('span');
  galleryDate.classList.add('gallery-date');
  galleryDate.textContent = formatDate(new Date());
  
  galleryCaption.appendChild(galleryTitle);
  galleryCaption.appendChild(galleryDate);
  
  galleryItem.appendChild(galleryImage);
  galleryItem.appendChild(galleryCaption);
  
  // Make gallery images clickable to open in lightbox
  galleryItem.addEventListener('click', () => {
    openImageInLightbox(imageUrl);
  });
  
  targetElement.prepend(galleryItem);
  
  // Apply fade-in animation
  setTimeout(() => {
    galleryItem.classList.add('visible');
  }, 50);
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

// Save the current image to user's gallery
async function saveToUserGallery() {
  if (!isAuthenticated() || !currentImageUrl) {
    showNotification('Please login to save images to your gallery', 'warning');
    openModal('login-modal');
    return;
  }
  
  setLoading(true, saveBtn);
  
  try {
    // Get the image data
    const imageBlob = await fetch(currentImageUrl).then(res => res.blob());
    const formData = new FormData();
    formData.append('file', imageBlob, 'image.png');
    formData.append('prompt', promptInput.value || 'No prompt provided');
    formData.append('is_public', 'true'); // Default to public
    
    // Save to user's gallery using the API
    const response = await fetch(API_ENDPOINTS.userImages, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Failed to save image');
    }
    
    const data = await response.json();
    
    // Add to the personal gallery immediately
    addToGallery(currentImageUrl, promptInput.value, 'personal-gallery');
    
    // Show success message
    showNotification('Image saved to your gallery', 'success');
    
    // Update UI to indicate image is saved
    if (saveBtn) {
      saveBtn.classList.add('saved');
      saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved';
      
      // Revert back after a while
      setTimeout(() => {
        saveBtn.classList.remove('saved');
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
      }, 3000);
    }
  } catch (error) {
    console.error('Error saving image:', error);
    showNotification('Failed to save image. Please try again.', 'error');
  } finally {
    setLoading(false, saveBtn);
  }
}

// Load gallery items from server
async function loadGallery(galleryType = 'public') {
  const galleryContainer = document.getElementById(galleryType === 'public' ? 'gallery' : 'personal-gallery');
  if (!galleryContainer) return;
  
  // Clear existing gallery items
  galleryContainer.innerHTML = '';
  
  // Show loading indicator
  const loadingEl = document.createElement('div');
  loadingEl.className = 'gallery-loading';
  loadingEl.innerHTML = '<div class="spinner"></div>';
  galleryContainer.appendChild(loadingEl);
  
  try {
    let url;
    let options = {};
    
    if (galleryType === 'public') {
      // Public gallery endpoint
      url = API_ENDPOINTS.gallery;
    } else {
      // Personal gallery endpoint (requires authentication)
      if (!isAuthenticated()) {
        galleryContainer.innerHTML = '<div class="empty-message">Please login to view your personal gallery</div>';
        return;
      }
      
      url = API_ENDPOINTS.userImages;
      options = {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      };
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error('Failed to load gallery');
    }
    
    const data = await response.json();
    
    // Remove loading indicator
    galleryContainer.removeChild(loadingEl);
    
    // Check if gallery is empty
    if (!data || data.length === 0) {
      galleryContainer.innerHTML = `<div class="empty-message">No images in your ${galleryType} gallery yet</div>`;
      return;
    }
    
    // Add each image to gallery
    data.forEach(item => {
      addToGallery(item.image_url, item.prompt, galleryType === 'public' ? 'gallery' : 'personal-gallery');
    });
    
  } catch (error) {
    console.error('Error loading gallery:', error);
    galleryContainer.innerHTML = '<div class="error-message">Failed to load gallery. Please try again later.</div>';
  }
}

// Authentication Functions
function getToken() {
  return authToken;
}

function isAuthenticated() {
  return !!authToken && !!currentUser;
}

// Handle user login
function handleLogin() {
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  
  if (!usernameInput || !passwordInput) return;
  
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  
  if (!username || !password) {
    showNotification('Please enter both username and password', 'error');
    return;
  }
  
  // Disable form and show loading
  const submitBtn = document.querySelector('#login-form button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Logging in...';
  }
  
  // Call the API
  fetch(API_ENDPOINTS.login, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: username,
      password: password
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Login failed');
    }
    return response.json();
  })
  .then(data => {
    // Save auth token and user info
    authToken = data.access_token;
    currentUser = data.user;
    
    // Save to localStorage for persistence
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Update UI
    updateAuthUI();
    closeAllModals();
    
    // Show success message
    showNotification(`Welcome back, ${currentUser.username}!`, 'success');
    
    // Load user's gallery
    loadGallery('personal');
  })
  .catch(error => {
    console.error('Login error:', error);
    showNotification('Login failed. Please check your credentials and try again.', 'error');
  })
  .finally(() => {
    // Re-enable form
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Log In';
    }
  });
}

// Handle user registration
function handleSignup() {
  const emailInput = document.getElementById('signup-email');
  const usernameInput = document.getElementById('signup-username');
  const passwordInput = document.getElementById('signup-password');
  const confirmPasswordInput = document.getElementById('signup-confirm-password');
  
  if (!emailInput || !usernameInput || !passwordInput || !confirmPasswordInput) return;
  
  const email = emailInput.value.trim();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  
  if (!email || !username || !password) {
    showNotification('Please fill in all fields', 'error');
    return;
  }
  
  if (password !== confirmPassword) {
    showNotification('Passwords do not match', 'error');
    return;
  }
  
  // Disable form and show loading
  const submitBtn = document.querySelector('#signup-form button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Creating account...';
  }
  
  // Call the API
  fetch(API_ENDPOINTS.register, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: email,
      username: username,
      password: password
    })
  })
  .then(response => {
    if (!response.ok) {
      if (response.status === 400) {
        return response.json().then(data => {
          throw new Error(data.detail || 'Registration failed');
        });
      }
      throw new Error('Registration failed');
    }
    return response.json();
  })
  .then(data => {
    showNotification('Account created successfully! You can now log in.', 'success');
    
    // Switch to login form
    closeModal('signup-modal');
    openModal('login-modal');
    
    // Pre-fill login form with the new username
    const loginUsernameInput = document.getElementById('login-username');
    if (loginUsernameInput) {
      loginUsernameInput.value = username;
    }
  })
  .catch(error => {
    console.error('Registration error:', error);
    showNotification(error.message || 'Registration failed. Please try again.', 'error');
  })
  .finally(() => {
    // Re-enable form
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Sign Up';
    }
  });
}

// Check authentication status on page load
function checkAuthStatus() {
  // Try to get stored auth data
  const storedToken = localStorage.getItem('authToken');
  const storedUser = localStorage.getItem('currentUser');
  
  if (storedToken && storedUser) {
    // Set the global variables
    authToken = storedToken;
    try {
      currentUser = JSON.parse(storedUser);
    } catch (e) {
      console.error('Failed to parse user data:', e);
      // Clear invalid data
      logout();
      return;
    }
    
    // Verify token is still valid
    fetch(API_ENDPOINTS.me, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Token expired or invalid');
      }
      return response.json();
    })
    .then(data => {
      updateAuthUI();
      loadGallery('personal');
    })
    .catch(error => {
      console.error('Auth verification error:', error);
      // Clear invalid auth data
      logout();
    });
  } else {
    // User is not logged in
    updateAuthUI();
  }
}

// Logout the user
function logout() {
  // Clear auth data
  authToken = null;
  currentUser = null;
  
  // Remove from localStorage
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  
  // Update UI
  updateAuthUI();
  
  // Show message
  showNotification('You have been logged out', 'info');
  
  // If on personal gallery tab, switch to public
  const personalTab = document.querySelector('.tab-btn[data-tab="personal"]');
  if (personalTab && personalTab.classList.contains('active')) {
    switchTab('public');
  }
}

// Add CSS for the new notification system and lightbox
function addDynamicStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Notification System */
    #notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 300px;
    }

    .notification {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slide-in 0.3s ease-out forwards;
      transition: opacity 0.3s, transform 0.3s;
    }

    .notification.hide {
      opacity: 0;
      transform: translateX(100%);
    }

    .notification-icon {
      margin-right: 12px;
      font-size: 18px;
    }

    .notification-success .notification-icon {
      color: #10b981;
    }

    .notification-error .notification-icon {
      color: #ef4444;
    }

    .notification-info .notification-icon {
      color: #3b82f6;
    }

    .notification-warning .notification-icon {
      color: #f59e0b;
    }

    .notification-message {
      font-size: 14px;
      line-height: 1.4;
      color: #333;
    }

    @keyframes slide-in {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    /* Lightbox */
    .lightbox {
      display: none;
      position: fixed;
      z-index: 2000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .lightbox.active {
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 1;
    }

    .lightbox-content {
      position: relative;
      max-width: 90%;
      max-height: 90%;
      animation: lightbox-zoom 0.3s ease-out forwards;
    }

    .lightbox-img {
      max-width: 100%;
      max-height: 90vh;
      display: block;
      margin: 0 auto;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }

    .close-lightbox {
      position: absolute;
      top: -30px;
      right: -30px;
      color: white;
      font-size: 30px;
      font-weight: bold;
      cursor: pointer;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background-color: rgba(0, 0, 0, 0.5);
      transition: background-color 0.2s;
    }

    .close-lightbox:hover {
      background-color: rgba(0, 0, 0, 0.8);
    }

    @keyframes lightbox-zoom {
      from {
        transform: scale(0.8);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }

    /* Auth Styles */
    .auth-controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .auth-btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .auth-btn.primary-btn {
      background: #4361EE;
      color: white;
      border: none;
    }

    .auth-btn.primary-btn:hover {
      background: #3454d1;
    }

    .auth-btn.secondary-btn {
      background: transparent;
      color: #333;
      border: 1px solid #e1e1e1;
    }

    .auth-btn.secondary-btn:hover {
      border-color: #4361EE;
      color: #4361EE;
    }

    .user-profile {
      position: relative;
      display: flex;
      align-items: center;
      cursor: pointer;
    }

    .user-profile span {
      font-weight: 600;
      color: #333;
      padding: 8px 12px;
      border-radius: 6px;
      background-color: #f0f4ff;
    }

    .user-menu {
      position: absolute;
      top: 100%;
      right: 0;
      display: none;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      width: 200px;
      z-index: 100;
      padding: 8px 0;
      margin-top: 8px;
    }

    .user-profile:hover .user-menu {
      display: block;
    }

    .user-menu a {
      display: block;
      padding: 10px 16px;
      color: #333;
      text-decoration: none;
      transition: background 0.2s ease;
    }

    .user-menu a:hover {
      background: #f5f5f5;
      color: #4361EE;
    }

    /* Modal Styles */
    .modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      overflow: auto;
    }

    .modal-content {
      background-color: white;
      margin: 10% auto;
      padding: 32px;
      border-radius: 12px;
      width: 400px;
      max-width: 90%;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      position: relative;
    }

    .close-modal {
      position: absolute;
      top: 16px;
      right: 16px;
      color: #aaa;
      font-size: 24px;
      font-weight: bold;
      cursor: pointer;
    }

    .close-modal:hover {
      color: #333;
    }

    .auth-form h2 {
      margin-top: 0;
      margin-bottom: 24px;
      color: #333;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #555;
    }

    .form-group input {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
    }

    .form-group input:focus {
      border-color: #4361EE;
      outline: none;
      box-shadow: 0 0 0 2px rgba(67, 97, 238, 0.2);
    }

    .form-switch {
      text-align: center;
      margin-top: 16px;
      color: #666;
    }

    .form-switch a {
      color: #4361EE;
      text-decoration: none;
      font-weight: 500;
    }

    .form-switch a:hover {
      text-decoration: underline;
    }

    /* Gallery Styles */
    .gallery-tabs {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      border-bottom: 1px solid #efefef;
      padding-bottom: 8px;
    }

    .tab-btn {
      background: none;
      border: none;
      padding: 12px 16px;
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      color: #666;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s ease;
    }

    .tab-btn:hover {
      color: #4361EE;
    }

    .tab-btn.active {
      color: #4361EE;
      border-bottom-color: #4361EE;
    }

    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
    }

    /* Gallery item fade in */
    .gallery-item {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.5s ease, transform 0.5s ease;
    }

    .gallery-item.visible {
      opacity: 1;
      transform: translateY(0);
    }

    /* Empty states */
    .empty-message, .error-message {
      padding: 40px;
      text-align: center;
      color: #666;
      font-style: italic;
      width: 100%;
    }

    .error-message {
      color: #ef4444;
    }

    /* Mobile responsive styles */
    @media (max-width: 768px) {
      .modal-content {
        width: 90%;
        margin: 20% auto;
      }
      
      .gallery-tabs {
        flex-wrap: wrap;
      }
    }
  `;
  
  document.head.appendChild(style);
}

// Initialize dynamic styles when the page loads
document.addEventListener('DOMContentLoaded', addDynamicStyles);

function switchTab(tabName) {
  tabButtons.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  tabContents.forEach(content => {
    if (content.id === `${tabName}-gallery`) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
  
  if (tabName === 'personal' && isAuthenticated()) {
    loadGallery('personal');
  }
}

function showPersonalGallery() {
  if (isAuthenticated()) {
    switchTab('personal');
  } else {
    showNotification('Please log in to view your gallery', 'info');
    openModal('login-modal');
  }
}

// Add to gallery container (for both public and personal)
function addToGallery(imageUrl, prompt, galleryId = 'gallery') {
  const galleryContainer = document.getElementById(galleryId);
  if (!galleryContainer) return;
  
  // Create a new gallery item
  const galleryItem = document.createElement('div');
  galleryItem.className = 'gallery-item';
  
  // Create the content
  galleryItem.innerHTML = `
    <div class="gallery-image" style="background-image: url('${imageUrl}')">
      <div class="gallery-overlay">
        <div class="gallery-prompt">${prompt || 'No prompt provided'}</div>
        <div class="gallery-actions">
          <button class="gallery-action view-btn" aria-label="View Image">
            <i class="fas fa-eye"></i>
          </button>
          ${isAuthenticated() && galleryId === 'gallery' ? `
            <button class="gallery-action save-to-personal-btn" aria-label="Save to Personal Gallery">
              <i class="fas fa-bookmark"></i>
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
  
  // Add event listeners
  const viewBtn = galleryItem.querySelector('.view-btn');
  viewBtn.addEventListener('click', () => {
    openImageInLightbox(imageUrl);
  });
  
  // For authenticated users, add save to personal gallery action in public gallery
  if (isAuthenticated() && galleryId === 'gallery') {
    const saveToPersonalBtn = galleryItem.querySelector('.save-to-personal-btn');
    if (saveToPersonalBtn) {
      saveToPersonalBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        saveToUserGallery();
      });
    }
  }
  
  // Add to gallery
  galleryContainer.prepend(galleryItem);
  
  // Fade in effect
  setTimeout(() => {
    galleryItem.classList.add('visible');
  }, 50);
}

// Create the authentication UI elements
function createAuthUI() {
  // Create header auth container if it doesn't exist
  let authContainer = document.querySelector('.auth-container');
  if (!authContainer) {
    const header = document.querySelector('header');
    
    if (header) {
      authContainer = document.createElement('div');
      authContainer.className = 'auth-container';
      header.appendChild(authContainer);
    }
  }
  
  if (!authContainer) return;
  
  // Login/Signup buttons (for logged out users)
  const authControlsHtml = `
    <div class="auth-controls">
      <button id="login-btn" class="auth-btn secondary-btn">Log In</button>
      <button id="signup-btn" class="auth-btn primary-btn">Sign Up</button>
    </div>
  `;
  
  // User profile UI (for logged in users)
  const userProfileHtml = `
    <div class="user-profile">
      <span id="username-display"></span>
      <div class="user-menu">
        <a href="#" id="view-gallery-btn">My Gallery</a>
        <a href="#" id="account-settings-btn">Account Settings</a>
        <a href="#" id="logout-btn">Logout</a>
      </div>
    </div>
  `;
  
  // Create the login modal
  const loginModalHtml = `
    <div id="login-modal" class="modal">
      <div class="modal-content">
        <span class="close-modal">&times;</span>
        <form id="login-form" class="auth-form">
          <h2>Log In</h2>
          <div class="form-group">
            <label for="login-username">Username or Email</label>
            <input type="text" id="login-username" required>
          </div>
          <div class="form-group">
            <label for="login-password">Password</label>
            <input type="password" id="login-password" required>
          </div>
          <button type="submit" class="auth-btn primary-btn">Log In</button>
          <div class="form-switch">
            Don't have an account? <a href="#" id="switch-to-signup">Sign Up</a>
          </div>
        </form>
      </div>
    </div>
  `;
  
  // Create the signup modal
  const signupModalHtml = `
    <div id="signup-modal" class="modal">
      <div class="modal-content">
        <span class="close-modal">&times;</span>
        <form id="signup-form" class="auth-form">
          <h2>Create Account</h2>
          <div class="form-group">
            <label for="signup-email">Email</label>
            <input type="email" id="signup-email" required>
          </div>
          <div class="form-group">
            <label for="signup-username">Username</label>
            <input type="text" id="signup-username" required>
          </div>
          <div class="form-group">
            <label for="signup-password">Password</label>
            <input type="password" id="signup-password" required>
          </div>
          <div class="form-group">
            <label for="signup-confirm-password">Confirm Password</label>
            <input type="password" id="signup-confirm-password" required>
          </div>
          <button type="submit" class="auth-btn primary-btn">Sign Up</button>
          <div class="form-switch">
            Already have an account? <a href="#" id="switch-to-login">Log In</a>
          </div>
        </form>
      </div>
    </div>
  `;
  
  // Create the gallery tabs
  let gallerySection = document.querySelector('.gallery-section');
  if (gallerySection) {
    const galleryTabsHtml = `
      <div class="gallery-tabs">
        <button class="tab-btn active" data-tab="public">Public Gallery</button>
        <button class="tab-btn" data-tab="personal">My Gallery</button>
      </div>
      <div class="tab-content active" id="public-tab">
        <div id="gallery" class="gallery-grid"></div>
      </div>
      <div class="tab-content" id="personal-tab">
        <div id="personal-gallery" class="gallery-grid"></div>
      </div>
    `;
    
    // Clear existing content
    gallerySection.innerHTML = '';
    
    // Add the new structure
    gallerySection.innerHTML = galleryTabsHtml;
  }
  
  // Append modals to body
  document.body.insertAdjacentHTML('beforeend', loginModalHtml);
  document.body.insertAdjacentHTML('beforeend', signupModalHtml);
  
  // Update the auth container based on authentication status
  updateAuthUI();
  
  // Add event listeners
  addAuthEventListeners();
}

// Update UI based on authentication status
function updateAuthUI() {
  const authContainer = document.querySelector('.auth-container');
  if (!authContainer) return;
  
  if (isAuthenticated()) {
    // Show user profile UI
    authContainer.innerHTML = `
      <div class="user-profile">
        <span id="username-display">${currentUser.username}</span>
        <div class="user-menu">
          <a href="#" id="view-gallery-btn">My Gallery</a>
          <a href="#" id="account-settings-btn">Account Settings</a>
          <a href="#" id="logout-btn">Logout</a>
        </div>
      </div>
    `;
    
    // Show save button if there's an image
    if (saveBtn && currentImageUrl) {
      saveBtn.classList.remove('hidden');
    }
    
    // Add event listeners for user profile menu
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
      });
    }
    
    const viewGalleryBtn = document.getElementById('view-gallery-btn');
    if (viewGalleryBtn) {
      viewGalleryBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('personal');
        scrollToElement('.gallery-section');
      });
    }
  } else {
    // Show login/signup buttons
    authContainer.innerHTML = `
      <div class="auth-controls">
        <button id="login-btn" class="auth-btn secondary-btn">Log In</button>
        <button id="signup-btn" class="auth-btn primary-btn">Sign Up</button>
      </div>
    `;
    
    // Hide save button
    if (saveBtn) {
      saveBtn.classList.add('hidden');
    }
    
    // Add event listeners for auth buttons
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        openModal('login-modal');
      });
    }
    
    if (signupBtn) {
      signupBtn.addEventListener('click', () => {
        openModal('signup-modal');
      });
    }
  }
  
  // Update save button visibility in the image display
  updateSaveButtonVisibility();
}

// Update save button visibility based on authentication status
function updateSaveButtonVisibility() {
  if (saveBtn) {
    if (isAuthenticated()) {
      saveBtn.style.display = 'block';
    } else {
      saveBtn.style.display = 'none';
    }
  }
}

// Logout function
function logout() {
  // Clear auth data
  authToken = null;
  currentUser = null;
  
  // Remove from localStorage
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  
  // Update UI
  updateAuthUI();
  
  // Switch to public gallery
  switchTab('public');
  
  // Show notification
  showNotification('You have been logged out', 'info');
}

// Check if user is authenticated
function isAuthenticated() {
  return !!authToken;
}

// Create authentication UI and modals
function createAuthUI() {
  // Create authentication section in the header if it doesn't exist
  let authSection = document.querySelector('.auth-section');
  if (!authSection) {
    const header = document.querySelector('header');
    if (header) {
      authSection = document.createElement('div');
      authSection.className = 'auth-section';
      header.appendChild(authSection);
    }
  }
  
  // Create authentication modals if they don't exist
  if (!document.getElementById('login-modal')) {
    createLoginModal();
  }
  
  if (!document.getElementById('signup-modal')) {
    createSignupModal();
  }
  
  // Create gallery tabs if they don't exist
  if (!document.querySelector('.gallery-tabs')) {
    createGalleryTabs();
  }
  
  // Update authentication UI based on current status
  updateAuthUI();
}

// Create login modal
function createLoginModal() {
  const modalHtml = `
    <div id="login-modal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">Log In</h2>
          <span class="close-modal">&times;</span>
        </div>
        <div class="modal-body">
          <form id="login-form">
            <div class="form-group">
              <label for="login-username">Username</label>
              <input type="text" id="login-username" class="form-control" placeholder="Enter your username" required>
            </div>
            <div class="form-group">
              <label for="login-password">Password</label>
              <input type="password" id="login-password" class="form-control" placeholder="Enter your password" required>
            </div>
            <button type="submit" class="btn auth-button btn-block">Log In</button>
          </form>
          <div class="form-footer">
            <p>Don't have an account? <a class="form-link" id="switch-to-signup">Sign up here</a></p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Add event listeners
  const loginForm = document.getElementById('login-form');
  const closeBtn = document.querySelector('#login-modal .close-modal');
  const switchToSignup = document.getElementById('switch-to-signup');
  
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      handleLogin();
    });
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      closeModal('login-modal');
    });
  }
  
  if (switchToSignup) {
    switchToSignup.addEventListener('click', function(e) {
      e.preventDefault();
      showSignupForm();
    });
  }
}

// Create signup modal
function createSignupModal() {
  const modalHtml = `
    <div id="signup-modal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">Sign Up</h2>
          <span class="close-modal">&times;</span>
        </div>
        <div class="modal-body">
          <form id="signup-form">
            <div class="form-group">
              <label for="signup-email">Email</label>
              <input type="email" id="signup-email" class="form-control" placeholder="Enter your email" required>
            </div>
            <div class="form-group">
              <label for="signup-username">Username</label>
              <input type="text" id="signup-username" class="form-control" placeholder="Choose a username" required>
            </div>
            <div class="form-group">
              <label for="signup-password">Password</label>
              <input type="password" id="signup-password" class="form-control" placeholder="Choose a password" required>
            </div>
            <div class="form-group">
              <label for="signup-confirm-password">Confirm Password</label>
              <input type="password" id="signup-confirm-password" class="form-control" placeholder="Confirm your password" required>
            </div>
            <button type="submit" class="btn auth-button btn-block">Sign Up</button>
          </form>
          <div class="form-footer">
            <p>Already have an account? <a class="form-link" id="switch-to-login">Log in here</a></p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Add event listeners
  const signupForm = document.getElementById('signup-form');
  const closeBtn = document.querySelector('#signup-modal .close-modal');
  const switchToLogin = document.getElementById('switch-to-login');
  
  if (signupForm) {
    signupForm.addEventListener('submit', function(e) {
      e.preventDefault();
      handleSignup();
    });
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      closeModal('signup-modal');
    });
  }
  
  if (switchToLogin) {
    switchToLogin.addEventListener('click', function(e) {
      e.preventDefault();
      showLoginForm();
    });
  }
}

// Create gallery tabs
function createGalleryTabs() {
  const gallerySection = document.querySelector('.gallery-section');
  if (!gallerySection) return;
  
  // Create tabs
  const tabsHtml = `
    <div class="gallery-tabs">
      <div class="gallery-tab active" data-tab="public">Public Gallery</div>
      <div class="gallery-tab" data-tab="personal">My Gallery</div>
    </div>
    <div class="tab-content active" id="public-tab">
      <div id="gallery" class="gallery-grid"></div>
    </div>
    <div class="tab-content" id="personal-tab">
      <div id="personal-gallery" class="gallery-grid"></div>
    </div>
  `;
  
  // Replace existing gallery with tabs
  gallerySection.innerHTML = tabsHtml;
  
  // Add event listeners to tabs
  const tabs = document.querySelectorAll('.gallery-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabType = this.getAttribute('data-tab');
      if (tabType === 'personal') {
        showPersonalGallery();
      } else {
        switchTab('public');
      }
    });
  });
}

// Switch between gallery tabs
function switchTab(tabType) {
  // Activate the correct tab
  const tabs = document.querySelectorAll('.gallery-tab');
  tabs.forEach(tab => {
    if (tab.getAttribute('data-tab') === tabType) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  // Show the correct content
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(content => {
    if (content.id === `${tabType}-tab`) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
  
  // Load gallery if it hasn't been loaded yet
  if (tabType === 'personal' && document.getElementById('personal-gallery').children.length === 0) {
    loadGallery('personal');
  } else if (tabType === 'public' && document.getElementById('gallery').children.length === 0) {
    loadGallery('public');
  }
}

// Update authentication UI based on authentication status
function updateAuthUI() {
  const authSection = document.querySelector('.auth-section');
  if (!authSection) return;
  
  // Clear existing content
  authSection.innerHTML = '';
  
  if (isAuthenticated() && currentUser) {
    // User is logged in - show user info and logout button
    const userInfoHtml = `
      <div class="auth-user-info">
        <div class="user-avatar">${currentUser.username.charAt(0).toUpperCase()}</div>
        <div class="username">${currentUser.username}</div>
      </div>
      <button id="logout-btn" class="auth-button">Log Out</button>
    `;
    
    authSection.innerHTML = userInfoHtml;
    
    // Add event listener to logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }
  } else {
    // User is not logged in - show login and signup buttons
    const authButtonsHtml = `
      <button id="login-btn" class="auth-button">Log In</button>
      <button id="signup-btn" class="auth-button">Sign Up</button>
    `;
    
    authSection.innerHTML = authButtonsHtml;
    
    // Add event listeners to buttons
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    
    if (loginBtn) {
      loginBtn.addEventListener('click', function() {
        openModal('login-modal');
      });
    }
    
    if (signupBtn) {
      signupBtn.addEventListener('click', function() {
        openModal('signup-modal');
      });
    }
  }
  
  // Update save button visibility in the image display
  updateSaveButtonVisibility();
}

// Update save button visibility based on authentication status
function updateSaveButtonVisibility() {
  if (saveBtn) {
    if (isAuthenticated()) {
      saveBtn.style.display = 'block';
    } else {
      saveBtn.style.display = 'none';
    }
  }
}

// Logout function
function logout() {
  // Clear auth data
  authToken = null;
  currentUser = null;
  
  // Remove from localStorage
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  
  // Update UI
  updateAuthUI();
  
  // Switch to public gallery
  switchTab('public');
  
  // Show notification
  showNotification('You have been logged out', 'info');
}

// Check if user is authenticated
function isAuthenticated() {
  return !!authToken;
}

// Open modal
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    
    // Focus on the first input
    setTimeout(() => {
      const firstInput = modal.querySelector('input');
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
    
    // Add event listener to close when clicking outside
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        closeModal(modalId);
      }
    });
  }
}

// Close specific modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

// Close all modals
function closeAllModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.classList.remove('active');
  });
}

// Show personal gallery (with auth check)
function showPersonalGallery() {
  if (isAuthenticated()) {
    switchTab('personal');
  } else {
    showNotification('Please log in to view your gallery', 'info');
    openModal('login-modal');
  }
}
