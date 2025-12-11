// src/utils/ToolAccess.jsx

// Normalizamos roles para evitar problemas de mayúsculas / strings separados por coma
function normalizeRoles(rawRoles) {
  if (!rawRoles) return [];

  const rolesArray = Array.isArray(rawRoles)
    ? rawRoles
    : String(rawRoles)
        .split(',')
        .map(r => r.trim())
        .filter(Boolean);

  return rolesArray.map(r => r.toUpperCase());
}

// Devuelve true si el usuario tiene al menos uno de los roles indicados
function hasAnyRole(user, allowedRoles = []) {
  const roles = normalizeRoles(user?.userRoles);

  return allowedRoles.some((r) =>
    roles.includes(String(r).toUpperCase())
  );
}

export function canAccessTool(user, tool) {
  if (!tool?.isActive) return false;
  if (!user) return false;

  const roles = normalizeRoles(user.userRoles);
  const cat = tool.category;

  // ✅ Herramientas GRATUITAS: no requieren rol
  if (!cat || cat === 'free' || cat === 'finfocus_free') {
    return true;
  }

  // =============== FINFOCUS =================

if (tool.category === 'finfocus_all') {
  // 🔹 Criterio: cualquiera que tenga algún plan FINFOCUS
  return hasAnyRole(user, [
    'FINFOCUS_START',
    'FINFOCUS',
    'FINFOCUS_PLUS',
    'FINFOCUS_PLATINO',
    'FINFOCUS_ADVANCED',
  ]);
}

  // finfocus_start → FINFOCUS_START, FINFOCUS_PLATINO, FINFOCUS_ADVANCED
  if (cat === 'finfocus_start') {
    return (
      roles.includes('FINFOCUS_START') ||
      roles.includes('FINFOCUS_PLATINO') ||
      roles.includes('FINFOCUS_ADVANCED')
    );
  }

  // finfocus → FINFOCUS, FINFOCUS_PLATINO
  if (cat === 'finfocus') {
    return (
      roles.includes('FINFOCUS') ||
      roles.includes('FINFOCUS_PLATINO')
    );
  }

  // finfocus_plus → FINFOCUS_PLUS, FINFOCUS_ADVANCED
  if (cat === 'finfocus_plus') {
    return (
      roles.includes('FINFOCUS_PLUS') ||
      roles.includes('FINFOCUS_ADVANCED')
    );
  }

  // =============== FINLEGAL =================
  // OJO: acá la lógica está vista DESDE LA CATEGORÍA 👇

  // cat = finlegal_esencial:
  //   - entra FINLEGAL_ESENCIAL
  //   - entra FINLEGAL_PLUS
  //   - entra FINLEGAL_TOTAL
  if (cat === 'finlegal_esencial') {
    return (
      roles.includes('FINLEGAL_ESENCIAL') ||
      roles.includes('FINLEGAL_PLUS') ||
      roles.includes('FINLEGAL_TOTAL')
    );
  }

  // cat = finlegal_esencial_plus:
  //   - entra FINLEGAL_PLUS
  //   - entra FINLEGAL_TOTAL
  if (cat === 'finlegal_esencial_plus') {
    return (
      roles.includes('FINLEGAL_PLUS') ||
      roles.includes('FINLEGAL_TOTAL')
    );
  }

  // cat = finlegal_total:
  //   - entra solo FINLEGAL_TOTAL
  if (cat === 'finlegal_total') {
    return roles.includes('FINLEGAL_TOTAL');
  }

  return false;
}

export function filterToolsForUser(user, tools) {
  return (tools || []).filter(tool => canAccessTool(user, tool));
}

// ======================
// Trial Management (FINLEGAL)
// ======================

export function startTrial(durationDays = 7) {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + durationDays);

  return {
    trialStartDate: now.toISOString(),
    trialEndDate: endDate.toISOString(),
    trialUsed: true,
  };
}

export function getTrialStatus(user) {
  if (!user) {
    return { status: 'no_trial', daysRemaining: 0 };
  }

  const { trialStartDate, trialEndDate } = user;

  if (!trialStartDate || !trialEndDate) {
    return { status: 'no_trial', daysRemaining: 0 };
  }

  const now = new Date();
  const endDate = new Date(trialEndDate);

  // Trial vencido
  if (now > endDate) {
    return {
      status: 'expired',
      daysRemaining: 0,
      startDate: trialStartDate,
      endDate: trialEndDate,
    };
  }

  // Trial activo
  const daysRemaining = Math.ceil(
    (endDate - now) / (1000 * 60 * 60 * 24)
  );

  return {
    status: 'active',
    daysRemaining,
    startDate: trialStartDate,
    endDate: trialEndDate,
  };
}


