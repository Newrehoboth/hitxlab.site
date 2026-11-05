import cover1 from "@/assets/cover-1.jpg";
import cover2 from "@/assets/cover-2.jpg";
import cover3 from "@/assets/cover-3.jpg";
import cover4 from "@/assets/cover-4.jpg";
import cover5 from "@/assets/cover-5.jpg";
import cover6 from "@/assets/cover-6.jpg";
import cover7 from "@/assets/cover-7.jpg";
import cover8 from "@/assets/cover-8.jpg";
import { defaultLicenses, type License } from "@/lib/licenses";

export type Beat = {
  id: string;
  title: string;
  producer: string;
  producerId?: string;
  producerVerified?: boolean;
  cover: string;
  audio: string;
  bpm: number;
  key: string;
  genre: string;
  mood?: string;
  tags: string[];
  price: number;
  plays: number;
  duration: number;
  description?: string;
  licenses: License[];
  audioPath?: string;
  coverPath?: string;
  wavPath?: string;
  stemsPath?: string;
};

// ── DEMO DATA REMOVED ──
// All beats now come from database only via fetchPublishedBeats()
// No mock/demo data is displayed on the platform

export const GENRES = [
  "Afrobeats",
  "Trap",
  "Drill",
  "R&B",
  "Boom Bap",
  "Phonk",
  "Latin",
  "House",
];

