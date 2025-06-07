/**
 * Dashboard.js - Handles user dashboard functionality
 * Displays course enrollments, event registrations, and notifications
 */

// Get Firestore and Auth instances
const db = firebase.firestore();
const auth = firebase.auth();

// DOM Elements - using optional chaining for safer access
const welcomeMessage = document.getElementById('welcome-message');
const enrolledCoursesContainer = document.getElementById('enrolledCourses');
const eventRegistrationsContainer = document.getElementById('eventRegistrations');
const loadingIndicator = document.getElementById('loading-indicator');
const errorMessage = document.getElementById('errorMessage');
const greeting = document.getElementById('greeting');
const notificationsContainer = document.getElementById('notifications-container');
const upcomingNotifications = document.getElementById('upcoming-notifications');

// Verify user authentication and load dashboard
auth.onAuthStateChanged(user => {
    if (user) {
        loadDashboard(user);
    } else {
        // Redirect to login if not authenticated
        window.location.href = '/login.html';
    }
});

/**
 * Main dashboard loading function
 * @param {Object} user - Firebase auth user object
 */
async function loadDashboard(user) {
    try {
        // Show loading state
        loadingIndicator?.classList.remove("hidden");
        
        // Update welcome message
        if (greeting) {
            greeting.textContent = `Bine ai venit, ${user.displayName || user.email}!`;
        }
        
        console.log("Fetching enrollments for user:", user.uid);
        
        // Load course enrollments and event registrations in parallel,
        // and check for upcoming notifications
        await Promise.all([
            loadCourseEnrollments(user),
            loadEventRegistrations(user),
            checkUpcomingClassesAndEvents(user)
        ]);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        if (errorMessage) {
            errorMessage.textContent = 'Eroare la încărcarea datelor. Vă rugăm să încercați din nou.';
            errorMessage.classList.remove('hidden');
        }
    } finally {
        loadingIndicator?.classList.add("hidden");
    }
}

/**
 * Load and display course enrollments
 * @param {Object} user - Firebase auth user object
 */
async function loadCourseEnrollments(user) {
    if (!enrolledCoursesContainer) return;
    
    try {
        // Get approved course enrollments
        const enrollmentsSnapshot = await db.collection('enrollments')
            .where('userId', '==', user.uid)
            .where('status', '==', 'approved')
            .get();
        
        console.log("Approved course enrollments found:", enrollmentsSnapshot.size);
        
        if (enrollmentsSnapshot.empty) {
            renderEmptyCourseState();
            return;
        }
        
        // Array to store course info
        const enrollments = [];
        
        // Get course details for each enrollment
        const enrollmentPromises = enrollmentsSnapshot.docs.map(async enrollmentDoc => {
            const enrollmentData = enrollmentDoc.data();
            
            try {
                // Get course details
                const courseDoc = await db.collection('courses').doc(enrollmentData.courseId).get();
                
                if (courseDoc.exists) {
                    const courseData = courseDoc.data();
                    enrollments.push({
                        id: enrollmentDoc.id,
                        courseId: enrollmentData.courseId,
                        enrollmentDate: enrollmentData.enrollmentDate,
                        status: enrollmentData.status,
                        courseName: courseData.name,
                        courseImage: courseData.image || '/assets/default-course.png',
                        courseDescription: courseData.description,
                        courseCategory: courseData.categorie
                    });
                } else {
                    // Course not found, use enrollment data
                    enrollments.push(createFallbackCourseData(enrollmentDoc.id, enrollmentData));
                }
            } catch (error) {
                console.error('Error fetching course details:', error);
                // Add the course even if there's an error, using available data
                enrollments.push(createFallbackCourseData(enrollmentDoc.id, enrollmentData));
            }
        });
        
        // Wait for all promises to resolve
        await Promise.all(enrollmentPromises);
        
        // Display enrollments
        if (enrollments.length === 0) {
            renderEmptyCourseState();
        } else {
            renderCourseGrid(enrollments);
        }
    } catch (error) {
        console.error('Error loading course enrollments:', error);
        enrolledCoursesContainer.innerHTML = `
            <div class="p-4 bg-red-100 dark:bg-red-800/30 rounded-lg">
                <p class="text-red-700 dark:text-red-300">Eroare la încărcarea cursurilor. Vă rugăm să încercați din nou.</p>
            </div>
        `;
    }
}

/**
 * Creates fallback course data when course fetch fails
 * @param {string} id - Enrollment document ID
 * @param {Object} enrollmentData - Enrollment data
 * @returns {Object} - Fallback course object
 */
function createFallbackCourseData(id, enrollmentData) {
    return {
        id,
        courseId: enrollmentData.courseId || 'unknown',
        enrollmentDate: enrollmentData.enrollmentDate,
        status: enrollmentData.status || 'approved',
        courseName: enrollmentData.courseName || 'Eroare la încărcarea cursului',
        courseImage: '/assets/default-course.png',
        courseDescription: 'A apărut o eroare la încărcarea detaliilor cursului.',
        courseCategory: 'N/A'
    };
}

/**
 * Renders empty course state with improved styling
 */
function renderEmptyCourseState() {
    enrolledCoursesContainer.innerHTML = `
        <div class="col-span-full bg-white dark:bg-dark2 rounded-xl shadow-md p-8 text-center">
            <div class="w-16 h-16 bg-gray-100 dark:bg-dark3 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="ph ph-graduation-cap text-gray-400 dark:text-gray-600 text-2xl"></i>
            </div>
            <p class="text-gray-700 dark:text-gray-300 mb-4">Nu sunteți înscris la niciun curs încă.</p>
            <a href="/cursuri.html" class="inline-block bg-main dark:bg-maindark text-white px-4 py-2 rounded-lg hover:bg-main/90 dark:hover:bg-maindark/90 transition-colors">
                Explorează cursurile disponibile
            </a>
        </div>
    `;
}

/**
 * Renders course grid with enhanced styling (without images)
 * @param {Array} enrollments - List of enrollment objects
 */
function renderCourseGrid(enrollments) {
    enrolledCoursesContainer.innerHTML = '';
    
    enrollments.forEach(enrollment => {
        const enrollmentDate = enrollment.enrollmentDate ? 
            new Date(enrollment.enrollmentDate.seconds * 1000).toLocaleDateString('ro-RO') : 
            'Dată necunoscută';
        
        const statusBadge = getStatusBadge(enrollment.status);
        
        const courseCard = document.createElement('div');
        courseCard.className = 'bg-white dark:bg-dark2 rounded-xl shadow-md overflow-hidden card-hover transition-all duration-300 border border-gray-100 dark:border-dark3';
        courseCard.innerHTML = `
            <div class="p-5">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-xl font-semibold dark:text-white">${enrollment.courseName}</h3>
                    <div>${statusBadge}</div>
                </div>
                <p class="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 text-sm">${enrollment.courseDescription || 'Fără descriere'}</p>
                <div class="flex justify-between items-center mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
                    <span class="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                        <i class="ph ph-calendar-check mr-1"></i>
                        ${enrollmentDate}
                    </span>
                    <a href="/curs.html?id=${enrollment.courseId}" class="text-main dark:text-maindark hover:underline flex items-center text-sm font-medium">
                        Vezi detalii
                        <i class="ph ph-arrow-right ml-1"></i>
                    </a>
                </div>
            </div>
        `;
        
        enrolledCoursesContainer.appendChild(courseCard);
    });
}

/**
 * Load and display event registrations
 * @param {Object} user - Firebase auth user object
 */
async function loadEventRegistrations(user) {
    if (!eventRegistrationsContainer) return;
    
    try {
        console.log("Starting to load event registrations for user:", user.uid);
        
        // First try a simpler query without orderBy to avoid index issues
        let registrationsQuery = db.collection('eventRegistrations')
            .where('userId', '==', user.uid);
            
        // You can uncomment this once you've created the necessary Firestore index
        // .orderBy('registrationDate', 'desc');
        
        const registrationsSnapshot = await registrationsQuery.get();
        
        console.log("Event registrations found:", registrationsSnapshot.size);
        
        if (registrationsSnapshot.empty) {
            // No event registrations - render empty state
            eventRegistrationsContainer.innerHTML = `
                <div class="col-span-full bg-white dark:bg-dark2 rounded-xl shadow-md p-8 text-center">
                    <div class="w-16 h-16 bg-gray-100 dark:bg-dark3 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="ph ph-calendar-x text-gray-400 dark:text-gray-600 text-2xl"></i>
                    </div>
                    <p class="text-gray-700 dark:text-gray-300 mb-4">Nu aveți înregistrări la evenimente.</p>
                    <a href="/evenimente.html" class="inline-block bg-main dark:bg-maindark text-white px-4 py-2 rounded-lg hover:bg-main/90 dark:hover:bg-maindark/90 transition-colors">
                        Explorează evenimentele disponibile
                    </a>
                </div>
            `;
            return;
        }
        
        // Array to store event registrations
        const registrations = [];
        
        // Process each document, handling missing fields gracefully
        registrationsSnapshot.forEach(doc => {
            try {
                const data = doc.data();
                console.log("Processing event registration:", data);
                
                registrations.push({
                    id: doc.id,
                    eventId: data.eventId || 'unknown',
                    eventTitle: data.eventTitle || 'Eveniment necunoscut',
                    eventDescription: data.eventDescription || 'Fără descriere disponibilă',
                    registrationDate: data.registrationDate || null,
                    status: data.status || 'pending'
                });
            } catch (docError) {
                console.error("Error processing document:", doc.id, docError);
                // Continue processing other documents
            }
        });
        
        // Display registrations with enhanced styling
        renderEventRegistrationsCards(registrations);
        
    } catch (error) {
        console.error('Error loading event registrations:', error);
        // Provide more detailed error information for debugging
        const errorDetails = error.message ? ` (${error.message})` : '';
        
        eventRegistrationsContainer.innerHTML = `
            <div class="p-4 bg-red-100 dark:bg-red-800/30 rounded-lg">
                <p class="text-red-700 dark:text-red-300">Eroare la încărcarea înregistrărilor la evenimente. Vă rugăm să încercați din nou${errorDetails}.</p>
                <p class="text-sm text-red-700 dark:text-red-300 mt-2">Dacă problema persistă, contactați administratorul.</p>
            </div>
        `;
    }
}

/**
 * Renders event registrations as cards with enhanced styling
 * @param {Array} registrations - List of registration objects
 */
function renderEventRegistrationsCards(registrations) {
    try {
        console.log("Rendering event registrations as cards with data:", registrations);
        
        const eventRegistrationsContainer = document.getElementById('eventRegistrations');
        if (!eventRegistrationsContainer) return;
        
        // Sort registrations by date (newest first) if date is available
        registrations.sort((a, b) => {
            if (!a.registrationDate) return 1;
            if (!b.registrationDate) return -1;
            return b.registrationDate.seconds - a.registrationDate.seconds;
        });
        
        eventRegistrationsContainer.innerHTML = '';
        
        // Check if there are any registrations
        if (registrations.length === 0) {
            eventRegistrationsContainer.innerHTML = `
                <div class="col-span-full bg-white dark:bg-dark2 rounded-xl shadow-md p-8 text-center">
                    <div class="w-16 h-16 bg-gray-100 dark:bg-dark3 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="ph ph-calendar-x text-gray-400 dark:text-gray-600 text-2xl"></i>
                    </div>
                    <p class="text-gray-700 dark:text-gray-300 mb-4">Nu aveți înregistrări la evenimente.</p>
                    <a href="/evenimente.html" class="inline-block bg-main dark:bg-maindark text-white px-4 py-2 rounded-lg hover:bg-main/90 dark:hover:bg-maindark/90 transition-colors">
                        Explorează evenimentele disponibile
                    </a>
                </div>
            `;
            return;
        }
        
        // Create cards for each registration
        registrations.forEach(reg => {
            try {
                const registrationDate = reg.registrationDate ? 
                    new Date(reg.registrationDate.seconds * 1000).toLocaleDateString('ro-RO') : 
                    'Dată necunoscută';
                
                const statusBadge = getEventStatusBadge(reg.status);
                
                const eventCard = document.createElement('div');
                eventCard.className = 'bg-white dark:bg-dark2 rounded-xl shadow-md overflow-hidden card-hover transition-all duration-300 border border-gray-100 dark:border-dark3';
                eventCard.innerHTML = `
                    <div class="p-5 border-b border-gray-100 dark:border-dark3 bg-gray-50 dark:bg-dark3 flex justify-between items-center">
                        <h3 class="text-lg font-semibold dark:text-white line-clamp-1">${reg.eventTitle}</h3>
                        <div>${statusBadge}</div>
                    </div>
                    <div class="p-5">
                        <p class="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 text-sm">${reg.eventDescription || 'Fără descriere'}</p>
                        <div class="mt-auto pt-2 border-t border-gray-100 dark:border-dark3">
                            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                <span class="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                                    <i class="ph ph-calendar-check mr-1"></i>
                                    ${registrationDate}
                                </span>
                                ${reg.status === 'approved' ? 
                                    `<a href="/eveniment.html?id=${reg.eventId}" class="text-main dark:text-maindark hover:underline flex items-center text-sm font-medium">
                                        Vezi evenimentul
                                        <i class="ph ph-arrow-right ml-1"></i>
                                    </a>` : 
                                    '<span class="text-sm text-gray-500 dark:text-gray-400 italic">În așteptare</span>'}
                            </div>
                        </div>
                    </div>
                `;
                
                eventRegistrationsContainer.appendChild(eventCard);
            } catch (cardError) {
                console.error("Error rendering registration card:", cardError);
                const errorCard = document.createElement('div');
                errorCard.className = 'bg-white dark:bg-dark2 rounded-xl shadow-md overflow-hidden p-4';
                errorCard.innerHTML = `
                    <h3 class="text-xl font-semibold mb-2 text-red-500">Eroare la afișare</h3>
                    <p class="text-gray-600 dark:text-gray-300">Nu s-a putut afișa acest eveniment.</p>
                `;
                eventRegistrationsContainer.appendChild(errorCard);
            }
        });
        
    } catch (error) {
        console.error("Error in renderEventRegistrationsCards:", error);
        const eventRegistrationsContainer = document.getElementById('eventRegistrations');
        if (eventRegistrationsContainer) {
            eventRegistrationsContainer.innerHTML = `
                <div class="col-span-full p-4 bg-red-100 dark:bg-red-800/30 rounded-lg">
                    <p class="text-red-700 dark:text-red-300">Eroare la afișarea înregistrărilor la evenimente. Vă rugăm să încercați din nou.</p>
                </div>
            `;
        }
    }
}

/**
 * Get HTML for a status badge for courses
 * @param {string} status - Status string
 * @returns {string} - Badge HTML with enhanced styling
 */
function getStatusBadge(status) {
    switch (status) {
        case 'active':
        case 'approved': // Treat 'approved' the same as 'active'
            return '<span class="bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full dark:bg-green-900 dark:text-green-300">Activ</span>';
        case 'completed':
            return '<span class="bg-main/10 text-main text-xs font-medium px-3 py-1 rounded-full dark:bg-maindark/30 dark:text-maindark">Finalizat</span>';
        case 'pending':
            return '<span class="bg-yellow-100 text-yellow-800 text-xs font-medium px-3 py-1 rounded-full dark:bg-yellow-900 dark:text-yellow-300">În așteptare</span>';
        default:
            return '<span class="bg-gray-100 text-gray-800 text-xs font-medium px-3 py-1 rounded-full dark:bg-gray-700 dark:text-gray-300">Necunoscut</span>';
    }
}

/**
 * Get HTML for a status badge for events
 * @param {string} status - Status string
 * @returns {string} - Badge HTML with enhanced styling
 */
function getEventStatusBadge(status) {
    switch (status) {
        case 'approved':
            return '<span class="bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full dark:bg-green-900 dark:text-green-300">Aprobat</span>';
        case 'pending':
            return '<span class="bg-yellow-100 text-yellow-800 text-xs font-medium px-3 py-1 rounded-full dark:bg-yellow-900 dark:text-yellow-300">În așteptare</span>';
        case 'rejected':
            return '<span class="bg-red-100 text-red-800 text-xs font-medium px-3 py-1 rounded-full dark:bg-red-900 dark:text-red-300">Respins</span>';
        default:
            return '<span class="bg-gray-100 text-gray-800 text-xs font-medium px-3 py-1 rounded-full dark:bg-gray-700 dark:text-gray-300">Necunoscut</span>';
    }
}

/**
 * Check for upcoming classes and events scheduled for tomorrow
 * @param {Object} user - Firebase auth user object
 */
async function checkUpcomingClassesAndEvents(user) {
    if (!notificationsContainer || !upcomingNotifications) return;
    
    try {
        console.log("Checking for upcoming classes and events...");
        
        // Create tomorrow's date (start of day)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        // End of tomorrow
        const tomorrowEnd = new Date(tomorrow);
        tomorrowEnd.setHours(23, 59, 59, 999);
        
        const hasNotifications = await Promise.all([
            checkUpcomingCourseClasses(user, tomorrow),
            checkUpcomingEvents(user, tomorrow, tomorrowEnd)
        ]);
        
        // If any notifications were added, show the container
        if (hasNotifications.some(hasNotification => hasNotification)) {
            notificationsContainer.classList.remove('hidden');
        } else {
            notificationsContainer.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error checking upcoming notifications:', error);
    }
}

/**
 * Check for upcoming course classes scheduled for tomorrow based on zileSaptamana
 * @param {Object} user - Firebase auth user object
 * @param {Date} tomorrow - Tomorrow's date
 * @returns {boolean} - Whether any notifications were added
 */
async function checkUpcomingCourseClasses(user, tomorrow) {
    try {
        // Get JavaScript day of week (0 = Sunday, 1 = Monday, etc.)
        const jsDay = tomorrow.getDay();
        
        // Convert to the format where 0 = Monday, 1 = Tuesday, etc.
        // If Sunday (0), convert to 6, otherwise subtract 1
        const tomorrowDay = jsDay === 0 ? 6 : jsDay - 1;
        
        // Get user's approved enrollments
        const enrollmentsSnapshot = await db.collection('enrollments')
            .where('userId', '==', user.uid)
            .where('status', '==', 'approved')
            .get();
        
                 if (enrollmentsSnapshot.empty) return false;
        
        let hasNotifications = false;
        
        // For each enrollment, check if there's a class tomorrow
                 const enrollmentPromises = enrollmentsSnapshot.docs.map(async enrollmentDoc => {
            const enrollmentData = enrollmentDoc.data();
            
            try {
                // Get course details
                const courseDoc = await db.collection('courses').doc(enrollmentData.courseId).get();
                
                if (courseDoc.exists) {
                    const courseData = courseDoc.data();
                    
                    // Check if course has any schedule information
                    if (!courseData.zileSaptamana) {
                        return;
                    }
                    
                    // Different ways the zileSaptamana data might be stored
                    let classTomorrow = null;
                    
                    // Case 1: It's an array with values at indices matching days of week (0 = Monday in this system)
                    if (Array.isArray(courseData.zileSaptamana)) {
                        if (courseData.zileSaptamana.length > tomorrowDay && 
                            courseData.zileSaptamana[tomorrowDay] && 
                            courseData.zileSaptamana[tomorrowDay].trim() !== '') {
                            classTomorrow = courseData.zileSaptamana[tomorrowDay];
                        }
                    } 
                    // Case 2: It's an object with keys as days of week
                    else if (typeof courseData.zileSaptamana === 'object') {
                        const dayNames = ['luni', 'marti', 'miercuri', 'joi', 'vineri', 'sambata', 'duminica'];
                        const tomorrowName = dayNames[tomorrowDay];
                        
                        if (courseData.zileSaptamana[tomorrowName] && 
                            courseData.zileSaptamana[tomorrowName].trim() !== '') {
                            classTomorrow = courseData.zileSaptamana[tomorrowName];
                        }
                    }
                    // Case 3: It's a string with semicolon separated values
                    else if (typeof courseData.zileSaptamana === 'string') {
                        const days = courseData.zileSaptamana.split(';');
                        if (days.length > tomorrowDay && days[tomorrowDay] && days[tomorrowDay].trim() !== '') {
                            classTomorrow = days[tomorrowDay];
                        }
                    }
                    
                    // If we found a class tomorrow, show notification
                    if (classTomorrow) {
                        // Add notification for tomorrow's class
                        const notification = document.createElement('div');
                        notification.className = 'p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm';
                        notification.innerHTML = `
                            <div class="flex items-start">
                                <div class="flex-shrink-0 bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                </div>
                                <div class="ml-3">
                                    <h4 class="text-sm font-medium text-gray-900 dark:text-white">Curs mâine: ${courseData.name}</h4>
                                    <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        Aveți un curs mâine la ora: ${classTomorrow}
                                    </p>
                                    <a href="/curs.html?id=${enrollmentData.courseId}" class="mt-2 text-xs text-main dark:text-maindark hover:underline inline-block">
                                        Vezi detalii curs
                                    </a>
                                </div>
                            </div>
                        `;
                        
                        upcomingNotifications.appendChild(notification);
                        hasNotifications = true;
                    }
                }
            } catch (error) {
                console.error('Error checking course for upcoming classes:', error);
            }
        });
        
        await Promise.all(enrollmentPromises);
        return hasNotifications;
    } catch (error) {
        console.error('Error checking upcoming course classes:', error);
        return false;
    }
}

/**
 * Check for upcoming events scheduled for tomorrow
 * @param {Object} user - Firebase auth user object
 * @param {Date} tomorrowStart - Start of tomorrow
 * @param {Date} tomorrowEnd - End of tomorrow
 * @returns {boolean} - Whether any notifications were added
 */
async function checkUpcomingEvents(user, tomorrowStart, tomorrowEnd) {
    try {
        // Get user's approved event registrations
        const registrationsSnapshot = await db.collection('eventRegistrations')
            .where('userId', '==', user.uid)
            .where('status', '==', 'approved')
            .get();
        
        if (registrationsSnapshot.empty) return false;
        
        let hasNotifications = false;
        
        // For each registration, check if the event is tomorrow
        const eventPromises = registrationsSnapshot.docs.map(async regDoc => {
            const regData = regDoc.data();
            
            try {
                // Get event details
                if (!regData.eventId) return;
                
                const eventDoc = await db.collection('events').doc(regData.eventId).get();
                
                if (eventDoc.exists) {
                    const eventData = eventDoc.data();
                    
                    // Check if event starts tomorrow
                    if (eventData.startDate) {
                        const eventDate = new Date(eventData.startDate);
                        
                        // Check if event date is tomorrow
                        if (eventDate >= tomorrowStart && eventDate <= tomorrowEnd) {
                            // Format the time
                            const timeOptions = { hour: '2-digit', minute: '2-digit' };
                            const formattedTime = eventDate.toLocaleTimeString('ro-RO', timeOptions);
                            
                            // Add notification for tomorrow's event
                            const notification = document.createElement('div');
                            notification.className = 'p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm';
                            notification.innerHTML = `
                                <div class="flex items-start">
                                    <div class="flex-shrink-0 bg-purple-100 dark:bg-purple-900 p-2 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-purple-600 dark:text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div class="ml-3">
                                        <h4 class="text-sm font-medium text-gray-900 dark:text-white">Eveniment mâine: ${eventData.title}</h4>
                                        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            Aveți un eveniment mâine la ora: ${formattedTime}
                                        </p>
                                        <a href="/eveniment.html?id=${regData.eventId}" class="mt-2 text-xs text-main dark:text-maindark hover:underline inline-block">
                                            Vezi detalii eveniment
                                        </a>
                                    </div>
                                </div>
                            `;
                            
                            upcomingNotifications.appendChild(notification);
                            hasNotifications = true;
                        }
                    }
                }
            } catch (error) {
                console.error('Error checking event for notification:', error);
            }
        });
        
        await Promise.all(eventPromises);
        return hasNotifications;
    } catch (error) {
        console.error('Error checking upcoming events:', error);
        return false;
    }
}

// Mobile navigation event handlers
document.getElementById("burger")?.addEventListener("click", function () {
    document.getElementById("phone-nav")?.classList.remove("hidden");
});

document.getElementById("close")?.addEventListener("click", function () {
    document.getElementById("phone-nav")?.classList.add("hidden");
});