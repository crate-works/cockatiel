import { MAX_SPEAKERS } from '../constants';
import type { Annotation } from '../segment-ops';
import type { ParsedTranscript } from './types';

// Reciprocal of src/lib/export/formats/eaf.ts. Reads an ELAN `.eaf` (EAF 2.x/3.x)
// into Cockatiel's flat Annotation[] model.
//
// Mapping (per the agreed v1 rules, verified against real PARADISEC .eaf files):
//   • Each TIER that carries time-aligned annotations becomes one Cockatiel speaker,
//     named from the tier's PARTICIPANT attribute (falling back to "Speaker N").
//   • Each ALIGNABLE_ANNOTATION becomes a segment; its ANNOTATION_VALUE is copied
//     verbatim (PARADISEC marks speaker changes inline as `{SPEAKER=…}` within a
//     single tier — we preserve that text rather than trying to interpret it in v1).
//   • REF_ANNOTATION / dependent tiers (translation, gloss, notes) are dropped: there
//     is nowhere to put a second layer in our one-value-per-segment model.
//   • Times are milliseconds in EAF; we store seconds.
//   • Empty-text segments are kept (valid, like VAD output).
//   • Speakers are capped at MAX_SPEAKERS; annotations from any overflow tiers are
//     folded onto the last speaker.

const textOf = (annotation: Element): string => annotation.querySelector('ANNOTATION_VALUE')?.textContent ?? '';

export const parseEaf = (xml: string): ParsedTranscript => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('Could not read the ELAN (.eaf) file: it is not valid XML.');
  }

  // TIME_SLOT_ID -> seconds
  const timeSlots = new Map<string, number>();
  for (const slot of doc.querySelectorAll('TIME_ORDER > TIME_SLOT')) {
    const id = slot.getAttribute('TIME_SLOT_ID');
    const value = slot.getAttribute('TIME_VALUE');
    if (id && value !== null) {
      timeSlots.set(id, Number(value) / 1000);
    }
  }

  const speakerNames: string[] = [];
  const segments: Annotation[] = [];

  for (const tier of doc.querySelectorAll('TIER')) {
    const alignables = tier.querySelectorAll('ALIGNABLE_ANNOTATION');
    if (alignables.length === 0) {
      // Dependent / reference-only tier (no time-aligned annotations) — skipped in v1.
      continue;
    }

    // Allocate a speaker for this tier, capped at MAX_SPEAKERS (overflow tiers fold
    // onto the last speaker).
    let speaker = speakerNames.length;
    if (speaker >= MAX_SPEAKERS) {
      speaker = MAX_SPEAKERS - 1;
    } else {
      const participant = tier.getAttribute('PARTICIPANT')?.trim();
      speakerNames.push(participant || `Speaker ${speaker + 1}`);
    }

    for (const annotation of alignables) {
      const start = timeSlots.get(annotation.getAttribute('TIME_SLOT_REF1') ?? '');
      const end = timeSlots.get(annotation.getAttribute('TIME_SLOT_REF2') ?? '');
      if (start === undefined || end === undefined || end <= start) {
        continue;
      }
      segments.push({ end, id: crypto.randomUUID(), speaker, start, value: textOf(annotation) });
    }
  }

  segments.sort((a, b) => a.start - b.start);

  return { segments, speakerNames: speakerNames.length > 0 ? speakerNames : ['Speaker 1'] };
};
