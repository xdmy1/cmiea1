import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

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

async function renderCourseDetails() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const courseId = urlParams.get('id');
        
        if (!courseId) {
            throw new Error('No course ID provided');
        }

        const [coursesResponse, faqResponse] = await Promise.all([
            fetch('/cursuri.json'),
            fetch('/faq.json')
        ]);

        const [courses, faqData] = await Promise.all([
            coursesResponse.json(),
            faqResponse.json()
        ]);

        const course = courses.find(c => c.id.toString() === courseId);
        
        if (!course) {
            throw new Error('Course not found');
        }

        const numeCursInput = document.getElementById('numeCurs');
        if (numeCursInput) {
            numeCursInput.value = course.name;
        }

        const container = document.getElementById('course-details-container');
      
        container.innerHTML = '';
      
      
        const courseDetails = `
            <div class="flex flex-col gap-5 mt-8">
            <div>
            <p class="font-semibold text-5xl">${course.emoji}</p>
          </div>
          <div>
            <p class="font-semibold text-4xl">${course.name}</p>
          </div>
          <div class="flex flex-wrap max-w-[400px] gap-2">
            <div class="eticheta bg-[#3542FF] flex gap-1 items-center"><img src="/assets/limbaAlb.png" alt=""><p class="text-white">${course.limba}</p> </div>
            <div class="eticheta bg-[#3542FF] flex gap-1 items-center"><img src="../assets/timpAlb.png" alt=""><p class="text-white">${course.ore} Ore</p> </div>
            <div class="eticheta bg-[#3542FF] flex gap-1 items-center"><img src="../assets/calendarAlb.png" alt=""><p class="text-white">${course.durata}</p> </div>
            <div class="eticheta bg-[#3542FF] flex gap-1 items-center"><img src="../assets/experientaAlb.png" alt=""><p class="text-white">${course.categorie}</p> </div>
            <div class="eticheta bg-[#3542FF] flex gap-1 items-center"><img src="../assets/locuriAlb.png" alt=""><p class="text-white">Locuri disponibile: ${course.locuri}</p> </div>
          </div>
        </div>
        `;
        
        container.innerHTML = courseDetails;

        document.getElementById('numeCurs').value = course.name;
        const learnSection = document.getElementById('learn-section');
        learnSection.innerHTML = `
            <div class="bg-white dark:bg-[#2a2a2a] rounded-xl shadow-xl p-6 flex flex-col gap-4">
                <p class="text-4xl font-semibold text-[#3542FF]">1</p>
                <h3 class="text-xl font-semibold">${course.titluInveti1}</h3>
                <p class="text-gray-700 dark:text-gray-300">${course.inveti1}</p>
            </div>
            <div class="bg-white dark:bg-[#2a2a2a] rounded-xl shadow-xl p-6 flex flex-col gap-4">
                <p class="text-4xl font-semibold text-[#3542FF]">2</p>
                <h3 class="text-xl font-semibold">${course.titluInveti2}</h3>
                <p class="text-gray-700 dark:text-gray-300">${course.inveti2}</p>
            </div>
            <div class="bg-white dark:bg-[#2a2a2a] rounded-xl shadow-xl p-6 flex flex-col gap-4">
                <p class="text-4xl font-semibold text-[#3542FF]">3</p>
                <h3 class="text-xl font-semibold">${course.titluInveti3}</h3>
                <p class="text-gray-700 dark:text-gray-300">${course.inveti3}</p>
            </div>
        `;

        const desktopSchedule = document.getElementById('desktop-schedule');
        desktopSchedule.innerHTML = `
            <tr class="bg-white dark:bg-[#2a2a2a]">
                ${course.zileSaptamana.map(hour => `
                    <td class="py-6 px-4 text-gray-700 dark:text-gray-300">${hour}</td>
                `).join('')}
            </tr>
        `;

      const mobileSchedule = document.getElementById('mobile-schedule');
const dayLetters = ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D'];
mobileSchedule.innerHTML = dayLetters.map((letter, index) => `
    <tr class="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
        <td class="py-4 px-4 text-left font-semibold bg-[#3542FF] text-white">${letter}</td>
        <td class="py-4 px-4 text-right">${course.zileSaptamana[index]}</td>
    </tr>
`).join('');

        onAuthStateChanged(auth, (user) => {
            updateSubmitButton(!!user);
        });

        const faqContainer = document.getElementById('faq-container');
        if (faqContainer) {
            const commonFaqs = faqData.common || [];
            const courseFaqs = (faqData.courses[courseId] || []).map(faq => ({
                ...faq,
                answer: faq.answer
                    .replace('{inveti1}', course.inveti1)
                    .replace('{inveti2}', course.inveti2)
                    .replace('{inveti3}', course.inveti3)
                    .replace('{ore}', course.ore)
            }));

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
        
    } catch (error) {
        console.error('Eroare', error);
        const container = document.getElementById('course-details-container');
        container.innerHTML = `
            <div class="text-center p-6 flex flex-col items-center justify-center h-[70vh]">
                <h2 class="text-3xl lg:text-5xl font-bold text-red-600">Eroare</h2>
                <a href="/" class="mt-2 underline">Intoarce-te la pagina principala</a>
            </div>
        `;
    }
}

function initializeFAQInteractions() {
    const faqItems = document.querySelectorAll('.flex-col.items-stretch');
    
    faqItems.forEach(item => {
        const header = item.querySelector('.flex.cursor-pointer');
        const content = item.querySelector('.pl-4.pr-4');
        const arrow = item.querySelector('.transition');
        
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
                
                otherContent.style.maxHeight = '0px';
                otherArrow.style.transform = 'rotate(0deg)';
            });
            
            if (!isActive) {
                content.style.maxHeight = content.scrollHeight + 'px';
                arrow.style.transform = 'rotate(180deg)';
            }
        });
    });
}

async function handleEnrollment(formData, user) {
    try {
        const courseId = new URLSearchParams(window.location.search).get('id');
        const courseName = document.getElementById('numeCurs').value;
        
        await addDoc(collection(db, "enrollments"), {
            userId: user.uid,
            courseId: courseId,
            courseName: courseName,
            userName: `${formData.get('Numele')} ${formData.get('Prenumele')}`,
            email: formData.get('Email'),
            phone: formData.get('Telefon'),
            birthDate: formData.get('Data nasterii'),
            occupation: formData.get('Ocupatia'),
            education: formData.get('Studii'),
            enrollmentDate: serverTimestamp(),
            status: "Activ"
        });
        
        const formDataObj = {};
        formData.forEach((value, key) => {
            formDataObj[key] = value;
        });

        const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formDataObj)
        });

        if (!response.ok) {
            throw new Error('Form submission failed');
        }

        return true;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}

function updateSubmitButton(isLoggedIn) {
    const submitButton = document.querySelector('button[type="submit"]');
    if (submitButton) {
        if (isLoggedIn) {
            submitButton.classList.remove('bg-gray-400', 'cursor-not-allowed');
            submitButton.classList.add('bg-blue-600', 'hover:bg-blue-700', 'cursor-pointer');
            submitButton.disabled = false;
        } else {
            submitButton.innerHTML="Crează-ți un cont mai întâi";
            submitButton.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'cursor-pointer');
            submitButton.classList.add('bg-gray-400', 'cursor-not-allowed');
            submitButton.disabled = true;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderCourseDetails();
    
    const form = document.getElementById('form');
    if (form) {
        onAuthStateChanged(auth, (user) => {
            updateSubmitButton(!!user);
            
            if (user) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const submitButton = form.querySelector('button[type="submit"]');
                    submitButton.disabled = true;
                    submitButton.textContent = 'Se procesează...';
                    
                    try {
                        const formData = new FormData(form);
                        const success = await handleEnrollment(formData, user);
                        
                        if (success) {
                            window.location.href = formData.get('redirect') || '/pages/succes.html';
                        }
                    } catch (error) {
                        console.error('Error:', error);
                        alert('A apărut o eroare. Te rugăm să încerci din nou.');
                    } finally {
                        submitButton.disabled = false;
                        submitButton.textContent = 'Inscrie-ma';
                    }
                });
            } else {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    alert('Pentru a te înscrie, te rugăm să te loghezi mai întâi!');
                });
            }
        });
    }
});