# Video Reference: Globe-Based Mission Select UI

**File:** `GD9ChwJZr6.mp4`
**Source:** a screen recording of the *Battlefield 1* (PC) **Campaign → War Stories** menu
**Purpose in this project:** UI/UX inspiration for the *Dancing with the SARs* app (see [CHALLENGE.md](CHALLENGE.md))

> Use this as a reference for **interaction patterns** only. Our app should have its own original look and must not copy the game's art, characters, fonts or branding.

---

## Technical details

| Property | Value |
|---|---|
| Duration | 87 seconds (1:27) |
| Resolution | 2560 × 1380 |
| Frame rate | 18 fps |
| Video codec | H.264 |
| Audio | AAC stereo, very quiet (mean −43 dB). No narration, probably just menu music or UI sounds |
| Recorded with | ShareX (its window appears in the first frame) |

---

## What happens, in order

### 0:00–0:06: Main menu
- The game's main menu is open on the **Campaign** tab, which shows **"War Stories completed: 1/6"**.
- The ShareX window sits on top while recording starts.
- The user clicks **Play**, and the camera **dives down toward a realistic 3D Earth** seen from orbit.

### 0:06–0:12: The War Stories globe (overview)
- The camera settles over **Europe, the Mediterranean and North Africa**, with the title **"WAR STORIES"** at the top.
- Each story is a **card connected by a thin leader line to a point on the map**:

| Story | Location on globe | Subject |
|---|---|---|
| Storm of Steel (prologue) | Western Front, France | The US 369th Infantry, the "Harlem Hellfighters" |
| 1. Through Mud and Blood | France | British Mk V tank "Black Bess" |
| 2. Friends in High Places | France / English Channel | Volunteer pilot in the British Royal Flying Corps |
| 3. Avanti Savoia! | Italian Alps | Italian Arditi shock troopers |
| 4. The Runner | Gallipoli, Turkey | (chapters locked) |
| 5. Nothing Is Written | Arabia | With Lawrence of Arabia against the Ottoman Empire |

- Each card shows a **character thumbnail plus chapter thumbnails**. **Padlocks** mark locked chapters.
- **Hovering** over a story shows its one-line description, and a large **character portrait fades in on the right** with a themed prop (biplane, tank, armoured car).
- Bottom bar: **Back | Continue Current Story | Navigate Stories**.

### ~0:12–0:40: Zoom into "Nothing Is Written"
- The camera **zooms from orbit down to the Arabian desert**.
- The chapters appear as **map nodes joined by a path**:
  - **Hidden in Plain Sight** (unlocked): "Join Lawrence of Arabia in his desert campaign."
  - **Young Men's Work** (locked)
  - **Hear the Desert** (locked)
- **Bottom left:** progress stats for Codex Entries, Field Manuals and Difficulty.
- **Bottom right:** a short story blurb.
- **Bottom bar:** Back | Easy | Normal | **Hard** (selected).
- The user stays on this screen for a long time, with the cursor near **Back**.

### ~0:40–0:48: Back out, then "Storm of Steel"
- The camera **zooms out to orbit** and then **dives into northern France**.
- One node: **Break of Dawn**, with the quote *"God damn, let's go."*

### ~0:48–0:57: "Through Mud and Blood"
- The view zooms into France again.
- **Over the Top** (unlocked): "Smash through enemy lines in the Mk V tank, Black Bess."
- **Fog of War** and **Breakdown** are locked.
- A tank commander and a tank appear on the right.

### ~0:57–1:05: "Avanti Savoia!"
- The camera dives into the **Alps**, showing detailed snow and ridges.
- Chapters: **O Tutti Accoppati** ("Find what was lost") and **O La Vittoria**.
- The bottom bar reads **"Continue playing O Tutti Accoppati"**, so the story is already in progress.

### ~1:05–1:24: "Friends in High Places"
- The camera pans across the globe and zooms into France and the Channel.
- **Test Flight** (unlocked): "Test the unproven Bristol F2.A fighter."
- **Total War**, **Fall from Grace** and **Forte et Fidèle** are locked, joined by a curved route of nodes.

### ~1:24–1:27: End
- The camera pulls back to the **War Stories** globe, and the recording cuts to black.

---

## UI/UX patterns worth borrowing

1. **Semantic zoom**
   Orbit shows all the stories, and zooming into a region shows that story's chapters. The **camera move itself is the page transition**, so users never lose track of where they are.

2. **Leader-line labels**
   Cards sit in clear space and connect to exact map points with thin lines. The text stays readable over a busy, cloudy background.

3. **Visible progress**
   Padlocks, filled thumbnails, a "1/6 completed" counter and "Continue playing…" buttons show the user's progress at a glance.

4. **Layered composition**
   - The 3D globe is the background.
   - Hero art fades in on the right.
   - A thin uppercase title is centred at the top.
   - Context stats sit bottom left, the description bottom right.
   - Actions sit in a fixed bottom bar.

5. **Path-of-nodes inside a region**
   The chapters in a region are connected nodes, which reads like a **timeline drawn on the map**.

6. **Minimal chrome**
   Translucent panels and thin type, so nothing blocks the globe. A realistic globe with moving clouds does most of the visual work.

---

## How this maps to *Dancing with the SARs*

| Game element | Our app equivalent |
|---|---|
| 3D globe from orbit | 3D Earth (e.g. CesiumJS / Mapbox globe / deck.gl) |
| War Story cards on the globe | **Study-area cards**: e.g. a flood, a glacier, a wildfire, subsidence |
| Story category / theme | **Type of surface change** (water, forest, ice, ground deformation, agriculture) |
| Zoom into region | Fly into the study area and load **NISAR SAR imagery** |
| Chapter nodes along a path | **Acquisition dates on a time series**: each node is one NISAR pass |
| Locked / unlocked chapters | Dates with or without data, or "explored / not explored" |
| Character portrait + blurb | Photo or optical image of the site, plus a short **"what's happening & why"** explanation |
| Codex / Field Manuals stats | **SAR facts**: polarization (HH/HV/VV), frequency (L/S-band), change magnitude |
| Difficulty selector | **Audience mode**: Public / Educator / Scientist (adjusts the level of detail) |
| Continue current story | Resume the last-viewed area / guided tour |
| Back (zoom out) | Return to the global overview |

### Extra ideas inspired by the video
- **Before/after slider** inside each region, to compare SAR images from two dates.
- **Time-series animation** when the user steps through the date nodes.
- A **guided "tour" mode** that flies the camera between study areas like a story map.
- **Polarization toggle** to show how HH, HV and VV highlight different changes.
