import type { Camera } from '../lib/gear';
import { LEGACY_CAMERAS } from './legacy.seed';

// Mirrorless camera bodies, curated. Scoped to the mounts our (mirrorless)
// LensDB catalog covers, so every body has real lenses available. Each carries
// a mount + an engine formatId (which supplies the crop factor). DSLR/film
// bodies are intentionally excluded — they'd show no lenses here.

type Row = [id: string, name: string];
const make = (maker: string, mount: string, formatId: string, rows: Row[]): Camera[] =>
  rows.map(([id, name]) => ({ id, name, maker, mount, formatId }));

export const CAMERAS: Camera[] = [
  // Sony E — full frame
  ...make('Sony', 'E', 'ff', [
    ['sony-a7', 'α7'], ['sony-a7ii', 'α7 II'], ['sony-a7iii', 'α7 III'], ['sony-a7iv', 'α7 IV'],
    ['sony-a7r', 'α7R'], ['sony-a7rii', 'α7R II'], ['sony-a7riii', 'α7R III'],
    ['sony-a7riv', 'α7R IV'], ['sony-a7rv', 'α7R V'],
    ['sony-a7sii', 'α7S II'], ['sony-a7siii', 'α7S III'],
    ['sony-a9', 'α9'], ['sony-a9ii', 'α9 II'], ['sony-a9iii', 'α9 III'],
    ['sony-a1', 'α1'], ['sony-a1ii', 'α1 II'],
    ['sony-a7c', 'α7C'], ['sony-a7cii', 'α7C II'], ['sony-a7cr', 'α7C R'],
    ['sony-zve1', 'ZV-E1'], ['sony-fx3', 'FX3'],
  ]),
  // Sony E — APS-C
  ...make('Sony', 'E', 'apsc', [
    ['sony-a6100', 'α6100'], ['sony-a6300', 'α6300'], ['sony-a6400', 'α6400'],
    ['sony-a6600', 'α6600'], ['sony-a6700', 'α6700'],
    ['sony-zve10', 'ZV-E10'], ['sony-zve10ii', 'ZV-E10 II'], ['sony-fx30', 'FX30'],
  ]),

  // Canon RF — full frame
  ...make('Canon', 'RF', 'ff', [
    ['canon-eosr', 'EOS R'], ['canon-rp', 'EOS RP'], ['canon-r5', 'EOS R5'],
    ['canon-r5ii', 'EOS R5 II'], ['canon-r6', 'EOS R6'], ['canon-r6ii', 'EOS R6 II'],
    ['canon-r8', 'EOS R8'], ['canon-r3', 'EOS R3'], ['canon-r1', 'EOS R1'],
  ]),
  // Canon RF — APS-C
  ...make('Canon', 'RF', 'apsc-canon', [
    ['canon-r7', 'EOS R7'], ['canon-r10', 'EOS R10'], ['canon-r50', 'EOS R50'], ['canon-r100', 'EOS R100'],
  ]),

  // Nikon Z — full frame
  ...make('Nikon', 'Z', 'ff', [
    ['nikon-z5', 'Z5'], ['nikon-z5ii', 'Z5 II'], ['nikon-z6', 'Z6'], ['nikon-z6ii', 'Z6 II'],
    ['nikon-z6iii', 'Z6 III'], ['nikon-z7', 'Z7'], ['nikon-z7ii', 'Z7 II'],
    ['nikon-z8', 'Z8'], ['nikon-z9', 'Z9'], ['nikon-zf', 'Zf'],
  ]),
  // Nikon Z — APS-C
  ...make('Nikon', 'Z', 'apsc', [
    ['nikon-z50', 'Z50'], ['nikon-z50ii', 'Z50 II'], ['nikon-zfc', 'Z fc'], ['nikon-z30', 'Z30'],
  ]),

  // L-mount — full frame
  ...make('Panasonic', 'L', 'ff', [
    ['pana-s1', 'Lumix S1'], ['pana-s1r', 'Lumix S1R'], ['pana-s1h', 'Lumix S1H'],
    ['pana-s5', 'Lumix S5'], ['pana-s5ii', 'Lumix S5 II'], ['pana-s5iix', 'Lumix S5 IIx'],
    ['pana-s9', 'Lumix S9'], ['pana-s1rii', 'Lumix S1R II'],
  ]),
  ...make('Leica', 'L', 'ff', [
    ['leica-sl2', 'SL2'], ['leica-sl2s', 'SL2-S'], ['leica-sl3', 'SL3'], ['leica-sl3s', 'SL3-S'],
  ]),
  ...make('Sigma', 'L', 'ff', [
    ['sigma-fp', 'fp'], ['sigma-fpl', 'fp L'],
  ]),

  // Fujifilm X — APS-C
  ...make('Fujifilm', 'X', 'apsc', [
    ['fuji-xt2', 'X-T2'], ['fuji-xt3', 'X-T3'], ['fuji-xt4', 'X-T4'], ['fuji-xt5', 'X-T5'],
    ['fuji-xt30', 'X-T30'], ['fuji-xt30ii', 'X-T30 II'], ['fuji-xt50', 'X-T50'],
    ['fuji-xpro2', 'X-Pro2'], ['fuji-xpro3', 'X-Pro3'],
    ['fuji-xh1', 'X-H1'], ['fuji-xh2', 'X-H2'], ['fuji-xh2s', 'X-H2S'],
    ['fuji-xe4', 'X-E4'], ['fuji-xs10', 'X-S10'], ['fuji-xs20', 'X-S20'], ['fuji-xm5', 'X-M5'],
  ]),
  // Fujifilm GFX — medium format
  ...make('Fujifilm', 'G', 'gfx', [
    ['fuji-gfx50sii', 'GFX 50S II'], ['fuji-gfx100', 'GFX 100'], ['fuji-gfx100s', 'GFX 100S'],
    ['fuji-gfx100ii', 'GFX 100 II'], ['fuji-gfx100rf', 'GFX 100 RF'],
  ]),

  // Micro Four Thirds
  ...make('OM System', 'MFT', 'mft', [
    ['om-1', 'OM-1'], ['om-1ii', 'OM-1 Mark II'], ['om-5', 'OM-5'],
    ['oly-em1ii', 'E-M1 II'], ['oly-em1iii', 'E-M1 III'], ['oly-em1x', 'E-M1X'],
    ['oly-em5iii', 'E-M5 III'], ['oly-em10iv', 'E-M10 IV'], ['oly-penf', 'PEN-F'],
  ]),
  ...make('Panasonic', 'MFT', 'mft', [
    ['pana-gh5', 'Lumix GH5'], ['pana-gh5ii', 'Lumix GH5 II'], ['pana-gh6', 'Lumix GH6'],
    ['pana-gh7', 'Lumix GH7'], ['pana-g9', 'Lumix G9'], ['pana-g9ii', 'Lumix G9 II'],
    ['pana-gx9', 'Lumix GX9'], ['pana-g100', 'Lumix G100'],
  ]),

  // DSLR & film bodies (curated)
  ...LEGACY_CAMERAS,
];
