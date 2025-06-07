// Complete curs.js with enhanced profile validation for course enrollment
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp, doc, getDoc, query, where, count, getCountFromServer } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBoWwArqP6pYGvVSBzCbUnOphhzk0Pi9oQ",
    authDomain: "tekwill-441fe.firebaseapp.com",
    projectId: "tekwill-441fe",
    storageBucket: "tekwill-441fe.firebasestorage.app",
    messagingSenderId: "990223834307",
    appId: "1:990223834307:web:c1a9da67d5e5f070db1676"
};

// Initialize Firebase
console.log("Initializing Firebase in curs.js");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
console.log("Firebase initialized in curs.js");

// Constants
const STORAGE_KEYS = {
    PENDING_COURSE: 'pendingCourseEnrollment'
};

// Store the current course data
let currentCourseData = null;

// Enhanced function to check if user profile is complete
async function isUserProfileComplete(userId) {
    try {
        console.log("Checking if user profile is complete for:", userId);
        
        const userDoc = await getDoc(doc(db, "users", userId));
        
        if (!userDoc.exists()) {
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

// Function to check if user already has an enrollment for this course
async function checkExistingEnrollment(userId, courseId) {
  try {
    console.log(`Checking if user ${userId} is already enrolled in course ${courseId}`);
    
    const enrollmentsRef = collection(db, "enrollments");
    const q = query(
      enrollmentsRef,
      where("userId", "==", userId),
      where("courseId", "==", courseId)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      // User has an existing enrollment
      const enrollment = querySnapshot.docs[0].data();
      return {
        exists: true,
        status: enrollment.status,
        data: enrollment
      };
    }
    
    return { exists: false };
  } catch (error) {
    console.error("Error checking enrollment status:", error);
    return { exists: false, error };
  }
}

// Create success modal
function createSuccessModal(isWaitlist = false) {
    // If modal already exists, remove it
    const existingModal = document.getElementById('success-modal');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }
    
    // Create modal
    const modalContainer = document.createElement('div');
    modalContainer.id = 'success-modal';
    modalContainer.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
    
    modalContainer.innerHTML = `
        <div class="bg-white dark:bg-dark2 rounded-lg shadow-xl p-6 m-4 max-w-sm w-full transform transition-all">
            <div class="flex justify-center mb-4">
                <div class="flex items-center justify-center h-16 w-16 rounded-full ${isWaitlist ? 'bg-blue-100 dark:bg-blue-900' : 'bg-green-100 dark:bg-green-900'}">
                    <svg class="h-8 w-8 ${isWaitlist ? 'text-blue-600 dark:text-blue-300' : 'text-green-600 dark:text-green-300'}" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        ${isWaitlist 
                            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
                            : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'}
                    </svg>
                </div>
            </div>
            <h3 class="text-lg font-medium text-center text-gray-900 dark:text-white mb-2">
                ${isWaitlist 
                    ? 'Ai fost adăugat în lista de așteptare!' 
                    : 'Înscriere trimisă cu succes!'}
            </h3>
            <p class="text-sm text-center text-gray-600 dark:text-gray-300 mb-6">
                ${isWaitlist 
                    ? 'Cererea ta a fost adăugată în lista de așteptare. Te vom contacta când se eliberează un loc.' 
                    : 'Cererea ta de înscriere a fost trimisă și va fi revizuită de un administrator în curând.'}
            </p>
            <div class="flex justify-center">
                <button id="success-modal-close" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 ${isWaitlist ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                   Am Înțeles
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalContainer);
    
    // Add event listener to close button
    document.getElementById('success-modal-close').addEventListener('click', function() {
        document.body.removeChild(modalContainer);
        
        // Redirect to home page
        window.location.href = '/index.html';
    });
    
    // Close modal on click outside
    modalContainer.addEventListener('click', function(e) {
        if (e.target === modalContainer) {
            document.body.removeChild(modalContainer);
            window.location.href = '/index.html';
        }
    });
}

// Function to get the number of approved enrollments for a course
async function getApprovedEnrollmentsCount(courseId) {
    try {
        console.log("Counting approved enrollments for course:", courseId);
        
        // Create a query against the enrollments collection
        const enrollmentsRef = collection(db, "enrollments");
        const q = query(
            enrollmentsRef,
            where("courseId", "==", courseId),
            where("status", "==", "approved")
        );
        
        // Get the count from server to avoid fetching all documents
        const snapshot = await getCountFromServer(q);
        const count = snapshot.data().count;
        
        console.log(`Found ${count} approved enrollments for course ${courseId}`);
        return count;
    } catch (error) {
        console.error("Error counting approved enrollments:", error);
        return 0; // Return 0 if there's an error
    }
}

// Main function to render course details
async function renderCourseDetails() {
    try {
        console.log("Starting renderCourseDetails()");
        const urlParams = new URLSearchParams(window.location.search);
        const courseId = urlParams.get('id');
        
        console.log("Course ID from URL:", courseId);
        
        if (!courseId) {
            throw new Error('No course ID provided');
        }

        // Show loading state
        const container = document.getElementById('course-details-container');
        if (container) {
            container.innerHTML = '<div class="flex justify-center items-center p-10"><div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-main"></div></div>';
        }

        // ATTEMPT 1: Using getDoc to get a specific document
        console.log("Attempting to fetch course with getDoc");
        try {
            const courseDocRef = doc(db, "courses", courseId);
            console.log("Document reference created:", courseDocRef.path);
            
            const courseDoc = await getDoc(courseDocRef);
            console.log("Document fetch result:", courseDoc.exists() ? "Document exists" : "Document does not exist");
            
            if (courseDoc.exists()) {
                const course = courseDoc.data();
                course.id = courseId;
                console.log("Course data retrieved:", course);
                
                // Get approved enrollments count
                const approvedEnrollments = await getApprovedEnrollmentsCount(courseId);
                
                // Add the count to the course object
                course.approvedEnrollments = approvedEnrollments;
                
                // Store course data globally
                currentCourseData = course;
                
                renderCourseUI(course);
                return; // Exit function if successful
            } else {
                console.log("Course document not found, trying alternative methods");
            }
        } catch (error) {
            console.error("Error with getDoc method:", error);
        }

        // ATTEMPT 2: Query the collection
        try {
            const coursesCollection = collection(db, "courses");
            const querySnapshot = await getDocs(coursesCollection);
            
            console.log("Collection query returned docs:", querySnapshot.size);
            
            let courseFound = false;
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                console.log("Checking document:", doc.id);
                
                if (doc.id === courseId || data.id?.toString() === courseId) {
                    console.log("Found matching course in collection:", data);
                    const course = data;
                    course.id = doc.id;
                    
                    // Get approved enrollments count
                    getApprovedEnrollmentsCount(doc.id).then(approvedEnrollments => {
                        course.approvedEnrollments = approvedEnrollments;
                        
                        // Store course data globally
                        currentCourseData = course;
                        
                        renderCourseUI(course);
                    });
                    
                    courseFound = true;
                    return; // Exit the forEach loop
                }
            });
            
            if (!courseFound) {
                // Show error message instead of loading from JSON
                throw new Error('Cursul nu a fost găsit în baza de date. Vă rugăm să verificați URL-ul sau să contactați administratorul.');
            }
        } catch (error) {
            console.error("Error with alternative methods:", error);
            throw error;
        }
    } catch (error) {
        console.error('Error rendering course details:', error);
        const container = document.getElementById('course-details-container');
        if (container) {
            container.innerHTML = `
                <div class="text-center p-6 flex flex-col items-center justify-center h-[70vh]">
                    <h2 class="text-3xl lg:text-5xl font-bold text-red-600">Eroare</h2>
                    <p class="mb-4 text-gray-700 dark:text-gray-300">${error.message}</p>
                    <a href="/" class="mt-2 underline">Intoarce-te la pagina principala</a>
                </div>
            `;
        }
    }
}

// Render the course UI with the retrieved data
async function renderCourseUI(course) {
    try {
        console.log("Rendering course UI for:", course.name);
        
        // Still fetch FAQ data from local file
        const faqResponse = await fetch('/faq.json');
        const faqData = await faqResponse.json();

        const numeCursInput = document.getElementById('numeCurs');
        if (numeCursInput) {
            numeCursInput.value = course.name;
        }

        // Get the container and clear it
        const mainContainer = document.getElementById('course-details-container');
        mainContainer.innerHTML = '';
        
        // Calculate remaining spots
        const totalSpots = course.locuri || 0;
        const approvedEnrollments = course.approvedEnrollments || 0;
        const remainingSpots = Math.max(0, totalSpots - approvedEnrollments);
        
        // Extract tag data from course object for the tags section
        const limba = course.limba || "Română";
        const orePeZi = "1 ora"; // Default value
        const orePeSaptamana = course.orePeSaptamana || "3 ore pe Săptămână";
        const durata = course.durata || "3 Luni";
        const categorie = course.categorie || "Începători";
        const formatCurs = course.formatCurs || "In Persoana";
        
        // Create the main page structure with hero section matching evenimente.html style
        mainContainer.innerHTML = `
            <div class="bg-white dark:bg-dark2 rounded-2xl shadow-2xl overflow-hidden relative">
                <div class="flex flex-col lg:flex-row">
                    <!-- Content Section -->
                    <div class="flex-1 p-8 lg:p-12 flex flex-col">
                        
                        
                        <div class="flex flex-col justify-between flex-grow">
                            <div class="mb-8">
                                <div class="text-5xl mb-5">${course.emoji || '📚'}</div>
                                <h1 class="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight mb-4">
                                    ${course.name}
                                </h1>
                                <p class="text-lg lg:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                                    ${course.description}
                                </p>
                            </div>
                            
                            <div class="flex flex-col gap-2 mt-4">
                                <div class="flex items-center justify-start gap-1">
                                    <i class="ph-fill ph-seal-warning text-xl text-main dark:text-maindark"></i>
                                    <span class="text-main dark:text-maindark font-semibold leading-[110%]">
                                        ${remainingSpots > 0 
                                            ? `Au rămas ${remainingSpots} locuri!` 
                                            : 'Toate locurile au fost ocupate'}
                                    </span>
                                </div>
                        
                                <button id="enroll-button" class="max-w-[400px] py-3 px-4 rounded-xl text-white transition-all duration-200 text-sm bg-gray-400 cursor-not-allowed" disabled>
                                    Înscrie-te acum
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Visual Section -->
                    <div class="lg:w-1/2 relative">
                        <div class="h-64 lg:h-full bg-gradient-to-br from-main/20 via-maindark/10 to-purple-300/20 dark:from-maindark/30 dark:via-main/20 dark:to-purple-600/30 flex items-center justify-center relative overflow-hidden">
                            <!-- Desktop Image -->
                            <img src="assets/home-pc.png" alt="${course.name}" class="w-full h-full object-cover hidden md:block">
                            
                            <!-- Mobile Image -->
                            <img src="assets/home-phone.png" class="md:hidden w-full h-full object-cover" alt="${course.name}">
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="w-full mb-4 mt-4">
                <div class="rounded-2xl">
                    <!-- Course Tags - Mobile responsive slider with improved styling -->
                    <div class="relative">
                        <!-- Desktop view: flex row -->
                        <div class="hidden md:flex flex-row gap-2 justify-center h-12">
                            <!-- Language tag -->
                            <div class="flex items-center justify-center rounded-full bg-white dark:bg-dark2 px-3 py-1 text-main dark:text-maindark w-full shadow-xl">
                                <i class="ph-fill ph-globe text-main mr-1.5 flex-shrink-0"></i>
                                <span class="whitespace-nowrap text-sm font-medium">${limba}</span>
                            </div>
                            
                            <!-- Hours per day tag -->
                            <div class="flex items-center justify-center rounded-full bg-white dark:bg-dark2 px-3 py-1 text-main dark:text-maindark w-full shadow-xl">
                                <i class="ph ph-clock text-main mr-1.5 flex-shrink-0"></i>
                                <span class="whitespace-nowrap text-sm font-medium">${orePeZi}</span>
                            </div>
                            
                            <!-- Price tag -->
                            <div class="flex items-center justify-center rounded-full bg-white dark:bg-dark2 px-3 py-1 text-main dark:text-maindark w-full shadow-xl">
                                <i class="ph ph-money text-main mr-1.5 flex-shrink-0"></i>
                                <span class="whitespace-nowrap text-sm font-medium">Gratis!</span>
                            </div>
                            
                            <!-- Hours per week tag -->
                            <div class="flex items-center justify-center rounded-full bg-white dark:bg-dark2 px-4 py-1 text-main dark:text-maindark w-full shadow-xl">
                                <i class="ph ph-clock text-main mr-1.5 flex-shrink-0"></i>
                                <span class="whitespace-nowrap text-sm font-medium">${orePeSaptamana}</span>
                            </div>
                            
                            <!-- Duration tag -->
                            <div class="flex items-center justify-center rounded-full bg-white dark:bg-dark2 px-3 py-1 text-main dark:text-maindark w-full shadow-xl">
                                <i class="ph ph-calendar-dots text-main mr-1.5 flex-shrink-0"></i>
                                <span class="whitespace-nowrap text-sm font-medium">${durata}</span>
                            </div>
                            
                            <!-- Level tag -->
                            <div class="flex items-center justify-center rounded-full bg-white dark:bg-dark2 px-3 py-1 text-main dark:text-maindark w-full shadow-xl">
                                <i class="ph ph-graduation-cap text-main mr-1.5 flex-shrink-0"></i>
                                <span class="whitespace-nowrap text-sm font-medium">${categorie}</span>
                            </div>
                            
                            <!-- Format tag -->
                            <div class="flex items-center justify-center rounded-full bg-white dark:bg-dark2 px-3 py-1 text-main dark:text-maindark w-full shadow-xl">
                                <i class="ph ph-users text-main mr-1.5 flex-shrink-0"></i>
                                <span class="whitespace-nowrap text-sm font-medium">${formatCurs}</span>
                            </div>
                        </div>

                        <!-- Mobile view: horizontal slider -->
                        <div class="md:hidden">
                            <div class="flex gap-3 overflow-x-auto scroll-smooth pb-2 px-1" style="scrollbar-width: thin; scrollbar-color: var(--color-main) transparent;">
                                <!-- Language tag -->
                                <div class="flex items-center justify-center rounded-full bg-white dark:bg-dark2 px-4 py-2.5 text-main dark:text-maindark w-full shadow-lg flex-shrink-0 min-w-[120px]">
                                    <i class="ph-fill ph-globe text-main mr-2 flex-shrink-0"></i>
                                    <span class="whitespace-nowrap text-sm font-medium">${limba}</span>
                                </div>
                                
                                <!-- Hours per day tag -->
                                <div class="flex items-center justify-center rounded-full bg-white dark:bg-dark2 px-4 py-2.5 text-main dark:text-maindark w-full shadow-lg flex-shrink-0 min-w-[120px]">
                                    <i class="ph ph-clock text-main mr-2 flex-shrink-0"></i>
                                    <span class="whitespace-nowrap text-sm font-medium">${orePeZi}</span>
                                </div>
                                
                                <!-- Price tag -->
                                <div class="flex items-center justify-center rounded-full bg-white dark:bg-dark2 px-4 py-2.5 text-main dark:text-maindark w-full shadow-lg flex-shrink-0 min-w-[120px]">
                                    <i class="ph ph-money text-main mr-2 flex-shrink-0"></i>
                                    <span class="whitespace-nowrap text-sm font-medium">Gratis!</span>
                                </div>
                                
                                <!-- Hours per week tag -->
                                <div class="flex items-center justify-center rounded-full bg-white dark:bg-dark2 px-4 py-2.5 text-main dark:text-maindark w-full shadow-lg flex-shrink-0 min-w-[140px]">
                                    <i class="ph ph-clock text-main mr-2 flex-shrink-0"></i>
                                    <span class="whitespace-nowrap text-sm font-medium">${orePeSaptamana}</span>
                                </div>
                                
                                <!-- Duration tag -->
                                <div class="flex items-center justify-center rounded-full bg-white dark:bg-dark2 px-4 py-2.5 text-main dark:text-maindark w-full shadow-lg flex-shrink-0 min-w-[120px]">
                                    <i class="ph ph-calendar-dots text-main mr-2 flex-shrink-0"></i>
                                    <span class="whitespace-nowrap text-sm font-medium">${durata}</span>
                                </div>
                                
                                <!-- Level tag -->
                                <div class="flex items-center justify-center rounded-full bg-white dark:bg-dark2 px-4 py-2.5 text-main dark:text-maindark w-full shadow-lg flex-shrink-0 min-w-[120px]">
                                    <i class="ph ph-graduation-cap text-main mr-2 flex-shrink-0"></i>
                                    <span class="whitespace-nowrap text-sm font-medium">${categorie}</span>
                                </div>
                                
                                <!-- Format tag -->
                                <div class="flex items-center justify-center rounded-full bg-white dark:bg-dark2 px-4 py-2.5 text-main dark:text-maindark w-full shadow-lg flex-shrink-0 min-w-[120px]">
                                    <i class="ph ph-users text-main mr-2 flex-shrink-0"></i>
                                    <span class="whitespace-nowrap text-sm font-medium">${formatCurs}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Update the "What you'll learn" section
        const learnSection = document.getElementById('learn-section');
        if (learnSection) {
            learnSection.innerHTML = `
                <div class="bg-white dark:bg-[#2a2a2a] rounded-xl shadow-xl p-6 flex flex-col gap-4">
                    <p class="text-4xl font-semibold text-main">1</p>
                    <h3 class="text-xl font-semibold">${course.titluInveti1 || 'Concept de bază'}</h3>
                    <p class="text-gray-700 dark:text-gray-300">${course.inveti1 || 'Informație indisponibilă'}</p>
                </div>
                <div class="bg-white dark:bg-[#2a2a2a] rounded-xl shadow-xl p-6 flex flex-col gap-4">
                    <p class="text-4xl font-semibold text-main">2</p>
                    <h3 class="text-xl font-semibold">${course.titluInveti2 || 'Abilități practice'}</h3>
                    <p class="text-gray-700 dark:text-gray-300">${course.inveti2 || 'Informație indisponibilă'}</p>
                </div>
                <div class="bg-white dark:bg-[#2a2a2a] rounded-xl shadow-xl p-6 flex flex-col gap-4">
                    <p class="text-4xl font-semibold text-main">3</p>
                    <h3 class="text-xl font-semibold">${course.titluInveti3 || 'Proiecte reale'}</h3>
                    <p class="text-gray-700 dark:text-gray-300">${course.inveti3 || 'Informație indisponibilă'}</p>
                </div>
            `;
        }

        // Update the schedule section - Desktop view
        const desktopSchedule = document.getElementById('desktop-schedule');
        if (desktopSchedule && course.zileSaptamana && Array.isArray(course.zileSaptamana)) {
            desktopSchedule.innerHTML = `
                <tr class="bg-white dark:bg-[#2a2a2a]">
                    ${course.zileSaptamana.map(hour => `
                        <td class="py-6 px-4 text-gray-700 dark:text-gray-300">${hour || ''}</td>
                    `).join('')}
                </tr>
            `;
        }

        // Update the schedule section - Mobile view
        const mobileSchedule = document.getElementById('mobile-schedule');
        if (mobileSchedule && course.zileSaptamana && Array.isArray(course.zileSaptamana)) {
            const dayLetters = ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D'];
            mobileSchedule.innerHTML = dayLetters.map((letter, index) => `
                <tr class="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <td class="py-4 px-4 text-left font-semibold bg-main text-white">${letter}</td>
                    <td class="py-4 px-4 text-right">${course.zileSaptamana[index] || ''}</td>
                </tr>
            `).join('');
        }

        // Setup the FAQ section
        const faqContainer = document.getElementById('faq-container');
        if (faqContainer) {
            const commonFaqs = faqData.common || [];
            const courseFaqs = (faqData.courses && faqData.courses[course.id]) 
                ? faqData.courses[course.id].map(faq => ({
                    ...faq,
                    answer: faq.answer
                        .replace('{inveti1}', course.inveti1 || '')
                        .replace('{inveti2}', course.inveti2 || '')
                        .replace('{inveti3}', course.inveti3 || '')
                        .replace('{ore}', course.ore || '')
                }))
                : [];

            const allFaqs = [...courseFaqs, ...commonFaqs];

            const faqHtml = `
                <div>
                    <h2 class="mb-4 text-3xl font-bold normal-case md:text-4xl font-satoshi tracking-wide">
                        Întrebări Frecvente
                    </h2>
                    <p class="text-lg md:text-xl">
                        Află mai multe detalii despre cursul ${course.name}
                    </p>
                </div>
                <div>
                    ${allFaqs.map((faq, index) => `
                        <div class="flex-col items-stretch justify-start border-b border-solid border-b-gray-200">
                            <div class="flex cursor-pointer items-center justify-between px-4 py-4 md:pb-7 md:pt-3">
                                <p class="text-lg font-medium md:text-xl select-none">
                                    ${faq.question}
                                </p>
                                <div class="ml-6 flex h-6 w-7 self-start md:w-6">
                                    <div class="transition duration-500">
                                        <svg width="100%" height="100%" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path fill-rule="evenodd" clip-rule="evenodd" d="M16.5303 20.8839C16.2374 21.1768 15.7626 21.1768 15.4697 20.8839L7.82318 13.2374C7.53029 12.9445 7.53029 12.4697 7.82318 12.1768L8.17674 11.8232C8.46963 11.5303 8.9445 11.5303 9.2374 11.8232L16 18.5858L22.7626 11.8232C23.0555 11.5303 23.5303 11.5303 23.8232 11.8232L24.1768 12.1768C24.4697 12.4697 24.4697 12.9445 24.1768 13.2374L16.5303 20.8839Z" fill="currentColor"></path>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <div class="pl-4 pr-4 sm:pl-4 faq-content">
                                <p class="mb-10 select-none">
                                    ${faq.answer}
                                </p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            faqContainer.innerHTML = faqHtml;

            initializeFAQInteractions();
        }
        
        // Setup button according to auth state
        setupEnrollButton();
        
        console.log("Course UI rendering complete");
        
    } catch (error) {
        console.error('Error in renderCourseUI:', error);
        throw error;
    }
}

// Setup the enrollment button
function setupEnrollButton() {
    // Check if user is authenticated
    onAuthStateChanged(auth, async (user) => {
        const enrollButton = document.getElementById('enroll-button');
        if (!enrollButton) return;

        console.log("Auth state changed:", user ? "logged in" : "logged out");
        
        if (user) {
            // User is logged in - check if already enrolled
            enrollButton.disabled = true;
            enrollButton.textContent = "Se verifică...";
            
            const hasEnrollment = await updateEnrollmentButtonState();
            
            // If no existing enrollment, button state will already be updated by updateEnrollmentButtonState
            if (!hasEnrollment) {
                // Add click handler
                enrollButton.onclick = function() {
                    handleDirectEnrollment(user, currentCourseData);
                };
            }
        } else {
            // User is not logged in
            enrollButton.disabled = true;
            enrollButton.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'cursor-pointer');
            enrollButton.classList.add('bg-gray-400', 'cursor-not-allowed');
            enrollButton.textContent = "Crează-ți un cont mai întâi";
            
            enrollButton.onclick = function() {
                alert("Pentru a te înscrie, te rugăm să te loghezi mai întâi!");
            };
        }
    });
}

// Handle enrollment directly without relying on form
async function handleDirectEnrollment(user, course) {
    try {
        console.log("Starting direct enrollment for user:", user.uid);
        
        // Validate course data
        if (!course) {
            throw new Error("Datele cursului nu sunt disponibile. Reîncărcați pagina și încercați din nou.");
        }
        
        // Get the button and change its state
        const enrollButton = document.getElementById('enroll-button');
        if (enrollButton) {
            enrollButton.disabled = true;
            enrollButton.textContent = "Se procesează...";
        }
        
        // Get course details
        const courseId = course.id;
        if (!courseId) {
            throw new Error("ID-ul cursului lipsește.");
        }
        
        // Check for existing enrollment
        const enrollmentCheck = await checkExistingEnrollment(user.uid, courseId);
        
        if (enrollmentCheck.exists) {
            // User already has an enrollment for this course
            const statusText = enrollmentCheck.status === 'approved' 
                ? 'Ești deja înscris la acest curs' 
                : 'Ai deja o cerere în așteptare';
            
            if (enrollButton) {
                enrollButton.disabled = true;
                enrollButton.textContent = statusText;
                enrollButton.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'cursor-pointer');
                enrollButton.classList.add('bg-gray-400', 'cursor-not-allowed');
            }
            
            return false;
        }
        
        // Enhanced profile completeness check
        const isProfileComplete = await isUserProfileComplete(user.uid);
        
        if (!isProfileComplete) {
            console.log("User profile incomplete, redirecting to registration step 2");
            // Store current course ID in localStorage to return after registration
            localStorage.setItem(STORAGE_KEYS.PENDING_COURSE, courseId);
            
            // Show notification to user
            alert("Pentru a te înscrie la acest curs, trebuie să completezi profilul tău. Vei fi redirecționat către pagina de completare a profilului.");
            
            // Reset button state before redirecting
            if (enrollButton) {
                enrollButton.disabled = false;
                enrollButton.textContent = "Înscrie-te Acum!";
            }
            
            // Redirect to profile completion page
            window.location.href = '/register-step2.html';
            return false;
        }
        
        // Get user data for form fields
        let userData = null;
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            userData = userDoc.exists() ? userDoc.data() : null;
        } catch (profileError) {
            console.error("Error fetching user profile:", profileError);
            // Continue anyway with available data
        }
        
        // Get the course name
        const courseName = course.name || "Curs necunoscut";
        
        console.log("Course details:", { courseId, courseName });

        // Prepare enrollment data - first try to get it from the form
        let formData = null;
        const form = document.getElementById('form');
        if (form) {
            formData = new FormData(form);
        } else {
            // If no form found, create a FormData object with user profile data
            formData = new FormData();
            
            // Use user profile data
            let lastName = '';
            let firstName = '';
            let phone = '';
            
            if (userData) {
                lastName = userData.lastName || '';
                firstName = userData.firstName || '';
                phone = userData.phone || '';
            } else {
                // Try to get from displayName
                const displayName = user.displayName || '';
                const nameParts = displayName.split(' ');
                lastName = nameParts[0] || '';
                firstName = nameParts.slice(1).join(' ') || '';
            }
            
            formData.append('numeCurs', courseName);
            formData.append('Numele', lastName);
            formData.append('Prenumele', firstName);
            formData.append('Email', user.email);
            formData.append('Telefon', phone || user.phoneNumber || '');
        }
        
        // Create enrollment data object
        const totalSpots = course.locuri || 0;
        const approvedEnrollments = course.approvedEnrollments || 0;
        const remainingSpots = Math.max(0, totalSpots - approvedEnrollments);
        const isWaitlist = remainingSpots <= 0;
        
        const enrollmentData = {
            userId: user.uid,
            courseId: courseId,
            courseName: courseName,
            userName: `${formData.get('Numele')} ${formData.get('Prenumele')}`,
            email: formData.get('Email'),
            phone: formData.get('Telefon'),
            birthDate: userData ? userData.birthDate : null,
            occupation: userData ? userData.occupation : null,
            education: userData ? userData.education : null,
            enrollmentDate: new Date(),
            status: "pending", // For admin approval
            isWaitlist: isWaitlist // Flag for waitlist entries
        };
        
        console.log("Saving enrollment:", enrollmentData);
        
        // Save to Firestore
        const docRef = await addDoc(collection(db, "enrollments"), {
            ...enrollmentData,
            enrollmentDate: serverTimestamp()
        });
        
        console.log("Enrollment saved with ID:", docRef.id);
        
        // Try to submit to web3forms if available
        try {
            // Convert FormData to object for web3forms API
            const formDataObj = {};
            formData.forEach((value, key) => {
                formDataObj[key] = value;
            });
            
            formDataObj.courseId = courseId;
            formDataObj.courseName = courseName;
            formDataObj.status = "pending";
            formDataObj.isWaitlist = isWaitlist;
            formDataObj.access_key = "d2ea775a-2d42-4a7c-83ff-6f78358eef87";
            
            console.log("Submitting to web3forms:", formDataObj);
            
            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formDataObj)
            });
            
            const responseData = await response.json();
            console.log("Web3Forms response:", responseData);
        } catch (webformError) {
            console.error("Web3Forms error (non-critical):", webformError);
            // Continue even if web3forms fails
        }
        
        // Show success modal instead of alert
        createSuccessModal(isWaitlist);
        
        // Reset button state
        if (enrollButton) {
            enrollButton.disabled = false;
            enrollButton.textContent = "Înregistrează-mă";
        }
        
        return true;
    } catch (error) {
        console.error("Error in handleDirectEnrollment:", error);
        
        // Reset button state
        const enrollButton = document.getElementById('enroll-button');
        if (enrollButton) {
            enrollButton.disabled = false;
            enrollButton.textContent = "Înregistrează-mă";
        }
        
        alert(`Eroare la înregistrare: ${error.message}`);
        return false;
    }
}

async function handleEnrollmentSubmit(event) {
    event.preventDefault();
    
    if (!auth.currentUser) {
        showAlert('Trebuie să fiți autentificat pentru a vă înscrie la curs.', 'error');
        return;
    }
    
    const courseId = new URLSearchParams(window.location.search).get('id');
    if (!courseId) {
        showAlert('ID-ul cursului nu a fost găsit.', 'error');
        return;
    }
    
    // Check if user already has a pending or approved request for this course
    const enrollmentsRef = collection(db, 'enrollments');
    const q = query(
        enrollmentsRef,
        where('userId', '==', auth.currentUser.uid),
        where('courseId', '==', courseId)
    );
    
    try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const existingEnrollment = querySnapshot.docs[0].data();
            if (existingEnrollment.status === 'approved') {
                showAlert('Sunteți deja înscris la acest curs.', 'info');
            } else if (existingEnrollment.status === 'pending') {
                showAlert('Ați trimis deja o cerere pentru acest curs. Vă rugăm să așteptați răspunsul administratorului.', 'info');
            }
            return;
        }
        
        // If no existing enrollment, proceed with the new request
        const formData = new FormData(event.target);
        const enrollmentData = {
            userId: auth.currentUser.uid,
            userName: auth.currentUser.displayName || 'Utilizator',
            email: auth.currentUser.email,
            courseId: courseId,
            courseName: document.querySelector('h1')?.textContent || 'Curs',
            phone: formData.get('phone'),
            birthDate: formData.get('birthDate'),
            occupation: formData.get('occupation'),
            education: formData.get('education'),
            status: 'pending',
            enrollmentDate: serverTimestamp(),
            notes: formData.get('notes') || ''
        };
        
        await addDoc(collection(db, 'enrollments'), enrollmentData);
        showAlert('Cererea dvs. a fost trimisă cu succes! Vă vom contacta în curând.', 'success');
        event.target.reset();
        
    } catch (error) {
        console.error('Error submitting enrollment:', error);
        showAlert('A apărut o eroare la trimiterea cererii. Vă rugăm să încercați din nou.', 'error');
    }
}

// Update the enrollment button state based on existing enrollment
async function updateEnrollmentButtonState() {
    const courseId = new URLSearchParams(window.location.search).get('id');
    if (!courseId || !auth.currentUser) return false;
    
    console.log("Updating enrollment button state for course:", courseId);
    
    const enrollButton = document.getElementById('enroll-button');
    if (!enrollButton) return false;
    
    // First check if user profile is complete
    const isProfileComplete = await isUserProfileComplete(auth.currentUser.uid);
    
    if (!isProfileComplete) {
        enrollButton.disabled = false;
        enrollButton.classList.remove('bg-gray-400', 'cursor-not-allowed');
        enrollButton.classList.add('bg-blue-600', 'hover:bg-blue-700', 'cursor-pointer');
        enrollButton.textContent = "Înscrie-te Acum!";
        
        // Add click handler to redirect to profile completion
        enrollButton.onclick = function() {
            localStorage.setItem(STORAGE_KEYS.PENDING_COURSE, courseId);
            alert("Pentru a te înscrie la acest curs, trebuie să completezi profilul tău. Vei fi redirecționat către pagina de completare a profilului.");
            window.location.href = '/register-step2.html';
        };
        
        return false;
    }
    
    // Then check existing enrollment
    const enrollmentCheck = await checkExistingEnrollment(auth.currentUser.uid, courseId);
    
    if (enrollmentCheck.exists) {
        // User has an existing enrollment
        if (enrollmentCheck.status === 'approved') {
            enrollButton.textContent = 'Ești deja înscris la acest curs';
        } else if (enrollmentCheck.status === 'pending') {
            enrollButton.textContent = 'Ai deja o cerere în așteptare';
        } else if (enrollmentCheck.status === 'rejected') {
            enrollButton.textContent = 'Cererea ta a fost respinsă';
        } else if (enrollmentCheck.status === 'waitlist') {
            enrollButton.textContent = 'Ești pe lista de așteptare';
        }
        
        enrollButton.disabled = true;
        enrollButton.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'cursor-pointer');
        enrollButton.classList.add('bg-gray-400', 'cursor-not-allowed');
        return true; // Return true to indicate existing enrollment
    } else {
        // No existing enrollment - enable the button
        enrollButton.disabled = false;
        enrollButton.classList.remove('bg-gray-400', 'cursor-not-allowed');
        enrollButton.classList.add('bg-blue-600', 'hover:bg-blue-700', 'cursor-pointer');
        enrollButton.textContent = "Înscrie-te Acum!";
        
        // Add click handler for normal enrollment
        enrollButton.onclick = function() {
            handleDirectEnrollment(auth.currentUser, currentCourseData);
        };
        
        return false; // Return false to indicate no existing enrollment
    }
}

// Call this function when the page loads and when auth state changes
document.addEventListener('DOMContentLoaded', () => {
    // ... existing code ...
    
    // Add auth state observer to update button state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            updateEnrollmentButtonState();
        }
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
    const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');

    if (themeToggleBtn && themeToggleDarkIcon && themeToggleLightIcon) {
        function applyTheme(theme) {
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
                themeToggleDarkIcon.classList.add('hidden');
                themeToggleLightIcon.classList.remove('hidden');
            } else {
                document.documentElement.classList.remove('dark');
                themeToggleDarkIcon.classList.remove('hidden');
                themeToggleLightIcon.classList.add('hidden');
            }
        }

        function handleTheme() {
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
        }

        handleTheme();

        themeToggleBtn.addEventListener('click', () => {
            if (document.documentElement.classList.contains('dark')) {
                localStorage.setItem('color-theme', 'light');
                applyTheme('light');
            } else {
                localStorage.setItem('color-theme', 'dark');
                applyTheme('dark');
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const themeToggleBtn = document.getElementById('theme-toggle2');
    const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon2');
    const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon2');

    if (themeToggleBtn && themeToggleDarkIcon && themeToggleLightIcon) {
        function applyTheme2(theme) {
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
                themeToggleDarkIcon.classList.add('hidden');
                themeToggleLightIcon.classList.remove('hidden');
            } else {
                document.documentElement.classList.remove('dark');
                themeToggleDarkIcon.classList.remove('hidden');
                themeToggleLightIcon.classList.add('hidden');
            }
        }

        function handleTheme2() {
            const savedTheme = localStorage.getItem('color-theme');
            if (savedTheme) {
                applyTheme2(savedTheme);
            } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                applyTheme2('dark');
                localStorage.setItem('color-theme', 'dark');
            } else {
                applyTheme2('light');
                localStorage.setItem('color-theme', 'light');
            }
        }

        handleTheme2();
        
        themeToggleBtn.addEventListener('click', () => {
            if (document.documentElement.classList.contains('dark')) {
                localStorage.setItem('color-theme', 'light');
                applyTheme2('light');
            } else {
                localStorage.setItem('color-theme', 'dark');
                applyTheme2('dark');
            }
        });
    }
});
// Initialize FAQ interactions
function initializeFAQInteractions() {
    const faqItems = document.querySelectorAll('.flex-col.items-stretch');
    
    faqItems.forEach(item => {
        const header = item.querySelector('.flex.cursor-pointer');
        const content = item.querySelector('.pl-4.pr-4');
        const arrow = item.querySelector('.transition');
        
        if (!header || !content || !arrow) return;
        
        content.style.maxHeight = '0';
        content.style.overflow = 'hidden';
        content.style.transition = 'max-height 0.3s ease-out';
        arrow.style.transition = 'transform 0.3s ease-out';
        arrow.style.transform = 'rotate(0deg)';
        
        header.addEventListener('click', () => {
            const isActive = content.style.maxHeight !== '0px';
            
            faqItems.forEach(otherItem => {
                const otherContent = otherItem.querySelector('.pl-4.pr-4');
                const otherArrow = otherItem.querySelector('.transition');
                
                if (otherContent && otherArrow) {
                    otherContent.style.maxHeight = '0px';
                    otherArrow.style.transform = 'rotate(0deg)';
                }
            });
            
            if (!isActive) {
                content.style.maxHeight = content.scrollHeight + 'px';
                arrow.style.transform = 'rotate(180deg)';
            }
        });
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM content loaded in curs.js");
    
    // Render course details (which will setup the button)
    renderCourseDetails();
    
    // Check enrollment status if user is logged in
    if (auth.currentUser) {
        updateEnrollmentButtonState();
    }
});

console.log("Curs.js loaded successfully");