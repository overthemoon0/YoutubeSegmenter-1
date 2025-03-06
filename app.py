import os
import logging
from flask import Flask, render_template, request, jsonify, send_file
from youtube_handler import download_segment
import tempfile

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default-secret-key")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/download', methods=['POST'])
def download():
    try:
        url = request.form.get('url')
        start_time = request.form.get('start_time')
        end_time = request.form.get('end_time')
        format_type = request.form.get('format')

        if not all([url, start_time, end_time, format_type]):
            return jsonify({'error': 'Missing required parameters'}), 400

        # Convert time strings to seconds
        start_seconds = sum(x * int(t) for x, t in zip([3600, 60, 1], start_time.split(":")))
        end_seconds = sum(x * int(t) for x, t in zip([3600, 60, 1], end_time.split(":")))

        if start_seconds >= end_seconds:
            return jsonify({'error': 'End time must be greater than start time'}), 400

        # Create temporary directory for the download
        with tempfile.TemporaryDirectory() as temp_dir:
            output_file = download_segment(
                url, 
                start_seconds, 
                end_seconds, 
                format_type, 
                temp_dir
            )
            
            if not output_file:
                return jsonify({'error': 'Failed to download video'}), 400

            return send_file(
                output_file,
                as_attachment=True,
                download_name=f"video_segment.{format_type}"
            )

    except Exception as e:
        logger.error(f"Error processing download: {str(e)}")
        return jsonify({'error': str(e)}), 500
