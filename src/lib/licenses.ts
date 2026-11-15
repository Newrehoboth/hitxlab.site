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

HITXLAB BEAT MARKETPLACE – BEAT LICENSE AGREEMENT

This Agreement takes effect when the Licensee purchases the Beat from the Producer's website. By completing the purchase, the Licensee agrees to these terms.

1. LICENSE GRANTED
The Producer grants the Licensee a non-exclusive, non-transferable license to use the Beat under this Agreement. The Licensee may use the Beat to create and release new songs and other permitted works.

The Licensee may authorize distributors, streaming platforms, video platforms, and other service providers to host, distribute, publicly perform, monetize, and promote the finished song as needed to exploit it. This limited permission does not allow those services or the Licensee to distribute the Beat or stems by themselves.

2. FILES AND PERMITTED USE
The purchase includes the files identified on the product page or in the order confirmation, which may include MP3, WAV, and track stems in a ZIP file.

${terms}

Subject to the rest of this Agreement, the Licensee may:
- Release the finished song commercially and distribute it without a stream or unit limit.
- Monetize videos containing the finished song without a video limit.
- Use the finished song in commercial projects, including advertising, film, and television, except for major broadcast network placements, which require the Producer's prior written approval and may require additional terms or fees.
- Edit, mix, arrange, and add vocals or other material to the Beat to create a new finished work.

This license does not authorize the Licensee to use the Beat in a way that violates third-party rights or applicable law.

3. COMPOSITION AND PUBLISHING SHARES
The Producer and Licensee agree that the Producer is a contributor to the musical composition embodied in the Beat and any song created using it.

Unless all contributors agree otherwise in a written split sheet signed by them before the song's commercial release, the composition and publishing ownership will be divided equally among all songwriters and composers who contributed to the song, including the Producer. Each contributor's share will equal 100% divided by the number of those contributors.

For example:
- One Producer and one Artist: 50% each.
- One Producer and three Artists: 25% each.

The Licensee must ensure that registrations and royalty collection accounts accurately reflect the agreed shares and must not claim or register the Producer's share as the Licensee's own. The parties will provide accurate contributor, ownership, and royalty information to their distributors, publishers, performing rights organizations, and other relevant services.

A signed split sheet may set different percentages and will control if it clearly identifies the song, each contributor, and each contributor's percentage. The percentages on the split sheet must total 100%.

This section governs composition and publishing ownership only. It does not determine ownership or revenue shares in the master sound recording, which must be agreed separately in writing. A person who only performs on the recording does not count as a songwriter or composer for this split unless they contributed to the composition or the contributors agree in writing to include them.

4. PRODUCER CREDIT
Where reasonably possible and supported by the relevant platform or format, the Licensee will credit the Producer as:

"Prod. by [Producer Name]"

The Licensee will include the credit in release metadata, descriptions, and liner notes. If a platform provides a producer-credit field, the Licensee will use it.

5. OWNERSHIP
The Producer retains ownership of the Beat, including the Producer's rights in the original Beat recording and the musical material created by the Producer, subject to the composition shares set out in Section 3.

The Licensee retains ownership of original lyrics and other material the Licensee creates, subject to the Producer's composition and publishing share and any other contributor's agreed share.

This Agreement grants a license; it does not transfer ownership of the Beat or the master recording of the Beat to the Licensee. The parties must separately agree in writing on ownership and revenue splits for any new master recording.

6. RESTRICTIONS
The Licensee may not:
- Sell, sublicense, lease, give away, upload, or redistribute the Beat or stems as standalone files.
- Make the Beat or stems available for download by others, except for secure delivery to collaborators or service providers who need them to create, distribute, or exploit the finished song and who are bound by restrictions at least as protective as these.
- Claim sole authorship or ownership of the Beat or the Producer's composition share.
- Register the Beat or the Producer's composition share in any content identification, fingerprinting, or automated rights management system, including YouTube Content ID, in a way that could block, claim against, or monetize the Producer's own use or other authorized licensees' use.
- Use this license to prevent the Producer from licensing the Beat to other customers.

If the Licensee or its distributor mistakenly makes a prohibited registration or claim, the Licensee must promptly request its removal and cooperate with the Producer to resolve the issue.

7. SAMPLES AND THIRD-PARTY MATERIAL
The Producer will identify on the product page or in writing any samples or third-party material in the Beat that the Producer knows require clearance. Unless the parties agree otherwise in writing, the Licensee is responsible for obtaining any additional clearances required for the Licensee's intended use, including clearance for material the Licensee adds.

Neither party may knowingly release or exploit material that requires clearance until the required clearance has been obtained.

8. TERMINATION AND BREACH
If the Licensee materially breaches this Agreement, the Producer may give written notice describing the breach. The Licensee will have 10 days after receiving notice to correct a breach that can reasonably be corrected. If it is not corrected within that period, or if the breach cannot reasonably be corrected, the Producer may terminate the license by written notice.

Upon termination, the Licensee must stop making new uses of the Beat and remove or disable uses that are not permitted to continue under applicable law. Termination does not erase payment obligations, accrued royalty or accounting obligations, or composition ownership shares already established for a released song.

9. REPRESENTATIONS AND RESPONSIBILITY FOR CLAIMS
Each party represents that it has authority to agree to these terms and will not knowingly provide material that infringes another person's rights.

Each party is responsible for claims and losses to the extent they result from that party's breach of this Agreement, infringement, or unauthorized material supplied by that party.

10. GOVERNING LAW AND DISPUTES
This Agreement is governed by the laws of Nigeria, without regard to conflict-of-law rules. Any dispute will be brought in Nigerian courts, unless applicable law requires otherwise.

11. GENERAL TERMS
This Agreement, together with the purchase record and any signed split sheet, is the entire agreement concerning the Licensee's use of the Beat. Any change must be in writing and accepted by both parties.

If any provision is held unenforceable, the remaining provisions will continue to apply to the extent permitted by law. Electronic acceptance and payment records may be used to show the Licensee's agreement, subject to applicable law.

LICENSEE ACCEPTANCE
By purchasing the Beat, the Licensee confirms that they have read and agree to this Agreement.`;


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
