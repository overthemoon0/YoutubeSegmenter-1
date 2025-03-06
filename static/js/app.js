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

    let player = null;
    let videoId = null;
    let videoDurationSeconds = 0;
    let youtubeApiReady = false;

    // Load YouTube API
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // Format seconds to HH:MM:SS.mmm format
    function formatTime(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    }

    // Parse time string to seconds
    function parseTimeToSeconds(timeStr) {
        // Handle HH:MM:SS.mmm format
        const match = timeStr.match(/^(\d+):(\d+):(\d+)(?:\.(\d+))?$/);
        if (match) {
            const hours = parseInt(match[1] || 0);
            const minutes = parseInt(match[2] || 0);
            const seconds = parseInt(match[3] || 0);
            const milliseconds = parseInt(match[4] || 0) / 1000;
            return hours * 3600 + minutes * 60 + seconds + milliseconds;
        }

        // Handle MM:SS format
        const simpleParts = timeStr.split(':');
        if (simpleParts.length === 2) {
            return parseInt(simpleParts[0]) * 60 + parseInt(simpleParts[1]);
        }

        return 0;
    }

    // Initialize the time range slider
    function initSlider(duration) {
        if (timeSlider.noUiSlider) {
            timeSlider.noUiSlider.destroy();
        }

        noUiSlider.create(timeSlider, {
            start: [0, duration],
            connect: true,
            range: {
                'min': 0,
                'max': duration
            },
            step: 0.001,
            format: {
                to: function(value) {
                    return formatTime(value);
                },
                from: function(value) {
                    return parseTimeToSeconds(value);
                }
            }
        });

        timeSlider.noUiSlider.on('update', function(values, handle) {
            if (handle === 0) {
                startTimeInput.value = values[0];
            } else {
                endTimeInput.value = values[1];
            }
        });

        // Connect inputs to slider
        startTimeInput.addEventListener('change', function() {
            const seconds = parseTimeToSeconds(this.value);
            timeSlider.noUiSlider.setHandle(0, seconds);

            if (player && typeof player.seekTo === 'function') {
                player.seekTo(seconds);
            }
        });

        endTimeInput.addEventListener('change', function() {
            const seconds = parseTimeToSeconds(this.value);
            timeSlider.noUiSlider.setHandle(1, seconds);
        });
    }

    // YouTube Player API callback
    window.onYouTubeIframeAPIReady = function() {
        youtubeApiReady = true;
    };

    function createYouTubePlayer(videoId) {
        // Clear previous player
        const videoPlayerEl = document.getElementById('videoPlayer');
        videoPlayerEl.innerHTML = '';

        // Safe destroy
        if (player && typeof player.destroy === 'function') {
            try {
                player.destroy();
            } catch (e) {
                console.error("Error destroying player:", e);
            }
        }

        // Create new player
        return new Promise((resolve, reject) => {
            const checkApiAndCreate = () => {
                if (youtubeApiReady) {
                    try {
                        player = new YT.Player('videoPlayer', {
                            height: '100%',
                            width: '100%',
                            videoId: videoId,
                            playerVars: {
                                'playsinline': 1,
                                'controls': 1,
                                'rel': 0
                            },
                            events: {
                                'onReady': () => resolve(player)
                            }
                        });
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    setTimeout(checkApiAndCreate, 100);
                }
            };

            checkApiAndCreate();
        });
    }

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

    // Form submission handler
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!form.checkValidity()) {
            e.stopPropagation();
            form.classList.add('was-validated');
            return;
        }

        setLoading(true);
        showAlert('Processing download request...', 'info');

        const formData = new FormData(form);

        try {
            const response = await fetch('/download', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                // Try to parse as JSON first for error messages
                try {
                    const data = await response.json();
                    throw new Error(data.error || 'Download failed');
                } catch (jsonError) {
                    // If not JSON, use generic error
                    throw new Error('Download failed: Server error');
                }
            }

            // Handle as blob for file download
            const blob = await response.blob();
            const filename = response.headers.get('content-disposition')
                ?.split('filename=')[1]?.replace(/"/g, '') || 'segment.mp4';
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showAlert('Download completed successfully!', 'success');

            if (data.file) {
                // Create a download link and trigger it
                const link = document.createElement('a');
                link.href = data.file;
                link.download = data.filename || 'segment';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

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
            const newVideoId = getYouTubeId(url);
            if (!newVideoId) {
                throw new Error('Invalid YouTube URL');
            }

            videoId = newVideoId;

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
            await createYouTubePlayer(videoId);

            // Show the preview container
            previewContainer.classList.remove('d-none');

        } catch (error) {
            console.error("Preview error:", error);
            showAlert(error.message);
        } finally {
            setLoading(false);
        }
    });
});