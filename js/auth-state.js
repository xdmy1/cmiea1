import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

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

function updateUIForAuthState(user) {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const userEmailDisplay = document.getElementById('user-email-display');
    const phoneNav = document.querySelector('#phone-nav .h-full');
    
    if (user) {
        if (authButtons) authButtons.classList.add('hidden');
        if (userMenu) {
            userMenu.classList.remove('hidden');
            if (userEmailDisplay) {
                userEmailDisplay.textContent = user.displayName || user.email;
            }
        }
        
        if (phoneNav) {
            const mobileAuthButtons = phoneNav.querySelectorAll('a[href*="login"], a[href*="register"]');
            mobileAuthButtons.forEach(btn => btn.remove());
            
            if (!phoneNav.querySelector('#mobile-user-menu')) {
                const mobileUserMenu = document.createElement('div');
                mobileUserMenu.id = 'mobile-user-menu';
                mobileUserMenu.className = 'flex flex-col items-center gap-5';
                mobileUserMenu.innerHTML = `
                    <a href="dashboard.html" class="w-full text-center">
                        <button class="px-4 py-2 text-black text-2xl hover:text-black dark:text-white">Dashboard</button>
                    </a>
                    <button id="mobile-logout-btn" class="w-full text-center p-2 text-main text-2xl dark:text-white border border-main dark:border-white rounded-xl dark:hover:bg-gray-100/10 hover:bg-black/10">
                        Logout
                    </button>
                `;
                phoneNav.insertBefore(mobileUserMenu, phoneNav.querySelector('#theme-toggle2'));
                
                document.getElementById('mobile-logout-btn')?.addEventListener('click', () => {
                    signOut(auth).then(() => {
                        window.location.href = '/login.html';
                    });
                });
            }
        }
    } else {
        if (authButtons) authButtons.classList.remove('hidden');
        if (userMenu) userMenu.classList.add('hidden');
        
        if (phoneNav) {
            document.getElementById('mobile-user-menu')?.remove();
        }
    }
}

onAuthStateChanged(auth, (user) => {
    updateUIForAuthState(user);
    if (!user && (
        window.location.pathname.includes('dashboard.html') ||
        window.location.pathname.includes('profile.html') ||
        window.location.pathname.includes('my-courses.html')
    )) {
        window.location.href = '/login.html';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const userMenuButton = document.getElementById('user-menu-button');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const logoutBtn = document.getElementById('logout-btn');

    userMenuButton?.addEventListener('click', () => {
        dropdownMenu?.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!userMenuButton?.contains(e.target)) {
            dropdownMenu?.classList.add('hidden');
        }
    });

    logoutBtn?.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = '/login.html';
        }).catch((error) => {
            console.error('Error signing out:', error);
        });
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