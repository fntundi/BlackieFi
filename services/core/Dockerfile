FROM python:3.11-slim

WORKDIR /app

# Install shared requirements first
COPY services/shared/requirements.txt /app/shared-requirements.txt
RUN pip install --no-cache-dir -r /app/shared-requirements.txt

# Copy shared module
COPY services/shared /app/services/shared

# Copy service code
COPY services/core /app/services/core

WORKDIR /app/services/core

EXPOSE 8002

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]
