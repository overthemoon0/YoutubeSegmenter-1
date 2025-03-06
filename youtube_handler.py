import os
import logging
import yt_dlp

logger = logging.getLogger(__name__)

def download_segment(url, start_seconds, end_seconds, format_type, temp_dir):
    try:
        # First, extract video information to get the title
        with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
            info = ydl.extract_info(url, download=False)
            video_title = info.get('title', 'video')
            
        # Clean filename - remove invalid characters
        video_title = "".join(c for c in video_title if c.isalnum() or c in ' ._-').strip()
        if not video_title:
            video_title = 'video'
            
        # Configure yt-dlp options
        ydl_opts = {
            'format': 'bestaudio/best' if format_type == 'mp3' else 'best',
            'outtmpl': os.path.join(temp_dir, f'{video_title}.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
            }] if format_type == 'mp3' else [],
            'force_keyframes_at_cuts': True,
            'download_ranges': lambda info, __: [{"start_time": start_seconds, "end_time": end_seconds}],
        }

        # Download the segment
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # Get the output file path
        output_file = os.path.join(temp_dir, f'{video_title}.{format_type}')

        if not os.path.exists(output_file):
            # If mp3 wasn't found, try with .mp3 extension
            if format_type == 'mp3':
                output_file = os.path.join(temp_dir, f'{video_title}.mp3')
            else:
                # For video, might be mkv or mp4
                for ext in ['mkv', 'mp4', 'webm']:
                    test_file = os.path.join(temp_dir, f'{video_title}.{ext}')
                    if os.path.exists(test_file):
                        output_file = test_file
                        break

        if not os.path.exists(output_file):
            raise Exception("Download failed - output file not found")

        return output_file

    except Exception as e:
        logger.error(f"Error in download_segment: {str(e)}")
        raise e