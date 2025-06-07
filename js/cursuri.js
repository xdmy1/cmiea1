// =================================================================
// cursuri.js - Optimized for Performance
// =================================================================

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs,
    limit,
    getCountFromServer,
    orderBy
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Initialize Firebase
console.log("Cursuri.js loading...");

const firebaseConfig = {
    apiKey: "AIzaSyBoWwArqP6pYGvVSBzCbUnOphhzk0Pi9oQ",
    authDomain: "tekwill-441fe.firebaseapp.com",
    projectId: "tekwill-441fe",
    storageBucket: "tekwill-441fe.firebasestorage.app",
    messagingSenderId: "990223834307",
    appId: "1:990223834307:web:c1a9da67d5e5f070db1676"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firestore instance
console.log("Firestore instance created in cursuri.js");

// Cache for enrollment counts and courses
const cache = {
    courses: [],
    enrollments: {},
    timestamp: null,
    maxAge: 5 * 60 * 1000 // 5 minutes cache lifetime
};

/**
 * Batch function to get enrollment counts for multiple courses at once
 * This is much more efficient than making separate queries for each course
 */
async function getEnrollmentCountsForCourses(courseIds) {
    try {
        // Check if we already have some of these in cache
        const uncachedIds = courseIds.filter(id => 
            !cache.enrollments[id] || 
            Date.now() - (cache.enrollments[id].timestamp || 0) > cache.maxAge
        );
        
        // If all IDs are cached and fresh, return from cache
        if (uncachedIds.length === 0) {
            console.log("Using cached enrollment counts for all courses");
            return courseIds.reduce((acc, id) => {
                acc[id] = cache.enrollments[id].count;
                return acc;
            }, {});
        }
        
        // Only query for uncached IDs
        console.log(`Fetching enrollment counts for ${uncachedIds.length} courses`);
        
        // Firestore limits "in" queries to 10 values, so we batch in groups of 10
        const batchSize = 10;
        const batches = [];
        
        for (let i = 0; i < uncachedIds.length; i += batchSize) {
            const batchIds = uncachedIds.slice(i, i + batchSize);
            batches.push(batchIds);
        }
        
        // Process each batch
        const batchResults = {};
        await Promise.all(batches.map(async batchIds => {
            if (batchIds.length === 0) return;
            
            const enrollmentsRef = collection(db, "enrollments");
            const q = query(
                enrollmentsRef,
                where("courseId", "in", batchIds),
                where("status", "==", "approved")
            );
            
            const snapshot = await getDocs(q);
            
            // Count enrollments per course
            snapshot.forEach(doc => {
                const data = doc.data();
                const courseId = data.courseId;
                batchResults[courseId] = (batchResults[courseId] || 0) + 1;
            });
            
            // Ensure all queried IDs have a count (even if 0)
            batchIds.forEach(id => {
                if (batchResults[id] === undefined) {
                    batchResults[id] = 0;
                }
                
                // Update cache
                cache.enrollments[id] = {
                    count: batchResults[id],
                    timestamp: Date.now()
                };
            });
        }));
        
        // Combine cached and newly fetched counts
        const result = courseIds.reduce((acc, id) => {
            acc[id] = cache.enrollments[id]?.count || 0;
            return acc;
        }, {});
        
        return result;
    } catch (error) {
        console.error("Error getting enrollment counts:", error);
        return courseIds.reduce((acc, id) => {
            acc[id] = 0;
            return acc;
        }, {});
    }
}

// Mobile navigation setup
document.getElementById("burger")?.addEventListener("click", function() {
    document.getElementById("phone-nav")?.classList.remove("hidden");
});

document.getElementById("close")?.addEventListener("click", function() {
    document.getElementById("phone-nav")?.classList.add("hidden");
});

// Setup theme toggle and initialize data when DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
    console.log("DOMContentLoaded triggered");
    
    // Setup theme toggle first for better UI experience
    setupThemeToggle();
    
    // Add filter event listeners with debounce
    setupFilterListeners();
    
    // Load courses immediately
    loadCourses();
});

// Debounce function to limit filter changes
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function setupFilterListeners() {
    const categoryFilter = document.getElementById('categoryFilter');
    const durationFilter = document.getElementById('durationFilter');
    const languageFilter = document.getElementById('languageFilter');
    
    // Create a debounced version of loadCourses (300ms delay)
    const debouncedLoadCourses = debounce(() => loadCourses(), 300);
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', debouncedLoadCourses);
    }
    
    if (durationFilter) {
        durationFilter.addEventListener('change', debouncedLoadCourses);
    }
    
    if (languageFilter) {
        languageFilter.addEventListener('change', debouncedLoadCourses);
    }
}

function setupThemeToggle() {
    console.log("Setting up theme toggle");
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
    const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');

    if (!themeToggleBtn || !themeToggleDarkIcon || !themeToggleLightIcon) {
        console.log("Theme toggle elements not found");
        return;
    }

    // Apply current theme
    if (localStorage.getItem('color-theme') === 'dark' || 
        (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        themeToggleDarkIcon.classList.add('hidden');
        themeToggleLightIcon.classList.remove('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        themeToggleDarkIcon.classList.remove('hidden');
        themeToggleLightIcon.classList.add('hidden');
    }

    // Toggle theme on click
    themeToggleBtn.addEventListener('click', function() {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
            themeToggleDarkIcon.classList.remove('hidden');
            themeToggleLightIcon.classList.add('hidden');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
            themeToggleDarkIcon.classList.add('hidden');
            themeToggleLightIcon.classList.remove('hidden');
        }
    });
    
    // Setup mobile theme toggle if it exists
    const themeToggleBtn2 = document.getElementById('theme-toggle2');
    if (themeToggleBtn2) {
        const themeToggleDarkIcon2 = document.getElementById('theme-toggle-dark-icon2');
        const themeToggleLightIcon2 = document.getElementById('theme-toggle-light-icon2');
        
        // Apply current theme
        if (localStorage.getItem('color-theme') === 'dark' || 
            (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            themeToggleDarkIcon2?.classList.add('hidden');
            themeToggleLightIcon2?.classList.remove('hidden');
        } else {
            themeToggleDarkIcon2?.classList.remove('hidden');
            themeToggleLightIcon2?.classList.add('hidden');
        }
        
        // Toggle theme on click
        themeToggleBtn2.addEventListener('click', function() {
            if (document.documentElement.classList.contains('dark')) {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('color-theme', 'light');
                themeToggleDarkIcon2?.classList.remove('hidden');
                themeToggleLightIcon2?.classList.add('hidden');
            } else {
                document.documentElement.classList.add('dark');
                localStorage.setItem('color-theme', 'dark');
                themeToggleDarkIcon2?.classList.add('hidden');
                themeToggleLightIcon2?.classList.remove('hidden');
            }
        });
    }
}

async function loadCourses() {
    console.log("Loading courses...");
    const container = document.getElementById('courses-container');
    
    if (!container) {
        console.error("Courses container not found");
        return;
    }
    
    // Show loading indicator
    container.innerHTML = `
        <div class="col-span-full flex justify-center items-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-main"></div>
            <span class="ml-4 text-gray-600 dark:text-gray-400">Se încarcă cursurile...</span>
        </div>
    `;
    
    try {
        // Get filter values
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';
        const durationFilter = document.getElementById('durationFilter')?.value || '';
        const languageFilter = document.getElementById('languageFilter')?.value || '';
        
        // Check if we can use cache
        const useCache = cache.timestamp && 
                         (Date.now() - cache.timestamp < cache.maxAge) && 
                         cache.courses.length > 0;
                         
        let courses = [];
        
        if (useCache) {
            console.log("Using cached courses data");
            // Filter courses from cache
            courses = cache.courses.filter(course => {
                const matchesCategory = !categoryFilter || course.categorie === categoryFilter;
                const matchesDuration = !durationFilter || course.durata === durationFilter;
                const matchesLanguage = !languageFilter || course.limba === languageFilter;
                
                return matchesCategory && matchesDuration && matchesLanguage;
            });
        } else {
            // No valid cache, fetch from Firebase
            console.log("Fetching courses from Firebase");
            
            // Build query with server-side filtering
            const coursesRef = collection(db, 'courses');
            let queryConstraints = [];
            
            if (categoryFilter) {
                queryConstraints.push(where('categorie', '==', categoryFilter));
            }
            if (durationFilter) {
                queryConstraints.push(where('durata', '==', durationFilter));
            }
            if (languageFilter) {
                queryConstraints.push(where('limba', '==', languageFilter));
            }
            
            // Add sorting to ensure consistent results
            queryConstraints.push(orderBy('name', 'asc'));
            
            // Apply query constraints
            const q = queryConstraints.length > 0 
                ? query(coursesRef, ...queryConstraints)
                : query(coursesRef, orderBy('name', 'asc'));
            
            const querySnapshot = await getDocs(q);
            
            // Convert snapshot to array of courses
            courses = [];
            querySnapshot.forEach(doc => {
                courses.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // If no filters are applied, update the full cache
            if (!categoryFilter && !durationFilter && !languageFilter) {
                cache.courses = courses;
                cache.timestamp = Date.now();
                console.log("Updated courses cache with", courses.length, "courses");
            }
        }
        
        console.log("Found courses:", courses.length);
        
        // If no courses found, show message
        if (courses.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8">
                    Nu există cursuri care să corespundă filtrelor selectate
                </div>
            `;
            return;
        }
        
        // Get course IDs for batch enrollment query
        const courseIds = courses.map(course => course.id);
        
        // Get all enrollment counts in one batch operation
        const enrollmentCounts = await getEnrollmentCountsForCourses(courseIds);
        
        // Prepare HTML for all courses
        let coursesHTML = '';
        
        // Render all courses with enrollment counts
        courses.forEach(course => {
            // Calculate remaining spots
            const totalSpots = parseInt(course.locuri) || 0;
            const approvedEnrollments = enrollmentCounts[course.id] || 0;
            const remainingSpots = Math.max(0, totalSpots - approvedEnrollments);
            
            // Create HTML for this course - with unbounded icons (no width/height limits)
            coursesHTML += `
                <a href="/curs.html?id=${course.id}">
                    <div class="grid grid-cols-1 gap-4 p-5 dark:bg-dark2 dark:border-white/50 rounded-2xl h-full z-10 hover:bg-black/10 dark:hover:bg-gray-100/10 bg-white duration-200 shadow-xl">
                        <div class="flex justify-start items-center gap-3 font-medium">
                            <div class="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden shadow-sm">
                                <img src="${course.image || '/assets/default-course.png'}" class="w-full h-full object-cover" alt="Course">
                            </div>
                            <div><p class="lg:text-xl dark:text-white">${course.name || 'Curs fără nume'}</p></div>
                        </div>
                        <div class="max-w-[250px]">
                            <p class="text-sm lg:text-md 2xl:text-lg text-sur dark:text-white/50">${course.description || 'Nu există descriere disponibilă'}</p>
                        </div>

                        <!-- Course details section - icons are not limited now -->
                        <div class="flex justify-between text-xs dark:text-white/70">
                            <div class="flex flex-col gap-1">
                                <div class="flex gap-1 items-center">
                                    <i class="ph ph-clock text-xl text-main"></i>
                                    <p class="lg:text-md 2xl:text-lg">${course.ore || 0} ore</p>
                                </div>
                                <div class="flex gap-1 items-center">
                                    <i class="ph ph-target text-xl text-main"></i>
                                    <p class="lg:text-md 2xl:text-lg">${course.categorie || 'Începător'}</p>
                                </div>
                            </div>
                            <div class="flex flex-col gap-1">
                                <div class="flex gap-1 items-center">
                                    <i class="ph ph-user text-xl text-main"></i>
                                    <p class="lg:text-md 2xl:text-lg">Locuri disponibile: ${remainingSpots > 0 ? remainingSpots : 0}</p>
                                </div>
                                <div class="flex gap-1 items-center">
                                    <i class="ph ph-calendar-dots text-xl text-main"></i>
                                    <p class="lg:text-md 2xl:text-lg">${course.perioada || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </a>
            `;
        });
        
        // Update the DOM once with all courses
        container.innerHTML = coursesHTML;
        
        console.log("Course rendering complete");
    } catch (error) {
        console.error("Error loading courses:", error);
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-red-500">
                <p>Nu s-au putut încărca cursurile. Vă rugăm să încercați din nou mai târziu.</p>
                <p class="text-sm mt-2">Eroare: ${error.message}</p>
            </div>
        `;
    }
}

// Log when script finishes loading
console.log("Cursuri.js loaded successfully");