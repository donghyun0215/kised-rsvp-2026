// Demo Day judges (Wed 28 Oct). Source: MYSC outreach tracker (12 Oct) —
// NH ARP, CIIP and Openspace confirmed; Maureen Brésil added by Tammy.
// Kijung Kwon and Maureen Brésil also judged the CMK Demo Day; their
// photos are reused from that site.
import jonathanChan from "@/assets/people/jonathan-chan.jpg";
import zhenZhenOng from "@/assets/people/zhen-zhen-ong.jpg";
import kijungKwon from "@/assets/people/kijung-kwon.jpg";
import maureenBresil from "@/assets/people/maureen-bresil.jpg";

export interface Person {
  name: string;
  title: string;
  org: string;
  photo: string;
}

export const CONGRATULATORY: Person | null = null;

export const JUDGES: Person[] = [
  { name: "Kijung Kwon", title: "CEO", org: "NH Absolute Return Partners", photo: kijungKwon },
  // ponytail: titles for Jonathan and Zhen Zhen not in the tracker — org only until confirmed
  { name: "Jonathan Chan", title: "", org: "Centre for Impact Investing and Practices (CIIP), Temasek Trust", photo: jonathanChan },
  { name: "Zhen Zhen Ong", title: "", org: "Openspace Ventures", photo: zhenZhenOng },
  { name: "Maureen Brésil", title: "Impact Director, Asia", org: "Katapult Ocean", photo: maureenBresil },
];
