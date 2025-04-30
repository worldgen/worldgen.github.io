/**
 * Shows the specified demo content pane and updates tab button states.
 * @param {string} demoId - The ID of the demo content div to show ('text-to-3d' or 'image-to-3d').
 */
function showDemoTab(demoId) {
    console.log(`Switching to tab: ${demoId}`); // Debugging output
    
    // Get all tab content panes and buttons
    const demoContents = document.querySelectorAll('.demo-content-tab');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabSlider = document.querySelector('.tab-slider');
    
    // Reset all tabs and buttons first
    demoContents.forEach(content => {
        content.classList.remove('active');
        content.classList.remove('fade-in');
        content.style.display = 'none'; // Explicitly hide
        
        // Pause all videos in inactive tabs
        const videos = content.querySelectorAll('video');
        videos.forEach(video => {
            if (!video.paused) {
                video.pause();
            }
        });
    });

    tabButtons.forEach(button => {
        button.classList.remove('active');
        button.setAttribute('aria-selected', 'false');
    });

    // Activate the selected tab
    const selectedContent = document.getElementById(demoId);
    if (selectedContent) {
        selectedContent.classList.add('active');
        selectedContent.style.display = 'block'; // Explicitly show
        
        // --- Call setupGallery AFTER the tab is visible ---
        const galleryContainer = selectedContent.querySelector('.gallery-container');
        if (galleryContainer) {
            // Use a small timeout to ensure rendering after display:block takes effect
            setTimeout(() => setupGallery(galleryContainer), 0);
        }
        // --- End of added block ---
        
        // Auto-play videos in the active tab
        const activeVideos = selectedContent.querySelectorAll('video');
        activeVideos.forEach(video => {
            // Reset the video to beginning
            video.currentTime = 0;
            // Try to play the video (may be blocked by browser autoplay policy)
            const playPromise = video.play();
            
            // Handle promise to avoid uncaught promise errors
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log('Auto-play prevented by browser:', error);
                    // Add play button or other visual cue that video needs interaction
                });
            }
        });
        
        setTimeout(() => {
            selectedContent.classList.add('fade-in');
        }, 10);
    }

    // Activate the correct button and position slider
    const activeButton = document.querySelector(`.tab-button[onclick*="${demoId}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
        activeButton.setAttribute('aria-selected', 'true');
        
        // Explicitly set text color for active button
        activeButton.style.color = 'white';
        
        // Find and set color for the icon within the active button
        const icon = activeButton.querySelector('.tab-icon');
        if (icon) {
            icon.style.color = 'white';
        }
        
        // Reset colors on inactive buttons
        tabButtons.forEach(button => {
            if (!button.classList.contains('active')) {
                button.style.color = '';
                const buttonIcon = button.querySelector('.tab-icon');
                if (buttonIcon) {
                    buttonIcon.style.color = '';
                }
            }
        });
        
        // Handle slider position explicitly
        if (demoId === 'text-to-3d') {
            tabSlider.style.transform = 'translateX(0)';
        } else if (demoId === 'image-to-3d') {
            tabSlider.style.transform = 'translateX(101%)';
        }
    }
}

/**
 * Sets up the gallery scrolling functionality for all galleries on the page.
 */
function setupGallery(galleryContainer) {
    const scrollGrid = galleryContainer.querySelector('.demo-grid');
    const prevButton = galleryContainer.querySelector('.gallery-arrow.prev');
    const nextButton = galleryContainer.querySelector('.gallery-arrow.next');
    const items = scrollGrid.querySelectorAll('.demo-item');
    
    if (!scrollGrid || !prevButton || !nextButton || items.length === 0) {
        return; 
    }
    
    const itemCount = items.length;
    let itemsVisible = getVisibleItemCount(); // Dynamically determine visible items
    const itemWidth = items[0].offsetWidth; 
    const gap = parseInt(window.getComputedStyle(scrollGrid).gap) || 24; 
    const scrollAmount = itemWidth + gap;
    let currentIndex = 0; // Default index

    // Function to determine number of visible items based on screen width
    function getVisibleItemCount() {
        const screenWidth = window.innerWidth;
        if (screenWidth < 640) { // Small mobile
            return 1;
        } else if (screenWidth < 768) { // Mobile
            return 1;
        } else if (screenWidth < 1024) { // Tablet
            return 2;
        } else {
            return 3; // Desktop
        }
    }

    // --- Calculate current index based on existing transform --- 
    if (scrollAmount > 0) { // Prevent division by zero if width calculation failed
        const currentTransform = scrollGrid.style.transform;
        const match = currentTransform.match(/translateX\(-?([\d.]+)px\)/);
        if (match && match[1]) {
            const currentTranslateX = parseFloat(match[1]);
            // Calculate index based on scroll amount, rounding to nearest index
            currentIndex = Math.round(Math.abs(currentTranslateX) / scrollAmount);
        }
    } else {
        console.warn('Scroll amount calculation failed for gallery', scrollGrid.id);
    }
    
    // Ensure calculated index is within bounds
    currentIndex = Math.max(0, Math.min(currentIndex, itemCount - itemsVisible));
    // Apply the potentially corrected transform immediately in case rounding changed it
    scrollGrid.style.transform = `translateX(-${currentIndex * scrollAmount}px)`;

    // --- Clear previous listeners if re-initializing ---
    if (galleryContainer._autoScrollIntervalId) {
        clearInterval(galleryContainer._autoScrollIntervalId);
    }
    if (galleryContainer._mouseEnterListener) {
        galleryContainer.removeEventListener('mouseenter', galleryContainer._mouseEnterListener);
    }
    if (galleryContainer._mouseLeaveListener) {
        galleryContainer.removeEventListener('mouseleave', galleryContainer._mouseLeaveListener);
    }
    if (galleryContainer._resizeListener) {
        window.removeEventListener('resize', galleryContainer._resizeListener);
    }
    
    // Remove touch event listeners if they exist
    if (scrollGrid._touchContainer) {
        const touchContainer = scrollGrid._touchContainer;
        if (scrollGrid._touchStartListener) {
            touchContainer.removeEventListener('touchstart', scrollGrid._touchStartListener);
        }
        if (scrollGrid._touchMoveListener) {
            touchContainer.removeEventListener('touchmove', scrollGrid._touchMoveListener);
        }
        if (scrollGrid._touchEndListener) {
            touchContainer.removeEventListener('touchend', scrollGrid._touchEndListener);
        }
        if (scrollGrid._touchCancelListener) {
            touchContainer.removeEventListener('touchcancel', scrollGrid._touchCancelListener);
        }
        
        // Also cleanup item touch listeners if needed
        const items = scrollGrid.querySelectorAll('.demo-item');
        if (items.length > 0 && scrollGrid._touchStartListener) {
            items.forEach(item => {
                item.removeEventListener('touchstart', scrollGrid._touchStartListener);
            });
        }
    }
    // --- End cleanup ---

    // --- Manually add fade-in class to items once on setup ---
    items.forEach(item => {
        // Use requestAnimationFrame to ensure class is added after initial render potentially preventing unwanted transitions
        requestAnimationFrame(() => {
            item.classList.add('fade-in');
        });
    });
    // --- End manual fade-in ---

    function updateArrows() {
        prevButton.disabled = currentIndex === 0;
        nextButton.disabled = currentIndex >= itemCount - itemsVisible;
        
        // Update visibility classes for mobile
        if (prevButton.disabled) {
            prevButton.classList.add('hidden-arrow');
        } else {
            prevButton.classList.remove('hidden-arrow');
        }
        
        if (nextButton.disabled) {
            nextButton.classList.add('hidden-arrow');
        } else {
            nextButton.classList.remove('hidden-arrow');
        }
    }
    
    // --- Remove potential old listeners before adding new ones --- 
    // This prevents listeners from accumulating if setupGallery runs multiple times on the same element
    let oldPrevListener = prevButton._clickListener;
    if (oldPrevListener) prevButton.removeEventListener('click', oldPrevListener);
    let oldNextListener = nextButton._clickListener;
    if (oldNextListener) nextButton.removeEventListener('click', oldNextListener);
    // --- End listener removal ---

    // Function to move to specific index with optional animation
    function moveToIndex(index, animate = true) {
        // Ensure index is within bounds
        index = Math.max(0, Math.min(index, itemCount - itemsVisible));
        
        // Update current index
        currentIndex = index;
        
        // Apply transform with or without animation
        if (!animate) {
            scrollGrid.style.transition = 'none';
            requestAnimationFrame(() => {
                scrollGrid.style.transform = `translateX(-${currentIndex * scrollAmount}px)`;
                requestAnimationFrame(() => {
                    scrollGrid.style.transition = ''; // Restore transition
                });
            });
        } else {
            scrollGrid.style.transform = `translateX(-${currentIndex * scrollAmount}px)`;
        }
        
        // Update arrow states
        updateArrows();
    }

    const prevListener = () => {
        if (currentIndex > 0) {
            // On mobile, scroll one at a time
            const scrollBy = window.innerWidth < 768 ? 1 : itemsVisible;
            currentIndex = Math.max(0, currentIndex - scrollBy); 
            scrollGrid.style.transform = `translateX(-${currentIndex * scrollAmount}px)`;
            updateArrows();
        }
    };
    prevButton.addEventListener('click', prevListener);
    prevButton._clickListener = prevListener; // Store listener reference
    
    const nextListener = () => {
        if (currentIndex < itemCount - itemsVisible) {
            // On mobile, scroll one at a time
            const scrollBy = window.innerWidth < 768 ? 1 : itemsVisible;
            currentIndex = Math.min(itemCount - itemsVisible, currentIndex + scrollBy); 
            scrollGrid.style.transform = `translateX(-${currentIndex * scrollAmount}px)`;
            updateArrows();
        }
    };
    nextButton.addEventListener('click', nextListener);
    nextButton._clickListener = nextListener; // Store listener reference
    
    // --- Touch Dragging Implementation ---
    let touchStartX = 0;
    let touchCurrentX = 0;
    let isDragging = false;
    let startTranslateX = 0;
    let lastTranslateX = 0;
    
    // Get the container element for touch events - using the scroller instead of grid
    const touchContainer = galleryContainer.querySelector('.gallery-scroller');
    
    // Make sure video elements don't capture touch events
    items.forEach(item => {
        const video = item.querySelector('video');
        if (video) {
            video.style.pointerEvents = 'none';
        }
        // Also make images non-interactive to touch
        const img = item.querySelector('img');
        if (img) {
            img.style.pointerEvents = 'none';
        }
    });
    
    // Touch start handler
    const touchStartListener = (e) => {
        console.log('Touch start detected');
        
        // Check if already dragging
        if (isDragging) {
            // If we're somehow still in a dragging state from a previous interaction,
            // force cleanup to allow a new drag to start
            scrollGrid.classList.remove('is-dragging');
            scrollGrid.style.transition = '';
        }
        
        // Start a new drag operation
        isDragging = true;
        
        // Prevent autoscroll during touch interaction
        stopAutoScroll();
        
        // Record starting position
        touchStartX = e.touches[0].clientX;
        touchCurrentX = touchStartX;
        
        // Get current transform
        const currentTransform = scrollGrid.style.transform;
        const match = currentTransform.match(/translateX\(-?([\d.]+)px\)/);
        startTranslateX = match ? parseFloat(match[1]) : currentIndex * scrollAmount;
        lastTranslateX = startTranslateX;
        
        // Add dragging class for visual feedback
        scrollGrid.classList.add('is-dragging');
        
        // Disable transitions while dragging
        scrollGrid.style.transition = 'none';
    };
    
    // Touch move handler
    const touchMoveListener = (e) => {
        if (!isDragging) return;
        
        // Prevent scrolling the page
        e.preventDefault();
        
        // Update current position
        touchCurrentX = e.touches[0].clientX;
        
        // Calculate drag distance
        const dragDelta = touchStartX - touchCurrentX;
        
        // Apply transform with drag offset
        const newTranslateX = startTranslateX + dragDelta;
        
        // Limit overscroll (allows some elasticity)
        let limitedTranslateX = newTranslateX;
        
        // Apply some resistance when trying to scroll beyond limits
        if (newTranslateX < 0) {
            limitedTranslateX = newTranslateX * 0.3; // More resistance when pull from left
        } else if (newTranslateX > (itemCount - itemsVisible) * scrollAmount) {
            const overscroll = newTranslateX - (itemCount - itemsVisible) * scrollAmount;
            limitedTranslateX = (itemCount - itemsVisible) * scrollAmount + overscroll * 0.3;
        }
        
        // Apply transform
        scrollGrid.style.transform = `translateX(-${limitedTranslateX}px)`;
        lastTranslateX = limitedTranslateX;
    };
    
    // Touch end handler
    const touchEndListener = (e) => {
        if (!isDragging) return;
        
        console.log('Touch end detected');
        
        // Remove dragging class
        scrollGrid.classList.remove('is-dragging');
        
        // Restore transitions
        scrollGrid.style.transition = '';
        
        // Calculate drag distance and velocity
        const totalDragDistance = touchStartX - touchCurrentX;
        const dragPercent = Math.abs(totalDragDistance) / itemWidth;
        
        // Calculate target index based on drag direction and amount
        let targetIndex = currentIndex;
        
        // Threshold for moving to next/prev (30% of item width)
        const moveThreshold = 0.3;
        
        if (dragPercent > moveThreshold) {
            if (totalDragDistance > 0) {
                // Dragged left → move right/next
                targetIndex = Math.min(itemCount - itemsVisible, currentIndex + 1);
            } else {
                // Dragged right → move left/prev
                targetIndex = Math.max(0, currentIndex - 1);
            }
        }
        
        // Move to the calculated target index
        moveToIndex(targetIndex);
        
        // Completely reset touch state to ensure clean state for next drag
        touchStartX = 0;
        touchCurrentX = 0;
        startTranslateX = 0;
        lastTranslateX = 0;
        isDragging = false;
        
        // Restart auto-scroll after a small delay
        setTimeout(startAutoScroll, 100);
    };
    
    // If touches are canceled or interrupted, make sure we reset everything
    const touchCancelListener = () => {
        console.log('Touch canceled');
        // Clean up state
        isDragging = false;
        scrollGrid.classList.remove('is-dragging');
        scrollGrid.style.transition = '';
        
        // Restart autoscroll
        startAutoScroll();
    };
    
    // Add touch event listeners to the touch container (scroller) instead of the grid
    touchContainer.addEventListener('touchstart', touchStartListener, { passive: true });
    touchContainer.addEventListener('touchmove', touchMoveListener, { passive: false });
    touchContainer.addEventListener('touchend', touchEndListener);
    touchContainer.addEventListener('touchcancel', touchCancelListener);
    
    // Also add touch listeners directly to each demo item to ensure they're draggable
    items.forEach(item => {
        item.addEventListener('touchstart', touchStartListener, { passive: true });
        // We don't need to add all listeners to each item, just the touchstart to initiate the drag
    });
    
    // Store listeners for cleanup
    scrollGrid._touchContainer = touchContainer;
    scrollGrid._touchStartListener = touchStartListener;
    scrollGrid._touchMoveListener = touchMoveListener;
    scrollGrid._touchEndListener = touchEndListener;
    scrollGrid._touchCancelListener = touchCancelListener;
    // --- End Touch Dragging Implementation ---
    
    // Handle window resize
    const resizeListener = () => {
        // Update visible items count
        itemsVisible = getVisibleItemCount();
        
        // Make sure current index is still valid
        currentIndex = Math.min(currentIndex, itemCount - itemsVisible);
        if (currentIndex < 0) currentIndex = 0;
        
        // Update transform and arrows
        scrollGrid.style.transform = `translateX(-${currentIndex * scrollAmount}px)`;
        updateArrows();
    };
    
    window.addEventListener('resize', resizeListener);
    galleryContainer._resizeListener = resizeListener;
    
    // --- Auto-scrolling logic --- 
    let autoScrollIntervalId = null;
    
    const autoScroll = () => {
        if (!galleryContainer) return; // Stop if container is gone
        if (nextButton.disabled) {
            // Reached the end, wrap around to the beginning
            currentIndex = 0;
            scrollGrid.style.transform = `translateX(0px)`;
            updateArrows();
        } else {
            // Trigger the next button's logic
            nextListener();
        }
    };

    const startAutoScroll = () => {
        // Clear existing interval before starting a new one
        if (autoScrollIntervalId) clearInterval(autoScrollIntervalId);
        autoScrollIntervalId = setInterval(autoScroll, 10000); // Scroll every 10 seconds
        galleryContainer._autoScrollIntervalId = autoScrollIntervalId; // Store ID on element
    };

    const stopAutoScroll = () => {
        if (autoScrollIntervalId) clearInterval(autoScrollIntervalId);
        autoScrollIntervalId = null;
        galleryContainer._autoScrollIntervalId = null;
    };

    // Pause on hover
    const mouseEnterListener = stopAutoScroll;
    const mouseLeaveListener = startAutoScroll;
    
    galleryContainer.addEventListener('mouseenter', mouseEnterListener);
    galleryContainer.addEventListener('mouseleave', mouseLeaveListener);
    
    // Store hover listeners for potential removal
    galleryContainer._mouseEnterListener = mouseEnterListener;
    galleryContainer._mouseLeaveListener = mouseLeaveListener;

    // Start auto-scrolling initially
    startAutoScroll();
    // --- End auto-scrolling logic ---

    // Initial arrow state based on potentially restored index
    updateArrows();
    
    // Run initial resize to set correct values
    resizeListener();
}

// Add animations and enhancements when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    
    // Initialize demo tabs (if present)
    const firstTab = document.querySelector('.tab-button');
    if (firstTab) {
        showDemoTab(firstTab.getAttribute('aria-controls'));
    }

    // Initialize all gallery sliders
    // document.querySelectorAll('.gallery-container').forEach(setupGallery);

    // -- Interactive Demo Initialization --
    console.log('Initializing interactive demo');
    const iframeContainer = document.getElementById('iframe-container');
    const iframe = document.getElementById('indoor');
    const thumbnailContainer = document.getElementById('results-objs-scroll');

    if (iframeContainer && iframe && thumbnailContainer) {
        console.log('All required elements found');
        const thumbnails = Array.from(thumbnailContainer.querySelectorAll('div[data-img-src]'));
        console.log('Found thumbnails:', thumbnails.length);
        
        // Log thumbnail attributes for debugging
        thumbnails.forEach(thumb => {
            console.log('Thumbnail:', {
                id: thumb.getAttribute('data-id'),
                imgSrc: thumb.getAttribute('data-img-src'),
                label: thumb.getAttribute('data-label')
            });
        });

        // Get the base URL from the iframe's data-src
        const baseUrl = iframe.getAttribute('data-src');
        console.log('Base iframe URL:', baseUrl);
        
        const iframeSources = {
            'indoor-thumb': 'https://worldgen.github.io/viser-client/?playbackPath=https://worldgen.github.io/assets/viser_recordings/indoor.viser&initialCameraPosition=-0.150,-0.300,0.05&initialCameraLookAt=0.000,0.000,0.000&initialCameraUp=-0.000,-0.000,1.000',
            'outdoor-thumb': 'https://worldgen.github.io/viser-client/?playbackPath=https://worldgen.github.io/assets/viser_recordings/outdoor.viser&initialCameraPosition=0.8,-0.556,0&initialCameraLookAt=-1,0,0'
        };
        
        console.log('Iframe sources:', iframeSources);

        // Track if iframe has been loaded
        let iframeLoaded = false;
        
        // Intersection Observer to load iframe when in viewport
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !iframeLoaded) {
                    // Initialize with the first thumbnail's source
                    const initialThumb = thumbnails[0];
                    if (initialThumb) {
                        const initialId = initialThumb.getAttribute('data-id');
                        const initialSrc = iframeSources[initialId];
                        if (initialSrc) {
                            console.log('Initial loading of iframe:', initialSrc);
                            // Directly set iframe src, no parent loading indicator needed
                            iframe.src = initialSrc;
                            setActiveThumbnail(initialThumb);
                            iframeLoaded = true;
                        }
                    }
                    observer.disconnect();
                }
            });
        }, { threshold: 0.1 });
        
        // Start observing the iframe container
        observer.observe(iframeContainer);

        function loadIframe(srcUrl) {
            console.log('Loading iframe with src:', srcUrl);
            iframe.src = srcUrl;
            // No need to manage loading indicators here
        }

        function setActiveThumbnail(selectedThumb) {
            thumbnails.forEach(thumb => {
                thumb.classList.remove('active-thumb');
            });
            selectedThumb.classList.add('active-thumb');
        }

        thumbnails.forEach(thumb => {
            const imgSrc = thumb.getAttribute('data-img-src');
            const thumbId = thumb.getAttribute('data-id');
            if (imgSrc) {
                thumb.style.backgroundImage = `url('${imgSrc}')`;
            }

            thumb.addEventListener('click', () => {
                console.log('Thumbnail clicked:', thumbId);
                const newSrc = iframeSources[thumbId];
                if (newSrc && iframe.src !== newSrc) { // Only load if different
                    console.log('Loading new source:', newSrc);
                    loadIframe(newSrc);
                    setActiveThumbnail(thumb);
                    iframeLoaded = true; // Mark as loaded on click too
                } else {
                    console.log('Source is the same or not found, not reloading.', thumbId);
                }
            });
        });

        // Initialize first thumbnail as active
        const initialThumb = thumbnails[0];
        if (initialThumb) {
            setActiveThumbnail(initialThumb);
        }
    } else {
        console.warn('Interactive demo elements not found.');
    }
    // -- End Interactive Demo Initialization --

    // Add reveal animations for feature cards and demo items
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    // Observe ONLY feature cards (removed .demo-item)
    document.querySelectorAll('.feature-card').forEach(item => {
        observer.observe(item);
    });
    
    // Custom tab hover effects
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('mouseenter', function() {
            if (!this.classList.contains('active')) {
                this.style.color = 'var(--primary-color)';
            }
        });
        
        button.addEventListener('mouseleave', function() {
            if (!this.classList.contains('active')) {
                this.style.color = '';
            }
        });
    });
    
    // Regular button hover effects
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.transition = 'all 0.2s ease';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // Add handlers to demo items to ensure videos always play
    document.querySelectorAll('.demo-item').forEach(item => {
        const video = item.querySelector('video');
        if (video) {
            // Remove ability to pause by clicking
            item.style.pointerEvents = 'none';
            
            // Always restart and play when visible
            video.addEventListener('ended', function() {
                this.currentTime = 0;
                this.play().catch(err => console.log('Video restart error:', err));
            });
            
            // Handle video errors
            video.addEventListener('error', function() {
                console.log('Video error occurred');
                this.style.opacity = '0.5';
            });
            
            // Add play attempt when tab becomes visible
            document.addEventListener('visibilitychange', function() {
                if (!document.hidden && video.closest('.demo-content-tab.active')) {
                    video.play().catch(err => console.log('Auto-play error:', err));
                }
            });
            
            // Additional event to prevent pausing
            video.addEventListener('pause', function() {
                // If video was paused (e.g., by losing focus), play it again
                if (this.closest('.demo-content-tab.active')) {
                    this.play().catch(err => console.log('Auto-play error:', err));
                }
            });
        }
    });
});

// Make sure existing functions are still available globally if needed
// (Alternatively, refactor setupGallery/showDemoTab to not rely on global scope)
window.showDemoTab = showDemoTab;
window.setupGallery = setupGallery;

// Example: Re-run gallery setup if tabs are switched (adjust if needed)
// This part might need refinement based on how tabs affect gallery visibility/layout
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        const targetId = button.getAttribute('aria-controls');
        const targetContent = document.getElementById(targetId);
        if (targetContent) {
            const gallery = targetContent.querySelector('.gallery-container');
            if (gallery) {
                // Delay setup slightly to allow tab content to become visible
                setTimeout(() => setupGallery(gallery), 50);
            }
        }
    });
});

// Call initial setup for the default active gallery
const initialActiveGallery = document.querySelector('.demo-content-tab.active .gallery-container');
if (initialActiveGallery) {
    // Use timeout to ensure layout is calculated correctly after initial render
    setTimeout(() => setupGallery(initialActiveGallery), 0);
} 