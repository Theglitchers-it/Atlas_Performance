from flask import request, jsonify, current_app, send_from_directory
from flask_login import login_required, current_user
from functools import wraps
from app.blueprints.uploads import uploads_bp
from app.services.upload_service import UploadService
from app.services.file_upload_service import FileUploadService
from app.models import db
from app.models.shared import User
from app.models.trainer import CheckIn, Athlete, Exercise, UploadedFile
from app.middleware.tenant_context import get_current_tenant
import os


def tenant_context_required(f):
    """Decorator to ensure tenant context is available"""
    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        tenant = get_current_tenant()
        if not tenant and current_user.role == 'trainer':
            return jsonify({'error': 'No tenant context found'}), 403
        return f(*args, **kwargs)
    return decorated_function


@uploads_bp.route('/avatar', methods=['POST'])
@login_required
def upload_avatar():
    """Upload user avatar"""

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        # Upload avatar
        result = UploadService.upload_avatar(file, current_user.id)

        # Update user avatar URL
        current_user.avatar_url = result['url']
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Avatar uploaded successfully',
            'url': result['url'],
            'filename': result['filename']
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Avatar upload error: {str(e)}")
        return jsonify({'error': 'Upload failed'}), 500


@uploads_bp.route('/check-in/<int:check_in_id>/photo', methods=['POST'])
@tenant_context_required
def upload_check_in_photo(check_in_id):
    """Upload check-in progress photo"""

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Get check-in
    check_in = CheckIn.query.get_or_404(check_in_id)

    # Verify ownership
    if current_user.role == 'athlete':
        if check_in.athlete.user_id != current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403
    elif current_user.role == 'trainer':
        tenant = get_current_tenant()
        if check_in.athlete.trainer.tenant_id != tenant.id:
            return jsonify({'error': 'Unauthorized'}), 403

    try:
        # Upload photo
        result = UploadService.upload_check_in_photo(
            file,
            check_in.athlete_id,
            check_in_id
        )

        # Update check-in with photo URL
        check_in.photo_url = result['url']
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Photo uploaded successfully',
            'url': result['url'],
            'filename': result['filename']
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Check-in photo upload error: {str(e)}")
        return jsonify({'error': 'Upload failed'}), 500


@uploads_bp.route('/check-in/<int:check_in_id>/photos', methods=['POST'])
@tenant_context_required
def upload_check_in_photos(check_in_id):
    """Upload multiple check-in photos"""

    if 'files[]' not in request.files:
        return jsonify({'error': 'No files provided'}), 400

    files = request.files.getlist('files[]')

    if not files or len(files) == 0:
        return jsonify({'error': 'No files selected'}), 400

    # Limit number of files
    max_files = 5
    if len(files) > max_files:
        return jsonify({'error': f'Maximum {max_files} files allowed'}), 400

    # Get check-in
    check_in = CheckIn.query.get_or_404(check_in_id)

    # Verify ownership
    if current_user.role == 'athlete':
        if check_in.athlete.user_id != current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403
    elif current_user.role == 'trainer':
        tenant = get_current_tenant()
        if check_in.athlete.trainer.tenant_id != tenant.id:
            return jsonify({'error': 'Unauthorized'}), 403

    uploaded_files = []
    errors = []

    for file in files:
        if file.filename == '':
            continue

        try:
            result = UploadService.upload_check_in_photo(
                file,
                check_in.athlete_id,
                check_in_id
            )
            uploaded_files.append({
                'url': result['url'],
                'filename': result['filename']
            })
        except Exception as e:
            errors.append({
                'filename': file.filename,
                'error': str(e)
            })

    # Store first photo as main photo
    if uploaded_files and not check_in.photo_url:
        check_in.photo_url = uploaded_files[0]['url']
        db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Uploaded {len(uploaded_files)} of {len(files)} files',
        'files': uploaded_files,
        'errors': errors
    }), 200


@uploads_bp.route('/form-check', methods=['POST'])
@tenant_context_required
def upload_form_check_video():
    """Upload form check video"""

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Get athlete_id from form data
    athlete_id = request.form.get('athlete_id', type=int)

    if not athlete_id:
        return jsonify({'error': 'Athlete ID required'}), 400

    # Verify athlete exists and belongs to current user
    athlete = Athlete.query.get_or_404(athlete_id)

    if current_user.role == 'athlete':
        if athlete.user_id != current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403
    elif current_user.role == 'trainer':
        tenant = get_current_tenant()
        if athlete.trainer.tenant_id != tenant.id:
            return jsonify({'error': 'Unauthorized'}), 403

    try:
        # Upload video
        result = UploadService.upload_form_check_video(file, athlete_id)

        # Create FormCheck record in database using UploadedFile model
        from app.models.trainer import UploadedFile
        from app.models import db

        tenant = get_current_tenant()

        uploaded_file = UploadedFile(
            tenant_id=tenant.id,
            user_id=current_user.id,
            filename=result['filename'],
            original_filename=file.filename,
            file_path=result['url'],
            file_size=result['size'],
            mime_type=file.content_type,
            file_type='video',
            category='form_check',
            related_entity_type='athlete',
            related_entity_id=athlete_id,
            storage_type='local',  # or 's3' if using S3
            is_public=False
        )

        db.session.add(uploaded_file)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Video uploaded successfully',
            'url': result['url'],
            'filename': result['filename'],
            'size': result['size'],
            'file_id': uploaded_file.id
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Form check video upload error: {str(e)}")
        return jsonify({'error': 'Upload failed'}), 500


@uploads_bp.route('/exercise/<int:exercise_id>/video', methods=['POST'])
@tenant_context_required
def upload_exercise_video(exercise_id):
    """Upload exercise tutorial video (trainer only)"""

    if current_user.role != 'trainer':
        return jsonify({'error': 'Only trainers can upload exercise videos'}), 403

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        # Upload video
        result = UploadService.upload_exercise_video(file, exercise_id)

        # TODO: Update Exercise record with video URL

        return jsonify({
            'success': True,
            'message': 'Exercise video uploaded successfully',
            'url': result['url'],
            'filename': result['filename'],
            'size': result['size']
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Exercise video upload error: {str(e)}")
        return jsonify({'error': 'Upload failed'}), 500


@uploads_bp.route('/image', methods=['POST'])
@login_required
def upload_image():
    """Generic image upload endpoint"""

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Get folder from form data (default to 'images')
    folder = request.form.get('folder', 'images')

    # Sanitize folder path
    allowed_folders = ['images', 'avatars', 'check_ins', 'form_checks']
    if not any(folder.startswith(f) for f in allowed_folders):
        folder = 'images'

    try:
        # Upload image
        result = UploadService.upload_image(file, folder=folder)

        return jsonify({
            'success': True,
            'message': 'Image uploaded successfully',
            'url': result['url'],
            'filename': result['filename'],
            'size': result['size'],
            'width': result.get('width'),
            'height': result.get('height')
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Image upload error: {str(e)}")
        return jsonify({'error': 'Upload failed'}), 500


@uploads_bp.route('/delete', methods=['POST'])
@login_required
def delete_file():
    """Delete an uploaded file"""

    file_url = request.json.get('file_url')

    if not file_url:
        return jsonify({'error': 'File URL required'}), 400

    try:
        # Delete file
        success = UploadService.delete_file(file_url)

        if success:
            return jsonify({
                'success': True,
                'message': 'File deleted successfully'
            }), 200
        else:
            return jsonify({'error': 'File not found or already deleted'}), 404

    except Exception as e:
        current_app.logger.error(f"File deletion error: {str(e)}")
        return jsonify({'error': 'Deletion failed'}), 500


@uploads_bp.route('/info', methods=['GET'])
@login_required
def get_file_info():
    """Get information about an uploaded file"""

    file_url = request.args.get('file_url')

    if not file_url:
        return jsonify({'error': 'File URL required'}), 400

    try:
        info = UploadService.get_file_info(file_url)

        if info:
            return jsonify({
                'success': True,
                'info': info
            }), 200
        else:
            return jsonify({'error': 'File not found'}), 404

    except Exception as e:
        current_app.logger.error(f"File info error: {str(e)}")
        return jsonify({'error': 'Request failed'}), 500


# ============================================================================
# NEW ENHANCED FILE UPLOAD ENDPOINTS
# ============================================================================

@uploads_bp.route('/api/profile-picture', methods=['POST'])
@login_required
def upload_profile_picture():
    """Upload user profile picture with tracking"""
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'}), 400

    tenant = get_current_tenant()
    if not tenant and current_user.role != 'super_admin':
        return jsonify({'success': False, 'message': 'Tenant context required'}), 400

    tenant_id = tenant.id if tenant else None

    # Upload file
    result = FileUploadService.upload_profile_picture(file, current_user.id, tenant_id or 0)

    if result['success']:
        # Update user avatar
        current_user.avatar_url = result['url']

        # Track file in database
        file.seek(0, os.SEEK_END)
        file_size = file.tell()

        uploaded_file = UploadedFile(
            tenant_id=tenant_id or 0,
            user_id=current_user.id,
            filename=result['filename'],
            original_filename=file.filename,
            file_path=result['url'],
            file_size=file_size,
            mime_type=file.content_type,
            file_type='image',
            category='profile_picture',
            storage_type='local'
        )
        db.session.add(uploaded_file)
        db.session.commit()

    return jsonify(result), 200 if result['success'] else 400


@uploads_bp.route('/api/progress-photo', methods=['POST'])
@tenant_context_required
def upload_progress_photo():
    """Upload athlete progress photo"""
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400

    file = request.files['file']
    athlete_id = request.form.get('athlete_id', type=int)
    category = request.form.get('category', 'front')  # front, back, side

    if not athlete_id:
        return jsonify({'success': False, 'message': 'Athlete ID required'}), 400

    # Verify athlete access
    athlete = Athlete.query.get_or_404(athlete_id)
    tenant = get_current_tenant()

    if current_user.role == 'athlete' and athlete.user_id != current_user.id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    elif current_user.role == 'trainer' and athlete.trainer_id != current_user.id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    # Upload file
    result = FileUploadService.upload_progress_photo(file, athlete_id, tenant.id, category)

    if result['success']:
        # Track file
        file.seek(0, os.SEEK_END)
        file_size = file.tell()

        uploaded_file = UploadedFile(
            tenant_id=tenant.id,
            user_id=current_user.id,
            filename=result['filename'],
            original_filename=file.filename,
            file_path=result['url'],
            file_size=file_size,
            mime_type=file.content_type,
            file_type='image',
            category='progress_photo',
            related_entity_type='athlete',
            related_entity_id=athlete_id,
            file_metadata={'photo_category': category},
            storage_type='local'
        )
        db.session.add(uploaded_file)
        db.session.commit()

    return jsonify(result), 200 if result['success'] else 400


@uploads_bp.route('/api/exercise-video', methods=['POST'])
@tenant_context_required
def upload_exercise_video_new():
    """Upload exercise demonstration video"""
    if current_user.role not in ['trainer', 'super_admin']:
        return jsonify({'success': False, 'message': 'Only trainers can upload exercise videos'}), 403

    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400

    file = request.files['file']
    exercise_id = request.form.get('exercise_id', type=int)

    if not exercise_id:
        return jsonify({'success': False, 'message': 'Exercise ID required'}), 400

    exercise = Exercise.query.get_or_404(exercise_id)
    tenant = get_current_tenant()

    # Upload file
    result = FileUploadService.upload_exercise_video(file, exercise_id, tenant.id)

    if result['success']:
        # Update exercise with video URL
        exercise.video_url = result['url']

        # Track file
        file.seek(0, os.SEEK_END)
        file_size = file.tell()

        uploaded_file = UploadedFile(
            tenant_id=tenant.id,
            user_id=current_user.id,
            filename=result['filename'],
            original_filename=file.filename,
            file_path=result['url'],
            file_size=file_size,
            mime_type=file.content_type,
            file_type='video',
            category='exercise_video',
            related_entity_type='exercise',
            related_entity_id=exercise_id,
            storage_type='local',
            is_public=True
        )
        db.session.add(uploaded_file)
        db.session.commit()

    return jsonify(result), 200 if result['success'] else 400


@uploads_bp.route('/api/document', methods=['POST'])
@tenant_context_required
def upload_document():
    """Upload document (meal plan, contract, etc.)"""
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400

    file = request.files['file']
    document_type = request.form.get('document_type', 'general')  # meal_plan, contract, report, general

    tenant = get_current_tenant()

    # Upload file
    result = FileUploadService.upload_document(file, current_user.id, tenant.id, document_type)

    if result['success']:
        # Track file
        file.seek(0, os.SEEK_END)
        file_size = file.tell()

        uploaded_file = UploadedFile(
            tenant_id=tenant.id,
            user_id=current_user.id,
            filename=result['filename'],
            original_filename=file.filename,
            file_path=result['url'],
            file_size=file_size,
            mime_type=file.content_type,
            file_type='document',
            category=document_type,
            storage_type='local'
        )
        db.session.add(uploaded_file)
        db.session.commit()

    return jsonify(result), 200 if result['success'] else 400


@uploads_bp.route('/api/files', methods=['GET'])
@tenant_context_required
def list_files():
    """List uploaded files with filters"""
    tenant = get_current_tenant()

    # Get query parameters
    file_type = request.args.get('file_type')  # image, video, document
    category = request.args.get('category')
    user_id = request.args.get('user_id', type=int)
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    # Build query
    query = UploadedFile.query.filter_by(tenant_id=tenant.id, is_deleted=False)

    if file_type:
        query = query.filter_by(file_type=file_type)
    if category:
        query = query.filter_by(category=category)
    if user_id:
        query = query.filter_by(user_id=user_id)

    # Order by newest first
    query = query.order_by(UploadedFile.created_at.desc())

    # Paginate
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'success': True,
        'files': [f.to_dict() for f in pagination.items],
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': pagination.total,
            'pages': pagination.pages,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }
    })


@uploads_bp.route('/api/files/<int:file_id>', methods=['DELETE'])
@tenant_context_required
def delete_uploaded_file(file_id):
    """Delete uploaded file"""
    tenant = get_current_tenant()

    uploaded_file = UploadedFile.query.filter_by(
        id=file_id,
        tenant_id=tenant.id
    ).first_or_404()

    # Check permission
    if current_user.role != 'trainer' and uploaded_file.user_id != current_user.id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    # Delete physical file
    result = FileUploadService.delete_file(uploaded_file.file_path)

    if result['success']:
        # Soft delete from database
        uploaded_file.is_deleted = True
        uploaded_file.deleted_at = db.func.now()
        db.session.commit()

    return jsonify(result)


@uploads_bp.route('/api/storage-stats', methods=['GET'])
@tenant_context_required
def get_storage_stats():
    """Get storage statistics for tenant"""
    tenant = get_current_tenant()

    stats = FileUploadService.get_storage_stats(tenant.id)

    # Add database stats
    db_stats = db.session.query(
        UploadedFile.file_type,
        db.func.count(UploadedFile.id).label('count'),
        db.func.sum(UploadedFile.file_size).label('total_size')
    ).filter_by(
        tenant_id=tenant.id,
        is_deleted=False
    ).group_by(UploadedFile.file_type).all()

    stats['by_type'] = {}
    for file_type, count, total_size in db_stats:
        stats['by_type'][file_type] = {
            'count': count,
            'size_mb': round((total_size or 0) / (1024 * 1024), 2)
        }

    return jsonify({
        'success': True,
        'stats': stats
    })


@uploads_bp.route('/api/athlete/<int:athlete_id>/photos', methods=['GET'])
@tenant_context_required
def get_athlete_progress_photos(athlete_id):
    """Get all progress photos for an athlete"""
    tenant = get_current_tenant()
    athlete = Athlete.query.get_or_404(athlete_id)

    # Verify access
    if current_user.role == 'athlete' and athlete.user_id != current_user.id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    elif current_user.role == 'trainer' and athlete.trainer_id != current_user.id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    photos = UploadedFile.query.filter_by(
        tenant_id=tenant.id,
        category='progress_photo',
        related_entity_type='athlete',
        related_entity_id=athlete_id,
        is_deleted=False
    ).order_by(UploadedFile.created_at.desc()).all()

    return jsonify({
        'success': True,
        'photos': [p.to_dict() for p in photos],
        'total': len(photos)
    })
