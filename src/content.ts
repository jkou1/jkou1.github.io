export const profile = {
  name: 'Johan',
  intro: 'A little corner of the internet for things I make, things I find, and whatever comes next.',
  github: 'https://github.com/jkou1',
  email: '',
  pinterest: 'https://www.pinterest.com/DJDAIMY0/retro-futuristic-fashion/',
};

export type Obsession = {
  title: string;
  url: string;
  category: 'Music' | 'Fashion' | 'Motors';
  note?: string;
};

// Add your YouTube links here, with a title, category, and optional personal note.
export const obsessions: Obsession[] = [
  {
    title: 'Yamaha R6 - Akrapovic Exaust',
    url: 'https://www.youtube.com/watch?v=yVTY7Ti9Dws',
    category: 'Motors',
  },
  {
    title: 'TERIYAKI BOYZ - I still love H.E.R. feat.KANYE WEST',
    url: 'https://www.youtube.com/watch?v=yVRbBpvdRRg',
    category: 'Music',
  },
];
