const x = [];
class l extends HTMLElement {
  static onElementRemoved = /* @__PURE__ */ new Map();
  static elementsToTheLeftOf = /* @__PURE__ */ new Map();
  static elementsToTheRightOf = /* @__PURE__ */ new Map();
  static intersectionObserver = new IntersectionObserver(
    (n) => n.forEach(
      ({ target: e, boundingClientRect: c }) => l.findAdjacentElements(e, c)
    ),
    // Notify at every 1% change in intersection ratio
    { threshold: U(100) }
  );
  static findAdjacentElements(n, e) {
    const c = +n.dataset.spanRows, r = +n.dataset.spanColumns, { height: i, width: g } = e, O = i / c, R = g / r, L = i - O + O / 2, d = e.top + L, v = innerHeight;
    if (!(d >= 0 && d <= v || e.bottom >= 0 && e.bottom <= v)) return;
    const I = new Set(n.parentElement.parentElement.children), m = e.left - R / 2, a = e.right + R / 2, o = Math.max(d, 0), s = (y) => I.has(y), u = document.elementsFromPoint(m, o).find(s), h = document.elementsFromPoint(a, o).find(s), [, p] = l.elementsToTheLeftOf.get(n), [, w] = l.elementsToTheRightOf.get(n);
    w(h), p(u);
  }
  // Use custom elements to hook into the lifecycle of one of our content block elements being in the DOM.
  connectedCallback() {
    const { intersectionObserver: n, onElementRemoved: e, elementsToTheLeftOf: c, elementsToTheRightOf: r } = l, i = f(void 0), g = f(void 0), [O] = i, [R] = g;
    c.set(this, i), r.set(this, g);
    const L = H(() => {
      const d = b(() => (k(), C(O()))), v = b(() => (k(), C(R()))), T = b(() => {
        const a = d()(), o = v()();
        return Math.min(a ?? 1 / 0, o ?? 1 / 0);
      }), I = b(() => {
        const a = z().get(T());
        return a ? a.values().next().value?.topPadding ?? 0 : 0;
      }), m = b(() => {
        const a = z().get(T());
        if (!a) return 0;
        const o = a.values().next().value;
        let s;
        return o ? s = o.bottomPadding : s = T(), s === 1 / 0 ? 0 : s;
      });
      H(() => this.style.setProperty("--bottom-alignment-spacing", `${m()}px`)), H(() => this.style.setProperty("--top-alignment-spacing", `${I()}px`)), F((a) => a.set(this, T)), E(
        () => F((a) => (a.delete(this), a))
      );
    });
    n.observe(this), e.set(this, [
      // We need to clean up the top-level effect, but child-effects will be cleaned up automatically (there's no createRoot in the simple reactive library)
      L,
      () => {
        n.unobserve(this), e.delete(this), c.delete(this), r.delete(this);
      }
    ]);
  }
  disconnectedCallback() {
    l.onElementRemoved.get(this).forEach((n) => n());
  }
}
const [k, P] = f(!1), [M, F] = f(/* @__PURE__ */ new Map(), !1), [z, A] = f(
  /* @__PURE__ */ new Map(),
  !1
);
customElements.define("depict-block-media", l);
const j = new ResizeObserver(() => {
  for (const t of l.elementsToTheLeftOf.keys())
    l.findAdjacentElements(t, t.getBoundingClientRect());
});
j.observe(document.documentElement);
j.observe(document.body);
addEventListener("DOMContentLoaded", () => P((t) => !t));
addEventListener("load", () => P((t) => !t));
function C(t) {
  if (t?.matches(".depict-content-block")) {
    const o = t.querySelector("depict-block-media");
    return () => M().get(o)?.();
  }
  const n = t?.querySelectorAll("img"), e = (o) => {
    if (!(!o || !n)) {
      for (const s of n)
        if (S(o, s.src) || S(o, s.srcset) || S(o, s.dataset.src))
          return s;
    }
  }, c = e(t?.dataset?.defaultImage), r = e(t?.dataset?.hoverImage);
  if (!t || !c && !r)
    return () => {
    };
  let i = !1;
  const [g, O] = f(0), [R, L] = f(0), [d, v] = f(0), [T, I] = f(0), m = new ResizeObserver((o) => {
    for (const {
      target: s,
      contentRect: { height: u }
    } of o)
      s === t ? O(u) : s === c ? L(u) : s === r && v(u), i || (i = !0, queueMicrotask(() => {
        const h = t.getBoundingClientRect(), w = (d() && r ? r : c).getBoundingClientRect();
        if (w.width && w.height && h.width && h.height) {
          const y = w.top - h.top;
          I(y);
        } else
          I(0);
        i = !1;
      }));
  });
  E(() => m.disconnect()), c && m.observe(c), r && m.observe(r), m.observe(t);
  const a = b(() => {
    const o = g(), s = R() || d();
    if (o && s)
      return o - s;
  });
  return H(() => {
    const o = T(), s = a();
    if (s == null) return;
    const u = { topPadding: o, bottomPadding: s - o };
    A((h) => {
      let p = h.get(s);
      return p || (p = /* @__PURE__ */ new Set(), h.set(s, p)), p.add(u), E(
        () => A((w) => (p.delete(u), w))
      ), h;
    });
  }), a;
}
function U(t) {
  const n = [];
  for (let e = 1; e <= t; e++) {
    const c = e / t;
    n.push(c);
  }
  return n.push(0), n;
}
function S(t, n) {
  if (!n) return !1;
  const e = new URL(t, location.href), c = new URL(n, location.href), i = e.pathname.split("/").pop().split(".").slice(0, -1).join(".");
  return c.pathname.includes(i);
}
function f(t, n = !0) {
  const e = /* @__PURE__ */ new Set();
  return [() => {
    const i = x.at(-1);
    return i && (e.add(i), i.dependencies.add(e)), t;
  }, (i) => {
    typeof i == "function" && (i = i(t)), !(t === i && n) && (t = i, [...e].forEach((g) => g.execute()));
  }];
}
function H(t) {
  const n = () => {
    for (e.dependencies.forEach((c) => c.delete(e)), e.dependencies.clear(); e.cleanups.length; )
      e.cleanups.pop()();
  }, e = {
    execute() {
      n(), x.push(e);
      try {
        t();
      } finally {
        x.pop();
      }
    },
    dependencies: /* @__PURE__ */ new Set(),
    cleanups: []
  };
  return E(n), e.execute(), n;
}
function E(t) {
  x.at(-1)?.cleanups?.push(t);
}
function b(t) {
  const [n, e] = f();
  return H(() => e(() => t())), n;
}
