#!/bin/bash
# BlackieFi 3.0 - Ollama Model Initialization Script
# Pulls the default model if not already present

set -e

MODEL=${OLLAMA_MODEL:-phi}

echo "Checking for model: $MODEL"

# Wait for Ollama to be ready
max_attempts=30
attempt=0
while ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        echo "Timeout waiting for Ollama to start"
        exit 1
    fi
    echo "Waiting for Ollama... ($attempt/$max_attempts)"
    sleep 2
done

echo "Ollama is ready!"

# Check if model exists
if curl -s http://localhost:11434/api/tags | grep -q "\"$MODEL\""; then
    echo "Model $MODEL already exists"
else
    echo "Pulling model $MODEL..."
    ollama pull $MODEL
    echo "Model $MODEL pulled successfully!"
fi

echo "Ollama initialization complete!"
