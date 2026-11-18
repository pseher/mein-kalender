# Demo-Videos (Beispieldaten, simulierte KI)

Erzeugt die kurzen Hilfe-/Social-Media-Videos in `videos/` neu – z. B. nach einer Umbenennung der App.

    cd tools/demo-videos
    cp ../../fonts/roboto-latin-*.woff2 . && cp ../../icon-512.png icon.png
    node snap.js                 # Beispiel-Hotelbestätigung und -Ticket als Bild
    node rec.js hotel && node rec.js zug     # Abläufe in der App aufnehmen (vorher src/build-app.sh)
    node cards.js hotel && node cards.js zug # Texte, Start- und Endkarte
    python3 build.py hotel && python3 build.py zug
    cp mein-kalender-hotel.mp4 ../../videos/hotel.mp4; cp mein-kalender-zug.mp4 ../../videos/zugticket.mp4

Texte und Zeitpunkte der Einblendungen stehen in `story.json`. Alle Namen, Buchungen und Tickets sind erfunden.
