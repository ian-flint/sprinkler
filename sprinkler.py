#!/usr/bin/python3

from bottle import route, run, static_file, request
import threading
import time
import json
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

@route ("/api/getschedule")
def getschedule ():
    obj = []
    with open ("schedule.cron", "r") as f:
        for line in f:
            if line.find("api/enqueue") < 0:
                continue
            fields = line.strip().split()
            fields.pop(5)
            url = fields.pop(5).strip('"')
            fields += [pair.split("=")[1] for pair in url.split("?")[1].split("&")]
            obj.append(fields)
    return (json.dumps(obj))

@route ("/")
def serve_static():
    return static_file("index.html", root="public")

@route ("/<filepath:path>")
def serve_static(filepath):
    return static_file(filepath, root="public")

t = threading.Thread(target=poll, daemon=True)
t.start()

run(host='10.0.0.241', port=8080, debug=True)

