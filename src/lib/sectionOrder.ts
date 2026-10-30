/** Shared public section order: both the page and navigation follow this list. */
export const defaultSectionOrder = [
 'about','showreel','projects','videos','training','shootings','gallery','credits','beyond',
 'stories','testimonials','professional','contact'
] as const;

/** Upgrade an older Firestore order without overwriting the user's chosen ordering. */
export function completeSectionOrder(saved: readonly string[] | undefined, available: readonly string[] = defaultSectionOrder): string[] {
 const allowed = new Set(available);
 const result: string[] = [];
 for (const key of saved?.length ? saved : defaultSectionOrder) {
  if (allowed.has(key) && !result.includes(key)) result.push(key);
 }
 for (const key of available) {
  if (result.includes(key)) continue;
  if (key === 'showreel' && result.includes('about')) result.splice(result.indexOf('about')+1, 0, key);
  else if (key === 'training' && result.includes('videos')) result.splice(result.indexOf('videos')+1, 0, key);
  else if (key === 'shootings' && result.includes('training')) result.splice(result.indexOf('training')+1, 0, key);
  else result.push(key);
 }
 return result;
}

export function sectionAnchor(key: string): string {
 if (key === 'projects') return 'work';
 if (key.startsWith('custom:')) return `custom-${key.slice(7)}`;
 return key;
}
