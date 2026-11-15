// The image behind each chapter's text in the story panel: a crop of the same imagery the map shows, so the panel
// pictures the event the words describe. Made by scripts/stories/panel-art.mjs into public/story/.
// `caption` says what the image is (an observation, with its instrument and date), never what it proves.
// `focus` is the CSS background-position that keeps the meaningful part in view as the panel changes shape.
import type { SiteId } from "../data";

export interface PanelArt { src: string; caption: string; focus: string }

const art = (site: SiteId, ch: string, caption: string, focus = "50% 50%"): PanelArt => ({
  src: `${import.meta.env.BASE_URL}story/${site}-${ch}.webp`, caption, focus,
});

export const PANEL_ART: Record<SiteId, Record<string, PanelArt>> = {
  nepal: {
    valley: art("nepal", "valley", "The Bhote Koshi valley before the flood · NASA HLS, May–Aug blend", "50% 70%"),
    surge: art("nepal", "surge", "The valley floor after the surge · NASA HLS, October", "45% 60%"),
    blind: art("nepal", "blind", "No clear photo: 12 Aug – 1 Oct · the valley under a stand-in veil", "50% 50%"),
    radar: art("nepal", "radar", "Radar change, 19 → 31 Aug · NISAR coherence (pink: changed)", "50% 60%"),
    scar: art("nepal", "scar", "The stripped channel · NASA HLS, October", "50% 55%"),
    meaning: art("nepal", "meaning", "The valley after the flood · NASA HLS, October", "50% 50%"),
  },
  oregon: {
    spark: art("oregon", "spark", "Sagebrush plateau before the fire · NASA HLS, true colour", "40% 60%"),
    run: art("oregon", "run", "The burn scar in false colour (red: fresh burn) · NASA HLS, 30 Aug", "30% 40%"),
    gap: art("oregon", "gap", "The south-eastern run into Idaho · NASA HLS false colour, 30 Aug", "60% 40%"),
    islands: art("oregon", "islands", "The scar and its unburned islands · NASA HLS, 30 Aug", "50% 35%"),
    green: art("oregon", "green", "Shrub structure two months on · NISAR GCOV, 20 Oct (green: HV)", "50% 40%"),
    meaning: art("oregon", "meaning", "Radar structure across the scar · NISAR GCOV, 20 Oct", "50% 45%"),
  },
  jazan: {
    mountains: art("jazan", "mountains", "The Sarawat escarpment above the coastal plain · NASA HLS", "60% 40%"),
    wet: art("jazan", "wet", "Radar brightness, dusk pass 10 Sep · NISAR GCOV HH (bright: stronger echo)", "50% 45%"),
    duskdawn: art("jazan", "duskdawn", "Radar change, dusk passes 10 → 22 Sep · NISAR coherence (bright: changed)", "50% 45%"),
    wave: art("jazan", "wave", "The coastal plain, 4 Nov · NASA HLS", "50% 50%"),
    foretold: art("jazan", "foretold", "How often the dawn radar saw change, 25 Jul – 17 Oct · NISAR", "45% 45%"),
    meaning: art("jazan", "meaning", "Around the Jizan Dam, 4 Nov · NASA HLS", "50% 50%"),
  },
};
