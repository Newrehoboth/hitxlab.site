export type LicenseType = "basic" | "professional" | "unlimited" | "exclusive";

export type License = {
  id: string;
  type: LicenseType;
  name: string;
  price: number;
  files: string[];
  contract: string;
  version: number;
  commercialRights: string;
  streamingLimit: string;
  distributionLimit: string;
  exclusive?: boolean;
  isNegotiable?: boolean;
};

const boilerplate = (title: string, terms: string) => `${title.toUpperCase()} LICENSE AGREEMENT

This Non-Exclusive License Agreement ("Agreement") is entered into on the date of purchase between the Producer ("Licensor") and the Buyer ("Licensee").

1. GRANT OF RIGHTS
Licensor grants Licensee a non-transferable, non-sublicensable license to use the musical composition (the "Beat") under the terms below.

2. PERMITTED USE
${terms}

3. CREDIT
Licensee agrees to credit the Producer as "Prod. by [Producer Name]" in metadata, descriptions, and liner notes wherever reasonably possible.

4. OWNERSHIP
Licensor retains all copyright and master ownership of the Beat. This license does not transfer ownership.

5. RESTRICTIONS
The Beat may not be resold, redistributed, or made available as a standalone file. Licensee may not register the Beat with any content ID system.

6. TERMINATION
This license terminates automatically upon breach. Licensor reserves the right to revoke rights for material misuse.

7. GOVERNING LAW
This Agreement shall be governed by the laws applicable to Licensor's principal place of business.

By purchasing this license, Licensee agrees to be bound by these terms.`;

export const defaultLicenses = (basePrice = 25000): License[] => [
  {
    id: "lic-basic",
    type: "basic",
    name: "Basic",
    price: Math.round(basePrice),
    files: ["MP3"],
    version: 1,
    commercialRights: "Non-profit use only",
    streamingLimit: "50,000 audio streams",
    distributionLimit: "2,500 copies",
    contract: boilerplate(
      "Basic",
      "MP3 file only. Up to 50,000 audio streams across all platforms combined. Distribution of up to 2,500 physical or digital copies. One (1) music video (up to 250,000 views). Non-monetized use on YouTube permitted with credit.",
    ),
  },
  {
    id: "lic-pro",
    type: "professional",
    name: "Professional",
    price: Math.round(basePrice * 2),
    files: ["MP3", "WAV"],
    version: 1,
    commercialRights: "Commercial use permitted",
    streamingLimit: "250,000 audio streams",
    distributionLimit: "10,000 copies",
    contract: boilerplate(
      "Professional",
      "MP3 and WAV (untagged) files. Up to 250,000 audio streams across all platforms. Distribution of up to 10,000 physical or digital copies. Unlimited monetized music videos. Live performances for profit permitted.",
    ),
  },
  {
    id: "lic-unlim",
    type: "unlimited",
    name: "Unlimited",
    price: Math.round(basePrice * 4.8),
    files: ["MP3", "WAV", "STEMS"],
    version: 1,
    commercialRights: "Full commercial rights",
    streamingLimit: "Unlimited streams",
    distributionLimit: "Unlimited copies",
    contract: boilerplate(
      "Unlimited",
      "MP3, WAV, and Track Stems (ZIP). Unlimited audio streams and unlimited distribution. Unlimited monetized videos. Full commercial rights including sync in advertising, film and TV (excluding major broadcast networks — contact Producer).",
    ),
  },
  {
    id: "lic-excl",
    type: "exclusive",
    name: "Exclusive",
    price: Math.round(basePrice * 14),
    files: ["MP3", "WAV", "STEMS"],
    version: 1,
    exclusive: true,
    isNegotiable: true,
    commercialRights: "Exclusive ownership transfer",
    streamingLimit: "Unlimited streams",
    distributionLimit: "Unlimited copies",
    contract: boilerplate(
      "Exclusive",
      "Full transfer of master rights. Beat is removed from the marketplace upon purchase and no further licenses will be sold. Buyer receives MP3, WAV and Track Stems. All commercial, sync, broadcast, and re-sale rights transfer to Buyer. Producer retains 50% publishing unless negotiated separately.",
    ),
  },
];
