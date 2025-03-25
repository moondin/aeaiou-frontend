// Configuration
const API_BASE_URL = 'https://aeaiou-api.onrender.com/api/v1';
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

// DOM Elements
const promptInput = document.getElementById('prompt');
const styleSelect = document.getElementById('style');
const aspectRatioSelect = document.getElementById('aspect-ratio');
const generateBtn = document.getElementById('generate-btn');
const loadingIndicator = document.getElementById('loading-indicator');
const imagePreview = document.getElementById('image-preview');
const generatedImage = document.getElementById('generated-image');
const imageActions = document.getElementById('image-actions');
const downloadBtn = document.getElementById('download-btn');
const shareBtn = document.getElementById('share-btn');
const createVariationBtn = document.getElementById('create-variation-btn');
const galleryContainer = document.getElementById('gallery');

// Sample gallery images (replace with your actual gallery from API later)
const sampleGalleryImages = [
  { id: 1, url: 'https://images.unsplash.com/photo-1673003332294-a56b70288751', prompt: 'Mountain landscape at sunset', style: 'Digital Art' },
  { id: 2, url: 'https://images.unsplash.com/photo-1682687220566-5599dbbebf11', prompt: 'Fantasy castle in the clouds', style: 'Fantasy' },
  { id: 3, url: 'https://images.unsplash.com/photo-1675475442753-8cf773be0e67', prompt: 'Cyberpunk city at night', style: 'Sci-Fi' },
  { id: 4, url: 'https://images.unsplash.com/photo-1675226159321-8168c07bb2cd', prompt: 'Magical forest with glowing mushrooms', style: 'Fantasy' },
  { id: 5, url: 'https://images.unsplash.com/photo-1679403766669-a047d0f44ff1', prompt: 'Portrait of a futuristic warrior', style: 'Sci-Fi' },
  { id: 6, url: 'https://images.unsplash.com/photo-1682687982183-c2937a35a906', prompt: 'Underwater city with mermaids', style: 'Fantasy' },
];

// Initialize the app
function init() {
  // Populate gallery
  populateGallery();
  
  // Add event listeners
  generateBtn.addEventListener('click', generateImage);
  downloadBtn.addEventListener('click', downloadImage);
  shareBtn.addEventListener('click', shareImage);
  createVariationBtn.addEventListener('click', createVariation);
}

// Populate gallery with sample images
function populateGallery() {
  galleryContainer.innerHTML = '';
  
  sampleGalleryImages.forEach(image => {
    const galleryItem = document.createElement('div');
    galleryItem.classList.add('gallery-item');
    
    galleryItem.innerHTML = `
      <img src="${image.url}" alt="${image.prompt}" loading="lazy" />
      <div class="info">
        <h3>${image.prompt}</h3>
        <p>${image.style}</p>
      </div>
    `;
    
    galleryItem.addEventListener('click', () => {
      // Fill the prompt with this gallery item's prompt
      promptInput.value = image.prompt;
      
      // Set the style dropdown to match
      Array.from(styleSelect.options).forEach((option, index) => {
        if (option.text === image.style) {
          styleSelect.selectedIndex = index;
        }
      });
      
      // Scroll to the top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    galleryContainer.appendChild(galleryItem);
  });
}

// Generate image function
async function generateImage() {
  // Validate input
  if (!promptInput.value.trim()) {
    alert('Please enter a prompt to generate an image.');
    return;
  }
  
  // Prepare parameters
  const params = {
    prompt: promptInput.value.trim(),
    model_type: styleSelect.value,
    width_height_ratio: aspectRatioSelect.value,
  };
  
  // Show loading state
  generateBtn.disabled = true;
  loadingIndicator.classList.remove('hidden');
  imagePreview.classList.add('empty');
  generatedImage.classList.add('hidden');
  imageActions.classList.add('hidden');
  
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
    alert(`Error: ${error.message || 'Failed to generate image'}`);
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
    
    // Handle different status states
    switch (data.status) {
      case 'completed':
        // Image generation is complete
        displayGeneratedImage(data.result.image_url);
        break;
        
      case 'failed':
        throw new Error(data.error || 'Image generation failed');
        
      case 'processing':
      case 'pending':
        // Continue polling after a delay
        setTimeout(() => pollJobStatus(jobId), 2000);
        break;
        
      default:
        throw new Error('Unknown job status');
    }
    
  } catch (error) {
    console.error('Error checking job status:', error);
    alert(`Error: ${error.message || 'Failed to check job status'}`);
    resetUI();
  }
}

// Display the generated image
function displayGeneratedImage(imageUrl) {
  // Set image source
  generatedImage.src = imageUrl;
  generatedImage.onload = () => {
    // Hide loading indicator
    loadingIndicator.classList.add('hidden');
    
    // Show image and actions
    imagePreview.classList.remove('empty');
    generatedImage.classList.remove('hidden');
    imageActions.classList.remove('hidden');
    
    // Re-enable generate button
    generateBtn.disabled = false;
    
    // Set download URL for the download button
    downloadBtn.setAttribute('data-url', imageUrl);
  };
  
  generatedImage.onerror = () => {
    alert('Failed to load the generated image');
    resetUI();
  };
}

// Download image function
function downloadImage() {
  const imageUrl = downloadBtn.getAttribute('data-url');
  
  if (!imageUrl) {
    alert('No image available to download');
    return;
  }
  
  // Create a temporary link to download the image
  const a = document.createElement('a');
  a.href = imageUrl;
  a.download = `aeaiou-image-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Share image function
function shareImage() {
  const imageUrl = downloadBtn.getAttribute('data-url');
  
  if (!imageUrl) {
    alert('No image available to share');
    return;
  }
  
  if (navigator.share) {
    navigator.share({
      title: 'My AI Generated Image',
      text: 'Check out this image I created with aeaiou!',
      url: imageUrl,
    })
    .catch(error => {
      console.error('Error sharing:', error);
    });
  } else {
    // Fallback for browsers that don't support the Web Share API
    prompt('Copy this link to share your image:', imageUrl);
  }
}

// Create variation function
function createVariation() {
  // Get the current prompt and add "variation of " to it
  promptInput.value = `variation of ${promptInput.value}`;
  
  // Generate a new image
  generateImage();
}

// Reset UI state
function resetUI() {
  loadingIndicator.classList.add('hidden');
  generateBtn.disabled = false;
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);
