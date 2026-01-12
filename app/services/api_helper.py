"""
API Helper Service
Provides utilities for pagination, filtering, sorting, and search functionality
"""
from flask import request
from sqlalchemy import or_, and_, func


class APIHelper:
    """Helper class for common API operations"""

    @staticmethod
    def paginate(query, page=None, per_page=None):
        """
        Paginate a SQLAlchemy query

        Args:
            query: SQLAlchemy query object
            page: Page number (default from request args)
            per_page: Items per page (default from request args or 20)

        Returns:
            dict with items and pagination metadata
        """
        if page is None:
            page = request.args.get('page', 1, type=int)
        if per_page is None:
            per_page = request.args.get('per_page', 20, type=int)

        # Limit per_page to prevent abuse
        per_page = min(per_page, 100)

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return {
            'items': pagination.items,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev,
                'next_page': page + 1 if pagination.has_next else None,
                'prev_page': page - 1 if pagination.has_prev else None
            }
        }

    @staticmethod
    def apply_filters(query, model, filters):
        """
        Apply multiple filters to a query

        Args:
            query: SQLAlchemy query object
            model: SQLAlchemy model class
            filters: dict of field_name: value pairs

        Returns:
            Filtered query
        """
        for field, value in filters.items():
            if value is None or value == '':
                continue

            if hasattr(model, field):
                column = getattr(model, field)

                # Handle different filter types
                if isinstance(value, list):
                    # IN filter for lists
                    query = query.filter(column.in_(value))
                elif isinstance(value, str) and value.startswith('%') and value.endswith('%'):
                    # LIKE filter for strings with wildcards
                    query = query.filter(column.like(value))
                else:
                    # Exact match
                    query = query.filter(column == value)

        return query

    @staticmethod
    def apply_date_range(query, model, date_field, start_date=None, end_date=None):
        """
        Apply date range filter

        Args:
            query: SQLAlchemy query object
            model: SQLAlchemy model class
            date_field: Name of the date field
            start_date: Start date (inclusive)
            end_date: End date (inclusive)

        Returns:
            Filtered query
        """
        if hasattr(model, date_field):
            column = getattr(model, date_field)

            if start_date:
                query = query.filter(column >= start_date)
            if end_date:
                query = query.filter(column <= end_date)

        return query

    @staticmethod
    def apply_search(query, model, search_fields, search_term):
        """
        Apply search across multiple fields

        Args:
            query: SQLAlchemy query object
            model: SQLAlchemy model class
            search_fields: List of field names to search in
            search_term: Search term

        Returns:
            Filtered query
        """
        if not search_term or not search_fields:
            return query

        # Build OR conditions for each search field
        conditions = []
        for field in search_fields:
            if hasattr(model, field):
                column = getattr(model, field)
                # Use case-insensitive LIKE search
                conditions.append(column.ilike(f'%{search_term}%'))

        if conditions:
            query = query.filter(or_(*conditions))

        return query

    @staticmethod
    def apply_sorting(query, model, sort_field=None, sort_order=None):
        """
        Apply sorting to query

        Args:
            query: SQLAlchemy query object
            model: SQLAlchemy model class
            sort_field: Field name to sort by (default from request args)
            sort_order: 'asc' or 'desc' (default from request args)

        Returns:
            Sorted query
        """
        if sort_field is None:
            sort_field = request.args.get('sort', 'id')
        if sort_order is None:
            sort_order = request.args.get('order', 'desc')

        if hasattr(model, sort_field):
            column = getattr(model, sort_field)

            if sort_order.lower() == 'asc':
                query = query.order_by(column.asc())
            else:
                query = query.order_by(column.desc())

        return query

    @staticmethod
    def build_api_query(query, model, **kwargs):
        """
        Build complete API query with filters, search, sorting, and pagination

        Args:
            query: Base SQLAlchemy query
            model: SQLAlchemy model class
            **kwargs: Configuration options
                - filters: dict of field: value pairs
                - search_fields: list of fields to search
                - search_term: search term (or from request args)
                - sort_field: field to sort by (or from request args)
                - sort_order: 'asc' or 'desc' (or from request args)
                - date_field: field for date range filter
                - start_date: start date for range
                - end_date: end date for range
                - page: page number (or from request args)
                - per_page: items per page (or from request args)

        Returns:
            dict with filtered items and pagination
        """
        # Apply filters
        if 'filters' in kwargs:
            query = APIHelper.apply_filters(query, model, kwargs['filters'])

        # Apply search
        if 'search_fields' in kwargs:
            search_term = kwargs.get('search_term') or request.args.get('search', '')
            query = APIHelper.apply_search(query, model, kwargs['search_fields'], search_term)

        # Apply date range
        if 'date_field' in kwargs:
            query = APIHelper.apply_date_range(
                query,
                model,
                kwargs['date_field'],
                kwargs.get('start_date'),
                kwargs.get('end_date')
            )

        # Apply sorting
        query = APIHelper.apply_sorting(
            query,
            model,
            kwargs.get('sort_field'),
            kwargs.get('sort_order')
        )

        # Apply pagination
        result = APIHelper.paginate(
            query,
            kwargs.get('page'),
            kwargs.get('per_page')
        )

        return result

    @staticmethod
    def get_filter_params(request_args, allowed_filters):
        """
        Extract filter parameters from request args

        Args:
            request_args: Flask request.args
            allowed_filters: List of allowed filter field names

        Returns:
            dict of filter field: value pairs
        """
        filters = {}
        for field in allowed_filters:
            value = request_args.get(field)
            if value is not None:
                # Handle comma-separated values as lists
                if ',' in str(value):
                    filters[field] = value.split(',')
                else:
                    filters[field] = value
        return filters

    @staticmethod
    def get_date_range_params(request_args, field_name='created_at'):
        """
        Extract date range parameters from request args

        Args:
            request_args: Flask request.args
            field_name: Base field name (e.g., 'created_at')

        Returns:
            tuple of (start_date, end_date)
        """
        from datetime import datetime

        start_date = request_args.get(f'{field_name}_start') or request_args.get('start_date')
        end_date = request_args.get(f'{field_name}_end') or request_args.get('end_date')

        # Parse dates if they're strings
        if start_date and isinstance(start_date, str):
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d')
            except ValueError:
                start_date = None

        if end_date and isinstance(end_date, str):
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d')
            except ValueError:
                end_date = None

        return start_date, end_date

    @staticmethod
    def build_response(items, pagination=None, **kwargs):
        """
        Build standardized API response

        Args:
            items: List of items or dict if already serialized
            pagination: Pagination metadata dict
            **kwargs: Additional fields to include in response

        Returns:
            Standardized response dict
        """
        response = {
            'success': True,
            'data': items if isinstance(items, list) else [items],
            'count': len(items) if isinstance(items, list) else 1
        }

        if pagination:
            response['pagination'] = pagination

        # Add any additional fields
        response.update(kwargs)

        return response

    @staticmethod
    def build_error_response(message, code=400, **kwargs):
        """
        Build standardized error response

        Args:
            message: Error message
            code: HTTP status code
            **kwargs: Additional error details

        Returns:
            tuple of (response dict, status code)
        """
        response = {
            'success': False,
            'error': message,
            'code': code
        }

        response.update(kwargs)

        return response, code


class QueryBuilder:
    """Advanced query builder for complex filtering"""

    def __init__(self, model):
        self.model = model
        self.query = model.query

    def filter_by_tenant(self, tenant_id):
        """Filter by tenant ID"""
        if hasattr(self.model, 'tenant_id'):
            self.query = self.query.filter_by(tenant_id=tenant_id)
        return self

    def filter_by_user(self, user_id, field='user_id'):
        """Filter by user ID"""
        if hasattr(self.model, field):
            column = getattr(self.model, field)
            self.query = self.query.filter(column == user_id)
        return self

    def filter_active_only(self):
        """Filter for active records only"""
        if hasattr(self.model, 'is_active'):
            self.query = self.query.filter_by(is_active=True)
        return self

    def filter_not_deleted(self):
        """Exclude soft-deleted records"""
        if hasattr(self.model, 'is_deleted'):
            self.query = self.query.filter_by(is_deleted=False)
        return self

    def filter_by_status(self, status):
        """Filter by status"""
        if status and hasattr(self.model, 'status'):
            self.query = self.query.filter_by(status=status)
        return self

    def filter_by_type(self, type_value, field='type'):
        """Filter by type field"""
        if type_value and hasattr(self.model, field):
            column = getattr(self.model, field)
            self.query = self.query.filter(column == type_value)
        return self

    def filter_date_range(self, field, start_date, end_date):
        """Filter by date range"""
        if hasattr(self.model, field):
            column = getattr(self.model, field)
            if start_date:
                self.query = self.query.filter(column >= start_date)
            if end_date:
                self.query = self.query.filter(column <= end_date)
        return self

    def search(self, search_term, *fields):
        """Search across multiple fields"""
        if search_term and fields:
            conditions = []
            for field in fields:
                if hasattr(self.model, field):
                    column = getattr(self.model, field)
                    conditions.append(column.ilike(f'%{search_term}%'))
            if conditions:
                self.query = self.query.filter(or_(*conditions))
        return self

    def sort(self, field, order='desc'):
        """Sort results"""
        if hasattr(self.model, field):
            column = getattr(self.model, field)
            if order.lower() == 'asc':
                self.query = self.query.order_by(column.asc())
            else:
                self.query = self.query.order_by(column.desc())
        return self

    def paginate(self, page=1, per_page=20):
        """Paginate results"""
        per_page = min(per_page, 100)  # Max 100 items per page
        pagination = self.query.paginate(page=page, per_page=per_page, error_out=False)

        return {
            'items': pagination.items,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }

    def all(self):
        """Execute query and return all results"""
        return self.query.all()

    def first(self):
        """Execute query and return first result"""
        return self.query.first()

    def count(self):
        """Count results"""
        return self.query.count()
