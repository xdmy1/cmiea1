// register-step2.js - Enhanced to ensure proper profile completion flow with email verification
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged, updateProfile, sendEmailVerification } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Constants
const ROUTES = {
    LOGIN: '/login.html',
    DASHBOARD: '/dashboard.html',
    HOME: '/index.html',
    COURSE: '/curs.html',
    EVENT: '/eveniment.html'
};

const STORAGE_KEYS = {
    PENDING_COURSE: 'pendingCourseEnrollment',
    PENDING_EVENT: 'pendingEventEnrollment',
    FIRST_NAME: 'userFirstName',
    LAST_NAME: 'userLastName',
    COLOR_THEME: 'color-theme'
};

const MINIMUM_AGE = 18;

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
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

/**
 * Utility functions
 */
const Utils = {
    getElementById(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with ID '${id}' not found`);
        }
        return element;
    },

    formatDateForInput(date) {
        if (typeof date === 'string') return date;
        if (date && date.toDate) return date.toDate().toISOString().split('T')[0];
        return '';
    },

    createDisplayName(firstName, lastName, email) {
        if (firstName && lastName) {
            return `${lastName} ${firstName}`;
        }
        return email.split('@')[0];
    },

    setButtonLoading(button, isLoading, text = {}) {
        if (!button) return;
        
        button.disabled = isLoading;
        
        if (isLoading) {
            button.innerHTML = `
                <span class="animate-spin inline-block mr-2 h-4 w-4 border-t-2 border-white rounded-full"></span> 
                ${text.loading || 'Se procesează...'}
            `;
        } else {
            button.textContent = text.normal || 'Finalizează înregistrarea';
        }
    },
    
    // Utility method to create explanation banners
    createBanner(message, type = 'info') {
        const banner = document.createElement('div');
        
        const bgColors = {
            info: 'bg-blue-50 dark:bg-blue-900/30',
            warning: 'bg-yellow-50 dark:bg-yellow-900/30',
            success: 'bg-green-50 dark:bg-green-900/30'
        };
        
        const textColors = {
            info: 'text-blue-700 dark:text-blue-300',
            warning: 'text-yellow-700 dark:text-yellow-300',
            success: 'text-green-700 dark:text-green-300'
        };
        
        banner.className = `${bgColors[type] || bgColors.info} p-3 rounded-md mb-4`;
        banner.innerHTML = `
            <p class="text-sm ${textColors[type] || textColors.info}">
                ${message}
            </p>
        `;
        
        return banner;
    },
    
    // Create modal element
    createModal(id, title, content, actions) {
        // First check if the modal already exists
        let modal = document.getElementById(id);
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = id;
            modal.className = 'fixed inset-0 bg-gray-600/75 dark:bg-black/75 flex items-center justify-center z-50';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-96';
            
            const modalTitle = document.createElement('h3');
            modalTitle.className = 'text-xl font-bold text-gray-900 dark:text-white mb-4';
            modalTitle.textContent = title;
            
            const modalBody = document.createElement('div');
            modalBody.className = 'text-gray-600 dark:text-gray-300 mb-4';
            modalBody.innerHTML = content;
            
            const modalActions = document.createElement('div');
            modalActions.className = 'flex justify-end gap-3';
            
            actions.forEach(action => {
                const button = document.createElement('button');
                button.id = action.id;
                button.className = action.className;
                button.textContent = action.text;
                if (action.onClick) {
                    button.addEventListener('click', action.onClick);
                }
                modalActions.appendChild(button);
            });
            
            modalContent.appendChild(modalTitle);
            modalContent.appendChild(modalBody);
            modalContent.appendChild(modalActions);
            modal.appendChild(modalContent);
            
            document.body.appendChild(modal);
        }
        
        return modal;
    }
};

/**
 * Phone number formatting
 */
class PhoneFormatter {
    static format(value) {
        const cleanValue = value.replace(/\D/g, '');
        
        if (cleanValue.length === 0) return '';
        
        if (cleanValue.startsWith('373')) {
            return this.formatMoldovaNumber(cleanValue);
        }
        
        if (cleanValue.startsWith('0')) {
            return this.formatLocalNumber(cleanValue);
        }
        
        return `+373 ${cleanValue}`;
    }

    static formatMoldovaNumber(value) {
        if (value.length <= 3) {
            return `+${value}`;
        } else if (value.length <= 5) {
            return `+${value.slice(0, 3)} ${value.slice(3)}`;
        } else if (value.length <= 8) {
            return `+${value.slice(0, 3)} ${value.slice(3, 5)} ${value.slice(5)}`;
        } else {
            return `+${value.slice(0, 3)} ${value.slice(3, 5)} ${value.slice(5, 8)} ${value.slice(8, 11)}`;
        }
    }

    static formatLocalNumber(value) {
        if (value.length <= 3) {
            return value;
        } else if (value.length <= 6) {
            return `${value.slice(0, 3)} ${value.slice(3)}`;
        } else {
            return `${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6, 9)}`;
        }
    }
}

/**
 * Email verification manager
 */
class EmailVerificationManager {
    constructor(user) {
        this.user = user;
        this.modalId = 'emailVerificationModal';
    }

    /**
     * Check if email is verified and show verification modal if needed
     */
    async checkAndShowVerification() {
        try {
            // Refresh the user to get the latest verification status
            await this.user.reload();
            
            if (!this.user.emailVerified) {
                this.showVerificationModal();
                return false;
            }
            
            // Update the Firestore document to reflect verified status
            await updateDoc(doc(db, "users", this.user.uid), {
                emailVerified: true,
                updatedAt: new Date()
            });
            
            return true;
        } catch (error) {
            console.error("Error checking email verification:", error);
            return false;
        }
    }

    /**
     * Show email verification modal
     */
    showVerificationModal() {
        const modal = Utils.createModal(
            this.modalId,
            'Verificare email necesară',
            `
            <p class="mb-3">Am trimis un email de verificare la adresa <strong>${this.user.email}</strong>.</p>
            <p class="mb-3">Vă rugăm să accesați linkul din email pentru a vă verifica adresa, apoi reveniți aici pentru a continua.</p>
            <p>Nu ați primit emailul? Verificați folderul de spam sau click pe butonul de mai jos pentru a retrimite.</p>
            `,
            [
                {
                    id: 'resendVerificationEmail',
                    className: 'px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md',
                    text: 'Retrimite email',
                    onClick: () => this.resendVerificationEmail()
                },
                {
                    id: 'checkVerification',
                    className: 'px-4 py-2 text-sm font-medium text-white bg-main hover:bg-maindark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-main rounded-md',
                    text: 'Am verificat',
                    onClick: () => this.checkVerification()
                }
            ]
        );
        
        modal.style.display = 'flex';
    }

    /**
     * Hide email verification modal
     */
    hideVerificationModal() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Resend verification email
     */
    async resendVerificationEmail() {
        const button = document.getElementById('resendVerificationEmail');
        
        try {
            button.disabled = true;
            button.textContent = 'Se trimite...';
            
            await sendEmailVerification(this.user);
            
            button.textContent = 'Email trimis!';
            setTimeout(() => {
                button.disabled = false;
                button.textContent = 'Retrimite email';
            }, 3000);
            
        } catch (error) {
            console.error("Error resending verification email:", error);
            button.textContent = 'Eroare. Încercați din nou.';
            button.disabled = false;
        }
    }

    /**
     * Check if email has been verified
     */
    async checkVerification() {
        const button = document.getElementById('checkVerification');
        
        try {
            button.disabled = true;
            button.textContent = 'Se verifică...';
            
            // Reload user to get latest verification status
            await this.user.reload();
            
            if (this.user.emailVerified) {
                // Update Firestore document
                await updateDoc(doc(db, "users", this.user.uid), {
                    emailVerified: true,
                    updatedAt: new Date()
                });
                
                this.hideVerificationModal();
                
                // Show success message
                const successBanner = Utils.createBanner(
                    'Adresa de email a fost verificată cu succes! Vă mulțumim.',
                    'success'
                );
                
                const formTitle = document.querySelector('h2');
                if (formTitle && formTitle.parentNode) {
                    formTitle.parentNode.insertBefore(successBanner, formTitle.nextSibling);
                    
                    // Remove banner after 5 seconds
                    setTimeout(() => {
                        successBanner.remove();
                    }, 5000);
                }
                
            } else {
                button.textContent = 'Încă neverificat';
                setTimeout(() => {
                    button.disabled = false;
                    button.textContent = 'Am verificat';
                }, 2000);
            }
            
        } catch (error) {
            console.error("Error checking verification status:", error);
            button.textContent = 'Eroare. Încercați din nou.';
            setTimeout(() => {
                button.disabled = false;
                button.textContent = 'Am verificat';
            }, 2000);
        }
    }
}

class RegistrationCompletionHandler {
    constructor() {
        this.emailDisplay = Utils.getElementById('emailDisplay');
        this.form = Utils.getElementById('completeRegForm');
        this.cancelBtn = Utils.getElementById('cancelRegistration');
        this.verificationManager = null;
        
        this.initializeBirthDateField();
        this.setupPhoneInput();
        this.setupAuthListener();
        this.checkRedirectSource();
    }

    initializeBirthDateField() {
        const birthDateField = Utils.getElementById('birthDate');
        if (!birthDateField) return;

        const today = new Date();
        const maxDate = new Date(
            today.getFullYear() - MINIMUM_AGE,
            today.getMonth(),
            today.getDate()
        );
        
        birthDateField.max = maxDate.toISOString().split('T')[0];
    }

    setupPhoneInput() {
        const phoneInput = Utils.getElementById('phone');
        if (!phoneInput) return;

        phoneInput.addEventListener('input', (e) => {
            e.target.value = PhoneFormatter.format(e.target.value);
        });
    }
    
    // Check and display redirect source information
    checkRedirectSource() {
        const formTitle = document.querySelector('h2');
        if (!formTitle) return;
        
        const pendingCourse = localStorage.getItem(STORAGE_KEYS.PENDING_COURSE);
        const pendingEvent = localStorage.getItem(STORAGE_KEYS.PENDING_EVENT);
        
        if (pendingCourse) {
            const banner = Utils.createBanner(
                'Pentru a te înscrie la curs, trebuie să completezi profilul tău. După finalizare, vei fi redirecționat înapoi la curs.',
                'info'
            );
            formTitle.parentNode.insertBefore(banner, formTitle.nextSibling);
        } else if (pendingEvent) {
            const banner = Utils.createBanner(
                'Pentru a te înregistra la eveniment, trebuie să completezi profilul tău. După finalizare, vei fi redirecționat înapoi la eveniment.',
                'info'
            );
            formTitle.parentNode.insertBefore(banner, formTitle.nextSibling);
        }
    }

    setupAuthListener() {
        onAuthStateChanged(auth, async (user) => {
            try {
                if (!user) {
                    console.log("No authenticated user found, redirecting to login");
                    this.redirectToLogin();
                    return;
                }

                console.log("Authenticated user found:", user.email);
                
                // Initialize email verification manager
                this.verificationManager = new EmailVerificationManager(user);
                
                // Check email verification status
                await this.verificationManager.checkAndShowVerification();
                
                await this.handleAuthenticatedUser(user);
                
            } catch (error) {
                console.error("Error in auth state change:", error);
                // Don't redirect on error, let user try to complete registration
            }
        });
    }

    async handleAuthenticatedUser(user) {
        this.displayUserEmail(user.email);
        
        const userDoc = await this.checkUserProfile(user.uid);
        
        if (userDoc?.exists() && userDoc.data().profileCompleted) {
            console.log("Profile already completed, handling redirect");
            this.handleCompletedProfile();
            return;
        }
        
        this.setupFormSubmission(user);
        this.setupCancelButton();
        
        if (userDoc?.exists()) {
            this.prefillFormData(userDoc.data());
        }
    }

    async checkUserProfile(uid) {
        try {
            const userDoc = await getDoc(doc(db, "users", uid));
            console.log("User profile check:", userDoc.exists() ? "exists" : "not found");
            return userDoc;
        } catch (error) {
            console.error("Error checking user profile:", error);
            return null;
        }
    }

    handleCompletedProfile() {
        // Enhanced redirection logic - check for pending course or event
        const pendingCourseId = localStorage.getItem(STORAGE_KEYS.PENDING_COURSE);
        const pendingEventId = localStorage.getItem(STORAGE_KEYS.PENDING_EVENT);
        
        if (pendingCourseId) {
            localStorage.removeItem(STORAGE_KEYS.PENDING_COURSE);
            window.location.href = `${ROUTES.COURSE}?id=${pendingCourseId}`;
        } else if (pendingEventId) {
            localStorage.removeItem(STORAGE_KEYS.PENDING_EVENT);
            window.location.href = `${ROUTES.EVENT}?id=${pendingEventId}`;
        } else {
            window.location.href = ROUTES.DASHBOARD;
        }
    }

    displayUserEmail(email) {
        if (this.emailDisplay) {
            this.emailDisplay.textContent = email || 'Email indisponibil';
        }
    }

    prefillFormData(userData) {
        if (!userData) return;

        const fields = {
            phone: userData.phone,
            birthDate: userData.birthDate ? Utils.formatDateForInput(userData.birthDate) : null,
            occupation: userData.occupation,
            education: userData.education
        };

        Object.entries(fields).forEach(([fieldName, value]) => {
            if (value) {
                const field = Utils.getElementById(fieldName);
                if (field) {
                    field.value = value;
                    console.log(`Prefilled ${fieldName}:`, value);
                }
            }
        });
    }

    setupFormSubmission(user) {
        if (!this.form) return;

        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // First check if email is verified
            if (this.verificationManager) {
                const isVerified = await this.verificationManager.checkAndShowVerification();
                if (!isVerified) {
                    return; // Stop form submission if email is not verified
                }
            }
            
            await this.handleFormSubmit(user);
        });
    }

    async handleFormSubmit(user) {
        const submitBtn = this.form.querySelector('button[type="submit"]');
        
        try {
            Utils.setButtonLoading(submitBtn, true);
            
            const userData = this.collectFormData();
            await this.saveUserProfile(user, userData);
            await this.updateDisplayName(user);
            
            // Clean up localStorage except for pending enrollments
            this.cleanupStoredData(false);
            
            this.handlePostRegistrationRedirect();
            
        } catch (error) {
            console.error("Error completing registration:", error);
            alert(`Eroare la finalizarea înregistrării: ${error.message}`);
            
        } finally {
            Utils.setButtonLoading(submitBtn, false);
        }
    }

    collectFormData() {
        const formData = new FormData(this.form);
        
        const userData = {
            phone: formData.get('phone'),
            birthDate: formData.get('birthDate'),
            occupation: formData.get('occupation'),
            education: formData.get('education'),
            profileCompleted: true,
            updatedAt: new Date()
        };

        // Add stored names if available
        const storedFirstName = localStorage.getItem(STORAGE_KEYS.FIRST_NAME);
        const storedLastName = localStorage.getItem(STORAGE_KEYS.LAST_NAME);
        
        if (storedFirstName) userData.firstName = storedFirstName;
        if (storedLastName) userData.lastName = storedLastName;

        console.log("Collected form data:", userData);
        return userData;
    }

    async saveUserProfile(user, userData) {
        // Ensure we track the verified status
        if (user.emailVerified) {
            userData.emailVerified = true;
        }
        
        await setDoc(doc(db, "users", user.uid), userData, { merge: true });
        console.log("User profile saved successfully");
    }

    async updateDisplayName(user) {
        try {
            // Get name data from form or localStorage
            const storedFirstName = localStorage.getItem(STORAGE_KEYS.FIRST_NAME);
            const storedLastName = localStorage.getItem(STORAGE_KEYS.LAST_NAME);
            
            console.log("Names from localStorage:", { storedFirstName, storedLastName });
            
            // If no names in localStorage, try to get from Firestore
            if (!storedFirstName && !storedLastName) {
                console.log("No names in localStorage, trying to get from Firestore");
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        if (userData.firstName || userData.lastName) {
                            const displayName = Utils.createDisplayName(
                                userData.firstName, 
                                userData.lastName, 
                                user.email
                            );
                            
                            await updateProfile(user, { displayName });
                            console.log("Display name updated from Firestore:", displayName);
                            return;
                        }
                    }
                } catch (error) {
                    console.error("Error getting user data from Firestore:", error);
                }
            }
            
            // Use names from localStorage
            if (storedFirstName || storedLastName) {
                const displayName = Utils.createDisplayName(
                    storedFirstName, 
                    storedLastName, 
                    user.email
                );
                
                console.log("Created display name:", displayName);
                
                // Try using Firebase v9 updateProfile
                await updateProfile(user, { displayName });
                console.log("Display name updated successfully:", displayName);
            } else {
                console.warn("No names available to update display name");
            }
        } catch (error) {
            console.error("Error updating display name:", error);
            // Try one more time with the current user reference
            try {
                const currentUser = auth.currentUser;
                if (currentUser) {
                    const storedFirstName = localStorage.getItem(STORAGE_KEYS.FIRST_NAME);
                    const storedLastName = localStorage.getItem(STORAGE_KEYS.LAST_NAME);
                    
                    if (storedFirstName || storedLastName) {
                        const displayName = Utils.createDisplayName(
                            storedFirstName, 
                            storedLastName, 
                            user.email
                        );
                        
                        await updateProfile(currentUser, { displayName });
                        console.log("Display name updated with fallback method:", displayName);
                    }
                }
            } catch (fallbackError) {
                console.error("Fallback method also failed:", fallbackError);
            }
        }
    }

    cleanupStoredData(includePendingEnrollments = false) {
        // Clean up the temporary data from localStorage
        localStorage.removeItem(STORAGE_KEYS.FIRST_NAME);
        localStorage.removeItem(STORAGE_KEYS.LAST_NAME);
        
        // Optionally remove pending enrollments
        if (includePendingEnrollments) {
            localStorage.removeItem(STORAGE_KEYS.PENDING_COURSE);
            localStorage.removeItem(STORAGE_KEYS.PENDING_EVENT);
        }
        
        console.log("Cleaned up stored registration data");
    }

    handlePostRegistrationRedirect() {
        // Enhanced redirection logic - check for pending course or event
        const pendingCourseId = localStorage.getItem(STORAGE_KEYS.PENDING_COURSE);
        const pendingEventId = localStorage.getItem(STORAGE_KEYS.PENDING_EVENT);
        
        if (pendingCourseId) {
            localStorage.removeItem(STORAGE_KEYS.PENDING_COURSE);
            window.location.href = `${ROUTES.COURSE}?id=${pendingCourseId}`;
        } else if (pendingEventId) {
            localStorage.removeItem(STORAGE_KEYS.PENDING_EVENT);
            window.location.href = `${ROUTES.EVENT}?id=${pendingEventId}`;
        } else {
            window.location.href = ROUTES.DASHBOARD;
        }
    }

    setupCancelButton() {
        if (!this.cancelBtn) return;

        this.cancelBtn.addEventListener('click', () => {
            const pendingCourse = localStorage.getItem(STORAGE_KEYS.PENDING_COURSE);
            const pendingEvent = localStorage.getItem(STORAGE_KEYS.PENDING_EVENT);
            
            if (pendingCourse || pendingEvent) {
                const message = pendingCourse 
                    ? 'Dacă anulați, nu veți putea finaliza înscrierea la curs.' 
                    : 'Dacă anulați, nu veți putea finaliza înscrierea la eveniment.';
                
                const confirmed = confirm(message + ' Doriți să continuați?');
                
                if (confirmed) {
                    this.cleanupStoredData(true);
                    window.location.href = ROUTES.HOME;
                }
            } else {
                this.cleanupStoredData(true);
                window.location.href = ROUTES.HOME;
            }
        });
    }

    redirectToLogin() {
        // Add a small delay to prevent rapid redirects
        setTimeout(() => {
            window.location.href = ROUTES.LOGIN;
        }, 100);
    }
}

/**
 * Navigation and theme management (keeping your existing functionality)
 */
class UIManager {
    static setupNavigation() {
        const burgerBtn = Utils.getElementById("burger");
        const phoneNav = Utils.getElementById("phone-nav");
        const closeBtn = Utils.getElementById("close");
        
        if (burgerBtn && phoneNav) {
            burgerBtn.addEventListener("click", () => {
                phoneNav.classList.remove("hidden");
            });
        }
        
        if (closeBtn && phoneNav) {
            closeBtn.addEventListener("click", () => {
                phoneNav.classList.add("hidden");
            });
        }
    }

    static setupThemeToggle(toggleBtn, darkIcon, lightIcon) {
        if (!toggleBtn || !darkIcon || !lightIcon) return;
        
        // Apply initial theme
        if (localStorage.getItem(STORAGE_KEYS.COLOR_THEME) === 'dark' || 
            (!localStorage.getItem(STORAGE_KEYS.COLOR_THEME) && 
             window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
            darkIcon.classList.add('hidden');
            lightIcon.classList.remove('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            darkIcon.classList.remove('hidden');
            lightIcon.classList.add('hidden');
        }
        
        // Toggle theme on click
        toggleBtn.addEventListener('click', function() {
            if (document.documentElement.classList.contains('dark')) {
                document.documentElement.classList.remove('dark');
                localStorage.setItem(STORAGE_KEYS.COLOR_THEME, 'light');
                darkIcon.classList.remove('hidden');
                lightIcon.classList.add('hidden');
            } else {
                document.documentElement.classList.add('dark');
                localStorage.setItem(STORAGE_KEYS.COLOR_THEME, 'dark');
                darkIcon.classList.add('hidden');
                lightIcon.classList.remove('hidden');
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Initialize main registration completion handler
        new RegistrationCompletionHandler();
        
        // Setup UI components
        UIManager.setupNavigation();
        
        // Setup theme toggles
        UIManager.setupThemeToggle(
            Utils.getElementById('theme-toggle'),
            Utils.getElementById('theme-toggle-dark-icon'),
            Utils.getElementById('theme-toggle-light-icon')
        );
        
        UIManager.setupThemeToggle(
            Utils.getElementById('theme-toggle2'),
            Utils.getElementById('theme-toggle-dark-icon2'),
            Utils.getElementById('theme-toggle-light-icon2')
        );
        
        console.log("Registration step 2 initialized successfully");
        
    } catch (error) {
        console.error("Error initializing registration step 2:", error);
    }
});