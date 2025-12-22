bind = "127.0.0.1:8001"
workers = 3
worker_class = "sync"
timeout = 30
keepalive = 2
max_requests = 1000
max_requests_jitter = 100
preload_app = True
