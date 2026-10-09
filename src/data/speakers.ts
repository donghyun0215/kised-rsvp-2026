// Demo-day speakers and judges. None confirmed yet — the home page hides the
// section while JUDGES is empty. Add people here (photo in src/assets/people).

export interface Person {
  name: string;
  title: string;
  org: string;
  photo: string;
}

export const CONGRATULATORY: Person | null = null;

export const JUDGES: Person[] = [];
