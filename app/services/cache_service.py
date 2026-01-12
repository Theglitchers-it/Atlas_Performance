"""
Cache Service
Advanced caching strategies for database queries, API responses, and computed data
"""
from functools import wraps
from flask import request, current_app
from app import cache
import hashlib
import json


class CacheService:
    """Advanced caching service with multiple strategies"""

    # Cache timeout configurations (in seconds)
    CACHE_TIMEOUTS = {
        'short': 60,           # 1 minute - frequently changing data
        'medium': 300,         # 5 minutes - semi-static data
        'long': 1800,          # 30 minutes - mostly static data
        'very_long': 3600,     # 1 hour - rarely changing data
        'daily': 86400,        # 24 hours - daily updates
    }

    @staticmethod
    def get_cache_key(prefix, *args, **kwargs):
        """
        Generate cache key from prefix and arguments

        Args:
            prefix: Cache key prefix (e.g., 'user', 'workout', 'stats')
            *args: Positional arguments to include in key
            **kwargs: Keyword arguments to include in key

        Returns:
            str: Cache key
        """
        # Combine all arguments
        key_parts = [prefix]
        key_parts.extend(str(arg) for arg in args)

        # Sort kwargs for consistent keys
        for k in sorted(kwargs.keys()):
            key_parts.append(f"{k}:{kwargs[k]}")

        # Create hash for long keys
        key_string = ':'.join(key_parts)
        if len(key_string) > 200:
            key_hash = hashlib.md5(key_string.encode()).hexdigest()
            return f"{prefix}:{key_hash}"

        return key_string

    @staticmethod
    def cache_tenant_data(tenant_id, key, timeout='medium'):
        """
        Decorator to cache tenant-specific data

        Usage:
            @CacheService.cache_tenant_data(tenant_id, 'athletes', timeout='long')
            def get_tenant_athletes(tenant_id):
                return Athlete.query.filter_by(tenant_id=tenant_id).all()
        """
        def decorator(f):
            @wraps(f)
            def decorated_function(*args, **kwargs):
                cache_key = CacheService.get_cache_key(
                    f'tenant:{tenant_id}:{key}',
                    *args,
                    **kwargs
                )

                # Try to get from cache
                result = cache.get(cache_key)
                if result is not None:
                    return result

                # Execute function and cache result
                result = f(*args, **kwargs)
                timeout_seconds = CacheService.CACHE_TIMEOUTS.get(timeout, 300)
                cache.set(cache_key, result, timeout=timeout_seconds)

                return result

            return decorated_function
        return decorator

    @staticmethod
    def cache_user_data(user_id, key, timeout='medium'):
        """
        Decorator to cache user-specific data

        Usage:
            @CacheService.cache_user_data(user_id, 'profile', timeout='long')
            def get_user_profile(user_id):
                return User.query.get(user_id)
        """
        def decorator(f):
            @wraps(f)
            def decorated_function(*args, **kwargs):
                cache_key = CacheService.get_cache_key(
                    f'user:{user_id}:{key}',
                    *args,
                    **kwargs
                )

                result = cache.get(cache_key)
                if result is not None:
                    return result

                result = f(*args, **kwargs)
                timeout_seconds = CacheService.CACHE_TIMEOUTS.get(timeout, 300)
                cache.set(cache_key, result, timeout=timeout_seconds)

                return result

            return decorated_function
        return decorator

    @staticmethod
    def cache_query(key, timeout='medium', unless=None):
        """
        Generic decorator to cache function results

        Args:
            key: Cache key prefix
            timeout: Timeout key from CACHE_TIMEOUTS
            unless: Function that returns True to skip caching

        Usage:
            @CacheService.cache_query('exercise_list', timeout='long')
            def get_all_exercises():
                return Exercise.query.all()
        """
        def decorator(f):
            @wraps(f)
            def decorated_function(*args, **kwargs):
                # Check unless condition
                if unless and unless():
                    return f(*args, **kwargs)

                cache_key = CacheService.get_cache_key(key, *args, **kwargs)

                result = cache.get(cache_key)
                if result is not None:
                    return result

                result = f(*args, **kwargs)
                timeout_seconds = CacheService.CACHE_TIMEOUTS.get(timeout, 300)
                cache.set(cache_key, result, timeout=timeout_seconds)

                return result

            return decorated_function
        return decorator

    @staticmethod
    def cache_api_response(timeout='short'):
        """
        Decorator to cache API responses based on URL and query parameters

        Usage:
            @app.route('/api/workouts')
            @CacheService.cache_api_response(timeout='medium')
            def get_workouts_api():
                return jsonify(workouts)
        """
        def decorator(f):
            @wraps(f)
            def decorated_function(*args, **kwargs):
                # Generate cache key from request
                cache_key = CacheService._generate_request_cache_key()

                result = cache.get(cache_key)
                if result is not None:
                    return result

                result = f(*args, **kwargs)
                timeout_seconds = CacheService.CACHE_TIMEOUTS.get(timeout, 60)
                cache.set(cache_key, result, timeout=timeout_seconds)

                return result

            return decorated_function
        return decorator

    @staticmethod
    def _generate_request_cache_key():
        """Generate cache key from current request"""
        # Include method, path, and query string
        key_parts = [
            request.method,
            request.path,
        ]

        # Add query parameters (sorted for consistency)
        if request.args:
            query_string = '&'.join(
                f"{k}={v}" for k, v in sorted(request.args.items())
            )
            key_parts.append(query_string)

        # Add user ID if authenticated
        if hasattr(request, 'user') and request.user:
            key_parts.append(f"user:{request.user.id}")

        return CacheService.get_cache_key('api', *key_parts)

    @staticmethod
    def invalidate_tenant_cache(tenant_id, key=None):
        """
        Invalidate all cache entries for a tenant

        Args:
            tenant_id: Tenant ID
            key: Specific key to invalidate (optional, invalidates all if None)
        """
        if key:
            cache_key = f'tenant:{tenant_id}:{key}'
            cache.delete(cache_key)
        else:
            # Delete all tenant keys (requires cache backend support)
            pattern = f'tenant:{tenant_id}:*'
            cache.delete_many(pattern)

    @staticmethod
    def invalidate_user_cache(user_id, key=None):
        """Invalidate cache for specific user"""
        if key:
            cache_key = f'user:{user_id}:{key}'
            cache.delete(cache_key)
        else:
            pattern = f'user:{user_id}:*'
            cache.delete_many(pattern)

    @staticmethod
    def warm_cache(func, *args, **kwargs):
        """
        Pre-populate cache with function result

        Usage:
            CacheService.warm_cache(get_tenant_athletes, tenant_id=1)
        """
        return func(*args, **kwargs)

    @staticmethod
    def get_or_set(cache_key, func, timeout='medium'):
        """
        Get from cache or execute function and set cache

        Args:
            cache_key: Cache key
            func: Function to execute if cache miss
            timeout: Timeout key

        Returns:
            Cached or computed value
        """
        result = cache.get(cache_key)
        if result is not None:
            return result

        result = func()
        timeout_seconds = CacheService.CACHE_TIMEOUTS.get(timeout, 300)
        cache.set(cache_key, result, timeout=timeout_seconds)

        return result

    @staticmethod
    def memoize_expensive_computation(key, timeout='long'):
        """
        Decorator for expensive computations (e.g., statistics, analytics)

        Usage:
            @CacheService.memoize_expensive_computation('tenant_stats', timeout='very_long')
            def calculate_tenant_statistics(tenant_id):
                # Expensive computation
                return stats
        """
        return CacheService.cache_query(key, timeout=timeout)


# Specific cache decorators for common use cases

def cache_workout_data(timeout='medium'):
    """Cache workout-related data"""
    def decorator(f):
        @wraps(f)
        def decorated_function(workout_id, *args, **kwargs):
            cache_key = f'workout:{workout_id}:{f.__name__}'
            return CacheService.get_or_set(
                cache_key,
                lambda: f(workout_id, *args, **kwargs),
                timeout=timeout
            )
        return decorated_function
    return decorator


def cache_athlete_data(timeout='medium'):
    """Cache athlete-related data"""
    def decorator(f):
        @wraps(f)
        def decorated_function(athlete_id, *args, **kwargs):
            cache_key = f'athlete:{athlete_id}:{f.__name__}'
            return CacheService.get_or_set(
                cache_key,
                lambda: f(athlete_id, *args, **kwargs),
                timeout=timeout
            )
        return decorated_function
    return decorator


def cache_analytics(timeout='very_long'):
    """Cache analytics and statistics"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            cache_key = CacheService.get_cache_key(f'analytics:{f.__name__}', *args, **kwargs)
            return CacheService.get_or_set(
                cache_key,
                lambda: f(*args, **kwargs),
                timeout=timeout
            )
        return decorated_function
    return decorator


def cache_page(timeout='medium', key_prefix='view'):
    """
    Cache entire page output

    Usage:
        @app.route('/dashboard')
        @cache_page(timeout='short')
        def dashboard():
            return render_template('dashboard.html')
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Generate cache key from request
            cache_key = f"{key_prefix}:{request.path}"

            # Add query parameters
            if request.args:
                query_string = '&'.join(
                    f"{k}={v}" for k, v in sorted(request.args.items())
                )
                cache_key += f"?{query_string}"

            # Check cache
            result = cache.get(cache_key)
            if result is not None:
                return result

            # Execute and cache
            result = f(*args, **kwargs)
            timeout_seconds = CacheService.CACHE_TIMEOUTS.get(timeout, 300)
            cache.set(cache_key, result, timeout=timeout_seconds)

            return result

        return decorated_function
    return decorator


# Cache invalidation helpers

class CacheInvalidator:
    """Helper class for cache invalidation patterns"""

    @staticmethod
    def on_workout_update(workout_id, tenant_id):
        """Invalidate caches when workout is updated"""
        cache.delete(f'workout:{workout_id}:*')
        cache.delete(f'tenant:{tenant_id}:workouts')
        cache.delete(f'tenant:{tenant_id}:workout_count')

    @staticmethod
    def on_athlete_update(athlete_id, tenant_id):
        """Invalidate caches when athlete is updated"""
        cache.delete(f'athlete:{athlete_id}:*')
        cache.delete(f'tenant:{tenant_id}:athletes')
        cache.delete(f'tenant:{tenant_id}:athlete_count')
        cache.delete(f'tenant:{tenant_id}:stats')

    @staticmethod
    def on_progress_log(athlete_id, workout_id):
        """Invalidate caches when progress is logged"""
        cache.delete(f'athlete:{athlete_id}:progress')
        cache.delete(f'athlete:{athlete_id}:stats')
        cache.delete(f'workout:{workout_id}:completion_rate')
        cache.delete(f'analytics:*')

    @staticmethod
    def on_subscription_change(tenant_id):
        """Invalidate caches when subscription changes"""
        cache.delete(f'tenant:{tenant_id}:subscription')
        cache.delete(f'tenant:{tenant_id}:limits')
        cache.delete(f'analytics:mrr')
        cache.delete(f'analytics:arr')
