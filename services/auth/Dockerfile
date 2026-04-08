FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY services/shared/requirements.txt /app/shared-requirements.txt
RUN pip install --no-cache-dir -r /app/shared-requirements.txt

COPY services/shared /app/services/shared
COPY services/auth /app/services/auth

WORKDIR /app/services/auth

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
