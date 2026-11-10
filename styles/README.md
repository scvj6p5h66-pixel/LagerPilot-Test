# CSS-Struktur

Die Stylesheets sind aus der aktuellen `development`-Version der `index.html` ausgelagert worden. Ihr Inhalt wurde bei der Auslagerung unverändert übernommen. Die Reihenfolge der `<link>`-Einbindungen in `index.html` ist wichtig.

| Datei | Bereich |
|---|---|
| `01-basis.css` | Grundlayout |
| `02-auftraege.css` | Auftrags-/Kommschein-Darstellung |
| `03-design.css` | Design-Anpassungen |
| `04-marke.css` | Markenregeln und historisch dort verbliebene Kommissionierregeln |
| `05-kommissionierung.css` | Mitarbeiter- und Mobilansichten |
| `06-druck.css` | Druckregeln |
| `07-gewicht.css` | Gewichtsübersicht |

Die Zuordnung ist historisch gewachsen; einzelne Regeln liegen noch nicht im thematisch passenden Stylesheet. Nicht ohne visuellen Regressionstest umsortieren. Bekannte Auffälligkeiten stehen in `docs/BEKANNTE_FEHLER.md`.
