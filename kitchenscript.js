// --- 1. YOUR FIREBASE CONFIG IS NOW EMBEDDED HERE (CRITICAL FIX) ---
const firebaseConfig = {
  apiKey: "AIzaSyCV6u4t8vLDbrEH_FsBrZHXsG8auh-gOP8",
    authDomain: "jhasvik-de.firebaseapp.com",
    projectId: "jhasvik-de",
    storageBucket: "jhasvik-de.firebasestorage.app",
    messagingSenderId: "415679545793",
    appId: "1:415679545793:web:880c5963d930f6ea4bef40"
};
// --- END OF EMBEDDED CONFIG ---

// --- 2. Initialize Firebase ---
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const connectionStatusEl = document.getElementById('connection-status');
const audio = new Audio('notification.mp3'); 

// --- Global Variable Definitions ---
const KITCHEN_PASSWORD = "jhasvik-kitchen-pro"; 
let newOrderQueue = []; 
let currentPopupOrderDoc = null; 
let isPopupActive = false;


document.addEventListener("DOMContentLoaded", () => {
    
    // --- 3. DOM Elements ---
    const loginOverlay = document.getElementById('kitchen-login-overlay');
    const passwordInput = document.getElementById('kitchen-password');
    const loginButton = document.getElementById('login-button'); 
    const errorMessage = document.getElementById('login-error-message');
    const kdsContentWrapper = document.getElementById('kds-content-wrapper');
    const newOrderPopup = document.getElementById('new-order-popup-overlay');
    const popupOrderDetails = document.getElementById('popup-order-details');
    const acceptOrderBtn = document.getElementById('accept-order-btn');

    // --- 4. Kitchen State Management ---

    function grantAccess() {
        localStorage.setItem('kds_session', KITCHEN_PASSWORD);
        loginOverlay.style.display = 'none';
        kdsContentWrapper.style.display = 'block'; 
        startKDSListeners();
    }

    function checkLoginState() {
        if (localStorage.getItem('kds_session') === KITCHEN_PASSWORD) {
            grantAccess();
        } else {
            loginOverlay.style.display = 'flex';
        }
    }

    // --- Login Listener ---
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            if (passwordInput.value === KITCHEN_PASSWORD) {
                grantAccess();
            } else {
                errorMessage.style.display = 'block';
                passwordInput.value = '';
                setTimeout(() => { errorMessage.style.display = 'none'; }, 2000);
            }
        });
    }

    // --- 5. KDS Initialization (Starts AFTER successful login) ---

    function startKDSListeners() {
        
        // LISTENER 1: For "new" orders (to fill the popup queue)
        db.collection("orders")
          .where("status", "==", "new")
          .orderBy("createdAt")
          .onSnapshot(
            (snapshot) => {
                connectionStatusEl.textContent = "Connected";
                connectionStatusEl.className = "status-connected";
                
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added") {
                        newOrderQueue.push(change.doc);
                        showNextOrderInPopup();
                    }
                });
            },
            (error) => {
                console.error("Error connecting to Firestore: ", error);
                connectionStatusEl.textContent = "Connection Error";
                connectionStatusEl.className = "status-disconnected";
            }
        );

        // LISTENER 2: For "accepted" orders (to fill the 12 table boxes)
        db.collection("orders")
          .where("status", "==", "accepted")
          .orderBy("createdAt")
          .onSnapshot(
            (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    const orderData = change.doc.data();
                    const tableBox = document.getElementById(`table-${orderData.table}`);
                    
                    if (change.type === "added" || change.type === "modified") {
                        if (tableBox) {
                            updateTableBox(tableBox, orderData, change.doc.id);
                        }
                    }
                    if (change.type === "removed") {
                        const tableId = orderData.table;
                        const tableBox = document.getElementById(`table-${tableId}`);
                        if (tableBox) {
                            loadAcceptedOrdersForTable(tableId); 
                        }
                    }
                });
            },
            (error) => console.error("Error listening for accepted orders: ", error)
        );
        
        // Initial Load - fill boxes with existing orders immediately after login
        console.log("Loading existing accepted orders...");
        for (let i = 1; i <= 12; i++) {
            loadAcceptedOrdersForTable(i.toString());
        }
    }


    // --- 6. Order Handling Functions (Popup and UI Update) ---

    function showNextOrderInPopup() {
        if (isPopupActive || newOrderQueue.length === 0) {
            return;
        }
        
        isPopupActive = true;
        currentPopupOrderDoc = newOrderQueue.shift(); 
        const orderData = currentPopupOrderDoc.data();
        
        let itemsHtml = orderData.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('');
        
        popupOrderDetails.innerHTML = `
            <h4>Table ${orderData.table}</h4>
            <ul>${itemsHtml}</ul>
        `;
        newOrderPopup.classList.remove('hidden');

        audio.play().catch(e => console.warn("Could not play sound: User must interact with page first."));
    }

    function hideNewOrderPopup() {
        newOrderPopup.classList.add('hidden');
        currentPopupOrderDoc = null;
        isPopupActive = false;
        
        showNextOrderInPopup(); 
    }

    function formatOrderTime(firebaseTimestamp) {
        if (!firebaseTimestamp) {
            return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        }
        const date = firebaseTimestamp.toDate();
        return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }

    function updateTableBox(tableBox, orderData, docId) {
        if (!tableBox) return; 
        
        const orderList = tableBox.querySelector('.order-list');
        const timeEl = tableBox.querySelector('.order-time');
        
        const emptyMsg = orderList.querySelector('.order-list-empty');
        if (emptyMsg) {
            orderList.innerHTML = ''; 
        }

        timeEl.textContent = formatOrderTime(orderData.createdAt);
        
        if (orderList.children.length > 0 && orderList.children[0].className !== 'order-list-empty') {
            const divider = document.createElement('li');
            divider.innerHTML = `--- <strong>(${timeEl.textContent} Order)</strong> ---`;
            divider.style.textAlign = "center";
            orderList.appendChild(divider);
        }
        
        orderData.items.forEach(item => {
            const itemEl = document.createElement('li');
            itemEl.textContent = `${item.quantity}x ${item.name}`;
            itemEl.dataset.docId = docId; 
            orderList.appendChild(itemEl);
        });
        
        tableBox.classList.add('new-order-flash');
        setTimeout(() => {
            tableBox.classList.remove('new-order-flash');
        }, 2000); 
    }

    function clearTableUI(tableBox) {
        const orderList = tableBox.querySelector('.order-list');
        const timeEl = tableBox.querySelector('.order-time');
        orderList.innerHTML = '<li class="order-list-empty">Waiting for order...</li>';
        timeEl.textContent = '--:--';
    }

    async function clearTableDatabase(tableId) {
        console.log(`Clearing database for Table ${tableId}`);
        const snapshot = await db.collection("orders")
            .where("table", "==", tableId)
            .where("status", "==", "accepted")
            .get();

        if (snapshot.empty) {
            return;
        }
        
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        console.log(`Cleared ${snapshot.size} orders for Table ${tableId}`);
    }

    async function loadAcceptedOrdersForTable(tableId) {
        const tableBox = document.getElementById(`table-${tableId}`);
        if (!tableBox) return;

        const snapshot = await db.collection("orders")
            .where("table", "==", tableId)
            .where("status", "==", "accepted")
            .orderBy("createdAt")
            .get();

        if (snapshot.empty) {
            clearTableUI(tableBox); 
            return;
        }

        clearTableUI(tableBox); 
        
        snapshot.docs.forEach((doc, index) => {
            const orderData = doc.data();
            const orderList = tableBox.querySelector('.order-list');
            const timeEl = tableBox.querySelector('.order-time');
            
            if (orderData.createdAt) {
                timeEl.textContent = formatOrderTime(orderData.createdAt);
            }

            if (index > 0) {
                const divider = document.createElement('li');
                divider.innerHTML = `--- <strong>(${formatOrderTime(orderData.createdAt)} Order)</strong> ---`;
                divider.style.textAlign = "center";
                orderList.appendChild(divider);
            }
            
            orderData.items.forEach(item => {
                const itemEl = document.createElement('li');
                itemEl.textContent = `${item.quantity}x ${item.name}`;
                itemEl.dataset.docId = doc.id;
                orderList.appendChild(itemEl);
            });
        });
    }


    // --- 8. Event Listeners (Accept/Clear) ---
    acceptOrderBtn.addEventListener('click', () => {
        if (!currentPopupOrderDoc) return;
        
        db.collection("orders").doc(currentPopupOrderDoc.id).update({
            status: "accepted"
        }).then(() => {
            hideNewOrderPopup();
        }).catch(e => {
            console.error("Error accepting order: ", e);
            alert("Could not accept order!");
        });
    });

    document.querySelectorAll('.clear-table-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const tableId = e.target.dataset.table;
            if (confirm(`Are you sure you want to clear ALL items for Table ${tableId}?`)) {
                clearTableDatabase(tableId).catch(e => {
                    console.error("Failed to clear database:", e);
                    alert("Error clearing database. Please refresh.");
                });
            }
        });
    });


    // --- FINAL STEP: Check login state on page load ---
    checkLoginState();
});
