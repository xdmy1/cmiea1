// Eveniment.js - Enhanced with robust profile validation for event registration
console.log("Eveniment.js loading...");

// Initialize Firebase
firebase.initializeApp({
    apiKey: "AIzaSyBoWwArqP6pYGvVSBzCbUnOphhzk0Pi9oQ",
    authDomain: "tekwill-441fe.firebaseapp.com",
    projectId: "tekwill-441fe",
    storageBucket: "tekwill-441fe.firebasestorage.app",
    messagingSenderId: "990223834307",
    appId: "1:990223834307:web:c1a9da67d5e5f070db1676"
});

const db = firebase.firestore();
const auth = firebase.auth();

// Constants for storage keys
const STORAGE_KEYS = {
    PENDING_EVENT: 'pendingEventEnrollment',
    FAVORITE_EVENTS: 'favoriteEvents'
};

// Mobile navigation setup
document.getElementById("burger").addEventListener("click", function() {
    document.getElementById("phone-nav").classList.remove("hidden");
});

document.getElementById("close").addEventListener("click", function() {
    document.getElementById("phone-nav").classList.add("hidden");
});

// Enhanced function to check if user profile is complete
async function isUserProfileComplete(userId) {
    try {
        console.log("Checking if user profile is complete for:", userId);
        
        const userDoc = await db.collection("users").doc(userId).get();
        
        if (!userDoc.exists) {
            console.log("User document not found");
            return false;
        }
        
        const userData = userDoc.data();
        
        // Check for required profile fields
        const requiredFields = ['phone', 'birthDate', 'occupation', 'education', 'profileCompleted'];
        const missingFields = requiredFields.filter(field => !userData[field]);
        
        if (missingFields.length > 0) {
            console.log("User profile incomplete. Missing fields:", missingFields);
            return false;
        }
        
        // Extra check for profileCompleted flag
        if (userData.profileCompleted !== true) {
            console.log("Profile not marked as completed");
            return false;
        }
        
        console.log("User profile is complete");
        return true;
    } catch (error) {
        console.error("Error checking user profile:", error);
        return false;
    }
}

// Function to get the number of approved registrations for an event
async function getApprovedEventRegistrationsCount(eventId) {
    try {
        console.log("Counting approved registrations for event:", eventId);
        
        // Create a query against the eventRegistrations collection
        const registrationsRef = db.collection("eventRegistrations");
        const query = registrationsRef
            .where("eventId", "==", eventId)
            .where("status", "==", "approved");
        
        // Get the count
        const snapshot = await query.get();
        const count = snapshot.size;
        
        console.log(`Found ${count} approved registrations for event ${eventId}`);
        return count;
    } catch (error) {
        console.error("Error counting approved event registrations:", error);
        return 0; // Return 0 if there's an error
    }
}

// Get event status based on dates
function getEventStatus(startDate, endDate) {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate || startDate);
    
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'ongoing';
    return 'past';
}

// Format date for display
function formatEventDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('ro-RO', options);
}

// Format duration between start and end dates
function formatEventDuration(startDate, endDate) {
    if (!endDate) return null;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours === 0) return `${diffMinutes} minute`;
    if (diffMinutes === 0) return `${diffHours} ${diffHours === 1 ? 'oră' : 'ore'}`;
    return `${diffHours}h ${diffMinutes}m`;
}

// Get status badge HTML - simplified
function getStatusBadge(status, isFeatured = false) {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium";
    
    const badges = {
        upcoming: '',
        ongoing: `<span class="${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"><i class="ph ph-play-circle mr-1"></i>În Desfășurare</span>`,
        past: `<span class="${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"><i class="ph ph-check-circle mr-1"></i>Eveniment Încheiat</span>`
    };
    return badges[status] || '';
}

// Show toast notification - simplified
function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.getElementById('toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toastColors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-main',
        warning: 'bg-yellow-500'
    };
    
    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = `fixed top-6 right-6 ${toastColors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300`;
    toast.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="ph ph-check-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Toggle event favorite status
function toggleEventFavorite(eventId) {
    let favorites = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITE_EVENTS) || '[]');
    const button = document.getElementById('favorite-event-btn');
    const icon = button.querySelector('i');
    
    if (favorites.includes(eventId)) {
        // Remove from favorites
        favorites = favorites.filter(id => id !== eventId);
        button.classList.remove('favorited');
        button.style.background = '';
        button.style.color = '';
        icon.classList.remove('ph-heart-fill');
        icon.classList.add('ph-heart');
        showToast('Eveniment eliminat din favorite', 'info');
    } else {
        // Add to favorites
        favorites.push(eventId);
        button.classList.add('favorited');
        button.style.background = '#ef4444';
        button.style.color = 'white';
        icon.classList.remove('ph-heart');
        icon.classList.add('ph-heart-fill');
        
        // Add animation
        button.style.transform = 'scale(1.1)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 200);
        
        showToast('Eveniment adăugat la favorite', 'success');
    }
    
    localStorage.setItem(STORAGE_KEYS.FAVORITE_EVENTS, JSON.stringify(favorites));
}

// Share event functionality
function shareEvent(eventTitle = 'Eveniment CMIEA') {
    const eventUrl = window.location.href;
    const shareText = `Participă la ${eventTitle} - CMIEA`;
    
    if (navigator.share) {
        // Use native sharing if available
        navigator.share({
            title: eventTitle,
            text: shareText,
            url: eventUrl
        }).catch(err => console.log('Error sharing:', err));
    } else {
        // Fallback: copy to clipboard
        const fullShareText = `${shareText} - ${eventUrl}`;
        navigator.clipboard.writeText(fullShareText).then(() => {
            showToast('Link-ul evenimentului a fost copiat în clipboard', 'success');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = fullShareText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showToast('Link-ul evenimentului a fost copiat în clipboard', 'success');
        });
    }
}

// Create success modal for event registration
function createRegistrationModal() {
    const existingModal = document.getElementById('success-modal');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }
    
    const modalContainer = document.createElement('div');
    modalContainer.id = 'success-modal';
    modalContainer.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
    
    modalContainer.innerHTML = `
        <div class="bg-white dark:bg-dark2 rounded-lg shadow-xl p-6 m-4 max-w-sm w-full transform transition-all">
            <div class="flex justify-center mb-4">
                <div class="flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900">
                    <svg class="h-8 w-8 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
            </div>
            <h3 class="text-lg font-medium text-center text-gray-900 dark:text-white mb-2">
                Înregistrare realizată cu succes!
            </h3>
            <p class="text-sm text-center text-gray-600 dark:text-gray-300 mb-6">
                Te-ai înregistrat cu succes la eveniment. Vei primi detalii suplimentare pe email în curând.
            </p>
            <div class="flex justify-center">
                <button id="success-modal-close" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-main hover:bg-maindark text-base font-medium text-white">
                   Perfect!
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalContainer);
    
    document.getElementById('success-modal-close').addEventListener('click', function() {
        document.body.removeChild(modalContainer);
        window.location.href = '/evenimente.html';
    });
    
    modalContainer.addEventListener('click', function(e) {
        if (e.target === modalContainer) {
            document.body.removeChild(modalContainer);
            window.location.href = '/evenimente.html';
        }
    });
}

// Create pending registration modal
function createPendingRegistrationModal() {
    const existingModal = document.getElementById('success-modal');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }
    
    // Get event info to check if this is a waitlist entry
    const remainingSpots = document.querySelector('.font-semibold.leading-\\[110\\%\\]');
    const isWaitlist = remainingSpots && remainingSpots.textContent.includes('Toate locurile au fost ocupate');
    
    const modalContainer = document.createElement('div');
    modalContainer.id = 'success-modal';
    modalContainer.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
    
    modalContainer.innerHTML = `
        <div class="bg-white dark:bg-dark2 rounded-lg shadow-xl p-6 m-4 max-w-sm w-full transform transition-all">
            <div class="flex justify-center mb-4">
                <div class="flex items-center justify-center h-16 w-16 rounded-full ${isWaitlist ? 'bg-yellow-100 dark:bg-yellow-900' : 'bg-main/10 dark:bg-maindark/30'}">
                    <svg class="h-8 w-8 ${isWaitlist ? 'text-yellow-600 dark:text-yellow-300' : 'text-main dark:text-maindark'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
            </div>
            <h3 class="text-lg font-medium text-center text-gray-900 dark:text-white mb-2">
                ${isWaitlist 
                    ? 'Ai fost adăugat în lista de așteptare!' 
                    : 'Cerere de înregistrare trimisă!'}
            </h3>
            <p class="text-sm text-center text-gray-600 dark:text-gray-300 mb-6">
                ${isWaitlist 
                    ? 'Cererea ta a fost adăugată în lista de așteptare. Te vom contacta când se eliberează un loc.' 
                    : 'Cererea ta a fost trimisă cu succes și este în așteptare. Administratorul va revizui cererea și o va aproba în scurt timp. Vei fi notificat când cererea este aprobată.'}
            </p>
            <div class="flex justify-center">
                <button id="success-modal-close" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-main hover:bg-maindark text-base font-medium text-white">
                   Înțeles!
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalContainer);
    
    document.getElementById('success-modal-close').addEventListener('click', function() {
        document.body.removeChild(modalContainer);
        window.location.href = '/evenimente.html';
    });
    
    modalContainer.addEventListener('click', function(e) {
        if (e.target === modalContainer) {
            document.body.removeChild(modalContainer);
            window.location.href = '/evenimente.html';
        }
    });
}

// Enhanced event registration handler
async function handleEventRegistration(user, eventId) {
    try {
        console.log("Starting event registration for user:", user.uid);
        
        // Get the button and change its state
        const registerButton = document.getElementById('event-register-btn');
        if (registerButton) {
            registerButton.disabled = true;
            registerButton.innerHTML = 'Se procesează...';
        }
        
        // Check if user profile is complete
        const isProfileComplete = await isUserProfileComplete(user.uid);
        
        if (!isProfileComplete) {
            console.log("User profile incomplete, redirecting to registration step 2");
            
            // Store current event ID in localStorage to return after registration
            localStorage.setItem(STORAGE_KEYS.PENDING_EVENT, eventId);
            
            // Show notification to user
            alert("Pentru a te înregistra la acest eveniment, trebuie să completezi profilul tău. Vei fi redirecționat către pagina de completare a profilului.");
            
            // Reset button state before redirecting
            if (registerButton) {
                registerButton.disabled = false;
                registerButton.innerHTML = 'Înregistrează-te la eveniment';
            }
            
            // Redirect to profile completion page
            window.location.href = '/register-step2.html';
            return false;
        }
        
        // Get event data
        let eventData = null;
        try {
            const eventDoc = await db.collection("events").doc(eventId).get();
            if (eventDoc.exists) {
                eventData = eventDoc.data();
            }
        } catch (error) {
            console.error("Error getting event data:", error);
        }
        
        if (!eventData) {
            throw new Error("Nu s-au putut încărca datele evenimentului.");
        }
        
        console.log("Event details:", { eventId, eventTitle: eventData.title });

        // Check for existing registrations
        try {
            const registrationsRef = db.collection("eventRegistrations");
            const existingRegistrations = await registrationsRef
                .where("userId", "==", user.uid)
                .where("eventId", "==", eventId)
                .get();
            
            if (!existingRegistrations.empty) {
                // User already registered for this event
                const registration = existingRegistrations.docs[0].data();
                const statusText = registration.status === 'approved' 
                    ? 'Ești deja înscris la acest eveniment'
                    : 'Ai deja o cerere în așteptare';
                
                alert(statusText);
                
                // Reset button state
                if (registerButton) {
                    registerButton.disabled = true;
                    registerButton.innerHTML = statusText;
                }
                
                return false;
            }
        } catch (error) {
            console.error("Error checking existing registrations:", error);
            // Continue with registration
        }

        // Create registration data with pending status
        const approvedRegistrations = eventData.approvedRegistrations || 0;
        const availableSpots = eventData.availableSpots || 0;
        const isWaitlist = approvedRegistrations >= availableSpots;
        
        // Get user profile data
        let userData = null;
        try {
            const userDoc = await db.collection("users").doc(user.uid).get();
            userData = userDoc.exists ? userDoc.data() : null;
        } catch (error) {
            console.error("Error fetching user profile:", error);
            // Continue with available data
        }
        
        const registrationData = {
            userId: user.uid,
            eventId: eventId,
            eventTitle: eventData.title,
            userName: user.displayName || user.email,
            email: user.email,
            phone: userData ? userData.phone : '',
            birthDate: userData ? userData.birthDate : null,
            occupation: userData ? userData.occupation : null,
            education: userData ? userData.education : null,
            registrationDate: firebase.firestore.FieldValue.serverTimestamp(),
            status: "pending", // For admin approval
            isWaitlist: isWaitlist // Flag for waitlist entries
        };
        
        console.log("Saving event registration:", registrationData);
        
        // Save to Firestore
        await db.collection("eventRegistrations").add(registrationData);
        
        console.log("Event registration saved successfully");
        
        // Show modified success modal explaining approval process
        createPendingRegistrationModal();
        
        // Reset button state
        if (registerButton) {
            registerButton.disabled = false;
            registerButton.innerHTML = availableSpots > approvedRegistrations ? 
                'Înregistrează-te la eveniment' : 
                'Intră în lista de așteptare';
        }
        
        return true;
    } catch (error) {
        console.error("Error in handleEventRegistration:", error);
        
        // Reset button state
        const registerButton = document.getElementById('event-register-btn');
        if (registerButton) {
            registerButton.disabled = false;
            registerButton.innerHTML = 'Înregistrează-te la eveniment';
        }
        
        alert(`Eroare la înregistrare: ${error.message}`);
        return false;
    }
}

// Enhanced setup for event buttons
function setupEventButtons(event) {
    const eventId = event.id;
    
    // Setup registration button
    auth.onAuthStateChanged((user) => {
        const registerButton = document.getElementById('event-register-btn');
        if (!registerButton) return;

        console.log("Auth state changed:", user ? "logged in" : "logged out");
        
        if (user) {
            // User is logged in - check for existing registration first
            checkExistingEventRegistration(user, eventId, registerButton);
        } else {
            // User is not logged in
            registerButton.onclick = function() {
                alert("Pentru a te înregistra la eveniment, te rugăm să te loghezi mai întâi!");
                window.location.href = '/login.html';
            };
        }
    });
    
    // Setup favorite button
    const favoriteBtn = document.getElementById('favorite-event-btn');
    if (favoriteBtn) {
        // Check if event is already favorited
        const favorites = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITE_EVENTS) || '[]');
        
        if (favorites.includes(eventId)) {
            favoriteBtn.classList.add('favorited');
            favoriteBtn.style.background = '#ef4444';
            favoriteBtn.style.color = 'white';
            favoriteBtn.querySelector('i').classList.remove('ph-heart');
            favoriteBtn.querySelector('i').classList.add('ph-heart-fill');
        }
        
        favoriteBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleEventFavorite(eventId);
        });
    }
    
    // Setup share button
    const shareBtn = document.getElementById('share-event-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            shareEvent(event.title);
        });
    }
}

// Check for existing event registrations and update button state
async function checkExistingEventRegistration(user, eventId, registerButton) {
    try {
        // First check if user has complete profile
        const isProfileComplete = await isUserProfileComplete(user.uid);
        
        if (!isProfileComplete) {
            console.log("User profile incomplete");
            
            // Enable button but set it to redirect to profile completion
            registerButton.disabled = false;
            registerButton.onclick = function() {
                localStorage.setItem(STORAGE_KEYS.PENDING_EVENT, eventId);
                alert("Pentru a te înregistra la acest eveniment, trebuie să completezi profilul tău. Vei fi redirecționat către pagina de completare a profilului.");
                window.location.href = '/register-step2.html';
            };
            
            return;
        }
        
        // Then check for existing registrations
        const registrationsRef = db.collection("eventRegistrations");
        const existingRegistrations = await registrationsRef
            .where("userId", "==", user.uid)
            .where("eventId", "==", eventId)
            .get();
        
        if (!existingRegistrations.empty) {
            // User already registered for this event
            const registration = existingRegistrations.docs[0].data();
            
            if (registration.status === 'approved') {
                registerButton.disabled = true;
                registerButton.innerHTML = 'Ești deja înscris la acest eveniment';
            } else if (registration.status === 'pending') {
                registerButton.disabled = true;
                registerButton.innerHTML = 'Ai deja o cerere în așteptare';
            } else if (registration.status === 'waitlist') {
                registerButton.disabled = true;
                registerButton.innerHTML = 'Ești pe lista de așteptare';
            } else {
                // Other status - allow registration
                registerButton.onclick = function() {
                    handleEventRegistration(user, eventId);
                };
            }
        } else {
            // No existing registration - allow registration
            registerButton.onclick = function() {
                handleEventRegistration(user, eventId);
            };
        }
    } catch (error) {
        console.error("Error checking existing event registration:", error);
        
        // Default to allow registration
        registerButton.onclick = function() {
            handleEventRegistration(user, eventId);
        };
    }
}

// Main function to render event details
async function renderEventDetails() {
    try {
        console.log("Starting renderEventDetails()");
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('id');
        
        console.log("Event ID from URL:", eventId);
        
        if (!eventId) {
            throw new Error('Nu a fost furnizat ID-ul evenimentului');
        }

        // Show loading state
        const container = document.getElementById('event-details-container');
        if (container) {
            container.innerHTML = '<div class="flex justify-center items-center p-10"><div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-main"></div></div>';
        }

        // Try to get event from Firestore
        console.log("Attempting to fetch event from Firestore");
        try {
            const eventDoc = await db.collection("events").doc(eventId).get();
            
            if (eventDoc.exists) {
                const event = eventDoc.data();
                event.id = eventId;
                
                // Get approved registrations count
                const approvedRegistrations = await getApprovedEventRegistrationsCount(eventId);
                
                // Add the count to the event object
                event.approvedRegistrations = approvedRegistrations;
                
                console.log("Event data retrieved from Firestore:", event);
                renderEventUI(event);
                return;
            } else {
                console.log("Event document not found in Firestore, trying collection query");
            }
        } catch (error) {
            console.error("Error with Firestore getDoc method:", error);
        }

        // Try collection query as fallback
        try {
            const eventsCollection = db.collection("events");
            const querySnapshot = await eventsCollection.get();
            
            let eventFound = false;
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                
                if (doc.id === eventId || data.id?.toString() === eventId) {
                    console.log("Found matching event in collection:", data);
                    const event = data;
                    event.id = doc.id;
                    
                    // Get approved registrations count
                    getApprovedEventRegistrationsCount(doc.id).then(approvedRegistrations => {
                        event.approvedRegistrations = approvedRegistrations;
                        renderEventUI(event);
                    });
                    
                    eventFound = true;
                    return;
                }
            });
            
            if (!eventFound) {
                throw new Error('Evenimentul nu a fost găsit în Firebase');
            }
        } catch (error) {
            console.error("Error with fallback methods:", error);
            throw error;
        }
    } catch (error) {
        console.error('Error rendering event details:', error);
        const container = document.getElementById('event-details-container');
        if (container) {
            container.innerHTML = `
                <div class="text-center p-6 flex flex-col items-center justify-center h-[70vh]">
                    <h2 class="text-3xl lg:text-5xl font-bold text-red-600">Eroare</h2>
                    <p class="mb-4 text-gray-700 dark:text-gray-300">${error.message}</p>
                    <a href="/evenimente.html" class="mt-2 underline text-main dark:text-maindark">Întoarce-te la evenimente</a>
                </div>
            `;
        }
    }
}

// Render the event UI with the retrieved data - fixed layout for proper button positioning
function renderEventUI(event) {
    try {
        console.log("Rendering event UI for:", event.title);
        
        const container = document.getElementById('event-details-container');
        const status = getEventStatus(event.startDate, event.endDate);
        const isFeatured = event.featured === true;
        const statusBadge = getStatusBadge(status);
        const formattedStartDate = formatEventDate(event.startDate);
        const formattedEndDate = event.endDate ? formatEventDate(event.endDate) : null;
        const duration = formatEventDuration(event.startDate, event.endDate);
        
        // Calculate remaining spots
        const totalSpots = event.availableSpots || 0;
        const approvedRegistrations = event.approvedRegistrations || 0;
        const remainingSpots = Math.max(0, totalSpots - approvedRegistrations);
        
        console.log("Event is featured:", isFeatured);
        
        container.innerHTML = '';
        
        const featuredClasses = isFeatured 
            ? 'border-white dark:border-dark2' 
            : 'border-white dark:border-dark2';
        
        const eventDetails = `
        <div class="bg-white dark:bg-dark2 rounded-3xl shadow-2xl overflow-hidden relative mb-8 border-2 ${featuredClasses}">
            ${isFeatured ? `
            ` : ''}
            
            <div class="flex flex-col lg:flex-row">
                <!-- Content Section -->
                <div class="flex-1 p-8 lg:p-12 ${isFeatured ? 'pt-16 lg:pt-12' : ''} flex flex-col">
                    <div class="flex items-center gap-3 mb-6 flex-wrap">
                        <div class="h-fit w-fit rounded-full border border-main px-2 md:px-3 py-1 text-main text-xs md:text-sm mb-2">
                            ${event.category || 'Workshop'}
                        </div>
                        ${statusBadge}
                    </div>
                    
                    <div class="flex flex-col flex-grow justify-between">
                        <div class="mb-6">
                            <h1 class="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight mb-4">
                                ${event.title}
                            </h1>
                            <p class="text-lg lg:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                                ${event.description}
                            </p>
                        </div>
                        
                        <!-- Event Details Grid -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 bg-main/10 dark:bg-maindark/20 rounded-xl flex items-center justify-center">
                                    <i class="ph ph-calendar text-main dark:text-maindark text-xl"></i>
                                </div>
                                <div>
                                    <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">Data de început</p>
                                    <p class="text-gray-900 dark:text-white font-semibold">${formattedStartDate}</p>
                                </div>
                            </div>
                            
                            ${formattedEndDate ? `
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 bg-main/10 dark:bg-maindark/20 rounded-xl flex items-center justify-center">
                                    <i class="ph ph-calendar-check text-main dark:text-maindark text-xl"></i>
                                </div>
                                <div>
                                    <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">Data de sfârșit</p>
                                    <p class="text-gray-900 dark:text-white font-semibold">${formattedEndDate}</p>
                                </div>
                            </div>
                            ` : ''}
                            
                            ${duration ? `
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 bg-main/10 dark:bg-maindark/20 rounded-xl flex items-center justify-center">
                                    <i class="ph ph-clock text-main dark:text-maindark text-xl"></i>
                                </div>
                                <div>
                                    <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">Durata</p>
                                    <p class="text-gray-900 dark:text-white font-semibold">${duration}</p>
                                </div>
                            </div>
                            ` : ''}
                            
                            
                            ${event.availableSpots ? `
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 bg-main/10 dark:bg-maindark/20 rounded-xl flex items-center justify-center">
                                    <i class="ph ph-users text-main dark:text-maindark text-xl"></i>
                                </div>
                                <div>
                                    <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">Locuri disponibile</p>
                                    <div class="flex items-center justify-start gap-1">
                                        <span class="font-semibold leading-[110%]">
                                            ${remainingSpots > 0 
                                                ? `Au rămas ${remainingSpots} locuri!` 
                                                : 'Toate locurile au fost ocupate'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                            
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 bg-main/10 dark:bg-maindark/20 rounded-xl flex items-center justify-center">
                                    <i class="ph ph-user text-main dark:text-maindark text-xl"></i>
                                </div>
                                <div>
                                    <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">Profesor</p>
                                    <p class="text-gray-900 dark:text-white font-semibold">${event.facilitator || 'Echipa CMIEA'}</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="mt-auto">
                            <button 
                                id="event-register-btn" 
                                data-event-id="${event.id}"
                                class="w-full px-8 py-4 bg-gradient-to-r from-main to-maindark hover:from-maindark hover:to-main text-white rounded-2xl font-semibold text-lg transition-all duration-300 hover:shadow-2xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                ${status === 'past' ? 'disabled' : ''}
                            >
                                ${status === 'past' ? 'Eveniment încheiat' : remainingSpots > 0 
                                    ? 'Înregistrează-te la eveniment' 
                                    : 'Intră în lista de așteptare'}
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Visual Section -->
                <div class="lg:w-1/2 relative">
                    <div class="h-64 lg:h-full bg-gradient-to-br from-main/20 via-maindark/10 to-purple-300/20 dark:from-maindark/30 dark:via-main/20 dark:to-purple-600/30 flex items-center justify-center relative overflow-hidden">
                        ${event.image ? 
                            `<img src="${event.image}" alt="${event.title}" class="w-full h-full object-cover">` :
                            `<div class="text-center">
                                <div class="w-32 h-32 bg-white/20 dark:bg-white/10 rounded-full flex items-center justify-center mb-6 mx-auto backdrop-blur-sm">
                                    <i class="ph ph-calendar-star text-6xl text-white"></i>
                                </div>
                                <p class="text-white/80 text-lg font-medium">${event.category || 'Eveniment Special'}</p>
                            </div>`
                        }
                    </div>
                </div>
            </div>
        </div>
        `;
        
        container.innerHTML = eventDetails;

        // Setup event listeners
        setupEventButtons(event);
        
        // Load recommended events
        loadRecommendedEvents(event.id);
        
        console.log("Event UI rendering complete");
        
    } catch (error) {
        console.error('Error in renderEventUI:', error);
        throw error;
    }
}

// Load recommended events
async function loadRecommendedEvents(currentEventId) {
    try {
        console.log("Loading recommended events...");
        
        const eventsCollection = db.collection("events");
        const querySnapshot = await eventsCollection.orderBy("startDate", "desc").limit(6).get();
        
        const recommendedEvents = [];
        querySnapshot.forEach((doc) => {
            const eventData = doc.data();
            // Exclude current event and only show upcoming events
            if (doc.id !== currentEventId) {
                const status = getEventStatus(eventData.startDate, eventData.endDate);
                if (status === 'upcoming') {
                    recommendedEvents.push({
                        id: doc.id,
                        ...eventData,
                        status: status
                    });
                }
            }
        });
        
        // Get approved registrations count for each event
        for (let event of recommendedEvents) {
            event.approvedRegistrations = await getApprovedEventRegistrationsCount(event.id);
        }
        
        // Prioritize featured events, then sort by date
        recommendedEvents.sort((a, b) => {
            // Featured events first
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            // Then by date
            return new Date(a.startDate) - new Date(b.startDate);
        });
        
        // Limit to 3 events
        const eventsToShow = recommendedEvents.slice(0, 3);
        
        const container = document.getElementById('recommended-events');
        if (!container) return;
        
        if (eventsToShow.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <p class="text-gray-500 dark:text-gray-400">Nu există alte evenimente disponibile momentan.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = eventsToShow.map(event => {
            const formattedDate = formatEventDate(event.startDate);
            const isFeatured = event.featured === true;
            
            // Calculate remaining spots
            const totalSpots = event.availableSpots || 0;
            const approvedRegistrations = event.approvedRegistrations || 0;
            const remainingSpots = Math.max(0, totalSpots - approvedRegistrations);
            
            return `
                <div class="bg-white dark:bg-dark2 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1 group ${isFeatured ? 'border-2 border-yellow-400 dark:border-yellow-500' : ''}">
                    <div class="relative h-40 bg-gradient-to-br from-main/20 to-maindark/30 dark:from-maindark/40 dark:to-main/30 overflow-hidden">
                        ${event.image ? 
                            `<img src="${event.image}" alt="${event.title}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300">` :
                            `<div class="h-full flex items-center justify-center">
                                <div class="text-center">
                                    <i class="ph ph-calendar-check text-5xl text-white/80 mb-2"></i>
                                    <p class="text-white/60 text-sm font-medium">${event.category || 'Eveniment'}</p>
                                </div>
                            </div>`
                        }
                        <!-- Event status badge -->
                        <div class="absolute top-3 left-3">
                            ${getStatusBadge(event.status)}
                        </div>
                        
                        ${isFeatured ? `
                            <!-- Simple Featured Badge -->
                            <div class="absolute top-3 right-3">
                                <div class="px-2 py-1 bg-yellow-400 text-black rounded-full text-xs font-bold">
                                    Featured
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="p-6 ${isFeatured ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}">
                        <h3 class="text-lg font-bold mb-2 text-gray-900 dark:text-white group-hover:text-main dark:group-hover:text-maindark transition-colors">
                            ${event.title}
                        </h3>
                        <p class="text-gray-600 dark:text-gray-300 mb-4 text-sm line-clamp-2">
                            ${event.description}
                        </p>
                        
                        <!-- Remaining spots indicator -->
                        <div class="flex items-center justify-start gap-1 mt-1 mb-1">
                            <i class="ph-fill ph-seal-warning text-xl text-main dark:text-maindark"></i>
                            <span class="text-main dark:text-maindark font-semibold leading-[110%] text-xs">
                                ${remainingSpots > 0 
                                    ? `Au rămas ${remainingSpots} locuri!` 
                                    : 'Toate locurile au fost ocupate'}
                            </span>
                        </div>
                        
                        <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                            <i class="ph ph-calendar text-main dark:text-maindark"></i>
                            <span>${formattedDate}</span>
                        </div>
                        
                        <a href="/eveniment.html?id=${event.id}" class="block w-full">
                            <button class="w-full py-2.5 px-4 bg-main dark:bg-maindark text-white rounded-lg font-medium transform hover:scale-105 transition-all duration-200 hover:bg-maindark dark:hover:bg-main">
                                Vezi Detalii
                            </button>
                        </a>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error("Error loading recommended events:", error);
        const container = document.getElementById('recommended-events');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <p class="text-red-500">Eroare la încărcarea evenimentelor recomandate.</p>
                </div>
            `;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM content loaded in eveniment.js");
    
    // Add simple styles for functionality
    const style = document.createElement('style');
    style.textContent = `
        .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        .favorited {
            background: #ef4444 !important;
            color: white !important;
        }
        
        .favorited:hover {
            background: #dc2626 !important;
        }
    `;
    document.head.appendChild(style);
    
    // Render event details
    renderEventDetails();
});

console.log("Enhanced Eveniment.js loaded successfully");