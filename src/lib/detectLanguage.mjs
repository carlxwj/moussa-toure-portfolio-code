// English is the public default, independently of the browser/device language.
// Only an explicit EN/FR selection saved by the visitor can override it.
export function resolveLanguage(savedPreference) {
  return savedPreference === 'fr' ? 'fr' : 'en';
}
