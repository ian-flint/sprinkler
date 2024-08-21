#!/usr/bin/python3

from bottle import route, run, static_file, request
import threading
import time
from persistence import SprinklerData
import logging

sd = SprinklerData()

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
ch = logging.StreamHandler()
formatter = logging.Formatter(
    "%(asctime)s - %(levelname)s - %(message)s"
)
ch.setFormatter(formatter)
logger.addHandler(ch)

def poll ():
    while True:
        sd.poll()
        time.sleep(1)

@route ("/api/runone")
def runone ():
    logger.info ("Running one: ID=%s, Time=%s, TS=%s"%(request.query.id, request.query.time, request.query.ts))
    sd.runNow (int(request.query.id), int(request.query.time))
    return ("Ok")

@route ("/api/stop")
def stop ():
    logger.info ("Stopping current: TS=%s"%request.query.ts)
    sd.next ()
    return ("Ok")

@route ("/api/enqueue")
def enqueue ():
    logger.info ("Enqueuing zone: ID=%s, Time=%s"%(request.query.id, request.query.time))
    sd.enqueue (int(request.query.id), int(request.query.time), True)
    return ("Ok")

@route ("/")
def serve_static():
    return static_file("index.html", root="public")

@route ("/<filepath:path>")
def serve_static(filepath):
    return static_file(filepath, root="public")

t = threading.Thread(target=poll, daemon=True)
t.start()

run(host='10.0.0.241', port=8080, debug=True)

