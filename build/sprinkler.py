#!/usr/bin/python3

from bottle import route, run, static_file, request, post
import threading
import time
import json
from persistence import SprinklerData
import logging
import os

sd = SprinklerData()

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
ch = logging.StreamHandler()
formatter = logging.Formatter(
    "%(asctime)s - %(levelname)s - %(message)s"
)
ch.setFormatter(formatter)
logger.addHandler(ch)

@route ("/api/getstations")
def getStations ():
    return (sd.getStations())

@route ("/api/getlog")
def getLog ():
    with open("sprinkler.log", 'r') as f:
        blob = f.read().split("\n")
        if len(blob) > 40:
            blob = blob[-40:]
        return ("<br>".join(blob))

@route ("/api/getqueue")
def getQueue():
    return sd.getQueue()

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

@post ("/api/saveschedule")
def saveschedule():
#    print (request.body.read().decode("utf-8"))
#    return ("OK")
    lines = request.body.read().decode("utf-8").split("\n")
    with open("schedule.cron", "w") as f:
        for line in lines:
#            print ("%s\n"%line)
            if line.find ("#") == 0: # comment line
                f.write ("#SPRINKLER %s\n"%line)
            else:
                fields = line.split()
                if len(fields) < 6:
                    continue
                selFields = [int(x) for x in fields[:2] + fields[4:]]
#                print (selFields)
                f.write ("%d %d * * %d /usr/bin/curl \"http://10.0.0.243:8080/api/enqueue?id=%d&time=%d\"\n"%tuple(selFields))
    os.system ("crontab schedule.cron")
    return ("OK")

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

@route ("/api/fetchweather")
def fetch_weather():
    return (sd.fetchWeather())

t = threading.Thread(target=poll, daemon=True)
t.start()

run(host='0.0.0.0', port=8080, debug=True)

