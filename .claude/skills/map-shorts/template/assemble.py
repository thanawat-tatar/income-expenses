# builds world.html from the parts (camAt target height, keyAt 7th value, plain globe pills). Usage: assemble.py [out.html], run in this folder
import sys
head, mid, cam, rend, ui = (open(f"parts_{n}.js", encoding="utf-8").read() for n in ("head", "mid", "cam", "render", "ui"))
herd = open("parts_quick.js", encoding="utf-8").read()
cam = cam.replace("function camAt(lon, lat, range, tilt, heading) {", "function camAt(lon, lat, range, tilt, heading, th = 0) {").replace("  const gm = 0;", "  const gm = th;")
html = head + "\n" + mid + "\n" + herd + "\n" + cam + "\n" + rend + "\n" + ui + "\nwindow.render3d = render3d;\nbuild();\n</script></body></html>\n"
html = html.replace("a[5] + (b[5] - a[5]) * (big ? w : u)]; } }", "a[5] + (b[5] - a[5]) * (big ? w : u), (a[6] || 0) + ((b[6] || 0) - (a[6] || 0)) * u]; } }")
html = html.replace("const xy = u.local ? (LOCAL ? screenL(new THREE.Vector3(u.local[0], SLAB_Y + u.local[1], u.local[2])) : null) : (LOCAL ? null : screen(u.lon, u.lat, u.h || 0));", "const xy = screen(u.lon, u.lat, u.h || 0);")
open(sys.argv[1] if len(sys.argv) > 1 else "world.html", "w", encoding="utf-8").write(html)
