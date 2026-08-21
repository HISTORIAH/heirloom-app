/**
 * The page's ruling, drawn once behind the whole scroll: a column rule on each
 * gutter and two on the thirds of the content field — the same thirds the
 * three-up bands are built on, so each one falls in a gap between tiles rather
 * than across the middle of one. They run the full height of the landing and
 * are crossed at right angles by the rule each section's running head carries.
 *
 * The rules mark the page's own geometry, not the edges of a centred measure —
 * content runs edge to edge and the opaque tiles mask the lengths they cover,
 * so a rule only ever shows through negative space.
 */
const GridRules = () => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
    <div className="page-rules">
      <i data-at="0" />
      <i data-at="33" />
      <i data-at="66" />
      <i data-at="1" />
    </div>
  </div>
);

export default GridRules;
