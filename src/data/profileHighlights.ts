// Editorial layer for the startup profiles. `from`/`into` is the same
// pairing as the home-page ledger; `facts` are the numbers on each profile's
// climate-facts label; `problem`/`fix` are one-line headlines over the full
// one-pager text; `asks` names each seekingOpportunities item (same order).
// Every figure is taken from the company's one-pager as summarised in
// companies.ts.
export interface Highlight {
  from: string;
  into: string;
  facts: [value: string, label: string][];
  problem: string;
  fix: string;
  asks: string[];
}

export const HIGHLIGHTS: Record<string, Highlight> = {
  refeed: {
    from: "Used cooking oil",
    into: "verified aviation-fuel feedstock",
    facts: [
      ["3,000 t+", "used cooking oil traded in Vietnam"],
      ["1,200+", "collection accounts, growing 10%+ a month"],
      ["35%", "of Korea's UCO data captured in year one"],
      ["ISCC EU", "certified operation (Vietnam)"],
    ],
    problem: "Aviation must burn cleaner fuel, but there is no exchange where refiners can buy trustworthy used cooking oil, only scattered one-to-one deals.",
    fix: "An exchange that lists only oil verified for quality and origin, from the restaurant to the refinery.",
    asks: ["Series A investors", "SAF producers, refiners and traders", "Price-index and collection partners"],
  },
  apexion: {
    from: "Unmeasured food waste",
    into: "biogas-ready routing data",
    facts: [
      ["6.6%", "of Korea's organic waste becomes energy today"],
      ["25×", "more methane from the same tonne, depending on its route"],
      ["243", "municipalities bound by Korea's Biogas Act"],
      ["0", "new sensors or plants needed"],
    ],
    problem: "Cities must turn half their organic waste into biogas, yet nobody measures what is in it.",
    fix: "Estimate each collection point's waste from public data, and send the high-yield waste to digesters.",
    asks: ["Pilot partners with a facility or waste stream", "Validation partners in Southeast Asia", "Pre-seed investors and accelerators"],
  },
  yulmix: {
    from: "Solvent-heavy synthesis",
    into: "room-temperature catalysts",
    facts: [
      ["Up to 144×", "faster: 20 minutes instead of 48 hours a batch"],
      ["1/16", "the CO₂ per kilogram of catalyst"],
      ["99%", "reproducibility, under 1% loss"],
      ["4", "PoCs running with industrial partners"],
    ],
    problem: "Catalyst nanomaterials take heat, organic solvents and up to 48 hours a batch to make.",
    fix: "Resonant sound mixes them at room temperature in 20 minutes, with no organic solvent.",
    asks: ["PoC and sample-evaluation partners", "Seed investors and licensing partners"],
  },
  greenmrv: {
    from: "Biomass and CO₂",
    into: "verifiable carbon removal credits",
    facts: [
      ["4,000 t", "of CO₂ removal targeted by the first project, 2026–27"],
      ["2", "MOUs signed: CV Biochar and Newton"],
      ["70 / 30", "illustrative biochar credit split, producers / greenMRV"],
    ],
    problem: "Korea has biomass and CO₂ to remove, but few removal projects that buyers can trust.",
    fix: "greenMRV builds biochar and mineralization projects end to end, from measurement to credit sales.",
    asks: ["Carbon removal buyers", "Co-developers for a joint pilot", "Project investors"],
  },
  reblock: {
    from: "Ceramic waste",
    into: "permeable paving blocks",
    facts: [
      ["11×", "the Korean standard for water permeability"],
      ["90%+", "of the aggregate replaced with ceramic waste"],
      ["2.5M t", "of ceramic waste a year in Korea, mostly landfilled"],
      ["USD 40/t", "paid to REBLOCK to take its own raw material"],
    ],
    problem: "Cities are sealed against the rain, and today's permeable blocks trade strength for drainage, then clog within 2–3 years.",
    fix: "Paving blocks made from ceramic waste that drain 11× faster than the standard without losing strength.",
    asks: ["Pilot partners in Singapore and Southeast Asia", "Ceramic-waste and production partners", "Seed investors"],
  },
  mce: {
    from: "Waste plastic",
    into: "humic fertilizer",
    facts: [
      ["53.1 t", "shipped to 6 countries, including Singapore"],
      ["US$0.71M", "revenue in FY2025"],
      ["+77%", "pak choi root length in third-party trials"],
      ["12", "granted patents"],
    ],
    problem: "Styrofoam gets burned or buried, while humic fertilizer depends on mined, coal-derived rock.",
    fix: "Mealworms and their gut microbes turn waste styrofoam into OMRI Listed humic fertilizer.",
    asks: ["Series A investors", "Distributors and bulk buyers for MaHa", "Buyers and operators for Lv2 plants"],
  },
  gigaette: {
    from: "Waste heat",
    into: "carbon-free process heat",
    facts: [
      ["~90%", "of discharge at constant temperature, vs ~20% for rivals"],
      ["1/3", "the CAPEX of lithium-ion storage, with 4× the life"],
      ["12 MWh", "KOICA project (2026)"],
      ["KRW 3.5B", "in non-dilutive R&D funding"],
    ],
    problem: "Factories throw away waste heat while burning gas for the heat they need.",
    fix: "A liquid thermal battery that stores the heat and returns it at the exact temperature a process needs.",
    asks: ["Cooling users in hot climates", "Process-heat users in Southeast Asia", "EPCs, distributors and developers", "Series A investors"],
  },
  theorigin: {
    from: "Captured CO₂",
    into: "biodegradable materials",
    facts: [
      ["182 days", "to biodegrade fully in soil (in-house film test)"],
      ["323 days", "to biodegrade fully in seawater (in-house film test)"],
      ["11×", "more stretchable than pure PHB"],
      ["10", "awards, 2024–26"],
    ],
    problem: "Most “biodegradable” plastics only break down in industrial composters, not in soil or sea.",
    fix: "Microbes turn CO₂ into a material that breaks down in soil and seawater at ambient temperature.",
    asks: ["Seed investors", "Brand partners for PoCs", "Scale-up partners"],
  },
  terracle: {
    from: "PET and textile waste",
    into: "high-purity monomers",
    facts: [
      ["4,000 t/yr", "low-temperature PET plant, the world's largest"],
      ["99%+", "monomer purity, virgin grade"],
      ["KRW 15.9B", "Series A (about US$12M)"],
      ["40+", "open innovation partnerships"],
    ],
    problem: "Mechanical recycling degrades PET and rejects coloured, mixed or dirty waste.",
    fix: "Low-temperature chemistry turns PET waste, even coloured, mixed or dirty, back into virgin-grade raw material.",
    asks: ["Series B investors", "Plant construction partners in Asia", "Offtake partners and customers"],
  },
  solarlease: {
    from: "Idle rooftops",
    into: "solar power plants",
    facts: [
      ["15.6 MW", "contracted across 53 sites"],
      ["Up to 24%", "below the utility tariff for building owners"],
      ["98%", "AI rooftop screening accuracy, in 10 minutes"],
      ["Year 1", "profitable (FY2025)"],
    ],
    problem: "Power keeps getting more expensive, yet small rooftops sit empty.",
    fix: "Zero-capex rooftop solar: Solarlease builds, owns and runs the plant; the owner pays less for power.",
    asks: ["Rooftop solar PoC partners in Asia", "Asset managers"],
  },
};
