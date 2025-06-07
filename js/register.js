// register.js - Fixed registration flow with proper Firebase authentication
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { messages } from './utils/messages.js';

// Constants
const ROUTES = {
    STEP_2: '/register-step2.html',
    LOGIN: '/login.html'
};

const STORAGE_KEYS = {
    FIRST_NAME: 'userFirstName',
    LAST_NAME: 'userLastName',
    PENDING_COURSE: 'pendingCourseEnrollment',
    ENROLLMENT_DATA: 'enrollmentFormData'
};

const DOM_SELECTORS = {
    signupForm: 'signupForm',
    email: 'email',
    password: 'password',
    firstName: 'firstName',
    lastName: 'lastName',
    errorMessage: 'errorMessage',
    submitButton: 'button[type="submit"]'
};

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
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Utility functions
 */
const Utils = {
    /**
     * Get element by ID with error handling
     */
    getElementById(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with ID '${id}' not found`);
        }
        return element;
    },

    /**
     * Create or update error message element
     */
    displayError(container, message) {
        let errorElement = Utils.getElementById(DOM_SELECTORS.errorMessage);
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = DOM_SELECTORS.errorMessage;
            errorElement.className = 'text-red-500 text-sm mt-2';
            container.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    },

    /**
     * Hide error message
     */
    hideError() {
        const errorElement = Utils.getElementById(DOM_SELECTORS.errorMessage);
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    },

    /**
     * Set button loading state
     */
    setButtonLoading(button, isLoading, text = {}) {
        if (!button) return;
        
        button.disabled = isLoading;
        button.textContent = isLoading 
            ? (text.loading || messages.loading.register)
            : (text.normal || messages.buttons.register);
    },

    /**
     * Check if registration comes from course enrollment
     */
    isFromEnrollment() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('enrollment') === 'true';
    },

    /**
     * Show enrollment notification
     */
    showEnrollmentNotification() {
        const enrollmentNote = document.createElement('div');
        enrollmentNote.className = 'bg-blue-50 dark:bg-blue-900/30 p-3 rounded-md mb-4';
        enrollmentNote.innerHTML = `
            <p class="text-sm text-blue-700 dark:text-blue-300">
                Pentru a te înscrie la curs, trebuie să creezi un cont sau să te autentifici.
            </p>
        `;
        
        const formTitle = document.querySelector('h2');
        if (formTitle && formTitle.parentNode) {
            formTitle.parentNode.insertBefore(enrollmentNote, formTitle.nextSibling);
        }
    }
};

/**
 * Registration form handler
 */
class RegistrationHandler {
    constructor() {
        this.form = Utils.getElementById(DOM_SELECTORS.signupForm);
        this.isFromEnrollment = Utils.isFromEnrollment();
        
        if (!this.form) {
            console.error("Signup form not found. Make sure the element with id 'signupForm' exists.");
            return;
        }
        
        this.init();
    }

    init() {
        this.setupEnrollmentUI();
        this.setupFormSubmission();
    }

    setupEnrollmentUI() {
        if (this.isFromEnrollment) {
            Utils.showEnrollmentNotification();
        }
    }

    setupFormSubmission() {
        this.form.addEventListener('submit', async (event) => {
            event.preventDefault();
            await this.handleRegistration();
        });
    }

    async handleRegistration() {
        const formData = this.collectFormData();
        const submitButton = this.form.querySelector(DOM_SELECTORS.submitButton);
        
        // Hide any previous errors
        Utils.hideError();
        
        try {
            Utils.setButtonLoading(submitButton, true);
            
            // Create Firebase user account
            const userCredential = await createUserWithEmailAndPassword(
                auth, 
                formData.email, 
                formData.password
            );
            
            const user = userCredential.user;
            console.log("User created successfully:", user.uid);
            
            // Send email verification
            await sendEmailVerification(user);
            console.log("Verification email sent to:", user.email);
            
            // Store user names for step 2
            this.storeUserData(formData);
            
            // Create initial user document
            await this.createInitialUserDocument(user, formData);
            
            // Redirect to step 2
            this.redirectToStep2();
            
        } catch (error) {
            console.error("Registration error:", error);
            this.handleRegistrationError(error);
            
        } finally {
            Utils.setButtonLoading(submitButton, false);
        }
    }

    collectFormData() {
        return {
            email: Utils.getElementById(DOM_SELECTORS.email)?.value?.trim(),
            password: Utils.getElementById(DOM_SELECTORS.password)?.value,
            firstName: Utils.getElementById(DOM_SELECTORS.firstName)?.value?.trim(),
            lastName: Utils.getElementById(DOM_SELECTORS.lastName)?.value?.trim()
        };
    }

    storeUserData(formData) {
        // Store names in localStorage for step 2 to access
        if (formData.firstName) {
            localStorage.setItem(STORAGE_KEYS.FIRST_NAME, formData.firstName);
        }
        if (formData.lastName) {
            localStorage.setItem(STORAGE_KEYS.LAST_NAME, formData.lastName);
        }
        
        console.log("User data stored for step 2");
    }

    async createInitialUserDocument(user, formData) {
        try {
            const initialData = {
                email: user.email,
                firstName: formData.firstName,
                lastName: formData.lastName,
                profileCompleted: false,
                emailVerified: false,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            // Check if this is from course enrollment
            if (this.isFromEnrollment) {
                initialData.fromEnrollment = true;
            }
            
            await setDoc(doc(db, "users", user.uid), initialData);
            console.log("Initial user document created");
            
        } catch (error) {
            console.error("Error creating user document:", error);
            // Non-critical error - user can still proceed to step 2
        }
    }

    handleRegistrationError(error) {
        let errorMessage;
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = messages.registerErrors.emailInUse;
                break;
            case 'auth/invalid-email':
                errorMessage = messages.registerErrors.invalidEmail;
                break;
            case 'auth/weak-password':
                errorMessage = messages.registerErrors.weakPassword;
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Înregistrarea cu email este dezactivată. Contactați administratorul.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Problemă de rețea. Verificați conexiunea la internet.';
                break;
            default:
                errorMessage = messages.registerErrors.default + ` (${error.code})`;
        }
        
        Utils.displayError(this.form, errorMessage);
    }

    redirectToStep2() {
        console.log("Redirecting to step 2");
        window.location.href = ROUTES.STEP_2;
    }
}

/**
 * Form validation
 */
class FormValidator {
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validatePassword(password) {
        return password && password.length >= 6;
    }

    static validateName(name) {
        return name && name.trim().length >= 2;
    }

    static validateForm(formData) {
        const errors = [];
        
        if (!this.validateEmail(formData.email)) {
            errors.push('Email invalid');
        }
        
        if (!this.validatePassword(formData.password)) {
            errors.push('Parola trebuie să aibă cel puțin 6 caractere');
        }
        
        if (!this.validateName(formData.firstName)) {
            errors.push('Prenumele trebuie să aibă cel puțin 2 caractere');
        }
        
        if (!this.validateName(formData.lastName)) {
            errors.push('Numele trebuie să aibă cel puțin 2 caractere');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

/**
 * Initialize when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    try {
        new RegistrationHandler();
        console.log("Registration handler initialized");
    } catch (error) {
        console.error("Error initializing registration:", error);
    }
});