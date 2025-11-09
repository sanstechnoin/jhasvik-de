// --- 1. PASTE YOUR FIREBASE CONFIG HERE ---
// Replace this object with the firebaseConfig keys you copied
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
const connectionStatusEl = document.getElementById('connection-status');


// --- 3. DOM Elements ---
const newOrderPopup = document.getElementById('new-order-popup-overlay');
const popupOrderDetails = document.getElementById('popup-order-details');
const acceptOrderBtn = document.getElementById('accept-order-btn');
const tableGrid = document.querySelector('.table-grid');

let currentPopupOrder = null; // Holds the data for the order in the popup

// --- 3.5: Setup Clear Buttons and Popup Queue Logic ---

// Inject "Clear" buttons into each table box
document.querySelectorAll('.table-box').forEach((box, index) => {
  const tableId = `table-${index + 1}`;
  const clearBtn = document.createElement('button');
  clearBtn.className = 'clear-table-btn';
  clearBtn.textContent = 'Clear';
  clearBtn.onclick = () => clearTable(tableId);
  box.appendChild(clearBtn);
});

function clearTable(tableId) {
  const tableBox = document.getElementById(tableId);
  const orderList = tableBox.querySelector('.order-list');
  orderList.innerHTML = '<li class="order-list-empty">Waiting for order...</li>';
}

// Popup queue logic
let popupQueue = [];

function showNewOrderPopup(orderData) {
  popupQueue.push(orderData);
  if (!currentPopupOrder) displayNextPopup();
}

function displayNextPopup() {
  if (popupQueue.length === 0) return;

  currentPopupOrder = popupQueue.shift();
  const itemsHtml = currentPopupOrder.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('');
  popupOrderDetails.innerHTML = `<h4>Table ${currentPopupOrder.table}</h4><ul>${itemsHtml}</ul>`;
  newOrderPopup.classList.remove('hidden');

  const audio = new Audio('notification.mp3');
  audio.play().catch(e => console.warn("Could not play audio:", e));
}

acceptOrderBtn.addEventListener('click', () => {
  const tableBox = document.getElementById(`table-${currentPopupOrder.table}`);
  updateTableBox(tableBox, currentPopupOrder);
  hideNewOrderPopup();
  displayNextPopup();
});

function hideNewOrderPopup() {
  newOrderPopup.classList.add('hidden');
  currentPopupOrder = null;
}

// --- 4. Main Firestore Listener ---
// This is the core of the app. It listens for *any* change in the 'orders' collection.
db.collection("orders").onSnapshot(
    (snapshot) => {
      if (snapshot.empty) {
    console.warn("Snapshot is empty — no orders or rule block.");
  } else {
        // --- Connection Status ---
        console.log("Connected to Firestore!");
        connectionStatusEl.textContent = "Connected";
        connectionStatusEl.className = "status-connected";
        
        // --- Process Changes ---
        snapshot.docChanges().forEach((change) => {
            const orderData = change.doc.data();
            const tableId = `table-${orderData.table}`;
            const tableBox = document.getElementById(tableId);

            // A new order was added
            if (change.type === "added") {
                console.log("New order for:", tableId, orderData);
                // Save the data and show the popup
                currentPopupOrder = orderData;
                showNewOrderPopup(orderData);
            }
            
            // An order was modified (e.g., status changed)
            if (change.type === "modified") {
                console.log("Modified order:", tableId, orderData);
                // Just update the tab, don't show a popup
                updateTableBox(tableBox, orderData);
            }
            if (change.type === "removed") {
                console.log("Order removed:", tableId);
                clearTable(tableId); // resets to "Waiting for order..."
  }

        });
    },
    (error) => {
        // --- Error Handling ---
        console.error("Error connecting to Firestore: ", error);
        connectionStatusEl.textContent = "Connection Error";
        connectionStatusEl.className = "status-disconnected";
    }
);

// --- 5. Popup and Order Handling Functions ---

// Shows the new order popup
function showNewOrderPopup(orderData) {
    // We don't show prices, as requested
    let itemsHtml = orderData.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('');
    
    popupOrderDetails.innerHTML = `
        <h4>Table ${orderData.table}</h4>
        <ul>${itemsHtml}</ul>
    `;
    newOrderPopup.classList.remove('hidden');

    // Play a notification sound
    const audio = new Audio('notification.mp3'); // We'll need to add this file
    audio.play().catch(e => console.warn("Could not play audio:", e));
}

// Hides the popup
function hideNewOrderPopup() {
    newOrderPopup.classList.add('hidden');
    currentPopupOrder = null;
}

// Updates the table tab with the new order
function updateTableBox(tableBox, orderData) {
  if (!tableBox) return;

  const orderList = tableBox.querySelector('.order-list');
  const timestamp = new Date().toLocaleTimeString();
  const itemsHtml = orderData.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('');

  const newBlock = document.createElement('li');
  newBlock.innerHTML = `<strong>${timestamp}</strong><ul>${itemsHtml}</ul>`;
  orderList.prepend(newBlock);

  // Flash animation
  tableBox.classList.add('new-order-flash');
  setTimeout(() => {
    tableBox.classList.remove('new-order-flash');
  }, 2000);
}
// --- 6. Event Listeners ---

// When the "Accept Order" button is clicked
acceptOrderBtn.addEventListener('click', () => {
    if (currentPopupOrder) {
        const tableId = `table-${currentPopupOrder.table}`;
        const tableBox = document.getElementById(tableId);
        
        // 1. Update the table box on screen
        updateTableBox(tableBox, currentPopupOrder);
        
        // 2. Hide the popup
        hideNewOrderPopup();
        
        // 3. (Optional but recommended) Update the order status in Firebase
        // This stops the popup from re-appearing if the kitchen page is refreshed
        const orderDocId = currentPopupOrder.id; // We'll add this in the final step
        if (orderDocId) {
             db.collection("orders").doc(orderDocId).update({
                 status: "seen"
             }).catch(e => console.error("Error updating doc:", e));
        }
    }
});
