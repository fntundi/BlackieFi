FROM python:3.11-slim

WORKDIR /app

COPY services/shared/requirements.txt /app/shared-requirements.txt
RUN pip install --no-cache-dir -r /app/shared-requirements.txt

COPY services/shared /app/services/shared
COPY services/portfolio /app/services/portfolio

WORKDIR /app/services/portfolio

EXPOSE 8004

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8004"]
