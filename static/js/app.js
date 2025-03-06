document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('downloadForm');
    const progressBar = document.getElementById('progressBar');
    const alertArea = document.getElementById('alertArea');
    const downloadBtn = document.getElementById('downloadBtn');

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
        progressBar.classList.toggle('d-none', !loading);
    }

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
