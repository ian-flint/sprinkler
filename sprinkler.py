#!/usr/bin/python3

from pyrainbird import RainbirdController
import http.server
import socketserver
import os
import logging
from urllib.parse import urlparse
from urllib.parse import parse_qs
import sys
import signal

def signal_handler(sig, frame):
    print('Cleaning up')
    httpd.server_close()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

logging.basicConfig(level=logging.INFO)

controller = RainbirdController(
    os.environ["RAINBIRD_SERVER"], os.environ["RAINBIRD_PASSWORD"]
)

PORT = 3000

os.chdir ("public")

def runone (query):
    logging.info ("Running one: %s"%query)
    print("%s\n" % controller.irrigate_zone(int(query["id"][0]), int(query["time"][0])))
    return

def stop (query):
    logging.info ("Stopping all")
    print("%s\n" % controller.stop_irrigation())
    return

class myHandler (http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        path = parsed.path
        if path == "/api/runone":
            runone(query)
        elif path == "/api/stop":
            stop(query)
        else:
            http.server.SimpleHTTPRequestHandler.do_GET(self)

Handler = myHandler

httpd = socketserver.TCPServer(("", PORT), Handler)
print("serving at port", PORT)
httpd.serve_forever()

