# ============================================================================
# EHS Management System - Backend Dockerfile
# ============================================================================
# Multi-stage build for production optimization
#

# ============================================================================
# Stage 1: Base Python Environment
# ============================================================================
FROM python:3.12-slim as base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgthread-2.0-0 \
    cmake \
    && rm -rf /var/lib/apt/lists/*

# Create app user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Create app directory
WORKDIR /app

# ============================================================================
# Stage 2: Dependencies Installation
# ============================================================================
FROM base as dependencies

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# ============================================================================
# Stage 3: Application Build
# ============================================================================
FROM dependencies as application

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/logs /app/media /app/staticfiles

# Set dummy SECRET_KEY for collectstatic
ENV SECRET_KEY=dummy_key_for_build

# Collect static files
RUN python manage.py collectstatic --noinput

# Set proper permissions
RUN chown -R appuser:appuser /app

# ============================================================================
# Stage 4: Production Image
# ============================================================================
FROM application as production

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

# Default command
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "--worker-class", "gevent", "--worker-connections", "1000", "--max-requests", "1000", "--max-requests-jitter", "100", "--timeout", "30", "--keep-alive", "2", "--log-level", "info", "--access-logfile", "-", "--error-logfile", "-", "backend.wsgi:application"]

# ============================================================================
# Stage 5: Development Image
# ============================================================================
FROM application as development

# Install development dependencies
RUN pip install --no-cache-dir \
    django-debug-toolbar \
    django-extensions \
    ipython \
    pytest \
    pytest-django \
    coverage

# Switch to non-root user
USER appuser

# Expose port for development
EXPOSE 8000

# Development command
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
