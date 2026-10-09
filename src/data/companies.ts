// 2026 Climate Tech Startup Challenge (KISED / 창업진흥원) — Singapore cohort.
// Source: each startup's programme one-pager (Lodestart template, received
// 9 Oct 2026). Copy follows the companies' own wording (light edits for grammar). The
// numbering (1–10) follows the one-pager file names and is the display order.
// IR decks were received too but are NOT published (CMK lesson, 7 Oct: only
// one-pagers were announced as public).

export interface Company {
  slug: string;
  name: string;
  displayName: string;
  tagline: string;
  sector: string;
  stage: string;
  track: "track1" | "track2";
  website: string;
  email: string;
  phone: string;
  problem: string[];
  solution: string[];
  keyFeatures: string[];
  targetAudience: string[];
  businessModel: string[];
  businessSnapshot: string[];
  team: { name: string; role: string; bio: string[] }[];
  seekingOpportunities: string[];
  /** Public path to an English IR deck PDF. Left unset on purpose (see above). */
  irdeck?: string;
  /** Public path to the programme one-pager PDF. */
  onepager?: string;
}

// One cohort on this event; track2 kept empty so shared components compile.
export const TRACKS = {
  track1: {
    title: "2026 Climate Tech Startup Challenge",
    theme: "Ten Korean climate tech startups selected by the Korea Institute of Startup & Entrepreneurship Development (KISED)",
    dates: "28 – 29 October 2026",
  },
  track2: {
    title: "",
    theme: "",
    dates: "",
  },
} as const;

export const companies: Company[] = [
  {
    slug: "refeed",
    name: "ReFeed",
    displayName: "ReFeed Inc.",
    tagline:
      "Building the world's first waste-commodity exchange, starting with used cooking oil (UCO), the key feedstock for sustainable aviation fuel (SAF).",
    sector: "Waste Commodities · SAF Feedstock",
    stage: "Pre-A · preparing Series A",
    track: "track1",
    website: "https://www.refeed.eco",
    email: "contact@refeed.eco",
    phone: "+82 10-5748-0774",
    problem: [
      "SAF mandates are rising, yet refiners cannot reliably buy UCO: no exchange exists, only fragmented 1:1 OTC deals.",
      "Waste has no market standard (no quality spec, no metering method), so volume cannot be graded or priced with confidence.",
      "Traceability is all-or-nothing: one broken link in the chain of custody voids certification, and “fake UCO” fraud persists.",
    ],
    solution: [
      "A waste-commodity exchange that lists only volume verified for both quality and traceability, starting with UCO.",
      "Real-time quality grading with ReFeed's Oil-Checker plus near-infrared analysis co-developed with MIMOS, Malaysia's national research institute.",
      "A digital chain of custody from generation to refinery, cross-checked at the warehouse and ready for ISCC certification.",
    ],
    keyFeatures: [
      "Oil-Checker: handheld ultrasonic and conductivity sensing; an AI model predicts acid value, moisture and iodine value on site.",
      "Vision-AI collection app and warehouse kiosk: collection records are matched to weighed intake before any load moves on.",
      "Data Passport: origin data captured beyond ISCC EU requirements, automating certification and renewal for collectors.",
    ],
    targetAudience: [
      "SAF and renewable-fuel producers, refiners and commodity traders buying UCO.",
      "Collectors and aggregators needing certification.",
    ],
    businessModel: [
      "Direct collection & trading: ReFeed collects UCO in Vietnam and sells verified volume to refiners and traders.",
      "Data Passport toll: a per-tonne fee on every volume whose origin is certified through ReFeed's system.",
      "Index clearing fees: derivatives and clearing built on the ReFeed Index, a benchmark price for waste commodities.",
    ],
    businessSnapshot: [
      "Pre-A stage, backed by institutional investors from Korea and Singapore; preparing Series A.",
      "Vietnam: own UCO collection and trading operation with 3,000t+ traded, 1,200+ accounts and 10%+ monthly growth.",
      "Korea: Data Passport captured 35% of domestic UCO data in year one; targeting 100% by end-2027.",
      "ISCC EU certified (Vietnam); Minister of Environment Award 2024; P4G TOP 3 2025; TechFest Vietnam 1st Place 2025.",
      "Expanding: India entity established, Brunei hardware-export LOI, Japan solution-export talks.",
    ],
    team: [
      { name: "Chungho Lee", role: "Co-Founder & CEO", bio: ["Former Senior Manager, ESG Management, Hanwha TotalEnergies; ex-Hanwha Q CELLS Malaysia", "Harvard Kennedy School (MPA/ID); B.S. Chemistry, Yonsei University"] },
      { name: "Junbong Jeon", role: "Co-Founder & CBO", bio: ["10 years at Hanwha TotalEnergies in naphtha feedstock procurement and gasoline trading", "M.S. Energy Commodity Trading & Financial Engineering, UNIST"] },
      { name: "Jeonghwan You", role: "Co-Founder & COO", bio: ["CEO of ECO OIL Vietnam, ReFeed's UCO collection and trading subsidiary, since 2023", "Former Senior Manager, Asan Nanum Foundation; Antler Entrepreneur"] },
      { name: "Byeongkyu Kim", role: "CPO", bio: ["Former CPO / Creative Director of two consumer brands; market entry across 11 countries", "Hanwha Life: expanded the Dream Plus startup ecosystem to 4 countries"] },
    ],
    seekingOpportunities: [
      "Series A investors focused on climate tech, commodities and Southeast Asia.",
      "SAF producers, refiners and traders in Singapore seeking quality- and origin-verified UCO supply.",
      "Partners to build a regional UCO price index and trading infrastructure, and SEA collection partners.",
    ],
    onepager: "/onepagers/refeed.pdf",
  },
  {
    slug: "apexion",
    name: "Apexion",
    displayName: "Apexion",
    tagline: "Turning unmeasured values into decisions: estimating food-waste composition from public data to route more of it to biogas.",
    sector: "Waste-to-Energy Analytics",
    stage: "Pre-seed · MVP in development",
    track: "track1",
    website: "https://www.apexion.io",
    email: "smk@apexion.io",
    phone: "+82 10-3105-1000",
    problem: [
      "Korea's Biogas Act makes 243 municipalities convert 50% of organic waste to biogas, with penalties for shortfalls.",
      "Only 6.6% of organic waste becomes energy today; the same ton emits 25× more methane depending on the route.",
      "Nobody measures what is in the waste, so nobody decides its route.",
    ],
    solution: [
      "BioRoute-Food Waste estimates waste composition from public data alone: discharge records, housing, households, nearby businesses.",
      "It grades each collection point by methane potential and routes high-yield waste unmixed to anaerobic digestion.",
      "Same waste, more energy, lower penalties. No new sensors or plants.",
    ],
    keyFeatures: [
      "Every coefficient is published and traceable, so a city official can audit exactly why a district received grade B.",
      "Compliance shown in January, not in a December notice: target vs. expected production, penalty exposure.",
      "One engine, three market roles: built in Korea, tested in Singapore, then Indonesia and Thailand.",
    ],
    targetAudience: [
      "Municipalities and public facility operators bound by Korea's Biogas Act.",
      "Singapore: large malls under NEA waste reporting, and the partners who collect or treat their waste.",
      "Indonesia and Thailand: cities assessing feedstock for new digesters.",
    ],
    businessModel: [
      "B2G success fee: 20–30% of avoided penalty, plus an annual subscription for the routing and reporting dashboard.",
      "Gain-share with facility operators on co-digestion yield.",
      "Korea: 47 target cities, about $46–62M annual penalty exposure (estimate). Similar regulatory pull in US, EU, Singapore.",
    ],
    businessSnapshot: [
      "Bootstrapped to date; selected for Ministry of SMEs commercialization support (2026).",
      "KAIST Climate-Tech Audition, Excellence Award (Sep 2026); Yongin concept demonstration.",
      "Validation-first MVP in development, benchmarked on five field studies.",
      "Pre-revenue; next 12 months: Yongin field validation, a Singapore test, then Indonesia or Thailand.",
    ],
    team: [
      { name: "Sungmin Kim", role: "Founder & CEO", bio: ["Physics, KMU", "Patent attorney / KCVA"] },
      { name: "Dongwoo An", role: "Business", bio: ["Business Administration, SNU", "Finance and growth strategy"] },
      { name: "Hyunsung Shim", role: "Engineering", bio: ["Electrical Engineering, KAIST", "Estimation, validation and data integration"] },
      { name: "Byung-il Jang", role: "Advisor", bio: ["Professor, KAIST GGGS", "Waste, energy and policy advisory"] },
    ],
    seekingOpportunities: [
      "Pilot partners with a facility or a waste stream, Singapore first.",
      "Validation partners in Singapore and Southeast Asia.",
      "Pre-seed investors and accelerator partners.",
    ],
    onepager: "/onepagers/apexion.pdf",
  },
  {
    slug: "yulmix",
    name: "YULMIX",
    displayName: "YULMIX Inc.",
    tagline:
      "Room-temperature, solvent-free catalyst nanomaterial manufacturing platform based on Resonant Acoustic Mixing (RAM): green, facile, scalable.",
    sector: "Green Catalyst Manufacturing",
    stage: "Pre-seed · 4 PoCs in progress",
    track: "track1",
    website: "",
    email: "qjtmdks12@gmail.com",
    phone: "+82 10-5698-2358",
    problem: [
      "Each nanomaterial needs its own dedicated wet-synthesis line, driving high CAPEX and slow commercialization.",
      "Yield, reproducibility and quality collapse during scale-up, so promising materials rarely leave the lab.",
      "Wet synthesis relies on high heat, organic solvents and up to 48 hours per batch (~192 kgCO₂ per kg).",
    ],
    solution: [
      "A single RAM platform produces metal nanoparticles, nanoclusters, doped carbon, oxides, alloys, MOFs and MXenes.",
      "Low-frequency resonant vibration replaces heat: 3 steps, 2 raw materials, room temperature, zero organic solvent.",
    ],
    keyFeatures: [
      "Up to 144× faster (≤20 min vs. 48 h), 1/72 power use and 1/16 CO₂ emissions per 1 kg batch.",
      "Uniform 2–3 nm Pt/C (2.78 ± 0.33 nm); mass activity 0.450 A/mgPt, meeting the DOE target.",
      "Manufacturing cost cut up to 80% (non-precious) / 41% (precious); 99% reproducibility, <1% loss.",
    ],
    targetAudience: [
      "Fuel cell & water electrolysis (hydrogen), battery and chemical/environmental catalyst manufacturers.",
      "Nano & high-performance catalyst market: $7.1B (2025) → $13.9B (2035), CAGR 7.0%.",
    ],
    businessModel: [
      "B2B direct sales of catalyst materials (Pt/C, IrO₂, doped carbon, metal oxides) to hydrogen, battery and chemical makers.",
      "ODC custom development (NRE fees) converting into long-term supply agreements.",
      "Global technology licensing (upfront fee + royalty) and carbon-credit-linked ESG supply partnerships.",
    ],
    businessSnapshot: [
      // Founded 2026 per both one-pager and IR (Dec 2025 PoCs were pre-incorporation lab work).
      "Founded Aug 2026; incubated at GIST Startup Center; selected for 11 government programs (KRW 230M non-dilutive secured).",
      "4 PoCs in progress with 3 industrial partners (Companies C, K, O) since Dec 2025; NDA and PoC underway with Company G.",
      "1 patent filed (Sep 2026); 12 core process/material patents planned incl. PCT.",
      "Awards: 2026 Climate-Energy-Environment Startup Competition (Excellence), 2026 KAIST Climate Tech Audition (Innovation).",
      "Raising KRW 100M pre-seed to build a 1.5 kg/batch pilot line; 2030 revenue target KRW 30B.",
    ],
    team: [
      { name: "Jinho Hyun", role: "Founder & CEO", bio: ["Ph.D. in Engineering, GIST; 10 years of nanomaterial synthesis research", "Led national R&D projects totaling KRW 18.6B (NRF, Samsung SDI, etc.)", "Fuel cell / water electrolysis catalyst development; 4 SCIE/KCI papers"] },
      { name: "Chanho Pak", role: "CTO", bio: ["Professor of Chemistry, GIST; 30 years of research", "Former Vice President, Samsung SDI", "Led pilot production line setup, process standardization & QA"] },
      { name: "R&D Team", role: "Joining 2026–27", bio: ["AI researcher (process modeling), material synthesis and electrochemical evaluation researchers"] },
    ],
    seekingOpportunities: [
      "PoC & sample-evaluation partners among fuel cell, electrolysis, battery and chemical catalyst makers.",
      "Seed investors and global licensing / distribution partners.",
    ],
    onepager: "/onepagers/yulmix.pdf",
  },
  {
    slug: "greenmrv",
    name: "greenMRV",
    displayName: "greenMRV",
    tagline: "Biochar and CO₂ mineralization carbon-removal projects in South Korea, from origination and MRV to international credit sales.",
    sector: "Carbon Removal · Biochar & Mineralization",
    stage: "Early stage · first project 2026–27",
    track: "track1",
    website: "https://www.greenmrv.com",
    email: "info@greenmrv.com",
    phone: "+82 10-4332-1677",
    problem: [
      "Forest residues and biogenic CO₂ streams offer carbon removal opportunities that need viable projects and buyers.",
      "Industrial partners need project development, credible carbon accounting and a route to international credit sales.",
    ],
    solution: [
      "We develop Korean carbon removal projects with industrial partners, starting with biochar and pursuing CO₂ mineralization.",
      "We combine project origination, MRV and life-cycle assessment with certification support and international buyer engagement.",
    ],
    keyFeatures: [
      "Initial project: biochar in Gimje. CV Biochar collaboration targeting 4,000 tCO₂ in 2026–2027, subject to certification and verification.",
      "Feedstock expansion: converting pine-wilt-damaged wood into biochar for durable storage; talks underway with the Miryang-city Forestry Cooperative on a demonstration plant.",
      "Next demonstration: mineralizing CO₂ from a dedicated biomass power plant using steel slag; bench-to-pilot scale preparations underway, targeting 2027.",
    ],
    targetAudience: [
      "Carbon dioxide removal (CDR) buyers seeking durable credits.",
      "Biomass plant hosts, slag suppliers and mineralization technology partners.",
    ],
    businessModel: [
      "Performance-based share of issued and sold carbon removal credits.",
      "Illustrative biochar split: 70% to producers and 30% to greenMRV, subject to project agreements.",
    ],
    businessSnapshot: [
      "2 MOUs: CV Biochar for demonstration and Newton for carbon MRV software collaboration.",
      "First-project target: 4,000 tCO₂ for 2026–2027, subject to certification and verification.",
      "Digital MRV demonstration discussions and initial outreach to global carbon removal buyers are underway.",
    ],
    team: [
      { name: "Hyungyu Ryu", role: "CEO", bio: ["PLC & hardware programmer", "Plant reactor (P&ID, CAD) design engineer"] },
      { name: "Jaehyung Kim", role: "MRV / LCA", bio: ["Former ESG consultant", "Ph.D. in Environmental Engineering"] },
      { name: "Lalit Goswami", role: "Chief Researcher, Bio & Chemical", bio: ["Assistant Professor, Gachon University", "Process flow diagram & reactor design"] },
      { name: "Prof. Seungdae Oh", role: "Technical Advisor", bio: ["Environmental engineering professor", "LCA and carbon neutrality research"] },
    ],
    seekingOpportunities: [
      "CDR buyers: conditional pre-purchases and long-term offtake.",
      "Co-developers: biomass plant hosts, slag supply and mineralization technology for a joint pilot.",
      "Investors: capital for project development and pilots.",
    ],
    onepager: "/onepagers/greenmrv.pdf",
  },
  {
    slug: "reblock",
    name: "REBLOCK",
    displayName: "REBLOCK",
    tagline: "Turning ceramic waste into high-performance permeable paving blocks.",
    sector: "Circular Construction Materials",
    stage: "Seed · first pilot installed",
    track: "track1",
    website: "https://rblockr.netlify.app/",
    email: "1reblock1@gmail.com",
    phone: "+82 10-7577-8867",
    problem: [
      "Urbanization seals the ground: asphalt and concrete seal out rainwater, so surface runoff and flash floods rise while groundwater recharge declines.",
      "Existing permeable blocks fall short: higher permeability means weaker blocks, and clogging within 2–3 years erodes performance.",
      "Ceramic waste piles up: 2.5M t/yr in Korea, mostly landfilled, yet its hardness and reactive minerals are exactly what permeable paving needs.",
    ],
    solution: [
      "Ceramic waste aggregate: crushed and graded to 0–10 mm, replacing 90%+ of general aggregate.",
      "Waste-blend mix design: combined with 3–4 additional waste-derived materials for a stable, low-cost formulation.",
      "Pozzolanic bonding: silica and alumina in ceramic waste reinforce the aggregate-cement bond for high permeability without losing strength (patent pending).",
    ],
    keyFeatures: [
      "Verified performance: 4 accredited KS F 4419 performance tests by KCL and KTR (national testing institutes).",
      "Permeability 1.12 mm/s (11× the Korean Industrial Standard), flexural strength 4.4 MPa and Seoul city durability Grade 2.",
      "Drop-in replacement: standard 200×200 mm (T60 / T80), 6 colors, existing installation methods.",
    ],
    targetAudience: [
      "B2G: national and public agencies (sidewalks, parks, flood-prone zones).",
      "B2B: private contractors, landscape contractors, design firms (spec-in).",
    ],
    businessModel: [
      "Product sales: USD 16/m² to public agencies and private contractors.",
      "Waste processing fee: USD 40/t paid by waste collectors, so REBLOCK is paid to receive its own raw material.",
      "Circular take-back: used blocks recovered and remanufactured for up to 2 cycles.",
    ],
    businessSnapshot: [
      "33 t produced via contract manufacturing; first 24 m² pilot installed at Konkuk University, Seoul (Jun 2026); 2nd pilot confirmed.",
      "Paid pilot and supply talks underway with 2 Korean municipalities.",
      "Grand Prize: 2026 Climate, Energy & Environment Startup Competition (Korean Ministry of Climate, Energy and Environment).",
      "Top Prize: Defense Tech Startup Competition · Winner: Enactus Korea 2026 · Selected: KHNP FutureBridge startup program.",
      "Roadmap: 4 pilots (2026) → certified performance & public procurement (2027) → in-house crushing plant (2028).",
    ],
    team: [
      { name: "Minchan Kim", role: "Founder & CEO", bio: ["3 years leading tech-based ESG commercialization projects", "Environmental research projects with the Korean Society for Microbiology & Korea Forest Service", "Member, Korea Block Association"] },
      { name: "Seonghyun Park", role: "CTO", bio: ["Eco-friendly landscaping projects", "Member, Korea Block Association"] },
      { name: "Dayeon Jung", role: "CRO", bio: ["B2B trade sales between Korea and Spain", "UC Berkeley Haas, I-Corps program"] },
      { name: "Jinsu Yun", role: "CBO", bio: ["2 years as CEO of a social enterprise", "Business Administration, Konkuk University"] },
      { name: "Advisors", role: "", bio: ["Eco-friendly Concrete Lab, Konkuk University", "Korean Society for Life Cycle Assessment"] },
    ],
    seekingOpportunities: [
      "Pilot partners in Singapore & Southeast Asia: public agencies, contractors, landscape & design firms.",
      "Local partners for ceramic waste sourcing and localized production.",
      "Seed investment for procurement entry and overseas expansion.",
    ],
    onepager: "/onepagers/reblock.pdf",
  },
  {
    slug: "mce",
    name: "MCE",
    displayName: "MCE Inc.",
    tagline: "Turning waste plastic into OMRI Listed humic fertilizer with mealworm gut microbes.",
    sector: "Plastic Upcycling · Bio-Fertilizer",
    stage: "Pre-Series A · exporting to 6 countries",
    track: "track1",
    website: "https://www.mceinc.co.kr",
    email: "ceo@mceinc.co.kr",
    phone: "+82 10-4758-9620 (KR) · +65 9185 5844 (SG)",
    problem: [
      "EPS (styrofoam) is bulky and hard to recycle; most is incinerated or landfilled.",
      "Humic fertilizers depend on mined leonardite, a finite, coal-derived feedstock with uneven quality.",
      "Tropical plantations and urban landscapes need organic soil inputs that hold up under heat and rain.",
    ],
    solution: [
      "Lv1 (commercial): mealworms feed on an EPS “FeedBlock”; humic acid is extracted from their frass as MaHa.",
      "Lv2 (pilot, TRL 5): an isolated gut-microbe consortium and its enzymes convert plastic into humic-like substances, with no live mealworms.",
    ],
    keyFeatures: [
      "Third-party trials: pak choi root length +77.1% (rank #1 of 8); durian seedling height +66.6%.",
      "Chrysanthemum trial: +40% blooms and about 10 more flowering days.",
      "OMRI Listed (mcw-21964) · ISO 9001/14001/45001 · EPD; liquid concentrate that blends with other inputs.",
    ],
    targetAudience: [
      "Regulatory bridge: joint R&D with Temasek Polytechnic (MOU, Sep 2026) to validate that Lv2 output matches the OMRI Listed Lv1 product in function and safety, using SAC-SINGLAS accredited analysis on real EPS/PS waste from Singapore's recycling network.",
      "Regional sales hub: MaHa fertilizer reaches plantation and landscape buyers in Malaysia, Thailand, Indonesia and the Philippines via local distributors.",
      "Equipment: Lv2 modular plants and recurring enzyme kits across Southeast Asia; USD 1.0M equipment MOA in Thailand; KILSA Global JV forming as regional operator.",
    ],
    businessModel: [
      "Fertilizer: MaHa sales to plantations, landscapers and distributors (B2B/B2G).",
      "Plant + enzyme kits: modular Lv2 conversion plants with recurring enzyme-kit supply.",
      "Carbon services: certification sponsorship and credit brokerage fee; credits remain with the land operator.",
    ],
    businessSnapshot: [
      "Funding: US$0.8M equity (Pre-Series A) + US$2.3M non-dilutive Korean government R&D; raising Series A up to US$2.0M.",
      "Traction: FY2025 revenue US$0.71M; 7 export deals, 53.1 t shipped to 6 countries incl. Singapore.",
      "IP: 26 assets — 12 granted patents, 2 PCT filings, 2 deposited strains (KCTC).",
      "Recognition: CES 2025 Innovation Award · VivaTech 2026 Tech for CHANGE Top 30 · Net Zero Challenge X.",
      "R&D network: 9 joint R&D teams incl. KAIST, KRIBB and KIT; MOU with Temasek Polytechnic and NDA with A*STAR in Singapore; carbon capture initiative with Musang Valley Plantation, Malaysia.",
    ],
    team: [
      { name: "John (Jonguk) Park", role: "Founder & CEO", bio: ["MS, Bio-AI Convergence: NGS-based mealworm gut microbiome research", "Leads IP strategy: 26 IP assets, 12 granted patents"] },
      { name: "Jongrok Jeon", role: "CTO", bio: ["PhD, Agriculture (Bio-engineering)", "Full Professor, Gyeongsang National University; sustainable upcycling"] },
      { name: "Gabriel (Seongyoon) Kwon", role: "CSO", bio: ["Former Hitachi & HP, strategic planning", "Multilingual global BD; leads Southeast Asia and EU partnerships"] },
      { name: "Jihoon Park", role: "CDO", bio: ["MS, Seoul National University (GSES); former urban planner", "Leads tech commercialization and the carbon track"] },
      { name: "Seunggi Park", role: "CRO", bio: ["PhD, Agriculture (Civil & Environmental Engineering)", "Full Professor, Kongju National University"] },
      { name: "Sean Tan", role: "Business Development – ASEAN", bio: ["Co-founder, KILSA Global; former Citibank & Standard Chartered", "Specializes in business expansion across ASEAN"] },
      { name: "Yi Nam", role: "Principal Technical Advisor", bio: ["PhD, Agriculture (Soil Science)", "Former General Manager, Fertilizer Dept., Nonghyup (NACF)"] },
    ],
    seekingOpportunities: [
      "Series A investors: climate, agri-food and circular-economy VCs and CVCs in Southeast Asia.",
      "Distributors and bulk buyers for MaHa: plantation, landscape and nursery channels across Southeast Asia.",
      "Buyers and operating partners for Lv2 modular plants: waste handlers, recyclers and industrial parks in the region.",
    ],
    onepager: "/onepagers/mce.pdf",
  },
  {
    slug: "gigaette",
    name: "GIGAette",
    displayName: "GIGAette Co., Ltd.",
    tagline:
      "Isothermal thermal batteries that turn waste heat and surplus renewable power into constant-temperature, high-pressure carbon-free heat.",
    sector: "Thermal Energy Storage",
    stage: "Seed + TIPS · first revenue",
    track: "track1",
    website: "https://gigaette.com",
    email: "hoonjin.park@gigaette.com",
    phone: "+82 10-9786-2934",
    problem: [
      "Waste heat is dumped: exhaust, cooling-water and incineration heat is lost because its timing and temperature rarely match demand.",
      "Processes are rigid: batch heat cannot feed continuous loads; boilers are oversized for peaks, with no thermal backup.",
      "Fossil boilers lock in emissions: LNG and coal heat drives Scope 1 under CBAM/RE100 pressure; hydrogen heat is costly and risky.",
      "Energy bills stay high: peak power and demand charges inflate costs; Li-ion ESS is too costly and short-lived for bulk storage.",
    ],
    solution: [
      "IsoTES®: single-tank liquid thermal battery charged by waste heat or surplus / off-peak electricity.",
      "Discharges steam, hot air, heating or cooling at the exact temperature and pressure a process needs.",
      "Standard modules (2-TEU container, 40–500 m³ silos, 200 m³ box) scale from 0.1 MWh to GWh-class plants.",
    ],
    keyFeatures: [
      "Patented “thermal piston”: ~90% of discharge at constant temperature vs. ~20% for brick-based rivals.",
      "High-pressure output (up to 250 bar) via in-tank heat-transfer tubes; no extra blowers or compressors.",
      "~1/3 the CAPEX and ~4× the lifetime of Li-ion ESS (30 vs. 8 years), 95% power-to-heat efficiency.",
      "Wide range: –80 °C to +550 °C today, roadmap to 1,000 °C and 1 GWh.",
    ],
    targetAudience: [
      "Buildings, data centers and factories in hot climates cutting power bills via stored renewable heat and absorption chillers.",
      "Grain drying and agri / industrial process heat users in Southeast Asia.",
      "Industrial plants with waste heat (steel, aluminum) and district heating operators.",
    ],
    businessModel: [
      "Now: sales of IsoTES modules and integrated packages (TES + waste-heat recovery, heat pump, chiller) with O&M.",
      "From 2028: Heat-as-a-Service / Storage-as-a-Service; GIGAette funds the asset, customers pay per unit of heat.",
      "From 2030: industrial-park and city-scale heat platforms (B2B/B2G) and overseas licensing.",
    ],
    businessSnapshot: [
      "Raised KRW 1.8B (~USD 1.3M) equity: KRW 0.9B Seed (Sep 2025) from Shinhan Venture Investment, Bluepoint Partners, Daejeon CCEI and Star Ventures; KRW 0.9B from Sunbo Angel Partners (Apr 2026).",
      "Secured KRW 3.5B (~USD 2.5M) non-dilutive R&D funding: Deep Tech TIPS (KRW 1.5B, 2025) and Scale-up TIPS (KRW 2.0B, 2026).",
      "First revenue: KRW 173M 3-TPD CO₂ liquefaction system for the Institute for Advanced Engineering (Aug 2026).",
      "Track record: 0.1 MWh pilot (2023), 0.7 MWh prototype (2024), 1.5 MWh Mongolia PoC (2024), 12 MWh KOICA project (2026).",
      "Pipeline: YK Steel (EAF waste heat), ALUS and KONEC (aluminum waste heat to cooling), Mongolian district heating operators; 8 KR/PCT patents incl. exclusive KAIST license.",
    ],
    team: [
      { name: "Daejun Chang", role: "Co-Founder & CEO", bio: ["Professor of Mechanical Engineering, KAIST", "Ph.D. Chemical Engineering, KAIST; ex-Hyundai Heavy Industries", "Founder, Lattice Technology; leads national R&D programs and overseas government relations"] },
      { name: "Sungkwang Lee", role: "CTO", bio: ["Leads system design, operation and application development", "M.S. Mechanical & Aerospace Eng., Seoul National University; KAIST Finance MBA", "Former engineer, LG Electronics"] },
      { name: "Hoonjin Park", role: "Co-Founder & COO", bio: ["Leads sales, partnerships and global business development", "Co-founder of Lattice Technology and Recreate", "KAIST Finance MBA"] },
      { name: "Jinkwang Lee", role: "Technical Advisor", bio: ["Ph.D. Mechanical Engineering, KAIST; Assoc. Prof., Gyeongsang National University", "Ex-DSME, Korean Register and Hyundai Heavy Industries"] },
    ],
    seekingOpportunities: [
      "Renewable-powered cooling: buildings, data centers and factories in hot climates.",
      "Renewable-powered heat: grain drying and agri / industrial process heat users in Southeast Asia.",
      "Local partners: EPCs, distributors and developers for IsoTES pilots.",
      "Investors: strategic and climate-tech investors for Series A (2027).",
    ],
    onepager: "/onepagers/gigaette.pdf",
  },
  {
    slug: "theorigin",
    name: "The Origin",
    displayName: "The Origin",
    tagline:
      "Using photosynthetic microorganisms to turn CO₂ into biomaterials that biodegrade in soil and seawater at ambient temperature.",
    sector: "CO₂-to-Biomaterials",
    stage: "Pre-incorporation · 2 patents filed",
    track: "track1",
    website: "",
    email: "shimgw00@snu.ac.kr",
    phone: "+82 10-6699-9600",
    problem: [
      "Plastic leaks and persists: ~22 Mt of plastic leaked into the environment in 2019, and only 9% of plastic waste is recycled (OECD, 2022).",
      "“Biodegradable” is not degradable in nature: PLA and similar bioplastics need industrial composting (~58 °C); in soil and seawater they persist like conventional plastic.",
      "Carbon and plastic are one problem: plastics are fossil-derived and emit CO₂ across their life cycle.",
    ],
    solution: [
      "CO₂ as feedstock: photosynthetic microorganisms fix CO₂ and store it inside the cell as PHB, a natural biopolyester.",
      "Linear to circular: unlike fossil plastics that are burned, landfilled or leaked, the material returns to the natural carbon cycle after use.",
      "Tailored to each brand: formulated and compounded to each brand's target properties, ready for existing processing lines.",
    ],
    keyFeatures: [
      "Biodegrades in soil and sea at ambient temperature: in in-house film tests, fully biodegraded in soil (182 days) and seawater (323 days).",
      "No microplastics or toxic residues: breaks down into CO₂, water and biomass.",
      "Biocompatible: PHB degrades into 3-hydroxybutyrate, a natural human metabolite, opening baby-care and medical uses.",
      "Proprietary bio-plasticizer: patent-pending, made in-house from microbial lipids; soft-touch and 11× more stretchable than pure PHB.",
    ],
    targetAudience: [
      "Brands in packaging, agri/forestry and consumer goods.",
      "Industrial CO₂ sources (fermentation, biogas), contract manufacturers and pilot facilities.",
    ],
    businessModel: [
      "Co-development (entry): paid PoCs to design a compounded material matched to each product's target properties.",
      "Compounded materials (core revenue): recurring $/kg sales of validated, product-specific compounded materials, with verifiable Scope 3 reduction.",
      "Licensing (long-term): licensing the production process and proprietary microbial strains, with royalties.",
    ],
    businessSnapshot: [
      "Stage & funding: pre-incorporation team at SNU (2025); ~KRW 120M in non-dilutive funding; 2 Korean patents filed.",
      "Corporate & public programs: KakaoBank Eco Lab, KDHC ON-Lab, TeX-Corps at UC Berkeley.",
      "Field PoCs: seed-ball coating for forest restoration and trail ribbons with an outdoor apparel brand, both applied on-site.",
      "In co-development: microfiber cleaning yarn and air-freshener carrier with consumer-goods manufacturers.",
      "Recognition: 10 awards (2024–26), incl. three ministerial awards and 1st place at the national Climate-Tech Challenge (2026).",
    ],
    team: [
      { name: "Gunwoo Shim", role: "Founder & CEO", bio: ["Leads strategy, brand partnerships and technology development", "Collaborated on ESG strategy with CJ CheilJedang and POSCO International", "Ph.D. candidate, Civil & Environmental Engineering, SNU (B.S., M.S. SNU)"] },
      { name: "Seungpyo Kwak", role: "CTO", bio: ["Leads process equipment build-out, material processing and 3D printing", "Grand Prize, SNU College of Engineering Creative Design Fair", "B.S., Mechanical Engineering, SNU"] },
      { name: "Junhee Kim", role: "COO", bio: ["Leads partner sourcing and overseas outreach", "Speaks 4 languages (English, Spanish, Japanese, Korean)", "B.S., Civil & Environmental Engineering, SNU"] },
      { name: "Taegyun Kim", role: "Researcher", bio: ["Drives R&D across microbial production and material development", "M.S., Civil & Environmental Engineering, SNU"] },
    ],
    seekingOpportunities: [
      "Seed investment from climate-tech and advanced-materials investors, including strategic corporate investors.",
      "PoC partners: brands in packaging, agri/forestry and consumer goods across Singapore & Southeast Asia.",
      "Scale-up partners: industrial CO₂ sources (fermentation, biogas), contract manufacturers and pilot facilities.",
    ],
    onepager: "/onepagers/theorigin.pdf",
  },
  {
    slug: "terracle",
    name: "Terracle",
    displayName: "Terracle",
    tagline: "Turning PET plastic and textile waste back into high-purity raw materials through chemical depolymerization.",
    sector: "Chemical Recycling · PET & Textiles",
    stage: "Series A · 4,000 t/yr plant",
    track: "track1",
    website: "https://www.terracle.im",
    email: "kh.gweon@terracle.im",
    phone: "+82 10-8829-2109",
    problem: [
      "PET is one of the most produced and discarded plastics, and ~75% of its carbon footprint comes from making its monomers (TPA, EG) from crude oil.",
      "Mechanical recycling degrades quality and color with every cycle and cannot process colored, composite or contaminated waste.",
      "Most chemical recycling requires high temperature and pressure, making it too costly and energy-intensive to scale.",
    ],
    solution: [
      "A low-temperature, ambient-pressure process depolymerizes PET waste into high-purity monomers, cutting both cost and carbon emissions.",
      "Handles colored, composite and contaminated PET and polyester textiles that mechanical recycling rejects.",
      "All PET is made from TPA and EG, so Cr-TPA and Cr-EG are drop-in replacements for virgin feedstock, with no changes to existing plants.",
    ],
    keyFeatures: [
      "Virgin-grade purity (99%+): Cr-TPA and Cr-EG meet virgin specifications for textiles, films and packaging.",
      "Second revenue stream: the process by-product, potassium sulfate (K₂SO₄), is sold as a premium fertilizer.",
      "Commercial scale: a 4,000 t/yr depolymerization plant, the world's largest low-temperature PET depolymerization facility.",
    ],
    targetAudience: [
      "Brand owners, fiber and packaging makers seeking recycled feedstock.",
      "Waste holders with colored, composite or contaminated PET and polyester textiles.",
    ],
    businessModel: [
      "Closed loop: recycling a client's own waste back into their products, reducing virgin material purchases and incineration.",
      "Gate fees & carbon credits: fees for processing colored and composite waste, plus carbon credit revenue.",
      "Product sales: B2B sales of Cr-TPA, Cr-EG and premium K₂SO₄ fertilizer.",
    ],
    businessSnapshot: [
      "Series A: raised KRW 15.9B (~$12M).",
      "Recognition: selected as a Korea “Pre-Green Unicorn”.",
      "Partnerships: 40+ open innovation partnerships with industry leaders.",
      "Validated applications: completed PoCs in automotive, electronics, textiles, engineering plastics and biodegradables.",
    ],
    team: [
      { name: "Kibaek Gweon", role: "Founder & CEO", bio: ["Former advertising strategist", "Won 30+ business awards", "Selected as a Korea Pre-Green Unicorn"] },
      { name: "James Lee", role: "CTO", bio: ["Ph.D. candidate in Chemistry, Korea University", "Serial entrepreneur; previously founded a chemical materials startup"] },
    ],
    seekingOpportunities: [
      "Series B investors.",
      "Local partners for plant construction in Asia.",
      "Offtake partners and new customers (brand owners, fiber and packaging makers).",
    ],
    onepager: "/onepagers/terracle.pdf",
  },
  {
    slug: "solarlease",
    name: "Solarlease",
    displayName: "Solarlease (Deep Renewables Inc.)",
    tagline:
      "Aggregating scattered building rooftops and delivering them fast as solar assets: zero-capex subscription, proven in Korea.",
    sector: "Rooftop Solar · Energy-as-a-Service",
    stage: "Profitable · 15.6 MW contracted",
    track: "track1",
    website: "https://www.deepre.kr",
    email: "minuks@deepre.kr",
    phone: "+82 10-8547-0224",
    problem: [
      "Korea's industrial power price rose 72% in 4 years, yet RE100 compliance is only 12%: renewable demand far outstrips supply.",
      "High upfront cost and a 20-year operating burden leave idle spaces like rooftops empty, and small roofs are ignored by large players.",
    ],
    solution: [
      "Zero-capex subscription: Solarlease finances, builds, owns and operates; owners buy power up to 24% below the utility tariff.",
      "3 products (power subscription, plant subscription, roof lease): one for every building owner.",
      "Standardized 7-month development: every roof from 20 kW to MW becomes an income-grade asset.",
    ],
    keyFeatures: [
      "AI rooftop underwriting: 98% accuracy, screening within 10 minutes; 3,700 sites (440 MW) reviewed to date.",
      "Flat build cost of ₩1.2M (≈US$900)/kW at any scale; 11 patents across the development cycle (8 granted).",
      "Rapid build-and-supply engine: graded solar assets sold to institutions.",
    ],
    targetAudience: [
      "Building owners with idle roofs, rooftops and parking lots seeking cheaper power and RE100 supply.",
      "Institutional asset managers seeking graded solar assets.",
    ],
    businessModel: [
      "Build-Sell: completed plants sold to institutions (avg. margin 31%, 7-month capital cycle).",
      "Subscribe: recurring subscription revenue (ARR) on power generated by its plants.",
      "Lease: securing idle spaces (roofs, rooftops, parking lots) to develop plants; growth equity (platform) kept separate from asset finance (SPC plants), so the company stays asset-light.",
    ],
    businessSnapshot: [
      "Profitable in year 1: FY2025 revenue ₩2.3bn (≈US$1.7M), operating profit ₩0.34bn.",
      "53 sites · 15.6 MW contracted/permitted/operating; multiple asset sales to institutions incl. KG Inicis (listed).",
      "2029 target: 338 MW developed & built, ₩100bn revenue, 204 kt CO₂/yr cut; ISO 9001/14001/27001.",
    ],
    team: [
      { name: "Minwook Song", role: "Founder & CEO", bio: ["10+ years in rooftop solar development; 153 MW built before founding", "Former CSO, Samsung Solartech; former O2O team lead, H Energy", "M.S. Urban Planning, SNU"] },
      { name: "Bokyung Lee", role: "Product Lead", bio: ["10+ years in product & marketing (PO)", "Leads the Solarlease Ops platform & brand"] },
      { name: "Wangju Lee", role: "Sales Lead", bio: ["7+ years in energy sales & EPC management", "Partner network of 120+ brokers, 300 inbound leads per month"] },
    ],
    seekingOpportunities: [
      "PoC & pilot partners for rooftop solar subscription in Singapore and Asia (Vietnam, Philippines, etc.).",
      "Asset managers seeking a recurring channel for Korean building-solar assets (Singapore & beyond).",
    ],
    onepager: "/onepagers/solarlease.pdf",
  },
];

export function getCompanyBySlug(slug: string): Company | undefined {
  return companies.find((c) => c.slug === slug);
}

// Companies that take 1:1 bookings: the whole cohort on this event.
export const MEETUP_COMPANIES: Company[] = companies;
