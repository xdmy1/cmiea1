document.getElementById("burger").addEventListener("click", function () {
    document.getElementById("phone-nav").classList.remove("hidden");
});

document.getElementById("close").addEventListener("click", function () {
    document.getElementById("phone-nav").classList.add("hidden");
});

let allCourses = [];

async function renderCourses() {
    try {
        if (allCourses.length === 0) {
            const response = await fetch('/cursuri.json');
            allCourses = await response.json();
        }

        let filteredCourses = filterCourses(allCourses);
        const container = document.getElementById('courses-container');
        
        container.innerHTML = '';

        filteredCourses.forEach(course => {
            const courseElement = `
            <a href=/curs.html?id=${course.id}>
                <div class="grid grid-cols-1 gap-4 p-5 border border-black/30 dark:border-white/50 rounded-xl h-full hover:bg-black/10 dark:hover:bg-gray-100/10">
                    <div class="flex justify-start items-center gap-2 font-medium ">
                        <div><img src="${course.image}" class="max-w-fit" alt="Course"></div>
                        <div><p class="lg:text-xl dark:text-white">${course.name}</p></div>
                    </div>
                    <div class="max-w-[250px]">
                        <p class="text-sm lg:text-md 2xl:text-lg text-sur dark:text-white/50">${course.description}</p>
                    </div>
                    <div class="flex justify-between text-xs dark:text-white/70">
                        <div class="flex flex-col gap-1">
                            <div class="flex gap-1 items-center">
                                <img src="/assets/timp.png" alt="Time">
                                <p class="lg:text-md 2xl:text-lg">${course.ore} ore</p>
                            </div>
                            <div class="flex gap-1 items-center">
                                <img src="/assets/calendar.png" alt="Calendar">
                                <p class="lg:text-md 2xl:text-lg">${course.perioada}</p>
                            </div>
                        </div>
                        <div class="flex flex-col gap-1">
                            <div class="flex gap-1 items-center">
                                <img src="/assets/locuri.png" alt="Spots">
                                <p class="lg:text-md 2xl:text-lg">${course.locuri} locuri</p>
                            </div>
                            <div class="flex gap-1 items-center">
                                <img src="/assets/experienta.png" alt="Experience">
                                <p class="lg:text-md 2xl:text-lg">${course.categorie}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </a>
            `;
            
            container.innerHTML += courseElement;
        });
        
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

function filterCourses(courses) {
    const categoryFilter = document.getElementById('categoryFilter').value;
    const durationFilter = document.getElementById('durationFilter').value;
    const languageFilter = document.getElementById('languageFilter').value;
    
    return courses.filter(course => {
        const matchesCategory = !categoryFilter || course.categorie === categoryFilter;
        const matchesDuration = !durationFilter || course.durata === durationFilter;
        const matchesLanguage = !languageFilter || course.limba === languageFilter;
        
        return matchesCategory && matchesDuration && matchesLanguage;
    });
}

document.addEventListener('DOMContentLoaded', function () {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
    const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');

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
    
    renderCourses();
    
    document.getElementById('categoryFilter').addEventListener('change', () => {
        renderCourses();
    });
    
    document.getElementById('durationFilter').addEventListener('change', () => {
        renderCourses();
    });
    
    document.getElementById('languageFilter').addEventListener('change', () => {
        renderCourses();
    });
});

document.documentElement.classList.toggle('dark');