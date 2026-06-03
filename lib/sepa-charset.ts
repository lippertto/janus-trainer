/**
 * SEPA character set sanitization.
 *
 * The EPC217-08 SEPA basic character set allows only:
 *   a-z  A-Z  0-9  space  / - ? : ( ) . , ' +
 *
 * German banks (and most European banks) reject or mangle SEPA files that
 * contain characters outside this set. This module provides a transliteration
 * function so that common extended Latin characters (umlauts, accented letters)
 * are mapped to their closest SEPA-safe equivalents before the XML is emitted.
 */

const SEPA_ALLOWED = /^[a-zA-Z0-9 /\-?:().,'+]*$/;

/**
 * Transliteration table for extended Latin characters to the EPC217-08 SEPA basic character set.
 *
 * German umlauts follow the ae/oe/ue convention (e.g. Ö -> Oe, ä -> ae).
 * All other accented Latin letters map to their unaccented base letter.
 * Characters with no mapping are silently dropped.
 */
const TRANSLITERATION_MAP: Record<string, string> = {
  // German umlauts and sharp-s
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  Ä: 'Ae',
  Ö: 'Oe',
  Ü: 'Ue',
  ß: 'ss',
  // Accented A
  à: 'a',
  á: 'a',
  â: 'a',
  ã: 'a',
  å: 'a',
  À: 'A',
  Á: 'A',
  Â: 'A',
  Ã: 'A',
  Å: 'A',
  // AE ligature
  æ: 'ae',
  Æ: 'AE',
  // C-cedilla
  ç: 'c',
  Ç: 'C',
  // Accented E
  è: 'e',
  é: 'e',
  ê: 'e',
  ë: 'e',
  È: 'E',
  É: 'E',
  Ê: 'E',
  Ë: 'E',
  // Accented I
  ì: 'i',
  í: 'i',
  î: 'i',
  ï: 'i',
  Ì: 'I',
  Í: 'I',
  Î: 'I',
  Ï: 'I',
  // Eth
  ð: 'd',
  Ð: 'D',
  // N-tilde
  ñ: 'n',
  Ñ: 'N',
  // Accented O
  ò: 'o',
  ó: 'o',
  ô: 'o',
  õ: 'o',
  ø: 'o',
  Ò: 'O',
  Ó: 'O',
  Ô: 'O',
  Õ: 'O',
  Ø: 'O',
  // Accented U
  ù: 'u',
  ú: 'u',
  û: 'u',
  Ù: 'U',
  Ú: 'U',
  Û: 'U',
  // Accented Y
  ý: 'y',
  ÿ: 'y',
  Ý: 'Y',
  // Thorn
  þ: 'th',
  Þ: 'TH',
};

/**
 * Sanitize a string to the EPC217-08 SEPA basic character set.
 *
 * Transliterates known extended Latin characters (umlauts, accented letters)
 * to their closest SEPA-safe equivalents. Any remaining characters outside the
 * allowed set are silently dropped. Multiple consecutive spaces are collapsed
 * and leading/trailing spaces are trimmed.
 *
 * Use this function on all party names and remittance information before
 * passing them to the SEPA XML writer.
 */
export function sanitizeSepa(value: string): string {
  let result = '';
  for (const ch of value) {
    if (SEPA_ALLOWED.test(ch)) {
      result += ch;
    } else {
      const mapped = TRANSLITERATION_MAP[ch];
      if (mapped !== undefined) {
        result += mapped;
      }
      // else: character has no SEPA equivalent, drop it silently
    }
  }
  // Collapse multiple spaces and trim
  return result.replace(/ {2,}/g, ' ').trim();
}
