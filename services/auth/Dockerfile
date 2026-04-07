FROM python:3.11-slim

WORKDIR /app

# Install shared requirements first
COPY services/shared/requirements.txt /app/shared-requirements.txt
RUN pip install --no-cache-dir -r /app/shared-requirements.txt

# Copy shared module
COPY services/shared /app/services/shared

# Copy service code
COPY services/auth /app/services/auth

WORKDIR /app/services/auth

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
