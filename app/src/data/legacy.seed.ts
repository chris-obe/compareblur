import type { Camera, CatalogLens } from '../lib/gear';

// Curated DSLR & film gear (focused, not exhaustive). Mounts: EF (Canon),
// F (Nikon), K (Pentax), A (Sony/Minolta), Leica M (lenses come from LensDB),
// HV (Hasselblad V 6×6), M645 (Mamiya 645), P67 (Pentax 67).
//
// Coverage note: 35mm film (film-135) is 36×24 like full frame, so full-frame
// lenses also cover a 135 film body on the same mount.

type CRow = [id: string, name: string, formatId: string];
const cams = (maker: string, mount: string, rows: CRow[]): Camera[] =>
  rows.map(([id, name, formatId]) => ({ id, name, maker, mount, formatId }));

export const LEGACY_CAMERAS: Camera[] = [
  ...cams('Canon', 'EF', [
    ['canon-5d2', 'EOS 5D Mark II', 'ff'], ['canon-5d3', 'EOS 5D Mark III', 'ff'],
    ['canon-5d4', 'EOS 5D Mark IV', 'ff'], ['canon-6d', 'EOS 6D', 'ff'],
    ['canon-6d2', 'EOS 6D Mark II', 'ff'], ['canon-1dx2', 'EOS-1D X Mark II', 'ff'],
    ['canon-5dsr', 'EOS 5DS R', 'ff'],
    ['canon-7d2', 'EOS 7D Mark II', 'apsc-canon'], ['canon-80d', 'EOS 80D', 'apsc-canon'],
    ['canon-90d', 'EOS 90D', 'apsc-canon'], ['canon-800d', 'EOS Rebel T7i / 800D', 'apsc-canon'],
    ['canon-eos1v', 'EOS-1V (film)', 'film-135'], ['canon-eos3', 'EOS 3 (film)', 'film-135'],
  ]),
  ...cams('Nikon', 'F', [
    ['nikon-d750', 'D750', 'ff'], ['nikon-d780', 'D780', 'ff'], ['nikon-d810', 'D810', 'ff'],
    ['nikon-d850', 'D850', 'ff'], ['nikon-d610', 'D610', 'ff'], ['nikon-df', 'Df', 'ff'],
    ['nikon-d6', 'D6', 'ff'],
    ['nikon-d500', 'D500', 'apsc'], ['nikon-d7500', 'D7500', 'apsc'],
    ['nikon-d5600', 'D5600', 'apsc'], ['nikon-d3500', 'D3500', 'apsc'],
    ['nikon-f6', 'F6 (film)', 'film-135'], ['nikon-f100', 'F100 (film)', 'film-135'],
    ['nikon-fm2', 'FM2 (film)', 'film-135'],
  ]),
  ...cams('Pentax', 'K', [
    ['pentax-k1', 'K-1', 'ff'], ['pentax-k1ii', 'K-1 Mark II', 'ff'],
    ['pentax-k3iii', 'K-3 Mark III', 'apsc'], ['pentax-kp', 'KP', 'apsc'], ['pentax-k70', 'K-70', 'apsc'],
    ['pentax-k1000', 'K1000 (film)', 'film-135'], ['pentax-mx', 'MX (film)', 'film-135'],
  ]),
  ...cams('Sony', 'A', [
    ['sony-a99ii', 'α99 II', 'ff'], ['sony-a77ii', 'α77 II', 'apsc'],
  ]),
  ...cams('Minolta', 'A', [
    ['minolta-maxxum7', 'Maxxum 7 (film)', 'film-135'], ['minolta-maxxum9', 'Maxxum 9 (film)', 'film-135'],
  ]),
  ...cams('Leica', 'M', [
    ['leica-m240', 'M (Typ 240)', 'ff'], ['leica-m10', 'M10', 'ff'], ['leica-m10r', 'M10-R', 'ff'],
    ['leica-m11', 'M11', 'ff'],
    ['leica-m6', 'M6 (film)', 'film-135'], ['leica-m7', 'M7 (film)', 'film-135'],
    ['leica-mp', 'MP (film)', 'film-135'],
  ]),
  ...cams('Hasselblad', 'HV', [
    ['hassel-500cm', '500C/M (film 6×6)', 'film-66'], ['hassel-503cw', '503CW (film 6×6)', 'film-66'],
  ]),
  ...cams('Mamiya', 'M645', [
    ['mamiya-645pro', '645 Pro (film)', 'film-645'], ['mamiya-645afd', '645 AFD', 'film-645'],
  ]),
  ...cams('Pentax', 'P67', [
    ['pentax-6x7', '6×7 (film)', 'film-67'], ['pentax-67ii', '67II (film)', 'film-67'],
  ]),
];

// coverage presets
const EF_FF = ['ff', 'apsc-canon', 'film-135'];
const EF_S = ['apsc-canon'];
const F_FX = ['ff', 'apsc', 'film-135'];
const F_DX = ['apsc'];
const K_FF = ['ff', 'apsc', 'film-135'];
const K_APS = ['apsc'];
const A_FF = ['ff', 'apsc', 'film-135'];

const L = (
  id: string, name: string, maker: string, mount: string, cover: string[],
  fMin: number, fMax: number, apMax: number,
  af = true, thirdParty = false,
): CatalogLens => ({
  id, name, maker, type: fMin === fMax ? 'prime' : 'zoom',
  focalMin: fMin, focalMax: fMax, apMax, apMin: fMin === fMax ? 16 : 22,
  mounts: [mount], coversFormatIds: cover, af, thirdParty,
});

export const LEGACY_LENSES: CatalogLens[] = [
  // Canon EF
  L('ef-50-18', 'EF 50mm f/1.8 STM', 'Canon', 'EF', EF_FF, 50, 50, 1.8),
  L('ef-50-14', 'EF 50mm f/1.4 USM', 'Canon', 'EF', EF_FF, 50, 50, 1.4),
  L('ef-85-18', 'EF 85mm f/1.8 USM', 'Canon', 'EF', EF_FF, 85, 85, 1.8),
  L('ef-85-12l', 'EF 85mm f/1.2L II USM', 'Canon', 'EF', EF_FF, 85, 85, 1.2),
  L('ef-35-14l', 'EF 35mm f/1.4L II USM', 'Canon', 'EF', EF_FF, 35, 35, 1.4),
  L('ef-2470l', 'EF 24-70mm f/2.8L II USM', 'Canon', 'EF', EF_FF, 24, 70, 2.8),
  L('ef-70200l', 'EF 70-200mm f/2.8L IS III', 'Canon', 'EF', EF_FF, 70, 200, 2.8),
  L('ef-100l-macro', 'EF 100mm f/2.8L Macro IS', 'Canon', 'EF', EF_FF, 100, 100, 2.8),
  L('ef-2410l', 'EF 24-105mm f/4L IS II', 'Canon', 'EF', EF_FF, 24, 105, 4),
  L('efs-1755', 'EF-S 17-55mm f/2.8 IS USM', 'Canon', 'EF', EF_S, 17, 55, 2.8),
  L('sigma-35-14-ef', 'Sigma 35mm f/1.4 DG HSM Art', 'Sigma', 'EF', EF_FF, 35, 35, 1.4, true, true),
  // Nikon F
  L('f-50-18g', 'AF-S 50mm f/1.8G', 'Nikon', 'F', F_FX, 50, 50, 1.8),
  L('f-50-14g', 'AF-S 50mm f/1.4G', 'Nikon', 'F', F_FX, 50, 50, 1.4),
  L('f-85-18g', 'AF-S 85mm f/1.8G', 'Nikon', 'F', F_FX, 85, 85, 1.8),
  L('f-85-14g', 'AF-S 85mm f/1.4G', 'Nikon', 'F', F_FX, 85, 85, 1.4),
  L('f-35-18g', 'AF-S 35mm f/1.8G ED', 'Nikon', 'F', F_FX, 35, 35, 1.8),
  L('f-2470e', 'AF-S 24-70mm f/2.8E ED VR', 'Nikon', 'F', F_FX, 24, 70, 2.8),
  L('f-70200e', 'AF-S 70-200mm f/2.8E FL', 'Nikon', 'F', F_FX, 70, 200, 2.8),
  L('f-105g-macro', 'AF-S 105mm f/2.8G Micro', 'Nikon', 'F', F_FX, 105, 105, 2.8),
  L('f-dx-35-18g', 'AF-S DX 35mm f/1.8G', 'Nikon', 'F', F_DX, 35, 35, 1.8),
  L('f-ais-50-14', 'AI-S 50mm f/1.4', 'Nikon', 'F', F_FX, 50, 50, 1.4, false),
  L('f-ais-105-25', 'AI-S 105mm f/2.5', 'Nikon', 'F', F_FX, 105, 105, 2.5, false),
  // Pentax K
  L('k-fa-50-14', 'FA 50mm f/1.4', 'Pentax', 'K', K_FF, 50, 50, 1.4),
  L('k-fa-43-19', 'FA 43mm f/1.9 Limited', 'Pentax', 'K', K_FF, 43, 43, 1.9),
  L('k-fa-77-18', 'FA 77mm f/1.8 Limited', 'Pentax', 'K', K_FF, 77, 77, 1.8),
  L('k-dfa-2470', 'D FA 24-70mm f/2.8', 'Pentax', 'K', K_FF, 24, 70, 2.8),
  L('k-da-35-24', 'DA 35mm f/2.4', 'Pentax', 'K', K_APS, 35, 35, 2.4),
  // Sony / Minolta A
  L('a-50-14', '50mm f/1.4', 'Sony', 'A', A_FF, 50, 50, 1.4),
  L('a-85-14za', '85mm f/1.4 ZA', 'Sony', 'A', A_FF, 85, 85, 1.4),
  L('a-min-50-17', 'Minolta AF 50mm f/1.7', 'Minolta', 'A', A_FF, 50, 50, 1.7),
  // Hasselblad V (6×6, manual focus)
  L('hv-80-28', 'Carl Zeiss Planar 80mm f/2.8 C', 'Hasselblad', 'HV', ['film-66'], 80, 80, 2.8, false),
  L('hv-50-4', 'Distagon 50mm f/4', 'Hasselblad', 'HV', ['film-66'], 50, 50, 4, false),
  L('hv-150-4', 'Sonnar 150mm f/4', 'Hasselblad', 'HV', ['film-66'], 150, 150, 4, false),
  // Mamiya 645
  L('m645-80-19', 'Sekor C 80mm f/1.9', 'Mamiya', 'M645', ['film-645'], 80, 80, 1.9, false),
  L('m645-55-28', 'Sekor C 55mm f/2.8', 'Mamiya', 'M645', ['film-645'], 55, 55, 2.8, false),
  L('m645-150-35', 'Sekor C 150mm f/3.5', 'Mamiya', 'M645', ['film-645'], 150, 150, 3.5, false),
  // Pentax 67
  L('p67-105-24', 'SMC Takumar 105mm f/2.4', 'Pentax', 'P67', ['film-67'], 105, 105, 2.4, false),
  L('p67-90-28', 'SMC 90mm f/2.8', 'Pentax', 'P67', ['film-67'], 90, 90, 2.8, false),
  L('p67-55-4', 'SMC 55mm f/4', 'Pentax', 'P67', ['film-67'], 55, 55, 4, false),
];
