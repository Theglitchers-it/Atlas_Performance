#!/bin/bash
# Script to run Atlas Performance tests on Linux/Mac

echo "================================"
echo "Atlas Performance - Test Runner"
echo "================================"
echo ""

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Check if pytest is installed
if ! python -c "import pytest" &> /dev/null; then
    echo "pytest not found! Installing test dependencies..."
    pip install -r requirements.txt
fi

echo ""
echo "Running tests..."
echo ""

# Run tests with coverage
pytest --cov=app --cov-report=html --cov-report=term-missing -v

echo ""
echo "================================"
echo "Tests complete!"
echo "================================"
echo ""
echo "Coverage report generated in: htmlcov/index.html"
echo ""
echo "To view coverage report:"
echo "  - Linux/Mac: open htmlcov/index.html"
echo "  - Or open htmlcov/index.html in your browser"
echo ""
