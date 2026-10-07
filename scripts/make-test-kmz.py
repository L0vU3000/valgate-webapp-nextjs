"""Build test KMZ files for the Valgate land-boundary flow.

A KMZ is a zip containing doc.kml. Coordinates here are real WGS84 degrees,
in KML order (lon,lat,alt), with a closed ring.

Run:  python3 scripts/make-test-kmz.py [outdir]
"""

import math
import os
import sys
import zipfile


def ring_around(lng: float, lat: float, width_m: float, height_m: float):
    """A closed rectangular ring centred on (lng, lat), sized in metres.

    Metres rather than degrees because a degree of longitude is ~109 km at
    Phnom Penh and would be ~111 km at the equator — sizing in degrees gives a
    parcel that is visibly the wrong shape the closer you get to a pole.
    """
    m_per_deg_lat = 110574.0
    m_per_deg_lng = 111320.0 * math.cos(math.radians(lat))
    dx = (width_m / 2) / m_per_deg_lng
    dy = (height_m / 2) / m_per_deg_lat
    corners = [
        (lng - dx, lat - dy),
        (lng + dx, lat - dy),
        (lng + dx, lat + dy),
        (lng - dx, lat + dy),
    ]
    # KML linear rings must repeat the first position at the end (RFC 7946 /
    # OGC 12-007). Leave it off and the outline renders with one side missing.
    return corners + [corners[0]]


def kml_for(name: str, ring, description: str = "") -> str:
    coords = " ".join(f"{lng:.8f},{lat:.8f},0" for lng, lat in ring)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>{name}</name>
    <description>{description}</description>
    <Placemark>
      <name>{name}</name>
      <ExtendedData>
        <Data name="source"><value>Google Earth</value></Data>
      </ExtendedData>
      <Polygon>
        <tessellate>1</tessellate>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>{coords}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>
"""


def write_kmz(path: str, kml: str) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("doc.kml", kml)
    print(f"  {os.path.basename(path):<24} {os.path.getsize(path):>7,} bytes")


def main() -> None:
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Desktop/kmz-test")
    os.makedirs(out, exist_ok=True)
    print(f"Writing test KMZ files to {out}\n")

    # PROP-0020 — Chroy Changvar Bridge Land, a real demo-seed row.
    # lat 11.63512 / lng 104.90824. ~0.86 ha, so a plausible land parcel.
    p20 = (104.90824, 11.63512)
    write_kmz(
        os.path.join(out, "PROP-0020.kmz"),
        kml_for("PROP-0020", ring_around(*p20, 95, 90), "Chroy Changvar Bridge Land"),
    )

    # A file whose stem matches no property: the preview table should say
    # "No matching property" and refuse to attach it.
    write_kmz(
        os.path.join(out, "NO-SUCH-PROPERTY.kmz"),
        kml_for("NO-SUCH-PROPERTY", ring_around(*p20, 60, 60), "unmatched control"),
    )

    # A .txt sharing the drop with the KMZ: exercises the "not a KMZ" skip path.
    with open(os.path.join(out, "notes.txt"), "w") as fh:
        fh.write("Not a KMZ — the drop should skip this file.\n")

    print("\nDrop PROP-0020.kmz onto the Location tab of PROP-0020.")
    print("NO-SUCH-PROPERTY.kmz is the negative control (expect 'No matching property').")


if __name__ == "__main__":
    main()
