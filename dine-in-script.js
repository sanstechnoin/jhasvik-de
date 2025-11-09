// --- 1. YOUR FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyCV6u4t8vLDbrEH_FsBrZHXsG8auh-gOP8",
    authDomain: "jhasvik-de.firebaseapp.com",
    projectId: "jhasvik-de",
    storageBucket: "jhasvik-de.firebasestorage.app",
    messagingSenderId: "415679545793",
    appId: "1:415679545793:web:880c5963d930f6ea4bef40"
};
// --- END OF FIREBASE CONFIG ---


// --- 2. Initialize Firebase ---
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();


// --- Global cart variable ---
let cart = [];
let tableNumber = 'Unknown'; 


// --- Main function to load config first ---
document.addEventListener("DOMContentLoaded", async () => {
    
    // --- Get Table Number from URL ---
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const table = urlParams.get('table');
        if (table) {
            tableNumber = table;
        }
    } catch (e) {
        console.error("Could not get table number from URL", e);
    }
    
    // --- Update Titles in Cart ---
    const formboldTableTitleEl = document.getElementById('formbold-table-title');
    if(formboldTableTitleEl) {
        formboldTableTitleEl.innerText = `Table ${tableNumber} Order`;
    }
    const cartTitleEl = document.getElementById('cart-title');
    if(cartTitleEl) {
        cartTitleEl.innerText = `Your Order (Table ${tableNumber})`;
    }
    const tableNumberInput = document.getElementById('table-number-input');
    if (tableNumberInput) {
        tableNumberInput.value = tableNumber;
    }

    let config;
    try {
        const response = await fetch('config.json?v=23');
        config = await response.json();
    } catch (error) {
        console.error("Failed to load config.json", error);
        config = { marqueeLines: [] }; // Simplified default
    }

    // --- 1. Sticky Header Scroll Padding ---
    const header = document.querySelector('header');
    const headerNav = document.querySelector('header nav');
    function updateScrollPadding() {
        if (header) {
            const headerHeight = header.offsetHeight;
            document.documentElement.style.setProperty('scroll-padding-top', `${headerHeight}px`);

            if (headerNav) {
                const navHeight = headerNav.offsetHeight;
                const topPartHeight = headerHeight - navHeight;
                headerNav.style.top = `${topPartHeight}px`;
            }
        }
    }
    updateScrollPadding();
    window.addEventListener('resize', updateScrollPadding);
    
    // --- 3. DYNAMIC Promotional Marquee ---
    const marqueeContainer = document.getElementById('marquee-container');
    const marqueeText = document.getElementById('marquee-text');

    function showMarquee() {
        if (marqueeText && marqueeContainer && config.marqueeLines && config.marqueeLines.length > 0) {
            marqueeText.innerText = config.marqueeLines.join(" --- ");
            marqueeContainer.classList.remove('hidden');
            updateScrollPadding(); // Re-calculate header height *after* marquee appears
        }
    }
    showMarquee();
    
    if (marqueeContainer) {
        marqueeContainer.addEventListener('mouseover', () => marqueeText.classList.add('paused'));
        marqueeContainer.addEventListener('mouseout', () => marqueeText.classList.remove('paused'));
    }

    // --- 4. Shopping Cart Logic ---
    const cartToggleBtn = document.getElementById('cart-toggle-btn');
    const cartOverlay = document.getElementById('cart-overlay');
    const cartCloseBtn = document.getElementById('cart-close-btn');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartItemCountEl = document.getElementById('cart-item-count');
    const totalAmountEl = document.getElementById('total-amount');

    const cartContentEl = document.getElementById('cart-content');
    const orderConfirmationEl = document.getElementById('order-confirmation');
    const confirmationSummaryEl = document.getElementById('confirmation-summary');
    const confirmationCloseBtn = document.getElementById('confirmation-close-btn');

    const orderForm = document.getElementById('order-form');
    
    // --- NEW: Get both buttons ---
    const formboldBtn = document.getElementById('formbold-btn');
    const firebaseBtn = document.getElementById('firebase-btn');
    
    if (cartToggleBtn) cartToggleBtn.addEventListener('click', openCart);
    if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
    if (confirmationCloseBtn) confirmationCloseBtn.addEventListener('click', closeCart);
    
    function openCart() {
        cartContentEl.style.display = 'block';
        orderConfirmationEl.style.display = 'none';
        cartOverlay.classList.remove('hidden');
        updateCart();
    }
    function closeCart() { 
        cartOverlay.classList.add('hidden'); 
        setTimeout(() => {
            cartContentEl.style.display = 'block';
            orderConfirmationEl.style.display = 'none';
        }, 500);
    }

    // (All the functions for adding/removing items remain the same)
    function initItemControls() {
        document.querySelectorAll('.add-btn').forEach(button => {
            button.removeEventListener('click', handleAddToCartClick);
            button.addEventListener('click', handleAddToCartClick);
        });
        document.querySelectorAll('.menu-btn-minus').forEach(button => {
            button.removeEventListener('click', handleRemoveFromCartClick);
            button.addEventListener('click', handleRemoveFromCartClick);
        });
    }
    function handleAddToCartClick() {
        const button = this; 
        const id = button.dataset.id;
        const name = button.dataset.name;
        const price = parseFloat(button.dataset.price);
        const category = button.dataset.category;
        addToCart(id, name, price, category);
    }
    function handleRemoveFromCartClick() {
        adjustQuantity(this.dataset.id, -1);
    }
    initItemControls(); 
    function addToCart(id, name, price, category) {
        const existingItem = cart.find(item => item.id === id);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({ id, name, price, category, quantity: 1 });
        }
        updateCart();
    }
    function updateCart() {
        cartItemsContainer.innerHTML = "";
        let total = 0;
        let itemCount = 0;
        document.querySelectorAll('.item-qty').forEach(qtyEl => {
            const id = qtyEl.dataset.id;
            const item = cart.find(i => i.id === id);
            const controlsDiv = qtyEl.closest('.quantity-controls');
            if (item) {
                qtyEl.innerText = item.quantity;
                controlsDiv.classList.remove('hidden');
            } else {
                qtyEl.innerText = '1'; 
                controlsDiv.classList.add('hidden');
            }
        });
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = "<p>Your cart is empty.</p>";
        }
        cart.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.classList.add('cart-item');
            itemEl.innerHTML = `
                <span class="cart-item-name">${item.name}</span>
                <div class="cart-item-controls">
                    <button class="cart-btn-minus" data-id="${item.id}">-</button>
                    <span>${item.quantity}</span>
                    <button class="cart-btn-plus" data-id="${item.id}">+</button>
                </div>
                <span class="cart-item-price">${(item.price * item.quantity).toFixed(2)} €</span>
            `;
            cartItemsContainer.appendChild(itemEl);
            total += item.price * item.quantity;
            itemCount += item.quantity;
        });
        totalAmountEl.innerText = `${total.toFixed(2)} €`;
        cartItemCountEl.innerText = itemCount;
        cartToggleBtn.classList.toggle('hidden', itemCount === 0);
        addCartItemControls(); 
    }
    function addCartItemControls() {
        document.querySelectorAll('.cart-btn-plus').forEach(btn => {
            btn.addEventListener('click', () => adjustQuantity(btn.dataset.id, 1));
        });
        document.querySelectorAll('.cart-btn-minus').forEach(btn => {
            btn.addEventListener('click', () => adjustQuantity(btn.dataset.id, -1));
        });
    }
    function adjustQuantity(id, amount) {
        const item = cart.find(item => item.id === id);
        if (!item) return;
        item.quantity += amount;
        if (item.quantity <= 0) {
            cart = cart.filter(item => item.id !== id);
        }
        updateCart();
    }
    function generateOrderSummary() {
        let summaryText = "";
        let total = 0;
        let itemsOnly = []; 
        cart.forEach(item => {
            summaryText += `${item.quantity}x ${item.name} (${(item.price * item.quantity).toFixed(2)} €)\n`;
            total += item.price * item.quantity;
            itemsOnly.push({
                quantity: item.quantity,
                name: item.name
            });
        });
        return { summaryText, total, itemsOnly };
    }
    
    // --- 6. NEW CHECKOUT LOGIC ---

    // --- BUTTON 1: FIREBASE (LIVE KITCHEN) ---
    firebaseBtn.addEventListener('click', async (e) => {
        e.preventDefault(); // Stop the form from submitting
        
        firebaseBtn.innerText = "Sending...";
        firebaseBtn.disabled = true;
        formboldBtn.disabled = true;

        const { itemsOnly } = generateOrderSummary();
        const orderId = `${tableNumber}-${new Date().getTime()}`;

        const orderData = {
            id: orderId,
            table: tableNumber,
            items: itemsOnly,
            status: "new",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            // Send to Firebase
            // We use .set() to *replace* the order for that table, as you requested.
            await db.collection("orders").doc(`table-${tableNumber}`).set(orderData);
            
            showConfirmationScreen();

        } catch (error) {
            console.error("Error sending order to Firebase: ", error);
            alert("Error sending order. Please try again or call a waiter.");
        } finally {
            firebaseBtn.innerText = "Send to Kitchen (Live)";
            firebaseBtn.disabled = false;
            formboldBtn.disabled = false;
        }
    });

    // --- BUTTON 2: FORMBOLD (EMAIL TEST) ---
    formboldBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Stop the form from submitting

        formboldBtn.innerText = "Sending...";
        formboldBtn.disabled = true;
        firebaseBtn.disabled = true;

        const { summaryText, total } = generateOrderSummary();
        
        // Populate hidden fields for Formbold
        document.getElementById('order-details-input').value = summaryText;
        document.getElementById('order-total-input').value = `${total.toFixed(2)} €`;

        const formData = new FormData(orderForm);
        
        fetch("https://formbold.com/s/9Xr8q", { // The Formbold URL
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' }
        }).then(response => {
            if (response.ok) {
                showConfirmationScreen(); // Show the same success screen
            } else {
                alert("Error sending order via Email. Please try again or call a waiter.");
            }
        }).catch(error => {
            alert("Order failed. Please check your connection or call a waiter.");
        }).finally(() => {
            formboldBtn.innerText = "Send via Email (Test)";
            formboldBtn.disabled = false;
            firebaseBtn.disabled = false;
        });
    });

    // --- Helper function to show confirmation ---
    function showConfirmationScreen() {
        const { summaryText, total } = generateOrderSummary();
        let finalSummary = `Table: ${tableNumber}\n\n${summaryText}\nTotal: ${total.toFixed(2)} €`;
        
        confirmationSummaryEl.innerText = finalSummary;
        cartContentEl.style.display = 'none';
        orderConfirmationEl.style.display = 'block';

        cart = [];
        orderForm.reset();
        updateCart();
    }
});
