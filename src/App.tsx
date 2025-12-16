import React, { ChangeEvent, useMemo, useState } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

type SectionWeights = {
  education: number;
  experience: number;
  skills: number;
};

type FormatStyle = 'plain' | 'pdf' | 'table';

const defaultResume = `John Carter
Senior Frontend Engineer
Seattle, WA • john.carter@email.com • 555-101-2020

Summary
Frontend engineer focused on inclusive products and accessible design systems. Partner to product and research with a track record of shipping features that lift conversion and reduce friction for under-represented users.

Experience
Senior Frontend Engineer — Finch • 2021 - Present
- Led migration from Create React App to Vite, cutting build times by 68% and Lighthouse regressions by 40%.
- Built a bias-auditing UI for candidate review that surfaced under-represented pipelines; increased pass-through rates by 18%.
- Coached 4 engineers on TypeScript, testing, and performance profiling; introduced story-driven visual tests.

Product Engineer — Lumen Labs • 2018 - 2021
- Shipped multi-tenant design system components used by 7 teams; reduced UI defects by 32%.
- Partnered with recruiting to prototype a fair-screening flow; added semantic keyword matching and reduced false negatives by 22%.
- Implemented accessibility sweeps with axe-core and keyboard traps; passed WCAG 2.1 AA audits.

Education
University of Washington — B.S. Computer Science, 2018

Skills
React, TypeScript, Node.js, Vite, Accessibility, Design Systems, GraphQL, Storybook, Data Visualization
`;

const shortResume = `Kenya Lewis
Product Designer
Austin, TX • kenya.lewis@email.com • 555-555-3333

Experience
Product Designer — River • 2022 - Present
- Redesigned onboarding in 6 weeks; lifted activation by 14%.
- Shipped responsive component library in Figma + React handoff.

Education
Parsons School of Design — BFA Design & Technology

Skills
UX Research, Prototyping, Figma, Inclusive Writing, Accessibility
`;

const keywordSynonyms: Record<string, string[]> = {
  javascript: ['js'],
  typescript: ['ts'],
  react: ['react.js', 'reactjs'],
  node: ['nodejs'],
  accessibility: ['a11y', 'inclusive']
};

const formatProfiles: Record<
  FormatStyle,
  { label: string; penalty: number; note: string }
> = {
  plain: {
    label: 'Plain text / clean doc',
    penalty: 0,
    note: 'Highest parser success'
  },
  pdf: {
    label: 'PDF or image-like scan',
    penalty: 12,
    note: 'Text extraction loss, tables break parsing'
  },
  table: {
    label: 'Table-heavy or columns',
    penalty: 8,
    note: 'Column order is often misread'
  }
};

const nameBiasProfiles: Record<string, number> = {
  John: 1,
  Demetrius: 0.11,
  Kenya: 0.45
};

const demographicBase = [
  { label: 'White-sounding names', base: 85, sensitivity: 0.3 },
  { label: 'Black-sounding names', base: 9, sensitivity: 0.9 },
  { label: 'Female-coded names', base: 68, sensitivity: 0.5 },
  { label: 'Hispanic-coded names', base: 14, sensitivity: 0.7 }
];

const proxyIndicators = [
  'ivy league',
  'stanford',
  'harvard',
  'spelman',
  'hbcus',
  'black in tech',
  'latinx',
  'veteran',
  'sorority',
  'fraternity',
  'girls who code'
];

const sourceLinks = [
  { label: 'Workday AI lawsuit (CNN)', url: 'https://www.cnn.com/2025/05/22/tech/workday-ai-hiring-discrimination-lawsuit' },
  { label: 'Workday ADEA case summary', url: 'https://www.lawandtheworkplace.com/2025/06/ai-bias-lawsuit-against-workday-reaches-next-stage-as-court-grants-conditional-certification-of-adea-claim/' },
  { label: 'Mobley v. Workday agent theory', url: 'https://www.seyfarth.com/news-insights/mobley-v-workday-court-holds-ai-service-providers-could-be-directly-liable-for-employment-discrimination-under-agent-theory.html' },
  { label: 'NYC Local Law 144', url: 'https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page' },
  { label: 'FairNow guide to LL144', url: 'https://fairnow.ai/guide/nyc-local-law-144/' },
  { label: 'LinkedIn: Workday application tips', url: 'https://www.linkedin.com/pulse/10-best-practice-tips-job-applications-using-workday-lisa/' },
  { label: 'TopResume: ATS basics', url: 'https://topresume.com/career-advice/what-is-an-ats-resume' },
  { label: 'Workable: how ATS reads resumes', url: 'https://resources.workable.com/stories-and-insights/how-ATS-reads-resumes' },
  { label: 'LearnWork: automated screening', url: 'https://learnworkecosystemlibrary.com/topics/automated-screening-for-hiring-processes/' },
  { label: 'LinkedIn: ATS parsing tips', url: 'https://www.linkedin.com/pulse/how-ats-reads-your-resume-kristen-fife-she-her-hers-/' },
  { label: 'Oleeo: what is an ATS', url: 'https://www.oleeo.com/blog/what-is-an-applicant-tracking-system-ats/' },
  { label: 'StudyFinds: AI picks white names', url: 'https://studyfinds.org/ai-picks-white-names-over-black-hiring/' },
  { label: 'People of Color in Tech: name bias study', url: 'https://peopleofcolorintech.com/articles/ai-resume-screening-tools-biased-against-black-male-names-study-finds/' },
  { label: 'Brookings: LLM screening bias', url: 'https://www.brookings.edu/articles/gender-race-and-intersectional-bias-in-ai-resume-screening-via-language-model-retrieval/' },
  { label: 'ArXiv: screening bias', url: 'https://arxiv.org/html/2407.20371v1' },
  { label: 'MIT Tech Review: Amazon scrapped recruiter', url: 'https://www.technologyreview.com/2018/10/10/139858/amazon-ditched-ai-recruitment-software-because-it-was-biased-against-women/' },
  { label: 'CNBC: Amazon scrapped biased tool', url: 'https://www.cnbc.com/2018/10/10/amazon-scraps-a-secret-ai-recruiting-tool-that-showed-bias-against-women.html' },
  { label: 'ACLU: why Amazon tool discriminated', url: 'https://www.aclu.org/news/womens-rights/why-amazons-automated-hiring-tool-discriminated-against' },
  { label: 'ADA AI guidance', url: 'https://www.ada.gov/resources/ai-guidance/' },
  { label: 'Fisher Phillips: AI resume screeners', url: 'https://www.fisherphillips.com/en/news-insights/ai-resume-screeners.html' },
  { label: 'MyPerfectResume: ATS checker', url: 'https://www.myperfectresume.com/resume/ats-resume-checker' },
  { label: 'Workday lawsuit news', url: 'https://www.hrmorning.com/news/ai-hiring-discrimination-workday/' }
];

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

const splitKeywords = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const parseSections = (text: string) => {
  const lines = text.split(/\r?\n/);
  const buckets: Record<string, string[]> = {
    summary: [],
    experience: [],
    education: [],
    skills: [],
    other: []
  };
  let current = 'summary';

  lines.forEach((line) => {
    const clean = line.trim();
    if (!clean) return;
    if (/experience/i.test(clean)) current = 'experience';
    else if (/education/i.test(clean)) current = 'education';
    else if (/skills/i.test(clean)) current = 'skills';
    else if (/summary/i.test(clean)) current = 'summary';
    buckets[current] = [...(buckets[current] ?? []), clean];
  });

  return buckets;
};

const detectYearsOfExperience = (text: string) => {
  const matches = text.match(/(\d+)\+?\s+years?/gi);
  if (matches && matches.length > 0) {
    const values = matches
      .map((m) => parseInt(m, 10))
      .filter((n) => !Number.isNaN(n));
    if (values.length) {
      return Math.max(...values);
    }
  }
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / 120));
};

const App: React.FC = () => {
  const [resumeText, setResumeText] = useState(defaultResume);
  const [selectedName, setSelectedName] = useState<keyof typeof nameBiasProfiles>(
    'John'
  );
  const [view, setView] = useState<'main' | 'problem'>('main');
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [keywordStrictness, setKeywordStrictness] = useState(70);
  const [sectionWeights, setSectionWeights] = useState<SectionWeights>({
    education: 20,
    experience: 50,
    skills: 30
  });
  const [minYears, setMinYears] = useState(3);
  const [requiredInput, setRequiredInput] = useState(
    'React, JavaScript, Python'
  );
  const [preferredInput, setPreferredInput] = useState(
    'TypeScript, Node.js, Leadership, Agile Development'
  );
  const [formatStyle, setFormatStyle] = useState<FormatStyle>('plain');
  const [passThreshold, setPassThreshold] = useState(70);

  const lowerResume = resumeText.toLowerCase();

  const parsedSections = useMemo(
    () => parseSections(resumeText),
    [resumeText]
  );

  const requiredKeywords = useMemo(
    () => splitKeywords(requiredInput),
    [requiredInput]
  );
  const preferredKeywords = useMemo(
    () => splitKeywords(preferredInput),
    [preferredInput]
  );

  const wordCount = useMemo(
    () => resumeText.split(/\s+/).filter(Boolean).length,
    [resumeText]
  );
  const isShort = wordCount < 180;

  const yearsExperience = useMemo(
    () => detectYearsOfExperience(resumeText),
    [resumeText]
  );

  const findKeyword = (keyword: string) => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return false;
    const tokens = lowerResume.split(/\W+/).filter(Boolean);
    const synonymHits = (keywordSynonyms[normalized] ?? []).some((syn) =>
      lowerResume.includes(syn)
    );

    const exact = new RegExp(`\\b${normalized.replace(/\W/g, '')}\\b`, 'i');
    const tokenHit = tokens.includes(normalized.replace(/\W/g, ''));

    if (keywordStrictness >= 70) {
      return tokenHit || exact.test(lowerResume);
    }

    // allow partial/semantic looseness
    return tokenHit || synonymHits || lowerResume.includes(normalized);
  };

  const requiredMatches = requiredKeywords.filter(findKeyword);
  const preferredMatches = preferredKeywords.filter(findKeyword);
  const missingRequired = requiredKeywords.filter((kw) => !findKeyword(kw));

  const sectionWeightFactor =
    (sectionWeights.experience * 0.5 +
      sectionWeights.skills * 0.3 +
      sectionWeights.education * 0.2) /
    100;

  const requiredRatio = requiredKeywords.length
    ? requiredMatches.length / requiredKeywords.length
    : 1;
  const preferredRatio = preferredKeywords.length
    ? preferredMatches.length / preferredKeywords.length
    : 0.7;

  const strictnessModifier = 1 - (keywordStrictness - 60) / 250;
  const experienceScore = Math.min(
    100,
    (yearsExperience / Math.max(1, minYears)) * 40
  );

  const baseScore = clamp(
    (requiredRatio * 60 + preferredRatio * 25 + experienceScore + sectionWeightFactor * 15) *
      strictnessModifier
  );

  const formatPenalty = formatProfiles[formatStyle].penalty;
  const shortPenalty = isShort ? baseScore * 0.22 : 0;
  const nameBias = nameBiasProfiles[selectedName];

  let adjustedScore = baseScore * nameBias;
  adjustedScore -= formatPenalty;
  adjustedScore -= shortPenalty;
  if (yearsExperience < minYears) {
    adjustedScore -= 10;
  }
  const finalScore = clamp(adjustedScore);
  const decision = finalScore >= passThreshold ? 'Pass' : 'Reject';

  const demographicStats = demographicBase.map((demo) => {
    const fairnessDrag =
      formatPenalty * 0.8 +
      (keywordStrictness > 70 ? (keywordStrictness - 70) * demo.sensitivity * 0.2 : 0) +
      (isShort ? 6 * demo.sensitivity : 0);
    const adjusted = clamp(demo.base - fairnessDrag + (100 - passThreshold) * 0.2);
    return { ...demo, adjusted };
  });

  const proxySignals = proxyIndicators
    .filter((proxy) => lowerResume.includes(proxy))
    .slice(0, 4);

  const nameComparisons = useMemo(() => {
    const names = Object.keys(nameBiasProfiles) as Array<
      keyof typeof nameBiasProfiles
    >;
    return names.map((name) => {
      const score = clamp(baseScore * nameBiasProfiles[name] - formatPenalty - shortPenalty);
      return { name, score: Math.round(score) };
    });
  }, [baseScore, formatPenalty, shortPenalty]);

  const parsePdfFile = async (file: File) => {
    setUploadMessage('Parsing PDF…');
    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const pdf = await getDocument({ data }).promise;

      const pages: string[] = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const text = content.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .join(' ');
        pages.push(text);
      }
      const merged = pages.join('\n');
      setResumeText(merged);
      setUploadMessage('PDF parsed to text. Review and clean up any spacing.');
    } catch (error) {
      console.error(error);
      setUploadMessage('Could not parse PDF. Try exporting as .txt or simplify the layout.');
    }
  };

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      parsePdfFile(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        setResumeText(text);
        setUploadMessage('Loaded text file into editor.');
      }
    };
    reader.readAsText(file);
  };

  const swapSample = (sample: string) => {
    setResumeText(sample);
  };

  return (
    <div className="page">
      <div className="backdrop" />
      <div className="top-toggle">
        <button className={`chip ${view === 'main' ? 'active' : ''}`} onClick={() => setView('main')}>
          Main page
        </button>
        <button className={`chip ${view === 'problem' ? 'active' : ''}`} onClick={() => setView('problem')}>
          Problem & solution
        </button>
      </div>
      {view === 'problem' ? (
        <section className="panel">
          <h2>Problem & solution</h2>
          <p className="lede">Use this canvas to outline the hiring problem, risks, and your proposed solution.</p>
          <p className="hint">Switch back to “Main experience” for the interactive ATS demo.</p>
        </section>
      ) : (
      <>
      <header className="hero">
        <div>
          <p className="eyebrow">Workday ATS case study</p>
          <h1>Workday style resume screening</h1>
          <p className="lede">
            Adjust parsing knobs, swap names from the UW study (John vs Demetrius vs Kenya),
            and watch how keywords, formatting, and resume length change the score. Framed as a Workday-style case study with new bias laws in view.
          </p>
          <p className="study-link">
            Source study (UW):{' '}
            <a
              href="https://ojs.aaai.org/index.php/AIES/article/view/31748/33915"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://ojs.aaai.org/index.php/AIES/article/view/31748/33915
            </a>
          </p>
          <div className="sources-inline">
            <a
              href="https://www.linkedin.com/pulse/10-best-practice-tips-job-applications-using-workday-lisa/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Workday tips (LinkedIn)
            </a>
            <a
              href="https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page"
              target="_blank"
              rel="noopener noreferrer"
            >
              NYC Local Law 144
            </a>
            <a
              href="https://www.cnn.com/2025/05/22/tech/workday-ai-hiring-discrimination-lawsuit"
              target="_blank"
              rel="noopener noreferrer"
            >
              Workday lawsuit (CNN)
            </a>
          </div>
          <div className="stat-row">
            <div className="stat-card">
              <p className="stat-label">UW study callback rates</p>
              <div className="stat-bars">
                <div className="stat-bar">
                  <span>John</span>
                  <div className="bar">
                    <span style={{ width: '85%' }} />
                  </div>
                  <span className="stat-value">85%</span>
                </div>
                <div className="stat-bar">
                  <span>Demetrius</span>
                  <div className="bar low">
                    <span style={{ width: '9%' }} />
                  </div>
                  <span className="stat-value">9%</span>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <p className="stat-label">Shorter resume effect</p>
              <p className="stat-value large">22% ↑</p>
              <p className="stat-desc">
                increase in biased outcomes when the resume is shorter (per research cited in the UW paper).
              </p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Format penalty</p>
              <p className="stat-value large">-12 pts</p>
              <p className="stat-desc">PDF/table uploads often lose text, lowering ATS parsing scores.</p>
            </div>
          </div>
        </div>
        <div className="name-swap">
          <p className="stat-label">Name swap tool</p>
          <div className="name-buttons">
            {(['John', 'Demetrius', 'Kenya'] as const).map((name) => (
              <button
                key={name}
                className={`chip ${selectedName === name ? 'active' : ''}`}
                onClick={() => setSelectedName(name)}
              >
                {name}
              </button>
            ))}
          </div>
          <p className="hint">Same resume, different names → different scores below.</p>
        </div>
      </header>

      <section className="panel">
        <div className="card">
          <div className="card-header">
            <p className="eyebrow">Workday case study & laws</p>
          </div>
          <ul className="bullet-list">
            <li>
              Workday AI hiring faces discrimination claims (
              <a
                href="https://www.cnn.com/2025/05/22/tech/workday-ai-hiring-discrimination-lawsuit"
                target="_blank"
                rel="noopener noreferrer"
              >
                CNN
              </a>
              ,{' '}
              <a
                href="https://www.hrmorning.com/news/ai-hiring-discrimination-workday/"
                target="_blank"
                rel="noopener noreferrer"
              >
                HRMorning
              </a>
              ,{' '}
              <a
                href="https://www.seyfarth.com/news-insights/mobley-v-workday-court-holds-ai-service-providers-could-be-directly-liable-for-employment-discrimination-under-agent-theory.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                Seyfarth
              </a>
              ).
            </li>
            <li>
              NYC Local Law 144 requires bias audits and notices for automated employment decision tools (
              <a
                href="https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page"
                target="_blank"
                rel="noopener noreferrer"
              >
                official site
              </a>
              ,{' '}
              <a
                href="https://fairnow.ai/guide/nyc-local-law-144/"
                target="_blank"
                rel="noopener noreferrer"
              >
                guide
              </a>
              ).
            </li>
            <li>
              Candidate tactics for Workday portals (
              <a
                href="https://www.linkedin.com/pulse/10-best-practice-tips-job-applications-using-workday-lisa/"
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
              ) plus ATS parsing tips (
              <a
                href="https://resources.workable.com/stories-and-insights/how-ATS-reads-resumes"
                target="_blank"
                rel="noopener noreferrer"
              >
                Workable
              </a>
              ).
            </li>
          </ul>
        </div>
      </section>

      <main className="grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Input side</p>
              <h2>Upload or type resume</h2>
            </div>
            <div className="chip-row">
              <button className="chip ghost" onClick={() => swapSample(defaultResume)}>
                Use sample 1
              </button>
              <button className="chip ghost" onClick={() => swapSample(shortResume)}>
                Use sample 2
              </button>
            </div>
            <div className="upload-row">
              <label className="chip ghost file-chip large">
                Upload .txt or .pdf
                <input type="file" accept=".txt,.pdf,application/pdf" onChange={handleUpload} />
              </label>
            </div>
          </div>

          <textarea
            className="resume-input"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={18}
            aria-label="Resume text"
          />
          {uploadMessage && <p className="hint">{uploadMessage}</p>}

          <div className="controls-grid">
            <div className="control">
              <div className="control-header">
                <p>Keyword matching strictness</p>
                <span className="pill">{keywordStrictness >= 70 ? 'Exact' : 'Semantic'}</span>
              </div>
              <input
                type="range"
                min={30}
                max={100}
                value={keywordStrictness}
                onChange={(e) => setKeywordStrictness(Number(e.target.value))}
              />
              <p className="hint">
                Higher strictness requires exact phrases and ignores synonyms; lower allows semantic/partial hits.
              </p>
            </div>

            <div className="control three-col">
              <div className="control-header">
                <div>
                  <p>Section weights (must total 100)</p>
                </div>
                <span className="pill">
                  {sectionWeights.education + sectionWeights.experience + sectionWeights.skills}%
                </span>
              </div>
              <div className="weight-row">
                {(['experience', 'skills', 'education'] as const).map((section) => (
                  <label key={section}>
                    <span>{section.charAt(0).toUpperCase() + section.slice(1)}</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={sectionWeights[section]}
                      onChange={(e) =>
                        setSectionWeights((prev) => ({
                          ...prev,
                          [section]: Number(e.target.value)
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="control">
              <div className="control-header">
                <p>Minimum years of experience</p>
                <span className="pill">{minYears} yrs</span>
              </div>
              <input
                type="range"
                min={0}
                max={15}
                value={minYears}
                onChange={(e) => setMinYears(Number(e.target.value))}
              />
              <p className="hint">
                Resume currently shows ~{yearsExperience} yrs. Below threshold costs points.
              </p>
            </div>

            <div className="control">
              <div className="control-header">
                <p>Required keywords</p>
                <span className="pill">{requiredMatches.length}/{requiredKeywords.length} found</span>
              </div>
              <input
                type="text"
                value={requiredInput}
                onChange={(e) => setRequiredInput(e.target.value)}
                placeholder="Comma-separated"
              />
            </div>

            <div className="control">
              <div className="control-header">
                <p>Preferred keywords</p>
                <span className="pill">{preferredMatches.length}/{preferredKeywords.length} found</span>
              </div>
              <input
                type="text"
                value={preferredInput}
                onChange={(e) => setPreferredInput(e.target.value)}
                placeholder="Comma-separated"
              />
            </div>

            <div className="control">
              <div className="control-header">
                <p>Format impact</p>
                <span className="pill">{formatProfiles[formatStyle].label}</span>
              </div>
              <div className="format-row">
                {(Object.keys(formatProfiles) as FormatStyle[]).map((style) => (
                  <button
                    key={style}
                    className={`chip ghost ${formatStyle === style ? 'active' : ''}`}
                    onClick={() => setFormatStyle(style)}
                  >
                    {formatProfiles[style].label}
                  </button>
                ))}
              </div>
              <p className="hint">{formatProfiles[formatStyle].note}</p>
            </div>

            <div className="control">
              <div className="control-header">
                <p>Pass threshold</p>
                <span className="pill">{passThreshold}</span>
              </div>
              <input
                type="range"
                min={40}
                max={90}
                value={passThreshold}
                onChange={(e) => setPassThreshold(Number(e.target.value))}
              />
              <p className="hint">Higher thresholds compress pass rates across every demographic.</p>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Output side</p>
              <h2>How the ATS scores this resume</h2>
              <p className="hint">
                Parsing is sensitive to names, formatting, section weights, and the strictness of keyword matching.
              </p>
            </div>
            <div className="score-decision">
              <div className={`decision-box ${decision === 'Pass' ? 'pass' : 'fail'}`}>
                <span className="decision-label">Decision</span>
                <strong className="decision-text">{decision}</strong>
              </div>
              <div className="score-box">
                <span className="decision-label">Score</span>
                <strong>{Math.round(finalScore)}</strong>
              </div>
            </div>
          </div>

          <div className="output-grid">
            <div className="card">
              <div className="card-header">
                <p className="eyebrow">Parsed resume view</p>
              </div>
              <div className="parsed">
                <div>
                  <h4>Experience</h4>
                  <ul>
                    {parsedSections.experience.slice(0, 5).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4>Education</h4>
                  <ul>
                    {parsedSections.education.slice(0, 3).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4>Skills</h4>
                  <ul className="inline-list">
                    {parsedSections.skills.slice(0, 8).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <p className="eyebrow">Keyword match</p>
                <span className="pill">{Math.round(requiredRatio * 100)}% required</span>
              </div>
              <div className="match">
                <div>
                  <h4>Found</h4>
                  <div className="chip-row">
                    {[...requiredMatches, ...preferredMatches].map((kw) => (
                      <span key={kw} className="chip small">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4>Missing</h4>
                  <div className="chip-row missing">
                    {missingRequired.length ? (
                      missingRequired.map((kw) => (
                        <span key={kw} className="chip small">
                          {kw}
                        </span>
                      ))
                    ) : (
                      <p className="hint">All required keywords detected.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <p className="eyebrow">Scoring breakdown</p>
                <span className="pill ghost">{selectedName}</span>
              </div>
              <div className="score">
                <div className="gauge">
                  <div className="gauge-fill" style={{ width: `${finalScore}%` }} />
                </div>
                <div className="score-grid">
                  <div>
                    <p className="tiny">Base score</p>
                    <strong>{Math.round(baseScore)}</strong>
                  </div>
                  <div>
                    <p className="tiny">Name bias factor</p>
                    <strong>{nameBias.toFixed(2)}x</strong>
                    <p className="hint">John vs Demetrius vs Kenya</p>
                  </div>
                  <div>
                    <p className="tiny">Format penalty</p>
                    <strong>-{formatPenalty.toFixed(1)}</strong>
                    <p className="hint">{formatProfiles[formatStyle].note}</p>
                  </div>
                  <div>
                    <p className="tiny">Short resume bias</p>
                    <strong>{isShort ? '-22%' : 'Neutral'}</strong>
                    <p className="hint">{wordCount} words</p>
                  </div>
                  <div>
                    <p className="tiny">Experience read</p>
                    <strong>{yearsExperience} yrs</strong>
                    <p className="hint">Min threshold: {minYears} yrs</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <p className="eyebrow">Name swap</p>
              </div>
              <div className="name-compare">
                {nameComparisons.map((entry) => (
                  <div key={entry.name} className="name-row">
                    <div className="name-dot" />
                    <div>
                      <p>{entry.name}</p>
                      <p className="hint">
                        Bias factor {nameBiasProfiles[entry.name].toFixed(2)}x
                      </p>
                    </div>
                    <div className="gauge tiny">
                      <div className="gauge-fill" style={{ width: `${entry.score}%` }} />
                    </div>
                    <strong>{entry.score}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <p className="eyebrow">Format impact</p>
              </div>
              <div className="format">
                <p>
                  Switching from clean text to a PDF/table format subtracts up to {formatPenalty} points.
                  Column layouts scramble bullet ordering, hurting keyword recognition.
                </p>
                <div className="proxy-grid">
                  <div>
                    <p className="tiny">Current format</p>
                    <strong>{formatProfiles[formatStyle].label}</strong>
                  </div>
                  <div>
                    <p className="tiny">Parser loss</p>
                    <strong>-{formatPenalty} pts</strong>
                  </div>
                  <div>
                    <p className="tiny">Better parsing</p>
                    <strong>Use simple bullets + text</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <p className="eyebrow">Proxy indicators</p>
              </div>
              <div className="proxy">
                {proxySignals.length ? (
                  <div className="chip-row">
                    {proxySignals.map((proxy) => (
                      <span key={proxy} className="chip small">
                        {proxy}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="hint">
                    Add school names, organizations, or word choices that can proxy demographics. ATS can weigh them unintentionally.
                  </p>
                )}
                <p className="hint">
                  Even when names are removed, proxies (schools, orgs, word choices) can recreate demographic signals.
                </p>
              </div>
            </div>

            <div className="card wide">
              <div className="card-header">
                <p className="eyebrow">Demographic pass rates (simulated)</p>
              </div>
              <div className="demo-grid">
                {demographicStats.map((demo) => (
                  <div key={demo.label} className="demo-row">
                    <div>
                      <p>{demo.label}</p>
                      <p className="hint">UW + related research baselines</p>
                    </div>
                    <div className="gauge tiny">
                      <div className="gauge-fill" style={{ width: `${demo.adjusted}%` }} />
                    </div>
                    <strong>{demo.adjusted.toFixed(0)}%</strong>
                  </div>
                ))}
              </div>
              <p className="hint">
                Higher strictness, PDF uploads, and higher thresholds compress pass rates — and disproportionately lower them for demographic groups that already start lower (e.g., 85% vs 9%).
              </p>
            </div>

            <div className="card wide">
              <div className="card-header">
                <p className="eyebrow">Sources</p>
              </div>
              <ul className="source-list">
                {sourceLinks.map((src) => (
                  <li key={src.url}>
                    <a href={src.url} target="_blank" rel="noopener noreferrer">
                      {src.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
      </>
      )}
    </div>
  );
};

export default App;
