export function createStyles(fontBase64?: string): string {
  const fontFace = fontBase64
    ? `
@font-face {
  font-family: "Monofonto";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("data:font/otf;base64,${fontBase64}") format("opentype");
}
`
    : "";

  return `${fontFace}
:root {
  color-scheme: light;
  --ink: #07090d;
  --ink-soft: #10151f;
  --panel: #151923;
  --crimson: #b91c1c;
  --crimson-bright: #dc2626;
  --gold: #d6a84f;
  --gold-soft: #f0d493;
  --paper: #f6f1e8;
  --surface: #fffaf0;
  --text: #151922;
  --muted: #68707d;
  --border: #ded6c8;
  --border-dark: rgba(255, 255, 255, 0.13);
  --rule-light: rgba(88, 79, 68, 0.22);
  --shadow: 0 18px 42px rgba(13, 18, 28, 0.11);
  --font-body: "Monofonto", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-family: var(--font-body);
  background: var(--paper);
  color: var(--text);
}

* {
  box-sizing: border-box;
}

html {
  background: var(--paper);
  overflow-y: scroll;
  scrollbar-gutter: stable;
}

body {
  margin: 0;
  min-width: 320px;
  background:
    linear-gradient(180deg, rgba(185, 28, 28, 0.08), transparent 28rem),
    var(--paper);
  font-family: var(--font-body);
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid var(--border-dark);
  background: rgba(7, 9, 13, 0.9);
  backdrop-filter: blur(10px);
}

.topbarInner {
  width: min(1120px, calc(100% - 32px));
  min-height: 64px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fff8ed;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.brandMark {
  width: 34px;
  height: 34px;
  display: inline-grid;
  place-items: center;
  border: 1px solid rgba(214, 168, 79, 0.55);
  border-radius: 8px;
  color: var(--gold-soft);
  background: var(--ink);
  font-size: 0.86rem;
  overflow: hidden;
}

.brandMark img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shell {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: 36px 0 56px;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-end;
  padding: 32px 0 26px;
  border-bottom: 1px solid var(--rule-light);
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--crimson);
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

h1, h2, h3, p {
  margin: 0;
}

h1 {
  max-width: 860px;
  font-size: clamp(2.35rem, 5vw, 4.25rem);
  letter-spacing: 0.03em;
  line-height: 1.02;
}

h2 {
  color: var(--ink);
  font-size: 1.55rem;
  letter-spacing: 0.03em;
}

h3 {
  color: var(--ink);
  font-size: 1.02rem;
  letter-spacing: 0.03em;
  text-transform: capitalize;
}

.subtle, .sectionHeader p {
  color: var(--muted);
}

.stamp {
  min-width: 180px;
  display: grid;
  gap: 4px;
  padding: 12px 0;
  color: var(--muted);
  text-align: right;
}

.stamp strong {
  color: var(--text);
}

.statusBar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 18px 0 4px;
}

.statusChip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: rgba(255, 250, 240, 0.75);
  color: var(--muted);
}

.statusChip strong {
  color: var(--text);
  font-size: 1rem;
}

.statusChip.error strong {
  color: var(--crimson);
}

.statusChip.warning strong {
  color: #a85f00;
}

.statusChip.info strong {
  color: #244051;
}

.contextGrid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 12px;
  margin: 20px 0;
}

.contextPanel {
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}

.panelLabel {
  margin: 0 0 8px;
  color: var(--crimson);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.projectPanel h2 {
  margin: 0 0 10px;
  font-size: clamp(1.55rem, 3vw, 2.25rem);
}

.configList {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.configList div {
  min-width: 0;
}

.configList dt {
  color: var(--muted);
  font-size: 0.8rem;
  text-transform: uppercase;
}

.configList dd {
  margin: 4px 0 0;
  color: var(--text);
  font-size: 1.08rem;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin: 20px 0;
}

.chartGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 20px 0 4px;
}

.assetGraphGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 12px 0 4px;
}

.chartCard {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}

.donut {
  width: 104px;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 999px;
  animation: chart-pop 620ms ease both;
  position: relative;
}

.donut::after {
  content: "";
  position: absolute;
  inset: 18px;
  border-radius: inherit;
  background: var(--surface);
  border: 1px solid rgba(88, 79, 68, 0.16);
}

.donut span {
  position: relative;
  z-index: 1;
  color: var(--text);
  font-size: 1.25rem;
  font-weight: 700;
}

.legend {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 10px 0 0;
  list-style: none;
}

.legend li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  color: var(--muted);
}

.legendSwatch {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.breakdownCard {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}

.barList {
  display: grid;
  gap: 12px;
  padding: 0;
  margin: 14px 0 0;
  list-style: none;
}

.barList li {
  display: grid;
  gap: 7px;
}

.barLabel {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
}

.barLabel span {
  color: var(--muted);
  font-size: 0.88rem;
  text-align: right;
}

.barTrack {
  height: 10px;
  overflow: hidden;
  border: 1px solid rgba(88, 79, 68, 0.18);
  border-radius: 999px;
  background: rgba(104, 112, 125, 0.13);
}

.barTrack span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--crimson), var(--gold));
  animation: bar-grow 700ms ease both;
}

@keyframes chart-pop {
  from {
    opacity: 0;
    transform: scale(0.86) rotate(-18deg);
  }

  to {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes bar-grow {
  from {
    transform: scaleX(0);
    transform-origin: left;
  }

  to {
    transform: scaleX(1);
    transform-origin: left;
  }
}

.profileGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.profile {
  display: grid;
  gap: 12px;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.profileTitle {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.profileTitle span {
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--muted);
  font-size: 0.78rem;
  text-transform: uppercase;
}

.confidence.high {
  border-color: rgba(214, 168, 79, 0.8);
  color: #7c5200;
}

.confidence.medium {
  border-color: rgba(185, 28, 28, 0.28);
  color: var(--crimson);
}

.profile p {
  color: var(--muted);
  line-height: 1.45;
}

.profile ul {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.profile li {
  display: grid;
  gap: 3px;
}

.profile li span, .tableNote {
  color: var(--muted);
}

.pipelineLayout {
  display: grid;
  grid-template-columns: minmax(260px, 0.75fr) minmax(0, 1.25fr);
  gap: 12px;
}

.pipelinePrimary {
  padding: 18px;
  border: 1px solid rgba(214, 168, 79, 0.75);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(214, 168, 79, 0.18), transparent 55%),
    var(--surface);
}

.pipelinePrimary h3 {
  margin-bottom: 10px;
  font-size: 1.42rem;
  text-transform: none;
}

.pipelinePrimary p:last-child {
  color: var(--muted);
  line-height: 1.5;
}

.pipelineList {
  display: grid;
  gap: 10px;
}

.pipelineRow {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}

.pipelineRow summary {
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  color: var(--text);
  font-weight: 700;
  list-style: none;
}

.pipelineRow summary::-webkit-details-marker {
  display: none;
}

.pipelineRow p {
  margin: 0;
  padding: 0 16px 12px;
  color: var(--muted);
  line-height: 1.5;
}

.pipelineRow ul {
  display: grid;
  gap: 8px;
  padding: 0 16px 16px;
  margin: 0;
  list-style: none;
}

.pipelineRow li {
  display: grid;
  gap: 3px;
}

.pipelineRow li span {
  color: var(--muted);
}

.metric {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}

.metric span {
  color: var(--muted);
  font-size: 0.88rem;
}

.metric strong {
  font-size: 2.1rem;
  line-height: 1;
}

.metric.warning strong {
  color: #a85f00;
}

.section {
  margin-top: 28px;
}

.sectionHeader {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: baseline;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--rule-light);
}

.findingGroups {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.findingGroup {
  min-height: 160px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}

.findingGroupTitle {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.findingGroupTitle span {
  color: var(--muted);
}

.findingGroup.error {
  border-color: rgba(185, 28, 28, 0.4);
}

.findingGroup.warning {
  border-color: rgba(214, 168, 79, 0.7);
}

.findingGroup ul {
  display: grid;
  gap: 12px;
  padding: 0;
  margin: 14px 0 0;
  list-style: none;
}

.findingScroll {
  max-height: 380px;
  overflow: auto;
  padding-right: 4px;
  scrollbar-gutter: stable;
}

.findingGroup li {
  display: grid;
  gap: 4px;
  padding-top: 12px;
  border-top: 1px solid rgba(88, 79, 68, 0.16);
}

.findingGroup li[hidden],
tr[hidden] {
  display: none;
}

.findingMeta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.findingMeta span {
  color: var(--crimson);
  font-size: 0.82rem;
}

.findingGroup span, .empty {
  color: var(--muted);
  line-height: 1.45;
}

code {
  font-family: var(--font-body);
  color: #244051;
  overflow-wrap: anywhere;
}

.tablePanel {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}

.tableControls,
.listControls {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid rgba(88, 79, 68, 0.16);
}

.listControls {
  margin-top: 12px;
  padding: 10px 0 0;
  border-bottom: 0;
}

.tableControls label,
.listControls label {
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 5px;
}

.tableControls label span,
.listControls label span {
  color: var(--muted);
  font-size: 0.72rem;
  text-transform: uppercase;
}

.tableControls input,
.listControls input {
  width: 100%;
  min-height: 36px;
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #fffdf7;
  color: var(--text);
  font: inherit;
}

.tableControls input:focus,
.listControls input:focus {
  outline: 2px solid rgba(214, 168, 79, 0.6);
  outline-offset: 1px;
}

.resultCount {
  white-space: nowrap;
  color: var(--muted);
  font-size: 0.88rem;
}

.tableWrap {
  max-height: 520px;
  overflow: auto;
  scrollbar-gutter: stable;
}

.tableNote {
  margin: 10px 14px 14px;
  font-size: 0.9rem;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(88, 79, 68, 0.16);
  text-align: left;
  vertical-align: top;
}

th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--surface);
  color: var(--muted);
  font-size: 0.82rem;
  text-transform: uppercase;
}

.sortButton {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  text-transform: inherit;
  cursor: pointer;
}

.sortButton span {
  color: var(--crimson);
  font-size: 0.62rem;
  opacity: 0.72;
}

.sortButton[data-sort-direction="asc"] span,
.sortButton[data-sort-direction="desc"] span {
  opacity: 1;
}

tbody tr:last-child td {
  border-bottom: 0;
}

.pill {
  display: inline-flex;
  min-width: 28px;
  justify-content: center;
  padding: 3px 8px;
  border: 1px solid var(--border);
  border-radius: 999px;
}

.pill.ok {
  color: #244051;
  background: rgba(214, 168, 79, 0.14);
}

.pill.muted {
  color: var(--muted);
}

@media (max-width: 780px) {
  .hero, .sectionHeader {
    display: grid;
  }

  .stamp {
    text-align: left;
  }

  .contextGrid, .metrics, .findingGroups, .profileGrid, .chartGrid, .assetGraphGrid, .pipelineLayout {
    grid-template-columns: 1fr;
  }

  .configList {
    grid-template-columns: 1fr;
  }

  .tableControls,
  .listControls,
  .barLabel {
    align-items: stretch;
    flex-direction: column;
  }

  .barLabel span {
    text-align: left;
  }
}
`;
}
