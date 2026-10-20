// Demo Day judges (Wed 28 Oct). Source: MYSC outreach tracker (12 Oct) —
// CIIP and Openspace confirmed. Kijung Kwon (NH ARP) and Maureen Brésil
// removed 15 Oct: not available on 28 Oct.
import jonathanChan from "@/assets/people/jonathan-chan.jpg";
import zhenZhenOng from "@/assets/people/zhen-zhen-ong.jpg";
// Added 20 Oct (Tammy); photos from their LinkedIn, greyscale like the others.
import wonkiKim from "@/assets/people/wonki-kim.jpg";
import daeroWon from "@/assets/people/daero-won.jpg";

export interface Person {
  name: string;
  title: string;
  org: string;
  photo: string;
}

export const CONGRATULATORY: Person | null = null;

export const JUDGES: Person[] = [
  // ponytail: titles for Jonathan and Zhen Zhen not in the tracker — org only until confirmed
  { name: "Jonathan Chan", title: "", org: "Centre for Impact Investing and Practices (CIIP), Temasek Trust", photo: jonathanChan },
  { name: "Zhen Zhen Ong", title: "", org: "Openspace Ventures", photo: zhenZhenOng },
  { name: "Won-Ki Kim", title: "", org: "Lighthouse Canton", photo: wonkiKim },
  { name: "Daero Won", title: "", org: "Translink Investment", photo: daeroWon },
];
