import json
import time
import os
from pyrainbird import RainbirdController
import logging
import datetime
import requests
import calendar
import statistics

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
ch = logging.StreamHandler()
formatter = logging.Formatter(
    "%(asctime)s - %(levelname)s - %(message)s"
)
ch.setFormatter(formatter)
logger.addHandler(ch)

class SprinklerData:
    def __init__ (self):
        self.queue = []
        self.running = None
        self.meantemp = 70
        self.hightemp = 70
        self.mmrain = 0
        self.fetchWeather()
        with open("etc/config.json") as f:
            obj = json.loads(f.read())
            self.controller = RainbirdController(obj["security"]["RAINBIRD_SERVER"], obj["security"]["RAINBIRD_PASSWORD"])
            self.stations = obj["stations"]

    def getQueue (self):
        ret = {}
        if len(self.queue) > 0:
            ret["queue"] = []
            for line in self.queue:
                ret["queue"].append([str(x) for x in line]);
        if self.running:
            remaining = self.running[1] - time.time()
            ret["running"] = [str(self.running[0]), str(int(remaining/60)) + ":" + str(int(remaining%60)), str(self.running[2])]
        return json.dumps(ret)

    def getStations (self):
        return json.dumps(self.stations)


    def enqueue (self, station, duration, resumeIfInterrupted):
        logger.info ("Enqueuing station %d for duration %d, resume %s"%(station, duration, resumeIfInterrupted))
        self.fetchWeather()
        with open("sprinkler.log", "a") as f:
            f.write ("Enqueuing station %d for duration %d, resume %s\n"%(station, duration, resumeIfInterrupted))
        if self.hightemp > 85:
            duration = duration * 1.5
        if self.hightemp < 70:
            duration = duration * 0.7
        if self.mmrain > 30:
            duration = duration * 0.5
        if self.mmrain > 60:
            duration = 0
        logger.info ("Duration adjusted to %d due to weather"%(duration))
        with open("sprinkler.log", "a") as f:
            f.write ("Duration adjusted to %d due to weather\n"%(duration))
        self.queue.append([station, duration, resumeIfInterrupted])

    def runNow (self, station, duration):
        if self.running:
            if self.running[2]:
                now = time.time()
                end = self.running[1]
                self.running[1] = (end - now)/60
                minutes = int(self.running[1])
                seconds = int((end - now)%60)
                logger.info ("Deferring current running station %d.  %d:%d remaining"%(self.running[0], minutes, seconds))
                self.queue.insert(0, self.running)
            self.running = None
        self.queue.insert(0, [station, duration, False])

    def next (self):
        if self.running:
            with open("sprinkler.log", "a") as f:
                f.write ("%s: Terminating current job\n"%(datetime.datetime.now()))
            self.running = None
        try:
            logger.error("%s\n" % self.controller.stop_irrigation())
        except:
            logger.error("Error encountered stopping station")
            with open("sprinkler.log", "a") as f:
                f.write("Error encountered starting station")

    def poll (self):
        now = time.time()
        if self.running:
            station = self.running[0]
            end = self.running[1]
            if end < now:
                logger.info ("Station %d done"%station)
                with open("sprinkler.log", "a") as f:
                    f.write ("%s: Station %d done\n"%(datetime.datetime.now(), station))
                self.running = None
            else:
                seconds = int(end - now)
                minutes = int(seconds / 60)
                seconds = seconds % 60
                if (seconds % 60 == 0):
                    logger.info ("Station %d running - %d:%02d remaining"%(station, minutes, seconds))
                
        if not self.running:
            if len(self.queue) > 0:
                next = self.queue.pop(0)
                logger.info ("Next zone: %s"%next)
                seconds = int(next[1] * 60)
                minutes = int(seconds / 60)
                seconds = seconds % 60
                logger.info ("Starting station %d for %d:%02d minutes, resume: %s"%(next[0], minutes, seconds, next[2]))
                with open("sprinkler.log", "a") as f:
                    f.write("%s: Starting station %d for %d:%02d minutes, resume: %s\n"%(datetime.datetime.now(), next[0], minutes, seconds, next[2]))
                try:
                    logger.error("%s\n" % self.controller.stop_irrigation())
                    logger.error("%s\n" % self.controller.irrigate_zone(next[0], minutes))
                except:
                    logger.error("Error encountered starting station")
                    with open("sprinkler.log", "a") as f:
                        f.write("Error encountered starting station")
                self.running = [next[0], now + (60 * next[1]), next[2]]

    def fetchWeather (self):
        now = time.time()
        ts = None
        try:
            ts = os.stat("weather.cache")
        except:
            ts = None
        if (ts and (now - ts.st_mtime < 86400)):
            with open("weather.cache", "r") as f:
                obj = json.loads(f.read())
                self.meantemp = obj["meantemp"]
                self.hightemp = obj["hightemp"]
                self.mmrain = obj["mmrain"]
                with open("sprinkler.log", "a") as f2:
                    f2.write("%s\n"%obj)
                with open("sprinkler.log", "a") as f:
                    f.write("Fetched weather from cache: %s\n"%obj)
                return obj
            
        r = requests.get("https://api.weather.gov/gridpoints/MTR/92,83")
        temps = r.json()['properties']['temperature']['values']
        precip = r.json()['properties']['quantitativePrecipitation']['values']
        now = time.time()
        wtemps = []
        high = 0
        mmrain = 0
        for t in temps:
            offset = calendar.timegm(time.strptime(t['validTime'].split('/')[0].split('+')[0] + "+0000", "%Y-%m-%dT%H:%M:%S%z")) - now
            if offset > (86400 * 7):
                continue
            f = t['value'] * 1.8 + 32
            wtemps.append(f)
            if high < f:
                high = f
        for p in precip:
            offset = calendar.timegm(time.strptime(p['validTime'].split('/')[0].split('+')[0] + "+0000", "%Y-%m-%dT%H:%M:%S%z")) - now
            mmrain += p['value']
        mean = statistics.mean(wtemps)
        self.meantemp = mean
        self.hightemp = high
        self.mmrain = mmrain
        obj = {"meantemp": mean, "hightemp": high, "mmrain": mmrain}
        with open("weather.cache", "w") as f:
            f.write(json.dumps(obj))
        w = "High: %f, Mean: %f, Rain: %f"%(high, mean, mmrain)
        with open("sprinkler.log", "a") as f:
            f.write("Fetched weather from Internet: %s\n"%obj)
        return (obj)

