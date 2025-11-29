#!/bin/sh
MODEL_PATH="/models/bge-m3-Q4_K_M.gguf"
MODEL_URL="https://huggingface.co/dranger003/bge-m3-gguf/resolve/main/bge-m3-Q4_K_M.gguf"

if [ ! -f "$MODEL_PATH" ]; then
  echo "Downloading BGE-M3 model (~680MB)..."
  wget -q --show-progress -O "$MODEL_PATH" "$MODEL_URL"
  echo "Download complete."
fi

echo "Starting KoboldCpp embeddings server..."
exec python /app/koboldcpp.py --model "$MODEL_PATH" --port 5001 --host 0.0.0.0 --embeddings
