import acs from '../../assets/publishers/acs.svg';
import ieee from '../../assets/publishers/ieee.svg';
import iop from '../../assets/publishers/iop.svg';
import nature from '../../assets/publishers/nature.svg';
import oup from '../../assets/publishers/oup.svg';
import rsc from '../../assets/publishers/rsc.svg';
import sage from '../../assets/publishers/sage.svg';
import science from '../../assets/publishers/science.svg';
import sciencedirect from '../../assets/publishers/sciencedirect.svg';
import springerlink from '../../assets/publishers/springerlink.svg';
import tandf from '../../assets/publishers/tandf.svg';
import wiley from '../../assets/publishers/wiley.svg';

// Keyed by the Worker catalogue's platform id. Each import is named after its
// file, which `publisherLogos.test.js` relies on to check the map from source.
const LOGOS = { acs, ieee, iop, nature, oup, rsc, sage, science, sciencedirect, springerlink, tandf, wiley };

export function publisherLogoFor(id) {
  return Object.hasOwn(LOGOS, id) ? LOGOS[id] : null;
}
