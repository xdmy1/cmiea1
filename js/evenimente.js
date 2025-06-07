// Evenimente.js - Simplified Event Management System with Basic Featured Events Support
console.log("Evenimente.js loading...");

// Initialize Firebase using compat version for consistency (single initialization)
console.log("Initializing Firebase...");
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

let allEvents = [];
let featuredEvent = null;

// Mobile navigation setup
document.getElementById("burger").addEventListener("click", function() {
    document.getElementById("phone-nav").classList.remove("hidden");
});

document.getElementById("close").addEventListener("click", function() {
    document.getElementById("phone-nav").classList.add("hidden");
});

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

// Create success modal for event registration
function createRegistrationModal() {
    const modal = document.getElementById('registration-modal');
    modal.classList.remove('hidden');
    
    document.getElementById('close-modal').addEventListener('click', function() {
        modal.classList.add('hidden');
    });
    
    // Close modal on click outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
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

// Get status badge HTML
function getStatusBadge(status) {
    const badges = {
        upcoming: '',  // Removed the Viitor badge
        ongoing: '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"><i class="ph ph-play-circle mr-1"></i>În desfășurare</span>',
        past: '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"><i class="ph ph-check-circle mr-1"></i>Finalizat</span>'
    };
    return badges[status] || '';
}

// Create sample events if collection is empty
async function createSampleEvents() {
    console.log("Creating sample events...");
    
    const sampleEvents = [
        {
            title: "Workshop: Dezvoltarea Competențelor Digitale",
            description: "Un workshop practic dedicat învățării competențelor digitale esențiale pentru lumea modernă a muncii.",
            category: "Workshop",
            startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(), // 3 hours later
            facilitator: "Dr. Ana Popescu",
            availableSpots: 25,
            requirements: "Cunoștințe de bază în utilizarea computerului",
            notes: "Vă rugăm să veniți cu laptop-ul personal",
            featured: true // Make this event featured
        },
        {
            title: "Seminar: Leadership și Management Modern",
            description: "Seminar interactiv despre tehnicile moderne de leadership și managementul echipelor.",
            category: "Seminar",
            startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
            facilitator: "Mihai Ionescu",
            availableSpots: 50,
            requirements: "Experiență de lucru în echipă",
            notes: "Link-ul de acces va fi trimis cu 24h înainte",
            featured: false
        },
        {
            title: "Conferința: Viitorul Educației Adulților",
            description: "Conferință națională despre tendințele și inovațiile în educația adulților.",
            category: "Conferință",
            startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 1 month from now
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000).toISOString(), // 6 hours later
            facilitator: "Echipa CMIEA și invitați speciali",
            availableSpots: 200,
            requirements: "Deschis pentru toți profesorii și specialiștii în educație",
            notes: "Include masă de prânz și materiale de lucru",
            featured: false
        }
    ];

    try {
        for (const event of sampleEvents) {
            await db.collection('events').add({
                ...event,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        console.log("Sample events created successfully");
    } catch (error) {
        console.error("Error creating sample events:", error);
    }
}

// Load all events from Firestore - with featured support
async function loadEvents() {
    try {
        console.log("Loading events from Firestore...");
        
        const eventsCollection = db.collection("events");
        const querySnapshot = await eventsCollection.orderBy("startDate", "desc").get();
        
        allEvents = [];
        querySnapshot.forEach((doc) => {
            const eventData = doc.data();
            // Skip deleted events
            if (!eventData.deleted) {
                allEvents.push({
                    id: doc.id,
                    ...eventData,
                    status: getEventStatus(eventData.startDate, eventData.endDate)
                });
            }
        });
        
        console.log("Events loaded:", allEvents.length);
        
        // If no events exist, create sample events
        if (allEvents.length === 0) {
            await createSampleEvents();
            // Reload events after creating samples
            const newQuerySnapshot = await eventsCollection.orderBy("startDate", "desc").get();
            allEvents = [];
            newQuerySnapshot.forEach((doc) => {
                const eventData = doc.data();
                if (!eventData.deleted) {
                    allEvents.push({
                        id: doc.id,
                        ...eventData,
                        status: getEventStatus(eventData.startDate, eventData.endDate)
                    });
                }
            });
        }
        
        // Get approved registrations count for each event
        for (let event of allEvents) {
            event.approvedRegistrations = await getApprovedEventRegistrationsCount(event.id);
        }
        
        // Set featured event - check if there's already a featured event set by admin
        featuredEvent = allEvents.find(event => event.featured === true);
        
        // If no featured event is set by admin, auto-select the first upcoming event
        if (!featuredEvent) {
            let upcomingEvents = allEvents.filter(event => event.status === 'upcoming');
            
            if (upcomingEvents.length > 0) {
                // Sort upcoming events by start date (earliest first)
                upcomingEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
                featuredEvent = upcomingEvents[0];
            } else {
                // If no upcoming events, use the most recent event
                featuredEvent = allEvents[0];
            }
        }
        
        console.log("Featured event selected:", featuredEvent?.title, "- Featured by admin:", featuredEvent?.featured === true);
        
        // Render events
        await renderFeaturedEvent();
        renderEventsGrid();
        
    } catch (error) {
        console.error("Error loading events:", error);
        showFallbackContent();
    } finally {
        // Hide loading indicator
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.add('hidden');
        }
    }
}

// Render the featured event - with proper height and button positioning
async function renderFeaturedEvent() {
    const container = document.getElementById('featured-event-container');
    
    if (!featuredEvent) {
        container.innerHTML = `
            <div class="bg-white dark:bg-dark2 shadow-lg rounded-2xl p-8 text-center">
                <i class="ph ph-calendar-x text-6xl text-gray-400 dark:text-gray-600 mb-4"></i>
                <h2 class="text-2xl font-bold text-gray-700 dark:text-white mb-2">Nu există evenimente în acest moment</h2>
                <p class="text-gray-500 dark:text-gray-400">Verifică din nou mai târziu pentru evenimente noi!</p>
            </div>
        `;
        return;
    }
    
    const statusBadge = getStatusBadge(featuredEvent.status);
    const formattedDate = formatEventDate(featuredEvent.startDate);
    
    // Calculate remaining spots
    const totalSpots = featuredEvent.availableSpots || 0;
    const approvedRegistrations = featuredEvent.approvedRegistrations || 0;
    const remainingSpots = Math.max(0, totalSpots - approvedRegistrations);
    
    // Simple featured styling - just basic highlighting
    const isFeaturedByAdmin = featuredEvent.featured === true;
    const featuredClasses = 'border-white dark:border-dark2';
    
    container.innerHTML = `
        <div class="bg-white dark:bg-dark2 rounded-2xl shadow-2xl overflow-hidden relative border-2 ${featuredClasses}">
            <div class="flex flex-col lg:flex-row">
                <!-- Content Section -->
                <div class="flex-1 p-8 lg:p-12 ${isFeaturedByAdmin ? 'pt-16 lg:pt-12' : ''} flex flex-col">
                    <div class="flex items-center gap-3 mb-6 flex-wrap">
                        <div class="h-fit w-fit rounded-full border border-main dark:bg-dark px-2 md:px-3 py-1 text-main text-xs md:text-sm mb-2">
                            ${featuredEvent.category || 'Workshop'}
                        </div>
                        ${statusBadge}
                        ${!isFeaturedByAdmin ? `
                            <span class="h-fit w-fit rounded-full border border-main dark:border-maindark dark:bg-dark px-2 md:px-3 py-1 text-main dark:text-maindark text-xs md:text-sm mb-2">
                                RECOMANDAT
                            </span>
                        ` : ''}
                    </div>
                    
                    <div class="flex flex-col justify-between flex-grow">
                        <div class="mb-8">
                            <h1 class="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight mb-4">
                                ${featuredEvent.title}
                            </h1>
                            <p class="text-lg lg:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                                ${featuredEvent.description}
                            </p>
                        </div>
                        
                        <!-- Event Details Grid -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 bg-main/10 dark:bg-maindark/20 rounded-xl flex items-center justify-center">
                                    <i class="ph ph-calendar text-main dark:text-maindark text-xl"></i>
                                </div>
                                <div>
                                    <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">Data și ora</p>
                                    <p class="text-gray-900 dark:text-white font-semibold">${formattedDate}</p>
                                </div>
                            </div>
                            
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
                            
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 bg-main/10 dark:bg-maindark/20 rounded-xl flex items-center justify-center">
                                    <i class="ph ph-user text-main dark:text-maindark text-xl"></i>
                                </div>
                                <div>
                                    <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">Profesor</p>
                                    <p class="text-gray-900 dark:text-white font-semibold">${featuredEvent.facilitator || 'Echipa CMIEA'}</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="mt-auto">
                            <button 
                                id="featured-event-register-btn" 
                                data-event-id="${featuredEvent.id}"
                                class="w-full px-8 py-4 bg-main dark:bg-maindark text-white rounded-2xl font-semibold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                ${featuredEvent.status === 'past' ? 'disabled' : ''}
                            >
                                ${featuredEvent.status === 'past' ? 'Eveniment încheiat' : remainingSpots > 0 
                                    ? 'Vezi Detalii și Înregistrează-te' 
                                    : 'Intră în lista de așteptare'}
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Visual Section -->
                <div class="lg:w-1/2 relative">
                    <div class="h-64 lg:h-full bg-gradient-to-br from-main/20 via-maindark/10 to-purple-300/20 dark:from-maindark/30 dark:via-main/20 dark:to-purple-600/30 flex items-center justify-center relative overflow-hidden">
                        ${featuredEvent.image ? 
                            `<img src="${featuredEvent.image}" alt="${featuredEvent.title}" class="w-full h-full object-cover">` :
                            `<div class="text-center">
                                <div class="w-32 h-32 bg-white/20 dark:bg-white/10 rounded-full flex items-center justify-center mb-6 mx-auto backdrop-blur-sm">
                                    <i class="ph ph-calendar-star text-6xl text-white"></i>
                                </div>
                                <p class="text-white/80 text-lg font-medium">${isFeaturedByAdmin ? 'Eveniment Featured' : 'Eveniment Recomandat'}</p>
                            </div>`
                        }
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render events grid - UPDATED to match the new horizontal card design
function renderEventsGrid() {
    const container = document.getElementById('events-grid');
    const noEventsMessage = document.getElementById('no-events-message');
    
    // Filter events (exclude featured event)
    const categoryFilter = document.getElementById('categoryFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    let filteredEvents = allEvents.filter(event => event.id !== featuredEvent?.id);
    
    if (categoryFilter) {
        filteredEvents = filteredEvents.filter(event => event.category === categoryFilter);
    }
    
    if (statusFilter) {
        filteredEvents = filteredEvents.filter(event => event.status === statusFilter);
    }
    
    if (filteredEvents.length === 0) {
        container.innerHTML = '';
        if (noEventsMessage) {
            noEventsMessage.classList.remove('hidden');
        }
        return;
    }
    
    if (noEventsMessage) {
        noEventsMessage.classList.add('hidden');
    }
    
    // Update grid classes for responsiveness - 2 columns on desktop/tablet, 1 on mobile
    container.className = 'grid grid-cols-1 md:grid-cols-2 gap-6';
    
    container.innerHTML = filteredEvents.map(event => {
        const formattedDate = formatEventDate(event.startDate);
        const isFeaturedByAdmin = event.featured === true;
        
        // Calculate remaining spots
        const totalSpots = event.availableSpots || 0;
        const approvedRegistrations = event.approvedRegistrations || 0;
        const remainingSpots = Math.max(0, totalSpots - approvedRegistrations);
        
        // Default placeholder image for events without image
        const placeholderImage = event.image || `https://picsum.photos/400/280?random=${event.id}`;
        
        return `
            <div class="w-full bg-white dark:bg-dark2 rounded-lg shadow-lg hover:shadow-xl transition-all overflow-hidden relative flex flex-col">
                <div class="flex w-full h-full">
                    <!-- Left: Event Image (40% width) -->
                    <div class="w-2/5 relative overflow-hidden rounded-lg">
                        <img 
                            src="${placeholderImage}" 
                            alt="${event.title}" 
                            class="w-full h-full object-cover"
                            loading="lazy"
                            onerror="this.src='https://via.placeholder.com/400x280/3542FF/ffffff?text=CMIEA+Event'"
                        >
                        
                    </div>
                    
                    <!-- Right: Event Details (60% width) -->
                    <div class="w-3/5 p-4 flex flex-col justify-between">
                        <!-- Category Badge -->
                        <div class="h-fit w-fit rounded-full border border-main dark:bg-dark dark:border-maindark px-2 md:px-3 py-1 text-main text-xs md:text-sm mb-2">
                            ${event.category || 'Workshop'}
                        </div>
                        
                        <!-- Event Content -->
                        <div class="flex flex-col">
                            <h3 class="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                                ${event.title}
                            </h3>
                            <p class="text-gray-500 text-xs md:text-sm dark:text-gray-300 line-clamp-2">
                                ${event.description}
                            </p>
                        </div>
                        
                        
                        
                        <!-- Date and Location -->
                        <div class="mt-auto pt-2">
                            <div class="flex items-center text-xs md:text-sm text-gray-500 mb-3">
                                <i class="ph ph-calendar text-main dark:text-maindark mr-1"></i>
                                <span>${formattedDate.split(' la ')[0]}</span>
                                <span class="ml-1">la ${formattedDate.split(' la ')[1]?.split(',')[0] || ''}</span>
                            </div>
                            
                            <!-- Action Button -->
                            <button 
                                class="event-register-btn bg-main dark:bg-maindark hover:bg-maindark dark:hover:bg-maindark px-3 md:px-4 py-1.5 md:py-2 text-white rounded-lg text-xs md:text-sm font-medium transition-colors"
                                data-event-id="${event.id}"
                                ${event.status === 'past' ? 'disabled' : ''}
                            >
                                ${event.status === 'past' ? 'Eveniment încheiat' : remainingSpots > 0 
                                    ? 'Vezi mai multe' 
                                    : 'Lista de așteptare'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Setup registration buttons
    setupEventRegistration();
}

// Setup event registration functionality
function setupEventRegistration() {
    // Setup featured event button
    const featuredBtn = document.getElementById('featured-event-register-btn');
    if (featuredBtn) {
        if (featuredBtn.disabled) {
            // Event is past, do nothing
            featuredBtn.onclick = null;
        } else {
            featuredBtn.addEventListener('click', handleEventClick);
        }
    }
    
    // Setup grid event buttons
    document.querySelectorAll('.event-register-btn').forEach(btn => {
        if (!btn.disabled) {
            btn.addEventListener('click', handleEventClick);
        }
    });
}

// Handle event click - redirect to individual event page
function handleEventClick(e) {
    const eventId = e.target.getAttribute('data-event-id');
    if (eventId) {
        window.location.href = `/eveniment.html?id=${eventId}`;
    }
}

// Show fallback content when Firebase fails
function showFallbackContent() {
    const featuredContainer = document.getElementById('featured-event-container');
    const gridContainer = document.getElementById('events-grid');
    
    if (featuredContainer) {
        featuredContainer.innerHTML = `
            <div class="bg-white dark:bg-dark2 shadow-lg rounded-2xl p-8 text-center">
                <i class="ph ph-warning text-6xl text-yellow-500 mb-4"></i>
                <h2 class="text-2xl font-bold text-gray-700 dark:text-white mb-2">Eroare la încărcarea evenimentelor</h2>
                <p class="text-gray-500 dark:text-gray-400 mb-4">Nu s-au putut încărca evenimentele. Vă rugăm să încercați din nou.</p>
                <button onclick="location.reload()" class="px-6 py-3 bg-main text-white rounded-lg hover:bg-maindark transition-colors">
                    Reîncarcă pagina
                </button>
            </div>
        `;
    }
    
    if (gridContainer) {
        gridContainer.innerHTML = '';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM content loaded in evenimente.js");
    
    // Add simple styles for functionality
    const style = document.createElement('style');
    style.textContent = `
        .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        .line-clamp-3 {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        .favorited {
            background: rgba(239, 68, 68, 0.8) !important;
            color: white !important;
        }
        
        .favorited:hover {
            background: rgba(220, 38, 38, 0.9) !important;
        }
        
        .quick-favorite-btn,
        .quick-share-btn {
            transition: all 0.2s ease;
        }
        
        .quick-favorite-btn:hover,
        .quick-share-btn:hover {
            transform: scale(1.1);
        }
        
        /* Mobile responsive improvements */
        @media (max-width: 640px) {
            .quick-favorite-btn,
            .quick-share-btn {
                opacity: 1 !important;
            }
        }
        
        /* Better image loading */
        img {
            transition: transform 0.5s ease;
        }
        
        /* Better hover effects */
        .group:hover img {
            transform: scale(1.05);
        }
    `;
    document.head.appendChild(style);
    
    // Add filter event listeners
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', renderEventsGrid);
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', renderEventsGrid);
    }
    
    // Load events
    loadEvents();
});

console.log("Enhanced evenimente.js loaded successfully");