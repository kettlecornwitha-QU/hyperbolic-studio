# Hyperbolic Studio

A local, dependency-free canvas tool for exploring tilings, their perpendicular duals, and compact quotient surfaces in the Poincaré disk.

## Open

Double-click **Hyperbolic-Studio.html**, or **Launch.command**, in this folder. The standalone HTML includes all scripts and styling and works offline. No package installation is required. The GUI includes a Guide.

Optional development server, when local networking is available:

```zsh
cd hyperbolic-studio
npm start
```

Then visit http://127.0.0.1:4178. The server listens only on loopback.

After editing source files, rebuild the standalone file and run verification:

```zsh
npm run build
npm test
```

## Use

- Select a tiling: {7,3}, {8,3}, {8,8}, {5,4}, {4,5}, {3,7}, or truncated triheptagonal (4.6.14).
- **Fullscreen** expands the disk and keeps the Construction/Topology pane on its right, hiding the header and left settings panel. The disk retains its height-limited diameter; narrow windows scroll horizontally to accommodate the pane. Use the mode dropdown above the disk in either view to change between **Label / pan** and **Region Construction**. Click **Exit fullscreen** or press Escape to return. When browser fullscreen is unavailable, it expands within the browser window.
- Drag inside the disk to pan by a hyperbolic isometry; drag the mint dot on the circumference to rotate.
- Center-to-vertex edges are visible in a sixth color (muted copper by default). They use 40% of the primary/dual stroke width and 55% opacity. Their color, visibility, and relative width can be adjusted independently.
- **Cmd-click any number of edge segments** to select two continuous straight chains. Cmd-click again to deselect; Ctrl-click also works. There is no selection-count cap. Selected segments remain highlighted as you pan.
- Click **Identify selected edges**. Click one outer endpoint of either selected edge, then the corresponding endpoint of the other. Neither endpoints nor edges need names in advance. Use the outer endpoints of the chains, not their interior dots.
- Enter **one shared name** after setting orientation, then click **Save identification** (or press Enter). Escape or Cancel abandons the draft without modifying your project. Each completed identification has a unique name.
- **Identified Edges** contains one entry per identification, including complete-edge pairs. Hover anywhere in its row to highlight all segments in both chains. Click the name to rename it; × removes the entire identification. No edge or dot icons are used.
- Each identification receives one, two, then three chevrons; subsequent groups of three use a new hue. Hues redistribute evenly as groups are added. A chain pair uses one demarcation style for the entire identification, rather than separate styles for its constituent segments. Arrow directions start at the chosen endpoints.
- Each chain must follow one hyperbolic geodesic, without gaps or bends. Chains may combine primary, center-to-vertex, and dual segments. Their ordered sequences must match segment by segment in **type and hyperbolic length**, in either the forward or reversed orientation. Equal total lengths alone are insufficient. The selected endpoint orientation must preserve this correspondence; an incompatible orientation is rejected. A chain consisting of a complete primary side + center-to-vertex segment + complete dual side therefore cannot match a chain with only the primary side + center-to-vertex segment.
- If two matching halves join end-to-end on one geodesic, the tool treats them as two chains meeting at their common endpoint. Otherwise the selection must decompose into exactly two straight runs.
- Click any dot to name it for navigation. Named dots appear in the separate **Vertices** list, with unique vertex names. Hover a vertex row to highlight the dot; click its name to edit or use ⌾ to center it. Deleting a vertex label does not remove an identification.
- Use the shared search field and alphabetical sort for both lists. Identification names and navigation vertex names are separate namespaces. Unidentified edges no longer need or receive individual labels.
- In **Region Construction** mode, click a dual vertex (primary center) to select its whole primary polygon, or a primary vertex to select its whole dual polygon. Click an edge-intersection dot to select its four incident triangles, any edge segment to select its two incident triangles, or a triangle interior to select that triangle alone. A click adds any missing triangles; clicking a fully selected group removes it. There is no region-family dropdown.
- Regions can freely combine individual triangles and polygon selections, including holes or disconnected components. The outline follows the union of selected triangles. All boundary segments must be paired before the closed-surface analysis runs.
- **Topology** checks closure, quotient vertex links, connected components, orientability, Euler characteristic, genus/crosscaps for a connected quotient, angle sums, area, and Gauss–Bonnet consistency.
- **Load Macbeath (genus 7)** constructs the Fricke–Macbeath surface from 72 regular {7,3} heptagons, with 97 named complete-edge boundary identifications. The surface has χ = −12, area = 24π, and every quotient vertex angle is 2π. It is constructed from the kernel of the (2,3,7) orientation-preserving triangle group onto PSL(2,8), rather than an arbitrary genus 7 gluing. The triangle subdivision has 492 vertices, 1,512 edges, and 1,008 triangles. Hover identification rows to locate paired sides, or pan to examine boundary details.
- **Load genus 2 example** constructs an octagon with opposite sides glued in reverse boundary directions. It appears as four named complete-edge identifications (eight segment-pair records internally). Expected results: χ = −2, area = 4π, all quotient vertex angles 2π.
- **Save** (Cmd/Ctrl+S) updates the current project file; **Save As…** (Cmd/Ctrl+Shift+S) chooses a new file. Direct writing requires browser support for file pickers (such as Chrome/Edge). Safari and other browsers without it download a named JSON copy; Save reuses the name, but the browser may add a suffix instead of overwriting. The current filename appears in the header. File access must be chosen again after reopening the app. Version 3 JSON stores the construction and view; **Open project** validates and restores it. Version 1 projects and older local autosaves are migrated automatically: gluings and named vertices are retained, and each old segment pair receives one shared name derived from its prior labels. Old individual edge labels are replaced by identification names. Version 1 and 2 primary/dual polygon regions are expanded into the equivalent triangle selections automatically.
- Browser storage auto-saves where available. File-origin storage behavior varies by browser; use JSON exports for dependable backups. Changing tilings starts a new construction. Reducing patch size can remove objects outside the smaller patch; chain identifications are removed atomically if any segment is lost. Save first if you want to preserve the larger patch.

## Geometry

Curvature is normalized to K = −1. The disk metric is

`ds² = 4(dx² + dy²)/(1 − x² − y²)²`.

Regular polygons have interior angle 2π/q and are generated by reflection in geodesic sides. The seed circumradius is

`r² = cos(π/p + π/q) / cos(π/p − π/q)`.

The mixed tiling is the all-ring Wythoff construction for the (2,3,7) reflection triangle: its incenters generate regular squares, hexagons, and 14-gons. This is not a decorative approximation of a regular heptagonal tiling.

The primary center-to-vertex radii, together with perpendicular center-to-side segments, give a barycentric triangle subdivision. Adjacent triangles receive opposite shades. Center-to-vertex radii are stroked with a thinner, translucent sixth color and are selectable for identification.

The dual connects centers of adjacent primary polygons. Primary edge crossings are hyperbolic midpoints, and dual edges meet them at right angles. In mixed tilings, dual polygons are not generally regular and a crossing need not be the midpoint of the dual edge.

Dots are exact hyperbolic-radius disks using their Euclidean disk-model center and radius. Edges use geodesic arcs with adaptively sampled metric-scaled widths, approximating a constant hyperbolic-width stroke. Tiny primitives fade below subpixel thresholds. Hover/selection halos and chevrons have screen-space readability adjustments.

A selected region is a union of atomic triangles, with boundaries along primary, dual, or center-to-vertex segments. Interior edges are ordinary adjacencies; user identifications apply only to boundary edges. The analyzer computes quotient cells by disjoint-set equivalence, tests that each vertex link is one circle, propagates orientation constraints, and sums incident triangle angles. Reported vertex, edge, and triangle counts include this subdivision. It distinguishes a closed topological surface from a smooth hyperbolic metric: a cone angle different from 2π is reported explicitly. Areas are computed from hyperbolic polygon angle defects. Gauss–Bonnet includes cone deficits.

## Limits

- The infinite plane is represented by a finite breadth-first reflection patch: 450, 1,000, or 2,500 seed tiles. Panning is live but does not stream new tiles indefinitely. World camera radius is limited to 0.975; the view can expose the edge of the generated patch. Reset view returns to the central tile.
- Floating-point coordinates are deduplicated at 1e−8 disk precision. This is an exploration tool, not a symbolic proof system. Strong boundary compression limits numerical precision.
- Regions must be explicitly selected from the generated triangles. Automatic inference of a fundamental region from a pairing list is not implemented. Near the disk rim, selection is limited to avoid densely clustered objects; pan the desired area toward the center.
- Pairings show and analyze the quotient; they do not make the camera cross a seam or render the surface as an embedded 3D object.
- The built-in topology report classifies closed quotients. Incomplete pairings report boundary counts rather than an unsupported genus. Multiple closed components are counted, without separately classifying each component.

Useful future additions: walking across identified seams, animated deck transformations, a fundamental-group presentation, geodesic loops with length measurements, and adaptive tiling generation during long-distance travel.

## Verification

`npm test` runs geometry and quotient checks plus the actual standalone application in a minimal DOM/canvas contract. This includes all presets, finite render coordinates, labeling, camera isometry normalization, JSON round trips, smooth genus 2, nonorientability, incomplete boundaries, and invalid identifications, Cmd-click selection, arbitrary-length mixed geodesic chains, matching segment signatures, sixth-layer rendering, endpoint orientation, shared names, list hover highlighting, legacy migrations, dot/edge/triangle region selection, selection after camera transforms, and topology of triangle unions. The contract tests are not a substitute for real-browser visual QA.

The execution environment blocked the development server and the in-app browser's local-file preview. Safari loaded the standalone controls, but full live visual verification was not completed. The standalone now paints its first frame synchronously as well as using animation-frame scheduling for interactions.

## Sources

- Douglas Dunham, *Hyperbolic Geometry, Repeating Patterns, and Regular Tessellations*: https://www.d.umn.edu/~ddunham/dunbrid00.pdf
- Cornell mathematics outreach, *Geometries of Surfaces*: https://pi.math.cornell.edu/~mec/Winter2009/Victor/part4.htm

## Files

- `geometry.mjs`: disk isometries, geodesics, tiling and dual construction.
- `topology.mjs`: triangle quotient and metric diagnostics.
- `app.mjs`, `index.html`, `style.css`: GUI source.
- `build.mjs`: standalone bundler using only Node built-ins.
- `Hyperbolic-Studio.html`: generated, directly launchable tool.
- `server.mjs`: optional loopback-only static server.
- `tests/`: numerical and bundled-application checks.

## Macbeath construction

The example uses GF(8) = F₂[t]/(t³+t+1), encoding field elements as three-bit polynomials. In SL(2,8) = PSL(2,8), the generators R = [[2,0],[1,5]] and S = [[0,1],[1,0]] satisfy R⁷ = S² = (RS)³ = I and generate all 504 matrices. Oriented heptagon sides are the group elements: right multiplication by R cycles a face, and S reverses an edge. A breadth-first development chooses one geometric heptagon for each of the 72 cosets of ⟨R⟩; remaining paired boundary sides inherit the S action. The kernel is torsion-free because all three elliptic generator orders are preserved, giving the Hurwitz surface of genus 7. Its uniqueness identifies it as the Fricke–Macbeath surface. This region is a connected polygonal development, not a claim to be its canonical Dirichlet domain.

Primary references:
- Chul-hee Lee, *Spectrum of the Laplacian on the Fricke-Macbeath surface*: https://arxiv.org/abs/2311.02632 (uniqueness and 504 conformal automorphisms).
- Gareth A. Jones, *Regularity properties of Macbeath–Hurwitz and related maps and surfaces*: https://arxiv.org/abs/2505.02089 (PSL₂(q) triangle-group maps).
