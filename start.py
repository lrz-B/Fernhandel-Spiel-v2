# Lokaler Server für Testmodus und Demo: python start.py
# Liefert immer die aktuellen Dateien (kein Zwischenspeichern im Browser).
import http.server, os, webbrowser

os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

PORT = int(os.environ.get("PORT", "8766"))
print(f"Demo: http://localhost:{PORT}/demo.html   (Beenden: Strg+C)")
if os.environ.get("KEIN_BROWSER") != "1":
    webbrowser.open(f"http://localhost:{PORT}/demo.html")
http.server.ThreadingHTTPServer(("", PORT), Handler).serve_forever()
