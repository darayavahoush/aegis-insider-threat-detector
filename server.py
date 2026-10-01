#!/usr/bin/env python3
"""
Aegis Behavioral Biometrics - Python HTTP & Telemetry Server
Runs on Python 3 standard library with zero external dependencies.
"""

import http.server
import socketserver
import os
import json
import sys

PORT = int(os.environ.get("PORT", 3000))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class AegisHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        if self.path == "/api/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            payload = {
                "status": "ONLINE",
                "system": "Aegis Biometric Threat Detection Engine",
                "engine": "Python3-StandardLib",
                "version": "1.0.0"
            }
            self.wfile.write(json.dumps(payload).encode("utf-8"))
            return

        super().do_GET()

    def do_POST(self):
        if self.path == "/api/telemetry/log":
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            response = {"success": True, "engine": "python-logger"}
            self.wfile.write(json.dumps(response).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()

if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), AegisHandler) as httpd:
        print(f"\n======================================================")
        print(f"🛡️  AEGIS - Insider Threat & Keystroke Biometrics (Python)")
        print(f"📡 Server running at: http://localhost:{PORT}")
        print(f"======================================================\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down Aegis server...")
            sys.exit(0)
