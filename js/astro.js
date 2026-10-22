/*
 * Approximate sidereal (Vedic) positions computed in the browser.
 * Planet orbits: Paul Schlyter's simplified elements ("How to compute planetary positions"),
 * good to roughly a few arc-minutes for the Sun and planets, better than a degree for the Moon.
 * Sidereal conversion: Lahiri ayanamsa, linear approximation.
 * Houses: whole-sign from the lagna (ascendant), as in common North Indian practice.
 */
(function (global) {
  const RAD = Math.PI / 180;
  const sin = (x) => Math.sin(x * RAD);
  const cos = (x) => Math.cos(x * RAD);
  const atan2 = (y, x) => Math.atan2(y, x) / RAD;
  const norm = (x) => ((x % 360) + 360) % 360;

  // Days since 2000 Jan 0.0 UT (Schlyter's epoch), from a UTC timestamp in ms.
  function dayNumber(utcMs) {
    return (utcMs - Date.UTC(1999, 11, 31, 0, 0, 0)) / 86400000;
  }

  const ELEMENTS = {
    // N, i, w, a, e, M — each as [base, rate per day]
    mercury: { N: [48.3313, 3.24587e-5], i: [7.0047, 5.0e-8], w: [29.1241, 1.01444e-5], a: [0.387098, 0], e: [0.205635, 5.59e-10], M: [168.6562, 4.0923344368] },
    venus:   { N: [76.6799, 2.4659e-5], i: [3.3946, 2.75e-8], w: [54.891, 1.38374e-5], a: [0.72333, 0], e: [0.006773, -1.302e-9], M: [48.0052, 1.6021302244] },
    mars:    { N: [49.5574, 2.11081e-5], i: [1.8497, -1.78e-8], w: [286.5016, 2.92961e-5], a: [1.523688, 0], e: [0.093405, 2.516e-9], M: [18.6021, 0.5240207766] },
    jupiter: { N: [100.4542, 2.76854e-5], i: [1.303, -1.557e-7], w: [273.8777, 1.64505e-5], a: [5.20256, 0], e: [0.048498, 4.469e-9], M: [19.895, 0.0830853001] },
    saturn:  { N: [113.6634, 2.3898e-5], i: [2.4886, -1.081e-7], w: [339.3939, 2.97661e-5], a: [9.55475, 0], e: [0.055546, -9.499e-9], M: [316.967, 0.0334442282] },
  };

  function el(p, d) {
    const o = {};
    for (const k in p) o[k] = p[k][0] + p[k][1] * d;
    o.N = norm(o.N); o.w = norm(o.w); o.M = norm(o.M);
    return o;
  }

  function kepler(M, e) {
    let E = M + (e / RAD) * sin(M) * (1 + e * cos(M));
    for (let k = 0; k < 10; k++) {
      const dE = (E - (e / RAD) * sin(E) - M) / (1 - e * cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-6) break;
    }
    return E;
  }

  // Position in the orbit plane, rotated into ecliptic coordinates.
  function orbitXYZ(o) {
    const E = kepler(o.M, o.e);
    const xv = o.a * (cos(E) - o.e);
    const yv = o.a * Math.sqrt(1 - o.e * o.e) * sin(E);
    const v = atan2(yv, xv);
    const r = Math.sqrt(xv * xv + yv * yv);
    const vw = v + o.w;
    return {
      x: r * (cos(o.N) * cos(vw) - sin(o.N) * sin(vw) * cos(o.i)),
      y: r * (sin(o.N) * cos(vw) + cos(o.N) * sin(vw) * cos(o.i)),
      z: r * sin(vw) * sin(o.i),
      v, r,
    };
  }

  function sun(d) {
    const w = 282.9404 + 4.70935e-5 * d;
    const e = 0.016709 - 1.151e-9 * d;
    const M = norm(356.047 + 0.9856002585 * d);
    const E = kepler(M, e);
    const xv = cos(E) - e;
    const yv = Math.sqrt(1 - e * e) * sin(E);
    const lon = norm(atan2(yv, xv) + w);
    const r = Math.sqrt(xv * xv + yv * yv);
    return { lon, M, w, x: r * cos(lon), y: r * sin(lon) };
  }

  function moon(d, s) {
    const o = el({ N: [125.1228, -0.0529538083], i: [5.1454, 0], w: [318.0634, 0.1643573223], a: [60.2666, 0], e: [0.0549, 0], M: [115.3654, 13.0649929509] }, d);
    const p = orbitXYZ(o);
    let lon = atan2(p.y, p.x);
    const Ms = s.M, Mm = o.M;
    const Ls = s.M + s.w, Lm = o.M + o.w + o.N;
    const D = Lm - Ls, F = Lm - o.N;
    lon += -1.274 * sin(Mm - 2 * D) + 0.658 * sin(2 * D) - 0.186 * sin(Ms)
      - 0.059 * sin(2 * Mm - 2 * D) - 0.057 * sin(Mm - 2 * D + Ms) + 0.053 * sin(Mm + 2 * D)
      + 0.046 * sin(2 * D - Ms) + 0.041 * sin(Mm - Ms) - 0.035 * sin(D)
      - 0.031 * sin(Mm + Ms) - 0.015 * sin(2 * F - 2 * D) + 0.011 * sin(Mm - 4 * D);
    return { lon: norm(lon), node: o.N };
  }

  function planet(name, d, s, Mj, Msat) {
    const o = el(ELEMENTS[name], d);
    let { x, y, z } = orbitXYZ(o);
    // Jupiter/Saturn mutual perturbations, applied to heliocentric longitude.
    let dl = 0;
    if (name === 'jupiter') {
      dl = -0.332 * sin(2 * Mj - 5 * Msat - 67.6) - 0.056 * sin(2 * Mj - 2 * Msat + 21)
        + 0.042 * sin(3 * Mj - 5 * Msat + 21) - 0.036 * sin(Mj - 2 * Msat)
        + 0.022 * cos(Mj - Msat) + 0.023 * sin(2 * Mj - 3 * Msat + 52) - 0.016 * sin(Mj - 5 * Msat - 69);
    } else if (name === 'saturn') {
      dl = 0.812 * sin(2 * Mj - 5 * Msat - 67.6) - 0.229 * cos(2 * Mj - 4 * Msat - 2)
        + 0.119 * sin(Mj - 2 * Msat - 3) + 0.046 * sin(2 * Mj - 6 * Msat - 69) + 0.014 * sin(Mj - 3 * Msat + 32);
    }
    if (dl) {
      const rxy = Math.sqrt(x * x + y * y);
      const lon = atan2(y, x) + dl;
      x = rxy * cos(lon); y = rxy * sin(lon);
    }
    return { lon: norm(atan2(y + s.y, x + s.x)) };
  }

  function lahiriAyanamsa(d) {
    // ~23.853° at J2000, precessing ~50.29"/year.
    return 23.853 + 0.0139694 * ((d - 1.5) / 365.25);
  }

  function ascendant(d, latDeg, lonEastDeg) {
    const jd = d + 2451543.5;
    const T = (jd - 2451545.0) / 36525;
    const gmst = norm(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T);
    const ramc = norm(gmst + lonEastDeg);
    const eps = 23.4393 - 3.563e-7 * d;
    const asc = atan2(cos(ramc), -(sin(ramc) * cos(eps) + Math.tan(latDeg * RAD) * sin(eps)));
    return norm(asc);
  }

  /**
   * @param {object} input {year, month, day, hour, minute, tzOffsetHours, lat, lon}
   * @returns sidereal longitudes (degrees) for lagna and nine grahas plus derived facts.
   */
  function computeKundli(input) {
    const localMs = Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute);
    const utcMs = localMs - input.tzOffsetHours * 3600000;
    const d = dayNumber(utcMs);
    const ayan = lahiriAyanamsa(d);
    const s = sun(d);
    const m = moon(d, s);
    const Mj = norm(ELEMENTS.jupiter.M[0] + ELEMENTS.jupiter.M[1] * d);
    const Msat = norm(ELEMENTS.saturn.M[0] + ELEMENTS.saturn.M[1] * d);

    const tropical = {
      sun: s.lon,
      moon: m.lon,
      mars: planet('mars', d, s).lon,
      mercury: planet('mercury', d, s).lon,
      jupiter: planet('jupiter', d, s, Mj, Msat).lon,
      venus: planet('venus', d, s).lon,
      saturn: planet('saturn', d, s, Mj, Msat).lon,
      rahu: m.node, // mean lunar node
      ketu: norm(m.node + 180),
    };
    const sidereal = {};
    for (const k in tropical) sidereal[k] = norm(tropical[k] - ayan);
    const lagna = norm(ascendant(d, input.lat, input.lon) - ayan);

    const sign = (lon) => Math.floor(lon / 30); // 0 = Mesha
    const lagnaSign = sign(lagna);
    const planets = Object.keys(sidereal).map((k) => ({
      key: k,
      lon: sidereal[k],
      sign: sign(sidereal[k]),
      deg: sidereal[k] % 30,
      house: ((sign(sidereal[k]) - lagnaSign + 12) % 12) + 1,
    }));
    return {
      ayanamsa: ayan,
      lagna: { lon: lagna, sign: lagnaSign, deg: lagna % 30 },
      planets,
      moonSign: sign(sidereal.moon),
      sunSign: sign(sidereal.sun),
      nakshatra: Math.floor(sidereal.moon / (360 / 27)),
      pada: Math.floor((sidereal.moon % (360 / 27)) / (360 / 108)) + 1,
    };
  }

  global.Astro = { computeKundli };
  if (typeof module !== 'undefined') module.exports = global.Astro;
})(typeof window !== 'undefined' ? window : globalThis);
