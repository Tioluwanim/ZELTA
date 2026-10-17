# ---- build stage: compilers live only here ----
FROM python:3.11-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -U pip wheel setuptools \
    && pip wheel --no-cache-dir -r requirements.txt -w /wheels

# ---- runtime stage: no gcc, no kernel headers ----
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get -y upgrade && rm -rf /var/lib/apt/lists/*
COPY --from=build /wheels /wheels
RUN pip install --no-cache-dir -U pip wheel setuptools \
    && pip install --no-cache-dir /wheels/* && rm -rf /wheels
COPY . .
RUN useradd -m app
USER app
ENV PORT=8080
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
