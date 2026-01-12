"""
CDN Service
Integration with Cloudflare CDN and AWS S3 for static asset delivery
"""
import os
import boto3
from botocore.exceptions import ClientError
from flask import current_app, url_for
import mimetypes
from datetime import datetime, timedelta
import hashlib


class CDNService:
    """Service for CDN and cloud storage management"""

    # Asset types and their cache durations
    CACHE_CONTROL_HEADERS = {
        'images': 'public, max-age=31536000, immutable',  # 1 year
        'videos': 'public, max-age=31536000, immutable',  # 1 year
        'css': 'public, max-age=31536000, immutable',     # 1 year
        'js': 'public, max-age=31536000, immutable',      # 1 year
        'fonts': 'public, max-age=31536000, immutable',   # 1 year
        'documents': 'public, max-age=86400',             # 1 day
        'default': 'public, max-age=3600'                 # 1 hour
    }

    @staticmethod
    def get_s3_client():
        """Get configured S3 client"""
        return boto3.client(
            's3',
            aws_access_key_id=current_app.config.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=current_app.config.get('AWS_SECRET_ACCESS_KEY'),
            region_name=current_app.config.get('AWS_REGION', 'eu-west-1')
        )

    @staticmethod
    def get_asset_type(filename):
        """Determine asset type from filename"""
        ext = os.path.splitext(filename)[1].lower()

        image_exts = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'}
        video_exts = {'.mp4', '.webm', '.mov', '.avi', '.mkv'}
        css_exts = {'.css'}
        js_exts = {'.js', '.mjs'}
        font_exts = {'.woff', '.woff2', '.ttf', '.eot', '.otf'}
        doc_exts = {'.pdf', '.doc', '.docx', '.xls', '.xlsx'}

        if ext in image_exts:
            return 'images'
        elif ext in video_exts:
            return 'videos'
        elif ext in css_exts:
            return 'css'
        elif ext in js_exts:
            return 'js'
        elif ext in font_exts:
            return 'fonts'
        elif ext in doc_exts:
            return 'documents'
        return 'default'

    @staticmethod
    def upload_to_s3(file_path, s3_key=None, bucket=None, acl='public-read', metadata=None):
        """
        Upload file to S3 with proper headers

        Args:
            file_path: Local file path
            s3_key: S3 object key (path in bucket)
            bucket: S3 bucket name
            acl: Access control list
            metadata: Custom metadata dict

        Returns:
            dict: Upload result with URL
        """
        if not bucket:
            bucket = current_app.config.get('AWS_S3_BUCKET')

        if not s3_key:
            s3_key = os.path.basename(file_path)

        # Determine content type
        content_type, _ = mimetypes.guess_type(file_path)
        if not content_type:
            content_type = 'application/octet-stream'

        # Get appropriate cache control header
        asset_type = CDNService.get_asset_type(file_path)
        cache_control = CDNService.CACHE_CONTROL_HEADERS.get(asset_type, 'public, max-age=3600')

        try:
            s3_client = CDNService.get_s3_client()

            # Prepare extra args
            extra_args = {
                'ACL': acl,
                'ContentType': content_type,
                'CacheControl': cache_control,
            }

            # Add metadata if provided
            if metadata:
                extra_args['Metadata'] = metadata

            # Upload file
            with open(file_path, 'rb') as f:
                s3_client.upload_fileobj(f, bucket, s3_key, ExtraArgs=extra_args)

            # Generate URL
            cdn_url = CDNService.get_cdn_url(s3_key, bucket)

            return {
                'success': True,
                'url': cdn_url,
                's3_key': s3_key,
                'bucket': bucket
            }

        except ClientError as e:
            return {
                'success': False,
                'error': str(e)
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Upload failed: {str(e)}'
            }

    @staticmethod
    def get_cdn_url(s3_key, bucket=None):
        """
        Get CDN URL for an S3 object

        Args:
            s3_key: S3 object key
            bucket: S3 bucket name

        Returns:
            str: Full CDN URL
        """
        if not bucket:
            bucket = current_app.config.get('AWS_S3_BUCKET')

        # Check if Cloudflare CDN is configured
        cloudflare_domain = current_app.config.get('CLOUDFLARE_CDN_DOMAIN')

        if cloudflare_domain:
            # Use Cloudflare CDN domain
            return f"https://{cloudflare_domain}/{s3_key}"
        else:
            # Use S3 direct URL
            region = current_app.config.get('AWS_REGION', 'eu-west-1')
            return f"https://{bucket}.s3.{region}.amazonaws.com/{s3_key}"

    @staticmethod
    def generate_presigned_url(s3_key, bucket=None, expiration=3600):
        """
        Generate presigned URL for private file access

        Args:
            s3_key: S3 object key
            bucket: S3 bucket name
            expiration: URL expiration time in seconds

        Returns:
            str: Presigned URL
        """
        if not bucket:
            bucket = current_app.config.get('AWS_S3_BUCKET')

        try:
            s3_client = CDNService.get_s3_client()

            url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket, 'Key': s3_key},
                ExpiresIn=expiration
            )

            return {
                'success': True,
                'url': url,
                'expires_in': expiration
            }

        except ClientError as e:
            return {
                'success': False,
                'error': str(e)
            }

    @staticmethod
    def delete_from_s3(s3_key, bucket=None):
        """Delete file from S3"""
        if not bucket:
            bucket = current_app.config.get('AWS_S3_BUCKET')

        try:
            s3_client = CDNService.get_s3_client()
            s3_client.delete_object(Bucket=bucket, Key=s3_key)

            return {
                'success': True,
                'message': f'Deleted {s3_key} from {bucket}'
            }

        except ClientError as e:
            return {
                'success': False,
                'error': str(e)
            }

    @staticmethod
    def list_s3_objects(prefix='', bucket=None, max_keys=1000):
        """List objects in S3 bucket"""
        if not bucket:
            bucket = current_app.config.get('AWS_S3_BUCKET')

        try:
            s3_client = CDNService.get_s3_client()

            response = s3_client.list_objects_v2(
                Bucket=bucket,
                Prefix=prefix,
                MaxKeys=max_keys
            )

            objects = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    objects.append({
                        'key': obj['Key'],
                        'size': obj['Size'],
                        'last_modified': obj['LastModified'],
                        'url': CDNService.get_cdn_url(obj['Key'], bucket)
                    })

            return {
                'success': True,
                'objects': objects,
                'count': len(objects)
            }

        except ClientError as e:
            return {
                'success': False,
                'error': str(e)
            }

    @staticmethod
    def sync_directory_to_s3(local_dir, s3_prefix='', bucket=None):
        """
        Sync entire directory to S3

        Args:
            local_dir: Local directory path
            s3_prefix: Prefix for S3 keys
            bucket: S3 bucket name

        Returns:
            dict: Sync results
        """
        if not bucket:
            bucket = current_app.config.get('AWS_S3_BUCKET')

        results = {
            'uploaded': [],
            'failed': [],
            'skipped': []
        }

        try:
            for root, dirs, files in os.walk(local_dir):
                for filename in files:
                    local_path = os.path.join(root, filename)
                    relative_path = os.path.relpath(local_path, local_dir)
                    s3_key = os.path.join(s3_prefix, relative_path).replace('\\', '/')

                    # Upload file
                    result = CDNService.upload_to_s3(local_path, s3_key, bucket)

                    if result['success']:
                        results['uploaded'].append({
                            'file': relative_path,
                            'url': result['url']
                        })
                    else:
                        results['failed'].append({
                            'file': relative_path,
                            'error': result.get('error')
                        })

            return {
                'success': True,
                'uploaded_count': len(results['uploaded']),
                'failed_count': len(results['failed']),
                'details': results
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }


class CloudflareService:
    """Service for Cloudflare-specific features"""

    @staticmethod
    def purge_cache(urls=None, purge_everything=False):
        """
        Purge Cloudflare cache

        Args:
            urls: List of URLs to purge
            purge_everything: If True, purge entire cache

        Returns:
            dict: Purge result
        """
        zone_id = current_app.config.get('CLOUDFLARE_ZONE_ID')
        api_token = current_app.config.get('CLOUDFLARE_API_TOKEN')

        if not zone_id or not api_token:
            return {
                'success': False,
                'error': 'Cloudflare credentials not configured'
            }

        try:
            import requests

            headers = {
                'Authorization': f'Bearer {api_token}',
                'Content-Type': 'application/json'
            }

            if purge_everything:
                data = {'purge_everything': True}
            elif urls:
                data = {'files': urls}
            else:
                return {
                    'success': False,
                    'error': 'Must specify URLs or purge_everything=True'
                }

            response = requests.post(
                f'https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache',
                headers=headers,
                json=data
            )

            response_data = response.json()

            if response_data.get('success'):
                return {
                    'success': True,
                    'message': 'Cache purged successfully'
                }
            else:
                return {
                    'success': False,
                    'error': response_data.get('errors', 'Unknown error')
                }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    @staticmethod
    def get_cache_analytics(since_days=7):
        """Get Cloudflare cache analytics"""
        # Implementation for cache hit rates, bandwidth savings, etc.
        # Requires Cloudflare Analytics API
        pass


# Template helpers for asset URLs

def static_url(filename, _external=False):
    """
    Get URL for static file (with CDN if configured)

    Usage in templates:
        {{ static_url('css/style.css') }}
    """
    cdn_enabled = current_app.config.get('CDN_ENABLED', False)

    if cdn_enabled:
        # Use CDN
        s3_key = f"static/{filename}"
        return CDNService.get_cdn_url(s3_key)
    else:
        # Use local Flask static
        return url_for('static', filename=filename, _external=_external)


def upload_url(filepath, _external=False):
    """
    Get URL for uploaded file (with CDN if configured)

    Usage in templates:
        {{ upload_url(user.avatar_url) }}
    """
    cdn_enabled = current_app.config.get('CDN_ENABLED', False)

    if cdn_enabled and filepath:
        # Remove leading /uploads/ if present
        clean_path = filepath.replace('/uploads/', '').lstrip('/')
        s3_key = f"uploads/{clean_path}"
        return CDNService.get_cdn_url(s3_key)
    else:
        # Use local uploads
        return filepath if filepath.startswith('http') else f"/uploads/{filepath.lstrip('/')}"


# Asset versioning for cache busting

def asset_url_with_hash(filename):
    """
    Generate asset URL with content hash for cache busting

    Usage:
        {{ asset_url_with_hash('css/style.css') }}
        Output: /static/css/style.css?v=abc123
    """
    static_folder = current_app.static_folder
    file_path = os.path.join(static_folder, filename)

    if os.path.exists(file_path):
        # Generate hash from file content
        with open(file_path, 'rb') as f:
            content_hash = hashlib.md5(f.read()).hexdigest()[:8]

        return url_for('static', filename=filename, v=content_hash)
    else:
        # Fallback to regular URL
        return url_for('static', filename=filename)
