"""
Image Optimization Service
Advanced image processing, compression, and optimization for web performance
"""
import os
from PIL import Image, ImageFilter, ImageOps
from io import BytesIO
import hashlib
from flask import current_app


class ImageOptimizer:
    """Advanced image optimization service for web performance"""

    # Optimized image sizes for different contexts
    IMAGE_SIZES = {
        'thumbnail': (150, 150),      # Profile pics, small previews
        'small': (300, 300),           # Cards, lists
        'medium': (600, 600),          # Detail views
        'large': (1200, 1200),         # Full-screen, lightbox
        'hero': (1920, 1080),          # Hero images, banners
    }

    # Quality settings by format
    QUALITY_SETTINGS = {
        'jpeg': {
            'quality': 85,
            'optimize': True,
            'progressive': True,
        },
        'webp': {
            'quality': 85,
            'method': 6,  # 0-6, higher = better compression but slower
        },
        'png': {
            'optimize': True,
            'compress_level': 9,
        }
    }

    # Maximum file sizes (target after optimization)
    MAX_FILE_SIZES = {
        'thumbnail': 50 * 1024,      # 50KB
        'small': 100 * 1024,          # 100KB
        'medium': 300 * 1024,         # 300KB
        'large': 500 * 1024,          # 500KB
        'hero': 800 * 1024,           # 800KB
    }

    @staticmethod
    def optimize_image(image_path, output_path=None, size_name='medium', format='webp', quality=None):
        """
        Optimize image with intelligent compression and resizing

        Args:
            image_path: Path to source image
            output_path: Path for optimized image (optional, defaults to same path)
            size_name: Size preset name ('thumbnail', 'small', 'medium', 'large', 'hero')
            format: Output format ('webp', 'jpeg', 'png')
            quality: Custom quality (overrides defaults)

        Returns:
            dict: Result with success status, path, size info
        """
        try:
            # Open and validate image
            img = Image.open(image_path)

            # Get original size
            original_size = os.path.getsize(image_path)

            # Convert RGBA to RGB if saving as JPEG
            if format.lower() in ['jpeg', 'jpg'] and img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'RGBA':
                    background.paste(img, mask=img.split()[-1])
                else:
                    background.paste(img)
                img = background

            # Auto-rotate based on EXIF data
            img = ImageOps.exif_transpose(img)

            # Resize image
            if size_name in ImageOptimizer.IMAGE_SIZES:
                target_size = ImageOptimizer.IMAGE_SIZES[size_name]
                img = ImageOptimizer._smart_resize(img, target_size)

            # Apply sharpening after resize (improves perceived quality)
            img = img.filter(ImageFilter.SHARPEN)

            # Determine output path
            if not output_path:
                base, _ = os.path.splitext(image_path)
                output_path = f"{base}_{size_name}.{format}"

            # Get quality settings
            quality_settings = ImageOptimizer.QUALITY_SETTINGS.get(format, {}).copy()
            if quality:
                quality_settings['quality'] = quality

            # Save optimized image
            if format.lower() in ['jpeg', 'jpg']:
                img.save(output_path, 'JPEG', **quality_settings)
            elif format.lower() == 'webp':
                img.save(output_path, 'WEBP', **quality_settings)
            elif format.lower() == 'png':
                img.save(output_path, 'PNG', **quality_settings)
            else:
                img.save(output_path)

            # Get optimized size
            optimized_size = os.path.getsize(output_path)
            reduction_percent = ((original_size - optimized_size) / original_size) * 100

            return {
                'success': True,
                'output_path': output_path,
                'original_size': original_size,
                'optimized_size': optimized_size,
                'reduction_percent': round(reduction_percent, 2),
                'dimensions': img.size,
                'format': format
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    @staticmethod
    def _smart_resize(img, target_size, maintain_aspect=True):
        """
        Smart resize that maintains aspect ratio and uses high-quality resampling

        Args:
            img: PIL Image object
            target_size: Tuple (width, height)
            maintain_aspect: If True, fit image within target_size maintaining aspect ratio

        Returns:
            PIL Image: Resized image
        """
        if maintain_aspect:
            # Calculate aspect-preserving size
            img.thumbnail(target_size, Image.Resampling.LANCZOS)
        else:
            # Force exact size (may distort)
            img = img.resize(target_size, Image.Resampling.LANCZOS)

        return img

    @staticmethod
    def create_responsive_set(image_path, output_dir=None, formats=['webp', 'jpeg']):
        """
        Create responsive image set with multiple sizes and formats

        Args:
            image_path: Path to source image
            output_dir: Directory for output images (defaults to source dir)
            formats: List of formats to generate

        Returns:
            dict: Mapping of size/format to file paths
        """
        if not output_dir:
            output_dir = os.path.dirname(image_path)

        base_name = os.path.splitext(os.path.basename(image_path))[0]
        results = {}

        for size_name in ['thumbnail', 'small', 'medium', 'large']:
            for format in formats:
                output_filename = f"{base_name}_{size_name}.{format}"
                output_path = os.path.join(output_dir, output_filename)

                result = ImageOptimizer.optimize_image(
                    image_path,
                    output_path=output_path,
                    size_name=size_name,
                    format=format
                )

                if result['success']:
                    results[f"{size_name}_{format}"] = {
                        'path': output_path,
                        'url': output_filename,
                        'size': result['optimized_size'],
                        'dimensions': result['dimensions']
                    }

        return results

    @staticmethod
    def generate_webp_with_fallback(image_path, output_dir=None):
        """
        Generate WebP with JPEG fallback for browser compatibility

        Args:
            image_path: Path to source image
            output_dir: Directory for output

        Returns:
            dict: Paths to WebP and JPEG versions
        """
        if not output_dir:
            output_dir = os.path.dirname(image_path)

        base_name = os.path.splitext(os.path.basename(image_path))[0]

        # Generate WebP (best compression)
        webp_path = os.path.join(output_dir, f"{base_name}.webp")
        webp_result = ImageOptimizer.optimize_image(
            image_path,
            output_path=webp_path,
            format='webp'
        )

        # Generate JPEG fallback
        jpeg_path = os.path.join(output_dir, f"{base_name}.jpg")
        jpeg_result = ImageOptimizer.optimize_image(
            image_path,
            output_path=jpeg_path,
            format='jpeg'
        )

        return {
            'webp': {
                'path': webp_path,
                'size': webp_result.get('optimized_size', 0)
            },
            'jpeg': {
                'path': jpeg_path,
                'size': jpeg_result.get('optimized_size', 0)
            }
        }

    @staticmethod
    def compress_to_target_size(image_path, target_size_kb, output_path=None, format='jpeg'):
        """
        Compress image to target file size by adjusting quality

        Args:
            image_path: Source image path
            target_size_kb: Target file size in KB
            output_path: Output path
            format: Output format

        Returns:
            dict: Result with final quality and size
        """
        target_size_bytes = target_size_kb * 1024

        try:
            img = Image.open(image_path)

            if format == 'jpeg' and img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'RGBA':
                    background.paste(img, mask=img.split()[-1])
                else:
                    background.paste(img)
                img = background

            img = ImageOps.exif_transpose(img)

            if not output_path:
                base, _ = os.path.splitext(image_path)
                output_path = f"{base}_compressed.{format}"

            # Binary search for optimal quality
            quality_min, quality_max = 10, 95
            best_quality = quality_max

            while quality_min <= quality_max:
                quality = (quality_min + quality_max) // 2

                # Save to BytesIO to check size without writing file
                buffer = BytesIO()
                if format == 'jpeg':
                    img.save(buffer, 'JPEG', quality=quality, optimize=True)
                elif format == 'webp':
                    img.save(buffer, 'WEBP', quality=quality)
                else:
                    img.save(buffer, format.upper())

                size = buffer.tell()

                if size <= target_size_bytes:
                    best_quality = quality
                    quality_min = quality + 1
                else:
                    quality_max = quality - 1

            # Save final image with best quality
            if format == 'jpeg':
                img.save(output_path, 'JPEG', quality=best_quality, optimize=True)
            elif format == 'webp':
                img.save(output_path, 'WEBP', quality=best_quality)
            else:
                img.save(output_path, format.upper())

            final_size = os.path.getsize(output_path)

            return {
                'success': True,
                'output_path': output_path,
                'final_quality': best_quality,
                'final_size': final_size,
                'target_size': target_size_bytes,
                'within_target': final_size <= target_size_bytes
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    @staticmethod
    def generate_blurhash_placeholder(image_path):
        """
        Generate a tiny blurred placeholder for lazy loading
        (Simplified version - for production, consider using blurhash library)

        Args:
            image_path: Source image

        Returns:
            dict: Base64 encoded tiny placeholder
        """
        try:
            img = Image.open(image_path)

            # Create tiny 20x20 version
            img.thumbnail((20, 20), Image.Resampling.LANCZOS)

            # Apply heavy blur
            img = img.filter(ImageFilter.GaussianBlur(radius=10))

            # Save to BytesIO
            buffer = BytesIO()
            img.save(buffer, format='JPEG', quality=50)
            buffer.seek(0)

            # Convert to base64
            import base64
            placeholder_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

            return {
                'success': True,
                'placeholder': f"data:image/jpeg;base64,{placeholder_base64}",
                'size': len(placeholder_base64)
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    @staticmethod
    def batch_optimize_directory(directory_path, size_name='medium', format='webp'):
        """
        Batch optimize all images in a directory

        Args:
            directory_path: Directory containing images
            size_name: Target size preset
            format: Output format

        Returns:
            dict: Summary of optimization results
        """
        results = {
            'optimized': [],
            'failed': [],
            'total_size_before': 0,
            'total_size_after': 0
        }

        allowed_extensions = {'.jpg', '.jpeg', '.png', '.webp'}

        try:
            for filename in os.listdir(directory_path):
                file_path = os.path.join(directory_path, filename)

                # Skip if not an image
                _, ext = os.path.splitext(filename)
                if ext.lower() not in allowed_extensions:
                    continue

                # Skip if file is a directory
                if os.path.isdir(file_path):
                    continue

                # Optimize image
                result = ImageOptimizer.optimize_image(
                    file_path,
                    size_name=size_name,
                    format=format
                )

                if result['success']:
                    results['optimized'].append({
                        'filename': filename,
                        'original_size': result['original_size'],
                        'optimized_size': result['optimized_size'],
                        'reduction': result['reduction_percent']
                    })
                    results['total_size_before'] += result['original_size']
                    results['total_size_after'] += result['optimized_size']
                else:
                    results['failed'].append({
                        'filename': filename,
                        'error': result.get('error', 'Unknown error')
                    })

            # Calculate total reduction
            if results['total_size_before'] > 0:
                total_reduction = (
                    (results['total_size_before'] - results['total_size_after'])
                    / results['total_size_before']
                ) * 100
                results['total_reduction_percent'] = round(total_reduction, 2)

            results['count_optimized'] = len(results['optimized'])
            results['count_failed'] = len(results['failed'])

            return results

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
