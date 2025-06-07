import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBoWwArqP6pYGvVSBzCbUnOphhzk0Pi9oQ",
    authDomain: "tekwill-441fe.firebaseapp.com",
    projectId: "tekwill-441fe",
    storageBucket: "tekwill-441fe.firebasestorage.app",
    messagingSenderId: "990223834307",
    appId: "1:990223834307:web:c1a9da67d5e5f070db1676"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Helper function to create display name from first and last name
function createDisplayName(firstName, lastName, email) {
    if (firstName && lastName) {
        return `${lastName} ${firstName}`;
    } else if (firstName) {
        return firstName;
    } else if (lastName) {
        return lastName;
    }
    return email.split('@')[0];
}

async function updateUIForAuthState(user) {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const userEmailDisplay = document.getElementById('user-email-display');
    const phoneNav = document.querySelector('#phone-nav .h-full');
    
    if (user) {
        // User is signed in
        let isAdmin = false;
        let displayName = null;
        
        try {
            // Check if user has admin role and get user data
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Check for admin role
                if (userData.role === 'admin') {
                    isAdmin = true;
                }
                
                // Get display name from user data if not set in auth
                if (!user.displayName && (userData.firstName || userData.lastName)) {
                    displayName = createDisplayName(
                        userData.firstName,
                        userData.lastName,
                        user.email
                    );
                    console.log("Created display name from Firestore:", displayName);
                }
            }
        } catch (error) {
            console.error("Error checking user data:", error);
        }
        
        // Use display name from Auth, or from Firestore, or fall back to email
        const userDisplayText = user.displayName || displayName || user.email;
        
        if (authButtons) authButtons.classList.add('hidden');
        if (userMenu) {
            userMenu.classList.remove('hidden');
            if (userEmailDisplay) {
                userEmailDisplay.textContent = userDisplayText;
            }
            
            // Modify dropdown menu based on admin status
            const dropdownMenu = document.getElementById('dropdown-menu');
            if (dropdownMenu) {
                if (isAdmin) {
                    dropdownMenu.innerHTML = `
                        <div class="py-1">
                            <a href="/admin.html" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark3">Panel Admin</a>
                            <button id="logout-btn" class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark3">Logout</button>
                        </div>
                    `;
                } else {
                    dropdownMenu.innerHTML = `
                        <div class="py-1">
                            <a href="/dashboard.html" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark3">Dashboard</a>
                            <button id="logout-btn" class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark3">Logout</button>
                        </div>
                    `;
                }
                
                // Reattach logout event listener
                document.getElementById('logout-btn')?.addEventListener('click', () => {
                    signOut(auth).then(() => {
                        window.location.href = '/login.html';
                    }).catch((error) => {
                        console.error('Error signing out:', error);
                    });
                });
            }
        }
        
        if (phoneNav) {
            const mobileAuthButtons = phoneNav.querySelectorAll('a[href*="login"], a[href*="register"]');
            mobileAuthButtons.forEach(btn => btn.remove());
            
            if (!phoneNav.querySelector('#mobile-user-menu')) {
                const mobileUserMenu = document.createElement('div');
                mobileUserMenu.id = 'mobile-user-menu';
                mobileUserMenu.className = 'flex flex-col items-center gap-5';
                
                if (isAdmin) {
                    mobileUserMenu.innerHTML = `
                        <div class="text-center text-xl mb-2">${userDisplayText}</div>
                        <a href="admin.html" class="w-full text-center">
                            <button class="px-4 py-2 text-black text-2xl hover:text-black dark:text-white">Panel Admin</button>
                        </a>
                        <button id="mobile-logout-btn" class="w-full text-center p-2 text-main text-2xl dark:text-white border border-main dark:border-white rounded-xl dark:hover:bg-gray-100/10 hover:bg-black/10">
                            Logout
                        </button>
                    `;
                } else {
                    mobileUserMenu.innerHTML = `
                        <div class="text-center text-xl mb-2">${userDisplayText}</div>
                        <a href="dashboard.html" class="w-full text-center">
                            <button class="px-4 py-2 text-black text-2xl hover:text-black dark:text-white">Dashboard</button>
                        </a>
                        <button id="mobile-logout-btn" class="w-full text-center p-2 text-main text-2xl dark:text-white border border-main dark:border-white rounded-xl dark:hover:bg-gray-100/10 hover:bg-black/10">
                            Logout
                        </button>
                    `;
                }
                
                phoneNav.insertBefore(mobileUserMenu, phoneNav.querySelector('#theme-toggle2'));
                
                document.getElementById('mobile-logout-btn')?.addEventListener('click', () => {
                    signOut(auth).then(() => {
                        window.location.href = '/login.html';
                    });
                });
            }
        }
    } else {
        // User is signed out
        if (authButtons) authButtons.classList.remove('hidden');
        if (userMenu) userMenu.classList.add('hidden');
        
        if (phoneNav) {
            document.getElementById('mobile-user-menu')?.remove();
        }
    }
}

onAuthStateChanged(auth, async (user) => {
    await updateUIForAuthState(user);
    
    // Check user access for protected pages
    const currentPath = window.location.pathname;
    
    if (!user && (
        currentPath.includes('dashboard.html') || 
        currentPath.includes('profile.html') || 
        currentPath.includes('my-courses.html') || 
        currentPath.includes('admin.html')
    )) {
        window.location.href = '/login.html';
        return;
    }
    
    // Check admin access for admin page
    if (user && currentPath.includes('admin.html')) {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists() || userDoc.data().role !== 'admin') {
                alert('Nu aveți permisiuni de administrator pentru această pagină');
                window.location.href = '/index.html';
            }
        } catch (error) {
            console.error("Error checking admin access:", error);
            alert('Eroare la verificarea permisiunilor de administrator');
            window.location.href = '/index.html';
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const userMenuButton = document.getElementById('user-menu-button');
    const dropdownMenu = document.getElementById('dropdown-menu');

    userMenuButton?.addEventListener('click', () => {
        dropdownMenu?.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!userMenuButton?.contains(e.target)) {
            dropdownMenu?.classList.add('hidden');
        }
    });
});

export async function enrollInCourse(userId, courseData) {
    try {
        const enrollmentRef = await addDoc(collection(db, "enrollments"), {
            userId: userId,
            courseId: courseData.id,
            courseName: courseData.name,
            enrollmentDate: new Date(),
            status: "active"
        });
        return enrollmentRef;
    } catch (error) {
        console.error("Error enrolling in course: ", error);
        throw error;
    }
}