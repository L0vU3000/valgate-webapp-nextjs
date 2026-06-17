export type ProgressCheck = {
  label: string;
  done: boolean;
};

export type ProgressPillar = {
  key: string;
  name: string;
  weight: number;
  score: number;
  contribution: number;
  href: string;
  checks: ProgressCheck[];
  verified?: boolean;
};

export type ProgressDetails = {
  score: number;
  pillars: ProgressPillar[];
};
