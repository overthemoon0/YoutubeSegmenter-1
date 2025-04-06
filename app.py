import os
import logging
from flask import Flask, render_template, request, jsonify, send_file
from youtube_handler import download_segment
import tempfile
import yt_dlp

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default-secret-key")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/preview', methods=['POST'])
def preview():
    try:
        url = request.form.get('url')
        if not url:
            return jsonify({'error': 'Missing URL'}), 400

        # Use more permissive format specification to avoid format errors
        ydl_opts = {
            'format': 'best[ext=mp4]/best',
            'quiet': True,
            'no_warnings': True,
            'format_sort': ['res', 'ext:mp4:m4a'],
            'format_sort_force': False,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return jsonify({
                'title': info.get('title', ''),
                'duration': info.get('duration', 0),
                'thumbnail': info.get('thumbnail', '')
            })

    except Exception as e:
        logger.error(f"Error getting video preview: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/download', methods=['POST'])
def download():
    try:
        url = request.form.get('url')
        start_time = request.form.get('start_time')
        end_time = request.form.get('end_time')
        format_type = request.form.get('format')

        if not all([url, start_time, end_time, format_type]):
            return jsonify({'error': 'Missing required parameters'}), 400

        # Convert time strings (HH:MM:SS.mmm) to seconds
        def time_to_seconds(time_str):
            parts = time_str.split('.')
            main_parts = parts[0].split(':')
            ms = float('0.' + parts[1]) if len(parts) > 1 else 0
            hours = int(main_parts[0]) if len(main_parts) > 2 else 0
            minutes = int(main_parts[-2] if len(main_parts) > 1 else main_parts[0])
            seconds = int(main_parts[-1])
            return hours * 3600 + minutes * 60 + seconds + ms

        start_seconds = time_to_seconds(start_time)
        end_seconds = time_to_seconds(end_time)

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

            # Extract the filename from the output_file path
            filename = os.path.basename(output_file)
            
            try:
                # Use ASCII-only filename to avoid encoding issues
                download_name = os.path.basename(output_file)
                # Ensure ASCII-only characters in the filename
                import re
                download_name = re.sub(r'[^\x00-\x7F]', '_', download_name)
                
                return send_file(
                    output_file,
                    as_attachment=True,
                    download_name=download_name
                )
            except Exception as e:
                logger.error(f"Error sending file: {str(e)}")
                return jsonify({'error': 'Failed to send file'}), 500

    except Exception as e:
        logger.error(f"Error processing download: {str(e)}")
        return jsonify({'error': str(e)}), 500