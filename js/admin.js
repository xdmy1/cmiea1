// Complete admin.js with Events Management and Event Registrations - CLEAN VERSION
console.log("Admin.js loading...");

// Initialize Firebase with your project config
firebase.initializeApp({
    apiKey: "AIzaSyBoWwArqP6pYGvVSBzCbUnOphhzk0Pi9oQ",
    authDomain: "tekwill-441fe.firebaseapp.com",
    projectId: "tekwill-441fe",
    storageBucket: "tekwill-441fe.firebasestorage.app",
    messagingSenderId: "990223834307",
    appId: "1:990223834307:web:c1a9da67d5e5f070db1676"
});

// Get Firestore and Auth instances
const db = firebase.firestore();
const auth = firebase.auth();

// DOM Elements - Courses
const coursesTableBody = document.getElementById('coursesTableBody');
const courseModal = document.getElementById('courseModal');
const courseForm = document.getElementById('courseForm');
const addCourseBtn = document.getElementById('addCourseBtn');

// DOM Elements - Enrollments
const enrollmentTableBody = document.getElementById('enrollmentTableBody');

// DOM Elements - Users
const usersContainer = document.getElementById('usersContainer');

// DOM Elements - Events
const eventsTableBody = document.getElementById('eventsTableBody');
// We'll get these elements when needed, not store them as globals
// to avoid stale references

// Common DOM Elements
const loadingIndicator = document.getElementById('loadingIndicator');
const alertBox = document.getElementById('alertBox');
const modalTitle = document.getElementById('modalTitle');
const idField = document.getElementById('idField');
const deleteModal = document.getElementById('deleteModal');
const userEmailDisplay = document.getElementById('user-email-display');
const userMenuButton = document.getElementById('user-menu-button');
const dropdownMenu = document.getElementById('dropdown-menu');
const miniNavToggle = document.getElementById('admin-menu-toggle');
const miniNavMenu = document.getElementById('admin-menu-dropdown');
const currentSectionName = document.getElementById('current-section-name');

// Buttons
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const logoutBtn = document.getElementById('logout-btn');
const logoutBtnMobile = document.getElementById('logout-btn-mobile');

// Global variables
let currentCourseId = null;
let currentEventId = null;
let isAdmin = false;
let currentSection = 'course';
let eventRegistrationsTableBody = null;

// Theme toggle functionality
const setupThemeToggle = (toggleBtn, darkIcon, lightIcon) => {
    if (!toggleBtn || !darkIcon || !lightIcon) return;
    
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            darkIcon.classList.add('hidden');
            lightIcon.classList.remove('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            darkIcon.classList.remove('hidden');
            lightIcon.classList.add('hidden');
        }
    }

    // Initial theme setup
    const savedTheme = localStorage.getItem('color-theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        applyTheme('dark');
        localStorage.setItem('color-theme', 'dark');
    } else {
        applyTheme('light');
        localStorage.setItem('color-theme', 'light');
    }

    // Toggle theme on click
    toggleBtn.addEventListener('click', () => {
        if (document.documentElement.classList.contains('dark')) {
            localStorage.setItem('color-theme', 'light');
            applyTheme('light');
        } else {
            localStorage.setItem('color-theme', 'dark');
            applyTheme('dark');
        }
    });
};

// Setup navigation links
function setupNavLinks() {
    const navLinks = document.querySelectorAll('[data-section]');
    console.log(`Found ${navLinks.length} navigation links`);
    
    navLinks.forEach(link => {
        // Remove existing listeners to prevent duplicates
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
        
        newLink.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionName = this.getAttribute('data-section');
            console.log(`Navigation: switching to section ${sectionName}`);
            
            showSection(sectionName);
            
            // Update active link styling
            document.querySelectorAll('[data-section]').forEach(navLink => {
                navLink.classList.remove('border-b-2', 'border-main', 'dark:border-maindark', 'text-gray-900', 'dark:text-white');
                navLink.classList.add('text-gray-500', 'dark:text-gray-400');
            });
            this.classList.remove('text-gray-500', 'dark:text-gray-400');
            this.classList.add('border-b-2', 'border-main', 'dark:border-maindark', 'text-gray-900', 'dark:text-white');
            
            // Update current section name for mobile display
            if (currentSectionName) {
                currentSectionName.textContent = this.textContent.trim();
            }
        });
    });
}

// Function to show the selected section and hide others
function showSection(sectionName) {
    console.log(`Showing section: ${sectionName}`);
    currentSection = sectionName;
    
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show the selected section
    const selectedSection = document.getElementById(`${sectionName}Section`);
    if (selectedSection) {
        selectedSection.classList.remove('hidden');
        console.log(`Section ${sectionName} is now visible`);
        
        // Load content based on section with delay for DOM readiness
        setTimeout(() => {
            if (!isAdmin) {
                console.warn('User is not admin, skipping data load');
                return;
            }
            
            switch(sectionName) {
                case 'enrollment':
                    console.log('Loading enrollment requests...');
                    loadEnrollmentRequests();
                    break;
                case 'course':
                    console.log('Loading courses...');
                    loadCourses();
                    break;
                case 'users':
                    console.log('Loading users...');
                    loadApprovedUsers();
                    initializeUserSearch(); // Initialize search when users section is shown
                    break;
                case 'events':
                    console.log('Loading events...');
                    loadEvents();
                    break;
                case 'eventRegistrations':
                    console.log('Loading event registrations...');
                    loadEventRegistrations();
                    break;
                default:
                    console.warn(`Unknown section: ${sectionName}`);
            }
        }, 200);
    } else {
        console.error(`Section element '${sectionName}Section' not found`);
    }
}

// Mobile menu handlers
function setupMobileMenus() {
    // Main mobile menu
    const burgerBtn = document.getElementById("burger");
    const phoneNav = document.getElementById("phone-nav");
    const closeBtn = document.getElementById("close");

    if (burgerBtn && phoneNav) {
        burgerBtn.addEventListener("click", function () {
            phoneNav.classList.remove("hidden");
        });
    }

    if (closeBtn && phoneNav) {
        closeBtn.addEventListener("click", function () {
            phoneNav.classList.add("hidden");
        });
    }

    // User menu toggle
    if (userMenuButton && dropdownMenu) {
        userMenuButton.addEventListener('click', () => {
            dropdownMenu.classList.toggle('hidden');
        });
    }

    // Mini-navbar toggle for mobile
    if (miniNavToggle && miniNavMenu) {
        miniNavToggle.addEventListener('click', () => {
            miniNavMenu.classList.toggle('hidden');
        });
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', (event) => {
        // Main user dropdown
        if (userMenuButton && dropdownMenu && 
            !userMenuButton.contains(event.target) && 
            !dropdownMenu.contains(event.target)) {
            dropdownMenu.classList.add('hidden');
        }
        
        // Mini-navbar dropdown on mobile
        if (miniNavToggle && miniNavMenu && 
            !miniNavToggle.contains(event.target) && 
            !miniNavMenu.contains(event.target)) {
            miniNavMenu.classList.add('hidden');
        }
    });
}

// Check if user is logged in and has admin role
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log("User is signed in:", user.email);
        
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists && userDoc.data().role === 'admin') {
                console.log("User has admin role");
                isAdmin = true;
                if (userEmailDisplay) {
                    userEmailDisplay.textContent = user.displayName || user.email;
                }
                
                initializeAdmin();
            } else {
                console.log("User is not an admin");
                showAlert('Nu aveți permisiuni de administrator.', 'error');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
            showAlert('Eroare la verificarea statutului de administrator.', 'error');
        }
    } else {
        console.log("User is not signed in, redirecting to login");
        window.location.href = 'login.html';
    }
});

// Initialize admin functionality once authenticated
function initializeAdmin() {
    console.log("Initializing admin functionality");
    
    // Cache the event registrations table body since it exists in HTML
    eventRegistrationsTableBody = document.getElementById('eventRegistrationsTableBody');
    console.log("Event registrations table body cached:", !!eventRegistrationsTableBody);
    
    // Setup mobile menus
    setupMobileMenus();
    
    // Show default section after a short delay
    setTimeout(() => {
        const courseLink = document.querySelector('[data-section="course"]');
        if (courseLink) {
            courseLink.click();
        } else {
            showSection('course');
        }
    }, 300);
    
    // Add event listeners for admin actions
    setupEventListeners();
}

// Setup all event listeners
function setupEventListeners() {
    if (addCourseBtn) addCourseBtn.addEventListener('click', showAddCourseModal);
    if (addEventBtn) addEventBtn.addEventListener('click', showAddEventModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', hideModal);
    if (cancelBtn) cancelBtn.addEventListener('click', hideModal);
    if (courseForm) courseForm.addEventListener('submit', handleCourseFormSubmit);
    if (eventForm) eventForm.addEventListener('submit', handleEventFormSubmit);
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', hideDeleteModal);
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            if (currentSection === 'events') {
                deleteEvent();
            } else {
                deleteCourse();
            }
        });
    }
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (logoutBtnMobile) logoutBtnMobile.addEventListener('click', handleLogout);
}

// ========== EVENT REGISTRATIONS SECTION ==========

// Load event registrations from Firestore
function loadEventRegistrations() {
    console.log("=== Starting loadEventRegistrations ===");
    console.log("Current user admin status:", isAdmin);
    console.log("Current user:", auth.currentUser?.email);
    
    if (!isAdmin) {
        console.warn('User is not admin, cannot load event registrations');
        showAlert('Nu aveți permisiuni de administrator.', 'error');
        return;
    }
    
    // Ensure we have the table body element
    if (!eventRegistrationsTableBody) {
        eventRegistrationsTableBody = document.getElementById('eventRegistrationsTableBody');
    }
    
    if (!eventRegistrationsTableBody) {
        console.error('Event registrations table body not found!');
        showAlert('Tabelul pentru înregistrări evenimente nu a fost găsit.', 'error');
        return;
    }
    
    console.log("Event registrations table body found:", eventRegistrationsTableBody);
    showLoading();
    
    // Check if the collection exists and has data
    db.collection('eventRegistrations').get()
        .then(snapshot => {
            console.log(`Found ${snapshot.size} total event registrations`);
            
            if (snapshot.empty) {
                hideLoading();
                showAlert('Nu există deloc înregistrări la evenimente în baza de date.', 'info');
                eventRegistrationsTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                            Nu există înregistrări la evenimente în baza de date<br>
                            <small class="text-xs">Folosiți funcția window.addTestEventRegistration() pentru a adăuga date de test</small>
                        </td>
                    </tr>
                `;
                return;
            }
            
            // Log all documents for debugging
            let pendingCount = 0;
            let otherStatuses = {};
            
            console.log("=== ALL EVENT REGISTRATIONS ===");
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(`Document ${doc.id}:`, data);
                
                if (data.status === 'pending') {
                    pendingCount++;
                } else {
                    const status = data.status || 'no_status';
                    otherStatuses[status] = (otherStatuses[status] || 0) + 1;
                }
            });
            
            console.log(`Pending registrations: ${pendingCount}`);
            console.log('Other statuses:', otherStatuses);
            
            // Clear table
            eventRegistrationsTableBody.innerHTML = '';
            
            if (pendingCount === 0) {
                hideLoading();
                const statusList = Object.keys(otherStatuses).join(', ');
                showAlert(`Nu există cereri în așteptare. Status-uri existente: ${statusList || 'none'}`, 'info');
                eventRegistrationsTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                            Nu există cereri de înregistrare în așteptare<br>
                        </td>
                    </tr>
                `;
                return;
            }
            
            // Add pending registrations to table
            let addedCount = 0;
            snapshot.forEach(doc => {
                const registration = doc.data();
                if (registration.status === 'pending') {
                    registration.id = doc.id;
                    console.log('Adding pending event registration:', registration.id, registration);
                    appendEventRegistrationRow(registration);
                    addedCount++;
                }
            });
            
            hideLoading();
            console.log(`Successfully added ${addedCount} event registrations to table`);
            showAlert(`Găsite ${addedCount} cereri în așteptare`, 'success');
        })
        .catch(error => {
            hideLoading();
            console.error('Error fetching event registrations:', error);
            
            // Provide more specific error messages
            if (error.code === 'permission-denied') {
                showAlert('Nu aveți permisiuni pentru a accesa înregistrările la evenimente. Verificați regulile Firestore.', 'error');
            } else if (error.code === 'unavailable') {
                showAlert('Serviciul Firebase este temporar indisponibil. Încercați din nou.', 'error');
            } else if (error.code === 'failed-precondition') {
                showAlert('Indexul Firestore nu este disponibil. Verificați consola Firebase.', 'error');
            } else {
                showAlert(`Eroare la încărcarea cererilor: ${error.message}`, 'error');
            }
            
            // Show error details in table
            eventRegistrationsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-4 text-center text-red-500 dark:text-red-400">
                        Eroare la încărcarea datelor: ${error.message}<br>
                        <small class="text-xs">Cod eroare: ${error.code}</small><br>
                        <small class="text-xs">Verificați permisiunile Firestore și regulile de securitate</small>
                    </td>
                </tr>
            `;
        });
}
// ========== USERS SECTION - COMPLETE ==========

function loadApprovedUsers() {
    if (!isAdmin) return;
    
    console.log("Loading approved users");
    showLoading();
    
    db.collection('enrollments')
        .where('status', '==', 'approved')
        .get()
        .then(snapshot => {
            hideLoading();
            
            console.log(`Found ${snapshot.size} approved users`);
            
            const usersTableBody = document.getElementById('usersTableBody');
            if (usersTableBody) {
                usersTableBody.innerHTML = '';
                
                if (snapshot.empty) {
                    usersTableBody.innerHTML = `
                        <tr>
                            <td colspan="8" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                Nu există utilizatori aprobați.
                            </td>
                        </tr>
                    `;
                    return;
                }
                
                snapshot.forEach(doc => {
                    const userData = doc.data();
                    userData.id = doc.id;
                    appendUserCard(userData, usersTableBody);
                });
            }
        })
        .catch(error => {
            hideLoading();
            showAlert(`Eroare la încărcarea utilizatorilor: ${error.message}`, 'error');
            console.error('Error fetching users:', error);
        });
}

function appendUserCard(userData, container) {
    if (!container) return;
    
    console.log("Adding user row for:", userData.userName);
    
    const formattedDate = userData.enrollmentDate ? 
        new Date(userData.enrollmentDate.seconds * 1000).toLocaleDateString('ro-RO') : 
        'N/A';
    
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
    
    row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${userData.userName || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${userData.email || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${userData.phone || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${userData.courseName || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${formattedDate}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${userData.occupation || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                Aprobat
            </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <div class="flex space-x-3">
                <button class="text-main hover:text-maindark view-user" data-id="${userData.id}" title="Vezi detalii">
                    <i class="ph ph-eye"></i>
                </button>
                <button class="text-red-600 hover:text-red-900 remove-user" data-id="${userData.id}" title="Șterge">
                    <i class="ph-bold ph-x"></i>
                </button>
            </div>
        </td>
    `;
    
    container.appendChild(row);
    
    // Add event listeners to buttons
    const viewBtn = row.querySelector('.view-user');
    const removeBtn = row.querySelector('.remove-user');
    
    if (viewBtn) {
        viewBtn.addEventListener('click', () => viewUserDetails(userData.id));
    }
    if (removeBtn) {
        removeBtn.addEventListener('click', () => confirmRemoveUser(userData.id));
    }
}

function viewUserDetails(userId) {
    console.log(`Viewing details for user: ${userId}`);
    
    showLoading();
    
    db.collection('enrollments').doc(userId).get()
        .then(doc => {
            hideLoading();
            
            if (!doc.exists) {
                showAlert('Utilizatorul nu a fost găsit.', 'error');
                return;
            }
            
            const userData = doc.data();
            
            // Get references to modal elements
            const userDetailsModal = document.getElementById('userDetailsModal');
            const userModalTitle = document.getElementById('userModalTitle');
            const userModalContent = document.getElementById('userModalContent');
            
            if (!userDetailsModal || !userModalTitle || !userModalContent) {
                showAlert('Modalul pentru detalii utilizator nu a fost găsit.', 'error');
                return;
            }
            
            // Set modal title
            userModalTitle.textContent = `Detalii pentru ${userData.userName || 'Cursant'}`;
            
            // Format enrollment date if it exists
            const enrollmentDate = userData.enrollmentDate ? 
                new Date(userData.enrollmentDate.seconds * 1000).toLocaleDateString('ro-RO') : 
                'Nedisponibil';
            
            // Format birth date if it exists
            const birthDate = userData.birthDate ? 
                new Date(userData.birthDate).toLocaleDateString('ro-RO') : 
                'Nedisponibil';
            
            // Populate modal with user details
            userModalContent.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Personal Information -->
                    <div class="space-y-4">
                        <div>
                            <h4 class="text-lg font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 mb-3">
                                <i class="ph ph-user-circle mr-2"></i>Informații Personale
                            </h4>
                            
                            <div class="space-y-3">
                                <div>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">Nume Complet</p>
                                    <p class="font-medium text-gray-900 dark:text-white">${userData.userName || 'Nedisponibil'}</p>
                                </div>
                                
                                <div>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">Email</p>
                                    <p class="font-medium text-gray-900 dark:text-white break-words">${userData.email || 'Nedisponibil'}</p>
                                </div>
                                
                                <div>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">Telefon</p>
                                    <p class="font-medium text-gray-900 dark:text-white">${userData.phone || 'Nedisponibil'}</p>
                                </div>
                                
                                <div>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">Data nașterii</p>
                                    <p class="font-medium text-gray-900 dark:text-white">${birthDate}</p>
                                </div>
                                
                                <div>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">Ocupație</p>
                                    <p class="font-medium text-gray-900 dark:text-white">${userData.occupation || 'Nedisponibil'}</p>
                                </div>
                                
                                <div>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">Studii</p>
                                    <p class="font-medium text-gray-900 dark:text-white">${userData.education || 'Nedisponibil'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Enrollment Information -->
                    <div class="space-y-4">
                        <div>
                            <h4 class="text-lg font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 mb-3">
                                <i class="ph ph-graduation-cap mr-2"></i>Informații Înscriere
                            </h4>
                            
                            <div class="space-y-3">
                                <div>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">Curs</p>
                                    <p class="font-medium text-gray-900 dark:text-white">${userData.courseName || 'Nedisponibil'}</p>
                                </div>
                                
                                <div>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">Data Înscrierii</p>
                                    <p class="font-medium text-gray-900 dark:text-white">${enrollmentDate}</p>
                                </div>
                                
                                <div>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">Status</p>
                                    <p class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                                        <i class="ph-bold ph-check mr-1"></i> Aprobat
                                    </p>
                                </div>
                                
                                <div>
                                    <p class="text-sm text-gray-500 dark:text-gray-400">ID Înscriere</p>
                                    <p class="font-medium text-gray-900 dark:text-white break-all">${userId}</p>
                                </div>
                            </div>
                        </div>
                        
                        ${userData.notes ? `
                        <div>
                            <h4 class="text-lg font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 mb-3">
                                <i class="ph ph-note-pencil mr-2"></i>Note
                            </h4>
                            <p class="text-gray-700 dark:text-gray-300">${userData.notes}</p>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 class="text-lg font-medium text-gray-900 dark:text-white mb-3">
                        <i class="ph ph-activity mr-2"></i>Acțiuni
                    </h4>
                    <div class="flex flex-col sm:flex-row gap-3">
                        <button id="emailUserBtn" class="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-main dark:bg-maindark text-white rounded-md hover:bg-blue-600 dark:hover:bg-blue-700">
                            <i class="ph ph-envelope mr-2"></i> Trimite Email
                        </button>
                        <button id="downloadUserDataBtn" class="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600">
                            <i class="ph ph-download mr-2"></i> Descarcă Date
                        </button>
                    </div>
                </div>
            `;
            
            // Add class to make modal display better on mobile
            userDetailsModal.classList.add('overflow-y-auto');
            userDetailsModal.classList.remove('hidden');
            
            // Add event listeners to close buttons
            const closeUserModalBtn = document.getElementById('closeUserModalBtn');
            const closeUserDetailsBtn = document.getElementById('closeUserDetailsBtn');
            
            if (closeUserModalBtn) {
                closeUserModalBtn.addEventListener('click', closeUserModal);
            }
            
            if (closeUserDetailsBtn) {
                closeUserDetailsBtn.addEventListener('click', closeUserModal);
            }
            
            // Add click event for email button
            const emailUserBtn = document.getElementById('emailUserBtn');
            if (emailUserBtn) {
                emailUserBtn.addEventListener('click', () => {
                    const mailtoLink = `mailto:${userData.email}?subject=CMIEA - Informații Curs&body=Bună ziua ${userData.userName},%0D%0A%0D%0AVă mulțumim pentru înscrierea la cursul "${userData.courseName}".%0D%0A%0D%0ACu stimă,%0D%0AEchipa CMIEA`;
                    window.open(mailtoLink);
                });
            }
            
            // Add click event for download button
            const downloadUserDataBtn = document.getElementById('downloadUserDataBtn');
            if (downloadUserDataBtn) {
                downloadUserDataBtn.addEventListener('click', () => {
                    // Create a JSON blob
                    const dataStr = JSON.stringify(userData, null, 2);
                    const blob = new Blob([dataStr], {type: 'application/json'});
                    const url = URL.createObjectURL(blob);
                    
                    // Create download link
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `user_${userId}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                });
            }
            
            // Click outside to close
            userDetailsModal.addEventListener('click', (e) => {
                if (e.target === userDetailsModal) {
                    closeUserModal();
                }
            });
        })
        .catch(error => {
            hideLoading();
            showAlert(`Eroare la încărcarea detaliilor utilizatorului: ${error.message}`, 'error');
            console.error('Error fetching user details:', error);
        });
}

function closeUserModal() {
    const userDetailsModal = document.getElementById('userDetailsModal');
    if (userDetailsModal) {
        userDetailsModal.classList.add('hidden');
    }
}

function confirmRemoveUser(userId) {
    console.log(`Confirming removal of user: ${userId}`);
    
    // Create a more user-friendly confirmation dialog
    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    confirmDialog.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md mx-3">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Confirmare ștergere</h3>
            <p class="text-gray-700 dark:text-gray-300 mb-6">
                Sunteți sigur că doriți să ștergeți acest utilizator? Această acțiune nu poate fi anulată.
            </p>
            <div class="flex justify-end gap-3">
                <button id="cancelDeleteUserBtn" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600">
                    Anulează
                </button>
                <button id="confirmDeleteUserBtn" class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
                    Șterge
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(confirmDialog);
    
    // Handle confirmation dialog buttons
    const cancelBtn = document.getElementById('cancelDeleteUserBtn');
    const confirmBtn = document.getElementById('confirmDeleteUserBtn');
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(confirmDialog);
        });
    }
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            document.body.removeChild(confirmDialog);
            removeUser(userId);
        });
    }
}

function removeUser(userId) {
    console.log(`Removing user: ${userId}`);
    showLoading();
    
    db.collection('enrollments').doc(userId).delete()
        .then(() => {
            hideLoading();
            showAlert('Utilizatorul a fost șters cu succes!', 'success');
            loadApprovedUsers();
        })
        .catch(error => {
            hideLoading();
            showAlert(`Eroare la ștergerea utilizatorului: ${error.message}`, 'error');
            console.error('Error removing user:', error);
        });
}

// Add an event registration row to the table
function appendEventRegistrationRow(registration) {
    console.log("Adding event registration row for ID:", registration.id);
    
    if (!eventRegistrationsTableBody) {
        console.error('Event registrations table body not available');
        return;
    }
    
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
    
    // Format date if it exists
    let formattedDate = 'N/A';
    try {
        if (registration.registrationDate) {
            if (registration.registrationDate.seconds) {
                // Firestore timestamp
                formattedDate = new Date(registration.registrationDate.seconds * 1000).toLocaleDateString('ro-RO');
            } else if (registration.registrationDate instanceof Date) {
                // JavaScript Date
                formattedDate = registration.registrationDate.toLocaleDateString('ro-RO');
            } else if (typeof registration.registrationDate === 'string') {
                // String date
                formattedDate = new Date(registration.registrationDate).toLocaleDateString('ro-RO');
            }
        }
    } catch (dateError) {
        console.warn('Error formatting date for registration:', registration.id, dateError);
        formattedDate = 'Data invalidă';
    }
    
    row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${registration.userName || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${registration.email || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${registration.eventTitle || registration.eventName || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${formattedDate}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                În așteptare
            </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <div class="flex space-x-3">
                <button class="text-green-600 hover:text-green-900 approve-registration-btn" data-id="${registration.id}" title="Aprobă cererea">
                    <i class="ph-bold ph-check"></i>
                </button>
                <button class="text-red-600 hover:text-red-900 reject-registration-btn" data-id="${registration.id}" title="Respinge cererea">
                    <i class="ph-bold ph-x"></i>
                </button>
            </div>
        </td>
    `;
    
    eventRegistrationsTableBody.appendChild(row);
    
    // Add event listeners to the approve and reject buttons
    const approveBtn = row.querySelector('.approve-registration-btn');
    const rejectBtn = row.querySelector('.reject-registration-btn');
    
    if (approveBtn) {
        approveBtn.addEventListener('click', () => updateEventRegistrationStatus(registration.id, 'approved'));
    }
    if (rejectBtn) {
        rejectBtn.addEventListener('click', () => updateEventRegistrationStatus(registration.id, 'rejected'));
    }
}

// Update event registration status in Firestore
function updateEventRegistrationStatus(registrationId, status) {
    if (!isAdmin) {
        showAlert('Nu aveți permisiuni pentru această acțiune.', 'error');
        return;
    }
    
    if (!registrationId || !status) {
        showAlert('Date incomplete pentru actualizarea cererii.', 'error');
        return;
    }
    
    console.log(`Updating event registration ${registrationId} to status: ${status}`);
    showLoading();
    
    db.collection('eventRegistrations').doc(registrationId).update({
        status: status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: auth.currentUser?.uid || 'unknown'
    })
    .then(() => {
        hideLoading();
        const actionText = status === 'approved' ? 'aprobată' : 'respinsă';
        showAlert(`Cererea a fost ${actionText} cu succes!`, 'success');
        
        // Reload the event registrations to show updated data
        setTimeout(() => {
            loadEventRegistrations();
        }, 1000);
    })
    .catch(error => {
        hideLoading();
        console.error('Error updating event registration:', error);
        
        if (error.code === 'permission-denied') {
            showAlert('Nu aveți permisiuni pentru a modifica această cerere.', 'error');
        } else if (error.code === 'not-found') {
            showAlert('Cererea nu a fost găsită.', 'error');
        } else {
            showAlert(`Eroare la actualizarea cererii: ${error.message}`, 'error');
        }
    });
}

// ========== ENROLLMENT REQUESTS SECTION ==========

function loadEnrollmentRequests() {
    if (!isAdmin) return;
    
    console.log("Loading enrollment requests");
    showLoading();
    
    db.collection('enrollments')
        .where('status', '==', 'pending')
        .get()
        .then(snapshot => {
            hideLoading();
            
            console.log(`Found ${snapshot.size} pending enrollment requests`);
            
            if (enrollmentTableBody) {
                enrollmentTableBody.innerHTML = '';
                
                if (snapshot.empty) {
                    showAlert('Nu există cereri de înscriere în așteptare.', 'info');
                    enrollmentTableBody.innerHTML = `
                        <tr>
                            <td colspan="8" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                Nu există cereri de înscriere
                            </td>
                        </tr>
                    `;
                    return;
                }
                
                snapshot.forEach(doc => {
                    const enrollment = doc.data();
                    enrollment.id = doc.id;
                    appendEnrollmentRow(enrollment);
                });
            }
        })
        .catch(error => {
            hideLoading();
            showAlert(`Eroare la încărcarea cererilor: ${error.message}`, 'error');
            console.error('Error fetching enrollments:', error);
        });
}

function appendEnrollmentRow(enrollment) {
    if (!enrollmentTableBody) return;
    
    console.log("Adding enrollment row for ID:", enrollment.id);
    
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
    
    const formattedDate = enrollment.enrollmentDate ? 
        new Date(enrollment.enrollmentDate.seconds * 1000).toLocaleDateString('ro-RO') : 
        'N/A';
    
    row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${enrollment.userName || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${enrollment.email || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${enrollment.phone || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${enrollment.courseName || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${formattedDate}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${enrollment.occupation || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                În așteptare
            </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <div class="flex space-x-3">
                <button class="text-green-600 hover:text-green-900 approve-btn" data-id="${enrollment.id}">
                    <i class="ph-bold ph-check"></i>
                </button>
                <button class="text-red-600 hover:text-red-900 reject-btn" data-id="${enrollment.id}">
                    <i class="ph-bold ph-x"></i>
                </button>
            </div>
        </td>
    `;
    
    enrollmentTableBody.appendChild(row);
    
    // Add event listeners
    const approveBtn = row.querySelector('.approve-btn');
    const rejectBtn = row.querySelector('.reject-btn');
    
    if (approveBtn) {
        approveBtn.addEventListener('click', () => updateEnrollmentStatus(enrollment.id, 'approved'));
    }
    if (rejectBtn) {
        rejectBtn.addEventListener('click', () => updateEnrollmentStatus(enrollment.id, 'rejected'));
    }
}

function updateEnrollmentStatus(enrollmentId, status) {
    if (!isAdmin) {
        showAlert('Nu aveți permisiuni pentru această acțiune.', 'error');
        return;
    }
    
    console.log(`Updating enrollment ${enrollmentId} to status: ${status}`);
    showLoading();
    
    db.collection('enrollments').doc(enrollmentId).update({
        status: status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        hideLoading();
        showAlert(`Cererea a fost ${status === 'approved' ? 'aprobată' : 'respinsă'} cu succes!`, 'success');
        loadEnrollmentRequests();
        
        if (status === 'approved') {
            loadApprovedUsers();
        }
    })
    .catch(error => {
        hideLoading();
        showAlert(`Eroare la actualizarea cererii: ${error.message}`, 'error');
        console.error('Error updating enrollment:', error);
    });
}

// ========== COURSES SECTION ==========

function loadCourses() {
    if (!isAdmin) return;
    
    console.log("Loading courses");
    showLoading();
    
    db.collection('courses').get()
        .then(snapshot => {
            hideLoading();
            
            if (coursesTableBody) {
                coursesTableBody.innerHTML = '';
                
                console.log(`Found ${snapshot.size} courses`);
                
                if (snapshot.empty) {
                    showAlert('Nu există cursuri. Adaugă unul nou!', 'info');
                    coursesTableBody.innerHTML = `
                        <tr>
                            <td colspan="7" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                Nu există cursuri
                            </td>
                        </tr>
                    `;
                    return;
                }
                
                snapshot.forEach(doc => {
                    const course = doc.data();
                    course.id = doc.id;
                    appendCourseRow(course);
                });
            }
        })
        .catch(error => {
            hideLoading();
            showAlert(`Eroare la încărcarea cursurilor: ${error.message}`, 'error');
            console.error('Error fetching courses:', error);
        });
}

function appendCourseRow(course) {
    if (course.deleted || !coursesTableBody) return;
    
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
    
    row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
            <img src="${course.image || ''}" alt="${course.name || 'Curs'}" class="h-10 w-10 object-cover rounded-full">
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${course.name || ''}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${course.categorie || ''}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${course.perioada || ''}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${course.locuri || ''}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <div class="flex space-x-3">
                <button class="text-main dark:text-maindark hover:text-indigo-900 edit-btn" data-id="${course.id}" title="Editează">
                    <i class="ph-fill ph-pencil-simple text-main dark:text-maindark"></i>
                </button>
                <button class="text-red-600 hover:text-red-900 delete-btn" data-id="${course.id}" title="Șterge">
                    <i class="ph-fill ph-trash"></i>
                </button>
            </div>
        </td>
    `;
    
    coursesTableBody.appendChild(row);
    
    // Add event listeners
    const editBtn = row.querySelector('.edit-btn');
    const deleteBtn = row.querySelector('.delete-btn');
    
    if (editBtn) {
        editBtn.addEventListener('click', () => showEditCourseModal(course.id));
    }
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => showDeleteConfirmation(course.id));
    }
}

function showAddCourseModal() {
    console.log("Showing add course modal");
    
    if (courseForm && courseModal) {
        courseForm.reset();
        
        if (idField) idField.classList.add('hidden');
        
        currentCourseId = null;
        
        if (modalTitle) modalTitle.textContent = 'Adaugă Curs Nou';
        
        // Reset zileSaptamana fields
        for (let i = 0; i < 7; i++) {
            const field = document.querySelector(`input[name="zileSaptamana[${i}]"]`);
            if (field) field.value = '';
        }
        
        courseModal.classList.remove('hidden');
    }
}

function showEditCourseModal(courseId) {
    if (!isAdmin) return;
    
    console.log(`Showing edit modal for course: ${courseId}`);
    showLoading();
    
    db.collection('courses').doc(courseId).get()
        .then(doc => {
            hideLoading();
            
            if (!doc.exists) {
                showAlert('Cursul nu a fost găsit!', 'error');
                return;
            }
            
            const course = doc.data();
            
            if (modalTitle) modalTitle.textContent = 'Editează Curs';
            if (idField) idField.classList.remove('hidden');
            
            const courseIdInput = document.getElementById('courseId');
            if (courseIdInput) courseIdInput.value = courseId;
            
            currentCourseId = courseId;
            
            fillFormWithCourseData(course);
            
            if (courseModal) courseModal.classList.remove('hidden');
        })
        .catch(error => {
            hideLoading();
            showAlert(`Eroare la încărcarea datelor cursului: ${error.message}`, 'error');
            console.error('Error fetching course:', error);
        });
}

function fillFormWithCourseData(course) {
    const fields = [
        { id: 'courseName', value: course.name || '' },
        { id: 'courseImage', value: course.image || '' },
        { id: 'courseDescription', value: course.description || '' },
        { id: 'courseHours', value: course.ore || '' },
        { id: 'courseCategory', value: course.categorie || 'Începător' },
        { id: 'coursePeriod', value: course.perioada || '' },
        { id: 'courseSeats', value: course.locuri || '' },
        { id: 'courseLanguage', value: course.limba || 'Română' },
        { id: 'courseDuration', value: course.durata || '1 Lună' },
        { id: 'courseEmoji', value: course.emoji || '' },
        { id: 'courseLearn1Title', value: course.titluInveti1 || '' },
        { id: 'courseLearn1', value: course.inveti1 || '' },
        { id: 'courseLearn2Title', value: course.titluInveti2 || '' },
        { id: 'courseLearn2', value: course.inveti2 || '' },
        { id: 'courseLearn3Title', value: course.titluInveti3 || '' },
        { id: 'courseLearn3', value: course.inveti3 || '' }
    ];
    
    fields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) element.value = field.value;
    });
    
    // Fill zileSaptamana fields
    if (course.zileSaptamana && Array.isArray(course.zileSaptamana)) {
        for (let i = 0; i < 7; i++) {
            const dayInput = document.querySelector(`input[name="zileSaptamana[${i}]"]`);
            if (dayInput) dayInput.value = course.zileSaptamana[i] || '';
        }
    }
}

function handleCourseFormSubmit(event) {
    event.preventDefault();
    
    if (!isAdmin) {
        showAlert('Nu aveți permisiuni pentru această acțiune.', 'error');
        return;
    }
    
    console.log("Handling course form submission");
    
    const formData = new FormData(courseForm);
    const courseData = {};
    
    // Process form fields
    for (let [key, value] of formData.entries()) {
        if (!key.includes('zileSaptamana')) {
            if (key === 'ore' || key === 'locuri') {
                courseData[key] = parseInt(value) || 0;
            } else {
                courseData[key] = value;
            }
        }
    }
    
    // Process zileSaptamana array
    courseData.zileSaptamana = [];
    for (let i = 0; i < 7; i++) {
        const dayValue = formData.get(`zileSaptamana[${i}]`) || '';
        courseData.zileSaptamana.push(dayValue);
    }
    
    delete courseData.id;
    courseData.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
    
    showLoading();
    
    const promise = currentCourseId ? 
        db.collection('courses').doc(currentCourseId).update(courseData) :
        db.collection('courses').add(courseData);
    
    promise
        .then(() => {
            hideLoading();
            hideModal();
            showAlert(`Cursul a fost ${currentCourseId ? 'actualizat' : 'adăugat'} cu succes!`, 'success');
            loadCourses();
        })
        .catch(error => {
            hideLoading();
            showAlert(`Eroare la ${currentCourseId ? 'actualizarea' : 'adăugarea'} cursului: ${error.message}`, 'error');
            console.error('Error saving course:', error);
        });
}

function showDeleteConfirmation(courseId) {
    if (!isAdmin) return;
    
    console.log(`Showing delete confirmation for course: ${courseId}`);
    currentCourseId = courseId;
    if (deleteModal) deleteModal.classList.remove('hidden');
}

function deleteCourse() {
    if (!currentCourseId) {
        showAlert('ID-ul cursului lipsește', 'error');
        return;
    }
    
    console.log(`Deleting course: ${currentCourseId}`);
    showLoading();
    hideDeleteModal();
    
    db.collection('courses').doc(currentCourseId).delete()
        .then(() => {
            console.log("Course deleted successfully");
            hideLoading();
            showAlert('Cursul a fost șters cu succes!', 'success');
            setTimeout(() => loadCourses(), 500);
        })
        .catch(error => {
            console.error("Error deleting course:", error);
            hideLoading();
            
            if (error.code === "permission-denied") {
                showAlert('Se încearcă o metodă alternativă de ștergere...', 'info');
                
                db.collection('courses').doc(currentCourseId).update({
                    deleted: true,
                    deletedAt: firebase.firestore.FieldValue.serverTimestamp()
                })
                .then(() => {
                    showAlert('Cursul a fost marcat ca șters!', 'success');
                    loadCourses();
                })
                .catch(updateError => {
                    showAlert(`Nu s-a putut șterge cursul: ${updateError.message}`, 'error');
                });
            } else {
                showAlert(`Eroare la ștergerea cursului: ${error.message}`, 'error');
            }
        });
}

// ========== EVENTS SECTION - COMPLETE ==========

function loadEvents() {
    if (!isAdmin) return;
    
    console.log("Loading events");
    showLoading();
    
    // Update events section HTML if it's the placeholder
    updateEventsSection();
    
    db.collection('events').orderBy('startDate', 'desc').get()
        .then(snapshot => {
            hideLoading();
            const eventsTableBodyElement = document.getElementById('eventsTableBody');
            if (eventsTableBodyElement) {
                eventsTableBodyElement.innerHTML = '';
            }
            
            console.log(`Found ${snapshot.size} events`);
            
            if (snapshot.empty) {
                showAlert('Nu există evenimente. Adaugă unul nou!', 'info');
                if (eventsTableBodyElement) {
                    eventsTableBodyElement.innerHTML = `
                        <tr>
                            <td colspan="8" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                Nu există evenimente
                            </td>
                        </tr>
                    `;
                }
                return;
            }
            
            snapshot.forEach(doc => {
                const event = doc.data();
                event.id = doc.id;
                appendEventRow(event);
            });
        })
        .catch(error => {
            hideLoading();
            showAlert(`Eroare la încărcarea evenimentelor: ${error.message}`, 'error');
            console.error('Error fetching events:', error);
        });
}

function updateEventsSection() {
    const eventsSection = document.getElementById('eventsSection');
    if (eventsSection && !document.getElementById('eventsTableBody')) {
        eventsSection.innerHTML = `
            <div class="flex flex-col items-start lg:flex-row gap-4 lg:gap-0 justify-between items-center mb-6">
                <h1 class="text-2xl font-bold text-gray-800 dark:text-white">Admin Panel - Gestionare Evenimente</h1>
                <button id="addEventBtn" class="bg-main hover:bg-maindark dark:bg-maindark text-white px-4 py-2 rounded-lg flex items-center">
                    <i class="ph ph-plus mr-2"></i> Adaugă Eveniment Nou
                </button>
            </div>

            <!-- Events Table -->
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead class="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Titlu</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Categorie</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Data Start</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Facilitator</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody id="eventsTableBody" class="bg-white dark:bg-dark2 divide-y divide-gray-200 dark:divide-gray-700">
                        <!-- Event rows will be added here -->
                    </tbody>
                </table>
            </div>
        `;
        
        // Re-add event listener for the new button
        const newAddEventBtn = document.getElementById('addEventBtn');
        if (newAddEventBtn) {
            newAddEventBtn.addEventListener('click', showAddEventModal);
        }
    }
}

function appendEventRow(event) {
    if (event.deleted) return;
    
    const eventsTableBodyElement = document.getElementById('eventsTableBody');
    if (!eventsTableBodyElement) return;
    
    const row = document.createElement('tr');
    if (event.featured) {
        row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700 bg-yellow-50 dark:bg-yellow-900/20';
    } else {
        row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
    }
    
    const startDate = event.startDate ? new Date(event.startDate).toLocaleDateString('ro-RO') : 'N/A';
    const status = getEventStatus(event.startDate, event.endDate);
    const statusBadge = getEventStatusBadge(status);
    
    row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white ${event.featured ? 'font-semibold' : ''}">${event.title || ''}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${event.category || ''}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${startDate}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${event.facilitator || 'Echipa CMIEA'}</td>
        <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <div class="flex space-x-3">
                <button class="text-yellow-600 hover:text-yellow-900 toggle-featured-btn" 
                        data-id="${event.id}" 
                        title="${event.featured ? 'Elimină din Featured' : 'Marchează ca Featured'}">
                    <i class="${event.featured ? 'ph-fill ph-star' : 'ph ph-star'}"></i>
                </button>
                <button class="text-main dark:text-maindark hover:text-indigo-900 edit-event-btn" data-id="${event.id}" title="Editează">
                    <i class="ph-fill ph-pencil-simple text-main dark:text-maindark"></i>
                </button>
                <button class="text-red-600 hover:text-red-900 delete-event-btn" data-id="${event.id}" title="Șterge">
                    <i class="ph-fill ph-trash"></i>
                </button>
            </div>
        </td>
    `;
    
    eventsTableBodyElement.appendChild(row);
    
    // Add event listeners
    const toggleBtn = row.querySelector('.toggle-featured-btn');
    const editBtn = row.querySelector('.edit-event-btn');
    const deleteBtn = row.querySelector('.delete-event-btn');
    
    if (toggleBtn) {
        toggleBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleEventFeatured(event.id, !event.featured);
        };
    }
    
    if (editBtn) {
        editBtn.onclick = function(e) {
            e.preventDefault();
            console.log(`Edit button clicked for event: ${event.id}`);
            showEditEventModal(event.id);
        };
    }
    
    if (deleteBtn) {
        deleteBtn.onclick = function(e) {
            e.preventDefault();
            console.log(`Delete button clicked for event: ${event.id}`);
            showDeleteEventConfirmation(event.id);
        };
    }
}

function getEventStatus(startDate, endDate) {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate || startDate);
    
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'ongoing';
    return 'past';
}

function getEventStatusBadge(status) {
    const badges = {
        upcoming: '<span class="h-fit w-fit rounded-full border border-main dark:border-maindark dark:bg-dark px-2 md:px-3 py-1 text-main dark:text-maindark text-xs md:text-sm mb-2">Viitor</span>',
        ongoing: '<span class="h-fit w-fit rounded-full border border-main dark:border-maindark dark:bg-dark px-2 md:px-3 py-1 text-main dark:text-maindark text-xs md:text-sm mb-2">În curs</span>',
        past: '<span class="h-fit w-fit rounded-full border border-main dark:border-maindark dark:bg-dark px-2 md:px-3 py-1 text-main dark:text-maindark text-xs md:text-sm mb-2">Trecut</span>'
    };
    return badges[status] || badges.upcoming;
}

function toggleEventFeatured(eventId, shouldBeFeatured) {
    if (!isAdmin) {
        showAlert('Nu aveți permisiuni pentru această acțiune.', 'error');
        return;
    }
    
    console.log(`Toggling featured status for event ${eventId} to: ${shouldBeFeatured}`);
    showLoading();
    
    const eventRef = db.collection('events').doc(eventId);
    
    db.runTransaction(async (transaction) => {
        const eventDoc = await transaction.get(eventRef);
        
        if (!eventDoc.exists) {
            throw new Error('Evenimentul nu există');
        }
        
        if (shouldBeFeatured) {
            const allEvents = await db.collection('events').where('featured', '==', true).get();
            
            allEvents.forEach((doc) => {
                if (doc.id !== eventId) {
                    transaction.update(doc.ref, { 
                        featured: false,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            });
            
            transaction.update(eventRef, { 
                featured: true,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            transaction.update(eventRef, {
                featured: false,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    })
    .then(() => {
        hideLoading();
        const action = shouldBeFeatured ? 'marcat ca featured' : 'îndepărtat din featured';
        showAlert(`Evenimentul a fost ${action}!`, 'success');
        loadEvents();
    })
    .catch(error => {
        hideLoading();
        showAlert(`Eroare la actualizarea evenimentului: ${error.message}`, 'error');
        console.error('Error toggling featured:', error);
    });
}

function initEventModal() {
    console.log("Initializing event modal");
    
    const modal = document.getElementById('eventModal');
    const closeBtn = document.getElementById('closeEventModalBtn');
    const cancelBtn = document.getElementById('cancelEventBtn');
    const form = document.getElementById('eventForm');
    
    if (!modal || !form) {
        console.error("Event modal or form not found in the DOM");
        return null;
    }
    
    const modalClone = modal.cloneNode(true);
    modal.parentNode.replaceChild(modalClone, modal);
    
    const newCloseBtn = modalClone.querySelector('#closeEventModalBtn');
    const newCancelBtn = modalClone.querySelector('#cancelEventBtn');
    const newForm = modalClone.querySelector('#eventForm');
    
    newCloseBtn.onclick = function() {
        console.log("Close button clicked");
        modalClone.classList.add('hidden');
    };
    
    newCancelBtn.onclick = function() {
        console.log("Cancel button clicked");
        modalClone.classList.add('hidden');
    };
    
    newForm.onsubmit = function(e) {
        e.preventDefault();
        console.log("Form submitted");
        handleEventFormSubmit(e);
    };
    
    modalClone.onclick = function(e) {
        if (e.target === modalClone) {
            console.log("Clicked outside modal");
            modalClone.classList.add('hidden');
        }
    };
    
    console.log("Event modal initialized with proper event handlers");
    
    return {
        modal: modalClone,
        form: newForm,
        titleElement: modalClone.querySelector('#eventModalTitle'),
        idField: modalClone.querySelector('#eventIdField'),
        idInput: modalClone.querySelector('#eventId')
    };
}

function hideEventModal() {
    const modal = document.getElementById('eventModal');
    if (modal) {
        modal.classList.add('hidden');
        console.log("Modal hidden successfully");
    } else {
        console.error("Could not find event modal to hide");
    }
}

function handleEventFormSubmit(event) {
    console.log("Event form submission handler called");
    event.preventDefault();
    
    if (!isAdmin) {
        console.log("User is not admin, cannot submit form");
        showAlert('Nu aveți permisiuni pentru această acțiune.', 'error');
        return;
    }
    
    console.log("Processing form data");
    
    const form = event.target;
    const formData = new FormData(form);
    const eventData = {};
    
    for (let [key, value] of formData.entries()) {
        if (key === 'startDate' || key === 'endDate') {
            eventData[key] = new Date(value);
        } else if (key === 'availableSpots') {
            eventData[key] = parseInt(value) || 0;
        } else {
            eventData[key] = value;
        }
    }
    
    // Add timestamps
    eventData.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
    
    if (!currentEventId) {
        eventData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    }
    
    console.log(`Saving event: ${currentEventId || 'new event'}`);
    showLoading();
    
    // Determine if we're adding or updating
    const promise = currentEventId ? 
        db.collection('events').doc(currentEventId).update(eventData) :
        db.collection('events').add(eventData);
    
    promise
        .then((result) => {
            hideLoading();
            
            // Get the ID of the saved event
            const savedEventId = currentEventId || (result && result.id);
            
            // Hide all event modals
            const modals = document.querySelectorAll('#eventModal');
            modals.forEach(modal => modal.classList.add('hidden'));
            
            // Show success message
            const action = currentEventId ? 'actualizat' : 'adăugat';
            showAlert(`Evenimentul a fost ${action} cu succes!`, 'success');
            
            // Reload events to update the UI
            console.log(`Event ${action}: ${savedEventId}`);
            loadEvents();
        })
        .catch(error => {
            hideLoading();
            console.error("Error submitting event:", error);
            showAlert(`Eroare la salvarea evenimentului: ${error.message}`, 'error');
        });
}

// Initialize DOM event listeners after page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log("Setting up event button handlers");
    
    // Add event listener for the add event button
    const addEventBtn = document.getElementById('addEventBtn');
    if (addEventBtn) {
        // Use direct assignment for reliability
        addEventBtn.onclick = function(e) {
            e.preventDefault();
            showAddEventModal();
        };
        console.log("Add event button handler attached");
    }
});

/**
 * Show the modal for editing an existing event
 */
function showEditEventModal(eventId) {
    if (!isAdmin) return;
    
    console.log(`Showing edit modal for event: ${eventId}`);
    showLoading();
    
    // Fetch the event data from Firestore
    db.collection('events').doc(eventId).get()
        .then(doc => {
            hideLoading();
            
            if (!doc.exists) {
                showAlert('Evenimentul nu a fost găsit!', 'error');
                return;
            }
            
            console.log(`Editing event: ${eventId}`);
            const event = doc.data();
            
            // Initialize modal with fresh event handlers
            const modal = initEventModal();
            if (!modal) {
                showAlert('Nu s-a putut inițializa formularul de editare!', 'error');
                return;
            }
            
            // Set edit mode properties
            modal.titleElement.textContent = 'Editează Eveniment';
            modal.idField.classList.remove('hidden');
            modal.idInput.value = eventId;
            
            // Store the current event ID for form submission
            currentEventId = eventId;
            
            // Fill the form with event data
            fillFormWithEventData(event, modal.form);
            
            // Show the modal
            modal.modal.classList.remove('hidden');
            console.log("Edit event modal displayed");
        })
        .catch(error => {
            hideLoading();
            showAlert(`Eroare la încărcarea datelor evenimentului: ${error.message}`, 'error');
            console.error('Error fetching event:', error);
        });
}

/**
 * Fill form with event data - can work with specific form reference
 */
function fillFormWithEventData(event, formElement = null) {
    const form = formElement || document.getElementById('eventForm');
    if (!form) {
        console.error("Form not found for filling with event data");
        return;
    }
    
    console.log("Filling form with event data", event.title);
    
    // Define all fields to fill
    const fields = [
        { name: 'title', selector: '#eventTitle', value: event.title || '' },
        { name: 'description', selector: '#eventDescription', value: event.description || '' },
        { name: 'category', selector: '#eventCategory', value: event.category || 'Workshop' },
        { name: 'facilitator', selector: '#eventFacilitator', value: event.facilitator || '' },
        { name: 'availableSpots', selector: '#eventAvailableSpots', value: event.availableSpots || '' },
        { name: 'image', selector: '#eventImage', value: event.image || '' },
        { name: 'requirements', selector: '#eventRequirements', value: event.requirements || '' },
        { name: 'notes', selector: '#eventNotes', value: event.notes || '' }
    ];
    
    // Fill each field
    fields.forEach(field => {
        const element = form.querySelector(field.selector);
        if (element) {
            element.value = field.value;
            console.log(`Set ${field.name} = ${field.value}`);
        } else {
            console.warn(`Field not found: ${field.selector}`);
        }
    });
    
    // Handle datetime fields
    if (event.startDate) {
        const startDateElement = form.querySelector('#eventStartDate');
        if (startDateElement) {
            const startDate = new Date(event.startDate);
            startDateElement.value = startDate.toISOString().slice(0, 16);
            console.log(`Set startDate = ${startDateElement.value}`);
        }
    }
    
    if (event.endDate) {
        const endDateElement = form.querySelector('#eventEndDate');
        if (endDateElement) {
            const endDate = new Date(event.endDate);
            endDateElement.value = endDate.toISOString().slice(0, 16);
            console.log(`Set endDate = ${endDateElement.value}`);
        }
    }
}

function showDeleteEventConfirmation(eventId) {
    if (!isAdmin) return;
    
    console.log(`Showing delete confirmation for event: ${eventId}`);
    currentEventId = eventId;
    if (deleteModal) deleteModal.classList.remove('hidden');
}

function deleteEvent() {
    if (!currentEventId) {
        showAlert('ID-ul evenimentului lipsește', 'error');
        return;
    }
    
    console.log(`Deleting event: ${currentEventId}`);
    showLoading();
    hideDeleteModal();
    
    db.collection('events').doc(currentEventId).delete()
        .then(() => {
            console.log("Event deleted successfully");
            hideLoading();
            showAlert('Evenimentul a fost șters cu succes!', 'success');
            setTimeout(() => loadEvents(), 500);
        })
        .catch(error => {
            console.error("Error deleting event:", error);
            hideLoading();
            
            if (error.code === "permission-denied") {
                showAlert('Se încearcă o metodă alternativă de ștergere...', 'info');
                
                db.collection('events').doc(currentEventId).update({
                    deleted: true,
                    deletedAt: firebase.firestore.FieldValue.serverTimestamp()
                })
                .then(() => {
                    showAlert('Evenimentul a fost marcat ca șters!', 'success');
                    loadEvents();
                })
                .catch(updateError => {
                    showAlert(`Nu s-a putut șterge evenimentul: ${updateError.message}`, 'error');
                });
            } else {
                showAlert(`Eroare la ștergerea evenimentului: ${error.message}`, 'error');
            }
        });
}

// ========== UTILITY FUNCTIONS ==========

function handleLogout() {
    console.log("Logging out user");
    auth.signOut()
        .then(() => {
            window.location.href = 'login.html';
        })
        .catch((error) => {
            showAlert(`Eroare la deconectare: ${error.message}`, 'error');
        });
}

function hideModal() {
    // Modified to use getElementById instead of global variables
    const courseModalElement = document.getElementById('courseModal');
    const eventModalElement = document.getElementById('eventModal');
    
    if (courseModalElement) courseModalElement.classList.add('hidden');
    if (eventModalElement) eventModalElement.classList.add('hidden');
}

function hideDeleteModal() {
    if (deleteModal) deleteModal.classList.add('hidden');
}

function showLoading() {
    if (loadingIndicator) loadingIndicator.classList.remove('hidden');
}

function hideLoading() {
    if (loadingIndicator) loadingIndicator.classList.add('hidden');
}

function showAlert(message, type) {
    console.log(`Alert: ${message} (${type})`);
    
    if (!alertBox) return;
    
    const alertClass = type === 'error' ? 'bg-red-100 border-red-400 text-red-700 dark:bg-red-800/30 dark:border-red-600 dark:text-red-400' :
                       type === 'success' ? 'bg-green-100 border-green-400 text-green-700 dark:bg-green-800/30 dark:border-green-600 dark:text-green-400' :
                       'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-800/30 dark:border-blue-600 dark:text-blue-400';
    
    alertBox.innerHTML = `
        <div class="px-4 py-3 ${alertClass} border rounded-lg relative shadow-sm" role="alert">
            <span class="block sm:inline">${message}</span>
            <button class="absolute top-0 bottom-0 right-0 px-4 py-3 alert-close">
                <i class="ph-bold ph-x"></i>
            </button>
        </div>
    `;
    
    alertBox.classList.remove('hidden');
    
    const closeBtn = alertBox.querySelector('.alert-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            alertBox.classList.add('hidden');
        });
    }
    
    setTimeout(() => {
        if (alertBox) alertBox.classList.add('hidden');
    }, 5000);
}

// ========== DEBUGGING HELPERS ==========

window.testEventRegistrations = function() {
    console.log("=== MANUAL TEST: Event Registrations ===");
    console.log("Current user:", auth.currentUser?.email);
    console.log("Is admin:", isAdmin);
    
    if (!isAdmin) {
        console.log("❌ User is not admin - this might be the issue!");
        return;
    }
    
    console.log("🔍 Test 1: Checking collection existence...");
    db.collection('eventRegistrations').get()
        .then(snapshot => {
            console.log(`✅ Collection found with ${snapshot.size} documents`);
            
            if (snapshot.size === 0) {
                console.log("ℹ️ Collection is empty - you need to add some test data");
                console.log("💡 Try adding a test document using window.addTestEventRegistration()");
                return;
            }
            
            console.log("📋 All documents in collection:");
            snapshot.forEach((doc, index) => {
                console.log(`${index + 1}. ID: ${doc.id}`, doc.data());
            });
            
            const statusCounts = {};
            snapshot.forEach(doc => {
                const status = doc.data().status || 'undefined';
                statusCounts[status] = (statusCounts[status] || 0) + 1;
            });
            console.log("📊 Status distribution:", statusCounts);
            
            const pendingDocs = [];
            snapshot.forEach(doc => {
                if (doc.data().status === 'pending') {
                    pendingDocs.push({id: doc.id, data: doc.data()});
                }
            });
            console.log(`🕐 Pending documents (${pendingDocs.length}):`, pendingDocs);
            
            if (pendingDocs.length === 0) {
                console.log("⚠️ No pending documents found - this is why the admin panel shows empty!");
            }
        })
        .catch(error => {
            console.error("❌ Error accessing collection:", error);
            console.log("🔧 Possible fixes:");
            console.log("1. Check Firestore security rules");
            console.log("2. Verify user has admin role");
            console.log("3. Check if collection name is correct");
        });
};

window.addTestEventRegistration = function() {
    if (!isAdmin) {
        console.log("❌ Must be admin to add test data");
        return;
    }
    
    console.log("🔨 Adding test event registration...");
    
    db.collection('eventRegistrations').add({
        userName: 'Test User ' + Date.now(),
        email: 'test' + Date.now() + '@example.com',
        eventTitle: 'Test Workshop',
        registrationDate: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'pending',
        phone: '+373 69 123 456',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(docRef => {
        console.log("✅ Test document added with ID:", docRef.id);
        console.log("🔄 Now try loading the event registrations section again");
    })
    .catch(error => {
        console.error("❌ Error adding test document:", error);
    });
};

window.checkEventRegistrationsSection = function() {
    console.log("=== CHECKING SECTION VISIBILITY ===");
    
    const section = document.getElementById('eventRegistrationsSection');
    const tableBody = document.getElementById('eventRegistrationsTableBody');
    
    console.log("Section element:", section);
    console.log("Section visible:", section && !section.classList.contains('hidden'));
    console.log("Table body element:", tableBody);
    console.log("Table body cached:", eventRegistrationsTableBody);
    
    if (!section) {
        console.log("❌ Section not found - navigation might not be set up correctly");
    }
    
    if (!tableBody) {
        console.log("❌ Table body not found - HTML structure issue");
    }
    
    console.log("📋 All admin sections:");
    document.querySelectorAll('.admin-section').forEach((el, index) => {
        console.log(`${index + 1}. ${el.id} - ${el.classList.contains('hidden') ? 'HIDDEN' : 'VISIBLE'}`);
    });
};

// Setup theme toggles and navigation when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    console.log("DOMContentLoaded event fired in admin.js");
    
    setupThemeToggle(
        document.getElementById('theme-toggle'),
        document.getElementById('theme-toggle-dark-icon'),
        document.getElementById('theme-toggle-light-icon')
    );
    
    const secondToggle = document.getElementById('theme-toggle2');
    if (secondToggle) {
        setupThemeToggle(
            secondToggle,
            document.getElementById('theme-toggle-dark-icon2'),
            document.getElementById('theme-toggle-light-icon2')
        );
    }
    
    setupNavLinks();
    
    // Cache the event registrations table body since it exists in HTML
    eventRegistrationsTableBody = document.getElementById('eventRegistrationsTableBody');
    console.log("Event registrations table body found on page load:", !!eventRegistrationsTableBody);
});

// Add search functionality for users
function initializeUserSearch() {
    const userSearchInput = document.getElementById('userSearch');
    if (!userInput) return;

    userSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const rows = document.querySelectorAll('#usersTableBody tr');
        
        rows.forEach(row => {
            const userName = row.querySelector('td:nth-child(1)')?.textContent.toLowerCase() || '';
            const userEmail = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
            const userPhone = row.querySelector('td:nth-child(3)')?.textContent.toLowerCase() || '';
            const userCourse = row.querySelector('td:nth-child(4)')?.textContent.toLowerCase() || '';
            const userOccupation = row.querySelector('td:nth-child(6)')?.textContent.toLowerCase() || '';
            
            const matches = userName.includes(searchTerm) || 
                          userEmail.includes(searchTerm) || 
                          userPhone.includes(searchTerm) || 
                          userCourse.includes(searchTerm) || 
                          userOccupation.includes(searchTerm);
            
            row.style.display = matches ? '' : 'none';
        });
    });
}

/**
 * Show the modal for adding a new event
 */
function showAddEventModal() {
    console.log("showAddEventModal called");
    
    if (!isAdmin) {
        console.log("User is not admin, aborting");
        return;
    }
    
    // Initialize modal with fresh event handlers
    const modal = initEventModal();
    if (!modal) {
        console.error("Could not initialize event modal");
        return;
    }
    
    // Reset current event ID (this is a new event)
    currentEventId = null;
    
    // Reset the form
    modal.form.reset();
    
    // Hide the ID field since this is a new event
    modal.idField.classList.add('hidden');
    
    // Set the modal title
    modal.titleElement.textContent = 'Adaugă Eveniment Nou';
    
    // Show the modal
    modal.modal.classList.remove('hidden');
    console.log("Add event modal displayed");
}

// Direct event listener for Add Event button
document.addEventListener('DOMContentLoaded', function() {
    console.log("Setting up event listeners directly");
    
    // Get the Add Event button
    const addEventButton = document.getElementById('addEventBtn');
    if (addEventButton) {
        console.log("Found Add Event button, attaching click listener");
        
        // Add direct click listener
        addEventButton.onclick = function(e) {
            e.preventDefault();
            console.log("Add Event button clicked");
            showAddEventModal();
        };
    } else {
        console.error("Add Event button not found on page load");
    }
});
