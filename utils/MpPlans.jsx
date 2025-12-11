export const MP_PLANS = {
  // FINFOCUS START
  "2c93808496a524800196a5d69d70003a": { role: "FINFOCUS_START", cycle: "monthly", type: "FINFOCUS" },
  "2c93808496a5246f0196a5d8643a0047": { role: "FINFOCUS_START", cycle: "annual",  type: "FINFOCUS" },

  // FINFOCUS
  "2c938084955cc4800195a143f9a31ebb": { role: "FINFOCUS", cycle: "monthly", type: "FINFOCUS" },
  "2c938084955cc4800195a145096d1ebc": { role: "FINFOCUS", cycle: "annual",  type: "FINFOCUS" },

  // FINFOCUS+
  "2c9380849564460a0195a145e3bd1ae3": { role: "FINFOCUS_PLUS", cycle: "monthly", type: "FINFOCUS" },
  "f12a090820d54f7da708b5e6103d7d06": { role: "FINFOCUS_PLUS", cycle: "annual",  type: "FINFOCUS" },

  // COMBOS
  "2c93808496d4b6670196d5fa1e5c00b1": { role: "FINFOCUS_PLATINO",  cycle: "monthly", type: "COMBO" },
  "2c93808496ce9c1b0196d5fd21b0036d": { role: "FINFOCUS_ADVANCED", cycle: "monthly", type: "COMBO" },

  // FINLEGAL ESENCIAL
  "2c938084965e44a001966aa7c51b0626": { role: "FINLEGAL_ESENCIAL", cycle: "monthly", type: "FINLEGAL" },
  "2c93808497f5fac301980f9ba68d09bc": { role: "FINLEGAL_ESENCIAL", cycle: "annual",  type: "FINLEGAL" },

  // FINLEGAL ESENCIAL+  → FINLEGAL_PLUS
  "2c9380849817d4bc0198194c812a0072": { role: "FINLEGAL_PLUS", cycle: "monthly", type: "FINLEGAL" },
  "2c9380849817d4a20198194d62de007f": { role: "FINLEGAL_PLUS", cycle: "annual",  type: "FINLEGAL" },

  // FINLEGAL TOTAL
  "2c9380849817d4a30198194e9c1f0076": { role: "FINLEGAL_TOTAL", cycle: "monthly", type: "FINLEGAL" },
  "2c9380849817d4a30198194de85a0074": { role: "FINLEGAL_TOTAL", cycle: "annual",  type: "FINLEGAL" }
};

export function keepThisToMakeSureExportWorks() {
  console.log("export works");
}