# Crothet Development Log
# Dato: 3. maj 2026
# Sted: blackbox (jxrgen@blackbox)
# Projekt: STL til strik/hæklet overflade converter

## Formål
Opgaven var at skabe en web-applikation (GitHub Pages) der kan:
1. Upload en STL-fil
2. Konvertere overfladen til at ligne strik eller hækling
3. Download den modificerede STL
4. Implementere forskellige mønstre (strik/hækling)

## Proces: 5 Iterationer

### Iteration 1: Grundlæggende struktur
- Oprettede app.js med STL parser (binary + ASCII)
- Implementede basic knitPattern og crochetPattern
- Forståelse: Strik har V-formet masker i kolonner
- Forståelse: Hækling har løkker og V-top
- Resultat: Mat matte ikke ægte strik/hækling

### Iteration 2: Forbedret hækle-struktur  
- Research: Single crochet har V-top + horizontal bar (front/back loops)
- Research: Hækling har "post" (vertikal del) og løkke-bump
- Research: Hækling har karakteristisk hældning (højrehåndet)
- Forbedret crochetPattern med:
  - V-shape ved top (colFrac ~ 0.15)
  - Horizontal bar (bagved V)
  - Post (vertikal)
  - Loop bump (oval form)
  - Right lean
  - Interlocking med masker nedenunder

### Iteration 3: Flere strik-mønstre
Tilføjet:
- Rib stitch: Alternerende strik/purl kolonner (vertikale ribber)
- Cable stitch: Snoede reb-lignende mønstre med krydsninger
- Seed stitch: Checkerboard af strik og purl
- Garter stitch: Horisontale ribber på hver række

### Iteration 4: Forbedret hækle og nye mønstre
- Forbedret crochetPattern baseret på:
  - Third loop (bageste bar)
  - Bedre forståelse af interlock-struktur
- Tilføjet:
  - Bobble stitch: Ophøjede bobler (flere masker i samme maske)
  - Shell stitch: Fæn-formation (hækling)

### Iteration 5 (Final): Fuldt udbedret
- Forbedret UV-mapping (bedre projektion baseret på normalvektorer)
- Tilføjet offset for negative sider (undgår mirroring)
- Alle mønstre finjusteret:
  - Knit: V-shapes med proper aspect ratio (1:1.4)
  - Crochet: Komplet struktur med alle elementer
  - Rib: Tydelige kolonner
  - Cable: Snoede reb med krydsningspunkter
  - Seed: Tydelige checkerboard
  - Garter: Horisontale ribber
  - Bobble: Halvkugle-former
  - Shell: Fan-shape med detaljer

## Forskningskilder brugt:
- Wikipedia: Stockinette stitch
- The Spruce Crafts: Knitting tutorials
- love. life. yarn.: V-shape beskrivelse
- Jill Wolcott Knits: Stitch anatomy
- FayDHDesigns: Crochet stitch anatomy
- Annette Petavy: Front/back loop tutorials
- YouTube: Video tutorials af strik/hækling
- Style3D AI: 3D knitwear texture generation
- KnitMeshing (GitHub): Procedural knitting
- CMU YarnCurve: Parameterized stitch models

## Tekniske detaljer:
- Basis: Three.js til 3D rendering
- STL: Binary og ASCII parsing
- Overflade-modifikation: Vertex displacement langs normalvektorer
- UV mapping: Planar projection baseret på dominerende akse
- GitHub Pages til hosting
- Repo: https://github.com/jxrgen/crochet
- Live site: https://jxrgen.github.io/crochet/

## Mønstre implementeret:
1. Knit (Stockinette) - V-formede masker i kolonner
2. Crochet (Single) - Løkker med V-top og horizontal bar
3. Rib - Alternerende strik/purl kolonner
4. Cable - Snoede reb-mønstre
5. Seed - Checkerboard af strik/purl
6. Garter - Horisontale ribber
7. Bobble - Ophøjede bobler (hækling)
8. Shell - Fan-shape (hækling)

## Anbefalede indstillinger:
- Strik: scale=2.0, depth=0.3-0.5
- Hæklet: scale=1.5, depth=0.4-0.6
- Rib: scale=1.5, depth=0.3
- Cable: scale=3.0, depth=0.6

## Status:
- ✓ 5 iterationer gennemført
- ✓ Grundig forskning udført
- ✓ Alle mønstre implementeret
- ✓ Koden pushet til GitHub
- ✓ GitHub Pages aktiveret
- ✓ Samtale loggemt i denne fil
