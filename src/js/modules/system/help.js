// ============================================================
// Church Management System — Help & Documentation Module
// ============================================================

import { icon, statusBadge, assignmentBadge } from '../../shared/utils/helpers.js';

export function renderHelp() {
  const content = document.getElementById('page-content');
  const actions = document.getElementById('topbar-actions');
  if (actions) actions.innerHTML = ''; // No actions for help page

  content.innerHTML = `<div class="fade-in">
    <div class="card" style="margin-bottom:24px">
      <div class="card-title">${icon('book-open','icon-sm')} System User Guide</div>
      <p style="color:var(--text-muted);font-size:14px;margin-top:8px">
        Welcome to the Church Management System. This guide explains the system's logic, hierarchy, status codes, and assignment rules.
      </p>
    </div>

    <div class="dashboard-grid">
      <!-- Left Column: Concepts -->
      <div style="display:flex;flex-direction:column;gap:20px">
        
        <!-- Hierarchy Section -->
        <div class="card">
          <div class="card-title">${icon('layers','icon-sm')} Organization Hierarchy</div>
          <div style="margin-top:16px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);padding:16px">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
              <div class="avatar avatar-sm" style="background:var(--purple-dim);color:var(--purple)">1</div>
              <div><strong>District</strong> <span class="text-muted">(Largest unit)</span></div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;padding-left:24px;position:relative">
              <div style="position:absolute;left:11px;top:-18px;bottom:18px;width:2px;background:var(--border)"></div>
              <div style="position:absolute;left:11px;top:50%;width:12px;height:2px;background:var(--border)"></div>
              <div class="avatar avatar-sm" style="background:var(--bg-card);border:1px solid var(--border);color:var(--text-secondary)">2</div>
              <div><strong>Zone</strong> <span class="text-muted">(Must belong to a District)</span></div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;padding-left:48px;position:relative">
              <div style="position:absolute;left:35px;top:-18px;bottom:18px;width:2px;background:var(--border)"></div>
              <div style="position:absolute;left:35px;top:50%;width:12px;height:2px;background:var(--border)"></div>
              <div class="avatar avatar-sm" style="background:var(--success-dim);color:var(--success)">3</div>
              <div><strong>Church</strong> <span class="text-muted">(Belongs to a Zone or District)</span></div>
            </div>
          </div>
          <p style="font-size:13px;color:var(--text-muted);margin-top:12px">
            <strong>Rule:</strong> Create Districts first, then Zones inside them, then Churches. Churches can be unzoned (district-level) or placed inside a Zone.
          </p>
        </div>

        <!-- Status Codes -->
        <div class="card">
          <div class="card-title">${icon('activity','icon-sm')} Pastor Status Codes</div>
          <div class="table-wrapper" style="margin-top:16px">
            <table>
              <thead><tr><th>Status</th><th>Description</th></tr></thead>
              <tbody>
                <tr><td>${statusBadge('active')}</td><td class="td-muted">Actively serving in a church assignment.</td></tr>
                <tr><td>${statusBadge('undeployed')}</td><td class="td-muted">Ready for assignment but currently has no church.</td></tr>
                <tr><td>${statusBadge('interim')}</td><td class="td-muted">Temporarily serving as caretaker of a church.</td></tr>
                <tr><td>${statusBadge('suspended')}</td><td class="td-muted">Removed due to disciplinary action. Cannot hold office.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Assignment Types -->
        <div class="card">
          <div class="card-title">${icon('tag','icon-sm')} Assignment Types</div>
          <div class="table-wrapper" style="margin-top:16px">
            <table>
              <thead><tr><th>Type</th><th>Usage</th></tr></thead>
              <tbody>
                <tr><td>${assignmentBadge('regular')}</td><td class="td-muted">Standard local church pastor.</td></tr>
                <tr><td>${assignmentBadge('pioneering')}</td><td class="td-muted">Starting a new church work.</td></tr>
                <tr><td>${assignmentBadge('training')}</td><td class="td-muted">Mentoring or being mentored.</td></tr>
                <tr><td>${assignmentBadge('swap')}</td><td class="td-muted">Temporary exchange of pulpits.</td></tr>
                <tr><td>${assignmentBadge('international')}</td><td class="td-muted">Missionary work abroad. <strong>Requires prior local experience.</strong></td></tr>
                <tr><td>${assignmentBadge('interim')}</td><td class="td-muted">Temporary caretaker of a church.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- Right Column: How-To Guides -->
      <div style="display:flex;flex-direction:column;gap:20px">
        
        <!-- Adding a Pastor & Undeployed Status -->
        <div class="card">
          <div class="card-title">${icon('user-plus','icon-sm')} Adding a Pastor (Undeployed)</div>
          <p style="font-size:13px;color:var(--text-secondary);margin-top:8px">
            The very first step when setting up the system is adding a Pastor.
          </p>
          <ul style="margin:8px 0 12px 20px;font-size:13px;color:var(--text-muted);line-height:1.6">
            <li>Go to the <strong>Pastors</strong> page and click "Add Pastor".</li>
            <li>You will notice their initial status is forced to <strong>Undeployed</strong>.</li>
          </ul>
          <div class="alert alert-purple" style="margin-top:12px;margin-bottom:0">
            ${icon('info','icon-sm')} <div><strong>Why "Undeployed"?</strong><br>
            When a pastor is newly created in the database, they don't have a church assignment yet. The system labels them "Undeployed" because they are ready and waiting in the pool. Once you assign them to a church, their status will automatically upgrade to <strong>Active</strong>.</div>
          </div>
        </div>

        <!-- How to Add Church -->
        <div class="card">
          <div class="card-title">${icon('plus-circle','icon-sm')} How to Add a Church</div>
          <ol style="margin:12px 0 0 20px;font-size:14px;color:var(--text-secondary);line-height:1.8">
            <li>Go to <strong>Districts</strong> page.</li>
            <li>Ensure you have a <strong>District</strong> created. If not, click "Add District".</li>
            <li>Click <strong>"Add Zone"</strong> on the District card if needed.</li>
            <li>Click <strong>"Add Church"</strong> on the District or Zone card.</li>
            <li>Alternatively, drag an unzoned church into a zone using drag-and-drop.</li>
          </ol>
          <div class="alert alert-info" style="margin-top:12px">
            ${icon('info','icon-sm')} <strong>Tip:</strong> You can also add churches from the "Churches" page. They can be assigned to a district/zone later.
          </div>
        </div>

        <!-- FAQ -->
        <div class="card">
          <div class="card-title">${icon('help-circle','icon-sm')} FAQ</div>
          <div style="display:flex;flex-direction:column;gap:12px;margin-top:12px">
            <div>
              <div style="font-size:13px;font-weight:600;margin-bottom:2px">Why is the "Add Church" button disabled?</div>
              <div style="font-size:13px;color:var(--text-muted)">Check if you have created a <strong>Zone</strong>. Churches must belong to a Zone.</div>
            </div>
            <div>
              <div style="font-size:13px;font-weight:600;margin-bottom:2px">How do I delete a District?</div>
              <div style="font-size:13px;color:var(--text-muted)">Click the trash icon on the District card. <strong>Warning:</strong> This deletes ALL zones and churches inside it!</div>
            </div>
            <div>
              <div style="font-size:13px;font-weight:600;margin-bottom:2px">Where is the data stored?</div>
              <div style="font-size:13px;color:var(--text-muted)">Data is saved locally in this browser's storage (<strong>localStorage</strong>), on this device only. It is not synced to the cloud. Since it doesn't leave your device, use the "Data" page regularly to download a full JSON or CSV backup — clearing your browser data will erase everything unless you have a backup.</div>
            </div>
            <div>
              <div style="font-size:13px;font-weight:600;margin-bottom:2px">How do I register a Disciple?</div>
              <div style="font-size:13px;color:var(--text-muted)">Go to the <strong>Disciples</strong> page and click "Add Disciple". Enter their name and select their mentor Pastor — their current Church and District will auto-display once a pastor is selected. Birthdate is optional.</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>`;

  if (window.lucide) window.lucide.createIcons();
}

window.renderHelp = renderHelp;
