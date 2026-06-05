import { dictionary } from "cmu-pronouncing-dictionary";
import type { RhymeMatch } from "@/lib/types";

export const RHYME_MATCH_VERSION = 17;

const MAX_VARIANT_COMBINATIONS = 64;
const VOWEL_RE = /^(AA|AE|AH|AO|AW|AY|EH|ER|EY|IH|IY|OW|OY|UH|UW)[0-2]?$/;

const LOCAL_PRONUNCIATIONS: Record<string, string[]> = {
  // Domain/common-speech variants that CMUdict omits or models unusually.
  bmw: ["B IY1 EH1 M D AH1 B AH0 L Y UW1"],
  gmc: ["JH IY1 EH1 M S IY1"],
  kia: ["K IY1 AH0"],
  polestar: ["P OW1 L S T AA2 R"],
  rivian: ["R IH1 V IY0 AH0 N"],
  ya: ["Y AH0"],
};

export function isCurrentRhymeMatch(match: RhymeMatch | undefined): match is RhymeMatch {
  return match?.algorithmVersion === RHYME_MATCH_VERSION;
}

export function scoreRhymeMatch(manufacturer: string, phrase: string): RhymeMatch {
  const manufacturerWords = getWords(manufacturer);
  const phraseWords = getWords(phrase);
  const manufacturerDisplay = cleanDisplayText(manufacturer);
  const phraseDisplay = cleanDisplayText(phrase);

  if (manufacturerWords.length === 0 || phraseWords.length === 0) {
    return unknownMatch([]);
  }

  const referencePhrase = `When you're driving in your ${manufacturerDisplay}`;
  const submittedPhrase = formatSubmittedRhymeHalf(phraseDisplay);
  const referenceWords = getWords(referencePhrase);
  const submittedWords = getWords(submittedPhrase);
  const referencePronunciation = pronounceWordVariants(referenceWords);
  const referenceRhymePronunciation = pronounceWordVariants(getRhymeWindowWords(manufacturerWords));

  if (referencePronunciation.unknownWords.length > 0) {
    return unknownMatch(referencePronunciation.unknownWords, referencePhrase, submittedPhrase);
  }
  if (referenceRhymePronunciation.unknownWords.length > 0) {
    return unknownMatch(referenceRhymePronunciation.unknownWords, referencePhrase, submittedPhrase);
  }

  const submittedPronunciation = pronounceWordVariants(submittedWords);
  const submittedRhymePronunciation = pronounceWordVariants(getRhymeWindowWords(submittedWords));
  const referenceSyllables = countSyllables(referencePronunciation.variants[0] ?? []);

  const unknownWords = Array.from(
    new Set([...submittedPronunciation.unknownWords, ...submittedRhymePronunciation.unknownWords])
  );

  if (unknownWords.length > 0) {
    return {
      algorithmVersion: RHYME_MATCH_VERSION,
      status: "partial",
      percent: null,
      phraseRhymePercent: null,
      flowPercent: null,
      referencePhrase,
      submittedPhrase,
      referenceSyllables,
      phraseSyllables: null,
      unknownWords,
    };
  }

  const phraseSyllables = countSyllables(submittedPronunciation.variants[0] ?? []);
  const phraseRhymePercent = scoreBestPhraseRhyme(
    referenceRhymePronunciation.variants,
    submittedRhymePronunciation.variants
  );
  const flowPercent = scoreFlow(referenceSyllables, phraseSyllables);
  const percent = scoreOverallMatch(phraseRhymePercent, flowPercent);

  return {
    algorithmVersion: RHYME_MATCH_VERSION,
    status: "scored",
    percent,
    phraseRhymePercent,
    flowPercent,
    referencePhrase,
    submittedPhrase,
    referenceSyllables,
    phraseSyllables,
    unknownWords: [],
  };
}

function pronounceWordVariants(words: string[]): { variants: string[][]; unknownWords: string[] } {
  let variants: string[][] = [[]];
  const unknownWords: string[] = [];

  for (const word of words) {
    const wordVariants = getPronunciationVariants(word);
    if (wordVariants.length === 0) {
      unknownWords.push(word);
      continue;
    }

    variants = variants.flatMap((phrase) =>
      wordVariants.map((wordPronunciation) => [...phrase, ...wordPronunciation])
    );
    if (variants.length > MAX_VARIANT_COMBINATIONS) {
      variants = variants.slice(0, MAX_VARIANT_COMBINATIONS);
    }
  }

  return { variants, unknownWords };
}

function getRhymeWindowWords(words: string[]): string[] {
  if (words.length <= 1) return words;

  const lastWord = words[words.length - 1];
  const lastWordVariants = getPronunciationVariants(lastWord);
  const hasUnstressedFinalPronunciation = lastWordVariants.some(
    (variant) => !hasStressedVowel(variant)
  );

  return hasUnstressedFinalPronunciation ? words.slice(-2) : words.slice(-1);
}

function getPronunciationVariants(word: string): string[][] {
  const normalized = normalizeWord(word);
  if (!normalized) return [];

  const pronunciations = new Set<string>();
  for (const pronunciation of LOCAL_PRONUNCIATIONS[normalized] ?? []) {
    pronunciations.add(pronunciation);
  }
  for (const key of getDictionaryKeys(normalized)) {
    const pronunciation = dictionary[key];
    if (pronunciation) pronunciations.add(pronunciation);
  }

  return Array.from(pronunciations, splitPronunciation);
}

function getDictionaryKeys(word: string): string[] {
  return [word, ...Array.from({ length: 8 }, (_, index) => `${word}(${index + 1})`)];
}

function splitPronunciation(pronunciation: string): string[] {
  return pronunciation.replace(/\s+#.*$/, "").split(/\s+/).filter(Boolean);
}

function scoreBestPhraseRhyme(leftVariants: string[][], rightVariants: string[][]): number {
  let best = 0;
  for (const left of leftVariants) {
    for (const right of rightVariants) {
      best = Math.max(best, scorePhraseRhyme(left, right));
    }
  }
  return best;
}

function scorePhraseRhyme(left: string[], right: string[]): number {
  const leftRegions = getRhymeRegions(left).map((region) => region.map(stripStress));
  const rightRegions = getRhymeRegions(right).map((region) => region.map(stripStress));
  const leftTerminalRegion = getTerminalVowelRegion(left);
  const rightTerminalRegion = getTerminalVowelRegion(right);

  let best = 0;

  for (const leftRegion of leftRegions) {
    for (const rightRegion of rightRegions) {
      best = Math.max(best, scoreRhymeRegions(leftRegion, rightRegion));
    }
  }

  best = Math.max(best, scoreTerminalRhymeRegions(leftTerminalRegion, rightTerminalRegion));

  return best;
}

function scoreRhymeRegions(leftRegion: string[], rightRegion: string[]): number {
  if (leftRegion.length === 0 || rightRegion.length === 0) return 0;
  if (sameSequence(leftRegion, rightRegion)) return 100;

  const leftAnchor = leftRegion[0];
  const rightAnchor = rightRegion[0];
  const leftRest = leftRegion.slice(1);
  const rightRest = rightRegion.slice(1);
  const postAnchorVowelScore = scorePostAnchorVowels(leftRest, rightRest);
  const consonantScore = scoreConsonants(leftRest, rightRest);

  if (leftAnchor === rightAnchor) {
    if (postAnchorVowelScore > 0) {
      return Math.round(55 + postAnchorVowelScore * 0.25 + consonantScore * 0.1);
    }

    if (consonantScore >= 75) return 65;
    if (consonantScore >= 50) return 45;
  }

  return 0;
}

function scoreTerminalRhymeRegions(leftRegion: string[], rightRegion: string[]): number {
  if (leftRegion.length === 0 || rightRegion.length === 0) return 0;
  if (leftRegion.length > 3 || rightRegion.length > 3) return 0;
  if (isStressedVowel(leftRegion[0]) && isStressedVowel(rightRegion[0])) return 0;

  const strippedLeft = leftRegion.map(stripStress);
  const strippedRight = rightRegion.map(stripStress);
  const leftAnchor = strippedLeft[0];
  const rightAnchor = strippedRight[0];
  const consonantScore = scoreConsonants(strippedLeft.slice(1), strippedRight.slice(1));

  if (leftAnchor === rightAnchor) {
    if (sameSequence(strippedLeft, strippedRight)) return 85;
    if (consonantScore >= 75) return 60;
    if (consonantScore >= 50) return 45;
  }

  return 0;
}

function scorePostAnchorVowels(left: string[], right: string[]): number {
  const leftVowels = left.filter(isVowelPhoneme);
  const rightVowels = right.filter(isVowelPhoneme);

  if (leftVowels.length === 0 && rightVowels.length === 0) return 0;
  return scorePhonemeSimilarity(leftVowels, rightVowels);
}

function scoreConsonants(left: string[], right: string[]): number {
  return scorePhonemeSimilarity(
    left.filter((phoneme) => !isVowelPhoneme(phoneme)),
    right.filter((phoneme) => !isVowelPhoneme(phoneme))
  );
}

function scorePhonemeSimilarity(left: string[], right: string[]): number {
  if (left.length === 0 && right.length === 0) return 100;

  const maxLength = Math.max(left.length, right.length);
  if (maxLength === 0) return 100;

  const distance = levenshteinDistance(left, right);
  return Math.max(0, Math.round((1 - distance / maxLength) * 100));
}

function scoreFlow(referenceSyllables: number, phraseSyllables: number): number {
  if (referenceSyllables === 0 || phraseSyllables === 0) return 0;

  const difference = Math.abs(referenceSyllables - phraseSyllables);
  if (difference === 0) return 100;
  if (difference === 1) return 82;
  if (difference === 2) return 64;
  if (difference === 3) return 46;
  return Math.max(10, 46 - (difference - 3) * 18);
}

function scoreOverallMatch(phraseRhymePercent: number, flowPercent: number): number {
  if (phraseRhymePercent < 40) return phraseRhymePercent;

  const flowMultiplier = 0.5 + (flowPercent / 100) * 0.5;
  return Math.round(phraseRhymePercent * flowMultiplier);
}

function getRhymeRegions(phonemes: string[]): string[][] {
  const stressRegions = findStressedVowelIndexes(phonemes).map((index) => phonemes.slice(index));
  if (stressRegions.length > 0) return dedupeSequences(stressRegions);

  const lastVowel = findLastVowelIndex(phonemes);
  return lastVowel >= 0 ? [phonemes.slice(lastVowel)] : [];
}

function getTerminalVowelRegion(phonemes: string[]): string[] {
  const lastVowel = findLastVowelIndex(phonemes);
  return lastVowel >= 0 ? phonemes.slice(lastVowel) : [];
}

function findStressedVowelIndexes(phonemes: string[]): number[] {
  return phonemes.reduce<number[]>((indexes, phoneme, index) => {
    if (isVowelPhoneme(phoneme) && (phoneme.endsWith("1") || phoneme.endsWith("2"))) {
      indexes.push(index);
    }
    return indexes;
  }, []);
}

function hasStressedVowel(phonemes: string[]): boolean {
  return phonemes.some(
    (phoneme) => isStressedVowel(phoneme)
  );
}

function isStressedVowel(phoneme: string): boolean {
  return isVowelPhoneme(phoneme) && (phoneme.endsWith("1") || phoneme.endsWith("2"));
}

function dedupeSequences(sequences: string[][]): string[][] {
  const seen = new Set<string>();
  const unique: string[][] = [];

  for (const sequence of sequences) {
    const key = sequence.join(" ");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(sequence);
    }
  }

  return unique;
}

function findLastVowelIndex(phonemes: string[], stress?: "0" | "1" | "2"): number {
  for (let index = phonemes.length - 1; index >= 0; index -= 1) {
    const phoneme = phonemes[index];
    if (isVowelPhoneme(phoneme) && (!stress || phoneme.endsWith(stress))) {
      return index;
    }
  }
  return -1;
}

function countSyllables(phonemes: string[]): number {
  return phonemes.filter(isVowelPhoneme).length;
}

function getWords(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/&/g, " and ")
    .split(/[^a-z0-9']+/)
    .map(normalizeWord)
    .filter(Boolean);
}

function cleanDisplayText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function formatSubmittedRhymeHalf(feeling: string): string {
  return /^and\b/i.test(feeling) ? feeling : `and ${feeling}`;
}

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/^'+|'+$/g, "");
}

function isVowelPhoneme(phoneme: string): boolean {
  return VOWEL_RE.test(phoneme);
}

function stripStress(phoneme: string): string {
  return phoneme.replace(/[0-2]$/, "");
}

function sameSequence(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function levenshteinDistance(left: string[], right: string[]): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const current = [leftIndex + 1];

    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex] === right[rightIndex] ? 0 : 1;
      current[rightIndex + 1] = Math.min(
        current[rightIndex] + 1,
        previous[rightIndex + 1] + 1,
        previous[rightIndex] + substitutionCost
      );
    }

    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function unknownMatch(
  unknownWords: string[],
  referencePhrase: string | null = null,
  submittedPhrase: string | null = null
): RhymeMatch {
  return {
    algorithmVersion: RHYME_MATCH_VERSION,
    status: "unknown",
    percent: null,
    phraseRhymePercent: null,
    flowPercent: null,
    referencePhrase,
    submittedPhrase,
    referenceSyllables: null,
    phraseSyllables: null,
    unknownWords,
  };
}
