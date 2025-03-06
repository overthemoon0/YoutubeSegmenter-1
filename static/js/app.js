document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('downloadForm');
    const progressBar = document.getElementById('progressBar');
    const alertArea = document.getElementById('alertArea');
    const downloadBtn = document.getElementById('downloadBtn');
    const previewBtn = document.getElementById('previewBtn');
    const previewContainer = document.getElementById('previewContainer');
    const videoTitle = document.getElementById('videoTitle');
    const videoDuration = document.getElementById('videoDuration');
    const startTimeInput = document.getElementById('start_time');
    const endTimeInput = document.getElementById('end_time');
    const timeSlider = document.getElementById('timeSlider');
    const videoPlayer = document.getElementById('videoPlayer');
    
    let player;
    let videoId;
    let slider;
    let videoDurationSeconds = 0;

    // Load YouTube API
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // Format seconds to MM:SS format
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // Parse time string to seconds
    function parseTimeToSeconds(timeStr) {
        const parts = timeStr.split(':');
        let seconds = 0;
        
        if (parts.length === 3) { // HH:MM:SS
            seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
        } else if (parts.length === 2) { // MM:SS
            seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        } else if (parts.length === 1) { // SS
            seconds = parseInt(parts[0]);
        }
        
        return seconds;
    }

    // Initialize the time range slider
    function initSlider(duration) {
        if (slider) {
            slider.noUiSlider.destroy();
        }

        noUiSlider.create(timeSlider, {
            start: [0, duration],
            connect: true,
            range: {
                'min': 0,
                'max': duration
            },
            step: 1,
            format: {
                to: function (value) {
                    return formatTime(value);
                },
                from: function (value) {
                    return parseTimeToSeconds(value);
                }
            }
        });

        timeSlider.noUiSlider.on('update', function (values, handle) {
            if (handle === 0) {
                startTimeInput.value = values[0];
            } else {
                endTimeInput.value = values[1];
            }
        });

        // Connect inputs to slider
        startTimeInput.addEventListener('change', function () {
            const seconds = parseTimeToSeconds(this.value);
            timeSlider.noUiSlider.setHandle(0, seconds);
            
            if (player) {
                player.seekTo(seconds);
            }
        });

        endTimeInput.addEventListener('change', function () {
            timeSlider.noUiSlider.setHandle(1, parseTimeToSeconds(this.value));
        });

        slider = timeSlider;
    }

    // YouTube Player API callback
    window.onYouTubeIframeAPIReady = function() {
        // Player will be created when preview is clicked
    };

    function showAlert(message, type = 'danger') {
        alertArea.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    }

    function setLoading(loading) {
        downloadBtn.disabled = loading;
        previewBtn.disabled = loading;
        progressBar.classList.toggle('d-none', !loading);
    }
    
    // Extract YouTube video ID from URL
    function getYouTubeId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    function formatTime(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    }

    function initializeSlider(duration) {
        if (slider) {
            slider.destroy();
        }

        const timeline = document.getElementById('videoTimeline');
        slider = noUiSlider.create(timeline, {
            start: [0, duration],
            connect: true,
            range: {
                'min': 0,
                'max': duration
            },
            step: 0.001,
            format: {
                to: value => Math.round(value * 1000) / 1000,
                from: value => value
            }
        });

        slider.on('update', function(values) {
            startTimeInput.value = formatTime(values[0]);
            endTimeInput.value = formatTime(values[1]);
        });
    }

    previewBtn.addEventListener('click', async function() {
        const urlInput = document.getElementById('url');
        if (!urlInput.value) {
            showAlert('Please enter a YouTube URL');
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('url', urlInput.value);

            const response = await fetch('/preview', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to get video preview');
            }

            const data = await response.json();
            videoTitle.textContent = data.title;
            videoDuration.textContent = `Duration: ${formatTime(data.duration)}`;
            previewContainer.classList.remove('d-none');
            initializeSlider(data.duration);

        } catch (error) {
            showAlert(error.message);
        } finally {
            setLoading(false);
        }
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Clear previous alerts
        alertArea.innerHTML = '';

        // Form validation
        if (!form.checkValidity()) {
            e.stopPropagation();
            form.classList.add('was-validated');
            return;
        }

        setLoading(true);

        const formData = new FormData(form);

        try {
            const response = await fetch('/download', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to download video segment');
            }

            // Get filename from response headers if available
            const contentDisposition = response.headers.get('content-disposition');
            const fileName = contentDisposition
                ? contentDisposition.split('filename=')[1].replace(/"/g, '')
                : 'video_segment';

            // Create a blob from the response
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            // Create temporary link and trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            showAlert('Download completed successfully!', 'success');
        } catch (error) {
            showAlert(error.message);
        } finally {
            setLoading(false);
        }
    });
    
    // Preview button click handler
    previewBtn.addEventListener('click', async function() {
        const urlInput = document.getElementById('url');
        const url = urlInput.value.trim();
        
        if (!url) {
            showAlert('Please enter a YouTube URL');
            return;
        }
        
        setLoading(true);
        
        try {
            // Get video ID
            videoId = getYouTubeId(url);
            if (!videoId) {
                throw new Error('Invalid YouTube URL');
            }
            
            // Get video info from our API
            const formData = new FormData();
            formData.append('url', url);
            
            const response = await fetch('/preview', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch video preview');
            }
            
            const data = await response.json();
            
            // Update UI with video details
            videoTitle.textContent = data.title;
            videoDurationSeconds = data.duration;
            videoDuration.textContent = `Duration: ${formatTime(data.duration)}`;
            
            // Initialize the slider
            initSlider(data.duration);
            
            // Set start and end times
            startTimeInput.value = formatTime(0);
            endTimeInput.value = formatTime(data.duration);
            
            // Create YouTube player
            if (player) {
                player.destroy();
            }
            
            player = new YT.Player('videoPlayer', {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: {
                    'playsinline': 1,
                    'controls': 1,
                    'rel': 0
                }
            });
            
            // Show the preview container
            previewContainer.classList.remove('d-none');
            
        } catch (error) {
            showAlert(error.message);
        } finally {
            setLoading(false);
        }
    });
});