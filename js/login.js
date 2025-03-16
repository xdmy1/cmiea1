import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { messages } from './utils/messages.js';

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
const provider = new GoogleAuthProvider();

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const googleSignIn = document.getElementById('googleSignIn');
    
    if (!loginForm) {
        console.error("Formularul de conectare nu a fost găsit");
        return;
    }
    
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginButton = document.querySelector('button[type="submit"]');
        
        try {
            loginButton.disabled = true;
            loginButton.textContent = messages.loading.login;
            
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            if (!user.emailVerified) {
                throw new Error(messages.loginErrors.verifyEmail);
            }
            
            window.location.href = '../index.html';
            
        } catch (error) {
            console.error("Eroare:", error);
            const errorMessage = document.getElementById('errorMessage') || document.createElement('div');
            errorMessage.id = 'errorMessage';
            errorMessage.className = 'text-red-500 text-sm mt-2';
            
            switch (error.code) {
                case 'auth/invalid-credential':
                    errorMessage.textContent = messages.loginErrors.invalidCredentials;
                    break;
                case 'auth/too-many-requests':
                    errorMessage.textContent = messages.loginErrors.tooManyAttempts;
                    break;
                default:
                    errorMessage.textContent = messages.loginErrors.default;
            }
            
            loginForm.appendChild(errorMessage);
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = messages.buttons.login;
        }
    });

    const forgotPasswordBtn = document.getElementById('forgotPassword');
    const resetModal = document.getElementById('resetModal');
    const cancelResetBtn = document.getElementById('cancelReset');
    const sendResetBtn = document.getElementById('sendReset');
    const resetEmailInput = document.getElementById('resetEmail');

    forgotPasswordBtn?.addEventListener('click', () => {
        resetModal?.classList.remove('hidden');
        resetEmailInput?.focus();
    });

    cancelResetBtn?.addEventListener('click', () => {
        resetModal?.classList.add('hidden');
        resetEmailInput.value = '';
    });

    resetModal?.addEventListener('click', (e) => {
        if (e.target === resetModal) {
            resetModal.classList.add('hidden');
            resetEmailInput.value = '';
        }
    });

    sendResetBtn?.addEventListener('click', async () => {
        const email = resetEmailInput?.value;
        if (!email) {
            alert(messages.resetPassword.emptyEmail);
            return;
        }

        try {
            sendResetBtn.disabled = true;
            sendResetBtn.textContent = messages.loading.reset;
            
            await sendPasswordResetEmail(auth, email);
            
            alert(messages.resetPassword.success);
            resetModal?.classList.add('hidden');
            resetEmailInput.value = '';
        } catch (error) {
            console.error('Error sending reset email:', error);
            alert(messages.resetPassword.error + error.message);
        } finally {
            sendResetBtn.disabled = false;
            sendResetBtn.textContent = messages.resetPassword.buttons.send;
        }
    });

    googleSignIn?.addEventListener('click', async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            window.location.href = '../index.html';
        } catch (error) {
            console.error("Eroare la autentificarea cu Google:", error);
            alert(error.code === 'auth/popup-closed-by-user' 
                ? messages.googleAuthErrors.popup 
                : messages.googleAuthErrors.default + error.message);
        }
    });

    const passwordHelpText = document.querySelector('.password-help-text');
    if (passwordHelpText) {
        passwordHelpText.textContent = messages.passwordLength;
    }
});