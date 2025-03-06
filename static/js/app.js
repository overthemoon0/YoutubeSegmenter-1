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
    let slider;

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
});