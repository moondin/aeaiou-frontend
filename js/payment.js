// Payment System for AEAIOU
import { API_BASE_URL } from './config.js';
import { getAuthToken, isAuthenticated, getCurrentUser } from './auth.js';

// Initialize Stripe
let stripe;
let elements;
let card;

// Credit packages from the server
let creditPackages = [];
// Subscription plans from the server
let subscriptionPlans = [];

/**
 * Initialize the payment system
 */
export async function initializePaymentSystem() {
  if (!isAuthenticated()) return;
  
  try {
    // Load user credits information
    updateUserCreditsUI();
    
    // Load credit packages
    await loadCreditPackages();
    
    // Load subscription plans
    await loadSubscriptionPlans();
    
    // Add buy credits button to header
    addBuyCreditsButton();
    
    // Add subscribe button to header if not already subscribed
    await checkAndAddSubscribeButton();
  } catch (error) {
    console.error('Failed to initialize payment system:', error);
  }
}

/**
 * Load credit packages from the server
 */
async function loadCreditPackages() {
  try {
    const response = await fetch(`${API_BASE_URL}/payments/credit-packages`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });
    
    if (response.ok) {
      creditPackages = await response.json();
    }
  } catch (error) {
    console.error('Failed to load credit packages:', error);
  }
}

/**
 * Load subscription plans from the server
 */
async function loadSubscriptionPlans() {
  try {
    const response = await fetch(`${API_BASE_URL}/payments/subscription-plans`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });
    
    if (response.ok) {
      subscriptionPlans = await response.json();
    }
  } catch (error) {
    console.error('Failed to load subscription plans:', error);
  }
}

/**
 * Get user credits information
 */
export async function getUserCredits() {
  if (!isAuthenticated()) return { total_credits: 0, credits_used: 0, credits_available: 0 };
  
  try {
    const response = await fetch(`${API_BASE_URL}/payments/user/credits`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });
    
    if (response.ok) {
      return await response.json();
    }
    return { total_credits: 0, credits_used: 0, credits_available: 0 };
  } catch (error) {
    console.error('Failed to get user credits:', error);
    return { total_credits: 0, credits_used: 0, credits_available: 0 };
  }
}

/**
 * Update the UI to show user credits
 */
export async function updateUserCreditsUI() {
  if (!isAuthenticated()) return;
  
  try {
    const creditsInfo = await getUserCredits();
    
    // Check if the credits container exists, if not create it
    let creditsContainer = document.getElementById('user-credits');
    if (!creditsContainer) {
      creditsContainer = document.createElement('div');
      creditsContainer.id = 'user-credits';
      creditsContainer.className = 'user-credits';
      
      // Find the header element
      const header = document.querySelector('.header');
      if (header) {
        header.appendChild(creditsContainer);
      }
    }
    
    // Update the credits display
    creditsContainer.textContent = `Credits: ${creditsInfo.credits_available}`;
    
    // Check if the generate button needs to be disabled
    const generateButton = document.getElementById('generate-button');
    if (generateButton) {
      if (creditsInfo.credits_available <= 0) {
        generateButton.disabled = true;
        generateButton.title = 'You need credits to generate images';
      } else {
        generateButton.disabled = false;
        generateButton.title = '';
      }
    }
  } catch (error) {
    console.error('Failed to update credits UI:', error);
  }
}

/**
 * Add buy credits button to the header
 */
function addBuyCreditsButton() {
  // Check if button already exists
  if (document.getElementById('buy-credits-button')) return;
  
  const header = document.querySelector('.header');
  if (!header) return;
  
  const buyCreditsButton = document.createElement('button');
  buyCreditsButton.id = 'buy-credits-button';
  buyCreditsButton.className = 'btn secondary';
  buyCreditsButton.textContent = 'Buy Credits';
  buyCreditsButton.addEventListener('click', openBuyCreditsModal);
  
  header.appendChild(buyCreditsButton);
}

/**
 * Check if user has an active subscription and add subscribe button if not
 */
async function checkAndAddSubscribeButton() {
  // TODO: Check for active subscription from the server
  // For now, always show the subscribe button
  
  // Check if button already exists
  if (document.getElementById('subscribe-button')) return;
  
  const header = document.querySelector('.header');
  if (!header) return;
  
  const subscribeButton = document.createElement('button');
  subscribeButton.id = 'subscribe-button';
  subscribeButton.className = 'btn primary';
  subscribeButton.textContent = 'Subscribe';
  subscribeButton.addEventListener('click', openSubscribeModal);
  
  header.appendChild(subscribeButton);
}

/**
 * Open the buy credits modal
 */
function openBuyCreditsModal() {
  // Create modal if it doesn't exist
  let modal = document.getElementById('buy-credits-modal');
  if (!modal) {
    modal = createBuyCreditsModal();
    document.body.appendChild(modal);
  }
  
  // Show the modal
  modal.style.display = 'flex';
  
  // Initialize Stripe
  initializeStripe();
}

/**
 * Open the subscription modal
 */
function openSubscribeModal() {
  // Create modal if it doesn't exist
  let modal = document.getElementById('subscribe-modal');
  if (!modal) {
    modal = createSubscribeModal();
    document.body.appendChild(modal);
  }
  
  // Show the modal
  modal.style.display = 'flex';
  
  // Initialize Stripe
  initializeStripe();
}

/**
 * Create the buy credits modal
 */
function createBuyCreditsModal() {
  const modal = document.createElement('div');
  modal.id = 'buy-credits-modal';
  modal.className = 'modal';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content payment-modal';
  
  // Close button
  const closeButton = document.createElement('span');
  closeButton.className = 'close';
  closeButton.innerHTML = '&times;';
  closeButton.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  // Modal header
  const header = document.createElement('h2');
  header.textContent = 'Buy Credits';
  
  // Credit packages container
  const packagesContainer = document.createElement('div');
  packagesContainer.className = 'packages-container';
  
  // Add credit packages
  creditPackages.forEach(pkg => {
    const packageDiv = document.createElement('div');
    packageDiv.className = 'package';
    packageDiv.dataset.id = pkg.id;
    packageDiv.dataset.price = pkg.price;
    packageDiv.dataset.credits = pkg.credits;
    
    const name = document.createElement('h3');
    name.textContent = pkg.name;
    
    const credits = document.createElement('p');
    credits.className = 'credits';
    credits.textContent = `${pkg.credits} credits`;
    
    const price = document.createElement('p');
    price.className = 'price';
    price.textContent = `$${pkg.price}`;
    
    packageDiv.appendChild(name);
    packageDiv.appendChild(credits);
    packageDiv.appendChild(price);
    
    // Add click event
    packageDiv.addEventListener('click', () => {
      // Remove selected class from all packages
      document.querySelectorAll('.package').forEach(p => p.classList.remove('selected'));
      // Add selected class to this package
      packageDiv.classList.add('selected');
      // Show payment form
      paymentFormContainer.style.display = 'block';
      // Update amount
      selectedAmount = pkg.price;
      selectedCredits = pkg.credits;
      document.getElementById('payment-button').textContent = `Pay $${pkg.price}`;
    });
    
    packagesContainer.appendChild(packageDiv);
  });
  
  // Payment form container
  const paymentFormContainer = document.createElement('div');
  paymentFormContainer.id = 'payment-form-container';
  paymentFormContainer.style.display = 'none';
  
  // Payment form
  const paymentForm = document.createElement('form');
  paymentForm.id = 'payment-form';
  
  // Cardholder name
  const nameGroup = document.createElement('div');
  nameGroup.className = 'form-group';
  
  const nameLabel = document.createElement('label');
  nameLabel.htmlFor = 'cardholder-name';
  nameLabel.textContent = 'Cardholder Name';
  
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.id = 'cardholder-name';
  nameInput.required = true;
  
  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);
  
  // Card element container
  const cardGroup = document.createElement('div');
  cardGroup.className = 'form-group';
  
  const cardLabel = document.createElement('label');
  cardLabel.htmlFor = 'card-element';
  cardLabel.textContent = 'Credit or debit card';
  
  const cardElement = document.createElement('div');
  cardElement.id = 'card-element';
  
  // Card errors
  const cardErrors = document.createElement('div');
  cardErrors.id = 'card-errors';
  cardErrors.role = 'alert';
  
  cardGroup.appendChild(cardLabel);
  cardGroup.appendChild(cardElement);
  cardGroup.appendChild(cardErrors);
  
  // Submit button
  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.id = 'payment-button';
  submitButton.className = 'btn primary';
  submitButton.textContent = 'Pay';
  
  // Add form elements
  paymentForm.appendChild(nameGroup);
  paymentForm.appendChild(cardGroup);
  paymentForm.appendChild(submitButton);
  
  // Add submit handler
  paymentForm.addEventListener('submit', handleCreditPurchase);
  
  paymentFormContainer.appendChild(paymentForm);
  
  // Add all elements to modal
  modalContent.appendChild(closeButton);
  modalContent.appendChild(header);
  modalContent.appendChild(packagesContainer);
  modalContent.appendChild(paymentFormContainer);
  
  modal.appendChild(modalContent);
  
  return modal;
}

/**
 * Create the subscription modal
 */
function createSubscribeModal() {
  const modal = document.createElement('div');
  modal.id = 'subscribe-modal';
  modal.className = 'modal';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content payment-modal';
  
  // Close button
  const closeButton = document.createElement('span');
  closeButton.className = 'close';
  closeButton.innerHTML = '&times;';
  closeButton.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  // Modal header
  const header = document.createElement('h2');
  header.textContent = 'Choose a Subscription Plan';
  
  // Plans container
  const plansContainer = document.createElement('div');
  plansContainer.className = 'plans-container';
  
  // Add subscription plans
  subscriptionPlans.forEach(plan => {
    const planDiv = document.createElement('div');
    planDiv.className = 'plan';
    planDiv.dataset.id = plan.id;
    planDiv.dataset.price = plan.price;
    
    const name = document.createElement('h3');
    name.textContent = plan.name;
    
    const price = document.createElement('p');
    price.className = 'price';
    price.textContent = `$${plan.price}/${plan.billing_cycle}`;
    
    const features = document.createElement('p');
    features.className = 'features';
    features.textContent = `${plan.credits_per_cycle} credits per ${plan.billing_cycle}`;
    
    // Add more features if available
    if (plan.features) {
      try {
        const featuresList = JSON.parse(plan.features);
        const featureUl = document.createElement('ul');
        featureUl.className = 'features-list';
        
        featuresList.forEach(feature => {
          const li = document.createElement('li');
          li.textContent = feature;
          featureUl.appendChild(li);
        });
        
        planDiv.appendChild(featureUl);
      } catch (e) {
        console.error('Failed to parse plan features:', e);
      }
    }
    
    planDiv.appendChild(name);
    planDiv.appendChild(price);
    planDiv.appendChild(features);
    
    // Add click event
    planDiv.addEventListener('click', () => {
      // Remove selected class from all plans
      document.querySelectorAll('.plan').forEach(p => p.classList.remove('selected'));
      // Add selected class to this plan
      planDiv.classList.add('selected');
      // Show payment form
      subscriptionFormContainer.style.display = 'block';
      // Update selected plan
      selectedPlanId = plan.id;
      selectedPlanPrice = plan.price;
      document.getElementById('subscription-button').textContent = `Subscribe for $${plan.price}/${plan.billing_cycle}`;
    });
    
    plansContainer.appendChild(planDiv);
  });
  
  // Payment form container
  const subscriptionFormContainer = document.createElement('div');
  subscriptionFormContainer.id = 'subscription-form-container';
  subscriptionFormContainer.style.display = 'none';
  
  // Payment form
  const subscriptionForm = document.createElement('form');
  subscriptionForm.id = 'subscription-form';
  
  // Cardholder name
  const nameGroup = document.createElement('div');
  nameGroup.className = 'form-group';
  
  const nameLabel = document.createElement('label');
  nameLabel.htmlFor = 'subscriber-name';
  nameLabel.textContent = 'Cardholder Name';
  
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.id = 'subscriber-name';
  nameInput.required = true;
  
  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);
  
  // Card element container
  const cardGroup = document.createElement('div');
  cardGroup.className = 'form-group';
  
  const cardLabel = document.createElement('label');
  cardLabel.htmlFor = 'subscription-card-element';
  cardLabel.textContent = 'Credit or debit card';
  
  const cardElement = document.createElement('div');
  cardElement.id = 'subscription-card-element';
  
  // Card errors
  const cardErrors = document.createElement('div');
  cardErrors.id = 'subscription-card-errors';
  cardErrors.role = 'alert';
  
  cardGroup.appendChild(cardLabel);
  cardGroup.appendChild(cardElement);
  cardGroup.appendChild(cardErrors);
  
  // Submit button
  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.id = 'subscription-button';
  submitButton.className = 'btn primary';
  submitButton.textContent = 'Subscribe';
  
  // Add form elements
  subscriptionForm.appendChild(nameGroup);
  subscriptionForm.appendChild(cardGroup);
  subscriptionForm.appendChild(submitButton);
  
  // Add submit handler
  subscriptionForm.addEventListener('submit', handleSubscription);
  
  subscriptionFormContainer.appendChild(subscriptionForm);
  
  // Add all elements to modal
  modalContent.appendChild(closeButton);
  modalContent.appendChild(header);
  modalContent.appendChild(plansContainer);
  modalContent.appendChild(subscriptionFormContainer);
  
  modal.appendChild(modalContent);
  
  return modal;
}

/**
 * Initialize Stripe elements
 */
async function initializeStripe() {
  if (stripe) return; // Already initialized
  
  try {
    // Get publishable key and client secret
    const response = await fetch(`${API_BASE_URL}/payments/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        amount: 0.50, // Just a small amount to initialize
        currency: 'USD',
        description: 'Setup Intent'
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to initialize payment');
    }
    
    const data = await response.json();
    
    // Initialize Stripe.js
    stripe = Stripe(data.public_key);
    
    // Create card elements
    const cardStyle = {
      base: {
        color: '#32325d',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
          color: '#aab7c4'
        }
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a'
      }
    };
    
    // Create card element for credits
    elements = stripe.elements();
    card = elements.create('card', { style: cardStyle });
    
    // Wait for the DOM to be ready with the card element
    setTimeout(() => {
      const cardElement = document.getElementById('card-element');
      const subscriptionCardElement = document.getElementById('subscription-card-element');
      
      if (cardElement) {
        card.mount('#card-element');
        
        card.on('change', function(event) {
          const displayError = document.getElementById('card-errors');
          if (event.error) {
            displayError.textContent = event.error.message;
          } else {
            displayError.textContent = '';
          }
        });
      }
      
      if (subscriptionCardElement) {
        const subscriptionCard = elements.create('card', { style: cardStyle });
        subscriptionCard.mount('#subscription-card-element');
        
        subscriptionCard.on('change', function(event) {
          const displayError = document.getElementById('subscription-card-errors');
          if (event.error) {
            displayError.textContent = event.error.message;
          } else {
            displayError.textContent = '';
          }
        });
      }
    }, 100);
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

// Variables to track selected package/plan
let selectedAmount = 0;
let selectedCredits = 0;
let selectedPlanId = null;
let selectedPlanPrice = 0;

/**
 * Handle credit purchase
 */
async function handleCreditPurchase(event) {
  event.preventDefault();
  
  const submitButton = document.getElementById('payment-button');
  submitButton.disabled = true;
  submitButton.textContent = 'Processing...';
  
  try {
    // Create payment intent
    const paymentIntentResponse = await fetch(`${API_BASE_URL}/payments/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        amount: selectedAmount,
        currency: 'USD',
        description: `Credit Purchase - ${selectedCredits} credits`,
        metadata: {
          credit_amount: selectedCredits.toString()
        }
      })
    });
    
    if (!paymentIntentResponse.ok) {
      throw new Error('Failed to create payment intent');
    }
    
    const paymentData = await paymentIntentResponse.json();
    
    // Confirm card payment
    const cardholderName = document.getElementById('cardholder-name').value;
    
    const result = await stripe.confirmCardPayment(paymentData.client_secret, {
      payment_method: {
        card: card,
        billing_details: {
          name: cardholderName
        }
      }
    });
    
    if (result.error) {
      // Show error to customer
      const errorElement = document.getElementById('card-errors');
      errorElement.textContent = result.error.message;
      submitButton.disabled = false;
      submitButton.textContent = `Pay $${selectedAmount}`;
    } else {
      // Payment succeeded
      if (result.paymentIntent.status === 'succeeded') {
        // Close modal
        document.getElementById('buy-credits-modal').style.display = 'none';
        
        // Show success message
        alert(`Successfully purchased ${selectedCredits} credits!`);
        
        // Update credits UI
        updateUserCreditsUI();
      }
    }
  } catch (error) {
    console.error('Payment failed:', error);
    const errorElement = document.getElementById('card-errors');
    errorElement.textContent = 'An error occurred during payment processing. Please try again.';
    
    submitButton.disabled = false;
    submitButton.textContent = `Pay $${selectedAmount}`;
  }
}

/**
 * Handle subscription
 */
async function handleSubscription(event) {
  event.preventDefault();
  
  const submitButton = document.getElementById('subscription-button');
  submitButton.disabled = true;
  submitButton.textContent = 'Processing...';
  
  try {
    // Get price_id for the selected plan
    // In a real app, you would get this from the server
    const priceId = `price_${selectedPlanId}`;
    
    // Create subscription
    const response = await fetch(`${API_BASE_URL}/payments/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        plan_id: selectedPlanId,
        auto_renew: true,
        price_id: priceId
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create subscription');
    }
    
    const data = await response.json();
    
    // Close modal
    document.getElementById('subscribe-modal').style.display = 'none';
    
    // Show success message
    alert(`Successfully subscribed to the ${data.plan.name} plan!`);
    
    // Update credits UI
    updateUserCreditsUI();
    
    // Hide subscribe button, show manage subscription button
    const subscribeButton = document.getElementById('subscribe-button');
    if (subscribeButton) {
      subscribeButton.remove();
    }
    
    // Add manage subscription button
    const header = document.querySelector('.header');
    if (header) {
      const manageButton = document.createElement('button');
      manageButton.id = 'manage-subscription-button';
      manageButton.className = 'btn secondary';
      manageButton.textContent = 'Manage Subscription';
      manageButton.addEventListener('click', openManageSubscriptionModal);
      
      header.appendChild(manageButton);
    }
  } catch (error) {
    console.error('Subscription failed:', error);
    const errorElement = document.getElementById('subscription-card-errors');
    errorElement.textContent = 'An error occurred during subscription processing. Please try again.';
    
    submitButton.disabled = false;
    submitButton.textContent = `Subscribe for $${selectedPlanPrice}`;
  }
}

/**
 * Open the manage subscription modal
 */
function openManageSubscriptionModal() {
  // TODO: Implement subscription management
  alert('Subscription management will be implemented in a future update.');
}

// CSS styles for the payment system
export function addPaymentStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .user-credits {
      padding: 8px 15px;
      background-color: #f0f0f0;
      border-radius: 20px;
      margin-right: 15px;
      font-weight: bold;
    }
    
    .modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      justify-content: center;
      align-items: center;
    }
    
    .modal-content {
      background-color: white;
      border-radius: 8px;
      padding: 20px;
      width: 80%;
      max-width: 600px;
      position: relative;
    }
    
    .payment-modal h2 {
      margin-top: 0;
      margin-bottom: 20px;
      text-align: center;
    }
    
    .close {
      position: absolute;
      top: 10px;
      right: 15px;
      font-size: 24px;
      cursor: pointer;
    }
    
    .packages-container, .plans-container {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    
    .package, .plan {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 15px;
      width: 30%;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .package:hover, .plan:hover {
      border-color: #007bff;
      box-shadow: 0 0 10px rgba(0, 123, 255, 0.2);
    }
    
    .package.selected, .plan.selected {
      border-color: #007bff;
      background-color: #f0f7ff;
    }
    
    .package h3, .plan h3 {
      margin-top: 0;
    }
    
    .price {
      font-size: 1.2em;
      font-weight: bold;
      color: #007bff;
    }
    
    .form-group {
      margin-bottom: 15px;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 5px;
    }
    
    .form-group input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    #card-element, #subscription-card-element {
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    #card-errors, #subscription-card-errors {
      color: #fa755a;
      margin-top: 5px;
      font-size: 0.9em;
    }
    
    #payment-button, #subscription-button {
      width: 100%;
      padding: 12px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1em;
    }
    
    #payment-button:disabled, #subscription-button:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    
    .features-list {
      padding-left: 20px;
      text-align: left;
    }
    
    @media (max-width: 768px) {
      .package, .plan {
        width: 100%;
        margin-bottom: 10px;
      }
      
      .packages-container, .plans-container {
        flex-direction: column;
      }
    }
  `;
  
  document.head.appendChild(style);
}

// Initialize payment system when document is ready
document.addEventListener('DOMContentLoaded', () => {
  if (isAuthenticated()) {
    initializePaymentSystem();
    addPaymentStyles();
  }
});
