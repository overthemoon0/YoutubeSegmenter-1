import os
import logging
from pytube import YouTube
from moviepy.editor import VideoFileClip

logger = logging.getLogger(__name__)

def download_segment(url, start_seconds, end_seconds, format_type, temp_dir):
    try:
        # Download YouTube video
        yt = YouTube(url)

        if format_type == 'mp3':
            # For mp3, we download the audio stream
            stream = yt.streams.filter(only_audio=True).first()
        else:
            # For avi, we download the highest quality video
            stream = yt.streams.filter(progressive=True).get_highest_resolution()

        if not stream:
            raise Exception("No suitable stream found")

        # Download the file
        download_path = stream.download(output_path=temp_dir)

        # Load the video file
        video = VideoFileClip(download_path)

        # Cut the segment
        video = video.subclip(start_seconds, end_seconds)

        # Prepare output path
        output_file = os.path.join(temp_dir, f"output.{format_type}")

        if format_type == 'mp3':
            # Extract audio and save as MP3
            audio = video.audio
            audio.write_audiofile(output_file)
            audio.close()
        else:
            # Save as AVI
            video.write_videofile(output_file, codec='rawvideo')

        video.close()

        # Remove the original downloaded file
        os.remove(download_path)

        return output_file

    except Exception as e:
        logger.error(f"Error in download_segment: {str(e)}")
        raise e