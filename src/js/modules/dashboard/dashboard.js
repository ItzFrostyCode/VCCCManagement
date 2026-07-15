import {
  pastors,
  churches,
  districts,
  zones,
  churchAssignments,
  disciples,
  conferences,
  mealAttendance
} from '../../core/state.js';

import {
  icon,
  esc,
  pastorAvatar,
  assignmentBadge,
  formatDate
} from '../../shared/utils/helpers.js';

function statCard({ iconName, color, value, label, change, changeCls = 'text-muted', clickable = false, page = '' }) {
  return `
    <div class="stat-card"${clickable ? ` onclick="navigate('${page}')" style="cursor:pointer"` : ''}>
      <div class="stat-icon" style="background:var(--${color}-dim);color:var(--${color})">${icon(iconName, 'icon-md')}</div>
      <div class="stat-info">
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
        <div class="stat-change ${changeCls}">${change}</div>
      </div>
    </div>
  `;
}

function quickLink({ iconName, color, title, desc, page }) {
  return `
    <div class="card dashboard-quicklink" onclick="navigate('${page}')">
      <div class="stat-icon" style="background:var(--${color}-dim);color:var(--${color})">${icon(iconName, 'icon-md')}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:800;font-size:14px;">${title}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">${desc}</div>
      </div>
      <div style="color:var(--text-muted);flex-shrink:0;">${icon('chevron-right', 'icon-sm')}</div>
    </div>
  `;
}

export function renderDashboard() {
  const content = document.getElementById('page-content');
  if (!content) return;

  const pastorList = Array.isArray(pastors) ? pastors : [];
  const churchList = Array.isArray(churches) ? churches : [];
  const districtList = Array.isArray(districts) ? districts : [];
  const zoneList = Array.isArray(zones) ? zones : [];
  const assignmentList = Array.isArray(churchAssignments) ? churchAssignments : [];
  const discipleList = Array.isArray(disciples) ? disciples : [];
  const conferenceList = Array.isArray(conferences) ? conferences : [];
  const mealAttendanceList = Array.isArray(mealAttendance) ? mealAttendance : [];

  // ── Main: Pastors & Assignments ──
  const totalPastors = pastorList.length;
  const activePastors = pastorList.filter(p => p.status_code === 'active').length;
  const suspendedPastors = pastorList.filter(
    p => p.status_code === 'suspended' || p.status_code === 'pullout'
  ).length;
  const interimPastors = pastorList.filter(
    p => p.status_code === 'interim' || p.status_code === 'redirection'
  ).length;
  const undeployedPastors = pastorList.filter(p => p.status_code === 'undeployed').length;

  const recentAssignments = [...assignmentList]
    .sort((a, b) => {
      const dateA = new Date(b.created_at || b.start_date || 0).getTime();
      const dateB = new Date(a.created_at || a.start_date || 0).getTime();
      return dateA - dateB;
    })
    .slice(0, 20);

  // ── Organization: Districts, Zones & Churches ──
  const totalDistricts = districtList.length;
  const totalZones = zoneList.length;
  const mindanaoChurches = churchList.filter(c => !c.is_international).length;
  const internationalChurches = churchList.filter(c => c.is_international).length;
  const totalChurches = churchList.length;

  // ── Events & Delegates: Conferences, Meals, Disciples, Delegates & QR ──
  const now = new Date();
  const totalConferences = conferenceList.length;
  const ongoingConferences = conferenceList.filter(c => {
    if (!c.start_date || !c.end_date) return false;
    return now >= new Date(c.start_date) && now <= new Date(c.end_date);
  }).length;

  const totalMealScans = mealAttendanceList.length;
  const todayScans = mealAttendanceList.filter(a => {
    if (!a.scanned_at) return false;
    const d = new Date(a.scanned_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }).length;

  const totalDisciples = discipleList.length;
  const unassignedDisciples = discipleList.filter(d => !d.pastor_id).length;

  const totalWives = pastorList.filter(p => p.wife_name && p.wife_name.trim() !== '').length;
  const totalDelegates = totalPastors + totalWives + totalDisciples;

  const isNew =
    totalPastors === 0 &&
    churchList.length === 0 &&
    totalDistricts === 0;

  content.innerHTML = `
    <div class="fade-in">
      ${
        isNew
          ? `
        <div class="card" style="text-align:center;padding:48px 32px;margin-bottom:32px;border:2px dashed var(--border-light)">
          <div style="width:64px;height:64px;background:var(--accent-dim);border-radius:var(--radius-xl);display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
            ${icon('church', 'icon-xl')}
          </div>
          <h2 style="font-size:22px;font-weight:700;margin-bottom:8px">Welcome to the VCCC Pastoral Deployment &amp; Records System</h2>
          <p style="color:var(--text-muted);max-width:480px;margin:0 auto 24px">
            Start by setting up your organization structure. Add districts, zones, and churches. Then add your pastors and assign them.
          </p>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="navigate('pastors')">${icon('user-plus')} Add Pastor</button>
            <button class="btn btn-secondary" onclick="navigate('districts')">${icon('map')} Add District</button>
            <button class="btn btn-secondary" onclick="navigate('churches')">${icon('church')} Add Church</button>
          </div>
        </div>`
          : ''
      }

      <div class="dashboard-section-title">${icon('layout-dashboard', 'icon-xs')} Main</div>
      <div class="dashboard-stats-row">
        ${statCard({ iconName: 'users', color: 'accent', value: totalPastors, label: 'Total Pastors', change: `${activePastors} active`, changeCls: 'text-success' })}
        ${statCard({ iconName: 'user-x', color: 'warning', value: undeployedPastors, label: 'Undeployed', change: 'Ready for assignment' })}
        ${statCard({ iconName: 'ban', color: 'danger', value: suspendedPastors, label: 'Suspended Pastors', change: `${interimPastors} interim/redirected` })}
      </div>

      <div class="card" style="padding:0;margin-bottom:var(--space-8)">
          <div class="card-header" style="padding:16px 20px">
            <div class="card-title">${icon('clock', 'icon-sm')} Recent Assignments</div>
            <button type="button" class="btn btn-sm btn-secondary" onclick="navigate('assignments')">
              ${icon('arrow-right', 'icon-sm')} View All
            </button>
          </div>

          ${
            recentAssignments.length === 0
              ? `
            <div class="empty-state" style="padding:32px">
              ${icon('inbox', 'icon-lg')}
              <p style="margin-top:12px">No assignments yet.</p>
            </div>`
              : `
            <div class="table-wrapper" style="border:none;border-radius:0;max-height:480px;overflow-y:auto">
              <table>
                <thead>
                  <tr>
                    <th>Pastor</th>
                    <th>Church</th>
                    <th>Type</th>
                    <th>Since</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentAssignments
                    .map(a => {
                      const p = pastorList.find(x => x.pastor_id === a.pastor_id);
                      const c = churchList.find(x => x.church_id === a.church_id);

                      return `
                        <tr>
                          <td>
                            <div class="pastor-info">
                              ${pastorAvatar(p?.pastor_name || '?', p?.image_url, 'sm')}
                              <span class="pastor-name">${esc(p?.pastor_name || 'Unknown')}</span>
                            </div>
                          </td>
                          <td class="td-muted">${c ? esc(c.church_name) : '—'}</td>
                          <td>${assignmentBadge(a.assignment_type_code)}</td>
                          <td class="td-muted">${formatDate(a.start_date)}</td>
                        </tr>
                      `;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>`
          }
      </div>

      <div class="dashboard-section-title">${icon('building-2', 'icon-xs')} Organization</div>
      <div class="dashboard-stats-row">
        ${statCard({ iconName: 'map', color: 'purple', value: totalDistricts, label: 'Districts', change: `${totalZones} zones total` })}
        ${statCard({ iconName: 'layers', color: 'info', value: totalZones, label: 'Zones', change: 'Across all districts' })}
        ${statCard({ iconName: 'church', color: 'success', value: totalChurches, label: 'Churches', change: `${mindanaoChurches} Mindanao · ${internationalChurches} international` })}
      </div>

      <div class="dashboard-section-title">${icon('calendar-days', 'icon-xs')} Events & Delegates</div>
      <div class="dashboard-stats-row">
        ${statCard({ iconName: 'calendar', color: 'purple', value: totalConferences, label: 'Conferences', change: ongoingConferences > 0 ? `${ongoingConferences} ongoing now` : 'No ongoing conference', changeCls: ongoingConferences > 0 ? 'text-success' : 'text-muted', clickable: true, page: 'conferences' })}
        ${statCard({ iconName: 'utensils', color: 'success', value: totalMealScans, label: 'Meal Scans', change: `${todayScans} today`, clickable: true, page: 'meals' })}
        ${statCard({ iconName: 'user-check', color: 'orange', value: totalDisciples, label: 'Total Disciples', change: unassignedDisciples > 0 ? `${unassignedDisciples} need reassignment` : 'All assigned', changeCls: unassignedDisciples > 0 ? 'text-danger' : 'text-success', clickable: unassignedDisciples > 0, page: 'disciples' })}
        ${statCard({ iconName: 'scan-line', color: 'info', value: totalDelegates, label: 'Registered Delegates', change: 'Pastors, wives & disciples', clickable: true, page: 'delegates' })}
      </div>

      <div class="dashboard-section-title">${icon('bar-chart-2', 'icon-xs')} Analytics</div>
      <div class="dashboard-quicklink-row">
        ${quickLink({ iconName: 'bar-chart-2', color: 'info', title: 'Reports', desc: 'Generate ministry-wide reports', page: 'reports' })}
        ${quickLink({ iconName: 'database', color: 'purple', title: 'Data', desc: 'Backup, import & export data', page: 'data' })}
        ${quickLink({ iconName: 'help-circle', color: 'accent', title: 'Help & Guide', desc: 'FAQs and usage guide', page: 'help' })}
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

window.renderDashboard = renderDashboard;
