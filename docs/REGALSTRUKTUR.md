# Regalstruktur – LagerPilot-Test

| Halle | Regale | Plätze je Regal | Plätze gesamt |
|---|---:|---:|---:|
| 4A | 22 | 162 | 3.564 |
| 4B | 18 | 162 | 2.916 |
| **Gesamt** | **40** | **162** | **6.480** |

Je Regal gibt es **18 Türme mit je 9 Ebenen**. Ebene 1 liegt unten, Ebene 9 oben. Die Platznummer berechnet sich als `(Turm − 1) × 9 + Ebene`.

Platzcodes: `H4A-4-83` oder `H4B-1-62`. Die Halle ist Pflicht; Halle 4A umfasst Regale 1–22, Halle 4B Regale 1–18. Jeder Regalplatz hat eine Nummer zwischen 1 und 162.

Ältere Datenstände ohne Hallenangabe können bei der Migration Halle 4B zugeordnet werden. Die bestehende Nummerierung darf bei Refactorings nicht verändert werden.
