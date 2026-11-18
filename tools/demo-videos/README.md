# Demo-Videos (Beispieldaten)

Animierte Kurzvideos (1080 × 1920) für Hilfe und Social Media: Hochladen → Mitlesen → Bildausschnitt aus dem
Dokument fliegt als kurzer Stichpunkt in den Kalender. Alle Namen, Buchungen und Tickets sind erfunden.

    cd tools/demo-videos
    cp ../../fonts/roboto-latin-*.woff2 . && cp ../../icon-512.png icon.png
    node snap.js                       # Beispiel-Hotelbestätigung und -Ticket als Bild (+ Lage der wichtigen Stellen)
    ./enc.sh hotel && ./enc.sh zug     # Bilder rendern und zu neu-hotel.mp4 / neu-zug.mp4 kodieren
    cp neu-hotel.mp4 ../../videos/hotel.mp4; cp neu-zug.mp4 ../../videos/zugticket.mp4

Texte, Zeitpunkte und Stichpunkte stehen oben in `anim.html` (Objekt `D`). Einzelbilder ansehen:
`node shoot.js hotel 5,12,20` → a-hotel-5.jpg …
Liegt `boxes.json` neu vor (nach Änderungen an hotel.html/ticket.html), die Werte in `BOX` in anim.html übernehmen.
