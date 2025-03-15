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
    const startTimeDisplay = document.getElementById('startTimeDisplay');
    const endTimeDisplay = document.getElementById('endTimeDisplay');
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

    // Format seconds to HH:MM:SS format
    function formatTime(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // Parse time string to seconds
    function parseTimeToSeconds(timeStr) {
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return 0;
    }

    // Initialize the time range slider
    function initSlider(duration) {
        console.log('Initializing slider with duration:', duration);
        try {
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
                step: 1,
                format: {
                    to: function(value) {
                        return formatTime(Math.round(value));
                    },
                    from: function(value) {
                        return parseTimeToSeconds(value);
                    }
                }
            });

            // Update inputs and displays when slider changes
            timeSlider.noUiSlider.on('update', function(values, handle) {
                const time = parseTimeToSeconds(values[handle]);
                if (handle === 0) {
                    startTimeInput.value = formatTime(time);
                    startTimeDisplay.textContent = formatTime(time);
                    if (player && player.seekTo) {
                        player.seekTo(time);
                    }
                } else {
                    endTimeInput.value = formatTime(time);
                    endTimeDisplay.textContent = formatTime(time);
                }
            });

            console.log('Slider initialized successfully');
        } catch (error) {
            console.error('Error initializing slider:', error);
            showAlert('Error initializing time slider. Please try again.');
        }
    }

    // YouTube Player API callback
    window.onYouTubeIframeAPIReady = function() {
        youtubeApiReady = true;
    };

    function createYouTubePlayer(videoId) {
        const videoPlayerEl = document.getElementById('videoPlayer');
        videoPlayerEl.innerHTML = '';

        if (player && typeof player.destroy === 'function') {
            try {
                player.destroy();
            } catch (e) {
                console.error("Error destroying player:", e);
            }
        }

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
                                'onReady': () => resolve(player),
                                'onStateChange': (event) => {
                                    // Update slider position when video is playing
                                    if (event.data === YT.PlayerState.PLAYING) {
                                        const updateSliderPosition = () => {
                                            if (player && player.getCurrentTime) {
                                                const currentTime = player.getCurrentTime();
                                                const startTime = parseTimeToSeconds(startTimeInput.value);
                                                if (currentTime < startTime || currentTime > parseTimeToSeconds(endTimeInput.value)) {
                                                    player.seekTo(startTime);
                                                }
                                            }
                                            if (player && player.getPlayerState() === YT.PlayerState.PLAYING) {
                                                requestAnimationFrame(updateSliderPosition);
                                            }
                                        };
                                        updateSliderPosition();
                                    }
                                }
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
                const data = await response.json();
                throw new Error(data.error || 'Download failed');
            }

            const blob = await response.blob();
            const filename = response.headers.get('content-disposition')
                ?.split('filename=')[1]?.replace(/"/g, '') || 'segment.mp4';

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();

            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

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
            const newVideoId = getYouTubeId(url);
            if (!newVideoId) {
                throw new Error('Invalid YouTube URL');
            }

            videoId = newVideoId;

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

            videoTitle.textContent = data.title;
            videoDurationSeconds = data.duration;
            videoDuration.textContent = `Duration: ${formatTime(data.duration)}`;

            initSlider(data.duration);

            startTimeInput.value = formatTime(0);
            endTimeInput.value = formatTime(data.duration);
            startTimeDisplay.textContent = formatTime(0);
            endTimeDisplay.textContent = formatTime(data.duration);

            await createYouTubePlayer(videoId);

            previewContainer.classList.remove('d-none');

        } catch (error) {
            console.error("Preview error:", error);
            showAlert(error.message);
        } finally {
            setLoading(false);
        }
    });
});