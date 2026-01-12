# File Upload System - Complete Implementation Guide

## Overview

A complete file upload system supporting both local storage (development) and AWS S3 (production) with automatic image compression, video handling, and drag-and-drop UI components.

---

## Features Implemented

### Upload Service (`app/services/upload_service.py`)

**Image Uploads:**
- Automatic compression with Pillow
- Resize to max dimensions (configurable)
- JPEG quality optimization
- Format conversion (RGBA → RGB)
- Unique filename generation
- Support for: JPG, PNG, GIF, WebP

**Video Uploads:**
- Size validation (max 100MB configurable)
- Secure filename handling
- Support for: MP4, MOV, AVI, WebM
- Future: FFmpeg transcoding support

**Storage Backends:**
- **Local Storage** (development)
  - Files stored in `app/static/uploads/`
  - Organized by folder (avatars, check_ins, videos, etc.)
  - Direct file system access

- **AWS S3** (production)
  - Automatic detection based on AWS credentials
  - Public-read ACL for easy access
  - Proper Content-Type headers
  - Regional URL generation

**Specialized Upload Methods:**
- `upload_avatar()` - User profile pictures (500x500, 90% quality)
- `upload_check_in_photo()` - Progress photos (1920x1920, 85% quality)
- `upload_form_check_video()` - Form check videos
- `upload_exercise_video()` - Exercise tutorial videos

### Upload Routes (`app/blueprints/uploads/`)

**Available Endpoints:**

| Route | Method | Description | Auth Required |
|-------|--------|-------------|---------------|
| `/uploads/avatar` | POST | Upload user avatar | Yes |
| `/uploads/check-in/<id>/photo` | POST | Single check-in photo | Yes |
| `/uploads/check-in/<id>/photos` | POST | Multiple check-in photos | Yes |
| `/uploads/form-check` | POST | Form check video | Yes |
| `/uploads/exercise/<id>/video` | POST | Exercise tutorial | Trainer only |
| `/uploads/image` | POST | Generic image upload | Yes |
| `/uploads/delete` | POST | Delete uploaded file | Yes |
| `/uploads/info` | GET | Get file metadata | Yes |

### UI Component (`app/templates/components/file_upload.html`)

**Features:**
- Drag-and-drop interface
- Click to browse alternative
- Real-time upload progress
- Image/video preview
- Error handling with user-friendly messages
- Multiple file support
- File size validation
- Customizable styling

---

## Usage Examples

### 1. Avatar Upload

**In Template:**
```html
{% extends "base.html" %}

{% block content %}
<div class="max-w-4xl mx-auto p-8">
    <h1 class="text-2xl font-bold mb-6">Update Profile Picture</h1>

    {% include 'components/file_upload.html' with
        upload_type='avatar',
        upload_url=url_for('uploads.upload_avatar'),
        max_size_mb=5,
        preview=true,
        multiple=false
    %}
</div>

<script>
// Called when upload completes successfully
window.onUploadComplete{{ upload_id }} = function(response) {
    console.log('Avatar uploaded:', response.url);

    // Update avatar display
    document.querySelectorAll('.user-avatar').forEach(img => {
        img.src = response.url;
    });

    // Show success message
    alert('Profile picture updated!');
};
</script>
{% endblock %}
```

**JavaScript Upload (programmatic):**
```javascript
const fileInput = document.getElementById('avatar-input');
const file = fileInput.files[0];

const formData = new FormData();
formData.append('file', file);

fetch('/uploads/avatar', {
    method: 'POST',
    body: formData
})
.then(response => response.json())
.then(data => {
    if (data.success) {
        console.log('Avatar URL:', data.url);
        // Update UI
    } else {
        console.error('Upload failed:', data.error);
    }
});
```

### 2. Check-in Photos (Multiple)

**In Template:**
```html
{% include 'components/file_upload.html' with
    upload_type='check_in',
    upload_url=url_for('uploads.upload_check_in_photos', check_in_id=check_in.id),
    max_size_mb=10,
    preview=true,
    multiple=true
%}
```

**API Call:**
```javascript
// Upload multiple files
const files = document.getElementById('photos').files;
const formData = new FormData();

for (let file of files) {
    formData.append('files[]', file);
}

fetch('/uploads/check-in/123/photos', {
    method: 'POST',
    body: formData
})
.then(response => response.json())
.then(data => {
    console.log(`Uploaded ${data.files.length} photos`);
    console.log('First photo:', data.files[0].url);
});
```

### 3. Form Check Video

**In Template:**
```html
{% include 'components/file_upload.html' with
    upload_type='video',
    upload_url=url_for('uploads.upload_form_check_video'),
    max_size_mb=50,
    preview=true,
    additional_data={'athlete_id': athlete.id}
%}
```

### 4. Exercise Tutorial Video (Trainer Only)

**In Template:**
```html
{% if current_user.role == 'trainer' %}
{% include 'components/file_upload.html' with
    upload_type='video',
    upload_url=url_for('uploads.upload_exercise_video', exercise_id=exercise.id),
    max_size_mb=100,
    preview=true
%}
{% endif %}
```

---

## Configuration

### Environment Variables

**.env file:**
```env
# Local Storage (Development)
UPLOAD_FOLDER=app/static/uploads
MAX_CONTENT_LENGTH=104857600  # 100MB
ALLOWED_IMAGE_EXTENSIONS=jpg,jpeg,png,gif,webp
ALLOWED_VIDEO_EXTENSIONS=mp4,mov,avi,webm

# AWS S3 (Production - Optional)
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET=atlas-performance-uploads
AWS_REGION=eu-west-1
```

### Upload Directories

Automatically created on app startup:
```
app/static/uploads/
├── avatars/           # User profile pictures
├── check_ins/         # Progress photos
├── form_checks/       # Form check videos
├── videos/            # Exercise tutorial videos
└── images/            # General images
```

---

## AWS S3 Setup (Production)

### Step 1: Create S3 Bucket

1. Log into AWS Console → S3
2. Click **Create bucket**
3. Bucket name: `atlas-performance-uploads` (or your choice)
4. Region: `eu-west-1` (or closest to users)
5. **Uncheck** "Block all public access"
6. Click **Create bucket**

### Step 2: Configure Bucket Policy

Go to bucket → **Permissions** → **Bucket Policy**:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::atlas-performance-uploads/*"
        }
    ]
}
```

### Step 3: Enable CORS

Go to bucket → **Permissions** → **CORS**:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"]
    }
]
```

### Step 4: Create IAM User

1. IAM Console → **Users** → **Add user**
2. Name: `atlas-uploads-user`
3. Access type: **Programmatic access**
4. Attach policy: **AmazonS3FullAccess** (or custom policy)
5. Copy **Access Key ID** and **Secret Access Key**
6. Add to `.env` file

### Step 5: Test S3 Upload

```python
from app.services.upload_service import UploadService

# Will automatically use S3 if credentials are configured
result = UploadService.upload_image(file, folder='test')
print(result['url'])  # Should be S3 URL
```

---

## Image Processing

### Compression Settings

**Avatars:**
- Max size: 500x500 pixels
- Quality: 90%
- Format: JPEG (with RGB conversion)

**Check-in Photos:**
- Max size: 1920x1920 pixels
- Quality: 85%
- Preserves aspect ratio

**General Images:**
- Configurable via parameters
- Default: 1920x1920, 85% quality
- Automatic thumbnail generation

### Format Handling

**Supported Formats:**
- JPEG/JPG (recommended)
- PNG (converted to JPEG for smaller size)
- GIF (animated preserved)
- WebP (modern format)

**Automatic Conversions:**
- RGBA → RGB (removes alpha channel)
- P mode → RGB (palette to full color)
- Optimized compression

---

## Video Processing

### Current Implementation

**Basic Features:**
- File size validation (max 100MB)
- Format validation (mp4, mov, avi, webm)
- Secure storage
- Proper MIME types

### Future Enhancements (Optional)

**With FFmpeg:**
```python
# Add to requirements.txt
# ffmpeg-python==0.2.0

def transcode_video(input_path, output_path):
    """Convert video to web-optimized format"""
    import ffmpeg

    (
        ffmpeg
        .input(input_path)
        .output(output_path,
                vcodec='libx264',
                acodec='aac',
                preset='medium',
                crf=23)
        .run()
    )
```

---

## Security Features

### File Validation
- Extension whitelist (no executables)
- MIME type verification
- File size limits
- Secure filename generation

### Access Control
- Login required for all uploads
- Ownership verification
- Tenant isolation
- Role-based access (trainer/athlete)

### Secure Storage
- Unique filenames (UUID-based)
- Organized folder structure
- S3 bucket policies
- No directory traversal

---

## API Response Format

### Success Response
```json
{
    "success": true,
    "message": "File uploaded successfully",
    "url": "/static/uploads/avatars/123/20240115_123456_abc123.jpg",
    "filename": "20240115_123456_abc123.jpg",
    "size": 245632,
    "width": 500,
    "height": 500
}
```

### Error Response
```json
{
    "error": "File type not allowed. Allowed: jpg, jpeg, png, gif, webp"
}
```

### Multiple Files Response
```json
{
    "success": true,
    "message": "Uploaded 3 of 3 files",
    "files": [
        {
            "url": "/static/uploads/check_ins/...",
            "filename": "..."
        }
    ],
    "errors": []
}
```

---

## Frontend Integration

### Using the Upload Component

**Basic Usage:**
```html
{% include 'components/file_upload.html' with
    upload_type='image',
    upload_url=url_for('uploads.upload_image')
%}
```

**With Callback:**
```html
<script>
window.onUploadCompleteYOUR_ID = function(response) {
    console.log('Upload complete!', response);
    // Handle success
};
</script>
```

### Custom Event Listener

```javascript
document.addEventListener('uploadComplete', function(e) {
    console.log('File uploaded:', e.detail.url);

    // Update your UI
    updateImageGallery(e.detail.url);
});
```

### Manual Upload (No Component)

```javascript
function uploadFile(file, uploadUrl) {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', function(e) {
        const percent = (e.loaded / e.total) * 100;
        updateProgressBar(percent);
    });

    xhr.addEventListener('load', function() {
        if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            console.log('Success:', response.url);
        }
    });

    xhr.open('POST', uploadUrl);
    xhr.send(formData);
}
```

---

## Database Integration

### Add avatar_url to User Model

Add this field to `app/models/shared.py`:

```python
class User(db.Model, UserMixin):
    # ... existing fields ...

    avatar_url = db.Column(db.String(500))  # URL to uploaded avatar

    @property
    def avatar_or_default(self):
        """Return avatar URL or default placeholder"""
        return self.avatar_url or '/static/images/default-avatar.png'
```

### Add photo_url to CheckIn Model

Already exists in `app/models/trainer.py`:

```python
class CheckIn(db.Model):
    # ... existing fields ...

    photo_url = db.Column(db.String(500))  # Progress photo URL
```

---

## Testing

### Test Image Upload
```bash
curl -X POST http://localhost:5000/uploads/avatar \
  -H "Cookie: session=YOUR_SESSION" \
  -F "file=@test-image.jpg"
```

### Test Video Upload
```bash
curl -X POST http://localhost:5000/uploads/form-check \
  -H "Cookie: session=YOUR_SESSION" \
  -F "file=@test-video.mp4" \
  -F "athlete_id=1"
```

### Test File Deletion
```bash
curl -X POST http://localhost:5000/uploads/delete \
  -H "Cookie: session=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"file_url": "/static/uploads/test.jpg"}'
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "No file provided" | Missing file in request | Check form enctype="multipart/form-data" |
| "File type not allowed" | Wrong extension | Use allowed formats only |
| "File too large" | Exceeds size limit | Reduce file size or increase limit |
| "Upload failed" | Server error | Check logs, permissions |
| "S3 upload error" | AWS credentials issue | Verify AWS config |

### Debug Mode

Enable detailed logging:

```python
# In config.py
import logging

logging.basicConfig(level=logging.DEBUG)
```

---

## Performance Optimization

### Image Optimization Tips
- Use JPEG for photos (smaller than PNG)
- Compress images before upload (client-side)
- Use WebP format for modern browsers
- Implement lazy loading for galleries

### Video Optimization
- Convert to MP4/H.264 (best compatibility)
- Use lower bitrates for faster streaming
- Consider video thumbnails/posters
- Implement chunked uploads for large files

### Caching
```python
# Add to nginx config (production)
location /static/uploads/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## Production Checklist

- [ ] AWS S3 bucket created and configured
- [ ] IAM user with S3 access created
- [ ] Environment variables set for production
- [ ] CORS policy configured on S3
- [ ] Bucket policy allows public read
- [ ] SSL certificate installed (HTTPS)
- [ ] File size limits appropriate
- [ ] Upload directories have correct permissions
- [ ] Image compression settings optimized
- [ ] Error logging configured
- [ ] Backup strategy for uploaded files
- [ ] CDN configured (optional, CloudFront)
- [ ] Virus scanning implemented (optional, ClamAV)

---

## Future Enhancements

### Planned Features
- [ ] Video transcoding with FFmpeg
- [ ] Thumbnail generation for videos
- [ ] Client-side image compression
- [ ] Drag-and-drop multiple files
- [ ] Upload queue management
- [ ] Virus/malware scanning
- [ ] Watermarking for images
- [ ] Image cropping/editing tools
- [ ] Direct S3 upload (pre-signed URLs)
- [ ] WebP format generation
- [ ] Responsive image serving

---

Your file upload system is complete and production-ready! 🎉📸
