import { DogProfile, Activity, HealthNote, WeightUnit } from '@/types/dog';
import { convertKgToLbs, roundWeight } from '@/utils/weightUtils';

interface ReportData {
  profile: DogProfile;
  activities: Activity[];
  healthNotes: HealthNote[];
  dateRange: { start: Date; end: Date };
  rangeLabel: string;
}

const formatDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

const formatWeight = (kg: number, unit: WeightUnit): string => {
  const val = unit === 'lbs' ? convertKgToLbs(kg) : kg;
  return `${roundWeight(val)} ${unit}`;
};

const getActivityLabel = (type: string): string => {
  const labels: Record<string, string> = {
    walk: 'Walk',
    run: 'Run',
    play: 'Play',
    training: 'Training',
    social: 'Social',
    other: 'Other',
  };
  return labels[type] || type;
};

const LOGO_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/q1l9wraw500sbvkfslv36';

const generateLogoImg = (): string => {
  return `<img src="${LOGO_URL}" width="40" height="40" style="border-radius:8px;object-fit:contain;" />`;
};

interface WeightDataPoint {
  date: string;
  weightKg: number;
  source: 'health_note' | 'activity';
}

const generateWeightChartSVG = (
  notes: HealthNote[],
  activities: Activity[],
  unit: WeightUnit
): string => {
  const healthWeights: WeightDataPoint[] = notes
    .filter((n) => n.weightKg != null && n.weightKg > 0)
    .map((n) => ({ date: n.createdAt, weightKg: n.weightKg!, source: 'health_note' as const }));

  const activityWeights: WeightDataPoint[] = activities
    .filter((a) => a.weight != null && a.weight > 0)
    .map((a) => ({ date: a.activityDate || a.date, weightKg: a.weight!, source: 'activity' as const }));

  const allWeights = [...healthWeights, ...activityWeights]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (allWeights.length === 0) {
    return `<div style="text-align:center;padding:32px 0;color:#888;font-size:13px;">No weight data recorded in this period</div>`;
  }

  const values = allWeights.map((w) => {
    const v = unit === 'lbs' ? convertKgToLbs(w.weightKg) : w.weightKg;
    return roundWeight(v);
  });

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const padding = range * 0.15;
  const chartMin = minVal - padding;
  const chartMax = maxVal + padding;
  const chartRange = chartMax - chartMin;

  const width = 520;
  const height = 160;
  const padLeft = 50;
  const padRight = 20;
  const padTop = 15;
  const padBottom = 35;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const points = values.map((v, i) => {
    const x = padLeft + (allWeights.length === 1 ? plotW / 2 : (i / (allWeights.length - 1)) * plotW);
    const y = padTop + plotH - ((v - chartMin) / chartRange) * plotH;
    return { x, y, v, source: allWeights[i].source };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L${points[points.length - 1].x},${padTop + plotH} L${points[0].x},${padTop + plotH} Z`;

  const gridLines = 4;
  let gridSVG = '';
  for (let i = 0; i <= gridLines; i++) {
    const y = padTop + (i / gridLines) * plotH;
    const val = roundWeight(chartMax - (i / gridLines) * chartRange);
    gridSVG += `<line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="#E8E8E8" stroke-width="1"/>`;
    gridSVG += `<text x="${padLeft - 8}" y="${y + 4}" text-anchor="end" fill="#888" font-size="10">${val}</text>`;
  }

  let dateLabelsSVG = '';
  const labelCount = Math.min(allWeights.length, 6);
  const step = Math.max(1, Math.floor(allWeights.length / labelCount));
  for (let i = 0; i < allWeights.length; i += step) {
    const x = points[i].x;
    dateLabelsSVG += `<text x="${x}" y="${height - 5}" text-anchor="middle" fill="#888" font-size="9">${formatDate(allWeights[i].date)}</text>`;
  }

  let dotsSVG = '';
  points.forEach((p) => {
    const color = p.source === 'activity' ? '#1976D2' : '#C41E3A';
    dotsSVG += `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${color}" stroke="#fff" stroke-width="1.5"/>`;
  });

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      ${gridSVG}
      <defs>
        <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#C41E3A" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#C41E3A" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      <path d="${areaD}" fill="url(#weightGrad)"/>
      <path d="${pathD}" fill="none" stroke="#C41E3A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${dotsSVG}
      ${dateLabelsSVG}
    </svg>
    <div style="display:flex;gap:14px;margin-top:6px;justify-content:flex-end;">
      <div style="display:flex;align-items:center;gap:4px;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#C41E3A;"></span>
        <span style="font-size:9px;color:#888;">Health Notes</span>
      </div>
      <div style="display:flex;align-items:center;gap:4px;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#1976D2;"></span>
        <span style="font-size:9px;color:#888;">Activities</span>
      </div>
    </div>
  `;
};

const generateBCSChartSVG = (notes: HealthNote[]): string => {
  const withBCS = notes
    .filter((n) => n.bcsScore != null && n.bcsScore > 0)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (withBCS.length === 0) {
    return `<div style="text-align:center;padding:32px 0;color:#888;font-size:13px;">No BCS data recorded in this period</div>`;
  }

  const values = withBCS.map((n) => n.bcsScore!);

  const width = 520;
  const height = 160;
  const padLeft = 50;
  const padRight = 20;
  const padTop = 15;
  const padBottom = 35;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const chartMin = 0.5;
  const chartMax = 9.5;
  const chartRange = chartMax - chartMin;

  const points = values.map((v, i) => {
    const x = padLeft + (withBCS.length === 1 ? plotW / 2 : (i / (withBCS.length - 1)) * plotW);
    const y = padTop + plotH - ((v - chartMin) / chartRange) * plotH;
    return { x, y, v };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L${points[points.length - 1].x},${padTop + plotH} L${points[0].x},${padTop + plotH} Z`;

  let gridSVG = '';
  for (let i = 1; i <= 9; i++) {
    const y = padTop + plotH - ((i - chartMin) / chartRange) * plotH;
    gridSVG += `<line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="#E8E8E8" stroke-width="0.5" stroke-dasharray="${i === 5 ? '0' : '3,3'}"/>`;
    gridSVG += `<text x="${padLeft - 8}" y="${y + 4}" text-anchor="end" fill="#888" font-size="10">${i}</text>`;
  }

  const idealY1 = padTop + plotH - ((4 - chartMin) / chartRange) * plotH;
  const idealY2 = padTop + plotH - ((6 - chartMin) / chartRange) * plotH;
  gridSVG += `<rect x="${padLeft}" y="${idealY2}" width="${plotW}" height="${idealY1 - idealY2}" fill="#4CAF50" fill-opacity="0.10" rx="2"/>`;

  let dateLabelsSVG = '';
  const labelCount = Math.min(withBCS.length, 6);
  const step = Math.max(1, Math.floor(withBCS.length / labelCount));
  for (let i = 0; i < withBCS.length; i += step) {
    const x = points[i].x;
    dateLabelsSVG += `<text x="${x}" y="${height - 5}" text-anchor="middle" fill="#888" font-size="9">${formatDate(withBCS[i].createdAt)}</text>`;
  }

  let dotsSVG = '';
  points.forEach((p) => {
    dotsSVG += `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#4CAF50" stroke="#fff" stroke-width="1.5"/>`;
  });

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      ${gridSVG}
      <defs>
        <linearGradient id="bcsGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4CAF50" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#4CAF50" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      <path d="${areaD}" fill="url(#bcsGrad)"/>
      <path d="${pathD}" fill="none" stroke="#4CAF50" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${dotsSVG}
      ${dateLabelsSVG}
    </svg>
  `;
};

const FOOTER_DISCLAIMER = 'The information in this report is owner-recorded and provided for reference purposes only. It is not a substitute for professional veterinary guidance.';

export const generateReportHTML = (data: ReportData): string => {
  const { profile, activities, healthNotes, rangeLabel } = data;
  const unit = profile.preferredWeightUnit || 'kg';
  const today = formatDate(new Date().toISOString());

  const breedText = profile.breedMakeup?.map((b) => `${b.breedName} (${b.percentage}%)`).join(', ') || 'Not specified';

  const filteredActivities = [...activities].sort(
    (a, b) => new Date(a.activityDate || a.date).getTime() - new Date(b.activityDate || b.date).getTime()
  );

  const filteredNotes = [...healthNotes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const weightChart = generateWeightChartSVG(filteredNotes, filteredActivities, unit);
  const bcsChart = generateBCSChartSVG(filteredNotes);

  let activitiesRows = '';
  if (filteredActivities.length === 0) {
    activitiesRows = `<tr><td colspan="4" style="text-align:center;padding:24px;color:#888;">No activities recorded in this period</td></tr>`;
  } else {
    filteredActivities.forEach((a, i) => {
      const bg = i % 2 === 0 ? '#FAFAFA' : '#FFFFFF';
      const noteText = a.notes ? a.notes.substring(0, 80) + (a.notes.length > 80 ? '…' : '') : '—';
      activitiesRows += `
        <tr style="background:${bg};">
          <td style="padding:10px 12px;border-bottom:1px solid #F0F0F0;font-size:12px;color:#333;">${formatDate(a.activityDate || a.date)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #F0F0F0;font-size:12px;color:#333;">${getActivityLabel(a.type)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #F0F0F0;font-size:12px;color:#333;">${a.duration} min</td>
          <td style="padding:10px 12px;border-bottom:1px solid #F0F0F0;font-size:12px;color:#555;max-width:180px;word-wrap:break-word;">${noteText}</td>
        </tr>
      `;
    });
  }

  let healthRows = '';
  if (filteredNotes.length === 0) {
    healthRows = `<tr><td colspan="4" style="text-align:center;padding:24px;color:#888;">No health notes recorded in this period</td></tr>`;
  } else {
    filteredNotes.forEach((n, i) => {
      const bg = i % 2 === 0 ? '#FAFAFA' : '#FFFFFF';
      const weightDisplay = n.weightKg ? formatWeight(n.weightKg, unit) : '—';
      const bcsDisplay = n.bcsScore != null && n.bcsScore > 0
        ? `<span style="display:inline-block;background:#4CAF50;color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;">BCS: ${n.bcsScore}/9</span>`
        : '—';
      const noteText = n.text.substring(0, 100) + (n.text.length > 100 ? '…' : '');
      healthRows += `
        <tr style="background:${bg};">
          <td style="padding:10px 12px;border-bottom:1px solid #F0F0F0;font-size:12px;color:#333;">${formatDate(n.createdAt)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #F0F0F0;font-size:12px;color:#333;">${weightDisplay}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #F0F0F0;font-size:12px;color:#333;">${bcsDisplay}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #F0F0F0;font-size:12px;color:#555;max-width:200px;word-wrap:break-word;">${noteText}</td>
        </tr>
      `;
    });
  }

  const totalActivities = filteredActivities.length;
  const totalDuration = filteredActivities.reduce((s, a) => s + a.duration, 0);
  const totalHours = (totalDuration / 60).toFixed(1);
  const logoImg = generateLogoImg();

  const allWeightsForAvg: number[] = [];
  filteredNotes.forEach((n) => {
    if (n.weightKg != null && n.weightKg > 0) {
      allWeightsForAvg.push(unit === 'lbs' ? convertKgToLbs(n.weightKg) : n.weightKg);
    }
  });
  filteredActivities.forEach((a) => {
    if (a.weight != null && a.weight > 0) {
      allWeightsForAvg.push(unit === 'lbs' ? convertKgToLbs(a.weight) : a.weight);
    }
  });
  const avgWeight = allWeightsForAvg.length > 0
    ? roundWeight(allWeightsForAvg.reduce((s, v) => s + v, 0) / allWeightsForAvg.length)
    : null;

  const daySpan = Math.max(1, Math.ceil((data.dateRange.end.getTime() - data.dateRange.start.getTime()) / (1000 * 60 * 60 * 24)));
  const dailyAvgMinutes = totalActivities > 0 ? totalDuration / daySpan : 0;
  const dailyAvgDisplay = totalActivities > 0
    ? (dailyAvgMinutes >= 60
      ? `${Math.floor(dailyAvgMinutes / 60)}h ${Math.round(dailyAvgMinutes % 60)}m`
      : `${Math.round(dailyAvgMinutes)} min`)
    : '\u2014';

  const activityTypeCounts: Record<string, number> = {};
  filteredActivities.forEach((a) => {
    activityTypeCounts[a.type] = (activityTypeCounts[a.type] || 0) + 1;
  });
  let mostFrequentActivity = '\u2014';
  let maxCount = 0;
  for (const [type, count] of Object.entries(activityTypeCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostFrequentActivity = getActivityLabel(type);
    }
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #222;
      background: #fff;
      padding: 0;
      line-height: 1.5;
    }
    .page-first {
      padding: 44px 40px 32px 40px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .page-subsequent {
      padding: 44px 40px 32px 40px;
      page-break-before: always;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 18px;
      border-bottom: 2px solid #C41E3A;
    }
    .header-left {
      flex: 1;
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }
    .header-logo {
      flex-shrink: 0;
      margin-top: 2px;
    }
    .header-text { flex: 1; }
    .app-title {
      font-size: 11px;
      color: #C41E3A;
      font-weight: 700;
      letter-spacing: 1.5px;
      margin-bottom: 4px;
    }
    .report-title {
      font-size: 20px;
      font-weight: 700;
      color: #111;
      margin-bottom: 2px;
    }
    .report-subtitle {
      font-size: 11px;
      color: #888;
    }
    .header-right {
      text-align: right;
    }
    .dog-name {
      font-size: 17px;
      font-weight: 700;
      color: #222;
    }
    .dog-detail {
      font-size: 11px;
      color: #666;
      margin-top: 2px;
    }
    .first-page-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .section {
      margin-bottom: 18px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: #C41E3A;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #E8E8E8;
    }
    .summary-row {
      display: flex;
      gap: 12px;
      margin-bottom: 6px;
    }
    .summary-card {
      flex: 1;
      background: #FAFAFA;
      border: 1px solid #EAEAEA;
      border-radius: 8px;
      padding: 12px 14px;
      text-align: center;
    }
    .summary-value {
      font-size: 20px;
      font-weight: 700;
      color: #222;
    }
    .summary-label {
      font-size: 10px;
      color: #888;
      margin-top: 2px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .chart-container {
      background: #FAFAFA;
      border: 1px solid #EAEAEA;
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 6px;
    }
    .chart-label {
      font-size: 11px;
      font-weight: 600;
      color: #555;
      margin-bottom: 8px;
    }
    .bcs-guideline {
      font-size: 9px;
      color: #999;
      font-style: italic;
      margin-top: 6px;
    }
    .stats-box {
      display: flex;
      border: 1px solid #EAEAEA;
      border-radius: 8px;
      background: #FAFAFA;
      padding: 14px 10px;
      justify-content: space-around;
      align-items: center;
    }
    .stats-item {
      flex: 1;
      text-align: center;
    }
    .stats-item-value {
      font-size: 16px;
      font-weight: 700;
      color: #222;
      margin-bottom: 3px;
    }
    .stats-item-label {
      font-size: 9px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .stats-divider {
      width: 1px;
      height: 32px;
      background: #E0E0E0;
    }
    .spacer { flex: 1; min-height: 16px; }
    .footer-disclaimer {
      padding-top: 14px;
      border-top: 1px solid #E8E8E8;
    }
    .footer-text {
      font-size: 9px;
      color: #AAA;
      line-height: 1.6;
      text-align: left;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #EAEAEA;
      border-radius: 8px;
      overflow: hidden;
    }
    thead th {
      background: #F5F5F5;
      padding: 10px 12px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #E0E0E0;
    }
    @media print {
      .page-first { padding: 36px 32px 28px 32px; }
      .page-subsequent { padding: 36px 32px 28px 32px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <!-- PAGE 1: Summary + Charts + Footer -->
  <div class="page-first">
    <div class="header">
      <div class="header-left">
        <div class="header-logo">${logoImg}</div>
        <div class="header-text">
          <div class="app-title">CANINE iQ</div>
          <div class="report-title">Fitness & Conditioning Summary</div>
          <div class="report-subtitle">Generated on ${today} &middot; ${rangeLabel}</div>
        </div>
      </div>
      <div class="header-right">
        <div class="dog-name">${profile.name}</div>
        <div class="dog-detail">${profile.age} ${profile.age === 1 ? 'year' : 'years'} old &middot; ${profile.sex === 'male' ? 'Male' : 'Female'}</div>
        <div class="dog-detail">${breedText}</div>
        <div class="dog-detail">${formatWeight(profile.weight, unit)}</div>
      </div>
    </div>

    <div class="first-page-content">
      <div class="section">
        <div class="section-title">Period Summary</div>
        <div class="summary-row">
          <div class="summary-card">
            <div class="summary-value">${totalActivities}</div>
            <div class="summary-label">Activities</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${totalHours}h</div>
            <div class="summary-label">Total Duration</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${filteredNotes.length}</div>
            <div class="summary-label">Health Notes</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${filteredNotes.filter(n => n.bcsScore != null && n.bcsScore > 0).length}</div>
            <div class="summary-label">BCS Records</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Weight Trend (${unit})</div>
        <div class="chart-container">
          ${weightChart}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Body Condition Score Trend</div>
        <div class="chart-container">
          ${bcsChart}
          <div class="bcs-guideline">Green zone indicates guideline BCS range 4–6/9. This is a guideline only; BCS is breed, lifestyle, and dog-dependent.</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Period Statistics</div>
        <div class="stats-box">
          <div class="stats-item">
            <div class="stats-item-value">${avgWeight != null ? `${avgWeight} ${unit}` : '\u2014'}</div>
            <div class="stats-item-label">Average Weight</div>
          </div>
          <div class="stats-divider"></div>
          <div class="stats-item">
            <div class="stats-item-value">${dailyAvgDisplay}</div>
            <div class="stats-item-label">Daily Avg Training</div>
          </div>
          <div class="stats-divider"></div>
          <div class="stats-item">
            <div class="stats-item-value">${mostFrequentActivity}</div>
            <div class="stats-item-label">Most Frequent Activity</div>
          </div>
        </div>
      </div>

      <div class="spacer"></div>

      <div class="footer-disclaimer">
        <div class="footer-text">${FOOTER_DISCLAIMER}</div>
      </div>
    </div>
  </div>

  <!-- PAGE 2+: Activity Log -->
  <div class="page-subsequent">
    <div class="section">
      <div class="section-title">Activity Log</div>
      <table>
        <thead>
          <tr>
            <th style="width:18%;">Date</th>
            <th style="width:18%;">Type</th>
            <th style="width:14%;">Duration</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${activitiesRows}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Health Notes</div>
      <table>
        <thead>
          <tr>
            <th style="width:16%;">Date</th>
            <th style="width:16%;">Weight</th>
            <th style="width:16%;">BCS</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          ${healthRows}
        </tbody>
      </table>
    </div>

    <div style="margin-top:auto;padding-top:24px;">
      <div class="footer-disclaimer">
        <div class="footer-text">${FOOTER_DISCLAIMER}</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};
