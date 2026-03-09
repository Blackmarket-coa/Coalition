FROM ghcr.io/maplibre/martin:v0.14.2

WORKDIR /app
COPY martin.yaml /app/martin.yaml

# Railway provides PORT at runtime; Martin listens on 3000 by default in config,
# so we bind it to Railway's router port via shell entrypoint.
ENTRYPOINT ["sh", "-c", "martin --config /app/martin.yaml --listen-addresses 0.0.0.0:${PORT:-3000}"]
