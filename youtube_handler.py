import os
import logging
import yt_dlp

logger = logging.getLogger(__name__)

def download_segment(url, start_seconds, end_seconds, format_type, temp_dir):
    try:
        # Configure yt-dlp options
        ydl_opts = {
            'format': 'bestaudio/best' if format_type == 'mp3' else 'best',
            'outtmpl': os.path.join(temp_dir, 'output.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
            }] if format_type == 'mp3' else [],
            'force_keyframes_at_cuts': True,
            'download_ranges': lambda _, __: [(start_seconds, end_seconds)],
        }

        # Download the segment
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # Get the output file path
        output_file = os.path.join(temp_dir, f'output.{format_type}')

        if not os.path.exists(output_file):
            # If mp3 wasn't found, try with .mp3 extension
            if format_type == 'mp3':
                output_file = os.path.join(temp_dir, 'output.mp3')
            else:
                # For video, might be mkv or mp4
                for ext in ['mkv', 'mp4', 'webm']:
                    test_file = os.path.join(temp_dir, f'output.{ext}')
                    if os.path.exists(test_file):
                        output_file = test_file
                        break

        if not os.path.exists(output_file):
            raise Exception("Download failed - output file not found")

        return output_file

    except Exception as e:
        logger.error(f"Error in download_segment: {str(e)}")
        raise e