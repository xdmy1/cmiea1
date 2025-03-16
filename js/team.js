document.addEventListener('DOMContentLoaded', function() {
    const slider = document.getElementById('teamSlider');
    const items = slider.querySelectorAll('.slider-item');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    let currentIndex = 0;
    let itemWidth = items[0].offsetWidth;
    const totalItems = items.length;
    const originalItems = totalItems - 2; 
    let autoScrollInterval;
    let isDown = false;
    let startX;
    let scrollLeft;
    

    function initSlider() {

      updateItemWidth();
      

      setupEventListeners();
      

      startAutoScroll();
    }
    
 
    function updateItemWidth() {
      itemWidth = items[0].offsetWidth;
    }
    
    function setupEventListeners() {

      nextBtn.addEventListener('click', handleNextClick);
      prevBtn.addEventListener('click', handlePrevClick);
      

      slider.addEventListener('mousedown', handleMouseDown);
      slider.addEventListener('mouseleave', handleMouseLeave);
      slider.addEventListener('mouseup', handleMouseUp);
      slider.addEventListener('mousemove', handleMouseMove);
      

      slider.addEventListener('touchstart', handleTouchStart);
      slider.addEventListener('touchend', handleTouchEnd);
      

      window.addEventListener('resize', updateItemWidth);
    }
    

    function startAutoScroll() {

      stopAutoScroll();
      

      autoScrollInterval = setInterval(scrollNext, 10000);
    }
    
   
    function stopAutoScroll() {
      clearInterval(autoScrollInterval);
    }
    

    function scrollNext() {
      currentIndex++;
      
      if (currentIndex >= originalItems) {

        currentIndex = 0;
        slider.scrollTo({
          left: 0,
          behavior: 'auto'
        });
        

        setTimeout(() => {
          currentIndex = 1;
          scrollToIndex(currentIndex, 'smooth');
        }, 50);
      } else {
        scrollToIndex(currentIndex, 'smooth');
      }
    }
    

    function scrollPrev() {
      currentIndex--;
      if (currentIndex < 0) {

        currentIndex = originalItems - 1;
        scrollToIndex(currentIndex, 'auto');
        

        setTimeout(() => {
          currentIndex = originalItems - 2;
          scrollToIndex(currentIndex, 'smooth');
        }, 50);
      } else {        scrollToIndex(currentIndex, 'smooth');
      }
    }
    

    function scrollToIndex(index, behavior) {
      slider.scrollTo({
        left: index * itemWidth,
        behavior: behavior
      });
    }
    
    function handleNextClick() {
      stopAutoScroll();
      scrollNext();
      startAutoScroll();
    }
    
    function handlePrevClick() {
      stopAutoScroll();
      scrollPrev();
      startAutoScroll();
    }
    
    function handleMouseDown(e) {
      isDown = true;
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
      slider.style.cursor = 'grabbing';
      stopAutoScroll();
    }
    
    function handleMouseLeave() {
      if (isDown) {
        isDown = false;
        slider.style.cursor = 'grab';
        startAutoScroll();
      }
    }

    function handleMouseUp() {
      isDown = false;
      slider.style.cursor = 'grab';
      startAutoScroll();
    }
    
    function handleMouseMove(e) {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX);
      slider.scrollLeft = scrollLeft - walk;
    }
    

    function handleTouchStart() {
      stopAutoScroll();
    }
    

    function handleTouchEnd() {
      startAutoScroll();
    }
    

    initSlider();
  });