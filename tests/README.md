# Testing Guide for Atlas Performance

## Overview

This directory contains all automated tests for the Atlas Performance platform. We use pytest as our testing framework with comprehensive unit, integration, and end-to-end tests.

## Test Structure

```
tests/
├── conftest.py              # Shared pytest fixtures and configuration
├── unit/                    # Unit tests (individual components)
│   ├── test_models.py       # Database model tests
│   └── test_services.py     # Service layer tests
└── integration/             # Integration tests (multiple components)
    ├── test_api_endpoints.py  # API endpoint tests
    └── test_workflows.py      # Complete user workflow tests
```

## Running Tests

### Install Test Dependencies

```bash
pip install -r requirements.txt
```

### Run All Tests

```bash
pytest
```

### Run with Coverage Report

```bash
pytest --cov=app --cov-report=html
```

This generates an HTML coverage report in `htmlcov/index.html`.

### Run Specific Test Categories

```bash
# Unit tests only
pytest tests/unit/

# Integration tests only
pytest tests/integration/

# Specific test file
pytest tests/unit/test_models.py

# Specific test class
pytest tests/unit/test_models.py::TestUserModel

# Specific test function
pytest tests/unit/test_models.py::TestUserModel::test_create_user
```

### Run Tests by Markers

```bash
# Security tests only
pytest -m security

# Performance tests only
pytest -m performance

# Skip slow tests
pytest -m "not slow"
```

### Verbose Output

```bash
# Show detailed test output
pytest -v

# Show print statements
pytest -s

# Both
pytest -vs
```

## Test Fixtures

Common fixtures are defined in `conftest.py`:

### Application Fixtures

- `app`: Flask application instance configured for testing
- `client`: Flask test client for making HTTP requests
- `db_session`: Database session with automatic rollback

### User Fixtures

- `super_admin_user`: Super admin user for testing admin features
- `trainer_user`: Trainer user for testing trainer features
- `athlete_user`: Athlete user for testing athlete features

### Data Fixtures

- `test_tenant`: Test tenant/gym for multi-tenant testing
- `authenticated_client`: Pre-authenticated test client

### Utility Fixtures

- `temp_upload_dir`: Temporary directory for file uploads
- `mock_stripe`: Mock Stripe API calls
- `performance_timer`: Timer for performance testing

## Writing New Tests

### Unit Test Example

```python
# tests/unit/test_my_feature.py
import pytest
from app.models import MyModel

class TestMyFeature:
    """Tests for MyFeature"""

    def test_feature_works(self, app):
        """Test that feature works correctly"""
        with app.app_context():
            result = MyModel.do_something()
            assert result == expected_value

    def test_feature_handles_errors(self, app):
        """Test error handling"""
        with app.app_context():
            with pytest.raises(ValueError):
                MyModel.do_something_invalid()
```

### Integration Test Example

```python
# tests/integration/test_my_api.py
import pytest

class TestMyAPI:
    """Tests for My API"""

    def test_api_endpoint(self, authenticated_client):
        """Test API endpoint returns correct data"""
        response = authenticated_client.get('/api/my-endpoint')

        assert response.status_code == 200
        data = response.get_json()
        assert 'result' in data
```

## Test Markers

Available test markers (defined in `pytest.ini`):

- `@pytest.mark.unit`: Unit tests
- `@pytest.mark.integration`: Integration tests
- `@pytest.mark.e2e`: End-to-end tests
- `@pytest.mark.slow`: Slow-running tests
- `@pytest.mark.security`: Security-related tests
- `@pytest.mark.performance`: Performance tests

Example usage:

```python
@pytest.mark.unit
@pytest.mark.security
def test_password_hashing():
    """Test that passwords are properly hashed"""
    # Test implementation
```

## Coverage Goals

We aim for the following coverage targets:

- **Overall**: 70%+ (enforced in pytest.ini)
- **Models**: 80%+
- **Services**: 75%+
- **Routes**: 60%+

View current coverage:

```bash
pytest --cov=app --cov-report=term-missing
```

## Continuous Integration

Tests are automatically run on:

- Every push to main branch
- Every pull request
- Scheduled daily runs

CI configuration is in `.github/workflows/tests.yml` (if using GitHub Actions).

## Common Issues

### Database Tests Failing

If database tests fail, ensure:
1. Test database is properly configured
2. Migrations are up to date
3. Test fixtures are properly cleaning up

### Import Errors

If you see import errors:
1. Ensure you're in the virtual environment
2. Install test dependencies: `pip install -r requirements.txt`
3. Set PYTHONPATH if needed: `export PYTHONPATH="${PYTHONPATH}:$(pwd)"`

### Fixture Not Found

If pytest can't find a fixture:
1. Check it's defined in `conftest.py`
2. Ensure fixture scope is correct
3. Check for typos in fixture name

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Use fixtures to ensure proper cleanup
3. **Naming**: Use descriptive test names (test_feature_does_what)
4. **Assertions**: Use specific assertions with helpful messages
5. **Mocking**: Mock external services (Stripe, email, etc.)
6. **Performance**: Keep unit tests fast (< 100ms each)

## Debugging Tests

### Run with debugger

```bash
# Drop into debugger on failure
pytest --pdb

# Drop into debugger at start of test
pytest --trace
```

### Print debugging

```python
def test_something():
    result = calculate_something()
    print(f"Debug: result is {result}")  # Will show with -s flag
    assert result == expected
```

Run with: `pytest -s`

### VSCode Integration

Add to `.vscode/settings.json`:

```json
{
    "python.testing.pytestEnabled": true,
    "python.testing.pytestArgs": [
        "tests"
    ]
}
```

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Flask Testing Guide](https://flask.palletsprojects.com/en/latest/testing/)
- [Testing Best Practices](https://testdriven.io/blog/testing-best-practices/)

## Questions?

If you have questions about testing, contact the development team or open an issue in the project repository.
