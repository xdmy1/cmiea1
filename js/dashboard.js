import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

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

async function loadEnrolledCourses(userId) {
    console.log("Loading courses for user:", userId); 
    const enrolledCoursesDiv = document.getElementById('enrolledCourses');
    
    if (!enrolledCoursesDiv) {
        console.error("enrolledCourses div not found");
        return;
    }

    try {
        enrolledCoursesDiv.innerHTML = `
            <div class="flex justify-center items-center h-32">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-main"></div>
            </div>
        `;

        const q = query(collection(db, "enrollments"), where("userId", "==", userId));
        const querySnapshot = await getDocs(q);

        console.log("Found enrollments:", querySnapshot.size); 

        if (querySnapshot.empty) {
            enrolledCoursesDiv.innerHTML = `
                <div class="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
                    <p class="text-gray-600 dark:text-gray-300">Nu ești înscris la niciun curs.</p>
                    <a href="pages/cursuri.html" class="inline-block mt-4 bg-main hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                        Vezi cursurile disponibile
                    </a>
                </div>
            `;
            return;
        }

        let coursesHTML = '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">';
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log("Course data:", data); 
            
            let enrollmentDate = data.enrollmentDate ? 
                new Date(data.enrollmentDate.seconds * 1000).toLocaleDateString('ro-RO') : 
                'Data indisponibilă';

            coursesHTML += `
                <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                    <h3 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">${data.courseName || 'Curs necunoscut'}</h3>
                    <div class="text-gray-600 dark:text-gray-300 text-sm space-y-3">
                        <p><span class="font-medium">Nume:</span> ${data.userName || 'N/A'}</p>
                        <p><span class="font-medium">Email:</span> ${data.email || 'N/A'}</p>
                        <p><span class="font-medium">Telefon:</span> ${data.phone || 'N/A'}</p>
                        <p><span class="font-medium">Data înscrierii:</span> ${enrollmentDate}</p>
                        <p><span class="font-medium">Ocupația:</span> ${data.occupation || 'N/A'}</p>
                        <p><span class="font-medium">Studii:</span> ${data.education || 'N/A'}</p>
                    </div>
                    <div class="mt-4">
                        <span class="inline-block px-3 py-1 text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                            ${data.status || 'Activ'}
                        </span>
                    </div>
                </div>
            `;
        });
        coursesHTML += '</div>';
        enrolledCoursesDiv.innerHTML = coursesHTML;
    } catch (error) {
        console.error("Error loading courses:", error);
        enrolledCoursesDiv.innerHTML = `
            <div class="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 p-4 rounded-lg">
                A apărut o eroare la încărcarea cursurilor: ${error.message}
            </div>
        `;
    }
}

function updateGreeting(user) {
    const greetingElement = document.getElementById('greeting');
    if (greetingElement) {
        const name = user.displayName || 'User';
        const hour = new Date().getHours();
        let greeting = '';
        
        if (hour < 12) greeting = 'Bună dimineața';
        else if (hour < 18) greeting = 'Bună ziua';
        else greeting = 'Bună seara';
        
        greetingElement.textContent = `${greeting}, ${name}!`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard.js loaded"); 
    const burgerButton = document.getElementById('burger');
    const closeButton = document.getElementById('close');
    const phoneNav = document.getElementById('phone-nav');
    const mobileUserDisplay = document.getElementById('mobile-user-display');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    const mobileAuthButtons = document.getElementById('mobile-auth-buttons');
    burgerButton?.addEventListener('click', () => {
        phoneNav?.classList.remove('hidden');
        burgerButton.style.visibility = 'hidden';
    });

    closeButton?.addEventListener('click', () => {
        phoneNav?.classList.add('hidden');
        burgerButton.style.visibility = 'visible';
    });

    mobileLogoutBtn?.addEventListener('click', async () => {
        try {
            await auth.signOut();
            window.location.href = '/login.html';
        } catch (error) {
            console.error("Error signing out:", error);
        }
    });

    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed:", user ? "logged in" : "logged out"); 
        
        if (user) {
            const emailDisplay = document.getElementById('user-email-display');
            if (emailDisplay) {
                emailDisplay.textContent = user.displayName || user.email;
            }
            if (mobileUserDisplay) {
                mobileUserDisplay.textContent = user.displayName || user.email;
            }
            const authButtons = document.getElementById('auth-buttons');
            if (authButtons) {
                authButtons.classList.add('hidden');
            }
            if (mobileAuthButtons) {
                mobileAuthButtons.classList.add('hidden');
            }

            updateGreeting(user);
            loadEnrolledCourses(user.uid);
        } else {
            window.location.href = '/login.html';
        }
    });
});