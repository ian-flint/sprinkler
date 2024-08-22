import time
import os
from pyrainbird import RainbirdController
import logging

controller = RainbirdController(
    os.environ["RAINBIRD_SERVER"], os.environ["RAINBIRD_PASSWORD"]
)

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

    def enqueue (self, station, duration, resumeIfInterrupted):
        logger.info ("Enqueuing station %d for duration %d, resume %s"%(station, duration, resumeIfInterrupted))
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
            self.running = None
        logger.info("%s\n" % controller.stop_irrigation())

    def poll (self):
        now = time.time()
        if self.running:
            station = self.running[0]
            end = self.running[1]
            if end < now:
                logger.info ("Station %d done"%station)
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
                seconds = int(next[1] * 60)
                minutes = int(seconds / 60)
                seconds = seconds % 60
                logger.info ("Starting station %d for %d:%02d minutes, resume: %s"%(next[0], minutes, seconds, next[2]))
                logger.info("%s\n" % controller.stop_irrigation())
                logger.info("%s\n" % controller.irrigate_zone(next[0], minutes))
                self.running = [next[0], now + (60 * next[1]), next[2]]
