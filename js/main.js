// Import Firebase modules at the top
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs,
    doc,
    getDoc,
    getCountFromServer,
    limit,
    startAfter,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

console.log("Main.js loading...");

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

// Global variables
let currentPage = 1;
const itemsPerPage = 6;
let allCourses = []; // This will store all courses for search functionality
let lastDocumentSnapshot = null; // For pagination
let courseCache = {
    data: null,
    timestamp: null,
    maxAge: 5 * 60 * 1000, // 5 minutes
    enrollmentCounts: {} // Cache for enrollment counts
};

// ===== NAVIGATION FUNCTIONALITY =====
document.getElementById("burger")?.addEventListener("click", function () {
    document.getElementById("phone-nav")?.classList.remove("hidden");
});

document.getElementById("close")?.addEventListener("click", function () {
    document.getElementById("phone-nav")?.classList.add("hidden");
});

// ===== FIREBASE FUNCTIONS =====

/**
 * Efficient batch method to get enrollment counts for multiple courses
 * @param {Array} courseIds - Array of course IDs to get counts for
 * @returns {Promise<Object>} - Object mapping course IDs to enrollment counts
 */
async function getEnrollmentCountsForCourses(courseIds) {
    try {
        // Check if we already have some of these in cache
        const uncachedIds = courseIds.filter(id => 
            !courseCache.enrollmentCounts[id] || 
            Date.now() - (courseCache.enrollmentCounts[id].timestamp || 0) > courseCache.maxAge
        );
        
        // If all IDs are cached and fresh, return from cache
        if (uncachedIds.length === 0) {
            console.log("Using cached enrollment counts for all courses");
            return courseIds.reduce((acc, id) => {
                acc[id] = courseCache.enrollmentCounts[id].count;
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
                courseCache.enrollmentCounts[id] = {
                    count: batchResults[id],
                    timestamp: Date.now()
                };
            });
        }));
        
        // Combine cached and newly fetched counts
        const result = courseIds.reduce((acc, id) => {
            acc[id] = courseCache.enrollmentCounts[id]?.count || 0;
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

/**
 * Get the count of approved enrollments for a specific course - for single course details
 */
async function getApprovedEnrollmentsCount(courseId) {
    try {
        // Check cache first
        if (courseCache.enrollmentCounts[courseId] && 
            Date.now() - courseCache.enrollmentCounts[courseId].timestamp < courseCache.maxAge) {
            console.log(`Using cached enrollment count for course ${courseId}`);
            return courseCache.enrollmentCounts[courseId].count;
        }
        
        console.log("Counting approved enrollments for course:", courseId);
        
        const enrollmentsRef = collection(db, "enrollments");
        const q = query(
            enrollmentsRef,
            where("courseId", "==", courseId),
            where("status", "==", "approved")
        );
        
        const snapshot = await getCountFromServer(q);
        const count = snapshot.data().count;
        
        // Update cache
        courseCache.enrollmentCounts[courseId] = {
            count: count,
            timestamp: Date.now()
        };
        
        console.log(`Found ${count} approved enrollments for course ${courseId}`);
        return count;
    } catch (error) {
        console.error("Error counting approved enrollments:", error);
        return 0; // Return 0 if there's an error
    }
}

/**
 * Load all courses from Firebase for search functionality with caching
 */
async function loadAllCourses() {
    try {
        // Check if we have valid cached data
        if (courseCache.data && (Date.now() - courseCache.timestamp) < courseCache.maxAge) {
            console.log("Using cached course data for search");
            return courseCache.data;
        }
        
        console.log("Loading all courses for search...");
        
        const coursesRef = collection(db, 'courses');
        const querySnapshot = await getDocs(coursesRef);
        
        allCourses = []; // Clear existing courses
        
        querySnapshot.forEach((doc) => {
            const courseData = doc.data();
            allCourses.push({
                id: doc.id,
                name: courseData.name || '',
                description: courseData.description || '',
                image: courseData.image || '/assets/default-course.png',
                categorie: courseData.categorie || 'Începător',
                durata: courseData.durata || '',
                limba: courseData.limba || '',
                ore: courseData.ore || 0,
                perioada: courseData.perioada || 'N/A',
                locuri: courseData.locuri || 0
            });
        });
        
        // Store in cache
        courseCache.data = allCourses;
        courseCache.timestamp = Date.now();
        
        console.log(`Loaded ${allCourses.length} courses for search`);
        return allCourses;
        
    } catch (error) {
        console.error('Error loading courses for search:', error);
        allCourses = [];
        return [];
    }
}

/**
 * Load a single course by ID from Firebase
 */
async function loadSingleCourse(courseId) {
    try {
        if (!courseId) {
            console.error('No course ID provided');
            return null;
        }
        
        // Check cache first
        if (courseCache.data) {
            const cachedCourse = courseCache.data.find(course => course.id === courseId);
            if (cachedCourse) {
                console.log("Using cached course data");
                
                // Get enrollment count
                const enrollmentCount = await getApprovedEnrollmentsCount(courseId);
                return { ...cachedCourse, approvedEnrollments: enrollmentCount };
            }
        }
        
        const docRef = doc(db, 'courses', courseId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const courseData = { ...docSnap.data(), id: courseId };
            
            // Get enrollment count
            const enrollmentCount = await getApprovedEnrollmentsCount(courseId);
            courseData.approvedEnrollments = enrollmentCount;
            
            return courseData;
        } else {
            console.error('Course not found');
            return null;
        }
    } catch (error) {
        console.error('Error loading course:', error);
        return null;
    }
}

// ===== COURSE RENDERING FUNCTIONS =====

/**
 * Render all courses in the courses container with pagination
 */
async function renderCourses() {
    try {
        const container = document.getElementById('courses-container');
        
        if (!container) {
            console.error("Courses container not found");
            return;
        }

        // Show loading state
        container.innerHTML = `
            <div class="col-span-full flex justify-center items-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-main"></div>
                <span class="ml-4 text-gray-600 dark:text-gray-400">Se încarcă cursurile...</span>
            </div>
        `;

        // Get filter values
        const categoryFilter = document.getElementById('categoryFilter')?.value || '';
        const durationFilter = document.getElementById('durationFilter')?.value || '';
        const languageFilter = document.getElementById('languageFilter')?.value || '';
        
        // Build query with server-side filtering
        let coursesRef = collection(db, 'courses');
        let queryConstraints = [];
        
        if (categoryFilter) {
            queryConstraints.push(where("categorie", "==", categoryFilter));
        }
        if (durationFilter) {
            queryConstraints.push(where("durata", "==", durationFilter));
        }
        if (languageFilter) {
            queryConstraints.push(where("limba", "==", languageFilter));
        }
        
        // We need to include an orderBy for pagination
        queryConstraints.push(orderBy("name", "asc"));
        
        // Apply filters to query if any exist
        let coursesQuery = query(coursesRef, ...queryConstraints);
        
        // Apply pagination
        if (currentPage > 1 && lastDocumentSnapshot) {
            coursesQuery = query(coursesQuery, startAfter(lastDocumentSnapshot), limit(itemsPerPage));
        } else {
            // First page
            coursesQuery = query(coursesQuery, limit(itemsPerPage));
            // Reset the last document
            lastDocumentSnapshot = null;
        }
        
        // Execute query
        const querySnapshot = await getDocs(coursesQuery);
        
        if (querySnapshot.empty && currentPage === 1) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8">
                    Nu există cursuri disponibile
                </div>
            `;
            return;
        } else if (querySnapshot.empty && currentPage > 1) {
            // If we're on a page beyond available data, go back to page 1
            currentPage = 1;
            renderCourses();
            return;
        }

        // Store the last document for pagination
        lastDocumentSnapshot = querySnapshot.docs[querySnapshot.docs.length - 1];
        
        // Get all course IDs for batch enrollment query
        const courseIds = querySnapshot.docs.map(doc => doc.id);
        
        // Get all enrollment counts in a single batch operation
        const enrollmentCounts = await getEnrollmentCountsForCourses(courseIds);
        
        // Process all courses with enrollment counts
        const courses = querySnapshot.docs.map(doc => {
            const course = { id: doc.id, ...doc.data() };
            const totalSpots = parseInt(course.locuri) || 0;
            const approvedEnrollments = enrollmentCounts[course.id] || 0;
            const remainingSpots = Math.max(0, totalSpots - approvedEnrollments);
            
            return {
                ...course,
                remainingSpots
            };
        });
        
        // Clear container
        container.innerHTML = '';
        
        // Render the courses for current page
        if (courses.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8 dark:text-white">
                    Nu există cursuri care să corespundă filtrelor selectate
                </div>
            `;
        } else {
            // Prepare all course HTML in a single string to avoid multiple DOM updates
            let coursesHTML = '';
            
            courses.forEach(course => {
                // Improved course element with unbounded icon
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
                                        <p class="lg:text-md 2xl:text-lg">Locuri disponibile: ${course.remainingSpots > 0 ? course.remainingSpots : 0}</p>
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
            
            // Add all courses to the DOM at once
            container.innerHTML = coursesHTML;
        }

        // Get total count for pagination
        const countQuery = query(coursesRef, ...queryConstraints.filter(c => c.type !== 'limit' && c.type !== 'startAfter'));
        const countSnapshot = await getCountFromServer(countQuery);
        const totalCount = countSnapshot.data().count;
        const totalPages = Math.ceil(totalCount / itemsPerPage);

        // Render pagination controls if there are multiple pages
        if (totalPages > 1) {
            renderPagination(totalPages, totalCount);
        } else {
            // Clear pagination if only one page
            const paginationContainer = document.getElementById('pagination-container');
            if (paginationContainer) {
                paginationContainer.innerHTML = '';
            }
        }

        // Load courses for search after rendering
        await loadAllCourses();

    } catch (error) {
        console.error('Error loading courses:', error);
        if (container) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8 text-red-500">
                    <p>Nu s-au putut încărca cursurile. Vă rugăm să încercați din nou mai târziu.</p>
                    <p class="text-sm mt-2">Eroare: ${error.message}</p>
                </div>
            `;
        }
    }
}

/**
 * Display course details on the course detail page
 */
function displayCourseDetails(course) {
    const titleElement = document.getElementById('course-title');
    const descriptionElement = document.getElementById('course-description');
    const imageElement = document.getElementById('course-image');
    
    if (titleElement) titleElement.textContent = course.name;
    if (descriptionElement) descriptionElement.textContent = course.description;
    if (imageElement) imageElement.src = course.image;
}

// ===== PAGINATION =====

/**
 * Render pagination controls
 */
function renderPagination(totalPages, totalCount) {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = '';
    
    // Create a document fragment to avoid multiple DOM updates
    const fragment = document.createDocumentFragment();
    
    // Create pagination container
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'flex justify-center gap-2 mt-8';
    
    // Add previous button if not on first page
    if (currentPage > 1) {
        const prevButton = document.createElement('button');
        prevButton.className = 'hidden md:block px-4 py-2 rounded-lg bg-white border border-gray-300 dark:bg-dark2 dark:border-neutral-800 hover:bg-gray-100 dark:hover:bg-gray-700/10';
        prevButton.textContent = 'Previous';
        prevButton.onclick = () => changePage(currentPage - 1);
        paginationDiv.appendChild(prevButton);
    }
    
    // Add page buttons
    const maxVisiblePages = 5; // Show at most 5 page buttons
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Add first page button if not visible
    if (startPage > 1) {
        const firstPageButton = document.createElement('button');
        firstPageButton.className = 'px-4 py-2 rounded-lg border border-gray-300 bg-white dark:bg-dark2 dark:border-neutral-800 hover:bg-gray-100 dark:hover:bg-gray-700/10';
        firstPageButton.textContent = '1';
        firstPageButton.onclick = () => changePage(1);
        paginationDiv.appendChild(firstPageButton);
        
        // Add ellipsis if needed
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'px-2 py-2 flex items-center';
            ellipsis.textContent = '...';
            paginationDiv.appendChild(ellipsis);
        }
    }
    
    // Add page buttons
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = `px-4 py-2 rounded-lg ${currentPage === i ? 'bg-main dark:bg-maindark text-white' : 'border border-gray-300 bg-white dark:bg-dark2 dark:border-neutral-800 hover:bg-gray-100 dark:hover:bg-gray-700/10'}`;
        pageButton.textContent = i.toString();
        pageButton.onclick = () => changePage(i);
        paginationDiv.appendChild(pageButton);
    }
    
    // Add ellipsis and last page button if needed
    if (endPage < totalPages) {
        // Add ellipsis
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'px-2 py-2 flex items-center';
            ellipsis.textContent = '...';
            paginationDiv.appendChild(ellipsis);
        }
        
        // Add last page button
        const lastPageButton = document.createElement('button');
        lastPageButton.className = 'px-4 py-2 rounded-lg border border-gray-300 bg-white dark:bg-dark2 dark:border-neutral-800 hover:bg-gray-100 dark:hover:bg-gray-700/10';
        lastPageButton.textContent = totalPages.toString();
        lastPageButton.onclick = () => changePage(totalPages);
        paginationDiv.appendChild(lastPageButton);
    }
    
    // Add next button if not on last page
    if (currentPage < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.className = 'hidden md:block px-4 py-2 rounded-lg border border-gray-300 bg-white dark:bg-dark2 dark:border-neutral-800 hover:bg-gray-100 dark:hover:bg-gray-700/10';
        nextButton.textContent = 'Next';
        nextButton.onclick = () => changePage(currentPage + 1);
        paginationDiv.appendChild(nextButton);
    }
    
    // Add page info
    const pageInfo = document.createElement('div');
    pageInfo.className = 'text-center text-sm text-gray-500 dark:text-gray-400 mt-2';
    pageInfo.textContent = `Pagina ${currentPage} din ${totalPages} (${totalCount} cursuri)`;
    
    // Add elements to the fragment
    fragment.appendChild(paginationDiv);
    fragment.appendChild(pageInfo);
    
    // Add the fragment to the container
    paginationContainer.appendChild(fragment);
}

/**
 * Change to a specific page
 */
function changePage(page) {
    if (page === currentPage) return; // No need to reload the same page
    
    currentPage = page;
    renderCourses();
    document.getElementById('courses-container')?.scrollIntoView({ behavior: 'smooth' });
}

// ===== SEARCH FUNCTIONALITY =====

// Define these at the global scope to ensure access throughout the file
let searchInput = null;
let searchDropdown = null;

/**
 * Handle search input and display results
 */
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    
    console.log("Search term:", searchTerm);
    
    if (searchTerm.length === 0) {
        searchDropdown.classList.add('hidden');
        return;
    }
    
    if (allCourses.length === 0) {
        // Load courses first if not already loaded
        loadAllCourses().then(courses => {
            allCourses = courses;
            performSearch(searchTerm);
        });
        
        searchDropdown.innerHTML = `
            <div class="p-4 text-center text-sur dark:text-white/50">
                <div class="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-main mx-auto mb-2"></div>
                Cursurile se încarcă...
            </div>
        `;
        searchDropdown.classList.remove('hidden');
        return;
    }
    
    performSearch(searchTerm);
}

/**
 * Actually perform the search with the given term
 */
function performSearch(searchTerm) {
    // Filter courses efficiently
    const filteredCourses = allCourses.filter(course => {
        // Only check fields that actually exist
        const nameMatch = course.name && course.name.toLowerCase().includes(searchTerm);
        const descMatch = course.description && course.description.toLowerCase().includes(searchTerm);
        const categoryMatch = course.categorie && course.categorie.toLowerCase().includes(searchTerm);
        
        return nameMatch || descMatch || categoryMatch;
    });
    
    console.log("Filtered courses:", filteredCourses.length);
    
    if (filteredCourses.length > 0) {
        // Build HTML string for better performance
        let resultsHTML = '';
        
        // Show only top 5 results to avoid too much DOM content
        filteredCourses.slice(0, 5).forEach(course => {
            resultsHTML += `
                <a href="/curs.html?id=${course.id}" class="block">
                    <div class="p-4 hover:bg-black/10 dark:hover:bg-gray-100/10 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                        <div class="flex items-center gap-3">
                            <img src="${course.image}" class="w-10 h-10 object-cover flex-shrink-0" alt="Course" onerror="this.src='/assets/default-course.png'">
                            <p class="text-sm font-medium dark:text-white text-gray-900 truncate">${course.name}</p>
                        </div>
                    </div>
                </a>
            `;
        });
        
        // Update dropdown content and show it
        searchDropdown.innerHTML = resultsHTML;
        searchDropdown.classList.remove('hidden');
        
        // Ensure dropdown is visible above other elements
        searchDropdown.style.zIndex = "9";
    } else {
        searchDropdown.innerHTML = `
            <div class="p-4 text-center text-gray-500 dark:text-gray-400">
                <i class="ph ph-magnifying-glass text-2xl mb-2 block"></i>
                <p>Nu s-au găsit cursuri pentru "${searchTerm}"</p>
                <p class="text-xs mt-1">Încearcă să cauți cu alți termeni</p>
            </div>
        `;
        searchDropdown.classList.remove('hidden');
    }
}

/**
 * Handle clicking outside the search dropdown to close it
 */
function handleClickOutside(event) {
    if (searchDropdown && !event.target.closest('.relative')) {
        searchDropdown.classList.add('hidden');
    }
}

/**
 * Initialize search functionality
 */
function initializeSearch() {
    searchInput = document.getElementById('searchInput');
    searchDropdown = document.getElementById('searchDropdown');

    console.log("Search input found:", !!searchInput);
    console.log("Search dropdown found:", !!searchDropdown);

    if (searchInput && searchDropdown) {
        // Force proper positioning with inline styles to override any CSS
        searchDropdown.style.position = "absolute";
        searchDropdown.style.zIndex = "9999";
        searchDropdown.style.top = "100%";
        searchDropdown.style.left = "0";
        searchDropdown.style.right = "0";
        searchDropdown.style.marginTop = "0.5rem";
        
        // Make sure parent has relative positioning
        const parentElement = searchDropdown.parentElement;
        if (parentElement) {
            parentElement.style.position = "relative";
            parentElement.style.zIndex = "999";
        }
        
        // Remove any existing event listeners to prevent duplicates
        if (searchInput._hasSearchListener) {
            searchInput.removeEventListener('input', handleSearch);
        }
        
        if (document._hasClickOutsideListener) {
            document.removeEventListener('click', handleClickOutside);
        }
        
        // Add event listeners with flags to track them
        searchInput.addEventListener('input', handleSearch);
        searchInput._hasSearchListener = true;
        
        document.addEventListener('click', handleClickOutside);
        document._hasClickOutsideListener = true;
        
        // Focus event to show dropdown if there's already text
        searchInput.addEventListener('focus', (event) => {
            if (event.target.value.trim().length > 0) {
                handleSearch(event);
            }
        });
        
        // Clear search on escape key
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                searchInput.value = '';
                searchDropdown.classList.add('hidden');
            }
        });
        
        // Preload courses for search if not already loaded
        if (allCourses.length === 0) {
            loadAllCourses().then(courses => {
                allCourses = courses;
                console.log("Courses preloaded for search:", allCourses.length);
            });
        }
        
        console.log("Search functionality initialized successfully");
    } else {
        console.error("Search elements not found - input:", !!searchInput, "dropdown:", !!searchDropdown);
    }
}

// ===== INITIALIZATION FUNCTIONS =====

/**
 * Initialize page data
 */
async function initializePageData() {
    try {
        console.log("Initializing page data...");
        await loadAllCourses();
        console.log("Page data initialized with", allCourses.length, "courses");
    } catch (error) {
        console.error("Error initializing page data:", error);
    }
}

// ===== THEME FUNCTIONALITY =====

/**
 * Initialize desktop theme toggle
 */
function initializeDesktopTheme() {
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
}

/**
 * Initialize mobile theme toggle
 */
function initializeMobileTheme() {
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
}

/**
 * Initialize Swiper carousel
 */
function initializeSwiper() {
    if (typeof Swiper !== 'undefined') {
        var swiper = new Swiper(".multiple-slide-carousel", {
            loop: true,
            slidesPerView: 3,
            spaceBetween: 20,
            navigation: {
              nextEl: ".swiper-button-n",
              prevEl: ".swiper-button-p",
            },
            breakpoints: {
             1920: {
                 slidesPerView: 3,
                 spaceBetween: 30
             },
             848: {
                 slidesPerView: 2,
                 spaceBetween: 30
             },
             0: {
                 slidesPerView: 1,
                 spaceBetween: 0
             }
           }
        });
        console.log("Swiper initialized successfully");
    } else {
        console.log("Swiper not available");
    }
}

// ===== MAIN EVENT LISTENERS =====

/**
 * Main initialization when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM loaded, starting initialization...");
    
    try {
        // Initialize theme toggles
        initializeDesktopTheme();
        initializeMobileTheme();
        
        // Initialize Swiper
        initializeSwiper();
        
        // Initialize search functionality first to ensure it's ready
        initializeSearch();
        
        // Initialize page data (load all courses for search)
        await initializePageData();
        
        // Check if we're on the courses page and render courses
        if (document.getElementById('courses-container')) {
            console.log("Courses container found, rendering courses...");
            renderCourses();
            
            // Add filter event listeners
            const categoryFilter = document.getElementById('categoryFilter');
            const durationFilter = document.getElementById('durationFilter');
            const languageFilter = document.getElementById('languageFilter');
            
            if (categoryFilter) {
                categoryFilter.addEventListener('change', () => {
                    currentPage = 1;
                    lastDocumentSnapshot = null; // Reset pagination when filter changes
                    renderCourses();
                });
            }
            
            if (durationFilter) {
                durationFilter.addEventListener('change', () => {
                    currentPage = 1;
                    lastDocumentSnapshot = null; // Reset pagination when filter changes
                    renderCourses();
                });
            }
            
            if (languageFilter) {
                languageFilter.addEventListener('change', () => {
                    currentPage = 1;
                    lastDocumentSnapshot = null; // Reset pagination when filter changes
                    renderCourses();
                });
            }
        }

        // Check if we're on the course detail page
        const courseDetailContainer = document.getElementById('course-detail-container');
        if (courseDetailContainer) {
            console.log("Course detail container found, loading single course...");
            const urlParams = new URLSearchParams(window.location.search);
            const courseId = urlParams.get('id');
            
            if (courseId) {
                const course = await loadSingleCourse(courseId);
                if (course) {
                    displayCourseDetails(course);
                } else {
                    courseDetailContainer.innerHTML = '<p class="text-center text-red-500">Cursul nu a fost găsit.</p>';
                }
            } else {
                courseDetailContainer.innerHTML = '<p class="text-center text-red-500">ID-ul cursului lipsește.</p>';
            }
        }
        
        // Add a manual trigger for the search input after everything is loaded
        setTimeout(() => {
            const searchInputElement = document.getElementById('searchInput');
            if (searchInputElement) {
                // Force reload of search functionality
                console.log("Re-initializing search functionality...");
                initializeSearch();
                
                // Manually trigger any existing value
                if (searchInputElement.value.trim().length > 0) {
                    const event = new Event('input', { bubbles: true });
                    searchInputElement.dispatchEvent(event);
                }
            }
        }, 1000);
        
        console.log("Initialization completed successfully");
        
    } catch (error) {
        console.error("Error during initialization:", error);
    }
});

// ===== GLOBAL FUNCTIONS =====

// Make changePage function globally accessible for pagination buttons
window.changePage = changePage;

// Export functions for potential use in other modules
window.loadAllCourses = loadAllCourses;
window.renderCourses = renderCourses;

console.log("Optimized main.js loaded successfully");
