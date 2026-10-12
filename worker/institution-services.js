/**
 * Which publisher platforms a reader's library subscribes to.
 *
 * Each platform in the catalogue is probed with the same providers, in the
 * same order, as `/access`: GetFTR with a paywalled DOI from that platform,
 * then the library's link resolver with the ISSN and year of one of its
 * journals. The catalogue already knows the journal, so Crossref is not asked.
 * A platform is listed when its probe is entitled; the list describes the
 * library and is informative only, the per-paper answer stays with `/access`.
 */

import {
  INSTITUTION_RESOLVERS,
  InstitutionAccessError,
  askGetFtr,
  askResolver,
} from './institution-access.js';

export const INSTITUTION_SERVICES_PATH = '/institution/services';

// One deadline for every probe together. Fourteen platforms at up to two
// requests each must not run past the browser's wait, and a probe cut short
// is reported as `partial` rather than as a platform the library lacks.
const SERVICES_DEADLINE_MS = 12000;
const PROBE_CONCURRENCY = 4;
const FAILED = Symbol('failed');
const UNCHECKED = Symbol('unchecked');

// `color` and `monogram` are brand data for the tile the client draws; the
// publishers' logos and favicons are trademarks and are not fetched.
// `issn` and `year` name a flagship journal for the resolver, `doi` a
// paywalled article of it for GetFTR; none of the three leaves the Worker.
// The DOI must stay closed: GetFTR says yes to open content for anyone, which
// would list the platform for every library. Each was closed in Unpaywall
// (`is_oa: false`) and matched its ISSN and year in Crossref on 2026-10-13.
// ScienceDirect uses the Journal of Alloys and Compounds rather than Cell,
// whose open archive frees every article after a year.
// `packageHint` is the word a library's own package for the platform carries
// ("Wiley Online Library All Journals"): a package without it is an
// aggregator's (ProQuest, EBSCO), and the row says so.
export const SERVICE_CATALOGUE = Object.freeze([
  { id: 'sciencedirect', packageHint: 'ScienceDirect', name: 'ScienceDirect', publisher: 'Elsevier', url: 'https://www.sciencedirect.com', monogram: 'SD', color: '#FF6C00', issn: '0925-8388', year: 2021, doi: '10.1016/j.jallcom.2021.161513' },
  { id: 'nature', packageHint: 'Nature', name: 'Nature', publisher: 'Springer Nature', url: 'https://www.nature.com', monogram: 'N', color: '#1C1C1C', issn: '0028-0836', year: 2020, doi: '10.1038/s41586-020-2782-y' },
  { id: 'springerlink', packageHint: 'SpringerLink', name: 'SpringerLink', publisher: 'Springer Nature', url: 'https://link.springer.com', monogram: 'SL', color: '#2B5E9B', issn: '0022-2461', year: 2021, doi: '10.1007/s10853-021-06462-4' },
  { id: 'wiley', packageHint: 'Wiley', name: 'Wiley Online Library', publisher: 'Wiley', url: 'https://onlinelibrary.wiley.com', monogram: 'W', color: '#1F3F77', issn: '1521-4095', year: 2021, doi: '10.1002/adma.202100824' },
  { id: 'acs', packageHint: 'American Chemical Society', name: 'ACS Publications', publisher: 'American Chemical Society', url: 'https://pubs.acs.org', monogram: 'ACS', color: '#1F4E79', issn: '0002-7863', year: 2021, doi: '10.1021/jacs.1c00601' },
  { id: 'ieee', packageHint: 'IEEE', name: 'IEEE Xplore', publisher: 'IEEE', url: 'https://ieeexplore.ieee.org', monogram: 'IEEE', color: '#00629B', issn: '0018-9219', year: 2021, doi: '10.1109/jproc.2021.3107494' },
  { id: 'tandf', packageHint: 'Taylor', name: 'Taylor & Francis Online', publisher: 'Taylor & Francis', url: 'https://www.tandfonline.com', monogram: 'T&F', color: '#0A5485', issn: '0020-7179', year: 2021, doi: '10.1080/00207179.2021.1910863' },
  { id: 'sage', packageHint: 'SAGE', name: 'SAGE Journals', publisher: 'SAGE', url: 'https://journals.sagepub.com', monogram: 'SAGE', color: '#1D6E5B', issn: '0049-1241', year: 2013, doi: '10.1177/0049124113500475' },
  { id: 'oup', packageHint: 'Oxford', name: 'Oxford Academic', publisher: 'Oxford University Press', url: 'https://academic.oup.com', monogram: 'OUP', color: '#002147', issn: '0033-5533', year: 2021, doi: '10.1093/qje/qjab022' },
  { id: 'science', packageHint: 'AAAS', name: 'Science', publisher: 'AAAS', url: 'https://www.science.org', monogram: 'Sci', color: '#B3252E', issn: '0036-8075', year: 2020, doi: '10.1126/science.abd8911' },
  { id: 'aps', packageHint: 'American Physical Society', name: 'APS Journals', publisher: 'American Physical Society', url: 'https://journals.aps.org', monogram: 'APS', color: '#1C3F74', issn: '0031-9007', year: 2021, doi: '10.1103/physrevlett.127.134301' },
  { id: 'cambridge', packageHint: 'Cambridge', name: 'Cambridge Core', publisher: 'Cambridge University Press', url: 'https://www.cambridge.org/core', monogram: 'CUP', color: '#D62E2E', issn: '0022-1120', year: 2021, doi: '10.1017/jfm.2021.143' },
  { id: 'rsc', packageHint: 'Royal Society of Chemistry', name: 'RSC Publishing', publisher: 'Royal Society of Chemistry', url: 'https://pubs.rsc.org', monogram: 'RSC', color: '#0B6E8F', issn: '1463-9076', year: 2021, doi: '10.1039/d1cp02473f' },
  { id: 'iop', packageHint: 'Institute of Physics', name: 'IOPscience', publisher: 'IOP Publishing', url: 'https://iopscience.iop.org', monogram: 'IOP', color: '#1D3C78', issn: '0953-8984', year: 2021, doi: '10.1088/1361-648x/ac1d6e' },
].map(entry => Object.freeze(entry)));

/** Whether a package name is the platform's or its publisher's own. */
function namesPlatform(packageName, entry) {
  return String(packageName || '').toLowerCase().includes(entry.packageHint.toLowerCase());
}

/**
 * `{ collection, ownPlatform }` when the library subscribes (a null collection
 * when GetFTR said so), null when it does not, and UNCHECKED when a provider
 * answered without deciding (GetFTR's `maybe`, say) and none other is left.
 * Throws when no provider could answer, so the caller can report the list as
 * partial.
 */
async function probe(entry, { resolver, getFtr, entityId, rorId, env, fetchImpl, signal }) {
  if (getFtr) {
    let verdict = null;
    try {
      verdict = await askGetFtr({ doi: entry.doi, entityId, rorId }, env, fetchImpl, signal);
    } catch (error) {
      if (!resolver) throw error;
    }
    if (verdict) return verdict.status === 'entitled' ? { collection: null, ownPlatform: true } : null;
    if (!resolver) return UNCHECKED;
  }
  const answer = await askResolver(resolver, entry.issn, entry.year, fetchImpl, signal);
  if (!answer) throw new Error('unreadable resolver answer');
  // A free service is open access, which says nothing about the library. Among
  // the paid ones, the publisher's own package outranks an aggregator's: the
  // USAL lists Nature under a ProQuest collection before its "Nature" package,
  // and the row should name the package that is really the platform.
  const paid = answer.services.filter(service => service.url && !service.free);
  const own = paid.find(service => namesPlatform(service.name, entry));
  const subscription = own || paid[0];
  return subscription ? { collection: subscription.name, ownPlatform: Boolean(own) } : null;
}

export async function lookupInstitutionServices(
  { domain, entityId = null, rorId = null },
  { fetchImpl = (...args) => fetch(...args), env = {}, now = Date.now } = {},
) {
  const resolver = Object.hasOwn(INSTITUTION_RESOLVERS, domain) ? INSTITUTION_RESOLVERS[domain] : null;
  const getFtr = Boolean(env.GETFTR_API_KEY) && Boolean(entityId || rorId);
  if (!resolver && !getFtr) throw new InstitutionAccessError('INSTITUTION_NOT_SUPPORTED', 404);
  const context = { resolver, getFtr, entityId, rorId, env, fetchImpl, signal: AbortSignal.timeout(SERVICES_DEADLINE_MS) };

  const outcomes = new Array(SERVICE_CATALOGUE.length);
  let next = 0;
  const drain = async () => {
    while (next < SERVICE_CATALOGUE.length) {
      const index = next++;
      outcomes[index] = await probe(SERVICE_CATALOGUE[index], context).catch(() => FAILED);
    }
  };
  await Promise.all(Array.from({ length: PROBE_CONCURRENCY }, drain));

  if (outcomes.every(outcome => outcome === FAILED)) {
    throw new InstitutionAccessError('ACCESS_LOOKUP_UNAVAILABLE', 502);
  }
  const services = [];
  SERVICE_CATALOGUE.forEach(({ id, name, publisher, url, monogram, color }, index) => {
    const outcome = outcomes[index];
    if (outcome && outcome !== FAILED && outcome !== UNCHECKED) {
      services.push({ id, name, publisher, url, monogram, color, collection: outcome.collection, ownPlatform: outcome.ownPlatform });
    }
  });
  return {
    services,
    partial: outcomes.includes(FAILED),
    unchecked: outcomes.filter(outcome => outcome === UNCHECKED).length,
    checkedAt: new Date(now()).toISOString(),
  };
}
