import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, updateProfile, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
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
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();
  
  document.addEventListener('DOMContentLoaded', function() {
   
    const signupForm = document.getElementById('signupForm');
    
    if (!signupForm) {
      console.error("Signup form not found. Make sure the element with id 'signupForm' exists.");
      return;
    }
    
    signupForm.addEventListener("submit", async function(event) {
      event.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const firstName = document.getElementById('firstName').value;
      const lastName = document.getElementById('lastName').value;
      const fullName = `${firstName} ${lastName}`;
      
      let errorMessage = document.getElementById('errorMessage');
      if (!errorMessage) {
        errorMessage = document.createElement('div');
        errorMessage.id = 'errorMessage';
        errorMessage.className = 'text-red-500 text-sm mt-2';
        signupForm.appendChild(errorMessage);
      }
      
      errorMessage.style.display = 'none';
      
      const signupButton = document.querySelector('button[type="submit"]');
      if (signupButton) {
        signupButton.disabled = true;
        signupButton.textContent = messages.loading.register;
      }
      
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, {
            displayName: fullName
        });
        
        await setDoc(doc(db, "users", user.uid), {
            firstName: firstName,
            lastName: lastName,
            email: email,
            createdAt: new Date()
        });
        
        await sendEmailVerification(user);
        
        const verificationMessage = document.createElement('div');
        verificationMessage.className = 'bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mt-4';
        verificationMessage.innerHTML = `
            <p>${messages.emailVerification.success}</p>
            <p class="text-sm">${messages.emailVerification.checkEmail}</p>
            <p class="text-sm mt-2">${messages.emailVerification.redirect}</p>
        `;
        signupForm.appendChild(verificationMessage);
        
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 5000);
        
      } catch (error) {
        console.error("Eroare:", error);
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage.textContent = messages.registerErrors.emailInUse;
                break;
            case 'auth/invalid-email':
                errorMessage.textContent = messages.registerErrors.invalidEmail;
                break;
            case 'auth/weak-password':
                errorMessage.textContent = messages.registerErrors.weakPassword;
                break;
            default:
                errorMessage.textContent = messages.registerErrors.default;
        }
        errorMessage.style.display = 'block';
      } finally {
        if (signupButton) {
          signupButton.disabled = false;
          signupButton.textContent = messages.buttons.register;
        }
      }
    });

    document.getElementById('googleSignUp')?.addEventListener('click', async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                displayName: user.displayName,
                createdAt: new Date()
            });
    
            window.location.href = '../index.html';
        } catch (error) {
            console.error("Error with Google sign up:", error);
            alert("Error signing up with Google: " + error.message);
        }
    });
  });