import os
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
from PIL import Image
from flask import current_app
import boto3
from botocore.exceptions import ClientError


class UploadService:
    """
    Service for handling file uploads (images and videos)
    Supports both local storage (dev) and AWS S3 (production)
    """

    @staticmethod
    def _get_s3_client():
        """Get configured S3 client"""
        return boto3.client(
            's3',
            aws_access_key_id=current_app.config.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=current_app.config.get('AWS_SECRET_ACCESS_KEY'),
            region_name=current_app.config.get('AWS_REGION', 'eu-west-1')
        )

    @staticmethod
    def _use_s3():
        """Check if S3 should be used (production)"""
        return (
            current_app.config.get('AWS_ACCESS_KEY_ID') and
            current_app.config.get('AWS_SECRET_ACCESS_KEY') and
            current_app.config.get('AWS_S3_BUCKET')
        )

    @staticmethod
    def _allowed_file(filename, allowed_extensions):
        """Check if file extension is allowed"""
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in allowed_extensions

    @staticmethod
    def _generate_unique_filename(original_filename):
        """Generate unique filename while preserving extension"""
        ext = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
        unique_id = uuid.uuid4().hex
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        return f"{timestamp}_{unique_id}.{ext}"

    @staticmethod
    def upload_image(file, folder='images', max_size=(1920, 1920), quality=85):
        """
        Upload and compress an image

        Args:
            file: FileStorage object from request.files
            folder: Subfolder within uploads (images, avatars, check_ins)
            max_size: Tuple (width, height) for max dimensions
            quality: JPEG quality (1-100)

        Returns:
            dict: {'url': file_url, 'filename': filename, 'size': file_size}
        """
        if not file:
            raise ValueError("No file provided")

        # Check file extension
        allowed_extensions = current_app.config.get('ALLOWED_IMAGE_EXTENSIONS', {'jpg', 'jpeg', 'png', 'gif', 'webp'})
        if not UploadService._allowed_file(file.filename, allowed_extensions):
            raise ValueError(f"File type not allowed. Allowed: {', '.join(allowed_extensions)}")

        # Generate unique filename
        original_filename = secure_filename(file.filename)
        unique_filename = UploadService._generate_unique_filename(original_filename)

        # Open and process image
        try:
            image = Image.open(file)

            # Convert RGBA to RGB if necessary (for JPEG)
            if image.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background

            # Resize if larger than max_size
            image.thumbnail(max_size, Image.Resampling.LANCZOS)

            # Save to temporary buffer
            import io
            buffer = io.BytesIO()

            # Determine format
            file_ext = unique_filename.rsplit('.', 1)[1].lower()
            format_map = {
                'jpg': 'JPEG',
                'jpeg': 'JPEG',
                'png': 'PNG',
                'gif': 'GIF',
                'webp': 'WEBP'
            }
            save_format = format_map.get(file_ext, 'JPEG')

            # Save with compression
            if save_format == 'JPEG':
                image.save(buffer, format=save_format, quality=quality, optimize=True)
            elif save_format == 'PNG':
                image.save(buffer, format=save_format, optimize=True)
            else:
                image.save(buffer, format=save_format)

            buffer.seek(0)
            file_size = buffer.getbuffer().nbytes

        except Exception as e:
            raise ValueError(f"Invalid image file: {str(e)}")

        # Upload to S3 or local storage
        if UploadService._use_s3():
            url = UploadService._upload_to_s3(buffer, unique_filename, folder, 'image')
        else:
            url = UploadService._upload_to_local(buffer, unique_filename, folder)

        return {
            'url': url,
            'filename': unique_filename,
            'size': file_size,
            'width': image.width,
            'height': image.height
        }

    @staticmethod
    def upload_video(file, folder='videos'):
        """
        Upload a video file

        Args:
            file: FileStorage object from request.files
            folder: Subfolder within uploads (videos, form_checks)

        Returns:
            dict: {'url': file_url, 'filename': filename, 'size': file_size}
        """
        if not file:
            raise ValueError("No file provided")

        # Check file extension
        allowed_extensions = current_app.config.get('ALLOWED_VIDEO_EXTENSIONS', {'mp4', 'mov', 'avi', 'webm'})
        if not UploadService._allowed_file(file.filename, allowed_extensions):
            raise ValueError(f"File type not allowed. Allowed: {', '.join(allowed_extensions)}")

        # Check file size (max 100MB)
        max_size = current_app.config.get('MAX_VIDEO_SIZE', 100 * 1024 * 1024)  # 100MB
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        if file_size > max_size:
            raise ValueError(f"File too large. Max size: {max_size / (1024*1024):.0f}MB")

        # Generate unique filename
        original_filename = secure_filename(file.filename)
        unique_filename = UploadService._generate_unique_filename(original_filename)

        # Upload to S3 or local storage
        if UploadService._use_s3():
            url = UploadService._upload_to_s3(file, unique_filename, folder, 'video')
        else:
            url = UploadService._upload_to_local(file, unique_filename, folder)

        return {
            'url': url,
            'filename': unique_filename,
            'size': file_size
        }

    @staticmethod
    def upload_avatar(file, user_id):
        """
        Upload user avatar with specific processing

        Args:
            file: FileStorage object
            user_id: User ID for organizing files

        Returns:
            dict: Upload result
        """
        # Avatars are square, smaller, and higher quality
        return UploadService.upload_image(
            file,
            folder=f'avatars/{user_id}',
            max_size=(500, 500),
            quality=90
        )

    @staticmethod
    def upload_check_in_photo(file, athlete_id, check_in_id):
        """
        Upload check-in progress photo

        Args:
            file: FileStorage object
            athlete_id: Athlete ID
            check_in_id: Check-in ID

        Returns:
            dict: Upload result
        """
        return UploadService.upload_image(
            file,
            folder=f'check_ins/{athlete_id}/{check_in_id}',
            max_size=(1920, 1920),
            quality=85
        )

    @staticmethod
    def upload_form_check_video(file, athlete_id):
        """
        Upload form check video

        Args:
            file: FileStorage object
            athlete_id: Athlete ID

        Returns:
            dict: Upload result
        """
        return UploadService.upload_video(
            file,
            folder=f'form_checks/{athlete_id}'
        )

    @staticmethod
    def upload_exercise_video(file, exercise_id):
        """
        Upload exercise tutorial video

        Args:
            file: FileStorage object
            exercise_id: Exercise ID

        Returns:
            dict: Upload result
        """
        return UploadService.upload_video(
            file,
            folder=f'exercises/{exercise_id}'
        )

    @staticmethod
    def _upload_to_local(file_data, filename, folder):
        """
        Upload file to local filesystem

        Args:
            file_data: File object or BytesIO buffer
            filename: Unique filename
            folder: Subfolder path

        Returns:
            str: Relative URL to file
        """
        # Create directory if it doesn't exist
        upload_folder = current_app.config['UPLOAD_FOLDER']
        full_folder_path = os.path.join(upload_folder, folder)
        os.makedirs(full_folder_path, exist_ok=True)

        # Save file
        file_path = os.path.join(full_folder_path, filename)

        if hasattr(file_data, 'save'):
            # FileStorage object
            file_data.save(file_path)
        else:
            # BytesIO buffer
            with open(file_path, 'wb') as f:
                f.write(file_data.read())

        # Return URL (relative to static/uploads)
        return f'/static/uploads/{folder}/{filename}'

    @staticmethod
    def _upload_to_s3(file_data, filename, folder, content_type_prefix='image'):
        """
        Upload file to AWS S3

        Args:
            file_data: File object or BytesIO buffer
            filename: Unique filename
            folder: Subfolder path
            content_type_prefix: 'image' or 'video'

        Returns:
            str: Public URL to S3 file
        """
        s3_client = UploadService._get_s3_client()
        bucket = current_app.config['AWS_S3_BUCKET']

        # Full S3 key
        s3_key = f'{folder}/{filename}'

        # Determine content type
        ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
        content_type_map = {
            # Images
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            # Videos
            'mp4': 'video/mp4',
            'mov': 'video/quicktime',
            'avi': 'video/x-msvideo',
            'webm': 'video/webm'
        }
        content_type = content_type_map.get(ext, f'{content_type_prefix}/octet-stream')

        try:
            # Upload to S3
            extra_args = {
                'ContentType': content_type,
                'ACL': 'public-read'  # Make file publicly accessible
            }

            if hasattr(file_data, 'read'):
                # File-like object
                s3_client.upload_fileobj(file_data, bucket, s3_key, ExtraArgs=extra_args)
            else:
                # BytesIO buffer
                s3_client.put_object(
                    Bucket=bucket,
                    Key=s3_key,
                    Body=file_data.read(),
                    **extra_args
                )

            # Generate public URL
            region = current_app.config.get('AWS_REGION', 'eu-west-1')
            url = f"https://{bucket}.s3.{region}.amazonaws.com/{s3_key}"

            return url

        except ClientError as e:
            current_app.logger.error(f"S3 upload error: {str(e)}")
            raise ValueError(f"Failed to upload to S3: {str(e)}")

    @staticmethod
    def delete_file(file_url):
        """
        Delete a file from storage

        Args:
            file_url: URL or path to file

        Returns:
            bool: True if deleted successfully
        """
        if not file_url:
            return False

        try:
            if UploadService._use_s3() and 's3' in file_url:
                # Delete from S3
                s3_client = UploadService._get_s3_client()
                bucket = current_app.config['AWS_S3_BUCKET']

                # Extract S3 key from URL
                # URL format: https://bucket.s3.region.amazonaws.com/folder/filename
                s3_key = file_url.split(f"{bucket}.s3.")[1].split('.amazonaws.com/')[1]

                s3_client.delete_object(Bucket=bucket, Key=s3_key)
                return True
            else:
                # Delete from local storage
                # URL format: /static/uploads/folder/filename
                if file_url.startswith('/static/uploads/'):
                    relative_path = file_url.replace('/static/uploads/', '')
                    full_path = os.path.join(current_app.config['UPLOAD_FOLDER'], relative_path)

                    if os.path.exists(full_path):
                        os.remove(full_path)
                        return True

        except Exception as e:
            current_app.logger.error(f"File deletion error: {str(e)}")

        return False

    @staticmethod
    def get_file_info(file_url):
        """
        Get information about an uploaded file

        Args:
            file_url: URL to file

        Returns:
            dict: File information (size, type, etc.)
        """
        if not file_url:
            return None

        try:
            if UploadService._use_s3() and 's3' in file_url:
                # Get S3 metadata
                s3_client = UploadService._get_s3_client()
                bucket = current_app.config['AWS_S3_BUCKET']

                s3_key = file_url.split(f"{bucket}.s3.")[1].split('.amazonaws.com/')[1]

                response = s3_client.head_object(Bucket=bucket, Key=s3_key)

                return {
                    'size': response['ContentLength'],
                    'content_type': response.get('ContentType'),
                    'last_modified': response.get('LastModified')
                }
            else:
                # Get local file info
                if file_url.startswith('/static/uploads/'):
                    relative_path = file_url.replace('/static/uploads/', '')
                    full_path = os.path.join(current_app.config['UPLOAD_FOLDER'], relative_path)

                    if os.path.exists(full_path):
                        stat = os.stat(full_path)
                        return {
                            'size': stat.st_size,
                            'last_modified': datetime.fromtimestamp(stat.st_mtime)
                        }

        except Exception as e:
            current_app.logger.error(f"File info error: {str(e)}")

        return None
