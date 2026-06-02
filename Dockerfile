# STAGE 1: Build Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Set production environment for build
ENV NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
RUN npm run build

# STAGE 2: Build Backend & Final Image
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Setup Python environment
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./backend/
# Copy frontend build from Stage 1
COPY --from=frontend-builder /app/frontend/out ./frontend/out

# Create a non-root user for Hugging Face
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
	PATH=/home/user/.local/bin:$PATH

# Expose Hugging Face default port
EXPOSE 7860
ENV PORT=7860

# Start the bot engine (FastAPI serves both API and Static Frontend)
CMD ["python", "backend/sandbox_bot.py"]
