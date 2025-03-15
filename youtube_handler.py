import os
import logging
import yt_dlp

logger = logging.getLogger(__name__)

def download_segment(url, start_seconds, end_seconds, format_type, temp_dir):
    try:
        # First, extract video information using minimal options
        ydl_opts = {
            'quiet': True,
            'format': 'worst[ext=mp4]/worst',  # Use lowest quality for faster download
            'no_warnings': True,
            'socket_timeout': 3,  # Aggressive timeout
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            video_title = info.get('title', 'video')
            video_id = info.get('id', '')

        # Clean filename
        import re
        video_title = re.sub(r'[^\w\s.-]', '_', video_title)
        video_title = video_title.strip()
        if not video_title:
            video_title = 'video'

        # Create filename with time range
        time_range = f"{int(start_seconds)}s-{int(end_seconds)}s"
        filename_base = f"{video_id}_{time_range}"

        # Configure yt-dlp options for fastest possible download
        ydl_opts = {
            'format': ('worstaudio/worst' if format_type == 'mp3' 
                      else 'worst[ext=mp4]/worst[height<=480]'),  # Lower quality
            'outtmpl': os.path.join(temp_dir, f'{filename_base}.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '64',  # Lowest quality for fastest processing
            }] if format_type == 'mp3' else [],
            'force_keyframes_at_cuts': True,
            'download_ranges': lambda info, __: [{"start_time": start_seconds, "end_time": end_seconds}],
            'quiet': True,
            'no_warnings': True,
            'format_sort': ['+size', '+br'],  # Prefer smallest files
            'concurrent_fragment_downloads': 10,  # More concurrent downloads
            'retries': 1,
            'socket_timeout': 3,
            'fragment_retries': 1,
            'skip_download_archive': True,  # Skip checking archive
            'noprogress': True,  # Disable progress bar for speed
            'max_filesize': '50M',  # Limit file size
        }

        # Download the segment
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # Get the output file path
        output_ext = 'mp3' if format_type == 'mp3' else 'mp4'
        output_file = os.path.join(temp_dir, f'{filename_base}.{output_ext}')

        if not os.path.exists(output_file):
            # Try to find the file with any extension
            for ext in ['mp3', 'mp4', 'mkv', 'webm']:
                test_file = os.path.join(temp_dir, f'{filename_base}.{ext}')
                if os.path.exists(test_file):
                    output_file = test_file
                    break

        if not os.path.exists(output_file):
            raise Exception("Download failed - output file not found")

        return output_file, video_title

    except Exception as e:
        logger.error(f"Error in download_segment: {str(e)}")
        raise e