FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY services/shared/requirements.txt /app/shared-requirements.txt
RUN pip install --no-cache-dir -r /app/shared-requirements.txt

COPY services/shared /app/services/shared
COPY services/core /app/services/core

WORKDIR /app/services/core

EXPOSE 8002

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]
