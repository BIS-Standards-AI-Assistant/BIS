FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libsndfile1 \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Clone BharatSTT repository components
RUN git clone https://github.com/Dhruvy0804/BharatSTT.git /app/bharatstt_src && \
    cp -r /app/bharatstt_src/* /app/ && \
    rm -rf /app/bharatstt_src

COPY app.py /app/

ENV PORT=8000
EXPOSE 8000

CMD ["python", "app.py"]
