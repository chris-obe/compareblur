const bodyRows = (maker, mount, formatId, rows) =>
  rows.map(([id, name]) => ({ id, name, maker, mount, formatId }));

const legacyCameraRows = (maker, mount, rows) =>
  rows.map(([id, name, formatId]) => ({ id, name, maker, mount, formatId }));

export const LEGACY_CAMERAS = [
  ...legacyCameraRows('Canon', 'EF', [
    ['canon-5d2', 'EOS 5D Mark II', 'ff'], ['canon-5d3', 'EOS 5D Mark III', 'ff'],
    ['canon-5d4', 'EOS 5D Mark IV', 'ff'], ['canon-6d', 'EOS 6D', 'ff'],
    ['canon-6d2', 'EOS 6D Mark II', 'ff'], ['canon-1dx2', 'EOS-1D X Mark II', 'ff'],
    ['canon-5dsr', 'EOS 5DS R', 'ff'],
    ['canon-7d2', 'EOS 7D Mark II', 'apsc-canon'], ['canon-80d', 'EOS 80D', 'apsc-canon'],
    ['canon-90d', 'EOS 90D', 'apsc-canon'], ['canon-800d', 'EOS Rebel T7i / 800D', 'apsc-canon'],
    ['canon-eos1v', 'EOS-1V (film)', 'film-135'], ['canon-eos3', 'EOS 3 (film)', 'film-135'],
  ]),
  ...legacyCameraRows('Nikon', 'F', [
    ['nikon-d750', 'D750', 'ff'], ['nikon-d780', 'D780', 'ff'], ['nikon-d810', 'D810', 'ff'],
    ['nikon-d850', 'D850', 'ff'], ['nikon-d610', 'D610', 'ff'], ['nikon-df', 'Df', 'ff'],
    ['nikon-d6', 'D6', 'ff'],
    ['nikon-d500', 'D500', 'apsc'], ['nikon-d7500', 'D7500', 'apsc'],
    ['nikon-d5600', 'D5600', 'apsc'], ['nikon-d3500', 'D3500', 'apsc'],
    ['nikon-f6', 'F6 (film)', 'film-135'], ['nikon-f100', 'F100 (film)', 'film-135'],
    ['nikon-fm2', 'FM2 (film)', 'film-135'],
  ]),
  ...legacyCameraRows('Pentax', 'K', [
    ['pentax-k1', 'K-1', 'ff'], ['pentax-k1ii', 'K-1 Mark II', 'ff'],
    ['pentax-k3iii', 'K-3 Mark III', 'apsc'], ['pentax-kp', 'KP', 'apsc'], ['pentax-k70', 'K-70', 'apsc'],
    ['pentax-k1000', 'K1000 (film)', 'film-135'], ['pentax-mx', 'MX (film)', 'film-135'],
  ]),
  ...legacyCameraRows('Sony', 'A', [
    ['sony-a99ii', 'α99 II', 'ff'], ['sony-a77ii', 'α77 II', 'apsc'],
  ]),
  ...legacyCameraRows('Minolta', 'A', [
    ['minolta-maxxum7', 'Maxxum 7 (film)', 'film-135'], ['minolta-maxxum9', 'Maxxum 9 (film)', 'film-135'],
  ]),
  ...legacyCameraRows('Leica', 'M', [
    ['leica-m240', 'M (Typ 240)', 'ff'], ['leica-m10', 'M10', 'ff'], ['leica-m10r', 'M10-R', 'ff'],
    ['leica-m11', 'M11', 'ff'],
    ['leica-m6', 'M6 (film)', 'film-135'], ['leica-m7', 'M7 (film)', 'film-135'],
    ['leica-mp', 'MP (film)', 'film-135'],
  ]),
  ...legacyCameraRows('Hasselblad', 'HV', [
    ['hassel-500cm', '500C/M (film 6x6)', 'film-66'], ['hassel-503cw', '503CW (film 6x6)', 'film-66'],
  ]),
  ...legacyCameraRows('Mamiya', 'M645', [
    ['mamiya-645pro', '645 Pro (film)', 'film-645'], ['mamiya-645afd', '645 AFD', 'film-645'],
  ]),
  ...legacyCameraRows('Pentax', 'P67', [
    ['pentax-6x7', '6x7 (film)', 'film-67'], ['pentax-67ii', '67II (film)', 'film-67'],
  ]),
];

export const BODY_CAMERAS = [
  ...bodyRows('Sony', 'E', 'ff', [
    ['sony-a7', 'α7'], ['sony-a7ii', 'α7 II'], ['sony-a7iii', 'α7 III'], ['sony-a7iv', 'α7 IV'],
    ['sony-a7r', 'α7R'], ['sony-a7rii', 'α7R II'], ['sony-a7riii', 'α7R III'],
    ['sony-a7riv', 'α7R IV'], ['sony-a7rv', 'α7R V'],
    ['sony-a7sii', 'α7S II'], ['sony-a7siii', 'α7S III'],
    ['sony-a9', 'α9'], ['sony-a9ii', 'α9 II'], ['sony-a9iii', 'α9 III'],
    ['sony-a1', 'α1'], ['sony-a1ii', 'α1 II'],
    ['sony-a7c', 'α7C'], ['sony-a7cii', 'α7C II'], ['sony-a7cr', 'α7C R'],
    ['sony-zve1', 'ZV-E1'], ['sony-fx3', 'FX3'],
  ]),
  ...bodyRows('Sony', 'E', 'apsc', [
    ['sony-a6100', 'α6100'], ['sony-a6300', 'α6300'], ['sony-a6400', 'α6400'],
    ['sony-a6600', 'α6600'], ['sony-a6700', 'α6700'],
    ['sony-zve10', 'ZV-E10'], ['sony-zve10ii', 'ZV-E10 II'], ['sony-fx30', 'FX30'],
  ]),
  ...bodyRows('Canon', 'RF', 'ff', [
    ['canon-eosr', 'EOS R'], ['canon-rp', 'EOS RP'], ['canon-r5', 'EOS R5'],
    ['canon-r5ii', 'EOS R5 II'], ['canon-r6', 'EOS R6'], ['canon-r6ii', 'EOS R6 II'],
    ['canon-r8', 'EOS R8'], ['canon-r3', 'EOS R3'], ['canon-r1', 'EOS R1'],
  ]),
  ...bodyRows('Canon', 'RF', 'apsc-canon', [
    ['canon-r7', 'EOS R7'], ['canon-r10', 'EOS R10'], ['canon-r50', 'EOS R50'], ['canon-r100', 'EOS R100'],
  ]),
  ...bodyRows('Nikon', 'Z', 'ff', [
    ['nikon-z5', 'Z5'], ['nikon-z5ii', 'Z5 II'], ['nikon-z6', 'Z6'], ['nikon-z6ii', 'Z6 II'],
    ['nikon-z6iii', 'Z6 III'], ['nikon-z7', 'Z7'], ['nikon-z7ii', 'Z7 II'],
    ['nikon-z8', 'Z8'], ['nikon-z9', 'Z9'], ['nikon-zf', 'Zf'],
  ]),
  ...bodyRows('Nikon', 'Z', 'apsc', [
    ['nikon-z50', 'Z50'], ['nikon-z50ii', 'Z50 II'], ['nikon-zfc', 'Z fc'], ['nikon-z30', 'Z30'],
  ]),
  ...bodyRows('Panasonic', 'L', 'ff', [
    ['pana-s1', 'Lumix S1'], ['pana-s1r', 'Lumix S1R'], ['pana-s1h', 'Lumix S1H'],
    ['pana-s5', 'Lumix S5'], ['pana-s5ii', 'Lumix S5 II'], ['pana-s5iix', 'Lumix S5 IIx'],
    ['pana-s9', 'Lumix S9'], ['pana-s1rii', 'Lumix S1R II'],
  ]),
  ...bodyRows('Leica', 'L', 'ff', [
    ['leica-sl2', 'SL2'], ['leica-sl2s', 'SL2-S'], ['leica-sl3', 'SL3'], ['leica-sl3s', 'SL3-S'],
  ]),
  ...bodyRows('Sigma', 'L', 'ff', [
    ['sigma-fp', 'fp'], ['sigma-fpl', 'fp L'],
  ]),
  ...bodyRows('Fujifilm', 'X', 'apsc', [
    ['fuji-xt2', 'X-T2'], ['fuji-xt3', 'X-T3'], ['fuji-xt4', 'X-T4'], ['fuji-xt5', 'X-T5'],
    ['fuji-xt30', 'X-T30'], ['fuji-xt30ii', 'X-T30 II'], ['fuji-xt50', 'X-T50'],
    ['fuji-xpro2', 'X-Pro2'], ['fuji-xpro3', 'X-Pro3'],
    ['fuji-xh1', 'X-H1'], ['fuji-xh2', 'X-H2'], ['fuji-xh2s', 'X-H2S'],
    ['fuji-xe4', 'X-E4'], ['fuji-xs10', 'X-S10'], ['fuji-xs20', 'X-S20'], ['fuji-xm5', 'X-M5'],
  ]),
  ...bodyRows('Fujifilm', 'G', 'gfx', [
    ['fuji-gfx50sii', 'GFX 50S II'], ['fuji-gfx100', 'GFX 100'], ['fuji-gfx100s', 'GFX 100S'],
    ['fuji-gfx100ii', 'GFX 100 II'], ['fuji-gfx100rf', 'GFX 100 RF'],
  ]),
  ...bodyRows('OM System', 'MFT', 'mft', [
    ['om-1', 'OM-1'], ['om-1ii', 'OM-1 Mark II'], ['om-5', 'OM-5'],
    ['oly-em1ii', 'E-M1 II'], ['oly-em1iii', 'E-M1 III'], ['oly-em1x', 'E-M1X'],
    ['oly-em5iii', 'E-M5 III'], ['oly-em10iv', 'E-M10 IV'], ['oly-penf', 'PEN-F'],
  ]),
  ...bodyRows('Panasonic', 'MFT', 'mft', [
    ['pana-gh5', 'Lumix GH5'], ['pana-gh5ii', 'Lumix GH5 II'], ['pana-gh6', 'Lumix GH6'],
    ['pana-gh7', 'Lumix GH7'], ['pana-g9', 'Lumix G9'], ['pana-g9ii', 'Lumix G9 II'],
    ['pana-gx9', 'Lumix GX9'], ['pana-g100', 'Lumix G100'],
  ]),
  ...LEGACY_CAMERAS,
];

const EF_FF = ['ff', 'apsc-canon', 'film-135'];
const EF_S = ['apsc-canon'];
const F_FX = ['ff', 'apsc', 'film-135'];
const F_DX = ['apsc'];
const K_FF = ['ff', 'apsc', 'film-135'];
const K_APS = ['apsc'];
const A_FF = ['ff', 'apsc', 'film-135'];

const aperturePoints = (focalMin, focalMax, apWide, apTele = apWide) =>
  focalMin === focalMax
    ? [{ focal: focalMin, maxAperture: apWide }]
    : [
        { focal: focalMin, maxAperture: apWide },
        { focal: focalMax, maxAperture: apTele },
      ];

const lens = (
  id, name, maker, mount, cover, fMin, fMax, apMax,
  af = true, thirdParty = false, apMin = fMin === fMax ? 16 : 22,
) => ({
  id,
  name,
  maker,
  type: fMin === fMax ? 'prime' : 'zoom',
  focalMin: fMin,
  focalMax: fMax,
  apMax,
  apMin,
  mounts: [mount],
  coversFormatIds: cover,
  af,
  thirdParty,
  aperturePoints: aperturePoints(fMin, fMax, apMax),
});

export const LEGACY_LENSES = [
  lens('ef-50-18', 'EF 50mm f/1.8 STM', 'Canon', 'EF', EF_FF, 50, 50, 1.8),
  lens('ef-50-14', 'EF 50mm f/1.4 USM', 'Canon', 'EF', EF_FF, 50, 50, 1.4),
  lens('ef-85-18', 'EF 85mm f/1.8 USM', 'Canon', 'EF', EF_FF, 85, 85, 1.8),
  lens('ef-85-12l', 'EF 85mm f/1.2L II USM', 'Canon', 'EF', EF_FF, 85, 85, 1.2),
  lens('ef-35-14l', 'EF 35mm f/1.4L II USM', 'Canon', 'EF', EF_FF, 35, 35, 1.4),
  lens('ef-2470l', 'EF 24-70mm f/2.8L II USM', 'Canon', 'EF', EF_FF, 24, 70, 2.8),
  lens('ef-70200l', 'EF 70-200mm f/2.8L IS III', 'Canon', 'EF', EF_FF, 70, 200, 2.8),
  lens('ef-100l-macro', 'EF 100mm f/2.8L Macro IS', 'Canon', 'EF', EF_FF, 100, 100, 2.8),
  lens('ef-2410l', 'EF 24-105mm f/4L IS II', 'Canon', 'EF', EF_FF, 24, 105, 4),
  lens('efs-1755', 'EF-S 17-55mm f/2.8 IS USM', 'Canon', 'EF', EF_S, 17, 55, 2.8),
  lens('sigma-35-14-ef', 'Sigma 35mm f/1.4 DG HSM Art', 'Sigma', 'EF', EF_FF, 35, 35, 1.4, true, true),
  lens('f-50-18g', 'AF-S 50mm f/1.8G', 'Nikon', 'F', F_FX, 50, 50, 1.8),
  lens('f-50-14g', 'AF-S 50mm f/1.4G', 'Nikon', 'F', F_FX, 50, 50, 1.4),
  lens('f-85-18g', 'AF-S 85mm f/1.8G', 'Nikon', 'F', F_FX, 85, 85, 1.8),
  lens('f-85-14g', 'AF-S 85mm f/1.4G', 'Nikon', 'F', F_FX, 85, 85, 1.4),
  lens('f-35-18g', 'AF-S 35mm f/1.8G ED', 'Nikon', 'F', F_FX, 35, 35, 1.8),
  lens('f-2470e', 'AF-S 24-70mm f/2.8E ED VR', 'Nikon', 'F', F_FX, 24, 70, 2.8),
  lens('f-70200e', 'AF-S 70-200mm f/2.8E FL', 'Nikon', 'F', F_FX, 70, 200, 2.8),
  lens('f-105g-macro', 'AF-S 105mm f/2.8G Micro', 'Nikon', 'F', F_FX, 105, 105, 2.8),
  lens('f-dx-35-18g', 'AF-S DX 35mm f/1.8G', 'Nikon', 'F', F_DX, 35, 35, 1.8),
  lens('f-ais-50-14', 'AI-S 50mm f/1.4', 'Nikon', 'F', F_FX, 50, 50, 1.4, false),
  lens('f-ais-105-25', 'AI-S 105mm f/2.5', 'Nikon', 'F', F_FX, 105, 105, 2.5, false),
  lens('k-fa-50-14', 'FA 50mm f/1.4', 'Pentax', 'K', K_FF, 50, 50, 1.4),
  lens('k-fa-43-19', 'FA 43mm f/1.9 Limited', 'Pentax', 'K', K_FF, 43, 43, 1.9),
  lens('k-fa-77-18', 'FA 77mm f/1.8 Limited', 'Pentax', 'K', K_FF, 77, 77, 1.8),
  lens('k-dfa-2470', 'D FA 24-70mm f/2.8', 'Pentax', 'K', K_FF, 24, 70, 2.8),
  lens('k-da-35-24', 'DA 35mm f/2.4', 'Pentax', 'K', K_APS, 35, 35, 2.4),
  lens('a-50-14', '50mm f/1.4', 'Sony', 'A', A_FF, 50, 50, 1.4),
  lens('a-85-14za', '85mm f/1.4 ZA', 'Sony', 'A', A_FF, 85, 85, 1.4),
  lens('a-min-50-17', 'Minolta AF 50mm f/1.7', 'Minolta', 'A', A_FF, 50, 50, 1.7),
  lens('hv-80-28', 'Carl Zeiss Planar 80mm f/2.8 C', 'Hasselblad', 'HV', ['film-66'], 80, 80, 2.8, false),
  lens('hv-50-4', 'Distagon 50mm f/4', 'Hasselblad', 'HV', ['film-66'], 50, 50, 4, false),
  lens('hv-150-4', 'Sonnar 150mm f/4', 'Hasselblad', 'HV', ['film-66'], 150, 150, 4, false),
  lens('m645-80-19', 'Sekor C 80mm f/1.9', 'Mamiya', 'M645', ['film-645'], 80, 80, 1.9, false),
  lens('m645-55-28', 'Sekor C 55mm f/2.8', 'Mamiya', 'M645', ['film-645'], 55, 55, 2.8, false),
  lens('m645-150-35', 'Sekor C 150mm f/3.5', 'Mamiya', 'M645', ['film-645'], 150, 150, 3.5, false),
  lens('p67-105-24', 'SMC Takumar 105mm f/2.4', 'Pentax', 'P67', ['film-67'], 105, 105, 2.4, false),
  lens('p67-90-28', 'SMC 90mm f/2.8', 'Pentax', 'P67', ['film-67'], 90, 90, 2.8, false),
  lens('p67-55-4', 'SMC 55mm f/4', 'Pentax', 'P67', ['film-67'], 55, 55, 4, false),
];

export const GF_LENSES = [
  lens('gf-63-28', 'GF 63mm F2.8 R WR', 'Fujifilm', 'G', ['gfx'], 63, 63, 2.8, true, false, 32),
  lens('gf-110-2', 'GF 110mm F2 R LM WR', 'Fujifilm', 'G', ['gfx'], 110, 110, 2, true, false, 22),
  lens('gf-3264-4', 'GF 32-64mm F4 R LM WR', 'Fujifilm', 'G', ['gfx'], 32, 64, 4, true, false, 32),
  lens('gf-250-4', 'GF 250mm F4 R LM OIS WR', 'Fujifilm', 'G', ['gfx'], 250, 250, 4, true, false, 32),
];

export const CURATED_LENSES = [
  ...GF_LENSES,
  ...LEGACY_LENSES,
];
