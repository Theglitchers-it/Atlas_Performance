"""
File Upload Service
Gestisce upload di file (immagini, video, documenti) con supporto per storage locale e S3
"""
import os
import hashlib
from datetime import datetime
from werkzeug.utils import secure_filename
from PIL import Image
import boto3
from botocore.exceptions import ClientError
from flask import current_app


class FileUploadService:
    """Service for handling file uploads with support for local and S3 storage"""

    # Allowed file extensions by category
    ALLOWED_IMAGES = {'jpg', 'jpeg', 'png', 'gif', 'webp'}
    ALLOWED_VIDEOS = {'mp4', 'mov', 'avi', 'webm', 'mkv'}
    ALLOWED_DOCUMENTS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'}

    # Maximum file sizes (in bytes)
    MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100MB
    MAX_DOCUMENT_SIZE = 5 * 1024 * 1024  # 5MB

    # Image thumbnail sizes
    THUMBNAIL_SIZES = {
        'small': (150, 150),
        'medium': (300, 300),
        'large': (600, 600)
    }

    @staticmethod
    def get_file_extension(filename):
        """Extract file extension from filename"""
        if '.' in filename:
            return filename.rsplit('.', 1)[1].lower()
        return None

    @staticmethod
    def is_allowed_file(filename, file_type='image'):
        """Check if file extension is allowed for the given type"""
        ext = FileUploadService.get_file_extension(filename)
        if not ext:
            return False

        if file_type == 'image':
            return ext in FileUploadService.ALLOWED_IMAGES
        elif file_type == 'video':
            return ext in FileUploadService.ALLOWED_VIDEOS
        elif file_type == 'document':
            return ext in FileUploadService.ALLOWED_DOCUMENTS
        return False

    @staticmethod
    def validate_file_size(file_size, file_type='image'):
        """Validate file size based on type"""
        if file_type == 'image':
            return file_size <= FileUploadService.MAX_IMAGE_SIZE
        elif file_type == 'video':
            return file_size <= FileUploadService.MAX_VIDEO_SIZE
        elif file_type == 'document':
            return file_size <= FileUploadService.MAX_DOCUMENT_SIZE
        return False

    @staticmethod
    def generate_unique_filename(original_filename, user_id=None):
        """Generate unique filename using timestamp and hash"""
        ext = FileUploadService.get_file_extension(original_filename)
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')

        # Create hash from original filename and timestamp
        hash_input = f"{original_filename}{timestamp}{user_id or ''}".encode()
        file_hash = hashlib.md5(hash_input).hexdigest()[:8]

        return f"{timestamp}_{file_hash}.{ext}"

    @staticmethod
    def save_local_file(file, upload_folder, subfolder='', filename=None):
        """Save file to local filesystem"""
        if not filename:
            filename = FileUploadService.generate_unique_filename(file.filename)
        else:
            filename = secure_filename(filename)

        # Create full path
        folder_path = os.path.join(upload_folder, subfolder)
        os.makedirs(folder_path, exist_ok=True)

        file_path = os.path.join(folder_path, filename)
        file.save(file_path)

        # Return relative path for database storage
        return os.path.join(subfolder, filename).replace('\\', '/')

    @staticmethod
    def create_thumbnail(image_path, size='medium'):
        """Create thumbnail from image"""
        if size not in FileUploadService.THUMBNAIL_SIZES:
            size = 'medium'

        thumbnail_size = FileUploadService.THUMBNAIL_SIZES[size]

        try:
            img = Image.open(image_path)

            # Convert RGBA to RGB if necessary
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background

            # Create thumbnail
            img.thumbnail(thumbnail_size, Image.Resampling.LANCZOS)

            # Generate thumbnail filename
            base_path, ext = os.path.splitext(image_path)
            thumb_path = f"{base_path}_thumb_{size}{ext}"

            img.save(thumb_path, quality=85, optimize=True)
            return thumb_path

        except Exception as e:
            print(f"Error creating thumbnail: {str(e)}")
            return None

    @staticmethod
    def upload_profile_picture(file, user_id, tenant_id):
        """Upload user profile picture"""
        # Validate file
        if not FileUploadService.is_allowed_file(file.filename, 'image'):
            return {'success': False, 'message': 'Invalid file type. Only images are allowed.'}

        # Check file size (read content to get size)
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        if not FileUploadService.validate_file_size(file_size, 'image'):
            return {'success': False, 'message': 'File size exceeds maximum allowed (10MB).'}

        try:
            # Generate filename
            filename = FileUploadService.generate_unique_filename(file.filename, user_id)

            # Save to local storage
            upload_folder = current_app.config['UPLOAD_FOLDER']
            subfolder = f'avatars/tenant_{tenant_id}'

            file_path = FileUploadService.save_local_file(file, upload_folder, subfolder, filename)

            # Create thumbnail
            full_path = os.path.join(upload_folder, file_path)
            FileUploadService.create_thumbnail(full_path, 'small')
            FileUploadService.create_thumbnail(full_path, 'medium')

            # Return URL path
            url = f'/uploads/{file_path}'

            return {
                'success': True,
                'message': 'Profile picture uploaded successfully',
                'url': url,
                'filename': filename
            }

        except Exception as e:
            return {'success': False, 'message': f'Upload failed: {str(e)}'}

    @staticmethod
    def upload_progress_photo(file, athlete_id, tenant_id, category='front'):
        """Upload athlete progress photo"""
        if not FileUploadService.is_allowed_file(file.filename, 'image'):
            return {'success': False, 'message': 'Invalid file type. Only images are allowed.'}

        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        if not FileUploadService.validate_file_size(file_size, 'image'):
            return {'success': False, 'message': 'File size exceeds maximum allowed (10MB).'}

        try:
            filename = FileUploadService.generate_unique_filename(file.filename, athlete_id)
            upload_folder = current_app.config['UPLOAD_FOLDER']
            subfolder = f'progress_photos/athlete_{athlete_id}/{category}'

            file_path = FileUploadService.save_local_file(file, upload_folder, subfolder, filename)

            # Create thumbnails
            full_path = os.path.join(upload_folder, file_path)
            FileUploadService.create_thumbnail(full_path, 'medium')
            FileUploadService.create_thumbnail(full_path, 'large')

            url = f'/uploads/{file_path}'

            return {
                'success': True,
                'message': 'Progress photo uploaded successfully',
                'url': url,
                'filename': filename,
                'category': category
            }

        except Exception as e:
            return {'success': False, 'message': f'Upload failed: {str(e)}'}

    @staticmethod
    def upload_exercise_video(file, exercise_id, tenant_id):
        """Upload exercise demonstration video"""
        if not FileUploadService.is_allowed_file(file.filename, 'video'):
            return {'success': False, 'message': 'Invalid file type. Only videos are allowed.'}

        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        if not FileUploadService.validate_file_size(file_size, 'video'):
            return {'success': False, 'message': 'File size exceeds maximum allowed (100MB).'}

        try:
            filename = FileUploadService.generate_unique_filename(file.filename, exercise_id)
            upload_folder = current_app.config['UPLOAD_FOLDER']
            subfolder = f'exercise_videos/tenant_{tenant_id}'

            file_path = FileUploadService.save_local_file(file, upload_folder, subfolder, filename)
            url = f'/uploads/{file_path}'

            return {
                'success': True,
                'message': 'Exercise video uploaded successfully',
                'url': url,
                'filename': filename
            }

        except Exception as e:
            return {'success': False, 'message': f'Upload failed: {str(e)}'}

    @staticmethod
    def upload_document(file, user_id, tenant_id, document_type='general'):
        """Upload document (meal plans, contracts, etc.)"""
        if not FileUploadService.is_allowed_file(file.filename, 'document'):
            return {'success': False, 'message': 'Invalid file type. Only documents are allowed.'}

        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)

        if not FileUploadService.validate_file_size(file_size, 'document'):
            return {'success': False, 'message': 'File size exceeds maximum allowed (5MB).'}

        try:
            filename = FileUploadService.generate_unique_filename(file.filename, user_id)
            upload_folder = current_app.config['UPLOAD_FOLDER']
            subfolder = f'documents/tenant_{tenant_id}/{document_type}'

            file_path = FileUploadService.save_local_file(file, upload_folder, subfolder, filename)
            url = f'/uploads/{file_path}'

            return {
                'success': True,
                'message': 'Document uploaded successfully',
                'url': url,
                'filename': filename,
                'type': document_type
            }

        except Exception as e:
            return {'success': False, 'message': f'Upload failed: {str(e)}'}

    @staticmethod
    def delete_file(file_path):
        """Delete file from local storage"""
        try:
            upload_folder = current_app.config['UPLOAD_FOLDER']
            full_path = os.path.join(upload_folder, file_path.lstrip('/uploads/'))

            if os.path.exists(full_path):
                os.remove(full_path)

                # Delete thumbnails if they exist
                base_path, ext = os.path.splitext(full_path)
                for size in FileUploadService.THUMBNAIL_SIZES.keys():
                    thumb_path = f"{base_path}_thumb_{size}{ext}"
                    if os.path.exists(thumb_path):
                        os.remove(thumb_path)

                return {'success': True, 'message': 'File deleted successfully'}
            else:
                return {'success': False, 'message': 'File not found'}

        except Exception as e:
            return {'success': False, 'message': f'Delete failed: {str(e)}'}

    # S3 Support (optional)
    @staticmethod
    def upload_to_s3(file, bucket_name, object_name, acl='public-read'):
        """Upload file to AWS S3"""
        s3_client = boto3.client(
            's3',
            aws_access_key_id=current_app.config.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=current_app.config.get('AWS_SECRET_ACCESS_KEY'),
            region_name=current_app.config.get('AWS_REGION', 'eu-west-1')
        )

        try:
            s3_client.upload_fileobj(
                file,
                bucket_name,
                object_name,
                ExtraArgs={'ACL': acl}
            )

            # Generate URL
            url = f"https://{bucket_name}.s3.amazonaws.com/{object_name}"

            return {
                'success': True,
                'message': 'File uploaded to S3 successfully',
                'url': url
            }

        except ClientError as e:
            return {'success': False, 'message': f'S3 upload failed: {str(e)}'}

    @staticmethod
    def get_storage_stats(tenant_id):
        """Get storage usage statistics for a tenant"""
        upload_folder = current_app.config['UPLOAD_FOLDER']
        tenant_folders = [
            f'avatars/tenant_{tenant_id}',
            f'progress_photos/athlete_*',  # Would need to filter by tenant
            f'exercise_videos/tenant_{tenant_id}',
            f'documents/tenant_{tenant_id}'
        ]

        total_size = 0
        file_count = 0

        try:
            for folder_pattern in tenant_folders:
                folder_path = os.path.join(upload_folder, folder_pattern.split('*')[0])
                if os.path.exists(folder_path):
                    for root, dirs, files in os.walk(folder_path):
                        for file in files:
                            file_path = os.path.join(root, file)
                            total_size += os.path.getsize(file_path)
                            file_count += 1

            # Convert to MB
            total_size_mb = total_size / (1024 * 1024)

            return {
                'total_size_mb': round(total_size_mb, 2),
                'file_count': file_count,
                'tenant_id': tenant_id
            }

        except Exception as e:
            return {
                'total_size_mb': 0,
                'file_count': 0,
                'error': str(e)
            }
