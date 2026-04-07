FROM python:3.11-slim

WORKDIR /app

COPY services/shared/requirements.txt /app/shared-requirements.txt
RUN pip install --no-cache-dir -r /app/shared-requirements.txt

COPY services/shared /app/services/shared
COPY services/entity /app/services/entity

WORKDIR /app/services/entity

EXPOSE 8003

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003"]
