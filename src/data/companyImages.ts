// Product photos and logos, extracted from each startup's one-pager
// (Terracle's logo is vector in the deck, so it's cropped from a render).
import imgRefeed from "@/assets/startups/refeed.jpg";
import imgApexion from "@/assets/startups/apexion.jpg";
import imgYulmix from "@/assets/startups/yulmix.jpg";
import imgGreenmrv from "@/assets/startups/greenmrv.jpg";
import imgReblock from "@/assets/startups/reblock.jpg";
import imgMce from "@/assets/startups/mce.jpg";
import imgGigaette from "@/assets/startups/gigaette.jpg";
import imgTheorigin from "@/assets/startups/theorigin.jpg";
import imgTerracle from "@/assets/startups/terracle.jpg";
import imgSolarlease from "@/assets/startups/solarlease.jpg";
import logoRefeed from "@/assets/startups/logos/refeed.png";
import logoApexion from "@/assets/startups/logos/apexion.png";
import logoYulmix from "@/assets/startups/logos/yulmix.png";
import logoGreenmrv from "@/assets/startups/logos/greenmrv.png";
import logoReblock from "@/assets/startups/logos/reblock.png";
import logoMce from "@/assets/startups/logos/mce.png";
import logoGigaette from "@/assets/startups/logos/gigaette.png";
import logoTheorigin from "@/assets/startups/logos/theorigin.png";
import logoTerracle from "@/assets/startups/logos/terracle.png";
import logoSolarlease from "@/assets/startups/logos/solarlease.png";

export const STARTUP_IMAGES: Record<string, string> = {
  refeed: imgRefeed,
  apexion: imgApexion,
  yulmix: imgYulmix,
  greenmrv: imgGreenmrv,
  reblock: imgReblock,
  mce: imgMce,
  gigaette: imgGigaette,
  theorigin: imgTheorigin,
  terracle: imgTerracle,
  solarlease: imgSolarlease,
};

export const STARTUP_LOGOS: Record<string, string> = {
  refeed: logoRefeed,
  apexion: logoApexion,
  yulmix: logoYulmix,
  greenmrv: logoGreenmrv,
  reblock: logoReblock,
  mce: logoMce,
  gigaette: logoGigaette,
  theorigin: logoTheorigin,
  terracle: logoTerracle,
  solarlease: logoSolarlease,
};

// CEO / representative photos from the MYSC master sheet ("참여팀 명단", 15 Oct),
// keyed by the team member's name as it appears in companies.ts.
import photoApexion from "@/assets/team/apexion.jpg";
import photoGreenmrv from "@/assets/team/greenmrv.jpg";
import photoTheorigin from "@/assets/team/theorigin.jpg";
import photoYulmix from "@/assets/team/yulmix.jpg";
import photoGigaette from "@/assets/team/gigaette.jpg";
import photoSolarlease from "@/assets/team/solarlease.jpg";
import photoMce from "@/assets/team/mce.jpg";
import photoTerracle from "@/assets/team/terracle.jpg";
import photoReblock from "@/assets/team/reblock.jpg";
import photoRefeed from "@/assets/team/refeed.jpg";

export const TEAM_PHOTOS: Record<string, string> = {
  "Sungmin Kim": photoApexion,
  "Hyungyu Ryu": photoGreenmrv,
  "Gunwoo Shim": photoTheorigin,
  "Jinho Hyun": photoYulmix,
  // the master sheet lists COO Hoonjin Park as GIGAette's participant
  "Hoonjin Park": photoGigaette,
  "Minwook Song": photoSolarlease,
  "John (Jonguk) Park": photoMce,
  "Kibaek Gweon": photoTerracle,
  "Minchan Kim": photoReblock,
  "Chungho Lee": photoRefeed,
};
