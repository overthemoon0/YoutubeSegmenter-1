import os
import logging
import yt_dlp

logger = logging.getLogger(__name__)

def download_segment(url, start_seconds, end_seconds, format_type, temp_dir):
    try:
        # First, extract video information to get the title
        ydl_opts = {
            'quiet': True,
            'format_sort': ['filesize:s'],  # Sort by filesize (smallest first)
            'format': f'best[filesize<?50M]' if format_type == 'avi' else 'worstaudio/worst',  # Limit filesize and prefer smaller formats
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            video_title = info.get('title', 'video')
            video_id = info.get('id', '')

        # Create a more concise filename with video ID and time range
        start_time_str = f"{int(start_seconds)}s"
        end_time_str = f"{int(end_seconds)}s"
        time_range = f"{start_time_str}-{end_time_str}"

        # Clean filename
        import re
        video_title = re.sub(r'[^\w\s.-]', '_', video_title)
        video_title = video_title.strip()
        if not video_title:
            video_title = 'video'

        # Create final filename with video ID and time range
        filename_base = f"{video_id}_{time_range}"

        # Configure yt-dlp options for fast download
        ydl_opts = {
            'format': 'worstaudio/worst' if format_type == 'mp3' else 'best[filesize<?50M]',
            'outtmpl': os.path.join(temp_dir, f'{filename_base}.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '96',  # Lower quality for faster processing
            }] if format_type == 'mp3' else [],
            'force_keyframes_at_cuts': True,
            'download_ranges': lambda info, __: [{"start_time": start_seconds, "end_time": end_seconds}],
            'quiet': True,
            'no_warnings': True,
            'format_sort': ['filesize:s'],  # Sort by filesize
            'concurrent_fragment_downloads': 5,  # Download fragments concurrently
            'retries': 1,  # Reduce retries for faster failure
            'socket_timeout': 5,  # Reduce timeout
        }

        # Download the segment
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # Get the output file path
        output_file = os.path.join(temp_dir, f'{filename_base}.{format_type}')

        if not os.path.exists(output_file):
            # If mp3 wasn't found, try with .mp3 extension
            if format_type == 'mp3':
                output_file = os.path.join(temp_dir, f'{filename_base}.mp3')
            else:
                # For video, check common formats
                for ext in ['mkv', 'mp4', 'webm']:
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